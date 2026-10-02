export const AGENT_FIELDS = [
  ["agentCompanyName", "Agent / Company Name", 240, "text"],
  ["agentContactName", "Contact Person", 160, "text"],
  ["agentEmail", "Email", 254, "email"],
  ["agentPhone", "Phone", 30, "tel"],
];

export function AgentDetailsFields({ value, onChange, errors = {} }) {
  return <section className="request-agent-details wide"><h3>Agent Details</h3><p>Optional local agent contact.</p><div className="request-agent-grid">
    {AGENT_FIELDS.map(([key, label, maxLength, type]) => <label key={key}>{label}<input name={key} type={type} maxLength={maxLength} value={value[key] || ""} onChange={(event) => onChange({ [key]: event.target.value })} />{errors[key] && <small role="alert">{errors[key]}</small>}</label>)}
  </div></section>;
}

export default function AgentDetails({ value }) {
  if (!value || !Object.values(value).some(Boolean)) return null;
  return <section className="request-agent-details"><h3>Agent Details</h3><dl>
    {[["companyName", "Agent / Company Name"], ["contactName", "Contact Person"], ["email", "Email"], ["phone", "Phone"]].map(([key, label]) => value[key] ? <div key={key}><dt>{label}</dt><dd>{value[key]}</dd></div> : null)}
  </dl></section>;
}
