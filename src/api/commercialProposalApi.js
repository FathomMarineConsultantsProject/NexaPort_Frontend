import axiosClient from "./axiosClient";

export const getActiveProposal = async (requestId) => {
  const response = await axiosClient.get(`/service-requests/${requestId}/proposal`);
  return response.data;
};

export const listProposals = async (requestId) => {
  const response = await axiosClient.get(`/service-requests/${requestId}/proposals`);
  return response.data;
};

export const saveDraftProposal = async (requestId, payload) => {
  const response = await axiosClient.post(`/service-requests/${requestId}/proposal/draft`, payload);
  return response.data;
};

export const sendProposal = async (requestId, payload = {}) => {
  const response = await axiosClient.post(`/service-requests/${requestId}/proposal/send`, payload);
  return response.data;
};

export const supersedeProposal = async (requestId, payload = {}) => {
  const response = await axiosClient.post(`/service-requests/${requestId}/proposal/supersede`, payload);
  return response.data;
};

export const approveProposal = async (requestId, payload) => {
  const response = await axiosClient.post(`/service-requests/${requestId}/proposal/approve`, payload);
  return response.data;
};

export const rejectProposal = async (requestId, payload) => {
  const response = await axiosClient.post(`/service-requests/${requestId}/proposal/reject`, payload);
  return response.data;
};
