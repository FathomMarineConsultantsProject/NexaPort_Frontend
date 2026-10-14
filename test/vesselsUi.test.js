import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Vessels navigation retains legacy Fleet and directory routes", async () => {
  const [app, nav, directories] = await Promise.all([source("../src/App.jsx"), source("../src/components/layout/Navbar.jsx"), source("../src/config/adminDirectories.js")]);
  assert.match(app, /path="\/vessels" element={<Vessels/);
  assert.match(app, /path="\/fleet" element={<LegacyVesselsRedirect view="fleet"/);
  assert.match(app, /path="\/vessel-directory" element={<AdminOnly><LegacyVesselsRedirect view="directory"/);
  assert.match(app, /params\.set\("view", view\)/);
  assert.match(app, /path="\/vessel-directory\/:id" element={<AdminOnly><VesselDirectoryDetail/);
  assert.match(nav, /to="\/vessels"[\s\S]*?Vessels/);
  assert.match(directories, /path: "\/vessels\?view=directory"/);
});

test("global cards reuse Fleet grid and link only to global details", async () => {
  const [page, workspace] = await Promise.all([source("../src/pages/VesselDirectory.jsx"), source("../src/pages/Vessels.jsx")]);
  assert.match(page, /import "\.\/FleetManagement\.css"/);
  assert.match(page, /className="vessel-grid vessel-directory-results"/);
  assert.match(page, /to={`\/vessel-directory\/\$\{vessel\.id\}`}/);
  for (const field of ["IMO", "Flag", "DWT", "GT", "Built", "Registered Owner", "Commercial Manager"]) assert.match(page, new RegExp(field));
  assert.match(workspace, /role = getRoleId\(\)/);
  assert.match(workspace, /admin = role === 1/);
  assert.match(workspace, /if \(!admin && role !== 3\)/);
  assert.match(workspace, /fleet \? <FleetManagement \/> : <VesselDirectory \/>/);
});

test("flag suggestions and global search apply through paginated API with stale request protection", async () => {
  const page = await source("../src/pages/VesselDirectory.jsx");
  assert.match(page, /normalize\(item\)\.startsWith\(term\)/);
  assert.match(page, /onClick=\{\(\) => selectFlag\(item\)\}/);
  assert.match(page, /ArrowDown/);
  assert.match(page, /Escape/);
  assert.match(page, /getDirectoryVessels\(\{ search, type, flag,/);
  assert.match(page, /limit: 30/);
  assert.match(page, /currentId === requestId\.current/);
  assert.match(page, /controller\.abort\(\)/);
  assert.match(page, /Loading vessels\.\.\./);
  assert.match(page, /Clear flag/);
  assert.match(page, /Retry/);
});
