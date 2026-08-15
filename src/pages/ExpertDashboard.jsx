import { useCallback, useEffect, useState } from "react";
import { getExpertDashboard } from "../api/Dashboardapi";
import {
  DashboardError,
  DashboardKpiCard,
  DashboardLoading,
  DashboardSection,
  DashboardStatus,
  DashboardTable,
} from "../components/dashboard/DashboardPrimitives";
import { formatDate, formatMoney, quotationValue, serviceName } from "../components/dashboard/dashboardFormatters";

const requestLink = (row) => `/requests/${row.service_request_id || row.id}`;
const requestTitle = (row) => row.request_title || row.title || `Request #${row.service_request_id || row.id}`;

export default function ExpertDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setFailed(false);
    try {
      const response = await getExpertDashboard();
      if (!response.success) throw new Error("Dashboard request failed");
      setData(response.data);
    } catch (error) {
      console.error("Expert dashboard load error:", error);
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
    <main className="dashboard-page">
      <header className="dashboard-page__header"><div><span className="dashboard-eyebrow">Consultant operations</span><h1>Work and assignments</h1></div></header>
      <div className="dashboard-kpi-grid dashboard-kpi-grid--expert">
        <DashboardKpiCard label="Available requests" value={kpis.available_requests} />
        <DashboardKpiCard label="Matching requests" value={kpis.matching_requests} priority={kpis.matching_requests > 0} />
        <DashboardKpiCard label="Quotations submitted" value={kpis.quotes_submitted} />
        <DashboardKpiCard label="Pending quotations" value={kpis.quotes_pending} priority={kpis.quotes_pending > 0} />
        <DashboardKpiCard label="Accepted quotations" value={kpis.quotes_accepted} />
        <DashboardKpiCard label="Rejected quotations" value={kpis.quotes_rejected} />
        <DashboardKpiCard label="Active assignments" value={kpis.active_assignments} />
        <DashboardKpiCard label="Completed jobs" value={kpis.completed_jobs} />
        <DashboardKpiCard label="Accepted quotation value" value={formatMoney(kpis.accepted_quotation_value_usd)} note="Accepted value, not payment status" />
      </div>

      <DashboardSection title="Matching requests" description="Deterministic matches against your ports, vessel types, and discipline." urgent>
        <DashboardTable
          columns={[
            { key: "request", label: "Request", primary: true, render: requestTitle },
            { key: "vessel", label: "Vessel type", render: (row) => row.vessel_type || "—" },
            { key: "service", label: "Service", render: serviceName },
            { key: "port", label: "Port", render: (row) => row.port_name || "—" },
            { key: "required", label: "Required by", render: (row) => formatDate(row.required_by) },
            { key: "match", label: "Match reason", render: (row) => row.match_reason || "Profile match" },
            { key: "quote", label: "Quotation", render: (row) => <DashboardStatus value={row.quotation_state} /> },
          ]}
          rows={data.matching_requests}
          getRowHref={requestLink}
          emptyMessage="No available requests currently match your profile."
        />
      </DashboardSection>

      <DashboardSection title="Active assignments" description="Assigned and active work linked to your consultant profile.">
        <DashboardTable
          columns={[
            { key: "request", label: "Request", primary: true, render: requestTitle },
            { key: "vessel", label: "Vessel", render: (row) => row.vessel_name || row.vessel_type || "—" },
            { key: "port", label: "Port", render: (row) => row.port_name || "—" },
            { key: "required", label: "Required by", render: (row) => formatDate(row.required_by) },
            { key: "status", label: "Status", render: (row) => <DashboardStatus value={row.status} /> },
          ]}
          rows={data.active_assignments}
          getRowHref={requestLink}
          emptyMessage="You do not have any active assignments."
        />
      </DashboardSection>

      <div className="dashboard-split">
        <DashboardSection title="Quotation status" description="Your most recent quotation submissions.">
          <DashboardTable columns={[
            { key: "request", label: "Request", primary: true, render: requestTitle },
            { key: "submitted", label: "Submitted", render: (row) => formatDate(row.created_at) },
            { key: "value", label: "Quoted value", render: (row) => formatMoney(quotationValue(row)) },
            { key: "status", label: "Status", render: (row) => <DashboardStatus value={row.status} /> },
          ]} rows={data.recent_quotations} getRowHref={requestLink} emptyMessage="No quotations have been submitted." />
        </DashboardSection>
        <DashboardSection title="Upcoming work" description="Nearest genuine assignment dates.">
          <DashboardTable columns={[
            { key: "request", label: "Request", primary: true, render: requestTitle },
            { key: "port", label: "Port", render: (row) => row.port_name || "—" },
            { key: "date", label: "Date", render: (row) => formatDate(row.required_by || row.eta) },
            { key: "status", label: "Status", render: (row) => <DashboardStatus value={row.status} /> },
          ]} rows={data.upcoming_work} getRowHref={requestLink} emptyMessage="No upcoming work is scheduled." />
        </DashboardSection>
      </div>
    </main>
  );
}
