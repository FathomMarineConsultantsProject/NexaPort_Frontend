import { Check, Copy } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import "./CopyableContact.css";

const actionLabels = {
  email: "Copy email address",
  fax: "Copy fax number",
  phone: "Copy phone number",
};

const fallbackCopy = (value) => {
  const textarea = document.createElement("textarea");
  const activeElement = document.activeElement;

  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  textarea.style.pointerEvents = "none";
  document.body.appendChild(textarea);
  textarea.select();

  let copied;
  try {
    copied = document.execCommand("copy");
  } finally {
    document.body.removeChild(textarea);
    activeElement?.focus?.();
  }

  if (!copied) throw new Error("Clipboard copy failed");
};

export default function CopyableContact({ value, href, type = "phone" }) {
  const [copied, setCopied] = useState(false);
  const resetTimer = useRef(null);
  const actionLabel = actionLabels[type] || "Copy contact value";

  useEffect(() => () => {
    if (resetTimer.current) window.clearTimeout(resetTimer.current);
  }, []);

  if (!value) return null;

  const copyValue = async (event) => {
    event.preventDefault();
    event.stopPropagation();

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        fallbackCopy(value);
      }

      setCopied(true);
      if (resetTimer.current) window.clearTimeout(resetTimer.current);
      resetTimer.current = window.setTimeout(() => setCopied(false), 1600);
    } catch {
      setCopied(false);
    }
  };

  const valueNode = href ? (
    <a className="copyable-contact__value" href={href}>{value}</a>
  ) : (
    <span className="copyable-contact__value">{value}</span>
  );

  return (
    <div className="copyable-contact">
      {valueNode}
      <button
        type="button"
        className={`copyable-contact__button${copied ? " copied" : ""}`}
        onClick={copyValue}
        aria-label={copied ? "Copied" : actionLabel}
        title={copied ? "Copied" : actionLabel}
      >
        {copied ? <Check size={14} aria-hidden="true" /> : <Copy size={14} aria-hidden="true" />}
      </button>
    </div>
  );
}
