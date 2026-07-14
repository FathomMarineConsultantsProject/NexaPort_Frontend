import { Calendar, ChevronDown, MapPin, Plus, Search, Ship, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { deleteServiceRequest, getServiceRequests } from "../api/serviceRequestApi";
import { isClient, isExpert, isSuperAdmin } from "../utils/auth";

import "./ServiceRequests.css";

function FilterDropdown({ label, options, value, onChange, setDropdownRef, openDropdown, setOpenDropdown }) {
  const dropdownId = label.toLowerCase().replace(/\s/g, "-");
  return (
    <div className="filter-select" ref={(element) => setDropdownRef(dropdownId, element)}>
      <button type="button" onClick={() => setOpenDropdown(openDropdown === dropdownId ? null : dropdownId)} className="filter-select-trigger">
        <span>{value}</span><ChevronDown size={18} />
      </button>
      {openDropdown === dropdownId && (
        <div className="filter-select-menu">
          {options.map((option) => (
            <button type="button" key={option} className={`filter-option ${value === option ? "active" : ""}`} onClick={() => { onChange(option); setOpenDropdown(null); }}>
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

  const [notice, setNotice] = useState(location.state?.notice || "");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [requestToDelete, setRequestToDelete] = useState(null);
  const [deletingRequest, setDeletingRequest] = useState(false);
  const [deleteError, setDeleteError] = useState("");
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
    setLoading(true);

    try {
      const params = {};

      if (search) params.search = search;
      if (selectedType !== "All Types") params.type = selectedType;
      if (selectedStatus !== "All Statuses") params.status = selectedStatus;
      if (selectedUrgency !== "Any Urgency") params.urgency = selectedUrgency;

      const response = await getServiceRequests(params);

      // Backend now handles role filtering:
      // admin = all, expert = assigned/available, client = own.
      setRequests(response.data || []);
    } catch (error) {
      console.error("Failed to load requests:", error);
      setRequests([]);
    } finally {
      setLoading(false);
    }
  }, [search, selectedStatus, selectedType, selectedUrgency]);

  useEffect(() => {
    const loadId = window.setTimeout(loadRequests, 0);
    return () => window.clearTimeout(loadId);
  }, [loadRequests]);

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

  const serviceTypes = ["All Types", "Survey", "Inspection", "Audit"];
  const statuses = ["All Statuses", "open", "assigned", "in progress", "completed"];
  const urgencies = ["Any Urgency", "routine", "urgent", "emergency"];

  const getPageSubtitle = () => {
    if (isSuperAdmin()) return "All maritime requests across the platform.";
    if (isExpert()) return "Requests available or assigned to you for quotation.";
    return "Your maritime survey, inspection, and audit requests.";
  };

  const getBudgetLabel = (request) => {
    if (isClient()) {
      const acceptedQuote = (request.quotations || []).find(
        (q) => q.status === "accepted"
      );

      if (acceptedQuote?.clientTotalUsd || acceptedQuote?.client_total_usd) {
        return `$${Number(
          acceptedQuote.clientTotalUsd || acceptedQuote.client_total_usd
        ).toLocaleString()}`;
      }

      return request.status === "assigned"
        ? `$${Number(request.budgetUsd || request.budget_usd || 0).toLocaleString()}`
        : "Awaiting approval";
    }

    return `$${Number(request.budgetUsd || request.budget_usd || 0).toLocaleString()}`;
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

  return (
    <div className="requests-page">
      <div className="requests-header">
        <div className="requests-header-content">
          <h1>Service Requests</h1>
          <p>{getPageSubtitle()}</p>
        </div>

        <div className="requests-header-actions">
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

      {notice && (
        <div className="request-notice">
          <span>{notice}</span>
          <button type="button" onClick={() => setNotice("")}>
            ×
          </button>
        </div>
      )}

      <div className="requests-filters">
        <div className="filter-search">
          <Search size={20} />
          <input
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

        <FilterDropdown
          label="Status"
          options={statuses}
          value={selectedStatus}
          onChange={setSelectedStatus}
          setDropdownRef={(id, element) => { dropdownRefs.current[id] = element; }}
          openDropdown={openDropdown}
          setOpenDropdown={setOpenDropdown}
        />

        <FilterDropdown
          label="Urgency"
          options={urgencies}
          value={selectedUrgency}
          onChange={setSelectedUrgency}
          setDropdownRef={(id, element) => { dropdownRefs.current[id] = element; }}
          openDropdown={openDropdown}
          setOpenDropdown={setOpenDropdown}
        />
      </div>

      {loading ? (
        <div className="empty-state">
          <p>Loading requests...</p>
        </div>
      ) : requests.length === 0 ? (
        <div className="empty-state">
          <Ship size={64} />
          <p>No service requests found</p>
        </div>
      ) : (
        <div className="requests-list">
          {requests.map((request) => {
            const vessel = request.vessel || {};
            const port = request.port || {};

            return (
              <div key={request.id} className="request-card">
                <div className="request-main">
                  <div className="request-type-badges">
                    <span className="request-type-badge">
                      {request.serviceType || request.service_type || "-"}
                    </span>
                    <span className="request-category-badge">
                      {request.serviceCategory || request.service_category || "-"}
                    </span>
                    <span className={`urgency-badge ${request.urgency || ""}`}>
                      {request.urgency || "-"}
                    </span>
                    <span className={`status-badge ${request.status || ""}`}>
                      {request.status || "-"}
                    </span>
                  </div>

                  <h2 className="request-title">{request.title || "Untitled request"}</h2>

                  <div className="request-details">
                    <div className="detail-item">
                      <Ship size={16} />
                      <strong>{vessel.name || vessel.vessel_name || "Vessel not added"}</strong>
                      {(vessel.imoNumber || vessel.imo_number) && (
                        <span>· IMO {vessel.imoNumber || vessel.imo_number}</span>
                      )}
                      {(vessel.flagState || vessel.flag_state) && (
                        <span>· {vessel.flagState || vessel.flag_state}</span>
                      )}
                    </div>

                    <div className="detail-item">
                      <MapPin size={16} />
                      {port.name || port.port_name || "-"},{" "}
                      {port.country || "-"}
                    </div>

                    <div className="detail-item">
                      <Calendar size={16} />
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
                      {isClient() ? "Final Cost" : "Budget"}
                    </div>

                    <div className="budget-amount">{getBudgetLabel(request)}</div>

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
                    {isSuperAdmin() && (
                      <button
                        type="button"
                        className="delete-request-btn"
                        onClick={() => { setDeleteError(""); setRequestToDelete(request); }}
                      >
                        <Trash2 size={15} /> Delete
                      </button>
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
    </div>
  );
}
