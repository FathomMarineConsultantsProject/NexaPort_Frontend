import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(path, import.meta.url),"utf8");
test("Admin review exposes explicit latest-revision decisions and a private negotiation form",async()=>{
  const [stage,workspace]=await Promise.all([source("../src/components/workflow/stages/StageQuote.jsx"),source("../src/pages/InspectionWorkflowWorkspace.jsx")]);
  for(const label of ["Approve internally","Request revision","Reject","Suggested maximum","Internal Admin note","Revision history"]) assert.ok(stage.includes(label));
  assert.match(stage,/revisionId:quote\.latestRevisionId/);
  assert.match(workspace,/decideQuotation\(quotationId,payload\)/);
});
test("Consultant revises from own thread and sees no Admin internal note",async()=>{
  const details=await source("../src/pages/ServiceRequestDetails.jsx");
  assert.match(details,/getQuotationNegotiation\(q\.id\)/);
  assert.match(details,/expectedRevisionId:negotiation\.latestRevisionId/);
  assert.match(details,/Commercially approved/);
  assert.doesNotMatch(details,/internalAdminNote/);
});
test("Client proposal preparation is visibly gated on internal approval",async()=>{
  const confirm=await source("../src/components/workflow/stages/StageConfirm.jsx");
  assert.match(confirm,/quote\.internalStatus !== "approved"/);
  assert.match(confirm,/quote\.latestRevisionId/);
  assert.match(confirm,/requires internal approval/);
});
