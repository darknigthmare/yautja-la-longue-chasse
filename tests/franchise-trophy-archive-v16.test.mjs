import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "vite";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = await mkdtemp(join(tmpdir(), "yautja-franchise-trophies-v16-"));

await build({
  configFile: false,
  publicDir: false,
  logLevel: "silent",
  build: {
    emptyOutDir: true,
    outDir: outputDirectory,
    ssr: resolve(projectRoot, "app/game/franchiseTrophyRegistry.ts"),
    rollupOptions: {
      output: { entryFileNames: "franchise-trophy-registry.mjs" },
    },
  },
});

const registry = await import(
  pathToFileURL(join(outputDirectory, "franchise-trophy-registry.mjs")).href
);
const census = JSON.parse(
  await readFile(
    resolve(
      projectRoot,
      "art-source/v16/franchise-trophies/media-census.json",
    ),
    "utf8",
  ),
);
const sourceSpecs = JSON.parse(
  await readFile(
    resolve(projectRoot, "art-source/v16/franchise-trophies/source-specs.json"),
    "utf8",
  ),
);
const prompts = (
  await readFile(
    resolve(
      projectRoot,
      "art-source/v16/franchise-trophies/openai-franchise-trophy-prompts.jsonl",
    ),
    "utf8",
  )
)
  .trim()
  .split(/\r?\n/)
  .map((line) => JSON.parse(line));
const gameClientSource = await readFile(
  resolve(projectRoot, "app/game/GameClient.tsx"),
  "utf8",
);
const globalStyles = await readFile(
  resolve(projectRoot, "app/globals.css"),
  "utf8",
);

after(async () => {
  await rm(outputDirectory, { force: true, recursive: true });
});

test("V16 exposes the complete distinct-design media census", () => {
  assert.equal(census.physicalEntries.length, 92);
  assert.equal(census.censusOnlyEntries.length, 14);
  assert.equal(sourceSpecs.entries.length, 92);
  assert.equal(prompts.length, 86);
  assert.equal(registry.FRANCHISE_TROPHY_MANIFEST_SUMMARY.packVersion, 16);
  assert.equal(registry.FRANCHISE_TROPHY_MANIFEST_SUMMARY.planned, 92);
  assert.equal(registry.FRANCHISE_TROPHY_MANIFEST_SUMMARY.available, 92);
  assert.equal(registry.FRANCHISE_TROPHY_MANIFEST_SUMMARY.complete, true);
  assert.equal(registry.FRANCHISE_TROPHY_ARCHIVE_ASSETS.length, 92);
});

test("the census spans screen, games, comics, crossovers and merchandise", () => {
  const media = new Set(
    sourceSpecs.entries.flatMap((entry) =>
      entry.appearances.map((appearance) => appearance.medium),
    ),
  );
  assert.deepEqual(
    [...media].sort(),
    [
      "animation",
      "comic",
      "film",
      "licensed-crossover",
      "merchandise",
      "video-game",
    ],
  );
  assert.ok(
    sourceSpecs.entries.some((entry) =>
      entry.appearances.some((appearance) =>
        /community-documented-cosmetic/.test(appearance.status),
      ),
    ),
  );
  assert.ok(
    census.censusOnlyEntries.some(
      (entry) => entry.status === "platform-achievement",
    ),
  );
  assert.ok(
    census.censusOnlyEntries.some(
      (entry) => entry.status === "licensed-prose-textual-only",
    ),
  );
});

test("unnamed species and continuity are never inflated into screen canon", () => {
  for (const entry of sourceSpecs.entries) {
    assert.ok(entry.visualAnchor);
    assert.ok(entry.guardrail);
    assert.ok(entry.appearances.length >= 1);
    assert.ok(
      entry.appearances.every((appearance) =>
        /^https?:\/\//.test(appearance.sourcePage),
      ),
    );
  }
  assert.equal(/Archive canonique|Référence écran|ARCHIVE V14/.test(gameClientSource), false);
  assert.match(gameClientSource, /franchiseTrophyContinuityLabel/);
  assert.match(gameClientSource, /franchiseTrophyEvidenceLabel/);
  assert.match(gameClientSource, /Source de l’œuvre/);
});

test("formal franchise archive entries remain non-playable and separate from V15", () => {
  assert.match(gameClientSource, /ARCHIVE V16 · NON JOUABLE/);
  assert.match(gameClientSource, /FRANCHISE_TROPHY_ARCHIVE_ASSETS\.map/);
  assert.match(
    gameClientSource,
    /<details className="franchise-trophy-archive">/,
  );
  assert.match(gameClientSource, /FRANCHISE_TROPHY_MANIFEST_SUMMARY\.planned/);
  assert.match(
    globalStyles,
    /\.franchise-trophy-archive\s*\{[\s\S]*?grid-column:\s*1\s*\/\s*-1/,
  );
  assert.match(globalStyles, /\.franchise-trophy-archive-grid\s*\{/);
  assert.match(gameClientSource, /trophyWallVisualForDefinitionId/);
  assert.equal(
    sourceSpecs.entries.some((entry) => Object.hasOwn(entry, "definitionId")),
    false,
  );
});
