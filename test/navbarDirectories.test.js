import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  ADMIN_DIRECTORIES,
  ADMIN_DIRECTORY_GROUPS,
} from "../src/config/adminDirectories.js";

const expectedDirectories = [
  ["Flag Inspectors", "/flag"],
  ["Accredited Inspectors", "/accredited-inspectors"],
  ["Appointed Surveyors", "/appointed-surveyors"],
  ["Service Providers", "/service-providers"],
  ["Ship Agents", "/ship-agents"],
  ["Suppliers", "/suppliers"],
  ["Shipyards", "/shipyards"],
  ["Tug Boats", "/tug-boats"],
];

test("restores the historical directory groups, labels, routes, and order", () => {
  assert.deepEqual(
    ADMIN_DIRECTORY_GROUPS.map(({ label }) => label),
    ["Compliance & Inspection", "Industry Network"]
  );
  assert.deepEqual(
    ADMIN_DIRECTORIES.map(({ label, path }) => [label, path]),
    expectedDirectories
  );
});

test("keeps desktop and mobile directory menus closed initially", async () => {
  const source = await readFile(
    new URL("../src/components/layout/Navbar.jsx", import.meta.url),
    "utf8"
  );

  assert.match(source, /directoriesOpen,\s*setDirectoriesOpen\]\s*=\s*useState\(false\)/);
  assert.match(
    source,
    /mobileDirectoriesOpen,\s*setMobileDirectoriesOpen\]\s*=\s*useState\(false\)/
  );
  assert.match(source, /aria-expanded=\{directoriesOpen\}/);
  assert.match(source, /aria-expanded=\{mobileDirectoriesOpen\}/);
});

test("retains close behavior for selection, outside click, and Escape", async () => {
  const source = await readFile(
    new URL("../src/components/layout/Navbar.jsx", import.meta.url),
    "utf8"
  );

  assert.match(source, /document\.addEventListener\("mousedown", handleOutside\)/);
  assert.match(source, /event\.key !== "Escape"/);
  assert.match(source, /onClick=\{\(\) => setDirectoriesOpen\(false\)\}/);
  assert.match(source, /onClick=\{closeMobileNavigation\}/);
});
