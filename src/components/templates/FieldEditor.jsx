import { ChevronDown, ChevronUp, Plus, Trash2 } from "lucide-react";
import PhotoFieldEditor from "./PhotoFieldEditor";

const FIELD_TYPES = [["text","Text"],["textarea","Narrative"],["number","Number"],["date","Date"],["checkbox","Checkbox"],["yes_no","Yes / No"],["select","Select"],["signature","Signature"],["photo","Photo"],["section_heading","Section heading"]];
const newField = (type = "text", firstPhoto = false) => ({ fieldKey: firstPhoto ? "photo_evidence" : `field_${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`, label: type === "photo" ? "Photo Evidence" : "New field", type, fieldType: type, required: false, section: type === "photo" ? "Photo Evidence" : "General", sortOrder: 0, defaultValue: "", options: [], sourceFieldName: null, sourcePageNumber: null, sourceCoordinates: null, captionEnabled: type === "photo", maxPhotos: type === "photo" ? 1 : undefined });

const sourceLabel = (field) => {
  const source = field.sourceLocation || {};
  if (source.pageNumber) return `Page ${source.pageNumber}`;
  if (source.sheetName) return `Sheet “${source.sheetName}”${source.rowIndex != null ? `, row ${source.rowIndex}` : ""}`;
  if (source.tableIndex != null) return `DOCX table ${source.tableIndex + 1}${source.rowIndex != null ? `, row ${source.rowIndex + 1}` : ""}`;
  if (source.elementPath) return "XML source";
  return null;
};

export default function FieldEditor({ fields, onChange, errors = [], readOnly = false, onOpenSource = null }) {
  const update = (index, changes) => onChange(fields.map((field, position) => position === index ? { ...field, ...changes } : field));
  const move = (index, offset) => { const next = [...fields]; [next[index], next[index + offset]] = [next[index + offset], next[index]]; onChange(next.map((field, sortOrder) => ({ ...field, sortOrder }))); };
  const remove = (index) => onChange(fields.filter((_, position) => position !== index).map((field, sortOrder) => ({ ...field, sortOrder })));
  const add = (type = "text") => onChange([...fields, { ...newField(type, type === "photo" && !fields.some((field) => field.type === "photo")), sortOrder: fields.length }]);
  const photoEnabled = fields.some((field) => field.type === "photo");
  const togglePhotos = (enabled) => {
    if (enabled) add("photo");
    else if (window.confirm("Remove all configured photo fields? This cannot be undone until you save a new version.")) onChange(fields.filter((field) => field.type !== "photo").map((field, sortOrder) => ({ ...field, sortOrder })));
  };
  return <section className="template-field-builder">
    {!readOnly && <div className="template-field-toolbar"><label><input type="checkbox" checked={photoEnabled} onChange={(event) => togglePhotos(event.target.checked)} /> Include photo fields</label><button type="button" className="template-secondary" onClick={() => add()}><Plus size={16} /> Add field</button></div>}
    {!fields.length ? <div className="template-empty compact"><strong>No fields configured</strong><span>Add a field manually or extract suggestions from the source file.</span></div> : fields.map((field, index) => { const rowErrors = errors.filter((error) => error.index === index); const errorFor = (property) => rowErrors.find((error) => error.property === property); return <article className={`template-field-row${rowErrors.length ? " template-field-row--error" : ""}`} key={field.fieldKey} data-field-index={index}>
      <div className="template-field-order"><span>{index + 1}</span>{!readOnly && <><button type="button" aria-label={`Move ${field.label} up`} disabled={!index} onClick={() => move(index, -1)}><ChevronUp size={16} /></button><button type="button" aria-label={`Move ${field.label} down`} disabled={index === fields.length - 1} onClick={() => move(index, 1)}><ChevronDown size={16} /></button></>}</div>
      <div className="template-field-grid">
        <label>Label<input disabled={readOnly} value={field.label} aria-invalid={Boolean(errorFor("label"))} aria-describedby={errorFor("label") ? `field-${index}-label-error` : undefined} onChange={(event) => update(index, { label: event.target.value })} />{errorFor("label") && <small id={`field-${index}-label-error`} className="template-field-error">{errorFor("label").message}</small>}</label>
        <label>Type<select disabled={readOnly} value={field.type} aria-invalid={Boolean(errorFor("type"))} aria-describedby={errorFor("type") ? `field-${index}-type-error` : undefined} onChange={(event) => update(index, { type: event.target.value, fieldType: event.target.value, options: event.target.value === "select" ? field.options : [] })}>{FIELD_TYPES.map(([value,label]) => <option key={value} value={value}>{label}</option>)}</select>{errorFor("type") && <small id={`field-${index}-type-error`} className="template-field-error">{errorFor("type").message}</small>}</label>
        <label>Section<input disabled={readOnly} value={field.section || ""} onChange={(event) => update(index, { section: event.target.value })} /></label>
        {field.type === "select" && <label className="template-field-wide">Options, separated by commas<input disabled={readOnly} value={(field.options || []).join(", ")} aria-invalid={Boolean(errorFor("options"))} aria-describedby={errorFor("options") ? `field-${index}-options-error` : undefined} onChange={(event) => update(index, { options: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} />{errorFor("options") && <small id={`field-${index}-options-error`} className="template-field-error">{errorFor("options").message}</small>}</label>}
        {field.type !== "section_heading" && <label className="template-field-checkbox"><input disabled={readOnly} type="checkbox" checked={field.required} onChange={(event) => update(index, { required: event.target.checked })} /><span>Required</span></label>}
        {field.type === "photo" && <><PhotoFieldEditor field={field} onChange={(changes) => update(index, changes)} />{errorFor("maxPhotos") && <small className="template-field-error">{errorFor("maxPhotos").message}</small>}</>}
        {(field.sourceFieldName || field.suggested || field.evidenceRefs?.length) && <small className="template-source-note">{sourceLabel(field) ? <>Source: {sourceLabel(field)}{Number.isFinite(field.confidence) ? ` · ${Math.round(field.confidence * 100)}% confidence` : ""}{onOpenSource && <button type="button" onClick={() => onOpenSource(field.evidenceRefs?.[0] || field.sourceLocation?.blockId)}>View</button>}</> : "Suggested from document text · review required"}{field.reviewWarning && <span> · Review: {field.reviewWarning}</span>}</small>}
      </div>
      {!readOnly && <button type="button" className="template-icon-danger" aria-label={`Remove ${field.label}`} onClick={() => remove(index)}><Trash2 size={17} /></button>}
    </article>; })}
  </section>;
}
