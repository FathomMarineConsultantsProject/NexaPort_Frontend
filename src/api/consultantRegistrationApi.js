import axiosClient from "./axiosClient";

export const presignConsultantUpload = async ({ kind, contentType, size }, accountLinked = false) => {
  const res = await axiosClient.post(accountLinked ? "/auth/consultant-application/upload-url" : "/auth/register-consultant/upload-url", {
    kind,
    contentType,
    size,
  });
  return res.data;
};

export const registerConsultant = async (payload, accountLinked = false) => {
  const res = await axiosClient.post(accountLinked ? "/auth/consultant-application/submit" : "/auth/register-consultant", payload);
  return res.data;
};
