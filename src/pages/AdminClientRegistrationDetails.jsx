import { ArrowLeft, ExternalLink, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  approveClientRegistration,
  getClientDocumentUrl,
  getClientRegistration,
  rejectClientRegistration,
} from "../api/adminClientRegistrationApi";
import "./AdminClientRegistrationDetails.css";

export default function AdminClientRegistrationDetails() {
  const { clientProfileId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [rejecting, setRejecting] = useState(false);
  const [reason, setReason] = useState("");
  const [internalNote, setInternalNote] = useState("");

  const load = () => { setLoading(true); return getClientRegistration(clientProfileId).then((response) => setData(response.data)).catch((requestError) => setError(requestError.response?.data?.message || "Failed to load registration.")).finally(() => setLoading(false)); };
  useEffect(() => {
    let active = true;
    getClientRegistration(clientProfileId)
      .then((response) => { if (active) setData(response.data); })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.message || "Failed to load registration."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [clientProfileId]);

  const approve = async () => {
    if (!window.confirm("Approve this Client registration and grant operational access?")) return;
    setLoading(true); setError("");
    try { await approveClientRegistration(clientProfileId); await load(); }
    catch (requestError) { setError(requestError.response?.data?.message || "Approval failed."); setLoading(false); }
  };
  const reject = async () => {
    if (!reason.trim()) return setError("A public rejection reason is required.");
    setLoading(true); setError("");
    try { await rejectClientRegistration(clientProfileId, { rejection_reason: reason, internal_note: internalNote || undefined }); setRejecting(false); await load(); }
    catch (requestError) { setError(requestError.response?.data?.message || "Rejection failed."); setLoading(false); }
  };
  const viewDocument = async (documentId) => {
    try { const response = await getClientDocumentUrl(clientProfileId, documentId); window.open(response.url, "_blank", "noopener,noreferrer"); }
    catch (requestError) { setError(requestError.response?.data?.message || "Unable to open private document."); }
  };

  if (loading && !data) return <div className="admin-detail-loading">Loading registration...</div>;
  if (!data) return <div className="admin-detail-loading">{error || "Registration not found."}</div>;
  const { profile, company, vessels, services, documents, history } = data;
  return <div className="admin-client-detail"><button className="detail-back" onClick={() => navigate("/admin/client-registrations")}><ArrowLeft size={17} /> Client Registrations</button><header><div><span>Client Registration</span><h1>{profile.full_name}</h1><p>{company?.legal_name || "Company onboarding incomplete"}</p></div><span className={`detail-status ${profile.verification_status}`}>{profile.verification_status}</span></header>{error && <div className="detail-error">{error}</div>}<div className="detail-grid"><DetailSection title="User Details" entries={[["Full name", profile.full_name],["Email", profile.email],["Mobile", profile.phone],["Designation", profile.designation],["Submitted", profile.verification_submitted_at ? new Date(profile.verification_submitted_at).toLocaleString() : "—"]]} /><DetailSection title="Company Details" entries={[["Legal name", company?.legal_name],["Company type", company?.company_type],["Registration number", company?.registration_number],["Country", company?.country],["Registered address", company?.registered_address],["Website", company?.website],["IMO Company Number", company?.imo_company_number],["Tax number", company?.tax_number]]} /><DetailSection title="Authorized Representative" entries={[["Name", company?.authorized_representative_name],["Designation", company?.authorized_representative_designation],["Email", company?.authorized_representative_email],["Mobile", company?.authorized_representative_phone]]} /><section className="detail-section wide"><h2>Fleet Information</h2><p className="detail-muted">Declared vessel count: {profile.declared_vessel_count ?? "Not provided"}</p>{vessels.length ? <div className="detail-list">{vessels.map((vessel) => <article key={vessel.id}><strong>{vessel.vessel_name}</strong><span>IMO: {vessel.imo_number || "Not provided"}</span><span>{vessel.vessel_type_name || vessel.vessel_type_text || "Type not provided"}</span><span>{vessel.ownership_relationship}</span><span>{vessel.operating_regions || "Regions not provided"}</span></article>)}</div> : <p className="detail-muted">Fleet details will be provided after approval.</p>}</section><section className="detail-section"><h2>Required Services</h2><ul>{services.map((service) => <li key={service.id}>{service.service_name_snapshot}</li>)}</ul></section><section className="detail-section"><h2>Verification Documents</h2><div className="detail-documents">{documents.map((document) => <button key={document.id} onClick={() => viewDocument(document.id)}><FileText size={17} /><span>{document.original_filename}<small>{document.document_category.replaceAll("_", " ")}</small></span><ExternalLink size={15} /></button>)}</div></section><section className="detail-section wide"><h2>Submission History</h2><div className="history-list">{history.map((event, index) => <div key={`${event.created_at}-${index}`}><strong>{event.new_status}</strong><span>{new Date(event.created_at).toLocaleString()}</span>{event.public_reason && <p>{event.public_reason}</p>}{event.internal_note && <small>Internal: {event.internal_note}</small>}</div>)}</div></section></div>{profile.verification_status === "pending" && <div className="detail-actions"><button className="reject" onClick={() => setRejecting(true)}>Reject Registration</button><button className="approve" onClick={approve}>Approve Registration</button></div>}{rejecting && <div className="reject-dialog-backdrop"><div className="reject-dialog"><h2>Reject Registration</h2><p>Explain the changes the Client must make before resubmission.</p><label>Public reason<textarea maxLength={1000} value={reason} onChange={(event) => setReason(event.target.value)} /></label><label>Internal note (optional)<textarea maxLength={2000} value={internalNote} onChange={(event) => setInternalNote(event.target.value)} /></label><div><button onClick={() => setRejecting(false)}>Cancel</button><button className="reject" disabled={loading} onClick={reject}>Reject Registration</button></div></div></div>}</div>;
}

function DetailSection({ title, entries }) { return <section className="detail-section"><h2>{title}</h2><dl>{entries.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value || "—"}</dd></div>)}</dl></section>; }
