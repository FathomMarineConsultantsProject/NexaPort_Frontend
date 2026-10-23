import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

test("company directory uses the shared list toggle value to render its table", async () => {
  const [page, toggle] = await Promise.all([
    readFile(new URL("../src/pages/MaritimeDirectoryPage.jsx", import.meta.url), "utf8"),
    readFile(new URL("../src/components/common/ViewToggle.jsx", import.meta.url), "utf8"),
  ]);
  assert.match(toggle, /onChange\("list"\)/);
  assert.match(page, /value === "list" \? next\.set\("view", "list"\)/);
  assert.match(page, /viewMode === "grid" \?/);
});
