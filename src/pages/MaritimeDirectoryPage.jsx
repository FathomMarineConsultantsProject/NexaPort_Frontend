import { Plus, Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getMaritimeDirectory } from "../api/maritimeDirectoryApi";
import "./MaritimeDirectoryPage.css";

export default function MaritimeDirectoryPage({ directory }) {
  const navigate = useNavigate();
  const Icon = directory.icon;
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState({ search: "", country: "", reviewStatus: "", isActive: "" });
  const [applied, setApplied] = useState(filters);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async (page = 1) => {
    setLoading(true); setError("");
    try {
      const response = await getMaritimeDirectory({ type: directory.type, ...applied, page, limit: 20 });
      setRows(response.data || []); setPagination(response.pagination || { page, pages: 1, total: 0 });
    } catch (requestError) {
      setError(requestError.response?.data?.message || "Unable to load this directory.");
    } finally { setLoading(false); }
  }, [applied, directory.type]);

  useEffect(() => {
    let active = true;
    getMaritimeDirectory({ type: directory.type, ...applied, page: 1, limit: 20 })
      .then((response) => { if (active) { setRows(response.data || []); setPagination(response.pagination || { page: 1, pages: 1, total: 0 }); } })
      .catch((requestError) => { if (active) setError(requestError.response?.data?.message || "Unable to load this directory."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [applied, directory.type]);
  const open = (id) => navigate(`/directories/${directory.type}/${id}`);

  return (
    <main className="maritime-directory">
      <header className="maritime-directory__header">
        <div className="maritime-directory__heading"><span className="maritime-directory__mark"><Icon size={22} /></span><div><small>Super Admin</small><h1>{directory.label}</h1><p>{directory.description}</p></div></div>
        <button type="button" className="maritime-primary" onClick={() => navigate(`/directories/${directory.type}/new`)}><Plus size={17} /> Add {directory.label.replace(/s$/, "")}</button>
      </header>

      <form className="maritime-filters" onSubmit={(event) => { event.preventDefault(); setLoading(true); setError(""); setApplied(filters); }}>
        <label><span>Search</span><div className="maritime-search"><Search size={16} /><input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Company, service, port or product" /></div></label>
        <label><span>Country</span><input value={filters.country} onChange={(event) => setFilters({ ...filters, country: event.target.value })} placeholder="All countries" /></label>
        <label><span>Review status</span><select value={filters.reviewStatus} onChange={(event) => setFilters({ ...filters, reviewStatus: event.target.value })}><option value="">All statuses</option><option value="pending">Pending review</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></label>
        <label><span>Activity</span><select value={filters.isActive} onChange={(event) => setFilters({ ...filters, isActive: event.target.value })}><option value="">Active and inactive</option><option value="true">Active</option><option value="false">Inactive</option></select></label>
        <button type="submit">Apply filters</button>
      </form>

      <div className="maritime-directory__meta"><strong>{pagination.total} records</strong>{error && <span role="alert">{error}</span>}</div>
      {loading ? <div className="maritime-state">Loading directory...</div> : error ? <div className="maritime-state"><p>{error}</p><button type="button" onClick={() => load(pagination.page)}>Try again</button></div> : !rows.length ? <div className="maritime-state"><Icon size={24} /><h2>No records found.</h2><p>Adjust the filters or add the first entry.</p></div> : (
        <div className="maritime-cards">{rows.map((row) => <article key={row.id} tabIndex="0" role="link" onClick={() => open(row.id)} onKeyDown={(event) => { if (["Enter", " "].includes(event.key)) { event.preventDefault(); open(row.id); } }}>
          <div className="maritime-card__logo">{row.logo_url ? <img src={row.logo_url} alt="" /> : <Icon size={20} />}</div>
          <div className="maritime-card__body"><div><h2>{row.company_name}</h2><span className={`maritime-badge ${row.review_status}`}>{row.review_status === "pending" ? "Pending Review" : row.review_status}</span>{!row.is_active && <span className="maritime-badge inactive">Inactive</span>}</div><p>{row.description_excerpt || "No description provided."}</p><small>{[row.city, row.country].filter(Boolean).join(", ") || "Location not provided"}</small></div>
          <dl><div><dt>Services</dt><dd>{row.service_count}</dd></div><div><dt>Ports</dt><dd>{row.port_count}</dd></div><div><dt>Branches</dt><dd>{row.branch_count}</dd></div></dl>
        </article>)}</div>
      )}
      {pagination.pages > 1 && <nav className="maritime-pagination" aria-label="Directory pages"><button disabled={pagination.page <= 1 || loading} onClick={() => load(pagination.page - 1)}>Previous</button><span>Page {pagination.page} of {pagination.pages}</span><button disabled={pagination.page >= pagination.pages || loading} onClick={() => load(pagination.page + 1)}>Next</button></nav>}
    </main>
  );
}
