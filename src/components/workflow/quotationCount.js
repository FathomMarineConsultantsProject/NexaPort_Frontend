export const quotationCountLabel = (total) => {
  if (total === null || total === undefined) return "Count unavailable";
  const count = Number(total);
  if (!Number.isSafeInteger(count) || count < 0) return "Count unavailable";
  if (count === 0) return "No quotations";
  return `${count} ${count === 1 ? "quotation" : "quotations"}`;
};
