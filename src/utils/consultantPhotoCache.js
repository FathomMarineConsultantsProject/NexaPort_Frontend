import { getMyProfile } from "../api/userApi";

const CACHE_PREFIX = "np_consultant_photo_";
const EXPIRY_BUFFER_MS = 60 * 1000;
const MISSING_PHOTO_CACHE_MS = 5 * 60 * 1000;

const cacheKey = (userId) => `${CACHE_PREFIX}${userId}`;

const readCachedPhoto = (userId) => {
  try {
    const cached = JSON.parse(sessionStorage.getItem(cacheKey(userId)) || "null");
    const expiresAt = Date.parse(cached?.cache_expires_at || "");

    if (cached && Number.isFinite(expiresAt) && expiresAt > Date.now() + EXPIRY_BUFFER_MS) {
      return cached.photo_url || null;
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
        cache_expires_at:
          user.photo_expires_at ||
          new Date(Date.now() + MISSING_PHOTO_CACHE_MS).toISOString(),
      })
    );
  } catch {
    // The avatar still works without session caching.
  }
};

export const getCurrentConsultantPhoto = async (user) => {
  if (Number(user?.role_id) !== 2 || !user?.id) return null;

  const cached = readCachedPhoto(user.id);
  if (cached !== undefined) return cached;

  const response = await getMyProfile();
  cacheConsultantPhoto(response.data);
  return response.data?.photo_url || null;
};

export const clearConsultantPhotoCache = (userId) => {
  if (!userId) return;

  try {
    sessionStorage.removeItem(cacheKey(userId));
  } catch {
    // Nothing else is required during logout.
  }
};
