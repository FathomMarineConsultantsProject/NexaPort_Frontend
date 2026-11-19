import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {normalizeLocalQuotation,validateBackendExtractionResponse} from '../src/services/localQuotationExtraction.js';

const fixture=new URL('../../tools/local_quotation_extraction/blackwoods-benchmark.json',import.meta.url);
test('actual Blackwoods coordinates map to quotation editor and revision fields',{skip:!existsSync(fixture)},()=>{
 const source=JSON.parse(readFileSync(fixture));
 const quote=normalizeLocalQuotation({...source,supplierName:'J. Blackwood & Son Pty Ltd',quotationDate:'2026-11-17',expiryDate:'2026-12-17'});
 assert.equal(quote.lines.length,26);
 assert.deepEqual([quote.supplierName,quote.supplierQuotationReference,quote.defaultCurrency],['J. Blackwood & Son Pty Ltd','BWSQ001801478','AUD']);
 assert.deepEqual([quote.lines[7].quantity,quote.lines[7].uom,quote.lines[7].unitPrice,quote.lines[7].statedLineTotal],['24.00','EACH','52.00','1248.00']);
 assert.match(quote.lines[7].description,/1 ROW$/);
 assert.equal(quote.lines[7].sourcePage,1);
 assert.equal(quote.lines[7].supplierLineNumber,'8');
 assert.deepEqual(quote.charges.map(c=>[c.kind,c.amount]),[['freight','18.00'],['tax','432.21']]);
 assert.deepEqual(quote.statedTotals,{AUD:'4754.28'});
 assert.deepEqual(quote.warnings,[]);
});

test('unexpected successful backend payload cannot enter the quotation editor',()=>{
 assert.throws(()=>validateBackendExtractionResponse({success:true,data:{lines:[]}}),/incomplete response/);
 assert.throws(()=>validateBackendExtractionResponse({lines:[],warnings:[],pageCount:3,statedTotals:{}}),/no product lines/);
});
