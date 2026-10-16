import { useCallback, useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminDashboard } from "../api/Dashboardapi";
import { DashboardError, DashboardLoading, DashboardSection, DashboardStatus, DashboardTable } from "../components/dashboard/DashboardPrimitives";
import { formatDate, formatMoney, quotationValue, serviceName } from "../components/dashboard/dashboardFormatters";
import { adminDashboardMetrics, countLabel, usdLabel } from "./adminDashboardMetrics";
import "./Dashboard.css";
import "./AdminDashboard.css";

const requestLink = (row) => `/requests/${row.service_request_id || row.id}`;
const requestTitle = (row) => row.request_title || row.title || `Request #${row.service_request_id || row.id}`;
const workflowQueue = "/admin/inspection-workflows";

function ExecutiveMetric({ label, value, note, money = false, featured = false }) {
  return <div className={`admin-exec-metric${featured ? " admin-exec-metric--featured" : ""}`}>
    <span>{label}</span>
    <strong>{money ? usdLabel(value) : countLabel(value)}</strong>
    {note && <small>{note}</small>}
  </div>;
}

function AttentionItem({ label, value, detail, href, owner = "Admin" }) {
  return <Link className="admin-attention-item" to={href}>
    <strong>{countLabel(value)}</strong>
    <span><b>{label}</b><small>{detail}</small></span>
    <em>{owner}</em>
    <span className="admin-attention-item__arrow" aria-hidden="true">→</span>
  </Link>;
}

function PipelineChart({ metrics }) {
  const series = [
    ["Requests awaiting quotations", metrics.awaitingQuotations],
    ["Quotations requiring review", metrics.quotesToReview],
    ["Approved quotes ready for proposal", metrics.readyForProposal],
    ["Proposals awaiting clients", metrics.proposalsAwaitingClient],
    ["Active jobs", metrics.activeJobs],
  ];
  const known = series.map(([, value]) => value).filter((value) => value !== null);
  const maximum = known.length ? Math.max(...known) : null;
  return <section className="admin-chart-panel" aria-labelledby="admin-pipeline-title">
    <header><div><span className="admin-section-kicker">Marketplace operations</span><h2 id="admin-pipeline-title">Current pipeline</h2></div><p>Independent counts · not a conversion funnel</p></header>
    {maximum === null ? <p className="admin-chart-empty">Pipeline counts are unavailable.</p> : <>
      <div className="admin-pipeline-scale" aria-hidden="true"><span>0</span><span>{countLabel(maximum)} items</span></div>
      <div className="admin-pipeline-bars" role="list" aria-label="Current marketplace pipeline counts">
        {series.map(([label, value]) => <div className="admin-pipeline-row" role="listitem" key={label}>
          <span>{label}</span>
          <div className="admin-pipeline-track" aria-hidden="true"><i style={{ width: value === null || maximum === 0 ? "0%" : `${value / maximum * 100}%` }} /></div>
          <strong>{countLabel(value)}</strong>
        </div>)}
      </div>
      {maximum === 0 && <p className="admin-chart-empty">No items currently occupy these pipeline states.</p>}
    </>}
  </section>;
}

function AvailabilityChart({ availability }) {
  const { available, remaining, total } = availability || {};
  const share = total > 0 ? available / total * 100 : 0;
  return <section className="admin-chart-panel admin-chart-panel--availability" aria-labelledby="admin-availability-title">
    <header><div><span className="admin-section-kicker">Consultant network</span><h2 id="admin-availability-title">Profile availability</h2></div></header>
    {availability === null ? <p className="admin-chart-empty">Consultant availability is unavailable.</p> : <div className="admin-availability-layout">
      <div className="admin-availability-ring" aria-hidden="true">
        <svg viewBox="0 0 120 120" focusable="false"><circle className="admin-availability-ring__base" cx="60" cy="60" r="49" pathLength="100" /><circle className="admin-availability-ring__value" cx="60" cy="60" r="49" pathLength="100" strokeDasharray={`${share} ${100 - share}`} /></svg>
        <div><strong>{countLabel(total)}</strong><span>consultants</span></div>
      </div>
      <dl className="admin-availability-legend">
        <div><dt><i className="admin-legend-mark admin-legend-mark--available" />Marked available</dt><dd>{countLabel(available)}</dd></div>
        <div><dt><i className="admin-legend-mark admin-legend-mark--other" />Other profiles</dt><dd>{countLabel(remaining)}</dd></div>
      </dl>
      {total === 0 && <p className="admin-chart-empty">No consultant profiles yet.</p>}
    </div>}
    <p className="admin-availability-note">Based on profile status, not engagement or utilization.</p>
  </section>;
}

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const [activeTab, setActiveTab] = useState(0);
  const tabRefs = useRef([]);

  const load = useCallback(async () => {
    setLoading(true); setFailed(false);
    try {
      const response = await getAdminDashboard();
      if (!response.success) throw new Error("Dashboard request failed");
      setData(response.data);
    } catch (error) {
      console.error("Admin dashboard load error:", error);
      setFailed(true);
    } finally { setLoading(false); }
  }, []);

  useEffect(() => {
    const loadId = window.setTimeout(load, 0);
    return () => window.clearTimeout(loadId);
  }, [load]);

  if (loading) return <main className="dashboard-page dashboard-page--admin"><DashboardLoading /></main>;
  if (failed) return <main className="dashboard-page dashboard-page--admin"><DashboardError onRetry={load} /></main>;

  const metrics = adminDashboardMetrics(data?.kpis, data?.inspection_workflow);
  const workflow = data?.inspection_workflow || {};
  const tabs = [
    {
      id: "workflows", label: "Inspection Workflows", rows: workflow.recent, total: null,
      description: "Recent inspections requiring a workflow decision or handoff.",
      action: <Link to={workflowQueue}>Open workflow queue</Link>,
      columns: [
        { key: "request", label: "Request", render: requestTitle },
        { key: "vessel", label: "Vessel", render: (row) => row.vessel_name || "—" },
        { key: "stage", label: "Current stage", render: (row) => <DashboardStatus value={row.current_stage} /> },
        { key: "required", label: "Required by", render: (row) => formatDate(row.required_by) },
        { key: "action", label: "Action", primary: true, render: () => "Open Workflow" },
      ],
      href: (row) => `/admin/inspection-workflow/${row.service_request_id}`,
      empty: "No inspection workflows currently require action.",
    },
    {
      id: "approvals", label: "Request Approvals", rows: data?.pending_moderations, total: metrics.pendingModeration,
      description: "Oldest service requests awaiting moderation first.",
      action: <Link to="/requests">Open request register</Link>,
      columns: [
        { key: "request", label: "Request", primary: true, render: requestTitle },
        { key: "client", label: "Client", render: (row) => row.client_name || "—" },
        { key: "vessel", label: "Vessel", render: (row) => row.vessel_name || "—" },
        { key: "service", label: "Service", render: serviceName },
        { key: "submitted", label: "Submitted", render: (row) => formatDate(row.created_at) },
        { key: "required", label: "Required by", render: (row) => formatDate(row.required_by) },
        { key: "status", label: "Status", render: (row) => <DashboardStatus value={row.moderation_status} /> },
      ],
      href: requestLink, empty: "No requests are awaiting moderation.",
    },
    {
      id: "quotations", label: "Quotation Reviews", rows: data?.quotes_for_review, total: metrics.quotesToReview,
      description: "Consultant quotations awaiting Admin review before a client proposal.",
      action: <Link to={workflowQueue}>Open workflow queue</Link>,
      columns: [
        { key: "request", label: "Request", primary: true, render: requestTitle },
        { key: "consultant", label: "Consultant", render: (row) => row.consultant_name || "—" },
        { key: "submitted", label: "Submitted", render: (row) => formatDate(row.created_at) },
        { key: "value", label: "Consultant quote", render: (row) => formatMoney(quotationValue(row)) },
        { key: "status", label: "Status", render: (row) => <DashboardStatus value={row.internal_review_status || row.status} /> },
      ],
      href: requestLink, empty: "No quotations are awaiting review.",
    },
    {
      id: "jobs", label: "Active Jobs", rows: data?.active_jobs, total: metrics.activeJobs,
      description: "Assigned and active marketplace inspections.",
      action: <Link to="/requests">Open request register</Link>,
      columns: [
        { key: "request", label: "Request", primary: true, render: requestTitle },
        { key: "client", label: "Client", render: (row) => row.client_name || "—" },
        { key: "consultant", label: "Consultant", render: (row) => row.consultant_name || "—" },
        { key: "vessel", label: "Vessel", render: (row) => row.vessel_name || "—" },
        { key: "port", label: "Port", render: (row) => row.port_name || "—" },
        { key: "required", label: "Required by", render: (row) => formatDate(row.required_by) },
        { key: "status", label: "Status", render: (row) => <DashboardStatus value={row.status} /> },
      ],
      href: requestLink, empty: "No jobs are currently active.",
    },
  ];
  const current = tabs[activeTab];
  const onTabKeyDown = (event, index) => {
    const next = event.key === "ArrowRight" ? (index + 1) % tabs.length
      : event.key === "ArrowLeft" ? (index + tabs.length - 1) % tabs.length
        : event.key === "Home" ? 0 : event.key === "End" ? tabs.length - 1 : null;
    if (next === null) return;
    event.preventDefault();
    setActiveTab(next);
    tabRefs.current[next]?.focus();
  };

  return <main className="dashboard-page dashboard-page--admin">
    <header className="dashboard-page__header admin-dashboard-header"><div><span className="dashboard-eyebrow">Super Admin · Operations</span><h1>Operations command center</h1><p>Marketplace performance, decisions and inspection work in one view.</p></div></header>

    <section className="admin-exec" aria-labelledby="admin-exec-title">
      <div className="admin-section-heading"><div><span className="admin-section-kicker">Executive overview</span><h2 id="admin-exec-title">NexaPort at a glance</h2></div><p>Platform scale and current work</p></div>
      <div className="admin-exec-grid">
        <ExecutiveMetric label="Registered Clients" value={metrics.registeredClients} note="Includes unverified accounts" />
        <ExecutiveMetric label="Total Consultants" value={metrics.totalConsultants} />
        <ExecutiveMetric label="Service Requests" value={metrics.serviceRequests} note="All moderation states" />
        <ExecutiveMetric label="Active Jobs" value={metrics.activeJobs} />
        <ExecutiveMetric label="Completed Jobs" value={metrics.completedJobs} />
        <ExecutiveMetric label="Accepted Quote Markup" value={metrics.acceptedQuoteMarkup} money featured note="Accepted quotations · not collected revenue" />
      </div>
      <div className="admin-exec-support" aria-label="Additional commercial indicators">
        <span><strong>{countLabel(metrics.consultantsAvailable)}</strong> Consultants Available</span>
        <span><strong>{countLabel(metrics.awaitingQuotations)}</strong> Requests Awaiting Quotations</span>
        <span><strong>{countLabel(metrics.readyForProposal)}</strong> Quotes Ready for Proposal</span>
        <span><strong>{countLabel(metrics.proposalsAwaitingClient)}</strong> Proposals Awaiting Clients</span>
        <span><strong>{countLabel(metrics.proposalsDeclined)}</strong> Proposals Declined</span>
      </div>
    </section>

    <section className="admin-attention" aria-labelledby="admin-attention-title">
      <div className="admin-section-heading"><div><span className="admin-section-kicker">Decision queue</span><h2 id="admin-attention-title">Requires Attention</h2></div><p>Separate owners and actions; counts are not additive</p></div>
      <div className="admin-attention-grid">
        <AttentionItem label="Requests awaiting approval" value={metrics.pendingModeration} detail="Moderation decision" href="/requests" />
        <AttentionItem label="New quotations to review" value={metrics.initialQuotes} detail="Excludes returned revisions" href={workflowQueue} />
        <AttentionItem label="Revised quotations to review" value={metrics.revisedQuotes} detail="Subset of all quotes awaiting review" href={workflowQueue} />
        <AttentionItem label="Waiting for consultant revision" value={metrics.awaitingConsultantRevision} detail="Consultant response pending" href={workflowQueue} owner="Consultant" />
        <AttentionItem label="Approved quotes ready for proposal" value={metrics.readyForProposal} detail="Prepare client proposal" href={workflowQueue} />
        <AttentionItem label="Submitted invoices" value={metrics.invoicesForAdmin} detail="Invoice approval required" href={workflowQueue} />
        <AttentionItem label="Rejected invoices" value={metrics.invoicesForConsultant} detail="Consultant correction pending" href={workflowQueue} owner="Consultant" />
        <AttentionItem label="Approved invoices" value={metrics.paymentsPending} detail="Payment pending" href={workflowQueue} owner="Finance" />
      </div>
    </section>

    <div className="admin-analytics"><PipelineChart metrics={metrics} /><AvailabilityChart availability={metrics.availability} /></div>

    <section className="admin-workstation" aria-labelledby="admin-workstation-title">
      <div className="admin-section-heading"><div><span className="admin-section-kicker">Operational workstation</span><h2 id="admin-workstation-title">Current work</h2></div><p>Up to 8 preview rows per queue · open the register for the full list</p></div>
      <div className="admin-workstation-shell">
        <div className="admin-workstation-tabs" role="tablist" aria-label="Operational work lists">
          {tabs.map((tab, index) => <button key={tab.id} ref={(node) => { tabRefs.current[index] = node; }} id={`admin-tab-${tab.id}`} type="button" role="tab" aria-selected={activeTab === index} aria-controls="admin-workstation-panel" tabIndex={activeTab === index ? 0 : -1} onClick={() => setActiveTab(index)} onKeyDown={(event) => onTabKeyDown(event, index)}>{tab.label}<span>{tab.total === null ? "Preview" : countLabel(tab.total)}</span></button>)}
        </div>
        <div className="admin-workstation-panel" id="admin-workstation-panel" role="tabpanel" aria-labelledby={`admin-tab-${current.id}`} tabIndex={0}>
          <header><div><h3>{current.label}</h3><p>{current.description}</p><small>{current.total === null ? `${current.rows?.length || 0} recent rows shown` : `${current.rows?.length || 0} of ${countLabel(current.total)} shown`}</small></div>{current.action}</header>
          <DashboardTable columns={current.columns} rows={current.rows} getRowHref={current.href} emptyMessage={current.empty} />
        </div>
      </div>
    </section>

    <section className="admin-recent" aria-labelledby="admin-recent-title"><div className="admin-section-heading"><div><span className="admin-section-kicker">Marketplace record</span><h2 id="admin-recent-title">Recent activity</h2></div></div>
      <div className="dashboard-split dashboard-split--admin">
        <DashboardSection title="Recent Client Registrations" description="Latest client onboarding records." action={<Link to="/admin/client-registrations">Open register</Link>}>
          <DashboardTable columns={[
            { key: "name", label: "Client", primary: true, render: (row) => row.full_name || row.email },
            { key: "date", label: "Submitted", render: (row) => formatDate(row.verification_submitted_at || row.created_at) },
            { key: "status", label: "Status", render: (row) => <DashboardStatus value={row.verification_status || "not submitted"} /> },
          ]} rows={data?.recent_registrations} getRowHref={(row) => row.client_profile_id ? `/admin/client-registrations/${row.client_profile_id}` : `/admin/clients/${row.user_id}`} emptyMessage="No client registrations found." />
        </DashboardSection>
        <DashboardSection title="Recent Quotations" description="Latest genuine marketplace quotations.">
          <DashboardTable columns={[
            { key: "request", label: "Request", primary: true, render: requestTitle },
            { key: "consultant", label: "Consultant", render: (row) => row.consultant_name || "—" },
            { key: "date", label: "Submitted", render: (row) => formatDate(row.created_at) },
            { key: "status", label: "Status", render: (row) => <DashboardStatus value={row.status} /> },
          ]} rows={data?.recent_quotations} getRowHref={requestLink} emptyMessage="No quotations found." />
        </DashboardSection>
      </div>
      <DashboardSection title="Recent Admin Activity" description="Recorded actions from the administrative audit log.">
        <DashboardTable columns={[
          { key: "summary", label: "Activity", primary: true, render: (row) => row.summary || String(row.action || "Administrative action").replaceAll(".", " · ") },
          { key: "actor", label: "Actor", render: (row) => row.actor_name || "System" },
          { key: "target", label: "Target", render: (row) => `${String(row.target_type || "record").replaceAll("_", " ")} #${row.target_id}` },
          { key: "date", label: "Recorded", render: (row) => formatDate(row.created_at) },
        ]} rows={data?.recent_audit_activity} emptyMessage="No administrative activity has been recorded." />
      </DashboardSection>
    </section>
  </main>;
}
