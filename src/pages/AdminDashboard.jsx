import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { getAdminDashboard } from "../api/Dashboardapi";
import { DashboardError, DashboardKpiCard, DashboardLoading, DashboardSection, DashboardStatus, DashboardTable } from "../components/dashboard/DashboardPrimitives";
import { formatDate, formatMoney, quotationValue, serviceName } from "../components/dashboard/dashboardFormatters";

const requestLink = (row) => `/requests/${row.service_request_id || row.id}`;
const requestTitle = (row) => row.request_title || row.title || `Request #${row.service_request_id || row.id}`;

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
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
  if (loading) return <main className="dashboard-page"><DashboardLoading /></main>;
  if (failed) return <main className="dashboard-page"><DashboardError onRetry={load} /></main>;
  const kpis = data?.kpis || {};

  return (
    <main className="dashboard-page dashboard-page--admin">
      <header className="dashboard-page__header"><div><span className="dashboard-eyebrow">Super admin operations</span><h1>Operations dashboard</h1><p>Requests, quotations and platform activity</p></div></header>
      <div className="dashboard-kpi-grid dashboard-kpi-grid--admin">
        <DashboardKpiCard label="Total clients" value={kpis.total_clients} />
        <DashboardKpiCard label="Total consultants" value={kpis.total_consultants} />
        <DashboardKpiCard label="Active consultants" value={kpis.active_consultants} />
        <DashboardKpiCard label="Total requests" value={kpis.total_requests} />
        <DashboardKpiCard label="New requests" value={kpis.pending_moderation_requests} priority={kpis.pending_moderation_requests > 0} />
        <DashboardKpiCard label="Awaiting quotations" value={kpis.requests_awaiting_quotes} />
        <DashboardKpiCard label="Quotes for review" value={kpis.quotes_awaiting_review} priority={kpis.quotes_awaiting_review > 0} />
        <DashboardKpiCard label="Active jobs" value={kpis.active_jobs} />
        <DashboardKpiCard label="Completed jobs" value={kpis.completed_jobs} />
        <DashboardKpiCard label="Accepted commission value" value={formatMoney(kpis.commission_value_usd)} note="Accepted markup; not settlement" />
      </div>

      <DashboardSection title="Requests awaiting moderation" description="Oldest pending submissions appear first." urgent>
        <DashboardTable columns={[
          { key: "request", label: "Request", primary: true, render: requestTitle },
          { key: "client", label: "Client", render: (row) => row.client_name || "—" },
          { key: "vessel", label: "Vessel", render: (row) => row.vessel_name || "—" },
          { key: "service", label: "Service", render: serviceName },
          { key: "submitted", label: "Submitted", render: (row) => formatDate(row.created_at) },
          { key: "required", label: "Required by", render: (row) => formatDate(row.required_by) },
          { key: "status", label: "Status", render: (row) => <DashboardStatus value={row.moderation_status} /> },
        ]} rows={data.pending_moderations} getRowHref={requestLink} emptyMessage="No requests are awaiting moderation." />
      </DashboardSection>

      <DashboardSection title="Quotations awaiting review" description="Submitted consultant quotations awaiting admin markup and acceptance." urgent>
        <DashboardTable columns={[
          { key: "request", label: "Request", primary: true, render: requestTitle },
          { key: "consultant", label: "Consultant", render: (row) => row.consultant_name || "—" },
          { key: "submitted", label: "Submitted", render: (row) => formatDate(row.created_at) },
          { key: "value", label: "Consultant quote", render: (row) => formatMoney(quotationValue(row)) },
          { key: "status", label: "Status", render: (row) => <DashboardStatus value={row.status} /> },
        ]} rows={data.quotes_for_review} getRowHref={requestLink} emptyMessage="No quotations are awaiting review." />
      </DashboardSection>

      <DashboardSection title="Active jobs" description="Current assigned and active marketplace work.">
        <DashboardTable columns={[
          { key: "request", label: "Request", primary: true, render: requestTitle },
          { key: "client", label: "Client", render: (row) => row.client_name || "—" },
          { key: "consultant", label: "Consultant", render: (row) => row.consultant_name || "—" },
          { key: "vessel", label: "Vessel", render: (row) => row.vessel_name || "—" },
          { key: "port", label: "Port", render: (row) => row.port_name || "—" },
          { key: "required", label: "Required by", render: (row) => formatDate(row.required_by) },
          { key: "status", label: "Status", render: (row) => <DashboardStatus value={row.status} /> },
        ]} rows={data.active_jobs} getRowHref={requestLink} emptyMessage="No jobs are currently active." />
      </DashboardSection>

      <div className="dashboard-split dashboard-split--admin">
        <DashboardSection title="Recent registrations" description="Latest client onboarding records." action={<Link to="/admin/client-registrations">Open register</Link>}>
          <DashboardTable columns={[
            { key: "name", label: "Client", primary: true, render: (row) => row.full_name || row.email },
            { key: "date", label: "Submitted", render: (row) => formatDate(row.verification_submitted_at || row.created_at) },
            { key: "status", label: "Status", render: (row) => <DashboardStatus value={row.verification_status || "not submitted"} /> },
          ]} rows={data.recent_registrations} getRowHref={(row) => row.client_profile_id ? `/admin/client-registrations/${row.client_profile_id}` : `/admin/clients/${row.user_id}`} emptyMessage="No client registrations found." />
        </DashboardSection>
        <DashboardSection title="Recent quotations" description="Latest genuine marketplace quotations.">
          <DashboardTable columns={[
            { key: "request", label: "Request", primary: true, render: requestTitle },
            { key: "consultant", label: "Consultant", render: (row) => row.consultant_name || "—" },
            { key: "date", label: "Submitted", render: (row) => formatDate(row.created_at) },
            { key: "status", label: "Status", render: (row) => <DashboardStatus value={row.status} /> },
          ]} rows={data.recent_quotations} getRowHref={requestLink} emptyMessage="No quotations found." />
        </DashboardSection>
      </div>

      <DashboardSection title="Recent admin activity" description="Recorded actions from the administrative audit log.">
        <DashboardTable columns={[
          { key: "summary", label: "Activity", primary: true, render: (row) => row.summary || String(row.action || "Administrative action").replaceAll(".", " · ") },
          { key: "actor", label: "Actor", render: (row) => row.actor_name || "System" },
          { key: "target", label: "Target", render: (row) => `${String(row.target_type || "record").replaceAll("_", " ")} #${row.target_id}` },
          { key: "date", label: "Recorded", render: (row) => formatDate(row.created_at) },
        ]} rows={data.recent_audit_activity} emptyMessage="No administrative activity has been recorded." />
      </DashboardSection>
    </main>
  );
}
