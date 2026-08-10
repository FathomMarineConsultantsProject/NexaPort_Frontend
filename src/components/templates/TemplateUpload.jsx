import { FileUp } from "lucide-react";

const SOURCES = [
  ["pdf", "PDF"],
  ["xml", "XML"],
  ["docx", "Word"],
  ["xlsx", "Excel"],
  ["manual", "Start Blank"],
];

export default function TemplateUpload({ file, onFile, sourceMode, onSourceMode, progress, progressText, disabled, inputKey }) {
  const ACCEPT = ".pdf,.xml,.docx,.xlsx,application/pdf,application/xml,text/xml,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  return <div className="template-source-selector">
    <div className="template-source-tabs" role="tablist" aria-label="Template source type">
      {SOURCES.map(([key, label]) => <button key={key} type="button" role="tab" aria-selected={sourceMode === key} className={sourceMode === key ? "active" : ""} disabled={disabled} onClick={() => onSourceMode(key)}>{label}</button>)}
    </div>
    {sourceMode !== "manual" && <div className="template-upload">
      <FileUp size={28} />
      <div><strong>{file ? file.name : `Choose a ${(sourceMode || "PDF").toUpperCase()} source file`}</strong><span>PDF/DOCX/XLSX up to 10 MB · XML up to 2 MB</span></div>
      <label className="template-secondary">Browse<input key={inputKey} disabled={disabled} hidden type="file" accept={ACCEPT} onChange={(event) => onFile(event.target.files?.[0] || null)} /></label>
      {progress > 0 && progress < 100 && <div className="template-local-progress"><span>{progressText}</span><progress value={progress} max="100" aria-label="Local extraction progress">{progress}%</progress></div>}
    </div>}
    {sourceMode === "manual" && <div className="template-blank-notice"><strong>Blank template</strong><span>No source document required. Add fields manually below.</span></div>}
  </div>;
}
