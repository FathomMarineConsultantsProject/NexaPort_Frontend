import {useEffect,useState} from 'react';
import {attachmentDownload,listAttachments,removeAttachment,setRfqAttachment,uploadAttachment} from '../api/procurementIntakeApi';

const errorText=e=>e.response?.data?.message||e.message||'Attachment action failed';
const requests=new Map();
const sharedList=id=>{if(!requests.has(id))requests.set(id,listAttachments(id).catch(error=>{requests.delete(id);throw error}));return requests.get(id)};
export default function ProcurementAttachments({requisitionId,targetKind='requisition',targetId=null,title='Attach files',allowRfq=false,refreshKey=0}){
 const [rows,setRows]=useState([]),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const load=()=>{requests.delete(requisitionId);window.dispatchEvent(new CustomEvent('procurement-attachments-changed',{detail:requisitionId}))};
 useEffect(()=>{let live=true;const refresh=()=>sharedList(requisitionId).then(value=>{if(live)setRows(value)}).catch(e=>{if(live)setError(errorText(e))});const changed=event=>{if(event.detail===requisitionId)refresh()};window.addEventListener('procurement-attachments-changed',changed);refresh();return()=>{live=false;window.removeEventListener('procurement-attachments-changed',changed)}},[requisitionId,refreshKey]);
 const matching=rows.filter(row=>row.target_kind===targetKind&&(targetKind==='requisition'||row[`${targetKind==='requisition_item'?'requisition_item':targetKind==='supplier_quotation'?'supplier_quotation':'supplier_offer_line'}_id`]===targetId));
 const upload=async event=>{const files=[...event.target.files||[]];if(!files.length)return;setBusy(true);setError('');try{for(const file of files)await uploadAttachment(requisitionId,file,targetKind,targetId,false);await load()}catch(e){setError(errorText(e))}finally{setBusy(false);event.target.value=''}};
 const action=async fn=>{setBusy(true);setError('');try{await fn();await load()}catch(e){setError(errorText(e))}finally{setBusy(false)}};
 return <div className="procurement-attachments"><strong>{title} ({matching.length})</strong> <label className="intake-attachment-upload">Attach files<input type="file" multiple accept=".pdf,.png,.jpg,.jpeg,.docx,.xlsx,.dwg,.dxf" disabled={busy} onChange={upload}/></label>{error&&<p role="alert" className="intake-error">{error}</p>}{matching.length>0&&<ul>{matching.map(row=><li key={row.id}><span>{row.filename} · {row.content_type.split('/').at(-1)} · {(row.byte_size/1024).toFixed(0)} KB</span> <button type="button" onClick={()=>action(async()=>{const result=await attachmentDownload(requisitionId,row.id);window.open(result.url,'_blank','noopener,noreferrer')})}>Preview / download</button>{allowRfq&&<label><input type="checkbox" checked={row.include_supplier_rfq} disabled={busy} onChange={e=>action(()=>setRfqAttachment(requisitionId,row.id,e.target.checked))}/> Include in supplier RFQ</label>}<button type="button" disabled={busy} onClick={()=>action(()=>removeAttachment(requisitionId,row.id))}>Remove</button></li>)}</ul>}</div>;
}
