import { Anchor, ArrowLeft, ArrowRight, Building2, Check } from "lucide-react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { confirmCompanyLogoUpload, createCompanyLogoUpload, registerMaritimeCompany } from "../api/maritimeCompanyApi";
import "./MaritimeCompany.css";

const TYPES = [
  ["service_provider", "Service Provider", "Technical, repair, logistics, and marine support services."],
  ["ship_agent", "Ship Agent", "Port agency and vessel call coordination."],
  ["supplier", "Supplier", "Marine equipment, stores, spares, and provisions."],
];
const initial = { account: { fullName: "", email: "", username: "", password: "", confirmPassword: "", phone: "" }, company: { companyName: "", country: "", city: "", publicAddress: "", publicEmail: "", publicPhone: "", website: "", description: "" }, directoryTypes: [] };
const rows = (text, key) => String(text || "").split("\n").map((value) => value.trim()).filter(Boolean).map((value) => ({ [key]: value }));

export default function RegisterMaritimeCompany() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [form, setForm] = useState(initial);
  const [lists, setLists] = useState({ services: "", products: "", ports: "" });
  const [errors, setErrors] = useState({});
  const [message, setMessage] = useState("");
  const [saving, setSaving] = useState(false);
  const [logo, setLogo] = useState(null);
  const setAccount = (key, value) => setForm((current) => ({ ...current, account: { ...current.account, [key]: value } }));
  const setCompany = (key, value) => setForm((current) => ({ ...current, company: { ...current.company, [key]: value } }));
  const next = () => {
    const nextErrors = {};
    if (!form.account.fullName.trim()) nextErrors["account.fullName"] = "Contact name is required.";
    if (!/^\S+@\S+\.\S+$/.test(form.account.email)) nextErrors["account.email"] = "Enter a valid email.";
    if (!form.account.username.trim()) nextErrors["account.username"] = "Username is required.";
    if (form.account.password.length < 8 || !/[A-Za-z]/.test(form.account.password) || !/\d/.test(form.account.password)) nextErrors["account.password"] = "Use 8+ characters with letters and numbers.";
    if (form.account.confirmPassword !== form.account.password) nextErrors["account.confirmPassword"] = "Passwords do not match.";
    if (!form.company.companyName.trim()) nextErrors["company.companyName"] = "Company name is required.";
    if (form.directoryTypes.length !== 1) nextErrors.directoryTypes = "Choose one company type.";
    setErrors(nextErrors);
    if (!Object.keys(nextErrors).length) setStep(2);
  };
  const submit = async (event) => {
    event.preventDefault(); setSaving(true); setErrors({}); setMessage("");
    if (logo && (!["image/jpeg", "image/png", "image/webp"].includes(logo.type) || logo.size > 5 * 1024 * 1024)) {
      setErrors({ logo: "Use a JPEG, PNG, or WebP image up to 5 MB." }); setSaving(false); return;
    }
    try {
      const response = await registerMaritimeCompany({ ...form, services: rows(lists.services, "serviceName"), products: rows(lists.products, "productName"), ports: rows(lists.ports, "portName"), branches: [], certifications: [], classApprovals: [], memberships: [], faqs: [] });
      localStorage.setItem("np_token", response.token); localStorage.setItem("np_user", JSON.stringify(response.user));
      if (logo) {
        try {
          const upload = await createCompanyLogoUpload({ contentType: logo.type, size: logo.size });
          const put = await fetch(upload.data.uploadUrl, { method: "PUT", headers: { "content-type": logo.type }, body: logo });
          if (put.ok) await confirmCompanyLogoUpload({ key: upload.data.key, contentType: logo.type, size: logo.size });
        } catch { /* Logo is optional and can be retried from the company workspace. */ }
      }
      navigate("/company-profile", { replace: true });
    } catch (error) { setErrors(error.response?.data?.field_errors || {}); setMessage(error.response?.data?.message || "Unable to submit the company registration."); }
    finally { setSaving(false); }
  };
  return <main className="company-onboarding">
    <Link className="company-brand" to="/"><Anchor size={20} /> Nexa<span>Port</span></Link>
    <section className="company-onboarding__card">
      <div className="company-progress"><span className="active"><b>{step > 1 ? <Check size={14} /> : "1"}</b> Account</span><i /><span className={step === 2 ? "active" : ""}><b>2</b> Company profile</span></div>
      {step === 1 ? <>
        <header><small>Maritime company registration</small><h1>What type of maritime company are you registering?</h1><p>Choose one directory category, then add your account and company identity.</p></header>
        <div className="company-type-grid">{TYPES.map(([value, title, description]) => <label key={value} className={form.directoryTypes[0] === value ? "selected" : ""}><input type="radio" name="companyType" checked={form.directoryTypes[0] === value} onChange={() => setForm({ ...form, directoryTypes: [value] })} /><Building2 size={20} /><strong>{title}</strong><small>{description}</small></label>)}</div>
        {errors.directoryTypes && <p className="company-field-error">{errors.directoryTypes}</p>}
        <div className="company-form-grid">{[["fullName","Contact name"],["email","Business email","email"],["username","Username"],["phone","Phone (optional)"],["password","Password","password"],["confirmPassword","Confirm password","password"]].map(([key,label,type]) => <label key={key}><span>{label}</span><input type={type || "text"} value={form.account[key]} onChange={(event) => setAccount(key,event.target.value)} />{errors[`account.${key}`] && <small>{errors[`account.${key}`]}</small>}</label>)}</div>
        <div className="company-form-grid company-identity-grid">{[["companyName","Company name *"],["country","Country"],["city","City"]].map(([key,label]) => <label key={key}><span>{label}</span><input value={form.company[key]} onChange={(event) => setCompany(key,event.target.value)} />{errors[`company.${key}`] && <small>{errors[`company.${key}`]}</small>}</label>)}</div>
        <div className="company-actions"><Link to="/login"><ArrowLeft size={16} /> Back</Link><button type="button" onClick={next}>Continue <ArrowRight size={16} /></button></div>
      </> : <form onSubmit={submit}>
        <header><small>Profile and review</small><h1>Tell mariners what you do</h1><p>Only the company name is required. Add useful directory details now or update them after signing in.</p></header>
        {message && <div className="company-message" role="alert">{message}</div>}
        <div className="company-form-grid">{[["publicAddress","Public address"],["publicEmail","Public email","email"],["publicPhone","Public phone"],["website","Website"],["description","Company description","textarea"]].map(([key,label,type]) => <label key={key} className={type === "textarea" ? "wide" : ""}><span>{label}</span>{type === "textarea" ? <textarea value={form.company[key]} onChange={(event) => setCompany(key,event.target.value)} /> : <input type={type || "text"} value={form.company[key]} onChange={(event) => setCompany(key,event.target.value)} />}{errors[`company.${key}`] && <small>{errors[`company.${key}`]}</small>}</label>)}</div>
        <div className="company-list-grid">{[["services","Services"],["products","Products"],["ports","Ports served"]].map(([key,label]) => <label key={key}><span>{label} <small>one per line</small></span><textarea value={lists[key]} onChange={(event) => setLists({ ...lists, [key]: event.target.value })} /></label>)}</div>
        <div className="company-form-grid company-logo-field"><label className="wide"><span>Company logo <small>optional · JPEG, PNG, or WebP · max 5 MB</small></span><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setLogo(event.target.files?.[0] || null)} />{errors.logo && <small>{errors.logo}</small>}</label></div>
        <div className="company-review-note"><strong>What happens next?</strong><p>Your profile will be marked Pending review. You may sign in and edit it immediately; it becomes visible in the directory after Super Admin approval.</p></div>
        <div className="company-actions"><button className="secondary" type="button" onClick={() => setStep(1)}><ArrowLeft size={16} /> Back</button><button type="submit" disabled={saving}>{saving ? "Submitting..." : "Submit for review"}</button></div>
      </form>}
    </section>
  </main>;
}
