export function calculateQuotationExpiry(referenceDate,duration,unit){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(referenceDate||'')||!Number.isInteger(duration)||duration<0||duration>3660)return null;
 const d=new Date(`${referenceDate}T00:00:00Z`);
 if(Number.isNaN(d.getTime())||d.toISOString().slice(0,10)!==referenceDate)return null;
 if(unit==='calendar_days')d.setUTCDate(d.getUTCDate()+duration);
 else if(unit==='calendar_weeks')d.setUTCDate(d.getUTCDate()+duration*7);
 else if(unit==='calendar_months'){
  const day=d.getUTCDate();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()+duration);
  const last=new Date(Date.UTC(d.getUTCFullYear(),d.getUTCMonth()+1,0)).getUTCDate();d.setUTCDate(Math.min(day,last));
 }else return null;
 return d.toISOString().slice(0,10);
}
export function formatQuotationDate(value){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(value||''))return value||'Select a reference date';
 return new Intl.DateTimeFormat('en-GB',{day:'numeric',month:'short',year:'numeric',timeZone:'UTC'}).format(new Date(`${value}T00:00:00Z`));
}
