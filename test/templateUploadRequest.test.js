import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const source = (file) => readFile(new URL(file, import.meta.url), "utf8");

test("template analysis sends one multipart document request", async () => {
  const api = await source("../src/api/templateApi.js"); const hook = await source("../src/hooks/useTemplateAnalysis.js");
  assert.match(api, /new FormData\(\)/); assert.match(api, /form\.append\("document", file\)/); assert.match(api, /form\.append\("sourceType", sourceType\)/);
  assert.equal((hook.match(/analyseTemplateSource\(/g) || []).length, 1);
  assert.doesNotMatch(hook, /planSourceChunks|for \(let index|mode: "map"/);
  assert.match(hook, /inFlightRef\.current/);
});

test("authorization remains supplied by the shared authenticated client", async () => {
  const client = await source("../src/api/axiosClient.js");
  assert.match(client, /config\.headers\.Authorization = `Bearer \$\{token\}`/);
});
