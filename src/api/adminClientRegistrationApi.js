import axiosClient from "./axiosClient";

export const getClientRegistrations = async (params) => (await axiosClient.get("/admin/client-registrations", { params })).data;
export const getClientRegistration = async (id) => (await axiosClient.get(`/admin/client-registrations/${id}`)).data;
export const approveClientRegistration = async (id, payload = {}) => (await axiosClient.post(`/admin/client-registrations/${id}/approve`, payload)).data;
export const rejectClientRegistration = async (id, payload) => (await axiosClient.post(`/admin/client-registrations/${id}/reject`, payload)).data;
export const getClientDocumentUrl = async (clientProfileId, documentId) => (await axiosClient.get(`/admin/client-registrations/${clientProfileId}/documents/${documentId}/download-url`)).data;
