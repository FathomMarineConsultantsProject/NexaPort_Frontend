import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import JSZip from 'jszip';
import {DOMParser} from '@xmldom/xmldom';
import {extractRequisition} from './requisitionNormalize.js';

pdfjs.GlobalWorkerOptions.workerSrc=pdfWorkerUrl;
const post=(stage,current,total)=>self.postMessage({kind:'progress',stage,current,total});
const clean=v=>String(v??'').normalize('NFKC').replace(/\s+/g,' ').trim();

function pdfLines(items,pageNumber){
 const rows=[];
 for(const item of items){const value=clean(item.str);if(!value)continue;const x=Number(item.transform?.[4])||0,y=Number(item.transform?.[5])||0;let row=rows.find(r=>Math.abs(r.y-y)<=3);if(!row){row={y,items:[]};rows.push(row)}row.items.push({value,x,width:Number(item.width)||0,height:Number(item.height)||0,fontName:item.fontName||''})}
 return rows.sort((a,b)=>b.y-a.y).map(row=>{const fragments=row.items.sort((a,b)=>a.x-b.x);return {type:'text_line',text:fragments.map(f=>f.value).join(' '),metadata:{x:fragments[0]?.x||0,y:row.y,fragments,extraction:'text'},location:{pageNumber}}});
}
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

const xml=s=>new DOMParser().parseFromString(s,'application/xml');
const nodes=(root,tag)=>Array.from(root.getElementsByTagNameNS('*',tag));
const first=(root,tag)=>nodes(root,tag)[0];
const attr=(node,name)=>node?.getAttribute(name)||'';
const colNumber=ref=>{let n=0;for(const c of (ref.match(/^[A-Z]+/i)?.[0]||''))n=n*26+c.toUpperCase().charCodeAt(0)-64;return n};
async function xlsxDocument(bytes){
 const zip=await JSZip.loadAsync(bytes),entries=Object.values(zip.files);if(entries.length>2000||entries.reduce((sum,f)=>sum+(f._data?.uncompressedSize||0),0)>100*1024*1024)throw new Error('Workbook exceeds local processing limits');const read=async path=>zip.file(path)?.async('string');
 const workbook=xml(await read('xl/workbook.xml')),rels=xml(await read('xl/_rels/workbook.xml.rels'));
 const paths=new Map(nodes(rels,'Relationship').map(r=>[attr(r,'Id'),attr(r,'Target').replace(/^\//,'')]));
 const sharedFile=await read('xl/sharedStrings.xml'),shared=sharedFile?nodes(xml(sharedFile),'si').map(si=>nodes(si,'t').map(t=>t.textContent).join(' ')):[];
 const sheets=nodes(workbook,'sheet'),blocks=[],warnings=[];
 for(let si=0;si<sheets.length;si++){
  const sheet=sheets[si],sheetName=attr(sheet,'name'),rid=attr(sheet,'r:id')||sheet.getAttributeNS('http://schemas.openxmlformats.org/officeDocument/2006/relationships','id');
  const target=paths.get(rid),path=target?.startsWith('xl/')?target:`xl/${target||''}`;const content=await read(path.replaceAll('\\','/'));if(!content)throw new Error(`Worksheet ${sheetName} could not be read`);
  const doc=xml(content),merges=nodes(doc,'mergeCell').map(n=>attr(n,'ref'));const rows=nodes(doc,'row');if(rows.length>50000)throw new Error(`Worksheet ${sheetName} exceeds the 50,000 row limit`);
  for(let ri=0;ri<rows.length;ri++){
   if(ri%100===0)post(`Reading ${sheetName}`,ri+1,rows.length);
   const row=rows[ri],rowIndex=Number(attr(row,'r'))||ri+1,cells=[];
   for(const cell of nodes(row,'c')){
    const address=attr(cell,'r'),columnIndex=colNumber(address),type=attr(cell,'t'),formula=first(cell,'f')?.textContent||null,raw=first(cell,'v')?.textContent;
    let value=type==='inlineStr'?nodes(first(cell,'is')||cell,'t').map(n=>n.textContent).join(' '):type==='s'?shared[Number(raw)]||'':raw??'';
    if(type==='b')value=value==='1'?'TRUE':'FALSE';
    if(formula&&raw===undefined){warnings.push({code:'FORMULA_UNVERIFIED',message:`${sheetName}!${address} has a formula without a cached result`,page:null});value=''}
    cells[columnIndex-1]={address,columnIndex,rowIndex,displayedValue:clean(value),formula,empty:!clean(value),styleId:attr(cell,'s'),merged:merges.some(m=>m.split(':').includes(address))};
   }
   if(!cells.some(c=>c&&!c.empty))continue;
   const filled=Array.from({length:cells.length},(_,i)=>cells[i]||{address:'',columnIndex:i+1,rowIndex,displayedValue:'',empty:true});
   blocks.push({type:'spreadsheet_row',text:filled.filter(c=>!c.empty).map(c=>c.displayedValue).join(' | '),metadata:{sheetName,rowIndex,cells:filled},location:{sheetName,rowIndex}});
  }
 }
 if(!blocks.length)throw new Error('Workbook contains no readable cells.');
 return {fileType:'xlsx',blocks,metadata:{sheetCount:sheets.length},extractionMethod:'spreadsheet',extraWarnings:warnings};
}

self.onmessage=async event=>{
 const {blob,fileType}=event.data;
 try{const bytes=await blob.arrayBuffer();post('Reading local file',0,1);const document=fileType==='pdf'?await pdfDocument(bytes):await xlsxDocument(bytes);const priced=fileType==='xlsx'&&/\b(?:unit price|total price|currency|amount|total aud)\b/i.test(document.blocks.slice(0,30).map(b=>b.text).join(' '));const result=priced?{details:{},items:[],warnings:[],pageCount:document.metadata.sheetCount,extractionMethod:'spreadsheet'}:extractRequisition(document);result.warnings.push(...(document.extraWarnings||[]));if(document.extractionMethod==='ocr')result.warnings.push({code:'OCR_REVIEW',message:'Scanned text requires item-by-item review',page:null});
  if(priced)result.warnings.push({code:'PRICED_TEMPLATE',message:'This workbook is a priced quotation. It has not been treated as a client requisition.',page:null});
  const safeItems=result.items.map(item=>{const safe={...item};delete safe.sourceText;return safe});
  self.postMessage({kind:'done',result:{details:result.details,items:safeItems,warnings:result.warnings,pageCount:result.pageCount,extractionMethod:result.extractionMethod}});
 }catch(error){self.postMessage({kind:'error',message:String(error?.message||error).slice(0,300)})}
};
