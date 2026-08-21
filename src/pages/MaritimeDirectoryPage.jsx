import { Search, SlidersHorizontal } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getMaritimeDirectory } from "../api/maritimeDirectoryApi";
import {
  DirectoryPageHeader,
  DirectoryResultCard,
  StatusBadge,
} from "../components/directories/DirectoryUI";
import ViewToggle from "../components/common/ViewToggle";
import { isSuperAdmin } from "../utils/auth";
import "../styles/maritimeDirectory.css";

const initialFilters = { search: "", country: "", reviewStatus: "", isActive: "", sort: "name-asc" };

export default function MaritimeDirectoryPage({ directory }) {
  const [rows, setRows] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [filters, setFilters] = useState(initialFilters);
  const [applied, setApplied] = useState(initialFilters);
  const [page, setPage] = useState(1);
  const [viewMode, setViewMode] = useState("grid");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    getMaritimeDirectory({
      type: directory.type,
      search: applied.search,
      country: applied.country,
      reviewStatus: applied.reviewStatus,
      isActive: applied.isActive,
      page,
      limit: 20,
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
  }, [applied, directory.type, page]);

  const sortedRows = useMemo(() => [...rows].sort((left, right) => {
    const a = String(left.company_name || left.companyName || "");
    const b = String(right.company_name || right.companyName || "");
    return applied.sort === "name-desc" ? b.localeCompare(a) : a.localeCompare(b);
  }), [applied.sort, rows]);

  const applyFilters = (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setPage(1);
    setApplied(filters);
  };

  return (
    <main className={`md-page md-page--${directory.type}`}>
      <DirectoryPageHeader directory={directory} total={pagination.total} canAdd={isSuperAdmin()} />

      <form className="md-filters" onSubmit={applyFilters}>
        <div className="md-filters__label">
          <SlidersHorizontal size={17} aria-hidden="true" />
          <span>Filter directory</span>
          <ViewToggle value={viewMode} onChange={setViewMode} label="Directory layout" />
        </div>
        <label className="md-filters__search">
          <span>Search</span>
          <div><Search size={16} aria-hidden="true" /><input value={filters.search} onChange={(event) => setFilters({ ...filters, search: event.target.value })} placeholder="Company, service, port or product" /></div>
        </label>
        <label><span>Country</span><input value={filters.country} onChange={(event) => setFilters({ ...filters, country: event.target.value })} placeholder="All countries" /></label>
        <label><span>Review status</span><select value={filters.reviewStatus} onChange={(event) => setFilters({ ...filters, reviewStatus: event.target.value })}><option value="">All statuses</option><option value="pending">Pending review</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></label>
        <label><span>Activity</span><select value={filters.isActive} onChange={(event) => setFilters({ ...filters, isActive: event.target.value })}><option value="">Active and inactive</option><option value="true">Active</option><option value="false">Inactive</option></select></label>
        <label><span>Sort</span><select value={filters.sort} onChange={(event) => setFilters({ ...filters, sort: event.target.value })}><option value="name-asc">Company name A–Z</option><option value="name-desc">Company name Z–A</option></select></label>
        <button type="submit">Apply filters</button>
      </form>

      {error && <div className="md-alert" role="alert">{error}</div>}
      {loading ? (
        <div className="md-empty-state">Loading {directory.label.toLowerCase()}…</div>
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
                        </Link>
                      </td>
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
          <button type="button" disabled={page <= 1 || loading} onClick={() => { setLoading(true); setPage((value) => value - 1); }}>Previous</button>
          <span>Page {pagination.page || page} of {pagination.pages}</span>
          <button type="button" disabled={page >= pagination.pages || loading} onClick={() => { setLoading(true); setPage((value) => value + 1); }}>Next</button>
        </nav>
      )}
    </main>
  );
}
