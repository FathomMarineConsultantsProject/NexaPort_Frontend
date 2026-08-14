import { FileUp } from "lucide-react";

const SOURCES = [
  ["pdf", "PDF"],
  ["xml", "XML"],
  ["docx", "Word"],
  ["xlsx", "Excel"],
  ["manual", "Start Blank"],
];
const SOURCE_CONFIG = {
  pdf: { accept: ".pdf,application/pdf", label: "PDF" },
  xml: { accept: ".xml,application/xml,text/xml", label: "XML" },
  docx: { accept: ".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document", label: "DOCX" },
  xlsx: { accept: ".xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", label: "XLSX" },
};

export default function TemplateUpload({ file, onFile, sourceMode, onSourceMode, disabled, inputKey }) {
  const source = SOURCE_CONFIG[sourceMode];
  return <div className="template-source-selector">
    <div className="template-source-tabs" role="tablist" aria-label="Template source type">
      {SOURCES.map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={sourceMode === key} className={sourceMode === key ? "active" : ""} disabled={disabled} onClick={() => onSourceMode(key)}>{label}</button>)}
    </div>
    {sourceMode !== "manual" && <div className="template-upload">
      <FileUp size={28} />
      <div><strong>{file ? file.name : `Choose a ${source.label} source file`}</strong><span>PDF up to 50 MB · DOCX/XLSX up to 25 MB · XML up to 5 MB</span></div>
      <label className="template-secondary">Browse<input key={inputKey} disabled={disabled} hidden type="file" accept={source.accept} onChange={(event) => onFile(event.target.files?.[0] || null)} /></label>
    </div>}
    {sourceMode === "manual" && <div className="template-blank-notice"><strong>Blank template</strong><span>No source document required. Add fields manually below.</span></div>}
  </div>;
}
