import * as pdfjs from 'pdfjs-dist';
import pdfWorkerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';
import {pdfLines} from '../workers/pdfTextRows.js';

pdfjs.GlobalWorkerOptions.workerSrc=pdfWorkerUrl;
const clean=v=>String(v??'').normalize('NFKC').replace(/\s+/g,' ').trim();

export async function browserPdfDocument(blob,onProgress){
 const task=pdfjs.getDocument({data:new Uint8Array(await blob.arrayBuffer()),useSystemFonts:true});
 let ocrWorker=null,ocrUsed=false;const blocks=[];
 try{
  const pdf=await task.promise;
  if(pdf.numPages>1000)throw new Error('PDF exceeds the 1,000 page limit');
  for(let pageNumber=1;pageNumber<=pdf.numPages;pageNumber++){
   onProgress?.({stage:'Reading PDF page',current:pageNumber,total:pdf.numPages});
   const page=await pdf.getPage(pageNumber);
   let lines=pdfLines((await page.getTextContent()).items,pageNumber);
   if(lines.reduce((n,l)=>n+l.text.replace(/\W/g,'').length,0)<20){
    onProgress?.({stage:'Recognizing scanned page',current:pageNumber,total:pdf.numPages});
    try{
     const viewport=page.getViewport({scale:1.7});
     const canvas=document.createElement('canvas');
     canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);
     await page.render({canvasContext:canvas.getContext('2d'),viewport}).promise;
     const {createWorker}=await import('tesseract.js');
     ocrWorker ||= await createWorker('eng',1,{langPath:'/ocr',gzip:false});
     const result=await ocrWorker.recognize(canvas);
     lines=String(result.data?.text||'').split(/\r?\n/).map(clean).filter(Boolean).map(text=>({type:'text_line',text,metadata:{extraction:'ocr',fragments:[]},location:{pageNumber}}));
     ocrUsed=true;
    }catch(error){throw new Error(`Scanned page ${pageNumber} could not be recognized: ${error?.message||error}. The selected file is still available for retry.`)}
   }
   blocks.push(...lines);page.cleanup();
  }
  if(!blocks.length)throw new Error('No readable text was found. The selected file is still available for retry.');
  return {fileType:'pdf',blocks,metadata:{pageCount:pdf.numPages},extractionMethod:ocrUsed?'ocr':'text'};
 }finally{await ocrWorker?.terminate();await task.destroy()}
}

