export default function AdditionalPorts({ ports = [] }) {
  const additional = ports.filter((p) => !p.isPrimary);
  if (ports.length < 2 || !additional.length) return null;
  return <div className="request-additional-ports"><span>Additional ports: </span>{additional.map((p) => [p.port_name, p.country, p.unlocode].filter(Boolean).join(" · ")).join("; ")}</div>;
}
