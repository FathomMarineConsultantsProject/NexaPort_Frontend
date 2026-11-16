import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync} from 'node:fs';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import {xlsxDocument} from '../src/workers/xlsxSource.js';
import {pdfLines} from '../src/workers/pdfTextRows.js';
import {extractSupplierQuotation} from '../src/workers/quotationNormalize.js';
import {proposeMatches} from '../../NexaPort_Backend/src/services/procurementItemMatching.js';

const fixture=name=>resolve('..',name);
const files=['Demo_Supplier_A_USD_38_Items.pdf','Demo_Supplier_B_EUR_25_Items.xlsx','Demo_Supplier_C_JPY_40_Items.pdf'];
function csvRows(source){const rows=[],row=[];let cell='',quoted=false;for(let i=0;i<source.length;i++){const c=source[i];if(c==='"'){if(quoted&&source[i+1]==='"'){cell+='"';i++}else quoted=!quoted}else if(c===','&&!quoted){row.push(cell);cell=''}else if(c==='\n'&&!quoted){row.push(cell.replace(/\r$/,''));rows.push([...row]);row.length=0;cell=''}else cell+=c}if(cell||row.length){row.push(cell);rows.push(row)}const [headers,...values]=rows;return values.filter(row=>row.length===headers.length).map(row=>Object.fromEntries(headers.map((key,i)=>[key,row[i]])))}
test('supplied PDF and XLSX quotations extract their real fixture rows and charges', {skip:files.some(name=>!existsSync(fixture(name)))}, async()=>{
 const results=[];
 for(const name of files){const bytes=await readFile(fixture(name));let document;
  if(name.endsWith('.xlsx'))document=await xlsxDocument(bytes);
  else{const task=pdfjs.getDocument({data:new Uint8Array(bytes),useSystemFonts:true}),pdf=await task.promise,blocks=[];for(let pageNumber=1;pageNumber<=pdf.numPages;pageNumber++)blocks.push(...pdfLines((await(await pdf.getPage(pageNumber)).getTextContent()).items,pageNumber));document={fileType:'pdf',blocks};await task.destroy()}
  results.push(extractSupplierQuotation(document));
 }
 assert.deepEqual(results.map(r=>r.lines.length),[38,25,40]);
 assert.deepEqual(results.map(r=>r.defaultCurrency),['USD','EUR','JPY']);
 assert.deepEqual(results.map(r=>r.charges.map(c=>c.kind)),[['freight','handling'],['freight','handling'],['freight','handling']]);
 assert.equal(results[1].lines.filter(line=>line.unitPrice&&line.clientItemNumber).length,25);
 assert.deepEqual(results[1].lines[0].sourceCells.slice(0,2),['A12','B12']);
 assert.equal(results[1].statedTotals.EUR,'11593.4000');
 assert.equal(results[1].quotationDate,'2026-11-16');
 assert.equal(results[1].expiryDate,'2026-12-16');
 assert.equal(results[1].supplierName,'Harbourline Industrial (DEMO)');
 assert.equal(new Set(results[2].lines.map(line=>line.clientItemNumber)).size,40);
 const key=csvRows(await readFile(fixture('Demo_Quotation_Test_Answer_Key.csv'),'utf8'));
 assert.equal(key.length,40);
 const originals=key.map((row,i)=>({id:`item-${i+1}`,client_item_number:row['Source RFQ line'],raw_json:{clientItemNumber:row['Source RFQ line'],description:row['Description from uploaded RFQ'],impaCode:row['Maker reference'].replace(/\D/g,'').match(/^\d{6}$/)?.[0]||'',makerReference:row['Maker reference'],drawingPosition:row['Drawing/details'],quantity:row['Requested quantity'],uom:row.UOM},corrections_json:{}}));
 const offers=results.flatMap((result,s)=>result.lines.map((line,i)=>({id:`supplier-${s}-line-${i}`,revision_id:`revision-${s}`,client_item_number:line.clientItemNumber,description:line.description,impa_code:line.impaCode,maker_reference:line.makerReference,quantity:line.quantity,uom:line.uom,currency:line.currency,unit_price:line.unitPrice})));
 const matches=proposeMatches(originals,offers);
 assert.equal(matches.length,103);
 assert.equal(matches.filter(match=>match.status==='matched').length,103);
 assert.ok(matches.every(match=>match.requisitionItemId===`item-${offers.find(offer=>offer.id===match.quotationLineId).client_item_number}`));
});
