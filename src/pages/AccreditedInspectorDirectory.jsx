import {
  BadgeCheck,
  ExternalLink,
  Mail,
  MapPin,
  Phone,
  RotateCw,
  Search,
  UserRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  getAccreditationSchemes,
  getAccreditedInspectors,
} from "../api/accreditedInspectorApi";
import CopyableContact from "../components/common/CopyableContact";
import DirectoryDetailsModal, { DirectoryDetailGrid } from "../components/common/DirectoryDetailsModal";
import ViewToggle from "../components/common/ViewToggle";
import "./AccreditedInspectorDirectory.css";

const emptySummary = { inspector_count: 0, country_count: 0 };
const VIEW_KEY = "np_accredited_inspectors_view";
const initialView = () => {
  try {
    const stored = localStorage.getItem(VIEW_KEY);
    return stored === "list" || stored === "grid" ? stored : "grid";
  } catch {
    return "grid";
  }
};

export default function AccreditedInspectorDirectory() {
  const { schemeSlug } = useParams();
  const navigate = useNavigate();
  const [schemes, setSchemes] = useState([]);
  const [scheme, setScheme] = useState(null);
  const [inspectors, setInspectors] = useState([]);
  const [filters, setFilters] = useState({ countries: [], rcms_statuses: [] });
  const [summary, setSummary] = useState(emptySummary);
  const [search, setSearch] = useState("");
  const [country, setCountry] = useState("");
  const [rcms, setRcms] = useState("");
  const [loadingSchemes, setLoadingSchemes] = useState(true);
  const [loadingDirectory, setLoadingDirectory] = useState(false);
  const [error, setError] = useState("");
  const [retryKey, setRetryKey] = useState(0);
  const [view, setView] = useState(initialView);
  const [selectedInspector, setSelectedInspector] = useState(null);

  useEffect(() => {
    let active = true;

    const loadSchemes = async () => {
      setLoadingSchemes(true);
      setError("");
      try {
        const response = await getAccreditationSchemes();
        if (!active) return;
        const loaded = response.schemes || [];
        setSchemes(loaded);
        const selected = loaded.find(
          (item) => item.slug.toLowerCase() === String(schemeSlug || "").toLowerCase()
        );
        if (loaded.length && !selected) {
          navigate(`/accredited-inspectors/${loaded[0].slug}`, { replace: true });
        }
      } catch (requestError) {
        if (active) {
          setError(
            requestError.response?.data?.message ||
              "Failed to load accreditation schemes."
          );
        }
      } finally {
        if (active) setLoadingSchemes(false);
      }
    };

    loadSchemes();
    return () => {
      active = false;
    };
  }, [navigate, retryKey, schemeSlug]);

  useEffect(() => {
    if (!schemeSlug || !schemes.some((item) => item.slug === schemeSlug)) {
      return undefined;
    }

    let active = true;
    const timer = window.setTimeout(async () => {
      setLoadingDirectory(true);
      setError("");
      try {
        const response = await getAccreditedInspectors(schemeSlug, {
          search: search.trim(),
          country,
          rcms,
        });
        if (!active) return;
        setScheme(response.scheme || null);
        setInspectors(response.inspectors || []);
        setFilters(response.filters || { countries: [], rcms_statuses: [] });
        setSummary(response.summary || emptySummary);
      } catch (requestError) {
        if (!active) return;
        setInspectors([]);
        setSummary(emptySummary);
        setError(
          requestError.response?.data?.message ||
            "Failed to load accredited inspectors."
        );
      } finally {
        if (active) setLoadingDirectory(false);
      }
    }, 300);

    return () => {
      active = false;
      window.clearTimeout(timer);
    };
  }, [country, rcms, retryKey, schemeSlug, schemes, search]);

  const changeScheme = (nextSlug) => {
    setSearch("");
    setCountry("");
    setRcms("");
    setInspectors([]);
    setSummary(emptySummary);
    navigate(`/accredited-inspectors/${nextSlug}`);
  };

  const schemeLabel = (item) => `${item.code} — ${item.name}`;
  const sourceLabel = scheme?.code
    ? `${scheme.code} Accredited Inspectors Directory`
    : "Accredited Inspectors Directory";
  const changeView = (nextView) => {
    setView(nextView);
    try { localStorage.setItem(VIEW_KEY, nextView); } catch { /* Preference remains in memory. */ }
  };
  const handleRowKeyDown = (event, inspector) => {
    if (event.target !== event.currentTarget) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      setSelectedInspector(inspector);
    }
  };

  return (
    <main className="accredited-page">
      <section className="accredited-heading">
        <div>
          <span className="accredited-eyebrow">Professional directory</span>
          <h1>Accredited Inspectors</h1>
          <p>
            Browse inspectors accredited under recognized maritime and terminal
            inspection schemes.
          </p>
        </div>
        {scheme?.source_url && (
          <a
            className="accredited-source-link"
            href={scheme.source_url}
            target="_blank"
            rel="noopener noreferrer"
          >
            View official directory <ExternalLink size={15} />
          </a>
        )}
      </section>

      {!loadingSchemes && schemes.length > 0 && (
        <section className="accredited-controls" aria-label="Directory filters">
          <label>
            <span>Accreditation scheme</span>
            <select
              value={schemeSlug || ""}
              onChange={(event) => changeScheme(event.target.value)}
            >
              {schemes.map((item) => (
                <option key={item.id} value={item.slug}>
                  {schemeLabel(item)}
                </option>
              ))}
            </select>
          </label>

          <label className="accredited-search">
            <span>Search directory</span>
            <div>
              <Search size={18} />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by inspector name, country, email, or phone..."
              />
            </div>
          </label>

          <label>
            <span>Country</span>
            <select value={country} onChange={(event) => setCountry(event.target.value)}>
              <option value="">All Countries</option>
              {filters.countries.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <label>
            <span>RCMS status</span>
            <select value={rcms} onChange={(event) => setRcms(event.target.value)}>
              <option value="">All RCMS Statuses</option>
              {filters.rcms_statuses.map((item) => (
                <option key={item} value={item}>{item}</option>
              ))}
            </select>
          </label>

          <div className="accredited-summary" aria-live="polite">
            <strong>{summary.inspector_count}</strong>
            <span>{summary.inspector_count === 1 ? "Inspector" : "Inspectors"}</span>
            <i />
            <strong>{summary.country_count}</strong>
            <span>{summary.country_count === 1 ? "Country" : "Countries"}</span>
          </div>
        </section>
      )}

      {error && (
        <section className="accredited-state accredited-error" role="alert">
          <h2>Directory unavailable</h2>
          <p>{error}</p>
          <button type="button" onClick={() => setRetryKey((value) => value + 1)}>
            <RotateCw size={15} /> Retry
          </button>
        </section>
      )}

      {!error && loadingSchemes && (
        <section className="accredited-skeleton-grid" aria-label="Loading accreditation schemes">
          {[1, 2, 3].map((item) => <div className="accredited-skeleton" key={item} />)}
        </section>
      )}

      {!error && !loadingSchemes && schemes.length === 0 && (
        <section className="accredited-state">
          <BadgeCheck size={28} />
          <h2>No accreditation schemes are currently available.</h2>
          <p>The directory will appear when an active scheme has been configured.</p>
        </section>
      )}

      {!error && !loadingSchemes && schemes.length > 0 && loadingDirectory && (
        <section className="accredited-skeleton-grid" aria-label="Loading accredited inspectors">
          {[1, 2, 3, 4, 5, 6].map((item) => <div className="accredited-skeleton" key={item} />)}
        </section>
      )}

      {!error && !loadingDirectory && scheme && inspectors.length === 0 && (
        <section className="accredited-state">
          <Search size={28} />
          <h2>No accredited inspectors match the current filters.</h2>
          <p>Try changing the search term, country, or RCMS status.</p>
        </section>
      )}

      {!error && !loadingDirectory && inspectors.length > 0 && (
        <section className="accredited-results">
          <div className="accredited-results-heading">
            <div>
              <span>Directory results</span>
              <h2>{schemeLabel(scheme)}</h2>
            </div>
            <div className="accredited-results-actions">
              {scheme.description && <p>{scheme.description}</p>}
              <ViewToggle value={view} onChange={changeView} label="Accredited inspector results view" />
            </div>
          </div>

          {view === "grid" ? <div className="accredited-grid">
            {inspectors.map((inspector) => (
              <article className="accredited-card" key={inspector.id}>
                <div className="accredited-card-head">
                  <div className="accredited-avatar"><UserRound size={23} /></div>
                  <div>
                    <span>External directory record</span>
                    <h3>{inspector.full_name}</h3>
                    <p>{scheme.code} Accredited Inspector</p>
                  </div>
                </div>

                <div className="accredited-card-body">
                  <div className="accredited-contact-row">
                    <MapPin size={16} />
                    <div><span>Country</span><strong>{inspector.country}</strong></div>
                  </div>
                  {inspector.telephone && (
                    <div className="accredited-contact-row">
                      <Phone size={16} />
                      <div><span>Phone</span><CopyableContact value={inspector.telephone} href={`tel:${inspector.telephone}`} type="phone" /></div>
                    </div>
                  )}
                  {inspector.email && (
                    <div className="accredited-contact-row">
                      <Mail size={16} />
                      <div><span>Email</span><CopyableContact value={inspector.email} href={`mailto:${inspector.email}`} type="email" /></div>
                    </div>
                  )}
                </div>

                <div className="accredited-card-foot">
                  {inspector.rcms_status && <span className="accredited-rcms">RCMS: {inspector.rcms_status}</span>}
                  <span className="accredited-source">Source: {sourceLabel}</span>
                </div>
              </article>
            ))}
          </div> : (
            <div className="accredited-table-wrap">
              <table className="accredited-table">
                <thead><tr><th>Name</th><th>Accreditation scheme</th><th>Email</th><th>Phone</th><th>Country</th><th>RCMS status</th><th><span className="sr-only">Action</span></th></tr></thead>
                <tbody>
                  {inspectors.map((inspector) => (
                    <tr
                      key={inspector.id}
                      tabIndex={0}
                      onClick={() => setSelectedInspector(inspector)}
                      onKeyDown={(event) => handleRowKeyDown(event, inspector)}
                    >
                      <td><strong>{inspector.full_name}</strong></td>
                      <td>{scheme.code} — {scheme.name}</td>
                      <td>{inspector.email ? <CopyableContact value={inspector.email} href={`mailto:${inspector.email}`} type="email" /> : "—"}</td>
                      <td>{inspector.telephone ? <CopyableContact value={inspector.telephone} href={`tel:${inspector.telephone}`} type="phone" /> : "—"}</td>
                      <td>{inspector.country || "—"}</td>
                      <td>{inspector.rcms_status || "—"}</td>
                      <td><button type="button" onClick={(event) => { event.stopPropagation(); setSelectedInspector(inspector); }}>View details</button></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {selectedInspector && (
        <DirectoryDetailsModal
          eyebrow={`${scheme?.code || ""} Accredited Inspector`}
          title={selectedInspector.full_name}
          onClose={() => setSelectedInspector(null)}
        >
          <DirectoryDetailGrid entries={[
            ["Accreditation scheme", scheme ? `${scheme.code} — ${scheme.name}` : ""],
            ["Country", selectedInspector.country],
            ["RCMS status", selectedInspector.rcms_status || "Not specified"],
            ["Email", selectedInspector.email ? <a href={`mailto:${selectedInspector.email}`}>{selectedInspector.email}</a> : ""],
            ["Phone", selectedInspector.telephone ? <a href={`tel:${selectedInspector.telephone}`}>{selectedInspector.telephone}</a> : ""],
            ["Record type", "External directory record"],
            ["Source", selectedInspector.source_name || sourceLabel],
            ["Source last checked", selectedInspector.source_last_checked_at ? new Date(selectedInspector.source_last_checked_at).toLocaleString() : ""],
          ]} />
          {selectedInspector.source_url && <a className="directory-modal-source" href={selectedInspector.source_url} target="_blank" rel="noopener noreferrer">View source <ExternalLink size={14} /></a>}
        </DirectoryDetailsModal>
      )}
    </main>
  );
}
