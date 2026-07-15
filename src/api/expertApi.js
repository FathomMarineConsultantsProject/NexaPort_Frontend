import axiosClient from "./axiosClient";

export const getExperts = async () => {
  const res = await axiosClient.get("/experts");
  return res.data;
};

export const getExpertById = async (id) => {
  const res = await axiosClient.get(`/experts/${id}`);
  return res.data;
};

export const getExpertCvUrl = async (id) => {
  const res = await axiosClient.get(`/experts/${id}/cv-url`);
  return res.data;
};

export const createExpertMediaUploadUrl = async (id, payload) => {
  const res = await axiosClient.post(`/experts/${id}/media-upload-url`, payload);
  return res.data;
};

export const createExpertPhotoUploadUrl = async (id, payload) => {
  const res = await axiosClient.post(`/experts/${id}/photo-upload-url`, payload);
  return res.data;
};

export const updateExpertPhoto = async (id, photoS3Key) => {
  const res = await axiosClient.patch(`/experts/${id}/photo`, { photoS3Key });
  return res.data;
};

export const createExpert = async (payload) => {
  const res = await axiosClient.post("/experts", payload);
  return res.data;
};

export const updateExpert = async (id, payload) => {
  const res = await axiosClient.patch(`/experts/${id}`, payload);
  return res.data;
};

export const deleteExpert = async (id) => {
  const res = await axiosClient.delete(`/experts/${id}`);
  return res.data;
};

export const getConsultantDeletionImpact = async (id) =>
  (await axiosClient.get(`/admin/consultants/${id}/deletion-impact`)).data;

export const updateConsultantAsAdmin = async (id, payload) =>
  (await axiosClient.patch(`/admin/consultants/${id}`, payload)).data;

export const deleteConsultantAsAdmin = async (id, confirmation) =>
  (await axiosClient.delete(`/admin/consultants/${id}`, { data: { confirmation } })).data;

export const deactivateConsultantAsAdmin = async (id, payload) =>
  (await axiosClient.post(`/admin/consultants/${id}/deactivate-anonymize`, payload)).data;
