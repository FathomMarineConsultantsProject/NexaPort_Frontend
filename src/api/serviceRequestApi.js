import axiosClient from "./axiosClient";

export const getServiceRequests = async (params = {}) => {
  const res = await axiosClient.get("/service-requests", { params });
  return res.data;
};

export const getServiceRequestById = async (id) => {
  const res = await axiosClient.get(`/service-requests/${id}`);
  return res.data;
};

export const createServiceRequest = async (payload) => {
  const res = await axiosClient.post("/service-requests", payload);
  return res.data;
};

export const updateServiceRequest = async (id, payload) => {
  const res = await axiosClient.put(`/service-requests/${id}`, payload);
  return res.data;
};

export const deleteServiceRequest = async (id) => {
  const res = await axiosClient.delete(`/service-requests/${id}`);
  return res.data;
};