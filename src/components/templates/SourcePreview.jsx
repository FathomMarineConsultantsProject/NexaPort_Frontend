import { useEffect, useRef, useState } from "react";
import { X } from "lucide-react";

const Block = ({ block, activeBlockId }) => {
  const active = block.id === activeBlockId;
  if (block.type === "table_row" || block.type === "spreadsheet_row") {
    const cells = (block.metadata?.cells || []).filter((cell) => String(cell.text ?? cell.displayedValue ?? "").trim());
    return <div id={`source-${block.id}`} className={`source-preview-row${active ? " active" : ""}`} data-block-id={block.id}>
      {cells.map((cell, index) => <div key={cell.reference || index}><span>{cell.text || cell.displayedValue}</span></div>)}
    </div>;
  }
  const Tag = block.type === "heading" ? "h3" : "p";
  return <Tag id={`source-${block.id}`} className={`source-preview-block source-preview-${block.type}${active ? " active" : ""}`} data-block-id={block.id}>
    {block.text}
  </Tag>;
};

const friendlyPartName = (part, index, parts) => {
  const ordinal = parts.slice(0, index + 1).filter((item) => item.type === part.type).length;
  if (part.type === "header") return `Header${ordinal > 1 ? ` ${ordinal}` : ""}`;
  if (part.type === "footer") return `Footer${ordinal > 1 ? ` ${ordinal}` : ""}`;
  return part.name;
};

export default function SourcePreview({ document: sourceDocument, initialBlockId, onClose }) {
  const initialPart = Math.max(0, sourceDocument.parts.findIndex((part) => part.blocks.some((block) => block.id === initialBlockId)));
  const [partIndex, setPartIndex] = useState(initialPart); const closeRef = useRef(null);
  useEffect(() => {
    const previous = document.activeElement; const keydown = (event) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", keydown); closeRef.current?.focus();
    return () => { window.removeEventListener("keydown", keydown); previous?.focus?.(); };
  }, [onClose]);
  useEffect(() => { if (!initialBlockId) return; requestAnimationFrame(() => document.getElementById(`source-${initialBlockId}`)?.scrollIntoView({ block: "center" })); }, [initialBlockId, partIndex]);
  const part = sourceDocument.parts[partIndex];
  return <div className="source-preview-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && onClose()}>
    <section className="source-preview" role="dialog" aria-modal="true" aria-labelledby="source-preview-title">
      <header><div><span>Temporary local preview</span><h2 id="source-preview-title">{sourceDocument.sourceName}</h2><p>Content read from your document · nothing is uploaded by this preview</p></div><button ref={closeRef} type="button" onClick={onClose} aria-label="Close source preview"><X size={20} /></button></header>
      <nav aria-label="Source parts">{sourceDocument.parts.map((item, index) => <button type="button" className={index === partIndex ? "active" : ""} key={item.id} onClick={() => setPartIndex(index)}>{friendlyPartName(item, index, sourceDocument.parts)}{item.metadata?.visibility && item.metadata.visibility !== "visible" ? ` (${item.metadata.visibility})` : ""}{item.metadata?.ocrStatus === "complete" ? " · OCR" : ""}</button>)}</nav>
      <div className="source-preview-content">
        {part?.metadata?.readStatus === "failed" && <div className="template-message error">This source region could not be read.</div>}
        {part?.blocks.map((block) => <Block key={block.id} block={block} activeBlockId={initialBlockId} />)}
        {!part?.blocks.length && <p>No readable blocks were detected in this source region.</p>}
      </div>
    </section>
  </div>;
}
