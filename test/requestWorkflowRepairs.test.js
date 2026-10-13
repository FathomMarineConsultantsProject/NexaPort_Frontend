import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { selectionPatch, requestPortPayload, portOptionIndex } from "../src/components/requests/requestPortState.js";
import { generateScopeDraft } from "../src/components/requests/scopeAssistantState.js";
import { createDecisionForm, saveDecisionDraft, submitDecisionOnce } from "../src/components/workflow/stages/quotationDecisionState.js";
import { canReviewQuotations } from "../src/components/workflow/workflowEligibility.js";
const source=(path)=>readFile(new URL(`../src/${path}`,import.meta.url),"utf8");
const a={id:1,port_name:"Chennai",country:"India"},b={id:2,port_name:"Chennai",country:"Other"};

test("canonical multi-selection preserves same-named ports, prevents duplicate IDs and chooses deterministic primary",()=>{
  const first=selectionPatch([a],null);assert.equal(first.portId,1);
  const multiple=selectionPatch([a,b,a],1);assert.deepEqual(multiple.portIds,[1,2]);
  assert.equal(selectionPatch([a,b],2).portId,2);
  assert.equal(selectionPatch([a],2).portId,1);
  assert.equal(selectionPatch([],1).portId,null);
  assert.deepEqual(requestPortPayload({portName:"Unresolved historic port",portId:null}),{});
  assert.deepEqual(requestPortPayload({...multiple,confirmPrimaryPortChange:true}).portIds,[1,2]);
});

test("port keyboard cursor handles empty results, initial arrows and wraparound",()=>{
  assert.equal(portOptionIndex(-1,"ArrowDown",0),-1);
  assert.equal(portOptionIndex(-1,"ArrowDown",3),0);
  assert.equal(portOptionIndex(-1,"ArrowUp",3),2);
  assert.equal(portOptionIndex(2,"ArrowDown",3),0);
  assert.equal(portOptionIndex(0,"ArrowUp",3),2);
});

test("delayed AI output preserves manually edited scope and unchanged drafts receive generated formatting",async()=>{
  let scope="Original";let resolve;
  const response=new Promise((done)=>{resolve=done;});
  const work=generateScopeDraft(()=>response,{existingScope:scope},(s)=>{scope=s;},()=>scope);
  scope="Manual edit";resolve({scopeOfWork:"Generated"});
  await assert.rejects(work,{code:"SCOPE_DRAFT_CHANGED"});assert.equal(scope,"Manual edit");
  await generateScopeDraft(async()=>({scopeOfWork:"## Scope\n- Hull"}),{existingScope:scope},(s)=>{scope=s;},()=>scope);
  assert.equal(scope,"## Scope\n- Hull");
});

test("decision failure leaves draft open; success closes only after save completes",async()=>{
  const draft=createDecisionForm("revision_requested");draft.consultantMessage="Revise";draft.internalAdminNote="Private";
  let closed=false;await assert.rejects(saveDecisionDraft(async()=>{throw new Error("Rejected save");},draft,()=>{closed=true;}));
  assert.equal(closed,false);assert.equal(draft.internalAdminNote,"Private");
  let finish;const pending=new Promise((resolve)=>{finish=resolve;});
  const work=saveDecisionDraft(()=>pending,draft,()=>{closed=true;});assert.equal(closed,false);
  finish();await work;assert.equal(closed,true);
});

test("workflow is isolated from chooser centering and uses flexible header with an explicit ledger total",async()=>{
  const [workspace,css,overview]=await Promise.all([source("pages/InspectionWorkflowWorkspace.jsx"),source("pages/InspectionWorkflow.css"),source("components/workflow/stages/StageOverview.jsx")]);
  assert.match(workspace,/workflow-page inspection-workspace-page/);assert.doesNotMatch(workspace,/workflow-page workspace-page/);
  assert.match(css,/grid-template-columns: minmax\(0, 1fr\) auto/);assert.doesNotMatch(css,/grid-template-columns: 240px/);
  assert.match(css,/quote-breakdown \.total[^}]*grid-column: 1 \/ -1/);
  assert.match(overview,/canReviewQuotations\(data.quotations\)/);assert.doesNotMatch(overview,/const canAdvance=counts.quotationsAwaitingReview/);
});

test("create and both edit surfaces submit port collections and order Assistant before Scope",async()=>{
  for(const page of ["PostServiceRequest","ServiceRequests","ServiceRequestDetails"]){const code=await source(`pages/${page}.jsx`);
    assert.match(code,/requestPortPayload\(/);assert.match(code,/<PortSelect ports=/);
    assert.ok(code.indexOf("<ScopeAssistant")<code.indexOf("<ScopeEditor"));
  }
});

test("port autocomplete supports keyboard navigation, aborts stale searches and protects primary schedule changes",async()=>{
  const code=await source("components/requests/PortSelect.jsx");
  for(const marker of ["ArrowDown","ArrowUp","Escape","Enter","controller.abort()","Make primary","Change primary and clear details","role=\"combobox\"","role=\"listbox\"","first 30 matches"])assert.ok(code.includes(marker),marker);
  assert.doesNotMatch(code,/<select/);assert.match(code,/setResults\(\[\]\); setError\(""\)/);
  assert.match(code,/terminalName: "", eta: "", confirmPrimaryPortChange: true/);
  const form=await source("components/workflow/stages/QuotationDecisionForm.jsx");
  assert.match(form,/pending.current/);assert.match(form,/await submitDecisionOnce/);assert.match(form,/disabled=\{disabled\}/);
});

test("duplicate decision submissions are ignored while the first is pending and failure releases the guard",async()=>{
  const pending={current:false};let calls=0,finish;
  const saved=new Promise((resolve)=>{finish=resolve;});
  const first=submitDecisionOnce(pending,async()=>{calls++;await saved;},{});
  assert.equal(await submitDecisionOnce(pending,async()=>{calls++;},{}),false);
  assert.equal(calls,1);finish();assert.equal(await first,true);assert.equal(pending.current,false);
  await assert.rejects(submitDecisionOnce(pending,async()=>{throw new Error("Failure");},{}));assert.equal(pending.current,false);
});

test("Overview transition eligibility follows thread status rather than review counts or total history",()=>{
  assert.equal(canReviewQuotations([]),false);
  for(const internalStatus of ["awaiting_review","revision_requested","approved","rejected"])
    assert.equal(canReviewQuotations([{status:"submitted",internalStatus}]),true);
  assert.equal(canReviewQuotations([{status:"accepted",internalStatus:"approved"},{status:"rejected",internalStatus:"rejected"}]),false);
});
