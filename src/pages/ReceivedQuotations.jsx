import {useEffect,useState} from 'react';
import {listReceivedQuotations,recordReceivedQuotation} from '../api/procurementIntakeApi';

const errorText=error=>error.response?.data?.message||error.message||'Could not record quotation';
const fileType=file=>/\.pdf$/i.test(file.name)?'application/pdf':/\.xlsx$/i.test(file.name)?'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet':null;

export default function ReceivedQuotations({requisitionId,suppliers,rfqs}){
 const [rows,setRows]=useState(null),[error,setError]=useState(''),[notice,setNotice]=useState(''),[adding,setAdding]=useState(false),[busy,setBusy]=useState(false),[supplierName,setSupplierName]=useState(''),[directoryContactId,setDirectoryContactId]=useState(''),[file,setFile]=useState(null);
 const refresh=()=>listReceivedQuotations(requisitionId).then(setRows);
 useEffect(()=>{let active=true;listReceivedQuotations(requisitionId).then(result=>{if(active)setRows(result)}).catch(err=>{if(active){setRows([]);setError(err.response?.status===404?'Received quotations are unavailable on this backend. Confirm the current backend deployment includes this endpoint.':errorText(err))}});return()=>{active=false}},[requisitionId]);
 
 const save=async event=>{event.preventDefault();if(busy)return;setError('');setNotice('');setBusy(true);try{
  if(!file)throw Error('Select a supplier quotation PDF or XLSX');
  const mimeType=fileType(file);if(!mimeType||file.size<5||file.size>25*1024*1024)throw Error('Select a PDF or XLSX up to 25 MB');
  const prefix=new Uint8Array(await file.slice(0,5).arrayBuffer());if(mimeType==='application/pdf'?String.fromCharCode(...prefix)!=='%PDF-':prefix[0]!==80||prefix[1]!==75)throw Error('The selected file does not match its extension');
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',await file.arrayBuffer())),byte=>byte.toString(16).padStart(2,'0')).join('');
  const matched=rfqs.find(row=>row.supplier_name?.toLowerCase()===supplierName.trim().toLowerCase());
  await recordReceivedQuotation(requisitionId,{supplierName:supplierName.trim(),directoryContactId:directoryContactId||null,rfqId:matched?.rfq_id||null,filename:file.name,mimeType,byteSize:file.size,sha256:hash});
  await refresh();setSupplierName('');setDirectoryContactId('');setFile(null);setAdding(false);setNotice('Response recorded. Keep the original quotation file on your device; NexaPort did not store it.');
 }catch(err){setError(errorText(err))}finally{setBusy(false)}};
 return <section className="intake-section received-quotations"><div className="intake-table-head"><div><h2>Received Quotations</h2><p>Supplier responses for this requisition</p></div><button type="button" onClick={()=>setAdding(value=>!value)}>{adding?'Cancel':'Add Supplier Quotation'}</button></div>
 {error&&<p role="alert" className="intake-error">{error}</p>}{notice&&<p role="status" className="intake-notice">{notice}</p>}
 {adding&&<form className="rfq-response-form" onSubmit={save}><label>Supplier name<input required list="saved-suppliers" maxLength="240" value={supplierName} onChange={event=>{setSupplierName(event.target.value);setDirectoryContactId(suppliers.find(row=>row.supplier_name.toLowerCase()===event.target.value.toLowerCase())?.id||'')}}/><datalist id="saved-suppliers">{suppliers.map(row=><option key={row.id} value={row.supplier_name}/>)}</datalist></label><label>Quotation PDF or Excel<input required type="file" accept=".pdf,.xlsx,application/pdf,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={event=>setFile(event.target.files?.[0]||null)}/></label><p>The selected file is available only until this form closes. Keep the original on your device; NexaPort saves metadata only.</p><button className="intake-primary" disabled={busy}>{busy?'Recording…':'Record response'}</button></form>}
 {rows===null?<p>Loading responses…</p>:rows.length===0?<p>No supplier responses yet</p>:<div className="rfq-response-list">{rows.map(row=><article key={row.id}><strong>{row.supplier_name}</strong><span>Received · {new Date(row.received_at).toLocaleDateString()} · {row.original_filename} · {(row.byte_size/1024).toFixed(0)} KB</span></article>)}</div>}
 
 </section>;
}
