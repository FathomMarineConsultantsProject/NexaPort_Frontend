import axiosClient from "./axiosClient";

export const presignConsultantUpload = async ({ kind, contentType, size }) => {
  const res = await axiosClient.post("/auth/register-consultant/upload-url", {
    kind,
    contentType,
    size,
  });
  return res.data;
};

export const registerConsultant = async (payload) => {
  const res = await axiosClient.post("/auth/register-consultant", payload);
  return res.data;
};
