import test from "node:test";
import assert from "node:assert/strict";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import WorkspaceChoices from "../src/components/auth/WorkspaceChoices.js";
import { hasMultipleRoles, loginDestination, selectWorkspace } from "../src/utils/workspaceRoles.js";

test("single-role users route normally and see no selector", () => {
  for (const role_id of [1, 2, 3, 4]) {
    const user = { role_id, verification_status: "approved" };
    assert.equal(loginDestination(user), "/dashboard");
    assert.equal(hasMultipleRoles(user), false);
    assert.equal(renderToStaticMarkup(createElement(WorkspaceChoices, { user })), "");
  }
  assert.equal(loginDestination({ role_id: 3 }), "/client-verification-status");
});

test("multi-role login shows two operational choices and indicates the current role", () => {
  const user = { id: 7, roles: [2, 3], role_id: 3 };
  assert.equal(loginDestination(user), "/choose-workspace");
  const html = renderToStaticMarkup(createElement(WorkspaceChoices, { user }));
  assert.equal((html.match(/<button/g) || []).length, 2);
  assert.match(html, /Consultant/);
  assert.match(html, /Client/);
  assert.match(html, /Current role/);
  assert.doesNotMatch(html, /Super Admin|Maritime Company/);
  assert.match(renderToStaticMarkup(createElement(WorkspaceChoices, { user, busy: true })), /disabled/);
});

test("switching persists the backend session and routes correctly; unassigned roles never submit", async () => {
  const user = { id: 7, roles: [2, 3], role_id: 3 };
  const saved = {};
  const storage = { setItem: (key, value) => { saved[key] = value; } };
  for (const role_id of [2, 3]) {
    const next = { ...user, role_id, active_role: role_id, verification_status: "approved" };
    assert.equal(await selectWorkspace(user, role_id, async () => ({ user: next, token: "test-token" }), storage), "/dashboard");
    assert.equal(JSON.parse(saved.np_user).role_id, role_id);
    assert.equal(JSON.parse(saved.np_user).id, 7);
  }
  for (const role of [1, 4, "2"]) {
    await assert.rejects(selectWorkspace(user, role, () => assert.fail("invalid role submitted"), storage));
  }
  const before = { ...saved };
  await assert.rejects(selectWorkspace(user, 2, async () => { throw new Error("Denied"); }, storage));
  assert.deepEqual(saved, before);
  assert.equal(await selectWorkspace(user, 3, async () => ({ user: { ...user, verification_status: "pending" }, token: "test-token" }), storage), "/client-verification-status");
});
