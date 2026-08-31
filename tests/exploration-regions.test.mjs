import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { runInNewContext } from "node:vm";
const bundle = await build({ stdin: { contents: 'export * from "./app/game/systems/explorationRegions"; export * from "./app/game/systems/explorationProgress"; export * from "./app/game/systems/worldBlueprints"; export * from "./app/game/systems/platformCollision"; export {MISSIONS, DIFFICULTY_BY_ID} from "./app/game/data";', resolveDir: process.cwd(), loader: "ts" }, bundle: true, write: false, format: "cjs", platform: "node" });
const compiled = { exports: {} }; runInNewContext(bundle.outputFiles[0].text, { module: compiled, exports: compiled.exports });
const api = compiled.exports;
const plain = value => JSON.parse(JSON.stringify(value));
const acquired = api.normalizeExplorationProgress({ abilityIds: ["aerial-boost"], openedGateIds: ["jungle-resonance-seal", "jungle-canopy-hatch", "ice-mine-relay", "ice-return-hatch"], secretIds: ["jungle-clan-cache", "ice-clan-cache"] });
for (const progress of [api.defaultExplorationProgress(), acquired]) {
  test(`every resolved world keeps valid physical route references with ${progress.openedGateIds.length} open gates`, () => {
    for (const mission of api.MISSIONS) {
      const base = api.worldBlueprintFor(mission.id);
      const resolved = api.applyExplorationWorld(base, progress);
      assert.deepEqual(plain(api.validateWorldBlueprint(resolved)), [], mission.id);
      assert.deepEqual(plain(api.applyExplorationWorld(resolved, progress)), plain(resolved), `${mission.id}: repeated application is stable`);
      if (!api.isExplorationMission(mission.id)) assert.equal(resolved, base, "other biomes remain unchanged");
      const spawn = { ...resolved.spawn, width: 72, height: 116 };
      assert.equal(api.overlapsSolidPlatform(spawn, resolved.platforms), false, `${mission.id}: spawn free`);
      for (const difficulty of Object.values(api.DIFFICULTY_BY_ID)) for (const x of api.safeCheckpointPositions(resolved, difficulty.checkpointCount, { hazardMargin: 72 })) {
        assert.equal(api.overlapsSolidPlatform({ x, y: resolved.floorY - 116, width: 72, height: 116 }, resolved.platforms), false, `${mission.id}: ground checkpoint free`);
      }
    }
  });
}

test("region interaction dispatch preserves the main progress and refuses unrelated missions", () => {
  const progress = api.defaultExplorationProgress();
  assert.equal(api.interactWithExplorationRegion("volcano-bad-blood", progress, { x: 2520, y: 508, width: 72, height: 116 }), null);
  const unlock = api.interactWithExplorationRegion("jungle-vey", progress, { x: 2520, y: 508, width: 72, height: 116 });
  assert.equal(unlock.event, "ability");
  const relay = api.interactWithExplorationRegion("ice-cryostalker", unlock.progress, { x: 1000, y: 188, width: 72, height: 116 });
  assert.equal(relay.event, "gate");
  assert.deepEqual(plain(relay.progress.abilityIds), ["aerial-boost"]);
  assert.deepEqual(plain(progress.abilityIds), []);
});
