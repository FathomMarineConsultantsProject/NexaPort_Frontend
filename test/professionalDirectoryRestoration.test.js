import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const source = (path) => readFile(new URL(`../src/${path}`, import.meta.url), "utf8");

test("professional result actions retain only View Details and exact modal targets", async () => {
  const [search, accredited, appointed] = await Promise.all([
    source("pages/InspectorSearch.jsx"),
    source("pages/AccreditedInspectorDirectory.jsx"),
    source("pages/AppointedSurveyorDirectory.jsx"),
  ]);
  for (const page of [search, accredited, appointed]) {
    assert.doesNotMatch(page, /Claim options/);
    assert.match(page, /View Details/);
  }
  assert.match(search, /\?record=\$\{encodeURIComponent\(item\.source_id\)\}/);
  assert.match(accredited, /String\(item\.id\) === recordId/);
  assert.match(appointed, /String\(item\.id\) === recordId/);
});

test("administrative ownership sits outside professional identity headers", async () => {
  const [expert, flag, panel] = await Promise.all([
    source("pages/ExpertProfile.jsx"),
    source("pages/FlagInspectorProfile.jsx"),
    source("components/directories/AdminClaimStatus.jsx"),
  ]);
  assert.match(expert, /<\/section>\s*\{!expert\.user_id && isSuperAdmin\(\) && <AdminClaimStatus/);
  assert.match(flag, /<\/section>\s*\{!companyOnly && isSuperAdmin\(\) && <AdminClaimStatus/);
  assert.doesNotMatch(expert + flag, /Open profile claim/);
  assert.match(panel, /return isSuperAdmin\(\)/);
  assert.doesNotMatch(panel, /issueClaimInvitation|Recipient email|Send Email|Generate Invitation Link/);
});
