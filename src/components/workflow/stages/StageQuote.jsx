import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { QuoteBreakdown } from "./StageData";
import { dateTime, money } from "./formatters";
import QuotationDecisionForm from "./QuotationDecisionForm";
import { saveDecisionDraft } from "./quotationDecisionState.js";

export default function StageQuote({data,onSelect,onDecision,busy}) {
  const [editing,setEditing]=useState(null);
  const choose=(quoteId,decision)=>setEditing({quoteId,decision});
  const submit=(form,quote)=>saveDecisionDraft(payload=>onDecision(quote.id,payload),{revisionId:quote.latestRevisionId,...form},()=>setEditing(null));
  return <section className="workflow-stage"><header className="stage-heading"><div><span>Stage 02</span><h2>Consultant quotations</h2><p>Review each Consultant revision before selecting it for the Client proposal.</p></div><div className="budget-reference"><span>Approved Request Budget</span><strong>{money(data.request.approvedBudgetUsd)}</strong></div></header>
    <div className="quotation-list">{data.quotations.length?data.quotations.map(quote=>{const current=quote.revisions.at(-1),selectable=quote.internalStatus==="approved"&&Number(quote.latestRevisionId)===Number(quote.approvedRevisionId)&&["pending","submitted"].includes(quote.status);
      return <article key={quote.id} className={`workflow-quote ${data.selectedQuotation?.id===quote.id?"selected":""}`}><header><div><span className="quote-id">Quotation #{quote.id} · Revision {current?.revisionNumber||1}</span><h3>{quote.consultantName||"Consultant not provided"}</h3><p>{dateTime(current?.submittedAt||quote.createdAt)} · {quote.consultantLocation||"Location not provided"}</p></div><span className={`workflow-status ${quote.internalStatus}`}>{quote.internalStatus?.replaceAll("_"," ")||"Awaiting review"}</span></header>
        <QuoteBreakdown quote={quote}/>{quote.coverLetter&&<p className="quote-note">{quote.coverLetter}</p>}
        <details><summary>Revision history ({quote.revisions.length})</summary>{quote.revisions.map(r=><div key={r.id} className="workflow-panel"><strong>Revision {r.revisionNumber} · {dateTime(r.submittedAt)}</strong><p>Base {money(r.baseFee)} · Travel {money(r.travelCost)} · Accommodation {money(r.accommodationCost)} · Report {money(r.reportFee)} · Urgency {money(r.urgencySurcharge)} · Total {money(r.consultantTotal)}</p>{r.coverLetter&&<p>{r.coverLetter}</p>}{r.decision&&<p>Admin: {r.decision.type.replaceAll("_"," ")} · {dateTime(r.decision.decidedAt)}{r.decision.consultantMessage?` — ${r.decision.consultantMessage}`:""}{r.decision.reason?` (${r.decision.reason})`:""}{r.decision.internalAdminNote?` · Internal: ${r.decision.internalAdminNote}`:""}</p>}</div>)}</details>
        {quote.internalStatus==="awaiting_review"&&<div className="workflow-quote-actions"><button type="button" className="workflow-secondary" disabled={busy} onClick={()=>choose(quote.id,"approved")}>Approve internally</button><button type="button" className="workflow-secondary" disabled={busy} onClick={()=>choose(quote.id,"revision_requested")}>Request revision</button><button type="button" className="workflow-secondary" disabled={busy} onClick={()=>choose(quote.id,"rejected")}>Reject</button></div>}
        {quote.internalStatus==="approved"&&<button type="button" className="workflow-secondary" disabled={busy} onClick={()=>choose(quote.id,"revision_requested")}>Request Another Revision</button>}
        {quote.reopenRequests?.map(r=><div key={r.id} className="workflow-panel"><strong>Negotiation reopened · {dateTime(r.decidedAt)}</strong><p>{r.consultantMessage}</p>{r.reason&&<p>Reason: {r.reason}</p>}{r.suggestedMaxAmount!=null&&<p>Suggested maximum: {r.suggestedMaxCurrency} {r.suggestedMaxAmount} (advisory)</p>}{r.internalAdminNote&&<p>Private Admin note: {r.internalAdminNote}</p>}</div>)}
        {editing?.quoteId===quote.id&&<QuotationDecisionForm key={`${quote.id}-${editing.decision}`} decision={editing.decision} busy={busy} onSubmit={form=>submit(form,quote)} onCancel={()=>setEditing(null)}/>}
        <button type="button" className="workflow-secondary" disabled={!selectable||busy} onClick={()=>onSelect(quote.id)}>{data.selectedQuotation?.id===quote.id?<><CheckCircle2 size={16}/> Selected</>:<>Select approved quote <ArrowRight size={16}/></>}</button>
      </article>; }):<div className="workflow-empty"><h3>No quotations submitted</h3><p>This workflow remains at Overview until a Consultant submits a quotation.</p></div>}</div></section>;
}
