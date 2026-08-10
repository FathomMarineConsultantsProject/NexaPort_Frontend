const DB_NAME = "nexaport-report-media";
const STORE_NAME = "media";

const openDatabase = () => new Promise((resolve, reject) => {
  const request = indexedDB.open(DB_NAME, 1);
  request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: "id" });
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

const transact = async (mode, action) => {
  const database = await openDatabase();
  try {
    return await new Promise((resolve, reject) => {
      const transaction = database.transaction(STORE_NAME, mode);
      const request = action(transaction.objectStore(STORE_NAME));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    database.close();
  }
};

const mediaId = (reportId, fieldKey, itemId) => `${reportId}:${fieldKey}:${itemId}`;

export const getReportMedia = (reportId) => transact("readonly", (store) => store.getAll()).then((items) => items.filter((item) => item.reportId === String(reportId)));
export const removeReportMedia = async (reportId, fieldKey) => Promise.all((await getReportMedia(reportId)).filter((item) => item.fieldKey === fieldKey).map((item) => transact("readwrite", (store) => store.delete(item.id))));
export const removeReportMediaItem = async (reportId, fieldKey, itemId) => transact("readwrite", (store) => store.delete(mediaId(reportId, fieldKey, itemId)));
export const cacheReportMedia = async (reportId, fieldKey, file, caption = "", type = "photo", itemId = crypto.randomUUID()) => {
  await removeReportMedia(reportId, fieldKey);
  const item = { id: mediaId(reportId, fieldKey, itemId), itemId, reportId: String(reportId), fieldKey, type, caption, name: file.name, mimeType: file.type, blob: file, updatedAt: Date.now() };
  await transact("readwrite", (store) => store.put(item));
  return item;
};
export const cacheReportMediaItem = async (reportId, fieldKey, file, caption = "", type = "photo", itemId = crypto.randomUUID()) => {
  const item = { id: mediaId(reportId, fieldKey, itemId), itemId, reportId: String(reportId), fieldKey, type, caption, name: file.name, mimeType: file.type, blob: file, updatedAt: Date.now() };
  await transact("readwrite", (store) => store.put(item));
  return item;
};
export const clearReportMedia = async (reportId) => Promise.all((await getReportMedia(reportId)).map((item) => transact("readwrite", (store) => store.delete(item.id))));

export const mediaToGenerationPayload = (item) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve({ fieldKey: item.fieldKey, type: item.type, caption: item.caption || "", fileName: item.name, mimeType: item.mimeType, dataUrl: reader.result });
  reader.onerror = () => reject(reader.error);
  reader.readAsDataURL(item.blob);
});
