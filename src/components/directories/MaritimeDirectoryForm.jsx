import { ArrowLeft, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { createMaritimeDirectoryEntity, getMaritimeDirectoryEntity, updateMaritimeDirectoryEntity } from "../../api/maritimeDirectoryApi";
import { NEW_ADMIN_DIRECTORIES } from "../../config/adminDirectories";
import "./MaritimeDirectoryForm.css";

const TYPES = NEW_ADMIN_DIRECTORIES.map(({ type, label }) => [type, label]);
const COMPANY_FIELDS = [
  ["companyName", "Company name", true], ["logoUrl", "Logo URL"], ["country", "Country"], ["city", "City"],
  ["publicAddress", "Public address"], ["publicEmail", "Public email", false, "email"], ["publicPhone", "Public phone"], ["website", "Website"],
  ["claimedStatus", "Claimed status"], ["yearsExperience", "Years of experience", false, "number"], ["vesselsHandled", "Vessels handled", false, "number"],
  ["description", "Description", false, "textarea"],
];
const SECTIONS = {
  services: ["Services", [["serviceName", "Service name"], ["category", "Category"], ["serviceType", "Service type"], ["serviceDescription", "Description"]]],
  ports: ["Ports", [["portName", "Port name"], ["country", "Country"], ["unlocode", "UN/LOCODE"], ["sourcePortText", "Port details"]]],
  branches: ["Branches", [["branchName", "Branch name"], ["branchType", "Branch type"], ["publicAddress", "Address"], ["city", "City"], ["country", "Country"], ["publicTelephone", "Telephone"], ["publicEmail", "Email"]]],
  certifications: ["Certifications", [["certificationName", "Certification"], ["standardCode", "Standard code"], ["issuer", "Issuer"], ["certificateImageUrl", "Image URL"], ["expiryDate", "Expiry date", "date"]]],
  classApprovals: ["Class Approvals", [["societyName", "Society"], ["approvalDetails", "Approval details"], ["logoUrl", "Logo URL"]]],
  memberships: ["Memberships", [["organizationName", "Organization"], ["membershipDetails", "Membership details"], ["logoUrl", "Logo URL"]]],
  products: ["Products", [["productName", "Product name"], ["category", "Category"], ["manufacturer", "Manufacturer"]]],
  faqs: ["FAQs", [["question", "Question"], ["answer", "Answer"]]],
};
const EMPTY = { company: Object.fromEntries(COMPANY_FIELDS.map(([key]) => [key, ""])), directoryTypes: [], ...Object.fromEntries(Object.keys(SECTIONS).map((key) => [key, []])) };
const snake = (key) => key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);

const Field = ({ label, type = "text", value, onChange, error }) => <label className={type === "textarea" ? "wide" : ""}><span>{label}</span>{type === "textarea" ? <textarea value={value ?? ""} onChange={(event) => onChange(event.target.value)} /> : <input type={type} min={type === "number" ? "0" : undefined} value={value ?? ""} onChange={(event) => onChange(event.target.value)} />}{error && <small>{error}</small>}</label>;

function RepeatableSection({ name, title, fields, rows, errors, onChange }) {
  const add = () => onChange([...rows, Object.fromEntries(fields.map(([key]) => [key, ""]))]);
  return <section className="maritime-form__section"><div className="maritime-form__section-head"><h2>{title}</h2><button type="button" onClick={add}><Plus size={15} /> Add</button></div>{!rows.length ? <p className="maritime-form__optional">Optional — no rows added.</p> : rows.map((row, index) => <div className="maritime-form__repeat" key={row.id || index}><div>{fields.map(([key, label, type]) => <Field key={key} field={key} label={label} type={type} value={row[key]} error={errors[`${name}.${index}.${key}`]} onChange={(value) => onChange(rows.map((item, position) => position === index ? { ...item, [key]: value } : item))} />)}</div>{row.sourceRecordKey ? <small className="maritime-form__imported">Imported row — source identity is preserved.</small> : <button type="button" className="maritime-form__remove" aria-label={`Remove ${title} row ${index + 1}`} onClick={() => onChange(rows.filter((_, position) => position !== index))}><Trash2 size={16} /> Remove</button>}</div>)}</section>;
}

const fromDetail = (detail) => ({
  company: Object.fromEntries(COMPANY_FIELDS.map(([key]) => [key, detail.entity[snake(key)] ?? ""])),
  directoryTypes: detail.directory_types,
  ...Object.fromEntries(Object.entries(SECTIONS).map(([key, [, fields]]) => [key, (detail[snake(key)] || []).map((row) => ({ id: row.id, sourceRecordKey: row.source_record_key, ...Object.fromEntries(fields.map(([field]) => [field, row[snake(field)] ?? ""])) }))])),
});

export default function MaritimeDirectoryForm() {
  const { directoryType, entityId } = useParams();
  const navigate = useNavigate();
  const editing = Boolean(entityId);
  const directory = NEW_ADMIN_DIRECTORIES.find((item) => item.type === directoryType);
  const [form, setForm] = useState(() => ({ ...EMPTY, company: { ...EMPTY.company }, directoryTypes: directory ? [directory.type] : [] }));
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(editing);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!editing) return;
    let active = true;
    getMaritimeDirectoryEntity(entityId).then((response) => { if (active) setForm(fromDetail(response.data)); }).catch((error) => { if (active) setMessage(error.response?.data?.message || "Unable to load this entry."); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [editing, entityId]);

  if (!directory) return <main className="maritime-form"><p>Unsupported directory type.</p></main>;
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setErrors({}); setMessage("");
    try {
      const response = editing ? await updateMaritimeDirectoryEntity(entityId, form) : await createMaritimeDirectoryEntity(form);
      navigate(`/directories/${directoryType}/${response.data.entity.id}`, { replace: true });
    } catch (error) {
      setErrors(error.response?.data?.field_errors || {}); setMessage(error.response?.data?.message || "Unable to save this directory entry.");
    } finally { setSaving(false); }
  };

  return <main className="maritime-form"><button type="button" className="maritime-form__back" onClick={() => navigate(editing ? `/directories/${directoryType}/${entityId}` : directory.path)}><ArrowLeft size={16} /> Back</button><header><small>Super Admin</small><h1>{editing ? `Edit ${form.company.companyName || "Directory Entry"}` : `Add ${directory.label.replace(/s$/, "")}`}</h1><p>Create one canonical company record and assign it to one or more administrative directories.</p></header>{message && <div className="maritime-form__message" role="alert">{message}</div>}{loading ? <div className="maritime-form__loading">Loading entry...</div> : <form onSubmit={submit}>
    <section className="maritime-form__section"><h2>Company Details</h2><div className="maritime-form__grid">{COMPANY_FIELDS.map(([key, label, required, type]) => <Field key={key} field={key} label={`${label}${required ? " *" : ""}`} type={type} value={form.company[key]} error={errors[`company.${key}`]} onChange={(value) => setForm({ ...form, company: { ...form.company, [key]: value } })} />)}</div></section>
    <section className="maritime-form__section"><h2>Directory Types</h2><div className="maritime-form__checks">{TYPES.map(([type, label]) => <label key={type}><input type="checkbox" checked={form.directoryTypes.includes(type)} onChange={(event) => setForm({ ...form, directoryTypes: event.target.checked ? [...form.directoryTypes, type] : form.directoryTypes.filter((item) => item !== type) })} /> {label}</label>)}</div>{errors.directoryTypes && <small className="maritime-form__field-error">{errors.directoryTypes}</small>}</section>
    {Object.entries(SECTIONS).map(([name, [title, fields]]) => <RepeatableSection key={name} name={name} title={title} fields={fields} rows={form[name]} errors={errors} onChange={(rows) => setForm({ ...form, [name]: rows })} />)}
    <div className="maritime-form__actions"><button type="button" onClick={() => navigate(directory.path)}>Cancel</button><button type="submit" disabled={saving}>{saving ? "Saving..." : editing ? "Save Changes" : "Create Entry"}</button></div>
  </form>}</main>;
}
