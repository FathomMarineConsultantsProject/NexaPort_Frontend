import axiosClient from "./axiosClient";

export const registerUser = async (payload) => {
  const res = await axiosClient.post("/auth/register", payload);
  return res.data;
};
export const registerUnified = async (payload) => (await axiosClient.post('/auth/register-unified', payload)).data;
export const getUnifiedOnboarding = async () => (await axiosClient.get('/auth/onboarding')).data;
export const saveUnifiedOnboarding = async (payload) => (await axiosClient.patch('/auth/onboarding', payload)).data;
export const getApplications = async () => (await axiosClient.get('/auth/applications')).data;
export const getApplication = async (pathway) => (await axiosClient.get(`/auth/applications/${pathway}`)).data;
export const saveApplication = async (pathway, draft) => (await axiosClient.patch(`/auth/applications/${pathway}`, { draft })).data;
export const listConsultantApplications = async () => (await axiosClient.get('/auth/consultant-applications/review')).data;
export const reviewConsultantApplication = async (userId, decision, reason) => (await axiosClient.post(`/auth/consultant-applications/${userId}/review`, { decision, reason })).data;

export const loginUser = async (payload) => {
  const res = await axiosClient.post("/auth/login", payload);
  return res.data;
};

export const getMe = async (config) => {
  const res = await axiosClient.get("/auth/me", config);
  return res.data;
};

export const switchUserRole = async (role_id) => {
  const res = await axiosClient.post("/auth/switch-role", { role_id });
  return res.data;
};
