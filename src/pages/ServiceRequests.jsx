import { Link } from "react-router-dom";
import { Calendar, ChevronDown, MapPin, Search, Ship } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getServiceRequests } from "../api/serviceRequestApi";
import "./ServiceRequests.css";

export default function ServiceRequests() {
    const navigate = useNavigate();
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState("");

    // Filter states
    const [selectedType, setSelectedType] = useState("All Types");
    const [selectedStatus, setSelectedStatus] = useState("All Statuses");
    const [selectedUrgency, setSelectedUrgency] = useState("Any Urgency");

    const [openDropdown, setOpenDropdown] = useState(null);
    const dropdownRefs = useRef({});

    useEffect(() => {
        loadRequests();
    }, []);

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
            setRequests(response.data || []);
        } catch (error) {
            console.error("Failed to load requests:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadRequests();
    }, [search, selectedType, selectedStatus, selectedUrgency]);

    const serviceTypes = ["All Types", "Survey", "Inspection", "Audit"];
    const statuses = ["All Statuses", "open", "in progress", "completed"];
    const urgencies = ["Any Urgency", "routine", "urgent", "emergency"];

    const FilterDropdown = ({ label, options, value, onChange }) => {
        const dropdownId = label.toLowerCase().replace(/\s/g, "-");

        return (
            <div className="filter-select" ref={(el) => (dropdownRefs.current[dropdownId] = el)}>
                <button
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
                    <p>Open maritime surveys, inspections, and audits seeking certified experts.</p>
                </div>
                <button onClick={() => navigate("/requests/new")} className="post-request-btn">
                    Post New Request
                </button>
            </div>

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
                    {requests.map((request) => (
                        <div key={request.id} className="request-card">
                            <div className="request-main">
                                <div className="request-type-badges">
                                    <span className="request-type-badge">{request.serviceType}</span>
                                    <span className="request-category-badge">{request.serviceCategory}</span>
                                    <span className={`urgency-badge ${request.urgency}`}>
                                        {request.urgency}
                                    </span>
                                    <span className={`status-badge ${request.status}`}>
                                        {request.status}
                                    </span>
                                </div>

                                <h2 className="request-title">{request.title}</h2>

                                <div className="request-details">
                                    <div className="detail-item">
                                        <Ship size={16} />
                                        <strong>{request.vessel.name}</strong>
                                        <span>· IMO {request.vessel.imoNumber}</span>
                                        {request.vessel.flagState && <span>· {request.vessel.flagState}</span>}
                                    </div>

                                    <div className="detail-item">
                                        <MapPin size={16} />
                                        {request.port.name}, {request.port.country}
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
                                    <div className="budget-label">Budget</div>
                                    <div className="budget-amount">
                                        ${Number(request.budgetUsd || 0).toLocaleString()}
                                    </div>
                                    <div className="quotations-count">
                                        {request.quotationCount} {request.quotationCount === 1 ? "quotation" : "quotations"}
                                    </div>
                                </div>

                                <button
                                    onClick={() => navigate(`/requests/${request.id}`)}
                                    className="view-quote-btn"
                                >
                                    <Link to={`/requests/${request.id}`} className="view-quote-btn">
                                        View & Quote
                                    </Link>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}