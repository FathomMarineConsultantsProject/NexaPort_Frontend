import axiosClient from "./axiosClient";

export const getInspectionWorkflows = async (params = {}) => (await axiosClient.get("/inspection-workflows", { params })).data;
export const getInspectionWorkflow = async (requestId) => (await axiosClient.get(`/inspection-workflows/${requestId}`)).data;
export const initializeInspectionWorkflow = async (requestId) => (await axiosClient.post(`/inspection-workflows/${requestId}/initialize`)).data;
export const updateInspectionWorkflowStage = async (requestId, payload) => (await axiosClient.patch(`/inspection-workflows/${requestId}/stage`, payload)).data;
export const selectWorkflowQuotation = async (requestId, payload) => (await axiosClient.patch(`/inspection-workflows/${requestId}/quotation`, payload)).data;
export const confirmWorkflowQuotation = async (requestId, payload) => (await axiosClient.post(`/inspection-workflows/${requestId}/confirm`, payload)).data;
export const saveWorkflowPreparation = async (requestId, data) => (await axiosClient.put(`/inspection-workflows/${requestId}/preparation`, { data })).data;
export const completeWorkflowPreparation = async (requestId, data) => (await axiosClient.post(`/inspection-workflows/${requestId}/preparation/complete`, { data })).data;
export const getWorkflowTemplates = async (requestId) => (await axiosClient.get(`/inspection-workflows/${requestId}/templates`)).data;
export const selectChecklistTemplate = async (requestId, templateId) => (await axiosClient.post(`/inspection-workflows/${requestId}/checklist/template`, { templateId })).data;
export const saveWorkflowChecklist = async (requestId, values) => (await axiosClient.put(`/inspection-workflows/${requestId}/checklist`, { values })).data;
export const completeWorkflowChecklist = async (requestId) => (await axiosClient.post(`/inspection-workflows/${requestId}/checklist/complete`)).data;
export const getDailyReports = async (requestId) => (await axiosClient.get(`/inspection-workflows/${requestId}/daily-reports`)).data;
export const getDailyReport = async (requestId, dailyReportId) => (await axiosClient.get(`/inspection-workflows/${requestId}/daily-reports/${dailyReportId}`)).data;
export const createDailyReport = async (requestId, payload = {}) => (await axiosClient.post(`/inspection-workflows/${requestId}/daily-reports`, payload)).data;
export const saveDailyReport = async (requestId, dailyReportId, payload) => (await axiosClient.put(`/inspection-workflows/${requestId}/daily-reports/${dailyReportId}`, payload)).data;
export const generateDailyReportPdf = async (requestId, dailyReportId) => (await axiosClient.post(`/inspection-workflows/${requestId}/daily-reports/${dailyReportId}/generate`)).data;
export const finalizeDailyReport = async (requestId, dailyReportId) => (await axiosClient.post(`/inspection-workflows/${requestId}/daily-reports/${dailyReportId}/finalize`)).data;
export const uploadDailyReportPhoto = async (requestId, dailyReportId, { file, caption = "", inspectionArea = "", relatedActivityId = "" }) => {
  const signed=(await axiosClient.post(`/inspection-workflows/${requestId}/daily-reports/${dailyReportId}/photos/upload-url`,{contentType:file.type,size:file.size})).data.data;
  const uploaded=await fetch(signed.uploadUrl,{method:"PUT",headers:{"Content-Type":file.type},body:file});
  if(!uploaded.ok)throw new Error("Daily Report photograph upload failed");
  return (await axiosClient.post(`/inspection-workflows/${requestId}/daily-reports/${dailyReportId}/photos`,{uploadId:signed.uploadId,contentType:file.type,caption,inspectionArea,relatedActivityId})).data;
};
export const removeDailyReportPhoto = async (requestId, dailyReportId, photoId) => (await axiosClient.delete(`/inspection-workflows/${requestId}/daily-reports/${dailyReportId}/photos/${photoId}`)).data;
export const uploadWorkflowEvidence = async (requestId, { fieldKey, file, caption = "" }) => {
  const signed=(await axiosClient.post(`/inspection-workflows/${requestId}/evidence/upload-url`,{fieldKey,contentType:file.type,size:file.size})).data.data;
  const uploaded=await fetch(signed.uploadUrl,{method:"PUT",headers:{"Content-Type":file.type},body:file});
  if(!uploaded.ok)throw new Error("Evidence upload failed");
  return (await axiosClient.post(`/inspection-workflows/${requestId}/evidence`,{fieldKey,objectKey:signed.objectKey,caption})).data;
};
export const removeWorkflowEvidence = async (requestId, evidenceId) => (await axiosClient.delete(`/inspection-workflows/${requestId}/evidence/${evidenceId}`)).data;
export const generateWorkflowDraft = async (requestId) => (await axiosClient.post(`/inspection-workflows/${requestId}/report/generate`)).data;
export const reviewWorkflowReport = async (requestId, action) => (await axiosClient.post(`/inspection-workflows/${requestId}/report/review`, { action })).data;
export const confirmWorkflowReport = async (requestId) => (await axiosClient.post(`/inspection-workflows/${requestId}/report/confirm`)).data;
export const completeInspectionWorkflow = async (requestId) => (await axiosClient.post(`/inspection-workflows/${requestId}/complete`)).data;
export const submitWorkflowInvoice = async (requestId, { file, ...data }) => {
  let objectKey = null;
  if (file) {
    const signed=(await axiosClient.post(`/inspection-workflows/${requestId}/invoice/upload-url`,{contentType:file.type,size:file.size})).data.data;
    const uploaded=await fetch(signed.uploadUrl,{method:"PUT",headers:{"Content-Type":file.type},body:file});
    if(!uploaded.ok)throw new Error("Invoice document upload failed");
    objectKey=signed.objectKey;
  }
  return (await axiosClient.post(`/inspection-workflows/${requestId}/invoice`,{...data,objectKey})).data;
};
export const approveWorkflowInvoice = async (requestId) => (await axiosClient.post(`/inspection-workflows/${requestId}/invoice/approve`)).data;
export const payWorkflowInvoice = async (requestId, data) => (await axiosClient.post(`/inspection-workflows/${requestId}/invoice/pay`,data)).data;
