import axios from "axios";

const axiosClient = axios.create({
  baseURL:
    import.meta.env.VITE_API_BASE_URL ||
    "https://nexa-port-backend.vercel.app/api",
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
      !isPasswordResetRequest
    ) {
      localStorage.removeItem("np_token");
      localStorage.removeItem("np_user");
      window.location.href = "/login";
    }

    return Promise.reject(err);
  }
);

export default axiosClient;