import { ArrowDown, ArrowUp, Download, FilePlus2, ImagePlus, Plus, Save, Trash2, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  createDailyReport, finalizeDailyReport, generateDailyReportPdf, getDailyReport, getDailyReports,
  removeDailyReportPhoto, saveDailyReport, uploadDailyReportPhoto,
} from "../../api/inspectionWorkflowApi";

const empty = "Not provided";
const toIsoDate = (value) => {
  if (!value) return "";
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) return "";
    const y = value.getFullYear();
    const m = String(value.getMonth() + 1).padStart(2, "0");
    const d = String(value.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  const str = String(value).trim();
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (match) return `${match[1]}-${match[2]}-${match[3]}`;
  const parsed = new Date(str);
  if (!Number.isNaN(parsed.getTime())) {
    const y = parsed.getUTCFullYear();
    const m = String(parsed.getUTCMonth() + 1).padStart(2, "0");
    const d = String(parsed.getUTCDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }
  return "";
};
const dateLabel = (value) => {
  const iso = toIsoDate(value);
  if (!iso) return empty;
  const [y, m, d] = iso.split("-").map(Number);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${String(d).padStart(2,"0")} ${months[m-1]} ${y}`;
};
const stamp = (value) => value ? new Date(value).toLocaleString("en-GB",{dateStyle:"medium",timeStyle:"short"}) : empty;
const nextDate = (value) => {
  const iso = toIsoDate(value);
  if (!iso) return today();
  const [y, m, d] = iso.split("-").map(Number);
  const date = new Date(Date.UTC(y, m - 1, d + 1));
  return date.toISOString().slice(0, 10);
};
const today = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const formFrom = (report) => ({
  reportDate: toIsoDate(report?.reportDate),
  locationDetail: report?.data?.locationDetail || "",
  inspectionScope: report?.data?.inspectionScope || "",
  boardingTime: report?.data?.boardingTime || "",
  boardingDate: toIsoDate(report?.data?.boardingDate || report?.reportDate),
  boardingLocation: report?.data?.boardingLocation || "",
  activities: Array.isArray(report?.data?.activities) ? report.data.activities : [],
  closingStatement: report?.data?.closingStatement || "",
});

function DocumentPreview({report}){
  const p=report.prefills||{},d=report.data||{},activities=d.activities?.filter((item)=>item.description.trim())||[];
  const boarded=[d.boardingTime&&`${d.boardingTime} hrs LT`,d.boardingDate&&dateLabel(d.boardingDate),d.boardingLocation].filter(Boolean).join(" | ");
  return <div className="daily-document" aria-label={`Daily Report Day ${report.dayNumber} preview`}>
    <header className="daily-document-head"><img src="/report-assets/nexport-masthead.png" alt="NEXPORT PTE LTD"/><div><strong>DAILY INSPECTION REPORT</strong><b>DAY {report.dayNumber}</b><span>{dateLabel(report.reportDate)}</span></div></header>
    <section><h4>Vessel and attendance particulars</h4><div className="daily-document-vessel"><strong>{p.vessel?.name||empty}</strong><span>IMO {p.vessel?.imoNumber||empty}</span></div><dl className="daily-document-meta"><div><dt>Inspection reference</dt><dd>{p.request?.reference||empty}</dd></div><div><dt>Report date / sequence</dt><dd>{dateLabel(report.reportDate)} / Day {report.dayNumber}</dd></div><div><dt>Vessel location</dt><dd>{d.locationDetail||empty}</dd></div><div><dt>Inspector</dt><dd>{p.surveyor?.name||empty}</dd></div><div><dt>Scope of inspection</dt><dd>{d.inspectionScope||empty}</dd></div><div><dt>Boarded vessel</dt><dd>{boarded||empty}</dd></div></dl></section>
    <section><h4>Checks, tests and inspection carried out on {dateLabel(report.reportDate)}</h4><table><thead><tr><th>No.</th><th>Activity / inspection record</th></tr></thead><tbody>{activities.length?activities.map((item,index)=><tr key={item.id||index}><td>{String(index+1).padStart(2,"0")}</td><td>{item.description}</td></tr>):<tr><td>01</td><td>{empty}</td></tr>}</tbody></table></section>
    <section><h4>Inspector&apos;s remarks</h4><p>{d.closingStatement||empty}</p></section>
    {report.photos?.length>0&&<section><h4>Photographic record</h4><div className="daily-document-photos">{report.photos.map((photo,index)=><figure key={photo.id}><img src={photo.previewUrl} alt={photo.caption||`Daily Report photo ${index+1}`}/><figcaption><b>Photo {index+1}</b>{[photo.inspectionArea,photo.caption].filter(Boolean).join(" - ")||empty}</figcaption></figure>)}</div></section>}
    <footer><span>NEXPORT PTE LTD | Daily inspection record</span><span>Prepared by {report.preparedBy?.name||empty} | {report.status}</span></footer>
  </div>;
}

function DailyReportEditor({requestId,report,onClose,onChanged}){
  const [form,setForm]=useState(()=>formFrom(report)),[mode,setMode]=useState(report.locked?"preview":"edit"),[busy,setBusy]=useState(false),[error,setError]=useState(""),[current,setCurrent]=useState(report);
  const [photo,setPhoto]=useState(null),[caption,setCaption]=useState(""),[area,setArea]=useState("");const fileRef=useRef(null);
  const mutate=async(action)=>{setBusy(true);setError("");try{const response=await action();setCurrent(response.data);setForm(formFrom(response.data));await onChanged(response.data);return response.data;}catch(e){const fields=e.response?.data?.fieldErrors?.map((item)=>item.message).filter(Boolean).join(" ");setError([e.response?.data?.message||e.message,fields].filter(Boolean).join(" "));return null;}finally{setBusy(false);}};
  const data=()=>({locationDetail:form.locationDetail,inspectionScope:form.inspectionScope,boardingTime:form.boardingTime,boardingDate:form.boardingDate,boardingLocation:form.boardingLocation,activities:form.activities,closingStatement:form.closingStatement});
  const activity=(index,value)=>setForm((valueNow)=>({...valueNow,activities:valueNow.activities.map((item,i)=>i===index?{...item,description:value}:item)}));
  const move=(index,offset)=>setForm((valueNow)=>{const rows=[...valueNow.activities],target=index+offset;if(target<0||target>=rows.length)return valueNow;[rows[index],rows[target]]=[rows[target],rows[index]];return{...valueNow,activities:rows};});
  const save=()=>mutate(()=>saveDailyReport(requestId,current.id,{reportDate:form.reportDate,data:data()}));
  const generate=async()=>{const result=await mutate(async()=>{if(!current.locked)await saveDailyReport(requestId,current.id,{reportDate:form.reportDate,data:data()});return generateDailyReportPdf(requestId,current.id);});if(result)setMode("preview");};
  const finalize=async()=>{const result=await mutate(async()=>{await saveDailyReport(requestId,current.id,{reportDate:form.reportDate,data:data()});return finalizeDailyReport(requestId,current.id);});if(result)setMode("preview");};
  const addPhoto=async()=>{if(!photo)return;await mutate(()=>uploadDailyReportPhoto(requestId,current.id,{file:photo,caption,inspectionArea:area}));setPhoto(null);setCaption("");setArea("");if(fileRef.current)fileRef.current.value="";};
  return <section className="daily-report-detail"><header><div><span>Inspection record / Day {current.dayNumber}</span><h3>Daily Inspection Report</h3><p>{dateLabel(current.reportDate)} · {current.status} · Prepared by {current.preparedBy?.name||empty}</p></div><div className="daily-detail-actions">{!current.locked&&<><button className={mode==="edit"?"active":""} onClick={()=>setMode("edit")}>Editor</button><button className={mode==="preview"?"active":""} onClick={()=>setMode("preview")}>Preview</button></>}<button aria-label="Close Daily Report" onClick={onClose}><X size={16}/></button></div></header>
    {error&&<div className="workflow-alert error" role="alert">{error}</div>}
    {mode==="preview"?<><DocumentPreview report={current}/><footer className="daily-report-actionbar"><span>{current.locked?`Finalized ${stamp(current.finalizedAt)}`:"Preview reflects the latest loaded draft"}</span><div>{current.downloadUrl&&<a className="workflow-secondary" href={current.downloadUrl} target="_blank" rel="noreferrer"><Download size={14}/> Download PDF</a>}{!current.locked&&<button className="workflow-secondary" disabled={busy} onClick={generate}>Generate PDF</button>}{!current.locked&&<button className="workflow-primary" disabled={busy} onClick={finalize}>Finalize Report</button>}</div></footer></>:<div className="daily-editor">
      <section><h4>Report particulars</h4><div className="daily-form-grid"><label><span>Reporting day</span><input value={`Day ${current.dayNumber}`} readOnly/></label><label><span>Report date *</span><input type="date" value={form.reportDate} onChange={(e)=>setForm({...form,reportDate:e.target.value})}/></label><label className="wide"><span>Vessel location *</span><input maxLength="500" value={form.locationDetail} onChange={(e)=>setForm({...form,locationDetail:e.target.value})}/></label><label className="wide"><span>Scope of inspection *</span><textarea maxLength="1000" rows="3" value={form.inspectionScope} onChange={(e)=>setForm({...form,inspectionScope:e.target.value})}/></label></div></section>
      <section><h4>Attendance</h4><div className="daily-form-grid"><label><span>Boarded time (LT) *</span><input type="time" value={form.boardingTime} onChange={(e)=>setForm({...form,boardingTime:e.target.value})}/></label><label><span>Boarding date *</span><input type="date" value={form.boardingDate} onChange={(e)=>setForm({...form,boardingDate:e.target.value})}/></label><label className="wide"><span>Boarding location *</span><input value={form.boardingLocation} onChange={(e)=>setForm({...form,boardingLocation:e.target.value})}/></label></div></section>
      <section><div className="daily-section-head"><div><h4>Checks, tests and inspection carried out</h4><p>Keep one discrete inspection activity per ledger row.</p></div><button className="workflow-secondary" onClick={()=>setForm({...form,activities:[...form.activities,{id:crypto.randomUUID(),description:""}]})}><Plus size={14}/> Add row</button></div><div className="daily-activity-ledger"><div className="daily-activity-head"><span>No.</span><span>Activity / inspection record</span><span>Order</span></div>{form.activities.map((item,index)=><div className="daily-activity-row" key={item.id||index}><span>{String(index+1).padStart(2,"0")}</span><textarea rows="2" value={item.description} onChange={(e)=>activity(index,e.target.value)} aria-label={`Activity ${index+1}`}/><div><button aria-label="Move activity up" disabled={index===0} onClick={()=>move(index,-1)}><ArrowUp size={13}/></button><button aria-label="Move activity down" disabled={index===form.activities.length-1} onClick={()=>move(index,1)}><ArrowDown size={13}/></button><button aria-label="Remove activity" onClick={()=>setForm({...form,activities:form.activities.filter((_,i)=>i!==index)})}><Trash2 size={13}/></button></div></div>)}{!form.activities.length&&<p className="daily-empty-row">No activities entered.</p>}</div></section>
      <section><h4>Inspector&apos;s remarks</h4><textarea className="daily-remarks" maxLength="2500" rows="5" value={form.closingStatement} onChange={(e)=>setForm({...form,closingStatement:e.target.value})}/></section>
      <section><div className="daily-section-head"><div><h4>Photographic record</h4><p>Private evidence shown in report order. JPEG, PNG or WebP, up to 8 MB.</p></div></div>{current.photos?.length>0&&<div className="daily-photo-list">{current.photos.map((item,index)=><article key={item.id}><img src={item.previewUrl} alt={item.caption||`Photo ${index+1}`}/><div><strong>Photo {index+1}</strong><span>{item.inspectionArea||empty}</span><p>{item.caption||empty}</p></div><button aria-label={`Remove photo ${index+1}`} disabled={busy} onClick={()=>mutate(()=>removeDailyReportPhoto(requestId,current.id,item.id))}><Trash2 size={14}/></button></article>)}</div>}<div className="daily-photo-upload"><label><span>Photograph</span><input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" onChange={(e)=>setPhoto(e.target.files?.[0]||null)}/></label><label><span>Inspection area</span><input maxLength="120" value={area} onChange={(e)=>setArea(e.target.value)}/></label><label><span>Caption</span><input maxLength="240" value={caption} onChange={(e)=>setCaption(e.target.value)}/></label><button className="workflow-secondary" disabled={!photo||busy} onClick={addPhoto}><ImagePlus size={14}/> Attach</button></div></section>
      <footer className="daily-report-actionbar"><span>Draft changes persist only after Save Draft.</span><div><button className="workflow-secondary" disabled={busy} onClick={save}><Save size={14}/> Save Draft</button><button className="workflow-secondary" disabled={busy} onClick={generate}>Generate PDF</button><button className="workflow-primary" disabled={busy} onClick={finalize}>Finalize Report</button></div></footer>
    </div>}
  </section>;
}

export default function DailyReportsPanel({requestId}){
  const [register,setRegister]=useState(null),[selected,setSelected]=useState(null),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState(""),[creating,setCreating]=useState(false),[reportDate,setReportDate]=useState(today());
  const load=useCallback(async()=>{setLoading(true);setError("");try{const response=await getDailyReports(requestId);setRegister(response.data);const rows=response.data.reports;if(rows.length)setReportDate(nextDate(rows.at(-1).reportDate));else if(response.data.prefills?.request?.requiredBy)setReportDate(toIsoDate(response.data.prefills.request.requiredBy)||today());}catch(e){setError(e.response?.data?.message||"Unable to load Daily Reports.");}finally{setLoading(false);}},[requestId]);
  useEffect(()=>{const timer=window.setTimeout(load,0);return()=>window.clearTimeout(timer);},[load]);
  const open=async(id)=>{setBusy(true);setError("");try{const response=await getDailyReport(requestId,id);setSelected(response.data);}catch(e){setError(e.response?.data?.message||"Unable to open the Daily Report.");}finally{setBusy(false);}};
  const create=async()=>{setBusy(true);setError("");try{const response=await createDailyReport(requestId,{reportDate});setSelected(response.data);setCreating(false);await load();}catch(e){setError(e.response?.data?.message||"Unable to create the Daily Report.");}finally{setBusy(false);}};
  const changed=async(updated)=>{setSelected(updated);const response=await getDailyReports(requestId);setRegister(response.data);};
  const counts=useMemo(()=>({draft:register?.reports.filter((item)=>item.status==="DRAFT").length||0,final:register?.reports.filter((item)=>item.status==="FINAL").length||0}),[register]);
  return <section className="daily-reports-panel"><header className="daily-register-head"><div><span>Inspection records</span><h2>Daily Reports</h2><p>Repeatable operational records for each day of inspection attendance.</p></div><div className="daily-register-summary"><span>{register?.reports.length||0} reports</span><span>{counts.draft} draft</span><span>{counts.final} final</span><button className="workflow-primary" disabled={busy} onClick={()=>setCreating((value)=>!value)}><FilePlus2 size={15}/> Create Daily Report</button></div></header>
    {error&&<div className="workflow-alert error" role="alert">{error}</div>}
    {creating&&<div className="daily-create-row"><label><span>Report date</span><input type="date" value={reportDate} onChange={(e)=>setReportDate(e.target.value)}/></label><div><button className="workflow-secondary" onClick={()=>setCreating(false)}>Cancel</button><button className="workflow-primary" disabled={!reportDate||busy} onClick={create}><Plus size={14}/> Create next day</button></div></div>}
    <div className="daily-register-table"><table><thead><tr><th>Day</th><th>Report Date</th><th>Status</th><th>Prepared By</th><th>Last Updated</th><th>Action</th></tr></thead><tbody>{register?.reports.map((item)=><tr key={item.id}><td data-label="Day"><strong>Day {item.dayNumber}</strong></td><td data-label="Report Date">{dateLabel(item.reportDate)}</td><td data-label="Status"><span className={`daily-status ${item.status.toLowerCase()}`}>{item.status}</span></td><td data-label="Prepared By">{item.preparedBy?.name||empty}</td><td data-label="Last Updated">{stamp(item.updatedAt)}</td><td data-label="Action"><button className="row-action" disabled={busy} onClick={()=>open(item.id)}>{item.locked?"View":"Continue"}</button></td></tr>)}</tbody></table>{loading&&<div className="workflow-loading">Loading Daily Reports...</div>}{!loading&&!register?.reports.length&&<div className="daily-register-empty"><FilePlus2 size={18}/><span>No Daily Reports created for this inspection.</span></div>}</div>
    {selected&&<DailyReportEditor key={selected.id} requestId={requestId} report={selected} onClose={()=>setSelected(null)} onChanged={changed}/>} 
  </section>;
}
