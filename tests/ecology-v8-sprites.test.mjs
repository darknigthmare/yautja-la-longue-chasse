import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

import {
  ECOLOGY_V8_ENEMIES,
  ECOLOGY_V8_PLANETS,
} from "../app/game/ecologyV8.ts";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("V8 resolves every ecology ID to one valid and unique six-frame RGBA strip", async () => {
  assert.equal(ECOLOGY_V8_PLANETS.length, 8);
  assert.equal(ECOLOGY_V8_ENEMIES.length, 198);
  assert.equal(
    ECOLOGY_V8_ENEMIES.filter(({ distribution }) => distribution === "endemic").length,
    192,
  );
  assert.equal(
    ECOLOGY_V8_ENEMIES.filter(({ distribution }) => distribution === "common").length,
    6,
  );
  for (const planet of ECOLOGY_V8_PLANETS) {
    assert.equal(planet.endemicEnemyIds.length, 24, planet.id);
    assert.equal(planet.commonEnemyIds.length, 6, planet.id);
    assert.equal(planet.enemyIds.length, 30, planet.id);
  }

  const manifest = JSON.parse(
    await readFile(join(projectRoot, "art-source/v8/ecology/manifest.json"), "utf8"),
  );
  assert.equal(manifest.counts.planets, 8);
  assert.equal(manifest.counts.assignments, 240);
  assert.equal(manifest.counts.endemicDefinitions, 192);
  assert.equal(manifest.counts.sharedDefinitions, 6);
  assert.equal(manifest.counts.physicalSheets, 198);
  assert.equal(manifest.counts.explicitSupplementalSheets, 65);
  assert.equal(
    manifest.genericFallbackSpriteIds.length,
    manifest.counts.genericFallbackSheets,
  );
  assert.equal(manifest.counts.genericFallbackSheets, 0);
  assert.equal(manifest.entries.length, 198);
  const manifestById = new Map(manifest.entries.map((entry) => [entry.spriteId, entry]));
  const supplementalLots = await Promise.all(
    ["a", "b", "c"].map(async (lot) =>
      JSON.parse(
        await readFile(
          join(projectRoot, `art-source/v8/ecology/supplemental/${lot}/manifest.json`),
          "utf8",
        ),
      ),
    ),
  );
  const supplementalEntries = supplementalLots.flatMap(({ entries }) => entries);
  assert.equal(supplementalEntries.length, 65);
  assert.equal(new Set(supplementalEntries.map(({ spriteId }) => spriteId)).size, 65);
  for (const supplemental of supplementalEntries) {
    const finalEntry = manifestById.get(supplemental.spriteId);
    assert.ok(finalEntry, `${supplemental.spriteId}: supplemental ID exists`);
    assert.equal(
      finalEntry.sourceMatch,
      "explicit-supplemental",
      `${supplemental.spriteId}: no semantic fallback`,
    );
    assert.equal(finalEntry.anatomy, supplemental.anatomy);
  }

  const exactSlugToken = (spriteId, token) =>
    spriteId.split("/").at(-1).split("-").includes(token);

  const hashes = new Set();
  for (const enemy of ECOLOGY_V8_ENEMIES) {
    const manifestEntry = manifestById.get(enemy.spriteId);
    assert.ok(manifestEntry, `${enemy.spriteId}: manifest provenance`);
    assert.equal(manifestEntry.sheet, enemy.sheetPath, `${enemy.spriteId}: exact runtime path`);
    if (enemy.category === "humanoid") {
      assert.equal(manifestEntry.anatomyFamily, "humanoid", `${enemy.spriteId}: human anatomy`);
      if (manifestEntry.sourceMatch !== "explicit-supplemental") {
        assert.match(manifestEntry.source, /^v7\/(colonial|owlf|frontier|corporate)/);
      }
    }
    if (enemy.category === "bad-blood") {
      assert.equal(manifestEntry.anatomyFamily, "bad-blood", `${enemy.spriteId}: Yautja anatomy`);
      if (manifestEntry.sourceMatch !== "explicit-supplemental") {
        assert.match(manifestEntry.source, /^v7\/bad-blood-/);
      }
    }
    if (enemy.category === "flora") {
      assert.equal(manifestEntry.anatomyFamily, "flora", `${enemy.spriteId}: flora anatomy`);
    }
    if (enemy.category === "fauna") {
      assert.equal(manifestEntry.anatomyFamily, "fauna", `${enemy.spriteId}: fauna anatomy`);
    }
    if (exactSlugToken(enemy.spriteId, "xeno")) {
      assert.equal(manifestEntry.anatomyFamily, "xeno", `${enemy.spriteId}: xeno anatomy`);
      if (manifestEntry.sourceMatch !== "explicit-supplemental") {
        assert.match(manifestEntry.source, /^v7\/xeno-/);
      }
    }
    if (exactSlugToken(enemy.spriteId, "synth")) {
      assert.equal(manifestEntry.anatomyFamily, "synth", `${enemy.spriteId}: synth anatomy`);
      if (manifestEntry.sourceMatch !== "explicit-supplemental") {
        assert.equal(manifestEntry.source, "v7/weyland-synth-sheet.png");
      }
    }

    const imagePath = join(projectRoot, "public", enemy.sheetPath.slice(1));
    const file = await readFile(imagePath);
    const hash = createHash("sha256").update(file).digest("hex");
    assert.equal(hashes.has(hash), false, `${enemy.spriteId}: duplicate physical strip`);
    hashes.add(hash);

    const source = sharp(file).ensureAlpha();
    const metadata = await source.metadata();
    assert.deepEqual(
      [metadata.width, metadata.height, metadata.hasAlpha],
      [1536, 192, true],
      `${enemy.spriteId}: RGBA 6 x 256 strip`,
    );
    const { data, info } = await source.raw().toBuffer({ resolveWithObject: true });
    const alphaAt = (x, y) => data[(y * info.width + x) * info.channels + 3];
    for (const [x, y] of [
      [0, 0],
      [info.width - 1, 0],
      [0, info.height - 1],
      [info.width - 1, info.height - 1],
    ]) {
      assert.equal(alphaAt(x, y), 0, `${enemy.spriteId}: transparent corner`);
    }
    const populatedByFrame = [];
    for (let frame = 0; frame < 6; frame += 1) {
      let populated = 0;
      let opaque = 0;
      for (let y = 0; y < 192; y += 1) {
        for (let x = frame * 256; x < (frame + 1) * 256; x += 1) {
          const alpha = alphaAt(x, y);
          if (alpha >= 16) populated += 1;
          if (alpha === 255) opaque += 1;
        }
      }
      assert.ok(populated >= 250, `${enemy.spriteId} frame ${frame}: populated`);
      assert.ok(opaque >= 50, `${enemy.spriteId} frame ${frame}: opaque subject`);
      populatedByFrame.push(populated);
    }
    const medianLivePopulation = populatedByFrame
      .slice(0, 5)
      .sort((left, right) => left - right)[2];
    assert.ok(
      populatedByFrame[5] / medianLivePopulation >= 0.2,
      `${enemy.spriteId}: death pose retains at least 20% of median live-pose pixels`,
    );
  }
  assert.equal(hashes.size, 198);

  const targetedSources = Object.fromEntries(
    [
      "v8/nivalis-k/xenobiologist-field",
      "v8/mycora-v/sterilization-mech",
      "v8/naraka-delta/drowned-synth",
      "v8/serekh-9/desert-temple-guardian",
      "v8/pelagos-m/salvage-synth",
    ].map((spriteId) => [spriteId, manifestById.get(spriteId)]),
  );
  assert.equal(targetedSources["v8/nivalis-k/xenobiologist-field"].anatomyFamily, "humanoid");
  assert.equal(targetedSources["v8/mycora-v/sterilization-mech"].anatomyFamily, "mech");
  for (const entry of Object.values(targetedSources)) {
    assert.equal(entry.sourceMatch, "explicit-supplemental");
    assert.match(entry.source, /art-source\/v8\/ecology\/supplemental\//);
  }
});
