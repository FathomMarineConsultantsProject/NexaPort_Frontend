import AdditionalPorts from "../../requests/AdditionalPorts";
import { canReviewQuotations } from "../workflowEligibility.js";
import AgentDetails from "../../requests/AgentDetails";
import { ArrowRight, CircleAlert } from "lucide-react";
import { DataRow } from "./StageData";
import { date, money } from "./formatters";
import WorkflowScope from "../WorkflowScope";

export default function StageOverview({data,onAdvance,busy}) { const {request,client,counts}=data; const canAdvance=Boolean(data.workflow?.currentStage && data.workflow.currentStage!=="overview") || canReviewQuotations(data.quotations); const attention=counts.quotationsAwaitingReview>0?`${counts.quotationsAwaitingReview} quotation${counts.quotationsAwaitingReview===1?"":"s"} awaiting review`:"No quotations awaiting review";
  return <section className="workflow-stage overview-stage"><header className="stage-heading"><div><span>Stage 01</span><h2>Approved request overview</h2><p>Confirm the approved request, vessel and scope before reviewing consultant quotations.</p></div><strong className={`attention-pill ${canAdvance?"active":""}`}>{attention}</strong></header>
    <div className="stage-grid"><article className="workflow-panel"><h3>Request</h3><DataRow label={client.companyVerified ? "Company" : "Legacy requester"} value={client.name}/><DataRow label="Services Required" value={request.service}/><DataRow label="Vertical" value={request.inspectionVertical}/><DataRow label="Required date" value={date(request.requiredBy)}/><DataRow label="Request status" value={request.status}/><DataRow label="Moderation status" value={request.moderationStatus}/><DataRow label="Approved budget" value={money(request.approvedBudgetUsd)}/></article>
    <article className="workflow-panel"><h3>Vessel &amp; port</h3><DataRow label="Vessel name" value={request.vessel.name}/><DataRow label="IMO" value={request.vessel.imoNumber}/><DataRow label="Vessel type" value={request.vessel.type}/><DataRow label="Flag" value={request.vessel.flag}/><DataRow label="Port" value={request.port.name}/><AdditionalPorts ports={request.ports}/><DataRow label="Terminal" value={request.terminalName}/><DataRow label="ETA" value={date(request.port.eta)}/>{request.port.country&&<DataRow label="Country (historical / port record)" value={request.port.country}/>}</article></div>
    <AgentDetails value={request.agentDetails}/>
    <article className="workflow-panel scope-panel"><h3>Scope of Work</h3><WorkflowScope value={request.scope}/></article>
    <footer className="stage-action-row"><div>{!canAdvance&&<span className="stage-blocked"><CircleAlert size={17}/>A submitted quotation is required before this workflow can continue.</span>}</div><button className="workflow-primary" disabled={!canAdvance||busy} onClick={onAdvance}>Review Quotations <ArrowRight size={16}/></button></footer>
  </section>;
}
