export const safeCount = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const count = Number(value);
  return Number.isSafeInteger(count) && count >= 0 ? count : null;
};

export const countLabel = (value) => value === null ? "—" : new Intl.NumberFormat("en-US").format(value);

export const safeUsd = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const amount = Number(value);
  return Number.isFinite(amount) && amount >= 0 ? amount : null;
};

export const usdLabel = (value) => value === null ? "—" : new Intl.NumberFormat("en-US", {
  style: "currency", currency: "USD", maximumFractionDigits: 0,
}).format(value);

export const adminDashboardMetrics = (kpis = {}, workflow = {}) => {
  const get = (key) => safeCount(kpis[key]);
  const quotesToReview = get("quotes_awaiting_review");
  const revisedQuotes = get("revised_quotes_awaiting_review");
  const totalConsultants = get("total_consultants");
  const availableConsultants = get("active_consultants");

  return {
    registeredClients: get("total_clients"),
    totalConsultants,
    consultantsAvailable: availableConsultants,
    serviceRequests: get("total_requests"),
    pendingModeration: get("pending_moderation_requests"),
    activeJobs: get("active_jobs"),
    completedJobs: get("completed_jobs"),
    acceptedQuoteMarkup: safeUsd(kpis.commission_value_usd),
    awaitingQuotations: get("requests_awaiting_quotes"),
    quotesToReview,
    revisedQuotes,
    initialQuotes: quotesToReview === null || revisedQuotes === null ? null : Math.max(0, quotesToReview - revisedQuotes),
    awaitingConsultantRevision: get("quotes_waiting_consultant_revision"),
    readyForProposal: get("quotes_ready_for_proposal"),
    proposalsAwaitingClient: get("proposals_awaiting_client"),
    proposalsDeclined: get("proposals_client_rejected"),
    invoicesForAdmin: safeCount(workflow.invoice_approval_required),
    invoicesForConsultant: safeCount(workflow.invoice_correction_required),
    paymentsPending: safeCount(workflow.payment_pending),
    availability: totalConsultants !== null && availableConsultants !== null && availableConsultants <= totalConsultants
      ? { available: availableConsultants, remaining: totalConsultants - availableConsultants, total: totalConsultants }
      : null,
  };
};
