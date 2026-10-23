import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("directory list views give stored NexaPort IDs a separate column", async () => {
  for (const name of ["MaritimeDirectoryPage", "InspectorSearch", "AccreditedInspectorDirectory", "AppointedSurveyorDirectory"]) {
    const source = await readFile(new URL(`../src/pages/${name}.jsx`, import.meta.url), "utf8");
    assert.match(source, /<th>NexaPort ID<\/th>/, `${name} should name its ID column`);
    assert.doesNotMatch(source, /<strong>\{(?:row\.company_name|item\.name|inspector\.full_name)/, `${name} should use regular-weight names`);
  }
});
