import { createSourceDocument } from "../../src/utils/sourceDocument.js";

const tankFields = ["Tank Pressure", "Tank Volume", "Tank LV (Level)", "Tank Temp"];
const operationalFields = ["Manifold Press / Temp (Liq)", "Manifold Press / Temp (Vap)", "Loaded Q'ty", "Tk Filling v/v Opening", "Wind / Sea", "Trim / List", "Mooring / Fender Condition", "Deck Leakage", "Gas Check", "Other Remarks", "Checked By (Sign)"];
const sectionDefs = [["no_1_meoh_tk", "No.1 MeOH TK", tankFields], ["no_2_meoh_tk", "No.2 MeOH TK", tankFields], ["no_3_meoh_tk", "No.3 MeOH TK", tankFields], ["other_operational_parameters", "Other Operational Parameters", operationalFields]];

export function meohFixture() {
  const blocks = [
    { type: "heading", text: "MeOH Bunkering Hourly Checklist" },
    { type: "paragraph", text: "Record the actual reading for each item every hour." },
    { type: "table_row", text: "Date", metadata: { cells: [{ columnIndex: 0, text: "Date" }, ...Array.from({ length: 10 }, (_, index) => ({ columnIndex: index + 1, text: "" }))], tableStructure: { responseColumnCount: 10, responseHeader: "Time", emptyResponseCells: 10 } } },
  ];
  for (const [, title, labels] of sectionDefs) {
    blocks.push({ type: "heading", text: title });
    for (const label of labels) blocks.push({ type: "table_row", text: label, metadata: { cells: [{ columnIndex: 0, text: label }, ...Array.from({ length: 10 }, (_, index) => ({ columnIndex: index + 1, text: "" }))], tableStructure: { responseColumnCount: 10, responseHeader: "Time", emptyResponseCells: 10 } } });
  }
  while (blocks.length < 56) blocks.push({ type: "paragraph", text: `Hourly reading guidance ${blocks.length + 1}` });
  const document = createSourceDocument({ sourceType: "docx", sourceName: "MeOH checklist.docx", parts: [{ name: "Document", type: "document", blocks }] });
  const readable = document.parts[0].blocks; const sections = []; const fields = [];
  const dateBlock = readable.find((block) => block.text === "Date"); fields.push({ fieldKey: "date", label: "Date", fieldType: "date", sectionKey: "general", required: false, options: [], sourceOrder: dateBlock.globalOrder, evidenceRefs: [dateBlock.id], confidence: .99 });
  for (const [sectionKey, title, labels] of sectionDefs) {
    const heading = readable.find((block) => block.text === title); sections.push({ sectionKey, title, sourceOrder: heading.globalOrder, evidenceRefs: [heading.id] });
    for (const label of labels) {
      const candidates = readable.filter((block) => block.text === label); const sectionIndex = sectionDefs.findIndex((item) => item[0] === sectionKey); const evidence = candidates[Math.min(sectionIndex, candidates.length - 1)];
      const fieldType = label === "Other Remarks" ? "textarea" : label === "Checked By (Sign)" ? "signature" : "text";
      fields.push({ fieldKey: `${sectionKey}_${label.toLowerCase().replace(/[^a-z0-9]+/g, "_").replace(/^_|_$/g, "")}`, label, fieldType, sectionKey, required: false, options: [], sourceOrder: evidence.globalOrder, evidenceRefs: [evidence.id], confidence: .95 });
    }
  }
  return { document, response: { sections, fields, warnings: [] } };
}
