import axiosClient from "./axiosClient";

export const getFlags = async () => {
  const res = await axiosClient.get("/flags");
  return res.data;
};

export const getFlagDirectory = async (flagSlug, { search = "" } = {}) => {
  const params = {};
  if (search) params.search = search;

  const res = await axiosClient.get(`/flags/${flagSlug}/directory`, { params });
  return res.data;
};

export const getFlagInspector = async (flagSlug, inspectorId) => {
  const res = await axiosClient.get(`/flags/${flagSlug}/inspectors/${inspectorId}`);
  return res.data;
};
