import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { runInNewContext } from "node:vm";
import { test } from "node:test";
import { build } from "esbuild";

// V157: the stacked layers of a hunting world (template, room features,
// exploration overlays, Oseris pilot) must not produce double ledges, ledges
// without head room, ledges reachable only by falling, or cover inside a
// permanent damaging hazard — in every exploration state.
const bundle = await build({
  stdin: {
    contents: 'export * from "./app/game/systems/expansionExplorationRegions"; export * from "./app/game/systems/explorationProgress"; export * from "./app/game/systems/explorationRegions"; export * from "./app/game/systems/worldBlueprints"; export * from "./app/game/systems/huntLevelCoherenceV157";',
    resolveDir: process.cwd(), loader: "ts",
  },
  bundle: true, write: false, format: "cjs", platform: "node", jsx: "automatic", external: ["react", "react-dom"],
});
const compiled = { exports: {} };
runInNewContext(bundle.outputFiles[0].text, { module: compiled, exports: compiled.exports, require: createRequire(import.meta.url) });
const api = compiled.exports;
const specs = Object.values(api.EXPANSION_EXPLORATION_SPECS);
const missionIds = ["jungle-vey", "ice-cryostalker", ...specs.map(spec => spec.missionId)];
const complete = api.mergeExplorationProgress(api.defaultExplorationProgress(), {
  abilityIds: ["aerial-boost", ...specs.map(spec => spec.abilityId)],
  openedGateIds: ["jungle-resonance-seal", "jungle-canopy-hatch", "ice-mine-relay", "ice-return-hatch", ...specs.flatMap(spec => [spec.gateId, spec.shortcutId])],
});
const states = [["default", api.defaultExplorationProgress()], ["complete", complete]];
const overlap = (a, b) => Math.max(0, Math.min(a.x + a.width, b.x + b.width) - Math.max(a.x, b.x));
const intersects = (a, b) => overlap(a, b) > 0 && Math.min(a.y + a.height, b.y + b.height) > Math.max(a.y, b.y);
// Module and relic plinths are pedestals deliberately set 12 px over a floor.
const pedestal = id => /-(module|relic)-plinth$/.test(id);

for (const id of new Set(missionIds)) for (const [label, progress] of states) test(`${id} (${label}): no stacked-layer geometry conflicts`, () => {
  const world = api.applyExplorationWorld(api.worldBlueprintFor(id), progress);
  assert.deepEqual([...api.validateWorldBlueprint(world)], []);
  const ledges = world.platforms.filter(platform => !platform.id.startsWith("v112-canopy-"));
  for (let first = 0; first < ledges.length; first++) for (let second = first + 1; second < ledges.length; second++) {
    const a = ledges[first], b = ledges[second];
    if (pedestal(a.id) || pedestal(b.id)) continue;
    assert(!api.isDoubleLedgeV157(a, b), `${a.id} and ${b.id} form a double ledge`);
  }
  for (const ledge of ledges.filter(platform => platform.collision === "one-way")) {
    assert(api.headroomV157(ledge, world.platforms) >= api.HUNTER_BODY_V157.height, `${ledge.id} has no head room for the hunter`);
    if (ledge.id.startsWith("feature-")) {
      assert(api.reachableFromBelowV157(ledge, ledges.filter(other => other !== ledge), world), `${ledge.id} can only be reached by falling onto it`);
      assert(!world.platforms.some(other => other.collision === "solid" && intersects(ledge, other)), `${ledge.id} is embedded in solid geometry`);
    }
  }
  for (const cover of world.covers) for (const hazard of world.hazards) {
    if (hazard.cycle || hazard.damagePerSecond <= 0) continue;
    assert(!intersects(cover, hazard), `${cover.id} stands inside ${hazard.id} (${hazard.kind})`);
  }
});

test("room ledges keep one position whatever the exploration state", () => {
  for (const id of new Set(missionIds)) {
    const [base, done] = states.map(([, progress]) => api.applyExplorationWorld(api.worldBlueprintFor(id), progress));
    for (const ledge of base.platforms.filter(platform => platform.id.startsWith("feature-") || platform.id === "j-camp-01")) {
      const later = done.platforms.find(platform => platform.id === ledge.id);
      if (later) assert.deepEqual([later.x, later.y], [ledge.x, ledge.y], `${id}/${ledge.id} moves when a gate opens`);
    }
  }
});

test("the coherence pass is idempotent and never adds, removes or renames geometry", () => {
  for (const id of new Set(missionIds)) {
    const world = api.applyExplorationWorld(api.worldBlueprintFor(id), complete);
    const again = api.resolveHuntGeometryConflictsV157(world);
    assert.equal(again, world, `${id} changes on a second pass`);
  }
});

// V157 authored layouts: the five expansion hunts no longer reuse the jungle,
// ice or volcano templates. Generated V112 canopy routes and room-plan
// features are shared systems and are excluded from the comparison.
const authored = world => [...world.platforms, ...world.climbables, ...world.covers]
  .filter(item => !item.id.startsWith("v112-canopy-") && !item.id.startsWith("feature-"));
const key = item => [item.x, item.y, item.width, item.height].map(Math.round).join(",");

test("no two hunting planets share authored geometry", () => {
  const worlds = new Set(missionIds);
  const sets = [...worlds].map(id => [id, new Set(authored(api.applyExplorationWorld(api.worldBlueprintFor(id), api.defaultExplorationProgress())).map(key))]);
  for (let first = 0; first < sets.length; first++) for (let second = first + 1; second < sets.length; second++) {
    const [a, left] = sets[first], [b, right] = sets[second];
    const shared = [...left].filter(item => right.has(item));
    assert.equal(shared.length, 0, `${a} and ${b} share ${shared.length} authored elements`);
  }
});

test("every authored expansion ledge has a way up: a jump, a level crossing or a climb", () => {
  const expansion = new Set(["swamp-hydra", "desert-sandmaw", "ocean-leviathan", "fungal-hivemind", "ruins-ancient-guardian"]);
  for (const spec of specs.filter(item => expansion.has(item.missionId))) {
    const world = api.applyExplorationWorld(api.worldBlueprintFor(spec.missionId), api.defaultExplorationProgress());
    const ledges = world.platforms.filter(platform => /^(sw|fg|ds|rn|oc)-/.test(platform.id));
    assert(ledges.length >= 10, `${spec.missionId} keeps an authored layout`);
    const gap = (a, b) => Math.max(a.x, b.x) - Math.min(a.x + a.width, b.x + b.width);
    const reached = new Set();
    for (let pass = 0; pass < ledges.length; pass++) for (const ledge of ledges) {
      if (reached.has(ledge.id)) continue;
      const fromFloor = world.floorY - ledge.y <= 130;
      const fromLedge = ledges.some(other => reached.has(other.id) && (
        (other.y > ledge.y && other.y - ledge.y <= 130 && gap(other, ledge) <= 160) ||
        (Math.abs(other.y - ledge.y) <= 10 && gap(other, ledge) <= 200)));
      const fromClimb = world.climbables.some(climb => climb.y <= ledge.y + 24 && climb.y + climb.height >= world.floorY - 2 && gap(climb, ledge) <= 120);
      if (fromFloor || fromLedge || fromClimb) reached.add(ledge.id);
    }
    assert.deepEqual([...ledges.filter(ledge => !reached.has(ledge.id)).map(ledge => ledge.id)], [], spec.missionId);
  }
});
