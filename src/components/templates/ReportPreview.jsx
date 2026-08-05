import { Download, Eye } from "lucide-react";

export default function ReportPreview({ generated, onPreview, onDownload, busy, readOnly }) {
  return <aside className="template-report-actions"><div><strong>{generated ? "PDF ready" : "Report draft"}</strong><span>{generated ? "The generated file is stored privately." : readOnly ? "This report has not been generated." : "Save and generate to create the final PDF."}</span></div>{generated && <div><button type="button" className="template-secondary" onClick={onPreview} disabled={busy}><Eye size={16} /> Preview PDF</button><button type="button" className="template-primary" onClick={onDownload} disabled={busy}><Download size={16} /> Download PDF</button></div>}</aside>;
}
