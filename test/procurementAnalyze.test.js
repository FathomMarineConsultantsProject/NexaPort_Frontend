import test from 'node:test';
import assert from 'node:assert/strict';
import {analyzeQuotationComparison} from '../src/pages/quotationAnalysis.js';

const workspace=()=>({items:[{id:'item-1'}],quotes:[{quote_id:'supplier',revision_id:'finalized-revision'}],lines:[{id:'line-1',revision_id:'finalized-revision'}],matches:[{quotationRevisionId:'finalized-revision',quotationLineId:'line-1',requisitionItemId:'item-1',status:'matched',method:'automatic',reason:'IMPA and item number',score:100}],matchRevision:null});
test('one analysis persists safe matches once, fetches FX, and previews after refresh',async()=>{
 let current=workspace(),saves=0,rateCalls=0,previews=0;const stages=[];
 const api={getComparison:async()=>structuredClone(current),saveComparisonMatches:async(_id,body)=>{saves++;assert.equal(body.decisions[0].status,'matched');current.matchRevision='saved-match-revision'},getComparisonRates:async()=>{rateCalls++;return [{base:'EUR',quote:'AUD',rate:'1.7'}]},previewComparison:async(_id,body)=>{previews++;assert.equal(current.matchRevision,'saved-match-revision');assert.equal(body.rates[0].base,'EUR');assert.deepEqual(body.overrides,{'item-1':'line-1'});return {strategies:{single:[],split:{available:false}}}}};
 const input={requisitionId:'local-requisition',currency:'AUD',overrides:{'item-1':'line-1'},requestKeyFor:()=> 'stable-request-key',onProgress:stage=>stages.push(stage)};
 const first=await analyzeQuotationComparison(input,api);
 assert.equal(first.workspace.matchRevision,'saved-match-revision');assert.equal(saves,1);
 await analyzeQuotationComparison({...input,previous:{data:first.workspace,matches:first.matches}},api);
 assert.equal(saves,1);assert.equal(rateCalls,2);assert.equal(previews,2);
 assert.deepEqual(stages.slice(0,4),['Loading finalized quotations','Saving safe matches','Refreshing published FX rates','Calculating purchasing strategies']);
});

test('manual correction survives reanalysis and stale source is rejected',async()=>{
 let current=workspace(),saved;
 current.matchRevision='prior-match-revision';current.matches[0]={...current.matches[0],status:'uncertain',requisitionItemId:null,method:'review'};
 const previous=structuredClone(current),edited={...previous.matches[0],status:'matched',requisitionItemId:'item-1',method:'manual',reviewed:true};
 const api={getComparison:async()=>structuredClone(current),saveComparisonMatches:async(_id,body)=>{saved=body.decisions[0];current.matchRevision='corrected-revision';current.matches[0]=edited},getComparisonRates:async()=>[],previewComparison:async()=>({allocations:[]})};
 const input={requisitionId:'local-requisition',currency:'AUD',previous:{data:previous,matches:[edited]},dirtyIds:['line-1'],requestKeyFor:()=> 'stable-key',onProgress:()=>{}};
 const result=await analyzeQuotationComparison(input,api);
 assert.equal(saved.requisitionItemId,'item-1');assert.equal(saved.reviewed,true);assert.equal(result.workspace.matchRevision,'corrected-revision');
 current.quotes[0].revision_id='new-finalized-revision';
 await assert.rejects(analyzeQuotationComparison(input,api),/Quotation or match decisions changed/);
});

test('no finalized supplier quotation gives an actionable error',async()=>{
 await assert.rejects(analyzeQuotationComparison({requisitionId:'r',currency:'AUD',requestKeyFor:()=> 'key',onProgress:()=>{}},{getComparison:async()=>({...workspace(),quotes:[]})}),/Finalize at least one supplier quotation/);
});
