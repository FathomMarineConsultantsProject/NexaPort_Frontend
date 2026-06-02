export const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem("np_user") || "{}");
  } catch {
    return {};
  }
};

export const getRoleId = () => Number(getStoredUser()?.role_id || 0);

export const isSuperAdmin = () => getRoleId() === 1;
export const isExpert = () => getRoleId() === 2;
export const isClient = () => getRoleId() === 3;