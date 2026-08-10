import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("registration chooser keeps all three explicit account paths", async () => {
  const auth = await source("../src/pages/Auth.jsx");
  assert.match(auth, /Client \/ Ship Owner/);
  assert.match(auth, /Consultant \/ Surveyor/);
  assert.match(auth, /Maritime Company/);
  assert.match(auth, /\/register-maritime-company/);
});

test("company onboarding is two-step and supports multi-type selection", async () => {
  const page = await source("../src/pages/RegisterMaritimeCompany.jsx");
  assert.match(page, /setStep\(2\)/);
  assert.match(page, /!form\.directoryTypes\.length/);
  assert.match(page, /directoryTypes/);
  assert.match(page, /Pending review/);
});

test("company accounts are routed to their isolated profile workspace", async () => {
  const [app, navbar] = await Promise.all([source("../src/App.jsx"), source("../src/components/layout/Navbar.jsx")]);
  assert.match(app, /function CompanyBoundary/);
  assert.match(app, /location\.pathname !== "\/company-profile"/);
  assert.match(navbar, /isCompany \? <NavLink to="\/company-profile"/);
});
