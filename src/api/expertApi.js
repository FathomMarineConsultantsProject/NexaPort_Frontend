import axiosClient from "./axiosClient";

export const getExperts = async () => {
  const res = await axiosClient.get("/experts");
  return res.data;
};

export const getExpertById = async (id) => {
  const res = await axiosClient.get(`/experts/${id}`);
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