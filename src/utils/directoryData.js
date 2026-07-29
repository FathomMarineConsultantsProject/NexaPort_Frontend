const missingText = new Set(["", "null", "undefined"]);

export const cleanText = (value) => {
  if (value === null || value === undefined) return null;
  const result = String(value).trim();
  return missingText.has(result.toLowerCase()) ? null : result;
};

export const parseJson = (value, fallback = null) => {
  if (typeof value !== "string") return value ?? fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
};

export const isMeaningful = (value) => {
  const parsed = parseJson(value, value);
  if (typeof parsed === "string") return Boolean(cleanText(parsed));
  if (Array.isArray(parsed)) return parsed.some(isMeaningful);
  if (parsed && typeof parsed === "object") return Object.values(parsed).some(isMeaningful);
  return parsed !== null && parsed !== undefined;
};

export const positiveCount = (value) => {
  const count = Number(value);
  return Number.isFinite(count) && count > 0 ? count : 0;
};

const first = (...values) => values.map(cleanText).find(Boolean) || null;
const list = (value) => {
  const parsed = parseJson(value, []);
  return Array.isArray(parsed) ? parsed.filter(isMeaningful) : [];
};
const object = (value) => {
  const parsed = parseJson(value, {});
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
};
const field = (record, snake, camel) => record?.[snake] ?? record?.[camel];
const rowValue = (row, ...keys) => keys.map((key) => cleanText(row?.[key])).find(Boolean) || null;

export const normalizeTextKey = (value) =>
  (cleanText(value) || "").toLowerCase().replace(/\s+/g, " ");

const deduplicate = (rows, keyFor) => {
  const seen = new Set();
  return rows.filter((row) => {
    const key = keyFor(row);
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });
};

const mergeBy = (rows, keyFor, merge) => {
  const merged = new Map();
  rows.forEach((row) => {
    const key = keyFor(row);
    if (!key) return;
    merged.set(key, merged.has(key) ? merge(merged.get(key), row) : row);
  });
  return [...merged.values()];
};

export const safeWebsite = (value) => {
  const text = cleanText(value);
  if (!text) return null;
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(text) ? text : `https://${text}`);
    return ["http:", "https:"].includes(url.protocol) && !url.hostname.toLowerCase().includes("magicport")
      ? url.toString()
      : null;
  } catch {
    return null;
  }
};

export const validLogoUrl = (value) => {
  const text = cleanText(value);
  if (!text || ["/company-banners/", "static/company-banners", "banner-", "hero-"].some((part) => text.toLowerCase().includes(part))) return null;
  try {
    const url = new URL(text);
    return ["http:", "https:"].includes(url.protocol) && url.hostname ? url.toString() : null;
  } catch {
    return null;
  }
};

export const validEmail = (value) => {
  const email = cleanText(value);
  return email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
};

const measurement = (dimensions, snake, camel, label) => {
  const value = Number(field(dimensions, snake, camel));
  return Number.isFinite(value) && value > 0 ? { label, value: `${value} m` } : null;
};

const coordinates = (location) => {
  const latitudeText = cleanText(field(location, "latitude", "lat"));
  const longitudeText = cleanText(
    location?.longitude ?? location?.lng ?? location?.lon
  );
  const latitude = latitudeText === null ? null : Number(latitudeText);
  const longitude = longitudeText === null ? null : Number(longitudeText);
  return Number.isFinite(latitude) &&
    latitude !== null &&
    latitude >= -90 &&
    latitude <= 90 &&
    Number.isFinite(longitude) &&
    longitude !== null &&
    longitude >= -180 &&
    longitude <= 180
    ? { latitude, longitude }
    : null;
};

const normalizeAbout = (extra) => {
  const shipyard = object(extra.shipyard);
  return list(field(shipyard, "about_sections", "aboutSections"))
    .map((section) => ({
      heading: first(section?.heading, section?.title),
      body: first(section?.body, section?.text, section?.description),
    }))
    .filter(({ heading, body }) => heading || body);
};

const normalizeRowList = (record, snake, camel, primaryFields = []) =>
  list(field(record, snake, camel)).filter((row) =>
    typeof row === "string" ? isMeaningful(row) : primaryFields.some((key) => isMeaningful(row?.[key])),
  );

const genericServiceCategories = new Set([
  "directory classification", "supplier", "service provider", "service_provider", "ship agent", "ship_agent", "tug boat", "tug_boat",
]);

const servicePriority = {
  ship_agent: /agency|husbandry|custom|crew|cargo|logistic|bunker|document|clearance/i,
  supplier: /product|provision|spare|store|equipment|safety|supply/i,
};

export const normalizeServices = (rows, directoryType = "") => {
  const services = rows.map((row) => {
    const name = typeof row === "string" ? cleanText(row) : rowValue(row, "service_name", "serviceName", "name");
    const rawCategory = typeof row === "string" ? null : rowValue(row, "category");
    const categoryKey = normalizeTextKey(rawCategory);
    const category = !categoryKey || categoryKey === normalizeTextKey(name) || genericServiceCategories.has(categoryKey)
      ? null
      : rawCategory;
    const description = typeof row === "string" ? null : rowValue(row, "service_description", "serviceDescription", "description");
    return { name, category, description };
  }).filter(({ name }) => name && !genericServiceCategories.has(normalizeTextKey(name)));
  const unique = mergeBy(
    services,
    ({ name }) => normalizeTextKey(name),
    (current, incoming) => ({
      name: current.name,
      category: current.category || incoming.category,
      description: [current.description, incoming.description].filter(Boolean).sort((a, b) => b.length - a.length)[0] || null,
    }),
  );
  const priority = servicePriority[directoryType];
  return unique.sort((left, right) => {
    const leftPriority = priority?.test(`${left.category || ""} ${left.name}`) ? 0 : 1;
    const rightPriority = priority?.test(`${right.category || ""} ${right.name}`) ? 0 : 1;
    return leftPriority - rightPriority ||
      (left.category || "Services").localeCompare(right.category || "Services") ||
      left.name.localeCompare(right.name);
  });
};

export const normalizePorts = (rows) => deduplicate(rows.map((row) => ({
  name: typeof row === "string" ? cleanText(row) : rowValue(row, "port_name", "portName", "name"),
  country: typeof row === "string" ? null : rowValue(row, "country"),
  unlocode: typeof row === "string" ? null : rowValue(row, "unlocode"),
})).filter(({ name }) => name), ({ name, country, unlocode }) =>
  `${normalizeTextKey(name)}|${normalizeTextKey(country)}|${normalizeTextKey(unlocode)}`);

const normalizeBranches = (rows) => deduplicate(rows.map((row) => ({
  ...row,
  branchName: rowValue(row, "branch_name", "branchName", "name"),
  branchType: rowValue(row, "branch_type", "branchType"),
  address: rowValue(row, "public_address", "publicAddress"),
  city: rowValue(row, "city"),
  country: rowValue(row, "country"),
  phone: rowValue(row, "public_telephone", "publicTelephone", "public_phone", "publicPhone"),
  email: rowValue(row, "public_email", "publicEmail"),
})), ({ branchName, address, city, country }) =>
  `${normalizeTextKey(branchName)}|${normalizeTextKey(address)}|${normalizeTextKey(city)}|${normalizeTextKey(country)}`);

export const normalizeProducts = (rows) => mergeBy(rows.map((row) => ({
  ...row,
  name: typeof row === "string" ? cleanText(row) : rowValue(row, "product_name", "productName", "name"),
  category: typeof row === "string" ? null : rowValue(row, "category"),
  manufacturer: typeof row === "string" ? null : rowValue(row, "manufacturer"),
})).filter(({ name }) => name), ({ name }) => normalizeTextKey(name), (current, incoming) => ({
  ...current,
  category: current.category || incoming.category,
  manufacturer: current.manufacturer || incoming.manufacturer,
}));

const deduplicateByFields = (rows, keys) =>
  deduplicate(rows, (row) => normalizeTextKey(rowValue(row, ...keys)));

export const directoryView = (record = {}, directoryType = "") => {
  const entity = object(record.entity || record);
  const extra = object(field(entity, "extra_data", "extraData"));
  const shipyard = object(extra.shipyard);
  const shipyardLocation = object(shipyard.location);
  const contacts = object(extra.authenticated_contacts || extra.authenticatedContacts);
  const tug = object(extra.tug_boat || extra.tugBoat);
  const branchesAndOffices = normalizeBranches(normalizeRowList(record, "branches", "branches", [
    "branch_name", "branchName", "public_address", "publicAddress", "city", "country",
  ]));
  const offices = branchesAndOffices.filter((row) =>
    /office/i.test(first(row.branchType, row.branchName) || ""),
  );
  const branches = branchesAndOffices.filter((row) => !offices.includes(row));
  const recordTypes = list(field(record, "directory_types", "directoryTypes"));
  const entityTypes = list(field(entity, "directory_types", "directoryTypes"));

  return {
    entity,
    name: first(entity.company_name, entity.companyName) || "Unnamed company",
    description: first(entity.description, entity.description_excerpt, entity.descriptionExcerpt),
    logo: first(entity.logo_url, entity.logoUrl),
    city: first(entity.city, shipyardLocation.city, contacts.city),
    country: first(entity.country, shipyardLocation.country),
    coordinates: coordinates(shipyardLocation),
    address: first(entity.public_address, entity.publicAddress, shipyardLocation.public_address, shipyardLocation.publicAddress, contacts.public_address, contacts.publicAddress),
    phone: first(entity.public_phone, entity.publicPhone, shipyardLocation.public_phone, shipyardLocation.publicPhone, contacts.public_business_phone, contacts.publicBusinessPhone),
    email: first(entity.public_email, entity.publicEmail, contacts.public_email, contacts.publicEmail),
    website: first(entity.website, entity.website_url, entity.websiteUrl),
    yearsExperience: positiveCount(field(entity, "years_experience", "yearsExperience")),
    vesselsHandled: positiveCount(field(entity, "vessels_handled", "vesselsHandled")),
    claimedStatus: first(entity.claimed_status, entity.claimedStatus),
    reviewStatus: first(entity.review_status, entity.reviewStatus) || "pending",
    isActive: field(entity, "is_active", "isActive") !== false,
    directoryTypes: recordTypes.length ? recordTypes : entityTypes.length ? entityTypes : directoryType ? [directoryType] : [],
    aboutSections: normalizeAbout(extra),
    dimensions: [
      measurement(object(shipyard.dimensions), "max_length_m", "maxLengthM", "Max Length"),
      measurement(object(shipyard.dimensions), "max_width_m", "maxWidthM", "Max Width"),
      measurement(object(shipyard.dimensions), "max_draft_m", "maxDraftM", "Max Draft"),
    ].filter(Boolean),
    services: normalizeServices(normalizeRowList(record, "services", "services", ["service_name", "serviceName", "name"]), directoryType),
    ports: normalizePorts(normalizeRowList(record, "ports", "ports", ["port_name", "portName", "name"])),
    branches,
    offices,
    certifications: deduplicateByFields(normalizeRowList(record, "certifications", "certifications", ["certification_name", "certificationName", "name"]), ["certification_name", "certificationName", "name"]),
    classApprovals: deduplicateByFields(normalizeRowList(record, "class_approvals", "classApprovals", ["society_name", "societyName", "name"]), ["society_name", "societyName", "name"]),
    memberships: deduplicateByFields(normalizeRowList(record, "memberships", "memberships", ["organization_name", "organizationName", "name"]), ["organization_name", "organizationName", "name"]),
    products: normalizeProducts(normalizeRowList(record, "products", "products", ["product_name", "productName", "name"])),
    faqs: deduplicateByFields(normalizeRowList(record, "faqs", "faqs", ["question"]).filter((row) => isMeaningful(row.answer)), ["question"]),
    fleet: list(tug.fleet || tug.tugs || tug.vessels || extra.fleet),
  };
};

export const listServiceNames = (row) =>
  normalizeServices(list(row?.services)).map(({ name }) => name);
