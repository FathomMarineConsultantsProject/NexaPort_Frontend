import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { MARITIME_DIRECTORIES } from "../src/config/maritimeDirectories.js";
import {
  cleanText,
  directoryView,
  isMeaningful,
  listServiceNames,
  normalizePorts,
  normalizeProducts,
  normalizeServices,
  positiveCount,
  safeWebsite,
  validEmail,
  validLogoUrl,
} from "../src/utils/directoryData.js";

const projectRoot = dirname(dirname(fileURLToPath(import.meta.url)));

test("missing values and empty containers are not meaningful", () => {
  for (const value of [null, undefined, "", "  ", "null", "undefined", [], {}, "[]", "{}"]) {
    assert.equal(isMeaningful(value), false);
  }
  assert.equal(isMeaningful(["Towage"]), true);
  assert.equal(isMeaningful({ city: "Istanbul" }), true);
});

test("zero counters stay hidden while positive counters remain", () => {
  assert.equal(positiveCount(0), 0);
  assert.equal(positiveCount("0"), 0);
  assert.equal(positiveCount("3"), 3);
});

test("null extra_data cannot crash and yields no optional sections", () => {
  const view = directoryView({ entity: { company_name: "Safe Yard", extra_data: null } }, "shipyard");
  assert.equal(view.name, "Safe Yard");
  assert.deepEqual(view.aboutSections, []);
  assert.deepEqual(view.dimensions, []);
  assert.deepEqual(view.faqs, []);
});

test("JSON extra_data exposes structured shipyard about and dimensions", () => {
  const view = directoryView({
    entity: {
      company_name: "Ada Shipyard",
      extra_data: JSON.stringify({
        shipyard: {
          about_sections: [{ heading: "Introduction", body: "Established in 2002." }],
          dimensions: { max_length_m: 90, max_width_m: 15, max_draft_m: 4 },
        },
      }),
    },
  }, "shipyard");
  assert.deepEqual(view.aboutSections, [{ heading: "Introduction", body: "Established in 2002." }]);
  assert.deepEqual(view.dimensions.map(({ value }) => value), ["90 m", "15 m", "4 m"]);
});

test("missing and zero shipyard dimensions are omitted", () => {
  const view = directoryView({ entity: { extra_data: { shipyard: { dimensions: { max_length_m: 0 } } } } }, "shipyard");
  assert.deepEqual(view.dimensions, []);
});

test("shipyard contact follows canonical fallback order", () => {
  const view = directoryView({
    entity: {
      public_address: "Canonical address",
      extra_data: {
        shipyard: { location: { public_address: "Shipyard address", public_phone: "+90 1", city: "Tuzla", country: "Turkey" } },
        authenticated_contacts: { public_address: "Authenticated address", city: "Istanbul" },
      },
    },
  }, "shipyard");
  assert.equal(view.address, "Canonical address");
  assert.equal(view.phone, "+90 1");
  assert.equal(view.city, "Tuzla");
  assert.equal(view.country, "Turkey");
});

test("shipyard coordinates accept normalized variants and reject missing values", () => {
  const snake = directoryView({
    entity: {
      extra_data: {
        shipyard: { location: { latitude: "40.816", longitude: "29.303" } },
      },
    },
  }, "shipyard");
  const aliases = directoryView({
    entity: {
      extraData: {
        shipyard: { location: { lat: 40.816, lng: 29.303 } },
      },
    },
  }, "shipyard");
  const missing = directoryView({
    entity: { extra_data: { shipyard: { location: {} } } },
  }, "shipyard");
  assert.deepEqual(snake.coordinates, { latitude: 40.816, longitude: 29.303 });
  assert.deepEqual(aliases.coordinates, snake.coordinates);
  assert.equal(missing.coordinates, null);
});

test("real services become card chips and empty values do not", () => {
  assert.deepEqual(listServiceNames({
    services: [{ service_name: "Hull repair" }, { serviceName: "Dry docking" }, { name: "  " }],
  }), ["Dry docking", "Hull repair"]);
});

test("duplicate services collapse by normalized name and category", () => {
  const services = normalizeServices([
    { service_name: " General Ship Supplier ", category: "Safety" },
    { serviceName: "general ship supplier", category: " safety " },
    { service_name: "Hull Repair", category: "Technical" },
  ], "supplier");
  assert.equal(services.length, 2);
  assert.equal(services.filter(({ name }) => /general ship supplier/i.test(name)).length, 1);
});

test("identical service category is removed and service_type is never promoted", () => {
  const [service] = normalizeServices([
    { service_name: "Safety & Firefighting", category: "Safety & Firefighting", service_type: "supplier" },
  ], "supplier");
  assert.deepEqual(service, { name: "Safety & Firefighting", category: null, description: null });
});

test("directory classifications are excluded and duplicate service detail is retained", () => {
  const services = normalizeServices([
    { service_name: "Supplier", category: "Directory Classification" },
    { service_name: "Hull Repair", category: "Technical" },
    { service_name: " hull repair ", service_description: "Emergency steel and hull repair alongside." },
  ], "supplier");
  assert.deepEqual(services, [{
    name: "Hull Repair",
    category: "Technical",
    description: "Emergency steel and hull repair alongside.",
  }]);
});

test("ports deduplicate and missing UN/LOCODE remains clean", () => {
  const ports = normalizePorts([
    { port_name: "Chennai", country: "India", unlocode: "INMAA" },
    { portName: " chennai ", country: " india ", unlocode: "inmaa" },
    { port_name: "Dubai", country: "United Arab Emirates", unlocode: null },
  ]);
  assert.equal(ports.length, 2);
  assert.deepEqual(ports[1], { name: "Dubai", country: "United Arab Emirates", unlocode: null });
});

test("products deduplicate by normalized product name", () => {
  const products = normalizeProducts([
    { product_name: "Mooring Rope", category: "Deck stores" },
    { productName: " mooring rope ", manufacturer: "Example" },
  ]);
  assert.equal(products.length, 1);
});

test("office rows are separated from branches", () => {
  const view = directoryView({
    entity: {},
    branches: [
      { branch_name: "Piraeus Branch", branch_type: "branch" },
      { branch_name: "London Office", branch_type: "regional office" },
    ],
  }, "ship_agent");
  assert.equal(view.branches.length, 1);
  assert.equal(view.offices.length, 1);
});

test("visually identical branches render once", () => {
  const view = directoryView({
    entity: {},
    branches: [
      { branch_name: "Head Office", branch_type: "office", public_address: "1 Port Road", city: "Dubai" },
      { branchName: " head office ", branchType: "office", publicAddress: "1 port road", city: "dubai" },
    ],
  }, "supplier");
  assert.equal(view.offices.length, 1);
});

test("supplier products render only from real product records", () => {
  assert.equal(directoryView({ entity: {}, products: [] }, "supplier").products.length, 0);
  assert.equal(directoryView({ entity: {}, products: [{ product_name: "Mooring rope" }] }, "supplier").products.length, 1);
});

test("FAQ requires both a meaningful question and answer", () => {
  const view = directoryView({
    entity: {},
    faqs: [
      { question: "Can you attend?", answer: "Yes." },
      { question: "Empty", answer: " " },
      { question: " ", answer: "No question" },
    ],
  }, "service_provider");
  assert.deepEqual(view.faqs, [{ question: "Can you attend?", answer: "Yes." }]);
});

test("duplicate FAQ questions render once", () => {
  const view = directoryView({
    entity: {},
    faqs: [
      { question: "Do you deliver?", answer: "Yes." },
      { question: " do you deliver? ", answer: "Also yes." },
    ],
  }, "supplier");
  assert.equal(view.faqs.length, 1);
});

test("contact links accept only valid email and safe website schemes", () => {
  assert.equal(validEmail("ops@example.com"), "ops@example.com");
  assert.equal(validEmail("invalid"), null);
  assert.equal(safeWebsite("example.com"), "https://example.com/");
  assert.equal(safeWebsite("javascript:alert(1)"), null);
  assert.equal(safeWebsite("https://magicport.ai/company/example"), null);
  assert.equal(cleanText(" undefined "), null);
});

test("company logo URLs reject malformed and banner-like assets", () => {
  assert.equal(validLogoUrl("https://cdn.example.com/logos/company.webp"), "https://cdn.example.com/logos/company.webp");
  for (const value of [
    "not a url",
    "javascript:alert(1)",
    "https://cdn.example.com/company-banners/acme.jpg",
    "https://cdn.example.com/static/company-banners/acme.png",
    "https://cdn.example.com/banner-acme.png",
    "https://cdn.example.com/hero-acme.jpg",
  ]) assert.equal(validLogoUrl(value), null);
});

test("all five directories share one configuration", () => {
  assert.deepEqual(MARITIME_DIRECTORIES.map(({ type }) => type), [
    "service_provider", "ship_agent", "supplier", "shipyard", "tug_boat",
  ]);
});

test("shipyard policy excludes generic provider sections", () => {
  const shipyard = MARITIME_DIRECTORIES.find(({ type }) => type === "shipyard");
  assert.deepEqual(shipyard.sections, ["overview", "dimensions", "contact"]);
  for (const section of ["faqs", "branches", "offices", "products", "memberships", "certifications", "class_approvals"]) {
    assert.equal(shipyard.sections.includes(section), false);
  }
});

test("directory-specific ordering prioritizes agent ports and supplier products", () => {
  const agent = MARITIME_DIRECTORIES.find(({ type }) => type === "ship_agent");
  const supplier = MARITIME_DIRECTORIES.find(({ type }) => type === "supplier");
  assert.ok(agent.sections.indexOf("ports") < agent.sections.indexOf("branches"));
  assert.ok(supplier.sections.indexOf("products") < supplier.sections.indexOf("services"));
});

test("FAQ markup uses a native collapsed button with ARIA state", () => {
  const source = readFileSync(join(projectRoot, "src", "components", "directories", "DirectoryUI.jsx"), "utf8");
  assert.match(source, /<button[^>]+aria-expanded=\{open\}[^>]+aria-controls=\{answerId\}/);
  assert.match(source, /hidden=\{!open\}/);
});

test("detail UI removes source, created, updated and raw service labels", () => {
  const files = ["DirectoryUI.jsx", "../../pages/MaritimeDirectoryDetails.jsx"].map((name) =>
    readFileSync(join(projectRoot, "src", "components", "directories", name), "utf8"));
  const source = files.join("\n");
  assert.doesNotMatch(source, />\s*Source\s*</i);
  assert.doesNotMatch(source, />\s*Created\s*</i);
  assert.doesNotMatch(source, />\s*Updated\s*</i);
  assert.doesNotMatch(source, />\s*Category\s*</i);
  assert.doesNotMatch(source, /SERVICETYPE/);
  assert.doesNotMatch(source, /service_type/);
});

test("large collection controls and local port filtering are present", () => {
  const source = readFileSync(join(projectRoot, "src", "components", "directories", "DirectoryUI.jsx"), "utf8");
  assert.match(source, /aria-expanded=\{expanded\}/);
  assert.match(source, /Show all \$\{count\}/);
  assert.match(source, /rows\.length > 20/);
  assert.match(source, /type="search"/);
  assert.match(source, /placeholder="Search covered ports"/);
  assert.match(source, /className=\{`md-service-item \$\{itemClass\(service\.index\)\}`\}/);
  assert.doesNotMatch(source, /groupIndex === 0/);
});

test("detail logo uses larger desktop and responsive sizes", () => {
  const css = readFileSync(join(projectRoot, "src", "styles", "maritimeDirectory.css"), "utf8");
  const dossierCss = css.slice(css.indexOf(".md-detail-page:is("));
  assert.match(dossierCss, /md-detail-header \.md-logo\s*\{[^}]*width:\s*96px/s);
  assert.match(dossierCss, /@media \(max-width: 900px\)[\s\S]*?md-detail-header \.md-logo\s*\{[^}]*width:\s*80px/);
  assert.match(dossierCss, /@media \(max-width: 640px\)[\s\S]*?md-detail-header \.md-logo\s*\{[^}]*width:\s*68px/);
  const source = readFileSync(join(projectRoot, "src", "components", "directories", "DirectoryUI.jsx"), "utf8");
  assert.match(source, /onError=\{\(\) => setFailedSrc\(displaySrc\)\}/);
});

test("directory typography is sans-serif and pages use a white background", () => {
  const css = readFileSync(join(projectRoot, "src", "styles", "maritimeDirectory.css"), "utf8");
  assert.doesNotMatch(css, /Georgia|Times New Roman|font-family:\s*serif/i);
  assert.match(css, /--md-font:\s*"Plus Jakarta Sans",\s*"Segoe UI",\s*Arial,\s*sans-serif/);
  assert.match(css, /\.md-page,[\s\S]*?\.md-detail-page,[\s\S]*?\.md-form\s*\{[^}]*background:\s*#fff/s);
});

test("detail navigation is a state-driven accessible tab system", () => {
  const source = readFileSync(join(projectRoot, "src", "pages", "MaritimeDirectoryDetails.jsx"), "utf8");
  assert.match(source, /useState\(\{ entityId, section: "overview" \}\)/);
  assert.match(source, /role="tablist"/);
  assert.match(source, /role="tab"/);
  assert.match(source, /aria-selected=\{selectedSection === section\}/);
  assert.match(source, /role="tabpanel"/);
  assert.match(source, /\{selectedSection && renderSection\(selectedSection\)\}/);
  assert.doesNotMatch(source, /href=\{`#\$\{section\}`\}/);
  for (const key of ["ArrowRight", "ArrowLeft", "Home", "End"]) assert.match(source, new RegExp(`event\\.key === "${key}"`));
});

test("shipyard restores its dedicated direct layout while other details retain tabs", () => {
  const detailSource = readFileSync(join(projectRoot, "src", "pages", "MaritimeDirectoryDetails.jsx"), "utf8");
  const shipyardSource = readFileSync(join(projectRoot, "src", "components", "directories", "ShipyardProfile.jsx"), "utf8");
  assert.match(detailSource, /isShipyard \? \(\s*<ShipyardProfile view=\{view\} \/>/);
  assert.match(detailSource, /: \(\s*<>\s*\{visibleSections\.length > 0/);
  assert.match(shipyardSource, /title="About"/);
  assert.match(shipyardSource, />Shipyard Dimensions</);
  assert.match(shipyardSource, />Contact and Location</);
  assert.match(shipyardSource, /\{view\.coordinates && \(/);
  assert.match(shipyardSource, /openstreetmap\.org\/export\/embed\.html/);
  for (const label of ["Services", "Ports Covered", "Frequently Asked Questions"]) {
    assert.doesNotMatch(shipyardSource, new RegExp(`>${label}<`));
  }
  for (const type of ["service_provider", "ship_agent", "supplier", "tug_boat"]) {
    assert.ok(MARITIME_DIRECTORIES.some((directory) => directory.type === type));
  }
});

test("directory list header has no page-level category switcher", () => {
  const source = readFileSync(join(projectRoot, "src", "components", "directories", "DirectoryUI.jsx"), "utf8");
  const header = source.slice(
    source.indexOf("export function DirectoryPageHeader"),
    source.indexOf("export function DirectoryResultCard"),
  );
  assert.doesNotMatch(header, /md-directory-nav|Maritime directories|MARITIME_DIRECTORIES\.map/);
  assert.match(header, /className="md-page-header"/);
  assert.match(header, /Add \{directory\.singular\}/);
});

test("contact copy controls use the Clipboard API only for valid values", () => {
  const source = readFileSync(join(projectRoot, "src", "components", "directories", "DirectoryUI.jsx"), "utf8");
  assert.match(source, /navigator\.clipboard\.writeText\(value\)/);
  assert.match(source, /label="Copy email"/);
  assert.match(source, /label="Copy phone number"/);
  assert.match(source, /phoneHref && <CopyButton/);
  assert.match(source, /window\.setTimeout\(\(\) => setStatus\("idle"\), 1800\)/);
});

test("logo privacy uses Blob URLs with safe cleanup and interaction guards", () => {
  const source = readFileSync(join(projectRoot, "src", "components", "directories", "DirectoryUI.jsx"), "utf8");
  assert.match(source, /fetch\(logo,/);
  assert.match(source, /URL\.createObjectURL\(blob\)/);
  assert.match(source, /URL\.revokeObjectURL\(objectUrl\)/);
  assert.match(source, /setResolvedLogo\(\{ source: logo, display: logo \}\)/);
  assert.match(source, /draggable=\{false\}/);
  assert.match(source, /onContextMenu=\{preventLogoAction\}/);
  assert.match(source, /onDragStart=\{preventLogoAction\}/);
});

test("main overview supplies Not listed contact fallbacks", () => {
  const source = readFileSync(join(projectRoot, "src", "components", "directories", "DirectoryUI.jsx"), "utf8");
  const overview = source.slice(source.indexOf("export function CompanyOverview"), source.indexOf("export function ExpandableCollection"));
  assert.ok((overview.match(/Not listed/g) || []).length >= 4);
  assert.match(overview, />Visit website</);
});

test("shipyard contact also supplies all public fallbacks and safe link copy", () => {
  const source = readFileSync(join(projectRoot, "src", "components", "directories", "DirectoryUI.jsx"), "utf8");
  const contact = source.slice(source.indexOf("export function ContactDetails"), source.indexOf("const telephoneLink"));
  assert.ok((contact.match(/Not listed/g) || []).length >= 4);
  assert.match(contact, />Visit website</);
});

test("directory source contains no legacy Magic Port branding", () => {
  const files = [];
  const visit = (directory) => {
    for (const name of readdirSync(directory)) {
      const path = join(directory, name);
      if (statSync(path).isDirectory()) visit(path);
      else if (/\.(?:js|jsx|css)$/.test(name)) files.push(path);
    }
  };
  for (const directory of ["components", "config", "pages", "styles"]) {
    visit(join(projectRoot, "src", directory));
  }
  const source = files.map((file) => readFileSync(file, "utf8")).join("\n");
  assert.doesNotMatch(source, /Magic\s?Port|MagicBoard|magicport_public_directory/i);
});

test("all list and detail routes remain Super Admin protected", () => {
  const source = readFileSync(join(projectRoot, "src", "App.jsx"), "utf8");
  for (const path of ["/service-providers", "/ship-agents", "/suppliers", "/shipyards", "/tug-boats"]) {
    assert.ok(MARITIME_DIRECTORIES.some((directory) => directory.path === path));
  }
  assert.match(source, /<AdminOnly>\s*<MaritimeDirectoryPage/);
  assert.match(source, /<AdminOnly><MaritimeDirectoryForm/);
  assert.match(source, /<AdminOnly><MaritimeDirectoryDetails/);
});
