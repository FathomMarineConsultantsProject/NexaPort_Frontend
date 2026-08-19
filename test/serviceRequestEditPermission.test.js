import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { getRequestEditPermission } from "../src/utils/serviceRequestEditPermission.js";

const admin = { id: 1, role_id: 1 };
const client = { id: 30, role_id: 3 };
const request = { requesterUserId: 30, moderationStatus: "approved", status: "open", quotationCount: 0 };

test("shared UI permission helper matches Client and Admin product rules", () => {
  assert.equal(getRequestEditPermission({ ...request, moderationStatus: "pending" }, client).allowed, true);
  assert.equal(getRequestEditPermission({ ...request, moderationStatus: "rejected" }, client).allowed, true);
  assert.equal(getRequestEditPermission(request, client).allowed, true);
  assert.match(getRequestEditPermission({ ...request, quotationCount: 1 }, client).reason, /quotations have already been submitted/i);
  assert.equal(getRequestEditPermission({ ...request, quotationCount: 2 }, admin).allowed, true);
  assert.match(getRequestEditPermission({ ...request, acceptedQuotationId: 9 }, admin).reason, /inspection workflow/i);
  assert.equal(getRequestEditPermission(request, { id: 2, role_id: 2 }).allowed, false);
  assert.equal(getRequestEditPermission(request, { id: 4, role_id: 4 }).allowed, false);
});

test("list and detail pages use the same permission helper and expose lock reasons", async () => {
  const [list, detail] = await Promise.all([
    readFile(new URL("../src/pages/ServiceRequests.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/pages/ServiceRequestDetails.jsx", import.meta.url), "utf8"),
  ]);
  for (const source of [list, detail]) {
    assert.match(source, /getRequestEditPermission/);
    assert.match(source, /editPermission\.reason/);
  }
  assert.match(list, /Edit & Resubmit/);
  assert.match(detail, /Edit & Resubmit/);
});
