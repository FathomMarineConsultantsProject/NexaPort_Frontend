export const MAX_CUSTOM_PORT_LENGTH = 200;

export const normalizePortName = (value) =>
  String(value || "").trim().replace(/\s+/g, " ");

export const portIdentity = (port) => normalizePortName(port?.port_name).toLowerCase();

export const canAddCustomPort = (input, selectedPorts = []) => {
  const name = normalizePortName(input);
  if (!name || name.length > MAX_CUSTOM_PORT_LENGTH || /[<>]/.test(name)) return false;
  return !selectedPorts.some((port) => portIdentity(port) === name.toLowerCase());
};

export const createCustomPort = (input) => {
  const portName = normalizePortName(input);
  return {
    id: `custom:${portName.toLowerCase()}`,
    port_name: portName,
    custom: true,
  };
};
