import AdditionalPorts from "../components/requests/AdditionalPorts";
import { ArrowLeft, ExternalLink, MapPin, Ship } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import {
  completeWorkflowChecklist, completeWorkflowPreparation,
  confirmWorkflowReport, generateWorkflowDraft, getInspectionWorkflow, completeInspectionWorkflow,
  initializeInspectionWorkflow, removeWorkflowEvidence, reviewWorkflowReport,
  saveWorkflowChecklist, saveWorkflowPreparation, selectChecklistTemplate,
  selectWorkflowQuotation, updateInspectionWorkflowStage, uploadWorkflowEvidence,
  submitWorkflowInvoice, approveWorkflowInvoice, rejectWorkflowInvoice, payWorkflowInvoice,
  saveWorkflowProposalDraft, sendWorkflowProposal, supersedeWorkflowProposal,
} from "../api/inspectionWorkflowApi";
import WorkflowStageRail from "../components/workflow/WorkflowStageRail";
import DailyReportsPanel from "../components/workflow/DailyReportsPanel";
import { WORKFLOW_STAGES } from "../components/workflow/workflowStages";
import StageOverview from "../components/workflow/stages/StageOverview";
import StageQuote from "../components/workflow/stages/StageQuote";
import StageConfirm from "../components/workflow/stages/StageConfirm";
import StageSurveyor from "../components/workflow/stages/StageSurveyor";
import StagePreparation from "../components/workflow/stages/StagePreparation";
import StageChecklist from "../components/workflow/stages/StageChecklist";
import StageReport from "../components/workflow/stages/StageReport";
import StageReview from "../components/workflow/stages/StageReview";
import StageReportConfirmation from "../components/workflow/stages/StageReportConfirmation";
import StageCompleted from "../components/workflow/stages/StageCompleted";
import StageInvoice from "../components/workflow/stages/StageInvoice";
import { date } from "../components/workflow/stages/formatters";
import { decideQuotation } from "../api/quotationApi";
import "./InspectionWorkflow.css";

export default function InspectionWorkflowWorkspace(){
  const {requestId}=useParams();
  const [data,setData]=useState(null),[viewedStage,setViewedStage]=useState("overview"),[loading,setLoading]=useState(true),[busy,setBusy]=useState(false),[error,setError]=useState("");
  const load=useCallback(async()=>{setLoading(true);setError("");try{let response=await getInspectionWorkflow(requestId);if(!response.data.workflow)response=await initializeInspectionWorkflow(requestId);setData(response.data);setViewedStage(response.data.workflow.currentStage);}catch(e){setError(e.response?.data?.message||"Unable to load this inspection workflow.");}finally{setLoading(false);}},[requestId]);
  useEffect(()=>{const timer=window.setTimeout(load,0);return()=>window.clearTimeout(timer);},[load]);
  const perform=async(action,{stay}={})=>{setBusy(true);setError("");try{const response=await action();setData(response.data);setViewedStage(stay||response.data.workflow.currentStage);}catch(e){const details=e.response?.data?.fieldErrors?.map((item)=>item.message||item.label).filter(Boolean).join(" ");setError([e.response?.data?.message||e.message||"Unable to update this workflow.",details].filter(Boolean).join(" "));if(["CREATE_AMENDMENT_REQUIRED","STALE_AMENDMENT"].includes(e.response?.data?.code)){try{const latest=await getInspectionWorkflow(requestId);setData(latest.data);setViewedStage("confirm");}catch{/* The saved draft remains available after reload. */}}}finally{setBusy(false);}};
  const recordQuotationDecision = async (quotationId,payload) => {
    setBusy(true); setError("");
    try {
      const decision = await decideQuotation(quotationId,payload);
      if (decision.success === false) throw new Error(decision.message || "Decision could not be saved.");
      try { const response = await getInspectionWorkflow(requestId); setData(response.data); setViewedStage("quote"); }
      catch { setError("Decision saved. The workflow could not be refreshed; reload before making another decision."); }
    } catch (failure) { setError(failure.response?.data?.message || failure.message || "Decision could not be saved."); throw failure; }
    finally { setBusy(false); }
  };
  if(loading)return <main className="workflow-page"><div className="workflow-loading">Loading inspection workspace…</div></main>;
  if(!data)return <main className="workflow-page"><Link className="back-link" to="/admin/inspection-workflows"><ArrowLeft size={15}/> Inspection Workflow</Link><div className="workflow-alert error">{error}</div></main>;
  const stageProps={data,busy};
  const canViewNext=(data.workflow.currentStage==="report_confirmation"&&data.report?.confirmedAt)||(data.workflow.currentStage==="inspection_completed"&&data.inspectionCompletion?.completed)||["invoice_submitted","invoice_approved"].includes(data.workflow.currentStage);
  const lifecycleLabel=data.workflow.currentStage==="invoice_paid"?"Paid":data.invoice?.status==="rejected"?"Invoice Correction Required":data.workflow.currentStage==="invoice_approved"?"Invoice Approved — Payment Pending":data.workflow.currentStage==="invoice_submitted"?"Invoice Submitted — Approval Pending":data.workflow.currentStage==="review"?"Report Review":data.workflow.currentStage.replaceAll("_"," ");
  const executionStarted=WORKFLOW_STAGES.findIndex(([stage])=>stage===data.workflow.currentStage)>=WORKFLOW_STAGES.findIndex(([stage])=>stage==="preparation");
  return <main className="workflow-page inspection-workspace-page"><Link className="back-link" to="/admin/inspection-workflows"><ArrowLeft size={15}/> Inspection Workflow</Link><header className="workspace-head"><div className="workspace-title"><span className="workspace-reference">Request #{data.request.id}</span><h1>{data.request.reference}</h1><div className="workspace-meta"><span><Ship size={15}/>{data.request.vessel.name||"Vessel not provided"}</span><span><MapPin size={15}/>{data.request.port.name||"Port not provided"}{data.request.port.country ? ", " + data.request.port.country : ""}</span><span>Required {date(data.request.requiredBy)}</span><AdditionalPorts ports={data.request.ports}/></div></div><div className="workspace-head-actions"><span className="workflow-stage-chip">{lifecycleLabel}</span><Link className="workspace-request-link" to={`/requests/${data.request.id}`}>View Request <ExternalLink size={14}/></Link></div></header>{error&&<div className="workflow-alert error" role="alert">{error}</div>}{executionStarted&&<DailyReportsPanel requestId={requestId}/>}<div className="workspace-layout"><WorkflowStageRail currentStage={data.workflow.currentStage} viewedStage={viewedStage} onView={setViewedStage} canViewNext={canViewNext}/><div className="workspace-stage">
    {viewedStage==="overview"&&<StageOverview {...stageProps} onAdvance={()=>data.workflow.currentStage==="overview"?perform(()=>updateInspectionWorkflowStage(requestId,{stage:"quote"})):setViewedStage("quote")}/>}
    {viewedStage==="quote"&&<StageQuote {...stageProps} onSelect={(quotationId)=>perform(()=>selectWorkflowQuotation(requestId,{quotationId}))} onDecision={recordQuotationDecision}/>}
    {viewedStage==="confirm"&&<StageConfirm key={`${data.selectedQuotation?.id || "none"}-${data.proposal?.id || "new"}-${data.proposal?.updatedAt || ""}-${data.proposals?.find((item)=>item.status==="draft")?.updatedAt || ""}`}
      {...stageProps}
      onSendProposal={(form)=>perform(async()=>{const draft=await saveWorkflowProposalDraft(requestId,form);await sendWorkflowProposal(requestId,{proposalId:draft.data.id});return getInspectionWorkflow(requestId);},{stay:"confirm"})}
      onSaveDraft={(form)=>perform(async()=>{await saveWorkflowProposalDraft(requestId,form);return getInspectionWorkflow(requestId);},{stay:"confirm"})}
      onSupersedeProposal={(proposalId)=>perform(async()=>{await supersedeWorkflowProposal(requestId,{proposalId});return getInspectionWorkflow(requestId);},{stay:"confirm"})}
      onSelectOtherQuote={()=>setViewedStage("quote")}
      onAdvanceToSurveyor={()=>setViewedStage("surveyor")}
    />}
    {viewedStage==="surveyor"&&<StageSurveyor {...stageProps} onAdvance={()=>perform(()=>updateInspectionWorkflowStage(requestId,{stage:"preparation"}))}/>}
    {viewedStage==="preparation"&&<StagePreparation {...stageProps} onSave={(form)=>perform(()=>saveWorkflowPreparation(requestId,form),{stay:"preparation"})} onComplete={(form)=>perform(()=>completeWorkflowPreparation(requestId,form))}/>}
    {viewedStage==="checklist"&&<StageChecklist {...stageProps} onSelectTemplate={(templateId)=>perform(()=>selectChecklistTemplate(requestId,templateId),{stay:"checklist"})} onSave={(values)=>perform(()=>saveWorkflowChecklist(requestId,values),{stay:"checklist"})} onComplete={(values)=>perform(async()=>{await saveWorkflowChecklist(requestId,values);return completeWorkflowChecklist(requestId);})} onUploadEvidence={(fieldKey,file,caption)=>perform(()=>uploadWorkflowEvidence(requestId,{fieldKey,file,caption}),{stay:"checklist"})} onRemoveEvidence={(evidenceId)=>perform(()=>removeWorkflowEvidence(requestId,evidenceId),{stay:"checklist"})}/>}
    {viewedStage==="report"&&<StageReport {...stageProps} onGenerate={()=>perform(()=>generateWorkflowDraft(requestId),{stay:"report"})} onReview={()=>perform(()=>reviewWorkflowReport(requestId,"open"))}/>}
    {viewedStage==="review"&&<StageReview {...stageProps} onAction={(action)=>perform(()=>reviewWorkflowReport(requestId,action))}/>}
    {viewedStage==="report_confirmation"&&<StageReportConfirmation {...stageProps} onConfirm={()=>perform(()=>confirmWorkflowReport(requestId),{stay:"report_confirmation"})} onContinue={()=>setViewedStage("inspection_completed")}/>}
    {viewedStage==="inspection_completed"&&<StageCompleted {...stageProps} onComplete={()=>perform(()=>completeInspectionWorkflow(requestId))} onContinue={()=>setViewedStage("invoice_submitted")}/>}
    {["invoice_submitted","invoice_approved","invoice_paid"].includes(viewedStage)&&<StageInvoice key={`${viewedStage}-${data.workflow.currentStage}-${data.invoice?.status||"none"}`} {...stageProps} mode={viewedStage} onSubmit={(form)=>perform(()=>submitWorkflowInvoice(requestId,form))} onApprove={()=>perform(()=>approveWorkflowInvoice(requestId))} onReject={(form)=>perform(()=>rejectWorkflowInvoice(requestId,form),{stay:"invoice_approved"})} onPay={(payment)=>perform(()=>payWorkflowInvoice(requestId,payment))} onViewStage={setViewedStage}/>}
  </div></div></main>;
}
