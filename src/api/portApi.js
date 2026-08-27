import axiosClient from "./axiosClient";

export const getPorts = async ({ search = "", country = "", region = "", harbourType = "", page, limit, compact = false } = {}) => {
  const params = { compact };
  if (search) params.search = search;
  if (country) params.country = country;
  if (region && region !== "All Regions") params.region = region;
  if (harbourType) params.harbourType = harbourType;
  if (page) params.page = page;
  if (limit) params.limit = limit;

  const res = await axiosClient.get("/ports", { params });
  return res.data;
};

export const getPortById = async (id) => {
  const res = await axiosClient.get(`/ports/${id}`);
  return res.data;
};

export const createPort = async (payload) => {
  const res = await axiosClient.post("/ports", payload);
  return res.data;
};

export const updatePort = async (id, payload) => {
  const res = await axiosClient.patch(`/ports/${id}`, payload);
  return res.data;
};

export const deletePort = async (id) => {
  const res = await axiosClient.delete(`/ports/${id}`);
  return res.data;
};
