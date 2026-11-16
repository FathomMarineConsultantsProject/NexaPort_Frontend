const clean=v=>String(v??'').normalize('NFKC').replace(/\s+/g,' ').trim();
export function pdfLines(items,pageNumber){
 const rows=[];
 for(const item of items){const value=clean(item.str);if(!value)continue;const x=Number(item.transform?.[4])||0,y=Number(item.transform?.[5])||0;let row=rows.find(r=>Math.abs(r.y-y)<=3);if(!row){row={y,items:[]};rows.push(row)}row.items.push({value,x,width:Number(item.width)||0,height:Number(item.height)||0,fontName:item.fontName||''})}
 return rows.sort((a,b)=>b.y-a.y).map(row=>{const fragments=row.items.sort((a,b)=>a.x-b.x);return {type:'text_line',text:fragments.map(f=>f.value).join(' '),metadata:{x:fragments[0]?.x||0,y:row.y,fragments,extraction:'text'},location:{pageNumber}}});
}
