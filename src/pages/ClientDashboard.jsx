import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getClientDashboard } from "../api/Dashboardapi";
import {
  DashboardError,
  DashboardKpiCard,
  DashboardLoading,
  DashboardSection,
  DashboardStatus,
  DashboardTable,
} from "../components/dashboard/DashboardPrimitives";
import { formatDate, serviceName } from "../components/dashboard/dashboardFormatters";

const requestLink = (row) => `/requests/${row.id}`;
const requestTitle = (row) => row.title || `Request #${row.id}`;

export default function ClientDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setFailed(false);
    try {
      const response = await getClientDashboard();
      if (!response.success) throw new Error("Dashboard request failed");
      setData(response.data);
    } catch (error) {
      console.error("Client dashboard load error:", error);
      setFailed(true);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const loadId = window.setTimeout(load, 0);
    return () => window.clearTimeout(loadId);
  }, [load]);
  if (loading) return <main className="dashboard-page"><DashboardLoading /></main>;
  if (failed) return <main className="dashboard-page"><DashboardError onRetry={load} /></main>;

  const kpis = data?.kpis || {};
  const requestColumns = [
    { key: "request", label: "Request", primary: true, render: requestTitle },
    { key: "vessel", label: "Vessel", render: (row) => row.vessel_name || "—" },
    { key: "service", label: "Service", render: serviceName },
    { key: "port", label: "Port", render: (row) => row.port_name || "—" },
    { key: "required", label: "Required by", render: (row) => formatDate(row.required_by) },
    { key: "moderation", label: "Review", render: (row) => row.moderation_status ? <DashboardStatus value={row.moderation_status} /> : "—" },
    { key: "status", label: "Status", render: (row) => <DashboardStatus value={row.status} /> },
  ];

  return (
    <main className="dashboard-page">
      <header className="dashboard-page__header">
        <div><span className="dashboard-eyebrow">Client workspace</span><h1>Your requests</h1><p>Track approvals, proposals and active inspections in one place.</p></div>
        <Link className="dashboard-primary-action" to="/requests/new">Create request</Link>
      </header>

      <DashboardSection title="Needs your attention" description="Requests with a near required date or a proposal ready for review." count={data.attention_requests?.length || 0} urgent>
        <DashboardTable columns={requestColumns} rows={data.attention_requests} getRowHref={requestLink} emptyMessage="No requests currently require your attention." />
      </DashboardSection>

      {!!data.active_jobs?.length && (
        <DashboardSection title="Active jobs" description="Assigned and active inspections currently in progress.">
          <DashboardTable
            columns={[...requestColumns.slice(0, 5), { key: "consultant", label: "Consultant", render: (row) => row.consultant_name || "—" }, requestColumns[6]]}
            rows={data.active_jobs}
            getRowHref={requestLink}
            emptyMessage="You do not have any active requests."
          />
        </DashboardSection>
      )}

      <section className="dashboard-metrics" aria-labelledby="client-metrics-title">
        <div className="dashboard-metrics__header"><div><span className="dashboard-eyebrow">At a glance</span><h2 id="client-metrics-title">Request progress</h2></div></div>
        <div className="dashboard-kpi-grid dashboard-kpi-grid--seven">
          <DashboardKpiCard label="Total requests" value={kpis.total_requests} />
          <DashboardKpiCard label="Open requests" value={kpis.open_requests} />
          <DashboardKpiCard label="Awaiting quotations" value={kpis.requests_awaiting_quotes} priority={kpis.requests_awaiting_quotes > 0} />
          <DashboardKpiCard label="Quotations received" value={kpis.quotes_received} />
          <DashboardKpiCard label="Awaiting decision" value={kpis.awaiting_decision} priority={kpis.awaiting_decision > 0} />
          <DashboardKpiCard label="Active jobs" value={kpis.active_jobs} />
          <DashboardKpiCard label="Completed jobs" value={kpis.completed_jobs} />
        </div>
      </section>

      <div className="dashboard-split">
        <DashboardSection title="Upcoming inspections" description="Nearest assigned work ordered by requirement date.">
          <DashboardTable columns={requestColumns.slice(0, 5)} rows={data.upcoming_inspections} getRowHref={requestLink} emptyMessage="No upcoming inspections are scheduled." />
        </DashboardSection>
        <DashboardSection title="Recent requests" description="Latest genuine request updates.">
          <DashboardTable
            columns={[
              requestColumns[0],
              { key: "updated", label: "Updated", render: (row) => formatDate(row.updated_at || row.created_at) },
              requestColumns[6],
            ]}
            rows={data.recent_requests}
            getRowHref={requestLink}
            emptyMessage="No service requests have been created."
          />
        </DashboardSection>
      </div>
      <Link className="dashboard-context-link" to="/requests">Open request register</Link>
    </main>
  );
}
