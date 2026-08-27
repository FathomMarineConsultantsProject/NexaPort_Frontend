export const notProvided = (value) => value === null || value === undefined || value === "" ? "Not provided" : value;

export const formatPortValue = (value) => {
  if (value === true) return "Available / Yes";
  if (value === false) return "Not available / No";
  if (value === null || value === undefined || value === "") return "Not provided";
  if (typeof value === "object") {
    const raw = String(value.raw ?? "").trim();
    if (raw) return raw;
    if (value.value_m != null && Number.isFinite(Number(value.value_m))) return `${value.value_m}${value.unit ? ` ${value.unit}` : " m"}`;
    return "Not provided";
  }
  return String(value);
};

export const splitTags = (value) => String(value || "").split(",").map((item) => item.trim()).filter(Boolean);

export const parseJsonObject = (value, label) => {
  if (!String(value || "").trim()) return undefined;
  let parsed;
  try { parsed = JSON.parse(value); } catch { throw new Error(`${label} must be valid JSON.`); }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(`${label} must be a JSON object.`);
  return parsed;
};

export const buildPortPayload = (form) => {
  const payload = {
    port_name: form.port_name.trim(), country: form.country.trim(), region: form.region.trim(),
    description: form.description.trim(), psc_risk_level: form.psc_risk_level,
    unlocode: form.unlocode.trim(), country_iso: form.country_iso.trim(),
    latitude: form.latitude, longitude: form.longitude, harbour_type: form.harbour_type.trim(), harbour_size: form.harbour_size.trim(), max_draft_m: form.max_draft_m,
    vessel_types: splitTags(form.vessel_types), services: splitTags(form.services),
  };
  const depths = parseJsonObject(form.depths, "Depths");
  const restrictions = parseJsonObject(form.restrictions, "Restrictions");
  const equipment = parseJsonObject(form.equipment, "Equipment");
  const navigation = parseJsonObject(form.navigation, "Navigation");
  const communication = parseJsonObject(form.communication, "Communication");
  if (depths) payload.depths = depths;
  if (restrictions) payload.restrictions = restrictions;
  if (equipment) payload.equipment = equipment;
  if (navigation) payload.navigation = navigation;
  if (communication) payload.communication = communication;
  return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== "" && value !== undefined));
};
