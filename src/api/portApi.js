import axiosClient from "./axiosClient";

export const getPorts = async ({ search = "", region = "" } = {}) => {
  const params = {};
  if (search) params.search = search;
  if (region && region !== "All Regions") params.region = region;

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