import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {normalizeLocalQuotation,validateBackendExtractionResponse} from '../src/services/localQuotationExtraction.js';
import {validateStructuredQuotation,reconcileStructuredQuotation} from '../../NexaPort_Backend/src/services/procurementStructuredQuotationService.js';
import {xlsxDocument} from '../src/workers/xlsxSource.js';
import {extractSupplierQuotation} from '../src/workers/quotationNormalize.js';

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

test('actual demo PDFs map into the quotation editor and saved revision schema',()=>{
 const cases=[
  ['procurement_review_outputs/demo_supplier_quotes/Demo_Supplier_Alpha_USD.pdf',40,'USD','15286.89'],
  ['procurement_review_outputs/demo_supplier_quotes/Demo_Supplier_Beta_EUR.pdf',40,'EUR','12430.42'],
  ['procurement_review_outputs/demo_supplier_quotes/Demo_Supplier_Gamma_JPY.pdf',40,'JPY','1971089'],
  ['Demo_Supplier_A_USD_38_Items.pdf',38,'USD','14664.45'],
  ['Demo_Supplier_C_JPY_40_Items.pdf',40,'JPY','2608377'],
 ];
 for(const [name,count,currency,total] of cases){
  const path=new URL(`../../${name}`,import.meta.url);
  if(!existsSync(path))continue;
  const bytes=readFileSync(path);
  const python=spawnSync(process.env.PYTHON_EXECUTABLE||'python',['../NexaPort_Backend/quotation_python/runner.py'],{input:bytes,encoding:'utf8',maxBuffer:4*1024*1024,env:{...process.env,PYTHONDONTWRITEBYTECODE:'1'}});
  assert.equal(python.status,0,python.stderr);
  const quote=normalizeLocalQuotation(JSON.parse(python.stdout));
  assert.equal(quote.lines.length,count,name);
  assert.equal(quote.defaultCurrency,currency,name);
  assert.equal(quote.statedTotals[currency],total,name);
  assert.equal(quote.lines.filter(row=>row.clientItemNumber).length,count,name);
  assert.equal(quote.charges.length,2,name);
  const body={requestKey:'11111111-1111-4111-8111-111111111111',supplierName:quote.supplierName,filename:name.split('/').at(-1),mimeType:'application/pdf',byteSize:bytes.length,sha256:'a'.repeat(64),supplierQuotationReference:quote.supplierQuotationReference,quotationDate:quote.quotationDate,expiryDate:quote.expiryDate,defaultCurrency:quote.defaultCurrency,statedTotals:quote.statedTotals,charges:quote.charges,commercialTerms:quote.commercialTerms,parserVersion:quote.parserVersion,extractionMethod:quote.extractionMethod,lines:quote.lines,warnings:quote.warnings,finalize:true};
  const checked=reconcileStructuredQuotation(validateStructuredQuotation(body));
  assert.equal(checked.canFinalize,true,`${name}: ${JSON.stringify(checked.issues)}`);
 }
});

test('unexpected successful backend payload cannot enter the quotation editor',()=>{
 assert.throws(()=>validateBackendExtractionResponse({success:true,data:{lines:[]}}),/incomplete response/);
 assert.equal(validateBackendExtractionResponse({lines:[],warnings:[],pageCount:3,statedTotals:{}}).lines.length,0);
});

test('demo Beta Excel quotation retains its browser extraction path',async()=>{
 const file=new URL('../../procurement_review_outputs/demo_supplier_quotes/Demo_Supplier_Beta_EUR.xlsx',import.meta.url);
 if(!existsSync(file))return;
 const result=extractSupplierQuotation(await xlsxDocument(readFileSync(file)));
 assert.equal(result.lines.length,40);
 assert.equal(result.defaultCurrency,'EUR');
 assert.equal(result.statedTotals.EUR,'12430.4200');
});
