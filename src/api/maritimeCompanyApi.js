import axiosClient from "./axiosClient";

export const registerMaritimeCompany = async (payload) => (await axiosClient.post("/auth/register-maritime-company", payload)).data;
export const submitCompanyApplication = async (payload) => (await axiosClient.post("/auth/company-application/submit", payload)).data;
export const createApplicationLogoUpload = async (payload) => (await axiosClient.post("/auth/company-application/logo/upload-url", payload)).data;
export const confirmApplicationLogoUpload = async (payload) => (await axiosClient.post("/auth/company-application/logo/confirm", payload)).data;
export const getCompanyProfile = async (entityId) => (await axiosClient.get(entityId ? `/company/${entityId}/profile` : "/company/profile")).data;
export const updateCompanyProfile = async (payload, entityId) => (await axiosClient.patch(entityId ? `/company/${entityId}/profile` : "/company/profile", payload)).data;
export const createCompanyLogoUpload = async (payload, entityId) => (await axiosClient.post(entityId ? `/company/${entityId}/logo/upload-url` : "/company/logo/upload-url", payload)).data;
export const confirmCompanyLogoUpload = async (payload, entityId) => (await axiosClient.post(entityId ? `/company/${entityId}/logo/confirm` : "/company/logo/confirm", payload)).data;
