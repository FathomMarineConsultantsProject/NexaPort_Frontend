import { useState, useEffect } from "react";
import { AlertCircle, CheckCircle2, Clock, RotateCcw, Send, ShieldCheck, UserCheck } from "lucide-react";
import { DataRow, QuoteBreakdown } from "./StageData";
import { money, date } from "./formatters";

export default function StageConfirm({
  data,
  onSendProposal,
  onSaveDraft,
  onSupersedeProposal,
  onSelectOtherQuote,
  onAdvanceToSurveyor,
  busy,
}) {
  const quote = data?.selectedQuotation;
  const proposal = data?.proposal;
  const request = data?.request;

  const [markup, setMarkup] = useState(
    proposal?.adminMarkupUsd != null ? String(proposal.adminMarkupUsd) : "0"
  );
  const [clientNotes, setClientNotes] = useState(proposal?.clientNotes || "");
  const [internalAdminNotes, setInternalAdminNotes] = useState(
    proposal?.internalAdminNotes || ""
  );
  const [attendanceDays, setAttendanceDays] = useState(
    proposal?.estimatedAttendanceDays != null
      ? String(proposal.estimatedAttendanceDays)
      : quote?.attendanceDays != null
      ? String(quote.attendanceDays)
      : ""
  );
  const [isEditing, setIsEditing] = useState(false);

  useEffect(() => {
    if (proposal) {
      if (proposal.adminMarkupUsd != null) setMarkup(String(proposal.adminMarkupUsd));
      if (proposal.clientNotes != null) setClientNotes(proposal.clientNotes);
      if (proposal.internalAdminNotes != null) setInternalAdminNotes(proposal.internalAdminNotes);
      if (proposal.estimatedAttendanceDays != null) setAttendanceDays(String(proposal.estimatedAttendanceDays));
    }
  }, [proposal]);

  if (!quote) {
    return (
      <section className="workflow-stage">
        <div className="workflow-empty">
          <h2>Quotation selection required</h2>
          <p>Return to Quote stage and select an eligible Consultant quotation to prepare a commercial proposal.</p>
          {onSelectOtherQuote && (
            <button className="workflow-secondary" onClick={onSelectOtherQuote}>
              Go to Quote Stage
            </button>
          )}
        </div>
      </section>
    );
  }

  const numericMarkup = Math.max(0, Number(markup) || 0);
  const consultantTotal = quote.consultantTotalUsd || 0;
  const clientFacingTotal = consultantTotal + numericMarkup;

  const proposalStatus = proposal?.status || "draft";
  const isSent = proposalStatus === "sent";
  const isApproved = proposalStatus === "approved" || Boolean(request?.acceptedQuotationId);
  const isRejected = proposalStatus === "rejected";

  const handleSend = () => {
    if (onSendProposal) {
      onSendProposal({
        quotationId: quote.id,
        adminMarkupUsd: numericMarkup,
        clientNotes: clientNotes.trim() || null,
        internalAdminNotes: internalAdminNotes.trim() || null,
        estimatedAttendanceDays: attendanceDays ? Number(attendanceDays) : null,
      });
      setIsEditing(false);
    }
  };

  const handleSaveDraft = () => {
    if (onSaveDraft) {
      onSaveDraft({
        quotationId: quote.id,
        adminMarkupUsd: numericMarkup,
        clientNotes: clientNotes.trim() || null,
        internalAdminNotes: internalAdminNotes.trim() || null,
        estimatedAttendanceDays: attendanceDays ? Number(attendanceDays) : null,
      });
    }
  };

  return (
    <section className="workflow-stage">
      <header className="stage-heading">
        <div>
          <span>Stage 03</span>
          <h2>Commercial Proposal &amp; Client Decision</h2>
          <p>
            Review consultant costs, apply NexaPort commercial markup, and submit the proposal to the Client. Confirm Quotation & Assign Surveyor is finalized upon Client authorization.
          </p>
        </div>
      </header>

      {/* Substate Banners */}
      {isSent && !isEditing && (
        <div className="workflow-alert warning" style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <Clock size={20} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Commercial Proposal Sent (Revision #{proposal?.revisionNumber || 1}) — Awaiting Client Approval</strong>
            <p style={{ margin: "4px 0 0 0", fontSize: 13 }}>
              Sent {date(proposal?.sentAt || proposal?.updatedAt)}. Client price: <strong>{money(proposal?.clientTotalUsd)}</strong>.
              The client has been notified to review and approve or decline.
            </p>
          </div>
        </div>
      )}

      {isRejected && !isEditing && (
        <div className="workflow-alert error" style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <AlertCircle size={20} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Client Declined Commercial Proposal (Revision #{proposal?.revisionNumber || 1})</strong>
            <p style={{ margin: "4px 0 6px 0", fontSize: 13 }}>
              Declined on {date(proposal?.decidedAt || proposal?.updatedAt)}.
            </p>
            <blockquote style={{ margin: "6px 0 0 0", padding: "6px 12px", background: "rgba(220,38,38,0.08)", borderLeft: "3px solid #dc2626", borderRadius: 4, fontStyle: "italic", fontSize: 13 }}>
              "{proposal?.clientRejectionReason || "No specific feedback provided."}"
            </blockquote>
          </div>
        </div>
      )}

      {isApproved && (
        <div className="workflow-alert success" style={{ display: "flex", alignItems: "flex-start", gap: 12 }}>
          <CheckCircle2 size={20} style={{ flexShrink: 0, marginTop: 2 }} />
          <div>
            <strong>Client Approved Commercial Proposal (Revision #{proposal?.revisionNumber || 1})</strong>
            <p style={{ margin: "4px 0 0 0", fontSize: 13 }}>
              Approved {date(proposal?.decidedAt || request?.updatedAt)}. Confirmed Total: <strong>{money(proposal?.clientTotalUsd || request?.budgetUsd)}</strong>.
              Surveyor assignment is confirmed and ready for operational execution.
            </p>
          </div>
        </div>
      )}

      {/* Summary Cards */}
      <div className="stage-grid">
        <article className="workflow-panel">
          <h3>Request Overview</h3>
          <DataRow label="Vessel" value={request?.vessel?.name} />
          <DataRow label="Service" value={request?.service} />
          <DataRow label="Port" value={request?.port?.name} />
          <DataRow label="Approved request budget" value={money(request?.approvedBudgetUsd)} />
        </article>

        <article className="workflow-panel">
          <h3>Selected Consultant</h3>
          <DataRow label="Name" value={quote.consultantName} />
          <DataRow label="Location" value={quote.consultantLocation} />
          <DataRow
            label="Rating"
            value={quote.consultantRating == null ? "Not provided" : `${quote.consultantRating} / 5`}
          />
          <DataRow label="Attendance" value={`${attendanceDays || quote.attendanceDays || 1} day(s)`} />
        </article>
      </div>

      {/* Cost Breakdown & Markup Panel */}
      <article className="workflow-panel confirmation-panel">
        <div>
          <h3>Consultant Quotation (Supplier Cost)</h3>
          <QuoteBreakdown quote={quote} />
        </div>

        <div className="markup-control">
          <h3>NexaPort Commercial Terms</h3>

          <label style={{ display: "block", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>NexaPort Markup / Fee (USD)</span>
            <input
              type="number"
              min="0"
              step="0.01"
              disabled={busy || (isSent && !isEditing) || (isApproved && !isEditing)}
              value={markup}
              onChange={(e) => setMarkup(e.target.value)}
              placeholder="0.00"
              style={{ marginTop: 4, width: "100%", padding: "8px 12px" }}
            />
          </label>

          <label style={{ display: "block", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>Estimated Attendance (Days)</span>
            <input
              type="number"
              min="1"
              step="1"
              disabled={busy || (isSent && !isEditing) || (isApproved && !isEditing)}
              value={attendanceDays}
              onChange={(e) => setAttendanceDays(e.target.value)}
              style={{ marginTop: 4, width: "100%", padding: "8px 12px" }}
            />
          </label>

          <label style={{ display: "block", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>Client-Facing Proposal Notes</span>
            <textarea
              rows={2}
              disabled={busy || (isSent && !isEditing) || (isApproved && !isEditing)}
              value={clientNotes}
              onChange={(e) => setClientNotes(e.target.value)}
              placeholder="Notes, inclusions, or payment terms visible to the client..."
              style={{ marginTop: 4, width: "100%", padding: "8px 12px", resize: "vertical" }}
            />
          </label>

          <label style={{ display: "block", marginBottom: 12 }}>
            <span style={{ fontSize: 13, fontWeight: 500 }}>Internal Admin Notes</span>
            <textarea
              rows={2}
              disabled={busy || (isSent && !isEditing) || (isApproved && !isEditing)}
              value={internalAdminNotes}
              onChange={(e) => setInternalAdminNotes(e.target.value)}
              placeholder="Internal commercial commentary (hidden from client)..."
              style={{ marginTop: 4, width: "100%", padding: "8px 12px", resize: "vertical" }}
            />
          </label>

          <div className="final-total" style={{ marginTop: 16 }}>
            <span>Final Client Proposal Total</span>
            <strong>{money(clientFacingTotal)}</strong>
            <small>Client will receive a formal commercial authorization request for this amount.</small>
          </div>
        </div>
      </article>

      {/* Action Footer */}
      <footer className="stage-action-row" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <span className="confirmation-note" style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#6b7280" }}>
          <ShieldCheck size={16} />
          {isApproved
            ? "Proposal approved. Surveyor assignment is locked."
            : isSent && !isEditing
            ? "Proposal is locked pending Client decision."
            : "Client approval is required before surveyor assignment."}
        </span>

        <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
          {/* Draft / Editing Actions */}
          {(!isSent && !isApproved && !isRejected) || isEditing ? (
            <>
              {onSelectOtherQuote && (
                <button
                  type="button"
                  className="workflow-secondary"
                  disabled={busy}
                  onClick={onSelectOtherQuote}
                >
                  Select Other Quote
                </button>
              )}
              <button
                type="button"
                className="workflow-secondary"
                disabled={busy}
                onClick={handleSaveDraft}
              >
                Save Draft
              </button>
              <button
                type="button"
                className="workflow-primary"
                disabled={busy}
                onClick={handleSend}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <Send size={16} />
                {busy ? "Sending..." : "Send Proposal to Client"}
              </button>
            </>
          ) : null}

          {/* Sent State Actions */}
          {isSent && !isEditing && (
            <>
              <button
                type="button"
                className="workflow-secondary"
                disabled={busy}
                onClick={() => setIsEditing(true)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <RotateCcw size={15} />
                Revise / Recall Proposal
              </button>
            </>
          )}

          {/* Rejected State Actions */}
          {isRejected && !isEditing && (
            <>
              {onSelectOtherQuote && (
                <button
                  type="button"
                  className="workflow-secondary"
                  disabled={busy}
                  onClick={onSelectOtherQuote}
                >
                  Select Different Consultant
                </button>
              )}
              <button
                type="button"
                className="workflow-primary"
                disabled={busy}
                onClick={() => setIsEditing(true)}
                style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
              >
                <RotateCcw size={15} />
                Revise Commercial Terms
              </button>
            </>
          )}

          {/* Approved State Actions */}
          {isApproved && (
            <button
              type="button"
              className="workflow-primary"
              disabled={busy}
              onClick={onAdvanceToSurveyor}
              style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
            >
              <UserCheck size={16} />
              Continue to Surveyor Stage
            </button>
          )}
        </div>
      </footer>
    </section>
  );
}
