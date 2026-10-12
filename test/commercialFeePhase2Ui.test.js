import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { previewCommercialFee } from "../src/components/workflow/stages/commercialFee.js";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("fee preview matches cent-accurate backend examples", () => {
  assert.deepEqual(previewCommercialFee({consultantTotal:"100.00",mode:"percentage",percentage:"25"}),
    {consultantTotalUsd:100,feeUsd:25,draftTotalUsd:125});
  assert.deepEqual(previewCommercialFee({consultantTotal:"2250.00",mode:"custom",customAmount:"500.00"}),
    {consultantTotalUsd:2250,feeUsd:500,draftTotalUsd:2750});
  assert.equal(previewCommercialFee({consultantTotal:"0.02",mode:"percentage",percentage:"25"}).draftTotalUsd,0.03);
  assert.equal(previewCommercialFee({consultantTotal:"100",mode:"custom",customAmount:"NaN"}),null);
});

test("commercial UI separates editable totals from saved and sent snapshots", async () => {
  const [stage,workspace,css,stages] = await Promise.all([
    source("../src/components/workflow/stages/StageConfirm.jsx"),
    source("../src/pages/InspectionWorkflowWorkspace.jsx"),
    source("../src/pages/InspectionWorkflow.css"),
    source("../src/components/workflow/workflowStages.js"),
  ]);
  assert.match(stage,/formSource \? formSource\.feeMode \|\| "custom" : "percentage"/);
  assert.match(stage,/formSource\?\.adminMarkupUsd \?\? 0/);
  for(const label of ["Approved Consultant total","Nexaport fee","Current editable draft total","Previously sent Client proposal total","Saved draft total"])
    assert.ok(stage.includes(label));
  assert.match(stage,/Email delivery are not verified|email delivery are not verified|email delivery is not verified/i);
  assert.match(workspace,/workspace-head-actions/);
  assert.match(css,/grid-template-columns: repeat\(4, minmax\(0, 1fr\)\)/);
  assert.match(css,/\.workflow-rail \{ display: grid; grid-template-columns: 1fr/);
  for(const group of ["Commercial","Inspection","Reporting","Finance"]) assert.ok(stages.includes(group));
});
