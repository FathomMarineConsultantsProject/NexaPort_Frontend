import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { workflowScopeBlocks } from "../src/components/workflow/workflowScopeBlocks.js";
import { scopeHtml } from "../src/components/requests/scopeFormatting.js";

test("workflow scope preserves headings, paragraphs and bullet groups", () => {
  const blocks = workflowScopeBlocks("**SCOPE OF WORK**\n\n**1.0 Vessel Details**\n\n* **Vessel Type:** Bulk Carrier\n* **Vessel Name:** Example\n\nInspect hull.\nRecord findings.");
  assert.deepEqual(blocks.map(({ type }) => type), ["paragraph", "paragraph", "list", "paragraph"]);
  assert.deepEqual(blocks[2].lines, ["**Vessel Type:** Bulk Carrier", "**Vessel Name:** Example"]);
  assert.equal(scopeHtml(blocks[2].lines[0]), "<strong>Vessel Type:</strong> Bulk Carrier");
  assert.equal(blocks[3].lines.join("\n"), "Inspect hull.\nRecord findings.");
  assert.deepEqual(workflowScopeBlocks("**Heading**\n* First\n* Second").map(({ type }) => type), ["paragraph", "list"]);
});

test("workflow scope keeps untrusted text escaped and handles missing content", () => {
  assert.deepEqual(workflowScopeBlocks("  \n  "), []);
  assert.equal(scopeHtml(workflowScopeBlocks("* **<script>unsafe</script>**")[0].lines[0]), "<strong>&lt;script&gt;unsafe&lt;/script&gt;</strong>");
});

test("workflow listing keeps its table and full title in the action label", async () => {
  const queue = await readFile(new URL("../src/pages/InspectionWorkflowQueue.jsx", import.meta.url), "utf8");
  const css = await readFile(new URL("../src/pages/InspectionWorkflow.css", import.meta.url), "utf8");
  assert.match(queue, /<table className="workflow-table"><colgroup>/);
  assert.match(queue, /className="workflow-request-title" title=\{row\.reference\}/);
  assert.match(queue, /aria-label=\{`Open workflow for \$\{row\.reference\}`\}/);
  assert.match(css, /\.workflow-table \.workflow-request-title[\s\S]*?-webkit-line-clamp: 2/);
  assert.match(css, /\.workflow-table colgroup \{ display: none; \}/);
});
