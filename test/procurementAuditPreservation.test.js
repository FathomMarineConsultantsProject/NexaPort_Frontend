import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeLocalQuotation} from '../src/services/localQuotationExtraction.js';
import {mergeQuotationReview} from '../src/services/mergeQuotationReview.js';

test('preserves metadata, references, charges and printed totals without currency',()=>{
 const result=normalizeLocalQuotation({pageCount:1,lines:[{lineNumber:1,description:'Valve',quantity:'1',unitPrice:'10',lineTotal:'10',impaCode:'330911',supplierPartNumber:'P-1',sourcePage:1,sourceEvidence:'Valve 1 10'}],warnings:[],statedTotals:{subtotal:'10',tax:'1',total:'11'},currency:null,vesselName:'Wunma',shipReference:'15625',deliveryDate:'2026-11-19',documentDetails:{document_type:'quotation'},charges:[{kind:'other',amount:'2',sourceEvidence:'Certificate 2'}]});
 assert.equal(result.lines[0].impaCode,'330911');assert.equal(result.lines[0].makerReference,'P-1');
 assert.equal(result.vesselName,'Wunma');assert.equal(result.shipReference,'15625');assert.equal(result.deliveryDate,'2026-11-19');
 assert.equal(result.printedTotals.subtotal,'10');assert.equal(result.printedTotals.total,'11');assert.equal(result.charges[0].amount,'2');
});

test('AI nulls and differing values cannot erase source backed offline fields',()=>{
 const baseline={vesselName:'Wunma',supplierName:'Known supplier',lines:[{sourceOrder:1,supplierLineNumber:'1',description:'Valve',quantity:'1',uom:null,sourceEvidence:'Valve 1'}]};
 const candidate={vesselName:null,supplierName:'Other',lines:[{sourceOrder:1,supplierLineNumber:'1',description:'Different valve',quantity:'15',uom:'EA',sourceEvidence:'Valve 1 EA'}]};
 const result=mergeQuotationReview(baseline,candidate);
 assert.equal(result.vesselName,'Wunma');assert.equal(result.supplierName,'Known supplier');assert.equal(result.lines[0].description,'Valve');assert.equal(result.lines[0].quantity,'1');assert.equal(result.lines[0].uom,'EA');assert.equal(result.lines[0].reviewConfirmed,false);
});
test('AI financial recovery fills missing totals and keeps repeated source charges',()=>{
 const baseline={defaultCurrency:'USD',printedTotals:{subtotal:'100'},statedTotals:{},charges:[{kind:'freight',amount:'5',currency:'USD',sourceEvidence:'Freight A'}],lines:[]};
 const candidate={printedTotals:{subtotal:'999',total:'110'},statedTotals:{USD:'110'},charges:[{kind:'freight',amount:'5',currency:'USD',sourceEvidence:'Freight A'},{kind:'freight',amount:'5',currency:'USD',sourceEvidence:'Freight B'},{kind:'tax',amount:'5',currency:'USD'}],lines:[]};
 const merged=mergeQuotationReview(baseline,candidate);
 assert.equal(merged.printedTotals.subtotal,'100');assert.equal(merged.printedTotals.total,'110');assert.equal(merged.statedTotals.USD,'110');
 assert.equal(merged.charges.length,2);assert.equal(merged.charges[1].sourceEvidence,'Freight B');
});
