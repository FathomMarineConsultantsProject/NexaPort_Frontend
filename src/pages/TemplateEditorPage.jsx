import { useEffect, useRef, useState } from "react";
import { ArrowLeft, Save, ScanSearch, X } from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import FieldEditor from "../components/templates/FieldEditor";
import TemplateUpload from "../components/templates/TemplateUpload";
import useTemplateAnalysis from "../hooks/useTemplateAnalysis";
import { createTemplate, getTemplate, saveTemplateVersion, updateTemplate } from "../api/templateApi";
import { SOURCE_LIMITS, mergeMappedFields } from "../utils/templateSourceExtraction";
import { getRoleId } from "../utils/auth";
import "../styles/templates.css";

const SOURCE_CONFIG = { pdf: { extension: "pdf", label: "PDF" }, xml: { extension: "xml", label: "XML" }, docx: { extension: "docx", label: "DOCX" }, xlsx: { extension: "xlsx", label: "XLSX" } };
const fileError = (file, sourceMode) => {
  const source = SOURCE_CONFIG[sourceMode]; if (!file) return source ? `Please select a ${source.label} file.` : "Choose a source file.";
  const extension = file.name.toLowerCase().split(".").pop(); const mimeTypes = { pdf: ["application/pdf"], xml: ["application/xml", "text/xml"], docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"], xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"] };
  if (!source || extension !== source.extension || !mimeTypes[extension]?.includes(file.type)) return `Please select a ${source?.label || "supported"} file.`;
  const limit = SOURCE_LIMITS[`${extension}Bytes`]; return file.size > limit ? `${extension.toUpperCase()} files must be ${limit / 1024 / 1024} MB or smaller.` : "";
};
const localFieldErrors = (fields) => { const errors = []; const keys = new Map(); fields.forEach((field, index) => { if (!String(field?.label || "").trim()) errors.push({ index, fieldKey: field?.fieldKey, property: "label", message: "Field label is required." }); if (!field?.type) errors.push({ index, fieldKey: field?.fieldKey, property: "type", message: "Field type is required." }); if (field?.type === "select" && !(field.options || []).length) errors.push({ index, fieldKey: field?.fieldKey, property: "options", message: "Select fields require at least one option." }); if (field?.type === "photo" && (!Number.isInteger(Number(field.maxPhotos)) || Number(field.maxPhotos) < 1 || Number(field.maxPhotos) > 10)) errors.push({ index, fieldKey: field?.fieldKey, property: "maxPhotos", message: "Maximum photos must be between 1 and 10." }); if (field?.fieldKey) { if (keys.has(field.fieldKey)) errors.push({ index, fieldKey: field.fieldKey, property: "fieldKey", message: "Field keys must be unique." }, { index: keys.get(field.fieldKey), fieldKey: field.fieldKey, property: "fieldKey", message: "Field keys must be unique." }); else keys.set(field.fieldKey, index); } }); return errors; };

export default function TemplateEditorPage() {
  const { id: routeId } = useParams(); const [searchParams] = useSearchParams(); const navigate = useNavigate(); const admin = getRoleId() === 1; const analysis = useTemplateAnalysis();
  const [templateId, setTemplateId] = useState(routeId || null); const [title, setTitle] = useState(""); const [description, setDescription] = useState(""); const [metadata, setMetadata] = useState(null);
  const [file, setFile] = useState(null); const [inputKey, setInputKey] = useState(0); const [fields, setFields] = useState([]);
  const [extracting, setExtracting] = useState(false); const [extractionFailed, setExtractionFailed] = useState(false); const [saving, setSaving] = useState(false); const [loading, setLoading] = useState(Boolean(routeId));
  const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [sourceType, setSourceType] = useState(null); const [extractionMode, setExtractionMode] = useState(null); const [pageCount, setPageCount] = useState(null); const [fieldErrors, setFieldErrors] = useState([]); const [sourceMode, setSourceMode] = useState("pdf");
  const extractionController = useRef(null); const readOnly = searchParams.get("view") === "1" || Boolean(templateId && metadata && !metadata.permissions?.canEdit);
  const busy = extracting || saving;
  const discardFile = () => { setFile(null); setInputKey((current) => current + 1); };
  const cancel = () => { extractionController.current?.abort(); analysis.cancel(); };
  const applyTemplate = (data) => { setTitle(data.title); setDescription(data.description || ""); setMetadata(data); setSourceType(data.source_type); const latest = data.versions?.[0]; setFields(latest?.fields_jsonb || []); setExtractionMode(latest?.layout_jsonb?.extractionMethod || latest?.layout_jsonb?.extractionMode || null); setPageCount(latest?.layout_jsonb?.pageCount || null); };
  const reload = async (id) => { const response = await getTemplate(id); applyTemplate(response.data); return response.data; };
  useEffect(() => { if (!routeId) return; getTemplate(routeId).then((response) => applyTemplate(response.data)).catch((requestError) => setError(requestError.response?.data?.message || "Unable to load template.")).finally(() => setLoading(false)); }, [routeId]);
  useEffect(() => () => { extractionController.current?.abort(); analysis.cancel(); }, []); // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { if (!fieldErrors.length) return; const row = document.querySelector(`[data-field-index="${fieldErrors[0].index}"] input, [data-field-index="${fieldErrors[0].index}"] select`); row?.scrollIntoView({ behavior: "smooth", block: "center" }); row?.focus(); }, [fieldErrors]);
  const resetSource = () => { cancel(); setFields([]); setExtractionFailed(false); setError(""); setMessage(""); };
  const chooseFile = (next) => { resetSource(); discardFile(); setFile(next); };
  const changeSourceMode = (mode) => { resetSource(); discardFile(); setSourceMode(mode); if (mode === "manual") { setSourceType("manual"); setExtractionMode("manual"); } };

  const fieldsFromAnalysis = (result) => { if (!result) return []; const sections = new Map((result.sections || []).map((section) => [section.sectionKey, section.title])); return mergeMappedFields([], [], result.fields || [], sections); };
  const extractFields = async () => {
    const validation = fileError(file, sourceMode); if (validation) { setError(validation); return; }
    const controller = new AbortController(); extractionController.current = controller; setExtracting(true); setExtractionFailed(false); setError(""); setMessage(""); setFields([]);
    try {
      setSourceType(sourceMode); setExtractionMode("text"); setPageCount(null);
      const result = await analysis.analyse(file, sourceMode);
      if (controller.signal.aborted) throw new DOMException("Extraction cancelled", "AbortError");
      const mapped = fieldsFromAnalysis(result);
      setFields(mapped);
      if (import.meta.env.DEV) console.info("Template extraction diagnostics:", { finalFields: mapped.length });
      if (mapped.length) {
        const needsReview = Boolean(result.incomplete || result.unmappedBlocks?.length || result.warnings?.length);
        setMessage(needsReview ? "Fields were extracted, but some items may need review." : `Fields extracted successfully. Review them below before saving. ${mapped.length} field${mapped.length === 1 ? "" : "s"} extracted.`);
      } else {
        setMessage("No fillable fields were identified. Review the source or add fields manually.");
      }
    } catch (readError) {
      if (controller.signal.aborted || readError.name === "AbortError") setError("Extraction cancelled.");
      else { setExtractionFailed(true); setError("We couldn't automatically extract the fields right now. Please try again."); }
    } finally { extractionController.current = null; setExtracting(false); }
  };
  const changeFields = (next) => { setFields(next); setFieldErrors(localFieldErrors(next)); };
  const save = async () => {
    if (!title.trim()) { setError("Template title is required."); return; } const validationErrors = localFieldErrors(fields); if (validationErrors.length) { setFieldErrors(validationErrors); setError(`${new Set(validationErrors.map((item) => item.index)).size} fields need attention before this template can be saved.`); return; }
    const isBlank = sourceMode === "manual" || sourceType === "manual"; if (!isBlank && !fields.length) { setError("Extract or add at least one field before saving."); return; } const effectiveSourceType = isBlank ? "manual" : sourceType; const effectiveExtractionMode = isBlank ? "manual" : (extractionMode || "text");
    setSaving(true); setError(""); const layout = { extractionMethod: effectiveExtractionMode, pageCount };
    try { if (!templateId) { const created = await createTemplate({ title, description, sourceType: effectiveSourceType, extractionMethod: effectiveExtractionMode, fields, layout }); setTemplateId(created.data.id); applyTemplate(created.data); navigate(`/templates/${created.data.id}`, { replace: true }); setMessage("Template fields saved. The temporary source document was discarded."); } else { await updateTemplate(templateId, { title, description }); await saveTemplateVersion(templateId, fields, layout); await reload(templateId); setMessage("A new immutable template version was saved."); } }
    catch (requestError) { const errors = requestError.response?.data?.fieldErrors || []; setFieldErrors(errors); setError(errors.length ? `${new Set(errors.map((item) => item.index)).size} fields need attention before this template can be saved.` : (requestError.response?.data?.message || "Unable to save template fields.")); }
    finally { discardFile(); setSaving(false); }
  };
  const setStatus = async (status) => { setSaving(true); setError(""); try { await updateTemplate(templateId, { status }); await reload(templateId); setMessage(status === "published" ? "Template published for consultants." : "Template status updated."); } catch (requestError) { setError(requestError.response?.data?.message || "Unable to update template status."); } finally { setSaving(false); } };
  if (loading) return <main className="templates-page"><div className="template-state">Loading template…</div></main>;
  const context = metadata ? (metadata.isNexaPortProvided ? "NexaPort Provided Template" : "Consultant Template") : admin ? "NexaPort Provided Template" : "Consultant Template"; const isBlankMode = sourceMode === "manual" || sourceType === "manual"; const canPublish = admin && metadata?.status === "draft" && (metadata.current_version_number > 0 || fields.length > 0); const extractionStatus = extracting ? "Analysing document..." : "";
  return <main className="templates-page"><Link className="template-back" to="/templates"><ArrowLeft size={16} /> Templates</Link><header className="templates-header"><div><span>{context}</span><h1>{title || "Create inspection template"}</h1><p>{readOnly ? "Review saved template field definitions." : "Upload a source document to create editable template fields."}</p></div></header>
    {error && <div className="template-message error" role="alert">{error}</div>}{message && <div className="template-message success" role="status">{message}</div>}
    <section className="template-editor-card"><div className="template-section-heading"><h2>Template details</h2>{metadata?.isNexaPortProvided && <span className="template-provided">NexaPort Provided</span>}</div><div className="template-details-grid"><label>Template title<input disabled={readOnly} value={title} onChange={(event) => setTitle(event.target.value)} maxLength="180" /></label><label>Description<textarea disabled={readOnly} value={description} onChange={(event) => setDescription(event.target.value)} maxLength="2000" rows="3" /></label></div>{metadata && <dl className="template-metadata"><div><dt>Source type</dt><dd>{(metadata.source_type || "manual").toUpperCase()}</dd></div><div><dt>Fields</dt><dd>{fields.length}</dd></div><div><dt>Status</dt><dd>{metadata.status}</dd></div></dl>}{!templateId && !readOnly && <TemplateUpload file={file} onFile={chooseFile} sourceMode={sourceMode} onSourceMode={changeSourceMode} inputKey={inputKey} disabled={busy} />}</section>
    {!templateId && !readOnly && !isBlankMode && <section className="template-extraction-toolbar" aria-label="Field extraction"><div><strong>{file?.name || "Select a source file"}</strong>{extracting && <span>{extractionStatus}</span>}{!extracting && fields.length > 0 && <span>{fields.length} field{fields.length === 1 ? "" : "s"} extracted</span>}</div><div>{extracting ? <button type="button" className="template-secondary" onClick={cancel}><X size={16} /> Cancel</button> : <button type="button" className="template-primary" disabled={!file} onClick={extractFields}><ScanSearch size={16} /> {extractionFailed ? "Try Again" : fields.length ? "Extract Again" : "Extract Fields"}</button>}</div></section>}
    <section className="template-editor-card"><div className="template-section-heading"><div><h2>Field definitions</h2><p>Review and edit the fields before saving.</p></div></div><FieldEditor fields={fields} onChange={changeFields} errors={fieldErrors} readOnly={readOnly} /></section>
    {!readOnly && <div className="template-savebar"><span>{fields.length} field{fields.length === 1 ? "" : "s"} · {fields.filter((field) => field.type === "photo").length} photo field{fields.filter((field) => field.type === "photo").length === 1 ? "" : "s"}</span><div><button type="button" className="template-primary" disabled={busy || (!isBlankMode && !fields.length)} onClick={save}><Save size={16} /> {templateId ? "Save new version" : "Save template"}</button>{canPublish && <button type="button" className="template-secondary" disabled={busy} onClick={() => setStatus("published")}>Publish</button>}{metadata?.status !== "archived" && templateId && <button type="button" className="template-secondary" disabled={busy} onClick={() => setStatus("archived")}>Archive</button>}</div></div>}
  </main>;
}
