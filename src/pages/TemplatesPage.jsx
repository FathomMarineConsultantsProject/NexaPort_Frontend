import { useEffect, useMemo, useState } from "react";
import { Copy, FilePlus2, FileText, Search } from "lucide-react";
import { Link } from "react-router-dom";
import { duplicateTemplate, getTemplates, updateTemplate } from "../api/templateApi";
import { getReports } from "../api/reportApi";
import { getRoleId } from "../utils/auth";
import "../styles/templates.css";

const date = (value) => value ? new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(value)) : "—";

function TemplateTable({ rows, admin, onAction, busyId }) {
  if (!rows.length) return <div className="template-empty compact"><FileText size={25} /><strong>No templates in this group</strong><span>Create one or adjust the current filters.</span></div>;
  return <div className="template-table-wrap"><table className="template-table"><thead><tr><th>Template</th>{admin && <th>Owner</th>}<th>Source</th><th>Version</th><th>Extraction</th><th>Status</th><th>Updated</th><th><span className="sr-only">Actions</span></th></tr></thead><tbody>{rows.map((template) => {
    const permissions = template.permissions || {};
    return <tr key={template.id}><td><div className="template-title-line"><strong>{template.title}</strong>{template.isNexaPortProvided && <span className="template-provided">NexaPort Provided</span>}</div><small>{template.description || "No description"}</small></td>{admin && <td><strong>{template.isNexaPortProvided ? "NexaPort" : template.consultant_name}</strong><small>{template.isNexaPortProvided ? template.creator_email : template.consultant_email}</small></td>}<td><span className="template-type">{template.source_type?.toUpperCase()}</span></td><td>v{template.current_version_number}</td><td><span className={`template-status ${template.extraction_status}`}>{template.extraction_status}</span></td><td><span className={`template-status ${template.status}`}>{template.status}</span></td><td>{date(template.updated_at)}</td><td><div className="template-row-actions">
      <Link to={`/templates/${template.id}?view=1`}>View</Link>
      {permissions.canEdit && <Link to={`/templates/${template.id}`}>Edit</Link>}
      {permissions.canUse && <Link to={`/templates/${template.id}/fill`}>Use Template</Link>}
      {permissions.canDuplicate && <button type="button" disabled={busyId === template.id} onClick={() => onAction("duplicate", template)}><Copy size={13} /> Duplicate to My Templates</button>}
      {admin && permissions.canEdit && template.status === "draft" && <button type="button" disabled={busyId === template.id} onClick={() => onAction("published", template)}>Publish</button>}
      {admin && permissions.canEdit && template.status === "published" && <button type="button" disabled={busyId === template.id} onClick={() => onAction("draft", template)}>Return to draft</button>}
      {permissions.canArchive && template.status !== "archived" && <button type="button" disabled={busyId === template.id} onClick={() => onAction("archived", template)}>Archive</button>}
    </div></td></tr>;
  })}</tbody></table></div>;
}

export default function TemplatesPage() {
  const [templates, setTemplates] = useState([]); const [reports, setReports] = useState([]); const [loading, setLoading] = useState(true); const [templatesError, setTemplatesError] = useState(""); const [reportsError, setReportsError] = useState(""); const [message, setMessage] = useState(""); const [busyId, setBusyId] = useState(null); const [search, setSearch] = useState(""); const [status, setStatus] = useState("all"); const [tab, setTab] = useState("templates");
  const admin = getRoleId() === 1;
  const load = () => {
    setLoading(true); setTemplatesError(""); setReportsError("");
    Promise.allSettled([getTemplates(), getReports()]).then(([templateResult, reportResult]) => {
      if (templateResult.status === "fulfilled") setTemplates(templateResult.value.data || []); else setTemplatesError(templateResult.reason.response?.data?.message || "Unable to load Templates.");
      if (reportResult.status === "fulfilled") setReports(reportResult.value.data || []); else setReportsError(reportResult.reason.response?.data?.message || "Unable to load reports.");
    }).finally(() => setLoading(false));
  };
  useEffect(() => { const timer = window.setTimeout(load, 0); return () => window.clearTimeout(timer); }, []);
  const visible = useMemo(() => templates.filter((template) => (status === "all" || template.status === status) && [template.title, template.consultant_name, template.consultant_email].some((value) => String(value || "").toLowerCase().includes(search.toLowerCase()))), [templates, search, status]);
  const nexaport = visible.filter((template) => template.isNexaPortProvided); const privateTemplates = visible.filter((template) => !template.isNexaPortProvided);
  const action = async (kind, template) => {
    setBusyId(template.id); setTemplatesError(""); setMessage("");
    try {
      if (kind === "duplicate") { const response = await duplicateTemplate(template.id); setMessage(`Created ${response.data.title} in My Templates.`); }
      else { await updateTemplate(template.id, { status: kind }); setMessage(kind === "published" ? "Template published." : kind === "draft" ? "Template returned to draft." : "Template archived."); }
      const response = await getTemplates(); setTemplates(response.data || []);
    } catch (requestError) { setTemplatesError(requestError.response?.data?.message || "Unable to update template."); }
    finally { setBusyId(null); }
  };
  return <main className="templates-page">
    <header className="templates-header"><div><span>Inspection workspace</span><h1>Templates</h1><p>Turn approved PDF or XML sources into reusable inspection reports.</p></div><Link className="template-primary" to="/templates/new"><FilePlus2 size={17} /> Create Template</Link></header>
    <div className="template-flow" aria-label="Template workflow"><span><b>1</b> Source</span><i /><span><b>2</b> Fields</span><i /><span><b>3</b> Report</span></div>
    <div className="template-tabs"><button type="button" className={tab === "templates" ? "active" : ""} onClick={() => setTab("templates")}>Templates <span>{templates.length}</span></button><button type="button" className={tab === "reports" ? "active" : ""} onClick={() => setTab("reports")}>Reports <span>{reports.length}</span></button></div>
    {message && <div className="template-message success" role="status">{message}</div>}
    {tab === "templates" && <section className="template-panel"><div className="template-controls"><label><Search size={16} /><input aria-label="Search templates" placeholder="Search templates" value={search} onChange={(event) => setSearch(event.target.value)} /></label><select aria-label="Filter by status" value={status} onChange={(event) => setStatus(event.target.value)}><option value="all">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></div>
      {loading ? <div className="template-state">Loading templates…</div> : templatesError ? <div className="template-state error" role="alert"><strong>Templates unavailable</strong><span>{templatesError}</span><button type="button" onClick={load}>Try again</button></div> : <div className="template-groups"><section><div className="template-group-heading"><div><span className="template-provided">NexaPort Provided</span><h2>NexaPort Provided</h2></div><p>{admin ? "Platform templates available across the consultant network." : "Ready-to-use templates maintained by NexaPort."}</p></div><TemplateTable rows={nexaport} admin={admin} onAction={action} busyId={busyId} /></section><section><div className="template-group-heading"><div><span>Private</span><h2>{admin ? "Consultant Templates" : "My Templates"}</h2></div><p>{admin ? "Privately owned consultant templates. View-only for Super Admin." : "Templates created and controlled by you."}</p></div><TemplateTable rows={privateTemplates} admin={admin} onAction={action} busyId={busyId} /></section></div>}
    </section>}
    {tab === "reports" && <section className="template-panel">{loading ? <div className="template-state">Loading reports…</div> : reportsError ? <div className="template-state error" role="alert"><strong>Reports unavailable</strong><span>{reportsError}</span><button type="button" onClick={load}>Try again</button></div> : !reports.length ? <div className="template-empty"><FileText size={30} /><strong>No reports yet</strong><span>Reports created from saved templates will appear here.</span></div> : <div className="template-table-wrap"><table className="template-table"><thead><tr><th>Report</th>{admin && <th>Owner</th>}<th>Template</th><th>Version</th><th>Status</th><th>Updated</th><th /></tr></thead><tbody>{reports.map((report) => <tr key={report.id}><td><strong>{report.title}</strong></td>{admin && <td><strong>{report.expert_id ? report.consultant_name : "NexaPort test"}</strong><small>{report.consultant_email}</small></td>}<td>{report.template_title}</td><td>v{report.version_number}</td><td><span className={`template-status ${report.status}`}>{report.status}</span></td><td>{date(report.updated_at)}</td><td><Link to={`/reports/${report.id}`}>View</Link></td></tr>)}</tbody></table></div>}</section>}
  </main>;
}
