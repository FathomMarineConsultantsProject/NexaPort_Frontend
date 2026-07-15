import { Search } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  deactivateAdminClient,
  deleteAdminClient,
  getAdminClient,
  getAdminClients,
  getClientDeletionImpact,
  getClientRegistrations,
  updateAdminClient,
} from "../api/adminClientRegistrationApi";
import TypedConfirmationModal from "../components/common/TypedConfirmationModal";
import "./AdminClientRegistrations.css";

const TABS = ["pending", "approved", "rejected", "clients"];
const CLIENT_FILTERS = ["all", "active", "inactive", "pending", "approved", "rejected", "legacy"];

export default function AdminClientRegistrations() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("pending");
  const [clientFilter, setClientFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [data, setData] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [editing, setEditing] = useState(null);
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

  const openClient = async (userId) => {
    setError("");
    try {
      const response = await getAdminClient(userId);
      const c = response.data.client;
      setEditing({
        userId,
        clientProfileId: c.client_profile_id,
        user: { full_name: c.full_name || "", email: c.email || "", phone: c.phone || "", is_active: c.is_active !== false },
        profile: { designation: c.designation || "", declared_vessel_count: c.declared_vessel_count ?? 0 },
        company: {
          legal_name: c.legal_name || "", company_type: c.company_type || "", registered_address: c.registered_address || "", country: c.country || "", registration_number: c.registration_number || "", website: c.website || "", imo_company_number: c.imo_company_number || "", tax_number: c.tax_number || "", authorized_representative_name: c.authorized_representative_name || "", authorized_representative_designation: c.authorized_representative_designation || "", authorized_representative_email: c.authorized_representative_email || "", authorized_representative_phone: c.authorized_representative_phone || "",
        },
        legacy: !c.client_profile_id,
      });
    } catch (requestError) { setError(requestError.response?.data?.message || "Failed to load Client."); }
  };

  const saveClient = async () => {
    setSaving(true); setError("");
    try { await updateAdminClient(editing.userId, { user: editing.user, profile: editing.profile, company: editing.company }); setEditing(null); await load(); }
    catch (requestError) { setError(requestError.response?.data?.message || "Failed to update Client."); }
    finally { setSaving(false); }
  };

  const prepareAccountAction = async (record) => {
    setError("");
    try { const response = await getClientDeletionImpact(record.user_id); setAccountAction({ record, dependencies: response.data, mode: response.data.has_immutable_history ? "deactivate" : "delete" }); }
    catch (requestError) { setError(requestError.response?.data?.message || "Failed to inspect Client dependencies."); }
  };

  const completeAccountAction = async ({ confirmation, reason }) => {
    setSaving(true); setError("");
    try {
      if (accountAction.mode === "delete") await deleteAdminClient(accountAction.record.user_id, confirmation);
      else await deactivateAdminClient(accountAction.record.user_id, { confirmation, reason });
      setAccountAction(null); await load();
    } catch (requestError) { setError(requestError.response?.data?.message || "Client account action failed."); }
    finally { setSaving(false); }
  };

  return <div className="admin-clients-page">
    <header><div><span>Super Admin</span><h1>{tab === "clients" ? "Clients" : "Client Registrations"}</h1><p>{tab === "clients" ? "Manage all role-3 Client accounts, including legacy accounts." : "Review company onboarding submissions and verification status."}</p></div><div className="admin-client-search"><Search size={17}/><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1); }} placeholder="Search Client, company, email or registration number"/></div></header>
    <div className="admin-client-tabs">{TABS.map((item) => <button key={item} className={tab === item ? "active" : ""} onClick={() => { setTab(item); setPage(1); }}>{item}</button>)}</div>
    {tab === "clients" && <div className="client-account-filters">{CLIENT_FILTERS.map((item) => <button type="button" key={item} className={clientFilter === item ? "active" : ""} onClick={() => { setClientFilter(item); setPage(1); }}>{item}</button>)}</div>}
    {error && <div className="admin-client-error">{error}</div>}
    <div className="admin-client-table-wrap"><table><thead>{tab === "clients" ? <tr><th>Client</th><th>Company</th><th>Phone</th><th>Country</th><th>Verification</th><th>Account</th><th>Created</th><th>Actions</th></tr> : <tr><th>Applicant</th><th>Company</th><th>Country</th><th>Submitted</th><th>Status</th><th>Resubmissions</th><th/></tr>}</thead><tbody>
      {loading ? <tr><td colSpan="8">Loading...</td></tr> : !data.length ? <tr><td colSpan="8">No records found.</td></tr> : tab === "clients" ? data.map((record) => <tr key={record.user_id}><td><strong>{record.full_name}</strong><small>{record.email}</small></td><td>{record.company_legal_name || (record.is_legacy ? "Legacy Client" : "Missing company data")}</td><td>{record.phone || "—"}</td><td>{record.country || "—"}</td><td><span className={`admin-status ${record.verification_status}`}>{record.verification_status}</span></td><td><span className={`account-state ${record.is_active ? "active" : "inactive"}`}>{record.is_active ? "Active" : "Inactive"}</span></td><td>{new Date(record.created_at).toLocaleDateString()}</td><td><div className="client-row-actions"><button onClick={() => openClient(record.user_id)}>View/Edit</button><button className="danger" onClick={() => prepareAccountAction(record)}>Delete</button></div></td></tr>) : data.map((record) => <tr key={record.id}><td><strong>{record.full_name}</strong><small>{record.email}</small></td><td><strong>{record.company_legal_name || "Onboarding incomplete"}</strong><small>{record.registration_number || "No registration number"}</small></td><td>{record.country || "—"}</td><td>{record.verification_submitted_at ? new Date(record.verification_submitted_at).toLocaleDateString() : "—"}</td><td><span className={`admin-status ${record.verification_status}`}>{record.verification_status}</span></td><td>{record.resubmission_count}</td><td><button onClick={() => navigate(`/admin/client-registrations/${record.id}`)}>View Registration</button></td></tr>)}
    </tbody></table></div>
    <footer><span>{pagination.total || 0} records</span><div><button disabled={page <= 1} onClick={() => setPage((value) => value - 1)}>Previous</button><span>Page {pagination.page || page} of {pagination.pages || 1}</span><button disabled={page >= (pagination.pages || 1)} onClick={() => setPage((value) => value + 1)}>Next</button></div></footer>
    {editing && <div className="client-edit-backdrop"><section className="client-edit-dialog" role="dialog" aria-modal="true"><h2>Edit Client</h2>{editing.clientProfileId && <button className="view-registration-link" type="button" onClick={() => navigate(`/admin/client-registrations/${editing.clientProfileId}`)}>View registration history</button>}{editing.legacy && <p className="legacy-note">This legacy account has no Client profile/company record; only account fields can be edited.</p>}<h3>Account</h3><div className="client-edit-grid"><Field label="Full name" value={editing.user.full_name} onChange={(value) => setEditing({...editing,user:{...editing.user,full_name:value}})}/><Field label="Email" type="email" value={editing.user.email} onChange={(value) => setEditing({...editing,user:{...editing.user,email:value}})}/><Field label="Phone" value={editing.user.phone} onChange={(value) => setEditing({...editing,user:{...editing.user,phone:value}})}/><label className="active-checkbox"><input type="checkbox" checked={editing.user.is_active} onChange={(event) => setEditing({...editing,user:{...editing.user,is_active:event.target.checked}})}/> Active account</label></div>{!editing.legacy && <><h3>Profile and company</h3><div className="client-edit-grid"><Field label="Designation" value={editing.profile.designation} onChange={(value) => setEditing({...editing,profile:{...editing.profile,designation:value}})}/><Field label="Declared vessels" type="number" value={editing.profile.declared_vessel_count} onChange={(value) => setEditing({...editing,profile:{...editing.profile,declared_vessel_count:value}})}/>{Object.entries({legal_name:"Company legal name",company_type:"Company type",registered_address:"Registered address",country:"Country",registration_number:"Registration number",website:"Website",imo_company_number:"IMO company number",tax_number:"Tax number",authorized_representative_name:"Representative name",authorized_representative_designation:"Representative designation",authorized_representative_email:"Representative email",authorized_representative_phone:"Representative phone"}).map(([field,label]) => <Field key={field} label={label} value={editing.company[field]} onChange={(value) => setEditing({...editing,company:{...editing.company,[field]:value}})}/>)}</div></>}<div className="client-edit-actions"><button disabled={saving} onClick={() => setEditing(null)}>Cancel</button><button className="save" disabled={saving} onClick={saveClient}>{saving ? "Saving..." : "Save Changes"}</button></div></section></div>}
    {accountAction && <TypedConfirmationModal
      title={accountAction.mode === "delete" ? "Permanently delete Client?" : "Deactivate and anonymize Client?"}
      subject={accountAction.record.full_name}
      company={accountAction.record.company_legal_name}
      warning={accountAction.mode === "delete" ? "This dependency-free Client account and disposable registration data will be permanently removed." : "Operational history will be preserved while login and identifying account data are removed."}
      dependencies={accountAction.dependencies}
      confirmationText={accountAction.mode === "delete" ? "DELETE" : "DEACTIVATE"}
      confirmLabel={accountAction.mode === "delete" ? "Permanently Delete" : "Deactivate and Anonymize"}
      requireReason={accountAction.mode === "deactivate"}
      busy={saving}
      error={error}
      onCancel={() => !saving && setAccountAction(null)}
      onConfirm={completeAccountAction}
    />}
  </div>;
}

function Field({ label, value, onChange, type = "text" }) { return <label>{label}<input type={type} value={value ?? ""} onChange={(event) => onChange(event.target.value)}/></label>; }
