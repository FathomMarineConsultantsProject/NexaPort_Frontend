import { useEffect, useRef, useState } from "react";
import { Link2 } from "lucide-react";
import { copyRequestLink } from "../../api/requestShareApi";
import "./CopyRequestLink.css";

export default function CopyRequestLink({ requestId }) {
  const busyRef = useRef(false);
  const timerRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState("");
  const [message, setMessage] = useState("");

  useEffect(() => () => clearTimeout(timerRef.current), []);

  const showMessage = (value) => {
    clearTimeout(timerRef.current);
    setMessage(value);
    if (value === "Copied to clipboard") timerRef.current = setTimeout(() => setMessage(""), 3000);
  };

  const writeToClipboard = async (shareUrl) => {
    if (!navigator.clipboard?.writeText) throw new Error("Clipboard unavailable");
    await navigator.clipboard.writeText(shareUrl);
  };

  const share = async () => {
    if (busyRef.current) return;
    busyRef.current = true;
    setBusy(true);
    setUrl("");
    showMessage("");
    try {
      const result = await copyRequestLink(requestId);
      const locator = result?.data?.locator;
      if (!/^[0-9a-f]{64}$/.test(locator || "")) throw new Error("Invalid share locator");
      const shareUrl = new URL(`/s/${locator}`, window.location.origin).href;
      try {
        await writeToClipboard(shareUrl);
        showMessage("Copied to clipboard");
      } catch {
        setUrl(shareUrl);
        showMessage("Select the link or use Copy.");
      }
    } catch {
      showMessage("Sharing is unavailable. Please try again.");
    } finally {
      busyRef.current = false;
      setBusy(false);
    }
  };

  const copyFallback = async () => {
    try {
      await writeToClipboard(url);
      setUrl("");
      showMessage("Copied to clipboard");
    } catch {
      showMessage("Select the link to copy it manually.");
    }
  };

  return <span className="request-share">
    <button type="button" className="secondary-btn" disabled={busy} onClick={share}>
      <Link2 size={14} /> {busy ? "Preparing…" : "Share"}
    </button>
    {message && <small role="status" className="request-share-message">{message}</small>}
    {url && <span className="request-share-fallback">
      <input aria-label="Share link" readOnly value={url} onFocus={(event) => event.target.select()} onClick={(event) => event.target.select()} />
      <button type="button" onClick={copyFallback}>Copy</button>
    </span>}
  </span>;
}
