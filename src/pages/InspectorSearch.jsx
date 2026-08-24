import { Search, UserRound } from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { searchInspectorDirectory } from "../api/inspectorDirectoryApi";
import "./InspectorSearch.css";

const TYPES = {
  nexaport_consultant: "Nexaport Consultant",
  flag_inspector: "Flag Inspector",
  accredited_inspector: "Accredited Inspector",
  appointed_surveyor: "Appointed Surveyor",
};
const emptyPage = { items: [], total: 0, page: 1, limit: 25, totalPages: 0 };
const initials = (value) => String(value || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
const detailPath = (item) => {
  if (item.inspector_type === "nexaport_consultant") return `/experts/${item.source_id}`;
  if (item.inspector_type === "flag_inspector") return `/flag/${item.flag_slug}/inspectors/${item.source_id}`;
  if (item.inspector_type === "accredited_inspector") return `/accredited-inspectors/${item.scheme_slug}`;
  return "/appointed-surveyors";
};

export default function InspectorSearch() {
  const [draft, setDraft] = useState({ q: "", country: "", type: "", discipline: "", flagState: "" });
  const [filters, setFilters] = useState(draft);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(emptyPage);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => { setPage(1); setFilters(draft); }, 300);
    return () => window.clearTimeout(timer);
  }, [draft]);

  useEffect(() => {
    let active = true;
    setLoading(true); setError("");
    searchInspectorDirectory({ ...filters, page, limit: 25 })
      .then((response) => { if (active) setData(response); })
      .catch((requestError) => { if (active) { setData(emptyPage); setError(requestError.response?.data?.message || "Inspector search is unavailable."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filters, page]);

  const update = (key) => (event) => setDraft((current) => ({ ...current, [key]: event.target.value }));
  return (
    <main className="inspector-search-page">
      <header><span>Federated directory</span><h1>Inspector Search</h1><p>Search Nexaport Consultants and established inspector directories by operational location, expertise, or authority.</p></header>
      <section className="inspector-search-controls" aria-label="Inspector search filters">
        <label className="wide"><span>Search</span><div><Search size={17}/><input value={draft.q} onChange={update("q")} placeholder="Name, country, city, port, speciality or authority" /></div></label>
        <label><span>Country / Location</span><input value={draft.country} onChange={update("country")} placeholder="e.g. Singapore" /></label>
        <label><span>Inspector Type</span><select value={draft.type} onChange={update("type")}><option value="">All inspector types</option>{Object.entries(TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <label><span>Discipline / Speciality</span><input value={draft.discipline} onChange={update("discipline")} placeholder="e.g. marine engineering" /></label>
        <label><span>Flag State</span><input value={draft.flagState} onChange={update("flagState")} placeholder="Explicit registry filter" /></label>
      </section>

      <section className="inspector-search-results" aria-live="polite">
        <div className="inspector-search-summary"><strong>{loading ? "Searching…" : `${data.total} result${data.total === 1 ? "" : "s"}`}</strong><span>Country / Location and Flag State are independent filters.</span></div>
        {error && <div className="inspector-search-state" role="alert">{error}</div>}
        {!error && !loading && !data.items.length && <div className="inspector-search-state">No inspectors match the current filters.</div>}
        {!error && data.items.length > 0 && <div className="inspector-search-table-wrap"><table>
          <thead><tr><th>Inspector / Company</th><th>Type</th><th>Country / Location</th><th>Discipline / Accreditation</th><th>Flag / Authority</th><th>Source</th><th>Action</th></tr></thead>
          <tbody>{data.items.map((item) => <tr key={`${item.inspector_type}-${item.source_id}`}>
            <td data-label="Inspector / Company"><div className="inspector-identity">{item.photo_url ? <img src={item.photo_url} alt=""/> : <span aria-hidden="true">{initials(item.name)}</span>}<div><strong>{item.name}</strong>{item.organization && item.organization !== item.name && <small>{item.organization}</small>}</div></div></td>
            <td data-label="Type"><span className={`inspector-type ${item.inspector_type}`}>{TYPES[item.inspector_type]}</span></td>
            <td data-label="Country / Location">{item.country_location || item.country || "—"}{item.base_ports && <small className="block">Base ports: {item.base_ports}</small>}</td>
            <td data-label="Discipline / Accreditation">{item.discipline || "—"}{item.experience && <small className="block">{item.experience} years experience</small>}</td>
            <td data-label="Flag / Authority">{item.flag_state || item.authority || "—"}</td><td data-label="Source">{item.source_name}</td>
            <td data-label="Action"><Link to={detailPath(item)}>View profile</Link></td>
          </tr>)}</tbody>
        </table></div>}
        {data.totalPages > 1 && <nav className="inspector-pagination" aria-label="Inspector search pages"><button disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {data.page} of {data.totalPages}</span><button disabled={page >= data.totalPages || loading} onClick={() => setPage((value) => value + 1)}>Next</button></nav>}
      </section>
    </main>
  );
}
