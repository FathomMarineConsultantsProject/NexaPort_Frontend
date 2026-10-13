import test from "node:test";
import assert from "node:assert/strict";
import { loginPathFor, safeReturnPath } from "../src/utils/safeReturnPath.js";

const shared = `/s/${"a".repeat(64)}`;
test("allows only an internal opaque share destination", () => {
  assert.equal(safeReturnPath(shared), shared);
  assert.equal(loginPathFor(shared), `/login?returnTo=${encodeURIComponent(shared)}`);
  for (const candidate of ["https://evil.test/s/" + "a".repeat(64), "//evil.test", "javascript:alert(1)", "/requests/4", shared + "?next=//evil.test", "/s/4", "/s/" + "a".repeat(64) + "\\evil"]) {
    assert.equal(safeReturnPath(candidate), null, candidate);
  }
});
