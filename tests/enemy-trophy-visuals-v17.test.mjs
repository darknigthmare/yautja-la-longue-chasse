import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "vite";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = await mkdtemp(join(tmpdir(), "yautja-enemy-trophies-v17-"));

for (const [entry, outputName] of [
  ["app/game/enemyTrophyVisualRegistry.ts", "enemy-trophy-registry.mjs"],
  ["app/game/enemyRosterV7.ts", "enemy-roster-v7.mjs"],
  ["app/game/ecologyV8.ts", "ecology-v8.mjs"],
]) {
  await build({
    configFile: false,
    publicDir: false,
    logLevel: "silent",
    build: {
      emptyOutDir: false,
      outDir: outputDirectory,
      ssr: resolve(projectRoot, entry),
      rollupOptions: {
        output: { entryFileNames: outputName },
      },
    },
  });
}

const registry = await import(
  pathToFileURL(join(outputDirectory, "enemy-trophy-registry.mjs")).href
);
const v7 = await import(
  pathToFileURL(join(outputDirectory, "enemy-roster-v7.mjs")).href
);
const v8 = await import(
  pathToFileURL(join(outputDirectory, "ecology-v8.mjs")).href
);

const sourceSpecs = JSON.parse(
  await readFile(
    resolve(projectRoot, "art-source/v17/enemy-trophies/source-specs.json"),
    "utf8",
  ),
);
const mappings = JSON.parse(
  await readFile(
    resolve(projectRoot, "art-source/v17/enemy-trophies/enemy-mappings.json"),
    "utf8",
  ),
);
const registrySource = await readFile(
  resolve(projectRoot, "app/game/enemyTrophyVisualRegistry.ts"),
  "utf8",
);
const previewSource = await readFile(
  resolve(projectRoot, "app/game/EnemyTrophyPreview.tsx"),
  "utf8",
);
const bestiaryV7Source = await readFile(
  resolve(projectRoot, "app/game/EnemyBestiaryV7.tsx"),
  "utf8",
);
const bestiaryV8Source = await readFile(
  resolve(projectRoot, "app/game/EnemyBestiaryV8.tsx"),
  "utf8",
);
const globalStyles = await readFile(
  resolve(projectRoot, "app/globals.css"),
  "utf8",
);

after(async () => {
  await rm(outputDirectory, { force: true, recursive: true });
});

test("V17 covers every V7 archive record and every V8 ecology identity", () => {
  assert.equal(v7.ENEMY_V7_DEFINITIONS.length, 30);
  assert.equal(v8.ECOLOGY_V8_ENEMIES.length, 198);
  assert.equal(registry.ENEMY_TROPHY_MANIFEST_SUMMARY.packVersion, 17);
  assert.equal(registry.ENEMY_TROPHY_MANIFEST_SUMMARY.enemyCoverage, 228);
  assert.equal(registry.ENEMY_TROPHY_MANIFEST_SUMMARY.distinctTrophyCoverage, 203);
  assert.equal(registry.ENEMY_TROPHY_MANIFEST_SUMMARY.planned, 203);
  assert.equal(registry.ENEMY_TROPHY_MANIFEST_SUMMARY.available, 203);
  assert.equal(registry.ENEMY_TROPHY_MANIFEST_SUMMARY.complete, true);
  assert.equal(registry.ENEMY_TROPHY_VISUALS.length, 203);
  assert.equal(mappings.mappings.length, 228);
  assert.equal(new Set(mappings.mappings.map((entry) => entry.enemyId)).size, 228);
});

test("every potential trophy retains the exact informational roster label", () => {
  for (const enemy of v7.ENEMY_V7_DEFINITIONS) {
    const visual = registry.enemyTrophyVisualForEnemyId(
      enemy.id,
      "enemy-bestiary-v7",
    );
    assert.ok(visual, `${enemy.id}: missing V7 archive visual`);
    assert.equal(visual.name, enemy.trophy);
    assert.ok(visual.enemyIds.includes(enemy.id));
  }

  for (const enemy of v8.ECOLOGY_V8_ENEMIES) {
    const visual = registry.enemyTrophyVisualForEnemyId(
      enemy.id,
      "enemy-bestiary-v8",
    );
    assert.ok(visual, `${enemy.id}: missing V8 ecology visual`);
    assert.equal(visual.name, enemy.trophy);
    assert.ok(visual.enemyIds.includes(enemy.id));
  }

  assert.equal(registry.enemyTrophyVisualForEnemyId("missing"), null);
  assert.equal(registry.enemyTrophyVisualForEnemyId(null), null);
});

test("shared V7/V8 labels reuse one deliberate asset without collapsing enemy mappings", () => {
  const shared = registry.ENEMY_TROPHY_VISUALS.filter(
    (visual) =>
      visual.consumers.includes("enemy-bestiary-v7") &&
      visual.consumers.includes("enemy-bestiary-v8"),
  );
  assert.equal(shared.length, 25);
  assert.ok(shared.every((visual) => visual.enemyIds.length === 2));
  assert.equal(
    registry.ENEMY_TROPHY_VISUALS.filter((visual) =>
      visual.consumers.includes("enemy-bestiary-v7"),
    ).length,
    30,
  );
  assert.equal(
    registry.ENEMY_TROPHY_VISUALS.filter((visual) =>
      visual.consumers.includes("enemy-bestiary-v8"),
    ).length,
    198,
  );
});

test("potential bestiary assets never masquerade as formal TrophyDefinition claims", () => {
  assert.equal(
    sourceSpecs.entries.some((entry) =>
      Object.hasOwn(entry, "definitionId"),
    ),
    false,
  );
  assert.doesNotMatch(registrySource, /TrophyDefinition|definitionId/);
  assert.match(registrySource, /visualsByEnemyId/);
  assert.match(registrySource, /enemyTrophyVisualForEnemyId/);
  assert.match(previewSource, /Prise potentielle/);
  assert.match(bestiaryV7Source, /consumer="enemy-bestiary-v7"/);
  assert.match(bestiaryV8Source, /consumer="enemy-bestiary-v8"/);
});

test("bestiary trophy cards preserve complete transparent cutouts", () => {
  assert.match(globalStyles, /\.enemy-trophy-preview-art img\s*\{/);
  assert.match(globalStyles, /object-fit:\s*contain/);
  assert.match(globalStyles, /\.enemy-trophy-preview\s*\{/);
});
