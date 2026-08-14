import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { mergeMappedFields } from "../src/utils/templateEvidence.js";

const source = async (file) => readFile(new URL(file, import.meta.url), "utf8");
const editorSource = () => source("../src/pages/TemplateEditorPage.jsx");

test("the template builder exposes one Extract Fields action", async () => {
  const editor = await editorSource();
  assert.equal(editor.match(/"Extract Fields"/g)?.length, 1);
  assert.match(editor, /onClick=\{extractFields\}/);
});

for (const hidden of ["Analyse with AI", "Retry unresolved", "Use local fallback", "Source coverage", "partial failure", "View extracted source"]) {
  test(`${hidden} is not displayed`, async () => assert.doesNotMatch(await editorSource(), new RegExp(hidden, "i")));
}

test("Extract Fields uploads the selected document and automatically starts analysis", async () => {
  const editor = await editorSource(); const action = editor.match(/const extractFields = async[\s\S]*?\n {2}\};/)?.[0] || "";
  assert.match(action, /await analysis\.analyse\(file, sourceMode\)/);
  assert.doesNotMatch(action, /planSourceChunks|extractTemplateSource/);
});

test("successful and partial results populate Field Definitions without another action", async () => {
  const editor = await editorSource();
  assert.match(editor, /const mapped = fieldsFromAnalysis\(result\)/);
  assert.match(editor, /setFields\(mapped\)/);
  assert.match(editor, /Fields were extracted, but some items may need review\./);
  assert.match(editor, /Fields extracted successfully\. Review them below before saving\./);
});

test("complete failure offers a simple retry without placing Add Field in the error banner", async () => {
  const editor = await editorSource(); const fields = await source("../src/components/templates/FieldEditor.jsx");
  assert.match(editor, /We couldn't automatically extract the fields right now\. Please try again\./);
  assert.match(editor, /"Try Again"/);
  assert.doesNotMatch(editor, /role="alert"[^\n]*Add Field/);
  assert.match(fields, /> Add field</);
});

test("ordinary UI does not render technical extraction state", async () => {
  const rendered = (await editorSource()).split('return <main className="templates-page">')[1] || "";
  for (const term of ["OpenRouter", "grounding failed", "chunk", "coverage ledger", "unresolved", "local fallback"]) assert.doesNotMatch(rendered, new RegExp(term, "i"));
});

test("Start Blank has no extraction toolbar and retains manual Add field", async () => {
  const editor = await editorSource(); const fields = await source("../src/components/templates/FieldEditor.jsx");
  assert.match(editor, /!isBlankMode && <section className="template-extraction-toolbar"/);
  assert.match(fields, /> Add field</);
});

test("source tabs accept only their matching file extensions", async () => {
  const upload = await source("../src/components/templates/TemplateUpload.jsx");
  assert.match(upload, /pdf: \{ accept: "\.pdf,application\/pdf"/);
  assert.match(upload, /xml: \{ accept: "\.xml,application\/xml,text\/xml"/);
  assert.match(upload, /docx: \{ accept: "\.docx,application\/vnd\.openxmlformats-officedocument\.wordprocessingml\.document"/);
  assert.match(upload, /xlsx: \{ accept: "\.xlsx,application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet"/);
});

test("AI field types and photo limits survive normalization into editable fields", () => {
  const mapped = [
    { fieldKey: "photo", label: "Photo Evidence", fieldType: "photo", maxPhotos: 6, sectionKey: "evidence", sourceOrder: 1, options: [] },
    { fieldKey: "signature", label: "Inspector Signature", fieldType: "signature", sectionKey: "signoff", sourceOrder: 2, options: [] },
    { fieldKey: "pump", label: "Is the pump operational?", fieldType: "yes_no", sectionKey: "safety", sourceOrder: 3, options: ["Yes", "No"] },
  ];
  const fields = mergeMappedFields([], [], mapped, new Map([["evidence", "Evidence"], ["signoff", "Sign-Off"], ["safety", "Safety"]]));
  assert.equal(fields[0].maxPhotos, 6); assert.equal(fields[1].type, "signature"); assert.equal(fields[2].type, "yes_no");
});

test("one private multipart upload replaces frontend document chunking", async () => {
  const hook = await source("../src/hooks/useTemplateAnalysis.js"); const editor = await editorSource();
  assert.equal((hook.match(/analyseTemplateSource\(/g) || []).length, 1); assert.doesNotMatch(hook, /planSourceChunks|mode: "map"/);
  assert.doesNotMatch(editor + hook, /localStorage|sessionStorage|indexedDB/i);
});

test("backend HTTP 500 failure does not display Fields extracted successfully and shows safe retry error", async () => {
  const editor = await editorSource();
  assert.match(editor, /setExtractionFailed\(true\)/);
  assert.match(editor, /setError\("We couldn't automatically extract the fields right now\. Please try again\."\)/);
  assert.doesNotMatch(editor, /localFallbackFields\(document\)|chooseBestExtractionFields\(mapped/);
  assert.match(editor, /const result = await analysis\.analyse\(file, sourceMode\)/);
  assert.doesNotMatch(editor, /setError\(.*500.*stack/i);
});

test("a valid zero-field AI result remains semantically empty instead of running regex fallback", async () => {
  const editor = await editorSource();
  assert.match(editor, /No fillable fields were identified\. Review the source or add fields manually\./);
  assert.doesNotMatch(editor, /const fallback = mapped\.length/);
});
