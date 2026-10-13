export const DECISION_COPY = {
  revision_requested: { title: "Request Quotation Revision", description: "Send the Consultant your feedback and optionally suggest a revised maximum amount.", action: "Send Revision Request" },
  approved: { title: "Approve Quotation", description: "Approve this Consultant revision for Client proposal preparation.", action: "Approve Quotation" },
  rejected: { title: "Reject Quotation", description: "Explain the rejection to the Consultant using a message or reason.", action: "Reject Quotation" },
};

export const createDecisionForm = (decision) => ({ decision, consultantMessage: "", reason: "",
  suggestedMaxAmount: "", suggestedMaxCurrency: "USD", internalAdminNote: "" });

export const saveDecisionDraft = async (save, payload, close) => { await save(payload); close(); };
export const submitDecisionOnce = async (pending, save, payload) => {
  if (pending.current) return false;
  pending.current = true;
  try { await save(payload); return true; }
  finally { pending.current = false; }
};

export const prepareDecision = (form) => {
  const errors = {};
  if (form.decision === "revision_requested" && !form.consultantMessage.trim())
    errors.consultantMessage = "Enter a message explaining the requested revision.";
  if (form.decision === "rejected" && !form.consultantMessage.trim() && !form.reason.trim())
    errors.consultantMessage = "Enter a message or reason for rejecting this quotation.";
  for (const field of ["consultantMessage", "reason", "internalAdminNote"])
    if (form[field].trim().length > 4000) errors[field] = "Use no more than 4,000 characters.";
  const rawAmount = form.suggestedMaxAmount.trim();
  const amount = rawAmount.replaceAll(",", "");
  if (form.decision === "revision_requested" && rawAmount) {
    if (!/^(?:\d+|\d{1,3}(?:,\d{3})+)(?:\.\d{1,2})?$/.test(rawAmount) ||
        Number(amount) <= 0 || Number(amount) > 9999999999.99)
      errors.suggestedMaxAmount = "Enter a positive amount with at most two decimal places.";
    if (!/^[A-Z]{3}$/.test(form.suggestedMaxCurrency.trim().toUpperCase()))
      errors.suggestedMaxCurrency = "Enter a three-letter currency code.";
  }
  return { errors, payload: { ...form,
    suggestedMaxAmount: form.decision === "revision_requested" && rawAmount ? amount : null,
    suggestedMaxCurrency: form.suggestedMaxCurrency.trim().toUpperCase(),
  } };
};
