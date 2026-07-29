const text = (value) => String(value ?? "").trim() || null;

const extraData = (entity) => {
  const value = entity?.extra_data ?? entity?.extraData;
  if (!value) return {};
  if (typeof value === "object") return value;
  try { return JSON.parse(value); } catch { return {}; }
};

const measurement = (dimensions, key, label) => {
  const value = Number(dimensions?.[key]);
  return Number.isFinite(value) && value > 0 ? { label, value: `${value} m` } : null;
};

export const isShipyardDirectory = (directoryType) => directoryType === "shipyard";

export const getShipyardProfile = (entity = {}) => {
  const extra = extraData(entity);
  const shipyard = extra.shipyard || {};
  const location = shipyard.location || {};
  const contacts = extra.authenticated_contacts || extra.authenticatedContacts || {};
  const aboutSections = (Array.isArray(shipyard.about_sections) ? shipyard.about_sections : [])
    .map((section) => ({ heading: text(section?.heading), body: text(section?.body) }))
    .filter(({ heading, body }) => heading || body);
  const dimensions = [
    measurement(shipyard.dimensions, "max_length_m", "Max Length"),
    measurement(shipyard.dimensions, "max_width_m", "Max Width"),
    measurement(shipyard.dimensions, "max_draft_m", "Max Draft"),
  ].filter(Boolean);
  const latitude = location.latitude == null || location.latitude === "" ? null : Number(location.latitude);
  const longitude = location.longitude == null || location.longitude === "" ? null : Number(location.longitude);
  const hasCoordinates = latitude != null && Number.isFinite(latitude) && latitude >= -90 && latitude <= 90 &&
    longitude != null && Number.isFinite(longitude) && longitude >= -180 && longitude <= 180;
  return {
    aboutSections,
    description: text(entity.description),
    dimensions,
    address: text(entity.public_address) || text(location.public_address) || text(contacts.public_address),
    phone: text(entity.public_phone) || text(location.public_phone) || text(contacts.public_business_phone),
    city: text(entity.city) || text(location.city) || text(contacts.city),
    country: text(entity.country) || text(location.country),
    coordinates: hasCoordinates ? { latitude, longitude } : null,
  };
};

export const shipyardMapUrl = ({ latitude, longitude }) => {
  const delta = 0.02;
  const bbox = [longitude - delta, latitude - delta, longitude + delta, latitude + delta].join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&marker=${encodeURIComponent(`${latitude},${longitude}`)}`;
};
