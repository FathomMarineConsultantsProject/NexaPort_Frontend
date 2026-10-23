import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useLocation, useSearchParams } from "react-router-dom";
import { searchInspectorDirectory } from "../api/inspectorDirectoryApi";
import "./InspectorSearch.css";

const TYPES = {
  nexaport_consultant: "Nexaport Consultant",
  flag_inspector: "Flag Inspector",
  accredited_inspector: "Accredited Inspector",
  appointed_surveyor: "Appointed Surveyor",
};
const CATEGORIES = ["Marine Surveyors", "Maritime Consultants", "Flag State Inspectors",
  "Vessel Inspectors", "Accredited Inspectors", "Appointed Surveyors"];
const emptyPage = { items: [], total: 0, page: 1, limit: 25, totalPages: 0 };
const initials = (value) => String(value || "?").split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join("").toUpperCase();
const detailPath = (item) => {
  if (item.inspector_type === "nexaport_consultant") return `/experts/${item.source_id}`;
  if (item.inspector_type === "flag_inspector") return `/flag/${item.flag_slug}/inspectors/${item.source_id}`;
  if (item.inspector_type === "accredited_inspector") return `/accredited-inspectors/${item.scheme_slug}?record=${encodeURIComponent(item.source_id)}`;
  return `/appointed-surveyors?record=${encodeURIComponent(item.source_id)}`;
};

export default function InspectorSearch({ humanOnly = false }) {
  const location = useLocation();
  const [, setSearchParams] = useSearchParams();
  const categoryFromUrl = new URLSearchParams(location.search).get("category") || "";
  const [draft, setDraft] = useState({ q: "", country: "", port: "", type: "", category: categoryFromUrl,
    discipline: "", specialization: "", inspectionType: "", flagState: "", accreditation: "", capability: "" });
  const [filters, setFilters] = useState(draft);
  const [page, setPage] = useState(1);
  const [data, setData] = useState(emptyPage);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const timer = window.setTimeout(() => setDraft((current) => ({ ...current, category: categoryFromUrl })), 0);
    return () => window.clearTimeout(timer);
  }, [categoryFromUrl]);

  useEffect(() => {
    const timer = window.setTimeout(() => { setPage(1); setFilters(draft); }, 300);
    return () => window.clearTimeout(timer);
  }, [draft]);

  useEffect(() => {
    let active = true;
    const timer = window.setTimeout(() => { if (active) { setLoading(true); setError(""); } }, 0);
    searchInspectorDirectory({ ...filters, humanOnly, page, limit: 25 })
      .then((response) => { if (active) setData(response); })
      .catch((requestError) => { if (active) { setData(emptyPage); setError(requestError.response?.data?.message || "Inspector search is unavailable."); } })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; window.clearTimeout(timer); };
  }, [filters, humanOnly, page, retry]);

  const update = (key) => (event) => setDraft((current) => ({ ...current, [key]: event.target.value }));
  return (
    <main className="inspector-search-page">
      <header><span>Federated human profiles</span><h1>{humanOnly ? "Surveyors" : "Inspector Search"}</h1><p>Find registered Consultants and source-listed inspection professionals by location, specialization and authority. Imported records retain their source identity.</p></header>
      <section className="inspector-search-controls" aria-label="Inspector search filters">
        <label className="wide"><span>Search</span><div><Search size={17}/><input value={draft.q} onChange={update("q")} placeholder="Name, country, city, port, speciality or authority" /></div></label>
        <label><span>Country / Location</span><input value={draft.country} onChange={update("country")} placeholder="e.g. Singapore" /></label>
        <label><span>Port</span><input value={draft.port} onChange={update("port")} placeholder="Registered base port" /></label>
        <label><span>Surveyor Category</span><select value={draft.category} onChange={update("category")}><option value="">All categories</option>{CATEGORIES.map((value) => <option key={value} value={value}>{value}</option>)}</select></label>
        <label><span>Record Source</span><select value={draft.type} onChange={update("type")}><option value="">All sources</option>{Object.entries(TYPES).map(([value, label]) => <option key={value} value={value}>{label}</option>)}</select></label>
        <details className="inspector-advanced"><summary>More search fields</summary><div>
          <label><span>Discipline / Speciality</span><input value={draft.discipline} onChange={update("discipline")} placeholder="e.g. marine engineering" /></label>
          <label><span>Specialization</span><input value={draft.specialization} onChange={update("specialization")} placeholder="Registered specialty or source scope" /></label>
          <label><span>Inspection Type</span><input value={draft.inspectionType} onChange={update("inspectionType")} placeholder="Registered inspection method" /></label>
          <label><span>Flag State</span><input value={draft.flagState} onChange={update("flagState")} placeholder="Explicit registry filter" /></label>
          <label><span>Accreditation</span><input value={draft.accreditation} onChange={update("accreditation")} placeholder="Recorded accreditation" /></label>
          <label><span>Capability</span><input value={draft.capability} onChange={update("capability")} placeholder="Registered capability" /></label>
        </div></details>
        <button className="inspector-clear" type="button" onClick={() => { setSearchParams((current) => { const next = new URLSearchParams(current); next.delete("category"); return next; }); setDraft({ q: "", country: "", port: "", type: "", category: "", discipline: "", specialization: "", inspectionType: "", flagState: "", accreditation: "", capability: "" }); }}>Clear filters</button>
      </section>

      <section className="inspector-search-results" aria-live="polite">
        <div className="inspector-search-summary"><strong>{loading ? "Searching…" : `${data.total} result${data.total === 1 ? "" : "s"}`}</strong><span>Source records remain separate when identity is unconfirmed.</span></div>
        {error && <div className="inspector-search-state" role="alert"><strong>Search unavailable</strong><p>{error}</p><button type="button" onClick={() => setRetry((value) => value + 1)}>Try again</button></div>}
        {!error && loading && <div className="inspector-search-state" role="status">Searching inspector records…</div>}
        {!error && !loading && !data.items.length && <div className="inspector-search-state">No inspectors match the current filters.</div>}
        {!error && !loading && data.items.length > 0 && <div className="inspector-search-table-wrap"><table>
          <thead><tr><th>Surveyor / Inspector</th><th>Categories</th><th>Country / Location</th><th>Specialization / Capability</th><th>Flag / Accreditation</th><th>Source</th><th>Action</th></tr></thead>
          <tbody>{data.items.map((item) => <tr key={`${item.inspector_type}-${item.source_id}`}>
            <td data-label="Surveyor / Inspector"><div className="inspector-identity">{item.photo_url ? <img src={item.photo_url} alt=""/> : <span aria-hidden="true">{initials(item.name)}</span>}<div><strong>{item.name}</strong>{item.nexaport_id && <small className="nexaport-id">Nexaport ID: {item.nexaport_id}</small>}{item.organization && item.organization !== item.name && <small>{item.organization}</small>}</div></div></td>
            <td data-label="Categories"><span className={`inspector-type ${item.inspector_type}`}>{TYPES[item.inspector_type]}</span>{item.categories?.map((category) => <small className="block" key={category}>{category}</small>)}</td>
            <td data-label="Country / Location">{item.country_location || item.country || "—"}{item.base_ports && <small className="block">Base ports: {item.base_ports}</small>}</td>
            <td data-label="Specialization / Capability">{item.discipline || item.specialization || "—"}{item.specialization && item.specialization !== item.discipline && <small className="block">{item.specialization}</small>}{item.inspection_types && <small className="block">Inspection: {item.inspection_types}</small>}{item.capabilities && <small className="block">Capabilities: {item.capabilities}</small>}</td>
            <td data-label="Flag / Accreditation">{item.flag_state || item.authority || "—"}{item.accreditation && <small className="block">Accreditation: {item.accreditation}</small>}</td><td data-label="Source">{item.source_name}</td>
            <td data-label="Action"><Link to={detailPath(item)}>View Details</Link></td>
          </tr>)}</tbody>
        </table></div>}
        {!error && data.totalPages > 1 && <nav className="inspector-pagination" aria-label="Inspector search pages"><button disabled={page <= 1 || loading} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {data.page} of {data.totalPages}</span><button disabled={page >= data.totalPages || loading} onClick={() => setPage((value) => value + 1)}>Next</button></nav>}
      </section>
    </main>
  );
}
