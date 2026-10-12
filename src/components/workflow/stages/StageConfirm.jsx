import { useState } from "react";
import { AlertCircle, CheckCircle2, Clock, Send, ShieldCheck } from "lucide-react";
import { DataRow, QuoteBreakdown } from "./StageData";
import { date, money } from "./formatters";
import { previewCommercialFee } from "./commercialFee";

export default function StageConfirm({ data, onSendProposal, onSaveDraft, onSupersedeProposal,
  onSelectOtherQuote, onAdvanceToSurveyor, busy }) {
  const quote = data?.selectedQuotation;
  const proposal = data?.proposal;
  const draftProposal = data?.proposals?.find((item) => item.status === "draft") || null;
  const formSource = draftProposal || proposal;
  const request = data?.request;
  const [feeMode, setFeeMode] = useState(formSource ? formSource.feeMode || "custom" : "percentage");
  const [feePercentage, setFeePercentage] = useState(String(formSource?.feePercentage ?? 25));
  const [customAmount, setCustomAmount] = useState(String(formSource?.adminMarkupUsd ?? 0));
  const [clientNotes, setClientNotes] = useState(formSource?.clientNotes || "");
  const [internalAdminNotes, setInternalAdminNotes] = useState(formSource?.internalAdminNotes || "");
  const [attendanceDays, setAttendanceDays] = useState(String(formSource?.estimatedAttendanceDays ?? quote?.attendanceDays ?? ""));
  const [isEditing, setIsEditing] = useState(Boolean(draftProposal && ["sent", "rejected"].includes(proposal?.status)));

  if (!quote) return <section className="workflow-stage"><div className="workflow-empty">
    <h2>Quotation selection required</h2>
    <p>Select an eligible Consultant quotation before preparing commercial terms.</p>
    <button className="workflow-secondary" onClick={onSelectOtherQuote}>Go to Quote Stage</button>
  </div></section>;
  if (quote.internalStatus !== "approved" || Number(quote.latestRevisionId) !== Number(quote.approvedRevisionId))
    return <section className="workflow-stage"><div className="workflow-alert warning">The latest Consultant revision requires internal approval.</div><button className="workflow-secondary" onClick={onSelectOtherQuote}>Return to quotation review</button></section>;

  const preview = previewCommercialFee({ consultantTotal: quote.consultantTotalUsd,
    mode: feeMode, percentage: feePercentage, customAmount });
  const status = proposal?.status || "draft";
  const isSent = status === "sent";
  const isApproved = status === "approved" || Boolean(request?.acceptedQuotationId);
  const isRejected = status === "rejected";
  const canEdit = !busy && !isApproved && (!isSent || isEditing) && (!isRejected || isEditing);
  const validDays = attendanceDays === "" || (/^[1-9]\d*$/.test(attendanceDays) && Number.isSafeInteger(Number(attendanceDays)));
  const canSubmit = canEdit && preview && validDays;
  const payload = () => ({ quotationId: quote.id, feeMode,
    feePercentage: feeMode === "percentage" ? feePercentage : null,
    adminMarkupUsd: feeMode === "custom" ? customAmount : undefined,
    clientNotes: clientNotes.trim() || null,
    internalAdminNotes: internalAdminNotes.trim() || null,
    estimatedAttendanceDays: attendanceDays ? Number(attendanceDays) : null });

  return <section className="workflow-stage commercial-confirm">
    <header className="stage-heading"><div><span>Stage 03 · Commercial</span>
      <h2>Commercial proposal &amp; Client decision</h2>
      <p>Approved Consultant costs form the supplier basis. Nexaport sets the Client proposal fee.</p>
    </div></header>

    {proposal && ["sent","approved","rejected"].includes(status) && <div className={"workflow-alert " + (isApproved ? "success" : isRejected ? "error" : "warning") + " commercial-status"} role="status">
      {isApproved ? <CheckCircle2 size={18}/> : isRejected ? <AlertCircle size={18}/> : <Clock size={18}/>}
      <div><strong>{isApproved ? "Client approved" : isRejected ? "Client declined" : "Sent to Client"} · Proposal revision #{proposal.revisionNumber}</strong>
        <p>Saved Client offer: <strong>{money(proposal.clientTotalUsd)}</strong> · Nexaport fee: {money(proposal.adminMarkupUsd)} · {date(proposal.sentAt || proposal.updatedAt)}.</p>
        {isSent && <p>Proposal status is sent. In-app alert and email delivery are not verified on this screen.</p>}
        {isRejected && <p>Client reason: {proposal.clientRejectionReason || "Not provided"}</p>}
      </div>
    </div>}

    <div className="commercial-context">
      <article className="workflow-panel"><h3>Request overview</h3>
        <DataRow label="Vessel" value={request?.vessel?.name}/><DataRow label="Service" value={request?.service}/>
        <DataRow label="Port" value={request?.port?.name}/><DataRow label="Approved request budget" value={money(request?.approvedBudgetUsd)}/>
      </article>
      <article className="workflow-panel"><h3>Selected Consultant</h3>
        <DataRow label="Name" value={quote.consultantName}/><DataRow label="Location" value={quote.consultantLocation}/>
        <DataRow label="Rating" value={quote.consultantRating == null ? "Not provided" : String(quote.consultantRating) + " / 5"}/>
        <DataRow label="Approved revision" value={"#" + (quote.revisions?.find((r) => Number(r.id) === Number(quote.approvedRevisionId))?.revisionNumber || 1)}/>
      </article>
    </div>

    <div className="commercial-columns">
      <article className="workflow-panel supplier-ledger"><div className="commercial-section-head"><span>01 / Supplier basis</span><h3>Approved Consultant quotation</h3><p>All approved expenses are included in the total.</p></div>
        <QuoteBreakdown quote={quote}/>
      </article>
      <article className="workflow-panel commercial-terms"><div className="commercial-section-head"><span>02 / Nexaport terms</span><h3>Commercial fee</h3><p>Choose a percentage of Consultant cost or enter a fixed fee.</p></div>
        <fieldset className="fee-mode" disabled={!canEdit}><legend>Fee calculation mode</legend>
          <label><input type="radio" name="fee-mode" checked={feeMode === "percentage"} onChange={() => setFeeMode("percentage")}/> Percentage</label>
          <label><input type="radio" name="fee-mode" checked={feeMode === "custom"} onChange={() => setFeeMode("custom")}/> Custom amount</label>
        </fieldset>
        <div className="commercial-inputs">
          {feeMode === "percentage" ? <label>Fee percentage <span>of approved Consultant total</span><input type="number" min="0" max="9999.99" step="0.01" value={feePercentage} disabled={!canEdit} onChange={(event) => setFeePercentage(event.target.value)}/></label>
            : <label>Nexaport fee <span>USD, fixed amount</span><input type="number" min="0" step="0.01" value={customAmount} disabled={!canEdit} onChange={(event) => setCustomAmount(event.target.value)}/></label>}
          <label>Estimated attendance <span>days</span><input type="number" min="1" step="1" value={attendanceDays} disabled={!canEdit} onChange={(event) => setAttendanceDays(event.target.value)}/></label>
        </div>
        <div className="commercial-total-ledger" aria-live="polite">
          <div><span>Approved Consultant total</span><strong>{money(quote.consultantTotalUsd)}</strong></div>
          <div><span>+ Nexaport fee {feeMode === "percentage" ? "(" + (feePercentage || "—") + "%)" : "(custom)"}</span><strong>{preview ? money(preview.feeUsd) : "Check fee input"}</strong></div>
          <div className="grand"><span>= {canEdit ? "Current editable draft total" : "Current terms (read only)"}</span><strong>{preview ? money(preview.draftTotalUsd) : "—"}</strong></div>
        </div>
        {draftProposal && <p className="commercial-snapshot">Saved draft total: <strong>{money(draftProposal.clientTotalUsd)}</strong> · revision #{draftProposal.revisionNumber}. Unsaved edits appear above.</p>}
        {proposal && ["sent","approved","rejected"].includes(status) && <p className="commercial-snapshot">Previously sent Client proposal total: <strong>{money(proposal.clientTotalUsd)}</strong> · revision #{proposal.revisionNumber}. This saved offer does not change as you edit.</p>}
        {!preview && <p className="commercial-validation" role="alert">Enter a finite, nonnegative fee with at most two decimal places.</p>}
        {!validDays && <p className="commercial-validation" role="alert">Attendance must be a whole number of days.</p>}
      </article>
    </div>

    <article className="workflow-panel commercial-notes"><h3>Proposal notes</h3><div>
      <label>Client-facing notes<textarea rows={3} value={clientNotes} disabled={!canEdit} onChange={(event) => setClientNotes(event.target.value)} placeholder="Inclusions and terms visible to the Client"/></label>
      <label>Internal Admin notes<textarea rows={3} value={internalAdminNotes} disabled={!canEdit} onChange={(event) => setInternalAdminNotes(event.target.value)} placeholder="Internal only; never shown to the Client"/></label>
    </div></article>

    <footer className="stage-action-row commercial-actions"><span className="confirmation-note"><ShieldCheck size={16}/>{isApproved ? "Client approval and assignment recorded." : "Client approval is required before assignment."}</span>
      <div>
        {canEdit && <><button type="button" className="workflow-secondary" onClick={onSelectOtherQuote}>Select other quote</button>
          <button type="button" className="workflow-secondary" disabled={!canSubmit} onClick={() => onSaveDraft?.(payload())}>Save draft</button>
          <button type="button" className="workflow-primary" disabled={!canSubmit} onClick={() => onSendProposal?.(payload())}><Send size={15}/> Send proposal to Client</button></>}
        {isSent && !isEditing && <><button type="button" className="workflow-secondary" disabled={busy} onClick={() => setIsEditing(true)}>Prepare revised offer</button>
          <button type="button" className="workflow-secondary" disabled={busy} onClick={() => onSupersedeProposal?.(proposal.id)}>Recall proposal</button></>}
        {isRejected && !isEditing && <button type="button" className="workflow-secondary" disabled={busy} onClick={() => setIsEditing(true)}>Revise commercial terms</button>}
        {isApproved && <button type="button" className="workflow-primary" disabled={busy} onClick={onAdvanceToSurveyor}>Continue to Surveyor stage</button>}
      </div>
    </footer>
  </section>;
}
