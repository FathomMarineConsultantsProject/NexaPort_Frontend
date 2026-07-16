import axiosClient from "./axiosClient";

export const getClientRegistrations = async (params) => (await axiosClient.get("/admin/client-registrations", { params })).data;
export const getClientRegistration = async (id) => (await axiosClient.get(`/admin/client-registrations/${id}`)).data;
export const approveClientRegistration = async (id, payload = {}) => (await axiosClient.post(`/admin/client-registrations/${id}/approve`, payload)).data;
export const rejectClientRegistration = async (id, payload) => (await axiosClient.post(`/admin/client-registrations/${id}/reject`, payload)).data;
export const getClientDocumentUrl = async (clientProfileId, documentId) => (await axiosClient.get(`/admin/client-registrations/${clientProfileId}/documents/${documentId}/download-url`)).data;

export const getAdminClients = async (params) => (await axiosClient.get("/admin/clients", { params })).data;
export const getAdminClient = async (userId) => (await axiosClient.get(`/admin/clients/${userId}`)).data;
export const updateAdminClient = async (userId, payload) => (await axiosClient.patch(`/admin/clients/${userId}`, payload)).data;
export const updateAdminClientOnboardingVessels = async (userId, payload) => (await axiosClient.put(`/admin/clients/${userId}/onboarding-vessels`, payload)).data;
export const updateAdminClientRequiredServices = async (userId, payload) => (await axiosClient.put(`/admin/clients/${userId}/required-services`, payload)).data;
export const getAdminClientDocumentDownloadUrl = async (userId, documentId) => (await axiosClient.get(`/admin/clients/${userId}/documents/${documentId}/download-url`)).data;
export const getAdminClientDeletionImpact = async (userId) => (await axiosClient.get(`/admin/clients/${userId}/deletion-impact`)).data;
export const getClientDeletionImpact = getAdminClientDeletionImpact;
export const deleteAdminClient = async (userId, confirmation, reason) => (await axiosClient.delete(`/admin/clients/${userId}`, { data: { confirmation, reason } })).data;
export const deactivateAdminClient = async (userId, confirmation, reason) => (await axiosClient.post(`/admin/clients/${userId}/deactivate-anonymize`, { confirmation, reason })).data;
