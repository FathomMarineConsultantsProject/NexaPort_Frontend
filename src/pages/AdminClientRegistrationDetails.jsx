import { ArrowLeft, ExternalLink, FileText } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { approveClientRegistration, getClientDocumentUrl, getClientRegistration, rejectClientRegistration } from "../api/adminClientRegistrationApi";
import "./AdminClientRegistrationDetails.css";

const DOCUMENT_CATEGORIES = [
  ["company_registration_certificate", "Company Registration Certificate"],
  ["authorisation_letter", "Authorisation Letter"],
  ["company_identification_or_tax_certificate", "Company Identification or Tax Certificate"],
];

const dateTime = (value) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" }).format(new Date(value)) : "Not provided";
const shown = (value) => value == null || value === "" ? "Not provided" : value;

function DetailSection({ title, entries, className = "" }) {
  return <section className={`detail-section ${className}`}><h2>{title}</h2><dl>{entries.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{shown(value)}</dd></div>)}</dl></section>;
}

export default function AdminClientRegistrationDetails() {
  const { clientProfileId } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const reasonRef = useRef(null);
  const dialogRef = useRef(null);
  const rejectButtonRef = useRef(null);

  const load = async () => { setLoading(true); setError(""); try { const response = await getClientRegistration(clientProfileId); setData(response.data); } catch (requestError) { setError(requestError.response?.data?.message || "Registration could not be loaded. Try again."); } finally { setLoading(false); } };
  useEffect(() => {
    let active = true;
    getClientRegistration(clientProfileId).then((response) => { if (active) setData(response.data); }).catch((requestError) => { if (active) setError(requestError.response?.data?.message || "Registration could not be loaded. Try again."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [clientProfileId]);
  useEffect(() => { if (!rejecting) return undefined; reasonRef.current?.focus(); const returnFocus = rejectButtonRef.current; const onKeyDown = (event) => { if (event.key === "Escape") setRejecting(false); if (event.key !== "Tab") return; const controls = [...(dialogRef.current?.querySelectorAll("textarea, button:not(:disabled)") || [])]; if (!controls.length) return; if (event.shiftKey && document.activeElement === controls[0]) { event.preventDefault(); controls.at(-1).focus(); } else if (!event.shiftKey && document.activeElement === controls.at(-1)) { event.preventDefault(); controls[0].focus(); } }; window.addEventListener("keydown", onKeyDown); return () => { window.removeEventListener("keydown", onKeyDown); returnFocus?.focus(); }; }, [rejecting]);

  const approve = async () => {
    if (!window.confirm("Approve this Client registration and grant operational access?")) return;
    setLoading(true); setError("");
    try { await approveClientRegistration(clientProfileId); await load(); }
    catch (requestError) { setError(requestError.response?.data?.message || "Approval failed. Try again."); setLoading(false); }
  };
  const reject = async () => {
    if (!reason.trim()) { setError("A public rejection reason is required."); reasonRef.current?.focus(); return; }
    setLoading(true); setError("");
    try { await rejectClientRegistration(clientProfileId, { rejection_reason: reason, internal_note: internalNote || undefined }); setRejecting(false); await load(); }
    catch (requestError) { setError(requestError.response?.data?.message || "Rejection failed. Try again."); setLoading(false); }
  };
  const viewDocument = async (documentId) => {
    try { const response = await getClientDocumentUrl(clientProfileId, documentId); window.open(response.url, "_blank", "noopener,noreferrer"); }
    catch (requestError) { setError(requestError.response?.data?.message || "Private document could not be opened. Try again."); }
  };

  if (loading && !data) return <main className="admin-client-detail"><div className="admin-detail-loading" role="status">Loading registration…</div></main>;
  if (!data) return <main className="admin-client-detail"><div className="admin-detail-loading" role="alert">{error || "Registration not found."}<button type="button" onClick={load}>Try again</button></div></main>;
  const { profile, company, vessels, services, documents, history } = data;
  const documentsByCategory = Object.fromEntries(documents.map((document) => [document.document_category, document]));
  const pending = profile.verification_status === "pending";

  return <main className="admin-client-detail">
    <Link className="detail-back" to="/admin/client-registrations"><ArrowLeft size={17} aria-hidden="true" /> Owners and Managers</Link>
    <header className="admin-detail-header"><div><span>Client registration review</span><h1>{profile.full_name}</h1><p>{company?.legal_name || "Company onboarding incomplete"}</p></div><span className={`detail-status ${profile.verification_status}`}>{profile.verification_status}</span></header>
    {error && <div className="detail-error" role="alert">{error}</div>}
    {pending && <section className="detail-decision"><div><span>Decision required</span><h2>Review company and verification documents</h2><p>Approve the registration to grant operational access, or provide a reason the Client can act on.</p></div><div className="detail-actions"><button ref={rejectButtonRef} className="reject" type="button" disabled={loading} onClick={() => setRejecting(true)}>Reject Registration</button><button className="approve" type="button" disabled={loading} onClick={approve}>Approve Registration</button></div></section>}
    <div className="detail-grid">
      <DetailSection title="Applicant" entries={[["Full name", profile.full_name], ["Email", profile.email], ["Mobile", profile.phone], ["Designation", profile.designation], ["Submitted", dateTime(profile.verification_submitted_at)]]} />
      <DetailSection title="Company" entries={[["Legal name", company?.legal_name], ["Company type", company?.company_type], ["Registration number", company?.registration_number], ["Country", company?.country], ["Registered address", company?.registered_address], ["Website", company?.website], ["IMO Company Number", company?.imo_company_number], ["Tax number", company?.tax_number]]} />
      <DetailSection title="Authorized Representative" entries={[["Name", company?.authorized_representative_name], ["Designation", company?.authorized_representative_designation], ["Email", company?.authorized_representative_email], ["Mobile", company?.authorized_representative_phone]]} />
      <section className="detail-section"><h2>Verification Documents</h2><div className="detail-documents">{DOCUMENT_CATEGORIES.map(([category, label]) => { const document = documentsByCategory[category]; return document ? <button type="button" key={category} onClick={() => viewDocument(document.id)}><FileText size={17} aria-hidden="true" /><span>{label}<small>{document.original_filename}</small></span><ExternalLink size={15} aria-hidden="true" /></button> : <div className="detail-document-missing" key={category}><FileText size={17} aria-hidden="true" /><span>{label}<small>Not provided</small></span></div>; })}</div></section>
      <section className="detail-section wide"><h2>Fleet Information</h2><p className="detail-muted">Declared vessel count: {shown(profile.declared_vessel_count)}</p>{vessels.length ? <div className="detail-list">{vessels.map((vessel) => <article key={vessel.id}><strong>{vessel.vessel_name}</strong><span>IMO: {shown(vessel.imo_number)}</span><span>{vessel.vessel_type_name || vessel.vessel_type_text || "Type not provided"}</span><span>{shown(vessel.ownership_relationship)}</span><span>{vessel.operating_regions || "Regions not provided"}</span></article>)}</div> : <p className="detail-muted">Fleet details will be provided after approval.</p>}</section>
      <section className="detail-section"><h2>Required Services</h2>{services.length ? <ul>{services.map((service) => <li key={service.id}>{service.service_name_snapshot}</li>)}</ul> : <p className="detail-muted">No services selected.</p>}</section>
      <section className="detail-section wide"><h2>Submission History</h2>{history.length ? <div className="history-list">{history.map((event, index) => <div key={`${event.created_at}-${index}`}><strong>{event.new_status}</strong><span>{dateTime(event.created_at)}</span>{event.public_reason && <p>{event.public_reason}</p>}{event.internal_note && <small>Internal: {event.internal_note}</small>}</div>)}</div> : <p className="detail-muted">No history recorded.</p>}</section>
    </div>
    {rejecting && <div className="reject-dialog-backdrop"><section ref={dialogRef} className="reject-dialog" role="dialog" aria-modal="true" aria-labelledby="reject-registration-title"><h2 id="reject-registration-title">Reject Registration</h2><p>Explain the changes the Client must make before resubmission.</p><label>Public reason<textarea ref={reasonRef} maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} /></label><label>Internal note (optional)<textarea maxLength={2000} value={internalNote} onChange={(event) => setInternalNote(event.target.value)} /></label><div><button type="button" onClick={() => setRejecting(false)}>Cancel</button><button type="button" className="reject" disabled={loading || !reason.trim()} onClick={reject}>Reject Registration</button></div></section></div>}
  </main>;
}
