import { Anchor, Check, ChevronLeft, ChevronRight, Plus, Trash2, Upload } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getVesselTypes } from "../api/masterApi";
import {
  confirmAdminRegistrationDocument,
  confirmRegistrationDocument,
  createAdminClientRegistrationDraft,
  createClientRegistrationDraft,
  presignAdminRegistrationDocument,
  presignRegistrationDocument,
  submitAdminClientRegistration,
  submitClientRegistration,
  uploadToPresignedUrl,
} from "../api/clientRegistrationApi";
import "./RegisterClient.css";

const STEPS = ["User Details", "Company Details", "Fleet Information", "Required Services", "Verification"];
const COMPANY_TYPES = ["Ship Owner", "Ship Manager", "Charterer", "Broker", "Bank", "Insurer", "Other"];
const SERVICES = ["Condition Inspection", "Pre-Purchase Inspection", "Pre-Charter Inspection", "SIRE 2.0 Preparation", "RightShip Inspection", "ISM / ISPS / MLC Audit", "Flag-State Inspection", "Dry-Dock Attendance", "Technical Consultancy", "Marine Warranty or specialist surveys"];
const DOCUMENTS = [
  ["company_registration_certificate", "Company registration certificate"],
  ["authorisation_letter", "Authorisation letter"],
  ["company_identification_or_tax_certificate", "Company identification or tax certificate"],
];
const blankVessel = () => ({ vessel_name: "", imo_number: "", vessel_type_id: "", vessel_type_text: "", ownership_relationship: "", operating_regions: "" });
const initialForm = {
  full_name: "", designation: "", email: "", mobile_number: "", password: "", confirmPassword: "",
  company: { legal_name: "", company_type: "", registered_address: "", country: "", registration_number: "", website: "", imo_company_number: "", tax_number: "", authorized_representative_name: "", authorized_representative_designation: "", authorized_representative_email: "", authorized_representative_phone: "" },
  declared_vessel_count: "", vessels: [blankVessel()], provideFleetLater: false, services: [],
};

const validImo = (value) => {
  if (!value.trim()) return true;
  const digits = value.replace(/^IMO\s*/i, "").replace(/\s/g, "");
  if (!/^\d{7}$/.test(digits)) return false;
  const total = digits.slice(0, 6).split("").reduce((sum, digit, index) => sum + Number(digit) * (7 - index), 0);
  return total % 10 === Number(digits[6]);
};

export default function RegisterClient({
  adminMode = false
}) {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState(initialForm);
  const [vesselTypes, setVesselTypes] = useState([]);
  const [registrationDraftToken, setRegistrationDraftToken] = useState("");
  const [draftEmail, setDraftEmail] = useState("");
  const [documents, setDocuments] = useState({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => { getVesselTypes().then((response) => setVesselTypes(response.data || [])).catch(() => setVesselTypes([])); }, []);

  const setValue = (name, value) => setForm((current) => ({ ...current, [name]: value }));
  const setCompany = (name, value) => setForm((current) => ({ ...current, company: { ...current.company, [name]: value } }));
  const updateVessel = (index, name, value) => setForm((current) => ({ ...current, vessels: current.vessels.map((vessel, vesselIndex) => vesselIndex === index ? { ...vessel, [name]: value } : vessel) }));
  const validateStep = () => {
    if (step === 0) {
      if (!form.full_name.trim() || !form.designation.trim() || !/^\S+@\S+\.\S+$/.test(form.email) || !form.mobile_number.trim()) return "Complete all required user details.";
      if (form.password.length < 8 || !/[A-Za-z]/.test(form.password) || !/\d/.test(form.password)) return "Password must have at least 8 characters with letters and numbers.";
      if (form.password !== form.confirmPassword) return "Passwords do not match.";
    }
    if (step === 1) {
      const company = form.company;
      if (!company.legal_name.trim() || !company.company_type || !company.registered_address.trim() || !company.country.trim() || !company.registration_number.trim() || !company.authorized_representative_name.trim() || !/^\S+@\S+\.\S+$/.test(company.authorized_representative_email) || !company.authorized_representative_phone.trim()) return "Complete all required company and representative details.";
      if (company.website && !/^https?:\/\//i.test(company.website)) return "Website must begin with http:// or https://.";
    }
    if (step === 2) {
      if (form.declared_vessel_count === "" || Number(form.declared_vessel_count) < 0) return "Enter the number of vessels.";
      if (!form.provideFleetLater && form.vessels.some((vessel) => !vessel.vessel_name.trim() || !vessel.ownership_relationship.trim() || !validImo(vessel.imo_number))) return "Complete each key vessel and check any IMO number.";
    }
    if (step === 3 && !form.services.length) return "Select at least one required service.";
    return "";
  };

  const next = async () => {
    const error = validateStep();
    if (error) return setMessage(error);
    setMessage("");
    if (step === 0 && (!registrationDraftToken || draftEmail !== form.email.trim().toLowerCase())) {
      setBusy(true);
      try {
        const response = adminMode
          ? await createAdminClientRegistrationDraft(form.email)
          : await createClientRegistrationDraft(form.email);
        setRegistrationDraftToken(response.registrationDraftToken);
        setDraftEmail(form.email.trim().toLowerCase());
        setDocuments({});
      } catch (requestError) {
        setMessage(requestError.response?.data?.message || "Unable to start registration.");
        return;
      } finally {
        setBusy(false);
      }
    }
    setStep((value) => Math.min(STEPS.length - 1, value + 1));
    window.scrollTo(0, 0);
  };
  const back = () => { setMessage(""); setStep((value) => Math.max(0, value - 1)); window.scrollTo(0, 0); };

  const selectDocument = async (category, file) => {
    if (!file) return;
    setMessage("");
    setDocuments((current) => ({ ...current, [category]: { name: file.name, status: "Uploading...", progress: 0 } }));
    try {
      const metadata = { category, contentType: file.type, size: file.size, originalFilename: file.name };
      const presigned = adminMode
        ? await presignAdminRegistrationDocument(
          metadata,
          registrationDraftToken
        )
        : await presignRegistrationDocument(
          metadata,
          registrationDraftToken
        );
      await uploadToPresignedUrl({ uploadUrl: presigned.uploadUrl, file, onProgress: (progress) => setDocuments((current) => ({ ...current, [category]: { ...current[category], status: "Uploading...", progress } })) });
      const confirmed = adminMode
        ? await confirmAdminRegistrationDocument(
          { ...metadata, key: presigned.key },
          registrationDraftToken
        )
        : await confirmRegistrationDocument(
          { ...metadata, key: presigned.key },
          registrationDraftToken
        );
      setDocuments((current) => ({ ...current, [category]: { name: file.name, status: "Uploaded", progress: 100, token: confirmed.documentToken } }));
    } catch (error) {
      setDocuments((current) => ({ ...current, [category]: { name: file.name, status: "Upload failed", progress: 0 } }));
      setMessage(error.response?.data?.message || error.message || "Unable to upload document.");
    }
  };

  const submit = async () => {
    const error = validateStep(); if (error) return setMessage(error);
    setBusy(true); setMessage("");
    try {
      const payload = {
        full_name: form.full_name, designation: form.designation, email: form.email, mobile_number: form.mobile_number, password: form.password,
        company: form.company, declared_vessel_count: Number(form.declared_vessel_count),
        vessels: form.provideFleetLater ? [] : form.vessels.filter((vessel) => vessel.vessel_name.trim()),
        services: form.services.map((name) => ({ name })), documentTokens: Object.values(documents).flatMap((document) => document.token ? [document.token] : []),
      };
      const response = adminMode
        ? await submitAdminClientRegistration(
          payload,
          registrationDraftToken
        )
        : await submitClientRegistration(
          payload,
          registrationDraftToken
        );

      if (adminMode) {
        navigate("/admin/client-registrations", {
          replace: true,
          state: {
            tab: "pending",
            notice: "Client registered successfully.",
          },
        });

        return;
      }

      localStorage.setItem("np_token", response.token);
      localStorage.setItem(
        "np_user",
        JSON.stringify(response.user)
      );

      navigate("/client-verification-status", {
        replace: true,
      });
    } catch (requestError) { setMessage(requestError.response?.data?.message || requestError.message || "Unable to create registration."); }
    finally { setBusy(false); }
  };

  return (
    <main className="client-register-page">
      <header className="client-register-top">
        <Link
          to={
            adminMode
              ? "/admin/client-registrations"
              : "/"
          }
          className="client-register-brand"
        >
          <Anchor size={21} />
          NexaPort
        </Link>

        {adminMode ? (
          <button
            type="button"
            onClick={() =>
              navigate("/admin/client-registrations")
            }
          >
            Back to Owners and Managers
          </button>
        ) : (
          <Link to="/login">
            Sign in
          </Link>
        )}
      </header>
      <section className="client-register-shell">
        <div className="client-register-heading">
          <span>
            {adminMode
              ? "Super Admin"
              : "Client Registration"}
          </span>

          <h1>
            {adminMode
              ? "Register Client"
              : "Register your company"}
          </h1>

          <p>
            {adminMode
              ? "Create a Client account and complete the registration on the Client's behalf."
              : "Register your company to request inspections, manage vessels and access inspection services."}
          </p>
        </div>
        <ol className="client-stepper">{STEPS.map((label, index) => <li key={label} className={index === step ? "active" : index < step ? "complete" : ""}><span>{index < step ? <Check size={14} /> : index + 1}</span><small>{label}</small></li>)}</ol>
        {message && <div className="client-form-message">{message}</div>}

        <section className="client-form-card">
          {step === 0 && <UserStep form={form} setValue={(name, value) => { setValue(name, value); if (name === "email") { setRegistrationDraftToken(""); setDraftEmail(""); setDocuments({}); } }} />}
          {step === 1 && <CompanyStep company={form.company} setCompany={setCompany} />}
          {step === 2 && <FleetStep form={form} setValue={setValue} vesselTypes={vesselTypes} updateVessel={updateVessel} add={() => setValue("vessels", [...form.vessels, blankVessel()])} remove={(index) => setValue("vessels", form.vessels.filter((_, vesselIndex) => vesselIndex !== index))} />}
          {step === 3 && <ServicesStep selected={form.services} toggle={(name) => setValue("services", form.services.includes(name) ? form.services.filter((item) => item !== name) : [...form.services, name])} />}
          {step === 4 && <VerificationStep form={form} documents={documents} selectDocument={selectDocument} removeDocument={(category) => setDocuments((current) => { const nextDocuments = { ...current }; delete nextDocuments[category]; return nextDocuments; })} />}
          <div className="client-form-actions">{step > 0 && <button type="button" className="secondary" onClick={back}><ChevronLeft size={17} /> Back</button>}<span />{step < STEPS.length - 1 ? <button type="button" className="primary" disabled={busy} onClick={next}>{busy && step === 0 ? "Preparing..." : "Continue"} <ChevronRight size={17} /></button> : <button type="button" className="primary" disabled={busy} onClick={submit}>{busy ? "Submitting..." : "Submit Registration"}</button>}</div>
        </section>
      </section>
    </main>
  );
}

const Field = ({ label, required, optional: isOptional, ...props }) => <label className="client-field"><span>{label} {required && <b>Required</b>}{isOptional && <em>Optional</em>}</span><input {...props} /></label>;

function UserStep({ form, setValue }) {
  return <><div className="client-section-title"><h2>User Details</h2><p>Use your official company contact information. The email will be used for your NexaPort account and registration communications.</p></div><div className="client-grid two"><Field label="Full name" required value={form.full_name} onChange={(e) => setValue("full_name", e.target.value)} /><Field label="Designation" required value={form.designation} onChange={(e) => setValue("designation", e.target.value)} /><Field label="Official email address" required type="email" value={form.email} onChange={(e) => setValue("email", e.target.value)} /><Field label="Mobile number" required value={form.mobile_number} onChange={(e) => setValue("mobile_number", e.target.value)} /><Field label="Password" required type="password" autoComplete="new-password" value={form.password} onChange={(e) => setValue("password", e.target.value)} /><Field label="Confirm password" required type="password" autoComplete="new-password" value={form.confirmPassword} onChange={(e) => setValue("confirmPassword", e.target.value)} /></div></>;
}

function CompanyStep({ company, setCompany }) {
  return <><div className="client-section-title"><h2>Company Details</h2><p>Provide the legal identity of the applying company.</p></div><div className="client-grid two"><Field label="Company legal name" required value={company.legal_name} onChange={(e) => setCompany("legal_name", e.target.value)} /><label className="client-field"><span>Company type <b>Required</b></span><select value={company.company_type} onChange={(e) => setCompany("company_type", e.target.value)}><option value="">Select company type</option>{COMPANY_TYPES.map((type) => <option key={type}>{type}</option>)}</select></label><label className="client-field wide"><span>Registered address <b>Required</b></span><textarea value={company.registered_address} onChange={(e) => setCompany("registered_address", e.target.value)} /></label><Field label="Country" required value={company.country} onChange={(e) => setCompany("country", e.target.value)} /><Field label="Company registration number" required value={company.registration_number} onChange={(e) => setCompany("registration_number", e.target.value)} /><Field label="Website" optional placeholder="https://" value={company.website} onChange={(e) => setCompany("website", e.target.value)} /><Field label="IMO Company Number" optional value={company.imo_company_number} onChange={(e) => setCompany("imo_company_number", e.target.value)} /><Field label="VAT/GST/Tax number" optional value={company.tax_number} onChange={(e) => setCompany("tax_number", e.target.value)} /></div><div className="client-subsection"><h3>Authorized representative</h3><div className="client-grid two"><Field label="Full name" required value={company.authorized_representative_name} onChange={(e) => setCompany("authorized_representative_name", e.target.value)} /><Field label="Designation" optional value={company.authorized_representative_designation} onChange={(e) => setCompany("authorized_representative_designation", e.target.value)} /><Field label="Official email" required type="email" value={company.authorized_representative_email} onChange={(e) => setCompany("authorized_representative_email", e.target.value)} /><Field label="Mobile number" required value={company.authorized_representative_phone} onChange={(e) => setCompany("authorized_representative_phone", e.target.value)} /></div></div></>;
}

function FleetStep({ form, setValue, vesselTypes, updateVessel, add, remove }) {
  return <><div className="client-section-title"><h2>Fleet Information</h2><p>Enter key vessels now. Full fleet details may be completed after approval.</p></div><div className="client-grid two"><Field label="Number of vessels" required type="number" min="0" value={form.declared_vessel_count} onChange={(e) => setValue("declared_vessel_count", e.target.value)} /><label className="fleet-later"><input type="checkbox" checked={form.provideFleetLater} onChange={(e) => setValue("provideFleetLater", e.target.checked)} /> Provide fleet details after approval</label></div>{!form.provideFleetLater && <div className="vessel-entry-list">{form.vessels.map((vessel, index) => <article className="vessel-entry" key={index}><header><h3>Key vessel {index + 1}</h3>{form.vessels.length > 1 && <button type="button" onClick={() => remove(index)}><Trash2 size={16} /> Remove</button>}</header><div className="client-grid three"><Field label="Vessel name" required value={vessel.vessel_name} onChange={(e) => updateVessel(index, "vessel_name", e.target.value)} /><Field label="IMO number" optional value={vessel.imo_number} onChange={(e) => updateVessel(index, "imo_number", e.target.value)} /><label className="client-field"><span>Vessel type <em>Optional</em></span><select value={vessel.vessel_type_id} onChange={(e) => updateVessel(index, "vessel_type_id", e.target.value)}><option value="">Select type</option>{vesselTypes.map((type) => <option key={type.id} value={type.id}>{type.name}</option>)}</select></label><Field label="Ownership or management relationship" required value={vessel.ownership_relationship} onChange={(e) => updateVessel(index, "ownership_relationship", e.target.value)} /><Field label="Operating regions" optional value={vessel.operating_regions} onChange={(e) => updateVessel(index, "operating_regions", e.target.value)} /></div></article>)}<button type="button" className="add-vessel" onClick={add}><Plus size={16} /> Add Vessel</button></div>}</>;
}

function ServicesStep({ selected, toggle }) {
  return <><div className="client-section-title"><h2>Required Services</h2><p>Select every service relevant to your company.</p></div><div className="service-choice-grid">{SERVICES.map((service) => <label key={service} className={selected.includes(service) ? "selected" : ""}><input type="checkbox" checked={selected.includes(service)} onChange={() => toggle(service)} /><span>{service}</span></label>)}</div></>;
}

function VerificationStep({ form, documents, selectDocument, removeDocument }) {
  return <><div className="client-section-title"><h2>Verification</h2><p>Upload any optional private company documents and review the submission.</p></div><div className="document-upload-list">{DOCUMENTS.map(([category, label]) => { const document = documents[category]; const failed = document?.status === "Upload failed"; return <div className="document-upload" key={category}><div><strong>{label}</strong><small>Optional. PDF, PNG, JPEG or WEBP. Maximum 5 MB.</small>{document && <p>{document.name} · {document.status}{document.progress ? ` (${document.progress}%)` : ""}</p>}</div><div>{document && <button type="button" className="remove-document" onClick={() => removeDocument(category)}>Remove</button>}<label className="upload-button"><Upload size={16} /> {failed ? "Retry" : document ? "Replace file" : "Select file"}<input type="file" accept="application/pdf,image/png,image/jpeg,image/webp" onChange={(e) => selectDocument(category, e.target.files?.[0])} /></label></div></div>; })}</div><div className="review-summary"><h3>Review summary</h3><dl><div><dt>User</dt><dd>{form.full_name}<br />{form.email}</dd></div><div><dt>Company</dt><dd>{form.company.legal_name}<br />{form.company.country}</dd></div><div><dt>Fleet</dt><dd>{form.declared_vessel_count} declared · {form.provideFleetLater ? "Details after approval" : `${form.vessels.filter((v) => v.vessel_name).length} key vessels entered`}</dd></div><div><dt>Services</dt><dd>{form.services.join(", ")}</dd></div><div><dt>Documents</dt><dd>{Object.values(documents).filter((document) => document.token).length} optional document(s) uploaded</dd></div></dl></div></>;
}
