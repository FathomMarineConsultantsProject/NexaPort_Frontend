const AGENT_FIELDS = [
  ["agentCompanyName", "Agent / Company Name", 240, "text"],
  ["agentContactName", "Contact Person", 160, "text"],
  ["agentEmail", "Email", 254, "email"],
  ["agentPhone", "Phone", 30, "tel"],
];

export function AgentDetailsFields({ value, onChange, errors = {}, writeOnly = false }) {
  return <section className="request-agent-details wide"><h3>{writeOnly ? "Replace Agent Details" : "Agent Details"}</h3><p>{writeOnly ? "Enter only details you want to replace. Saved contact details are managed by NexaPort and are not shown here." : "Optional local agent contact."}</p><div className="request-agent-grid">
    {AGENT_FIELDS.map(([key, label, maxLength, type]) => <label key={key}>{label}<input name={key} type={type} maxLength={maxLength} value={value[key] || ""} onChange={(event) => onChange({ [key]: event.target.value })} />{errors[key] && <small role="alert">{errors[key]}</small>}</label>)}
  </div></section>;
}

export default function AgentDetails({ value, showEmpty = false }) {
  if (!showEmpty && (!value || !Object.values(value).some(Boolean))) return null;
  return <section className="request-agent-details side-info-card"><h3>Agent Details</h3><dl>
    {[["companyName", "Agent / Company Name"], ["contactName", "Contact Person"], ["email", "Email"], ["phone", "Phone"]].map(([key, label]) => value?.[key] || showEmpty ? <div key={key}><dt>{label}</dt><dd className={value?.[key] ? undefined : "info-empty"}>{value?.[key] ? key === "email" ? <a href={`mailto:${value[key]}`}>{value[key]}</a> : key === "phone" ? <a href={`tel:${value[key]}`}>{value[key]}</a> : value[key] : "Not provided"}</dd></div> : null)}
  </dl></section>;
}
