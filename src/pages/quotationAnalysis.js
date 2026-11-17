const sourceSignature = workspace => JSON.stringify({
  items: workspace.items.map(item => item.id),
  quotations: workspace.quotes.map(quote => [quote.quote_id, quote.revision_id]),
  lines: workspace.lines.map(line => [line.id, line.revision_id]),
});

export async function analyzeQuotationComparison({requisitionId,currency,previous=null,dirtyIds=[],overrides={},requestKeyFor,onProgress},api){
  onProgress('Loading finalized quotations');
  const loaded=await api.getComparison(requisitionId);
  if(!loaded.quotes.length)throw new Error('Finalize at least one supplier quotation before comparing prices.');
  const sameSource=previous?.data&&sourceSignature(previous.data)===sourceSignature(loaded);
  if(dirtyIds.length&&(!sameSource||previous.data.matchRevision!==loaded.matchRevision))throw new Error('Quotation or match decisions changed. Reload the comparison before saving your corrections.');
  const edits=new Map(sameSource?previous.matches.filter(match=>dirtyIds.includes(match.quotationLineId)).map(match=>[match.quotationLineId,match]):[]);
  const decisions=loaded.matches.map(match=>{
    const edit=edits.get(match.quotationLineId);
    const current=edit?{...match,requisitionItemId:edit.requisitionItemId,status:edit.status,reason:edit.reason,reviewed:true,method:'manual'}:match;
    return {quotationRevisionId:current.quotationRevisionId,quotationLineId:current.quotationLineId,requisitionItemId:current.requisitionItemId,status:current.status,reason:current.reason,reviewed:!!current.reviewed||current.method==='manual'};
  });
  let workspace=loaded;
  if(!loaded.matchRevision||edits.size){
    onProgress('Saving safe matches');
    const fingerprint=JSON.stringify({source:sourceSignature(loaded),decisions});
    await api.saveComparisonMatches(requisitionId,{requestKey:requestKeyFor(fingerprint),decisions});
    workspace=await api.getComparison(requisitionId);
    if(!workspace.matchRevision)throw new Error('Saved matches are stale. Analyze the latest quotation revisions again.');
    for(const edit of edits.values()){
      const saved=workspace.matches.find(match=>match.quotationLineId===edit.quotationLineId);
      if(!saved||saved.requisitionItemId!==edit.requisitionItemId||saved.status!==edit.status||saved.reason!==edit.reason||!saved.reviewed)
        throw new Error('A manual match correction did not persist. Reload before continuing.');
    }
  }
  const validItems=new Set(workspace.items.map(item=>item.id)),validLines=new Set(workspace.lines.map(line=>line.id));
  const validOverrides=Object.fromEntries(Object.entries(overrides).filter(([itemId,lineId])=>validItems.has(itemId)&&validLines.has(lineId)));
  onProgress('Refreshing published FX rates');
  const rates=await api.getComparisonRates(requisitionId,currency);
  onProgress('Calculating purchasing strategies');
  const preview=await api.previewComparison(requisitionId,{targetCurrency:currency,rates,overrides:validOverrides});
  return {workspace,matches:workspace.matches,rates,preview,overrides:validOverrides};
}
