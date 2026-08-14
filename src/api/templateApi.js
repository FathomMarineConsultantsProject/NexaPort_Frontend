import axiosClient from "./axiosClient";

const unwrap = (response) => response.data;
export const getTemplates = () => axiosClient.get("/templates").then(unwrap);
export const getTemplate = (id) => axiosClient.get(`/templates/${id}`).then(unwrap);
export const createTemplate = (payload) => axiosClient.post("/templates", payload).then(unwrap);
export const updateTemplate = (id, payload) => axiosClient.patch(`/templates/${id}`, payload).then(unwrap);
export const saveTemplateVersion = (id, fields, layout = {}) => axiosClient.post(`/templates/${id}/versions`, { fields, layout }).then(unwrap);
export const duplicateTemplate = (id) => axiosClient.post(`/templates/${id}/duplicate`).then(unwrap);
export const mapTemplateFields = (evidence) => axiosClient.post("/templates/map-fields", evidence).then(unwrap);
export const analyseTemplateSource = (file, sourceType, signal) => {
  if (file.size > 4 * 1024 * 1024) return axiosClient.post("/templates/analysis-upload-url", { sourceType, fileName: file.name, contentType: file.type, size: file.size }, { signal }).then(unwrap).then(async ({ data }) => {
    const uploaded = await fetch(data.uploadUrl, { method: "PUT", headers: { "Content-Type": file.type }, body: file, signal });
    if (!uploaded.ok) throw new Error("The temporary source upload failed.");
    return axiosClient.post("/templates/analyse-object", { sourceType, objectKey: data.objectKey, fileName: file.name, contentType: file.type, size: file.size }, { signal }).then(unwrap);
  });
  const form = new FormData();
  form.append("document", file);
  form.append("sourceType", sourceType);
  return axiosClient.post("/templates/analyse", form, { signal, headers: { "Content-Type": undefined } }).then(unwrap);
};
