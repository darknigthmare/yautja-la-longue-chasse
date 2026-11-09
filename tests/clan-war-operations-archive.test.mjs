import test from "node:test";
import assert from "node:assert/strict";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";

const bundle = await build({ stdin: { contents: [
  "export * from './app/game/systems/clanWarOperationsArchive';",
  "export * from './app/game/systems/clanWarOperationsV115';",
  "export * from './app/game/systems/clanWarBibleV6';",
  "export * from './app/game/systems/clanWarFenceV94';",
].join("\n"), resolveDir: fileURLToPath(new URL("../", import.meta.url)) }, bundle: true, write: false,
format: "esm", platform: "node", logLevel: "silent" });
const api = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64"));
const rules = api.DEFAULT_WAR_RULES_V6, key = api.WAR_OPERATIONS_STORAGE_V115;
const legacyKey = api.WAR_OPERATIONS_LEGACY_STORAGE_V115;
function fixture(raw = null) {
  const data = new Map([["yautja-long-hunt.save", "protected campaign"]]);
  if (raw !== null) data.set(key, raw);
  const writes = [], records = new Map(); let serial = 0;
  const storage = { getItem: k => data.get(k) ?? null, setItem(k, v) { writes.push([k, v]); data.set(k, v); } };
  const fence = {
    async read(k) { return structuredClone(records.get(k) ?? null); },
    async reserve(k, expected, before, after) {
      if (JSON.stringify(records.get(k) ?? null) !== JSON.stringify(expected)) throw new api.WarFenceErrorV94("conflict");
      const record = { version: 1, token: String(++serial), before, after, phase: "intent" };
      records.set(k, record); return structuredClone(record);
    },
    async confirm(k, expected) {
      if (JSON.stringify(records.get(k)) !== JSON.stringify(expected)) throw new api.WarFenceErrorV94("conflict");
      const record = { ...expected, phase: "confirmed" }; records.set(k, record); return structuredClone(record);
    },
  };
  return { storage, fence, writes, records, data };
}
const initial = () => api.createWarOperationsV115(rules);
function launch() {
  const state = initial(), team = state.teams[0].id;
  const target = rules.territories.find(t => api.warMissionEligibleV115(state, rules, t.id, [team]) === null);
  assert.ok(target);
  const result = api.beginWarOperationV115(state, "rts", target.id, [team], rules, 1000);
  assert.equal(result.accepted, true, result.message); return result.state;
}
const read = f => api.readWarOperationsArchive(f.storage, rules, f.fence);
const write = (f, baseline, state) => api.writeWarOperationsArchive(f.storage, rules, f.fence, baseline, state);
const repair = (f, baseline) => api.repairWarOperationsArchive(f.storage, rules, f.fence, baseline);

test("canonical V115 is read-only on load; empty archives never write defaults or campaign bytes", async () => {
  for (const raw of [null, JSON.stringify(initial())]) {
    const f = fixture(raw), loaded = await read(f);
    assert.equal(loaded.status, "ready"); assert.equal(loaded.baseline.raw, raw);
    assert.deepEqual(loaded.state, raw === null ? null : initial());
    assert.equal(f.records.size, 0); assert.deepEqual(f.writes, []);
    assert.equal(f.data.get("yautja-long-hunt.save"), "protected campaign");
  }
});
test("RAV and mission identity are confirmed together after a durable intent and exact readback", async () => {
  const f = fixture(), loaded = await read(f), state = launch();
  const result = await write(f, loaded.baseline, state);
  assert.equal(result.status, "committed"); assert.equal(result.baseline.fence.phase, "confirmed");
  assert.deepEqual(api.readWarOperationsV115(f.data.get(key), rules), state);
  assert.equal(f.writes.length, 1); assert.deepEqual([...f.records.keys()], [key]);
  assert.equal(f.data.get("yautja-long-hunt.save"), "protected campaign");
  assert.equal((await read(f)).status, "ready");
});
test("two renderers with stale localStorage caches cannot both commit the same fenced predecessor", async () => {
  const f = fixture(), one = await read(f), two = await read(f);
  const state = launch(); assert.equal((await write(f, one.baseline, state)).status, "committed");
  const stale = { ...f, storage: { getItem: () => null, setItem: f.storage.setItem } };
  assert.equal((await write(stale, two.baseline, state)).status, "conflict");
  assert.equal(f.writes.length, 1); assert.deepEqual(api.readWarOperationsV115(f.data.get(key), rules), state);
});
test("silent mirror-write failure keeps an intent and explicit repair resumes without charging twice", async () => {
  const f = fixture(JSON.stringify(initial())), loaded = await read(f), state = launch();
  const setter = f.storage.setItem; f.storage.setItem = () => {};
  const result = await write(f, loaded.baseline, state);
  assert.equal(result.status, "recovery"); assert.equal(f.data.get(key), loaded.baseline.raw);
  const reopened = await read(f); assert.equal(reopened.status, "recovery"); assert.deepEqual(reopened.state, state);
  assert.equal(f.writes.length, 0); f.storage.setItem = setter;
  const restored = await repair(f, reopened.baseline); assert.equal(restored.status, "committed");
  assert.equal(JSON.parse(f.data.get(key)).rav, state.rav); assert.equal(JSON.parse(f.data.get(key)).serial, 1);
  assert.equal(f.writes.length, 1); assert.equal((await read(f)).status, "ready");
});
test("a setter that persists then throws is acknowledged only after successful readback and fence confirmation", async () => {
  const f = fixture(), loaded = await read(f), state = launch(), setter = f.storage.setItem;
  f.storage.setItem = (k, v) => { setter(k, v); throw new Error("after write"); };
  assert.equal((await write(f, loaded.baseline, state)).status, "committed");
  assert.equal(f.records.get(key).phase, "confirmed"); assert.equal(f.writes.length, 1);
});
test("crash after mirror but before confirmation is read-only on reload, then repair does not rewrite or replay", async () => {
  const f = fixture(), loaded = await read(f), state = launch(), confirm = f.fence.confirm;
  f.fence.confirm = async () => { throw new Error("IDB interrupted"); };
  assert.equal((await write(f, loaded.baseline, state)).status, "recovery");
  const reopened = await read(f); assert.equal(reopened.status, "recovery"); assert.deepEqual(reopened.state, state);
  assert.equal(f.writes.length, 1); f.fence.confirm = confirm;
  assert.equal((await repair(f, reopened.baseline)).status, "committed");
  assert.equal(f.writes.length, 1); assert.equal(f.records.get(key).phase, "confirmed");
});
test("a newer or foreign mirror is never overwritten by repair or reset", async () => {
  const f = fixture(), loaded = await read(f), state = launch();
  f.storage.setItem = () => {};
  const pending = await write(f, loaded.baseline, state); assert.equal(pending.status, "recovery");
  const foreign = JSON.stringify({ version: 999, protected: "foreign" }); f.data.set(key, foreign);
  assert.equal((await repair(f, pending.baseline)).status, "conflict");
  assert.equal((await write(f, pending.baseline, initial())).status, "incompatible");
  assert.equal(f.data.get(key), foreign); assert.equal(f.writes.length, 0);
});
test("malformed and future V115 archives and intents are retained without writes", async () => {
  for (const raw of ["", "{broken", JSON.stringify({ ...initial(), version: 999 })]) {
    const f = fixture(raw); assert.equal((await read(f)).status, "incompatible");
    assert.equal(f.data.get(key), raw); assert.equal(f.writes.length, 0); assert.equal(f.records.size, 0);
  }
  const f = fixture(); f.records.set(key, { version: 1, token: "pending", before: null, after: "{future", phase: "intent" });
  assert.equal((await read(f)).status, "incompatible"); assert.deepEqual(f.writes, []);
});
test("denied IDB or denied storage fails closed instead of falling back to an unsafe mirror", async () => {
  const f = fixture(); f.fence.read = async () => { throw new Error("denied IDB"); };
  assert.equal((await read(f)).status, "unavailable"); assert.deepEqual(f.writes, []);
  f.storage.getItem = () => { throw new Error("denied storage"); };
  assert.equal((await read(f)).status, "unavailable"); assert.deepEqual(f.writes, []);
});
test("an invalid next state never reserves an intent or writes an archive", async () => {
  const f = fixture(), loaded = await read(f);
  assert.equal((await write(f, loaded.baseline, { ...initial(), version: 999 })).status, "incompatible");
  assert.equal(f.records.size, 0); assert.deepEqual(f.writes, []);
});
test("changes while hydration yields are detected before adopting or announcing an archive", async () => {
  const f = fixture(), raw = JSON.stringify(launch()), reader = f.fence.read;
  f.fence.read = async k => { const record = await reader(k); f.data.set(key, raw); return record; };
  assert.equal((await read(f)).status, "conflict"); assert.equal(f.data.get(key), raw); assert.deepEqual(f.writes, []);
});
test("a foreign write after intent reservation or during confirmation never receives success", async () => {
  for (const stage of ["reserve", "confirm"]) {
    const f = fixture(), loaded = await read(f), foreign = JSON.stringify(initial());
    const operation = f.fence[stage];
    f.fence[stage] = async (...args) => { const record = await operation(...args); f.data.set(key, foreign); return record; };
    assert.equal((await write(f, loaded.baseline, launch())).status, "conflict");
    assert.equal(f.data.get(key), foreign);
  }
});
test("repair refuses a superseded transaction token even when the visible mirror is unchanged", async () => {
  const f = fixture(), loaded = await read(f); f.storage.setItem = () => {};
  const pending = await write(f, loaded.baseline, launch()); assert.equal(pending.status, "recovery");
  f.records.set(key, { ...f.records.get(key), token: "different-session" });
  assert.equal((await repair(f, pending.baseline)).status, "conflict"); assert.deepEqual(f.writes, []);
});

test("an understood legacy exercise is shown for explicit adoption without a canonical write or default reset", async () => {
  const f = fixture(), legacy = JSON.stringify(launch()); f.data.set(legacyKey, legacy);
  const loaded = await read(f);
  assert.equal(loaded.status, "legacy-available"); assert.equal(loaded.legacy.raw, legacy);
  assert.deepEqual(loaded.state, launch()); assert.equal(f.data.get(key), undefined);
  assert.equal((await write(f, loaded.baseline, initial())).status, "incompatible", "ordinary operations cannot bypass adoption");
  assert.deepEqual(f.writes, []); assert.equal(f.records.size, 0); assert.equal(f.data.get(legacyKey), legacy);
});

test("explicit adoption copies the exact legacy state once and never writes or deletes its source", async () => {
  const f = fixture(), state = launch(), legacy = JSON.stringify(state); f.data.set(legacyKey, legacy);
  const loaded = await read(f), adopted = await api.adoptWarOperationsLegacyArchive(f.storage, rules, f.fence, loaded.baseline, loaded.legacy);
  assert.equal(adopted.status, "committed"); assert.equal(f.data.get(key), legacy); assert.equal(f.data.get(legacyKey), legacy);
  assert.deepEqual(f.writes, [[key, legacy]]); assert.deepEqual([...f.records.keys()], [key]);
  assert.equal(JSON.parse(f.data.get(key)).rav, state.rav); assert.equal(JSON.parse(f.data.get(key)).serial, state.serial);
  assert.equal((await api.adoptWarOperationsLegacyArchive(f.storage, rules, f.fence, loaded.baseline, loaded.legacy)).status, "conflict");
  assert.equal(f.writes.length, 1);
});

test("non-cooperating old writers can change their legacy key after adoption while canonical progress continues independently", async () => {
  const f = fixture(), state = launch(); f.data.set(legacyKey, JSON.stringify(state));
  const loaded = await read(f), adopted = await api.adoptWarOperationsLegacyArchive(f.storage, rules, f.fence, loaded.baseline, loaded.legacy);
  const canonical = f.data.get(key), token = f.records.get(key).token;
  f.data.set(legacyKey, JSON.stringify(initial())); // The old client knows only its original key.
  const current = await read(f); assert.equal(current.status, "ready"); assert.deepEqual(current.state, state);
  assert.equal(f.data.get(key), canonical); assert.equal(f.records.get(key).token, token);
  const enabled = api.toggleWarRtsRealtimeV115(current.state, true); assert.equal(enabled.accepted, true);
  const ticked = api.stepWarRtsRealtimeV115(enabled.state, rules); assert.equal(ticked.accepted, true);
  const next = await write(f, adopted.baseline, ticked.state); assert.equal(next.status, "committed");
  assert.equal(JSON.parse(f.data.get(key)).rav, state.rav); assert.equal(JSON.parse(f.data.get(key)).serial, 1);
  assert.equal(JSON.parse(f.data.get(legacyKey)).serial, 0); assert.ok(f.writes.every(([k]) => k === key));
});

test("a legacy exercise appearing after an empty load blocks the first canonical operation instead of silently forking", async () => {
  const f = fixture(), loaded = await read(f), legacy = JSON.stringify(launch()); f.data.set(legacyKey, legacy);
  assert.equal((await write(f, loaded.baseline, launch())).status, "conflict");
  assert.equal(f.data.get(key), undefined); assert.equal(f.records.size, 0); assert.deepEqual(f.writes, []);
  assert.equal((await read(f)).status, "legacy-available"); assert.equal(f.data.get(legacyKey), legacy);
});

test("a stale legacy snapshot cannot be adopted after its mirror changes or another new client creates the canonical exercise", async () => {
  for (const stage of ["legacy", "canonical"]) {
    const f = fixture(); f.data.set(legacyKey, JSON.stringify(launch())); const loaded = await read(f);
    if (stage === "legacy") f.data.set(legacyKey, JSON.stringify(initial()));
    else f.data.set(key, JSON.stringify(initial()));
    const saved = [...f.data];
    assert.equal((await api.adoptWarOperationsLegacyArchive(f.storage, rules, f.fence, loaded.baseline, loaded.legacy)).status, "conflict");
    assert.deepEqual([...f.data], saved); assert.deepEqual(f.writes, []); assert.equal(f.records.size, 0);
  }
});

test("a stable confirmed legacy fence is copied without changing that record or charging another upkeep", async () => {
  const f = fixture(), legacy = JSON.stringify(launch()); f.data.set(legacyKey, legacy);
  const oldFence = { version: 1, token: "old-confirmed", before: null, after: legacy, phase: "confirmed" }; f.records.set(legacyKey, oldFence);
  const loaded = await read(f); assert.equal(loaded.status, "legacy-available");
  const adopted = await api.adoptWarOperationsLegacyArchive(f.storage, rules, f.fence, loaded.baseline, loaded.legacy);
  assert.equal(adopted.status, "committed"); assert.deepEqual(f.records.get(legacyKey), oldFence);
  assert.equal(f.data.get(legacyKey), legacy); assert.equal(f.data.get(key), legacy);
  assert.equal(f.writes.length, 1); assert.equal(f.writes[0][0], key);
});

test("unconfirmed legacy intentions fail closed and export both original versions without choosing a progression", async () => {
  const before = JSON.stringify(initial()), after = JSON.stringify(launch());
  for (const mirror of [null, before, after]) {
    const f = fixture(); if (mirror !== null) f.data.set(legacyKey, mirror);
    const oldFence = { version: 1, token: "old-interrupted", before, after, phase: "intent" }; f.records.set(legacyKey, oldFence);
    const loaded = await read(f); assert.equal(loaded.status, "legacy-blocked"); assert.equal(loaded.state, null);
    const recovered = JSON.parse(api.exportWarOperationsLegacyArchive(loaded.legacy));
    assert.equal(recovered.mirror, mirror); assert.deepEqual(recovered.fence, oldFence);
    assert.equal(recovered.legacyKey, legacyKey); assert.equal(recovered.canonicalKey, key);
    assert.equal((await api.adoptWarOperationsLegacyArchive(f.storage, rules, f.fence, loaded.baseline, loaded.legacy)).status, mirror === null ? "incompatible" : "conflict");
    assert.equal(f.data.get(key), undefined); assert.deepEqual(f.records.get(legacyKey), oldFence); assert.deepEqual(f.writes, []);
  }
});

test("divergent, corrupt and future legacy mirrors are preserved for recovery instead of being reset or auto-adopted", async () => {
  const after = JSON.stringify(launch());
  for (const mirror of [JSON.stringify(initial()), "{corrupt", JSON.stringify({ ...launch(), version: 999 })]) {
    const f = fixture(); f.data.set(legacyKey, mirror);
    const oldFence = { version: 1, token: "different-progress", before: null, after, phase: "confirmed" }; f.records.set(legacyKey, oldFence);
    const loaded = await read(f); assert.equal(loaded.status, "legacy-blocked"); assert.equal(loaded.state, null);
    const recovery = JSON.parse(api.exportWarOperationsLegacyArchive(loaded.legacy));
    assert.equal(recovery.mirror, mirror); assert.equal(recovery.fence.after, after);
    const result = await api.adoptWarOperationsLegacyArchive(f.storage, rules, f.fence, loaded.baseline, loaded.legacy);
    assert.ok(["conflict", "incompatible"].includes(result.status));
    assert.equal(f.data.get(legacyKey), mirror); assert.equal(f.data.get(key), undefined); assert.deepEqual(f.writes, []);
  }
});

test("an established canonical exercise does not consult a broken or unavailable legacy archive", async () => {
  const canonical = JSON.stringify(launch()), f = fixture(canonical), readFence = f.fence.read;
  f.data.set(legacyKey, "{old-corrupt");
  f.fence.read = async k => { assert.equal(k, key, "legacy is no longer authoritative"); return readFence(k); };
  const loaded = await read(f); assert.equal(loaded.status, "ready"); assert.equal(loaded.baseline.raw, canonical);
  assert.deepEqual(loaded.state, launch()); assert.deepEqual(f.writes, []);
});

test("recovery export preserves both observations when a legacy writer changes its bytes during the native fence read", async () => {
  const f = fixture(), before = JSON.stringify(initial()), after = JSON.stringify(launch()), reader = f.fence.read;
  f.data.set(legacyKey, before);
  f.fence.read = async k => { const record = await reader(k); if (k === legacyKey) f.data.set(legacyKey, after); return record; };
  const loaded = await read(f); assert.equal(loaded.status, "legacy-blocked");
  const recovered = JSON.parse(api.exportWarOperationsLegacyArchive(loaded.legacy));
  assert.equal(recovered.mirror, before); assert.equal(recovered.mirrorAfterFenceRead, after);
  assert.equal(f.data.get(legacyKey), after); assert.deepEqual(f.writes, []);
});

test("an interrupted explicit adoption keeps canonical intent and old source recoverable without replaying launch", async () => {
  const f = fixture(), legacy = JSON.stringify(launch()); f.data.set(legacyKey, legacy);
  const loaded = await read(f), confirm = f.fence.confirm;
  f.fence.confirm = async () => { throw new Error("interrupted canonical adoption confirmation"); };
  const pending = await api.adoptWarOperationsLegacyArchive(f.storage, rules, f.fence, loaded.baseline, loaded.legacy);
  assert.equal(pending.status, "recovery"); assert.equal(f.data.get(key), legacy); assert.equal(f.data.get(legacyKey), legacy);
  const reopened = await read(f); assert.equal(reopened.status, "recovery"); assert.deepEqual(reopened.state, launch());
  f.fence.confirm = confirm; assert.equal((await repair(f, reopened.baseline)).status, "committed");
  assert.equal(f.writes.length, 1); assert.equal(f.writes[0][0], key); assert.equal(f.data.get(legacyKey), legacy);
});

test("adoption preserves the explicitly chosen snapshot and a legacy update racing the canonical reservation as separate recoverable versions", async () => {
  const f = fixture(), chosen = JSON.stringify(launch()), later = JSON.stringify(initial()); f.data.set(legacyKey, chosen);
  const loaded = await read(f), reserve = f.fence.reserve;
  f.fence.reserve = async (...args) => { const record = await reserve(...args); f.data.set(legacyKey, later); return record; };
  const result = await api.adoptWarOperationsLegacyArchive(f.storage, rules, f.fence, loaded.baseline, loaded.legacy);
  assert.equal(result.status, "committed"); assert.equal(f.data.get(key), chosen); assert.equal(f.data.get(legacyKey), later);
  assert.ok(f.writes.every(([k]) => k === key));
  const recoverable = await api.snapshotWarOperationsLegacyArchive(f.storage, f.fence);
  assert.equal(JSON.parse(api.exportWarOperationsLegacyArchive(recoverable)).mirror, later);
  assert.equal((await read(f)).baseline.raw, chosen, "canonical authority is independent after explicit snapshot adoption");
});
