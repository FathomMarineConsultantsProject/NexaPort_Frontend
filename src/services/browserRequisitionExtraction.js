export function startBrowserExtraction(blob,fileType,onProgress){
 const worker=new Worker(new URL('../workers/requisitionWorker.js',import.meta.url),{type:'module'});
 let rejectRun;const promise=new Promise((resolve,reject)=>{rejectRun=reject;worker.onmessage=event=>{const data=event.data;if(data.kind==='progress')onProgress?.(data);else if(data.kind==='done'){worker.terminate();resolve(data.result)}else if(data.kind==='error'){worker.terminate();reject(new Error(data.message))}};worker.onerror=event=>{worker.terminate();reject(new Error(event.message||'Browser parser failed to load'))};worker.postMessage({blob,fileType})});
 return {promise,cancel:()=>{worker.terminate();rejectRun(new Error('Extraction cancelled. Select the file again to retry.'))}};
}
