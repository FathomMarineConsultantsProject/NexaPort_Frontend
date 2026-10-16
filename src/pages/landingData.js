const count = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const number = Number(value);
  return Number.isSafeInteger(number) && number >= 0 ? number : null;
};

export function landingMetrics(stats, verticals) {
  const catalogue = Array.isArray(verticals) ? verticals : null;
  const methods = catalogue?.reduce((total, vertical) => total + (Array.isArray(vertical.methods) ? vertical.methods.length : 0), 0);
  return [
    { label: "Global ports indexed", value: count(stats?.ports_total) },
    { label: "Maritime professionals listed", value: count(stats?.maritime_professionals_total) },
    { label: "Inspection categories", value: catalogue ? catalogue.length : null },
    { label: "Inspection methods", value: catalogue ? methods : null },
    { label: "Flag State inspectors listed", value: count(stats?.breakdown?.flag_inspectors) },
    { label: "Accredited inspectors listed", value: count(stats?.breakdown?.accredited_inspectors) },
  ];
}

export function metricText(value) {
  return value === null ? "—" : new Intl.NumberFormat("en-US").format(value);
}
