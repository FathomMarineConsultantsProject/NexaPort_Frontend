export const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("np_user") || "{}");
  } catch {
    return {};
  }
};

export const getRoleId = () => Number(getStoredUser()?.role_id || 0);
export const getVerificationStatus = () => getStoredUser()?.verification_status || null;

export const isSuperAdmin = () => getRoleId() === 1;
export const isExpert = () => getRoleId() === 2;
export const isClient = () => getRoleId() === 3;
export const isApprovedClient = () => isClient() && getVerificationStatus() === "approved";
