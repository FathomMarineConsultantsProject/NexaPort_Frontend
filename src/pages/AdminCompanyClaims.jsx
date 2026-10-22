import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { decideCompanyClaim, getAdminClaim, getAdminClaims, getClaimEvidence, revokeCompanyLink } from "../api/companyClaimsApi";
import CopyClaimLink from "../components/directories/CopyClaimLink";
import "./CompanyClaim.css";

export default function AdminCompanyClaims() {
  const { id } = useParams();
  const [query]=useSearchParams();
  const requested=query.get("returnTo") || "";
  const back=/^\/admin\/profile-claims(?:\?[^#]*)?$/.test(requested) ? requested : "/admin/profile-claims?type=companies";
  const [status, setStatus] = useState("pending");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [rows, setRows] = useState([]);
  const [detail, setDetail] = useState(null);
  const [notes, setNotes] = useState("");
  const [publicReason, setPublicReason] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { if (id) setDetail(await getAdminClaim(id)); else { const result = await getAdminClaims({ status, page }); setRows(result.data); setHasMore(result.hasMore); } }
    catch (requestError) { setError(requestError.response?.data?.message || "Unable to load company claims."); }
    finally { setLoading(false); }
  }, [id, status, page]);
  useEffect(() => { const timer = setTimeout(load, 0); return () => clearTimeout(timer); }, [load]);
  const decide = async action => {
    setSaving(true); setError("");
    try { await decideCompanyClaim(id, action, notes, publicReason); await load(); }
    catch (requestError) { setError(requestError.response?.data?.message || "Decision could not be saved."); }
    finally { setSaving(false); }
  };
  const openEvidence = async () => {
    try { const result = await getClaimEvidence(id); window.open(result.url, "_blank", "noopener,noreferrer"); }
    catch (requestError) { setError(requestError.response?.data?.message || "Document is unavailable."); }
  };
  const revoke = async userId => {
    setSaving(true); setError("");
    try { await revokeCompanyLink(detail.entity_id,userId,notes); await load(); }
    catch (requestError) { setError(requestError.response?.data?.message || "Revocation could not be saved."); }
    finally { setSaving(false); }
  };
  return <main className="claim-page"><div className="claim-panel claim-panel--admin">
    {id ? <><Link className="claim-back" to={back}>← Company Claims</Link><header><small>Super Admin · Company Claims</small><h1>{detail?.company_name || "Claim review"}</h1><p>{detail?.nexaport_company_id || "ID pending"} · {detail?.status}</p></header>
      {loading ? <p role="status">Loading claim…</p> : detail && <><CopyClaimLink path={`/companies/${detail.entity_id}/claim`} />
        <dl className="claim-admin-facts"><div><dt>Applicant</dt><dd>{detail.claimant_account_name} · {detail.claimant_account_email}</dd></div><div><dt>Designation</dt><dd>{detail.applicant_designation}</dd></div><div><dt>Business email</dt><dd>{detail.applicant_business_email}</dd></div><div><dt>Relationship</dt><dd>{detail.relationship_description}</dd></div><div><dt>Registration number</dt><dd>{detail.company_registration_number || "Not supplied"}</dd></div><div><dt>Website</dt><dd>{detail.company_website || "Not supplied"}</dd></div><div><dt>Directory types</dt><dd>{detail.directory_types?.join(", ")}</dd></div><div><dt>Source mappings</dt><dd>{detail.sources?.length ? detail.sources.map(source => `${source.source_name}: ${source.source_external_id}`).join("; ") : "None listed"}</dd></div><div><dt>Existing representatives</dt><dd>{detail.members?.length ? detail.members.map(member => `${member.full_name} (${member.membership_role}, ${member.status}, ${member.verification_origin || "provenance unavailable"})`).join("; ") : "None"}</dd></div><div><dt>Other claims</dt><dd>{detail.history?.length || 0}</dd></div></dl>
        <section className="claim-admin-history"><h2>Claim history</h2><table><thead><tr><th>Submitted</th><th>Status</th><th>Reviewed</th></tr></thead><tbody>{detail.history?.map(row=><tr key={row.id}><td>{new Date(row.created_at).toLocaleDateString()}</td><td>{row.status}</td><td>{row.reviewed_at ? new Date(row.reviewed_at).toLocaleDateString() : "—"}</td></tr>)}</tbody></table></section>
        {detail.has_evidence && <button type="button" onClick={openEvidence}>Open private evidence</button>}
        {detail.members?.some(member => member.status === "approved") && <section className="claim-review"><h2>Active representatives</h2><label>Revocation reason<textarea value={notes} onChange={event => setNotes(event.target.value)} minLength={10} maxLength={3000} /></label>{detail.members.filter(member => member.status === "approved").map(member => <p key={member.user_id}>{member.full_name} · {member.email} <button type="button" disabled={saving || notes.trim().length < 10} onClick={() => revoke(member.user_id)}>Revoke access</button></p>)}</section>}
        {detail.status === "pending" && <section className="claim-review"><label>Internal review notes<textarea value={notes} onChange={event => setNotes(event.target.value)} maxLength={3000} /></label><label>Reason shown to applicant if rejected<textarea value={publicReason} onChange={event => setPublicReason(event.target.value)} maxLength={1000} /></label><p>Adding another representative to an already managed company requires internal review notes. Approval never transfers the existing owner.</p><div className="claim-actions"><button disabled={saving} onClick={() => decide("approve")}>Approve claim</button><button disabled={saving || !publicReason.trim()} onClick={() => decide("reject")}>Reject claim</button><button disabled={saving || notes.trim().length < 10} onClick={() => decide("dispute")}>Mark disputed</button></div></section>}
      </>}
    </> : <><header><small>Super Admin</small><h1>Company Claims</h1><p>Review requests for existing canonical maritime companies.</p></header><label>Status <select value={status} onChange={event => { setStatus(event.target.value); setPage(1); }}><option value="pending">Pending</option><option value="approved">Approved</option><option value="rejected">Rejected</option><option value="disputed">Disputed</option><option value="all">All</option></select></label>
      {loading ? <p role="status">Loading claims…</p> : <div className="claim-results">{rows.length ? rows.map(row => <article key={row.id}><div><strong>{row.company_name}</strong><small>{row.nexaport_company_id || "ID pending"} · {row.claimant_name} · {row.applicant_designation}</small><span>{row.directory_types.join(" · ")} · {row.status} · {new Date(row.created_at).toLocaleDateString()}</span><small>{row.has_existing_association ? "Existing account association" : "No existing account association"}{row.has_evidence ? " · Evidence attached" : ""}</small></div><Link to={`/admin/company-claims/${row.id}`}>Review</Link></article>) : <p>No claims in this view.</p>}</div>}</>}
    {!id && <nav className="claim-pagination" aria-label="Company claims pages"><button type="button" disabled={loading || page <= 1} onClick={() => setPage(value => value - 1)}>Previous</button><span>Page {page}</span><button type="button" disabled={loading || !hasMore} onClick={() => setPage(value => value + 1)}>Next</button></nav>}
    {error && <p className="claim-error" role="alert">{error}</p>}
  </div></main>;
}
