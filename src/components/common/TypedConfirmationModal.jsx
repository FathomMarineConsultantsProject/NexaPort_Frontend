import { useEffect, useRef, useState } from "react";
import "./TypedConfirmationModal.css";

export default function TypedConfirmationModal({
  title,
  subject,
  company,
  warning,
  confirmationText,
  confirmLabel,
  dependencies,
  requireReason = false,
  busy = false,
  error = "",
  onCancel,
  onConfirm,
}) {
  const [typed, setTyped] = useState("");
  const [reason, setReason] = useState("");
  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, []);
  const ready = typed === confirmationText && (!requireReason || reason.trim());

  return (
    <div className="typed-confirm-backdrop" role="presentation" onMouseDown={(event) => {
      if (event.target === event.currentTarget && !busy) onCancel();
    }}>
      <section className="typed-confirm-modal" role="dialog" aria-modal="true" aria-labelledby="typed-confirm-title">
        <h2 id="typed-confirm-title">{title}</h2>
        <p className="typed-confirm-subject"><strong>{subject}</strong>{company ? ` · ${company}` : ""}</p>
        <p>{warning}</p>
        {dependencies && (
          <div className="typed-confirm-dependencies">
            {Object.entries(dependencies).filter(([key]) => key !== "has_immutable_history").map(([key, value]) => (
              <span key={key}>{key.replaceAll("_", " ")}: <strong>{value}</strong></span>
            ))}
          </div>
        )}
        {requireReason && <label>Administrative reason<textarea value={reason} onChange={(event) => setReason(event.target.value)} maxLength={1000} /></label>}
        <label>Type <strong>{confirmationText}</strong> to continue<input ref={inputRef} value={typed} onChange={(event) => setTyped(event.target.value)} autoComplete="off" /></label>
        {error && <div className="typed-confirm-error" role="alert">{error}</div>}
        <div className="typed-confirm-actions">
          <button type="button" onClick={onCancel} disabled={busy}>Cancel</button>
          <button type="button" className="danger" disabled={!ready || busy} onClick={() => onConfirm({ confirmation: typed, reason: reason.trim() })}>{busy ? "Processing..." : confirmLabel}</button>
        </div>
      </section>
    </div>
  );
}
