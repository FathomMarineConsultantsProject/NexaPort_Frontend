import axiosClient from "./axiosClient";

const unwrap = (response) => response.data;
export const getTemplates = () => axiosClient.get("/templates").then(unwrap);
export const getTemplate = (id) => axiosClient.get(`/templates/${id}`).then(unwrap);
export const createTemplate = (payload) => axiosClient.post("/templates", payload).then(unwrap);
export const updateTemplate = (id, payload) => axiosClient.patch(`/templates/${id}`, payload).then(unwrap);
export const saveTemplateVersion = (id, fields, layout = {}) => axiosClient.post(`/templates/${id}/versions`, { fields, layout }).then(unwrap);
export const duplicateTemplate = (id) => axiosClient.post(`/templates/${id}/duplicate`).then(unwrap);
export const mapTemplateFields = (evidence) => axiosClient.post("/templates/map-fields", evidence).then(unwrap);
