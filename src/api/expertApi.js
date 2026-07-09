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
