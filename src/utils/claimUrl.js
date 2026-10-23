export const CLAIM_ORIGIN = "https://nexa-port-frontend.vercel.app";

export function claimUrl(path) {
  return new URL(path, CLAIM_ORIGIN).toString();
}

export function companyClaimUrl(id) {
  return claimUrl(`/companies/${encodeURIComponent(id)}/claim`);
}

export function professionalClaimUrl(type, id) {
  return claimUrl(`/professionals/${encodeURIComponent(type)}/${encodeURIComponent(id)}/claim`);
}

export async function copyClaimUrl(url, clipboard = navigator.clipboard) {
  await clipboard.writeText(url);
}
