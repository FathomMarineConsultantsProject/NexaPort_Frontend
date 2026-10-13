import axiosClient from "./axiosClient";

export const copyRequestLink = async (id) => (await axiosClient.post(`/service-requests/${id}/share`)).data;
export const resolveRequestLink = async (locator) => (await axiosClient.post("/service-requests/share/resolve", { locator })).data;
export const revokeRequestLink = async (id) => (await axiosClient.delete(`/service-requests/${id}/share`)).data;
