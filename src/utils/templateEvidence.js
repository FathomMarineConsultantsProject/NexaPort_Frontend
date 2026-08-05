const TYPES = new Set(["text", "textarea", "number", "date", "checkbox", "yes_no", "select", "signature", "photo", "section_heading"]);
const COMMON_LABELS = /^(marina|dock|pier|vessel|ship|imo|port|date|location|inspector|surveyor|client|owner|operator|certificate|condition|status|remarks?|observations?|description|recommendations?|defects?|equipment|serial|manufacturer|model|hull|deck|superstructure|stability|life jackets?|fire extinguishers?|safety signage|epirb|flares?|dewatering)\b/i;
const KNOWN_SECTIONS = new Set(["inspection information", "dock structure", "electrical", "fire safety", "safety assessment", "equipment verification", "environmental & housekeeping", "compliance verification", "communication & prevention", "summary & sign-off", "structural integrity", "safety protocols", "emergency equipment"]);
const MARKETING = /popprobe|popprobe\.com|lumiform|capterra|automatic reports?|template library|register.*qr|qr.*register|marketing|legal disclaimer|terms and conditions|standards?\s+links?|download(?:\s+this)?|https?:\/\/|www\.|\b[a-z0-9-]+\.(?:com|org|net)\b|★|☆/i;
const clean = (value, max = 200) => [...String(value ?? "")].filter((character) => character !== "<" && character !== ">" && character.charCodeAt(0) >= 32).join("").trim().slice(0, max);
const canonical = (value) => clean(value, 1000).replace(/\s+/g, " ").trim().toLowerCase();
const keyFor = (label, index) => `${canonical(label).replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "").slice(0, 60) || "field"}_${index + 1}`;
const strippedOptions = (value) => clean(value, 200).replace(/[☐□☑✓✔\[\]]/g, " ").replace(/\s+/g, " ").trim();
const optionOnly = (value) => /^(?:yes|no|yes no|good|fair|poor|good fair poor|acceptable|unacceptable|acceptable unacceptable)$/i.test(strippedOptions(value));
const placeholderOnly = (value) => /^(?:[-–—_.\/\\|*\s]|☐|□|☑|✓|✔)+$/.test(clean(value, 500)) || /^(?:_+|\.+)\s*[\/.]\s*(?:_+|\.+)(?:\s*[\/.]\s*(?:_+|\.+))?$/.test(clean(value, 500));
const junkLine = (value) => { const text = clean(value, 1000); return !text || !/[\p{L}\p{N}]/u.test(text) || placeholderOnly(text) || MARKETING.test(text) || /^(?:page\s*)?\d+(?:\s+of\s+\d+)?$/i.test(text) || optionOnly(text); };
const normalizeLabel = (value) => clean(value, 160).replace(/[☐□☑✓✔]/g, " ").replace(/\s*\*+\s*/g, " ").replace(/\s+/g, " ").replace(/\s*:\s*$/, "").trim();

export function normalizeLocalFields(input) {
  const seen = new Set();
  return input.slice(0, 250).map((raw, index) => {
    let fieldKey = /^[a-zA-Z][a-zA-Z0-9_-]{0,79}$/.test(raw.fieldKey || "") ? raw.fieldKey : keyFor(raw.label, index); while (seen.has(fieldKey)) fieldKey = `${fieldKey.slice(0, 74)}_${index + 1}`; seen.add(fieldKey); const type = TYPES.has(raw.type) ? raw.type : "text";
    return { fieldKey, label: normalizeLabel(raw.label), type, required: Boolean(raw.required), section: clean(raw.section || "General", 100), sortOrder: index, defaultValue: type === "checkbox" ? Boolean(raw.defaultValue) : clean(raw.defaultValue, 1000), options: ["select", "yes_no"].includes(type) ? [...new Set((raw.options || []).map((value) => clean(value, 100)).filter(Boolean))].slice(0, 50) : [], sourceFieldName: clean(raw.sourceFieldName, 200) || null, sourcePageNumber: Number.isInteger(raw.sourcePageNumber) ? raw.sourcePageNumber : null, sourceCoordinates: raw.sourceCoordinates || null, captionEnabled: type === "photo" && Boolean(raw.captionEnabled), suggested: Boolean(raw.suggested) };
  }).filter((field) => field.label && !junkLine(field.label));
}

function groupOptionRows(lines) {
  const grouped = [];
  for (const raw of lines) {
    const line = { ...raw, text: clean(raw?.text, 1000).replace(/\s+/g, " ").trim() }; if (!line.text || placeholderOnly(line.text) || MARKETING.test(line.text) || /^(?:page\s*)?\d+(?:\s+of\s+\d+)?$/i.test(line.text)) continue;
    if (optionOnly(line.text)) { const previous = grouped.at(-1); const prompt = previous?.text || ""; if (previous && (/[?*]$/.test(prompt) || /condition|available|functional|operational|freeboard|serviced|tested|charged|clear|in date/i.test(prompt))) previous.text = `${prompt} ${strippedOptions(line.text)}`; continue; } grouped.push(line);
  }
  return grouped.filter((line) => !junkLine(line.text));
}

export function buildStructuredEvidence(pages = []) {
  const prepared = pages.map((page, pageIndex) => ({ name: clean(page?.name, 120) || `Page ${pageIndex + 1}`, lines: groupOptionRows(page?.lines || []) })); const boundaries = new Map(); prepared.forEach((page, pageIndex) => [...page.lines.slice(0, 2), ...page.lines.slice(-2)].forEach((line) => { const key = canonical(line.text); if (!boundaries.has(key)) boundaries.set(key, new Set()); boundaries.get(key).add(pageIndex); })); const repeated = new Set([...boundaries].filter(([, pageSet]) => pageSet.size > 1).map(([key]) => key)); const seen = new Set(); return prepared.map((page) => ({ ...page, lines: page.lines.filter((line) => { const key = canonical(line.text); if (!key || repeated.has(key) || seen.has(key)) return false; seen.add(key); return true; }).map((line, order) => ({ ...line, order })) })).filter((page) => page.lines.length);
}

const sectionHeading = (line) => { const text = normalizeLabel(line.text); return KNOWN_SECTIONS.has(text.toLowerCase()) || Boolean(text && !/[?*:]$/.test(text) && text.split(/\s+/).length <= 6 && (line.bold || Number(line.fontSize) >= 15)); };

export function suggestFieldsFromEvidence(pages, fallbackSection = "General") {
  const candidates = []; let section = fallbackSection;
  for (const page of pages) for (const line of page.lines) {
    if (sectionHeading(line)) { section = normalizeLabel(line.text); continue; } const source = clean(line.text, 1000); const normalized = strippedOptions(source); const yesNo = normalized.match(/^(.*?)\s+yes\s+no$/i); const select = normalized.match(/^(.*?)\s+(good\s+fair\s+poor|acceptable\s+unacceptable)$/i); const required = /\*/.test(source); const label = normalizeLabel(yesNo?.[1] || select?.[1] || normalized);
    if (!label || junkLine(label) || /^yes$|^no$/i.test(label) || (!required && !yesNo && !select && !/[?:]$/.test(normalized) && !COMMON_LABELS.test(label))) continue; const lower = label.toLowerCase(); const type = yesNo ? "yes_no" : select ? "select" : /signature/.test(lower) ? "signature" : /\bdate\b/.test(lower) ? "date" : /comments?|findings?|observations?|remarks?|recommendations?/.test(lower) ? "textarea" : "text"; const options = yesNo ? ["Yes", "No"] : select?.[2].toLowerCase().startsWith("good") ? ["Good", "Fair", "Poor"] : select ? ["Acceptable", "Unacceptable"] : []; candidates.push({ label, type, required, section, options, sourcePageNumber: Number(page.name.match(/\d+/)?.[0]) || null, suggested: true });
  }
  return normalizeLocalFields(candidates.filter((field, index) => candidates.findIndex((item) => canonical(item.section) === canonical(field.section) && canonical(item.label) === canonical(field.label)) === index));
}

export function suggestFieldsFromText(text, section = "General") { return suggestFieldsFromEvidence(buildStructuredEvidence([{ name: "Page 1", lines: String(text || "").split(/\r?\n/).map((line) => ({ text: line })) }]), section); }
export const usefulLocalFields = (fields) => fields.filter((field) => field?.label && !junkLine(field.label));

export function mergeMappedFields(currentFields, baselineFields, mappedFields, sections) {
  const baseline = new Map(baselineFields.map((field) => [field.fieldKey, JSON.stringify(field)])); const manual = usefulLocalFields(currentFields).filter((field) => !field.suggested || baseline.get(field.fieldKey) !== JSON.stringify(field)); const mapped = mappedFields.map((field) => ({ fieldKey: field.fieldKey, label: field.label, type: field.fieldType, required: field.required, section: sections.get(field.sectionKey), sortOrder: field.sortOrder, options: field.options, defaultValue: "", sourceFieldName: null, sourcePageNumber: null, sourceCoordinates: null, captionEnabled: field.fieldType === "photo", suggested: true })); const manualLabels = new Set(manual.map((field) => `${canonical(field.section)}|${canonical(field.label)}`)); return [...mapped.filter((field) => !manualLabels.has(`${canonical(field.section)}|${canonical(field.label)}`)), ...manual].map((field, sortOrder) => ({ ...field, sortOrder }));
}

export { clean, keyFor };
