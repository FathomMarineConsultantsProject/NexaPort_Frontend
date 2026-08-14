import assert from "node:assert/strict";
import test from "node:test";
import { applyChunkCoverage, assignChunksToLedger, coverageMetrics, createCoverageLedger, createSourceDocument, readableSourceBlocks } from "../src/utils/sourceDocument.js";
import { combineMappedResults, DEFAULT_CHUNK_BYTES, estimateSourceDocument, planSourceChunks } from "../src/utils/templateChunking.js";

const syntheticPdf = (pages) => createSourceDocument({ sourceType: "pdf", sourceName: `${pages}.pdf`, metadata: { pageCount: pages }, parts: Array.from({ length: pages }, (_, page) => ({ name: `Page ${page + 1}`, type: "page", blocks: [{ type: "text_line", text: `Repeated inspection question? Page ${page + 1} ${"detail ".repeat(80)}`, location: { pageNumber: page + 1 } }] })) });

test("neutral model assigns stable IDs without globally deduplicating readable blocks", () => {
  const document = createSourceDocument({ sourceType: "docx", sourceName: "repeat.docx", parts: [{ name: "Document", blocks: [{ type: "paragraph", text: "Part B2" }, { type: "paragraph", text: "Part B2" }, { type: "paragraph", text: "The codes used are Y, N and NA." }] }] });
  assert.deepEqual(readableSourceBlocks(document).map((block) => block.id), ["block-0", "block-1", "block-2"]);
  assert.deepEqual(readableSourceBlocks(document).map((block) => block.text), ["Part B2", "Part B2", "The codes used are Y, N and NA."]);
});

for (const pages of [10, 25, 50, 100, 258]) test(`${pages}-page source is completely and boundedly chunked`, () => {
  const document = syntheticPdf(pages); const chunks = planSourceChunks(document); const submitted = chunks.flatMap((chunk) => chunk.blocks.filter((block) => !block.contextOnly));
  assert.equal(submitted.length, pages); assert.equal(new Set(submitted.map((block) => block.id)).size, pages);
  assert.ok(chunks.every((chunk) => chunk.estimate.serializedBytes <= DEFAULT_CHUNK_BYTES + 2048)); assert.ok(chunks.length <= pages);
  assert.equal(estimateSourceDocument(document).blockCount, pages);
});

test("coverage ledger accounts for classifications and preserves a failed chunk", () => {
  const document = syntheticPdf(3); const chunks = planSourceChunks(document, { maxBlocks: 1 }); let ledger = assignChunksToLedger(createCoverageLedger(document), chunks);
  ledger = applyChunkCoverage(ledger, chunks[0], { fields: [{ fieldKey: "q", evidenceRefs: ["block-0"] }], classifications: [{ blockId: "block-0", classification: "field", reason: "Question" }] });
  ledger = applyChunkCoverage(ledger, chunks[1], null, "Temporary provider failure");
  ledger = applyChunkCoverage(ledger, chunks[2], { classifications: [{ blockId: "block-2", classification: "instruction", reason: "Guidance" }] });
  const metrics = coverageMetrics(ledger); assert.equal(metrics.totalReadableBlocks, 3); assert.equal(metrics.fieldBlocks, 1); assert.equal(metrics.instructionBlocks, 1); assert.equal(metrics.failedBlocks, 1); assert.equal(metrics.complete, false);
});

test("deterministic chunk merge preserves repeated fields and repairs colliding keys", () => {
  const common = { fieldKey: "tank_pressure", label: "Tank Pressure", fieldType: "number", evidenceRefs: [] };
  const result = combineMappedResults([
    { sections: [{ sectionKey: "no_1", title: "No.1 MeOH TK" }], fields: [{ ...common, sectionKey: "no_1", evidenceRefs: ["block-1"] }] },
    { sections: [{ sectionKey: "no_2", title: "No.2 MeOH TK" }], fields: [{ ...common, sectionKey: "no_2", evidenceRefs: ["block-20"] }] },
  ]);
  assert.equal(result.fields.length, 2); assert.equal(new Set(result.fields.map((field) => field.fieldKey)).size, 2); assert.equal(result.fields[1].fieldKey, "no_2_tank_pressure");
});
