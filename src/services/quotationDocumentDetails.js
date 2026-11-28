const DETAIL_FIELDS = {
  documentType: 'Document type', buyerName: 'Buyer', issuerName: 'Issuer', vesselName: 'Vessel',
  imoNumber: 'IMO', shipReference: 'Ship reference', deliveryDate: 'Delivery date',
  purchaseOrderReference: 'Purchase order reference', requisitionReference: 'Requisition reference',
  customerReference: 'Customer reference',
  issuerContact: 'Issuer contact', buyerContact: 'Buyer contact', deliveryInstructions: 'Delivery instructions',
  requestedDelivery: 'Requested delivery', destinationPort: 'Destination port', paymentTerms: 'Payment terms',
};
const TOTAL_FIELDS = {
  subtotal: 'Printed subtotal', gst: 'Printed GST', tax: 'Printed tax', includedTax: 'Tax included in printed total',
  shipping: 'Printed freight', handling: 'Printed handling', discount: 'Printed discount', total: 'Printed total',
};

export function extractedDetailsForSave(draft) {
  const details = {};
  for (const key of Object.keys(DETAIL_FIELDS)) {
    if (typeof draft[key] === 'string' && draft[key].trim()) details[key] = draft[key].trim().slice(0, 500);
  }
  for (const [field, limit] of [['printedTotals', 30], ['totalEvidence', 300]]) {
    details[field] = Object.fromEntries(Object.entries(draft[field] || {})
      .filter(([key, value]) => key in TOTAL_FIELDS && typeof value === 'string' && value.length <= limit));
  }
  return details;
}

export function visibleDocumentDetails(draft) {
  return [...Object.entries(DETAIL_FIELDS).map(([key, label]) => [label, draft[key]]),
    ...Object.entries(TOTAL_FIELDS).map(([key, label]) => [label, draft.printedTotals?.[key]])]
    .filter(([, value]) => value != null && value !== '');
}
