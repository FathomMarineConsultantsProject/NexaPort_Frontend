import { Building2, CheckCircle2, Clock3, Save } from "lucide-react";
import { useEffect, useState } from "react";
import { confirmCompanyLogoUpload, createCompanyLogoUpload, getCompanyProfile, updateCompanyProfile } from "../api/maritimeCompanyApi";
import "./CompanyProfile.css";

const snake = (key) => key.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
const fields = [["companyName","Company name"],["country","Country"],["city","City"],["publicAddress","Public address"],["publicEmail","Public email","email"],["publicPhone","Public phone"],["website","Website"],["description","Company description","textarea"]];
const blank = Object.fromEntries(fields.map(([key]) => [key, ""]));
const lines = (items, field) => (items || []).map((item) => item[snake(field)]).filter(Boolean).join("\n");
const rows = (text, key) => String(text || "").split("\n").map((value) => value.trim()).filter(Boolean).map((value) => ({ [key]: value }));

export default function CompanyProfile() {
  const [company, setCompany] = useState(blank);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("pending");
  const [lists, setLists] = useState({ services: "", products: "", ports: "" });
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
      setType(detail.account.primary_type); setStatus(detail.account.review_status);
      setLists({ services: lines(detail.services,"serviceName"), products: lines(detail.products,"productName"), ports: lines(detail.ports,"portName") });
    }).catch((error) => active && setMessage(error.response?.data?.message || "Unable to load the company profile.")).finally(() => active && setLoading(false));
    return () => { active = false; };
  }, []);
  const save = async (event) => {
    event.preventDefault(); setSaving(true); setMessage(""); setErrors({});
    try {
      const response = await updateCompanyProfile({ company, directoryTypes: [type], services: rows(lists.services,"serviceName"), products: rows(lists.products,"productName"), ports: rows(lists.ports,"portName") });
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
    {!approved && <div className="company-workspace__notice"><Clock3 size={18} /><span><strong>Your profile is under review.</strong> You can keep editing it. It will appear publicly after Super Admin approval.</span></div>}
    {message && <div className="company-workspace__message" role="status">{message}</div>}
    <form onSubmit={save} className="company-workspace__form">
      <section><div className="company-section-head"><span><Building2 size={18} /></span><div><h2>Company profile</h2><p>Registered as <strong>{type.replaceAll("_", " ")}</strong>. This category is fixed to keep directory ownership clear.</p></div></div><div className="company-form-grid">{fields.map(([key,label,inputType]) => <label key={key} className={inputType === "textarea" ? "wide" : ""}><span>{label}{key === "companyName" ? " *" : ""}</span>{inputType === "textarea" ? <textarea value={company[key]} onChange={(event) => setCompany({ ...company, [key]: event.target.value })} /> : <input type={inputType || "text"} value={company[key]} onChange={(event) => setCompany({ ...company, [key]: event.target.value })} />}{errors[`company.${key}`] && <small>{errors[`company.${key}`]}</small>}</label>)}<label className="wide"><span>Company logo <small>JPEG, PNG, or WebP · max 5 MB</small></span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setLogo(event.target.files?.[0] || null)} />{errors.logo && <small>{errors.logo}</small>}</label></div></section>
      <section><div className="company-section-head"><div><h2>Directory coverage</h2><p>Add one service, product, or port per line. Leave sections that do not apply blank.</p></div></div><div className="company-list-grid">{[["services","Services"],["products","Products"],["ports","Ports served"]].map(([key,label]) => <label key={key}><span>{label}</span><textarea value={lists[key]} onChange={(event) => setLists({ ...lists, [key]: event.target.value })} /></label>)}</div></section>
      <div className="company-workspace__actions"><button type="submit" disabled={saving}><Save size={17} /> {saving ? "Saving..." : "Save profile"}</button></div>
    </form>
  </div>;
}
