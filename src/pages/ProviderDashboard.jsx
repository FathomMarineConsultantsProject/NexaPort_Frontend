import { AlertCircle, Building2, ExternalLink } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getProviderDashboard } from "../api/Dashboardapi";
import { DashboardKpiCard, DashboardLoading, DashboardStatus } from "../components/dashboard/DashboardPrimitives";
import "./Dashboard.css";
import "./ProviderDashboard.css";

const TYPE_LABELS = {
  service_provider: "Service Provider",
  ship_agent: "Ship Agent",
  supplier: "Supplier",
  shipyard: "Shipyard",
  tug_boat: "Tug Boat",
};

const formatTypes = (types) =>
  (types || []).map((t) => TYPE_LABELS[t] || t.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase())).join(" · ");

export default function ProviderDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await getProviderDashboard();
      setData(response.data);
    } catch (err) {
      setError(
        err.response?.status === 404
          ? "No company profile is linked to this account. Please contact support."
          : err.response?.data?.message || "Unable to load dashboard. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadId = window.setTimeout(load, 0);
    return () => window.clearTimeout(loadId);
  }, [load]);

  if (loading) {
    return (
      <main className="dashboard-page"><DashboardLoading /></main>
    );
  }

  if (error) {
    return (
      <div className="dashboard-page">
        <div className="dashboard-error">
          <strong>Dashboard unavailable</strong>
          <span>{error}</span>
          <button type="button" onClick={load}>Retry</button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const { company, summary, profile_setup: setup, services, ports, branches, products, credentials } = data;
  const reviewStatus = company.review_status === "pending" ? "Pending Review" : company.review_status;
  const hasProducts = (company.types || []).includes("supplier") && products.length > 0;
  const hasCredentials = (credentials.certifications?.length || 0) + (credentials.class_approvals?.length || 0) + (credentials.memberships?.length || 0) > 0;
  const credentialTotal = (summary.certifications || 0) + (summary.class_approvals || 0) + (summary.memberships || 0);

  return (
    <main className="dashboard-page">
      <header className="dashboard-page__header">
        <div>
          <span className="dashboard-eyebrow">Provider operations</span>
          <h1>Company dashboard</h1>
          <p>{company.company_name || "Untitled Company"}{company.types?.length > 0 ? ` · ${formatTypes(company.types)}` : ""}</p>
        </div>
        <Link to="/company-profile" className="pd-header-action">
          <Building2 size={14} /> Edit Company Profile
        </Link>
      </header>

      <div className="pd-status-bar">
        <span className="pd-status-label">Directory status</span>
        <DashboardStatus value={reviewStatus} />
        {company.review_status === "rejected" && company.rejection_reason && (
          <span className="pd-rejection-reason">{company.rejection_reason}</span>
        )}
      </div>

      <div className="dashboard-kpi-grid dashboard-kpi-grid--provider">
        <DashboardKpiCard label="Services listed" value={summary.services} />
        <DashboardKpiCard label="Ports covered" value={summary.ports} />
        <DashboardKpiCard label="Branches" value={summary.branches} />
        {hasProducts ? (
          <DashboardKpiCard label="Products" value={summary.products} />
        ) : credentialTotal > 0 ? (
          <DashboardKpiCard label="Credentials" value={credentialTotal} note={[
            summary.certifications && `${summary.certifications} cert`,
            summary.class_approvals && `${summary.class_approvals} class`,
            summary.memberships && `${summary.memberships} membership`,
          ].filter(Boolean).join(", ")} />
        ) : null}
        <DashboardKpiCard label="Profile setup" value={`${setup.completed_sections} / ${setup.total_sections}`} note="sections complete" priority={setup.missing.length > 0} />
      </div>

      {setup.missing.length > 0 && (
        <div className="dashboard-section dashboard-section--urgent">
          <div className="dashboard-section__header">
            <div>
              <h2>Profile Setup</h2>
              <p>{setup.missing.length} section{setup.missing.length !== 1 ? "s" : ""} incomplete</p>
            </div>
            <Link to="/company-profile">Update in Company Profile</Link>
          </div>
          <ul className="pd-missing-list">
            {setup.missing.map((item) => (
              <li key={item}>
                <AlertCircle size={13} />
                {item}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="dashboard-section">
        <div className="dashboard-section__header">
          <h2>Company Overview</h2>
        </div>
        <div className="pd-overview">
          <dl className="pd-overview-grid">
            <div>
              <dt>Company Name</dt>
              <dd>{company.company_name || "—"}</dd>
            </div>
            <div>
              <dt>Type</dt>
              <dd>{formatTypes(company.types) || "—"}</dd>
            </div>
            <div>
              <dt>Country</dt>
              <dd>{company.country || "—"}</dd>
            </div>
            <div>
              <dt>City</dt>
              <dd>{company.city || "—"}</dd>
            </div>
            <div>
              <dt>Public Email</dt>
              <dd>{company.public_email || "—"}</dd>
            </div>
            <div>
              <dt>Public Phone</dt>
              <dd>{company.public_phone || "—"}</dd>
            </div>
            <div>
              <dt>Website</dt>
              <dd>
                {company.website ? (
                  <a href={company.website} target="_blank" rel="noopener noreferrer" className="pd-website-link">
                    {company.website.replace(/^https?:\/\//, "").replace(/\/$/, "")}
                    <ExternalLink size={11} />
                  </a>
                ) : "—"}
              </dd>
            </div>
          </dl>
        </div>
      </div>

      <div className="dashboard-section">
        <div className="dashboard-section__header">
          <div>
            <h2>Services</h2>
            {summary.services > services.length && <p>Showing {services.length} of {summary.services}</p>}
          </div>
        </div>
        {services.length === 0 ? (
          <div className="dashboard-empty">No services have been added yet.</div>
        ) : (
          <div className="dashboard-table-wrap">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Service</th>
                  <th>Category</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {services.map((s) => (
                  <tr key={s.id}>
                    <td data-label="Service">{s.service_name}</td>
                    <td data-label="Category">{s.category || "—"}</td>
                    <td data-label="Type">{s.service_type || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="dashboard-section">
        <div className="dashboard-section__header">
          <div>
            <h2>Ports Covered</h2>
            {summary.ports > ports.length && <p>Showing {ports.length} of {summary.ports}</p>}
          </div>
        </div>
        {ports.length === 0 ? (
          <div className="dashboard-empty">No service ports have been added yet.</div>
        ) : (
          <div className="dashboard-table-wrap">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Port</th>
                  <th>Country</th>
                </tr>
              </thead>
              <tbody>
                {ports.map((p) => (
                  <tr key={p.id}>
                    <td data-label="Port">{p.port_name}</td>
                    <td data-label="Country">{p.country || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="dashboard-section">
        <div className="dashboard-section__header">
          <div>
            <h2>Branches / Offices</h2>
            {summary.branches > branches.length && <p>Showing {branches.length} of {summary.branches}</p>}
          </div>
        </div>
        {branches.length === 0 ? (
          <div className="dashboard-empty">No branches have been added.</div>
        ) : (
          <div className="dashboard-table-wrap">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Branch</th>
                  <th>Type</th>
                  <th>City</th>
                  <th>Country</th>
                  <th>Contact</th>
                </tr>
              </thead>
              <tbody>
                {branches.map((b) => (
                  <tr key={b.id}>
                    <td data-label="Branch">{b.branch_name}</td>
                    <td data-label="Type">{b.branch_type || "—"}</td>
                    <td data-label="City">{b.city || "—"}</td>
                    <td data-label="Country">{b.country || "—"}</td>
                    <td data-label="Contact">{b.public_email || b.public_telephone || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {hasProducts && (
        <div className="dashboard-section">
          <div className="dashboard-section__header">
            <div>
              <h2>Products</h2>
              {summary.products > products.length && <p>Showing {products.length} of {summary.products}</p>}
            </div>
          </div>
          <div className="dashboard-table-wrap">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Manufacturer</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p) => (
                  <tr key={p.id}>
                    <td data-label="Product">{p.product_name}</td>
                    <td data-label="Category">{p.category || "—"}</td>
                    <td data-label="Manufacturer">{p.manufacturer || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {hasCredentials && (
        <div className="dashboard-section">
          <div className="dashboard-section__header">
            <div>
              <h2>Credentials</h2>
              <p>
                {[
                  summary.certifications && `${summary.certifications} certification${summary.certifications !== 1 ? "s" : ""}`,
                  summary.class_approvals && `${summary.class_approvals} class approval${summary.class_approvals !== 1 ? "s" : ""}`,
                  summary.memberships && `${summary.memberships} membership${summary.memberships !== 1 ? "s" : ""}`,
                ].filter(Boolean).join(" · ")}
              </p>
            </div>
          </div>
          <div className="dashboard-table-wrap">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Credential</th>
                  <th>Type</th>
                  <th>Detail</th>
                </tr>
              </thead>
              <tbody>
                {credentials.certifications.map((c) => (
                  <tr key={`cert-${c.id}`}>
                    <td data-label="Credential">{c.certification_name}</td>
                    <td data-label="Type">Certification</td>
                    <td data-label="Detail">{[c.issuer, c.standard_code].filter(Boolean).join(" · ") || "—"}</td>
                  </tr>
                ))}
                {credentials.class_approvals.map((c) => (
                  <tr key={`ca-${c.id}`}>
                    <td data-label="Credential">{c.society_name}</td>
                    <td data-label="Type">Class Approval</td>
                    <td data-label="Detail">{c.approval_details || "—"}</td>
                  </tr>
                ))}
                {credentials.memberships.map((m) => (
                  <tr key={`mem-${m.id}`}>
                    <td data-label="Credential">{m.organization_name}</td>
                    <td data-label="Type">Membership</td>
                    <td data-label="Detail">{m.membership_details || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

    </main>
  );
}
