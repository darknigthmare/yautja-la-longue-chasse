import assert from "node:assert/strict";
import { test } from "node:test";
import { build } from "esbuild";

const compiled = await build({
  entryPoints: ["app/game/systems/worldBlueprints.ts"],
  bundle: true, write: false, platform: "node", format: "esm",
});
const world = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputFiles[0].text).toString("base64")}`);
const blueprint = () => structuredClone(world.worldBlueprintFor("jungle-vey"));
const check = (value, pattern) => assert.ok(world.validateWorldBlueprint(value).some((error) => pattern.test(error)));

test("all eight production blueprints remain valid without modifying geometry", () => {
  for (const value of Object.values(world.WORLD_BLUEPRINTS_BY_MISSION)) {
    const original = structuredClone(value);
    assert.deepEqual(world.validateWorldBlueprint(value), [], value.missionId);
    assert.deepEqual(value, original);
  }
});

test("non-finite collision geometry never passes authored-level validation", () => {
  for (const field of ["x", "y", "width", "height"]) {
    for (const value of [NaN, Infinity, -Infinity]) {
      const broken = blueprint();
      broken.platforms[0][field] = value;
      check(broken, /platform\/.*non-finite/);
    }
  }
});

test("spawn, extraction and the boss arena must fit the playable bounds", () => {
  for (const kind of ["spawn", "extraction"]) {
    const broken = blueprint();
    broken[kind].x = broken.width + 1;
    check(broken, new RegExp(`${kind} escapes`));
    broken[kind].x = NaN;
    check(broken, new RegExp(`${kind} has a non-finite`));
  }
  const broken = blueprint();
  broken.bossArena.width = broken.width;
  check(broken, /bossArena escapes/);
});

test("invalid extents and floor height cannot produce a valid level", () => {
  for (const value of [NaN, Infinity, -1, 0]) {
    const broken = blueprint();
    broken.width = value;
    check(broken, /world has/);
  }
  const broken = blueprint();
  broken.floorY = broken.height + 1;
  check(broken, /invalid dimensions or floor height/);
});

test("an explicit negative ceiling validates stacked rooms without weakening legacy bounds", () => {
  const vertical = blueprint();
  vertical.minY = -560;
  vertical.platforms.push({
    id: "vertical-test", x: 500, y: -120, width: 300, height: 24,
    material: "root", routeId: "canopy", collision: "one-way",
    noiseMultiplier: 0.6, trackPersistence: 0.2,
  });
  assert.deepEqual(world.validateWorldBlueprint(vertical), []);
  const missingExtent = structuredClone(vertical);
  delete missingExtent.minY;
  check(missingExtent, /vertical-test escapes/);
  vertical.minY = 1;
  check(vertical, /invalid dimensions or floor height/);
});

test("hazard timing and damage reject non-finite values and negative damage", () => {
  for (const field of ["periodSeconds", "activeSeconds", "phaseSeconds"]) {
    const broken = blueprint();
    const hazard = broken.hazards.find((entry) => entry.cycle);
    hazard.cycle[field] = NaN;
    check(broken, /invalid activation cycle/);
  }
  for (const damage of [-1, Infinity]) {
    const broken = blueprint();
    broken.hazards[0].damagePerSecond = damage;
    check(broken, /hazard\/.*response has/);
  }
});

test("a route cannot point to another route id instead of physical geometry", () => {
  const broken = blueprint();
  broken.routes[1].waypointIds = [broken.routes[0].id];
  check(broken, /missing waypoint ground/);
  broken.routes[1].waypointIds = [];
  check(broken, /no physical waypoints/);
});

test("climb dismounts and wind cycles are validated before simulation", () => {
  const broken = blueprint();
  broken.climbables[0].dismounts[0].y = NaN;
  check(broken, /dismount 0 has a non-finite/);
  broken.wind.gustPeriodSeconds = 0;
  check(broken, /invalid gust profile/);
});
