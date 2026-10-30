const DEPLOYED_API_BASE_URL = "https://nexa-port-backend.vercel.app/api";

// Local frontend development uses the deployed backend, even when a shell or
// stale .env file points Vite at a local backend.
export const API_BASE_URL = import.meta.env?.DEV
  ? DEPLOYED_API_BASE_URL
  : import.meta.env?.VITE_API_BASE_URL || DEPLOYED_API_BASE_URL;
