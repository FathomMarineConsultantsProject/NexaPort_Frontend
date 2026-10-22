import test from "node:test";
import assert from "node:assert/strict";
import { safeReturnPath, loginPathFor } from "../src/utils/safeReturnPath.js";

const company = "/companies/11111111-1111-4111-8111-111111111111/claim";

test("claim sign-in handoff retains one exact internal company path", () => {
  assert.equal(safeReturnPath(company), company);
  assert.equal(loginPathFor(company), `/login?returnTo=${encodeURIComponent(company)}`);
  for (const unsafe of ["https://evil.invalid", "//evil.invalid", "/companies/../admin/claim", `${company}?next=https://evil.invalid`, "/companies/invalid/claim"]) {
    assert.equal(safeReturnPath(unsafe), null);
  }
});

test("professional and one-time invitation paths survive sign-in without open redirects", () => {
  const professional="/professionals/flag_inspector/42/claim";
  const invitation=`/claim-invitations/${"a".repeat(64)}`;
  assert.equal(safeReturnPath(professional),professional);
  assert.equal(safeReturnPath(invitation),invitation);
  assert.equal(loginPathFor(professional),`/login?returnTo=${encodeURIComponent(professional)}`);
  assert.equal(safeReturnPath(`${invitation}?next=https://evil.invalid`),null);
  assert.equal(safeReturnPath("/professionals/flag_inspector/../claim"),null);
});
