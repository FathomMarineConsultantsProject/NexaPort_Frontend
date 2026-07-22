import { ArrowLeft, ExternalLink, FileText, Plus, Trash2 } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import {
  deactivateAdminClient,
  deleteAdminClient,
  getAdminClient,
  getAdminClientDeletionImpact,
  getAdminClientDocumentDownloadUrl,
  updateAdminClient,
  updateAdminClientOnboardingVessels,
  updateAdminClientRequiredServices,
} from "../api/adminClientRegistrationApi";
import { getVesselTypes } from "../api/masterApi";
import CopyableContact from "../components/common/CopyableContact";
import TypedConfirmationModal from "../components/common/TypedConfirmationModal";
import "./AdminClientDetails.css";

const COMPANY_TYPES = ["Ship Owner", "Ship Manager", "Charterer", "Broker", "Bank", "Insurer", "Other"];
const SERVICE_LABELS = ["Condition Inspection", "Pre-Purchase Inspection", "Pre-Charter Inspection", "SIRE 2.0 Preparation", "RightShip Inspection", "ISM / ISPS / MLC Audit", "Flag-State Inspection", "Dry-Dock Attendance", "Technical Consultancy", "Marine Warranty or specialist surveys"];
const DOCUMENT_CATEGORIES = [
  ["company_registration_certificate", "Company Registration Certificate"],
  ["authorisation_letter", "Authorisation Letter"],
  ["company_identification_or_tax_certificate", "Company Identification or Tax Certificate"],
];
const emptyCompany = {
  legal_name: "", company_type: "", registered_address: "", country: "", registration_number: "", website: "", imo_company_number: "", tax_number: "",
  authorized_representative_name: "", authorized_representative_designation: "", authorized_representative_email: "", authorized_representative_phone: "",
};
const blankVessel = () => ({ vessel_name: "", imo_number: "", vessel_type_id: "", vessel_type_text: "", ownership_relationship: "", operating_regions: "" });
const blankService = () => ({ service_type_id: "", service_category_id: "", service_name_snapshot: "", other_service_text: "" });
const shown = (value, fallback = "Not provided") => value === null || value === undefined || value === "" ? fallback : value;
const dateTime = (value) => value ? new Date(value).toLocaleString() : "Not provided";
const fileSize = (bytes) => {
  const value = Number(bytes || 0);
  if (!value) return "Unknown size";
  if (value < 1024) return `${value} B`;
  if (value < 1024 * 1024) return `${(value / 1024).toFixed(1)} KB`;
  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
};

export default function AdminClientDetails() {
  const { userId } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [editing, setEditing] = useState("");
  const [form, setForm] = useState(null);
  const [fieldErrors, setFieldErrors] = useState({});
  const [vesselTypes, setVesselTypes] = useState([]);
  const [accountAction, setAccountAction] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try { const response = await getAdminClient(userId); setData(response.data); }
    catch (requestError) { setError(requestError.response?.data?.message || "Failed to load Client profile."); }
    finally { setLoading(false); }
  }, [userId]);

  useEffect(() => {
    let active = true;
    getAdminClient(userId)
      .then((response) => { if (active) setData(response.data); })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.message || "Failed to load Client profile."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [userId]);
  useEffect(() => { getVesselTypes().then((response) => setVesselTypes(response.data || response || [])).catch(() => setVesselTypes([])); }, []);

  const beginEdit = (section) => {
    setEditing(section); setFieldErrors({}); setError(""); setNotice("");
    if (section === "account") setForm({ full_name: data.account.full_name || "", email: data.account.email || "", phone: data.account.phone || "" });
    if (section === "company") setForm({
      profile: { designation: data.registration?.designation || "", declared_vessel_count: data.registration?.declared_vessel_count ?? 0 },
      company: Object.fromEntries(Object.keys(emptyCompany).map((field) => [field, data.company?.[field] || ""])),
    });
    if (section === "fleet") setForm({ declared_vessel_count: data.registration?.declared_vessel_count ?? 0, vessels: data.onboarding_vessels.map((vessel) => ({ ...vessel, vessel_type_id: vessel.vessel_type_id || "" })) });
    if (section === "services") setForm({ services: data.required_services.length ? data.required_services.map((service) => ({ ...service, service_type_id: service.service_type_id || "", service_category_id: service.service_category_id || "" })) : [blankService()] });
  };
  const cancelEdit = () => { setEditing(""); setForm(null); setFieldErrors({}); setError(""); };
  const applyResponse = (response, message) => { setData(response.data); setEditing(""); setForm(null); setFieldErrors({}); setNotice(message); };
  const handleSaveError = (requestError) => {
    setFieldErrors(requestError.response?.data?.field_errors || {});
    setError(requestError.response?.data?.message || "Unable to save changes.");
  };
  const saveAccount = async () => {
    setSaving(true); setError(""); setNotice("");
    try { applyResponse(await updateAdminClient(userId, { user: form }), "Account details updated."); }
    catch (requestError) { handleSaveError(requestError); }
    finally { setSaving(false); }
  };
  const saveCompany = async () => {
    setSaving(true); setError(""); setNotice("");
    try { applyResponse(await updateAdminClient(userId, { profile: form.profile, company: form.company }), "Profile and company details updated."); }
    catch (requestError) { handleSaveError(requestError); }
    finally { setSaving(false); }
  };
  const saveFleet = async () => {
    setSaving(true); setError(""); setNotice("");
    try {
      const payload = { declared_vessel_count: form.declared_vessel_count, vessels: form.vessels.map((vessel) => ({ id: vessel.id, vessel_name: vessel.vessel_name, imo_number: vessel.imo_number, vessel_type_id: vessel.vessel_type_id, vessel_type_text: vessel.vessel_type_text, ownership_relationship: vessel.ownership_relationship, operating_regions: vessel.operating_regions })) };
      applyResponse(await updateAdminClientOnboardingVessels(userId, payload), "Fleet information updated.");
    }
    catch (requestError) { handleSaveError(requestError); }
    finally { setSaving(false); }
  };
  const saveServices = async () => {
    setSaving(true); setError(""); setNotice("");
    try {
      const payload = { services: form.services.map((service) => ({ service_type_id: service.service_type_id, service_category_id: service.service_category_id, service_name_snapshot: service.service_name_snapshot, other_service_text: service.other_service_text })) };
      applyResponse(await updateAdminClientRequiredServices(userId, payload), "Required services updated.");
    }
    catch (requestError) { handleSaveError(requestError); }
    finally { setSaving(false); }
  };
  const openDocument = async (documentId) => {
    setError("");
    try { const response = await getAdminClientDocumentDownloadUrl(userId, documentId); window.open(response.url, "_blank", "noopener,noreferrer"); }
    catch (requestError) { setError(requestError.response?.data?.message || "Unable to open private document."); }
  };
  const prepareAccountAction = async () => {
    setError("");
    try { const response = await getAdminClientDeletionImpact(userId); setAccountAction({ dependencies: response.data, mode: response.data.has_immutable_history ? "deactivate" : "delete" }); }
    catch (requestError) { setError(requestError.response?.data?.message || "Failed to inspect Client dependencies."); }
  };
  const completeAccountAction = async ({ confirmation, reason }) => {
    setSaving(true); setError("");
    try {
      if (accountAction.mode === "delete") { await deleteAdminClient(userId, confirmation, reason); navigate("/admin/client-registrations", { replace: true, state: { tab: "clients" } }); }
      else { await deactivateAdminClient(userId, confirmation, reason); setAccountAction(null); setNotice("Client deactivated and anonymized."); await load(); }
    } catch (requestError) { setError(requestError.response?.data?.message || "Client account action failed."); }
    finally { setSaving(false); }
  };

  if (loading && !data) return <PageState message="Loading Client profile..." />;
  if (!data) return <PageState message={error || "Client profile not found."} retry={load} />;
  const { account, registration, company, flags } = data;
  const registrationUrl = registration ? `/admin/client-registrations/${registration.client_profile_id}` : null;
  const documentsByCategory = Object.fromEntries(data.documents.map((document) => [document.document_category, document]));

  return <main className="admin-client-profile-page">
    <button className="client-profile-back" type="button" onClick={() => navigate("/admin/client-registrations", { state: { tab: "clients" } })}><ArrowLeft size={17}/> Back to Clients</button>
    <header className="client-profile-header"><div><span className="client-profile-eyebrow">Client Profile</span><h1>{account.full_name}</h1><p>{company?.legal_name || (flags.is_legacy ? "Legacy Client" : "Company information not provided")}</p><div className="client-profile-badges"><StatusBadge value={registration?.verification_status || "legacy"}/><span className={`client-account-badge ${account.is_active ? "active" : "inactive"}`}>{account.is_active ? "Active account" : "Inactive account"}</span>{flags.missing_registration_data && <span className="client-legacy-badge">Legacy Client · Missing Formal Registration Data</span>}</div></div><div className="client-header-actions">{registrationUrl && <Link to={registrationUrl}>View Registration History</Link>}<button className="danger-outline" type="button" onClick={prepareAccountAction}>Delete or Deactivate</button></div></header>
    {error && <div className="client-profile-message error" role="alert">{error}<button type="button" onClick={load}>Retry</button></div>}
    {notice && <div className="client-profile-message success" role="status">{notice}</div>}

    <Section title="Account Overview" action={!editing && <EditButton onClick={() => beginEdit("account")}>Edit Account</EditButton>}>
      {editing === "account" ? <EditForm onSave={saveAccount} onCancel={cancelEdit} saving={saving}>
        <Field label="Full name" value={form.full_name} onChange={(value) => setForm({ ...form, full_name: value })} error={fieldErrors["user.full_name"]}/>
        <Field label="Email" type="email" value={form.email} onChange={(value) => setForm({ ...form, email: value })} error={fieldErrors["user.email"]}/>
        <Field label="Phone" value={form.phone} onChange={(value) => setForm({ ...form, phone: value })} error={fieldErrors["user.phone"]}/>
      </EditForm> : <DetailGrid entries={[
        ["Full name", account.full_name], ["Username", shown(account.username)], ["Email", <CopyableContact value={account.email} href={`mailto:${account.email}`} type="email"/>], ["Phone", account.phone ? <CopyableContact value={account.phone} href={`tel:${account.phone}`} type="phone"/> : "Not provided"], ["Account status", account.is_active ? "Active" : "Inactive"], ["Created", dateTime(account.created_at)], ["Last updated", dateTime(account.updated_at)], ["User ID", account.user_id],
      ]}/>} 
    </Section>

    <Section title="Registration Overview" action={registrationUrl && <Link className="section-link" to={registrationUrl}>View Registration History</Link>}>
      {!registration ? <EmptyState title="Missing Formal Registration Data" text="This legacy Client does not have a formal onboarding registration."/> : <DetailGrid entries={[
        ["Designation", shown(registration.designation)], ["Verification status", registration.verification_status], ["Submission date", dateTime(registration.verification_submitted_at)], ["Approval date", dateTime(registration.verified_at)], ["Reviewer", shown(registration.verified_by_name)], ["Rejection reason", shown(registration.rejection_reason)], ["Resubmissions", registration.resubmission_count ?? 0], ["Client profile ID", registration.client_profile_id],
      ]}/>} 
    </Section>

    <Section title="Company Details" action={!editing && <EditButton onClick={() => beginEdit("company")}>Edit Company/Profile</EditButton>}>
      {editing === "company" ? <CompanyEdit form={form} setForm={setForm} fieldErrors={fieldErrors} onSave={saveCompany} onCancel={cancelEdit} saving={saving}/> : company ? <DetailGrid entries={[["Legal name", company.legal_name], ["Company type", company.company_type], ["Registered address", company.registered_address], ["Country", company.country], ["Registration number", company.registration_number], ["Website", company.website ? <a href={company.website} target="_blank" rel="noreferrer">{company.website} <ExternalLink size={13}/></a> : "Not provided"], ["IMO Company Number", shown(company.imo_company_number)], ["VAT/GST/Tax number", shown(company.tax_number)]]}/> : <EmptyState title="Company information not provided" text="A Super Admin may add profile and company information without creating formal verification history."/>}
    </Section>

    <Section title="Authorised Representative">
      {company ? <DetailGrid entries={[["Name", company.authorized_representative_name], ["Designation", shown(company.authorized_representative_designation)], ["Email", company.authorized_representative_email ? <CopyableContact value={company.authorized_representative_email} href={`mailto:${company.authorized_representative_email}`} type="email"/> : "Not provided"], ["Phone", company.authorized_representative_phone ? <CopyableContact value={company.authorized_representative_phone} href={`tel:${company.authorized_representative_phone}`} type="phone"/> : "Not provided"]]}/> : <EmptyState title="Representative not provided" text="No authorised representative is recorded for this Client."/>}
    </Section>

    <Section title="Fleet Information" action={!editing && <EditButton onClick={() => beginEdit("fleet")}>Edit Fleet Information</EditButton>}>
      {editing === "fleet" ? <FleetEdit form={form} setForm={setForm} fieldErrors={fieldErrors} vesselTypes={vesselTypes} onSave={saveFleet} onCancel={cancelEdit} saving={saving}/> : <><p className="section-summary">Declared vessel count: <strong>{registration?.declared_vessel_count ?? "Not provided"}</strong></p>{data.onboarding_vessels.length ? <div className="client-vessel-list">{data.onboarding_vessels.map((vessel) => <article key={vessel.id}><div><strong>{vessel.vessel_name}</strong>{vessel.converted_vessel_id && <Link to={`/fleet?open=${vessel.converted_vessel_id}`}>Operational vessel #{vessel.converted_vessel_id}</Link>}</div><span>IMO: {shown(vessel.imo_number)}</span><span>Type: {shown(vessel.vessel_type_name || vessel.vessel_type_text)}</span><span>Relationship: {shown(vessel.ownership_relationship)}</span><span>Regions: {shown(vessel.operating_regions)}</span></article>)}</div> : <EmptyState title="No onboarding vessels" text="No fleet rows have been recorded for this Client."/>}</>}
    </Section>

    <Section title="Required Services" action={!editing && <EditButton onClick={() => beginEdit("services")}>Edit Required Services</EditButton>}>
      {editing === "services" ? <ServicesEdit form={form} setForm={setForm} fieldErrors={fieldErrors} onSave={saveServices} onCancel={cancelEdit} saving={saving}/> : data.required_services.length ? <ul className="client-services-list">{data.required_services.map((service) => <li key={service.id}><strong>{service.service_name_snapshot}</strong>{service.other_service_text && <span>{service.other_service_text}</span>}{(service.service_type_id || service.service_category_id) && <small>Type {service.service_type_id || "—"} · Category {service.service_category_id || "—"}</small>}</li>)}</ul> : <EmptyState title="No required services" text="No service selections have been recorded."/>}
    </Section>

    <Section title="Verification Documents">
      <div className="client-document-list">{DOCUMENT_CATEGORIES.map(([category, label]) => { const document = documentsByCategory[category]; return <article key={category} className={!document ? "missing" : ""}><FileText size={20}/><div><strong>{label}</strong>{document ? <><span>{document.original_filename}</span><small>{document.mime_type} · {fileSize(document.size_bytes)} · Uploaded {dateTime(document.uploaded_at)}</small></> : <span>Not provided</span>}</div>{document && <button type="button" onClick={() => openDocument(document.id)}>View Document <ExternalLink size={14}/></button>}</article>; })}</div>
    </Section>

    <Section title="Verification History">
      {data.verification_history.length ? <div className="client-history-list">{data.verification_history.map((event) => <article key={event.id}><div><strong>{shown(event.previous_status, "Initial")} → {event.new_status}</strong><time>{dateTime(event.created_at)}</time></div><span>Actor: {shown(event.actor_name)}</span>{event.public_reason && <p>{event.public_reason}</p>}{event.internal_note && <aside><strong>Administrative Note</strong><p>{event.internal_note}</p></aside>}</article>)}</div> : <EmptyState title="No verification history" text="No formal verification events have been recorded."/>}
    </Section>

    <Section title="Operational Summary"><div className="operational-summary"><Metric label="Total service requests" value={data.operational_summary.total_service_requests}/><Metric label="Active service requests" value={data.operational_summary.active_service_requests}/><Metric label="Operational vessels" value={data.operational_summary.vessel_count}/><Metric label="Accepted quotations/jobs" value={data.operational_summary.accepted_quotation_count}/><Metric label="Reviews submitted" value={data.operational_summary.review_count}/></div></Section>

    <Section title="Recent Service Requests">
      {data.recent_service_requests.length ? <div className="recent-request-list">{data.recent_service_requests.map((request) => <article key={request.id}><div><strong>{request.title}</strong><span>{request.service_type === "Other" ? `Other — ${shown(request.service_type_other)}` : `${shown(request.service_type)} · ${shown(request.service_category)}`}</span></div><div><span>{request.status} · {request.moderation_status}</span><small>Required {dateTime(request.required_by)} · Created {dateTime(request.created_at)}</small></div><Link to={`/requests/${request.id}`}>View Request</Link></article>)}</div> : <EmptyState title="No service requests" text="This Client has not created any service requests."/>}
    </Section>

    <Section title="Administrative Actions" destructive><div className="administrative-actions"><button type="button" onClick={() => beginEdit("account")}>Edit Account</button><button type="button" onClick={() => beginEdit("company")}>Edit Company/Profile</button><button type="button" onClick={() => beginEdit("fleet")}>Edit Fleet Information</button><button type="button" onClick={() => beginEdit("services")}>Edit Required Services</button>{registrationUrl && <Link to={registrationUrl}>View Registration History</Link>}<button className="danger" type="button" onClick={prepareAccountAction}>Delete or Deactivate</button></div></Section>

    {accountAction && <TypedConfirmationModal title={accountAction.mode === "delete" ? "Permanently delete Client?" : "Deactivate and anonymize Client?"} subject={account.full_name} company={company?.legal_name} warning={accountAction.mode === "delete" ? "This dependency-free account and disposable registration data will be permanently removed." : "Operational history will be preserved while login and identifying account data are removed."} dependencies={accountAction.dependencies} confirmationText={accountAction.mode === "delete" ? "DELETE" : "DEACTIVATE"} confirmLabel={accountAction.mode === "delete" ? "Permanently Delete" : "Deactivate and Anonymize"} requireReason busy={saving} error={error} onCancel={() => !saving && setAccountAction(null)} onConfirm={completeAccountAction}/>} 
  </main>;
}

function Section({ title, action, children, destructive = false }) { return <section className={`client-profile-section${destructive ? " destructive" : ""}`}><header><h2>{title}</h2>{action}</header>{children}</section>; }
function EditButton({ onClick, children }) { return <button className="section-edit" type="button" onClick={onClick}>{children}</button>; }
function StatusBadge({ value }) { return <span className={`client-verification-badge ${String(value).toLowerCase()}`}>{value}</span>; }
function DetailGrid({ entries }) { return <dl className="client-detail-grid">{entries.map(([label, value]) => <div key={label}><dt>{label}</dt><dd>{value}</dd></div>)}</dl>; }
function EmptyState({ title, text }) { return <div className="client-empty-state"><strong>{title}</strong><p>{text}</p></div>; }
function Metric({ label, value }) { return <article><strong>{Number(value || 0)}</strong><span>{label}</span></article>; }
function PageState({ message, retry }) { return <main className="admin-client-page-state"><p>{message}</p>{retry && <button type="button" onClick={retry}>Retry</button>}</main>; }
function Field({ label, value, onChange, error, type = "text", required = false, as = "input", children, disabled = false }) { const Element = as; return <label className={error ? "field-error" : ""}><span>{label}{required && <b> Required</b>}</span>{children || <Element type={as === "input" ? type : undefined} value={value ?? ""} disabled={disabled} onChange={(event) => onChange(event.target.value)}/>} {error && <small>{error}</small>}</label>; }
function EditForm({ children, onSave, onCancel, saving }) { return <div className="client-section-form"><div className="client-form-grid">{children}</div><div className="client-form-actions"><button type="button" onClick={onCancel} disabled={saving}>Cancel</button><button type="button" className="save" onClick={onSave} disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button></div></div>; }

function CompanyEdit({ form, setForm, fieldErrors, onSave, onCancel, saving }) {
  const setProfile = (field, value) => setForm({ ...form, profile: { ...form.profile, [field]: value } });
  const setCompany = (field, value) => setForm({ ...form, company: { ...form.company, [field]: value } });
  return <EditForm onSave={onSave} onCancel={onCancel} saving={saving}>
    <Field label="Designation" value={form.profile.designation} onChange={(value) => setProfile("designation", value)} error={fieldErrors["profile.designation"]}/>
    <Field label="Declared vessel count" type="number" value={form.profile.declared_vessel_count} onChange={(value) => setProfile("declared_vessel_count", value)} error={fieldErrors["profile.declared_vessel_count"]}/>
    <Field label="Company legal name" required value={form.company.legal_name} onChange={(value) => setCompany("legal_name", value)} error={fieldErrors["company.legal_name"]}/>
    <Field label="Company type" required value={form.company.company_type} onChange={(value) => setCompany("company_type", value)} error={fieldErrors["company.company_type"]}><select value={form.company.company_type} onChange={(event) => setCompany("company_type", event.target.value)}><option value="">Select company type</option>{COMPANY_TYPES.map((type) => <option key={type}>{type}</option>)}</select></Field>
    <Field label="Registered address" required as="textarea" value={form.company.registered_address} onChange={(value) => setCompany("registered_address", value)} error={fieldErrors["company.registered_address"]}/>
    <Field label="Country" required value={form.company.country} onChange={(value) => setCompany("country", value)} error={fieldErrors["company.country"]}/>
    <Field label="Registration number" required value={form.company.registration_number} onChange={(value) => setCompany("registration_number", value)} error={fieldErrors["company.registration_number"]}/>
    <Field label="Website" value={form.company.website} onChange={(value) => setCompany("website", value)} error={fieldErrors["company.website"]}/>
    <Field label="IMO Company Number" value={form.company.imo_company_number} onChange={(value) => setCompany("imo_company_number", value)} error={fieldErrors["company.imo_company_number"]}/>
    <Field label="VAT/GST/Tax number" value={form.company.tax_number} onChange={(value) => setCompany("tax_number", value)} error={fieldErrors["company.tax_number"]}/>
    <Field label="Representative name" required value={form.company.authorized_representative_name} onChange={(value) => setCompany("authorized_representative_name", value)} error={fieldErrors["company.authorized_representative_name"]}/>
    <Field label="Representative designation" value={form.company.authorized_representative_designation} onChange={(value) => setCompany("authorized_representative_designation", value)} error={fieldErrors["company.authorized_representative_designation"]}/>
    <Field label="Representative email" required type="email" value={form.company.authorized_representative_email} onChange={(value) => setCompany("authorized_representative_email", value)} error={fieldErrors["company.authorized_representative_email"]}/>
    <Field label="Representative phone" required value={form.company.authorized_representative_phone} onChange={(value) => setCompany("authorized_representative_phone", value)} error={fieldErrors["company.authorized_representative_phone"]}/>
  </EditForm>;
}

function FleetEdit({ form, setForm, fieldErrors, vesselTypes, onSave, onCancel, saving }) {
  const update = (index, field, value) => setForm({ ...form, vessels: form.vessels.map((vessel, position) => position === index ? { ...vessel, [field]: value } : vessel) });
  return <div className="client-section-form"><div className="client-form-grid"><Field label="Declared vessel count" type="number" value={form.declared_vessel_count} onChange={(value) => setForm({ ...form, declared_vessel_count: value })} error={fieldErrors.declared_vessel_count}/></div><div className="fleet-edit-list">{form.vessels.map((vessel, index) => <article key={vessel.id || `new-${index}`}><header><strong>Vessel {index + 1}</strong>{vessel.converted_vessel_id ? <span>Managed in operational vessel workflow</span> : <button type="button" onClick={() => setForm({ ...form, vessels: form.vessels.filter((_, position) => position !== index) })}><Trash2 size={15}/> Remove</button>}</header><div className="client-form-grid">
    <Field label="Vessel name" required disabled={Boolean(vessel.converted_vessel_id)} value={vessel.vessel_name} onChange={(value) => update(index, "vessel_name", value)} error={fieldErrors[`vessels.${index}.vessel_name`]}/>
    <Field label="IMO number" disabled={Boolean(vessel.converted_vessel_id)} value={vessel.imo_number} onChange={(value) => update(index, "imo_number", value)} error={fieldErrors[`vessels.${index}.imo_number`]}/>
    <Field label="Vessel type" value={vessel.vessel_type_id} onChange={(value) => update(index, "vessel_type_id", value)} error={fieldErrors[`vessels.${index}.vessel_type_id`]}><select disabled={Boolean(vessel.converted_vessel_id)} value={vessel.vessel_type_id || ""} onChange={(event) => update(index, "vessel_type_id", event.target.value)}><option value="">Select vessel type</option>{vesselTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></Field>
    <Field label="Other vessel type" disabled={Boolean(vessel.converted_vessel_id)} value={vessel.vessel_type_text} onChange={(value) => update(index, "vessel_type_text", value)}/>
    <Field label="Ownership/management relationship" required disabled={Boolean(vessel.converted_vessel_id)} value={vessel.ownership_relationship} onChange={(value) => update(index, "ownership_relationship", value)} error={fieldErrors[`vessels.${index}.ownership_relationship`]}/>
    <Field label="Operating regions" disabled={Boolean(vessel.converted_vessel_id)} value={vessel.operating_regions} onChange={(value) => update(index, "operating_regions", value)}/>
  </div></article>)}</div><button className="add-row" type="button" onClick={() => setForm({ ...form, vessels: [...form.vessels, blankVessel()] })}><Plus size={16}/> Add Vessel</button><div className="client-form-actions"><button type="button" onClick={onCancel} disabled={saving}>Cancel</button><button type="button" className="save" onClick={onSave} disabled={saving}>{saving ? "Saving..." : "Save Fleet"}</button></div></div>;
}

function ServicesEdit({ form, setForm, fieldErrors, onSave, onCancel, saving }) {
  const update = (index, field, value) => setForm({ ...form, services: form.services.map((service, position) => position === index ? { ...service, [field]: value } : service) });
  return <div className="client-section-form"><datalist id="client-service-labels">{SERVICE_LABELS.map((label) => <option key={label} value={label}/>)}</datalist><div className="service-edit-list">{form.services.map((service, index) => <article key={service.id || `new-${index}`}><div className="client-form-grid"><Field label="Service name" required value={service.service_name_snapshot} onChange={(value) => update(index, "service_name_snapshot", value)} error={fieldErrors[`services.${index}.service_name_snapshot`]}><input list="client-service-labels" value={service.service_name_snapshot} onChange={(event) => update(index, "service_name_snapshot", event.target.value)}/></Field><Field label="Other service details" value={service.other_service_text} onChange={(value) => update(index, "other_service_text", value)}/></div><button type="button" onClick={() => setForm({ ...form, services: form.services.filter((_, position) => position !== index) })}><Trash2 size={15}/> Remove</button></article>)}</div><button className="add-row" type="button" onClick={() => setForm({ ...form, services: [...form.services, blankService()] })}><Plus size={16}/> Add Service</button><div className="client-form-actions"><button type="button" onClick={onCancel} disabled={saving}>Cancel</button><button type="button" className="save" onClick={onSave} disabled={saving}>{saving ? "Saving..." : "Save Services"}</button></div></div>;
}
