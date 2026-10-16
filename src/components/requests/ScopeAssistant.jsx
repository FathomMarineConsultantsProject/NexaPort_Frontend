import { useLayoutEffect, useRef, useState } from "react";
import { generateRequestScope } from "../../api/serviceRequestApi";
import { generateScopeDraft, includeLegacyCertification, scopeGenerationErrorMessage } from "./scopeAssistantState";
import "./RequestEnhancements.css";

export default function ScopeAssistant({ value, onChange, legacyCertification, disabled = false }) {
  const [keywords, setKeywords] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const currentScope = useRef(value.scopeOfWork || "");
  useLayoutEffect(() => { currentScope.current = value.scopeOfWork || ""; }, [value.scopeOfWork]);
  const generate = async () => {
    setBusy(true); setError("");
    try {
      await generateScopeDraft(generateRequestScope, {
        keywords, inspectionMethodId: value.inspectionMethodId || null,
        vesselType: value.vesselType || "", portId: value.portId || null,
        portName: value.portName || "", terminalName: value.terminalName || "",
        eta: value.eta || "", existingScope: value.scopeOfWork || "",
        ...(value.ports?.length ? { portIds: value.ports.map((p) => Number(p.id)), primaryPortId: value.portId } : {}),
      }, onChange, () => currentScope.current);
    } catch (error) { setError(scopeGenerationErrorMessage(error)); }
    finally { setBusy(false); }
  };
  return <div className="scope-assistant wide">
    <div className="scope-assistant__heading"><h3>AI Scope Assistant</h3><p>Turn a few operational notes into an editable first draft.</p></div>
    <div className="scope-assistant__controls"><label htmlFor="scope-keywords">Key details</label><input id="scope-keywords" placeholder="e.g. hull condition, cargo gear, report format" maxLength={1000} value={keywords} disabled={busy || disabled} onChange={(event) => setKeywords(event.target.value)} />
    <button type="button" disabled={busy || disabled || !keywords.trim()} onClick={generate}>{busy ? "Generating..." : "Generate Draft"}</button></div>
    <small>Review and edit the generated scope before submitting.</small>
    {busy && <span role="status">Preparing your draft…</span>}
    {error && <p role="alert">{error}</p>}
    {legacyCertification && <button className="scope-assistant__secondary" type="button" disabled={busy || disabled} onClick={() => onChange(includeLegacyCertification(value.scopeOfWork, legacyCertification))}>Include certification in scope</button>}
  </div>;
}
