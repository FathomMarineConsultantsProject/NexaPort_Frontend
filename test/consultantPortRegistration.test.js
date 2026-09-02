import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { searchPublicPorts } from "../src/api/publicPortApi.js";
import {
  canAddCustomPort,
  createCustomPort,
  normalizePortName,
  portIdentity,
} from "../src/utils/portSelection.js";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("public port lookup sends no token and uses the public endpoint", async () => {
  const originalFetch = globalThis.fetch;
  let request;
  globalThis.fetch = async (url, options) => {
    request = { url: String(url), options };
    return { ok: true, json: async () => ({ success: true, ports: [] }) };
  };
  try {
    await searchPublicPorts({ search: "sing", limit: 50 });
  } finally {
    globalThis.fetch = originalFetch;
  }
  assert.match(request.url, /\/api\/public\/ports\/search\?search=sing&limit=50$/);
  assert.equal(request.options.credentials, "omit");
  assert.equal(request.options.headers.Authorization, undefined);
});

test("custom port helpers normalize, reject unsafe input and prevent duplicates", () => {
  const selected = [{ id: 1, port_name: "Singapore" }];
  assert.equal(normalizePortName("  XYZ   Anchorage "), "XYZ Anchorage");
  assert.equal(canAddCustomPort(" singapore ", selected), false);
  assert.equal(canAddCustomPort("<script>", selected), false);
  assert.equal(canAddCustomPort("XYZ Anchorage", selected), true);
  assert.deepEqual(createCustomPort(" XYZ   Anchorage "), {
    id: "custom:xyz anchorage",
    port_name: "XYZ Anchorage",
    custom: true,
  });
  assert.equal(portIdentity({ port_name: " SINGAPORE " }), "singapore");
});

test("registration injects public search and authenticated uses retain the protected default", async () => {
  const [registration, selector, profile, adminRegistration] = await Promise.all([
    source("../src/pages/RegisterConsultant.jsx"),
    source("../src/components/experts/PortSearchMultiSelect.jsx"),
    source("../src/pages/ExpertProfile.jsx"),
    source("../src/pages/RegisterExpert.jsx"),
  ]);
  assert.match(registration, /searchPorts=\{searchPublicPorts\}/);
  assert.match(registration, /allowCustom/);
  assert.match(selector, /searchPorts = getPorts/);
  assert.doesNotMatch(profile, /searchPorts=\{searchPublicPorts\}/);
  assert.doesNotMatch(adminRegistration, /searchPorts=\{searchPublicPorts\}/);
});

test("selector preserves multiple values, removes by normalized name and offers custom fallback after errors", async () => {
  const selector = await source("../src/components/experts/PortSearchMultiSelect.jsx");
  assert.match(selector, /onChange\(\[\.\.\.value, port\]\)/);
  assert.match(selector, /value\.filter\(\(port\) => portIdentity\(port\) !== portIdentity\(portToRemove\)\)/);
  assert.match(selector, /selectedNames\.has\(identity\)/);
  assert.match(selector, /Add “\{customName\}”/);
  assert.match(selector, /Unable to search ports\. You can try again or add the port manually\./);
  assert.doesNotMatch(selector, /window\.location|navigate\("\/login/);
});

test("registration payload includes all selected and custom port names", async () => {
  const registration = await source("../src/pages/RegisterConsultant.jsx");
  assert.match(registration, /ports: formData\.ports\.map\(\(port\) => port\.port_name\)/);
});

test("success panel is a centered column with a centered readable paragraph", async () => {
  const css = await source("../src/pages/RegisterConsultant.css");
  const success = css.slice(css.indexOf(".consultant-success {"), css.indexOf(".consultant-field small"));
  assert.match(success, /display: flex/);
  assert.match(success, /flex-direction: column/);
  assert.match(success, /align-items: center/);
  assert.match(success, /text-align: center/);
  assert.match(success, /\.consultant-success p[\s\S]+margin-left: auto[\s\S]+margin-right: auto/);
});
