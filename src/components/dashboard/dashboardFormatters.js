export const formatDate = (value, fallback = "—") => {
  if (!value) return fallback;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return fallback;
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
};

export const formatMoney = (value) => new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
}).format(Number(value || 0));

export const serviceName = (row) => {
  if (row.service_type === "Other") return row.service_type_other || "Other";
  return row.service_category || row.service_type || "—";
};

export const quotationValue = (row) => Number(row.total_quote_usd || 0)
  + Number(row.travel_cost || 0)
  + Number(row.accommodation_cost || 0)
  + Number(row.report_fee || 0)
  + Number(row.urgency_surcharge || 0);
