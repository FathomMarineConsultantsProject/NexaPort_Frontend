import axios from "axios";

const axiosClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "https://nexa-port-backend.vercel.app/api",
  headers: {
    "Content-Type": "application/json",
  },
});

// Attach JWT token to every request automatically
axiosClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("np_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});
 
// If 401 comes back, clear token and redirect to login
axiosClient.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem("np_token");
      localStorage.removeItem("np_user");
      window.location.href = "/login";
    }
    return Promise.reject(err);
  }
);

export default axiosClient;