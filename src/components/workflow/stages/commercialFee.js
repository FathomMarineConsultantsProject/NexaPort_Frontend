const cents = (value) => {
  const raw = String(value ?? "").trim();
  if (!/^\d+(?:\.\d{1,2})?$/.test(raw)) return null;
  const [whole, fraction = ""] = raw.split(".");
  const result = BigInt(whole) * 100n + BigInt(fraction.padEnd(2, "0"));
  return result <= 999999999999n ? result : null;
};

export const previewCommercialFee = ({ consultantTotal, mode, percentage, customAmount }) => {
  const cost = cents(consultantTotal);
  const rate = mode === "percentage" ? cents(percentage) : null;
  const fixed = mode === "custom" ? cents(customAmount) : null;
  if (cost === null || !["percentage", "custom"].includes(mode) ||
      (mode === "percentage" && (rate === null || rate > 999999n)) ||
      (mode === "custom" && fixed === null)) return null;
  const fee = mode === "percentage" ? (cost * rate + 5000n) / 10000n : fixed;
  if (fee > 999999999999n || cost + fee > 999999999999n) return null;
  return { consultantTotalUsd: Number(cost) / 100, feeUsd: Number(fee) / 100, draftTotalUsd: Number(cost + fee) / 100 };
};
