import assert from "node:assert/strict";
import { Buffer } from "node:buffer";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { transformWithOxc } from "vite";
import { createDecisionForm, prepareDecision } from "../src/components/workflow/stages/quotationDecisionState.js";

const componentUrl = new URL("../src/components/workflow/stages/QuotationDecisionForm.jsx", import.meta.url);
const source = await readFile(componentUrl, "utf8");
const { code } = await transformWithOxc(source, componentUrl.pathname, { jsx: { runtime: "automatic" } });
const resolved = code.replace(/from "([^"]+)"/g, (_, specifier) => `from ${JSON.stringify(specifier.startsWith(".") ? new URL(specifier, componentUrl).href : import.meta.resolve(specifier))}`);
const { default: Form } = await import(`data:text/javascript;base64,${Buffer.from(resolved).toString("base64")}`);
const render = (decision) => renderToStaticMarkup(createElement(Form, { decision, onSubmit() {}, onCancel() {}, busy: false }));

test("revision form renders labels associated with full-width message and private-note controls", () => {
  const html = render("revision_requested");
  assert.match(html, /Request a Revised Quotation/);
  assert.match(html, /Explain what the Consultant should change/);
  assert.match(html, /Additional Details/);
  assert.match(html, /Please review your professional fees and travel expenses/);
  assert.match(html, /rows="4"/);
  assert.match(html, /rows="3"/);
  assert.match(html, /Not shared with the Consultant/);
  assert.match(html, /Message to Consultant <span>\(required\)<\/span>/);
  const labels = [...html.matchAll(/<label[^>]*for="([^"]+)"/g)];
  assert.equal(labels.length, 5);
  for (const [, id] of labels) assert.ok(html.includes(`id="${id}"`), `Missing control for ${id}`);
});

test("fresh revision maximum is empty and an explicitly entered value stays intact", () => {
  const form = createDecisionForm("revision_requested");
  assert.equal(form.suggestedMaxAmount, "");
  assert.equal(form.suggestedMaxCurrency, "USD");
  const html = render("revision_requested");
  assert.match(html, /inputMode="decimal"[^>]*value=""/);
  const entered = { ...form, consultantMessage: "Revise travel", suggestedMaxAmount: "0.13" };
  assert.equal(prepareDecision(entered).payload.suggestedMaxAmount, "0.13");
  assert.equal(entered.suggestedMaxAmount, "0.13");
});

test("required message and optional advisory maximum follow the API contract", () => {
  const form = createDecisionForm("revision_requested");
  assert.match(prepareDecision(form).errors.consultantMessage, /Enter a message/);
  const valid = prepareDecision({ ...form, consultantMessage: "Please revise the report charge." });
  assert.deepEqual(valid.errors, {});
  assert.equal(valid.payload.suggestedMaxAmount, null);
  const suggested = prepareDecision({ ...form, consultantMessage: "Revise expenses", suggestedMaxAmount: "1,200.00", suggestedMaxCurrency: "eur", internalAdminNote: "Private review" });
  assert.deepEqual(suggested.errors, {});
  assert.equal(suggested.payload.suggestedMaxAmount, "1200.00");
  assert.equal(suggested.payload.suggestedMaxCurrency, "EUR");
  assert.equal(suggested.payload.internalAdminNote, "Private review");
  assert.equal(suggested.payload.consultantMessage, "Revise expenses");
});

test("invalid amounts and currency have field-level errors; rejection requires a message or reason", () => {
  const form = { ...createDecisionForm("revision_requested"), consultantMessage: "Revise" };
  for (const amount of ["0", "-1", "12,00", "1.234", "Infinity", "10000000000"])
    assert.ok(prepareDecision({ ...form, suggestedMaxAmount: amount }).errors.suggestedMaxAmount);
  assert.ok(prepareDecision({ ...form, suggestedMaxAmount: "10", suggestedMaxCurrency: "US" }).errors.suggestedMaxCurrency);
  const rejected = createDecisionForm("rejected");
  assert.ok(prepareDecision(rejected).errors.consultantMessage);
  assert.deepEqual(prepareDecision({ ...rejected, reason: "Scope mismatch" }).errors, {});
});

test("every action has specific text, and Cancel is a separate non-submitting close action", async () => {
  for (const [decision, action] of [["revision_requested", "Send Revision Request"], ["approved", "Approve Quotation"], ["rejected", "Reject Quotation"]]) {
    const html = render(decision);
    assert.match(html, /<button type="button"[^>]*>Cancel<\/button>/);
    assert.ok(html.includes(`>${action}</button>`));
    assert.ok(!html.includes("Record decision"));
  }
  assert.match(source, /onClick=\{onCancel\}/);
  const stage = await readFile(new URL("../src/components/workflow/stages/StageQuote.jsx", import.meta.url), "utf8");
  assert.match(stage, /onCancel=\{\(\)=>setEditing\(null\)\}/);
  assert.match(stage, /revisionId:quote.latestRevisionId/);
});

test("layout scopes a two-column grid, stretched controls, mobile stacking and separate footer", async () => {
  const css = await readFile(new URL("../src/pages/InspectionWorkflow.css", import.meta.url), "utf8");
  assert.match(css, /\.quotation-negotiation \.negotiation-fields[^}]*repeat\(2, minmax\(0, 1fr\)\)/);
  assert.match(css, /\.quotation-negotiation \.negotiation-wide[^}]*grid-column: 1 \/ -1/);
  assert.match(css, /\.quotation-negotiation input, \.quotation-negotiation textarea[^}]*width: 100%; min-width: 0/);
  assert.match(css, /max-width: 760px[^\n]*negotiation-fields[^}]*grid-template-columns: minmax\(0, 1fr\)/);
  assert.match(css, /\.quotation-negotiation \.negotiation-actions[^}]*justify-content: flex-end[^}]*border-top: 1px/);
});
