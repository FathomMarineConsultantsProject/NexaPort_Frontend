import axiosClient from "./axiosClient";

const unwrap = (response) => response.data;
export const createReport = (templateId, payload = {}) => axiosClient.post(`/templates/${templateId}/reports`, payload).then(unwrap);
export const getReports = () => axiosClient.get("/reports").then(unwrap);
export const getReport = (id) => axiosClient.get(`/reports/${id}`).then(unwrap);
export const saveReport = (id, values) => axiosClient.patch(`/reports/${id}`, { values }).then(unwrap);
export const generateReport = (id, media = []) => axiosClient.post(`/reports/${id}/generate`, JSON.stringify({ media }), { headers: { "Content-Type": "application/vnd.nexaport.report+json" } }).then(unwrap);
export const getReportDownloadUrl = (id) => axiosClient.get(`/reports/${id}/download-url`).then(unwrap);
