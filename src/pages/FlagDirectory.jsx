import { Building2, ChevronDown, ChevronRight, MapPin, Search, UserRound } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getFlagDirectory, getFlags } from "../api/flagApi";
import ConsultantAvatar from "../components/experts/ConsultantAvatar";
import { isClient } from "../utils/auth";
import "./FlagDirectory.css";

const coverageLabel = (record) => {
  if (record.record_type === "external") return record.areas_covered_text || [record.location, record.region, record.country].filter(Boolean).join(", ");
  const first = record.coverage?.[0];
  if (!first) return [record.base_location, record.country].filter(Boolean).join(", ");
  return [[first.location, first.region, first.country].filter(Boolean).join(", "), first.coverage_note].filter(Boolean).join(" - ");
};

const recordCountry = (record) => record.record_type === "external" ? record.country || "Unspecified Country" : record.coverage?.[0]?.country || record.country || "Unspecified Country";
const recordLocation = (record) => record.record_type === "external" ? record.location || "Unspecified Location" : record.coverage?.[0]?.location || record.base_location || "Unspecified Location";
const countText = (count) => `${count} ${count === 1 ? "inspector" : "inspectors"}`;

export default function FlagDirectory() {
  const { flagSlug } = useParams();
  const navigate = useNavigate();
  const [flags, setFlags] = useState([]);
  const [selectedFlag, setSelectedFlag] = useState(null);
  const [search, setSearch] = useState("");
  const [records, setRecords] = useState([]);
  const [openCountry, setOpenCountry] = useState(null);
  const [openLocations, setOpenLocations] = useState({});
  const [loadingFlags, setLoadingFlags] = useState(true);
  const [loadingDirectory, setLoadingDirectory] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    (async () => {
      setLoadingFlags(true); setError("");
      try {
        const loadedFlags = (await getFlags()).flags || [];
        if (!active) return;
        setFlags(loadedFlags);
        const routeFlag = loadedFlags.find((flag) => flag.slug === flagSlug);
        const nextFlag = routeFlag || loadedFlags[0] || null;
        setSelectedFlag(nextFlag);
        if ((!flagSlug || !routeFlag) && nextFlag) navigate(`/flag/${nextFlag.slug}`, { replace: true });
      } catch (err) { if (active) setError(err.response?.data?.message || "Failed to load Flags."); }
      finally { if (active) setLoadingFlags(false); }
    })();
    return () => { active = false; };
  }, [flagSlug, navigate]);

  useEffect(() => {
    if (!selectedFlag?.slug) return undefined;
    let active = true;
    const timer = window.setTimeout(async () => {
      setLoadingDirectory(true); setError("");
      try {
        const response = await getFlagDirectory(selectedFlag.slug, { search });
        if (active) {
          const nextRecords = response.records || [];
          const firstCountry = [...new Set(nextRecords.map(recordCountry))].sort((a, b) => a.localeCompare(b))[0] || null;
          setRecords(nextRecords);
          setOpenCountry(firstCountry);
          setOpenLocations({});
        }
      } catch (err) { if (active) { setRecords([]); setError(err.response?.data?.message || "Failed to load Flag directory."); } }
      finally { if (active) setLoadingDirectory(false); }
    }, 250);
    return () => { active = false; window.clearTimeout(timer); };
  }, [selectedFlag, search]);

  const groups = useMemo(() => {
    const countries = new Map();
    records.forEach((record) => {
      const country = recordCountry(record), location = recordLocation(record);
      if (!countries.has(country)) countries.set(country, new Map());
      if (!countries.get(country).has(location)) countries.get(country).set(location, []);
      countries.get(country).get(location).push(record);
    });
    return [...countries.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([country, locations]) => ({
      country, locations: [...locations.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([location, items]) => ({ location, items })),
    }));
  }, [records]);

  const locationCount = groups.reduce((sum, group) => sum + group.locations.length, 0);
  const chooseFlag = (flag) => { if (flag) { setSelectedFlag(flag); setSearch(""); navigate(`/flag/${flag.slug}`); } };

  const renderRecord = (record) => {
    const external = record.record_type === "external";
    const companyOnly = external && !record.full_name && record.organization_name;
    const displayName = record.full_name || record.organization_name || "Flag inspector";
    const location = [record.location || record.base_location, record.region, record.country].filter(Boolean).join(", ");
    const card = <article className={`flag-record-card ${record.record_type}`}>
      <div className="flag-record-identity"><div className="flag-record-avatar">{companyOnly ? <Building2 size={22} /> : external ? <UserRound size={22} /> : <ConsultantAvatar className="flag-consultant-avatar" photoUrl={record.photo_url} name={record.full_name} />}</div><div className="flag-record-heading"><span className="flag-source-badge">{external ? "External Directory" : "NexaPort Consultant"}</span><h4>{displayName}</h4></div></div>
      <div className="flag-record-details">
        {record.organization_name && !companyOnly && <p className="flag-record-line"><Building2 size={15} /><span>{record.organization_name}</span></p>}
        {location && <p className="flag-record-line"><MapPin size={15} /><span>{location}</span></p>}
        {coverageLabel(record) && <div className="flag-record-coverage"><strong>Areas covered</strong><p>{coverageLabel(record)}</p></div>}
      </div><span className="flag-profile-action">View Profile <ChevronRight size={15} /></span>
    </article>;
    if (external) return <Link key={`external-${record.id}`} className="flag-record-link" to={`/flag/${selectedFlag.slug}/inspectors/${record.id}`}>{card}</Link>;
    if (isClient()) return <div key={`nexaport-${record.expert_id}`} className="flag-record-static">{card}</div>;
    return <Link key={`nexaport-${record.expert_id}`} className="flag-record-link" to={`/experts/${record.expert_id}`}>{card}</Link>;
  };

  return <main className="flag-page">
    <section className="flag-header">
      <div className="flag-title-block"><span className="flag-eyebrow">Maritime directory</span><h1>Flag Inspectors</h1><p>Browse Flag State inspection contacts and registered NexaPort Flag consultants.</p></div>
      <div className="flag-toolbar">
        <label className="flag-control"><span>Flag state</span><select value={selectedFlag?.slug || ""} onChange={(e) => chooseFlag(flags.find((flag) => flag.slug === e.target.value))} disabled={loadingFlags}>{loadingFlags ? <option>Loading flags...</option> : flags.map((flag) => <option key={flag.id} value={flag.slug}>{flag.name}</option>)}</select></label>
        <label className="flag-control flag-search"><span>Search directory</span><div><Search size={18} /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name, company, country, location or coverage" /></div></label>
        <div className="flag-summary" aria-live="polite"><strong>{records.length}</strong><span>inspectors</span><i /><strong>{groups.length}</strong><span>countries</span><i /><strong>{locationCount}</strong><span>locations</span></div>
      </div>
      {!loadingFlags && !!flags.length && <div className="flag-quick-select"><span>Quick select</span>{flags.map((flag) => <button type="button" key={flag.id} className={selectedFlag?.id === flag.id ? "active" : ""} onClick={() => chooseFlag(flag)}>{flag.name}</button>)}</div>}
    </section>
    {error && <div className="flag-state error">{error}</div>}
    {loadingDirectory ? <div className="flag-skeleton-list" aria-label="Loading Flag inspectors">{[1,2,3].map((n) => <div className="flag-skeleton" key={n}><span /><span /></div>)}</div>
      : !selectedFlag ? <div className="flag-state"><h2>No flag states available</h2><p>No active Flag directories are currently available.</p></div>
      : !groups.length ? <div className="flag-state"><Search size={25} /><h2>No inspectors found</h2><p>Try a different search term or choose another flag state.</p>{search && <button type="button" onClick={() => setSearch("")}>Clear search</button>}</div>
      : <section className="flag-results"><div className="flag-results-heading"><div><span>Directory results</span><h2>{selectedFlag.name}</h2></div><p>{countText(records.length)} across {groups.length} {groups.length === 1 ? "country" : "countries"}</p></div>
        {groups.map((group) => { const countryOpen = openCountry === group.country; const total = group.locations.reduce((sum, location) => sum + location.items.length, 0); return <article className={`flag-country-group ${countryOpen ? "open" : ""}`} key={group.country}>
          <button type="button" className="flag-country-head" onClick={() => setOpenCountry(countryOpen ? null : group.country)} aria-expanded={countryOpen}><span className="flag-country-toggle">{countryOpen ? <ChevronDown size={19} /> : <ChevronRight size={19} />}<span><strong>{group.country}</strong><small>Flag inspection coverage</small></span></span><span className="flag-country-counts"><span><strong>{group.locations.length}</strong> {group.locations.length === 1 ? "location" : "locations"}</span><span><strong>{total}</strong> {total === 1 ? "inspector" : "inspectors"}</span></span></button>
          {countryOpen && <div className="flag-country-body"><div className="flag-location-list">{group.locations.map((location) => { const key = `${group.country}-${location.location}`, opened = openLocations[key] ?? true; return <section className="flag-location-group" key={key}><button type="button" className="flag-location-head" onClick={() => setOpenLocations((prev) => ({...prev, [key]: !opened}))} aria-expanded={opened}><span>{opened ? <ChevronDown size={17} /> : <ChevronRight size={17} />}<MapPin size={16} />{location.location}</span><strong>{countText(location.items.length)}</strong></button>{opened && <div className="flag-record-grid">{location.items.map(renderRecord)}</div>}</section>; })}</div></div>}
        </article>; })}
      </section>}
  </main>;
}
