import axiosClient from "./axiosClient";

export const getAdminNotifications = async (limit = 30) =>
  (await axiosClient.get("/admin-notifications", { params: { limit } })).data;

export const markAdminNotificationRead = async (id) =>
  (await axiosClient.patch(`/admin-notifications/${id}/read`)).data;

export const markAllAdminNotificationsRead = async () =>
  (await axiosClient.patch("/admin-notifications/read-all")).data;
