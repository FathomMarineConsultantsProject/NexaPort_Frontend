import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { meohFixture } from "./fixtures/meohLogicalDocument.js";
import { readableSourceBlocks } from "../src/utils/sourceDocument.js";
import { consolidationPreservesMapping, planSourceChunks } from "../src/utils/templateChunking.js";
import { chooseBestExtractionFields, isProvenanceOnlyLabel, mergeMappedFields } from "../src/utils/templateEvidence.js";

const source = (file) => readFile(new URL(file, import.meta.url), "utf8");
const mappedFixture = () => { const fixture = meohFixture(); return mergeMappedFields([], [], fixture.response.fields, new Map(fixture.response.sections.map((section) => [section.sectionKey, section.title]))); };

test("1. 56 readable blocks can produce many final fields", () => { const fixture = meohFixture(); assert.equal(readableSourceBlocks(fixture.document).length, 56); assert.equal(planSourceChunks(fixture.document).length, 1); assert.ok(mappedFixture().length > 20); });
test("4. one source action produces one analysis request without consolidation", async () => { const hook = await source("../src/hooks/useTemplateAnalysis.js"); assert.equal((hook.match(/analyseTemplateSource\(/g) || []).length, 1); assert.doesNotMatch(hook, /mode: "context"|mode: "consolidate"|chunks\.length/); });
test("5. Tank Pressure under No.1 survives", () => assert.equal(mappedFixture().filter((field) => field.section === "No.1 MeOH TK" && field.label === "Tank Pressure").length, 1));
test("6. Tank Pressure under No.2 survives", () => assert.equal(mappedFixture().filter((field) => field.section === "No.2 MeOH TK" && field.label === "Tank Pressure").length, 1));
test("7. Tank Pressure under No.3 survives", () => assert.equal(mappedFixture().filter((field) => field.section === "No.3 MeOH TK" && field.label === "Tank Pressure").length, 1));
test("8. Tank Volume repeated across sections survives", () => assert.equal(mappedFixture().filter((field) => field.label === "Tank Volume").length, 3));
test("9. Tank Temp repeated across sections survives", () => assert.equal(mappedFixture().filter((field) => field.label === "Tank Temp").length, 3));
test("10. Other Remarks becomes textarea", () => assert.equal(mappedFixture().find((field) => field.label === "Other Remarks")?.type, "textarea"));
test("11. Checked By (Sign) becomes signature", () => assert.equal(mappedFixture().find((field) => field.label === "Checked By (Sign)")?.type, "signature"));
test("12. A3 cannot become a visible label", () => assert.equal(isProvenanceOnlyLabel("A3"), true));
test("13. C4 cannot become a visible label", () => assert.equal(isProvenanceOnlyLabel("C4"), true));
test("14. H65:J65 cannot become a visible label", () => assert.equal(isProvenanceOnlyLabel("H65:J65"), true));
test("15. block-49 cannot become a visible label", () => assert.equal(isProvenanceOnlyLabel("block-49"), true));
test("16. Cell 1 cannot become a visible label", () => assert.equal(isProvenanceOnlyLabel("Cell 1"), true));
test("17. header1.xml cannot become a visible label", () => assert.equal(isProvenanceOnlyLabel("header1.xml"), true));
test("18. XML element path cannot become a visible label", () => assert.equal(isProvenanceOnlyLabel("/inspection/section[2]/field[4]"), true));
test("19. PDF x/y coordinates cannot become a visible label", () => assert.equal(isProvenanceOnlyLabel("x: 120, y: 400"), true));
test("20. SourcePreview hides parser metadata", async () => { const preview = await source("../src/components/templates/SourcePreview.jsx"); assert.doesNotMatch(preview, /<small>\{block\.id\}/); assert.doesNotMatch(preview, /Cell \$\{index/); assert.doesNotMatch(preview, /Merged ranges:/); });
test("21. FieldEditor hides raw block IDs", async () => { const editor = await source("../src/components/templates/FieldEditor.jsx"); assert.doesNotMatch(editor, /return field\.evidenceRefs/); assert.doesNotMatch(editor, /return source\.elementPath/); assert.match(editor, /return "XML source"/); });
test("25. AI partial result outranks local fallback", () => { const ai = [{ fieldKey: "a" }, { fieldKey: "b" }]; const fallback = Array.from({ length: 10 }, (_, index) => ({ fieldKey: `f${index}` })); assert.strictEqual(chooseBestExtractionFields(ai, fallback), ai); });
test("26. Frontend preserves every accepted backend field", () => { const accepted = Array.from({ length: 30 }, (_, index) => ({ fieldKey: `field_${index}`, label: `Reading ${index}`, fieldType: "text", sectionKey: "general", sourceOrder: index, options: [], evidenceRefs: [`block-${index}`] })); assert.equal(mergeMappedFields([], [], accepted, new Map()).length, 30); });

test("large-document consolidation rejects 30 grounded fields becoming one", () => { const before = { fields: Array.from({ length: 30 }, (_, index) => ({ evidenceRefs: [`block-${index}`] })) }; const after = { fields: [{ evidenceRefs: ["block-0"] }] }; assert.equal(consolidationPreservesMapping(before, after), false); });
