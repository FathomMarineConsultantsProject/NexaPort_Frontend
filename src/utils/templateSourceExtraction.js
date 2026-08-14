import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { createSourceDocument, safeSourceText, sourceDocumentToFallbackEvidence } from "./sourceDocument";

export { chooseBestExtractionFields, mergeMappedFields, suggestFieldsFromEvidence, suggestFieldsFromText, usefulLocalFields } from "./templateEvidence";
export { sourceDocumentToFallbackEvidence } from "./sourceDocument";

export const SOURCE_LIMITS = { pdfBytes: 50 * 1024 * 1024, xmlBytes: 5 * 1024 * 1024, docxBytes: 25 * 1024 * 1024, xlsxBytes: 25 * 1024 * 1024 };

const elements = (node, localName) => [...(node?.getElementsByTagNameNS?.("*", localName) || [])];
const first = (node, localName) => elements(node, localName)[0] || null;
const attr = (node, name) => node?.getAttribute(name) ?? [...(node?.attributes || [])].find((item) => item.localName === name)?.value ?? null;
const parseXmlText = (value) => new DOMParser().parseFromString(value, "application/xml");
const xmlError = (documentNode) => !documentNode || elements(documentNode, "parsererror").length;

function pdfLines(items, styles = {}) {
  const rows = [];
  for (const item of items) {
    const text = safeSourceText(item?.str); if (!text) continue;
    const x = Number(item.transform?.[4]) || 0; const y = Number(item.transform?.[5]) || 0;
    const fontSize = Math.round(Math.hypot(Number(item.transform?.[0]) || 0, Number(item.transform?.[1]) || 0) * 10) / 10;
    const bold = /bold/i.test(`${item.fontName || ""} ${styles[item.fontName]?.fontFamily || ""}`);
    let row = rows.find((candidate) => Math.abs(candidate.y - y) <= 3);
    if (!row) { row = { y, items: [] }; rows.push(row); }
    row.items.push({ text, x, fontSize, bold, width: Number(item.width) || null, height: Number(item.height) || null });
  }
  return rows.sort((a, b) => b.y - a.y).map((row) => {
    const ordered = row.items.sort((a, b) => a.x - b.x);
    return { text: ordered.map((item) => item.text).join(" ").replace(/\s+/g, " ").trim(), metadata: { x: ordered[0].x, y: row.y, fontSize: Math.max(...ordered.map((item) => item.fontSize)), bold: ordered.some((item) => item.bold), fragments: ordered } };
  });
}

function annotationBlock(annotation, pageNumber, annotationIndex) {
  const rect = annotation.rect || []; const [x1, y1, x2, y2] = rect;
  const text = safeSourceText(annotation.alternativeText || annotation.fieldName || annotation.contents || annotation.title || "");
  if (!text) return null;
  return {
    type: annotation.subtype === "Widget" ? "control" : "annotation",
    text,
    metadata: { subtype: annotation.subtype || null, fieldName: annotation.fieldName || null, fieldType: annotation.fieldType || null, value: annotation.fieldValue ?? null, options: (annotation.options || []).map((option) => option.displayValue || option.exportValue).filter(Boolean), annotationIndex },
    location: { pageNumber, bounds: [x1, y1, x2, y2].every(Number.isFinite) ? { x: x1, y: y1, width: x2 - x1, height: y2 - y1 } : null },
  };
}

async function extractPdf(file, options) {
  options.onProgress?.({ stage: "Preparing PDF", percent: 1, processedParts: 0, totalParts: 0 });
  const bytes = await file.arrayBuffer(); const failedRegions = []; const parts = []; let loadingTask; let pdf; let ocrWorker;
  const cancelWorker = () => ocrWorker?.terminate(); options.signal?.addEventListener("abort", cancelWorker, { once: true });
  try {
    const pdfjs = await import("pdfjs-dist/build/pdf.mjs"); pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl;
    loadingTask = pdfjs.getDocument({ data: bytes }); pdf = await loadingTask.promise;
    const getOcrWorker = async () => {
      if (ocrWorker) return ocrWorker;
      const { createWorker } = await import("tesseract.js");
      ocrWorker = await createWorker("eng", undefined, { logger: (entry) => entry.status === "recognizing text" && options.onProgress?.({ stage: "OCR", percent: Math.round(entry.progress * 100) }) });
      options.onWorker?.(ocrWorker); return ocrWorker;
    };
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      if (options.signal?.aborted) throw new DOMException("Extraction cancelled.", "AbortError");
      options.onProgress?.({ stage: `Reading PDF ${pageNumber} / ${pdf.numPages} pages`, percent: Math.round(pageNumber / pdf.numPages * 95), processedParts: pageNumber, totalParts: pdf.numPages });
      const page = await pdf.getPage(pageNumber); const blocks = [];
      try {
        const [annotations, content] = await Promise.all([page.getAnnotations(), page.getTextContent()]);
        const lines = pdfLines(content.items, content.styles); const embeddedCharacters = lines.reduce((sum, line) => sum + line.text.replace(/\W/g, "").length, 0);
        let ocrStatus = "not_needed";
        if (embeddedCharacters >= 20) lines.forEach((line) => blocks.push({ type: "text_line", text: line.text, metadata: { ...line.metadata, extraction: "embedded" }, location: { pageNumber } }));
        else {
          ocrStatus = "attempted"; const viewport = page.getViewport({ scale: 1.5 }); const canvas = document.createElement("canvas");
          canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height); const context = canvas.getContext("2d", { alpha: false });
          try {
            await page.render({ canvasContext: context, viewport }).promise;
            const recognized = await (await getOcrWorker()).recognize(canvas); const ocrLines = String(recognized.data.text || "").split(/\r?\n/).map(safeSourceText).filter(Boolean);
            ocrLines.forEach((text) => blocks.push({ type: "text_line", text, metadata: { extraction: "ocr" }, location: { pageNumber } }));
            ocrStatus = ocrLines.length ? "complete" : "empty";
          } catch (error) { ocrStatus = "failed"; failedRegions.push({ type: "page", pageNumber, reason: `OCR failed: ${error?.message || "unknown error"}` }); }
          finally { context?.clearRect(0, 0, canvas.width, canvas.height); canvas.width = 0; canvas.height = 0; }
        }
        annotations.forEach((annotation, index) => { const block = annotationBlock(annotation, pageNumber, index); if (block) blocks.push(block); });
        if (!blocks.length && ocrStatus !== "failed") failedRegions.push({ type: "page", pageNumber, reason: "No readable text or controls were detected." });
        parts.push({ name: `Page ${pageNumber}`, type: "page", metadata: { pageNumber, readStatus: blocks.length ? "read" : "unreadable", ocrStatus }, blocks });
      } catch (error) { failedRegions.push({ type: "page", pageNumber, reason: error?.message || "Unable to read page." }); parts.push({ name: `Page ${pageNumber}`, type: "page", metadata: { pageNumber, readStatus: "failed", ocrStatus: "failed" }, blocks: [] }); }
      finally { page.cleanup(); }
    }
    return createSourceDocument({ sourceType: "pdf", sourceName: file.name, metadata: { pageCount: pdf.numPages, byteSize: file.size }, parts, failedRegions });
  } catch (error) { if (error?.name === "PasswordException") throw new Error("This PDF is password protected.", { cause: error }); throw error; }
  finally { options.signal?.removeEventListener("abort", cancelWorker); await ocrWorker?.terminate(); options.onWorker?.(null); try { await pdf?.cleanup?.(); await loadingTask?.destroy?.(); } catch { /* resources already released */ } }
}

function directText(node) {
  return [...node.childNodes].filter((child) => child.nodeType === 3 || child.nodeType === 4).map((child) => child.nodeValue).join(" ").replace(/\s+/g, " ").trim();
}

function indexedXmlPath(node) {
  const parts = [];
  for (let current = node; current?.nodeType === 1; current = current.parentElement) {
    const siblings = [...(current.parentElement?.children || [])].filter((item) => item.localName === current.localName && item.namespaceURI === current.namespaceURI);
    const index = Math.max(1, siblings.indexOf(current) + 1); parts.unshift(`${current.prefix ? `${current.prefix}:` : ""}${current.localName}[${index}]`);
  }
  return `/${parts.join("/")}`;
}

function extractXml(fileText, fileName) {
  const source = String(fileText || "").replace(/^\uFEFF/, "");
  if (/<!DOCTYPE|<!ENTITY|<\?(?!xml(?:\s|\?>))/i.test(source)) throw new Error("This XML contains unsafe declarations or processing instructions.");
  const documentNode = parseXmlText(source); if (xmlError(documentNode)) throw new Error("Unable to parse this XML file.");
  const blocks = [];
  const walk = (node, parentPath = null) => {
    const path = indexedXmlPath(node); const text = directText(node);
    const attributes = [...node.attributes].map((item) => ({ name: item.name, prefix: item.prefix || null, localName: item.localName, namespaceURI: item.namespaceURI || null, value: item.value }));
    const children = [...node.children]; const openTag = `<${node.nodeName}${attributes.length ? ` ${attributes.map((item) => `${item.name}="${item.value}"`).join(" ")}` : ""}${!children.length && !text ? " /" : ""}>`;
    blocks.push({ type: "xml_element", text: openTag, metadata: { prefix: node.prefix || null, localName: node.localName, namespaceURI: node.namespaceURI || null, attributes, parentPath, childCount: children.length, empty: !children.length && !text }, location: { elementPath: path } });
    if (text) blocks.push({ type: "xml_text", text, metadata: { parentPath: path }, location: { elementPath: `${path}/text()[1]` } });
    children.forEach((child) => walk(child, path));
  };
  walk(documentNode.documentElement);
  return createSourceDocument({ sourceType: "xml", sourceName: fileName, metadata: { root: documentNode.documentElement.nodeName, pageCount: null }, parts: [{ name: "XML", type: "xml", blocks }] });
}

function wordText(node) {
  return elements(node, "t").map((item) => item.textContent).join("").replace(/\s+/g, " ").trim();
}

async function extractDocx(file, options) {
  options.onProgress?.({ stage: "Reading Word document", percent: 10, processedParts: 0, totalParts: 1 });
  const [{ default: JSZip }, mammoth] = await Promise.all([import("jszip"), import("mammoth/mammoth.browser")]);
  let zip; try { zip = await JSZip.loadAsync(await file.arrayBuffer()); } catch { throw new Error("The DOCX file could not be read."); }
  const parse = async (path) => { const entry = zip.file(path); return entry ? parseXmlText(await entry.async("text")) : null; };
  const [documentXml, stylesXml, numberingXml, relationshipsXml] = await Promise.all([parse("word/document.xml"), parse("word/styles.xml"), parse("word/numbering.xml"), parse("word/_rels/document.xml.rels")]);
  if (xmlError(documentXml)) throw new Error("The DOCX file could not be read.");
  const mammothWarnings = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() }).then((result) => result.messages.map((item) => item.message)).catch(() => ["Mammoth preview conversion was unavailable; OOXML content was still read."]);
  const styles = new Map(elements(stylesXml, "style").map((style) => [attr(style, "styleId"), { name: attr(first(style, "name"), "val"), outlineLevel: Number(attr(first(style, "outlineLvl"), "val")) }]));
  const blocks = []; let tableIndex = 0;
  const paragraph = (node, extra = {}) => {
    const text = wordText(node); const styleId = attr(first(node, "pStyle"), "val"); const style = styles.get(styleId) || {}; const outline = Number.isInteger(style.outlineLevel) ? style.outlineLevel + 1 : null;
    const controls = elements(node, "sdtPr").map((control) => ({ tag: attr(first(control, "tag"), "val"), alias: attr(first(control, "alias"), "val"), checkbox: Boolean(first(control, "checkBox") || first(control, "checkbox")) }));
    const imageCount = elements(node, "blip").length; const pageBreak = elements(node, "br").some((br) => attr(br, "type") === "page"); const sectionBreak = Boolean(first(node, "sectPr"));
    if (text) blocks.push({ type: outline || /^Heading\s+\d+$/i.test(style.name || "") ? "heading" : first(node, "numPr") ? "list_item" : controls.length ? "control" : "paragraph", text, metadata: { styleId: styleId || null, paragraphStyle: style.name || null, headingLevel: outline, controls, pageBreak, sectionBreak, ...extra }, location: extra.location || {} });
    if (imageCount) blocks.push({ type: "image_placeholder", text: `Embedded image${imageCount > 1 ? `s (${imageCount})` : ""}`, metadata: { imageCount }, location: extra.location || {} });
  };
  const table = (node) => {
    const currentTable = tableIndex++;
    let responseHeader = null;
    elements(node, "tr").forEach((row, rowIndex) => {
      const cells = [...row.children].filter((child) => child.localName === "tc").map((cell, columnIndex) => ({
        columnIndex, text: wordText(cell), gridSpan: Number(attr(first(cell, "gridSpan"), "val")) || 1,
        verticalMerge: attr(first(cell, "vMerge"), "val") || (first(cell, "vMerge") ? "continue" : null),
        controls: elements(cell, "sdtPr").map((control) => ({ tag: attr(first(control, "tag"), "val"), alias: attr(first(control, "alias"), "val"), checkbox: Boolean(first(control, "checkBox") || first(control, "checkbox")) })),
      }));
      if (rowIndex === 0) responseHeader = cells.filter((cell) => cell.text).map((cell) => cell.text).join(" | ") || null;
      const text = cells.map((cell) => cell.text).filter(Boolean).join(" | "); const emptyResponseCells = cells.filter((cell) => !cell.text).length;
      if (text) blocks.push({ type: "table_row", text, metadata: { tableIndex: currentTable, rowIndex, cells, header: rowIndex === 0, tableStructure: { columnCount: cells.length, responseColumnCount: Math.max(0, cells.length - 1), emptyResponseCells, responseHeader } }, location: { tableIndex: currentTable, rowIndex } });
    });
  };
  const body = first(documentXml, "body");
  for (const child of [...(body?.children || [])]) {
    if (options.signal?.aborted) throw new DOMException("Extraction cancelled.", "AbortError");
    if (child.localName === "p" || child.localName === "sdt") paragraph(child);
    else if (child.localName === "tbl") table(child);
  }
  const parts = [{ name: "Document", type: "document", metadata: { tableCount: tableIndex }, blocks }];
  const headerFooterTargets = elements(relationshipsXml, "Relationship").filter((relationship) => /\/(header|footer)$/.test(attr(relationship, "Type") || "")).map((relationship) => attr(relationship, "Target"));
  for (const target of headerFooterTargets) {
    const path = `word/${String(target).replace(/^\.\//, "")}`; const xml = await parse(path); if (!xml || xmlError(xml)) continue;
    const regionBlocks = []; for (const p of elements(xml, "p")) { const text = wordText(p); if (text) regionBlocks.push({ type: "paragraph", text, metadata: { region: /header/i.test(target) ? "header" : "footer" } }); }
    parts.push({ name: target, type: /header/i.test(target) ? "header" : "footer", blocks: regionBlocks });
  }
  options.onProgress?.({ stage: "Word document ready", percent: 100, processedParts: 1, totalParts: 1 });
  return createSourceDocument({ sourceType: "docx", sourceName: file.name, metadata: { pageCount: null, tableCount: tableIndex, numberingDefinitions: elements(numberingXml, "num").length, relationshipCount: elements(relationshipsXml, "Relationship").length }, parts, warnings: mammothWarnings });
}

const columnLetters = (ref) => String(ref || "").replace(/\d+/g, "");
const columnNumber = (letters) => [...String(letters).toUpperCase()].reduce((value, letter) => value * 26 + letter.charCodeAt(0) - 64, 0);
const excelDate = (serial, date1904) => { const value = Number(serial); if (!Number.isFinite(value)) return null; const epoch = Date.UTC(date1904 ? 1904 : 1899, date1904 ? 0 : 11, date1904 ? 1 : 30); return new Date(epoch + value * 86400000).toISOString().slice(0, 10); };

async function extractXlsx(file, options) {
  const { default: JSZip } = await import("jszip"); let zip; try { zip = await JSZip.loadAsync(await file.arrayBuffer()); } catch { throw new Error("The workbook could not be read."); }
  const parse = async (path) => { const entry = zip.file(path); return entry ? parseXmlText(await entry.async("text")) : null; };
  const [workbook, relationships, shared, styles] = await Promise.all([parse("xl/workbook.xml"), parse("xl/_rels/workbook.xml.rels"), parse("xl/sharedStrings.xml"), parse("xl/styles.xml")]);
  if (xmlError(workbook) || xmlError(relationships)) throw new Error("The workbook could not be read.");
  const relationPaths = new Map(elements(relationships, "Relationship").map((node) => [attr(node, "Id"), `xl/${String(attr(node, "Target")).replace(/^\/?xl\//, "").replace(/^\.\.\//, "")}`]));
  const sharedStrings = elements(shared, "si").map((node) => elements(node, "t").map((item) => item.textContent).join(""));
  const customFormats = new Map(elements(styles, "numFmt").map((node) => [Number(attr(node, "numFmtId")), attr(node, "formatCode") || ""]));
  const formatIds = elements(first(styles, "cellXfs"), "xf").map((node) => Number(attr(node, "numFmtId") || 0));
  const dateFormats = new Set([14,15,16,17,18,19,20,21,22,27,28,29,30,31,32,33,34,35,36,45,46,47,50,51,52,53,54,55,56,57,58]);
  const isDate = (styleIndex) => { const id = formatIds[Number(styleIndex)]; return dateFormats.has(id) || /[dmyhs]/i.test(customFormats.get(id) || ""); };
  const date1904 = /^(1|true)$/i.test(attr(first(workbook, "workbookPr"), "date1904") || ""); const parts = [];
  const sheets = elements(workbook, "sheet");
  for (let sheetIndex = 0; sheetIndex < sheets.length; sheetIndex += 1) {
    if (options.signal?.aborted) throw new DOMException("Extraction cancelled.", "AbortError");
    options.onProgress?.({ stage: `Reading workbook ${sheetIndex + 1} / ${sheets.length} sheets`, percent: Math.round((sheetIndex + 1) / sheets.length * 100), processedParts: sheetIndex + 1, totalParts: sheets.length });
    const sheet = sheets[sheetIndex]; const sheetPath = relationPaths.get(attr(sheet, "id")); const xml = await parse(sheetPath); if (!xml || xmlError(xml)) { parts.push({ name: attr(sheet, "name") || `Sheet ${sheetIndex + 1}`, type: "worksheet", metadata: { sheetIndex, visibility: attr(sheet, "state") || "visible", readStatus: "failed" }, blocks: [] }); continue; }
    const mergeRanges = elements(xml, "mergeCell").map((node) => attr(node, "ref")).filter(Boolean);
    const validations = elements(xml, "dataValidation").map((node) => ({ ranges: String(attr(node, "sqref") || "").split(/\s+/).filter(Boolean), type: attr(node, "type"), allowBlank: attr(node, "allowBlank"), formula1: first(node, "formula1")?.textContent || null, formula2: first(node, "formula2")?.textContent || null }));
    const hiddenColumns = elements(xml, "col").filter((node) => attr(node, "hidden") === "1").map((node) => ({ min: Number(attr(node, "min")), max: Number(attr(node, "max")) }));
    const blocks = [];
    for (const row of elements(xml, "row")) {
      const rowIndex = Number(attr(row, "r")); const rowHidden = attr(row, "hidden") === "1"; const cells = [];
      for (const cell of [...row.children].filter((item) => item.localName === "c")) {
        const ref = attr(cell, "r"); const type = attr(cell, "t") || "number"; const styleIndex = attr(cell, "s"); const raw = type === "inlineStr" ? first(cell, "is")?.textContent ?? "" : first(cell, "v")?.textContent ?? "";
        let displayed = type === "s" ? sharedStrings[Number(raw)] ?? "" : type === "b" ? (raw === "1" ? "TRUE" : "FALSE") : raw;
        if (raw !== "" && type === "number" && isDate(styleIndex)) displayed = excelDate(raw, date1904) || displayed;
        const formula = first(cell, "f")?.textContent || null; const columnIndex = columnNumber(columnLetters(ref));
        const validation = validations.find((item) => item.ranges.some((range) => range === ref || (!range.includes(":") ? false : (() => { const [start, end] = range.split(":"); const rowValue = Number(String(ref).replace(/\D/g, "")); const colValue = columnNumber(columnLetters(ref)); return rowValue >= Number(start.replace(/\D/g, "")) && rowValue <= Number(end.replace(/\D/g, "")) && colValue >= columnNumber(columnLetters(start)) && colValue <= columnNumber(columnLetters(end)); })())));
        cells.push({ reference: ref, rowIndex, columnIndex, rawValue: raw, displayedValue: displayed, cellType: type, formula, styleIndex: styleIndex == null ? null : Number(styleIndex), numberFormat: customFormats.get(formatIds[Number(styleIndex)]) || formatIds[Number(styleIndex)] || null, dateFormatted: isDate(styleIndex), validation: validation || null, empty: raw === "" && !formula });
      }
      if (!cells.length) continue;
      const rowText = cells.map((cell) => safeSourceText(cell.displayedValue)).filter(Boolean).join(" | ");
      if (rowText) blocks.push({ type: "spreadsheet_row", text: rowText, metadata: { rowIndex, hidden: rowHidden, cells, mergeRanges: mergeRanges.filter((range) => range.split(":").some((ref) => Number(ref.replace(/\D/g, "")) === rowIndex)) }, location: { sheetIndex, sheetName: attr(sheet, "name"), rowIndex } });
    }
    parts.push({ name: attr(sheet, "name") || `Sheet ${sheetIndex + 1}`, type: "worksheet", metadata: { sheetIndex, visibility: attr(sheet, "state") || "visible", mergeRanges, hiddenColumns, validations, readStatus: "read" }, blocks });
  }
  return createSourceDocument({ sourceType: "xlsx", sourceName: file.name, metadata: { sheetCount: sheets.length, dateSystem: date1904 ? "1904" : "1900" }, parts });
}

export async function extractTemplateSource(file, options = {}) {
  const sourceMode = options.sourceMode; if (!file || !["pdf", "xml", "docx", "xlsx"].includes(sourceMode)) throw new Error("Choose a supported source file.");
  const extension = file.name.toLowerCase().split(".").pop(); if (extension !== sourceMode) throw new Error(`Please select a ${sourceMode.toUpperCase()} file.`);
  if (sourceMode === "pdf") return extractPdf(file, options);
  if (sourceMode === "xml") return extractXml(await file.text(), file.name);
  if (sourceMode === "docx") return extractDocx(file, options);
  return extractXlsx(file, options);
}

export const localFallbackFields = (document, suggestFieldsFromEvidence) => suggestFieldsFromEvidence(sourceDocumentToFallbackEvidence(document));
