export const shown = (value) => value === null || value === undefined || String(value).trim() === "" ? "Not provided" : value;
export const money = (value) => value === null || value === undefined ? "Not provided" : new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",maximumFractionDigits:2}).format(Number(value)||0);
export const date = (value) => value ? new Date(value).toLocaleDateString("en-GB",{day:"2-digit",month:"short",year:"numeric"}) : "Not provided";
export const dateTime = (value) => value ? new Date(value).toLocaleString("en-GB",{day:"2-digit",month:"short",year:"numeric",hour:"2-digit",minute:"2-digit"}) : "Not provided";
