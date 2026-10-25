import axios from "axios";
import { loginPathFor } from "../utils/safeReturnPath.js";
import { API_BASE_URL } from "./apiBaseUrl.js";

const axiosClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("np_token");

  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }

  return config;
});

axiosClient.interceptors.response.use(
  (res) => res,
  (err) => {
    const requestUrl = err.config?.url || "";

    const isPasswordResetRequest =
      requestUrl.includes("/auth/forgot-password/send-otp") ||
      requestUrl.includes("/auth/forgot-password/reset");

    if (
      err.response?.status === 401 &&
      !isPasswordResetRequest &&
      !err.config?.skipAuthRedirect
    ) {
      localStorage.removeItem("np_token");
      localStorage.removeItem("np_user");
      window.location.href = loginPathFor(window.location.pathname);
    }

    return Promise.reject(err);
  }
);

export default axiosClient;
