import test from 'node:test';
import assert from 'node:assert/strict';
import {activeWarnings,canConfirmRow,financialIssues,lineNeedsAttention} from '../src/services/quotationReviewState.js';
import {calculateQuotationExpiry} from '../src/services/quotationDateReview.js';
import {normalizeLocalQuotation} from '../src/services/localQuotationExtraction.js';

const row=()=>({sourceOrder:1,description:'Marine valve',quantity:'2',uom:'PCS',currency:'USD',unitPrice:'10.00',statedLineTotal:'20.00',lineDiscount:null,reviewStatus:'needs_review',reviewConfirmed:false});
test('unchanged correct row can be confirmed without an edit',()=>{
 const r=row();assert.equal(canConfirmRow(r,'USD'),true);assert.equal(lineNeedsAttention(r,'USD'),true);
 r.reviewStatus='validated';r.reviewConfirmed=true;assert.equal(lineNeedsAttention(r,'USD'),false);
});
test('unpriced source item confirms without an invented price or currency',()=>{
 const result=normalizeLocalQuotation({lines:[{lineNumber:1,description:'Marine valve',quantity:'2',unit:'PCS',unitPrice:null,lineTotal:null,sourcePage:1,sourceEvidence:'Valve 2 PCS; price on request'}],warnings:[],pageCount:1,statedTotals:{},currency:null,supplierName:'Test supplier',valid:false});
 const product=result.lines[0];
 assert.equal(product.unitPrice,null);assert.equal(product.statedLineTotal,null);
 assert.equal(result.warnings.length,0);
 assert.equal(canConfirmRow(product,null),true);
 assert.equal(lineNeedsAttention({...product,reviewStatus:'validated',reviewConfirmed:true},null),false);
});
test('editing a confirmed row invalidates confirmation until corrected row is confirmed',()=>{
 const r={...row(),reviewStatus:'validated',reviewConfirmed:true};
 r.quantity='3';r.reviewStatus='corrected';r.reviewConfirmed=false;
 assert.equal(lineNeedsAttention(r,'USD'),true);assert.equal(canConfirmRow(r,'USD'),false);
 r.statedLineTotal='30.00';assert.equal(canConfirmRow(r,'USD'),true);
 r.reviewConfirmed=true;assert.equal(lineNeedsAttention(r,'USD'),false);
});
test('financial discrepancies show conflicting values and clear after correction',()=>{
 const draft={defaultCurrency:'USD',lines:[row()],charges:[],statedTotals:{USD:'25.00'}};
 assert.match(financialIssues(draft)[0],/Printed USD total 25.00; calculated 20.0000/);
 draft.statedTotals.USD='20.00';assert.deepEqual(financialIssues(draft),[]);
 draft.lines[0].statedLineTotal='21.00';assert.match(financialIssues(draft)[0],/Line 1: printed USD 21.0000; calculated 20.0000/);
});
test('backend relative date review survives frontend normalization',()=>{
 const dateReview={sourceText:'Validity 30 Days',sourcePage:1,duration:30,unit:'calendar_days',referenceRule:'unconfirmed',referenceDate:null,suggestedReferenceDate:'2026-11-21',calculatedExpiry:'2026-12-21',confirmed:false,manualExpiry:null};
 const result=normalizeLocalQuotation({lines:[{lineNumber:1,description:'Valve',quantity:'2',unit:'PCS',unitPrice:'10.00',lineTotal:'20.00',sourcePage:1,sourceEvidence:'Valve 2 PCS 10.00 20.00'}],warnings:[],pageCount:1,statedTotals:{total:'20.00'},currency:'USD',supplierName:'Test',quotationDate:'2026-11-21',dateReview,reviewProtocolVersion:2,valid:false});
 assert.equal(result.lines[0].reviewConfirmed,false);assert.deepEqual(result.dateReview,dateReview);assert.equal(result.reviewProtocolVersion,2);
 assert.equal(calculateQuotationExpiry('2026-11-21',30,'calendar_days'),'2026-12-21');
});

test('correcting a missing field removes its warning but preserves source concerns',()=>{
 const draft={lines:[{...row(),quantity:null}],warnings:[{code:'MISSING_FIELD',message:'Quantity is missing on supplier line 1',sourceOrder:1},{code:'FIELD_SOURCE_REVIEW',message:'Check source',sourceOrder:1}],defaultCurrency:'USD',statedTotals:{USD:'20.00'}};
 assert.equal(activeWarnings(draft).length,2);
 draft.lines[0].quantity='2';
 assert.deepEqual(activeWarnings(draft).map(w=>w.code),['FIELD_SOURCE_REVIEW']);
});
test('zero discount and missing unit do not create an arithmetic warning',()=>{
 const valve={...row(),quantity:'1',unitPrice:'778',statedLineTotal:'778',lineDiscount:'0',uom:null};
 const draft={lines:[valve],warnings:[{code:'MISSING_UOM',message:'Unit is missing',sourceOrder:1},{code:'MISSING_FIELD',message:'Unit is missing on supplier line 1',sourceOrder:1}],defaultCurrency:'USD',charges:[],statedTotals:{USD:'778'}};
 assert.deepEqual(financialIssues(draft),[]);
 assert.deepEqual(activeWarnings(draft).map(w=>w.code),['MISSING_UOM']);
 valve.uom='Each';assert.deepEqual(activeWarnings(draft),[]);
});
