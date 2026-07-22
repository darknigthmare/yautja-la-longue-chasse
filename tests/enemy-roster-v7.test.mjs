import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import test from "node:test";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

import { MISSIONS } from "../app/game/data.ts";
import {
  ENEMY_V7_CATEGORIES,
  ENEMY_V7_DEFINITIONS,
  ENEMY_V7_FRAME_LABELS,
  ENEMY_V7_IDS_BY_WAVE,
  enemyV7ForId,
  enemyV7ForWave,
  enemyV7IdsForMission,
} from "../app/game/enemyRosterV7.ts";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("V7 exposes exactly 30 unique enemies across all requested families", () => {
  assert.equal(ENEMY_V7_DEFINITIONS.length, 30);
  assert.equal(new Set(ENEMY_V7_DEFINITIONS.map(({ id }) => id)).size, 30);
  assert.equal(ENEMY_V7_FRAME_LABELS.length, 6);

  const counts = Object.fromEntries(
    ENEMY_V7_CATEGORIES.map((category) => [
      category,
      ENEMY_V7_DEFINITIONS.filter((enemy) => enemy.category === category).length,
    ]),
  );
  assert.deepEqual(counts, {
    fauna: 10,
    flora: 6,
    humanoid: 5,
    "bad-blood": 5,
    other: 4,
  });

  for (const enemy of ENEMY_V7_DEFINITIONS) {
    assert.equal(enemyV7ForId(enemy.id), enemy, enemy.id);
    assert.ok(enemy.name.length >= 6, `${enemy.id}: readable name`);
    assert.ok(enemy.behavior.length >= 24, `${enemy.id}: behavior documented`);
    assert.ok(enemy.trophy.length >= 5, `${enemy.id}: trophy documented`);
    assert.equal(enemy.sourceUrls.length, 2, `${enemy.id}: two references`);
    for (const sourceUrl of enemy.sourceUrls) {
      assert.match(sourceUrl, /^https:\/\//, `${enemy.id}: absolute source`);
    }
  }
});

test("the original nine gameplay waves preserve their 30-enemy V7 archive", () => {
  const assignedIds = Object.values(ENEMY_V7_IDS_BY_WAVE).flat();
  assert.equal(assignedIds.length, 30);
  assert.equal(new Set(assignedIds).size, 30);
  assert.deepEqual(
    [...assignedIds].sort(),
    ENEMY_V7_DEFINITIONS.map(({ id }) => id).sort(),
  );

  const archivedMissions = MISSIONS.filter(
    (mission) => enemyV7IdsForMission(mission.id).length > 0,
  );
  assert.equal(archivedMissions.length, 3);
  for (const mission of archivedMissions) {
    const missionIds = enemyV7IdsForMission(mission.id);
    const expectedCount = mission.enemyWaves.reduce((sum, wave) => sum + wave.count, 0);
    assert.equal(missionIds.length, expectedCount, mission.id);
    for (const wave of mission.enemyWaves) {
      const assignedWave = ENEMY_V7_IDS_BY_WAVE[wave.id];
      assert.ok(assignedWave, `${wave.id}: V7 roster`);
      assert.equal(assignedWave.length, wave.count, `${wave.id}: every slot is unique`);
      assignedWave.forEach((id, index) => {
        assert.equal(enemyV7ForWave(wave.id, index)?.id, id);
      });
    }
  }
});

test("every enemy owns a production RGBA strip with six populated frames", async () => {
  const hashes = new Set();
  for (const enemy of ENEMY_V7_DEFINITIONS) {
    const imagePath = join(projectRoot, "public", enemy.sheetPath.slice(1));
    const file = await readFile(imagePath);
    const hash = createHash("sha256").update(file).digest("hex");
    assert.equal(hashes.has(hash), false, `${enemy.id}: duplicate strip`);
    hashes.add(hash);

    const source = sharp(file).ensureAlpha();
    const metadata = await source.metadata();
    assert.deepEqual(
      [metadata.width, metadata.height, metadata.hasAlpha],
      [1536, 192, true],
      `${enemy.id}: 6 × 256 production strip`,
    );

    const { data, info } = await source.raw().toBuffer({ resolveWithObject: true });
    const alphaAt = (x, y) => data[(y * info.width + x) * info.channels + 3];
    for (const [x, y] of [
      [0, 0],
      [info.width - 1, 0],
      [0, info.height - 1],
      [info.width - 1, info.height - 1],
    ]) {
      assert.ok(alphaAt(x, y) <= 2, `${enemy.id}: transparent corner ${x},${y}`);
    }

    for (let frame = 0; frame < 6; frame += 1) {
      const stats = await sharp(file)
        .extract({ left: frame * 256, top: 0, width: 256, height: 192 })
        .ensureAlpha()
        .stats();
      const alpha = stats.channels[3];
      assert.equal(alpha.min, 0, `${enemy.id} frame ${frame}: transparent padding`);
      assert.equal(alpha.max, 255, `${enemy.id} frame ${frame}: visible subject`);
      assert.ok(
        alpha.mean > 1 && alpha.mean < 190,
        `${enemy.id} frame ${frame}: usable alpha coverage ${alpha.mean}`,
      );
    }
  }
  assert.equal(hashes.size, 30);
});

test("the V7 archive remains intact while V8 drives the bestiary and renderer", async () => {
  const [client, archivedBestiary, planetaryBestiary, canvas, css] = await Promise.all([
    readFile(join(projectRoot, "app/game/GameClient.tsx"), "utf8"),
    readFile(join(projectRoot, "app/game/EnemyBestiaryV7.tsx"), "utf8"),
    readFile(join(projectRoot, "app/game/EnemyBestiaryV8.tsx"), "utf8"),
    readFile(join(projectRoot, "app/game/HuntCanvas.tsx"), "utf8"),
    readFile(join(projectRoot, "app/globals.css"), "utf8"),
  ]);
  assert.match(client, /<EnemyBestiaryV8 \/>/);
  assert.match(archivedBestiary, /ENEMY_V7_FRAME_LABELS/);
  assert.match(planetaryBestiary, /ECOLOGY_V8_PLANETS/);
  assert.match(planetaryBestiary, /enemy-sprite-preview-track/);
  assert.match(canvas, /enemyV7ForWave\(wave\.id, index\)/);
  assert.match(canvas, /ecologyEncounterEnemyAt/);
  assert.match(canvas, /assets\.enemyV8/);
  assert.match(canvas, /drawEnemySheetFrame/);
  assert.match(canvas, /enemyAnimationFrame/);
  assert.match(canvas, /enemy\.deathAnimation/);
  assert.match(canvas, /ecologyProfile\?\.mobility/);
  assert.match(canvas, /ecologyProfile\?\.attackStyle/);
  assert.match(canvas, /plannedRegularSpawns/);
  assert.match(canvas, /if \(!assetsLoaded\)/);
  assert.match(canvas, /const ecologyRunSeed = encounterRun/);
  assert.match(css, /@keyframes enemy-sprite-sheet-cycle/);
  assert.match(css, /grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
});
