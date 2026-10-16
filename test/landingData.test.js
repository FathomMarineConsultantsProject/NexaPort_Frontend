import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { landingMetrics, metricText } from "../src/pages/landingData.js";

test("landing metrics use only available public counts and active catalogue entries", () => {
  const metrics = landingMetrics({ ports_total: 4801, maritime_professionals_total: 1203, breakdown: { flag_inspectors: 22, accredited_inspectors: 13 } }, [
    { name: "Vessel Condition", methods: [{ name: "Pre-Purchase Inspections" }, { name: "Vessel Condition Surveys" }] },
    { name: "Cargo", methods: [{ name: "Draft Surveys" }] },
  ]);
  assert.deepEqual(metrics.map(({ value }) => value), [4801, 1203, 2, 3, 22, 13]);
  assert.equal(metricText(metrics[0].value), "4,801");
});

test("landing metrics do not manufacture unavailable or malformed counts", () => {
  assert.deepEqual(landingMetrics(null, null).map(({ value }) => value), [null, null, null, null, null, null]);
  assert.equal(metricText(null), "—");
  assert.equal(landingMetrics({ ports_total: "unknown" }, [])[0].value, null);
});

test("landing catalogue and product selectors update from native buttons", async () => {
  const landing = await readFile(new URL("../src/pages/Landing.jsx", import.meta.url), "utf8");
  assert.match(landing, /getServiceRequestDropdowns\(\)/);
  assert.match(landing, /setVerticals\(result\.data\.inspectionVerticals\)/);
  assert.match(landing, /aria-pressed=\{index === category\} onClick=\{\(\) => setCategory\(index\)\}/);
  assert.match(landing, /aria-pressed=\{index === preview\} onClick=\{\(\) => setPreview\(index\)\}/);
  assert.match(landing, /\(selected\.methods \|\| \[\]\)\.map/);
});
