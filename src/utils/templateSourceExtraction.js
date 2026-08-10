import pdfWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";
import { buildStructuredEvidence, clean, keyFor, normalizeLocalFields, suggestFieldsFromEvidence } from "./templateEvidence";

export { buildStructuredEvidence, mergeMappedFields, suggestFieldsFromEvidence, suggestFieldsFromText, usefulLocalFields } from "./templateEvidence";
export const SOURCE_LIMITS = { pdfBytes: 10 * 1024 * 1024, xmlBytes: 2 * 1024 * 1024, docxBytes: 10 * 1024 * 1024, xlsxBytes: 10 * 1024 * 1024, pdfPages: 25, ocrPages: 10, xlsxSheets: 10 };

function annotationField(annotation, pageNumber, index) {
  if (!annotation.fieldName || annotation.subtype !== "Widget") return null; const [x1, y1, x2, y2] = annotation.rect || []; const type = annotation.fieldType === "Btn" ? "checkbox" : annotation.fieldType === "Ch" ? "select" : "text";
  return { fieldKey: keyFor(annotation.fieldName, index), label: annotation.alternativeText || annotation.fieldName, type, defaultValue: annotation.fieldValue ?? "", options: type === "select" ? (annotation.options || []).map((option) => option.displayValue || option.exportValue) : [], sourceFieldName: annotation.fieldName, sourcePageNumber: pageNumber, sourceCoordinates: [x1, y1, x2, y2].every(Number.isFinite) ? { x: x1, y: y1, width: x2 - x1, height: y2 - y1 } : null, section: "Document fields" };
}

function pdfLines(items, styles = {}) {
  const rows = [];
  for (const item of items) {
    const text = clean(item?.str, 1000); if (!text) continue; const x = Number(item.transform?.[4]) || 0; const y = Number(item.transform?.[5]) || 0; const fontSize = Math.round(Math.hypot(Number(item.transform?.[0]) || 0, Number(item.transform?.[1]) || 0) * 10) / 10; const bold = /bold/i.test(`${item.fontName || ""} ${styles[item.fontName]?.fontFamily || ""}`);
    let row = rows.find((candidate) => Math.abs(candidate.y - y) <= 3); if (!row) { row = { y, items: [] }; rows.push(row); } row.items.push({ text, x, fontSize, bold });
  }
  return rows.sort((a, b) => b.y - a.y).map((row) => { const ordered = row.items.sort((a, b) => a.x - b.x); return { text: ordered.map((item) => item.text).join(" ").replace(/\s+/g, " ").trim(), x: ordered[0].x, y: row.y, fontSize: Math.max(...ordered.map((item) => item.fontSize)), bold: ordered.some((item) => item.bold) }; });
}

async function recognizeScannedPdf(pdf, signal, onProgress, onWorker) {
  if (pdf.numPages > SOURCE_LIMITS.ocrPages) throw new Error("This document exceeds the supported OCR page limit."); const { createWorker } = await import("tesseract.js"); let worker; const cancel = () => worker?.terminate(); signal?.addEventListener("abort", cancel, { once: true });
  try {
    onProgress?.({ stage: "Detecting text", percent: 20 }); worker = await createWorker("eng", undefined, { logger: (entry) => { if (entry.status === "recognizing text") onProgress?.({ stage: "Detecting text", percent: 20 + Math.round(entry.progress * 65) }); } }); onWorker?.(worker); const pages = [];
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) { if (signal?.aborted) throw new DOMException("Extraction cancelled.", "AbortError"); onProgress?.({ stage: `Reading page ${pageNumber} of ${pdf.numPages}`, percent: 20 + Math.round(pageNumber / pdf.numPages * 65) }); const page = await pdf.getPage(pageNumber); const viewport = page.getViewport({ scale: 1.5 }); const canvas = document.createElement("canvas"); canvas.width = Math.ceil(viewport.width); canvas.height = Math.ceil(viewport.height); const context = canvas.getContext("2d", { alpha: false }); await page.render({ canvasContext: context, viewport }).promise; const recognized = await worker.recognize(canvas); pages.push({ name: `Page ${pageNumber}`, lines: (recognized.data.text || "").split(/\r?\n/).map((text) => ({ text })) }); context.clearRect(0, 0, canvas.width, canvas.height); page.cleanup(); }
    onProgress?.({ stage: "Building field suggestions", percent: 95 }); const evidence = buildStructuredEvidence(pages); if (evidence.flatMap((page) => page.lines).map((line) => line.text).join("").replace(/\W/g, "").length < 20) throw new Error("OCR could not detect usable fields."); return { mode: "ocr", fields: suggestFieldsFromEvidence(evidence, "OCR suggestions"), pageCount: pdf.numPages, evidence: { pagesOrSheets: evidence }, aiMappingRecommended: true, message: "OCR field suggestions require review before saving." };
  } finally { signal?.removeEventListener("abort", cancel); await worker?.terminate(); onWorker?.(null); }
}

async function extractPdf(file, options) {
  options.onProgress?.({ stage: "Preparing document", percent: 5 }); const bytes = await file.arrayBuffer(); let loadingTask; let pdfDocument;
  try {
    const pdfjs = await import("pdfjs-dist/build/pdf.mjs"); pdfjs.GlobalWorkerOptions.workerSrc = pdfWorkerUrl; loadingTask = pdfjs.getDocument({ data: bytes }); pdfDocument = await loadingTask.promise; if (pdfDocument.numPages > SOURCE_LIMITS.pdfPages) throw new Error("This document exceeds the supported page limit."); const formFields = []; const pages = [];
    for (let pageNumber = 1; pageNumber <= pdfDocument.numPages; pageNumber += 1) { if (options.signal?.aborted) throw new DOMException("Extraction cancelled.", "AbortError"); options.onProgress?.({ stage: `Reading page ${pageNumber} of ${pdfDocument.numPages}`, percent: 10 + Math.round(pageNumber / pdfDocument.numPages * 55) }); const page = await pdfDocument.getPage(pageNumber); const annotations = await page.getAnnotations(); annotations.forEach((annotation) => { const field = annotationField(annotation, pageNumber, formFields.length); if (field) formFields.push(field); }); const content = await page.getTextContent(); pages.push({ name: `Page ${pageNumber}`, lines: pdfLines(content.items, content.styles) }); page.cleanup(); }
    for (const field of formFields) pages[field.sourcePageNumber - 1]?.lines.push({ text: field.label, x: field.sourceCoordinates?.x, y: field.sourceCoordinates?.y }); options.onProgress?.({ stage: "Building field suggestions", percent: 95 }); const evidence = buildStructuredEvidence(pages); const meaningful = evidence.flatMap((page) => page.lines).map((line) => line.text).join("").replace(/\W/g, "").length;
    if (formFields.length) return { mode: "acroform", fields: normalizeLocalFields(formFields), pageCount: pdfDocument.numPages, evidence: { pagesOrSheets: evidence }, aiMappingRecommended: false, message: "Fillable PDF fields were read locally. Review them before saving." };
    if (meaningful >= 20) return { mode: "text", fields: suggestFieldsFromEvidence(evidence), pageCount: pdfDocument.numPages, evidence: { pagesOrSheets: evidence }, aiMappingRecommended: true, message: "Cleaned PDF text is ready. Map fields with AI or edit the local suggestions." };
    return await recognizeScannedPdf(pdfDocument, options.signal, options.onProgress, options.onWorker);
  } catch (error) { if (error?.name === "PasswordException") throw new Error("This PDF is password protected.", { cause: error }); throw error; }
  finally { try { if (typeof pdfDocument?.cleanup === "function") await pdfDocument.cleanup(); if (typeof loadingTask?.destroy === "function") await loadingTask.destroy(); } catch (cleanupError) { console.warn("PDF resource cleanup:", cleanupError?.message || cleanupError); } }
}

function extractXml(fileText) {
  if (/<!DOCTYPE|<!ENTITY/i.test(fileText) || /<\?(?!xml(?:\s|\?>))/i.test(fileText)) throw new Error("This XML contains unsafe declarations or processing instructions."); const documentNode = new DOMParser().parseFromString(fileText, "application/xml"); if (documentNode.querySelector("parsererror")) throw new Error("Unable to parse this XML file.");
  const explicit = [...documentNode.querySelectorAll("inspectionTemplate section field")].map((node) => ({ fieldKey: node.getAttribute("fieldKey") || node.getAttribute("key"), label: node.getAttribute("label") || node.textContent.trim(), type: node.getAttribute("fieldType") || node.getAttribute("type") || "text", required: node.getAttribute("required") === "true", section: node.closest("section")?.getAttribute("title") || "General", defaultValue: node.getAttribute("defaultValue") || "" })); const generic = [...documentNode.querySelectorAll("*")].filter((node) => !node.children.length && node.textContent.trim()).map((node) => ({ label: node.localName.replace(/[_-]+/g, " "), type: "text", section: node.parentElement?.localName || "XML fields", defaultValue: node.textContent.trim(), suggested: true })); const fields = normalizeLocalFields(explicit.length ? explicit : generic); if (!fields.length) throw new Error("No supported field definitions were found in this XML file."); const evidence = buildStructuredEvidence([{ name: "XML", lines: [...documentNode.querySelectorAll("*")].filter((node) => !node.children.length && node.textContent.trim()).map((node) => ({ text: `${node.localName}: ${node.textContent.trim()}` })) }]); return { mode: explicit.length ? "nexaport_xml" : "generic_xml", fields, pageCount: null, evidence: { pagesOrSheets: evidence }, aiMappingRecommended: !explicit.length, message: explicit.length ? "NexaPort XML fields were read locally." : "XML text is ready for field mapping." };
}

async function extractDocx(file) {
  const mammoth = await import("mammoth/mammoth.browser");
  let converted;
  try {
    converted = await mammoth.convertToHtml({ arrayBuffer: await file.arrayBuffer() });
  } catch {
    throw new Error("The DOCX file could not be read.");
  }
  const documentNode = new DOMParser().parseFromString(converted.value, "text/html");
  const body = documentNode.querySelector("body");
  if (!body) throw new Error("The DOCX file could not be read.");

  const HEADING_FONT = { H1: 18, H2: 16, H3: 15, H4: 14, H5: 13, H6: 12 };
  const PLACEHOLDER_RE = /^[-–—_.\s/\\|*☐□☑✓✔]+$/;
  const ABBREV_HEADER_RE = /\b(abbreviat|code|meaning|definition|acronym|symbol|legend)\b/i;
  const CHECKLIST_HEADER_RE = /\b(yes|no|n\/a|status|pass|fail|ok|check)\b/i;
  const QUESTION_MARKER_RE = /[?*:]/;

  const lines = [];

  /** Emit a single evidence line */
  const emit = (text, bold = false, fontSize = 12) => {
    const trimmed = clean(text, 1000);
    if (trimmed) lines.push({ text: trimmed, bold, fontSize });
  };

  /** Process a <table> element */
  const processTable = (table) => {
    const tableRows = [...table.querySelectorAll("tr")];
    if (!tableRows.length) return;

    // Read header row to detect table type
    const headerCells = [...(tableRows[0]?.querySelectorAll("th,td") || [])].map(
      (cell) => clean(cell.textContent, 200)
    );
    const headerText = headerCells.join(" ").toLowerCase();

    // Skip abbreviation / reference tables
    if (ABBREV_HEADER_RE.test(headerText)) return;

    // Detect checklist tables (headers contain Yes / No / Status columns)
    const isChecklist = headerCells.length >= 2 && CHECKLIST_HEADER_RE.test(headerText);

    // Detect label/value tables (exactly 2 content columns)
    const isLabelValue = headerCells.length === 2 && !isChecklist;

    const dataRows = tableRows.slice(headerCells.some((c) => c) ? 1 : 0);
    for (const row of dataRows) {
      const cells = [...row.querySelectorAll("th,td")].map((cell) => clean(cell.textContent, 500));
      const nonEmpty = cells.filter(Boolean);
      if (!nonEmpty.length) continue;

      if (isChecklist && cells[0]) {
        // Emit the question text with "Yes No" appended for type detection
        const question = clean(cells[0], 500);
        if (question && !PLACEHOLDER_RE.test(question)) {
          emit(`${question} Yes No`);
        }
      } else if (isLabelValue) {
        const label = cells[0];
        const value = cells[1];
        if (!label) continue;
        // If value is empty or a placeholder, emit just the label
        if (!value || PLACEHOLDER_RE.test(value)) {
          emit(label);
        } else {
          emit(label);
        }
      } else {
        // Regular table: emit each non-empty cell
        for (const cell of nonEmpty) {
          if (!PLACEHOLDER_RE.test(cell)) emit(cell);
        }
      }
    }
  };

  // Process all child nodes of <body> in document order
  const walker = (parent) => {
    for (const node of parent.childNodes) {
      if (node.nodeType !== 1) continue; // Element nodes only
      const tag = node.tagName?.toUpperCase();

      if (tag && HEADING_FONT[tag]) {
        // Heading element -> section heading
        emit(node.textContent, true, HEADING_FONT[tag]);
      } else if (tag === "TABLE") {
        processTable(node);
      } else if (tag === "OL" || tag === "UL") {
        for (const li of node.querySelectorAll("li")) {
          emit(li.textContent);
        }
      } else if (tag === "P" || tag === "DIV") {
        const text = clean(node.textContent, 1000);
        if (!text) continue;
        // Skip long instructional paragraphs without question markers
        if (text.length > 200 && !QUESTION_MARKER_RE.test(text)) continue;
        emit(text);
      } else {
        // For other container elements, walk their children
        if (node.children?.length) walker(node);
      }
    }
  };
  walker(body);

  const evidence = buildStructuredEvidence([{ name: "Document", lines }]);
  if (!evidence.length) throw new Error("No usable headings, tables or form labels were found.");
  return {
    mode: "text",
    fields: suggestFieldsFromEvidence(evidence, "Document"),
    pageCount: null,
    evidence: { pagesOrSheets: evidence },
    aiMappingRecommended: true,
    message: "DOCX text is ready for field mapping.",
  };
}

async function extractXlsx(file) {
  const { default: JSZip } = await import("jszip");
  let zip;
  try {
    zip = await JSZip.loadAsync(await file.arrayBuffer());
  } catch {
    throw new Error("The workbook could not be read.");
  }

  const parseXml = async (path) => {
    const entry = zip.file(path);
    return entry ? new DOMParser().parseFromString(await entry.async("text"), "application/xml") : null;
  };

  const workbook = await parseXml("xl/workbook.xml");
  const relationships = await parseXml("xl/_rels/workbook.xml.rels");
  if (!workbook || !relationships) throw new Error("The workbook could not be read.");

  // Build relationship ID -> file path map
  const relationPaths = new Map(
    [...relationships.querySelectorAll("Relationship")].map((node) => [
      node.getAttribute("Id"),
      `xl/${node.getAttribute("Target").replace(/^\/?xl\//, "").replace(/^\.\.\//, "")}`,
    ])
  );

  // Parse shared strings
  const shared = await parseXml("xl/sharedStrings.xml");
  const sharedStrings = shared ? [...shared.querySelectorAll("si")].map((node) => node.textContent) : [];

  // Parse styles for date format detection
  const stylesDoc = await parseXml("xl/styles.xml");
  const BUILTIN_DATE_FMT_IDS = new Set([14, 15, 16, 17, 18, 19, 20, 21, 22, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 45, 46, 47, 50, 51, 52, 53, 54, 55, 56, 57, 58]);
  const DATE_PATTERN_RE = /[dmyhs]/i;

  // Build numFmtId -> isDate map from custom number formats
  const customDateFormats = new Set();
  if (stylesDoc) {
    for (const fmt of stylesDoc.querySelectorAll("numFmt")) {
      const id = Number(fmt.getAttribute("numFmtId"));
      const code = fmt.getAttribute("formatCode") || "";
      if (DATE_PATTERN_RE.test(code) && !/[#0]/.test(code)) customDateFormats.add(id);
    }
  }

  // Build cellXfs array (style index -> numFmtId)
  const cellFormats = stylesDoc
    ? [...stylesDoc.querySelectorAll("cellXfs xf")].map((xf) => Number(xf.getAttribute("numFmtId") || 0))
    : [];

  const isDateStyle = (styleIndex) => {
    if (styleIndex == null || styleIndex === "") return false;
    const numFmtId = cellFormats[Number(styleIndex)];
    if (numFmtId == null) return false;
    return BUILTIN_DATE_FMT_IDS.has(numFmtId) || customDateFormats.has(numFmtId);
  };

  // Convert Excel serial number to ISO date string (1900-based system with Lotus bug)
  const excelSerialToISO = (serial) => {
    const num = Number(serial);
    if (!Number.isFinite(num) || num < 1) return null;
    // Excel incorrectly considers 1900-02-29 as valid (Lotus 123 bug)
    const adjusted = num > 60 ? num - 1 : num;
    const epoch = new Date(1900, 0, adjusted);
    if (isNaN(epoch.getTime())) return null;
    return epoch.toISOString().slice(0, 10);
  };

  const PLACEHOLDER_RE = /^[-–—_.\s/\\|*☐□☑✓✔]+$/;
  const PLACEHOLDER_VALUE_RE = /^(insert|enter|type|select|n\/a|tbd|tbc|\.\.\.|___)/i;

  // Get all visible sheets
  const sheets = [...workbook.querySelectorAll("sheet")].filter((sheet) => {
    const state = sheet.getAttribute("state");
    return !state || (state !== "hidden" && state !== "veryHidden");
  });
  if (sheets.length > SOURCE_LIMITS.xlsxSheets) throw new Error("This workbook exceeds the supported worksheet limit.");

  const pages = [];

  for (const sheet of sheets) {
    const sheetPath = relationPaths.get(sheet.getAttribute("r:id"));
    const sheetDoc = await parseXml(sheetPath);
    if (!sheetDoc) continue;

    const sheetName = clean(sheet.getAttribute("name"), 120) || `Sheet ${pages.length + 1}`;
    const lines = [];

    // Parse all cell values first so we can look up merged cell content
    const cellValues = new Map();
    const cellStyles = new Map();
    for (const row of sheetDoc.querySelectorAll("row")) {
      for (const cell of row.querySelectorAll("c")) {
        const ref = cell.getAttribute("r");
        const type = cell.getAttribute("t");
        const style = cell.getAttribute("s");
        const raw = type === "inlineStr"
          ? cell.querySelector("is")?.textContent
          : cell.querySelector("v")?.textContent;
        const value = type === "s" ? sharedStrings[Number(raw)] : raw;
        const text = clean(value, 500);
        if (text) cellValues.set(ref, text);
        if (style) cellStyles.set(ref, style);
      }
    }

    // Parse column letter from cell reference (e.g., "AB12" -> "AB")
    const colFromRef = (ref) => (ref || "").replace(/\d+/g, "");
    const colIndex = (col) => {
      let idx = 0;
      for (const ch of col.toUpperCase()) idx = idx * 26 + ch.charCodeAt(0) - 64;
      return idx;
    };

    // Process merged cells — emit as headings if wide, skip if empty
    const mergedRanges = [...(sheetDoc.querySelectorAll("mergeCell") || [])];
    const mergedCellRefs = new Set();

    for (const mergeNode of mergedRanges) {
      const range = mergeNode.getAttribute("ref");
      if (!range) continue;
      const [startRef, endRef] = range.split(":");
      const text = cellValues.get(startRef);

      // Track all cells in the merge range to avoid double-processing
      const startCol = colFromRef(startRef);
      const endCol = colFromRef(endRef);
      const startRow = Number(startRef.replace(/[A-Z]+/i, ""));
      const endRow = Number(endRef.replace(/[A-Z]+/i, ""));
      for (let r = startRow; r <= endRow; r++) {
        for (let c = colIndex(startCol); c <= colIndex(endCol); c++) {
          let col = "";
          let n = c;
          while (n > 0) { col = String.fromCharCode(((n - 1) % 26) + 65) + col; n = Math.floor((n - 1) / 26); }
          mergedCellRefs.add(`${col}${r}`);
        }
      }

      if (!text) continue; // Skip empty merged cells
      // Wide merges (3+ columns) are likely section headings
      const colSpan = colIndex(endCol) - colIndex(startCol) + 1;
      if (colSpan >= 3) {
        lines.push({ text, bold: true, fontSize: 16 });
      } else {
        lines.push({ text });
      }
    }

    // Process rows
    for (const row of sheetDoc.querySelectorAll("row")) {
      const cells = [...row.querySelectorAll("c")];
      // Resolve each cell's display value, skipping merged cells already processed
      const cellEntries = [];
      for (const cell of cells) {
        const ref = cell.getAttribute("r");
        if (mergedCellRefs.has(ref)) continue;
        const type = cell.getAttribute("t");
        const style = cell.getAttribute("s");
        const raw = type === "inlineStr"
          ? cell.querySelector("is")?.textContent
          : cell.querySelector("v")?.textContent;
        let value = type === "s" ? sharedStrings[Number(raw)] : raw;

        // Convert date serial numbers
        if (value && !type && isDateStyle(style)) {
          const isoDate = excelSerialToISO(value);
          if (isoDate) value = isoDate;
        }

        const text = clean(value, 500);
        if (text) cellEntries.push({ text, ref, style });
      }

      if (!cellEntries.length) continue;

      // Detect metadata rows (label/value pairs): 2-8 cells with alternating label/placeholder pattern
      if (cellEntries.length >= 2 && cellEntries.length <= 8) {
        let isMetadata = false;
        // Check if any cell looks like a placeholder
        for (let i = 1; i < cellEntries.length; i += 2) {
          const val = cellEntries[i].text;
          if (PLACEHOLDER_RE.test(val) || PLACEHOLDER_VALUE_RE.test(val)) {
            isMetadata = true;
            break;
          }
        }
        // Also check for label/value pattern: text cells alternating
        if (!isMetadata && cellEntries.length === 2) {
          const first = cellEntries[0].text;
          const second = cellEntries[1].text;
          // If first looks like a label and second is a value/placeholder
          if (/[a-zA-Z]/.test(first) && (PLACEHOLDER_RE.test(second) || PLACEHOLDER_VALUE_RE.test(second) || isDateStyle(cellEntries[1].style))) {
            isMetadata = true;
          }
        }

        if (isMetadata) {
          // Emit each label cell separately instead of joining with |
          for (let i = 0; i < cellEntries.length; i++) {
            const text = cellEntries[i].text;
            // Skip obvious placeholder values
            if (PLACEHOLDER_RE.test(text) || PLACEHOLDER_VALUE_RE.test(text)) continue;
            // Skip pure numeric values that might be date serials or IDs
            if (/^\d{4,}$/.test(text) && !isDateStyle(cellEntries[i].style)) continue;
            // Skip date values that were converted
            if (/^\d{4}-\d{2}-\d{2}$/.test(text)) continue;
            lines.push({ text });
          }
          continue;
        }
      }

      // Single cell rows: emit directly
      if (cellEntries.length === 1) {
        lines.push({ text: cellEntries[0].text });
        continue;
      }

      // Multi-cell rows: emit each cell separately
      for (const entry of cellEntries) {
        if (!PLACEHOLDER_RE.test(entry.text)) {
          lines.push({ text: entry.text });
        }
      }
    }

    if (lines.length) {
      pages.push({ name: sheetName, lines });
    }
  }

  const evidence = buildStructuredEvidence(pages);
  if (!evidence.length) throw new Error("No usable cells or form structures were found.");
  // Use first sheet name as fallback section if meaningful, otherwise generic
  const fallbackSection = pages[0]?.name || "Workbook";
  return {
    mode: "text",
    fields: suggestFieldsFromEvidence(evidence, fallbackSection),
    pageCount: null,
    evidence: { pagesOrSheets: evidence },
    aiMappingRecommended: true,
    message: "XLSX text is ready for field mapping.",
  };
}


export async function extractTemplateSource(file, options = {}) { if (!file) throw new Error("Choose a PDF, XML, DOCX or XLSX file."); const extension = file.name.toLowerCase().split(".").pop(); if (extension === "pdf") return extractPdf(file, options); if (extension === "xml") { options.onProgress?.({ stage: "Preparing document", percent: 10 }); options.onProgress?.({ stage: "Building field suggestions", percent: 90 }); return extractXml(await file.text()); } if (extension === "docx") return extractDocx(file); if (extension === "xlsx") return extractXlsx(file); throw new Error("Choose a PDF, XML, DOCX or XLSX file."); }
