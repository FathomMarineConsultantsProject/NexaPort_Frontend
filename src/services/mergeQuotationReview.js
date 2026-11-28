const present = value => value !== null && value !== undefined && String(value).trim() !== '';
const fields = ['vesselName', 'shipReference', 'deliveryDate', 'supplierQuotationReference', 'rfqReference',
  'quotationDate', 'expiryDate', 'defaultCurrency', 'commercialTerms', 'buyerName', 'issuerName',
  'imoNumber', 'purchaseOrderReference', 'requisitionReference', 'paymentTerms', 'destinationPort'];
const rowFields = ['description', 'impaCode', 'makerReference', 'quantity', 'uom', 'currency', 'unitPrice', 'statedLineTotal'];
const referenceLabel = /^(?:quotation|quote)\s+(?:no\.?|number|reference)\b/i;
const sameAmount = (a, b) => present(a) && present(b)
  && String(a).replace(/(?:\.0+|(\.\d*?)0+)$/, '$1') === String(b).replace(/(?:\.0+|(\.\d*?)0+)$/, '$1');
const normalizeEvidence = value => String(value??'').toLowerCase().replace(/\s+/g, ' ').trim();
const identity = row => String(row.supplierLineNumber || row.sourceOrder);
const chargeLabels = {
  tax: /\b(?:gst|vat|tax)\b/i, freight: /\b(?:freight|shipping|carriage)\b/i,
  delivery: /\bdelivery\b/i, discount: /\b(?:discount|rebate)\b/i,
  handling: /\b(?:handling|packing)\b/i, other: /\b(?:charge|fee|certificate|certification|inspection)\b/i,
};

export function mergeQuotationReview(baseline, candidate) {
  const merged = {...baseline};
  for (const field of fields) {
    if (!present(baseline[field]) && present(candidate[field])) merged[field] = candidate[field];
  }
  const proof = candidate.referenceEvidence?.supplierQuotationReference;
  const reference = candidate.supplierQuotationReference;
  if (present(reference) && referenceLabel.test(proof || '') && proof.trim().endsWith(reference)
      && !baseline.referenceEvidence?.supplierQuotationReference && !baseline.manualReference) {
    merged.supplierQuotationReference = reference;
    merged.referenceEvidence = {...baseline.referenceEvidence, supplierQuotationReference: proof};
  }

  merged.printedTotals = {...baseline.printedTotals};
  merged.totalEvidence = {...baseline.totalEvidence};
  for (const [kind, amount] of Object.entries(candidate.printedTotals || {})) {
    if (!present(amount) || !present(candidate.totalEvidence?.[kind]) || present(merged.printedTotals[kind])) continue;
    merged.printedTotals[kind] = amount;
    merged.totalEvidence[kind] = candidate.totalEvidence[kind];
  }
  merged.statedTotals = {...baseline.statedTotals};
  const currency = merged.defaultCurrency;
  if (currency && present(merged.printedTotals.total) && !present(merged.statedTotals[currency])) {
    merged.statedTotals[currency] = merged.printedTotals.total;
  }

  merged.charges = [...(baseline.charges || [])];
  for (const charge of candidate.charges || []) {
    if (!present(charge.amount) || !present(charge.sourceEvidence) || !charge.sourcePage && !charge.sourceSheet) continue;
    if (!chargeLabels[charge.kind]?.test(charge.sourceEvidence) ||
        !(charge.sourceEvidence.match(/\d[\d,]*(?:\.\d+)?(?![\d.%])/g) || [])
          .some(value => sameAmount(value.replaceAll(',', ''), charge.amount))) continue;
    const sameSource = value => value.sourcePage === charge.sourcePage && value.sourceSheet === charge.sourceSheet
      && normalizeEvidence(value.sourceEvidence) === normalizeEvidence(charge.sourceEvidence);
    const duplicate = merged.charges.some(value => sameSource(value)
      || (!value.sourceEvidence && value.kind === charge.kind && sameAmount(value.amount, charge.amount)));
    if (!duplicate) merged.charges.push(charge);
  }

  const incoming = new Map();
  for (const row of candidate.lines || []) {
    const key = identity(row);
    incoming.set(key, incoming.has(key) ? null : row);
  }
  if (!baseline.lines.length) {
    merged.lines = [...incoming.values()].filter(row => row?.sourceEvidence)
      .map(row => ({...row, reviewConfirmed: false}));
  } else {
    merged.lines = baseline.lines.map(previous => {
      const row = incoming.get(identity(previous));
      if (!row?.sourceEvidence || (previous.sourcePage && row.sourcePage !== previous.sourcePage)
          || previous.reviewStatus === 'corrected' || previous.reviewConfirmed) return previous;
      const next = {...previous};
      for (const field of rowFields) {
        if (!present(previous[field]) && present(row[field])) next[field] = row[field];
      }
      if (rowFields.some(field => next[field] !== previous[field])) {
        next.reviewStatus = 'corrected';
        next.reviewConfirmed = false;
      }
      return next;
    });
  }
  return merged;
}
