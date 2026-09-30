import assert from "node:assert/strict";
import test from "node:test";
import { fileURLToPath } from "node:url";
import { build } from "esbuild";
import { readFile } from "node:fs/promises";

async function load(relativePath) {
  const result = await build({
    entryPoints: [fileURLToPath(new URL(relativePath, import.meta.url))],
    bundle: true, format: "esm", platform: "node", target: "es2022", write: false,
  });
  return import("data:text/javascript;base64," + Buffer.from(result.outputFiles[0].text).toString("base64"));
}
const pit = await load("../app/game/systems/pitCombat.ts");
const animation = await load("../app/game/pitFighterAnimation.ts");
const roster = await load("../app/game/systems/pitRosterExpansion.ts");
const replay = await load("../app/game/systems/pitReplay.ts");

function setup(id, distance, reversed = false) {
  const state = pit.createPitCombatState(id, id === "berserker" ? "jungle-hunter" : "berserker", {mode: "training"});
  state.fighters[0].x = reversed ? 650 : 250;
  state.fighters[1].x = state.fighters[0].x + (reversed ? -distance : distance);
  state.fighters[0].facing = reversed ? -1 : 1;
  state.fighters[1].facing = reversed ? 1 : -1;
  return state;
}
function run(id, distance, options = {}) {
  let state = setup(id, distance, options.reversed);
  const hits = [], blocks = [], samples = [];
  const initial = pit.serializePitCombat(state);
  const move = pit.PIT_FIGHTERS[id].attacks.technique;
  const inputs = [];
  for (let frame = 0; frame < move.startup + move.active + move.recovery + 45; frame++) {
    const input = [{attack: frame === 0 ? "technique" : undefined}, options.guard ? {guardHigh: true} : {}];
    inputs.push(input);
    state = pit.stepPitCombat(state, input);
    hits.push(...state.events.filter(event => event.type === "hit" && event.attackerId === id));
    blocks.push(...state.events.filter(event => event.type === "block" && event.attackerId === id));
    samples.push({ x: state.fighters[0].x, effects: state.techniqueEffects.map(effect => ({...effect})) });
  }
  const replayed = inputs.reduce((current, input) => pit.stepPitCombat(current, input), pit.deserializePitCombat(initial));
  assert.equal(pit.serializePitCombat(replayed), pit.serializePitCombat(state));
  assert.deepEqual(pit.deserializePitCombat(pit.serializePitCombat(state)), state);
  return {state, hits, blocks, samples};
}

test("1987 Jungle Hunter fires one shoulder-height plasma bolt and never a returning disc", () => {
  const profile = pit.PIT_FIGHTERS["jungle-hunter"];
  assert.doesNotMatch(Object.values(profile.attacks).map(move => move.label).join(" "), /disque|combistick/i);
  for (const reversed of [false, true]) {
    const result = run("jungle-hunter", 270, {reversed});
    assert.equal(result.hits.length, 1, "one bolt must reach a standing target in either facing");
    assert.ok(result.state.fighters[1].health < pit.PIT_FIGHTERS.berserker.maxHealth);
    assert.equal(result.state.nextTechniqueEffectId, 2);
    assert.equal(result.state.techniqueEffects.length, 0);
    const effects = result.samples.flatMap(sample => sample.effects);
    assert.ok(effects.every(effect => effect.phase === "active" && effect.y === 80));
    for (let index = 1; index < effects.length; index++) {
      assert.equal(effects[index].x - effects[index - 1].x, reversed ? -12 : 12);
    }
  }
});

test("Berserker shoulder stays attached, hits at contact and cannot cross an open gap", () => {
  for (const reversed of [false, true]) {
    const near = run("berserker", 88, {reversed});
    assert.equal(near.hits.length, 1);
    const far = run("berserker", 210, {reversed});
    assert.equal(far.hits.length, 0, "the old travelling shockwave must not reach this target");
    assert.equal(far.state.fighters[1].health, pit.PIT_FIGHTERS["jungle-hunter"].maxHealth);
    assert.ok(Math.abs(far.state.fighters[0].x - (reversed ? 650 : 250)) <= 18);
    const samples = far.samples.filter(sample => sample.effects.length > 0);
    assert.ok(samples.length > 0);
    const offset = samples[0].effects[0].x - samples[0].x;
    assert.ok(samples.every(sample => Math.abs(sample.effects[0].x - sample.x - offset) < 1e-8));
    assert.equal(far.state.techniqueEffects.length, 0);
  }
});

test("Valkyrie hammer has a punishable wind-up and bounded contact without a forward dash", () => {
  const recipe = pit.PIT_FIGHTERS.valkyrie;
  assert.equal(recipe.attacks.technique.startup, 28);
  assert.equal(recipe.attacks.technique.active, 7);
  assert.equal(recipe.attacks.technique.recovery, 36);
  for (const reversed of [false, true]) {
    const near = run("valkyrie", 100, {reversed});
    assert.equal(near.hits.length, 1);
    const far = run("valkyrie", 180, {reversed});
    assert.equal(far.hits.length, 0);
    assert.equal(far.state.fighters[0].x, reversed ? 650 : 250);
    assert.equal(far.state.fighters[1].health, pit.PIT_FIGHTERS.berserker.maxHealth);
    assert.ok(far.samples.filter(sample => sample.effects.length).every(sample => {
      const effect = sample.effects[0];
      const box = pit.getPitTechniqueBox(far.state, effect);
      return box.width === 94 && box.height === 72 && box.y === 26;
    }));
    const guarded = run("valkyrie", 100, {reversed, guard: true});
    assert.equal(guarded.hits.length, 0);
    assert.equal(guarded.blocks.length, 1, "the hammer must retain block counterplay");
  }
  let interrupted = setup("valkyrie", 72);
  interrupted = pit.stepPitCombat(interrupted, [{attack: "technique"}, {}]);
  for (let frame = 0; frame < 27; frame++) {
    interrupted = pit.stepPitCombat(interrupted, [{}, {attack: frame === 5 ? "light" : undefined}]);
  }
  assert.ok(interrupted.fighters[0].health < recipe.maxHealth, "startup can be interrupted by a normal strike");
  assert.equal(interrupted.nextTechniqueEffectId, 1, "an interrupted wind-up never creates its hit volume");
});

test("Valkyrie procedural fallback reads as a heavy swing, without claiming a new sprite sheet", () => {
  const move = pit.PIT_FIGHTERS.valkyrie.attacks.technique;
  const fighter = setup("valkyrie", 300).fighters[0];
  const resolve = (phase, frame) => animation.resolvePitFighterAnimation({
    ...fighter, phase, action: {kind: "attack", attack: "technique", frame, connected: false},
  }, 60);
  const startup = resolve("startup", 10);
  const active = resolve("active", move.startup);
  assert.equal(active.motion, "technique-hammer-active");
  assert.notDeepEqual(startup.frame.anchors.handGrip, active.frame.anchors.handGrip);
  assert.equal(active.bladeExtension, 0);
});

test("Tracker uses a ground hound rather than a drone and Falconer reconnaissance stays non-damaging", () => {
  assert.match(roster.PIT_EXPANSION_FIGHTERS.tracker.arcadeIntro, /un seul chien au sol/);
  assert.equal(pit.PIT_FIGHTERS.tracker.technique.device, "hound");
  assert.equal(pit.PIT_FIGHTERS.tracker.technique.verticalOffset, 0);
  assert.equal(pit.PIT_FIGHTERS.tracker.technique.maxHits, 1);
  assert.equal(pit.PIT_FIGHTERS.falconer.technique.contactEffect, "mark");
  assert.equal(pit.PIT_FIGHTERS.falconer.technique.damageScale, 0);
  assert.equal(pit.PIT_FIGHTERS.falconer.technique.chipScale, 0);
});

test("V54 equipment archive fails closed without rewriting its published checksum or input", async () => {
  // Captured with pitFirstEdition.ts from published commit 3d8efbcfb42939a33093ee3ad923c0e97ff53ff5.
  const bytes = await readFile(new URL('./fixtures/pit-replay-v54-equipment.json', import.meta.url), 'utf8');
  const historical = JSON.parse(bytes);
  const before = JSON.stringify(historical);
  assert.equal(historical.metadata.checksum, '4d7dd050');
  assert.equal(replay.normalizePitReplay(historical), null);
  assert.throws(() => replay.deserializePitReplay(bytes), error => error.name === 'PitReplayCompatibilityError');
  assert.equal(JSON.stringify(historical), before, 'a refused historical archive must stay recoverable unchanged');
});
