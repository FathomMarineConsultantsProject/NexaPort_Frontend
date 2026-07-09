import { getMyProfile } from "../api/userApi";

const CACHE_PREFIX = "np_consultant_photo_";
const EXPIRY_BUFFER_MS = 60 * 1000;
const MISSING_PHOTO_CACHE_MS = 5 * 60 * 1000;
export const CONSULTANT_PHOTO_UPDATED_EVENT = "np-consultant-photo-updated";

const cacheKey = (userId) => `${CACHE_PREFIX}${userId}`;

const readCachedConsultant = (userId) => {
  try {
    const cached = JSON.parse(sessionStorage.getItem(cacheKey(userId)) || "null");
    const expiresAt = Date.parse(cached?.cache_expires_at || "");
    const hasExpertId = Object.prototype.hasOwnProperty.call(cached || {}, "expert_id");

    if (
      cached &&
      hasExpertId &&
      Number.isFinite(expiresAt) &&
      expiresAt > Date.now() + EXPIRY_BUFFER_MS
    ) {
      return {
        photoUrl: cached.photo_url || null,
        photoExpiresAt: cached.photo_expires_at || null,
        expertId: cached.expert_id ?? null,
      };
    }
  } catch {
    // Ignore malformed or unavailable session storage.
  }

  return undefined;
};

export const cacheConsultantPhoto = (user) => {
  if (Number(user?.role_id) !== 2 || !user?.id) return;

  try {
    sessionStorage.setItem(
      cacheKey(user.id),
      JSON.stringify({
        photo_url: user.photo_url || null,
        photo_expires_at: user.photo_expires_at || null,
        expert_id: user.expert_id ?? null,
        cache_expires_at:
          user.photo_expires_at ||
          new Date(Date.now() + MISSING_PHOTO_CACHE_MS).toISOString(),
      })
    );
  } catch {
    // The avatar still works without session caching.
  }
};

export const getCurrentConsultant = async (user) => {
  if (Number(user?.role_id) !== 2 || !user?.id) {
    return { photoUrl: null, photoExpiresAt: null, expertId: null };
  }

  const cached = readCachedConsultant(user.id);
  if (cached !== undefined) return cached;

  const response = await getMyProfile();
  cacheConsultantPhoto(response.data);
  return {
    photoUrl: response.data?.photo_url || null,
    photoExpiresAt: response.data?.photo_expires_at || null,
    expertId: response.data?.expert_id ?? null,
  };
};

export const clearConsultantPhotoCache = (userId) => {
  if (!userId) return;

  try {
    sessionStorage.removeItem(cacheKey(userId));
  } catch {
    // Nothing else is required during logout.
  }
};

export const updateConsultantPhotoCache = ({
  userId,
  expertId,
  photoUrl,
  photoExpiresAt,
}) => {
  if (!userId || !expertId || !photoUrl) return;

  try {
    sessionStorage.setItem(
      cacheKey(userId),
      JSON.stringify({
        photo_url: photoUrl,
        photo_expires_at: photoExpiresAt || null,
        expert_id: expertId,
        cache_expires_at:
          photoExpiresAt ||
          new Date(Date.now() + MISSING_PHOTO_CACHE_MS).toISOString(),
      })
    );
  } catch {
    // The live avatar update still works without session caching.
  }

  window.dispatchEvent(
    new CustomEvent(CONSULTANT_PHOTO_UPDATED_EVENT, {
      detail: {
        userId,
        expertId,
        photoUrl,
        photoExpiresAt: photoExpiresAt || null,
      },
    })
  );
};
