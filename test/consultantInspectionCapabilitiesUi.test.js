import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (file) => readFile(new URL(file, import.meta.url), "utf8");

test("consultant registration loads catalogue and submits selected inspection method IDs", async () => {
  const [registration, constants] = await Promise.all([
    source("../src/pages/RegisterConsultant.jsx"),
    source("../src/helpers/consultantRegistrationConstants.js"),
  ]);

  assert.match(registration, /getServiceRequestDropdowns/);
  assert.match(registration, /InspectionCapabilityMultiSelect/);
  assert.match(registration, /inspectionMethodIds: formData\.inspectionMethodIds/);
  assert.match(constants, /inspectionMethodIds: \[\]/);
});

test("admin consultant creation uses the same capability picker", async () => {
  const page = await source("../src/pages/RegisterExpert.jsx");

  assert.match(page, /getServiceRequestDropdowns/);
  assert.match(page, /InspectionCapabilityMultiSelect/);
  assert.match(page, /inspectionMethodIds: selectedInspectionMethodIds/);
});

test("consultant profile edit loads, saves, and displays capabilities", async () => {
  const page = await source("../src/pages/ExpertProfile.jsx");

  assert.match(page, /capabilityMethodIds\(expertRes\.data\.inspection_capabilities/);
  assert.match(page, /inspectionMethodIds: editForm\.inspectionMethodIds/);
  assert.match(page, /Inspection Capabilities/);
  assert.match(page, /expert\.inspection_capabilities\.map/);
  assert.match(page, /Not provided/);
});

test("capability multi-select supports search, multiple verticals, and removal", async () => {
  const component = await source("../src/components/requests/InspectionCapabilityMultiSelect.jsx");

  assert.match(component, /placeholder="Search inspection capabilities"/);
  assert.match(component, /type="checkbox"/);
  assert.match(component, /visibleVerticals\.map/);
  assert.match(component, /toggleMethod\(method\.id\)/);
  assert.match(component, /<X size=\{13\}/);
});
