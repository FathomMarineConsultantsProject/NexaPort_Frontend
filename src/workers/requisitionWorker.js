import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {xlsxDocument} from './xlsxSource.js';
import {pdfLines} from './pdfTextRows.js';
import {extractRequisition} from './requisitionNormalize.js';
import {extractSupplierQuotation} from './quotationNormalize.js';
import {extractClientPo} from './clientPoNormalize.js';

pdfjs.GlobalWorkerOptions.workerSrc=pdfWorkerUrl;
const post=(stage,current,total)=>self.postMessage({kind:'progress',stage,current,total});
const clean=v=>String(v??'').normalize('NFKC').replace(/\s+/g,' ').trim();

async function pdfDocument(bytes){
 const task=pdfjs.getDocument({data:new Uint8Array(bytes),useSystemFonts:true});const pdf=await task.promise,blocks=[];let ocrUsed=false,ocrWorker=null;
 if(pdf.numPages>1000){await task.destroy();throw new Error('PDF exceeds the 1,000 page limit')}
 try{for(let pageNumber=1;pageNumber<=pdf.numPages;pageNumber++){
  post('Reading PDF page',pageNumber,pdf.numPages);const page=await pdf.getPage(pageNumber);const content=await page.getTextContent();let lines=pdfLines(content.items,pageNumber);
  if(lines.reduce((n,l)=>n+l.text.replace(/\W/g,'').length,0)<20){
   post('Recognizing scanned page',pageNumber,pdf.numPages);
   const {createWorker}=await import('tesseract.js');ocrWorker ||= await createWorker('eng');
   const viewport=page.getViewport({scale:1.7}),canvas=new OffscreenCanvas(Math.ceil(viewport.width),Math.ceil(viewport.height));await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
   const result=await ocrWorker.recognize(canvas);lines=String(result.data?.text||'').split(/\r?\n/).map(clean).filter(Boolean).map(text=>({type:'text_line',text,metadata:{extraction:'ocr',fragments:[]},location:{pageNumber}}));ocrUsed=true;
  }
  blocks.push(...lines);page.cleanup();
 }}finally{await ocrWorker?.terminate();await task.destroy()}
 if(!blocks.length)throw new Error('No readable text was found. The local copy is preserved for retry.');
 return {fileType:'pdf',blocks,metadata:{pageCount:pdf.numPages},extractionMethod:ocrUsed?'ocr':'text'};
}

self.onmessage=async event=>{
 const {blob,fileType,mode}=event.data;
 try{const bytes=await blob.arrayBuffer();post('Reading local file',0,1);const document=fileType==='pdf'?await pdfDocument(bytes):await xlsxDocument(bytes,post);if(mode==='quotation'){self.postMessage({kind:'done',result:extractSupplierQuotation(document)});return;}if(mode==='client-po'){self.postMessage({kind:'done',result:extractClientPo(document)});return;}const priced=fileType==='xlsx'&&/\b(?:unit price|total price|currency|amount|total aud)\b/i.test(document.blocks.slice(0,30).map(b=>b.text).join(' '));const result=priced?{details:{},items:[],warnings:[],pageCount:document.metadata.sheetCount,extractionMethod:'spreadsheet'}:extractRequisition(document);result.warnings.push(...(document.extraWarnings||[]));if(document.extractionMethod==='ocr')result.warnings.push({code:'OCR_REVIEW',message:'Scanned text requires item-by-item review',page:null});
  if(priced)result.warnings.push({code:'PRICED_TEMPLATE',message:'This workbook is a priced quotation. It has not been treated as a client requisition.',page:null});
  const safeItems=result.items.map(item=>{const safe={...item};delete safe.sourceText;return safe});
  self.postMessage({kind:'done',result:{details:result.details,items:safeItems,warnings:result.warnings,pageCount:result.pageCount,extractionMethod:result.extractionMethod}});
 }catch(error){self.postMessage({kind:'error',message:String(error?.message||error).slice(0,300)})}
};
