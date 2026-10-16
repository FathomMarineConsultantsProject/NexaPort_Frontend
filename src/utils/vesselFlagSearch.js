const CODE_NAMES = { IND: "India", IN: "India" };
const normalize = (value) => String(value || "").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase().trim();

export const flagLabel = (value) => {
  const raw = String(value || "").trim();
  const name = CODE_NAMES[raw.toUpperCase()];
  return name ? `${name} (${raw})` : raw;
};

export const flagMatches = (value, term) => {
  const query = normalize(term);
  return !query || normalize(value).startsWith(query) || normalize(flagLabel(value)).startsWith(query);
};
