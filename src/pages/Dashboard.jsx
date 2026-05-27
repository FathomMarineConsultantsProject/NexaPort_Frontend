import {
  AlertTriangle,
  Anchor,
  ArrowRight,
  Briefcase,
  CheckCircle,
  Clock,
  Shield,
  Ship,
  Star,
  TrendingUp,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getDashboardStats } from "../api/Dashboardapi";
import "./Dashboard.css";

// Maps status string → CSS class (handles "in progress" with a space)
function statusClass(status) {
  if (!status) return "";
  const s = status.toLowerCase().trim();
  if (s === "in progress") return "in-progress";
  return s; // "open", "completed", etc. already work as-is
}

function UrgencyIcon({ type }) {
  if (type === "emergency") return <AlertTriangle size={15} />;
  if (type === "urgent") return <Clock size={15} />;
  return <CheckCircle size={15} />;
}

export default function Dashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentRequests, setRecentRequests] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboard();
  }, []);

  const loadDashboard = async () => {
    setLoading(true);
    try {
      const [dashRes, requestsRes] = await Promise.all([
        getDashboardStats(),
        fetch("https://nexa-port-backend.vercel.app/api/service-requests").then((r) =>
          r.json()
        ),
      ]);

      if (dashRes.success) setStats(dashRes.data);
      if (requestsRes.success) setRecentRequests(requestsRes.data || []);
    } catch (err) {
      console.error("Dashboard load error:", err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-loading">Loading dashboard...</div>
      </div>
    );
  }

  const cards = stats?.cards || {};
  const serviceTypes = stats?.requests_by_service_type || [];
  const urgencies = stats?.urgency_distribution || [];
  const financial = stats?.financial_overview || {};
  const topExperts = stats?.top_rated_experts || [];

  const totalST = serviceTypes.reduce((s, r) => s + r.count, 0) || 1;
  const totalUg = urgencies.reduce((s, r) => s + r.count, 0) || 1;

  const serviceTypeColor = { Survey: "survey", Inspection: "inspection", Audit: "audit" };

  return (
    <div className="dashboard-page">
      {/* Header */}
      <div className="dashboard-header">
        <h1>Maritime Dashboard</h1>
        <p>Real-time overview of NexaPort marketplace activity.</p>
      </div>

      {/* Stat Cards */}
      <div className="stat-cards-row">
        <div className="stat-card">
          <div className="stat-card-label"><Anchor size={14} /> Total Requests</div>
          <div className="stat-card-value">{cards.total_requests ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label"><Briefcase size={14} /> Open Requests</div>
          <div className="stat-card-value">{cards.open_requests ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label"><Shield size={14} /> Verified Experts</div>
          <div className="stat-card-value">{cards.verified_experts ?? 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-card-label"><Ship size={14} /> Vessels Registered</div>
          <div className="stat-card-value">{cards.vessels_registered ?? 0}</div>
        </div>
      </div>

      {/* Charts */}
      <div className="charts-row">
        <div className="chart-card">
          <h2>Requests by Service Type</h2>
          <div className="bar-chart-list">
            {serviceTypes.length > 0 ? (
              serviceTypes.map((row) => {
                const pct = Math.round((row.count / totalST) * 100);
                const color = serviceTypeColor[row.service_type] || "audit";
                return (
                  <div key={row.service_type} className="bar-chart-item">
                    <div className="bar-chart-meta">
                      <span className="bar-chart-name">{row.service_type}</span>
                      <span className="bar-chart-count">{row.count} ({pct}%)</span>
                    </div>
                    <div className="bar-track">
                      <div className={`bar-fill ${color}`} style={{ width: `${pct}%` }} />
                    </div>
                  </div>
                );
              })
            ) : (
              <p style={{ color: "#94a3b8", fontSize: "14px" }}>No data</p>
            )}
          </div>
        </div>

        <div className="chart-card">
          <h2>Urgency Distribution</h2>
          <div className="bar-chart-list">
            {["emergency", "urgent", "routine"].map((level) => {
              const row = urgencies.find((r) => r.urgency === level) || { count: 0 };
              const pct = Math.round((row.count / totalUg) * 100);
              return (
                <div key={level} className="bar-chart-item">
                  <div className="bar-chart-meta">
                    <span className="urgency-icon">
                      <UrgencyIcon type={level} />
                      {level.charAt(0).toUpperCase() + level.slice(1)}
                    </span>
                    <span className="bar-chart-count">{row.count} ({pct}%)</span>
                  </div>
                  <div className="bar-track">
                    <div className={`bar-fill ${level}`} style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Financial + Top Experts */}
      <div className="lower-row">
        <div className="financial-card">
          <div className="financial-card-header">
            <TrendingUp size={20} /> Financial Overview
          </div>
          <div className="financial-stats">
            <div>
              <div className="financial-stat-label">Avg. Budget per Request</div>
              <div className="financial-stat-value">
                ${Number(financial.avg_budget_per_request || 0).toLocaleString(undefined, {
                  minimumFractionDigits: 0,
                  maximumFractionDigits: 0,
                })}
              </div>
            </div>
            <div>
              <div className="financial-stat-label">Completed Requests</div>
              <div className="financial-stat-value dark">
                {financial.completed_requests ?? 0}
              </div>
            </div>
          </div>
        </div>

        <div className="experts-card">
          <div className="experts-card-header"><h2>Top-Rated Experts</h2></div>

          {topExperts.map((expert) => {
            const initial = expert.full_name?.trim()?.[0]?.toUpperCase() || "E";
            const location = [expert.base_location, expert.country].filter(Boolean).join(", ");
            return (
              <div
                key={expert.id}
                className="expert-row"
                onClick={() => navigate(`/experts/${expert.id}`)}
              >
                <div className="expert-avatar-sm">{initial}</div>
                <div className="expert-row-info">
                  <div className="expert-row-name">{expert.full_name}</div>
                  {location && <div className="expert-row-location">{location}</div>}
                </div>
                <div className="expert-row-right">
                  {expert.is_premium
                    ? <span className="premium-badge-sm">Premium</span>
                    : <span className="approved-badge-sm">Approved</span>
                  }
                  <div className="expert-rating-sm">
                    <Star size={14} fill="#14b8a6" />
                    {Number(expert.rating || 0).toFixed(1)}
                  </div>
                </div>
              </div>
            );
          })}

          <Link to="/experts" className="view-all-experts-btn">
            View All Experts <ArrowRight size={16} />
          </Link>
        </div>
      </div>

      {/* Recent Service Requests */}
      <div className="recent-requests-section">
        <div className="recent-requests-header">
          <h2>Recent Service Requests</h2>
          <Link to="/requests" className="all-requests-link">
            All Requests <ArrowRight size={16} />
          </Link>
        </div>

        {recentRequests.length === 0 ? (
          <div style={{ padding: "32px 28px", color: "#94a3b8", fontSize: "14px" }}>
            No service requests yet
          </div>
        ) : (
          recentRequests.map((req) => (
            <Link to={`/requests/${req.id}`} key={req.id} className="recent-request-row">
              <div className="recent-request-left">
                <div className="recent-request-badges">
                  <span className={`rr-urgency ${req.urgency}`}>{req.urgency}</span>
                  <span className={`rr-status ${statusClass(req.status)}`}>{req.status}</span>
                  <span className="rr-category">{req.serviceCategory}</span>
                </div>
                <div className="recent-request-title">{req.title}</div>
                <div className="recent-request-meta">
                  {req.port?.name && <span>{req.port.name}</span>}
                  {req.requiredBy && (
                    <span>
                      {" · "}Due{" "}
                      {new Date(req.requiredBy).toLocaleDateString("en-US", {
                        day: "numeric",
                        month: "short",
                        year: "numeric",
                      })}
                    </span>
                  )}
                </div>
              </div>
              <div className="recent-request-right">
                <div className="rr-budget">
                  ${Number(req.budgetUsd || 0).toLocaleString()}
                </div>
                <div className="rr-quotes">
                  {req.quotationCount} {req.quotationCount === 1 ? "quote" : "quotes"}
                </div>
              </div>
            </Link>
          ))
        )}
      </div>
    </div>
  );
}