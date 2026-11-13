

const clean=value=>String(value||'').replace(/\s+/g,' ').trim();
const column=(fragments,min,max)=>clean(fragments.filter(f=>f.x>=min&&f.x<max).map(f=>f.value).join(' '));
const warning=(code,message,page=null)=>({code,message,page,resolved:false});

export function extractRequisition(document){
  const blocks=document.blocks||[];
  const full=blocks.map(b=>b.text).join('\n');
  const field=(pattern)=>clean(full.match(pattern)?.[1]||'')||null;
  const details={clientReference:field(/Request For Quote No\.\s*\n?\s*([0-9]+-[0-9]+)/i),documentDate:field(/\b(\d{1,2} [A-Za-z]{3} 20\d{2})\b/),clientCompany:field(/\b(CSL Australia)\b/i),vesselName:field(/Vessel Name\s+([^\n]+)/i),imoNumber:field(/IMO Number\s+(\d{7})/i),flag:field(/Flag State\s+([^\n]+)/i),title:field(/Order Title\s+(.+?)\s+Priority\s+/i),priority:field(/\bPriority\s+(Low|Normal|Urgent)\b/i),deliveryPort:field(/Expected Port of Delivery\s+([^\n]+)/i),requiredDeliveryDate:field(/Date Delivery Required By\s+(\d{1,2} [A-Za-z]{3} 20\d{2})/i),deliveryInstructions:null};
  const warnings=[];
  if(details.documentDate&&details.requiredDeliveryDate&&Date.parse(details.requiredDeliveryDate)<Date.parse(details.documentDate))warnings.push(warning('DELIVERY_BEFORE_DOCUMENT','Required delivery date precedes document date'));
  const items=[];let component=null,current=null,sourceOrder=0,inNotes=false;
  if(document.fileType==='xlsx'){
    let columns=null, sheet=null;
    for(const block of blocks.filter(b=>b.type==='spreadsheet_row')){
      if(sheet!==block.location?.sheetName){sheet=block.location?.sheetName;columns=null;}
      const cells=(block.metadata?.cells||[]).map(c=>clean(c.displayedValue));
      const find=(patterns)=>cells.findIndex(v=>patterns.some(p=>p.test(v)));
      const candidate={number:find([/^(item|line|no\.?|item number|item no\.?)$/i]),description:find([/^(description|product|part name|item description)$/i]),quantity:find([/^(qty|quantity|req)$/i]),uom:find([/^(uom|unit|unit of measure)$/i]),reference:find([/^(maker.?s? reference|part number|impa|impa code)$/i]),notes:find([/^(notes|remarks|specifications)$/i])};
      if(candidate.description>=0&&candidate.quantity>=0){columns=candidate;continue;}
      if(!columns)continue;
      const value=key=>columns[key]>=0?cells[columns[key]]||'':'';
      if(!value('description')&&!value('quantity'))continue;
      sourceOrder++;
      const number=value('number')||null,quantity=value('quantity'),description=value('description'),uom=value('uom');
      const explicit=value('reference').match(/^\s*IMPA\s*:?\s*([0-9 ]{6,8})\s*$/i);
      items.push({id:globalThis.crypto.randomUUID(),clientItemNumber:number,sourceOrder,displayPosition:null,sourcePage:null,sourceRegion:{sheetName:sheet,rowIndex:block.location?.rowIndex,cells:block.metadata?.cells?.map(c=>c.address)},sourceMethod:'spreadsheet',component:null,description,quantity,uom,makerReference:value('reference')||null,drawingPosition:null,notes:value('notes')||null,sourceText:block.text,impaCode:explicit?explicit[1].replace(/\s/g,''):null,reviewStatus:description&&/^\d+(?:\.\d+)?$/.test(quantity)&&uom?'verified':'needs_review'});
    }
  }
  const flush=()=>{if(current){current.description=clean(current.description);current.makerReference=clean(current.makerReference)||null;current.drawingPosition=clean(current.drawingPosition)||null;current.notes=clean(current.notes)||null;current.sourceText=clean(current.sourceText);const explicit=current.makerReference?.match(/\bIMPA(?: Code)?\s*:\s*([0-9 ]{6,8})/i);current.impaCode=explicit?explicit[1].replace(/\s/g,''):null;current.reviewStatus=current.sourceMethod==='ocr'?'needs_review':'verified';items.push(current);current=null;}inNotes=false;};
  for(const block of document.fileType==='pdf'?blocks:[]){
    const t=clean(block.text),page=block.location?.pageNumber||null;
    const heading=t.match(/^For Component\s+(.+)$/i);
    if(heading){flush();component=heading[1];continue;}
    if(/^Order Line Notes\b/i.test(t)){inNotes=true;if(current){const sameLine=t.replace(/^Order Line Notes\b/i,'').trim();if(sameLine){current.notes+=` ${sameLine}`;current.sourceText+=` ${sameLine}`;}}continue;}
    if(/^(Item Qty UOM|Maker Type|Designer Serial No\.|Page \d+ of|Request For Quotation issued|Shipsure Version|Sub Total|Freight Cost|Packaging Cost|Grand Total)/i.test(t))continue;
    if(block.metadata?.extraction==='ocr'){
      const match=t.match(/^(\d{1,4})\s+(\d+(?:\.\d{1,3})?)\s+([A-Za-z/]{1,12})\s+(.{4,})$/);
      if(match){flush();sourceOrder++;items.push({id:globalThis.crypto.randomUUID(),clientItemNumber:match[1],sourceOrder,displayPosition:null,sourcePage:page,sourceRegion:{},sourceMethod:'ocr',component,description:match[4],quantity:match[2],uom:match[3],makerReference:null,drawingPosition:null,notes:null,sourceText:t,impaCode:null,reviewStatus:'needs_review'});}
      continue;
    }
    const f=block.metadata?.fragments||[];
    const number=column(f,35,69),quantity=column(f,69,89),uom=column(f,89,118),description=column(f,118,245),reference=column(f,245,330),position=column(f,330,420);
    const isRow=/^\d{1,5}$/.test(number)&&/^\d+(?:\.\d+)?$/.test(quantity)&&uom&&description&&f.some(part=>part.x>430&&/^0[.,]0/.test(part.value));
    if(isRow){flush();sourceOrder++;current={id:globalThis.crypto.randomUUID(),clientItemNumber:number,sourceOrder,displayPosition:null,sourcePage:page,sourceRegion:{x:block.metadata.x,y:block.metadata.y},sourceMethod:block.metadata?.extraction||'text',component,description,quantity,uom,makerReference:reference,drawingPosition:position,notes:'',sourceText:t};continue;}
    if(!current)continue;
    if(page!==current.sourcePage && !inNotes)continue;
    if(inNotes){if(/^(For Component|Terms and Conditions)/i.test(t)){inNotes=false;continue;}current.notes+=` ${t}`;current.sourceText+=` ${t}`;continue;}
    if(f.length&&block.metadata?.y<current.sourceRegion.y&&current.sourceRegion.y-block.metadata.y<=18){const d=column(f,118,245),r=column(f,245,330),p=column(f,330,420);if(d||r||p){current.description+=` ${d}`;current.makerReference+=` ${r}`;current.drawingPosition+=` ${p}`;current.sourceText+=` ${t}`;}}
  }
  flush();
  if(!items.length)warnings.push(warning('NO_ITEMS_EXTRACTED','No requested items could be identified; review the source document and extraction layout'));
  if(items.some(i=>i.reviewStatus==='needs_review'))warnings.push(warning('ITEMS_NEED_REVIEW','Some source items have missing or uncertain values'));
  const counts=new Map();for(const item of items)counts.set(item.clientItemNumber,(counts.get(item.clientItemNumber)||0)+1);
  for(const [number,count] of counts)if(count>1)warnings.push(warning('REPEATED_ITEM_NUMBER',`Client item ${number} appears ${count} times`));
  const numeric=items.map(i=>Number(i.clientItemNumber)).filter(Number.isInteger);
  if(numeric.length){for(let n=1;n<=Math.max(...numeric);n++)if(!counts.has(String(n)))warnings.push(warning('MISSING_ITEM_NUMBER',`Client item ${n} was not found`));}
  items.sort((a,b)=>Number(a.clientItemNumber)-Number(b.clientItemNumber)||a.sourceOrder-b.sourceOrder).forEach((item,index)=>item.displayPosition=index+1);
  return {details,items,warnings,pageCount:document.metadata?.pageCount||document.metadata?.sheetCount||0,extractionMethod:document.extractionMethod};
}


