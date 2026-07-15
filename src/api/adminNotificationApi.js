import axiosClient from "./axiosClient";

export const getAdminNotifications = async (limit = 30) =>
  (await axiosClient.get("/notifications", { params: { limit } })).data;

export const markAdminNotificationRead = async (id) =>
  (await axiosClient.patch(`/notifications/${id}/read`)).data;

export const markAllAdminNotificationsRead = async () =>
  (await axiosClient.patch("/notifications/read-all")).data;
