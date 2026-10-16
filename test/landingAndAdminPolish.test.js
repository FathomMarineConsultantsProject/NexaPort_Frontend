import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (path) => readFile(new URL(`../${path}`, import.meta.url), "utf8");

test("landing keeps section anchors, registration routes, and the approved photograph", async () => {
  const landing = await source("src/pages/Landing.jsx");
  for (const anchor of ["how-it-works", "platform", "directories", "for-you"]) {
    assert.match(landing, new RegExp(`id="${anchor}"`));
  }
  for (const route of ["/register-client", "/register-consultant", "/register-maritime-company"]) {
    assert.ok(landing.includes(route));
  }
  assert.match(landing, /landing-cargo-vessel\.jpg/);
  assert.doesNotMatch(landing, /Photo: Reco Alleyne/);
});

test("landing motion is one-time, optional and reduced for user preference", async () => {
  const [landing, styles] = await Promise.all([source("src/pages/Landing.jsx"), source("src/pages/Landing.css")]);
  assert.match(landing, /IntersectionObserver/);
  assert.match(landing, /observer\.unobserve\(entry\.target\)/);
  assert.match(landing, /prefers-reduced-motion: reduce/);
  assert.match(styles, /@media \(prefers-reduced-motion: reduce\)/);
  assert.doesNotMatch(styles, /transition:\s*all\b/);
  assert.doesNotMatch(styles, /counter\(journey/);
});

test("Admin profile rate and request identity panels stay role gated", async () => {
  const [profile, request, agent] = await Promise.all([
    source("src/pages/ExpertProfile.jsx"),
    source("src/pages/ServiceRequestDetails.jsx"),
    source("src/components/requests/AgentDetails.jsx"),
  ]);
  assert.match(profile, /day_rate_usd: expertRes\.data\.day_rate_usd \?\? ""/);
  assert.match(profile, /expert: \{ day_rate_usd:/);
  assert.match(profile, /isSuperAdmin\(\) && <label>Profile day rate/);
  assert.match(request, /isSuperAdmin\(\) && <div className="side-info-card submitted-by-card"/);
  assert.match(request, /<AgentDetails value=\{request\.agentDetails\}/);
  assert.match(agent, /request-agent-details side-info-card/);
});
