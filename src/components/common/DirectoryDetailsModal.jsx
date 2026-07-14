import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import "./DirectoryDetailsModal.css";

export default function DirectoryDetailsModal({ title, eyebrow, onClose, children }) {
  const closeRef = useRef(null);
  const previouslyFocusedRef = useRef(document.activeElement);

  useEffect(() => {
    const previouslyFocused = previouslyFocusedRef.current;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    closeRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [onClose]);

  return (
    <div
      className="directory-modal-backdrop"
      role="presentation"
      onMouseDown={(event) => event.target === event.currentTarget && onClose()}
    >
      <section className="directory-modal" role="dialog" aria-modal="true" aria-labelledby="directory-modal-title">
        <header>
          <div>
            {eyebrow && <span>{eyebrow}</span>}
            <h2 id="directory-modal-title">{title}</h2>
          </div>
          <button ref={closeRef} type="button" onClick={onClose} aria-label="Close details" title="Close details">
            <X size={20} />
          </button>
        </header>
        <div className="directory-modal-content">{children}</div>
      </section>
    </div>
  );
}

export function DirectoryDetailGrid({ entries }) {
  return (
    <dl className="directory-detail-grid">
      {entries.filter(([, value]) => value !== null && value !== undefined && value !== "").map(([label, value]) => (
        <div key={label}><dt>{label}</dt><dd>{value}</dd></div>
      ))}
    </dl>
  );
}
