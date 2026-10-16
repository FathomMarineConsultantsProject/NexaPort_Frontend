import AdditionalPorts from "../components/requests/AdditionalPorts";
import { requestPortPayload } from "../components/requests/requestPortState.js";
import ScopeEditor from "../components/requests/ScopeEditor";
import PortSelect from "../components/requests/PortSelect";
import VesselIdentityFields from "../components/requests/VesselIdentityFields";
import ScopeAssistant from "../components/requests/ScopeAssistant";
import { AgentDetailsFields } from "../components/requests/AgentDetails";
import { Calendar, CheckCircle2, ChevronDown, Edit3, MapPin, Plus, Search, Ship, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { approveServiceRequest, deleteServiceRequest, getServiceRequests, updateServiceRequest } from "../api/serviceRequestApi";
import { getServiceRequestDropdowns } from "../api/masterApi";
import InspectionCatalogueSelect from "../components/requests/InspectionCatalogueSelect";
import { getStoredUser, isClient, isExpert, isSuperAdmin } from "../utils/auth";
import { getRequestEditPermission } from "../utils/serviceRequestEditPermission";
import { requestBudgetPresentation, submittedBudget } from "../utils/requestRegister";

import "./ServiceRequests.css";

function FilterDropdown({ label, options, value, onChange, setDropdownRef, openDropdown, setOpenDropdown }) {
  const dropdownId = label.toLowerCase().replace(/\s/g, "-");
  return (
    <div className="filter-select" ref={(element) => setDropdownRef(dropdownId, element)}>
      <span className="filter-select-label">{label}</span>
      <button type="button" onClick={() => setOpenDropdown(openDropdown === dropdownId ? null : dropdownId)} className="filter-select-trigger" aria-label={`${label}: ${value}`} aria-expanded={openDropdown === dropdownId} aria-controls={`${dropdownId}-filter-options`}>
        <span>{value}</span><ChevronDown size={18} />
      </button>
      {openDropdown === dropdownId && (
        <div id={`${dropdownId}-filter-options`} className="filter-select-menu">
          {options.map((option) => (
            <button type="button" key={option} className={`filter-option ${value === option ? "active" : ""}`} aria-pressed={value === option} onClick={() => { onChange(option); setOpenDropdown(null); }}>
              {option}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function ServiceRequests() {
  const navigate = useNavigate();
  const location = useLocation();
  const currentUser = getStoredUser();

  const [notice, setNotice] = useState(location.state?.notice || "");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [listError, setListError] = useState("");
  const [listRetry, setListRetry] = useState(0);
  const listRequestId = useRef(0);
  const [search, setSearch] = useState("");
  const [requestToDelete, setRequestToDelete] = useState(null);
  const [deletingRequest, setDeletingRequest] = useState(false);
  const [moderation, setModeration] = useState("pending");
  const [approvingId, setApprovingId] = useState(null);
  const [editingRequest, setEditingRequest] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [editFieldErrors, setEditFieldErrors] = useState({});
  const [deleteError, setDeleteError] = useState("");
  const [inspectionVerticals, setInspectionVerticals] = useState([]);
  const deleteCancelRef = useRef(null);
  const deleteDialogRef = useRef(null);
  const deletionInFlightRef = useRef(false);

  const [selectedType, setSelectedType] = useState("All Types");
  const [selectedStatus, setSelectedStatus] = useState("All Statuses");
  const [selectedUrgency, setSelectedUrgency] = useState("Any Urgency");

  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRefs = useRef({});

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (openDropdown && dropdownRefs.current[openDropdown]) {
        if (!dropdownRefs.current[openDropdown].contains(e.target)) {
          setOpenDropdown(null);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [openDropdown]);

  const loadRequests = useCallback(async () => {
    const currentId = ++listRequestId.current;
    setLoading(true);
    setListError("");

    try {
      const params = {};

      if (search) params.search = search;
      if (selectedType !== "All Types") params.type = selectedType;
      if (selectedStatus !== "All Statuses") params.status = selectedStatus;
      if (selectedUrgency !== "Any Urgency") params.urgency = selectedUrgency;
      if (isSuperAdmin()) params.moderation = moderation;
      const response = await getServiceRequests(params);

      // Backend now handles role filtering:
      // admin = all, expert = assigned/available, client = own.
      if (!Array.isArray(response?.data)) throw new Error("Invalid requests response.");
      if (currentId === listRequestId.current) setRequests(response.data);
    } catch (error) {
      console.error("Failed to load requests:", error);
      if (currentId === listRequestId.current) { setListError(error.response?.data?.message || error.message || "Requests could not be loaded."); setRequests([]); }
    } finally {
      if (currentId === listRequestId.current) setLoading(false);
    }
  }, [search, selectedStatus, selectedType, selectedUrgency, moderation]);

  useEffect(() => {
    const loadId = window.setTimeout(loadRequests, 0);
    return () => window.clearTimeout(loadId);
  }, [loadRequests, listRetry]);

  useEffect(() => {
    getServiceRequestDropdowns()
      .then((response) => setInspectionVerticals(response.data?.inspectionVerticals || []))
      .catch((error) => console.error("Failed to load inspection catalogue:", error));
  }, []);

  useEffect(() => {
    if (!requestToDelete) return undefined;
    const previouslyFocused = document.activeElement;
    const focusId = window.setTimeout(() => deleteCancelRef.current?.focus(), 0);
    const handleKeyDown = (event) => {
      if (event.key === "Escape" && !deletionInFlightRef.current) {
        setRequestToDelete(null);
        setDeleteError("");
      }
      if (event.key === "Tab") {
        const focusable = deleteDialogRef.current?.querySelectorAll("button:not(:disabled)");
        if (!focusable?.length) return;
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (!deleteDialogRef.current?.contains(document.activeElement)) {
          event.preventDefault();
          first.focus();
        } else if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      window.clearTimeout(focusId);
      document.removeEventListener("keydown", handleKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [requestToDelete]);

  const serviceTypes = [
    "All Types",
    ...inspectionVerticals.flatMap((vertical) => (vertical.methods || []).map((method) => method.name)),
    "Other",
  ];
  const statuses = ["All Statuses", "open", "assigned", "in progress", "completed"];
  const urgencies = ["Any Urgency", "routine", "urgent", "emergency"];

  const getPageSubtitle = () => {
    if (isSuperAdmin()) return "All maritime requests across the platform.";
    if (isExpert()) return "Requests available or assigned to you for quotation.";
    return "Your maritime survey, inspection, and audit requests.";
  };

  const getQuotationText = (request) => {
    if (isClient()) {
      const hasAccepted = (request.quotations || []).some(
        (q) => q.status === "accepted"
      );

      return hasAccepted ? "approved quotation" : "hidden until approved";
    }

    const count = request.quotationCount || request.quotation_count || 0;
    return `${count} ${count === 1 ? "quotation" : "quotations"}`;
  };

  const closeDeleteModal = () => {
    if (deletionInFlightRef.current) return;
    setRequestToDelete(null);
    setDeleteError("");
  };

  const handleDeleteRequest = async () => {
    if (!requestToDelete || deletionInFlightRef.current) return;
    deletionInFlightRef.current = true;
    setDeletingRequest(true);
    setDeleteError("");
    try {
      await deleteServiceRequest(requestToDelete.id);
      setRequests((current) => current.filter((request) => request.id !== requestToDelete.id));
      setNotice(`“${requestToDelete.title || "Service request"}” was deleted.`);
      setRequestToDelete(null);
    } catch (error) {
      setDeleteError(
        error.response?.data?.message || "Failed to delete this service request."
      );
    } finally {
      deletionInFlightRef.current = false;
      setDeletingRequest(false);
    }
  };

  const handleApprove = async (request) => {
    if (!window.confirm("Approve this request and notify all active Consultants?")) return;
    setApprovingId(request.id); setNotice("");
    try {
      const response = await approveServiceRequest(request.id);
      if (moderation === "pending") setRequests((current) => current.filter((item) => item.id !== request.id));
      else setRequests((current) => current.map((item) => item.id === request.id ? response.data : item));
      setNotice("Request approved. Eligible Consultants were notified.");
    } catch (error) { setNotice(error.response?.data?.message || "Approval failed."); }
    finally { setApprovingId(null); }
  };

  const beginEdit = (request) => {
    setEditFieldErrors({});
    setEditingRequest({
    id: request.id,
    moderationStatus: request.moderationStatus,
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
  };

  const saveEdit = async () => {
    const nextErrors = {};
    const serviceTypeOther = editingRequest.serviceTypeOther.trim();
    if (editingRequest.serviceType === "Other") {
      if (!serviceTypeOther) nextErrors.serviceTypeOther = "Please describe the required service.";
      else if (serviceTypeOther.length < 3) nextErrors.serviceTypeOther = "Service details must be at least 3 characters.";
      else if (serviceTypeOther.length > 500) nextErrors.serviceTypeOther = "Service details must be 500 characters or fewer.";
    } else if (!editingRequest.inspectionMethodId) {
      nextErrors.inspectionMethodId = "Select a service.";
    }
    if (Object.keys(nextErrors).length) {
      setEditFieldErrors(nextErrors);
      return;
    }
    setEditSaving(true);
    try {
      const response = await updateServiceRequest(editingRequest.id, {
        ...editingRequest,
        ...requestPortPayload(editingRequest),
        inspectionMethodId: editingRequest.serviceType === "Other" ? null : Number(editingRequest.inspectionMethodId),
        serviceCategory: editingRequest.serviceType === "Other" ? "Other" : editingRequest.serviceCategory,
        serviceTypeOther: editingRequest.serviceType === "Other" ? serviceTypeOther : null,
      });
      setRequests((current) => current.map((item) => item.id === editingRequest.id ? response.data : item));
      setEditingRequest(null); setNotice(response.message || "Request updated.");
    } catch (error) {
      setEditFieldErrors(error.response?.data?.field_errors || {});
      setNotice(error.response?.data?.message || "Request update failed.");
    }
    finally { setEditSaving(false); }
  };

  return (
    <div className="requests-page np-page-container np-page-container--operations">
      <div className="requests-header np-page-header">
        <div className="requests-header-content">
          <h1>Service Requests</h1>
          <p>{getPageSubtitle()}</p>
        </div>

        <div className="requests-header-actions np-action-bar">
          {(isClient() || isSuperAdmin()) && (
            <button
              type="button"
              onClick={() => navigate("/requests/new")}
              className="post-request-btn"
            >
              <Plus size={17} />
              {isSuperAdmin() ? "Create Service Request" : "Post New Request"}
            </button>
          )}
        </div>
      </div>

      {isSuperAdmin() && <div className="moderation-tabs" role="group" aria-label="Request review status">
        {["pending", "approved", "rejected", "all"].map((item) => <button type="button" aria-pressed={moderation === item} className={moderation === item ? "active" : ""} key={item} onClick={() => setModeration(item)}>{item[0].toUpperCase() + item.slice(1)}</button>)}
      </div>}

      {notice && (
        <div className="request-notice">
          <span>{notice}</span>
          <button type="button" aria-label="Dismiss notice" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}

      <div className="requests-filters">
        <div className="filter-search">
          <label htmlFor="request-register-search">Search requests</label>
          <Search size={20} aria-hidden="true" />
          <input
            id="request-register-search"
            type="text"
            placeholder="Search requests..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <FilterDropdown
          label="Type"
          options={serviceTypes}
          value={selectedType}
          onChange={setSelectedType}
          setDropdownRef={(id, element) => { dropdownRefs.current[id] = element; }}
          openDropdown={openDropdown}
          setOpenDropdown={setOpenDropdown}
        />

        {!isExpert() && <FilterDropdown
          label="Status"
          options={statuses}
          value={selectedStatus}
          onChange={setSelectedStatus}
          setDropdownRef={(id, element) => { dropdownRefs.current[id] = element; }}
          openDropdown={openDropdown}
          setOpenDropdown={setOpenDropdown}
        />}
        {!isExpert() && <FilterDropdown
          label="Urgency"
          options={urgencies}
          value={selectedUrgency}
          onChange={setSelectedUrgency}
          setDropdownRef={(id, element) => { dropdownRefs.current[id] = element; }}
          openDropdown={openDropdown}
          setOpenDropdown={setOpenDropdown}
        />}
      </div>

      <div className="requests-register-summary" aria-live="polite">
        <strong className="tabular-nums">{loading || listError ? "—" : requests.length}</strong>
        <span>{loading ? "Loading the register…" : listError ? "Requests unavailable" : requests.length === 1 ? "request shown" : "requests shown"}</span>
        <span className="requests-register-summary__hint">Open a record for its scope, quotations and workflow.</span>
      </div>

      {loading ? (
        <div className="empty-state" role="status">
          <p>Loading requests…</p>
        </div>
      ) : listError ? (
        <div className="empty-state" role="alert"><strong>Requests could not be loaded</strong><p>{listError}</p><button type="button" onClick={() => setListRetry((value) => value + 1)}>Retry</button></div>
      ) : requests.length === 0 ? (
        <div className="empty-state">
          <Ship size={28} aria-hidden="true" />
          <strong>No matching requests</strong>
          <p>Try another search or adjust the filters.</p>
        </div>
      ) : (
        <div className="requests-list">
          {requests.map((request) => {
            if (isExpert()) return (
              <div key={request.id} className="request-card consultant-safe-card">
                <div className="request-record-top"><span className="request-identifier">Request #{request.id}</span><span className="request-record-context">Available inspection</span></div>
                <div className="request-main consultant-safe-grid">
                  <div><span>Services Required</span><strong>{request.inspectionType || "Not provided"}</strong></div>
                  <div><span>Ship Type</span><strong>{request.vesselType || "Not provided"}</strong></div>
                  <div><span>Date of Inspection</span><strong>{request.inspectionDate ? new Date(request.inspectionDate).toLocaleDateString() : "Not provided"}</strong></div>
                  <div><span>Port of Inspection</span><strong>{request.portOfInspection || "Not provided"}</strong><AdditionalPorts ports={request.ports}/></div>
                </div>
                <button type="button" onClick={() => navigate(`/requests/${request.id}`)} className="view-quote-btn">View Request</button>
              </div>
            );
            const vessel = request.vessel || {};
            const port = request.port || {};
            const editPermission = getRequestEditPermission(request, currentUser);
            const editLabel = isClient() && request.moderationStatus === "rejected" ? "Edit & Resubmit" : "Edit";

            const budget = requestBudgetPresentation(request, isClient() ? "client" : "admin");
            return (
              <div key={request.id} className="request-card">
                <div className="request-main">
                  <div className="request-record-top">
                    <span className="request-identifier">Request #{request.id}</span>
                    <div className="request-type-badges">
                    <span className={`urgency-badge ${request.urgency || ""}`}>
                      Priority: {request.urgency || "—"}
                    </span>
                    {request.moderationStatus && <span className={`moderation-badge moderation-${request.moderationStatus}`}>Review: {request.moderationStatus}</span>}
                    <span className={`status-badge ${request.status || ""}`}>
                      Work: {request.status || "—"}
                    </span>
                    </div>
                  </div>

                  <h2 className="request-title">{request.title || "Untitled request"}</h2>

                  <div className="request-details">
                    <div className="detail-item request-service-field">
                      <span className="request-field-label">Service</span>
                      <strong>{request.inspectionType || request.serviceType || request.service_type || "Not provided"}</strong>
                    </div>
                    <div className="detail-item">
                      <Ship size={16} aria-hidden="true" />
                      <strong>{vessel.name || vessel.vessel_name || "Vessel not added"}</strong>
                      {(vessel.imoNumber || vessel.imo_number) && (
                        <span>· IMO {vessel.imoNumber || vessel.imo_number}</span>
                      )}
                      {(vessel.flagState || vessel.flag_state) && (
                        <span>· {vessel.flagState || vessel.flag_state}</span>
                      )}
                    </div>

                    {(port.name || port.port_name) && (
                      <div className="detail-item">
                        <MapPin size={16} aria-hidden="true" />
                        {port.name || port.port_name}
                        {port.country ? `, ${port.country}` : ""}
                      </div>
                    )}

                    <div className="detail-item">
                      <Calendar size={16} aria-hidden="true" />
                      Due{" "}
                      {request.requiredBy || request.required_by
                        ? new Date(
                            request.requiredBy || request.required_by
                          ).toLocaleDateString("en-US", {
                            day: "numeric",
                            month: "short",
                            year: "numeric",
                          })
                        : "—"}
                    </div>
                  </div>
                </div>

                <div className="request-sidebar">
                  <div className="budget-section">
                    <div className="budget-label">
                      {budget.label}
                    </div>

                    <div className="budget-amount">{budget.value}</div>

                    <div className="quotations-count">
                      {getQuotationText(request)}
                    </div>
                  </div>

                  <div className="request-card-actions">
                    <button
                      type="button"
                      onClick={() => navigate(`/requests/${request.id}`)}
                      className="view-quote-btn"
                    >
                      View Details
                    </button>
                    {(isSuperAdmin() || isClient()) && <>
                      <button type="button" className="edit-request-btn" onClick={() => beginEdit(request)} disabled={!editPermission.allowed} title={editPermission.reason || undefined}><Edit3 size={15}/> {editLabel}</button>
                      {!editPermission.allowed && <small className="request-edit-lock-reason">{editPermission.reason}</small>}
                    </>}
                    {isSuperAdmin() && (
                      <>
                      {request.moderationStatus === "pending" && <button type="button" className="approve-request-btn" disabled={approvingId === request.id} onClick={() => handleApprove(request)}><CheckCircle2 size={15}/> {approvingId === request.id ? "Approving..." : "Approve"}</button>}
                      <button
                        type="button"
                        className="delete-request-btn"
                        onClick={() => { setDeleteError(""); setRequestToDelete(request); }}
                      >
                        <Trash2 size={15} /> Delete
                      </button></>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {requestToDelete && (
        <div className="delete-request-backdrop" role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) closeDeleteModal();
        }}>
          <section ref={deleteDialogRef} className="delete-request-dialog" role="dialog" aria-modal="true" aria-labelledby="delete-request-title">
            <h2 id="delete-request-title">Delete Service Request?</h2>
            <p>Are you sure you want to permanently delete “{requestToDelete.title || "Untitled request"}”? This action cannot be undone.</p>
            {deleteError && <div className="delete-request-error" role="alert">{deleteError}</div>}
            <div className="delete-request-actions">
              <button ref={deleteCancelRef} type="button" onClick={closeDeleteModal} disabled={deletingRequest}>Cancel</button>
              <button
                type="button"
                className="confirm-delete-request"
                disabled={deletingRequest}
                onClick={handleDeleteRequest}
              >
                {deletingRequest ? "Deleting..." : "Delete Request"}
              </button>
            </div>
          </section>
        </div>
      )}

      {editingRequest && <div className="request-edit-backdrop"><section className="request-edit-dialog" role="dialog" aria-modal="true" aria-labelledby="request-edit-title"><h2 id="request-edit-title">{isClient() && editingRequest.moderationStatus === "rejected" ? "Edit & Resubmit Request" : "Edit Request"}</h2><div className="request-edit-grid">
        <label className="wide">Services Required
          <InspectionCatalogueSelect
            verticals={inspectionVerticals}
            selectedMethodId={editingRequest.inspectionMethodId}
            isOther={editingRequest.serviceType === "Other"}
            otherValue={editingRequest.serviceTypeOther}
            error={editFieldErrors.inspectionMethodId}
            otherError={editFieldErrors.serviceTypeOther}
            onSelectMethod={(method, vertical) => {
              setEditFieldErrors({});
              setEditingRequest({
                ...editingRequest,
                inspectionMethodId: method.id,
                inspectionVertical: vertical.name,
                serviceType: method.name,
                serviceCategory: vertical.name,
                serviceTypeOther: "",
              });
            }}
            onSelectOther={() => {
              setEditFieldErrors({});
              setEditingRequest({
                ...editingRequest,
                inspectionMethodId: "",
                inspectionVertical: "Other",
                serviceType: "Other",
                serviceCategory: "Other",
                serviceTypeOther: "",
              });
            }}
            onOtherChange={(value) => {
              setEditFieldErrors({ ...editFieldErrors, serviceTypeOther: undefined });
              setEditingRequest({ ...editingRequest, serviceTypeOther: value });
            }}
          />
        </label>
        {[
          ["title","Title"],["urgency","Urgency"],["budgetUsd","Client Submitted Budget (USD)","number"],["requiredBy","Inspection date","date"],["vesselType","Ship type"],["flagState","Flag"],["eta","ETA","date"]
        ].map(([field,label,type="text"]) => <label key={field}>{label}<input type={type} value={editingRequest[field] ?? ""} onChange={(event) => setEditingRequest({...editingRequest,[field]:event.target.value})}/></label>)}
        {isClient() ? <div className="wide"><VesselIdentityFields value={editingRequest} disabled={editSaving} onChange={(patch) => setEditingRequest((current) => ({ ...current, ...patch }))} /></div> : <><label>Vessel name<input value={editingRequest.vesselName} onChange={(event) => setEditingRequest({ ...editingRequest, vesselName: event.target.value })} /></label><label>IMO number<input value={editingRequest.imoNumber} onChange={(event) => setEditingRequest({ ...editingRequest, imoNumber: event.target.value })} /></label></>}
        <div className="wide"><PortSelect ports={editingRequest.ports} originalPortSchedule={editingRequest.originalPortSchedule} disabled={editSaving} terminalName={editingRequest.terminalName} eta={editingRequest.eta} portId={editingRequest.portId} portName={editingRequest.portName} onChange={(patch) => setEditingRequest((current) => ({ ...current, ...patch }))} /></div>
        <label>Terminal<input maxLength={240} value={editingRequest.terminalName} onChange={(event) => setEditingRequest({ ...editingRequest, terminalName: event.target.value })} /></label>
        <AgentDetailsFields writeOnly={isClient()} value={editingRequest} errors={editFieldErrors} onChange={(patch) => setEditingRequest((current) => ({ ...current, ...patch }))} />
        <ScopeAssistant value={editingRequest} legacyCertification={requests.find((item) => item.id === editingRequest.id)?.requiredCertification} disabled={editSaving} onChange={(scopeOfWork) => setEditingRequest((current) => ({ ...current, scopeOfWork }))} />
        <label className="wide">Scope of work<ScopeEditor value={editingRequest.scopeOfWork} disabled={editSaving} onChange={(scopeOfWork) => setEditingRequest((current) => ({ ...current, scopeOfWork }))} /></label>
      </div><div className="request-edit-actions"><button type="button" disabled={editSaving} onClick={() => setEditingRequest(null)}>Cancel</button><button type="button" className="save" disabled={editSaving} onClick={saveEdit}>{editSaving ? "Saving..." : "Save Changes"}</button></div></section></div>}
    </div>
  );
}
