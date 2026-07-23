import { ArrowLeft, Building2, ExternalLink, Pencil } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { activateMaritimeDirectoryEntity, approveMaritimeDirectoryEntity, deactivateMaritimeDirectoryEntity, getMaritimeDirectoryEntity, rejectMaritimeDirectoryEntity } from "../api/maritimeDirectoryApi";
import CopyableContact from "../components/common/CopyableContact";
import { NEW_ADMIN_DIRECTORIES } from "../config/adminDirectories";
import "./MaritimeDirectoryDetails.css";

const TYPE_LABELS = Object.fromEntries(NEW_ADMIN_DIRECTORIES.map(({ type, label }) => [type, label]));
const SECTION_FIELDS = {
  services: ["Services", "service_name", ["category", "service_type", "service_description"]],
  ports: ["Ports Covered", "port_name", ["country", "unlocode", "source_port_text"]],
  branches: ["Branches and Offices", "branch_name", ["branch_type", "public_address", "city", "country", "public_telephone", "public_email"]],
  certifications: ["Certifications", "certification_name", ["standard_code", "issuer", "expiry_date"]],
  class_approvals: ["Class Approvals", "society_name", ["approval_details"]],
  memberships: ["Memberships", "organization_name", ["membership_details"]],
  products: ["Products", "product_name", ["category", "manufacturer"]],
  faqs: ["FAQs", "question", ["answer"]],
};
const label = (value) => value.replaceAll("_", " ").replace(/\b\w/g, (letter) => letter.toUpperCase());

function DetailSection({ name, rows }) {
  const [title, primary, fields] = SECTION_FIELDS[name];
  return <section className="maritime-detail__section"><h2>{title}</h2>{!rows.length ? <p className="maritime-detail__empty">No {title.toLowerCase()} recorded.</p> : <div className="maritime-detail__rows">{rows.map((row) => <article key={row.id}><strong>{row[primary]}</strong>{fields.map((field) => row[field] ? <p key={field}><span>{label(field)}</span>{row[field]}</p> : null)}</article>)}</div>}</section>;
}

export default function MaritimeDirectoryDetails() {
  const { directoryType, entityId } = useParams();
  const navigate = useNavigate();
  const directory = NEW_ADMIN_DIRECTORIES.find((item) => item.type === directoryType);
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [acting, setActing] = useState(false);
  const [error, setError] = useState("");
  useEffect(() => {
    let active = true;
    getMaritimeDirectoryEntity(entityId)
      .then((response) => { if (active) setRecord(response.data); })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.message || "Unable to load this entry."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [entityId]);

  if (!directory) return <main className="maritime-detail"><p>Unsupported directory type.</p></main>;
  const run = async (work) => { setActing(true); setError(""); try { setRecord((await work()).data); } catch (requestError) { setError(requestError.response?.data?.message || "Unable to update this entry."); } finally { setActing(false); } };
  const reject = () => { const reason = window.prompt("Reason for rejecting this imported entry:"); if (reason?.trim()) run(() => rejectMaritimeDirectoryEntity(entityId, reason)); };
  const deactivate = () => { const reason = window.prompt("Reason for deactivating this entry:"); if (reason?.trim()) run(() => deactivateMaritimeDirectoryEntity(entityId, reason)); };

  if (loading) return <main className="maritime-detail"><div className="maritime-detail__state">Loading entry...</div></main>;
  if (!record) return <main className="maritime-detail"><button className="maritime-detail__back" onClick={() => navigate(directory.path)}><ArrowLeft size={16} /> Back to {directory.label}</button><div className="maritime-detail__state" role="alert">{error || "Directory entry not found."}</div></main>;
  const entity = record.entity;
  return <main className="maritime-detail"><button className="maritime-detail__back" onClick={() => navigate(directory.path)}><ArrowLeft size={16} /> Back to {directory.label}</button><header><div className="maritime-detail__identity">{entity.logo_url ? <img src={entity.logo_url} alt="" /> : <span><Building2 size={25} /></span>}<div><div className="maritime-detail__badges">{record.directory_types.map((type) => <span key={type}>{TYPE_LABELS[type]}</span>)}<span className={entity.review_status}>{entity.review_status === "pending" ? "Pending Review" : label(entity.review_status)}</span>{!entity.is_active && <span className="inactive">Inactive</span>}</div><h1>{entity.company_name}</h1><p>{entity.description || "No description provided."}</p></div></div><button onClick={() => navigate(`/directories/${directoryType}/${entityId}/edit`)}><Pencil size={16} /> Edit</button></header>{error && <div className="maritime-detail__error" role="alert">{error}</div>}
    <section className="maritime-detail__section"><h2>Overview</h2><dl className="maritime-detail__overview"><div><dt>Location</dt><dd>{[entity.city, entity.country].filter(Boolean).join(", ") || "—"}</dd></div><div><dt>Address</dt><dd>{entity.public_address || "—"}</dd></div><div><dt>Email</dt><dd>{entity.public_email ? <CopyableContact value={entity.public_email} href={`mailto:${entity.public_email}`} type="email" /> : "—"}</dd></div><div><dt>Phone</dt><dd>{entity.public_phone ? <CopyableContact value={entity.public_phone} href={`tel:${entity.public_phone}`} type="phone" /> : "—"}</dd></div><div><dt>Website</dt><dd>{entity.website ? <a href={entity.website} target="_blank" rel="noreferrer">Open website <ExternalLink size={13} /></a> : "—"}</dd></div><div><dt>Source</dt><dd>{entity.data_source === "manual_admin" ? "Manual admin entry" : entity.data_source}</dd></div><div><dt>Review status</dt><dd>{label(entity.review_status)}</dd></div><div><dt>Active status</dt><dd>{entity.is_active ? "Active" : "Inactive"}</dd></div><div><dt>Created</dt><dd>{new Date(entity.created_at).toLocaleString()}</dd></div><div><dt>Updated</dt><dd>{new Date(entity.updated_at).toLocaleString()}</dd></div></dl></section>
    {Object.keys(SECTION_FIELDS).map((name) => <DetailSection key={name} name={name} rows={record[name] || []} />)}
    <section className="maritime-detail__section maritime-detail__actions"><h2>Administrative Actions</h2><div><button disabled={acting} onClick={() => navigate(`/directories/${directoryType}/${entityId}/edit`)}>Edit</button>{entity.data_source !== "manual_admin" && entity.review_status !== "approved" && <button disabled={acting} onClick={() => run(() => approveMaritimeDirectoryEntity(entityId))}>Approve</button>}{entity.data_source !== "manual_admin" && entity.review_status !== "rejected" && <button className="danger" disabled={acting} onClick={reject}>Reject</button>}{entity.is_active ? <button className="danger" disabled={acting} onClick={deactivate}>Deactivate</button> : <button disabled={acting} onClick={() => run(() => activateMaritimeDirectoryEntity(entityId))}>Activate</button>}</div></section>
  </main>;
}
