import {xlsxDocument} from './xlsxSource.js';
import {extractRequisition} from './requisitionNormalize.js';
import {extractSupplierQuotation} from './quotationNormalize.js';
import {extractClientPo} from './clientPoNormalize.js';

const post=(stage,current,total)=>self.postMessage({kind:'progress',stage,current,total});

self.onmessage=async event=>{
 try{const {blob,fileType,mode}=event.data;post('Reading local file',0,1);const document=event.data.document||await xlsxDocument(await blob.arrayBuffer(),post);if(mode==='quotation'){self.postMessage({kind:'done',result:extractSupplierQuotation(document)});return;}if(mode==='client-po'){self.postMessage({kind:'done',result:extractClientPo(document)});return;}const priced=document.fileType==='xlsx'&&/\b(?:unit price|total price|currency|amount|total aud)\b/i.test(document.blocks.slice(0,30).map(b=>b.text).join(' '));const result=priced?{details:{},items:[],warnings:[],pageCount:document.metadata.sheetCount,extractionMethod:'spreadsheet'}:extractRequisition(document);result.warnings.push(...(document.extraWarnings||[]));if(document.extractionMethod==='ocr')result.warnings.push({code:'OCR_REVIEW',message:'Scanned text requires item-by-item review',page:null});
  if(priced)result.warnings.push({code:'PRICED_TEMPLATE',message:'This workbook is a priced quotation. It has not been treated as a client requisition.',page:null});
  const safeItems=result.items.map(item=>{const safe={...item};delete safe.sourceText;return safe});
  self.postMessage({kind:'done',result:{details:result.details,items:safeItems,warnings:result.warnings,pageCount:result.pageCount,extractionMethod:result.extractionMethod}});
 }catch(error){self.postMessage({kind:'error',message:String(error?.message||error).slice(0,300)})}
};
