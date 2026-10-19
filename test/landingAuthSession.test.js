import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { initialPublicSessionStatus, publicSessionFailureStatus } from "../src/utils/publicSessionState.js";
import { workspaceDestination } from "../src/utils/workspaceRoles.js";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("optional public session check distinguishes invalid credentials from temporary failures", () => {
  assert.equal(initialPublicSessionStatus(null), "unauthenticated");
  assert.equal(initialPublicSessionStatus("stored-token"), "checking");
  assert.equal(publicSessionFailureStatus({ response: { status: 401 } }), "unauthenticated");
  for (const status of [403, 500, 503]) {
    assert.equal(publicSessionFailureStatus({ response: { status } }), "indeterminate");
  }
  assert.equal(publicSessionFailureStatus(new Error("offline")), "indeterminate");
});

test("landing and login gate share validation and keep all public registrations", async () => {
  const [landing, auth, app, api, client] = await Promise.all([
    source("src/pages/Landing.jsx"), source("src/pages/Auth.jsx"), source("src/App.jsx"),
    source("src/api/Auth.js"), source("src/api/axiosClient.js"),
  ]);
  assert.match(landing, /useValidatedSession\(\)/);
  assert.match(landing, /session\.status === "checking"/);
  assert.match(landing, /session\.status === "unauthenticated"/);
  assert.match(landing, /session\.status === "authenticated"/);
  assert.match(landing, /session\.status === "indeterminate"/);
  assert.match(landing, /to="\/login"/);
  assert.match(landing, /to="\/login\?mode=register"/);
  assert.match(landing, /to="\/dashboard"/);
  assert.match(auth, /searchParams\.get\("mode"\) === "register"/);
  assert.match(auth, /setSearchParams/);
  for (const route of ["/register-client", "/register-consultant", "/register-maritime-company"]) assert.ok(auth.includes(route));
  assert.match(app, /const session = useValidatedSession\(\)/);
  assert.match(app, /workspaceDestination\(user\)/);
  assert.match(api, /axiosClient\.get\("\/auth\/me", config\)/);
  assert.match(client, /!err\.config\?\.skipAuthRedirect/);
});

test("the existing active role and client approval still choose the workspace", () => {
  for (const role_id of [1, 2, 3, 4]) {
    assert.equal(workspaceDestination({ role_id, verification_status: "approved" }), "/dashboard");
  }
  assert.equal(workspaceDestination({ role_id: 3, verification_status: "pending" }), "/client-verification-status");
});
