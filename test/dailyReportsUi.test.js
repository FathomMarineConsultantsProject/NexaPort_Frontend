import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Daily Reports are an inspection artifact and do not alter the 13-stage rail", async () => {
  const [workspace, stages] = await Promise.all([source("../src/pages/InspectionWorkflowWorkspace.jsx"), source("../src/components/workflow/workflowStages.js")]);
  assert.match(workspace, /DailyReportsPanel/);
  assert.match(workspace, /executionStarted/);
  assert.equal((stages.match(/\["[a-z_]+","[^"]+"\]/g) || []).length, 13);
  assert.doesNotMatch(stages, /daily_report/);
});

test("register, editor, preview, photos, and Draft Final lifecycle are present", async () => {
  const component = await source("../src/components/workflow/DailyReportsPanel.jsx");
  for (const label of ["Report Date", "Prepared By", "Last Updated", "Create Daily Report", "Checks, tests and inspection carried out", "Inspector&apos;s remarks", "Photographic record", "Save Draft", "Finalize Report", "Download PDF"]) assert.ok(component.includes(label), label);
  assert.match(component, /report\.locked\?"preview":"edit"/);
  assert.match(component, /Not provided/);
  assert.match(component, /crypto\.randomUUID/);
});

test("Daily Report API supports repeatable records, stable generation, and opaque photo confirmation", async () => {
  const api = await source("../src/api/inspectionWorkflowApi.js");
  for (const route of ["/daily-reports`", "/daily-reports/${dailyReportId}", "/generate`", "/finalize`", "/photos/upload-url`"]) assert.match(api, new RegExp(route.replace(/[/$\{\}]/g, "\\$&")));
  assert.match(api, /uploadId:signed\.uploadId/);
  const dailyUpload = api.slice(api.indexOf("export const uploadDailyReportPhoto"), api.indexOf("export const removeDailyReportPhoto"));
  assert.doesNotMatch(dailyUpload, /objectKey/);
});

test("Daily Report UI has dense document styling and mobile no-overflow transformations", async () => {
  const css = await source("../src/pages/InspectionWorkflow.css");
  assert.match(css, /\.daily-document \{/);
  assert.match(css, /\.daily-activity-row/);
  assert.match(css, /@media \(max-width: 760px\)[\s\S]*\.daily-register-table table/);
  assert.match(css, /@media \(max-width: 430px\)[\s\S]*\.daily-document-photos/);
  assert.doesNotMatch(css.slice(css.indexOf("Daily inspection records")), /linear-gradient|radial-gradient|border-radius:\s*999/i);
});

test("Daily Report date normalization guarantees YYYY-MM-DD input value and deterministic display", async () => {
  const component = await source("../src/components/workflow/DailyReportsPanel.jsx");
  assert.match(component, /toIsoDate/);
  assert.match(component, /reportDate:\s*toIsoDate\(report\?\.reportDate\)/);
  assert.match(component, /boardingDate:\s*toIsoDate\(report\?\.data\?\.boardingDate\s*\|\|\s*report\?\.reportDate\)/);
  assert.match(component, /const dateLabel = \(value\) =>/);
  assert.match(component, /months\[m-1\]/);
  assert.doesNotMatch(component, /String\(value\)\.slice\(0,10\)}T00:00:00Z/);
});

