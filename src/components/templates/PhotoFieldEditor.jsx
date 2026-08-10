export default function PhotoFieldEditor({ field, onChange, readOnly = false }) {
  const maxPhotos = Number(field.maxPhotos) || 1;
  return <div className="template-photo-settings">
    <label><input type="checkbox" disabled={readOnly} checked={field.captionEnabled} onChange={(event) => onChange({ captionEnabled: event.target.checked })} /> Allow a caption</label>
    <label>Maximum photos
      <select disabled={readOnly} value={maxPhotos} onChange={(event) => onChange({ maxPhotos: Number(event.target.value) })} aria-label="Maximum photos per field">
        {Array.from({ length: 10 }, (_, i) => <option key={i + 1} value={i + 1}>{i + 1}</option>)}
      </select>
    </label>
    <small>JPEG, PNG and WebP photos up to 5 MB are supported.</small>
  </div>;
}
