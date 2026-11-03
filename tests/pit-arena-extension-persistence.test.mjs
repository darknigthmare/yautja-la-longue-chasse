import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const bundle = await build({
  stdin: { contents: [
    'export * from "./app/game/systems/pitSave";',
    'export * from "./app/game/systems/pitReplay";',
    'export { PIT_EXTENSION_ARENA_IDS } from "./app/game/systems/pitArenaExtensions";',
    'export { createPitCombatState, stepPitCombat, serializePitCombat } from "./app/game/systems/pitCombat";',
  ].join("\n"), resolveDir: process.cwd(), loader: "ts" },
  bundle: true, write: false, platform: "node", format: "esm", logLevel: "silent",
});
const pit = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const OWNER = "2026-09-13T10:00:00.000Z";
const match = (arenaId, overrides = {}) => ({
  id: "v35-" + arenaId, mode: "cpu", outcome: "victory",
  fighterId: "jungle-hunter", arenaId, roundsWon: 2, roundsLost: 1,
  completedAt: "2026-09-13T10:05:00.000Z", ...overrides,
});

test("new arena duels survive durable save reload and remain idempotent", () => {
  let save = pit.createPitSave(OWNER);
  const values = new Map();
  const storage = { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
  for (const [index, arenaId] of pit.PIT_EXTENSION_ARENA_IDS.entries()) {
    const result = match(arenaId);
    save = pit.applyPitResult(save, result).save;
    assert.equal(pit.writePitSave(save, { storage }).persisted, true);
    const loaded = pit.loadPitSave({ storage, expectedOwnerSaveCreatedAt: OWNER });
    assert.equal(loaded.failure, null);
    assert.equal(loaded.save.lastArenaId, arenaId);
    assert.equal(loaded.save.stats.cpu.matches, index + 1);
    assert.deepEqual(pit.applyPitResult(loaded.save, result).save, loaded.save);
    assert.deepEqual(JSON.parse(pit.serializePitSave(loaded.save)), loaded.save);
    save = loaded.save;
  }
  assert.equal(save.stats.arcade.matches, 0);
  assert.equal(save.stats.circuit.matches, 0);
  assert.doesNotMatch(JSON.stringify(save), /honor|clanMarks|trophies|inventory/);
});

test("registering duel arenas does not allow them to replace a chronicle encounter", () => {
  for (const arenaId of pit.PIT_EXTENSION_ARENA_IDS) {
    assert.throws(() => pit.applyPitResult(pit.createPitSave(OWNER), match(arenaId, {
      mode: "arcade", arcadeEncounterIndex: 0, arcadeCompleted: false,
    })), /Invalid THE PIT/);
    assert.throws(() => pit.applyPitResult(pit.createPitSave(OWNER), match(arenaId, {
      mode: "circuit", circuitFightIndex: 0, circuitCompleted: false,
    })), /Invalid THE PIT/);
  }
});

test("unregistered and lookalike arena identifiers still fail validation", () => {
  const valid = pit.PIT_EXTENSION_ARENA_IDS[0];
  for (const arenaId of [valid + "-forged", "arena-021-unproduced", "__proto__", "toString"]) {
    assert.throws(() => pit.applyPitResult(pit.createPitSave(OWNER), match(arenaId)), /Invalid THE PIT/);
    assert.throws(() => pit.recordPitReplay([[{}, {}]], { arenaId }));
  }
});

test("new arena IDs round-trip replay inputs and reproduce the live combat state", () => {
  const fighters = ["jungle-hunter", "city-hunter"];
  const inputs = Array.from({ length: 180 }, (_, frame) => [
    frame < 65 ? { right: true } : frame === 85 ? { attack: "light" } : frame === 125 ? { jump: true } : {},
    frame < 55 ? { left: true } : frame >= 80 && frame < 100 ? { guardHigh: true } : {},
  ]);
  for (const arenaId of pit.PIT_EXTENSION_ARENA_IDS) {
    const source = pit.recordPitReplay(inputs, { fighters, arenaId, seed: 35 });
    const replay = pit.normalizePitReplay(JSON.parse(pit.serializePitReplay(source)));
    assert(replay);
    assert.equal(replay.arenaId, arenaId);
    const live = inputs.reduce((state, input) => pit.stepPitCombat(state, input), pit.createPitCombatState(...fighters, { arenaId }));
    assert.equal(pit.serializePitCombat(pit.playPitReplay(replay)), pit.serializePitCombat(live));
  }
});
