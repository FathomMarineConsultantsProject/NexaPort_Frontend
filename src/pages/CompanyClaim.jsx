import NexaportBrand from "../components/branding/NexaportBrand";
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { createClaimEvidenceUpload, getManagedCompanies, getMyClaims, getPublicCompany, searchCompanies, submitCompanyClaim } from "../api/companyClaimsApi";
import { isMaritimeCompany } from "../utils/auth";
import CopyClaimLink from "../components/directories/CopyClaimLink";
import "./CompanyClaim.css";

const companyPath = (id) => `/companies/${id}/claim`;
const typeLabel = (value) => value.replaceAll("_", " ").replace(/\b\w/g, char => char.toUpperCase());

export function CompanySearch() {
  const [term, setTerm] = useState("");
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const find = async (event) => {
    event.preventDefault();
    setError(""); setLoading(true);
    try { setResults((await searchCompanies({ q: term })).data); }
    catch (requestError) { setError(requestError.response?.data?.message || "Company search is unavailable."); }
    finally { setLoading(false); }
  };
  return <main className="claim-page"><NexaportBrand className="claim-brand" /><div className="claim-panel">
    <header><small>Maritime company directory</small><h1>Find your company</h1><p>Search the existing directory before registering a new company.</p></header>
    <form className="claim-search" onSubmit={find}><label htmlFor="company-search">Company name, COM reference, city or country</label><div><input id="company-search" value={term} onChange={event => setTerm(event.target.value)} minLength={2} maxLength={120} required /><button disabled={loading}>{loading ? "Searching…" : "Search"}</button></div></form>
    {error && <p role="alert" className="claim-error">{error}</p>}
    <div className="claim-results" aria-live="polite">{results.map(company => <article key={company.id}><div><strong>{company.company_name}</strong><small>{company.nexaport_company_id || "ID pending"} · {[company.city,company.country].filter(Boolean).join(", ") || "Location not listed"}</small><span>{company.directory_types.map(typeLabel).join(" · ")}</span></div><Link to={companyPath(company.id)}>View company</Link></article>)}</div>
    {!loading && results.length === 0 && term.length >= 2 && !error && <p className="claim-hint">No results shown. Search by company name or COM reference.</p>}
    <p className="claim-footnote">Company not listed? <Link to="/register-maritime-company">Register a new maritime company</Link>.</p>
  </div></main>;
}

export default function CompanyClaim() {
  const { id } = useParams();
  const [company, setCompany] = useState(null);
  const [claims, setClaims] = useState([]);
  const [managed, setManaged] = useState([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ designation: "", businessEmail: "", relationship: "", registrationNumber: "", website: "" });
  const [file, setFile] = useState(null);
  const [authenticated, setAuthenticated] = useState(Boolean(localStorage.getItem("np_token")));
  useEffect(() => {
    let active = true;
    getPublicCompany(id).then(async detail => {
      if (!active) return;
      setCompany(detail);
      if (authenticated) {
        try { const [own, memberships] = await Promise.all([getMyClaims(), getManagedCompanies()]); if (active) { setClaims(own); setManaged(memberships); } }
        catch (requestError) {
          if (active && requestError.response?.status === 401) { localStorage.removeItem("np_token"); localStorage.removeItem("np_user"); setAuthenticated(false); }
          else if (active) setError(requestError.response?.data?.message || "Unable to load claim status.");
        }
      }
    })
      .catch(requestError => { if (active) setError(requestError.response?.data?.message || "Unable to load company."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [id, authenticated]);
  const currentClaim = claims.find(claim => claim.entity_id === id && claim.status === "pending") || claims.find(claim => claim.entity_id === id);
  const access = managed.find(item => item.id === id);
  const set = (key, value) => setForm(previous => ({ ...previous, [key]: value }));
  const submit = async event => {
    event.preventDefault(); setError(""); setSaving(true);
    try {
      let evidence;
      if (file) {
        if (!["application/pdf","image/jpeg","image/png","image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) throw new Error("Use a PDF, JPEG, PNG or WebP document up to 5 MB.");
        const upload = await createClaimEvidenceUpload({ contentType: file.type, size: file.size });
        const put = await fetch(upload.uploadUrl, { method: "PUT", headers: { "content-type": file.type }, body: file });
        if (!put.ok) throw new Error("Document upload failed. Try again.");
        evidence = { key: upload.key, contentType: file.type, size: file.size };
      }
      const claim = await submitCompanyClaim({ entityId: id, ...form, evidence });
      setClaims(previous => [{ id: claim.id, entity_id: id, status: "pending", created_at: claim.created_at }, ...previous]);
      setFile(null);
    } catch (requestError) { setError(requestError.response?.data?.message || requestError.message || "Claim submission failed."); }
    finally { setSaving(false); }
  };
  if (loading) return <main className="claim-page"><p role="status">Loading company…</p></main>;
  if (!company) return <main className="claim-page"><p role="alert">{error || "Company not found."}</p><Link to="/companies">Find a company</Link></main>;
  return <main className="claim-page"><NexaportBrand className="claim-brand" /><div className="claim-panel">
    <Link className="claim-back" to="/companies">← Find another company</Link>
    <header><small>Company directory · {company.nexaport_company_id || "ID pending"}</small><h1>{company.company_name}</h1><p>{[company.city,company.country].filter(Boolean).join(", ") || "Location not listed"} · {company.directory_types.map(typeLabel).join(" · ")}</p><p>Account claim: {company.account_claim_state === "legacy_association" ? "Legacy account association · verification not recorded" : company.account_claim_state}</p>{!access && currentClaim?.status !== "pending" && <a className="claim-identity-action" href={authenticated ? "#company-claim-form" : `/login?returnTo=${encodeURIComponent(companyPath(id))}`}>{currentClaim?.status === "rejected" || company.has_existing_association ? "Request Ownership Review" : "Claim this Company"}</a>}</header>
    <CopyClaimLink path={companyPath(company.id)} />
    {company.description && <p className="claim-description">{company.description}</p>}
    {access ? <div className="claim-state"><strong>You manage this company</strong><p>Your approved access is active.</p><Link to={isMaritimeCompany() ? `/company-profile/${id}` : "/choose-workspace"}>Manage Company</Link></div>
      : currentClaim?.status === "pending" ? <div className="claim-state" role="status"><strong>Claim Pending</strong><p>Super Admin is reviewing your request. You cannot edit this company until approval.</p></div>
      : <>
        {currentClaim?.status === "rejected" && <div className="claim-state" role="status"><strong>Previous claim rejected</strong><p>{currentClaim.decision_note || "Review the decision and submit new evidence if appropriate."}</p></div>}
        {!authenticated ? <div className="claim-state"><h2>{company.has_existing_association ? "Request ownership review" : "Claim this Company"}</h2><p>Sign in or create a maritime company account to request a review. Selecting this listing does not grant access.</p><div className="claim-actions"><Link to={`/login?returnTo=${encodeURIComponent(companyPath(id))}`}>Sign in to claim</Link><Link to={`/register-maritime-company?returnTo=${encodeURIComponent(companyPath(id))}`}>Register to claim</Link></div></div>
          : <form id="company-claim-form" className="claim-form" onSubmit={submit}><h2>{currentClaim || company.has_existing_association ? "Request ownership review" : "Claim this Company"}</h2><p>Describe your authority to represent this company. A Super Admin will verify the request.</p>
            <div className="claim-grid"><label>Company role or designation *<input value={form.designation} onChange={event => set("designation",event.target.value)} maxLength={160} required /></label><label>Business email *<input type="email" value={form.businessEmail} onChange={event => set("businessEmail",event.target.value)} maxLength={320} required /></label><label>Registration number <input value={form.registrationNumber} onChange={event => set("registrationNumber",event.target.value)} maxLength={160} /></label><label>Company website <input type="url" value={form.website} onChange={event => set("website",event.target.value)} placeholder="https://" /></label></div>
            <label>How are you authorized to represent this company? *<textarea value={form.relationship} onChange={event => set("relationship",event.target.value)} minLength={20} maxLength={3000} required /></label>
            <label>Supporting business document (optional)<input type="file" accept="application/pdf,image/jpeg,image/png,image/webp" onChange={event => setFile(event.target.files?.[0] || null)} /><small>PDF or image, up to 5 MB. Only authorized reviewers can access this file.</small></label>
            {error && <p className="claim-error" role="alert">{error}</p>}
            <button type="submit" disabled={saving}>{saving ? "Submitting…" : "Submit claim for review"}</button>
          </form>}
      </>}
  </div></main>;
}

export function MyCompanyClaims() {
  const [claims, setClaims] = useState([]);
  const [managed, setManaged] = useState([]);
  const [error, setError] = useState("");
  useEffect(() => { Promise.all([getMyClaims(),getManagedCompanies()]).then(([own,companies]) => { setClaims(own); setManaged(companies); }).catch(requestError => setError(requestError.response?.data?.message || "Unable to load claims.")); }, []);
  return <main className="claim-page"><NexaportBrand className="claim-brand" /><div className="claim-panel"><header><small>Company account</small><h1>My company claims</h1><p>Track ownership review and open companies you are authorized to manage.</p></header>
    {error && <p role="alert" className="claim-error">{error}</p>}
    <h2>Managed companies</h2><div className="claim-results">{managed.map(company => <article key={company.id}><div><strong>{company.company_name}</strong><small>{company.nexaport_company_id || "ID pending"} · {company.membership_role}</small></div><Link to={isMaritimeCompany() ? `/company-profile/${company.id}` : "/choose-workspace"}>Manage Company</Link></article>)}{!managed.length && <p>No approved company access yet.</p>}</div>
    <h2>Requests</h2><div className="claim-results">{claims.map(claim => <article key={claim.id || claim.entity_id}><div><strong>{claim.company_name}</strong><small>{claim.nexaport_company_id || "ID pending"} · {claim.status === "not_submitted" ? "Claim not yet submitted" : claim.status} · {new Date(claim.created_at).toLocaleDateString()}</small>{claim.decision_note && <span>{claim.decision_note}</span>}</div><Link to={companyPath(claim.entity_id)}>{claim.status === "not_submitted" ? "Complete claim" : "View"}</Link></article>)}{!claims.length && <p>No claims submitted. <Link to="/companies">Find your company</Link>.</p>}</div>
    <Link to="/companies">Find a company</Link>
  </div></main>;
}
