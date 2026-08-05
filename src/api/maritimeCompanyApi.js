import axiosClient from "./axiosClient";

export const registerMaritimeCompany = async (payload) => (await axiosClient.post("/auth/register-maritime-company", payload)).data;
export const getCompanyProfile = async () => (await axiosClient.get("/company/profile")).data;
export const updateCompanyProfile = async (payload) => (await axiosClient.patch("/company/profile", payload)).data;
export const createCompanyLogoUpload = async (payload) => (await axiosClient.post("/company/logo/upload-url", payload)).data;
export const confirmCompanyLogoUpload = async (payload) => (await axiosClient.post("/company/logo/confirm", payload)).data;
