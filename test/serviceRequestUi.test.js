import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (file) => readFile(new URL(file, import.meta.url), "utf8");

// ==========================================================================
// REQUEST LIST CARD TESTS
// ==========================================================================

test("1. Description is not rendered in a request card", async () => {
  const jsx = await source("../src/pages/ServiceRequests.jsx");
  // No request.description reference exists anywhere in the list component
  assert.doesNotMatch(jsx, /request\.description/);
});

test("2. Scope of Work is not rendered in a request card", async () => {
  const jsx = await source("../src/pages/ServiceRequests.jsx");
  // scopeOfWork only appears in the edit modal, not in the card rendering
  // Verify it does NOT appear in the card markup (between request-card and request-sidebar)
  const cardSection = jsx.split('className="request-card"')[1]?.split('className="request-sidebar"')[0] || "";
  assert.doesNotMatch(cardSection, /scopeOfWork/);
  assert.doesNotMatch(cardSection, /scope_of_work/);
});

test("3. Title is rendered in list cards", async () => {
  const jsx = await source("../src/pages/ServiceRequests.jsx");
  assert.match(jsx, /request\.title/);
  assert.match(jsx, /request-title/);
});

test("4. Vessel metadata is rendered in list cards", async () => {
  const jsx = await source("../src/pages/ServiceRequests.jsx");
  assert.match(jsx, /vessel\.name/);
  assert.match(jsx, /vessel\.imoNumber/);
  assert.match(jsx, /vessel\.flagState/);
});

test("5. Location is rendered in list cards", async () => {
  const jsx = await source("../src/pages/ServiceRequests.jsx");
  assert.match(jsx, /port\.name/);
  assert.match(jsx, /MapPin/);
});

test("6. Due date is rendered in list cards", async () => {
  const jsx = await source("../src/pages/ServiceRequests.jsx");
  assert.match(jsx, /requiredBy/);
  assert.match(jsx, /Due\b/);
  assert.match(jsx, /Calendar/);
});

test("7. Budget is rendered in list cards", async () => {
  const jsx = await source("../src/pages/ServiceRequests.jsx");
  assert.match(jsx, /budget-amount/);
  assert.match(jsx, /getBudgetLabel/);
});

test("8. Quotation count is rendered in list cards", async () => {
  const jsx = await source("../src/pages/ServiceRequests.jsx");
  assert.match(jsx, /quotations-count/);
  assert.match(jsx, /getQuotationText/);
});

test("9. View Details remains functional", async () => {
  const jsx = await source("../src/pages/ServiceRequests.jsx");
  assert.match(jsx, /View Details/);
  assert.match(jsx, /navigate\(`\/requests\/\$\{request\.id\}`\)/);
});

test("10. Edit/Delete permissions are unchanged", async () => {
  const jsx = await source("../src/pages/ServiceRequests.jsx");
  assert.match(jsx, /isSuperAdmin\(\)/);
  assert.match(jsx, /edit-request-btn/);
  assert.match(jsx, /delete-request-btn/);
  assert.match(jsx, /beginEdit/);
  assert.match(jsx, /setRequestToDelete/);
});

test("11. Card has no forced large empty area (no min-height / height: 100%)", async () => {
  const css = await source("../src/pages/ServiceRequests.css");
  // Ensure card does not have min-height or forced height
  assert.doesNotMatch(css, /\.request-card\s*\{[^}]*min-height/);
  assert.doesNotMatch(css, /\.request-card\s*\{[^}]*height:\s*100%/);
});

test("12. Missing metadata does not create broken separators", async () => {
  const jsx = await source("../src/pages/ServiceRequests.jsx");
  // Location line is conditionally rendered only when port.name exists
  assert.match(jsx, /\(port\.name \|\| port\.port_name\) &&/);
  // Country is appended conditionally
  assert.match(jsx, /port\.country \? `, \$\{port\.country\}`/);
});

// ==========================================================================
// REQUEST DETAIL TESTS
// ==========================================================================

test("13. Budget summary renders without clipping", async () => {
  const css = await source("../src/pages/ServiceRequestDetails.css");
  // Budget block uses tabular-nums and min-width for stable sizing
  assert.match(css, /\.budget-block/);
  assert.match(css, /font-variant-numeric:\s*tabular-nums/);
  assert.match(css, /min-width:\s*160px/);
  // No overflow: hidden on budget-block
  assert.doesNotMatch(css, /\.budget-block[^}]*overflow:\s*hidden/);
});

test("14. Location and deadline render beneath title", async () => {
  const jsx = await source("../src/pages/ServiceRequestDetails.jsx");
  assert.match(jsx, /request-meta-line/);
  assert.match(jsx, /MapPin/);
  assert.match(jsx, /CalendarDays/);
  assert.match(jsx, /Due /);
});

test("15. Overview content is structured with paragraphs", async () => {
  const jsx = await source("../src/pages/ServiceRequestDetails.jsx");
  assert.match(jsx, /split\(\/\\n\\s\*\\n\//);
  assert.match(jsx, /Request Overview/);
});

test("16. Duplicate description/scope renders once", async () => {
  const jsx = await source("../src/pages/ServiceRequestDetails.jsx");
  assert.match(jsx, /normalizeNarrative\(scope\) !== normalizeNarrative\(overview\)/);
  assert.match(jsx, /showScope/);
});

test("17. Distinct description/scope remains accessible", async () => {
  const jsx = await source("../src/pages/ServiceRequestDetails.jsx");
  assert.match(jsx, /showScope && <Narrative title="Scope of Work"/);
});

test("18. ETA uses a consistent formatted value with non-breaking space", async () => {
  const jsx = await source("../src/pages/ServiceRequestDetails.jsx");
  // Non-breaking space prevents awkward wrapping
  assert.match(jsx, /\\u00A0/);
  // Separate datePart and timePart formatting
  assert.match(jsx, /datePart/);
  assert.match(jsx, /timePart/);
});

test("19. ETA does not split accidentally due to narrow grid", async () => {
  const css = await source("../src/pages/ServiceRequestDetails.css");
  // Info row value column uses minmax(0, 1fr) and allows word-break
  assert.match(css, /\.info-row\s*\{[^}]*grid-template-columns/);
  assert.match(css, /\.info-row strong[^}]*overflow-wrap:\s*anywhere/);
});

test("20. Vessel rows align consistently", async () => {
  const jsx = await source("../src/pages/ServiceRequestDetails.jsx");
  assert.match(jsx, /Vessel Particulars/);
  assert.match(jsx, /label="Name"/);
  assert.match(jsx, /label="IMO"/);
  assert.match(jsx, /label="Type"/);
  assert.match(jsx, /label="Flag"/);
});

test("21. Required Qualifications uses the full heading", async () => {
  const jsx = await source("../src/pages/ServiceRequestDetails.jsx");
  assert.match(jsx, /Required Qualifications/);
  assert.doesNotMatch(jsx, /Required Cert\./);
});

test("22. Empty side-card rows are hidden", async () => {
  const jsx = await source("../src/pages/ServiceRequestDetails.jsx");
  // Info component returns null for empty values
  assert.match(jsx, /if \(value === null/);
});

test("23. Overview card does not stretch to right-column height", async () => {
  const css = await source("../src/pages/ServiceRequestDetails.css");
  // Grid uses align-items: start
  assert.match(css, /\.request-details-layout[^}]*align-items:\s*start/);
  // Narrative uses align-self: start
  assert.match(css, /\.request-narrative[^}]*align-self:\s*start/);
});

test("24. Quotations remain functional", async () => {
  const jsx = await source("../src/pages/ServiceRequestDetails.jsx");
  assert.match(jsx, /quotation-card/);
  assert.match(jsx, /createQuotation/);
  assert.match(jsx, /acceptQuotation/);
  assert.match(jsx, /visibleQuotations/);
});

test("25. Responsive stacking preserves all content", async () => {
  const css = await source("../src/pages/ServiceRequestDetails.css");
  // Has mobile breakpoints that stack columns
  assert.match(css, /@media \(max-width: 900px\)/);
  assert.match(css, /@media \(max-width: 560px\)/);
  // At mobile, grid goes to 1fr
  assert.match(css, /grid-template-columns:\s*1fr/);
});

// ==========================================================================
// CSS REGRESSION TESTS
// ==========================================================================

test("No thin bordered description strip on list cards", async () => {
  const jsx = await source("../src/pages/ServiceRequests.jsx");
  // The request-category-badge that created the thin strip is removed
  assert.doesNotMatch(jsx, /request-category-badge/);
});

test("List card uses CSS grid not flex for content+summary", async () => {
  const css = await source("../src/pages/ServiceRequests.css");
  // Card uses grid layout
  assert.match(css, /\.request-card\s*\{[^}]*display:\s*grid/);
  assert.match(css, /grid-template-columns:\s*minmax\(0,\s*1fr\)\s*auto/);
});

test("Detail header uses CSS grid for stable layout", async () => {
  const css = await source("../src/pages/ServiceRequestDetails.css");
  assert.match(css, /\.request-details-head\s*\{[^}]*display:\s*grid/);
  assert.match(css, /\.request-details-head\s*\{[^}]*grid-template-columns:\s*minmax\(0,\s*1fr\)\s*auto/);
});

test("Sidebar width is restrained (180px not 210px)", async () => {
  const css = await source("../src/pages/ServiceRequests.css");
  assert.match(css, /\.request-sidebar\s*\{[^}]*width:\s*180px/);
  assert.doesNotMatch(css, /\.request-sidebar\s*\{[^}]*width:\s*210px/);
});

test("Date formatting uses consistent formatDate and formatDateTime", async () => {
  const jsx = await source("../src/pages/ServiceRequestDetails.jsx");
  // Both formatDate and formatDateTime are defined and used
  assert.match(jsx, /const formatDate = /);
  assert.match(jsx, /const formatDateTime = /);
  // ETA uses formatDateTime
  assert.match(jsx, /formatDateTime\(port\.eta\)/);
  // Deadline uses formatDate
  assert.match(jsx, /formatDate\(request\.requiredBy\)/);
});
