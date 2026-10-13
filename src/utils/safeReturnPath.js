export const safeReturnPath = (value) => {
  if (typeof value !== "string" || value.length > 300 || !value.startsWith("/") || value.startsWith("//") || value.includes("\\") || [...value].some((char) => char.charCodeAt(0) < 32)) return null;
  try {
    const parsed = new URL(value, "https://internal.invalid");
    if (parsed.origin !== "https://internal.invalid" || !/^\/s\/[0-9a-f]{64}$/.test(parsed.pathname) || parsed.search || parsed.hash) return null;
    return parsed.pathname;
  } catch { return null; }
};

export const loginPathFor = (path) => {
  const safe = safeReturnPath(path);
  return safe ? `/login?returnTo=${encodeURIComponent(safe)}` : "/login";
};
