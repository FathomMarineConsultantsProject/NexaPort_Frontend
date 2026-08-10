import { useEffect, useRef, useState } from "react";
import { ArrowLeft, ScanSearch, Save, X } from "lucide-react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router-dom";
import FieldEditor from "../components/templates/FieldEditor";
import TemplateUpload from "../components/templates/TemplateUpload";
import { createTemplate, getTemplate, mapTemplateFields, saveTemplateVersion, updateTemplate } from "../api/templateApi";
import { SOURCE_LIMITS, extractTemplateSource, mergeMappedFields, usefulLocalFields } from "../utils/templateSourceExtraction";
import { getRoleId } from "../utils/auth";
import "../styles/templates.css";

const fileError = (file) => {
  if (!file) return "Choose a PDF, XML, DOCX or XLSX file.";
  const extension = file.name.toLowerCase().split(".").pop();
  const mimeTypes = { pdf: ["application/pdf"], xml: ["application/xml", "text/xml"], docx: ["application/vnd.openxmlformats-officedocument.wordprocessingml.document"], xlsx: ["application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"] };
  if (!mimeTypes[extension]?.includes(file.type)) return "File extension and MIME type must identify a PDF, XML, DOCX or XLSX file.";
  const limit = SOURCE_LIMITS[`${extension}Bytes`];
  return file.size > limit ? `${extension.toUpperCase()} files must be ${limit / 1024 / 1024} MB or smaller.` : "";
};

export default function TemplateEditorPage() {
  const { id: routeId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const admin = getRoleId() === 1;
  const [templateId, setTemplateId] = useState(routeId || null);
  const [title, setTitle] = useState(""); const [description, setDescription] = useState(""); const [metadata, setMetadata] = useState(null);
  const [file, setFile] = useState(null); const [inputKey, setInputKey] = useState(0); const [fields, setFields] = useState([]);
  const [progress, setProgress] = useState(0); const [progressText, setProgressText] = useState(""); const [busy, setBusy] = useState(false); const [loading, setLoading] = useState(Boolean(routeId));
  const [message, setMessage] = useState(""); const [error, setError] = useState(""); const [sourceType, setSourceType] = useState(null); const [extractionMode, setExtractionMode] = useState(null); const [pageCount, setPageCount] = useState(null);
  const [mappingEvidence, setMappingEvidence] = useState(null); const [mapping, setMapping] = useState(false);
  const [localBaseline, setLocalBaseline] = useState([]);
  const [sourceMode, setSourceMode] = useState("pdf");
  const extractionController = useRef(null); const ocrWorker = useRef(null);
  const readOnly = searchParams.get("view") === "1" || Boolean(templateId && metadata && !metadata.permissions?.canEdit);
  const discardFile = () => { setFile(null); setInputKey((current) => current + 1); };
  const cancelExtraction = () => { extractionController.current?.abort(); ocrWorker.current?.terminate(); };
  const applyTemplate = (data) => { setTitle(data.title); setDescription(data.description || ""); setMetadata(data); setSourceType(data.source_type); const latest = data.versions?.[0]; setFields(latest?.fields_jsonb || []); setExtractionMode(latest?.layout_jsonb?.extractionMethod || latest?.layout_jsonb?.extractionMode || null); setPageCount(latest?.layout_jsonb?.pageCount || null); };
  const reload = async (id) => { const response = await getTemplate(id); applyTemplate(response.data); return response.data; };

  useEffect(() => { if (!routeId) return; getTemplate(routeId).then((response) => applyTemplate(response.data)).catch((requestError) => setError(requestError.response?.data?.message || "Unable to load template.")).finally(() => setLoading(false)); }, [routeId]);
  useEffect(() => () => { extractionController.current?.abort(); ocrWorker.current?.terminate(); }, []);
  const chooseFile = (next) => { cancelExtraction(); discardFile(); setMappingEvidence(null); setError(""); setMessage(""); setProgress(0); setProgressText(""); setFile(next); };
  const changeSourceMode = (mode) => { cancelExtraction(); discardFile(); setMappingEvidence(null); setError(""); setMessage(""); setProgress(0); setProgressText(""); setSourceMode(mode); if (mode === "manual") { setSourceType("manual"); setExtractionMode("manual"); } };

  const extract = async () => {
    const validation = fileError(file); if (validation) { setError(validation); return; }
    const controller = new AbortController(); extractionController.current = controller;
    const extension = file.name.toLowerCase().split(".").pop();
    setBusy(true); setError(""); setMessage("");
    try {
      const result = await extractTemplateSource(file, { signal: controller.signal, onProgress: ({ stage, percent }) => { setProgressText(stage); setProgress(percent); }, onWorker: (worker) => { ocrWorker.current = worker; } });
      const localFields = usefulLocalFields(result.fields); setFields(localFields); setLocalBaseline(localFields); setSourceType(extension); setExtractionMode(result.mode); setPageCount(result.pageCount); setMappingEvidence(result.aiMappingRecommended ? { documentTitle: file.name.replace(/\.[^.]+$/, ""), sourceType: extension, pagesOrSheets: result.evidence.pagesOrSheets } : null); setProgress(100); setMessage(result.message || `${localFields.length} local field suggestions are ready for review.`);
    } catch (extractionError) {
      if (controller.signal.aborted || extractionError.name === "AbortError") setError("Extraction cancelled.");
      else {
        const safeMessages = ["This document exceeds the supported page limit.", "This document exceeds the supported OCR page limit.", "This workbook exceeds the supported worksheet limit.", "This PDF is password protected.", "No form fields or text were detected.", "OCR could not detect usable fields.", "No supported field definitions were found in this XML file.", "No supported field definitions were found in this DOCX file.", "No supported field definitions were found in this XLSX file.", "This XML contains unsafe declarations or processing instructions.", "Unable to parse this XML file.", "Choose a PDF, XML, DOCX or XLSX file.", "The DOCX file could not be read.", "No usable headings, tables or form labels were found.", "Legacy .doc files must be saved as .docx.", "The workbook could not be read.", "No usable cells or form structures were found.", "Some worksheets were skipped."];
        const raw = extractionError.message || "";
        const isSafe = safeMessages.some((msg) => raw === msg);
        if (!isSafe) console.warn("Template extraction:", raw);
        const fallbacks = { pdf: "Unable to read fields from this PDF. You can add fields manually.", xml: "Unable to parse this XML file.", docx: "The DOCX file could not be read. You can add fields manually.", xlsx: "The workbook could not be read. You can add fields manually." };
        setError(isSafe ? raw : (fallbacks[extension] || "Unable to extract fields. You can add fields manually."));
      }
    } finally { extractionController.current = null; ocrWorker.current = null; setBusy(false); setProgress(0); setProgressText(""); discardFile(); }
  };

  const mapWithAi = async () => {
    if (!mappingEvidence || mapping) return;
    setMapping(true); setError(""); setMessage("Mapping fields");
    try {
      const response = await mapTemplateFields(mappingEvidence); const sections = new Map(response.data.sections.map((section) => [section.sectionKey, section.title]));
      setFields((current) => mergeMappedFields(current, localBaseline, response.data.fields, sections));
      setMessage("Fields mapped — review before saving");
    } catch (requestError) { setFields((current) => usefulLocalFields(current)); setMessage(""); const detail = requestError.response?.data?.message; setError(`Field mapping is temporarily unavailable. You can retry or edit the local suggestions.${detail ? ` ${detail}` : ""}`); }
    finally { setMapping(false); }
  };

  const save = async () => {
    if (!title.trim()) { setError("Template title is required."); return; }
    const isBlank = sourceMode === "manual" || sourceType === "manual";
    if (!isBlank && !fields.length) { setError("Add or extract at least one field before saving."); return; }
    if (!templateId && !isBlank && !sourceType) { setError("Select a source type or choose Start Blank."); return; }
    const effectiveSourceType = isBlank ? "manual" : sourceType;
    const effectiveExtractionMode = isBlank ? "manual" : (extractionMode || "manual");
    setBusy(true); setError(""); const layout = { extractionMethod: effectiveExtractionMode, pageCount };
    try {
      if (!templateId) { const created = await createTemplate({ title, description, sourceType: effectiveSourceType, extractionMethod: effectiveExtractionMode, fields, layout }); setTemplateId(created.data.id); applyTemplate(created.data); navigate(`/templates/${created.data.id}`, { replace: true }); setMessage("Template fields saved. The original source file was discarded."); }
      else { await updateTemplate(templateId, { title, description }); await saveTemplateVersion(templateId, fields, layout); await reload(templateId); setMessage("A new immutable template version was saved."); }
    } catch (requestError) { setError(requestError.response?.data?.message || "Unable to save template fields."); }
    finally { discardFile(); setBusy(false); }
  };
  const setStatus = async (status) => { setBusy(true); setError(""); try { await updateTemplate(templateId, { status }); await reload(templateId); setMessage(status === "published" ? "Template published for consultants." : "Template status updated."); } catch (requestError) { setError(requestError.response?.data?.message || "Unable to update template status."); } finally { setBusy(false); } };

  if (loading) return <main className="templates-page"><div className="template-state">Loading template…</div></main>;
  const context = metadata ? (metadata.isNexaPortProvided ? "NexaPort Provided Template" : "Consultant Template") : admin ? "NexaPort Provided Template" : "Consultant Template";
  const isBlankMode = sourceMode === "manual" || sourceType === "manual";
  const canPublish = admin && metadata?.status === "draft" && (metadata.current_version_number > 0 || fields.length > 0);
  return <main className="templates-page"><Link className="template-back" to="/templates"><ArrowLeft size={16} /> Templates</Link><header className="templates-header"><div><span>{context}</span><h1>{title || "Create inspection template"}</h1><p>{readOnly ? "Review saved template field definitions." : "Source documents are processed locally and discarded. Review every suggestion before saving."}</p></div></header>
    {error && <div className="template-message error" role="alert">{error}</div>}{message && <div className="template-message success" role="status">{message}</div>}
    <section className="template-editor-card"><div className="template-section-heading"><h2>Template details</h2>{metadata?.isNexaPortProvided && <span className="template-provided">NexaPort Provided</span>}</div><div className="template-details-grid"><label>Template title<input disabled={readOnly} value={title} onChange={(event) => setTitle(event.target.value)} maxLength="180" /></label><label>Description<textarea disabled={readOnly} value={description} onChange={(event) => setDescription(event.target.value)} maxLength="2000" rows="3" /></label></div>{metadata && <dl className="template-metadata"><div><dt>Source type</dt><dd>{(metadata.source_type || "manual").toUpperCase()}</dd></div><div><dt>Extraction method</dt><dd>{extractionMode || "Manual"}</dd></div><div><dt>Saved content</dt><dd>Field definitions only</dd></div><div><dt>Status</dt><dd>{metadata.status}</dd></div></dl>}{!templateId && !readOnly && <TemplateUpload file={file} onFile={chooseFile} sourceMode={sourceMode} onSourceMode={changeSourceMode} progress={progress} progressText={progressText} inputKey={inputKey} disabled={busy} />}</section>
    <section className="template-editor-card"><div className="template-section-heading"><div><h2>Field definitions</h2><p>Field keys remain stable when labels and ordering change.</p></div>{!templateId && !readOnly && !isBlankMode && <div className="template-extraction-actions"><button type="button" className="template-secondary" disabled={busy || !file} onClick={extract}><ScanSearch size={16} /> {busy ? "Processing locally…" : "Extract fields locally"}</button>{mappingEvidence && <button type="button" className="template-secondary" disabled={busy || mapping} onClick={mapWithAi}><ScanSearch size={16} /> {mapping ? "Mapping fields" : "Map fields with AI"}</button>}{busy && <button type="button" className="template-secondary" onClick={cancelExtraction}><X size={16} /> Cancel</button>}</div>}</div><FieldEditor fields={fields} onChange={setFields} readOnly={readOnly} /></section>
    {!readOnly && <div className="template-savebar"><span>{fields.length} field{fields.length === 1 ? "" : "s"} · {fields.filter((field) => field.type === "photo").length} photo field{fields.filter((field) => field.type === "photo").length === 1 ? "" : "s"}</span><div><button type="button" className="template-primary" disabled={busy || (!isBlankMode && !fields.length)} onClick={save}><Save size={16} /> {templateId ? "Save new version" : "Save template"}</button>{canPublish && <button type="button" className="template-secondary" disabled={busy} onClick={() => setStatus("published")}>Publish</button>}{metadata?.status !== "archived" && templateId && <button type="button" className="template-secondary" disabled={busy} onClick={() => setStatus("archived")}>Archive</button>}</div></div>}
  </main>;
}
