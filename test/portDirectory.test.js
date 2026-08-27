import assert from "node:assert/strict";
import fs from "node:fs/promises";
import test from "node:test";
import { buildPortPayload, formatPortValue, notProvided } from "../src/utils/portDirectory.js";

const source = (path) => fs.readFile(new URL(path, import.meta.url), "utf8");
const basicForm = { port_name: " Test Port ", country: " India ", region: " Asia Pacific ", description: "", psc_risk_level: "Medium", unlocode: "", country_iso: "", latitude: "", longitude: "", harbour_type: "", harbour_size: "", max_draft_m: "", vessel_types: "", services: "", depths: "", restrictions: "", equipment: "", navigation: "", communication: "" };

test("simple Add Port payload remains valid with the original required fields", () => {
  const payload = buildPortPayload(basicForm);
  assert.equal(payload.port_name, "Test Port");
  assert.equal(payload.country, "India");
  assert.equal(payload.region, "Asia Pacific");
  assert.equal(payload.depths, undefined);
});

test("optional enriched fields and structured objects are included", () => {
  const payload = buildPortPayload({ ...basicForm, unlocode: "INMAA", latitude: "13.08", vessel_types: "Tanker, Container", depths: '{"channel_depth":{"raw":"12 m"}}' });
  assert.equal(payload.unlocode, "INMAA");
  assert.equal(payload.latitude, "13.08");
  assert.deepEqual(payload.vessel_types, ["Tanker", "Container"]);
  assert.equal(payload.depths.channel_depth.raw, "12 m");
});

test("invalid advanced JSON gives an actionable error", () => {
  assert.throws(() => buildPortPayload({ ...basicForm, navigation: "[1]" }), /Navigation must be a JSON object/);
});

test("Not provided handling does not turn absent data into zero", () => {
  assert.equal(notProvided(null), "Not provided");
  assert.equal(notProvided(""), "Not provided");
  assert.equal(notProvided(0), 0);
  assert.equal(notProvided(false), false);
  assert.equal(formatPortValue(true), "Available / Yes");
  assert.equal(formatPortValue(false), "Not available / No");
  assert.equal(formatPortValue({ value_m: null, unit: null, raw: null }), "Not provided");
  assert.equal(formatPortValue({ value_m: null, unit: "m", raw: null }), "Not provided");
  assert.equal(formatPortValue({ value_m: 7.1, unit: "m", raw: "7.1m - 9.1m" }), "7.1m - 9.1m");
  assert.equal(formatPortValue({ value_m: 12.5, unit: "m", raw: null }), "12.5 m");
});

test("directory uses server pagination, debounced search and detail navigation", async () => {
  const directory = await source("../src/pages/PortDirectory.jsx");
  assert.match(directory, /setTimeout[\s\S]+350/);
  assert.match(directory, /getPorts\(\{ search: debouncedSearch[\s\S]+page, limit/);
  assert.match(directory, /navigate\(`\/ports\/\$\{port\.id\}`\)/);
  assert.match(directory, /Showing \$\{start\}–\$\{end\} of \$\{pagination\.total\}/);
});

test("port selector explicitly requests compact compatibility mode", async () => {
  const selector = await source("../src/components/experts/PortSearchMultiSelect.jsx");
  assert.match(selector, /compact: true/);
});

test("detail route and tri-state detail rendering are present", async () => {
  const [app, detail, utility] = await Promise.all([source("../src/App.jsx"), source("../src/pages/PortDetailPage.jsx"), source("../src/utils/portDirectory.js")]);
  assert.match(app, /path="\/ports\/:id"/);
  assert.match(detail, /formatPortValue/);
  assert.match(utility, /Available \/ Yes/);
  assert.match(utility, /Not available \/ No/);
  assert.match(utility, /Not provided/);
});
