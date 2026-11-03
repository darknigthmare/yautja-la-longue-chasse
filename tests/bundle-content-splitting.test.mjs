import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { test } from "node:test";

const viteConfigUrl = new URL("../vite.config.ts", import.meta.url);

test("large authored catalogues are isolated through Rolldown content groups", async () => {
  const source = await readFile(viteConfigUrl, "utf8");

  for (const chunkName of [
    "environment-content",
    "hunter-catalogue",
    "game-content",
  ]) {
    assert.match(source, new RegExp(`name: "${chunkName}"`));
  }
  assert.match(source, /environmentProp\(\?:RuntimeData\|AvailabilityData\|Catalogue\|Registry\)/);
  assert.match(source, /catalogueRoster\|catalogueAppearance\|hunterLore/);
  assert.match(source, /data\|ecologyV8\|enemyRosterV7\|save/);
  assert.equal(source.match(/entriesAware: true/g)?.length, 3);
  assert.doesNotMatch(source, /includeDependenciesRecursively: false/);
});
