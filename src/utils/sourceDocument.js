export const SOURCE_BLOCK_TYPES = new Set([
  "heading", "paragraph", "list_item", "table", "table_row", "table_cell", "control", "annotation",
  "text_line", "xml_element", "xml_text", "spreadsheet_row", "spreadsheet_cell", "image_placeholder", "unknown",
]);

export const TERMINAL_CLASSIFICATIONS = new Set(["field", "section", "instruction", "reference", "decorative", "unmapped", "failed"]);

export const safeSourceText = (value) => String(value ?? "")
  .split("").filter((character) => { const code = character.charCodeAt(0); return code === 9 || code === 10 || code === 13 || (code >= 32 && code !== 127); }).join("")
  .replace(/\r\n?/g, "\n")
  .trim();

export function createSourceDocument({ sourceType, sourceName, metadata = {}, parts = [], warnings = [], failedRegions = [] }) {
  let globalOrder = 0;
  const normalizedParts = parts.map((part, partIndex) => ({
    id: `part-${partIndex}`,
    index: partIndex,
    name: safeSourceText(part.name) || `Part ${partIndex + 1}`,
    type: part.type || "document",
    metadata: part.metadata && typeof part.metadata === "object" ? part.metadata : {},
    blocks: (part.blocks || []).map((block, partOrder) => {
      const text = safeSourceText(block.text);
      const normalized = {
        id: `block-${globalOrder}`,
        globalOrder,
        partOrder,
        type: SOURCE_BLOCK_TYPES.has(block.type) ? block.type : "unknown",
        text,
        metadata: block.metadata && typeof block.metadata === "object" ? block.metadata : {},
        location: { partId: `part-${partIndex}`, partIndex, ...(block.location || {}) },
      };
      globalOrder += 1;
      return normalized;
    }),
  }));
  return {
    sourceType,
    sourceName: safeSourceText(sourceName),
    metadata: { ...metadata, blockCount: globalOrder },
    parts: normalizedParts,
    warnings: warnings.map(safeSourceText).filter(Boolean),
    failedRegions: failedRegions.map((region) => ({ ...region, reason: safeSourceText(region.reason) || "Unable to read source region." })),
  };
}

export const sourceBlocks = (document) => (document?.parts || []).flatMap((part) => part.blocks || []);

export const readableSourceBlocks = (document) => sourceBlocks(document).filter((block) => block.text);

export function sourceDocumentToFallbackEvidence(document) {
  return (document?.parts || []).map((part) => ({
    name: part.name,
    lines: (part.blocks || []).filter((block) => block.text).map((block) => ({
      text: block.text,
      order: block.globalOrder,
      blockType: block.type,
      sourceText: block.text,
      ...block.metadata,
      ...block.location,
    })),
  }));
}

export function createCoverageLedger(document) {
  const entries = new Map(readableSourceBlocks(document).map((block) => [block.id, {
    blockId: block.id,
    parseStatus: "parsed",
    chunkId: null,
    sentToAi: false,
    classification: null,
    fieldRefs: [],
    failureReason: null,
    retryState: "not_needed",
  }]));
  for (const region of document?.failedRegions || []) {
    const blockId = region.blockId || `failed-${entries.size}`;
    entries.set(blockId, { blockId, parseStatus: "failed", chunkId: null, sentToAi: false, classification: "failed", fieldRefs: [], failureReason: region.reason, retryState: "available" });
  }
  return entries;
}

export function assignChunksToLedger(ledger, chunks) {
  const next = new Map(ledger);
  for (const chunk of chunks) for (const block of chunk.blocks) {
    if (block.contextOnly || !next.has(block.id)) continue;
    next.set(block.id, { ...next.get(block.id), chunkId: chunk.id });
  }
  return next;
}

export function applyChunkCoverage(ledger, chunk, result, error = null) {
  const next = new Map(ledger);
  const classifications = new Map((result?.classifications || []).map((item) => [item.blockId, item]));
  const fieldsByBlock = new Map();
  for (const field of result?.fields || []) for (const blockId of field.evidenceRefs || []) fieldsByBlock.set(blockId, [...(fieldsByBlock.get(blockId) || []), field.fieldKey]);
  for (const block of chunk.blocks) {
    if (block.contextOnly || !next.has(block.id)) continue;
    const current = next.get(block.id); const classification = classifications.get(block.id);
    next.set(block.id, error
      ? { ...current, sentToAi: true, classification: "failed", failureReason: error, retryState: "available" }
      : { ...current, sentToAi: true, classification: TERMINAL_CLASSIFICATIONS.has(classification?.classification) ? classification.classification : "unmapped", fieldRefs: fieldsByBlock.get(block.id) || [], failureReason: null, retryState: "not_needed" });
  }
  return next;
}

export function coverageMetrics(ledger) {
  const rows = [...ledger.values()];
  const count = (value) => rows.filter((row) => row.classification === value).length;
  const failed = rows.filter((row) => row.parseStatus === "failed" || row.classification === "failed").length;
  const classified = rows.filter((row) => TERMINAL_CLASSIFICATIONS.has(row.classification) && row.classification !== "failed").length;
  return {
    totalReadableBlocks: rows.length,
    parsedBlocks: rows.filter((row) => row.parseStatus === "parsed").length,
    failedBlocks: failed,
    sentBlocks: rows.filter((row) => row.sentToAi).length,
    classifiedBlocks: classified,
    fieldBlocks: count("field"), sectionBlocks: count("section"), instructionBlocks: count("instruction"),
    referenceBlocks: count("reference"), decorativeBlocks: count("decorative"), unmappedBlocks: count("unmapped"),
    complete: rows.length === classified + failed && failed === 0,
  };
}
