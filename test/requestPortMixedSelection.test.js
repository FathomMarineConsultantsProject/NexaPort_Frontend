import assert from "node:assert/strict";
import test from "node:test";
import { requestPortPayload, selectionPatch } from "../src/components/requests/requestPortState.js";

test("existing and new ports retain one primary identity in the create payload", () => {
  const existing = { id: 4, port_name: "Singapore", country: "Singapore" };
  const manual = { key: "manual:entry1", manual: true, port_name: "New Harbour", country: "India" };
  const state = selectionPatch([existing, manual], "port:4");
  assert.equal(state.portId, 4);
  assert.equal(state.primaryPortKey, "port:4");
  assert.deepEqual(requestPortPayload(state), {
    portIds: [4], manualPorts: [{ key: "manual:entry1", portName: "New Harbour", country: "India" }], primaryPortKey: "port:4",
  });
  const manualPrimary = selectionPatch(state.ports, "manual:entry1");
  assert.equal(manualPrimary.portId, null);
  assert.equal(requestPortPayload(manualPrimary).primaryPortKey, "manual:entry1");
});
