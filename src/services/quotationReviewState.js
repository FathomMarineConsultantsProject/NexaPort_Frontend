export const money=x=>{const s=String(x??'');if(!/^\d+(?:\.\d{1,4})?$/.test(s))return null;const [a,b='']=s.split('.');return BigInt(a)*10000n+BigInt(b.padEnd(4,'0'))};
export const fmt=x=>`${x/10000n}.${String(x%10000n).padStart(4,'0')}`;
export const lineNeedsAttention=(r,defaultCurrency)=>{const p=money(r.unitPrice),q=money(r.quantity),stated=money(r.statedLineTotal),discount=money(r.lineDiscount)||0n;if((r.reviewStatus==='needs_review'||r.reviewConfirmed===false)||p===null||q===null||!r.uom||!(r.currency||defaultCurrency))return true;const calculated=(p*q+5000n)/10000n-discount,difference=stated===null?0n:(calculated>stated?calculated-stated:stated-calculated);return stated!==null&&difference>(q*50n+5000n)/10000n;};
export const canConfirmRow=(r,defaultCurrency)=>Boolean(r.description?.trim()&&r.uom&&(r.currency||defaultCurrency)&&money(r.quantity)!==null&&money(r.unitPrice)!==null&&money(r.statedLineTotal)!==null&&!lineNeedsAttention({...r,reviewStatus:'corrected',reviewConfirmed:true},defaultCurrency));
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
  if(w.code!=='MISSING_FIELD')return true;
  const label=(w.message||'').toLowerCase();
  if(w.sourceOrder!=null){
   const row=draft.lines?.find(r=>r.sourceOrder===w.sourceOrder);
   if(!row)return true;
   const fields=[['printed line total','statedLineTotal'],['unit price','unitPrice'],['quantity','quantity'],['description','description'],['currency','currency'],['unit','uom']];
   const field=fields.find(([name])=>label.startsWith(name));
   return field?!row[field[1]]:true;
  }
  if(label.includes('supplier name'))return !supplierName?.trim();
  if(label.includes('quotation reference'))return !draft.supplierQuotationReference?.trim();
  if(label.includes('currency'))return !draft.defaultCurrency?.trim();
  return true;
 });
}
