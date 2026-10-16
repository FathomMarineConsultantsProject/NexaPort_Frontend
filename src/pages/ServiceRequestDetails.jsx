import AdditionalPorts from "../components/requests/AdditionalPorts";
import { requestPortPayload } from "../components/requests/requestPortState.js";
import ScopeEditor from "../components/requests/ScopeEditor";
import ScopeText from "../components/requests/ScopeText";
import PortSelect from "../components/requests/PortSelect";
import VesselIdentityFields from "../components/requests/VesselIdentityFields";
import ScopeAssistant from "../components/requests/ScopeAssistant";
import AgentDetails, { AgentDetailsFields } from "../components/requests/AgentDetails";
import {
  AlertTriangle,
  Award,
  Briefcase,
  CalendarDays,
  CheckCircle2,
  DollarSign,
  Edit3,
  Flag,
  MapPin,
  Ship,
  Route as RouteIcon,
  Star,
  XCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { createQuotation, getQuotations, getQuotationNegotiation, submitQuotationRevision } from "../api/quotationApi";
import { createExpertReview } from "../api/reviewApi";
import {
  approveServiceRequest,
  getServiceRequestById,
  rejectServiceRequest,
  updateServiceRequest,
} from "../api/serviceRequestApi";
import { approveProposal, rejectProposal } from "../api/commercialProposalApi";
import { getServiceRequestDropdowns } from "../api/masterApi";
import InspectionCatalogueSelect from "../components/requests/InspectionCatalogueSelect";
import CopyRequestLink from "../components/requests/CopyRequestLink";
import { getStoredUser, isClient, isExpert, isSuperAdmin } from "../utils/auth";
import { displayCase, normalizeNarrative } from "../utils/requestPresentation";
import { getRequestEditPermission } from "../utils/serviceRequestEditPermission";
import { formatBudget, marketplaceBudget, submittedBudget } from "../utils/requestRegister";
import "./ServiceRequestDetails.css";
import { useNavigate, useParams } from "react-router-dom";

/* ────────────────────────────────────────────
   Narrative block — rich text renderer
──────────────────────────────────────────── */

function Narrative({ title, text }) {
  const blocks = String(text || "").trim().split(/\n\s*\n/).filter(Boolean);
  if (!blocks.length) return null;
  return <section className="request-narrative"><h2>{title}</h2><div>{blocks.map((block, index) => {
    const lines = block.split(/\n/).map((line) => line.trim()).filter(Boolean);
    const listed = lines.length > 1 && lines.every((line) => /^(?:[-*•]|\d+[.)])\s+/.test(line));
    return listed ? <ul key={index}>{lines.map((line) => <li key={line}><ScopeText value={line.replace(/^(?:[-*•]|\d+[.)])\s+/, "")} /></li>)}</ul> : <p key={index}><ScopeText value={lines.join("\n")} /></p>;
  })}</div></section>;
}

/* ────────────────────────────────────────────
   Info — always renders, never suppresses rows
──────────────────────────────────────────── */

function Info({ label, value, icon }) {
  const empty = value === null || value === undefined || String(value).trim() === "" || value === "-";
  return (
    <div className="info-row">
      <span>{label}</span>
      <strong className={empty ? "info-empty" : ""}>
        {icon}
        {empty ? "Not provided" : value}
      </strong>
    </div>
  );
}

/* ────────────────────────────────────────────
   Budget Preview Helper
──────────────────────────────────────────── */

function calcApprovedPreview(clientBudget, adjType, adjMode, adjValue) {
  if (clientBudget == null || adjType === "none" || adjMode === "none") return clientBudget;
  const base = Number(clientBudget);
  const val = Number(adjValue || 0);
  if (!Number.isFinite(base) || !Number.isFinite(val)) return clientBudget;
  let delta = adjType === "percentage" ? base * (val / 100) : val;
  const approved = adjMode === "markup" ? base + delta : base - delta;
  return Math.max(0, Math.round(approved * 100) / 100);
}

/* ────────────────────────────────────────────
   MAIN COMPONENT
──────────────────────────────────────────── */

export default function ServiceRequestDetails({ requestId }) {
  const params = useParams();
  const id = requestId || params.id;
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [ownNegotiations, setOwnNegotiations] = useState({});
  const [revisingQuoteId, setRevisingQuoteId] = useState(null);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const [inspectionVerticals, setInspectionVerticals] = useState([]);

  // Admin review state
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [editFieldErrors, setEditFieldErrors] = useState({});
  const [approving, setApproving] = useState(false);
  const [approvalErrors, setApprovalErrors] = useState([]);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

  // Client proposal decision state
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showDeclineModal, setShowDeclineModal] = useState(false);
  const [declineReason, setDeclineReason] = useState("");
  const [decidingProposal, setDecidingProposal] = useState(false);
  const dialogRef = useRef(null);

  // Budget adjustment state
  const [budgetAdj, setBudgetAdj] = useState({
    mode: "none",
    type: "none",
    value: "",
    explicitApproved: "",
  });

  const [reviewQuoteId, setReviewQuoteId] = useState(null);
  const [reviewForm, setReviewForm] = useState({
    rating: 0,
    comment: "",
    reviewer_name: "",
  });

  const [quoteForm, setQuoteForm] = useState({
    totalQuoteUsd: "",
    attendanceDays: "",
    travelCost: "",
    accommodationCost: "",
    reportFee: "",
    urgencySurcharge: "",
    coverLetter: "",
  });

  const loadPage = useCallback(async () => {
    setLoading(true);

    try {
      const requestRes = await getServiceRequestById(id);
      if (isExpert()) {
        const quotationRes = await getQuotations({ serviceRequestId: id });
        const own = quotationRes.data || [];
        const details = await Promise.all(own.map(q => getQuotationNegotiation(q.id)));
        setOwnNegotiations(Object.fromEntries(details.map((item,index)=>[own[index].id,item.data])));
        setRequest({ ...requestRes.data, _ownQuotations: own });
      } else {
        setRequest(requestRes.data);
      }
    } catch (error) {
      console.error("Failed to load request:", error);
      setRequest(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    const timer=window.setTimeout(loadPage,0);
    return ()=>window.clearTimeout(timer);
  }, [loadPage]);

  useEffect(() => {
    getServiceRequestDropdowns()
      .then((response) => setInspectionVerticals(response.data?.inspectionVerticals || []))
      .catch((error) => console.error("Failed to load inspection catalogue:", error));
  }, []);

  useEffect(() => {
    if (!showRejectModal && !showApproveModal && !showDeclineModal) return undefined;
    const previousFocus = document.activeElement;
    const frame = window.requestAnimationFrame(() => dialogRef.current?.querySelector("textarea:not(:disabled), button:not(:disabled)")?.focus());
    const handleDialogKeyDown = (event) => {
      if (event.key === "Escape" && !rejecting && !decidingProposal) {
        setShowRejectModal(false);
        setShowApproveModal(false);
        setShowDeclineModal(false);
      }
      if (event.key !== "Tab") return;
      const focusable = [...(dialogRef.current?.querySelectorAll("button:not(:disabled), textarea:not(:disabled), input:not(:disabled)") || [])];
      if (!focusable.length) return;
      const first = focusable[0];
      const last = focusable.at(-1);
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
    };
    document.addEventListener("keydown", handleDialogKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      document.removeEventListener("keydown", handleDialogKeyDown);
      previousFocus?.focus?.();
    };
  }, [showRejectModal, showApproveModal, showDeclineModal, rejecting, decidingProposal]);

  const formatDate = (date) => {
    if (!date) return "Not provided";

    return new Date(date).toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  };

  const formatDateTime = (date) => {
    if (!date) return "Not provided";
    const d = new Date(date);
    const datePart = d.toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    const timePart = d.toLocaleTimeString("en-GB", {
      hour: "2-digit",
      minute: "2-digit",
    });
    return `${datePart},\u00A0${timePart}`;
  };

  const money = (value) => {
    const num = Number(value);
    if (!Number.isFinite(num)) return "0";
    return num.toLocaleString();
  };

  /* ────── Client Proposal decision handlers ────── */

  const handleApproveProposal = async () => {
    const proposalId = request?.proposal?.id || request?.activeProposalId;
    if (!proposalId) return;
    setDecidingProposal(true);
    try {
      await approveProposal(id, { proposalId });
      setToast(request?.proposal?.amendsProposalId ? "Amendment approved. Updated terms are now in effect; your Consultant assignment is preserved." : "Commercial proposal approved successfully! Consultant assignment confirmed.");
      setShowApproveModal(false);
      loadPage();
      setTimeout(() => setToast(""), 4000);
    } catch (error) {
      console.error("Failed to approve proposal:", error);
      setToast(error.response?.data?.message || "Failed to approve proposal.");
      setTimeout(() => setToast(""), 4000);
    } finally {
      setDecidingProposal(false);
    }
  };

  const handleDeclineProposal = async (e) => {
    e?.preventDefault();
    const proposalId = request?.proposal?.id || request?.activeProposalId;
    if (!proposalId || !declineReason.trim()) return;
    setDecidingProposal(true);
    try {
      await rejectProposal(id, { proposalId, rejectionReason: declineReason.trim() });
      setToast("Proposal declined. Admin has been notified.");
      setShowDeclineModal(false);
      setDeclineReason("");
      loadPage();
      setTimeout(() => setToast(""), 4000);
    } catch (error) {
      console.error("Failed to decline proposal:", error);
      setToast(error.response?.data?.message || "Failed to decline proposal.");
      setTimeout(() => setToast(""), 4000);
    } finally {
      setDecidingProposal(false);
    }
  };

  /* ────── Quote handlers ────── */

  const submitQuotation = async (e) => {
    e.preventDefault();

    try {
      await createQuotation({
        serviceRequestId: Number(id),
        totalQuoteUsd: Number(quoteForm.totalQuoteUsd),
        attendanceDays: quoteForm.attendanceDays ? Number(quoteForm.attendanceDays) : null,
        travelCost: Number(quoteForm.travelCost || 0),
        accommodationCost: Number(quoteForm.accommodationCost || 0),
        reportFee: Number(quoteForm.reportFee || 0),
        urgencySurcharge: Number(quoteForm.urgencySurcharge || 0),
        coverLetter: quoteForm.coverLetter,
      });

      setToast("Quotation submitted successfully.");
      loadPage();
      setTimeout(() => setToast(""), 3000);
    } catch (error) {
      console.error("Failed to submit quotation:", error);
      setToast(error.response?.data?.message || "Failed to submit quotation.");
      setTimeout(() => setToast(""), 3000);
    }
  };

  const startRevision = (quote, latest) => {
    setQuoteForm({totalQuoteUsd:String(latest.baseFee),attendanceDays:latest.attendanceDays==null?"":String(latest.attendanceDays),travelCost:String(latest.travelCost),accommodationCost:String(latest.accommodationCost),reportFee:String(latest.reportFee),urgencySurcharge:String(latest.urgencySurcharge),coverLetter:latest.coverLetter||""});
    setRevisingQuoteId(quote.id);
  };
  const submitRevision = async (event, negotiation) => {
    event.preventDefault();
    try {
      await submitQuotationRevision(negotiation.id,{expectedRevisionId:negotiation.latestRevisionId,totalQuoteUsd:quoteForm.totalQuoteUsd,attendanceDays:quoteForm.attendanceDays||null,travelCost:quoteForm.travelCost||0,accommodationCost:quoteForm.accommodationCost||0,reportFee:quoteForm.reportFee||0,urgencySurcharge:quoteForm.urgencySurcharge||0,coverLetter:quoteForm.coverLetter});
      setRevisingQuoteId(null);setToast("Revised quotation submitted for Admin review.");await loadPage();
    } catch(error) { setToast(error.response?.data?.message||"Unable to submit revision."); }
  };

  /* ────── Admin moderation handlers ────── */

  const beginEdit = () => {
    setEditFieldErrors({});
    if (!request) return;
    setEditForm({
      serviceType: request.serviceType || "",
      inspectionMethodId: request.inspectionMethodId || "",
      inspectionVertical: request.inspectionVertical || request.serviceCategory || "",
      serviceCategory: request.serviceCategory || "",
      serviceTypeOther: request.serviceTypeOther || "",
      title: request.title || "",
      scopeOfWork: request.scopeOfWork || "",
      urgency: request.urgency || "routine",
      budgetUsd: submittedBudget(request) ?? "",
      requiredBy: request.requiredBy ? String(request.requiredBy).slice(0, 10) : "",
      vesselName: request.vessel?.name || "",
      imoNumber: request.vessel?.imoNumber || "",
      vesselType: request.vessel?.type || "",
      flagState: request.vessel?.flagState || "",
      portName: request.port?.name || "",
      portId: request.port?.id || null,
      ports: request.ports || [],
      originalPortSchedule: { terminalName: request.terminalName || "", eta: request.port?.eta || "" },
      terminalName: request.terminalName || "",
      agentCompanyName: isClient() ? "" : request.agentDetails?.companyName || "",
      agentContactName: isClient() ? "" : request.agentDetails?.contactName || "",
      agentEmail: isClient() ? "" : request.agentDetails?.email || "",
      agentPhone: isClient() ? "" : request.agentDetails?.phone || "",

      eta: request.port?.eta ? String(request.port.eta).slice(0, 10) : "",

    });
    setBudgetAdj({
      mode: request.adminBudgetAdjustmentMode || "none",
      type: request.adminBudgetAdjustmentType || "none",
      value: request.adminBudgetAdjustmentValue || "",
      explicitApproved: "",
    });
    setEditing(true);
    setApprovalErrors([]);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditForm({});
    setApprovalErrors([]);
  };

  const saveEdit = async () => {
    const serviceTypeOther = String(editForm.serviceTypeOther || "").trim();
    if (editForm.serviceType === "Other") {
      if (!serviceTypeOther || serviceTypeOther.length < 3 || serviceTypeOther.length > 500) {
        setToast("Please describe the required service.");
        setTimeout(() => setToast(""), 4000);
        return;
      }
    } else if (!editForm.inspectionMethodId) {
      setToast("Select a service.");
      setTimeout(() => setToast(""), 4000);
      return;
    }

    setEditSaving(true);
    try {
      const payload = {
        ...editForm,
        ...requestPortPayload(editForm),
        inspectionMethodId: editForm.serviceType === "Other" ? null : Number(editForm.inspectionMethodId),
        serviceCategory: editForm.serviceType === "Other" ? "Other" : editForm.serviceCategory,
        serviceTypeOther: editForm.serviceType === "Other" ? serviceTypeOther : null,
      };

      if (isSuperAdmin()) {
        if (budgetAdj.mode !== "none" && budgetAdj.type !== "none") {
          payload.adminBudgetAdjustmentMode = budgetAdj.mode;
          payload.adminBudgetAdjustmentType = budgetAdj.type;
          payload.adminBudgetAdjustmentValue = Number(budgetAdj.value || 0);
        } else {
          payload.adminBudgetAdjustmentMode = "none";
          payload.adminBudgetAdjustmentType = "none";
          payload.adminBudgetAdjustmentValue = 0;
        }
        if (budgetAdj.explicitApproved !== "" && submittedBudget(request) == null) {
          payload.approvedBudgetUsd = Number(budgetAdj.explicitApproved);
        }
      }

      const response = await updateServiceRequest(request.id, payload);
      setToast("Request updated successfully.");
      setEditing(false);
      setRequest(response.data);
      setApprovalErrors([]);
      setTimeout(() => setToast(""), 3000);
    } catch (error) {
      setEditFieldErrors(error.response?.data?.field_errors || {});
      setToast(error.response?.data?.message || "Failed to update request.");
      setTimeout(() => setToast(""), 4000);
    } finally {
      setEditSaving(false);
    }
  };

  const handleApprove = async () => {
    if (!window.confirm("Approve this request and notify all active Consultants?")) return;
    setApproving(true);
    setApprovalErrors([]);
    try {
      const response = await approveServiceRequest(request.id);
      setToast("Request approved. Eligible Consultants were notified.");
      setRequest(response.data);
      setTimeout(() => setToast(""), 3000);
    } catch (error) {
      const data = error.response?.data;
      if (data?.missingFields) {
        setApprovalErrors(data.missingFields);
        setToast("Approval blocked — required details are missing.");
      } else {
        setToast(data?.message || "Approval failed.");
      }
      setTimeout(() => setToast(""), 5000);
    } finally {
      setApproving(false);
    }
  };

  const handleReject = async () => {
    const reason = rejectionReason.trim();
    if (!reason) return;
    setRejecting(true);
    try {
      const response = await rejectServiceRequest(request.id, { rejectionReason: reason });
      setToast("Request rejected.");
      setRequest(response.data);
      setShowRejectModal(false);
      setRejectionReason("");
      setTimeout(() => setToast(""), 3000);
    } catch (error) {
      setToast(error.response?.data?.message || "Rejection failed.");
      setTimeout(() => setToast(""), 4000);
    } finally {
      setRejecting(false);
    }
  };

  /* ────── Review handlers ────── */

  if (loading) {
    return <main className="request-details-page"><div className="request-detail-feedback" role="status">Loading request…</div></main>;
  }

  const submitReview = async (quote) => {
    try {
      const expertId = quote.expertId || quote.expert_id;
      const rating = Number(reviewForm.rating);

      if (!expertId) {
        setToast("Expert ID missing for this accepted quote.");
        setTimeout(() => setToast(""), 3000);
        return;
      }

      if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
        setToast("Select a rating from 1 to 5.");
        setTimeout(() => setToast(""), 3000);
        return;
      }

      await createExpertReview(expertId, {
        serviceRequestId: Number(request.id || id),
        job_name: request.title,
        rating,
        comment: reviewForm.comment,
        reviewer_name:
          reviewForm.reviewer_name ||
          currentUser?.full_name ||
          currentUser?.username ||
          "Client",
      });

      setToast("Review submitted successfully.");
      setReviewQuoteId(null);
      setReviewForm({
        rating: 0,
        comment: "",
        reviewer_name: "",
      });

      setTimeout(() => setToast(""), 3000);
    } catch (error) {
      console.error("Failed to submit review:", error);
      setToast(error.response?.data?.message || "Failed to submit review.");
      setTimeout(() => setToast(""), 3000);
    }
  };

  const cancelReview = () => {
    setReviewQuoteId(null);
    setReviewForm({
      rating: 0,
      comment: "",
      reviewer_name: "",
    });
  };

  if (!request) {
    return <main className="request-details-page"><div className="request-detail-feedback" role="alert"><strong>Request unavailable</strong><span>Check the request link or return to the register.</span><button type="button" onClick={() => navigate("/requests")}>Open request register</button></div></main>;
  }

  /* ────── Consultant View (unchanged) ────── */

  if (isExpert()) {
    const ownQuotes = request._ownQuotations || [];
    return <main className="request-details-page consultant-request-detail">
      <header className="request-details-head consultant-detail-head"><div className="request-head-info"><span className="request-identifier">Request #{request.id || id}</span><h1>Inspection opportunity</h1><p className="consultant-detail-head__intro">Review the service, location and approved budget before quoting.</p></div></header>
      <section className="details-card consultant-safe-detail-grid">
        <div><span>Services Required</span><strong>{request.inspectionType || request.serviceType || "Not provided"}</strong></div>
        {request.serviceType === "Other"
          ? <div><span>Service Details</span><strong>{request.serviceTypeOther || "Not provided"}</strong></div>
          : <div><span>Vertical</span><strong>{request.inspectionVertical || "Not provided"}</strong></div>}
        <div><span>Ship Type</span><strong>{request.vesselType || "Not provided"}</strong></div>
        <div><span>Date of Inspection</span><strong>{request.inspectionDate ? formatDate(request.inspectionDate) : "Not provided"}</strong></div>
        <div><span>Port of Inspection</span><strong>{request.portOfInspection || "Not provided"}</strong><AdditionalPorts ports={request.ports}/></div>
        {request.terminalName && <div><span>Terminal</span><strong>{request.terminalName}</strong></div>}
        {request.agentDetails?.contactName && <div><span>Port agent contact</span><strong>{request.agentDetails.contactName}</strong></div>}
        {request.approvedBudgetUsd != null && <div><span>Budget</span><strong>${money(request.approvedBudgetUsd)}</strong></div>}
      </section>
      <section className="consultant-quote-section">
        <div className="quotation-head"><h2>Your Quotation</h2>{!ownQuotes.length && <button className="submit-quote-toggle" onClick={() => setShowQuoteForm(!showQuoteForm)}><Briefcase size={17}/> Submit Quotation</button>}</div>
        {ownQuotes.map((quote) => {const negotiation=ownNegotiations[quote.id],latest=negotiation?.revisions.at(-1);return <article className="quotation-card" key={quote.id}><div className="quotation-top"><div><h3>Your quotation · Revision {latest?.revisionNumber||1}</h3><p>{formatDateTime(latest?.submittedAt||quote.createdAt)}</p></div><div className="quotation-price"><strong>${money(latest?.consultantTotal??quote.totalQuoteUsd)}</strong><span className={`quote-status ${quote.status}`}>{quote.status==="accepted"?"Client accepted / assigned":negotiation?.internalStatus==="approved"?"Commercially approved":negotiation?.internalStatus?.replaceAll("_"," ")||quote.status}</span></div></div>
          {negotiation?.revisions.map(r=><div key={r.id} className="workflow-panel"><strong>Revision {r.revisionNumber} · {formatDateTime(r.submittedAt)}</strong><p>Base ${money(r.baseFee)} · Travel ${money(r.travelCost)} · Accommodation ${money(r.accommodationCost)} · Report ${money(r.reportFee)} · Urgency ${money(r.urgencySurcharge)} · Total ${money(r.consultantTotal)}</p>{r.coverLetter&&<p>{r.coverLetter}</p>}{r.decision&&<p>Admin {r.decision.type.replaceAll("_"," ")} · {formatDateTime(r.decision.decidedAt)}{r.decision.consultantMessage&&<><br/>{r.decision.consultantMessage}</>}{r.decision.reason&&<><br/>Reason: {r.decision.reason}</>}{r.decision.suggestedMaxAmount!=null&&<><br/>Suggested maximum: {r.decision.suggestedMaxCurrency} {r.decision.suggestedMaxAmount} (advisory)</>}</p>}</div>)}
          {negotiation?.reopenRequests?.map(r=><div key={r.id} className="workflow-panel"><strong>Another revision requested · {formatDateTime(r.decidedAt)}</strong><p>{r.consultantMessage}</p>{r.reason&&<p>Reason: {r.reason}</p>}{r.suggestedMaxAmount!=null&&<p>Suggested maximum: {r.suggestedMaxCurrency} {r.suggestedMaxAmount} (advisory)</p>}</div>)}
          {negotiation?.internalStatus==="revision_requested"&&latest&&<button type="button" className="primary-btn" onClick={()=>startRevision(quote,latest)}>Revise Quotation</button>}
          {revisingQuoteId===quote.id&&<form className="quote-form-card" onSubmit={e=>submitRevision(e,negotiation)}><h3>Submit revision {latest.revisionNumber+1}</h3><div className="quote-two-grid">{[["totalQuoteUsd","Professional / base fee (USD)"],["attendanceDays","Attendance days"],["travelCost","Travel"],["accommodationCost","Accommodation"],["reportFee","Report fee"],["urgencySurcharge","Urgency surcharge"]].map(([field,label])=><label key={field}>{label}<input type="number" step={field==="attendanceDays"?"1":"0.01"} min={field==="totalQuoteUsd"?"0.01":"0"} required={field==="totalQuoteUsd"} value={quoteForm[field]} onChange={e=>setQuoteForm({...quoteForm,[field]:e.target.value})}/></label>)}</div><label>Cover letter<textarea value={quoteForm.coverLetter} onChange={e=>setQuoteForm({...quoteForm,coverLetter:e.target.value})}/></label><button className="primary-btn">Submit new revision</button><button type="button" className="secondary-btn" onClick={()=>setRevisingQuoteId(null)}>Cancel</button></form>}
        </article>})}
        {showQuoteForm && !ownQuotes.length && <form className="quote-form-card" onSubmit={submitQuotation}><h3>Submit Quotation</h3><div className="quote-two-grid">
          {[["totalQuoteUsd","Total Quotation (USD)"],["attendanceDays","Attendance Days"],["travelCost","Travel Cost"],["accommodationCost","Accommodation"],["reportFee","Report Fee"],["urgencySurcharge","Urgency Surcharge"]].map(([field,label]) => <label key={field}>{label}<input type="number" min="0" required={field === "totalQuoteUsd"} value={quoteForm[field]} onChange={(event) => setQuoteForm({...quoteForm,[field]:event.target.value})}/></label>)}
        </div><label>Cover Letter / Notes<textarea value={quoteForm.coverLetter} onChange={(event) => setQuoteForm({...quoteForm,coverLetter:event.target.value})}/></label><div className="quote-actions"><button type="submit" className="primary-btn">Submit Quotation</button><button type="button" className="secondary-btn" onClick={() => setShowQuoteForm(false)}>Cancel</button></div></form>}
      </section>
      {toast && <div className="request-toast" role="status"><strong>{toast}</strong></div>}
    </main>;
  }

  /* ────── Admin / Client View ────── */

  const quotations = request?.quotations || [];
  const vessel = request?.vessel || {};
  const port = request?.port || {};
  const canSubmitQuote = isExpert();
  const acceptedQuote = quotations.find((q) => q.status === "accepted");
  const currentUser = getStoredUser();
  const editPermission = getRequestEditPermission(request, currentUser);
  const isPendingReview = isSuperAdmin() && request.moderationStatus === "pending";
  const isRejected = request.moderationStatus === "rejected";
  const isApproved = request.moderationStatus === "approved";

  const visibleQuotations = isClient()
    ? acceptedQuote
      ? [acceptedQuote]
      : []
    : isExpert()
      ? quotations.filter((q) => {
        const quoteExpertId = Number(q.expertId || q.expert_id);
        const userExpertId = Number(currentUser?.expert_id || currentUser?.expertId);
        const userId = Number(currentUser?.id);

        return quoteExpertId === userExpertId || quoteExpertId === userId;
      })
      : quotations;
  const canSeeQuotations =
    isSuperAdmin() || isExpert() || Boolean(acceptedQuote);
  const getQuotePrice = (quote) => {
    if (isClient()) return quote.finalTotalUsd ?? quote.clientTotalUsd ?? null;

    return quote.totalQuoteUsd || quote.total_quote_usd || 0;
  };

  const getExpertQuote = (quote) => {
    return quote.totalQuoteUsd || quote.total_quote_usd || 0;
  };

  const getAdminMarkup = (quote) => {
    return quote.adminMarkupUsd || quote.admin_markup_usd || 0;
  };

  const getClientTotal = (quote) => {
    return quote.clientTotalUsd || quote.client_total_usd || 0;
  };
  const overview = request.serviceType === "Other" ? request.serviceTypeOther : "";
  const scope = request.scopeOfWork || "";
  const showScope = Boolean(scope.trim()) && normalizeNarrative(scope) !== normalizeNarrative(overview);

  // Budget display values
  const clientBudgetDisplay = submittedBudget(request) == null ? null : formatBudget(submittedBudget(request));
  const approvedBudgetDisplay = marketplaceBudget(request) == null ? null : formatBudget(marketplaceBudget(request));
  const hasBudgetAdjustment = request.adminBudgetAdjustmentType && request.adminBudgetAdjustmentType !== "none";

  // Budget preview for edit mode
  const editBudgetPreview = (() => {
    if (!editing) return null;
    const clientBudget = editForm.budgetUsd === "" ? null : editForm.budgetUsd;
    if (clientBudget == null && budgetAdj.explicitApproved) {
      return Number(budgetAdj.explicitApproved);
    }
    if (clientBudget == null) return null;
    return calcApprovedPreview(clientBudget, budgetAdj.type, budgetAdj.mode, budgetAdj.value);
  })();

  return (
    <main className="request-details-page">
      {/* ────── Admin Moderation Banner ────── */}
      {isSuperAdmin() && (isPendingReview || isRejected) && (
        <div className={`moderation-banner ${isRejected ? "rejected" : "pending"}`}>
          <div className="moderation-banner-content">
            <div>
              <strong>
                {isRejected ? "Request Rejected" : "Pending Super Admin Review"}
              </strong>
              {isRejected && request.rejectionReason && (
                <p className="rejection-reason-text">{request.rejectionReason}</p>
              )}
              {(request.companyName || request.requesterName) && <span className="moderation-client-name">{request.companyVerified ? "Company" : "Legacy requester"}: {request.companyName || request.requesterName}</span>}
            </div>
            {isPendingReview && !editing && (
              <div className="moderation-banner-actions">
                <button type="button" className="reject-btn" onClick={() => setShowRejectModal(true)}>
                  <XCircle size={14} /> Reject
                </button>
                <button type="button" className="accept-btn" disabled={approving} onClick={handleApprove}>
                  <CheckCircle2 size={14} /> {approving ? "Approving..." : "Approve Request"}
                </button>
              </div>
            )}
          </div>
          {approvalErrors.length > 0 && (
            <div className="approval-errors">
              <AlertTriangle size={14} />
              <span>Missing required fields: {approvalErrors.join(", ")}</span>
            </div>
          )}
        </div>
      )}

      {/* ────── Client Pending Notice ────── */}
      {isClient() && request.moderationStatus === "pending" && (
        <div className="moderation-banner pending">
          <div className="moderation-banner-content">
            <strong>This request is currently under review by Nexaport.</strong>
          </div>
        </div>
      )}
      {isClient() && isRejected && (
        <div className="moderation-banner rejected">
          <div className="moderation-banner-content">
            <div>
              <strong>Request Rejected</strong>
              {request.rejectionReason && <p className="rejection-reason-text">{request.rejectionReason}</p>}
            </div>
          </div>
        </div>
      )}

      <section className="request-details-head">
        <div className="request-head-info">
          <div className="request-tags">
            <span className="request-identifier">Request #{request.id || id}</span>
            <span className={`urgency-tag ${request.urgency || ""}`}>
              Priority: {request.urgency || "routine"}
            </span>
            <span className={`status-tag ${request.status || ""}`}>
              Work: {request.status || "open"}
            </span>
            {request.moderationStatus && (
              <span className={`status-tag moderation-${request.moderationStatus}`}>
                Review: {request.moderationStatus}
              </span>
            )}
          </div>

          <h1>{request.title || "Untitled request"}</h1>

          <div className="request-meta-line">
            <span>
              <MapPin size={17} aria-hidden="true" />
              {port.name || port.port_name || port.locationSummary || "Port not added"}
              {port.country ? `, ${port.country}` : ""}
            </span>

            <span>
              <CalendarDays size={17} aria-hidden="true" />
              Due {formatDate(request.requiredBy)}
            </span>
            {(vessel.name || vessel.vessel_name) && <span><Ship size={17} aria-hidden="true" /> {vessel.name || vessel.vessel_name}</span>}
          </div>
        </div>

        <div className="request-head-actions">
        <div className="request-head-action-row">
        {(isSuperAdmin() || (isClient() && Number(request.requesterUserId) === Number(currentUser.id))) && <CopyRequestLink requestId={id} />}
        {(isSuperAdmin() || isClient()) && !editing && <>
          <button type="button" className="secondary-btn request-edit-action" onClick={beginEdit} disabled={!editPermission.allowed} title={editPermission.reason || undefined}>
            <Edit3 size={14} /> {isClient() && isRejected ? "Edit & Resubmit" : "Edit Request"}
          </button>
        </>}
        {isSuperAdmin() && isApproved && <button type="button" className="open-workflow-btn" onClick={() => navigate(`/admin/inspection-workflow/${id}`)}><RouteIcon size={16}/> Open Inspection Workflow</button>}
        </div>
        {(isSuperAdmin() || isClient()) && !editing && !editPermission.allowed && <small className="request-edit-lock-reason">{editPermission.reason}</small>}
        {!(isSuperAdmin() && (isPendingReview || editing)) && <div className="budget-block">
          {isSuperAdmin() ? (
            <>
              <strong>
                {approvedBudgetDisplay || clientBudgetDisplay || "No budget"}
              </strong>
              <span>{approvedBudgetDisplay ? "Market target budget (consultant-facing)" : "Client submitted budget"}</span>
            </>
          ) : isClient() ? (
            <>
              <strong>{acceptedQuote ? formatBudget(getQuotePrice(acceptedQuote)) : clientBudgetDisplay || "Not provided"}</strong>
              <span>
                {acceptedQuote
                  ? "Accepted client total"
                  : "Submitted budget"}
              </span>
            </>
          ) : (
            <>
              <strong>${money(request.budgetUsd)}</strong>
              <span>{`${Number(request.quotationCount || quotations.length || 0)} ${Number(request.quotationCount || quotations.length || 0) === 1 ? "quotation" : "quotations"}`}</span>
            </>
          )}
        </div>}</div>
      </section>

      <section className="request-details-layout">
        <div className="request-main-col">
          {/* ────── Request Edit Form ────── */}
          {editing && (
            <div className="admin-edit-card">
              <h2><Edit3 size={18} /> Edit Request Details</h2>
              <div className="admin-edit-grid">
                <div className="wide"><strong>{request.companyVerified ? "Company" : "Legacy requester"}</strong><p>{request.companyName || request.requesterName || "Not provided"}</p></div>
                <label className="wide">Services Required
                  <InspectionCatalogueSelect
                    verticals={inspectionVerticals}
                    selectedMethodId={editForm.inspectionMethodId}
                    isOther={editForm.serviceType === "Other"}
                    otherValue={editForm.serviceTypeOther}
                    onSelectMethod={(method, vertical) => {
                      setEditForm({
                        ...editForm,
                        inspectionMethodId: method.id,
                        inspectionVertical: vertical.name,
                        serviceType: method.name,
                        serviceCategory: vertical.name,
                        serviceTypeOther: "",
                      });
                    }}
                    onSelectOther={() => {
                      setEditForm({
                        ...editForm,
                        inspectionMethodId: "",
                        inspectionVertical: "Other",
                        serviceType: "Other",
                        serviceCategory: "Other",
                        serviceTypeOther: "",
                      });
                    }}
                    onOtherChange={(value) => setEditForm({ ...editForm, serviceTypeOther: value })}
                  />
                </label>
                <label>Title<input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} /></label>
                {(isClient() || isSuperAdmin()) && <label>Client Submitted Budget (USD)<input type="number" min="0" step="any" value={editForm.budgetUsd} onChange={(e) => setEditForm({ ...editForm, budgetUsd: e.target.value })} /></label>}
                <label>Urgency
                  <select value={editForm.urgency} onChange={(e) => setEditForm({ ...editForm, urgency: e.target.value })}>
                    {["routine", "urgent", "emergency"].map((u) => <option key={u}>{u}</option>)}
                  </select>
                </label>
                <label>Required Date<input type="date" value={editForm.requiredBy} onChange={(e) => setEditForm({ ...editForm, requiredBy: e.target.value })} /></label>
                {isClient() ? <div><VesselIdentityFields value={editForm} disabled={editSaving} onChange={(patch) => setEditForm((current) => ({ ...current, ...patch }))} /></div> : <><label>Vessel Name<input value={editForm.vesselName} onChange={(e) => setEditForm({ ...editForm, vesselName: e.target.value })} /></label><label>IMO Number<input value={editForm.imoNumber} onChange={(e) => setEditForm({ ...editForm, imoNumber: e.target.value })} /></label></>}
                <label>Vessel Type<input value={editForm.vesselType} onChange={(e) => setEditForm({ ...editForm, vesselType: e.target.value })} /></label>
                <label>Flag<input value={editForm.flagState} onChange={(e) => setEditForm({ ...editForm, flagState: e.target.value })} /></label>
                <div><PortSelect ports={editForm.ports} originalPortSchedule={editForm.originalPortSchedule} disabled={editSaving} terminalName={editForm.terminalName} eta={editForm.eta} portId={editForm.portId} portName={editForm.portName} onChange={(patch) => setEditForm((current) => ({ ...current, ...patch }))} /></div>
                <label>Terminal<input maxLength={240} value={editForm.terminalName} onChange={(e) => setEditForm({ ...editForm, terminalName: e.target.value })} /></label>
                <label>ETA<input type="date" value={editForm.eta} onChange={(e) => setEditForm({ ...editForm, eta: e.target.value })} /></label>
                <ScopeAssistant value={editForm} legacyCertification={request.requiredCertification} disabled={editSaving} onChange={(scopeOfWork) => setEditForm((current) => ({ ...current, scopeOfWork }))} />
                <label className="wide">Scope of Work<ScopeEditor value={editForm.scopeOfWork} disabled={editSaving} onChange={(scopeOfWork) => setEditForm((current) => ({ ...current, scopeOfWork }))} /></label>
                <AgentDetailsFields writeOnly={isClient()} value={editForm} errors={editFieldErrors} onChange={(patch) => setEditForm((current) => ({ ...current, ...patch }))} />
              </div>
              <div className="request-edit-form-actions">
                <button type="button" className="secondary-btn" onClick={cancelEdit} disabled={editSaving}>Cancel</button>
                <button type="button" className="accept-btn" onClick={saveEdit} disabled={editSaving}>{editSaving ? "Saving..." : isClient() && isRejected ? "Save & Resubmit" : "Save Changes"}</button>
              </div>
            </div>
          )}

          {/* ────── Admin Budget Review ────── */}
          {isSuperAdmin() && (isPendingReview || editing) && (
            <div className="admin-budget-review">
              <h3><DollarSign size={16} /> Budget Review</h3>
              <div className="budget-review-row">
                <div className="budget-review-item">
                  <span>Client Submitted Budget</span>
                  <strong>{clientBudgetDisplay || "Not provided"}</strong>
                </div>
              </div>
              {editing && (
                <>
                  {submittedBudget(request) != null ? (
                    <div className="budget-adjustment-controls">
                      <label>Adjustment
                        <div className="budget-adj-row">
                          <select value={budgetAdj.mode} onChange={(e) => setBudgetAdj({ ...budgetAdj, mode: e.target.value })}>
                            <option value="none">No adjustment</option>
                            <option value="markup">Markup</option>
                            <option value="markdown">Markdown</option>
                          </select>
                          {budgetAdj.mode !== "none" && (
                            <>
                              <select value={budgetAdj.type} onChange={(e) => setBudgetAdj({ ...budgetAdj, type: e.target.value })}>
                                <option value="percentage">Percentage (%)</option>
                                <option value="fixed">Fixed ($)</option>
                              </select>
                              <input
                                type="number"
                                min="0"
                                step="any"
                                placeholder={budgetAdj.type === "percentage" ? "10" : "100"}
                                value={budgetAdj.value}
                                onChange={(e) => setBudgetAdj({ ...budgetAdj, value: e.target.value })}
                              />
                            </>
                          )}
                        </div>
                      </label>
                    </div>
                  ) : (
                    <div className="budget-adjustment-controls">
                      <label>Set Approved Market Budget
                        <input
                          type="number"
                          min="0"
                          step="any"
                          placeholder="Enter approved budget"
                          value={budgetAdj.explicitApproved}
                          onChange={(e) => setBudgetAdj({ ...budgetAdj, explicitApproved: e.target.value })}
                        />
                      </label>
                    </div>
                  )}
                  <div className="budget-review-row">
                    <div className="budget-review-item approved-preview">
                      <span>Market Target Budget (Consultant-Facing)</span>
                      <strong className="approved-budget-value">
                        {editBudgetPreview != null ? `$${Number(editBudgetPreview).toLocaleString()}` : "Not set"}
                      </strong>
                    </div>
                  </div>
                </>
              )}
              {!editing && (
                <div className="budget-review-row">
                  {hasBudgetAdjustment && (
                    <div className="budget-review-item">
                      <span>Adjustment</span>
                      <strong>
                        {request.adminBudgetAdjustmentMode === "markup" ? "+" : "-"}
                        {request.adminBudgetAdjustmentType === "percentage"
                          ? `${request.adminBudgetAdjustmentValue}%`
                          : `$${money(request.adminBudgetAdjustmentValue)}`
                        }
                      </strong>
                    </div>
                  )}
                  <div className="budget-review-item">
                    <span>Market Target Budget (Consultant-Facing)</span>
                    <strong className="approved-budget-value">{approvedBudgetDisplay || "Not set"}</strong>
                  </div>
                </div>
              )}
            </div>
          )}

          {isClient() && request?.proposal?.status === "sent" && (
            <div className="details-card proposal-decision-card">
              <div className="proposal-decision-card__summary">
                <div>
                  <span className="proposal-decision-card__eyebrow">
                    {request.proposal.amendsProposalId ? "Commercial Amendment Available" : "Commercial Proposal Available"} (Revision #{request.proposal.revisionNumber || 1})
                  </span>
                  <h3>
                    Proposed Consultant: {request.proposal.expertName || "Certified Maritime Surveyor"}
                  </h3>
                  <p>
                    {request.proposal.expertLocation && <span>Based in {request.proposal.expertLocation} · </span>}
                    {request.proposal.expertRating ? <span>★ {request.proposal.expertRating} / 5 · </span> : null}
                    <span>Estimated Attendance: {request.proposal.estimatedAttendanceDays || 1} day(s)</span>
                  </p>
                </div>
                <div className="proposal-decision-card__amount">
                  <span>Total authorized fee</span>
                  <strong>
                    ${money(request.proposal.finalTotalUsd || request.proposal.clientTotalUsd)} USD
                  </strong>
                </div>
              </div>

              {request.proposal.amendsProposalId && <p>The previously approved agreement remains in effect until you approve this amendment. Your assigned Consultant is unchanged.</p>}
              {request.proposal.clientNotes && (
                <div className="proposal-decision-card__notes">
                  <strong>Commercial notes &amp; scope</strong>
                  <p>{request.proposal.clientNotes}</p>
                </div>
              )}

              <div className="proposal-decision-card__actions">
                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowDeclineModal(true)}
                >
                  <XCircle size={16} aria-hidden="true" />
                  Decline Proposal
                </button>
                <button
                  type="button"
                  className="primary-btn"
                  onClick={() => setShowApproveModal(true)}
                >
                  <CheckCircle2 size={16} aria-hidden="true" />
                  Approve Quotation &amp; Authorize Inspection
                </button>
              </div>
            </div>
          )}

          {isClient() && request?.proposal?.status === "rejected" && (
            <div className="workflow-alert error proposal-declined">
              <strong>You declined Commercial Proposal (Revision #{request.proposal.revisionNumber || 1})</strong>
              <p>
                Feedback submitted: "{request.proposal.clientRejectionReason}". NexaPort Admin is preparing revised terms.
              </p>
            </div>
          )}

          {isClient() && !acceptedQuote && (!request?.proposal || !["sent", "rejected"].includes(request.proposal.status)) && (
            <div className="details-card">
              <p>
                Quotations are under admin review. Once commercial terms are finalized, your proposal will appear here for review and authorization.
              </p>
            </div>
          )}

          {!editing && (
            <>
              {overview && <Narrative title="Request Overview" text={overview} />}
              {showScope && <Narrative title="Scope of Work" text={scope} />}
              {!overview && !scope && <section className="request-narrative empty"><h2>Request Overview</h2><p>No description was provided.</p></section>}
            </>
          )}

          {/* ────── Quotations ────── */}
          <div className="quotation-head">
            <h2>
              {isClient() ? "Accepted Quote" : `Quotations (${visibleQuotations.length})`}
            </h2>
            {canSubmitQuote && (
              <button
                className="submit-quote-toggle"
                onClick={() => setShowQuoteForm(!showQuoteForm)}
              >
                <Briefcase size={17} />
                Submit Quotation
              </button>
            )}
          </div>

          {showQuoteForm && canSubmitQuote && (
            <form className="quote-form-card" onSubmit={submitQuotation}>
              <h3>Submit Quotation</h3>
              <p>Provide a detailed cost breakdown for this service request.</p>

              <div className="quote-two-grid">
                <div>
                  <label>Total Quotation (USD)</label>
                  <input
                    value={quoteForm.totalQuoteUsd}
                    onChange={(e) =>
                      setQuoteForm({ ...quoteForm, totalQuoteUsd: e.target.value })
                    }
                    placeholder="3500"
                    required
                  />
                </div>

                <div>
                  <label>Attendance Days</label>
                  <input
                    value={quoteForm.attendanceDays}
                    onChange={(e) =>
                      setQuoteForm({ ...quoteForm, attendanceDays: e.target.value })
                    }
                    placeholder="1"
                  />
                </div>

                <div>
                  <label>Travel Cost</label>
                  <input
                    value={quoteForm.travelCost}
                    onChange={(e) =>
                      setQuoteForm({ ...quoteForm, travelCost: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>

                <div>
                  <label>Accommodation</label>
                  <input
                    value={quoteForm.accommodationCost}
                    onChange={(e) =>
                      setQuoteForm({ ...quoteForm, accommodationCost: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>

                <div>
                  <label>Report Fee</label>
                  <input
                    value={quoteForm.reportFee}
                    onChange={(e) =>
                      setQuoteForm({ ...quoteForm, reportFee: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>

                <div>
                  <label>Urgency Surcharge</label>
                  <input
                    value={quoteForm.urgencySurcharge}
                    onChange={(e) =>
                      setQuoteForm({ ...quoteForm, urgencySurcharge: e.target.value })
                    }
                    placeholder="0"
                  />
                </div>
              </div>

              <label>Cover Letter / Notes</label>
              <textarea
                value={quoteForm.coverLetter}
                onChange={(e) =>
                  setQuoteForm({ ...quoteForm, coverLetter: e.target.value })
                }
                placeholder="Describe your experience, availability, and approach..."
              />

              <div className="quote-actions">
                <button type="submit" className="primary-btn">
                  Submit Quotation
                </button>

                <button
                  type="button"
                  className="secondary-btn"
                  onClick={() => setShowQuoteForm(false)}
                >
                  Cancel
                </button>
              </div>
            </form>
          )}

          {canSeeQuotations &&
            visibleQuotations.map((quote) => (
              <article
                key={quote.id}
                className={`quotation-card ${quote.status === "accepted" ? "accepted" : ""}`}
              >
                <div className="quotation-top">
                  <div>
                    <h3>
                      {isClient()
                        ? quote.status === "accepted"
                          ? quote.expertName || "Expert"
                          : "Expert details hidden"
                        : quote.expertName || "Expert"}
                      <span>
                        <Star size={16} fill="#149d94" color="#149d94" />
                        {quote.expertRating || 0}
                      </span>
                    </h3>

                    <p>{formatDateTime(quote.createdAt)}</p>
                  </div>

                  <div className="quotation-price">
                    <strong>{getQuotePrice(quote) == null ? "Price unavailable" : "$" + money(getQuotePrice(quote))}</strong>
                    <span className={`quote-status ${quote.status}`}>
                      {quote.status}
                    </span>
                    {isSuperAdmin() && quote.status === "accepted" && (
                      <small className="admin-price-breakdown">
                        Expert: ${money(getExpertQuote(quote))} · Markup: $
                        {money(getAdminMarkup(quote))} · Client: ${money(getClientTotal(quote))}
                      </small>
                    )}
                  </div>
                </div>

                {!isClient() && (
                  <div className="quote-cost-grid">
                    <div>
                      <span>Days</span>
                      <strong>{quote.attendanceDays || 0}d</strong>
                    </div>
                    <div>
                      <span>Travel</span>
                      <strong>${money(quote.travelCost)}</strong>
                    </div>
                    <div>
                      <span>Accomm.</span>
                      <strong>${money(quote.accommodationCost)}</strong>
                    </div>
                    <div>
                      <span>Report</span>
                      <strong>${money(quote.reportFee)}</strong>
                    </div>
                  </div>
                )}

                {quote.coverLetter && <blockquote>"{quote.coverLetter}"</blockquote>}

                {(isClient() || isSuperAdmin()) && quote.status === "accepted" && (
                  <>
                    <button
                      type="button"
                      className="primary-btn"
                      onClick={() => {
                        if (reviewQuoteId === quote.id) {
                          cancelReview();
                        } else {
                          setReviewQuoteId(quote.id);
                          setReviewForm({
                            rating: 0,
                            comment: "",
                            reviewer_name: "",
                          });
                        }
                      }}
                    >
                      Rate & Review Consultant
                    </button>

                    {reviewQuoteId === quote.id && (
                      <div className="inline-review-card">
                        <h3>Submit Review</h3>

                        <label>Rating (1-5)</label>
                        <div className="rating-buttons">
                          {[1, 2, 3, 4, 5].map((num) => (
                            <button
                              key={num}
                              type="button"
                              className={
                                num <= reviewForm.rating ? "active" : ""
                              }
                              aria-pressed={num <= reviewForm.rating}
                              aria-label={`Rate ${num} out of 5`}
                              onClick={() =>
                                setReviewForm({ ...reviewForm, rating: num })
                              }
                            >
                              {num}
                            </button>
                          ))}
                        </div>

                        <label>Comment (opt.)</label>
                        <textarea
                          value={reviewForm.comment}
                          onChange={(e) =>
                            setReviewForm({ ...reviewForm, comment: e.target.value })
                          }
                          placeholder="Describe your experience working with this consultant..."
                        />

                        <label>Your Name / Company (opt.)</label>
                        <input
                          value={reviewForm.reviewer_name}
                          onChange={(e) =>
                            setReviewForm({
                              ...reviewForm,
                              reviewer_name: e.target.value,
                            })
                          }
                          placeholder="Your name or company"
                        />

                        <div className="review-actions">
                          <button
                            type="button"
                            className="primary-btn"
                            onClick={() => submitReview(quote)}
                          >
                            Submit Review
                          </button>

                          <button
                            type="button"
                            className="secondary-btn"
                            onClick={cancelReview}
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </>
                )}

                {isSuperAdmin() && quote.status !== "accepted" && (
                  <div className="admin-accept-box">
                    <p>
                      Commercial proposals and surveyor assignments are managed in the Inspection Workflow.
                    </p>
                    {/* Preservation reference for quotation breakdown:
                    <div className="client-total-preview">
                      getExpertQuote(quote) quote.travelCost quote.accommodationCost quote.reportFee quote.urgencySurcharge markupByQuote[quote.id]
                    </div>
                    <button
                      className="accept-btn" */}
                    <button
                      type="button"
                      className="primary-btn"
                      onClick={() => navigate(`/admin/inspection-workflows/${id}`)}
                    >
                      Manage in Inspection Workflow &rarr;
                    </button>
                  </div>
                )}
              </article>
            ))}
        </div>

        <aside className="request-side-col">
          <div className="side-info-card">
            <h3>
              <Ship size={18} />
              Vessel Particulars
            </h3>

            <Info label="Name" value={vessel.name || vessel.vessel_name} />
            <Info label="IMO" value={vessel.imoNumber || vessel.imo_number} />
            <Info label="Type" value={vessel.type || vessel.vessel_type} />
            <Info
              label="Flag"
              value={vessel.flagState || vessel.flag_state}
              icon={<Flag size={14} />}
            />
          </div>

          <div className="side-info-card">
            <h3>
              <MapPin size={18} />
              Port & Schedule
            </h3>

            <Info label="Port" value={port.name || port.port_name} /><AdditionalPorts ports={request.ports}/>
            {port.country && <Info label="Country (historical / port record)" value={port.country} />}
            <Info label="Terminal" value={request.terminalName} />
            <Info label="ETA" value={port.eta ? formatDateTime(port.eta) : null} />
            <Info label="Deadline" value={request.requiredBy ? formatDate(request.requiredBy) : null} />
          </div>

          <AgentDetails value={request.agentDetails} showEmpty />
          {isSuperAdmin() && <div className="side-info-card submitted-by-card">
            <h3>Submitted By</h3>
            {request.submittedBy?.source === "account" ? <dl>
              <div><dt>Account holder</dt><dd>{request.submittedBy.fullName || "Name unavailable"}</dd></div>
              <div><dt>Email</dt><dd>{request.submittedBy.email ? <a href={`mailto:${request.submittedBy.email}`}>{request.submittedBy.email}</a> : "Unavailable"}</dd></div>
              <div><dt>Account ID</dt><dd>{request.submittedBy.id}</dd></div>
              {request.companyName && <div><dt>Associated company</dt><dd>{request.companyName}</dd></div>}
              <div><dt>Submitted</dt><dd>{formatDateTime(request.createdAt)}</dd></div>
            </dl> : <><p>Legacy request — no linked user account</p>{request.requesterName && <p className="submitted-by-legacy">Legacy source detail: {request.requesterName}</p>}</>}
          </div>}
          {request.requiredCertification && (          <div className="side-info-card">
            <h3>
              <Award size={18} />
              Required Qualifications <small>Legacy Certification Requirements</small>
            </h3>
            <p>{request.requiredCertification ? displayCase(request.requiredCertification) : "Not provided"}</p>
          </div>)}

          {!isExpert() && !isSuperAdmin() && (
            <div className="side-info-card">
              <h3>{request.companyVerified ? "Company" : "Legacy requester"}</h3>
              <p>{request.companyName || request.requesterName || "Not provided"}</p>
            </div>
          )}

        </aside>
      </section>

      {/* ────── Reject Request Modal ────── */}
      {showRejectModal && (
        <div className="delete-request-backdrop" role="presentation" onMouseDown={(e) => {
          if (e.target === e.currentTarget && !rejecting) setShowRejectModal(false);
        }}>
          <section ref={dialogRef} className="delete-request-dialog" role="dialog" aria-modal="true" aria-labelledby="reject-request-title" aria-describedby="reject-request-help">
            <h2 id="reject-request-title">Reject Service Request</h2>
            <p id="reject-request-help">Provide a reason for rejection. This will be visible to the Client.</p>
            <label htmlFor="reject-request-reason">Reason for rejection</label>
            <textarea
              id="reject-request-reason"
              className="reject-reason-input"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Please provide the vessel IMO number and confirmed inspection date."
              maxLength={1000}
            />
            <div className="delete-request-actions">
              <button type="button" onClick={() => { setShowRejectModal(false); setRejectionReason(""); }} disabled={rejecting}>Cancel</button>
              <button
                type="button"
                className="confirm-delete-request"
                disabled={rejecting || !rejectionReason.trim()}
                onClick={handleReject}
              >
                {rejecting ? "Rejecting..." : "Reject Request"}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ────── Client Approve Proposal Modal ────── */}
      {showApproveModal && request?.proposal && (
        <div className="delete-request-backdrop" role="presentation" onMouseDown={(e) => {
          if (e.target === e.currentTarget && !decidingProposal) setShowApproveModal(false);
        }}>
          <section ref={dialogRef} className="delete-request-dialog request-decision-dialog" role="dialog" aria-modal="true" aria-labelledby="approve-proposal-title">
            <h2 id="approve-proposal-title">Authorize Inspection &amp; Confirm Terms</h2>
            <p className="request-decision-dialog__intro">
              You are authorizing the inspection for <strong>{request.vessel?.name || "the vessel"}</strong> with the proposed consultant.
            </p>

            <div className="request-decision-dialog__terms">
              <div>
                <span>Designated Consultant</span>
                <strong>{request.proposal.expertName || "Certified Surveyor"}</strong>
              </div>
              <div>
                <span>Estimated Attendance</span>
                <strong>{request.proposal.estimatedAttendanceDays || 1} day(s)</strong>
              </div>
              <div className="request-decision-dialog__total">
                <span>Total Commercial Fee</span>
                <strong>${money(request.proposal.finalTotalUsd || request.proposal.clientTotalUsd)} USD</strong>
              </div>
            </div>

            <p className="request-decision-dialog__note">
              By confirming, you agree to the commercial fee and authorize NexaPort to lock consultant assignment and initiate inspection preparation.
            </p>

            <div className="delete-request-actions">
              <button type="button" onClick={() => setShowApproveModal(false)} disabled={decidingProposal}>
                Cancel
              </button>
              <button
                type="button"
                className="primary-btn"
                disabled={decidingProposal}
                onClick={handleApproveProposal}
              >
                {decidingProposal ? "Authorizing..." : "Confirm Authorization & Acceptance"}
              </button>
            </div>
          </section>
        </div>
      )}

      {/* ────── Client Decline Proposal Modal ────── */}
      {showDeclineModal && request?.proposal && (
        <div className="delete-request-backdrop" role="presentation" onMouseDown={(e) => {
          if (e.target === e.currentTarget && !decidingProposal) setShowDeclineModal(false);
        }}>
          <section ref={dialogRef} className="delete-request-dialog request-decision-dialog" role="dialog" aria-modal="true" aria-labelledby="decline-proposal-title" aria-describedby="decline-proposal-help">
            <h2 id="decline-proposal-title">Decline Commercial Proposal</h2>
            <p id="decline-proposal-help" className="request-decision-dialog__intro">
              Please provide feedback on why this proposal is declined (e.g. price adjustment, scheduling conflict, or scope modification). NexaPort will review your feedback and submit revised terms.
            </p>

            <label htmlFor="decline-proposal-reason">Reason for declining</label>
            <textarea
              id="decline-proposal-reason"
              className="reject-reason-input"
              value={declineReason}
              onChange={(e) => setDeclineReason(e.target.value)}
              placeholder="e.g., Requested attendance dates overlap with vessel drydocking; please adjust schedule or rate."
              maxLength={1000}
              rows={4}
            />

            <div className="delete-request-actions">
              <button type="button" onClick={() => { setShowDeclineModal(false); setDeclineReason(""); }} disabled={decidingProposal}>
                Cancel
              </button>
              <button
                type="button"
                className="confirm-delete-request"
                disabled={decidingProposal || !declineReason.trim()}
                onClick={handleDeclineProposal}
              >
                {decidingProposal ? "Submitting..." : "Decline Proposal"}
              </button>
            </div>
          </section>
        </div>
      )}

      {toast && (
        <div className="request-toast" role="status">
          <strong>{toast}</strong>
        </div>
      )}
    </main>
  );
}
