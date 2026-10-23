import { useState } from "react";
import { claimUrl, copyClaimUrl } from "../../utils/claimUrl";

export default function CopyClaimLink({ path }) {
  const [message, setMessage] = useState("");
  const url = claimUrl(path);
  const copy = async () => {
    try {
      await copyClaimUrl(url);
      setMessage("Claim link copied. Anyone with the link can request a review; access still requires approval.");
    } catch {
      setMessage("Select and copy the link below.");
    }
  };
  return <div className="claim-share"><label>Public claim page link<input readOnly value={url} onFocus={event => event.target.select()} /></label><button type="button" onClick={copy}>Copy public link</button>{message && <small role="status">{message}</small>}</div>;
}
