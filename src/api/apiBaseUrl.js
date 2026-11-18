const DEPLOYED_API_BASE_URL = "https://nexa-port-backend.vercel.app/api";

// Development uses the hosted API unless VITE_API_MODE explicitly selects local.
const developmentMode = import.meta.env?.VITE_API_MODE || "hosted";
if (import.meta.env?.DEV && !["local", "hosted"].includes(developmentMode)) {
  throw new Error("VITE_API_MODE must be local or hosted");
}
const localApiBaseUrl = import.meta.env?.VITE_LOCAL_API_BASE_URL || "http://127.0.0.1:5000/api";
if (import.meta.env?.DEV && developmentMode === "local" &&
  !["localhost", "127.0.0.1", "[::1]"].includes(new URL(localApiBaseUrl).hostname)) {
  throw new Error("Local API mode requires a localhost API URL");
}
export const API_BASE_URL = import.meta.env?.DEV
  ? developmentMode === "hosted"
    ? DEPLOYED_API_BASE_URL
    : localApiBaseUrl
  : import.meta.env?.VITE_API_BASE_URL || DEPLOYED_API_BASE_URL;
