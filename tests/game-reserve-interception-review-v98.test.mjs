import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";

const bundled = await build({ entryPoints: ["app/game/systems/gameReserveV66.ts"], bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent" });
const reserve = await import("data:text/javascript;base64," + Buffer.from(bundled.outputFiles[0].text).toString("base64"));
const advance = (initial, count, input = {}) => {
  let state = initial;
  for (let n = 0; n < count; n++) state = reserve.stepGameReserveV66(state, input);
  return state;
};

// Boundary fixture: the passenger is already at the physical ramp. Other actors remain far away.
// It deliberately does not stand in for the independently played route tested below.
function boarding(tick = 1000, launch = 950) {
  const state = reserve.stepGameReserveV66(reserve.createGameReserveV66(37));
  state.tick = tick;
  state.player.x = 2360;
  state.ships[0] = { parts: 3, repair: 3600, launch, departedAt: null, sabotages: 0 };
  state.humans.forEach((human, index) => { human.x = 4200 + index * 30; });
  Object.assign(state.humans[0], { x: 2360, status: "boarded" });
  assert.ok(reserve.normalizeGameReserveV66(state));
  return state;
}

test("interception completes strictly before departure; the last tick cannot resurrect an escaped passenger", () => {
  const before = boarding(809, 0);
  const stopped = advance(before, 90, { interact: true });
  assert.equal(stopped.tick, 899);
  assert.equal(stopped.ships[0].launch, null);
  assert.equal(stopped.ships[0].sabotages, 1);
  assert.equal(stopped.humans[0].status, "active");
  assert.equal(stopped.humans[0].x, before.humans[0].x);
  assert.equal(stopped.humans[0].hp, before.humans[0].hp);
  assert.ok(reserve.normalizeGameReserveV66(stopped));
  assert.ok(reserve.canAdvanceGameReserveV66(before, stopped));

  const tooLate = advance(boarding(810, 0), 90, { interact: true });
  assert.equal(tooLate.tick, 900);
  assert.equal(tooLate.ships[0].departedAt, 900);
  assert.equal(tooLate.ships[0].sabotages, 0);
  assert.equal(tooLate.humans[0].status, "escaped");
  assert.equal(tooLate.humans[0].disembarkation, undefined);
  assert.equal(reserve.gameReserveV66Interaction(tooLate).kind, "none");
  assert.ok(reserve.normalizeGameReserveV66(tooLate));
});

test("pausing or an incoming hit cannot finish an interception channel", () => {
  const started = advance(boarding(), 89, { interact: true });
  assert.equal(started.channel.ticks, 89);
  assert.equal(reserve.stepGameReserveV66(started, { interact: true }, true), started);
  const hit = structuredClone(started);
  hit.projectiles.push({ x: hit.player.x - 4, y: 390, vx: 4, vy: 0, owner: "human", life: 4 });
  const interrupted = reserve.stepGameReserveV66(hit, { interact: true });
  assert.equal(interrupted.player.hp, 92);
  assert.equal(interrupted.channel.ticks, 0);
  assert.equal(interrupted.ships[0].sabotages, 0);
  assert.equal(interrupted.humans[0].status, "boarded");
  assert.equal(interrupted.humans[0].disembarkation, undefined);
  assert.ok(reserve.canAdvanceGameReserveV66(started, interrupted));
});

test("a sabotage already in progress remains writable when engines start on its final channel tick", () => {
  const initial = boarding();
  initial.player.x = 2434;
  Object.assign(initial.ships[0], { repair: 3559.725, launch: null });
  // A crew member works at the near edge of the ramp, facing away from the hunter.
  Object.assign(initial.humans[0], { status: "active", x: 2348, facing: -1 });
  assert.ok(reserve.normalizeGameReserveV66(initial));
  const stopped = advance(initial, 90, { interact: true });
  assert.equal(stopped.tick, initial.tick + 90);
  assert.equal(stopped.ships[0].repair, 1600);
  assert.equal(stopped.ships[0].launch, null);
  assert.equal(stopped.ships[0].sabotages, 1);
  assert.equal(stopped.humans[0].status, "active");
  assert.ok(reserve.normalizeGameReserveV66(stopped), "same-tick engine start and interruption is a real runtime result");
  assert.ok(reserve.canAdvanceGameReserveV66(initial, stopped));
});

test("boarding is reversible only through a newer interception; old receipts cannot authorize a later rewind", () => {
  const before = boarding();
  const stopped = advance(before, 90, { interact: true });
  assert.ok(reserve.canAdvanceGameReserveV66(before, stopped));
  for (const mutate of [
    state => { delete state.ships[0].interception; },
    state => { delete state.humans[0].disembarkation; },
    state => { state.ships[0].sabotages = 0; },
    state => { state.ships[0].interception.hunterX = 115; },
    state => { state.ships[0].interception.hunterX = 2435; },
    state => { state.ships[0].interception.hunterX = NaN; },
    state => { state.humans[0].hp = 71; },
    state => { state.humans[0].id = "reserve-marek"; },
  ]) {
    const forged = structuredClone(stopped);
    mutate(forged);
    assert.equal(reserve.canAdvanceGameReserveV66(before, forged), false);
  }
  const nextBoarding = structuredClone(stopped);
  nextBoarding.tick += 1000;
  Object.assign(nextBoarding.ships[0], { repair: 3600, launch: nextBoarding.tick - 1 });
  nextBoarding.humans[0].status = "boarded";
  assert.ok(reserve.normalizeGameReserveV66(nextBoarding));
  assert.ok(reserve.canAdvanceGameReserveV66(stopped, nextBoarding));
  const replayedExit = structuredClone(nextBoarding);
  replayedExit.tick++;
  replayedExit.humans[0].status = "active";
  assert.equal(reserve.canAdvanceGameReserveV66(nextBoarding, replayedExit), false);
  const erasedReceipt = structuredClone(nextBoarding);
  erasedReceipt.tick++;
  delete erasedReceipt.humans[0].disembarkation;
  assert.equal(reserve.canAdvanceGameReserveV66(nextBoarding, erasedReceipt), false);
  const rewrittenLocation = structuredClone(nextBoarding);
  rewrittenLocation.tick++;
  rewrittenLocation.ships[0].interception.hunterX++;
  assert.ok(reserve.normalizeGameReserveV66(rewrittenLocation));
  assert.equal(reserve.canAdvanceGameReserveV66(nextBoarding, rewrittenLocation), false);
});

test("a checkpoint spanning interception and combat preserves the observed identity and irreversible casualty", () => {
  const before = boarding();
  Object.assign(before.humans[0], { hp: 40, scan: 90, identified: true });
  const stopped = advance(before, 90, { interact: true });
  const down = reserve.stepGameReserveV66(stopped, { melee: true });
  assert.equal(down.humans[0].status, "down");
  assert.equal(down.humans[0].identified, true);
  assert.equal(down.humans[0].scan, 90);
  assert.ok(reserve.normalizeGameReserveV66(down));
  assert.ok(reserve.canAdvanceGameReserveV66(before, down));
  const revived = structuredClone(down);
  revived.tick++;
  Object.assign(revived.humans[0], { status: "active", hp: 1, downAt: null });
  assert.equal(reserve.canAdvanceGameReserveV66(down, revived), false);
});

test("legacy saves remain exact; two played launches, approaches and interceptions stay writable every 120 ticks", () => {
  const legacy = reserve.createGameReserveV66(37);
  assert.deepEqual(reserve.normalizeGameReserveV66(legacy), legacy);
  assert.equal("interception" in legacy.ships[0], false);
  assert.equal("disembarkation" in legacy.humans[0], false);
  let state = reserve.stepGameReserveV66(legacy);
  let saved = state;
  let phase = "waiting";
  let launches = 0;
  const interceptions = [];
  let previousReceipt = null;
  for (let n = 0; n < 24000; n++) {
    if (phase === "waiting" && state.ships[0].launch !== null) { phase = "approaching"; launches++; }
    let input = {};
    if (phase === "approaching") input = state.player.x < 2320 ? { move: 1 } : { interact: true };
    if (phase === "retreating") {
      if (state.player.x > 115) input = { move: -1 };
      else phase = "waiting";
    }
    state = reserve.stepGameReserveV66(state, input);
    const receipt = state.ships[0].interception?.tick ?? null;
    if (state.tick - saved.tick >= 120 || receipt !== previousReceipt) {
      assert.ok(reserve.normalizeGameReserveV66(state), "natural phases must serialize");
      assert.ok(reserve.canAdvanceGameReserveV66(saved, state), `checkpoint ${saved.tick} → ${state.tick}`);
      saved = state;
    }
    if (receipt !== previousReceipt) {
      assert.notEqual(receipt, null);
      interceptions.push(receipt);
      previousReceipt = receipt;
      phase = "retreating";
      if (interceptions.length === 2) break;
    }
  }
  assert.equal(launches, 2);
  assert.equal(interceptions.length, 2);
  assert.ok(interceptions[1] > interceptions[0]);
  assert.equal(state.ships[0].sabotages, 2);
  assert.equal(state.status, "active");
  assert.ok(state.humans.some(human => human.disembarkation?.tick === interceptions[1]));
  assert.equal(state.ships[0].departedAt, null);
});

test("intercepted campaign checkpoints roundtrip through manual slots and integral archives; free-play writes stay outside them", async () => {
  const compiled = await build({
    stdin: { contents: `
      export * from "./app/game/systems/campaignSlots";
      export * from "./app/game/systems/completeArchive";
      export * from "./app/game/systems/cloudArchiveV71";
      export * from "./app/game/systems/mainMenuModesV81";
      export { defaultSave, parseSaveImport, SAVE_STORAGE_KEY } from "./app/game/save";
    `, resolveDir: process.cwd(), loader: "ts" },
    bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent",
  });
  const archive = await import("data:text/javascript;base64," + Buffer.from(compiled.outputFiles[0].text).toString("base64"));
  const stopped = advance(boarding(), 90, { interact: true });
  const save = { ...archive.defaultSave("2026-10-18T10:00:00.000Z"), gameReserveV66: stopped };
  const values = new Map([[archive.SAVE_STORAGE_KEY, JSON.stringify(save)]]);
  const disk = { get length() { return values.size; }, key: index => [...values.keys()][index] ?? null,
    getItem: key => values.get(key) ?? null, setItem: (key, raw) => values.set(key, raw), removeItem: key => values.delete(key) };
  const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { locks: { request: async (_name, _options, callback) => callback({}) } } });
  try {
    assert.deepEqual(archive.parseSaveImport(JSON.stringify(save)).save.gameReserveV66, stopped);
    const migration = await archive.migrateLegacyCampaignSlot(disk);
    assert.equal(migration.ok, true, migration.message);
    let slot = archive.loadCampaignSlots(disk).slots[0];
    const written = await archive.saveCampaignCheckpoint(1, { kind: "manual", index: 1, expectedRevision: slot.revision, location: "game-reserve" }, disk);
    assert.equal(written.ok, true, written.message);
    slot = archive.loadCampaignSlots(disk).slots[0];
    const restored = await archive.activateCampaignCheckpoint(1, written.checkpoint.id, { expectedRevision: slot.revision }, disk);
    assert.equal(restored.ok, true, restored.message);
    assert.equal(restored.checkpoint.resumeLocation, "game-reserve");
    assert.deepEqual(restored.save.gameReserveV66, stopped);
    const exported = archive.createCompleteArchive(restored.save, disk);
    const decoded = archive.parseCompleteArchive(exported.serialized);
    assert.ok(decoded.archive);
    assert.deepEqual(decoded.archive.campaign.gameReserveV66, stopped);
    const cloudBefore = archive.captureCloudArchiveV71(disk, "2026-10-18T10:01:00.000Z");
    const protectedBefore = new Map(values);
    const freePlay = archive.mainMenuBonusStorageV81(disk);
    freePlay.setItem("reserve", JSON.stringify({ version: 1, state: stopped }));
    for (const [key, raw] of protectedBefore) assert.equal(disk.getItem(key), raw, key);
    const cloudAfter = archive.captureCloudArchiveV71(disk, "2026-10-18T10:01:00.000Z");
    assert.deepEqual(cloudAfter, cloudBefore);
    assert.equal(cloudAfter.entries.some(entry => entry.key.startsWith(archive.MAIN_MENU_BONUS_PREFIX_V81)), false);
  } finally {
    if (previousNavigator) Object.defineProperty(globalThis, "navigator", previousNavigator);
    else delete globalThis.navigator;
  }
});
