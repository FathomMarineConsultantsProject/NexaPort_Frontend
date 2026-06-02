import axiosClient from "./axiosClient";

export const getMyProfile = async () => {
  const res = await axiosClient.get("/users/me");
  return res.data;
};

export const updateMyProfile = async (payload) => {
  const res = await axiosClient.patch("/users/me", payload);
  return res.data;
};