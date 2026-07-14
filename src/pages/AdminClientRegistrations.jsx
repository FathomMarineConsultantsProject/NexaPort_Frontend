import { Search } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getClientRegistrations } from "../api/adminClientRegistrationApi";
import "./AdminClientRegistrations.css";

const STATUSES = ["pending", "approved", "rejected"];
export default function AdminClientRegistrations() {
  const navigate = useNavigate();
  const [status, setStatus] = useState("pending");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(true); setError("");
      getClientRegistrations({ status, search, page, limit: 20 })
        .then((response) => { setData(response.data || []); setPagination(response.pagination || {}); })
        .catch((requestError) => setError(requestError.response?.data?.message || "Failed to load Client registrations."))
        .finally(() => setLoading(false));
    }, 250);
    return () => window.clearTimeout(timer);
  }, [status, search, page]);

  return <div className="admin-clients-page"><header><div><span>Super Admin</span><h1>Client Registrations</h1><p>Review company onboarding submissions and verification status.</p></div><div className="admin-client-search"><Search size={17} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search applicant, company, email or registration number" /></div></header><div className="admin-client-tabs">{STATUSES.map((item) => <button key={item} className={status === item ? "active" : ""} onClick={() => { setStatus(item); setPage(1); }}>{item}</button>)}</div>{error && <div className="admin-client-error">{error}</div>}<div className="admin-client-table-wrap"><table><thead><tr><th>Applicant</th><th>Company</th><th>Country</th><th>Submitted</th><th>Status</th><th>Resubmissions</th><th /></tr></thead><tbody>{loading ? <tr><td colSpan="7">Loading registrations...</td></tr> : !data.length ? <tr><td colSpan="7">No registrations found.</td></tr> : data.map((record) => <tr key={record.id}><td><strong>{record.full_name}</strong><small>{record.email}</small></td><td><strong>{record.company_legal_name || "Onboarding incomplete"}</strong><small>{record.registration_number || "No registration number"}</small></td><td>{record.country || "—"}</td><td>{record.verification_submitted_at ? new Date(record.verification_submitted_at).toLocaleDateString() : "—"}</td><td><span className={`admin-status ${record.verification_status}`}>{record.verification_status}</span></td><td>{record.resubmission_count}</td><td><button onClick={() => navigate(`/admin/client-registrations/${record.id}`)}>View Registration</button></td></tr>)}</tbody></table></div><footer><span>{pagination.total || 0} registrations</span><div><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {pagination.page || page} of {pagination.pages || 1}</span><button disabled={page >= (pagination.pages || 1)} onClick={() => setPage((value) => value + 1)}>Next</button></div></footer></div>;
}
