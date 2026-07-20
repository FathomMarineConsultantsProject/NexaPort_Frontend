import axios from "axios";
import axiosClient from "./axiosClient";

const registrationHeaders = (registrationDraftToken) => ({ Authorization: `Bearer ${registrationDraftToken}` });

export const createClientRegistrationDraft = async (email) =>
  (await axiosClient.post("/auth/client-registration/draft", { email })).data;

export const presignRegistrationDocument = async (payload, registrationDraftToken) =>
  (await axiosClient.post("/auth/client-registration/documents/upload-url", payload, { headers: registrationHeaders(registrationDraftToken) })).data;

export const confirmRegistrationDocument = async (payload, registrationDraftToken) =>
  (await axiosClient.post("/auth/client-registration/documents/confirm", payload, { headers: registrationHeaders(registrationDraftToken) })).data;

export const uploadToPresignedUrl = async ({ uploadUrl, file, onProgress }) =>
  axios.put(uploadUrl, file, {
    headers: { "Content-Type": file.type },
    onUploadProgress: (event) => onProgress?.(event.total ? Math.round((event.loaded / event.total) * 100) : 0),
  });

export const submitClientRegistration = async (payload, registrationDraftToken) =>
  (await axiosClient.post("/auth/register-client", payload, { headers: registrationHeaders(registrationDraftToken) })).data;

export const getMyClientOnboarding = async () => (await axiosClient.get("/client-onboarding/me")).data;
export const updateMyClientOnboarding = async (payload) => (await axiosClient.patch("/client-onboarding/me", payload)).data;
export const resubmitClientOnboarding = async () => (await axiosClient.post("/client-onboarding/resubmit")).data;
export const presignClientDocument = async (payload) => (await axiosClient.post("/client-onboarding/documents/upload-url", payload)).data;
export const confirmClientDocument = async (payload) => (await axiosClient.post("/client-onboarding/documents/confirm", payload)).data;
export const createAdminClientRegistrationDraft = async (
  email
) =>
  (
    await axiosClient.post(
      "/admin/client-registrations/create/draft",
      { email }
    )
  ).data;

export const presignAdminRegistrationDocument = async (
  payload,
  registrationDraftToken
) =>
  (
    await axiosClient.post(
      "/admin/client-registrations/create/documents/upload-url",
      payload,
      {
        headers: {
          "x-registration-draft-token":
            registrationDraftToken,
        },
      }
    )
  ).data;

export const confirmAdminRegistrationDocument = async (
  payload,
  registrationDraftToken
) =>
  (
    await axiosClient.post(
      "/admin/client-registrations/create/documents/confirm",
      payload,
      {
        headers: {
          "x-registration-draft-token":
            registrationDraftToken,
        },
      }
    )
  ).data;

export const submitAdminClientRegistration = async (
  payload,
  registrationDraftToken
) =>
  (
    await axiosClient.post(
      "/admin/client-registrations/create/submit",
      payload,
      {
        headers: {
          "x-registration-draft-token":
            registrationDraftToken,
        },
      }
    )
  ).data;
