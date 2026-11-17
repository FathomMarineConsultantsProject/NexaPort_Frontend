import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import {pdfLines} from '../src/workers/pdfTextRows.js';
import {extractRequisition} from '../src/workers/requisitionNormalize.js';
import {extractSupplierQuotation} from '../src/workers/quotationNormalize.js';
import {proposeMatches} from '../../NexaPort_Backend/src/services/procurementItemMatching.js';
import {analyzeQuotationComparison} from '../src/pages/quotationAnalysis.js';
import {testDraftRows} from '../src/pages/procurementTestDraft.js';
import {createServer} from 'vite';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';

async function document(path){const task=pdfjs.getDocument({data:new Uint8Array(await readFile(path)),useSystemFonts:true}),pdf=await task.promise,blocks=[];for(let page=1;page<=pdf.numPages;page++)blocks.push(...pdfLines((await(await pdf.getPage(page)).getTextContent()).items,page));await task.destroy();return {fileType:'pdf',blocks,metadata:{pageCount:pdf.numPages}}}
test('original 40 items and North Quay PDF match uniquely, including glove clips',async()=>{
 const original=extractRequisition(await document(resolve('..','CBRS00003138.pdf')));
 const quote=extractSupplierQuotation(await document(resolve('..','procurement_review_outputs/demo_supplier_quotes/Demo_Supplier_Beta_EUR.pdf')));
 const items=original.items.map(x=>({id:x.clientItemNumber,client_item_number:x.clientItemNumber,raw_json:x,corrections_json:{}}));
 const offers=quote.lines.map((x,i)=>({id:String(i+1),revision_id:'revision',client_item_number:x.clientItemNumber,description:x.description,impa_code:x.impaCode,maker_reference:x.makerReference,uom:x.uom}));
 const matches=proposeMatches(items,offers);
 assert.equal(quote.lines.length,40);assert.equal(matches.filter(x=>x.status==='matched').length,40);
 assert.equal(new Set(matches.map(x=>x.requisitionItemId)).size,40);
 assert.equal(quote.lines[33].makerReference,'0411-2987');assert.equal(matches[33].requisitionItemId,'34');
});
test('manual correction, undo, and ignored reason survive analysis save',async()=>{
 const base={items:[{id:'item-34'},{id:'item-33'}],quotes:[{quote_id:'quote',revision_id:'revision'}],lines:[{id:'line-34',revision_id:'revision'}],matches:[{quotationRevisionId:'revision',quotationLineId:'line-34',requisitionItemId:'item-33',status:'matched',reason:'Old wrong match',reviewed:true,method:'manual'}],matchRevision:'old'};
 let workspace=base,saved;
 const api={getComparison:async()=>workspace,saveComparisonMatches:async(_,body)=>{saved=body.decisions;workspace={...base,matchRevision:'new',matches:saved.map(x=>({...x,method:'manual',reviewed:true}))}},getComparisonRates:async()=>[],previewComparison:async()=>({allocations:[]})};
 const run=async edit=>analyzeQuotationComparison({requisitionId:'req',currency:'AUD',previous:{data:workspace,matches:[edit]},dirtyIds:['line-34'],overrides:{},requestKeyFor:()=> 'request',onProgress:()=>{}},api);
 let result=await run({...base.matches[0],requisitionItemId:'item-34',reason:'Manual item correction'});
 assert.equal(result.matches[0].requisitionItemId,'item-34');
 result=await run({...result.matches[0],requisitionItemId:null,status:'uncertain',reason:'Manual match cleared'});
 assert.equal(result.matches[0].requisitionItemId,null);assert.equal(result.matches[0].status,'uncertain');
 result=await run({...result.matches[0],reason:'Ignored for now: Awaiting supplier clarification'});
 assert.equal(result.matches[0].reason,'Ignored for now: Awaiting supplier clarification');
 assert.equal(saved[0].reviewed,true);
});
test('missing item is explicitly excluded from local draft rows',()=>{
 const draft={data:{items:[{id:'34',clientItemNumber:'34',description:'GLOVE CLIPS',uom:'pcs'}],lines:[]},preview:{allocations:[{itemId:'34',requiredQuantity:'50',selectedLineId:null,status:'missing',options:[]}]},ignoredItems:{'34':'Awaiting supplier quote'}};
 assert.deepEqual(testDraftRows(draft).map(x=>({included:x.included,reason:x.ignoredReason,status:x.status})),[{included:false,reason:'Awaiting supplier quote',status:'missing'}]);
});
test('incomplete test preview reaches client quotation, PO reconciliation and supplier PO preview',async()=>{
 const server=await createServer({server:{middlewareMode:true},appType:'custom'});
 try{
  const {default:Preview}=await server.ssrLoadModule('/src/pages/ProcurementTestPreview.jsx');
  const draft={currency:'USD',data:{items:[{id:'34',clientItemNumber:'34',description:'GLOVE CLIPS',uom:'pcs'},{id:'1',clientItemNumber:'1',description:'BRUSH',uom:'pc'}],lines:[{id:'offer-1',supplier_name:'North Quay'}]},matches:[],preview:{allocations:[{itemId:'34',requiredQuantity:'50',selectedLineId:null,status:'missing',options:[]},{itemId:'1',requiredQuantity:'12',selectedLineId:'offer-1',status:'covered',options:[{lineId:'offer-1',supplier:'North Quay',originalCurrency:'USD',originalUnitPrice:'4.00',convertedUnitPrice:'4.00'}]}]},ignoredItems:{'34':'Awaiting price'}};
  const html=renderToStaticMarkup(React.createElement(Preview,{draft,clientName:'Test Client'}));
  for(const label of ['TEST / INCOMPLETE — NOT VALID FOR ISSUE','Client quotation preparation','PDF print preview','XLSX preview','Client PO reconciliation test','Supplier PO preview','Not included in draft total'])assert.ok(html.includes(label),label);
  assert.ok(!html.includes('Issue supplier POs'));
 }finally{await server.close()}
});
