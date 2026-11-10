const DEPLOYED_API_BASE_URL = "https://nexa-port-backend.vercel.app/api";

// Development must use an explicitly local API; never route local test actions
// to the deployed backend through an inherited .env value.
export const API_BASE_URL = import.meta.env?.DEV
  ? import.meta.env?.VITE_LOCAL_API_BASE_URL || "http://127.0.0.1:5056/api"
  : import.meta.env?.VITE_API_BASE_URL || DEPLOYED_API_BASE_URL;
