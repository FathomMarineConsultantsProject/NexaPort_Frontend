import axiosClient from "./axiosClient";

export const getVessels = async (search = "") => {
  const params = search ? { search } : {};
  const res = await axiosClient.get("/vessels", { params });
  return res.data;
};

export const getVesselById = async (id) => {
  const res = await axiosClient.get(`/vessels/${id}`);
  return res.data;
};

export const createVessel = async (payload) => {
  const res = await axiosClient.post("/vessels", payload);
  return res.data;
};

export const updateVessel = async (id, payload) => {
  const res = await axiosClient.patch(`/vessels/${id}`, payload);
  return res.data;
};

export const deleteVessel = async (id) => {
  const res = await axiosClient.delete(`/vessels/${id}`);
  return res.data;
};