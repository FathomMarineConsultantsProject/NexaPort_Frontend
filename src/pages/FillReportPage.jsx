import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { getTemplate } from "../api/templateApi";
import { createReport } from "../api/reportApi";
import "../styles/templates.css";
import "../styles/documentWorkspace.css";

export default function FillReportPage() {
  const { id } = useParams(); const navigate = useNavigate(); const [template, setTemplate] = useState(null); const [title, setTitle] = useState(""); const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  useEffect(() => { getTemplate(id).then((response) => { setTemplate(response.data); setTitle(response.data.title); }).catch((requestError) => setError(requestError.response?.data?.message || "Unable to load template.")).finally(() => setLoading(false)); }, [id]);
  const start = async () => { setBusy(true); setError(""); try { const response = await createReport(id, { title }); navigate(`/reports/${response.data.id}`); } catch (requestError) { setError(requestError.response?.data?.message || "Unable to create report."); setBusy(false); } };
  if (loading) return <main className="templates-page"><div className="template-state" role="status">Loading template…</div></main>;
  return <main className="templates-page narrow report-folio"><Link className="template-back" to="/templates"><ArrowLeft size={16} /> Templates</Link><section className="report-start-folio"><header><span>Inspection report · New document</span><h1>Create Report</h1><p>Use the saved template version to create an editable report draft.</p></header>{template && <dl><div><dt>Template</dt><dd>{template.title}</dd></div><div><dt>Version</dt><dd>{template.current_version_number}</dd></div><div><dt>Initial state</dt><dd>Draft</dd></div></dl>}{error && <div className="template-message error" role="alert">{error}</div>}{template && <><div className="report-start-fields"><h2>Report details</h2><label>Report title<input value={title} onChange={(event) => setTitle(event.target.value)} maxLength="180" required /></label><p>This title identifies the report in the document register and PDF.</p></div><footer className="report-start-actions"><button type="button" className="template-primary" disabled={busy || !title.trim()} onClick={start}>{busy ? "Creating…" : "Create Report Draft"}</button></footer></>}</section></main>;
}
