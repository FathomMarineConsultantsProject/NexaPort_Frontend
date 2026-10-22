import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { decideProfessionalClaim,getAdminProfessionalClaim,getAdminProfessionalClaims,getProfessionalEvidence,revokeProfessionalLink } from "../api/professionalClaimsApi";
import CopyClaimLink from "../components/directories/CopyClaimLink";
import "./CompanyClaim.css";

export default function AdminProfessionalClaims() {
  const {id}=useParams();
  const [query]=useSearchParams();
  const requested=query.get("returnTo") || "";
  const back=/^\/admin\/profile-claims(?:\?[^#]*)?$/.test(requested) ? requested : "/admin/profile-claims?type=professionals";
  const [status,setStatus]=useState("pending"),[rows,setRows]=useState([]),[detail,setDetail]=useState(null),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[error,setError]=useState("");
  const [notes,setNotes]=useState(""),[publicReason,setPublicReason]=useState("");
  const load=useCallback(async()=>{setLoading(true);setError("");try{if(id)setDetail(await getAdminProfessionalClaim(id));else setRows(await getAdminProfessionalClaims({status}));}
    catch(err){setError(err.response?.data?.message || "Unable to load professional claims.");}finally{setLoading(false);}},[id,status]);
  useEffect(()=>{const timer=setTimeout(load,0);return()=>clearTimeout(timer);},[load]);
  const decide=async action=>{setSaving(true);setError("");try{await decideProfessionalClaim(id,action,notes,publicReason);await load();}catch(err){setError(err.response?.data?.message || "Decision failed.");}finally{setSaving(false);}};
  const evidence=async()=>{try{const result=await getProfessionalEvidence(id);window.open(result.url,"_blank","noopener,noreferrer");}catch(err){setError(err.response?.data?.message || "Evidence unavailable.");}};
  const revoke=async userId=>{setSaving(true);setError("");try{await revokeProfessionalLink(detail.source_type,detail.source_id,userId,notes);await load();}catch(err){setError(err.response?.data?.message || "Revocation failed.");}finally{setSaving(false);}};
  return <main className="claim-page"><div className="claim-panel claim-panel--admin">
    {id ? <><Link className="claim-back" to={back}>← Professional claims</Link><header><small>Super Admin · Professional claim</small><h1>{detail?.profile?.name || "Claim review"}</h1><p>{detail?.profile?.public_id} · {detail?.source_type} · {detail?.status}</p></header>
      {!loading && detail && <><CopyClaimLink path={`/professionals/${detail.source_type}/${detail.source_id}/claim`} /><dl className="claim-admin-facts"><div><dt>Account</dt><dd>{detail.applicant_name} · {detail.account_email}</dd></div><div><dt>Business email</dt><dd>{detail.business_email}</dd></div><div><dt>Identity explanation</dt><dd>{detail.relationship_description}</dd></div><div><dt>Professional reference</dt><dd>{detail.professional_reference || "Not supplied"}</dd></div><div><dt>Current controller</dt><dd>{detail.members?.filter(m=>m.status==="approved").map(m=>`${m.full_name} · approved ${new Date(m.approved_at).toLocaleDateString()}`).join("; ") || "None"}</dd></div><div><dt>Prior and competing claims</dt><dd>{detail.history?.length || 0}</dd></div></dl>
<section className="claim-admin-history"><h2>Claim history</h2><table><thead><tr><th>Submitted</th><th>Status</th><th>Reviewed</th></tr></thead><tbody>{detail.history?.map(row=><tr key={row.id}><td>{new Date(row.created_at).toLocaleDateString()}</td><td>{row.status}</td><td>{row.reviewed_at ? new Date(row.reviewed_at).toLocaleDateString() : "—"}</td></tr>)}</tbody></table></section>
                <Link to={`/professionals/${detail.source_type}/${detail.source_id}/claim`}>View exact source profile</Link>{detail.has_evidence && <button type="button" onClick={evidence}>Open private evidence</button>}
        {detail.members?.some(member=>member.status==="approved") && <section className="claim-review"><h2>Active controller</h2><label>Revocation reason<textarea value={notes} onChange={e=>setNotes(e.target.value)} minLength={10} maxLength={3000} /></label>{detail.members.filter(member=>member.status==="approved").map(member=><p key={member.user_id}>{member.full_name} · {member.email} <button type="button" disabled={saving || notes.trim().length<10} onClick={()=>revoke(member.user_id)}>Revoke access</button></p>)}</section>}
        {detail.status==="pending" && <section className="claim-review"><label>Internal review notes<textarea value={notes} onChange={e=>setNotes(e.target.value)} maxLength={3000} /></label><label>Reason shown on rejection<textarea value={publicReason} onChange={e=>setPublicReason(e.target.value)} maxLength={1000} /></label><div className="claim-actions"><button disabled={saving} onClick={()=>decide("approve")}>Approve</button><button disabled={saving || !publicReason.trim()} onClick={()=>decide("reject")}>Reject</button><button disabled={saving || !notes.trim()} onClick={()=>decide("dispute")}>Mark disputed</button></div></section>}
      </>}</> : <><header><small>Super Admin</small><h1>Professional claims</h1><p>Review exact imported professional identities before granting account access.</p></header><label>Status <select value={status} onChange={e=>setStatus(e.target.value)}><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="disputed">Disputed</option><option value="all">All</option></select></label>
      {!loading && <div className="claim-results">{rows.map(row=><article key={row.id}><div><strong>{row.applicant_name}</strong><small>{row.source_type} · {row.source_id} · {row.status}</small><span>{row.has_evidence ? "Evidence attached · " : ""}{new Date(row.created_at).toLocaleDateString()}</span></div><Link to={`/admin/professional-claims/${row.id}`}>Review</Link></article>)}{!rows.length && <p>No claims in this view.</p>}</div>}</>}
    {loading && <p role="status">Loading claims…</p>}{error && <p role="alert" className="claim-error">{error}</p>}
  </div></main>;
}
