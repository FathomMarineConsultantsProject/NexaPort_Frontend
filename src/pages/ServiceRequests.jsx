import { Calendar, ChevronDown, MapPin, Search, Ship } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { getServiceRequests } from "../api/serviceRequestApi";
import { isClient, isExpert, isSuperAdmin } from "../utils/auth";

import "./ServiceRequests.css";

export default function ServiceRequests() {
  const navigate = useNavigate();
  const location = useLocation();

  const [notice, setNotice] = useState(location.state?.notice || "");
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  const [selectedType, setSelectedType] = useState("All Types");
  const [selectedStatus, setSelectedStatus] = useState("All Statuses");
  const [selectedUrgency, setSelectedUrgency] = useState("Any Urgency");

  const [openDropdown, setOpenDropdown] = useState(null);
  const dropdownRefs = useRef({});

  useEffect(() => {
    loadRequests();
  }, [search, selectedType, selectedStatus, selectedUrgency]);

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

  const loadRequests = async () => {
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
  };

  const serviceTypes = ["All Types", "Survey", "Inspection", "Audit"];
  const statuses = ["All Statuses", "open", "assigned", "in progress", "completed"];
  const urgencies = ["Any Urgency", "routine", "urgent", "emergency"];

  const FilterDropdown = ({ label, options, value, onChange }) => {
    const dropdownId = label.toLowerCase().replace(/\s/g, "-");

    return (
      <div
        className="filter-select"
        ref={(el) => (dropdownRefs.current[dropdownId] = el)}
      >
        <button
          type="button"
          onClick={() =>
            setOpenDropdown(openDropdown === dropdownId ? null : dropdownId)
          }
          className="filter-select-trigger"
        >
          <span>{value}</span>
          <ChevronDown size={18} />
        </button>

        {openDropdown === dropdownId && (
          <div className="filter-select-menu">
            {options.map((option) => (
              <button
                type="button"
                key={option}
                className={`filter-option ${value === option ? "active" : ""}`}
                onClick={() => {
                  onChange(option);
                  setOpenDropdown(null);
                }}
              >
                {option}
              </button>
            ))}
          </div>
        )}
      </div>
    );
  };

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

  return (
    <div className="requests-page">
      <div className="requests-header">
        <div className="requests-header-content">
          <h1>Service Requests</h1>
          <p>{getPageSubtitle()}</p>
        </div>

        {isClient() && (
          <button
            type="button"
            onClick={() => navigate("/requests/new")}
            className="post-request-btn"
          >
            Post New Request
          </button>
        )}
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
        />

        <FilterDropdown
          label="Status"
          options={statuses}
          value={selectedStatus}
          onChange={setSelectedStatus}
        />

        <FilterDropdown
          label="Urgency"
          options={urgencies}
          value={selectedUrgency}
          onChange={setSelectedUrgency}
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

                  <button
                    type="button"
                    onClick={() => navigate(`/requests/${request.id}`)}
                    className="view-quote-btn"
                  >
                    View Details
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}