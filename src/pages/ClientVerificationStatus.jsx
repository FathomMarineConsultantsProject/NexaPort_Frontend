import { Anchor, Clock, FileText, LogOut, RefreshCw, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  confirmClientDocument,
  getMyClientOnboarding,
  presignClientDocument,
  resubmitClientOnboarding,
  updateMyClientOnboarding,
  uploadToPresignedUrl,
} from "../api/clientRegistrationApi";
import "./ClientVerificationStatus.css";

const CATEGORY_LABELS = {
  company_registration_certificate: "Company registration certificate",
  authorisation_letter: "Authorisation letter",
  company_identification_or_tax_certificate: "Company identification or tax certificate",
};
const COMPANY_TYPES = ["Ship Owner", "Ship Manager", "Charterer", "Broker", "Bank", "Insurer", "Other"];

export default function ClientVerificationStatus() {
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [uploading, setUploading] = useState("");
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const response = await getMyClientOnboarding();
      if (response.data?.profile?.verification_status === "approved") return navigate("/dashboard", { replace: true });
      setData(response.data);
    } catch (error) {
      setMessage(error.response?.data?.message || "Unable to load registration status.");
    } finally { setLoading(false); }
  };
  useEffect(() => {
    let active = true;
    getMyClientOnboarding()
      .then((response) => {
        if (!active) return;
        if (response.data?.profile?.verification_status === "approved") navigate("/dashboard", { replace: true });
        else setData(response.data);
      })
      .catch((error) => { if (active) setMessage(error.response?.data?.message || "Unable to load registration status."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [navigate]);

  const logout = () => { localStorage.removeItem("np_token"); localStorage.removeItem("np_user"); navigate("/login", { replace: true }); };

  const replaceDocument = async (category, file) => {
    if (!file) return;
    setUploading(category); setMessage("");
    try {
      const metadata = { category, contentType: file.type, size: file.size, originalFilename: file.name };
      const presigned = await presignClientDocument(metadata);
      await uploadToPresignedUrl({ uploadUrl: presigned.uploadUrl, file });
      await confirmClientDocument({ ...metadata, key: presigned.key });
      setMessage("Verification document replaced successfully.");
      await load();
    } catch (error) { setMessage(error.response?.data?.message || "Document replacement failed."); }
    finally { setUploading(""); }
  };

  const resubmit = async () => {
    setLoading(true); setMessage("");
    try {
      await resubmitClientOnboarding();
      const stored = JSON.parse(localStorage.getItem("np_user") || "{}");
      localStorage.setItem("np_user", JSON.stringify({ ...stored, verification_status: "pending" }));
      setMessage("Registration resubmitted for verification.");
      await load();
    } catch (error) { setMessage(error.response?.data?.message || "Unable to resubmit registration."); setLoading(false); }
  };

  const beginEdit = () => {
    setEditForm({ designation: data.profile.designation || "", declared_vessel_count: data.profile.declared_vessel_count ?? 0, company: { ...data.company } });
    setEditing(true);
  };
  const setEditCompany = (name, value) => setEditForm((current) => ({ ...current, company: { ...current.company, [name]: value } }));
  const saveEdits = async () => {
    setLoading(true); setMessage("");
    try { await updateMyClientOnboarding(editForm); setEditing(false); setMessage("Application details updated."); await load(); }
    catch (error) { setMessage(error.response?.data?.message || "Application update failed."); setLoading(false); }
  };

  if (loading && !data) return <div className="status-loading">Loading registration status...</div>;
  const profile = data?.profile || {};
  const rejected = profile.verification_status === "rejected";
  return (
    <main className="verification-page">
      <header className="verification-top"><div><Anchor size={21} /> NexaPort</div><button onClick={logout}><LogOut size={17} /> Sign Out</button></header>
      <section className="verification-shell">
        <div className={`verification-status-icon ${rejected ? "rejected" : ""}`}>{rejected ? <RefreshCw size={28} /> : <Clock size={28} />}</div>
        <span className={`verification-badge ${rejected ? "rejected" : ""}`}>{rejected ? "Changes required" : "Awaiting verification"}</span>
        <h1>{rejected ? "Registration Requires Changes" : "Registration Submitted"}</h1>
        <p className="verification-intro">{rejected ? "Review the reason below, replace any required documents, and resubmit your application." : "Your company registration is being reviewed by NexaPort. Operational Client features remain unavailable until approval."}</p>
        {message && <div className="verification-message">{message}</div>}
        {rejected && <div className="rejection-reason"><strong>Reason for changes</strong><p>{profile.rejection_reason}</p></div>}

        <div className="verification-summary-grid">
          <section><h2>Application</h2><dl><div><dt>Submitted</dt><dd>{profile.verification_submitted_at ? new Date(profile.verification_submitted_at).toLocaleString() : "Not available"}</dd></div><div><dt>Company</dt><dd>{data?.company?.legal_name || "Company details pending"}</dd></div><div><dt>Country</dt><dd>{data?.company?.country || "Not provided"}</dd></div><div><dt>Services</dt><dd>{data?.services?.map((service) => service.service_name_snapshot).join(", ") || "Not provided"}</dd></div></dl></section>
          <section><h2>Verification documents</h2><div className="status-document-list">{Object.entries(CATEGORY_LABELS).map(([category, label]) => { const document = data?.documents?.find((item) => item.document_category === category); return <div key={category}><FileText size={18} /><span><strong>{label}</strong><small>{document?.original_filename || "Not uploaded"}</small></span><label><Upload size={15} /> {uploading === category ? "Uploading" : document ? "Replace" : "Upload"}<input type="file" disabled={Boolean(uploading)} accept="application/pdf,image/png,image/jpeg,image/webp" onChange={(event) => replaceDocument(category, event.target.files?.[0])} /></label></div>; })}</div></section>
        </div>
        {rejected && <div className="rejected-edit-actions"><button className="edit-application-button" onClick={beginEdit}>Edit Application Details</button><button className="resubmit-button" disabled={loading || Boolean(uploading)} onClick={resubmit}>Resubmit Registration</button></div>}
        {editing && editForm && <div className="status-edit-backdrop"><section className="status-edit-dialog"><h2>Edit application details</h2><p>Update the applicant and company information requested by the reviewer.</p><div className="status-edit-grid"><label>Designation<input value={editForm.designation} onChange={(event) => setEditForm({ ...editForm, designation: event.target.value })} /></label><label>Declared vessel count<input type="number" min="0" value={editForm.declared_vessel_count} onChange={(event) => setEditForm({ ...editForm, declared_vessel_count: event.target.value })} /></label><label>Company legal name<input value={editForm.company.legal_name || ""} onChange={(event) => setEditCompany("legal_name", event.target.value)} /></label><label>Company type<select value={editForm.company.company_type || ""} onChange={(event) => setEditCompany("company_type", event.target.value)}>{COMPANY_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label><label className="wide">Registered address<textarea value={editForm.company.registered_address || ""} onChange={(event) => setEditCompany("registered_address", event.target.value)} /></label><label>Country<input value={editForm.company.country || ""} onChange={(event) => setEditCompany("country", event.target.value)} /></label><label>Registration number<input value={editForm.company.registration_number || ""} onChange={(event) => setEditCompany("registration_number", event.target.value)} /></label><label>Website<input value={editForm.company.website || ""} onChange={(event) => setEditCompany("website", event.target.value)} /></label><label>IMO Company Number<input value={editForm.company.imo_company_number || ""} onChange={(event) => setEditCompany("imo_company_number", event.target.value)} /></label><label>VAT/GST/Tax number<input value={editForm.company.tax_number || ""} onChange={(event) => setEditCompany("tax_number", event.target.value)} /></label><label>Representative name<input value={editForm.company.authorized_representative_name || ""} onChange={(event) => setEditCompany("authorized_representative_name", event.target.value)} /></label><label>Representative designation<input value={editForm.company.authorized_representative_designation || ""} onChange={(event) => setEditCompany("authorized_representative_designation", event.target.value)} /></label><label>Representative email<input type="email" value={editForm.company.authorized_representative_email || ""} onChange={(event) => setEditCompany("authorized_representative_email", event.target.value)} /></label><label>Representative mobile<input value={editForm.company.authorized_representative_phone || ""} onChange={(event) => setEditCompany("authorized_representative_phone", event.target.value)} /></label></div><div className="status-edit-actions"><button onClick={() => setEditing(false)}>Cancel</button><button className="save" disabled={loading} onClick={saveEdits}>Save Changes</button></div></section></div>}
        <p className="verification-note">For security, verification documents are private and available only to you and authorised NexaPort reviewers.</p>
      </section>
    </main>
  );
}
