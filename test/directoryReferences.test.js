import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const page = (name) => readFile(new URL(`../src/pages/${name}`, import.meta.url), "utf8");

test("consultant cards and profiles prefer issued numeric IDs over historical EXP aliases", async () => {
  const [card, profile, directory] = await Promise.all([
    readFile(new URL("../src/components/experts/ExpertCard.jsx", import.meta.url), "utf8"),
    page("ExpertProfile.jsx"), page("ExpertDirectory.jsx"),
  ]);
  assert.match(card, /expert\.nexaport_id \|\| expert\.directory_public_id/);
  assert.match(profile, /expert\.nexaport_id \|\| expert\.directory_public_id/);
  assert.match(directory, /expert\.nexaport_id, expert\.public_id, expert\.directory_public_id/);
});

test("existing directory views show stored references without creating new ones", async () => {
  const names = [
    "FlagDirectory.jsx", "AccreditedInspectorDirectory.jsx",
    "AppointedSurveyorDirectory.jsx", "VesselDirectory.jsx", "FleetManagement.jsx",
    "PortDirectory.jsx", "PortDetailPage.jsx",
    "CompanyProfile.jsx",
  ];
  for (const name of names) {
    const source = await page(name);
    assert.match(source, /className="nexaport-id"/, `${name} should use compact reference styling`);
    assert.match(source, /public_id|nexaport_id|nexaport_company_id/, `${name} should read the API reference`);
  }
  const [details, shared] = await Promise.all([
    page("MaritimeDirectoryDetails.jsx"),
    readFile(new URL("../src/components/directories/DirectoryUI.jsx", import.meta.url), "utf8"),
  ]);
  assert.match(details, /DirectoryDetailHeader/);
  assert.match(shared, /view\.entity\.nexaport_company_id/);
  const [companies, inspectors] = await Promise.all([
    page("MaritimeDirectoryPage.jsx"), page("InspectorSearch.jsx"),
  ]);
  assert.match(companies, /className="md-table-id"/);
  assert.match(companies, /row\.nexaport_company_id/);
  assert.match(inspectors, /className="inspector-reference"/);
  assert.match(inspectors, /item\.nexaport_id/);
});

test("all company categories use the same entity detail route", async () => {
  const config = await readFile(new URL("../src/config/adminDirectories.js", import.meta.url), "utf8");
  const app = await readFile(new URL("../src/App.jsx", import.meta.url), "utf8");
  for (const path of ["owners-managers", "service-providers", "ship-agents", "suppliers", "shipyards", "tug-boats"]) {
    assert.match(config, new RegExp(`/${path}`));
  }
  assert.match(app, /path="\/directories\/:directoryType\/:entityId"/);
});
