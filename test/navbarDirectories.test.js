import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

import {
  ADMIN_DIRECTORIES,
  ADMIN_DIRECTORY_GROUPS,
  getNavigationDirectoryGroups,
} from "../src/config/adminDirectories.js";

const expectedDirectories = [
  ["All Surveyors", "/surveyors"],
  ["Marine Surveyors", "/surveyors?category=Marine%20Surveyors"],
  ["Maritime Consultants", "/surveyors?category=Maritime%20Consultants"],
  ["Flag State Inspectors", "/surveyors?category=Flag%20State%20Inspectors"],
  ["Vessel Inspectors", "/surveyors?category=Vessel%20Inspectors"],
  ["Accredited Inspectors", "/surveyors?category=Accredited%20Inspectors"],
  ["Appointed Surveyors", "/surveyors?category=Appointed%20Surveyors"],
  ["Owners & Managers", "/owners-managers"],
  ["Vessels", "/vessels?view=directory"],
  ["Service Providers", "/service-providers"],
  ["Ship Agents", "/ship-agents"],
  ["Suppliers", "/suppliers"],
  ["Shipyards", "/shipyards"],
  ["Tug Boats", "/tug-boats"],
];

test("groups human directory discovery under Surveyors and leaves company directories separate", () => {
  assert.deepEqual(
    ADMIN_DIRECTORY_GROUPS.map(({ label }) => label),
    ["Surveyors", "Industry Network"]
  );
  assert.deepEqual(
    ADMIN_DIRECTORIES.map(({ label, path }) => [label, path]),
    expectedDirectories
  );
});

test("navigation groups contain only role-authorized destinations", () => {
  const paths = (role) => getNavigationDirectoryGroups(role).flatMap((group) => group.items.map((item) => item.path));
  assert.ok(paths(1).includes("/vessels?view=directory"));
  assert.ok(paths(3).includes("/vessels?view=fleet"));
  assert.ok(paths(3).includes("/ports"));
  assert.ok(paths(3).every((path) => !path.startsWith("/surveyors") && !path.startsWith("/experts")));
  assert.deepEqual(paths(2).filter((path) => path.startsWith("/experts")), ["/experts"]);
  assert.ok(paths(2).every((path) => !path.startsWith("/vessels") && !path.startsWith("/surveyors")));
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
