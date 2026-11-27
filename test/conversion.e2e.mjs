import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {chromium} from 'playwright';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {dirname,resolve} from 'node:path';

const backend=resolve(process.env.NEXAPORT_BACKEND_DIR||resolve(dirname(fileURLToPath(import.meta.url)),'../../NexaPort_Backend'));
const {quotationConversionPdf,requisitionConversionPdf}=await import(pathToFileURL(resolve(backend,'src/services/procurementConversionPdfService.js')).href);
const {mapRequisitionFallback}=await import(pathToFileURL(resolve(backend,'src/services/requisitionPythonFallback.js')).href);
const fixture=resolve(process.env.REQUISITION_FIXTURE||resolve(backend,'test/fixtures/procurement_conversion/multi-sheet.xlsb'));
const quoteFixture=resolve(process.env.QUOTATION_FIXTURE||fixture);
const quoteType=quoteFixture.split('.').at(-1).toLowerCase();
const id='11111111-1111-4111-8111-111111111111';
const python=(module,bytes,type)=>{const run=spawnSync('python',['-B','-m',module,type],{cwd:backend,input:bytes,maxBuffer:10*1024*1024,timeout:110000});assert.equal(run.status,0,`${String(run.stderr)} ${String(run.stdout)}`);return JSON.parse(run.stdout.toString())};
const respond=(route,data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify({success:status<400,data})});
let storedReq=null,storedQuote=null,convertedCount=0,internalCount=0,currentReqPdf=null,currentQuotePdf=null,reqDraft=null;
const record=()=>({id,title:'Test requisition',status:storedReq?'review':'draft',version:1,internal_reference:'TEST-001',updated_at:new Date().toISOString(),can_manage:true,active_document_id:storedReq?.documentId||null,details_json:storedReq?.details||{},details_corrections:{},documents:storedReq?[{id:storedReq.documentId,storage_kind:'browser',status:'complete',file_type:storedReq.sourceType,page_count:storedReq.pageCount}]:[],items:(storedReq?.items||[]).map(item=>({id:item.id,raw_json:item,corrections_json:{},review_status:item.reviewStatus})),warnings:[]});

const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_CHROMIUM_PATH?{executablePath:process.env.PLAYWRIGHT_CHROMIUM_PATH}:{})});
try{
 const context=await browser.newContext({acceptDownloads:true});
 await context.route('http://127.0.0.1:5000/api/**',async route=>{
  const request=route.request(),url=new URL(request.url()),path=url.pathname,method=request.method();
  try{
   if(path.endsWith('/requisition-fallback')&&method==='POST'){
    const type=request.headers()['x-procurement-source-type']||'pdf';
    const bytes=currentReqPdf||readFileSync(fixture);
    const value=mapRequisitionFallback(python('requisition_python.runner',bytes,type));return respond(route,value);
   }
   if(path.endsWith('/received-quotations/extract')&&method==='POST'){
    const type=currentQuotePdf?'pdf':quoteType,bytes=currentQuotePdf||readFileSync(quoteFixture);
    if(type==='pdf')internalCount++;
    return respond(route,python('quotation_python.runner',bytes,type));
   }
   if(path.endsWith('/convert-pdf')&&!path.includes('/received-quotations/')&&method==='POST'){
    reqDraft=request.postDataJSON();const bytes=await requisitionConversionPdf(reqDraft);currentReqPdf=bytes;convertedCount++;
    return route.fulfill({status:200,contentType:'application/pdf',body:bytes});
   }
   if(path.endsWith('/received-quotations/convert-pdf')&&method==='POST'){
    const bytes=await quotationConversionPdf(request.postDataJSON());currentQuotePdf=bytes;convertedCount++;
    return route.fulfill({status:200,contentType:'application/pdf',body:bytes});
   }
   if(path.endsWith('/browser-extraction')&&method==='POST'){storedReq=request.postDataJSON();return respond(route,{documentId:storedReq.documentId,items:storedReq.items.length});}
   if(path.endsWith('/received-quotations/extracted')&&method==='POST'){
    storedQuote=request.postDataJSON();return respond(route,{quoteId:id,revision:{revision_number:1}});
   }
   if(path.endsWith('/received-quotations')&&method==='GET')return respond(route,storedQuote?[{id,supplier_name:storedQuote.supplierName,original_filename:storedQuote.filename,revision_number:1,line_count:storedQuote.lines.length,status:'draft'}]:[]);
   if(path.endsWith(`/received-quotations/${id}`)&&method==='GET')return respond(route,{quote:{id,supplier_name:storedQuote.supplierName},revisions:[{source_rfq_reference:storedQuote.sourceRfqReference,original_filename:storedQuote.filename,mime_type:storedQuote.mimeType,byte_size:storedQuote.byteSize,sha256:storedQuote.sha256,supplier_quotation_reference:storedQuote.supplierQuotationReference,quotation_date:storedQuote.quotationDate,expiry_date:storedQuote.expiryDate,default_currency:storedQuote.defaultCurrency,stated_totals_json:storedQuote.statedTotals,charges_json:storedQuote.charges,commercial_terms:storedQuote.commercialTerms,parser_version:storedQuote.parserVersion,extraction_method:storedQuote.extractionMethod,warnings_json:[],revision_number:1}],lines:storedQuote.lines.map((line,index)=>({id:String(index),source_order:line.sourceOrder,supplier_line_number:line.supplierLineNumber,client_item_number:line.clientItemNumber,description:line.description,impa_code:line.impaCode,maker_reference:line.makerReference,quantity:line.quantity,uom:line.uom,currency:line.currency,unit_price:line.unitPrice,stated_line_total:line.statedLineTotal,line_discount:line.lineDiscount,lead_time:line.leadTime,availability:line.availability,source_page:line.sourcePage,source_sheet:line.sourceSheet,source_cells:line.sourceCells,source_evidence:line.sourceEvidence,review_status:line.reviewStatus,review_confirmed:line.reviewConfirmed}))});
   if(path.endsWith(`/intake/${id}`)&&method==='GET')return respond(route,record());
   if(path.endsWith('/stages')&&method==='GET')return respond(route,{});
   if(path.endsWith('/comparison')&&method==='GET')return respond(route,{comparison:null,items:[],lines:[],quotes:[],matches:[]});
   return respond(route,[]);
  }catch(error){console.error('API failure',path,error);return respond(route,null,500)}
 });
 const req=await context.newPage();req.on('pageerror',error=>console.error('PAGE',error));await req.goto('http://127.0.0.1:5177/test/conversion-harness.html');
 await req.getByLabel('Select requisition file').setInputFiles(fixture);
 await req.getByRole('button',{name:'Convert to NexaPort Format'}).click();
 try{await req.getByText('PDF Ready').first().waitFor({timeout:30000})}catch(error){console.error('REQUISITION BODY',(await req.locator('body').innerText()).slice(0,1500));throw error}
 assert.ok((await req.getByRole('link',{name:'Download PDF'}).getAttribute('href')).startsWith('blob:'));
 const preview=req.waitForEvent('popup');await req.getByRole('button',{name:'Preview PDF'}).click();const pdfTab=await preview;await pdfTab.close();
 await req.getByRole('button',{name:'Add to procurement'}).click();
 try{await req.getByText(/requisition items converted, extracted, saved and reloaded/).waitFor({timeout:30000})}catch(error){console.error('REQUISITION ADD',(await req.locator('body').innerText()).slice(0,1300));throw error}
 await req.reload();await req.getByText(storedReq.items[0].description,{exact:false}).first().waitFor();assert.ok(storedReq.items.length>0);
 const quote=await context.newPage();await quote.goto('http://127.0.0.1:5177/test/conversion-harness.html#quote');
 await quote.getByRole('button',{name:'Add Supplier Quotation'}).click();
 if(['doc','xls'].includes(quoteType))await quote.getByLabel('Supplier name').fill('Marine Supply Co');
 await quote.getByLabel('Supplier quotation file').setInputFiles(quoteFixture);
 await quote.getByRole('button',{name:'Convert to NexaPort Format'}).click();
 try{await quote.getByText('PDF Ready',{exact:true}).waitFor({timeout:30000})}catch(error){console.error('QUOTE CONVERT',(await quote.locator('body').innerText()).slice(0,1400));throw error}
 assert.ok((await quote.getByRole('link',{name:'Download PDF'}).getAttribute('href')).startsWith('blob:'));
 const quotePreview=quote.waitForEvent('popup');await quote.getByRole('button',{name:'Preview PDF'}).click();const quotePdf=await quotePreview;await quotePdf.close();
 await quote.getByRole('button',{name:'Add to Received Quotations'}).click();
 try{await quote.getByText(/submitted to extraction review/).waitFor({timeout:30000})}catch(error){console.error('QUOTE BODY', (await quote.locator('body').innerText()).slice(0,1700));throw error}
 await quote.getByRole('button',{name:'Confirm All Products'}).click();
 await quote.getByRole('button',{name:'Save draft'}).click();
 await quote.getByText(/saved as draft/).waitFor();assert.ok(storedQuote.lines.length>0);
 await quote.reload();await quote.getByText(storedQuote.supplierName,{exact:false}).first().waitFor();
 console.log(JSON.stringify({requisitionItems:storedReq.items.length,quoteLines:storedQuote.lines.length,convertedCount,internalCount,requisitionSource:fixture,quotationSource:quoteFixture}));
}finally{await browser.close()}
