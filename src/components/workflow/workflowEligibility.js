// Match the backend Overview -> Quote predicate; internal review is a separate gate.
export const canReviewQuotations = (quotations = []) => quotations.some((q) => ["pending", "submitted"].includes(String(q.status).toLowerCase()));
