import assert from "node:assert/strict";
import test from "node:test";
import { quotationCountLabel } from "../src/components/workflow/quotationCount.js";

test("queue label uses total threads with correct zero, singular and plural wording", () => {
  assert.equal(quotationCountLabel(0), "No quotations");
  assert.equal(quotationCountLabel(1), "1 quotation");
  assert.equal(quotationCountLabel(3), "3 quotations");
  assert.equal(quotationCountLabel("2"), "2 quotations");
});

test("missing or invalid totals never falsely say there are no quotations", () => {
  for (const value of [undefined, null, -1, NaN, 1.5])
    assert.equal(quotationCountLabel(value), "Count unavailable");
});
