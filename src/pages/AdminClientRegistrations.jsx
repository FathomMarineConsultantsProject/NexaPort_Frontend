import { Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  deactivateAdminClient,
  deleteAdminClient,
  getAdminClients,
  getClientDeletionImpact,
  getClientRegistrations,
} from "../api/adminClientRegistrationApi";
import TypedConfirmationModal from "../components/common/TypedConfirmationModal";
import CopyableContact from "../components/common/CopyableContact";
import "./AdminClientRegistrations.css";

const TABS = ["pending", "approved", "rejected", "clients"];
const CLIENT_FILTERS = ["all", "active", "inactive", "pending", "approved", "rejected", "legacy"];

export default function AdminClientRegistrations() {
  const navigate = useNavigate();
  const location = useLocation();
  const [tab, setTab] = useState(location.state?.tab === "clients" ? "clients" : "pending");
  const [clientFilter, setClientFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [accountAction, setAccountAction] = useState(null);

  const load = useCallback(() => {
    setLoading(true); setError("");
    const request = tab === "clients"
      ? getAdminClients({
        search, page, limit: 20,
        active_status: clientFilter === "active" ? "true" : clientFilter === "inactive" ? "false" : undefined,
        verification_status: ["pending", "approved", "rejected", "legacy"].includes(clientFilter) ? clientFilter : undefined,
      })
      : getClientRegistrations({ status: tab, search, page, limit: 20 });
    return request.then((response) => { setData(response.data || []); setPagination(response.pagination || {}); })
      .catch((requestError) => setError(requestError.response?.data?.message || "Failed to load records."))
      .finally(() => setLoading(false));
  }, [tab, clientFilter, search, page]);

  useEffect(() => { const timer = window.setTimeout(load, 250); return () => window.clearTimeout(timer); }, [load]);

  const prepareAccountAction = async (record) => {
    setError("");
    try { const response = await getClientDeletionImpact(record.user_id); setAccountAction({ record, dependencies: response.data, mode: response.data.has_immutable_history ? "deactivate" : "delete" }); }
    catch (requestError) { setError(requestError.response?.data?.message || "Failed to inspect Client dependencies."); }
  };

  const completeAccountAction = async ({ confirmation, reason }) => {
    setSaving(true); setError("");
    try {
      if (accountAction.mode === "delete") await deleteAdminClient(accountAction.record.user_id, confirmation, reason);
      else await deactivateAdminClient(accountAction.record.user_id, confirmation, reason);
      setAccountAction(null); await load();
    } catch (requestError) { setError(requestError.response?.data?.message || "Client account action failed."); }
    finally { setSaving(false); }
  };

  return <div className="admin-clients-page">
    <header><div><span>Super Admin</span><h1>{tab === "clients" ? "Clients" : "Client Registrations"}</h1><p>{tab === "clients" ? "Manage all role-3 Client accounts, including legacy accounts." : "Review company onboarding submissions and verification status."}</p></div><div className="admin-client-search"><Search size={17}/><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search Client, company, email or registration number"/></div></header>
    <div className="admin-client-tabs">{TABS.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => { setTab(item); setPage(1); }}>{item}</button>)}</div>
    {tab === "clients" && <div className="client-account-filters">{CLIENT_FILTERS.map((item) => <button type="button" key={item} className={clientFilter === item ? "active" : ""} onClick={() => { setClientFilter(item); setPage(1); }}>{item}</button>)}</div>}
    {error && <div className="admin-client-error">{error}</div>}
    <div className={`admin-client-table-wrap ${tab === "clients" ? "clients-table" : ""}`}><table><thead>{tab === "clients" ? <tr><th>Client</th><th>Company</th><th>Phone</th><th>Country</th><th>Verification</th><th>Account</th><th>Created</th><th>Actions</th></tr> : <tr><th>Applicant</th><th>Company</th><th>Country</th><th>Submitted</th><th>Status</th><th>Resubmissions</th><th/></tr>}</thead><tbody>
      {loading ? <tr><td colSpan="8">Loading...</td></tr> : !data.length ? <tr><td colSpan="8">No records found.</td></tr> : tab === "clients" ? data.map((record) => <tr className="client-clickable-row" tabIndex="0" aria-label={`Open Client profile for ${record.full_name}`} onClick={() => navigate(`/admin/clients/${record.user_id}`)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); navigate(`/admin/clients/${record.user_id}`); } }} key={record.user_id}><td><Link className="client-name-link" to={`/admin/clients/${record.user_id}`} onClick={(event) => event.stopPropagation()}>{record.full_name}</Link><div className="client-contact-cell" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}><CopyableContact value={record.email} href={`mailto:${record.email}`} type="email"/></div></td><td>{record.company_legal_name || (record.is_legacy ? "Legacy Client" : "Missing company data")}</td><td><div className="client-contact-cell" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}>{record.phone ? <CopyableContact value={record.phone} href={`tel:${record.phone}`} type="phone"/> : "—"}</div></td><td>{record.country || "—"}</td><td><span className={`admin-status ${record.verification_status}`}>{record.verification_status}</span></td><td><span className={`account-state ${record.is_active ? "active" : "inactive"}`}>{record.is_active ? "Active" : "Inactive"}</span></td><td>{new Date(record.created_at).toLocaleDateString()}</td><td><div className="client-row-actions" onClick={(event) => event.stopPropagation()} onKeyDown={(event) => event.stopPropagation()}><button onClick={() => navigate(`/admin/clients/${record.user_id}`)}>View/Edit</button><button className="danger" onClick={() => prepareAccountAction(record)}>Delete</button></div></td></tr>) : data.map((record) => <tr key={record.id}><td><strong>{record.full_name}</strong><small>{record.email}</small></td><td><strong>{record.company_legal_name || "Onboarding incomplete"}</strong><small>{record.registration_number || "No registration number"}</small></td><td>{record.country || "—"}</td><td>{record.verification_submitted_at ? new Date(record.verification_submitted_at).toLocaleDateString() : "—"}</td><td><span className={`admin-status ${record.verification_status}`}>{record.verification_status}</span></td><td>{record.resubmission_count}</td><td><button onClick={() => navigate(`/admin/client-registrations/${record.id}`)}>View Registration</button></td></tr>)}
    </tbody></table></div>
    {tab === "clients" && <div className="client-mobile-list">{loading ? <p>Loading...</p> : !data.length ? <p>No records found.</p> : data.map((record) => <article key={record.user_id}><div className="client-mobile-heading"><div><Link to={`/admin/clients/${record.user_id}`}>{record.full_name}</Link><CopyableContact value={record.email} href={`mailto:${record.email}`} type="email"/></div><span className={`account-state ${record.is_active ? "active" : "inactive"}`}>{record.is_active ? "Active" : "Inactive"}</span></div><dl><div><dt>Company</dt><dd>{record.company_legal_name || (record.is_legacy ? "Legacy Client" : "Missing company data")}</dd></div><div><dt>Phone</dt><dd>{record.phone ? <CopyableContact value={record.phone} href={`tel:${record.phone}`} type="phone"/> : "—"}</dd></div><div><dt>Country</dt><dd>{record.country || "—"}</dd></div><div><dt>Verification</dt><dd><span className={`admin-status ${record.verification_status}`}>{record.verification_status}</span></dd></div></dl><div className="client-row-actions"><button onClick={() => navigate(`/admin/clients/${record.user_id}`)}>View/Edit</button><button className="danger" onClick={() => prepareAccountAction(record)}>Delete</button></div></article>)}</div>}
    <footer><span>{pagination.total || 0} records</span><div><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {pagination.page || page} of {pagination.pages || 1}</span><button disabled={page >= (pagination.pages || 1)} onClick={() => setPage((value) => value + 1)}>Next</button></div></footer>
    {accountAction && <TypedConfirmationModal
      title={accountAction.mode === "delete" ? "Permanently delete Client?" : "Deactivate and anonymize Client?"}
      subject={accountAction.record.full_name}
      company={accountAction.record.company_legal_name}
      warning={accountAction.mode === "delete" ? "This dependency-free Client account and disposable registration data will be permanently removed." : "Operational history will be preserved while login and identifying account data are removed."}
      dependencies={accountAction.dependencies}
      confirmationText={accountAction.mode === "delete" ? "DELETE" : "DEACTIVATE"}
      confirmLabel={accountAction.mode === "delete" ? "Permanently Delete" : "Deactivate and Anonymize"}
      requireReason
      busy={saving}
      error={error}
      onCancel={() => !saving && setAccountAction(null)}
      onConfirm={completeAccountAction}
    />}
  </div>;
}
