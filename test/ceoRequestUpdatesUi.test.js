import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { getVisibleDirectoryGroups, ADMIN_DIRECTORIES } from "../src/config/adminDirectories.js";
import { generateScopeDraft, includeLegacyCertification, scopeGenerationErrorMessage } from "../src/components/requests/scopeAssistantState.js";
const source = (path) => readFile(new URL(`../src/${path}`, import.meta.url), "utf8");

test("scope errors distinguish blocked configuration from traffic limits without exposing provider text", () => {
  const failure = (code) => ({ response: { data: { code, message: "private provider credentials" } } });
  assert.match(scopeGenerationErrorMessage(failure("AI_PROVIDER_ACCESS_DENIED")), /backend OpenRouter configuration/);
  assert.match(scopeGenerationErrorMessage(failure("AI_PROVIDER_PROJECT_ACCESS_DENIED")), /backend OpenRouter configuration/);
  assert.match(scopeGenerationErrorMessage(failure("AI_PROVIDER_RATE_LIMITED")), /limit reached/);
  assert.match(scopeGenerationErrorMessage(failure("unknown")), /temporarily unavailable/);
  assert.doesNotMatch(scopeGenerationErrorMessage(failure("unknown")), /private provider/);
});

test("Consultants stays available to previous non-Client roles under Directories; other entries stay Admin-only", async () => {
  for (const role of [1, 2, 4]) {
    const groups = getVisibleDirectoryGroups(role);
    assert.equal(groups[0].label, "Compliance & Inspection");
    assert.ok(!groups.some((group) => group.label === "Consultants"));
    const entries = groups.flatMap((group) => group.items);
    assert.ok(entries.some((item) => item.path === "/experts"));
    if (role !== 1) assert.deepEqual(entries.map((item) => item.path), ["/experts"]);
  }
  assert.deepEqual(getVisibleDirectoryGroups(3), []);
  assert.deepEqual(getVisibleDirectoryGroups(1).flatMap((group) => group.items).filter((item) => item.path !== "/experts").map((item) => item.path), ADMIN_DIRECTORIES.map((item) => item.path));
  const navbar = await source("components/layout/Navbar.jsx");
  assert.doesNotMatch(navbar, /<NavLink to="\/experts"/);
  assert.equal((navbar.match(/visibleDirectoryGroups.map/g) || []).length, 2);
  assert.match(await source("App.jsx"), /path="\/experts" element=\{<HideFromClient>/);
});

test("new form wording, Company profile prefill and seven Vessel/Port fields", async () => {
  const jsx = await source("pages/PostServiceRequest.jsx");
  assert.match(jsx, /<h1>Service Request<\/h1>/);
  assert.match(jsx, /<label>Services Required<\/label>/);
  assert.match(jsx, /Submitted for Admin review\./);
  assert.match(jsx, /"Post"/);
  assert.match(jsx, /getMyClientOnboarding/);
  assert.match(jsx, /company\?\.legal_name/);
  assert.match(jsx, /readOnly=\{isClient\(\)\}/);
  const vessel = jsx.split("<h2>Vessel and Port Particulars</h2>")[1].split("</section>")[0];
  for (const field of ["vesselName", "imoNumber", "vesselType", "flagState", "portId", "terminalName", "eta"]) assert.ok(vessel.includes(field), field);
  assert.doesNotMatch(vessel, /Country|Location Summary|Required Certification/);
  assert.doesNotMatch(jsx, /formData\.(country|locationSummary|requiredCertification)/);
  assert.match(jsx, /AgentDetailsFields/);
  assert.match(jsx, /ScopeAssistant/);
});

test("both edit surfaces omit hidden fields, retain canonical selection and offer Terminal/agents/scope", async () => {
  for (const page of ["ServiceRequestDetails", "ServiceRequests"]) {
    const jsx = await source(`pages/${page}.jsx`);
    assert.match(jsx, /Services Required/);
    assert.doesNotMatch(jsx, /<label[^>]*>Inspection type/i);
    assert.match(jsx, /<PortSelect/);
    assert.match(jsx, /<AgentDetailsFields/);
    assert.match(jsx, /<ScopeAssistant/);
    assert.match(jsx, /terminalName/);
    assert.doesNotMatch(jsx, /<label>(?:Country|Location Summary|Required Certification)<input/);
    assert.doesNotMatch(jsx, /\["(?:country|locationSummary|requiredCertification)",/);
    assert.doesNotMatch(jsx, /(?:country|locationSummary|requiredCertification): request\./);
  }
});

test("Others remains API Other, and Dry Dock Specification Reviews remains canonically seeded/searchable", async () => {
  const selector = await source("components/requests/InspectionCatalogueSelect.jsx");
  assert.match(selector, /<h3>Others<\/h3>/);
  assert.match(selector, /Search services, inspections or surveys/);
  assert.match(selector, /aria-label="Services Required"/);
  assert.match(selector, /vertical.name.*method.name/);
  const posting = await source("pages/PostServiceRequest.jsx"); assert.match(posting, /serviceType: "Other"/);
  const sql = await readFile(new URL("../../NexaPort_Backend/sql/service_request_inspection_catalogue_001.sql", import.meta.url), "utf8");
  assert.match(sql, /\('dry-dock', 'Dry Dock',/);
  assert.match(sql, /\('dry-dock', 'dry-dock-specification-reviews', 'Dry Dock Specification Reviews',/);
});

test("successful AI generation updates an editable draft without submitting", async () => {
  let scope = "Old scope", called = 0;
  await generateScopeDraft(async (input) => { assert.equal(input.keywords, "hull"); called += 1; return { scopeOfWork: "Generated scope" }; }, { keywords: "hull" }, (value) => { scope = value; });
  assert.equal(scope, "Generated scope"); assert.equal(called, 1);
  const jsx = await source("components/requests/ScopeAssistant.jsx");
  assert.match(jsx, /type="button"/);
  assert.doesNotMatch(jsx, /createServiceRequest|handleSubmit|\.submit\(/);
  assert.match(await source("pages/PostServiceRequest.jsx"), /<ScopeEditor value=\{formData.scopeOfWork\}/);
});

test("AI errors/empty response retain existing scope and explicit certification action is idempotent", async () => {
  let scope = "Keep existing draft";
  for (const generate of [async () => { throw new Error("Provider unavailable"); }, async () => ({ scopeOfWork: "" })]) await assert.rejects(generateScopeDraft(generate, {}, (value) => { scope = value; }));
  assert.equal(scope, "Keep existing draft");
  const appended = includeLegacyCertification(scope, "ISM Auditor");
  assert.equal(includeLegacyCertification(appended, "ISM Auditor"), appended);
  assert.equal(includeLegacyCertification(scope, ""), scope);
});

test("workflow surfaces show operational context and retain legacy Company labeling", async () => {
  const overview = await source("components/workflow/stages/StageOverview.jsx");
  for (const label of ["Company", "Legacy requester", "Services Required", "Terminal", "ETA"]) assert.ok(overview.includes(label));
  assert.match(overview, /AgentDetails/);
  const prep = await source("components/workflow/stages/StagePreparation.jsx");
  assert.match(prep, /Terminal/); assert.match(prep, /portAgent/);
});

test("Inspector Search includes Consultants by default and links their profiles", async () => {
  const jsx = await source("pages/InspectorSearch.jsx");
  assert.match(jsx, /type: ""/);
  assert.match(jsx, /All inspector types/);
  assert.match(jsx, /nexaport_consultant: "Nexaport Consultant"/);
  assert.match(jsx, /return `\/experts\/\$\{item.source_id\}`/);
});

test("Scope Assistant sends context, shows loading/errors and keeps draft state on failure", async () => {
  const jsx = await source("components/requests/ScopeAssistant.jsx");
  for (const key of ["keywords", "inspectionMethodId", "vesselType", "portId", "portName", "terminalName", "eta", "existingScope"]) assert.ok(jsx.includes(key));
  assert.match(jsx, /setBusy\(true\)/);
  assert.match(jsx, /finally \{ setBusy\(false\); \}/);
  assert.match(jsx, /Generating\.\.\./);
  assert.match(jsx, /scopeGenerationErrorMessage/);
  const failure = jsx.split("} catch")[1].split("finally")[0];
  assert.doesNotMatch(failure, /onChange|setKeywords/);
});
