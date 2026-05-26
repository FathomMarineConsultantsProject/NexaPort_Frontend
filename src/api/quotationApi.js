import axiosClient from "./axiosClient";

export const createQuotation = async (payload) => {
  const res = await axiosClient.post("/quotations", payload);
  return res.data;
};

export const updateQuotationStatus = async (id, status) => {
  const res = await axiosClient.patch(`/quotations/${id}/status`, { status });
  return res.data;
};