import axiosClient from '../api/axiosClient.js';

export const procurementFileTypes = {
 pdf:'application/pdf',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
 csv:'text/csv',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
};
export const procurementFileType = file => /\.(pdf|xlsx|csv|docx)$/i.exec(file.name)?.[1].toLowerCase();
export async function checkProcurementFile(file,type) {
 const bytes=new Uint8Array(await file.slice(0,5).arrayBuffer());
 if(type==='csv'||type==='docx'){
  let formats;
  try { formats=(await axiosClient.get('/procurement/intake/source-formats')).data?.data?.formats; }
  catch(error) { if(error.response?.status!==404&&error.response?.status!==400)throw error; }
  if(!formats?.includes(type))throw Error('This server supports PDF and XLSX. CSV and DOCX require the procurement source format update.');
 }
 if(type==='csv')return;
 if(type==='pdf'?String.fromCharCode(...bytes)!=='%PDF-':bytes[0]!==80||bytes[1]!==75)throw Error('File content does not match its extension');
}

function csvRows(text) {
 const rows=[];let row=[],value='',quoted=false;
 text=text.replace(/^\uFEFF/,'');
 for(let i=0;i<text.length;i++){
  const ch=text[i];
  if(ch==='"'&&quoted&&text[i+1]==='"'){value+='"';i++;}
  else if(ch==='"'&&(quoted||!value))quoted=!quoted;
  else if(!quoted&&(ch===','||ch==='\n'||ch==='\r')){
   row.push(value);value='';
   if(ch!==','){rows.push(row);row=[];if(ch==='\r'&&text[i+1]==='\n')i++;}
  }else value+=ch;
 }
 if(quoted)throw Error('CSV contains an unterminated quoted cell');
 if(row.length||value)rows.push([...row,value]);
 return rows;
}

export async function readProcurementTable(file,type) {
 let tables;
 const blocks=[];
 if(type==='csv'){
  const text=await file.text();
  if(text.includes('\0'))throw Error('CSV must be readable UTF-8 text');
  tables=[csvRows(text)];
 }else{
  const mammoth=await import('mammoth/mammoth.browser');
  const html=await mammoth.convertToHtml({arrayBuffer:await file.arrayBuffer()});
  const document=new DOMParser().parseFromString(html.value,'text/html');
  const firstTable=document.querySelector('table');
  if(firstTable){
   for(const paragraph of document.querySelectorAll('p')){
    if(!paragraph.closest('table')&&(paragraph.compareDocumentPosition(firstTable)&Node.DOCUMENT_POSITION_FOLLOWING)&&paragraph.textContent.trim())blocks.push({type:'paragraph',text:paragraph.textContent.trim()});
   }
  }
  tables=Array.from(document.querySelectorAll('table'),table=>Array.from(table.rows,row=>Array.from(row.cells,cell=>cell.textContent)));
 }
 for(const [index,rows] of tables.entries()){
  if(rows.length>10000||rows.some(row=>row.length>100))throw Error('Document table exceeds extraction limits');
  const sheetName=type==='csv'?'CSV':'Word table '+(index+1);
  for(const [i,row] of rows.entries()){
   const rowIndex=i+1;
   const cells=row.map((value,c)=>({address:(c>=26?String.fromCharCode(64+Math.floor(c/26)):'')+String.fromCharCode(65+c%26)+rowIndex,displayedValue:value.trim(),empty:!value.trim()}));
   if(cells.some(cell=>!cell.empty))blocks.push({type:'spreadsheet_row',text:cells.map(cell=>cell.displayedValue).join(' | '),location:{sheetName,rowIndex},metadata:{cells}});
  }
 }
 if(!blocks.some(block=>block.type==='spreadsheet_row'))throw Error('No readable product tables were found');
 return {fileType:'xlsx',blocks,metadata:{sheetCount:tables.length},extractionMethod:type,extraWarnings:[]};
}
