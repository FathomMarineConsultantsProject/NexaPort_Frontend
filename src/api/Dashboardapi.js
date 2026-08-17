import axiosClient from "./axiosClient";

export const getDashboardStats = async () => {
  const res = await axiosClient.get("/dashboard");
  return res.data;
};

export const getClientDashboard = async () => {
  const res = await axiosClient.get("/dashboard/client");
  return res.data;
};

export const getExpertDashboard = async () => {
  const res = await axiosClient.get("/dashboard/expert");
  return res.data;
};

export const getAdminDashboard = async () => {
  const res = await axiosClient.get("/dashboard/admin");
  return res.data;
};

export const getProviderDashboard = async () => {
  const res = await axiosClient.get("/dashboard/provider");
  return res.data;
};
