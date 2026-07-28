import assert from "node:assert/strict";
import { after, test } from "node:test";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { build } from "vite";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const outputDirectory = await mkdtemp(join(tmpdir(), "yautja-trophies-v15-"));

await build({
  configFile: false,
  publicDir: false,
  logLevel: "silent",
  build: {
    emptyOutDir: true,
    outDir: outputDirectory,
    ssr: resolve(projectRoot, "app/game/trophyVisualRegistry.ts"),
    rollupOptions: {
      output: { entryFileNames: "trophy-visual-registry.mjs" },
    },
  },
});

await build({
  configFile: false,
  publicDir: false,
  logLevel: "silent",
  build: {
    emptyOutDir: false,
    outDir: outputDirectory,
    ssr: resolve(projectRoot, "app/game/data.ts"),
    rollupOptions: {
      output: { entryFileNames: "game-data.mjs" },
    },
  },
});

const {
  TROPHY_WALL_MANIFEST_SUMMARY,
  TROPHY_WALL_VISUALS,
  trophyWallVisualForDefinitionId,
} = await import(
  pathToFileURL(join(outputDirectory, "trophy-visual-registry.mjs")).href
);
const { MISSIONS } = await import(
  pathToFileURL(join(outputDirectory, "game-data.mjs")).href
);

const gameClientSource = await readFile(
  resolve(projectRoot, "app/game/GameClient.tsx"),
  "utf8",
);
const globalStylesSource = await readFile(
  resolve(projectRoot, "app/globals.css"),
  "utf8",
);
const forbiddenConsumerSources = await Promise.all(
  ["HunterRigPreview.tsx", "HuntCanvas.tsx", "hunterVisuals.ts"].map(
    (fileName) =>
      readFile(resolve(projectRoot, "app/game", fileName), "utf8"),
  ),
);

after(async () => {
  await rm(outputDirectory, { force: true, recursive: true });
});

test("V15 exposes one exact wall visual for every existing playable trophy", () => {
  assert.equal(TROPHY_WALL_MANIFEST_SUMMARY.packVersion, 15);
  assert.equal(TROPHY_WALL_MANIFEST_SUMMARY.planned, 8);
  assert.equal(TROPHY_WALL_MANIFEST_SUMMARY.available, 8);
  assert.equal(TROPHY_WALL_MANIFEST_SUMMARY.complete, true);
  assert.equal(TROPHY_WALL_VISUALS.length, 8);
  assert.equal(
    new Set(TROPHY_WALL_VISUALS.map((entry) => entry.definitionId)).size,
    8,
  );
  assert.equal(
    new Set(TROPHY_WALL_VISUALS.map((entry) => entry.metadata.sha256)).size,
    8,
  );
  assert.equal(trophyWallVisualForDefinitionId("missing"), null);
  assert.equal(trophyWallVisualForDefinitionId(null), null);
});

test("V15 visual identity and copy match the authoritative mission definitions", () => {
  const missionByTrophyDefinitionId = new Map(
    MISSIONS.map((mission) => [mission.trophy.id, mission]),
  );

  for (const visual of TROPHY_WALL_VISUALS) {
    const mission = missionByTrophyDefinitionId.get(visual.definitionId);
    assert.ok(mission, `${visual.definitionId}: missing mission authority`);
    assert.equal(visual.id, mission.trophy.id);
    assert.equal(visual.name, mission.trophy.name);
    assert.equal(visual.description, mission.trophy.description);
    assert.equal(visual.targetName, mission.trophy.targetName);
    assert.equal(visual.partId, mission.trophy.partId);
    assert.equal(visual.franchiseStatus, "project-original");
    assert.deepEqual(visual.consumers, ["trophy-wall"]);
    assert.equal(
      trophyWallVisualForDefinitionId(visual.definitionId)?.runtimeUrl,
      visual.runtimeUrl,
    );
  }
});

test("GameClient resolves exact images by definitionId and retains the aligned V6 fallback", () => {
  assert.match(
    gameClientSource,
    /const exactVisual = trophyWallVisualForDefinitionId\([\s\S]*?trophy\.definitionId/,
  );
  assert.match(
    gameClientSource,
    /const trophyImageUrl =[\s\S]*?exactVisual\?\.runtimeUrl \?\?[\s\S]*?enemyGameplayVisual\?\.runtimeUrl/,
  );
  assert.match(
    gameClientSource,
    /trophyImageUrl \? \([\s\S]*?src=\{trophyImageUrl\}[\s\S]*?: \([\s\S]*?resolveV6TrophyVisualId\(trophy\)/,
  );
  assert.match(
    gameClientSource,
    /const missionTrophy =[\s\S]*?mission\?\.trophy\.id === trophy\.definitionId/,
  );
  assert.match(gameClientSource, /missionTrophy\?\.name/);
  assert.match(gameClientSource, /missionTrophy\?\.description/);
  assert.match(gameClientSource, /const fallbackTrophyName =/);
  assert.match(gameClientSource, /const fallbackTrophyDescription =/);
});

test("standalone V15 wall cutouts never enter the hunter rig or hunt canvas", () => {
  for (const visual of TROPHY_WALL_VISUALS) {
    for (const source of forbiddenConsumerSources) {
      assert.equal(source.includes(visual.runtimeUrl), false);
    }
  }
});

test("the final trophy image rule contains tall cutouts without cropping", () => {
  const trophyImageRules = [
    ...globalStylesSource.matchAll(/\.trophy-art img\s*\{([^}]+)\}/g),
  ];
  const finalRule = trophyImageRules.at(-1)?.[1];
  assert.ok(finalRule, "missing trophy image CSS rule");
  assert.match(finalRule, /display:\s*block/);
  assert.match(finalRule, /width:\s*100%/);
  assert.match(finalRule, /height:\s*142px/);
  assert.match(finalRule, /object-fit:\s*contain/);
  assert.doesNotMatch(finalRule, /(?:width|height):\s*auto/);
});
