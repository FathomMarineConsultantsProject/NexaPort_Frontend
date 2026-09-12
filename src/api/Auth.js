import axiosClient from "./axiosClient";

export const registerUser = async (payload) => {
  const res = await axiosClient.post("/auth/register", payload);
  return res.data;
};

export const loginUser = async (payload) => {
  const res = await axiosClient.post("/auth/login", payload);
  return res.data;
};

export const getMe = async () => {
  const res = await axiosClient.get("/auth/me");
  return res.data;
};

export const switchUserRole = async (role_id) => {
  const res = await axiosClient.post("/auth/switch-role", { role_id });
  return res.data;
};
