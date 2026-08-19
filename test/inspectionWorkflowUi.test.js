import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(path, import.meta.url), "utf8");

test("Super Admin workflow routes and single navigation entry are wired", async () => {
  const [app, navbar] = await Promise.all([source("../src/App.jsx"), source("../src/components/layout/Navbar.jsx")]);
  assert.match(app, /\/admin\/inspection-workflows/);
  assert.match(app, /\/admin\/inspection-workflow\/:requestId/);
  assert.match(app, /<AdminOnly><InspectionWorkflowQueue/);
  assert.match(navbar, /isSuperAdmin[\s\S]*Inspection Workflow/);
});

test("queue uses approved workflow data and truthful quotation wording", async () => {
  const queue = await source("../src/pages/InspectionWorkflowQueue.jsx");
  assert.match(queue, /Approved Budget/);
  assert.match(queue, /awaiting review/);
  assert.doesNotMatch(queue, /new quotation/i);
  assert.match(queue, /Open Workflow/);
});

test("all 13 stages are represented and future stages remain locked", async () => {
  const [rail, stages] = await Promise.all([source("../src/components/workflow/WorkflowStageRail.jsx"), source("../src/components/workflow/workflowStages.js")]);
  for (const stage of ["overview","quote","confirm","surveyor","preparation","checklist","report","review","report_confirmation","inspection_completed","invoice_submitted","invoice_approved","invoice_paid"]) assert.match(stages, new RegExp(stage));
  assert.match(rail, /disabled=\{!canView\}/);
});

test("workflow stages use approved budget and shared backend confirmation endpoint", async () => {
  const [overview, quote, confirm, api] = await Promise.all([source("../src/components/workflow/stages/StageOverview.jsx"),source("../src/components/workflow/stages/StageQuote.jsx"),source("../src/components/workflow/stages/StageConfirm.jsx"),source("../src/api/inspectionWorkflowApi.js")]);
  assert.match(overview, /approvedBudgetUsd/);
  assert.match(quote, /Approved Request Budget/);
  assert.match(confirm, /Confirm Quotation & Assign Surveyor/);
  assert.match(api, /\/confirm/);
});

test("approved request details expose the workflow action only to Super Admin", async () => {
  const details = await source("../src/pages/ServiceRequestDetails.jsx");
  assert.match(details, /isSuperAdmin\(\) && isApproved/);
  assert.match(details, /Open Inspection Workflow/);
});

test("Phase 2 workspace renders Preparation through Report Confirmation",async()=>{
  const workspace=await source("../src/pages/InspectionWorkflowWorkspace.jsx");
  for(const component of ["StagePreparation","StageChecklist","StageReport","StageReview","StageReportConfirmation"])assert.match(workspace,new RegExp(component));
  assert.match(workspace,/stage:"preparation"/);
  assert.match(workspace,/completeWorkflowChecklist/);
  assert.match(workspace,/confirmWorkflowReport/);
});

test("checklist preserves sections, constrained Yes No controls, evidence, and required states",async()=>{
  const checklist=await source("../src/components/workflow/stages/StageChecklist.jsx");
  assert.match(checklist,/field\.section/);
  assert.match(checklist,/\["Yes","No"\]/);
  assert.match(checklist,/type="radio"/);
  assert.match(checklist,/Not completed/);
  assert.match(checklist,/Add evidence/);
  assert.doesNotMatch(checklist,/JSON\.stringify\(field/);
});

test("confirmed report locks earlier records and hands off to inspection completion",async()=>{
  const confirmation=await source("../src/components/workflow/stages/StageReportConfirmation.jsx");
  assert.match(confirmation,/Final report confirmed/);
  assert.match(confirmation,/Continue to Completion/);
  assert.doesNotMatch(confirmation,/Invoice Submitted/);
});

test("workflow CSS protects long checklist questions and mobile crew layout",async()=>{
  const css=await source("../src/pages/InspectionWorkflow.css");
  assert.match(css,/overflow-wrap:anywhere/);
  assert.match(css,/@media\(max-width:760px\)[\s\S]*\.crew-row/);
  assert.match(css,/\.check-actionbar\{position:sticky/);
});

test("final workflow stages implement deliberate completion, invoice approval, and payment",async()=>{
  const [workspace,completed,invoice,api]=await Promise.all([source("../src/pages/InspectionWorkflowWorkspace.jsx"),source("../src/components/workflow/stages/StageCompleted.jsx"),source("../src/components/workflow/stages/StageInvoice.jsx"),source("../src/api/inspectionWorkflowApi.js")]);
  assert.match(completed,/Mark Inspection Completed/);
  assert.match(completed,/service request is completed/i);
  for(const action of ["Submit Invoice","Approve Invoice","Record Payment","Workflow Complete"])assert.match(invoice,new RegExp(action));
  for(const field of ["Accepted quotation","Invoice amount","Variance","Paid amount"])assert.match(invoice,new RegExp(field));
  for(const stage of ["inspection_completed","invoice_submitted","invoice_approved","invoice_paid"])assert.match(workspace,new RegExp(stage));
  for(const route of ["/complete","/invoice/approve","/invoice/pay"])assert.match(api,new RegExp(route));
});

test("workflow queue exposes all thirteen stages and keeps completed history accessible",async()=>{
  const [queue,stages,rail]=await Promise.all([source("../src/pages/InspectionWorkflowQueue.jsx"),source("../src/components/workflow/workflowStages.js"),source("../src/components/workflow/WorkflowStageRail.jsx")]);
  assert.match(queue,/WORKFLOW_STAGES\.map/);
  assert.match(queue,/invoice_paid[\s\S]*Complete/);
  assert.match(stages,/invoice_paid/);
  assert.match(rail,/terminal.*invoice_paid/);
});

test("Admin dashboard contains grouped workflow actions and an operational handoff list",async()=>{
  const dashboard=await source("../src/pages/AdminDashboard.jsx");
  assert.match(dashboard,/Inspections Requiring Action/);
  for(const group of ["Commercial","Inspection","Reporting","Finance"])assert.match(dashboard,new RegExp(group));
  assert.match(dashboard,/Open Workflow/);
  assert.match(dashboard,/inspection_workflow/);
});

test("finance layout uses a responsive ledger without celebratory effects",async()=>{
  const css=await source("../src/pages/InspectionWorkflow.css");
  assert.match(css,/\.commercial-ledger\{display:grid/);
  assert.match(css,/@media\(max-width:520px\)[\s\S]*\.commercial-ledger/);
  assert.doesNotMatch(css,/confetti|linear-gradient|radial-gradient/i);
});
