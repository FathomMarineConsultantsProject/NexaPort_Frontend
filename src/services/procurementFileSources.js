export const procurementFileTypes = {
 pdf:'application/pdf',xlsx:'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
 csv:'text/csv',docx:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
 doc:'application/msword',dot:'application/msword',docm:'application/vnd.ms-word.document.macroEnabled.12',dotx:'application/vnd.openxmlformats-officedocument.wordprocessingml.template',dotm:'application/vnd.ms-word.template.macroEnabled.12',
 xls:'application/vnd.ms-excel',xlt:'application/vnd.ms-excel',xlsm:'application/vnd.ms-excel.sheet.macroEnabled.12',xlsb:'application/vnd.ms-excel.sheet.binary.macroEnabled.12',xltx:'application/vnd.openxmlformats-officedocument.spreadsheetml.template',xltm:'application/vnd.ms-excel.template.macroEnabled.12',
 odt:'application/vnd.oasis.opendocument.text',ods:'application/vnd.oasis.opendocument.spreadsheet',rtf:'application/rtf',txt:'text/plain',tsv:'text/tab-separated-values',jpg:'image/jpeg',jpeg:'image/jpeg',png:'image/png',tif:'image/tiff',tiff:'image/tiff',
};
export const procurementFileType = file => /\.([a-z0-9]+)$/i.exec(file.name)?.[1].toLowerCase();
export const procurementAccept=Object.keys(procurementFileTypes).map(type=>`.${type}`).join(',');
export async function checkProcurementFile(file,type) {
 if(!procurementFileTypes[type])throw Error('This document format is not supported');
 const bytes=new Uint8Array(await file.slice(0,16).arrayBuffer());
 const prefix=Array.from(bytes.slice(0,8),b=>b.toString(16).padStart(2,'0')).join('');
 const zip=new Set(['xlsx','xlsm','xlsb','xltx','xltm','docx','docm','dotx','dotm','odt','ods']);
 const ole=new Set(['xls','xlt','doc','dot']);
 const image=new Set(['jpg','jpeg','png','tif','tiff']);
 if(type==='pdf'&&String.fromCharCode(...bytes.slice(0,5))!=='%PDF-'||zip.has(type)&&prefix.slice(0,4)!=='504b'||ole.has(type)&&prefix!=='d0cf11e0a1b11ae1'||type==='rtf'&&String.fromCharCode(...bytes.slice(0,5))!=='{\\rtf'||image.has(type)&&!(type==='png'&&prefix==='89504e470d0a1a0a'||['jpg','jpeg'].includes(type)&&prefix.startsWith('ffd8ff')||['tif','tiff'].includes(type)&&['49492a00','4d4d002a'].includes(prefix.slice(0,8))))throw Error('File content does not match its extension');
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
