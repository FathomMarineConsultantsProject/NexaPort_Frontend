import { useId, useRef, useState } from "react";
import { createDecisionForm, DECISION_COPY, prepareDecision, submitDecisionOnce } from "./quotationDecisionState.js";

export default function QuotationDecisionForm({ decision, onSubmit, onCancel, busy }) {
  const prefix = useId();
  const [form, setForm] = useState(() => createDecisionForm(decision));
  const [errors, setErrors] = useState({});
  const [saving, setSaving] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const pending = useRef(false);
  const disabled = busy || saving;
  const copy = DECISION_COPY[decision];
  const isRevision = decision === "revision_requested";
  const fieldId = (field) => `${prefix}-${field}`;
  const update = (field) => (event) => {
    const next = { ...form, [field]: event.target.value };
    setForm(next);
    if (errors[field]) setErrors((current) => ({ ...current, [field]: prepareDecision(next).errors[field] }));
  };
  const accessibility = (field) => ({ id: fieldId(field), "aria-invalid": Boolean(errors[field]),
    "aria-describedby": errors[field] ? `${fieldId(field)}-error` : undefined });
  const errorFor = (field) => errors[field] && <p className="negotiation-error" id={`${fieldId(field)}-error`} role="alert">{errors[field]}</p>;
  const submit = async (event) => {
    event.preventDefault();
    if (disabled || pending.current) return;
    const prepared = prepareDecision(form);
    setErrors(prepared.errors);
    if (Object.keys(prepared.errors).length) { event.currentTarget.querySelector(`#${CSS.escape(fieldId(Object.keys(prepared.errors)[0]))}`)?.focus(); return; }
    setSaving(true); setSubmitError("");
    try { await submitDecisionOnce(pending, onSubmit, prepared.payload); }
    catch (error) { setSubmitError(error.response?.data?.message || error.message || "Decision could not be saved. Your draft has been kept."); }
    finally { setSaving(false); }
  };
  return <form className="workflow-panel quotation-negotiation" onSubmit={submit} noValidate aria-labelledby={`${prefix}-title`}>
    <header className="negotiation-heading"><h4 id={`${prefix}-title`}>{copy.title}</h4><p>{copy.description}</p></header>
    {submitError && <p className="negotiation-error" role="alert">{submitError}</p>}
    <fieldset className="negotiation-fields" disabled={disabled}>
      <legend className="negotiation-sr-only">{copy.title} fields</legend>
      {decision !== "approved" && <>
        <div className="negotiation-field negotiation-wide"><label htmlFor={fieldId("consultantMessage")}>Message to Consultant {isRevision && <span>(required)</span>}</label>
          <textarea {...accessibility("consultantMessage")} required={isRevision} rows={4} value={form.consultantMessage} onChange={update("consultantMessage")} placeholder={isRevision ? "Please review your professional fees and travel expenses and submit a revised quotation." : "Explain why this quotation is being rejected."}/>
          {errorFor("consultantMessage")}
        </div>

      </>}
      {isRevision && <div className="negotiation-field"><label htmlFor={fieldId("suggestedMaxAmount")}>Suggested Maximum Amount <span>(Optional)</span></label>
        <div className="negotiation-amount">
          <div><input {...accessibility("suggestedMaxAmount")} className="negotiation-money" type="text" inputMode="decimal" value={form.suggestedMaxAmount} onChange={update("suggestedMaxAmount")} placeholder="1,200.00"/>{errorFor("suggestedMaxAmount")}</div>
          <div><label className="negotiation-sr-only" htmlFor={fieldId("suggestedMaxCurrency")}>Currency</label>
            <input {...accessibility("suggestedMaxCurrency")} className="negotiation-currency" list={`${prefix}-currencies`} value={form.suggestedMaxCurrency} onChange={update("suggestedMaxCurrency")} aria-label="Currency" maxLength={3}/>
            <datalist id={`${prefix}-currencies`}>{["USD", "EUR", "GBP", "INR", "SGD", "AED"].map((currency) => <option key={currency} value={currency}/>)}</datalist>
            {errorFor("suggestedMaxCurrency")}
          </div>
        </div><p className="negotiation-help">Advisory only. Future quotations are not automatically rejected above this amount.</p>
      </div>}
      <section className="negotiation-details negotiation-wide" aria-labelledby={`${prefix}-details`}>
        <h5 id={`${prefix}-details`}>Additional Details</h5>
        {decision !== "approved" && <div className="negotiation-field"><label htmlFor={fieldId("reason")}>{isRevision ? "Reason for revision (Optional)" : "Reason for rejection"}</label>
          <input {...accessibility("reason")} value={form.reason} onChange={update("reason")} placeholder={isRevision ? "Optional reason, if distinct from your message" : "Brief reason for this decision"}/>{errorFor("reason")}
        </div>}
      <div className="negotiation-field negotiation-wide"><label htmlFor={fieldId("internalAdminNote")}>Internal Admin Note <span>(Private)</span></label>
        <textarea {...accessibility("internalAdminNote")} rows={3} value={form.internalAdminNote} onChange={update("internalAdminNote")} aria-describedby={`${prefix}-privacy${errors.internalAdminNote ? ` ${fieldId("internalAdminNote")}-error` : ""}`}/>
        {errorFor("internalAdminNote")}
        <p className="negotiation-help" id={`${prefix}-privacy`}>Visible only to authorized administrators. Not shared with the Consultant.</p>
      </div>
      </section>
    </fieldset>
    <footer className="negotiation-actions"><button type="button" className="workflow-secondary" disabled={disabled} onClick={onCancel}>Cancel</button><button type="submit" className="workflow-primary" disabled={disabled}>{saving ? "Saving…" : copy.action}</button></footer>
  </form>;
}
