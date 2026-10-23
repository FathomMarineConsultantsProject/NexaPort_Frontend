import test from "node:test";
import assert from "node:assert/strict";
import { companyClaimUrl, copyClaimUrl, professionalClaimUrl } from "../src/utils/claimUrl.js";

test("claim links use the deployed origin and exact target identity", () => {
  const companyId = "11111111-1111-4111-8111-111111111111";
  assert.equal(companyClaimUrl(companyId), `https://nexa-port-frontend.vercel.app/companies/${companyId}/claim`);
  assert.equal(professionalClaimUrl("flag_inspector", "42"), "https://nexa-port-frontend.vercel.app/professionals/flag_inspector/42/claim");
});

test("copy reports success only after clipboard writes and preserves failures", async () => {
  const url = professionalClaimUrl("expert", "93");
  let copied = "";
  await copyClaimUrl(url, { writeText: async (value) => { copied = value; } });
  assert.equal(copied, url);
  await assert.rejects(copyClaimUrl(url, { writeText: async () => { throw new Error("Clipboard unavailable"); } }), /Clipboard unavailable/);
});
