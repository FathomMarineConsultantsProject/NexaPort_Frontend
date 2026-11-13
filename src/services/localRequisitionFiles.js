// Legacy cleanup only. New intake never opens or writes this database.
export function purgeLegacyRequisitionFiles(){
 return new Promise((resolve,reject)=>{
  const request=indexedDB.deleteDatabase('nexaport-local-requisition-files');
  request.onsuccess=()=>resolve();
  request.onerror=()=>reject(request.error||new Error('Could not remove legacy local documents'));
  request.onblocked=()=>reject(new Error('Close other NexaPort tabs and try again'));
 });
}