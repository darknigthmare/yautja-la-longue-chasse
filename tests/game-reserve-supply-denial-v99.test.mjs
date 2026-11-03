import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { homeworldSceneSsrV78 } from "./helpers/homeworld-scene-ssr-v78.mjs";

const compiled = await build({ stdin: { contents: `
  export * from "./app/game/systems/gameReserveV66";
  export * from "./app/game/systems/gameReserveTacticalV98";
  export { drawGameReserveV66, GAME_RESERVE_V66_ART } from "./app/game/gameReserveV66Rendering";
`, resolveDir: process.cwd(), loader: "ts" }, bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent" });
const reserve = await import("data:text/javascript;base64," + Buffer.from(compiled.outputFiles[0].text).toString("base64"));
const advance = (initial, count, input = {}) => {
  let state = initial;
  for (let n = 0; n < count; n++) state = reserve.stepGameReserveV66(state, input);
  return state;
};
function quiet() {
  const state = reserve.stepGameReserveV66(reserve.createGameReserveV66(99));
  for (let index = 0; index < 8; index++) Object.assign(state.humans[index], { x: 4300 + index * 20, hp: 0, status: "down", downAt: 0, secured: true });
  assert(reserve.normalizeGameReserveV66(state));
  return state;
}
function recovery() {
  const state = quiet();
  state.supplies[0]--;
  Object.assign(state.humans[0], { x: 1180, carrying: true });
  Object.assign(state.humans[1], { x: 1000, hp: 70, status: "active", downAt: null, secured: false });
  return state;
}

test("all eight depots across three sectors can lose both lots without granting inventory or erasing transported material", () => {
  for (const [index, x] of reserve.GAME_RESERVE_V66_SUPPLIES.entries()) {
    const initial = quiet(); initial.player.x = x;
    const first = advance(initial, 120, { interact: true });
    const empty = advance(first, 120, { interact: true });
    assert.equal(first.supplies[index], 1);
    assert.equal(empty.supplies[index], 0);
    assert.equal(empty.deniedSupplies[index], 2);
    assert.equal(reserve.gameReserveV66MaterialTotal(empty), 16);
    assert.equal(reserve.gameReserveV66Interaction(empty).kind, "none");
    assert.equal(empty.player.hp, 100);
    for (const absent of ["inventory", "honor", "rankId"]) assert.equal(absent in empty, false);
    assert(reserve.normalizeGameReserveV66(empty));
    assert(reserve.canAdvanceGameReserveV66(initial, empty), `depot ${index}, sparse checkpoint`);
    assert.deepEqual(reserve.normalizeGameReserveV66(JSON.parse(JSON.stringify(empty))), empty);
  }
});

test("depot work uses strict ground range, release and movement reset it, and starting the exposed work removes camouflage", () => {
  const initial = quiet(); initial.player.x = 720; initial.player.cloak = true;
  for (const [x, y] of [[675, 438], [765, 438], [720, 432]]) {
    const outside = structuredClone(initial); outside.player.x = x; outside.player.y = y;
    assert.equal(reserve.gameReserveV66Interaction(outside).kind, "none");
  }
  const almost = advance(initial, 119, { interact: true });
  assert.equal(almost.player.cloak, false);
  const moved = reserve.stepGameReserveV66(almost, { move: 1, interact: true });
  assert.equal(moved.channel.kind, "none");
  assert.equal(moved.deniedSupplies, undefined);
  assert.equal(reserve.stepGameReserveV66(almost).channel.kind, "none");
  const restarted = advance(moved, 119, { interact: true });
  assert.equal(restarted.supplies[0], 2);
  assert.equal(advance(restarted, 1, { interact: true }).supplies[0], 1);
});

test("recovery discovers only a nearby visible allied carrier, rather than a distant, covered or foreign body", () => {
  const exact = recovery();
  const known = reserve.stepGameReserveV66(exact);
  assert.equal(known.humans[1].recovering?.bodyId, exact.humans[0].id, "180-unit discovery boundary is reachable");
  assert(known.humans[1].x > exact.humans[1].x && known.humans[1].x - exact.humans[1].x <= .951);
  for (const configure of [
    state => { state.humans[0].x = 1180.01; },
    state => { state.humans[1].x = 1200; state.humans[0].x = 1340; },
    state => { state.humans[0].team = 1; },
    state => { state.humans[0].carrying = false; state.supplies[0]++; },
  ]) {
    const hidden = recovery(); configure(hidden);
    assert(reserve.normalizeGameReserveV66(hidden));
    assert.equal(reserve.stepGameReserveV66(hidden).humans[1].recovering, undefined);
  }
});

test("a partial recovery reloads exactly, pauses inertly, and an actual nearby threat discards its progress", () => {
  const initial = recovery(); initial.humans[1].x = 1175;
  const partial = advance(initial, 45);
  assert.equal(partial.humans[1].recovering.ticks, 45);
  const restored = reserve.normalizeGameReserveV66(JSON.parse(JSON.stringify(partial)));
  assert.deepEqual(restored, partial);
  assert.equal(reserve.stepGameReserveV66(restored, {}, true), restored);
  const completed = advance(restored, 45);
  assert.equal(completed.humans[0].carrying, false);
  assert.equal(completed.humans[1].carrying, true);
  assert.equal(completed.humans[0].id, initial.humans[0].id);
  assert.equal(completed.humans[0].secured, true);
  assert(reserve.canAdvanceGameReserveV66(initial, completed));
  const threatened = structuredClone(restored); threatened.player.x = 1180;
  const interrupted = reserve.stepGameReserveV66(threatened);
  assert.equal(interrupted.humans[1].recovering, undefined);
  assert.equal(interrupted.humans[0].carrying, true);
  assert.equal(interrupted.humans[1].lastSeenX, 1180);
  assert.equal(interrupted.humans[1].carrying, false);
});

test("a nonlethal last-frame projectile interrupts recovery without revealing the hidden hunter's current position", () => {
  const initial = recovery();
  Object.assign(initial.humans[1], { x: 1175, recovering: { bodyId: initial.humans[0].id, ticks: 89 } });
  initial.projectiles.push({ x: 1171, y: 390, vx: 4, vy: 0, owner: "hunter", life: 4 });
  assert.equal(initial.humans[1].lastSeenX, null);
  assert.equal(reserve.gameReserveV66LineClear(initial.humans[1].x, 387, initial.player.x, 393), false);
  assert(reserve.normalizeGameReserveV66(initial));
  const interrupted = reserve.stepGameReserveV66(initial);
  assert.equal(interrupted.humans[1].hp, 34);
  assert.equal(interrupted.humans[1].status, "active");
  assert.equal(interrupted.humans[1].recovering, undefined);
  assert.equal(interrupted.humans[1].lastSeenX, null);
  assert.equal(interrupted.humans[1].alertUntil, 0);
  assert.equal(interrupted.humans[1].windup, 0);
  assert.equal(interrupted.humans[0].carrying, true);
  assert.equal(interrupted.humans[1].carrying, false);
  assert(reserve.canAdvanceGameReserveV66(initial, interrupted));
  const restarted = reserve.stepGameReserveV66(interrupted);
  assert.equal(restarted.humans[1].recovering.ticks, 1);
  assert.equal(restarted.humans[1].lastSeenX, null);
});

test("malformed denial facts and contradictory recovery jobs are rejected without rewriting supported legacy saves", () => {
  const legacy = reserve.createGameReserveV66(99);
  assert.deepEqual(reserve.normalizeGameReserveV66(legacy), legacy);
  assert.equal("deniedSupplies" in reserve.normalizeGameReserveV66(legacy), false);
  for (const invalid of [[], [0, 0], Array(8).fill(3), Array(8).fill(.5), Array(8).fill("0"), [1, 0, 0, 0, 0, 0, 0, 0]]) {
    assert.equal(reserve.normalizeGameReserveV66({ ...legacy, deniedSupplies: invalid }), null);
  }
  const claimed = reserve.stepGameReserveV66(recovery());
  for (const corrupt of [
    state => { state.humans[1].recovering.bodyId = "reserve-unknown"; },
    state => { state.humans[1].recovering.ticks = 90; },
    state => { state.humans[1].recovering.ticks = 1; }, // still too far away to channel
    state => { state.humans[1].carrying = true; },
    state => { state.humans[0].carrying = false; },
    state => { Object.assign(state.humans[2], { x: 1000, hp: 70, status: "active", secured: false, downAt: null, recovering: { ...state.humans[1].recovering } }); },
  ]) {
    const invalid = structuredClone(claimed); corrupt(invalid);
    assert.equal(reserve.normalizeGameReserveV66(invalid), null);
  }
});

test("the notebook reveals cache stock only on the ground nearby and recovery intent only for visible contacts", () => {
  const initial = quiet(); initial.player.x = 720;
  const depleted = advance(initial, 120, { interact: true });
  let tactical = reserve.gameReserveTacticalV98(depleted);
  assert.equal(tactical.caches[0].remaining, 1);
  assert.equal(tactical.caches[0].denied, 1);
  assert(tactical.caches.slice(1).every(cache => cache.remaining === null));
  depleted.player.y = 292;
  tactical = reserve.gameReserveTacticalV98(depleted);
  assert.equal(tactical.caches[0].remaining, null);
  assert.equal(tactical.denied, 1, "the player's own neutralization remains remembered");
  const local = recovery(); local.player.x = 1100; local.humans[1].x = 1175;
  local.humans[1].recovering = { bodyId: local.humans[0].id, ticks: 20 };
  const contact = reserve.gameReserveTacticalV98(local).contacts.find(item => item.id === local.humans[1].id);
  assert.equal(contact.recovering, true);
  assert.equal(contact.name, "Combattant non identifié");
  assert.equal("bodyId" in contact, false);
  local.player.x = 430;
  assert.equal(reserve.gameReserveTacticalV98(local).contacts.length, 0);
  const html = homeworldSceneSsrV78().render("app/game/GameReserveTacticalV98.tsx", { state: depleted });
  assert.match(html, /Dépôts de composants/);
  assert.match(html, /data-reserve-cache="0" data-cache-inspected="false"/);
  assert.match(html, /réserve non inspectée/);
  assert.doesNotMatch(html, /NaN|undefined|Infinity|reserve-veyra|Veyra|Marek/);
});

test("the live renderer handles all cache target indices and uses the same duration as the accessible action", () => {
  const drawn = [];
  const context = new Proxy({ canvas: { width: 960, height: 540 }, measureText: text => ({ width: text.length * 7 }), fillText: value => drawn.push(value) }, {
    get(target, property) { return property in target ? target[property] : () => {}; },
  });
  const bank = Object.fromEntries(Object.keys(reserve.GAME_RESERVE_V66_ART).map(key => [key, { naturalWidth: 1536, naturalHeight: 1024 }]));
  for (const [index, x] of reserve.GAME_RESERVE_V66_SUPPLIES.entries()) {
    const state = quiet(); state.player.x = x; state.channel = { kind: "cache", target: index, ticks: 60 };
    const action = reserve.gameReserveTacticalV98(state).action;
    assert.equal(action.progress, .5); assert.equal(action.remaining, 1);
    reserve.drawGameReserveV66(context, state, bank);
  }
  assert(drawn.includes("Maintenir : neutraliser un lot (2 s)"));
});

test("V99 denial facts and an in-progress named recovery survive campaign imports, manual slots and integral archive roundtrips", async () => {
  const built = await build({ stdin: { contents: `
    export * from "./app/game/systems/campaignSlots";
    export * from "./app/game/systems/completeArchive";
    export { defaultSave, parseSaveImport, SAVE_STORAGE_KEY } from "./app/game/save";
  `, resolveDir: process.cwd(), loader: "ts" }, bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent" });
  const archive = await import("data:text/javascript;base64," + Buffer.from(built.outputFiles[0].text).toString("base64"));
  const state = recovery(); state.player.x = 720;
  const checkpoint = advance(state, 120, { interact: true });
  assert.equal(checkpoint.deniedSupplies[0], 1);
  assert(checkpoint.humans[1].recovering, "the survivor is still approaching the fallen carrier");
  const save = { ...archive.defaultSave("2026-10-20T10:00:00.000Z"), gameReserveV66: checkpoint };
  assert.deepEqual(archive.parseSaveImport(JSON.stringify(save)).save.gameReserveV66, checkpoint);
  const values = new Map([[archive.SAVE_STORAGE_KEY, JSON.stringify(save)]]);
  const disk = { get length() { return values.size; }, key: index => [...values.keys()][index] ?? null,
    getItem: key => values.get(key) ?? null, setItem: (key, raw) => values.set(key, raw), removeItem: key => values.delete(key) };
  const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator");
  Object.defineProperty(globalThis, "navigator", { configurable: true, value: { locks: { request: async (_name, _options, callback) => callback({}) } } });
  try {
    assert.equal((await archive.migrateLegacyCampaignSlot(disk)).ok, true);
    let slot = archive.loadCampaignSlots(disk).slots[0];
    const stored = await archive.saveCampaignCheckpoint(1, { kind: "manual", index: 1, expectedRevision: slot.revision, location: "game-reserve" }, disk);
    assert.equal(stored.ok, true, stored.message);
    slot = archive.loadCampaignSlots(disk).slots[0];
    const restored = await archive.activateCampaignCheckpoint(1, stored.checkpoint.id, { expectedRevision: slot.revision }, disk);
    assert.equal(restored.ok, true, restored.message);
    assert.deepEqual(restored.save.gameReserveV66, checkpoint);
    const exported = archive.createCompleteArchive(restored.save, disk);
    const decoded = archive.parseCompleteArchive(exported.serialized);
    assert(decoded.archive);
    assert.deepEqual(decoded.archive.campaign.gameReserveV66, checkpoint);
  } finally {
    if (previousNavigator) Object.defineProperty(globalThis, "navigator", previousNavigator);
    else delete globalThis.navigator;
  }
});
