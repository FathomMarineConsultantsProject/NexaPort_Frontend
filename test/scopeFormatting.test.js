import assert from "node:assert/strict";
import test from "node:test";
import { scopeHtml, scopeMarkdown } from "../src/components/requests/scopeFormatting.js";

test("AI bold markers render as bold and preserve line breaks without executing HTML", () => {
  assert.equal(scopeHtml("**Scope**\n\nInspect hull."), "<strong>Scope</strong><br><br>Inspect hull.");
  assert.equal(scopeHtml('**<img src=x onerror=alert(1)>**'), '<strong>&lt;img src=x onerror=alert(1)&gt;</strong>');
  assert.equal(scopeHtml("Unmatched ** and 2 * 3"), "Unmatched ** and 2 * 3");
});

test("editable bold text serializes to the existing string payload with blank lines preserved", () => {
  const text = (value) => ({ nodeType: 3, textContent: value });
  const node = (name, children = []) => ({ nodeType: 1, nodeName: name, childNodes: children });
  const root = node("DIV", [node("STRONG", [text("Scope")]), node("BR"), node("BR"), text("Inspect hull.")]);
  assert.equal(scopeMarkdown(root), "**Scope**\n\nInspect hull.");
  assert.equal(scopeMarkdown(node("DIV", [text("A"), node("DIV", [text("B")])])), "A\nB");
});
