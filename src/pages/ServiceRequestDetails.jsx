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
import { useCallback, useEffect, useState } from "react";
import { acceptQuotation, createQuotation, getQuotations } from "../api/quotationApi";
import { createExpertReview } from "../api/reviewApi";
import {
  approveServiceRequest,
  getServiceRequestById,
  rejectServiceRequest,
  updateServiceRequest,
} from "../api/serviceRequestApi";
import { getStoredUser, isClient, isExpert, isSuperAdmin } from "../utils/auth";
import { displayCase, normalizeNarrative } from "../utils/requestPresentation";
import { getRequestEditPermission } from "../utils/serviceRequestEditPermission";
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
    const listed = lines.length > 1 && lines.every((line) => /^[-*•\d]+[.)]?\s*/.test(line));
    return listed ? <ul key={index}>{lines.map((line) => <li key={line}>{line.replace(/^[-*•\d]+[.)]?\s*/, "")}</li>)}</ul> : <p key={index}>{lines.join("\n")}</p>;
  })}</div></section>;
}

/* ────────────────────────────────────────────
   Info — always renders, never suppresses rows
──────────────────────────────────────────── */

function Info({ label, value, icon, required, isPendingReview }) {
  const empty = value === null || value === undefined || String(value).trim() === "" || value === "-";
  const showWarning = empty && required && isPendingReview;
  return (
    <div className="info-row">
      <span>{label}</span>
      <strong className={empty ? "info-empty" : ""}>
        {icon}
        {empty ? "Not provided" : value}
        {showWarning && <small className="info-required-hint">Required</small>}
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

export default function ServiceRequestDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  const [request, setRequest] = useState(null);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const [toast, setToast] = useState("");
  const [loading, setLoading] = useState(true);
  const [markupByQuote, setMarkupByQuote] = useState({});

  // Admin review state
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({});
  const [editSaving, setEditSaving] = useState(false);
  const [approving, setApproving] = useState(false);
  const [approvalErrors, setApprovalErrors] = useState([]);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState("");
  const [rejecting, setRejecting] = useState(false);

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
        setRequest({ ...requestRes.data, _ownQuotations: quotationRes.data || [] });
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
    const loadId = window.setTimeout(loadPage, 0);
    return () => window.clearTimeout(loadId);
  }, [loadPage]);

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
    if (value == null) return "Not provided";
    return Number(value || 0).toLocaleString();
  };

  const moneyOrNull = (value) => {
    if (value == null) return null;
    return `$${Number(value).toLocaleString()}`;
  };

  /* ────── Quote handlers ────── */

  const submitQuotation = async (e) => {
    e.preventDefault();

    try {

      await createQuotation({
        serviceRequestId: Number(id),
        totalQuoteUsd: Number(quoteForm.totalQuoteUsd),
        attendanceDays: Number(quoteForm.attendanceDays || 0),
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

  const handleAcceptQuotation = async (quotationId) => {
    try {
      const adminMarkupUsd = Number(markupByQuote[quotationId] || 0);

      const res = await acceptQuotation(quotationId, {
        adminMarkupUsd,
      });

      setToast(res.message || "Quotation accepted and client price finalized.");
      loadPage();
      setTimeout(() => setToast(""), 3000);
    } catch (error) {
      console.error("Failed to accept quotation:", error);
      setToast(error.response?.data?.message || "Failed to accept quotation.");
      setTimeout(() => setToast(""), 3000);
    }
  };

  /* ────── Admin moderation handlers ────── */

  const beginEdit = () => {
    if (!request) return;
    setEditForm({
      serviceType: request.serviceType || "",
      serviceCategory: request.serviceCategory || "",
      serviceTypeOther: request.serviceTypeOther || "",
      title: request.title || "",
      scopeOfWork: request.scopeOfWork || "",
      urgency: request.urgency || "routine",
      budgetUsd: request.clientBudgetUsd ?? request.budgetUsd ?? "",
      requiredBy: request.requiredBy ? String(request.requiredBy).slice(0, 10) : "",
      vesselName: request.vessel?.name || "",
      imoNumber: request.vessel?.imoNumber || "",
      vesselType: request.vessel?.type || "",
      flagState: request.vessel?.flagState || "",
      portName: request.port?.name || "",
      country: request.port?.country || "",
      eta: request.port?.eta ? String(request.port.eta).slice(0, 10) : "",
      locationSummary: request.port?.locationSummary || "",
      requiredCertification: request.requiredCertification || "",
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
    setEditSaving(true);
    try {
      const payload = { ...editForm };

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
        if (budgetAdj.explicitApproved !== "" && request.clientBudgetUsd == null) {
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
    return <main className="request-details-page">Loading request...</main>;
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
    return <main className="request-details-page">Request not found.</main>;
  }

  /* ────── Consultant View (unchanged) ────── */

  if (isExpert()) {
    const ownQuotes = request._ownQuotations || [];
    return <main className="request-details-page consultant-request-detail">
      <section className="details-card consultant-safe-detail-grid">
        <div><span>Service Type</span><strong>{request.serviceType || "Not provided"}</strong></div>
        {request.serviceType === "Other"
          ? <div><span>Service Details</span><strong>{request.serviceTypeOther || "Not provided"}</strong></div>
          : <div><span>Inspection Type</span><strong>{request.inspectionType || "Not provided"}</strong></div>}
        <div><span>Ship Type</span><strong>{request.vesselType || "Not provided"}</strong></div>
        <div><span>Date of Inspection</span><strong>{request.inspectionDate ? formatDate(request.inspectionDate) : "Not provided"}</strong></div>
        <div><span>Port of Inspection</span><strong>{request.portOfInspection || "Not provided"}</strong></div>
        {request.approvedBudgetUsd != null && <div><span>Budget</span><strong>${money(request.approvedBudgetUsd)}</strong></div>}
      </section>
      <section className="consultant-quote-section">
        <div className="quotation-head"><h2>Your Quotation</h2>{!ownQuotes.length && <button className="submit-quote-toggle" onClick={() => setShowQuoteForm(!showQuoteForm)}><Briefcase size={17}/> Submit Quotation</button>}</div>
        {ownQuotes.map((quote) => <article className="quotation-card" key={quote.id}><div className="quotation-top"><div><h3>Your submitted quotation</h3><p>{formatDateTime(quote.createdAt)}</p></div><div className="quotation-price"><strong>${money(quote.totalQuoteUsd)}</strong><span className={`quote-status ${quote.status}`}>{quote.status}</span></div></div></article>)}
        {showQuoteForm && !ownQuotes.length && <form className="quote-form-card" onSubmit={submitQuotation}><h3>Submit Quotation</h3><div className="quote-two-grid">
          {[["totalQuoteUsd","Total Quotation (USD)"],["attendanceDays","Attendance Days"],["travelCost","Travel Cost"],["accommodationCost","Accommodation"],["reportFee","Report Fee"],["urgencySurcharge","Urgency Surcharge"]].map(([field,label]) => <label key={field}>{label}<input type="number" min="0" required={field === "totalQuoteUsd"} value={quoteForm[field]} onChange={(event) => setQuoteForm({...quoteForm,[field]:event.target.value})}/></label>)}
        </div><label>Cover Letter / Notes<textarea value={quoteForm.coverLetter} onChange={(event) => setQuoteForm({...quoteForm,coverLetter:event.target.value})}/></label><div className="quote-actions"><button type="submit" className="primary-btn">Submit Quotation</button><button type="button" className="secondary-btn" onClick={() => setShowQuoteForm(false)}>Cancel</button></div></form>}
      </section>
      {toast && <div className="request-toast"><strong>{toast}</strong></div>}
    </main>;
  }

  /* ────── Admin / Client View ────── */

  const quotations = request?.quotations || [];
  const vessel = request?.vessel || {};
  const port = request?.port || {};
  const canSubmitQuote = isExpert();
  const canAcceptQuote = isSuperAdmin();
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
    if (isClient()) {
      return (
        quote.finalTotalUsd ||
        quote.final_total_usd ||
        quote.clientTotalUsd ||
        quote.client_total_usd ||
        quote.totalQuoteUsd ||
        quote.total_quote_usd ||
        0
      );
    }

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
  const clientBudgetDisplay = moneyOrNull(request.clientBudgetUsd);
  const approvedBudgetDisplay = moneyOrNull(request.approvedBudgetUsd);
  const hasBudgetAdjustment = request.adminBudgetAdjustmentType && request.adminBudgetAdjustmentType !== "none";

  // Budget preview for edit mode
  const editBudgetPreview = (() => {
    if (!editing) return null;
    const clientBudget = request.clientBudgetUsd;
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
              {request.requesterName && <span className="moderation-client-name">Client: {request.requesterName}</span>}
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
        <div style={{ minWidth: 0 }}>
          <div className="request-tags">
            <span className="outline-tag">{request.serviceType || "Service"}</span>
            {request.serviceType !== "Other" && <span className="outline-tag">{request.serviceCategory || "General"}</span>}
            <span className={`urgency-tag ${request.urgency || ""}`}>
              {request.urgency || "routine"}
            </span>
            <span className={`status-tag ${request.status || ""}`}>
              {request.status || "open"}
            </span>
            {request.moderationStatus && (
              <span className={`status-tag moderation-${request.moderationStatus}`}>
                {request.moderationStatus}
              </span>
            )}
          </div>

          <h1>{request.title || "Untitled request"}</h1>

          <div className="request-meta-line">
            <span>
              <MapPin size={17} />
              {port.locationSummary || port.name || port.port_name || "Port not added"}
              {port.country && !port.locationSummary ? `, ${port.country}` : ""}
            </span>

            <span>
              <CalendarDays size={17} />
              Due {formatDate(request.requiredBy)}
            </span>
          </div>
        </div>

        <div className="request-head-actions">
        {(isSuperAdmin() || isClient()) && !editing && <>
          <button type="button" className="secondary-btn request-edit-action" onClick={beginEdit} disabled={!editPermission.allowed} title={editPermission.reason || undefined}>
            <Edit3 size={14} /> {isClient() && isRejected ? "Edit & Resubmit" : "Edit Request"}
          </button>
          {!editPermission.allowed && <small className="request-edit-lock-reason">{editPermission.reason}</small>}
        </>}
        {isSuperAdmin() && isApproved && <button type="button" className="open-workflow-btn" onClick={() => navigate(`/admin/inspection-workflow/${id}`)}><RouteIcon size={16}/> Open Inspection Workflow</button>}
        <div className="budget-block">
          {isSuperAdmin() ? (
            <>
              <strong>
                {approvedBudgetDisplay || clientBudgetDisplay || "No budget"}
              </strong>
              <span>{approvedBudgetDisplay ? "Approved budget" : "Client budget"}</span>
            </>
          ) : isClient() ? (
            <>
              <strong>
                $
                {money(
                  acceptedQuote
                    ? getQuotePrice(acceptedQuote)
                    : request.approvedBudgetUsd ?? request.clientBudgetUsd ?? request.budgetUsd
                )}
              </strong>
              <span>
                {acceptedQuote
                  ? "Accepted quotation"
                  : isApproved ? "Approved budget" : "Submitted budget"}
              </span>
            </>
          ) : (
            <>
              <strong>${money(request.budgetUsd)}</strong>
              <span>{`${Number(request.quotationCount || quotations.length || 0)} ${Number(request.quotationCount || quotations.length || 0) === 1 ? "quotation" : "quotations"}`}</span>
            </>
          )}
        </div></div>
      </section>

      <section className="request-details-layout">
        <div className="request-main-col">
          {/* ────── Request Edit Form ────── */}
          {editing && (
            <div className="admin-edit-card">
              <h2><Edit3 size={18} /> Edit Request Details</h2>
              <div className="admin-edit-grid">
                <label>Service Type
                  <select value={editForm.serviceType} onChange={(e) => {
                    const v = e.target.value;
                    setEditForm({ ...editForm, serviceType: v, serviceCategory: v === "Other" ? "Other" : "", serviceTypeOther: "" });
                  }}>
                    {["Audit", "Inspection", "Survey", "Other"].map((t) => <option key={t}>{t}</option>)}
                  </select>
                </label>
                {editForm.serviceType === "Other"
                  ? <label className="wide">Specify Service<textarea maxLength={500} value={editForm.serviceTypeOther} onChange={(e) => setEditForm({ ...editForm, serviceTypeOther: e.target.value })} /></label>
                  : <label>Service Category<input value={editForm.serviceCategory} onChange={(e) => setEditForm({ ...editForm, serviceCategory: e.target.value })} /></label>
                }
                <label>Title<input value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} /></label>
                {isClient() && <label>Budget (USD)<input type="number" min="0" value={editForm.budgetUsd} onChange={(e) => setEditForm({ ...editForm, budgetUsd: e.target.value })} /></label>}
                <label>Urgency
                  <select value={editForm.urgency} onChange={(e) => setEditForm({ ...editForm, urgency: e.target.value })}>
                    {["routine", "urgent", "emergency"].map((u) => <option key={u}>{u}</option>)}
                  </select>
                </label>
                <label>Required Date<input type="date" value={editForm.requiredBy} onChange={(e) => setEditForm({ ...editForm, requiredBy: e.target.value })} /></label>
                <label>Vessel Name<input value={editForm.vesselName} onChange={(e) => setEditForm({ ...editForm, vesselName: e.target.value })} /></label>
                <label>IMO Number<input value={editForm.imoNumber} onChange={(e) => setEditForm({ ...editForm, imoNumber: e.target.value })} /></label>
                <label>Vessel Type<input value={editForm.vesselType} onChange={(e) => setEditForm({ ...editForm, vesselType: e.target.value })} /></label>
                <label>Flag<input value={editForm.flagState} onChange={(e) => setEditForm({ ...editForm, flagState: e.target.value })} /></label>
                <label>Port<input value={editForm.portName} onChange={(e) => setEditForm({ ...editForm, portName: e.target.value })} /></label>
                <label>Country<input value={editForm.country} onChange={(e) => setEditForm({ ...editForm, country: e.target.value })} /></label>
                <label>ETA<input type="date" value={editForm.eta} onChange={(e) => setEditForm({ ...editForm, eta: e.target.value })} /></label>
                <label>Location Summary<input value={editForm.locationSummary} onChange={(e) => setEditForm({ ...editForm, locationSummary: e.target.value })} /></label>
                <label>Required Certification<input value={editForm.requiredCertification} onChange={(e) => setEditForm({ ...editForm, requiredCertification: e.target.value })} /></label>
                <label className="wide">Scope of Work<textarea value={editForm.scopeOfWork} onChange={(e) => setEditForm({ ...editForm, scopeOfWork: e.target.value })} /></label>
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
                  {request.clientBudgetUsd != null ? (
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
                      <span>Approved Consultant Budget</span>
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
                    <span>Approved Consultant Budget</span>
                    <strong className="approved-budget-value">{approvedBudgetDisplay || "Not set"}</strong>
                  </div>
                </div>
              )}
            </div>
          )}

          {!editing && (
            <>
              {overview && <Narrative title="Request Overview" text={overview} />}
              {showScope && <Narrative title="Scope of Work" text={scope} />}
              {!overview && !scope && <section className="request-narrative empty"><h2>Request Overview</h2><p>No description was provided.</p></section>}
              {!overview && scope && !showScope && <section className="request-narrative empty"><h2>Request Overview</h2><p>No description was provided.</p></section>}
              {!showScope && scope && overview && null}
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

          {isClient() && !acceptedQuote && (
            <div className="details-card">
              <p>
                Quotations are under admin review. Accepted consultant details will be visible once a quote is approved.
              </p>
            </div>
          )}

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
                    <strong>${money(getQuotePrice(quote))}</strong>
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

                {canAcceptQuote && quote.status !== "accepted" && (
                  <div className="admin-accept-box">
                    <label>
                      Admin Markup / Platform Fee (USD)
                      <input
                        type="number"
                        value={markupByQuote[quote.id] || ""}
                        onChange={(e) =>
                          setMarkupByQuote((prev) => ({
                            ...prev,
                            [quote.id]: e.target.value,
                          }))
                        }
                        placeholder="500"
                      />
                    </label>

                    <div className="client-total-preview">
                      Client Final Price: $
                      {money(
                        Number(getExpertQuote(quote)) +
                        Number(quote.travelCost || 0) +
                        Number(quote.accommodationCost || 0) +
                        Number(quote.reportFee || 0) +
                        Number(quote.urgencySurcharge || 0) +
                        Number(markupByQuote[quote.id] || 0)
                      )}
                    </div>

                    <button
                      className="accept-btn"
                      onClick={() => handleAcceptQuotation(quote.id)}
                    >
                      <CheckCircle2 size={16} />
                      Accept Quote
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

            <Info label="Name" value={vessel.name || vessel.vessel_name} required isPendingReview={isPendingReview} />
            <Info label="IMO" value={vessel.imoNumber || vessel.imo_number} isPendingReview={isPendingReview} />
            <Info label="Type" value={vessel.type || vessel.vessel_type} required isPendingReview={isPendingReview} />
            <Info
              label="Flag"
              value={vessel.flagState || vessel.flag_state}
              icon={<Flag size={14} />}
              isPendingReview={isPendingReview}
            />
          </div>

          <div className="side-info-card">
            <h3>
              <MapPin size={18} />
              Port & Schedule
            </h3>

            <Info label="Port" value={port.name || port.port_name} required isPendingReview={isPendingReview} />
            <Info label="Country" value={port.country} isPendingReview={isPendingReview} />
            <Info label="ETA" value={port.eta ? formatDateTime(port.eta) : null} isPendingReview={isPendingReview} />
            <Info label="Deadline" value={request.requiredBy ? formatDate(request.requiredBy) : null} required isPendingReview={isPendingReview} />
          </div>

          <div className="side-info-card">
            <h3>
              <Award size={18} />
              Required Qualifications
            </h3>
            <p>{request.requiredCertification ? displayCase(request.requiredCertification) : "Not provided"}</p>
          </div>

          {!isExpert() && (
            <div className="side-info-card">
              <h3>Requested By</h3>
              <p>{request.requesterName || "Not provided"}</p>
            </div>
          )}

          {/* Client budget info for Client view */}
          {isClient() && (
            <div className="side-info-card">
              <h3><DollarSign size={18} /> Budget</h3>
              <Info label="Submitted" value={clientBudgetDisplay} />
              {isApproved && approvedBudgetDisplay && approvedBudgetDisplay !== clientBudgetDisplay && (
                <Info label="Approved" value={approvedBudgetDisplay} />
              )}
            </div>
          )}
        </aside>
      </section>

      {/* ────── Reject Modal ────── */}
      {showRejectModal && (
        <div className="delete-request-backdrop" role="presentation" onMouseDown={(e) => {
          if (e.target === e.currentTarget && !rejecting) setShowRejectModal(false);
        }}>
          <section className="delete-request-dialog" role="dialog" aria-modal="true">
            <h2>Reject Service Request</h2>
            <p>Provide a reason for rejection. This will be visible to the Client.</p>
            <textarea
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

      {toast && (
        <div className="request-toast">
          <strong>{toast}</strong>
        </div>
      )}
    </main>
  );
}
