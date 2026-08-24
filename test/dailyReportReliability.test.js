import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Daily Report photo upload remains private direct-to-S3 and optimizes before signing", async () => {
  const api = await source("../src/api/inspectionWorkflowApi.js");
  assert.match(api, /optimizeReportImage\(file\)/);
  assert.match(api, /fetch\(signed\.uploadUrl/);
  assert.match(api, /body:uploadFile/);
  assert.doesNotMatch(api, /FormData|base64/);
});

test("Daily Report editor guards duplicate upload and generation synchronously", async () => {
  const panel = await source("../src/components/workflow/DailyReportsPanel.jsx");
  assert.match(panel, /if\(busyRef\.current\)return null/);
  assert.match(panel, /if\(!photo\|\|busyRef\.current\)return/);
  assert.match(panel, /pendingAction==="uploading"/);
  assert.match(panel, /Uploading photo\.\.\./);
  assert.match(panel, /pendingAction==="generating"/);
  assert.match(panel, /Generating\.\.\./);
});

test("Finalize validation details and required flow guidance remain visible", async () => {
  const panel = await source("../src/components/workflow/DailyReportsPanel.jsx");
  assert.match(panel, /fieldErrors/);
  assert.match(panel, /Save, generate, then finalize when all required fields are complete\./);
  assert.match(panel, /Finalize Report/);
});
