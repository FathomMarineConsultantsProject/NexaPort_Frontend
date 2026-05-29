export const getCurrentUser = () => {
  try {
    const storedUser = localStorage.getItem("np_user");
    return storedUser ? JSON.parse(storedUser) : null;
  } catch {
    return null;
  }
};

export const getRoleId = () => {
  return Number(getCurrentUser()?.role_id);
};

export const isSuperAdmin = () => getRoleId() === 1;
export const isExpert = () => getRoleId() === 2;
export const isClient = () => getRoleId() === 3;