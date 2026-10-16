import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Anchor, Flag, Ship, X } from "lucide-react";
import { getDirectoryFlags, getDirectoryVessels } from "../api/vesselDirectoryApi";
import { flagLabel, flagMatches } from "../utils/vesselFlagSearch";
import "./FleetManagement.css";
import "./VesselDirectory.css";

const company = (vessel, role) => vessel.management?.find((item) => item.role === role)?.name;
const number = (value) => value == null || value === "" ? "" : Number(value).toLocaleString();

function VesselField({ label, value, wide = false }) {
  if (value == null || value === "") return null;
  return <div className={`vessel-info-item${wide ? " vessel-info-wide" : ""}`}><span className="vessel-info-label">{label}</span><span className="vessel-info-value">{value}</span></div>;
}

function DirectoryCard({ vessel }) {
  const owner = company(vessel, "Registered Owner");
  const manager = company(vessel, "Commercial Manager");
  return <Link className="vessel-card vessel-directory-card" to={`/vessel-directory/${vessel.id}`}>
    <div className="vessel-card-header">
      <div className="vessel-icon"><Ship size={24} /></div>
      <div className="vessel-card-identity">
        <h2 className="vessel-name">{vessel.name || "Unnamed vessel"}</h2>
        {vessel.imo && <div className="vessel-imo"><Anchor size={14} /> IMO {vessel.imo}</div>}
      </div>
      {vessel.vessel_type && <span className="vessel-type-badge">{vessel.vessel_type}</span>}
    </div>
    <div className="vessel-info-grid">
      <VesselField label="Flag" value={vessel.flag ? <><Flag size={13} /> {vessel.flag}</> : null} />
      <VesselField label="DWT" value={number(vessel.dwt)} />
      <VesselField label="GT" value={number(vessel.gt)} />
      <VesselField label="Built" value={vessel.year_built} />
      <VesselField label="Registered Owner" value={owner} wide />
      <VesselField label="Commercial Manager" value={manager} wide />
    </div>
  </Link>;
}

export default function VesselDirectory() {
  const [params, setParams] = useSearchParams();
  const search = params.get("search") || "";
  const flag = params.get("flag") || "";
  const page = Math.max(1, Number.parseInt(params.get("page"), 10) || 1);
  const type = params.get("type") || "";
  const dwtMin = params.get("dwtMin") || "";
  const dwtMax = params.get("dwtMax") || "";
  const gtMin = params.get("gtMin") || "";
  const gtMax = params.get("gtMax") || "";
  const sort = params.get("sort") || "name";
  const direction = params.get("direction") || "asc";
  const [query, setQuery] = useState(search);
  const [flagInput, setFlagInput] = useState(flagLabel(flag));
  const [flags, setFlags] = useState([]);
  const [flagsError, setFlagsError] = useState("");
  const [flagRetry, setFlagRetry] = useState(0);
  const [flagOpen, setFlagOpen] = useState(false);
  const [activeOption, setActiveOption] = useState(0);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const requestId = useRef(0);

  useEffect(() => { Promise.resolve().then(() => setQuery(search)); }, [search]);
  useEffect(() => { if (!flagOpen) Promise.resolve().then(() => setFlagInput(flagLabel(flag))); }, [flag, flagOpen]);
  useEffect(() => {
    const controller = new AbortController();
    getDirectoryFlags(controller.signal)
      .then((result) => setFlags(Array.isArray(result.flags) ? result.flags : []))
      .catch(() => { if (!controller.signal.aborted) setFlagsError("Flag suggestions unavailable."); });
    return () => controller.abort();
  }, [flagRetry]);

  const update = (changes, resetPage = true) => {
    setLoading(true);
    setError("");
    setParams((current) => {
      const next = new URLSearchParams(current);
      for (const [key, value] of Object.entries(changes)) value === "" || value == null ? next.delete(key) : next.set(key, String(value));
      if (resetPage) next.delete("page");
      return next;
    });
  };
  const updateBound = (key, value) => {
    if (value !== "" && (!Number.isFinite(Number(value)) || Number(value) < 0)) return;
    update({ [key]: value });
  };

  useEffect(() => {
    if (query.trim() === search) return undefined;
    const timer = setTimeout(() => {
      setParams((current) => {
        const next = new URLSearchParams(current);
        query.trim() ? next.set("search", query.trim()) : next.delete("search");
        next.delete("page");
        return next;
      });
    }, 300);
    return () => clearTimeout(timer);
  }, [query, search, setParams]);

  useEffect(() => {
    const controller = new AbortController();
    const currentId = ++requestId.current;
    Promise.resolve().then(() => { if (!controller.signal.aborted) { setLoading(true); setError(""); } });
    getDirectoryVessels({ search, type, flag, dwtMin, dwtMax, gtMin, gtMax, sort, direction, page, limit: 30 }, controller.signal)
      .then((result) => { if (!controller.signal.aborted && currentId === requestId.current) {
        if (!Array.isArray(result?.vessels) || !Number.isFinite(Number(result?.pagination?.total))) throw new Error("Invalid vessel directory response.");
        if (result.pagination.totalPages > 0 && page > result.pagination.totalPages) {
          setParams((current) => { const next = new URLSearchParams(current); next.set("page", String(result.pagination.totalPages)); return next; });
          return;
        }
        setData(result); setError("");
      } })
      .catch((reason) => { if (!controller.signal.aborted && currentId === requestId.current) { setError(reason.response?.data?.message || reason.message || "Vessels could not be loaded."); setData(null); } })
      .finally(() => { if (!controller.signal.aborted && currentId === requestId.current) setLoading(false); });
    return () => controller.abort();
  }, [search, type, flag, dwtMin, dwtMax, gtMin, gtMax, sort, direction, page, retry, setParams]);

  const suggestions = useMemo(() => {
    if (!flagInput.trim()) return flags.slice(0, 12);
    return flags.filter((item) => flagMatches(item, flagInput)).slice(0, 12);
  }, [flags, flagInput]);
  const selectFlag = (value) => { setFlagInput(flagLabel(value)); setFlagOpen(false); setActiveOption(0); if (value !== flag) update({ flag: value }); };
  const flagKeyDown = (event) => {
    if (event.key === "Escape") { setFlagOpen(false); return; }
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault(); setFlagOpen(true);
      setActiveOption((current) => (current + (event.key === "ArrowDown" ? 1 : -1) + suggestions.length) % (suggestions.length || 1));
    }
    if (event.key === "Enter" && flagOpen && suggestions[activeOption]) { event.preventDefault(); selectFlag(suggestions[activeOption]); }
  };
  const onFlagInput = (value) => { setFlagInput(value); setFlagOpen(true); setActiveOption(0); if (flag) update({ flag: "" }); };
  const updating = loading || query.trim() !== search;
  const pageCount = Number(data?.pagination?.totalPages) || 0;
  const activeFilters = [["search", "Search", search], ["type", "Type", type], ["flag", "Flag", flag], ["dwtMin", "DWT from", dwtMin], ["dwtMax", "DWT to", dwtMax], ["gtMin", "GT from", gtMin], ["gtMax", "GT to", gtMax]].filter(([, , value]) => value);

  return <main className="vessel-directory">
    <header><div><span className="eyebrow">DIRECTORIES / VESSELS</span><h1>Vessel Directory</h1><p>Global vessel records and their known ownership links.</p></div><div className="vessel-directory-count">{!error && data && <strong>{Number(data.pagination.total).toLocaleString()} vessels</strong>}{updating && <span role="status" className="vessel-directory-loading"><i aria-hidden="true" /> Loading vessels...</span>}</div></header>
    <div className="vessel-directory-filters" aria-busy={updating}>
      <label>Search<input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Name, IMO, MMSI or call sign" /></label>
      <label>Type<input value={type} onChange={(event) => update({ type: event.target.value })} placeholder="Vessel type" /></label>
      <div className="vessel-flag-control"><label htmlFor="vessel-flag-input">Flag</label><div className="vessel-flag-input"><input id="vessel-flag-input" role="combobox" aria-expanded={flagOpen && suggestions.length > 0} aria-controls="vessel-flag-options" aria-autocomplete="list" aria-activedescendant={flagOpen && suggestions[activeOption] ? `vessel-flag-option-${activeOption}` : undefined} value={flagInput} onChange={(event) => onFlagInput(event.target.value)} onFocus={() => setFlagOpen(true)} onBlur={() => setTimeout(() => setFlagOpen(false), 120)} onKeyDown={flagKeyDown} placeholder="Type a flag, e.g. IND" />{flagInput && <button type="button" aria-label="Clear flag" onClick={() => selectFlag("")}><X size={14} /></button>}</div>
        {flagOpen && suggestions.length > 0 && <div id="vessel-flag-options" role="listbox" className="vessel-flag-options">{suggestions.map((item, index) => <button id={`vessel-flag-option-${index}`} role="option" aria-selected={index === activeOption} type="button" key={item} onMouseDown={(event) => event.preventDefault()} onClick={() => selectFlag(item)}>{flagLabel(item)}</button>)}</div>}
        {flagOpen && flagInput && flagInput !== flag && <small>Select a flag to apply it.</small>}
        {flagsError && <small role="status">{flagsError} <button type="button" onClick={() => { setFlagsError(""); setFlagRetry((value) => value + 1); }}>Retry flags</button></small>}
      </div>
      <label>DWT from<input type="number" min="0" value={dwtMin} onChange={(event) => updateBound("dwtMin", event.target.value)} /></label><label>to<input type="number" min="0" value={dwtMax} onChange={(event) => updateBound("dwtMax", event.target.value)} /></label>
      <label>GT from<input type="number" min="0" value={gtMin} onChange={(event) => updateBound("gtMin", event.target.value)} /></label><label>to<input type="number" min="0" value={gtMax} onChange={(event) => updateBound("gtMax", event.target.value)} /></label>
      <label>Sort<select value={sort} onChange={(event) => update({ sort: event.target.value })}><option value="name">Name</option><option value="imo">IMO</option><option value="dwt">DWT</option><option value="gt">GT</option><option value="yearBuilt">Year built</option></select></label>
      <label>Order<select value={direction} onChange={(event) => update({ direction: event.target.value })}><option value="asc">Ascending</option><option value="desc">Descending</option></select></label>
      {updating && <span className="vessel-filter-pending">Applying filters…</span>}
    </div>
    {activeFilters.length > 0 && <div className="vessel-active-filters" aria-label="Active vessel filters"><span>Active filters</span>{activeFilters.map(([key, label, value]) => <button type="button" key={key} onClick={() => key === "flag" ? selectFlag("") : key === "search" ? setQuery("") : update({ [key]: "" })} aria-label={`Remove ${label} filter: ${value}`}>{label}: {key === "flag" ? flagLabel(value) : value} <X size={13} aria-hidden="true" /></button>)}<button type="button" className="vessel-clear-filters" onClick={() => { setQuery(""); setFlagInput(""); update({ search: "", type: "", flag: "", dwtMin: "", dwtMax: "", gtMin: "", gtMax: "" }); }}>Clear all</button></div>}
    {error && <div role="alert" className="vessel-directory-error">{error} <button type="button" onClick={() => { setLoading(true); setRetry((value) => value + 1); }}>Retry</button></div>}
    <div className="vessel-grid vessel-directory-results" aria-busy={updating}>{!error && data?.vessels.map((vessel) => <DirectoryCard key={vessel.id} vessel={vessel} />)}</div>
    {!updating && !error && data && !data.vessels.length && <p className="vessel-directory-state">No matching vessels.</p>}
    {!error && data && <footer><span>Page {page} of {Math.max(1, pageCount)}</span><div><button disabled={updating || page <= 1} onClick={() => update({ page: page - 1 }, false)}>Previous</button><button disabled={updating || page >= pageCount} onClick={() => update({ page: page + 1 }, false)}>Next</button></div></footer>}
  </main>;
}
