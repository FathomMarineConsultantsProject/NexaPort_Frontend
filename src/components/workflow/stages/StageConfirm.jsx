import { useState } from "react";
import { AlertCircle, CheckCircle2, Clock, Send, ShieldCheck } from "lucide-react";
import { DataRow, QuoteBreakdown } from "./StageData";
import { date, money } from "./formatters";
import { previewCommercialFee } from "./commercialFee";

export default function StageConfirm({ data, onSendProposal, onSaveDraft, onSupersedeProposal,
  onSelectOtherQuote, onAdvanceToSurveyor, busy }) {
  const selectedQuote = data?.selectedQuotation;
  const acceptedProposal = data?.acceptedProposal || data?.proposals?.find(p=>p.status==="approved") || null;
  const proposal = data?.proposal;
  const draftProposal = data?.proposals?.find((item) => item.status === "draft") || null;
  const formSource = draftProposal || proposal;
  const request = data?.request;
  const [feeMode, setFeeMode] = useState(formSource ? formSource.feeMode || "custom" : "percentage");
  const [feePercentage, setFeePercentage] = useState(String(formSource?.feePercentage ?? 25));
  const [customAmount, setCustomAmount] = useState(String(formSource?.adminMarkupUsd ?? 0));
  const [clientNotes, setClientNotes] = useState(formSource?.clientNotes || "");
  const [internalAdminNotes, setInternalAdminNotes] = useState(formSource?.internalAdminNotes || "");
  const [attendanceDays, setAttendanceDays] = useState(String(formSource?.estimatedAttendanceDays ?? selectedQuote?.attendanceDays ?? ""));
  const [isEditing, setIsEditing] = useState(Boolean(draftProposal && (draftProposal.amendsProposalId || ["sent", "rejected", "approved"].includes(proposal?.status))));

  const snapshotRevision = !isEditing && formSource ? selectedQuote?.revisions?.find(r=>Number(r.id)===Number(formSource.approvedQuotationRevisionId)) : null;
  const quote = snapshotRevision ? {...selectedQuote, baseFeeUsd:snapshotRevision.baseFee,travelCostUsd:snapshotRevision.travelCost,
    accommodationCostUsd:snapshotRevision.accommodationCost,reportFeeUsd:snapshotRevision.reportFee,urgencySurchargeUsd:snapshotRevision.urgencySurcharge,
    consultantTotalUsd:snapshotRevision.consultantTotal} : selectedQuote;
  if (!quote) return <section className="workflow-stage"><div className="workflow-empty">
    <h2>Quotation selection required</h2>
    <p>Select an eligible Consultant quotation before preparing commercial terms.</p>
    <button className="workflow-secondary" onClick={onSelectOtherQuote}>Go to Quote Stage</button>
  </div></section>;
  const quoteApproved = quote.internalStatus === "approved" && Number(quote.latestRevisionId) === Number(quote.approvedRevisionId);

  const preview = previewCommercialFee({ consultantTotal: quote.consultantTotalUsd,
    mode: feeMode, percentage: feePercentage, customAmount });
  const status = proposal?.status || "draft";
  const isSent = status === "sent";
  const isApproved = Boolean(acceptedProposal);
  const isRejected = status === "rejected";
  const canEdit = !busy && quoteApproved && (!isApproved || isEditing) && (!isSent || isEditing) && (!isRejected || isEditing);
  const validDays = attendanceDays === "" || (/^[1-9]\d*$/.test(attendanceDays) && Number.isSafeInteger(Number(attendanceDays)));
  const canSubmit = canEdit && preview && validDays;
  const payload = () => ({ quotationId: quote.id, amendsProposalId: acceptedProposal?.id || null, feeMode,
    feePercentage: feeMode === "percentage" ? feePercentage : null,
    adminMarkupUsd: feeMode === "custom" ? customAmount : undefined,
    clientNotes: clientNotes.trim() || null,
    internalAdminNotes: internalAdminNotes.trim() || null,
    estimatedAttendanceDays: attendanceDays ? Number(attendanceDays) : null });

  return <section className="workflow-stage commercial-confirm">
    <header className="stage-heading"><div><span>Stage 03 · Commercial decision</span>
      <h2>Commercial proposal &amp; Client decision</h2>
      <p>Approved Consultant costs form the supplier basis. Nexaport sets the Client proposal fee.</p>
    </div><strong className={`attention-pill ${isApproved ? "active" : ""}`}>{isApproved ? "Client agreement accepted" : isSent ? "Awaiting Client decision" : draftProposal ? "Draft proposal saved" : "Proposal preparation"}</strong></header>

    {!quoteApproved && <div className="workflow-alert warning">The latest Consultant revision requires fresh internal approval before preparing or sending terms. Existing offers and Client approvals remain preserved. <button type="button" className="workflow-secondary" onClick={onSelectOtherQuote}>Return to quotation review</button></div>}
    {(data?.invoice || data?.inspectionCompletion?.completed) && <div className="workflow-alert warning">Financial amendments are unavailable after invoicing or inspection completion. An explicit financial adjustment workflow is required.</div>}
    {acceptedProposal && <div className="workflow-alert success"><strong>Authoritative Client agreement: {money(acceptedProposal.clientTotalUsd)} · revision #{acceptedProposal.revisionNumber}</strong><p>These accepted terms and the existing assignment remain in effect until the Client approves an amendment.</p></div>}
    {proposal && ["sent","approved","rejected"].includes(status) && <div className={"workflow-alert " + (isApproved ? "success" : isRejected ? "error" : "warning") + " commercial-status"} role="status">
      {status === "approved" ? <CheckCircle2 size={18}/> : isRejected ? <AlertCircle size={18}/> : <Clock size={18}/>}
      <div><strong>{status === "approved" ? (proposal.amendsProposalId ? "Amendment approved" : "Client approved") : isRejected ? (proposal.amendsProposalId ? "Amendment declined" : "Client declined") : (proposal.amendsProposalId ? "Amendment awaiting Client" : "Sent to Client")} · Proposal revision #{proposal.revisionNumber}</strong>
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

    <details className="workflow-panel"><summary>Proposal history ({data?.proposals?.length || 0})</summary>{data?.proposals?.map(p=><p key={p.id}>Revision #{p.revisionNumber} · {p.amendsProposalId ? "Amendment · " : ""}{p.status} · {money(p.clientTotalUsd)} · {date(p.decidedAt || p.sentAt || p.createdAt)}</p>)}</details>
    <footer className="stage-action-row commercial-actions"><span className="confirmation-note"><ShieldCheck size={16}/>{isApproved ? "Client approval and assignment recorded." : "Client approval is required before assignment."}</span>
      <div>
        {canEdit && <>{!isApproved && <button type="button" className="workflow-secondary" onClick={onSelectOtherQuote}>Select other quote</button>}
          <button type="button" className="workflow-secondary" disabled={!canSubmit} onClick={() => onSaveDraft?.(payload())}>Save draft</button>
          <button type="button" className="workflow-primary" disabled={!canSubmit} onClick={() => onSendProposal?.(payload())}><Send size={15}/> Send proposal to Client</button></>}
        {isSent && !isEditing && <><button type="button" className="workflow-secondary" disabled={busy || !quoteApproved} onClick={() => { setIsEditing(true); onSaveDraft?.(payload()); }}>Revise Proposal</button>
          <button type="button" className="workflow-secondary" disabled={busy} onClick={() => onSupersedeProposal?.(proposal.id)}>Recall proposal</button></>}
        {isRejected && !isEditing && <button type="button" className="workflow-secondary" disabled={busy} onClick={() => setIsEditing(true)}>Revise commercial terms</button>}
        {isApproved && !isEditing && !isSent && <button type="button" className="workflow-secondary" disabled={busy || !quoteApproved || Boolean(data?.invoice) || data?.inspectionCompletion?.completed} onClick={()=>{setIsEditing(true);onSaveDraft?.(payload());}}>Create Amendment</button>}
        {isApproved && <button type="button" className="workflow-primary" disabled={busy} onClick={onAdvanceToSurveyor}>Continue to Surveyor stage</button>}
      </div>
    </footer>
  </section>;
}
