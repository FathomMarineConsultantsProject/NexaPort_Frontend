export const canonicalPortId = (port) => Number(port?.id);
export const portOptionIndex = (current, key, count) => count === 0 ? -1
  : current < 0 ? (key === "ArrowDown" ? 0 : count - 1)
    : (current + (key === "ArrowDown" ? 1 : -1) + count) % count;
export const uniquePorts = (ports) => [...new Map(ports.map((p) => [canonicalPortId(p), p])).values()];
export const selectionPatch = (ports, requestedPrimary) => {
  const selected = uniquePorts(ports);
  const primary = selected.find((p) => canonicalPortId(p) === Number(requestedPrimary)) || selected[0];
  return { ports: selected.map((p) => ({ ...p, isPrimary: p === primary })), portIds: selected.map(canonicalPortId),
    primaryPortId: primary ? canonicalPortId(primary) : null, portId: primary ? canonicalPortId(primary) : null, portName: primary?.port_name || "" };
};
export const requestPortPayload = (form) => !form.manualPort && (Array.isArray(form.portIds) || form.ports?.length)
  ? { portIds: form.portIds || form.ports.map(canonicalPortId), primaryPortId: form.primaryPortId ?? form.portId ?? form.ports?.find((p) => p.isPrimary)?.id ?? form.ports?.[0]?.id ?? null,
    confirmPrimaryPortChange: form.confirmPrimaryPortChange === true }
  : {};
