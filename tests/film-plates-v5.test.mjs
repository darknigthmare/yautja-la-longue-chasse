import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import path from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";

import {
  HUNTER_FILM_PLATE_ROOT,
  HUNTER_FILM_PRESETS,
} from "../app/game/hunterLore.ts";

const projectRoot = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  "..",
);
const plateRoot = path.join(
  projectRoot,
  "public",
  HUNTER_FILM_PLATE_ROOT.replace(/^\//, ""),
);
const manifestPath = path.join(plateRoot, "manifest.json");
const promptPackPath = path.join(
  projectRoot,
  "art-source",
  "v5",
  "film-plates",
  "openai-film-plate-prompts.jsonl",
);

function pngMetadata(buffer) {
  assert.deepEqual(
    [...buffer.subarray(0, 8)],
    [137, 80, 78, 71, 13, 10, 26, 10],
    "invalid PNG signature",
  );
  assert.equal(buffer.subarray(12, 16).toString("ascii"), "IHDR");
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    colorType: buffer[25],
    sha256: createHash("sha256").update(buffer).digest("hex"),
  };
}

test("V5 film archive has one distinct transparent plate per hunter", async () => {
  const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.generator, "OpenAI ImageGen");
  assert.equal(manifest.plateRoot, HUNTER_FILM_PLATE_ROOT);
  assert.equal(manifest.coverage.hunters, HUNTER_FILM_PRESETS.length);
  assert.equal(manifest.coverage.prompts, HUNTER_FILM_PRESETS.length);
  assert.equal(manifest.coverage.complete, true);
  assert.equal(manifest.entries.length, HUNTER_FILM_PRESETS.length);

  const manifestById = new Map(
    manifest.entries.map((entry) => [entry.id, entry]),
  );
  assert.equal(manifestById.size, HUNTER_FILM_PRESETS.length);
  assert.equal(
    new Set(manifest.entries.map((entry) => entry.metadata.sha256)).size,
    HUNTER_FILM_PRESETS.length,
    "every hunter must have a distinct runtime plate",
  );
  assert.equal(
    new Set(manifest.entries.map((entry) => entry.sourceMetadata.sha256)).size,
    HUNTER_FILM_PRESETS.length,
    "every hunter must have a distinct OpenAI chroma source",
  );

  for (const preset of HUNTER_FILM_PRESETS) {
    const entry = manifestById.get(preset.id);
    assert.ok(entry, `${preset.id}: manifest entry missing`);
    assert.equal(
      entry.runtimeUrl,
      `${HUNTER_FILM_PLATE_ROOT}/${preset.id}.png`,
    );
    assert.equal(entry.referenceUrls.length >= 2, true);
    const platePath = path.join(plateRoot, `${preset.id}.png`);
    const buffer = await readFile(platePath);
    assert.ok(buffer.length > 20_000, `${preset.id}: plate is suspiciously small`);
    const metadata = pngMetadata(buffer);
    assert.ok(metadata.width >= 512, `${preset.id}: width`);
    assert.ok(metadata.height >= 512, `${preset.id}: height`);
    assert.ok(
      metadata.colorType === 4 || metadata.colorType === 6,
      `${preset.id}: alpha channel missing`,
    );
    assert.equal(metadata.sha256, entry.metadata.sha256);
    assert.equal(metadata.width, entry.metadata.width);
    assert.equal(metadata.height, entry.metadata.height);
  }
});

test("V5 film archive keeps one detailed reproducible prompt per hunter", async () => {
  const entries = (await readFile(promptPackPath, "utf8"))
    .trim()
    .split(/\r?\n/)
    .map((line) => JSON.parse(line));

  assert.equal(entries.length, HUNTER_FILM_PRESETS.length);
  assert.equal(
    new Set(entries.map((entry) => entry.id)).size,
    HUNTER_FILM_PRESETS.length,
  );
  assert.equal(
    new Set(entries.map((entry) => entry.prompt)).size,
    HUNTER_FILM_PRESETS.length,
  );

  for (const entry of entries) {
    assert.ok(
      entry.prompt.length >= 700,
      `${entry.id}: prompt must remain individually detailed`,
    );
    assert.match(entry.prompt, /#00ff00/i, `${entry.id}: chroma key`);
    assert.equal(
      entry.referenceUrls.length >= 2,
      true,
      `${entry.id}: references`,
    );
  }
});
