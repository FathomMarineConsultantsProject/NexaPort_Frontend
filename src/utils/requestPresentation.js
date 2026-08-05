export const normalizeNarrative = (value) => String(value || "").trim().toLowerCase().replace(/\s+/g, " ").replace(/[.!?,;:]+$/g, "");
export const displayCase = (value) => String(value || "").replace(/\b[A-Z]{2}[a-z]+\b/g, (word) => word[0] + word.slice(1).toLowerCase());
