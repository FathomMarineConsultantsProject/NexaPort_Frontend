import axiosClient from "./axiosClient";

export const searchCompanies = async (params) => (await axiosClient.get("/public/companies/search", { params })).data.data;
export const getPublicCompany = async (id) => (await axiosClient.get(`/public/companies/${encodeURIComponent(id)}`)).data.data;
export const getMyClaims = async () => (await axiosClient.get("/company-claims/mine")).data.data;
export const getManagedCompanies = async () => (await axiosClient.get("/company-claims/managed")).data.data;
export const submitCompanyClaim = async (body) => (await axiosClient.post("/company-claims", body)).data.data;
export const createClaimEvidenceUpload = async (body) => (await axiosClient.post("/company-claims/evidence/upload-url", body)).data.data;
export const getAdminClaims = async (params) => (await axiosClient.get("/admin/company-claims", { params })).data.data;
export const getAdminClaim = async (id) => (await axiosClient.get(`/admin/company-claims/${id}`)).data.data;
export const getAdminCompanyTargetStatus = async id => (await axiosClient.get(`/admin/company-claims/targets/${encodeURIComponent(id)}`)).data.data;
export const getClaimEvidence = async (id) => (await axiosClient.get(`/admin/company-claims/${id}/evidence`)).data.data;
export const decideCompanyClaim = async (id, action, notes, publicReason) => (await axiosClient.post(`/admin/company-claims/${id}/${action}`, { notes, publicReason })).data.data;
export const revokeCompanyLink = async (entityId,userId,notes) => (await axiosClient.post(`/admin/company-claims/links/${encodeURIComponent(entityId)}/${encodeURIComponent(userId)}/revoke`,{notes})).data.data;
