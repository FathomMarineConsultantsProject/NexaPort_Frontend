import { Link } from "react-router-dom";

export function DashboardKpiCard({ label, value, note, priority = false }) {
  return (
    <div className={`dashboard-kpi${priority ? " dashboard-kpi--priority" : ""}`}>
      <span className="dashboard-kpi__label">{label}</span>
      <strong className="dashboard-kpi__value">{value ?? 0}</strong>
      {note && <span className="dashboard-kpi__note">{note}</span>}
    </div>
  );
}

export function DashboardSection({ title, description, children, urgent = false, action }) {
  return (
    <section className={`dashboard-section${urgent ? " dashboard-section--urgent" : ""}`}>
      <header className="dashboard-section__header">
        <div>
          <h2>{title}</h2>
          {description && <p>{description}</p>}
        </div>
        {action}
      </header>
      {children}
    </section>
  );
}

export function DashboardStatus({ value }) {
  const normalized = String(value || "unknown").toLowerCase().replace(/[^a-z]+/g, "-");
  return <span className={`dashboard-status dashboard-status--${normalized}`}>{String(value || "Unknown").replaceAll("_", " ")}</span>;
}

export function DashboardEmptyState({ children }) {
  return <div className="dashboard-empty">{children}</div>;
}

export function DashboardTable({ columns, rows, getRowHref, emptyMessage }) {
  if (!rows?.length) return <DashboardEmptyState>{emptyMessage}</DashboardEmptyState>;

  return (
    <div className="dashboard-table-wrap">
      <table className="dashboard-table">
        <thead>
          <tr>{columns.map((column) => <th key={column.key}>{column.label}</th>)}</tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const href = getRowHref?.(row);
            return (
              <tr key={row.id}>
                {columns.map((column) => (
                  <td key={column.key} data-label={column.label} className={column.className || ""}>
                    {href && column.primary
                      ? <Link className="dashboard-table__link" to={href}>{column.render(row)}</Link>
                      : column.render(row)}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function DashboardError({ onRetry }) {
  return (
    <div className="dashboard-error" role="alert">
      <strong>Dashboard data is unavailable.</strong>
      <span>Check your connection and try again.</span>
      <button type="button" onClick={onRetry}>Retry</button>
    </div>
  );
}

export function DashboardLoading() {
  return (
    <div className="dashboard-loading" aria-live="polite">
      <span className="dashboard-loading__line" />
      <span>Loading operational data…</span>
    </div>
  );
}
