import axiosClient from "./axiosClient";

const base = "/admin/maritime-directory";
export const getMaritimeDirectory = async (params) => (await axiosClient.get(base, { params })).data;
export const getMaritimeDirectoryEntity = async (entityId) => (await axiosClient.get(`${base}/${entityId}`)).data;
export const createMaritimeDirectoryEntity = async (payload) => (await axiosClient.post(base, payload)).data;
export const updateMaritimeDirectoryEntity = async (entityId, payload) => (await axiosClient.patch(`${base}/${entityId}`, payload)).data;
export const approveMaritimeDirectoryEntity = async (entityId) => (await axiosClient.post(`${base}/${entityId}/approve`)).data;
export const rejectMaritimeDirectoryEntity = async (entityId, reason) => (await axiosClient.post(`${base}/${entityId}/reject`, { reason })).data;
export const activateMaritimeDirectoryEntity = async (entityId) => (await axiosClient.post(`${base}/${entityId}/activate`)).data;
export const deactivateMaritimeDirectoryEntity = async (entityId, reason) => (await axiosClient.post(`${base}/${entityId}/deactivate`, { reason })).data;
