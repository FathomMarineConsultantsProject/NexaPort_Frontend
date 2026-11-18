import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listConsultantApplications, reviewConsultantApplication } from "../api/Auth";

export default function AdminConsultantApplications() {
  const [rows,setRows]=useState([]);
  const [error,setError]=useState("");
  const [busy,setBusy]=useState(null);
  const load=()=>listConsultantApplications().then(result=>setRows(result.applications||[])).catch(()=>setError("Unable to load consultant applications."));
  useEffect(()=>{load();},[]);
  const decide=async(row,decision)=>{
    const reason=decision==="rejected"?window.prompt("Reason to show the applicant")?.trim():"";
    if(decision==="rejected"&&!reason)return;
    setBusy(row.user_id);setError("");
    try{await reviewConsultantApplication(row.user_id,decision,reason);await load();}
    catch(e){setError(e.response?.data?.message||"Unable to review this application.");}
    finally{setBusy(null);}
  };
  return <main className="dashboard-container"><h1>Consultant applications</h1><p>Review the applicant’s qualifications and documents before granting consultant access.</p>{error&&<p role="alert">{error}</p>}<table><thead><tr><th>Applicant</th><th>Submitted</th><th>Status</th><th>Review</th></tr></thead><tbody>{rows.map(row=><tr key={row.user_id}><td>{row.full_name}<br/>{row.email}</td><td>{row.submitted_at?new Date(row.submitted_at).toLocaleString():"—"}</td><td>{row.status}</td><td><Link to={`/experts/${row.entity_id}`}>Open profile</Link>{row.status==="pending"&&<><button type="button" disabled={busy===row.user_id} onClick={()=>decide(row,"approved")}>Approve</button><button type="button" disabled={busy===row.user_id} onClick={()=>decide(row,"rejected")}>Request changes</button></>}</td></tr>)}</tbody></table></main>;
}
