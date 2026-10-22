import { useEffect,useState } from "react";
import { Link,useSearchParams } from "react-router-dom";
import { getProfileClaims } from "../api/adminProfileClaimsApi";
import "./AdminProfileClaims.css";

const statuses=["pending","approved","rejected","disputed","all"];
const types=["all","companies","professionals"];
export default function AdminProfileClaims(){
  const [params,setParams]=useSearchParams();
  const type=types.includes(params.get("type"))?params.get("type"):"all";
  const status=statuses.includes(params.get("status"))?params.get("status"):"pending";
  const q=params.get("q")||"";
  const page=Math.max(1,Number.parseInt(params.get("page"),10)||1);
  const [term,setTerm]=useState(q),[data,setData]=useState(null),[loading,setLoading]=useState(true),[error,setError]=useState("");
  useEffect(()=>{const timer=setTimeout(()=>setTerm(q),0);return()=>clearTimeout(timer);},[q]);
  useEffect(()=>{let active=true;getProfileClaims({type:type==="companies"?"company":type==="professionals"?"professional":"all",status,q,page})
    .then(result=>{if(active){setData(result);setError("");}}).catch(err=>{if(active)setError(err.response?.data?.message||"Unable to load profile claims.");})
    .finally(()=>{if(active)setLoading(false);});return()=>{active=false;};},[type,status,q,page]);
  const set=(key,value)=>{const next=new URLSearchParams(params);if(value)next.set(key,value);else next.delete(key);if(key!=="page")next.delete("page");setLoading(true);setParams(next);};
  const returnTo=`/admin/profile-claims${params.toString()?`?${params.toString()}`:""}`;
  const empty=`No ${status==="all"?"":`${status} `}${type==="all"?"profile":type==="companies"?"company":"professional"} claims${q?" match this search":""}.`;
  return <main className="profile-claims"><header className="profile-claims__header"><div><small>Super Admin</small><h1>Profile Claims</h1><p>Review requests for exact company and professional directory identities.</p></div></header>
    <nav className="profile-claims__tabs" aria-label="Claim type">{types.map(value=><button key={value} type="button" aria-pressed={type===value} onClick={()=>set("type",value==="all"?"":value)}>{value==="all"?"All Claims":value==="companies"?"Companies":"Professionals"}</button>)}</nav>
    <div className="profile-claims__toolbar"><label>Search<input value={term} onChange={event=>setTerm(event.target.value)} onKeyDown={event=>{if(event.key==="Enter")set("q",term.trim());}} placeholder="Profile, claimant or reference" /></label><button type="button" onClick={()=>set("q",term.trim())}>Search</button><label>Status<select value={status} onChange={event=>set("status",event.target.value==="pending"?"":event.target.value)}>{statuses.map(value=><option key={value} value={value}>{value[0].toUpperCase()+value.slice(1)}</option>)}</select></label></div>
    {data?.summary && <><dl className="profile-claims__summary">{["pending","approved","rejected","disputed"].map(value=><div key={value}><dt>{value[0].toUpperCase()+value.slice(1)}</dt><dd>{data.summary[value]}</dd></div>)}</dl>{data.summary.missing_company_ids>0 && <p role="alert" className="profile-claims__error">{data.summary.missing_company_ids} company records need a NexaPort ID backfill.</p>}</>}
    {error && <div role="alert" className="profile-claims__error">{error}</div>}
    {loading?<p role="status">Loading claims…</p>:!error&&<div className="profile-claims__table-wrap"><table><thead><tr><th>Submitted</th><th>Type</th><th>Directory identity</th><th>NexaPort reference</th><th>Claimant</th><th>Status</th><th>Evidence</th><th>Action</th></tr></thead><tbody>{data?.data?.map(row=><tr key={`${row.claim_type}:${row.id}`}><td>{new Date(row.created_at).toLocaleDateString()}</td><td>{row.claim_type==="company"?"Company":"Professional"}</td><td><strong>{row.target_name||"Source unavailable"}</strong></td><td>{row.reference||"ID pending"}</td><td>{row.claimant_name}</td><td>{row.status}</td><td>{row.has_evidence?"Attached":"—"}</td><td><Link to={`/admin/${row.claim_type==="company"?"company":"professional"}-claims/${row.id}?returnTo=${encodeURIComponent(returnTo)}`}>Review</Link></td></tr>)}</tbody></table>{!data?.data?.length&&<p className="profile-claims__empty">{empty}</p>}</div>}
    {data && data.pages>1 && <nav className="profile-claims__pages" aria-label="Claim pages"><button type="button" disabled={page<=1} onClick={()=>set("page",String(page-1))}>Previous</button><span>Page {page} of {data.pages}</span><button type="button" disabled={page>=data.pages} onClick={()=>set("page",String(page+1))}>Next</button></nav>}
  </main>;
}
