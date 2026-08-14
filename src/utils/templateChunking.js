import { readableSourceBlocks } from "./sourceDocument.js";

export const DEFAULT_CHUNK_BYTES = 48 * 1024;
const bytes = (value) => new TextEncoder().encode(JSON.stringify(value)).length;

export function estimateSourceDocument(document) {
  const blocks = readableSourceBlocks(document);
  const textCharacters = blocks.reduce((sum, block) => sum + block.text.length, 0);
  return { serializedBytes: bytes(document), approximateTextTokens: Math.ceil(textCharacters / 4), expectedOutputTokens: Math.max(1200, Math.ceil(blocks.length * 45)), blockCount: blocks.length };
}

const compactMetadata = (block) => {
  const metadata = block.metadata || {};
  if (block.type === "table_row") {
    const cells = (metadata.cells || []).filter((cell) => cell.text || cell.controls?.length).map((cell) => ({ columnIndex: cell.columnIndex, text: cell.text, gridSpan: cell.gridSpan, verticalMerge: cell.verticalMerge, controls: cell.controls }));
    return { tableIndex: metadata.tableIndex, rowIndex: metadata.rowIndex, header: metadata.header, cells, tableStructure: metadata.tableStructure };
  }
  if (block.type === "spreadsheet_row") {
    const cells = (metadata.cells || []).filter((cell) => cell.displayedValue !== "" || cell.formula || cell.validation).map((cell) => ({ displayedValue: cell.displayedValue, cellType: cell.cellType, formula: cell.formula, validation: cell.validation, empty: cell.empty, location: { cell: cell.reference, row: cell.rowIndex, column: cell.columnIndex } }));
    return { rowIndex: metadata.rowIndex, hidden: metadata.hidden, cells };
  }
  if (["paragraph", "heading", "list_item", "control"].includes(block.type)) return { paragraphStyle: metadata.paragraphStyle, headingLevel: metadata.headingLevel, controls: metadata.controls, region: metadata.region, pageBreak: metadata.pageBreak, sectionBreak: metadata.sectionBreak };
  return metadata;
};

export const compactSourceBlock = (block) => ({ id: block.id, globalOrder: block.globalOrder, partOrder: block.partOrder, type: block.type, text: block.text, metadata: compactMetadata(block), location: block.location });
export const compactSourceBlocks = (document) => readableSourceBlocks(document).map(compactSourceBlock);

export function planSourceChunks(document, { maxBytes = DEFAULT_CHUNK_BYTES, maxBlocks = 120 } = {}) {
  const chunks = []; let current = []; let currentBytes = 0;
  const flush = () => { if (!current.length) return; const index = chunks.length; chunks.push({ id: `chunk-${index}`, index, sourceType: document.sourceType, blocks: current, estimate: { serializedBytes: currentBytes, approximateTextTokens: Math.ceil(current.reduce((sum, block) => sum + block.text.length, 0) / 4) } }); current = []; currentBytes = 0; };
  for (const part of document.parts || []) {
    const partBlocks = (part.blocks || []).filter((block) => block.text).map(compactSourceBlock);
    if (!partBlocks.length) continue;
    const partBytes = bytes(partBlocks);
    const wholePartPreferred = ["page", "worksheet"].includes(part.type) && partBytes <= maxBytes && partBlocks.length <= maxBlocks;
    if (wholePartPreferred) {
      if (currentBytes + partBytes > maxBytes || current.length + partBlocks.length > maxBlocks) flush();
      current.push(...partBlocks); currentBytes += partBytes; continue;
    }
    for (const block of partBlocks) {
      const blockBytes = bytes(block);
      if (current.length && (currentBytes + blockBytes > maxBytes || current.length >= maxBlocks)) flush();
      current.push(block); currentBytes += blockBytes;
    }
  }
  flush();
  return chunks;
}

const evidenceSet = (fields) => new Set((fields || []).flatMap((field) => field.evidenceRefs || []));
export function consolidationPreservesMapping(before, after) {
  if (!after || (after.fields || []).length < (before.fields || []).length) return false;
  if ((after.sections || []).length < (before.sections || []).length) return false;
  const retained = evidenceSet(after.fields); const fieldsPreserved = [...evidenceSet(before.fields)].every((id) => retained.has(id));
  const retainedSections = evidenceSet(after.sections); return fieldsPreserved && [...evidenceSet(before.sections)].every((id) => retainedSections.has(id));
}

export function mergeGlobalContext(results) {
  const unique = (items, key) => [...new Map(items.map((item) => [key(item), item])).values()];
  return {
    documentTitle: results.find((item) => item?.documentTitle)?.documentTitle || "",
    outline: unique(results.flatMap((item) => item?.outline || []), (item) => `${item.title}|${item.sourceOrder}`),
    glossary: unique(results.flatMap((item) => item?.glossary || []), (item) => `${item.term}|${item.meaning}`),
    responseCodes: unique(results.flatMap((item) => item?.responseCodes || []), (item) => `${item.code}|${item.meaning}`),
    warnings: unique(results.flatMap((item) => item?.warnings || []), String),
  };
}

export function combineMappedResults(results) {
  const sectionMap = new Map();
  for (const section of results.flatMap((result) => result?.sections || [])) {
    const identity = `${section.sectionKey}|${section.title}`;
    if (!sectionMap.has(identity)) sectionMap.set(identity, section);
  }
  const usedKeys = new Set();
  const fields = results.flatMap((result) => result?.fields || []).map((field) => {
    const slug = (value, fallback) => String(value || "").toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_+|_+$/g, "").slice(0, 60) || fallback;
    let fieldKey = field.fieldKey; let suffix = 2;
    if (usedKeys.has(fieldKey)) fieldKey = `${slug(field.sectionKey, "general")}_${slug(field.label, "field")}`;
    const base = fieldKey;
    while (usedKeys.has(fieldKey)) fieldKey = `${base.slice(0, 74)}_${suffix++}`;
    usedKeys.add(fieldKey); return { ...field, fieldKey };
  });
  return {
    sections: [...sectionMap.values()],
    fields,
    classifications: results.flatMap((result) => result?.classifications || []),
    notes: results.flatMap((result) => result?.notes || []),
    referenceData: results.flatMap((result) => result?.referenceData || []),
    warnings: results.flatMap((result) => result?.warnings || []),
    unmappedBlocks: results.flatMap((result) => result?.unmappedBlocks || []),
  };
}
