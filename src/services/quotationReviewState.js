export const money=x=>{const s=String(x??'');if(!/^\d+(?:\.\d{1,4})?$/.test(s))return null;const [a,b='']=s.split('.');return BigInt(a)*10000n+BigInt(b.padEnd(4,'0'))};
export const fmt=x=>`${x/10000n}.${String(x%10000n).padStart(4,'0')}`;
const hasPricing=r=>Boolean(r.unitPrice||r.statedLineTotal||(r.lineDiscount&&money(r.lineDiscount)!==0n));
export const lineNeedsAttention=(r,defaultCurrency)=>{const p=money(r.unitPrice),q=money(r.quantity),stated=money(r.statedLineTotal),discount=money(r.lineDiscount)||0n,priced=hasPricing(r);if((r.reviewStatus==='needs_review'||r.reviewConfirmed===false)||q===null||!r.uom||priced&&(p===null||!(r.currency||defaultCurrency)))return true;if(!priced)return false;const calculated=(p*q+5000n)/10000n-discount,difference=stated===null?0n:(calculated>stated?calculated-stated:stated-calculated);return stated!==null&&difference>(q*50n+5000n)/10000n;};
export function rowValidationErrors(row, defaultCurrency) {
 const errors=[];
 const quantity=money(row.quantity), price=money(row.unitPrice), total=money(row.statedLineTotal);
 const discount=money(row.lineDiscount);
 if(!row.description?.trim())errors.push('Description is missing');
 if(!row.uom?.trim())errors.push('Unit is missing');
 const priced=hasPricing(row);
 if(priced&&!/^[A-Z]{3}$/.test(row.currency||defaultCurrency||''))errors.push('Enter a three-letter currency code');
 if(quantity===null||quantity<=0n||!/^\d+(?:\.\d{1,3})?$/.test(row.quantity||''))errors.push('Quantity must be positive with at most three decimal places');
 if(priced&&price===null)errors.push('Enter a valid unit price');
 if(priced&&total===null)errors.push('Enter the printed line total');
 if(row.lineDiscount && discount===null)errors.push('Enter a valid discount');
 if(quantity!==null&&price!==null&&total!==null){
  const gross=(quantity*price+5000n)/10000n;
  if((discount||0n)>gross)errors.push('Discount exceeds the line price');
  else if(lineNeedsAttention({...row,reviewStatus:'corrected',reviewConfirmed:true},defaultCurrency))errors.push('Printed line total does not reconcile with quantity, price and discount');
 }
 return errors;
}
export const canConfirmRow=(row,currency)=>!rowValidationErrors(row,currency).length;
export function totals(draft){const sums={};for(const r of draft?.lines||[]){const p=money(r.unitPrice),q=money(r.quantity),c=r.currency||draft.defaultCurrency;if(p===null||q===null||!c)continue;const calculated=(p*q+5000n)/10000n-(money(r.lineDiscount)||0n),printed=money(r.statedLineTotal),difference=printed===null?0n:(calculated>printed?calculated-printed:printed-calculated),line=printed!==null&&difference<=(q*50n+5000n)/10000n?printed:calculated;sums[c]=(sums[c]||0n)+line;}for(const ch of draft?.charges||[]){const a=money(ch.amount),c=ch.currency||draft.defaultCurrency;if(a===null||!c)continue;sums[c]=(sums[c]||0n)+(ch.kind==='discount'?-a:a);}return Object.fromEntries(Object.entries(sums).map(([c,v])=>[c,fmt(v)]));}
export const isFinancialWarning=code=>/^(?:LINE_TOTAL_MISMATCH|DOCUMENT_TOTAL_MISMATCH|SUBTOTAL_MISMATCH|TOTAL_MISMATCH|INVALID_DISCOUNT|NEGATIVE_TOTAL|MISSING_CHARGE|CHARGE_CLASSIFICATION_UNSUPPORTED)$/.test(code||'');
export function financialIssues(draft){
 if(!draft)return [];
 const issues=[];
 for(const row of draft.lines||[]){
  const p=money(row.unitPrice),q=money(row.quantity),printed=money(row.statedLineTotal);
  if(p===null||q===null||printed===null)continue;
  const calculated=(p*q+5000n)/10000n-(money(row.lineDiscount)||0n),difference=calculated>printed?calculated-printed:printed-calculated;
  if(difference>(q*50n+5000n)/10000n)issues.push(`Line ${row.sourceOrder}: printed ${row.currency||draft.defaultCurrency||''} ${fmt(printed)}; calculated ${fmt(calculated)}. Check quantity, unit price, discount and line total.`);
 }
 for(const [index,charge] of (draft.charges||[]).entries())if(money(charge.amount)===null)issues.push(`Charge ${index+1} (${charge.kind}) has no amount. Enter the printed amount or remove the unsupported charge.`);
 const calculated=totals(draft);
 for(const [currency,printed] of Object.entries(draft.statedTotals||{}))if(money(printed)!==money(calculated[currency]))issues.push(`Printed ${currency} total ${printed}; calculated ${calculated[currency]||'unavailable'}. Check item totals, freight, tax and discounts.`);
 return issues;
}
export function activeWarnings(draft,supplierName=draft?.supplierName){
 if(!draft)return [];
 return (draft.warnings||[]).filter(w=>{
  if(w.code==='MISSING_TOTAL')return !draft.statedTotals?.[draft.defaultCurrency];
  if(w.code==='FINANCIAL_REVIEW')return financialIssues(draft).length>0;
  if(w.code==='MISSING_UOM')return Boolean(draft.lines?.find(r=>r.sourceOrder===w.sourceOrder&&!r.uom?.trim()));
  if(w.code!=='MISSING_FIELD')return true;
  const label=(w.message||'').toLowerCase();
  if(w.sourceOrder!=null){
   const row=draft.lines?.find(r=>r.sourceOrder===w.sourceOrder);
   if(!row)return false;
   const fields=[['printed line total','statedLineTotal'],['unit price','unitPrice'],['quantity','quantity'],['description','description'],['currency','currency'],['unit','uom']];
   const field=fields.find(([name])=>label.startsWith(name));
   if(field&&field[1]==='uom')return false;
   return field?!(row[field[1]]||(field[1]==='currency'&&draft.defaultCurrency)):true;
  }
  if(label.includes('supplier name'))return !supplierName?.trim();
  if(label.includes('quotation reference'))return !draft.supplierQuotationReference?.trim();
  if(label.includes('currency'))return !draft.defaultCurrency?.trim();
  return true;
 });
}
