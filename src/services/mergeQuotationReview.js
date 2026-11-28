const present=value=>value!==null&&value!==undefined&&String(value).trim()!=='';
const fields=['vesselName','shipReference','deliveryDate','supplierQuotationReference','rfqReference','quotationDate','expiryDate','defaultCurrency','commercialTerms'];
const rowFields=['description','impaCode','makerReference','quantity','uom','currency','unitPrice','statedLineTotal'];

export function mergeQuotationReview(baseline,candidate){
 const merged={...baseline};
 for(const field of fields)if(!present(baseline[field])&&present(candidate[field]))merged[field]=candidate[field];
 const original=new Map(baseline.lines.map(row=>[String(row.supplierLineNumber||row.sourceOrder),row]));
 merged.lines=candidate.lines.map(row=>{
  const previous=original.get(String(row.supplierLineNumber||row.sourceOrder));
  if(!previous)return {...row,reviewConfirmed:false};
  const next={...previous};
  for(const field of rowFields)if(!present(previous[field])&&present(row[field])&&present(row.sourceEvidence))next[field]=row[field];
  if(rowFields.some(field=>next[field]!==previous[field])){next.reviewStatus='corrected';next.reviewConfirmed=false}
  return next;
 });
 for(const row of baseline.lines)if(!merged.lines.some(value=>String(value.supplierLineNumber||value.sourceOrder)===String(row.supplierLineNumber||row.sourceOrder)))merged.lines.push(row);
 return merged;
}
