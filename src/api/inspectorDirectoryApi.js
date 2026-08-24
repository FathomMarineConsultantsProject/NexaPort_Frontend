import axiosClient from "./axiosClient";

export const searchInspectorDirectory = async (filters = {}) => {
  const params = Object.fromEntries(Object.entries(filters).filter(([, value]) => value !== "" && value != null));
  const response = await axiosClient.get("/directories/inspectors/search", { params });
  return response.data;
};
