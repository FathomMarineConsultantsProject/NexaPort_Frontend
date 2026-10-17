export const canonicalPortId = (port) => Number(port?.id);
export const portKey = (port) => port?.manual ? port.key : `port:${canonicalPortId(port)}`;
export const portOptionIndex = (current, key, count) => count === 0 ? -1
  : current < 0 ? (key === "ArrowDown" ? 0 : count - 1)
    : (current + (key === "ArrowDown" ? 1 : -1) + count) % count;
export const uniquePorts = (ports) => [...new Map(ports.map((p) => [portKey(p), p])).values()];
export const selectionPatch = (ports, requestedPrimary) => {
  const selected = uniquePorts(ports);
  const requestedKey = typeof requestedPrimary === "string" && requestedPrimary.includes(":") ? requestedPrimary : `port:${Number(requestedPrimary)}`;
  const primary = selected.find((p) => portKey(p) === requestedKey) || selected[0];
  return { ports: selected.map((p) => ({ ...p, isPrimary: p === primary })), portIds: selected.filter((p) => !p.manual).map(canonicalPortId),
    primaryPortKey: primary ? portKey(primary) : null,
    primaryPortId: primary && !primary.manual ? canonicalPortId(primary) : null,
    portId: primary && !primary.manual ? canonicalPortId(primary) : null, portName: primary?.port_name || "",
    country: primary?.country || "", manualPort: Boolean(primary?.manual) };
};
export const requestPortPayload = (form) => form.ports?.some((p) => p.manual)
  ? { portIds: form.ports.filter((p) => !p.manual).map(canonicalPortId),
    manualPorts: form.ports.filter((p) => p.manual).map((p) => ({ key: p.key, portName: p.port_name, country: p.country })),
    primaryPortKey: form.primaryPortKey || portKey(form.ports.find((p) => p.isPrimary) || form.ports[0]) }
  : !form.manualPort && (Array.isArray(form.portIds) || form.ports?.length)
  ? { portIds: form.portIds || form.ports.map(canonicalPortId), primaryPortId: form.primaryPortId ?? form.portId ?? form.ports?.find((p) => p.isPrimary)?.id ?? form.ports?.[0]?.id ?? null,
    confirmPrimaryPortChange: form.confirmPrimaryPortChange === true }
  : {};
