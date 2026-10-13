import { useState } from "react";
import { Link2 } from "lucide-react";
import { copyRequestLink } from "../../api/requestShareApi";

export default function CopyRequestLink({ requestId }) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const copy = async () => {
    setBusy(true);
    setMessage("");
    try {
      const result = await copyRequestLink(requestId);
      const url = new URL(`/s/${result.data.locator}`, window.location.origin).href;
      await navigator.clipboard.writeText(url);
      setMessage("Link copied");
    } catch {
      setMessage("Could not copy the link. Please try again.");
    } finally { setBusy(false); }
  };
  return <span className="request-copy-link"><button type="button" className="secondary-btn" disabled={busy} onClick={copy}><Link2 size={14} /> Copy Link</button>{message && <small role="status">{message}</small>}</span>;
}
