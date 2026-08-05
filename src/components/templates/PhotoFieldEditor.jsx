export default function PhotoFieldEditor({ field, onChange }) {
  return <div className="template-photo-settings">
    <label><input type="checkbox" checked={field.captionEnabled} onChange={(event) => onChange({ captionEnabled: event.target.checked })} /> Allow a caption</label>
    <small>JPEG, PNG and WebP photos up to 5 MB are supported.</small>
  </div>;
}
