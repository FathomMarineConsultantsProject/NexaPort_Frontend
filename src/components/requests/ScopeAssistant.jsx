import { useState } from "react";
import { generateRequestScope } from "../../api/serviceRequestApi";
import { generateScopeDraft, includeLegacyCertification, scopeGenerationErrorMessage } from "./scopeAssistantState";
import "./RequestEnhancements.css";

export default function ScopeAssistant({ value, onChange, legacyCertification, disabled = false }) {
  const [keywords, setKeywords] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const generate = async () => {
    setBusy(true); setError("");
    try {
      await generateScopeDraft(generateRequestScope, {
        keywords, inspectionMethodId: value.inspectionMethodId || null,
        vesselType: value.vesselType || "", portId: value.portId || null,
        portName: value.portName || "", terminalName: value.terminalName || "",
        eta: value.eta || "", existingScope: value.scopeOfWork || "",
      }, onChange);
    } catch (error) { setError(scopeGenerationErrorMessage(error)); }
    finally { setBusy(false); }
  };
  return <div className="scope-assistant wide">
    <span>AI Scope Assistant</span>
    <input aria-label="Scope keywords" placeholder="Enter a few keywords..." maxLength={1000} value={keywords} disabled={busy || disabled} onChange={(event) => setKeywords(event.target.value)} />
    <button type="button" disabled={busy || disabled || !keywords.trim()} onClick={generate}>{busy ? "Generating..." : "Generate Scope"}</button>
    <small>Review and edit the generated scope before submitting.</small>
    {error && <p role="alert">{error}</p>}
    {legacyCertification && <button type="button" disabled={busy || disabled} onClick={() => onChange(includeLegacyCertification(value.scopeOfWork, legacyCertification))}>Include in Scope</button>}
  </div>;
}
