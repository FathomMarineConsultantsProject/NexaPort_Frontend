import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("sign-up leads to one account-first registration page", async () => {
  const [auth, app, registration] = await Promise.all([source("../src/pages/Auth.jsx"),source("../src/App.jsx"),source("../src/pages/UnifiedRegistration.jsx")]);
  assert.match(auth, /navigate\(`\/register/);
  assert.doesNotMatch(auth, /auth-role-card/);
  assert.match(app, /path="\/register"/);
  assert.match(registration, /registerUnified\(form\)/);
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
  assert.match(app, /location\.pathname\.startsWith\(p\)/);
  assert.match(app, /path="\/company-profile\/:entityId"/);
  assert.match(navbar, /NavLink to="\/company-profile"/);
});
