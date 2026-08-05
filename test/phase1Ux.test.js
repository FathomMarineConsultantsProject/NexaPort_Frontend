import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { displayCase, normalizeNarrative } from "../src/utils/requestPresentation.js";

const source = (file) => readFile(new URL(file, import.meta.url), "utf8");

test("request narratives deduplicate without mutating stored content", () => { assert.equal(normalizeNarrative("  Inspect berth.\nTomorrow  "), normalizeNarrative("inspect BERTH. tomorrow")); assert.equal(displayCase("MAster Mariner / OCIMF"), "Master Mariner / OCIMF"); });
test("request detail preserves paragraphs and uses the full qualifications heading", async () => { const page = await source("../src/pages/ServiceRequestDetails.jsx"); assert.match(page, /split\(\/\\n\\s\*\\n\//); assert.match(page, /Request Overview/); assert.match(page, /Required Qualifications/); assert.doesNotMatch(page, /Required Cert\./); assert.doesNotMatch(page, /dangerouslySetInnerHTML/); });
test("request detail hides empty rows and stacks its operational cards", async () => { const page = await source("../src/pages/ServiceRequestDetails.jsx"); const css = await source("../src/pages/ServiceRequestDetails.css"); assert.match(page, /if \(value === null/); assert.match(css, /@media \(max-width: 900px\)[\s\S]*grid-template-columns:\s*1fr/); });
test("report yes-no fields are accessible grouped radio controls", async () => { const page = await source("../src/pages/ReportDetailPage.jsx"); assert.match(page, /<fieldset className="template-yes-no"/); assert.equal((page.match(/type="radio"/g) || []).length, 1); assert.doesNotMatch(page, /kind === "yes_no"\) return <select/); });
test("report photos and signatures use IndexedDB with stable item keys", async () => { const page = await source("../src/pages/ReportDetailPage.jsx"); const cache = await source("../src/utils/reportMediaCache.js"); assert.match(page, /Select photo/); assert.match(page, /Choose signature image/); assert.match(cache, /reportId.*fieldKey.*itemId/); assert.match(page, /await clearReportMedia\(id\)/); assert.match(page, /images remain in this browser/); });
test("one sticky action bar owns generation preview and download", async () => { const page = await source("../src/pages/ReportDetailPage.jsx"); assert.match(page, /report-actionbar/); for (const label of ["Save Draft", "Regenerate PDF", "Preview PDF", "Download PDF"]) assert.match(page, new RegExp(label)); assert.doesNotMatch(page, /<ReportPreview/); assert.doesNotMatch(page, /NexaPort platform test|consultant_name|consultant_email/); });
