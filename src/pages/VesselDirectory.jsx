import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getDirectoryVessels } from "../api/vesselDirectoryApi";
import "./VesselDirectory.css";

const display = (value) => value == null || value === "" ? "—" : value;
const company = (vessel, role) => vessel.management?.find((item) => item.role === role);
const Company = ({ item }) => item?.entityId ? <Link to={`/directories/owners_managers/${item.entityId}`}>{item.name}</Link> : <span>{display(item?.name)}</span>;

export default function VesselDirectory() {
  const [query, setQuery] = useState("");
  const [search, setSearch] = useState("");
  const [type, setType] = useState("");
  const [flag, setFlag] = useState("");
  const [dwtMin, setDwtMin] = useState("");
  const [dwtMax, setDwtMax] = useState("");
  const [gtMin, setGtMin] = useState("");
  const [gtMax, setGtMax] = useState("");
  const [sort, setSort] = useState("name");
  const [direction, setDirection] = useState("asc");
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ vessels: [], pagination: { total: 0, totalPages: 0 } });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => { const timer = setTimeout(() => { setSearch(query.trim()); setPage(1); }, 300); return () => clearTimeout(timer); }, [query]);
  useEffect(() => {
    const controller = new AbortController();
    Promise.resolve().then(() => { setLoading(true); setError(""); });
    getDirectoryVessels({ search, type, flag, dwtMin, dwtMax, gtMin, gtMax, sort, direction, page, limit: 25 }, controller.signal)
      .then(setData).catch((reason) => { if (!controller.signal.aborted) setError(reason.response?.data?.message || "Directory could not be loaded."); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [search, type, flag, dwtMin, dwtMax, gtMin, gtMax, sort, direction, page]);
  const change = (setter) => (event) => { setter(event.target.value); setPage(1); };
  return <div className="vessel-directory">
    <header><div><span className="eyebrow">DIRECTORIES / VESSELS</span><h1>Vessel Directory</h1><p>MagicPort vessel records with verified identity links and dated source observations.</p></div><strong>{data.pagination.total.toLocaleString()} vessels</strong></header>
    <div className="vessel-directory-filters">
      <label>Search<input value={query} onChange={change(setQuery)} placeholder="Name, IMO, MMSI or call sign" /></label>
      <label>Type<input value={type} onChange={change(setType)} placeholder="Vessel type" /></label>
      <label>Flag<input value={flag} onChange={change(setFlag)} placeholder="Flag" /></label>
      <label>DWT from<input type="number" min="0" value={dwtMin} onChange={change(setDwtMin)} /></label><label>to<input type="number" min="0" value={dwtMax} onChange={change(setDwtMax)} /></label>
      <label>GT from<input type="number" min="0" value={gtMin} onChange={change(setGtMin)} /></label><label>to<input type="number" min="0" value={gtMax} onChange={change(setGtMax)} /></label>
      <label>Sort<select value={sort} onChange={change(setSort)}><option value="name">Name</option><option value="imo">IMO</option><option value="dwt">DWT</option><option value="gt">GT</option><option value="yearBuilt">Year built</option></select></label>
      <label>Order<select value={direction} onChange={change(setDirection)}><option value="asc">Ascending</option><option value="desc">Descending</option></select></label>
    </div>
    {error && <p role="alert" className="vessel-directory-error">{error}</p>}
    <div className="vessel-directory-scroll"><table><thead><tr><th>Vessel Name</th><th>IMO</th><th>Type</th><th>Flag</th><th>DWT</th><th>GT</th><th>Year Built</th><th>Registered Owner</th><th>Commercial Manager</th></tr></thead><tbody>
      {data.vessels.map((vessel) => <tr key={vessel.id}><td><Link to={`/vessel-directory/${vessel.id}`}>{vessel.name}</Link></td><td className="mono">{display(vessel.imo)}</td><td>{display(vessel.vessel_type)}</td><td>{display(vessel.flag)}</td><td className="mono">{display(vessel.dwt)}</td><td className="mono">{display(vessel.gt)}</td><td>{display(vessel.year_built)}</td><td><Company item={company(vessel, "Registered Owner")} /></td><td><Company item={company(vessel, "Commercial Manager")} /></td></tr>)}
    </tbody></table></div>
    {loading && <p className="vessel-directory-state">Loading vessels…</p>}{!loading && !error && !data.vessels.length && <p className="vessel-directory-state">No matching vessels.</p>}
    <footer><span>Page {page} of {Math.max(1, data.pagination.totalPages)}</span><div><button disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</button><button disabled={page >= data.pagination.totalPages} onClick={() => setPage(page + 1)}>Next</button></div></footer>
  </div>;
}
