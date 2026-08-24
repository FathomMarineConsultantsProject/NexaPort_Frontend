const MAX_EDGE = 2400;
const PASSTHROUGH_BYTES = 2 * 1024 * 1024;

const extensionFor = (type) => type === "image/webp" ? "webp" : type === "image/png" ? "png" : "jpg";

export async function optimizeReportImage(file) {
  if (!file || !["image/jpeg", "image/png", "image/webp"].includes(file.type)) return file;
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  try {
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    if (scale === 1 && file.size <= PASSTHROUGH_BYTES) return file;
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d", { alpha: file.type === "image/png" });
    if (!context) return file;
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const outputType = file.type;
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, outputType, outputType === "image/png" ? undefined : 0.86));
    if (!blob || blob.size >= file.size) return file;
    const baseName = file.name.replace(/\.[^.]+$/, "") || "daily-report-photo";
    return new File([blob], `${baseName}.${extensionFor(outputType)}`, { type: outputType, lastModified: file.lastModified });
  } finally {
    bitmap.close();
  }
}
