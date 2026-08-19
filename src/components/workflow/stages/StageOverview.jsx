import { ArrowRight, CircleAlert } from "lucide-react";
import { DataRow } from "./StageData";
import { date, money } from "./formatters";

export default function StageOverview({data,onAdvance,busy}) { const {request,client,counts}=data; const canAdvance=counts.quotationsAwaitingReview>0; const attention=canAdvance?`${counts.quotationsAwaitingReview} quotation${counts.quotationsAwaitingReview===1?"":"s"} awaiting review`:"No quotations awaiting review";
  return <section className="workflow-stage"><header className="stage-heading"><div><span>Stage 01</span><h2>Approved request overview</h2><p>Operational details finalized through Admin moderation.</p></div><strong className={`attention-pill ${canAdvance?"active":""}`}>{attention}</strong></header>
    <div className="stage-grid"><article className="workflow-panel"><h3>Request</h3><DataRow label="Client" value={client.name}/><DataRow label="Service" value={request.service}/><DataRow label="Required date" value={date(request.requiredBy)}/><DataRow label="Request status" value={request.status}/><DataRow label="Moderation status" value={request.moderationStatus}/><DataRow label="Approved budget" value={money(request.approvedBudgetUsd)}/></article>
    <article className="workflow-panel"><h3>Vessel &amp; port</h3><DataRow label="Vessel name" value={request.vessel.name}/><DataRow label="IMO" value={request.vessel.imoNumber}/><DataRow label="Vessel type" value={request.vessel.type}/><DataRow label="Flag" value={request.vessel.flag}/><DataRow label="Port" value={request.port.name}/><DataRow label="Country" value={request.port.country}/></article></div>
    <article className="workflow-panel scope-panel"><h3>Scope</h3><p>{request.scope||"Not provided"}</p></article>
    <footer className="stage-action-row"><div>{!canAdvance&&<span className="stage-blocked"><CircleAlert size={17}/>A submitted quotation is required before this workflow can continue.</span>}</div><button className="workflow-primary" disabled={!canAdvance||busy} onClick={onAdvance}>Review Quotations <ArrowRight size={16}/></button></footer>
  </section>;
}
