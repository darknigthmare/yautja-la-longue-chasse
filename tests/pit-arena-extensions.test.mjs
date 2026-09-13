import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const compilation = await build({ stdin: { contents: 'export * from "./app/game/systems/pitArenaExtensions"; export * from "./app/game/systems/pitFirstEdition"; export * from "./app/game/systems/pitCombat"; export * from "./app/game/pitArenaProduction"; export * from "./app/game/pitArenaRendering"; export * from "./app/game/systems/pitReplay";', loader: "ts", resolveDir: process.cwd() }, write: false, bundle: true, platform: "node", format: "esm", logLevel: "silent" });
const api = await import("data:text/javascript;base64," + Buffer.from(compilation.outputFiles[0].text).toString("base64"));

test("twelve explicit duel IDs extend, but never replace, the eight historical arenas", () => {
  assert.equal(api.PIT_FIRST_EDITION_ARENA_IDS.length, 8);
  assert.equal(api.PIT_EXTENSION_ARENA_IDS.length, 12);
  assert.equal(api.PIT_ARENA_IDS.length, 20);
  assert.deepEqual(api.PIT_ARENA_IDS.slice(0, 8), api.PIT_FIRST_EDITION_ARENA_IDS);
  for (const [index, id] of api.PIT_EXTENSION_ARENA_IDS.entries()) {
    const extension = api.getPitArenaExtension(id, index + 9);
    assert(extension);
    assert.equal(api.isPitFirstEditionArenaId(id), false);
    assert.equal(api.getPitArenaExtension(id, index + 10), null);
    assert.deepEqual(api.PIT_ARENAS[id], { ...extension, palette: { ...extension.palette }, layers: [] });
    assert.equal(extension.implementedSectors, 1);
    assert.equal(extension.interactivePropsImplemented, false);
    assert.equal(extension.transitionsImplemented, false);
    assert.equal(extension.competitiveHazards, false);
    for (const key of ["width", "height", "groundY", "leftWall", "rightWall", "spawnX"])
      assert.deepEqual(extension[key], api.PIT_FIRST_EDITION_ARENAS["the-pit"][key]);
  }
  for (const value of ["__proto__", "constructor", "arena-021-marche-du-convoi", null]) assert.equal(api.isPitExtensionArenaId(value), false);
});

test("each extension supports deterministic movement, both boundaries, rematch and serialized recovery", () => {
  for (const id of api.PIT_EXTENSION_ARENA_IDS) {
    let state = api.createPitCombatState("jungle-hunter", "city-hunter", { mode: "training", arenaId: id });
    assert.equal(state.arenaId, id);
    for (const direction of ["left", "right"]) {
      for (let frame = 0; frame < 360; frame++) {
        state = api.stepPitCombat(state, [{ [direction]: true }, { [direction]: true }]);
        const arena = api.PIT_ARENAS[id];
        for (const fighter of state.fighters) {
          assert(fighter.x >= arena.leftWall && fighter.x <= arena.rightWall, id);
          assert(Number.isFinite(fighter.x) && Number.isFinite(fighter.y));
          assert.equal(fighter.y, 0);
        }
      }
      const serialized = api.serializePitCombat(state);
      assert.deepEqual(api.deserializePitCombat(serialized), state);
      assert.deepEqual(api.stepPitCombat(api.deserializePitCombat(serialized), [{}, {}]), api.stepPitCombat(state, [{}, {}]));
    }
    const restarted = api.rematchPitCombat(state);
    assert.equal(restarted.arenaId, id);
    assert.deepEqual(restarted.fighters.map(f => f.x), [300, 660]);
  }
});

test("review status or a copied approval cannot manufacture a gameplay extension", () => {
  const id = api.PIT_EXTENSION_ARENA_IDS[0];
  assert(api.resolvePitArenaProductionKit(id));
  for (const mutate of [
    stage => { delete stage.runtimeExtension; },
    stage => { stage.runtimeExtension.rendererEvidenceRecorded = false; delete stage.runtimeExtension.rendererEvidence; },
    stage => { stage.runtimeExtension.gameplayProfile = "invented"; },
    stage => { stage.number = 21; },
    stage => { stage.runtimeEnabled = false; },
    stage => { stage.legacyRuntimeArenaId = id; stage.legacyRuntimeStatus = "playable"; delete stage.runtimeExtension; },
  ]) {
    const fixture = structuredClone(api.PIT_ARENA_PRODUCTION_MANIFEST);
    mutate(fixture.stages.find(stage => stage.catalogueId === id));
    assert.equal(api.resolvePitArenaProductionKit(id, fixture), null);
  }
});

test("a failed extension PNG never borrows another arena or reports a complete bank", async () => {
  const id = api.PIT_EXTENSION_ARENA_IDS[0];
  const kit = api.resolvePitArenaProductionKit(id);
  const frames = new Map(kit.planes.flatMap(p => p.assets.flatMap(a => a.frames.map(f => [f.path, f]))));
  const failed = kit.requiredPaths[3];
  const requested = [];
  const original = globalThis.Image;
  globalThis.Image = class {
    set src(value) {
      this.value = value;
      if (!value) return;
      requested.push(value);
      const frame = frames.get(value);
      this.naturalWidth = frame?.generation.width ?? 1;
      this.naturalHeight = frame?.generation.height ?? 1;
      queueMicrotask(() => value === failed ? this.onerror?.() : this.onload?.());
    }
    get src() { return this.value; }
  };
  try {
    const bank = await api.loadPitArenaArt(id);
    assert.equal(bank.productionKit, undefined);
    assert.equal(bank.unavailable, true);
    assert.equal(bank.images.size, 13);
    assert.deepEqual([...bank.failedPaths], [failed]);
    assert.equal(requested.length, 14);
    assert(requested.every(path => path.startsWith(`/game/sprites/v34/pit-arenas/${id}/`)));
    const state = api.createPitCombatState("jungle-hunter", "city-hunter", { mode: "training", arenaId: id });
    const context = new Proxy({}, { get(target, key) { return target[key] ?? (() => {}); } });
    const camera = { arenaId: id, centerX: 480, centerY: 270, zoom: 1 };
    const report = api.drawPitArenaBackdrop(context, state, camera, bank);
    assert.deepEqual(report.drawnPlanes, []);
    assert.deepEqual(report.missingPaths, [failed]);
    assert.deepEqual(api.drawPitArenaForeground(context, state, camera, bank), { drawnPlanes: [], missingPaths: [] });
  } finally { if (original === undefined) delete globalThis.Image; else globalThis.Image = original; }
});


test("extension arena IDs survive replay encoding and deterministic playback", () => {
  const frames = Array.from({ length: 120 }, (_, frame) => [{ right: frame < 25, attack: frame === 45 ? "light" : undefined }, { left: frame < 25 }]);
  for (const arenaId of api.PIT_EXTENSION_ARENA_IDS) {
    const replay = api.recordPitReplay(frames, { arenaId, fighters: ["jungle-hunter", "city-hunter"] });
    const restored = api.deserializePitReplay(api.serializePitReplay(replay));
    assert.equal(restored.arenaId, arenaId);
    assert.deepEqual(api.playPitReplay(restored), api.playPitReplay(replay));
    assert.equal(api.playPitReplay(restored).arenaId, arenaId);
  }
});
