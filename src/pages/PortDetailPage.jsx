import { Anchor, ArrowLeft, Building2, ExternalLink, MapPin, Navigation, Radio, Ship, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getPortById } from "../api/portApi";
import { formatPortValue, notProvided } from "../utils/portDirectory";
import "./PortDetailPage.css";

const labels = {
  channel_depth: "Channel depth", anchorage_depth: "Anchorage depth", cargo_pier_depth: "Cargo pier depth", oil_depth: "Oil depth",
  offshore_maximum_vessel_draft: "Offshore maximum vessel draft", tide_entrance: "Tide entrance", swell_entrance_restriction: "Swell entrance",
  ice_entrance_restriction: "Ice entrance", other_entrance_restriction: "Other entrance restrictions", overhead_limitations: "Overhead limitations",
};
const humanize = (key) => labels[key] || String(key).replaceAll("_", " ").replace(/^./, (letter) => letter.toUpperCase());
const StructuredSection = ({ title, icon: Icon, data, empty = "No structured information has been provided." }) => {
  const entries = Object.entries(data || {});
  return <section className="port-dossier-section"><header><Icon size={17} /><h2>{title}</h2></header>{entries.length ? <dl className="port-data-grid">{entries.map(([key, value]) => <div key={key}><dt>{humanize(key)}</dt><dd className={value === true ? "yes" : value === false ? "no" : value == null ? "unknown" : ""}>{formatPortValue(value)}</dd></div>)}</dl> : <p className="port-detail-empty">{empty}</p>}</section>;
};

export default function PortDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [port, setPort] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let current = true;
    Promise.resolve().then(() => { if (current) { setLoading(true); setError(""); } });
    getPortById(id).then((response) => { if (current) setPort(response.port); }).catch((requestError) => { if (current) setError(requestError.response?.data?.message || "Port dossier could not be loaded."); }).finally(() => { if (current) setLoading(false); });
    return () => { current = false; };
  }, [id]);
  if (loading) return <main className="port-detail-page"><div className="port-detail-state">Loading port dossier…</div></main>;
  if (error || !port) return <main className="port-detail-page"><div className="port-detail-state error">{error || "Port not found."}<button onClick={() => navigate("/ports")}>Return to directory</button></div></main>;
  const coordinates = port.latitude != null && port.longitude != null ? `${port.latitude.toFixed?.(5) ?? port.latitude}, ${port.longitude.toFixed?.(5) ?? port.longitude}` : "Not provided";
  return <main className="port-detail-page">
    <button className="port-back" onClick={() => navigate("/ports")}><ArrowLeft size={15} />Port directory</button>
    <header className="port-dossier-header"><div className="port-dossier-title"><span>PORT DOSSIER / {port.unlocode || "UNREGISTERED"}</span><h1>{port.port_name}</h1><p><MapPin size={14} />{[port.country, port.region].filter(Boolean).join(" · ")}</p></div><div className="port-identity-code"><span>UN/LOCODE</span><strong>{port.unlocode || "— — — — —"}</strong></div></header>
    <section className="port-facts" aria-label="Port facts">
      <div><span>Coordinates</span><strong>{coordinates}</strong></div><div><span>Harbour type</span><strong>{notProvided(port.harbour_type)}</strong></div><div><span>Harbour size</span><strong>{notProvided(port.harbour_size)}</strong></div><div><span>Maximum draft</span><strong>{port.max_draft_m == null ? "Not provided" : `${port.max_draft_m} m`}</strong></div><div><span>PSC risk</span><strong>{notProvided(port.psc_risk_level)}</strong></div><div><span>Experts available</span><strong>{port.experts_available || 0}</strong></div>
    </section>
    {port.description && <section className="port-dossier-section port-overview"><header><Anchor size={17} /><h2>Port overview</h2></header><p>{port.description}</p></section>}
    <div className="port-dossier-columns"><StructuredSection title="Depths" icon={Navigation} data={port.depths} /><StructuredSection title="Restrictions" icon={Anchor} data={port.restrictions} /></div>
    <div className="port-dossier-columns"><StructuredSection title="Port equipment" icon={Ship} data={port.equipment} /><StructuredSection title="Navigation & mooring" icon={Navigation} data={port.navigation} /></div>
    <StructuredSection title="Communication & formalities" icon={Radio} data={port.communication} />
    <section className="port-dossier-section"><header><Ship size={17} /><h2>Services & vessel types</h2></header><div className="port-tag-groups"><div><h3>Services</h3><div>{(port.services || []).length ? port.services.map((item) => <span key={item}>{item}</span>) : <em>Not provided</em>}</div></div><div><h3>Vessel types</h3><div>{(port.vessel_types || []).length ? port.vessel_types.map((item) => <span key={item}>{item}</span>) : <em>Not provided</em>}</div></div></div></section>
    <section className="port-dossier-section"><header><MapPin size={17} /><h2>Nearby ports</h2></header>{(port.nearby_ports || []).length ? <div className="nearby-table-wrap"><table><thead><tr><th>Port</th><th>UNLOCODE</th><th>Coordinates</th><th>Distance</th></tr></thead><tbody>{port.nearby_ports.map((nearby) => <tr key={`${nearby.nearby_unlocode}-${nearby.nearby_port_name}`}><td>{nearby.nearby_port_id ? <Link to={`/ports/${nearby.nearby_port_id}`}>{nearby.port_name}<ExternalLink size={12} /></Link> : nearby.port_name}</td><td className="mono">{nearby.nearby_unlocode}</td><td>{nearby.latitude != null && nearby.longitude != null ? `${nearby.latitude}, ${nearby.longitude}` : "Not provided"}</td><td>{nearby.distance_nm == null ? "Not provided" : `${nearby.distance_nm} nm`}</td></tr>)}</tbody></table></div> : <p className="port-detail-empty">No nearby-port relationships have been provided.</p>}</section>
    <section className="port-dossier-section"><header><Users size={17} /><h2>Local Nexaport consultants</h2></header>{(port.local_experts || []).length ? <div className="port-experts-list">{port.local_experts.map((expert) => <article key={expert.id}>{expert.photo_url ? <img src={expert.photo_url} alt="" /> : <span className="expert-initial">{expert.full_name?.[0] || "N"}</span>}<div><h3>{expert.full_name}</h3><p>{[expert.discipline, expert.base_location || expert.country].filter(Boolean).join(" · ")}</p></div><Link to={`/experts/${expert.id}`}>View profile</Link></article>)}</div> : <p className="port-detail-empty">No registered consultants are currently associated with this port.</p>}</section>
    <section className="port-dossier-section"><header><Building2 size={17} /><h2>Maritime directory</h2></header>{(port.maritime_directory_entities || []).length ? <div className="port-directory-list">{port.maritime_directory_entities.map((entity) => <article key={entity.id}><div><h3>{entity.company_name}</h3><p>{(entity.directory_types || []).map(humanize).join(" · ")} · {[entity.city, entity.country].filter(Boolean).join(", ")}</p></div><Link to={`/directories/${entity.directory_types?.[0] || "service_provider"}/${entity.id}`}>View company</Link></article>)}</div> : <p className="port-detail-empty">No approved directory companies are linked to this UNLOCODE.</p>}</section>
  </main>;
}
