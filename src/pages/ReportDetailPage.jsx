import { useCallback, useEffect, useMemo, useState } from "react";
import { ArrowLeft, Download, Eye, FileCheck2, Save, Trash2 } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { generateReport, getReport, getReportDownloadUrl, saveReport } from "../api/reportApi";
import { cacheReportMedia, clearReportMedia, getReportMedia, mediaToGenerationPayload, removeReportMedia, cacheReportMediaItem, removeReportMediaItem } from "../utils/reportMediaCache";
import "../styles/templates.css";

const fieldKind = (field) => /signature/i.test(field.label || "") ? "signature" : /^(inspector|surveyor|consultant)( name)?$/i.test(field.label || "") ? "identity" : field.type;
const groupFields = (fields) => fields.reduce((groups, field) => { (groups[field.section || "General"] ||= []).push(field); return groups; }, {});

function LocalMediaField({ field, items, canChoose, generated, onChoose, onCaption, onRemove }) {
  const maxPhotos = Number(field.maxPhotos) || 1;
  const count = items.length;
  const atLimit = count >= maxPhotos;
  const signature = fieldKind(field) === "signature";
  return <div className={`template-report-photo${signature ? " signature" : ""}`}>
    <div><label htmlFor={`media-${field.fieldKey}`}>{field.label}{field.required && <em>Required</em>}</label>
      {!signature && <span className="template-report-photo-counter">{count} of {maxPhotos} photo{maxPhotos === 1 ? "" : "s"} added{atLimit && <span className="at-limit"> (limit reached)</span>}</span>}
      {signature && <span>{items[0] ? "Stored in this browser" : generated ? "Included in the current PDF" : "No image selected"}</span>}
    </div>
    {items.map((item) => <div key={item.itemId} className="template-report-photo-item">
      {item.blob && <img src={URL.createObjectURL(item.blob)} alt={`${field.label} preview`} onLoad={(event) => URL.revokeObjectURL(event.target.src)} />}
      {field.captionEnabled && canChoose && <input aria-label={`${field.label} caption`} placeholder="Optional caption" value={item.caption || ""} onChange={(event) => onCaption(field, item.itemId, event.target.value)} />}
      {canChoose && <div className="template-media-actions"><button type="button" className="template-secondary" onClick={() => onRemove(field, item.itemId)}><Trash2 size={15} /> Remove</button></div>}
    </div>)}
    {canChoose && !atLimit && <div className="template-media-actions"><label className="template-secondary">{signature ? "Choose signature image" : count ? "Add another photo" : "Select photo"}<input id={`media-${field.fieldKey}`} hidden type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => onChoose(field, event.target.files?.[0])} /></label></div>}
  </div>;
}

function ReportField({ field, value, disabled, onChange }) {
  const kind = fieldKind(field);
  if (kind === "identity") return <input id={field.fieldKey} value="NexaPort Inspector" readOnly aria-readonly="true" />;
  if (kind === "yes_no") return <fieldset className="template-yes-no" disabled={disabled}><legend><span>{field.label}</span>{field.required && <em>Required</em>}</legend><div>{["Yes", "No"].map((option) => <label key={option} className={value === option ? "selected" : ""}><input type="radio" name={field.fieldKey} value={option} checked={value === option} onChange={() => onChange(option)} /><span aria-hidden="true">{value === option ? "●" : "○"}</span>{option}</label>)}</div></fieldset>;
  if (kind === "checkbox") return <label className="template-report-checkbox"><input id={field.fieldKey} disabled={disabled} type="checkbox" checked={Boolean(value)} onChange={(event) => onChange(event.target.checked)} /><span>{field.label}{field.required && <em>Required</em>}</span></label>;
  const props = { id: field.fieldKey, disabled, value: value ?? "", onChange: (event) => onChange(event.target.value), required: field.required };
  if (kind === "textarea") return <label className="template-long-field"><span>{field.label}{field.required && <em>Required</em>}</span><textarea {...props} rows="5" /></label>;
  if (kind === "select") return <label><span>{field.label}{field.required && <em>Required</em>}</span><select {...props}><option value="">Select…</option>{(field.options || []).map((option) => <option key={option}>{option}</option>)}</select></label>;
  return <label><span>{field.label}{field.required && <em>Required</em>}</span><input {...props} type={kind === "number" ? "number" : kind === "date" ? "date" : "text"} /></label>;
}

export default function ReportDetailPage() {
  const { id } = useParams();
  const [report, setReport] = useState(null); const [values, setValues] = useState({}); const [media, setMedia] = useState({});
  const [loading, setLoading] = useState(true); const [busy, setBusy] = useState(false); const [dirty, setDirty] = useState(false); const [error, setError] = useState(""); const [message, setMessage] = useState("");
  const load = useCallback(async () => { setLoading(true); setError(""); try { const [response, cached] = await Promise.all([getReport(id), getReportMedia(id)]); setReport(response.data); setValues(response.data.values_jsonb || {}); const mediaMap = {}; for (const item of cached) { (mediaMap[item.fieldKey] ||= []).push(item); } setMedia(mediaMap); setDirty(false); } catch (requestError) { setReport(null); setError(requestError.response?.data?.message || "Unable to load report."); } finally { setLoading(false); } }, [id]);
  useEffect(() => { const loadId = window.setTimeout(load, 0); return () => window.clearTimeout(loadId); }, [load]);
  const grouped = useMemo(() => groupFields(report?.fields_jsonb || []), [report]);
  const readOnly = !report?.permissions?.canEdit || report?.status === "completed";
  const canGenerate = Boolean(report?.permissions?.canGenerate);
  const updateValue = (key, value) => { setValues((current) => ({ ...current, [key]: value })); setDirty(true); };
  const save = async ({ quiet = false } = {}) => { if (readOnly) return true; setBusy(true); setError(""); try { await saveReport(id, values); setDirty(false); if (!quiet) setMessage("Draft saved."); return true; } catch (requestError) { setError(requestError.response?.data?.message || "Unable to save report."); return false; } finally { setBusy(false); } };
  const chooseMedia = async (field, file) => {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type) || file.size > 5 * 1024 * 1024) { setError("Images must be JPEG, PNG, or WebP and no larger than 5 MB."); return; }
    const maxPhotos = Number(field.maxPhotos) || 1;
    const current = media[field.fieldKey] || [];
    const kind = fieldKind(field);
    if (kind === "signature" || maxPhotos === 1) {
      // Replace single item
      try { const item = await cacheReportMedia(id, field.fieldKey, file, "", kind); setMedia((prev) => ({ ...prev, [field.fieldKey]: [item] })); setMessage(`${field.label} will remain in this browser until PDF generation succeeds.`); } catch { setError(`Unable to cache ${field.label} in this browser.`); }
    } else {
      if (current.length >= maxPhotos) { setError(`Maximum ${maxPhotos} photos allowed for ${field.label}.`); return; }
      try { const item = await cacheReportMediaItem(id, field.fieldKey, file, "", "photo"); setMedia((prev) => ({ ...prev, [field.fieldKey]: [...(prev[field.fieldKey] || []), item] })); setMessage(`${field.label}: ${current.length + 1} of ${maxPhotos} photos added.`); } catch { setError(`Unable to cache ${field.label} in this browser.`); }
    }
  };
  const changeCaption = async (field, itemId, caption) => {
    const items = media[field.fieldKey] || [];
    const item = items.find((i) => i.itemId === itemId);
    if (!item) return;
    const kind = fieldKind(field);
    if (kind === "signature" || (Number(field.maxPhotos) || 1) === 1) {
      const next = await cacheReportMedia(id, field.fieldKey, item.blob, caption, kind, item.itemId);
      setMedia((prev) => ({ ...prev, [field.fieldKey]: [next] }));
    } else {
      const next = await cacheReportMediaItem(id, field.fieldKey, item.blob, caption, "photo", item.itemId);
      setMedia((prev) => ({ ...prev, [field.fieldKey]: (prev[field.fieldKey] || []).map((i) => i.itemId === itemId ? next : i) }));
    }
  };
  const removeMedia = async (field, itemId) => {
    if (itemId) {
      await removeReportMediaItem(id, field.fieldKey, itemId);
      setMedia((prev) => ({ ...prev, [field.fieldKey]: (prev[field.fieldKey] || []).filter((i) => i.itemId !== itemId) }));
    } else {
      await removeReportMedia(id, field.fieldKey);
      setMedia((prev) => { const next = { ...prev }; delete next[field.fieldKey]; return next; });
    }
  };
  const generate = async () => { if (!(await save({ quiet: true }))) return; setBusy(true); setError(""); try { const allMedia = Object.values(media).flat(); await generateReport(id, await Promise.all(allMedia.map(mediaToGenerationPayload))); await clearReportMedia(id); setMedia({}); setMessage("PDF generated. The report images were cleared from this browser."); await load(); } catch (requestError) { setError(requestError.response?.data?.message || "PDF generation failed. Your images remain in this browser."); } finally { setBusy(false); } };
  const openPdf = async (download) => { setBusy(true); setError(""); try { const response = await getReportDownloadUrl(id); if (download) { const link = document.createElement("a"); link.href = response.data.url; link.download = `${report.title}.pdf`; link.rel = "noopener"; link.click(); } else window.open(response.data.url, "_blank", "noopener,noreferrer"); } catch (requestError) { setError(requestError.response?.data?.message || `PDF ${download ? "download" : "preview"} failed.`); } finally { setBusy(false); } };
  if (loading) return <main className="templates-page"><div className="template-state">Loading report…</div></main>;
  if (!report) return <main className="templates-page"><div className="template-state error" role="alert">{error || "Report not found."}</div></main>;
  return <main className="templates-page report-folio"><Link className="template-back" to="/templates"><ArrowLeft size={16} /> Templates and reports</Link>
    <header className="report-folio-header"><div><span>Inspection report</span><h1>{report.title}</h1><p>{report.template_title}</p></div><dl><div><dt>Inspector</dt><dd>NexaPort Inspector</dd></div><div><dt>Template</dt><dd>Version {report.version_number}</dd></div><div><dt>Status</dt><dd><span className={`template-status ${report.status}`}>{report.status}</span></dd></div></dl></header>
    {error && <div className="template-message error" role="alert">{error}</div>}{message && <div className="template-message success" role="status">{message}</div>}
    <div className="template-report-form">{Object.entries(grouped).map(([section, fields]) => <section className="report-section" key={section}><header><span aria-hidden="true" /><h2>{section}</h2></header><div className="template-report-grid">{fields.map((field) => {
      const kind = fieldKind(field); if (kind === "section_heading") return <h3 key={field.fieldKey}>{field.label}</h3>;
      if (["photo", "signature"].includes(kind)) return <LocalMediaField key={field.fieldKey} field={field} items={media[field.fieldKey] || []} canChoose={canGenerate} generated={report.generated} onChoose={chooseMedia} onCaption={changeCaption} onRemove={removeMedia} />;
      return <ReportField key={field.fieldKey} field={field} value={kind === "identity" ? "NexaPort Inspector" : values[field.fieldKey]} disabled={readOnly || kind === "identity"} onChange={(value) => updateValue(field.fieldKey, value)} />;
    })}</div></section>)}</div>
    <div className="template-savebar report-actionbar"><span>Version {report.version_number} · {report.status === "completed" ? "Completed" : "Draft"} · {dirty ? "Unsaved changes" : "Saved"}</span><div>{!readOnly && <button type="button" className="template-secondary" disabled={busy || !dirty} onClick={() => save()}><Save size={16} /> Save Draft</button>}{canGenerate && <button type="button" className="template-primary" disabled={busy} onClick={generate}><FileCheck2 size={16} /> {report.generated ? "Regenerate PDF" : "Generate PDF"}</button>}{report.generated && <><button type="button" className="template-secondary" disabled={busy} onClick={() => openPdf(false)}><Eye size={16} /> Preview PDF</button><button type="button" className="template-secondary" disabled={busy} onClick={() => openPdf(true)}><Download size={16} /> Download PDF</button></>}</div></div>
  </main>;
}
