import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

const bundle = await build({ stdin: { contents: "export * from './app/game/systems/clanWarSessionV85'; export * from './app/game/systems/clanWarV85'; export * from './app/game/systems/clanWarCanyonV85';", resolveDir: fileURLToPath(new URL("../", import.meta.url)) }, bundle: true, write: false, format: "esm", platform: "node", target: "es2022", logLevel: "silent" });
const api = await import(`data:text/javascript;base64,${Buffer.from(bundle.outputFiles[0].text).toString("base64")}`);
function storage(entries = []) { const data = new Map(entries); return { data, writes: [], full: false, getItem: key => data.get(key) ?? null, setItem(key, value) { if (this.full) throw new Error("Quota exceeded"); this.writes.push(key); data.set(key, value); } }; }

test("external store has a stable SSR snapshot and hydrates on subscription without writing defaults", () => {
  const saved = { ...api.createWarSimulationV85(), turn: 4 }, disk = storage([[api.WAR_STORAGE_KEY_V85, JSON.stringify(saved)]]);
  let accesses = 0, notified = 0;
  const session = api.createWarSessionV85(() => { accesses++; return disk; });
  const server = session.getServerSnapshot();
  assert.equal(accesses, 0); assert.equal(server.loaded, false); assert.strictEqual(server, session.getServerSnapshot());
  const unsubscribe = session.subscribe(() => { notified++; });
  assert.equal(session.getSnapshot().loaded, true); assert.equal(session.getSnapshot().simulation.turn, 4); assert.equal(notified, 1);
  assert.deepEqual(disk.writes, []); assert.strictEqual(session.getServerSnapshot(), server);
  assert.equal(server.simulation.turn, 1); unsubscribe();
  session.subscribe(() => {}); assert.equal(accesses, 1);
});

test("event updates use the latest snapshot and write only their dedicated free exercise key", () => {
  const disk = storage([["original-campaign", "untouched-by-war"]]), session = api.createWarSessionV85(() => disk);
  session.subscribe(() => {});
  session.setSimulation(current => ({ ...current, turn: current.turn + 1 }));
  session.setSimulation(current => ({ ...current, turn: current.turn + 1 }));
  assert.equal(session.getSnapshot().simulation.turn, 3); assert.deepEqual(disk.writes, [api.WAR_STORAGE_KEY_V85, api.WAR_STORAGE_KEY_V85]);
  session.setSelection(current => ({ ...current, "RTS-U01": 2 }));
  assert.equal(JSON.parse(disk.data.get(api.COMPOSITION_STORAGE_KEY_V85)).selection["RTS-U01"], 2);
  assert.equal(disk.data.get("original-campaign"), "untouched-by-war");
});

test("future and corrupt archives retain their exact bytes and forbid implicit writes", () => {
  const future = JSON.stringify({ ...api.createWarSimulationV85(), version: 2 }), corrupt = "{broken canyon", composition = JSON.stringify({ version: 8, context: "free", selection: {} });
  const disk = storage([[api.WAR_STORAGE_KEY_V85, future], [api.CANYON_STORAGE_KEY_V85, corrupt], [api.COMPOSITION_STORAGE_KEY_V85, composition]]);
  const session = api.createWarSessionV85(() => disk); session.subscribe(() => {});
  assert.equal(session.getSnapshot().writableWar, false); assert.equal(session.getSnapshot().writableCanyon, false); assert.equal(session.getSnapshot().writableComposition, false);
  session.setSimulation(current => ({ ...current, turn: 2 })); session.setCanyon(api.createCanyonV85("temporary-canyon")); session.setSelection({ "RTS-U01": 1 });
  assert.equal(disk.data.get(api.WAR_STORAGE_KEY_V85), future); assert.equal(disk.data.get(api.CANYON_STORAGE_KEY_V85), corrupt); assert.equal(disk.data.get(api.COMPOSITION_STORAGE_KEY_V85), composition); assert.deepEqual(disk.writes, []);
  assert.match(session.getSnapshot().storageMessage, /Korthas/); assert.match(session.getSnapshot().storageMessage, /canyon/);
});

test("an explicit reset unlocks only its archive; other incompatible bytes stay preserved", () => {
  const disk = storage([[api.WAR_STORAGE_KEY_V85, "future-war"], [api.CANYON_STORAGE_KEY_V85, "future-canyon"]]);
  const session = api.createWarSessionV85(() => disk); session.subscribe(() => {});
  session.setSimulation(api.createWarSimulationV85()); session.unlockWarAfterExplicitReset();
  assert.equal(JSON.parse(disk.data.get(api.WAR_STORAGE_KEY_V85)).version, 1);
  assert.equal(disk.data.get(api.CANYON_STORAGE_KEY_V85), "future-canyon"); assert.equal(session.getSnapshot().writableCanyon, false);
  assert.doesNotMatch(session.getSnapshot().storageMessage, /Korthas/); assert.match(session.getSnapshot().storageMessage, /canyon/);
});

test("quota failure keeps the current exercise in memory and preserves the previous archive", () => {
  const original = JSON.stringify(api.createWarSimulationV85()), disk = storage([[api.WAR_STORAGE_KEY_V85, original]]), session = api.createWarSessionV85(() => disk);
  session.subscribe(() => {}); disk.full = true;
  session.setSimulation(current => ({ ...current, turn: 2 }));
  assert.equal(session.getSnapshot().simulation.turn, 2); assert.equal(session.getSnapshot().writableWar, false);
  assert.equal(disk.data.get(api.WAR_STORAGE_KEY_V85), original); assert.match(session.getSnapshot().storageMessage, /mémoire/);
  disk.full = false; session.setSimulation(current => ({ ...current, turn: 3 }));
  assert.equal(disk.data.get(api.WAR_STORAGE_KEY_V85), original);
});

test("blocked browser storage leaves all exercises usable in memory without touching campaign data", () => {
  const session = api.createWarSessionV85(() => { throw new Error("Storage disabled"); });
  session.subscribe(() => {}); assert.equal(session.getSnapshot().loaded, true); assert.equal(session.getSnapshot().writableWar, false);
  session.setSimulation(current => ({ ...current, turn: 2 })); assert.equal(session.getSnapshot().simulation.turn, 2);
  session.setCanyon(api.createCanyonV85("memory-only")); assert.equal(session.getSnapshot().canyon.id, "memory-only");
  assert.match(session.getSnapshot().storageMessage, /indisponible/);
});
