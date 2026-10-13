import assert from "node:assert/strict";
import test from "node:test";
import { readFile, access } from "node:fs/promises";
import { Buffer } from "node:buffer";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { transformWithOxc } from "vite";

const cache=new Map();
const load=async(url)=>{
  if(cache.has(url.href))return cache.get(url.href);
  let code=await readFile(url,"utf8");
  if(url.pathname.endsWith(".jsx"))({code}=await transformWithOxc(code,url.pathname,{jsx:{runtime:"automatic"}}));
  for(const match of [...code.matchAll(/from "([^"]+)"/g)]){
    const specifier=match[1];let resolved;
    if(specifier.startsWith(".")){
      let target=new URL(specifier,url);
      if(!/\.(jsx|js)$/.test(target.pathname)){
        for(const extension of [".js",".jsx"]){const candidate=new URL(target.href+extension);try{await access(candidate);target=candidate;break;}catch{/* Try the next supported source extension. */}}
      }
      resolved=await load(target);
    }else resolved=import.meta.resolve(specifier);
    code=code.replace(match[0],`from ${JSON.stringify(resolved)}`);
  }
  const resolved=`data:text/javascript;base64,${Buffer.from(code).toString("base64")}`;cache.set(url.href,resolved);return resolved;
};
const component=async(path)=>(await import(await load(new URL(path,import.meta.url)))).default;
const Confirm=await component("../src/components/workflow/stages/StageConfirm.jsx");
const Rail=await component("../src/components/workflow/WorkflowStageRail.jsx");
const quote={id:50,internalStatus:"approved",latestRevisionId:201,approvedRevisionId:201,consultantTotalUsd:2000,baseFeeUsd:2000,revisions:[{id:201,revisionNumber:1,baseFee:2000,consultantTotal:2000}]};
const original={id:100,status:"approved",revisionNumber:1,approvedQuotationRevisionId:201,clientTotalUsd:2500,adminMarkupUsd:500,feeMode:"percentage",feePercentage:25};
const render=(data)=>renderToStaticMarkup(createElement(Confirm,{data:{request:{vessel:{},port:{}},selectedQuotation:quote,...data},busy:false}));

test("all completed stages stay accessible after Client approval and at invoice paid",()=>{
  for(const currentStage of ["confirm","surveyor","invoice_paid"]){
    const html=renderToStaticMarkup(createElement(Rail,{currentStage,viewedStage:"overview",onView(){}}));
    assert.match(html,/<button[^>]*>.*?Overview/s);
    const overview=html.match(/<li[^>]*viewing[^>]*>(.*?)<\/li>/s)[1];assert.doesNotMatch(overview,/disabled/);
    if(currentStage==="invoice_paid")assert.equal((html.match(/<button/g)||[]).length,13);
  }
});

test("approved proposal offers Create Amendment and keeps accepted value visible",()=>{
  const html=render({proposal:original,acceptedProposal:original,proposals:[original]});
  assert.match(html,/Create Amendment/);assert.match(html,/Authoritative Client agreement/);assert.match(html,/2,500/);
  assert.doesNotMatch(html,/>Save draft</);
});

test("saved amendment draft remains editable while original approved agreement is visible",()=>{
  const draft={...original,id:101,status:"draft",revisionNumber:2,amendsProposalId:100,clientTotalUsd:2300,adminMarkupUsd:300};
  const html=render({proposal:draft,acceptedProposal:original,proposals:[draft,original]});
  assert.match(html,/>Save draft</);assert.match(html,/Send proposal to Client/);assert.match(html,/Authoritative Client agreement/);assert.match(html,/2,300/);assert.match(html,/2,500/);
  assert.doesNotMatch(html,/>Select other quote</);
});

test("sent revision and sent amendment use separate labels and preserve offer history",()=>{
  const sent={...original,status:"sent"};assert.match(render({proposal:sent,proposals:[sent]}),/Revise Proposal/);
  const amendment={...sent,id:101,revisionNumber:2,amendsProposalId:100};
  const html=render({proposal:amendment,acceptedProposal:original,proposals:[amendment,original]});
  assert.match(html,/Amendment awaiting Client/);assert.match(html,/Proposal history \(2\)/);
});

test("pending Consultant revision still shows approved history and blocks new terms; completed/invoiced requests explain adjustment gate",()=>{
  const html=render({selectedQuotation:{...quote,internalStatus:"awaiting_review",latestRevisionId:202,approvedRevisionId:null},proposal:original,acceptedProposal:original,proposals:[original]});
  assert.match(html,/requires fresh internal approval/);assert.match(html,/Authoritative Client agreement/);assert.match(html,/disabled=""[^>]*>Create Amendment/);
  const completed=render({proposal:original,acceptedProposal:original,proposals:[original],inspectionCompletion:{completed:true}});
  assert.match(completed,/explicit financial adjustment workflow/);assert.match(completed,/disabled=""[^>]*>Create Amendment/);
});

test("back navigation and proposal amendment metadata use existing secured APIs",async()=>{
  const source=await readFile(new URL("../src/pages/InspectionWorkflowWorkspace.jsx",import.meta.url),"utf8");
  assert.match(source,/onView=\{setViewedStage\}/);assert.match(source,/currentStage==="overview"\?perform.*?:setViewedStage\("quote"\)/);
  const confirm=await readFile(new URL("../src/components/workflow/stages/StageConfirm.jsx",import.meta.url),"utf8");
  assert.match(confirm,/amendsProposalId: acceptedProposal\?\.id/);
});
