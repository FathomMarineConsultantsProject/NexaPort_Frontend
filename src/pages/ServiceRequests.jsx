import { Calendar, ChevronDown, MapPin, Search, Ship } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { getServiceRequests } from "../api/serviceRequestApi";
// import { isClient } from "../utils/auth";
import "./ServiceRequests.css";
import { isClient, isExpert, isSuperAdmin } from "../utils/auth";

export default function ServiceRequests() {
    const navigate = useNavigate();
    const location = useLocation();
    const notice = location.state?.notice;
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
            setRequests(response.data || response.requests || []);
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

    const getVessel = (request) => request?.vessel || {};
    const getPort = (request) => request?.port || {};

    const FilterDropdown = ({ label, options, value, onChange }) => {
        const dropdownId = label.toLowerCase().replace(/\s/g, "-");

        return (
            <div className="filter-select" ref={(el) => (dropdownRefs.current[dropdownId] = el)}>
                <button
                    type="button"
                    onClick={() => setOpenDropdown(openDropdown === dropdownId ? null : dropdownId)}
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

    return (
        <div className="requests-page">
            <div className="requests-header">
                <div className="requests-header-content">
                    <h1>Service Requests</h1>
                    <p>Maritime surveys, inspections, and audits based on your access.</p>
                </div>

                {!isExpert() && (
                    <button onClick={() => navigate("/requests/new")} className="post-request-btn">
                        Post New Request
                    </button>
                )}
            </div>

            {notice && <div className="access-notice">{notice}</div>}

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

                {notice && <div className="request-access-notice">{notice}</div>}

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
                        const vessel = getVessel(request);
                        const port = getPort(request);

                        return (
                            <div key={request.id} className="request-card">
                                <div className="request-main">
                                    <div className="request-type-badges">
                                        <span className="request-type-badge">{request.serviceType || "Service"}</span>
                                        <span className="request-category-badge">
                                            {request.serviceCategory || "General"}
                                        </span>
                                        <span className={`urgency-badge ${request.urgency || ""}`}>
                                            {request.urgency || "routine"}
                                        </span>
                                        <span className={`status-badge ${request.status || ""}`}>
                                            {request.status || "open"}
                                        </span>
                                    </div>

                                    <h2 className="request-title">{request.title}</h2>

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
                                            {port.name || port.port_name || "Port not added"}
                                            {(port.country || request.country) && `, ${port.country || request.country}`}
                                        </div>

                                        <div className="detail-item">
                                            <Calendar size={16} />
                                            Due{" "}
                                            {request.requiredBy
                                                ? new Date(request.requiredBy).toLocaleDateString("en-US", {
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
                                        <div className="budget-label">{isExpert() ? "Status" : "Budget"}</div>
                                        <div className="budget-amount">
                                            {isExpert()
                                                ? request.status || "open"
                                                : `$${Number(request.budgetUsd || 0).toLocaleString()}`}
                                        </div>
                                        <div className="quotations-count">
                                            {Number(request.quotationCount || 0)}{" "}
                                            {Number(request.quotationCount || 0) === 1 ? "quotation" : "quotations"}
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => navigate(`/requests/${request.id}`)}
                                        className="view-quote-btn"
                                    >
                                        {isExpert() ? "View & Quote" : "View Details"}
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