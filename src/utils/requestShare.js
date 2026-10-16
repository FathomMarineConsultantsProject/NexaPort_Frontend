export function requestShareUrl(locator, origin) {
  if (!/^[0-9a-f]{64}$/.test(locator || "")) throw new Error("Invalid share locator");
  return new URL(`/s/${locator}`, origin).href;
}

export async function copyShareUrl(shareUrl, writeText) {
  if (typeof writeText !== "function") return false;
  try {
    await writeText(shareUrl);
    return true;
  } catch {
    return false;
  }
}
