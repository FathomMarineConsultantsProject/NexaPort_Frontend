import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (file) => readFile(new URL(file, import.meta.url), "utf8");

test("service request screens use the shared inspection catalogue picker", async () => {
  const create = await source("../src/pages/PostServiceRequest.jsx");
  const list = await source("../src/pages/ServiceRequests.jsx");
  const details = await source("../src/pages/ServiceRequestDetails.jsx");

  assert.match(create, /InspectionCatalogueSelect/);
  assert.match(list, /InspectionCatalogueSelect/);
  assert.match(details, /InspectionCatalogueSelect/);
  assert.match(create, /inspectionMethodId/);
  assert.match(list, /inspectionMethodId/);
  assert.match(details, /inspectionMethodId/);
});

test("old generic request selector is not used in create or edit forms", async () => {
  const create = await source("../src/pages/PostServiceRequest.jsx");
  const list = await source("../src/pages/ServiceRequests.jsx");
  const details = await source("../src/pages/ServiceRequestDetails.jsx");

  assert.doesNotMatch(create, /\["Audit", "Inspection", "Survey", "Other"\]/);
  assert.doesNotMatch(list, /\["Audit", "Inspection", "Survey", "Other"\]/);
  assert.doesNotMatch(details, /\["Audit", "Inspection", "Survey", "Other"\]/);
});

test("catalogue component keeps searchable methods and Other fallback", async () => {
  const component = await source("../src/components/requests/InspectionCatalogueSelect.jsx");

  assert.match(component, /placeholder="Search inspection catalogue"/);
  assert.match(component, /Other \/ specialist service/);
  assert.match(component, /onSelectMethod\(method, vertical\)/);
  assert.match(component, /onSelectOther/);
});
