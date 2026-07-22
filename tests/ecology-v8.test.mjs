import assert from "node:assert/strict";
import test from "node:test";

import {
  ECOLOGY_V8_CATEGORIES,
  ECOLOGY_V8_ENEMIES,
  ECOLOGY_V8_ENEMY_BY_ID,
  ECOLOGY_V8_PLANET_IDS,
  ECOLOGY_V8_PLANETS,
  ecologyV8EnemyForId,
  ecologyV8ForMission,
  ecologyV8ForPlanet,
} from "../app/game/ecologyV8.ts";

const EXPECTED_MISSIONS = [
  "jungle-vey",
  "ice-cryostalker",
  "volcano-bad-blood",
  "swamp-hydra",
  "desert-sandmaw",
  "ocean-leviathan",
  "fungal-hivemind",
  "ruins-ancient-guardian",
];

test("V8 declares eight distinct planets and mission ecology pools", () => {
  assert.equal(ECOLOGY_V8_PLANETS.length, 8);
  assert.equal(new Set(ECOLOGY_V8_PLANET_IDS).size, 8);
  assert.deepEqual(
    ECOLOGY_V8_PLANETS.map(({ missionId }) => missionId),
    EXPECTED_MISSIONS,
  );
  assert.deepEqual(
    ECOLOGY_V8_PLANETS.slice(0, 3).map(({ name }) => name),
    ["Oseris-IV", "Nivalis-K", "Cinder-12"],
  );

  for (const planet of ECOLOGY_V8_PLANETS) {
    assert.ok(planet.biomeLabel.length >= 8, `${planet.id}: biome label`);
    assert.ok(planet.description.length >= 50, `${planet.id}: description`);
    assert.equal(ecologyV8ForMission(planet.missionId).length, 30);
  }
});

test("each planet contains exactly 24 endemic and six common enemies", () => {
  const expectedCommonIds = ECOLOGY_V8_PLANETS[0].commonEnemyIds;
  assert.equal(expectedCommonIds.length, 6);
  assert.equal(new Set(expectedCommonIds).size, 6);

  for (const planet of ECOLOGY_V8_PLANETS) {
    assert.equal(planet.endemicEnemyIds.length, 24, `${planet.id}: endemic`);
    assert.equal(planet.commonEnemyIds.length, 6, `${planet.id}: common`);
    assert.equal(planet.enemyIds.length, 30, `${planet.id}: total`);
    assert.equal(new Set(planet.enemyIds).size, 30, `${planet.id}: unique pool`);
    assert.deepEqual(planet.commonEnemyIds, expectedCommonIds);

    const enemies = ecologyV8ForPlanet(planet.id);
    assert.deepEqual(
      enemies.map(({ id }) => id),
      planet.enemyIds,
      `${planet.id}: accessor preserves roster order`,
    );

    const categories = new Set(enemies.map(({ category }) => category));
    assert.deepEqual(
      [...categories].sort(),
      [...ECOLOGY_V8_CATEGORIES].sort(),
      `${planet.id}: all enemy families represented`,
    );

    for (const enemyId of planet.endemicEnemyIds) {
      const enemy = ECOLOGY_V8_ENEMY_BY_ID[enemyId];
      assert.ok(enemy, `${planet.id}: ${enemyId} resolves`);
      assert.equal(enemy.distribution, "endemic");
      assert.equal(enemy.homePlanetId, planet.id);
      assert.deepEqual(enemy.planetIds, [planet.id]);
      assert.match(enemy.id, new RegExp(`^${planet.id}--`));
      assert.match(enemy.spriteId, new RegExp(`^v8/${planet.id}/`));
    }
  }
});

test("common enemies share one identity and one sprite across all planets", () => {
  const commonEnemies = ECOLOGY_V8_ENEMIES.filter(
    ({ distribution }) => distribution === "common",
  );
  assert.equal(commonEnemies.length, 6);

  for (const enemy of commonEnemies) {
    assert.match(enemy.id, /^common--/);
    assert.match(enemy.spriteId, /^v8\/common\//);
    assert.equal(enemy.homePlanetId, null);
    assert.deepEqual(enemy.planetIds, ECOLOGY_V8_PLANET_IDS);
    for (const planet of ECOLOGY_V8_PLANETS) {
      assert.ok(planet.commonEnemyIds.includes(enemy.id));
    }
  }
});

test("the global ecology registry exposes 198 production-ready unique species", () => {
  assert.equal(ECOLOGY_V8_ENEMIES.length, 24 * 8 + 6);
  assert.equal(Object.keys(ECOLOGY_V8_ENEMY_BY_ID).length, 198);
  assert.equal(new Set(ECOLOGY_V8_ENEMIES.map(({ id }) => id)).size, 198);
  assert.equal(
    new Set(ECOLOGY_V8_ENEMIES.map(({ spriteId }) => spriteId)).size,
    198,
  );
  assert.equal(
    new Set(ECOLOGY_V8_ENEMIES.map(({ sheetPath }) => sheetPath)).size,
    198,
  );

  for (const enemy of ECOLOGY_V8_ENEMIES) {
    assert.equal(ecologyV8EnemyForId(enemy.id), enemy);
    assert.ok(enemy.name.length >= 6, `${enemy.id}: French display name`);
    assert.ok(enemy.role.length >= 8, `${enemy.id}: role`);
    assert.ok(enemy.behavior.length >= 45, `${enemy.id}: behavior`);
    assert.ok(enemy.trophy.length >= 6, `${enemy.id}: trophy`);
    assert.ok(ECOLOGY_V8_CATEGORIES.includes(enemy.category));
    assert.ok(enemy.threat >= 1 && enemy.threat <= 4);
    assert.match(enemy.spriteId, /^v8\/(?:common|[a-z0-9-]+)\/[a-z0-9-]+$/);
    assert.equal(
      enemy.sheetPath,
      `/game/sprites/v8/ecology/${enemy.spriteId.slice(3)}-sheet.png`,
    );
  }
});

