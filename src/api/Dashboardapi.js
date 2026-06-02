import axiosClient from "./axiosClient";

export const getDashboardStats = async () => {
  const res = await axiosClient.get("/dashboard");
  return res.data;
};