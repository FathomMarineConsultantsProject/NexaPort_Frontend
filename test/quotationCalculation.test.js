import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("admin quotation preview includes every existing cost and markup", async () => {
  const source = await readFile(
    new URL("../src/pages/ServiceRequestDetails.jsx", import.meta.url),
    "utf8"
  );
  const preview = source.slice(
    source.indexOf('<div className="client-total-preview">'),
    source.indexOf('<button\n                      className="accept-btn"')
  );

  for (const field of [
    "getExpertQuote(quote)",
    "quote.travelCost",
    "quote.accommodationCost",
    "quote.reportFee",
    "quote.urgencySurcharge",
    "markupByQuote[quote.id]",
  ]) {
    assert.equal(preview.split(field).length - 1, 1, `${field} must be included exactly once`);
  }
});
