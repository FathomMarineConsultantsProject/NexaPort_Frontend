import { Building2, CheckCircle2, Clock3, Plus, Save, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import { confirmCompanyLogoUpload, createCompanyLogoUpload, getCompanyProfile, updateCompanyProfile } from "../api/maritimeCompanyApi";
import "./CompanyProfile.css";

const TYPES = [
  ["service_provider", "Service Provider"],
  ["ship_agent", "Ship Agent"],
  ["supplier", "Supplier"],
];

const SECTIONS = {
  services: { title: "Services", fields: [["serviceName", "Service name"], ["category", "Category"], ["serviceType", "Service type"], ["serviceDescription", "Description"]] },
  ports: { title: "Ports Covered", fields: [["portName", "Port name"], ["country", "Country"], ["unlocode", "UN/LOCODE"], ["sourcePortText", "Port details"]] },
  products: { title: "Products", fields: [["productName", "Product name"], ["category", "Category"], ["manufacturer", "Manufacturer"]] },
  branches: { title: "Branches / Offices", fields: [["branchName", "Branch name"], ["branchType", "Branch type"], ["publicAddress", "Address"], ["city", "City"], ["country", "Country"], ["publicTelephone", "Telephone"], ["publicEmail", "Email"]] },
  certifications: { title: "Certifications", fields: [["certificationName", "Certification"], ["standardCode", "Standard code"], ["issuer", "Issuer"], ["expiryDate", "Expiry date", "date"]] },
  classApprovals: { title: "Class Approvals", fields: [["societyName", "Society"], ["approvalDetails", "Approval details"]] },
  memberships: { title: "Memberships", fields: [["organizationName", "Organization"], ["membershipDetails", "Membership details"]] },
  faqs: { title: "FAQs", fields: [["question", "Question"], ["answer", "Answer"]] },
};

const snake = (key) => key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
const fields = [["companyName","Company name"],["country","Country"],["city","City"],["publicAddress","Public address"],["publicEmail","Public email","email"],["publicPhone","Public phone"],["website","Website"],["description","Company description","textarea"]];
const blankCompany = Object.fromEntries(fields.map(([key]) => [key, ""]));
const emptyRow = (sectionFields) => Object.fromEntries(sectionFields.map(([key]) => [key, ""]));

function RepeatableSection({ name, title, fields, rows, errors, onChange }) {
  const add = () => onChange([...rows, emptyRow(fields)]);
  return <section className="company-repeatable" id={`company-${name}`}>
    <div className="company-repeatable__head"><h3>{title}</h3><button type="button" onClick={add}><Plus size={15} /> Add</button></div>
    {!rows.length ? <p className="company-repeatable__empty">Optional — no rows added.</p> : rows.map((row, index) => <div className="company-repeatable__row" key={row.id || index}>
      <div className="company-repeatable__fields">{fields.map(([key, label, type]) => <label key={key}><span>{label}</span><input type={type || "text"} value={row[key] ?? ""} onChange={(event) => onChange(rows.map((item, pos) => pos === index ? { ...item, [key]: event.target.value } : item))} />{errors[`${name}.${index}.${key}`] && <small>{errors[`${name}.${index}.${key}`]}</small>}</label>)}</div>
      <button type="button" className="company-repeatable__remove" aria-label={`Remove ${title} row ${index + 1}`} onClick={() => onChange(rows.filter((_, pos) => pos !== index))}><Trash2 size={16} /> Remove</button>
    </div>)}
  </section>;
}

export default function CompanyProfile() {
  const [company, setCompany] = useState(blankCompany);
  const [directoryTypes, setDirectoryTypes] = useState([]);
  const [status, setStatus] = useState("pending");
  const [collections, setCollections] = useState(Object.fromEntries(Object.keys(SECTIONS).map((key) => [key, []])));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [errors, setErrors] = useState({});
  const [logo, setLogo] = useState(null);

  useEffect(() => {
    let active = true;
    getCompanyProfile().then((response) => {
      if (!active) return;
      const detail = response.data;
      setCompany(Object.fromEntries(fields.map(([key]) => [key, detail.entity[snake(key)] ?? ""])));
      setDirectoryTypes(detail.directory_types || [detail.account.primary_type]);
      setStatus(detail.entity.review_status || detail.account.review_status);
      const loadedCollections = {};
      for (const [key, config] of Object.entries(SECTIONS)) {
        const rows = detail[snake(key)] || [];
        loadedCollections[key] = rows.map((row) => ({ id: row.id, ...Object.fromEntries(config.fields.map(([fKey]) => [fKey, row[snake(fKey)] ?? ""])) }));
      }
      setCollections(loadedCollections);
    }).catch((error) => active && setMessage(error.response?.data?.message || "Unable to load the company profile.")).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);

  const toggleType = (type) => {
    if (directoryTypes.includes(type)) {
      if (directoryTypes.length <= 1) {
        setErrors({ directoryTypes: "At least one company type must remain." });
        return;
      }
      setDirectoryTypes(directoryTypes.filter((t) => t !== type));
    } else {
      setDirectoryTypes([...directoryTypes, type]);
    }
    setErrors((prev) => { const next = { ...prev }; delete next.directoryTypes; return next; });
  };

  const save = async (event) => {
    event.preventDefault(); setSaving(true); setMessage(""); setErrors({});
    if (!directoryTypes.length) {
      setErrors({ directoryTypes: "At least one company type must remain." });
      setSaving(false);
      return;
    }
    try {
      const response = await updateCompanyProfile({ company, directoryTypes, ...collections });
      if (logo) {
        const upload = await createCompanyLogoUpload({ contentType: logo.type, size: logo.size });
        const put = await fetch(upload.data.uploadUrl, { method: "PUT", headers: { "content-type": logo.type }, body: logo });
        if (!put.ok) throw new Error("Logo upload failed.");
        await confirmCompanyLogoUpload({ key: upload.data.key, contentType: logo.type, size: logo.size });
        setLogo(null);
      }
      setStatus(response.data.entity.review_status); setMessage("Company profile saved.");
    } catch (error) { setErrors(error.response?.data?.field_errors || {}); setMessage(error.response?.data?.message || "Unable to save the company profile."); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="company-workspace"><div className="company-workspace__loading">Loading company profile...</div></div>;
  const approved = status === "approved";

  return <div className="company-workspace">
    <header className="company-workspace__hero"><div><small>Company workspace</small><h1>{company.companyName || "Maritime Company"}</h1><p>Maintain the public directory information mariners use to find your business.</p></div><div className={`company-status ${approved ? "approved" : "pending"}`}>{approved ? <CheckCircle2 size={18} /> : <Clock3 size={18} />}<span><small>Approval status</small><strong>{status}</strong></span></div></header>
    <nav className="company-workspace__nav" aria-label="Company profile sections">
      <a href="#company-overview">Overview</a>
      {Object.entries(SECTIONS).map(([name, config]) => <a key={name} href={`#company-${name}`}>{config.title}</a>)}
    </nav>
    {!approved && <div className="company-workspace__notice"><Clock3 size={18} /><span><strong>Your profile is under review.</strong> You can keep editing it. It will appear publicly after Super Admin approval.</span></div>}
    {message && <div className="company-workspace__message" role="status">{message}</div>}
    <form onSubmit={save} className="company-workspace__form">
      <section id="company-overview">
        <div className="company-section-head">
          <span><Building2 size={18} /></span>
          <div><h2>Company profile</h2><p>Select all categories that describe your company's operations.</p></div>
        </div>
        <div className="company-type-select-row" aria-label="Company categories">
          {TYPES.map(([typeValue, label]) => (
            <label key={typeValue} className={`company-type-chip ${directoryTypes.includes(typeValue) ? "selected" : ""}`}>
              <input type="checkbox" checked={directoryTypes.includes(typeValue)} onChange={() => toggleType(typeValue)} />
              <span>{label}</span>
            </label>
          ))}
        </div>
        {errors.directoryTypes && <p className="company-field-error">{errors.directoryTypes}</p>}
        <div className="company-form-grid">
          {fields.map(([key,label,inputType]) => <label key={key} className={inputType === "textarea" ? "wide" : ""}><span>{label}{key === "companyName" ? " *" : ""}</span>{inputType === "textarea" ? <textarea value={company[key]} onChange={(event) => setCompany({ ...company, [key]: event.target.value })} /> : <input type={inputType || "text"} value={company[key]} onChange={(event) => setCompany({ ...company, [key]: event.target.value })} />}{errors[`company.${key}`] && <small>{errors[`company.${key}`]}</small>}</label>)}
          <label className="wide"><span>Company logo <small>JPEG, PNG, or WebP · max 5 MB</small></span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setLogo(event.target.files?.[0] || null)} />{errors.logo && <small>{errors.logo}</small>}</label>
        </div>
      </section>

      {Object.entries(SECTIONS).map(([name, config]) => <RepeatableSection key={name} name={name} title={config.title} fields={config.fields} rows={collections[name] || []} errors={errors} onChange={(rows) => setCollections({ ...collections, [name]: rows })} />)}

      <div className="company-workspace__actions"><button type="submit" disabled={saving}><Save size={17} /> {saving ? "Saving..." : "Save profile"}</button></div>
    </form>
  </div>;
}
