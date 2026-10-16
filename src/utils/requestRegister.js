const own = (value, key) => value && Object.hasOwn(value, key);

export function submittedBudget(request) {
  for (const key of ["clientBudgetUsd", "client_budget_usd"]) {
    if (own(request, key) && request[key] != null) return request[key];
  }
  // The backend maps budgetUsd from budget_usd, the original submitted amount.
  return request?.budgetUsd ?? request?.budget_usd ?? null;
}

export function marketplaceBudget(request) {
  return request?.approvedBudgetUsd ?? request?.approved_budget_usd ?? null;
}

export function formatBudget(value) {
  if (value === null || value === undefined || value === "") return "Not provided";
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0
    ? new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 2 }).format(amount)
    : "Not provided";
}

export function requestBudgetPresentation(request, role) {
  if (role === "client") return { label: "Submitted budget", value: formatBudget(submittedBudget(request)) };
  if (role === "admin") return marketplaceBudget(request) == null
    ? { label: "Submitted budget", value: formatBudget(submittedBudget(request)) }
    : { label: "Market target", value: formatBudget(marketplaceBudget(request)) };
  return { label: "Budget", value: "Not provided" };
}

