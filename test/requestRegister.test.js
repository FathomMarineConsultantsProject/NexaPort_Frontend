import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { formatBudget, requestBudgetPresentation, submittedBudget } from "../src/utils/requestRegister.js";
import { copyShareUrl, requestShareUrl } from "../src/utils/requestShare.js";

test("client budget uses submitted fields and never the consultant marketplace target", () => {
  const request = { clientBudgetUsd: 1200, budgetUsd: 1200, approvedBudgetUsd: 1500 };
  assert.deepEqual(requestBudgetPresentation(request, "client"), { label: "Submitted budget", value: "$1,200.00" });
  assert.deepEqual(requestBudgetPresentation(request, "admin"), { label: "Market target", value: "$1,500.00" });
  assert.equal(requestBudgetPresentation({ approvedBudgetUsd: 1500 }, "client").value, "Not provided");
  assert.equal(submittedBudget({ budgetUsd: 0, approvedBudgetUsd: 100 }), 0);
  assert.equal(formatBudget(null), "Not provided");
  assert.equal(formatBudget("bad"), "Not provided");
});

test("share URLs require opaque locators and clipboard success is reported only after writing", async () => {
  const locator = "a".repeat(64);
  const url = requestShareUrl(locator, "https://nexaport.example");
  assert.equal(url, `https://nexaport.example/s/${locator}`);
  assert.throws(() => requestShareUrl("37", "https://nexaport.example"));
  let copied;
  assert.equal(await copyShareUrl(url, async (value) => { copied = value; }), true);
  assert.equal(copied, url);
  assert.equal(await copyShareUrl(url, async () => { throw new Error("denied"); }), false);
  assert.equal(await copyShareUrl(url, undefined), false);
});

test("detail and share source preserve client financial boundaries and clipboard failure path", async () => {
  const details = await readFile(new URL("../src/pages/ServiceRequestDetails.jsx", import.meta.url), "utf8");
  const share = await readFile(new URL("../src/components/requests/CopyRequestLink.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(details, /isClient\(\)[\s\S]{0,300}request\.approvedBudgetUsd/);
  assert.doesNotMatch(details, /info-required-hint/);
  assert.match(details, /Client Submitted Budget \(USD\)/);
  assert.match(share, /await copyShareUrl/);
  assert.match(share, /showMessage\("Copied to clipboard"\)/);
  assert.match(share, /Select the link or use Copy/);
  assert.match(share, /requestShareUrl/);
});
