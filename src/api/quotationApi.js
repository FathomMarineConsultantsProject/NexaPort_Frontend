import axiosClient from "./axiosClient";

export const getQuotations = async (params = {}) => {
  const res = await axiosClient.get("/quotations", { params });
  return res.data;
};

export const getQuotationById = async (id) => {
  const res = await axiosClient.get(`/quotations/${id}`);
  return res.data;
};
export const getQuotationNegotiation = async (id) => (await axiosClient.get(`/quotations/${id}/negotiation`)).data;
export const submitQuotationRevision = async (id, payload) => (await axiosClient.post(`/quotations/${id}/revisions`,payload)).data;
export const decideQuotation = async (id, payload) => (await axiosClient.post(`/quotations/${id}/decisions`,payload)).data;

export const createQuotation = async (payload) => {
  const res = await axiosClient.post("/quotations", payload);
  return res.data;
};

export const updateQuotation = async (id, payload) => {
  const res = await axiosClient.put(`/quotations/${id}`, payload);
  return res.data;
};

export const deleteQuotation = async (id) => {
  const res = await axiosClient.delete(`/quotations/${id}`);
  return res.data;
};

export const acceptQuotation = async (id, payload = {}) => {
  const res = await axiosClient.patch(`/quotations/${id}/accept`, payload);
  return res.data;
};
