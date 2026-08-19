const WORKFLOW_LOCK_STAGES = new Set([
  "surveyor", "preparation", "checklist", "report", "review",
  "report_confirmation", "inspection_completed", "invoice_submitted",
  "invoice_approved", "invoice_paid",
]);

const blocked = (reason) => ({ allowed: false, reason });

export const getRequestEditPermission = (request, user) => {
  const roleId = Number(user?.role_id || user?.roleId || 0);
  if (![1, 3].includes(roleId)) return blocked("Consultants and Providers cannot edit Client service requests.");
  if (roleId === 3 && Number(request?.requesterUserId ?? request?.requester_user_id) !== Number(user?.id)) {
    return blocked("You can only edit your own service requests.");
  }

  const requestStatus = String(request?.status || "").toLowerCase();
  const workflowStage = String(request?.workflowStage ?? request?.workflow_stage ?? request?.workflow?.currentStage ?? "").toLowerCase();
  const downstreamLocked = Boolean(
    (request?.acceptedQuotationId ?? request?.accepted_quotation_id) ||
    (request?.acceptedExpertId ?? request?.accepted_expert_id) ||
    (request?.hasAssignment ?? request?.has_assignment) ||
    ["assigned", "in progress", "in_progress", "completed"].includes(requestStatus) ||
    WORKFLOW_LOCK_STAGES.has(workflowStage)
  );
  if (downstreamLocked) {
    return blocked("This request is already in the inspection workflow. Core request details are locked to protect the accepted quotation and inspection record.");
  }

  const moderationStatus = String(request?.moderationStatus ?? request?.moderation_status ?? "pending").toLowerCase();
  if (!["pending", "rejected", "approved"].includes(moderationStatus)) {
    return blocked("This request is not in an editable moderation state.");
  }
  const quotationCount = Number(request?.quotationCount ?? request?.quotation_count ?? request?.quotations?.length ?? 0);
  if (roleId === 3 && moderationStatus === "approved" && quotationCount > 0) {
    return blocked("This request cannot be edited because quotations have already been submitted. Please contact Nexaport.");
  }
  return { allowed: true, reason: null };
};
