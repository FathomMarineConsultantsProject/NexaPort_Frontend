import JSZip from 'jszip';
import {DOMParser} from '@xmldom/xmldom';
const clean=v=>String(v??'').normalize('NFKC').replace(/\s+/g,' ').trim();
const xml=s=>new DOMParser().parseFromString(s,'application/xml');
const nodes=(root,tag)=>Array.from(root.getElementsByTagNameNS('*',tag));
const first=(root,tag)=>nodes(root,tag)[0];
const attr=(node,name)=>node?.getAttribute(name)||'';
const colNumber=ref=>{let n=0;for(const c of (ref.match(/^[A-Z]+/i)?.[0]||''))n=n*26+c.toUpperCase().charCodeAt(0)-64;return n};
export async function xlsxDocument(bytes,post=()=>{}){
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

