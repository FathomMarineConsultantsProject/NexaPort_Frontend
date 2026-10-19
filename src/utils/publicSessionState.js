export const initialPublicSessionStatus = (token) => token ? "checking" : "unauthenticated";

export const publicSessionFailureStatus = (error) =>
  error?.response?.status === 401 ? "unauthenticated" : "indeterminate";
