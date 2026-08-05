import { FileUp } from "lucide-react";

export default function TemplateUpload({ file, onFile, progress, progressText, disabled, inputKey }) {
  return <div className="template-upload">
    <FileUp size={28} />
    <div><strong>{file ? file.name : "Choose a PDF, XML, DOCX or XLSX source"}</strong><span>PDF/DOCX/XLSX up to 10 MB · XML up to 2 MB</span></div>
    <label className="template-secondary">Browse<input key={inputKey} disabled={disabled} hidden type="file" accept=".pdf,.xml,.docx,.xlsx,application/pdf,application/xml,text/xml,application/vnd.openxmlformats-officedocument.wordprocessingml.document,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" onChange={(event) => onFile(event.target.files?.[0] || null)} /></label>
    {progress > 0 && progress < 100 && <div className="template-local-progress"><span>{progressText}</span><progress value={progress} max="100" aria-label="Local extraction progress">{progress}%</progress></div>}
  </div>;
}
