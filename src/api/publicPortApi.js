const API_BASE_URL =
  import.meta.env?.VITE_API_BASE_URL || "https://nexa-port-backend.vercel.app/api";

export const searchPublicPorts = async ({ search = "", limit = 50 } = {}) => {
  const params = new URLSearchParams({ search, limit: String(limit) });
  const response = await fetch(`${API_BASE_URL}/public/ports/search?${params}`, {
    method: "GET",
    headers: { Accept: "application/json" },
    credentials: "omit",
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) throw new Error(data.message || "Unable to search ports");
  return data;
};
