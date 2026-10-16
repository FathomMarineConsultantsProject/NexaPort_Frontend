import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getDirectoryVessel } from "../api/vesselDirectoryApi";
import "./VesselDirectory.css";

const Field = ({ label, value }) => value == null || value === "" ? null : <div className="vessel-directory-field"><span>{label}</span><strong>{value}</strong></div>;

export default function VesselDirectoryDetail() {
  const { id } = useParams();
  const [vessel, setVessel] = useState(null);
  const [error, setError] = useState("");
  useEffect(() => {
    const controller = new AbortController();
    getDirectoryVessel(id, controller.signal).then((data) => setVessel(data.vessel)).catch((reason) => { if (!controller.signal.aborted) setError(reason.response?.data?.message || "Vessel could not be loaded."); });
    return () => controller.abort();
  }, [id]);
  if (error) return <div className="vessel-directory"><Link to="/vessel-directory">← Vessel Directory</Link><p role="alert">{error}</p></div>;
  if (!vessel) return <div className="vessel-directory">Loading vessel…</div>;
  return <div className="vessel-directory detail"><Link to="/vessel-directory">← Vessel Directory</Link><header><div><span className="eyebrow">VESSEL PROFILE</span><h1>{vessel.name}</h1><p>{vessel.imo ? `IMO ${vessel.imo} · ` : "IMO not recorded · "}{vessel.provenance || "Imported directory record"}{vessel.observed_at ? ` · Source observed ${new Date(vessel.observed_at).toLocaleString()}` : ""}</p></div></header>
    <section><h2>Overview</h2><div className="vessel-directory-grid"><Field label="IMO" value={vessel.imo}/><Field label="MMSI" value={vessel.mmsi}/><Field label="Call sign" value={vessel.call_sign}/><Field label="Type" value={vessel.vessel_type}/><Field label="Subtype" value={vessel.subtype}/><Field label="Flag" value={vessel.flag}/><Field label="Source key" value={vessel.source_key}/>{vessel.source_url && <div className="vessel-directory-field"><span>Source</span><a href={vessel.source_url} target="_blank" rel="noreferrer">Source record</a></div>}</div></section>
    <section><h2>Technical Particulars</h2><div className="vessel-directory-grid"><Field label="Class label" value={vessel.class_label}/><Field label="DWT" value={vessel.dwt}/><Field label="GT" value={vessel.gt}/><Field label="Year built" value={vessel.year_built}/><Field label="Keel laid year" value={vessel.keel_year}/><Field label="LOA (m)" value={vessel.loa}/></div></section>
    <section><h2>Ownership &amp; Management</h2>{vessel.management?.length ? <div className="vessel-directory-grid">{vessel.management.map((item, index) => <div className="vessel-directory-field" key={`${item.role}-${index}`}><span>{item.role}</span><strong>{item.entityId ? <Link to={`/directories/owners_managers/${item.entityId}`}>{item.name}</Link> : item.name}</strong>{!item.entityId && <small>Source name; identity link unverified</small>}</div>)}</div> : <p>No management relationships in the source record.</p>}</section>
    <section><h2>Navigation</h2><p>Archived source observation from {vessel.observed_at ? new Date(vessel.observed_at).toLocaleString() : "an unknown date"}. This is not live AIS.</p><div className="vessel-directory-grid"><Field label="Status" value={vessel.navigation_status}/><Field label="Destination text" value={vessel.destination_text}/><Field label="Speed (knots)" value={vessel.speed_knots}/><Field label="Course (°)" value={vessel.course_degrees}/><Field label="Heading (°)" value={vessel.heading_degrees}/></div></section>
    {Array.isArray(vessel.faq) && vessel.faq.length > 0 && <section><h2>Additional Information</h2>{vessel.faq.filter((item) => !/sanction|risk profile/i.test(item.question || "")).map((item, index) => <details key={index}><summary>{item.question}</summary><p>{item.answer}</p></details>)}</section>}
  </div>;
}
