import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { adminDashboardMetrics, countLabel, safeCount, safeUsd, usdLabel } from "../src/pages/adminDashboardMetrics.js";

test("missing dashboard values remain unavailable while true zero stays zero", () => {
  assert.equal(safeCount(undefined), null);
  assert.equal(safeCount(null), null);
  assert.equal(safeCount(""), null);
  assert.equal(safeCount(-1), null);
  assert.equal(safeCount("Infinity"), null);
  assert.equal(safeCount(0), 0);
  assert.equal(countLabel(null), "—");
  assert.equal(countLabel(0), "0");
  assert.equal(safeUsd(undefined), null);
  assert.equal(usdLabel(null), "—");
  assert.equal(usdLabel(1234567), "$1,234,567");
});

test("initial quotation review excludes revised quotation subset", () => {
  const metrics = adminDashboardMetrics({
    quotes_awaiting_review: 12,
    revised_quotes_awaiting_review: 4,
    quotes_waiting_consultant_revision: 3,
  });
  assert.equal(metrics.quotesToReview, 12);
  assert.equal(metrics.initialQuotes, 8);
  assert.equal(metrics.revisedQuotes, 4);
  assert.equal(metrics.awaitingConsultantRevision, 3);
  assert.equal(adminDashboardMetrics({ quotes_awaiting_review: 2, revised_quotes_awaiting_review: 3 }).initialQuotes, 0);
  assert.equal(adminDashboardMetrics({ quotes_awaiting_review: 2 }).initialQuotes, null);
});

test("consultant availability is valid only with a complete, consistent denominator", () => {
  assert.deepEqual(adminDashboardMetrics({ total_consultants: 10, active_consultants: 3 }).availability, { available: 3, remaining: 7, total: 10 });
  assert.deepEqual(adminDashboardMetrics({ total_consultants: 0, active_consultants: 0 }).availability, { available: 0, remaining: 0, total: 0 });
  assert.equal(adminDashboardMetrics({ total_consultants: 2, active_consultants: 3 }).availability, null);
  assert.equal(adminDashboardMetrics({ total_consultants: 2 }).availability, null);
});

test("Admin dashboard remains isolated behind role 1 and retains all preview datasets", async () => {
  const [page, routes, dashboard] = await Promise.all([
    readFile(new URL("../src/pages/AdminDashboard.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/App.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/Dashboard.jsx", import.meta.url), "utf8"),
  ]);
  assert.match(routes, /getRoleId\(\) === 1/);
  assert.match(dashboard, /roleId === 1\) return <AdminDashboard/);
  for (const key of ["pending_moderations", "quotes_for_review", "active_jobs", "recent_registrations", "recent_quotations", "recent_audit_activity", "workflow.recent"]) {
    assert.ok(page.includes(key), `${key} preview retained`);
  }
  assert.doesNotMatch(page, /admin-operations-overview|workflowTotal|awaiting_quotation_review/);
});
