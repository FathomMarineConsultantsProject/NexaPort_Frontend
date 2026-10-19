import { Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { getMaritimeDirectory } from "../api/maritimeDirectoryApi";
import {
  DirectoryPageHeader,
  DirectoryResultCard,
  StatusBadge,
} from "../components/directories/DirectoryUI";
import ViewToggle from "../components/common/ViewToggle";
import { isSuperAdmin } from "../utils/auth";
import "../styles/maritimeDirectory.css";
import { DIRECTORY_TYPE_LABELS } from "../config/maritimeDirectories";
import { directoryFleetCount } from "../utils/directoryData";

const initialFilters = { search: "", country: "", port: "", category: "", source: "", membershipTier: "", companyType: "all", reviewStatus: "", isActive: "", sort: "name-asc" };
const readFilters = (params) => Object.fromEntries(Object.entries(initialFilters).map(([key, fallback]) => [key, params.get(key) || fallback]));

export default function MaritimeDirectoryPage({ directory }) {
  const [searchParams, setSearchParams] = useSearchParams();
  const applied = useMemo(() => readFilters(searchParams), [searchParams]);
  const page = Math.max(1, Number.parseInt(searchParams.get("page"), 10) || 1);
  const viewMode = searchParams.get("view") === "table" ? "table" : "grid";
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState(() => readFilters(searchParams));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [refresh, setRefresh] = useState(0);

  useEffect(() => { Promise.resolve().then(() => setFilters(applied)); }, [applied]);

  useEffect(() => {
    let active = true;
    getMaritimeDirectory({
      type: directory.type,
      search: applied.search,
      country: applied.country,
      port: applied.port,
      category: applied.category,
      source: applied.source,
      membershipTier: applied.membershipTier,
      companyType: applied.companyType,
      reviewStatus: applied.reviewStatus,
      isActive: applied.isActive,
      page,
      limit: 20,
      sort: applied.sort,
    })
      .then((response) => {
        if (!active) return;
        setRows(Array.isArray(response.data) ? response.data : []);
        setPagination(response.pagination || { page, pages: 1, total: 0 });
      })
      .catch((requestError) => {
        if (active) setError(requestError.response?.data?.message || "Unable to load this directory.");
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => { active = false; };
  }, [applied, directory.type, page, refresh]);

  const sortedRows = useMemo(() => rows, [rows]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      const next = new URLSearchParams(searchParams);
      for (const [key, value] of Object.entries(filters)) value && value !== initialFilters[key] ? next.set(key, value) : next.delete(key);
      if (next.toString() === searchParams.toString()) return;
      next.delete("page");
      setLoading(true);
      setError("");
      setSearchParams(next, { replace: true });
    }, 250);
    return () => window.clearTimeout(timer);
  }, [filters, searchParams, setSearchParams]);

  return (
    <main className={`md-page md-page--${directory.type}`}>
      <DirectoryPageHeader directory={directory} total={pagination.total} canAdd={isSuperAdmin() && directory.type !== "owners_managers"} />

      <section className="md-filters" aria-label="Filter directory">
        <div className="md-filters__label">
          <SlidersHorizontal size={17} aria-hidden="true" />
          <span>Filter directory</span>
          <ViewToggle value={viewMode} onChange={(value) => setSearchParams((current) => { const next = new URLSearchParams(current); value === "table" ? next.set("view", "table") : next.delete("view"); return next; })} label="Directory layout" />
        </div>
        <label className="md-filters__search">
          <span>Search</span>
          <div><Search size={16} aria-hidden="true" /><input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Company, service, port or product" /></div>
        </label>
        <label><span>Country</span><input value={filters.country} onChange={(event) => setFilters({ ...filters, country: event.target.value })} placeholder="All countries" /></label>
        {directory.type === "supplier" && <label><span>Port</span><input value={filters.port} onChange={(event) => setFilters({ ...filters, port: event.target.value })} placeholder="Port or UN/LOCODE" /></label>}
        {directory.type === "supplier" && <label><span>Category</span><select value={filters.category} onChange={(event) => setFilters({ ...filters, category: event.target.value })}><option value="">All suppliers</option><option value="bunker">Bunker suppliers</option></select></label>}
        {directory.type === "supplier" && <label><span>Source</span><select value={filters.source} onChange={(event) => setFilters({ ...filters, source: event.target.value })}><option value="">All sources</option><option value="IMPA">IMPA members</option></select></label>}
        {directory.type === "supplier" && <label><span>Membership tier</span><select value={filters.membershipTier} onChange={(event) => setFilters({ ...filters, membershipTier: event.target.value })}><option value="">All tiers</option><option value="impa-premium">IMPA Premium</option></select></label>}
        {directory.type === "owners_managers" && <label><span>Company type</span><select value={filters.companyType} onChange={(event) => setFilters({ ...filters, companyType: event.target.value })}><option value="all">All</option><option value="owner">Owners</option><option value="manager">Managers</option><option value="both">Owner & Manager</option></select></label>}
        <label><span>Review status</span><select value={filters.reviewStatus} onChange={(event) => setFilters({ ...filters, reviewStatus: event.target.value })}><option value="">All statuses</option><option value="pending">Pending review</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></label>
        <label><span>Activity</span><select value={filters.isActive} onChange={(event) => setFilters({ ...filters, isActive: event.target.value })}><option value="">Active and inactive</option><option value="true">Active</option><option value="false">Inactive</option></select></label>
        <label><span>Sort</span><select value={filters.sort} onChange={(event) => setFilters({ ...filters, sort: event.target.value })}><option value="name-asc">Company name A–Z</option><option value="name-desc">Company name Z–A</option></select></label>
        <button type="button" className="md-filter-clear" onClick={() => { setFilters(initialFilters); setLoading(true); setError(""); setRefresh((value) => value + 1); setSearchParams((current) => { const next = new URLSearchParams(current); for (const key of Object.keys(initialFilters)) next.delete(key); next.delete("page"); return next; }); }}>Clear filters</button>
      </section>

      {loading ? (
        <div className="md-empty-state" role="status">Loading {directory.label.toLowerCase()}…</div>
      ) : error ? (
        <div className="md-empty-state" role="alert"><h2>Directory unavailable</h2><p>{error}</p><button type="button" className="md-primary-action" onClick={() => { setLoading(true); setError(""); setRefresh((value) => value + 1); }}>Try again</button></div>
      ) : sortedRows.length ? (
        viewMode === "grid" ? (
          <div className="md-results" aria-live="polite">
            {sortedRows.map((row) => <DirectoryResultCard key={row.id} row={row} directory={directory} />)}
          </div>
        ) : (
          <div className="dashboard-table-wrap md-table-register" aria-live="polite">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Company Name</th>
                  {directory.type === "owners_managers" && <><th>Type</th><th>Fleet</th><th>Contact</th></>}
                  <th>Location</th>
                  <th>Review Status</th>
                  <th>Activity</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map((row) => {
                  const location = [row.city, row.country].filter(Boolean).join(", ") || "—";
                  return (
                    <tr key={row.id}>
                      <td className="dashboard-table__link">
                        <Link to={`/directories/${directory.type}/${row.id}`}>
                          <strong>{row.company_name || row.companyName}</strong>
                          {row.public_id && <small className="nexaport-id">NexaPort ID: {row.public_id}</small>}
                        </Link>
                      </td>
                      {directory.type === "owners_managers" && <><td>{(row.directory_types || []).map((type) => DIRECTORY_TYPE_LABELS[type] || type).join(", ")}</td><td>{directoryFleetCount(row) ?? "—"}</td><td>{row.public_email || row.website || "—"}</td></>}
                      <td>{location}</td>
                      <td><StatusBadge status={row.review_status || row.reviewStatus} active={(row.is_active ?? row.isActive) !== false} /></td>
                      <td>{(row.is_active ?? row.isActive) !== false ? "Active" : "Inactive"}</td>
                      <td>
                        <Link className="dashboard-table__link" to={`/directories/${directory.type}/${row.id}`}>
                          View Dossier
                        </Link>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )
      ) : (
        <div className="md-empty-state">
          <h2>No companies match these filters</h2>
          <p>Change or clear a filter to broaden the directory.</p>
        </div>
      )}

      {pagination.pages > 1 && (
        <nav className="md-pagination" aria-label={`${directory.label} pages`}>
          <button type="button" disabled={page <= 1 || loading} onClick={() => { setLoading(true); setSearchParams((current) => { const next = new URLSearchParams(current); next.set("page", String(page - 1)); return next; }); }}>Previous</button>
          <span>Page {pagination.page || page} of {pagination.pages}</span>
          <button type="button" disabled={page >= pagination.pages || loading} onClick={() => { setLoading(true); setSearchParams((current) => { const next = new URLSearchParams(current); next.set("page", String(page + 1)); return next; }); }}>Next</button>
        </nav>
      )}
    </main>
  );
}
