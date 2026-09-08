import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { build, transform } from "esbuild";

const bundled = await build({
  entryPoints: [fileURLToPath(new URL("../app/game/save.ts", import.meta.url))],
  bundle: true, write: false, format: "esm", platform: "node", logLevel: "silent",
});
const api = await import(`data:text/javascript;base64,${Buffer.from(bundled.outputFiles[0].text).toString("base64")}`);
const { defaultSave, writeSaveWithStatus, replaceSaveWithStatus, reconcileSaveWrite, loadSaveWithStatus } = api;
const key = "social-reconciliation";
const owner = "2026-09-08T12:00:00.000Z";

function memoryStorage() {
  const values = new Map();
  const faults = { readback: false, quota: false, drop: false, reads: 0 };
  let primaryWrites = 0;
  const storage = {
    values, faults,
    get primaryWrites() { return primaryWrites; },
    getItem(name) {
      if (name === key && faults.reads > 0) { faults.reads -= 1; throw new Error("temporary read denial"); }
      return values.get(name) ?? null;
    },
    setItem(name, value) {
      if (name === key) {
        if (faults.quota) throw new DOMException("Full", "QuotaExceededError");
        if (faults.drop) return;
        primaryWrites += 1;
      }
      values.set(name, value);
      if (name === key && faults.readback) { faults.readback = false; faults.reads = 1; }
    },
    removeItem(name) { values.delete(name); },
  };
  return storage;
}
function setup() {
  const storage = memoryStorage();
  const initial = writeSaveWithStatus(defaultSave(owner), storage, key).save;
  const next = { ...initial, homeworld: { ...initial.homeworld, evidenceIds: ["suspect-trophy"] } };
  return { storage, initial, next };
}
function uncertain({ storage, next }) {
  storage.faults.readback = true;
  const attempt = writeSaveWithStatus(next, storage, key);
  assert.equal(attempt.persisted, false);
  assert.equal(attempt.failure, "write-failed");
  return attempt;
}

test("an unconfirmed exact primary is acknowledged without another write and its observation advances", () => {
  const scenario = setup();
  const attempt = uncertain(scenario);
  const before = [...scenario.storage.values];
  const writes = scenario.storage.primaryWrites;
  const recovered = reconcileSaveWrite(attempt, owner, scenario.storage, key);
  assert.equal(recovered.status, "confirmed");
  assert.deepEqual(recovered.save, attempt.save);
  assert.deepEqual([...scenario.storage.values], before);
  assert.equal(scenario.storage.primaryWrites, writes);
  const next = { ...recovered.save, homeworld: { ...recovered.save.homeworld, visitedDistrictIds: ["port"] } };
  assert.equal(writeSaveWithStatus(next, scenario.storage, key).persisted, true);
  assert.deepEqual(loadSaveWithStatus(scenario.storage, key).save.homeworld.evidenceIds, ["suspect-trophy"]);
});

test("quota failure and a silently dropped write permit retry only while the original bytes remain", () => {
  for (const fault of ["quota", "drop"]) {
    const scenario = setup();
    const before = [...scenario.storage.values];
    scenario.storage.faults[fault] = true;
    const attempt = writeSaveWithStatus(scenario.next, scenario.storage, key);
    assert.equal(attempt.failure, "write-failed");
    scenario.storage.faults[fault] = false;
    assert.equal(reconcileSaveWrite(attempt, owner, scenario.storage, key).status, "retry");
    assert.deepEqual([...scenario.storage.values], before);
    assert.equal(writeSaveWithStatus(scenario.next, scenario.storage, key).persisted, true);
  }
});

test("a temporary reconciliation read denial retains the receipt for a later retry", () => {
  const scenario = setup();
  const attempt = uncertain(scenario);
  scenario.storage.faults.reads = 1;
  assert.equal(reconcileSaveWrite(attempt, owner, scenario.storage, key).failure, "read-failed");
  assert.equal(reconcileSaveWrite(attempt, owner, scenario.storage, key).status, "confirmed");
});

test("a different primary from the same owner remains a conflict and does not refresh observation", () => {
  const scenario = setup();
  const attempt = uncertain(scenario);
  const external = JSON.stringify({ ...attempt.save, profile: { ...attempt.save.profile, clanMarks: 900 } });
  scenario.storage.values.set(key, external);
  const before = [...scenario.storage.values];
  assert.equal(reconcileSaveWrite(attempt, owner, scenario.storage, key).failure, "save-conflict");
  assert.equal(writeSaveWithStatus(scenario.next, scenario.storage, key).failure, "save-conflict");
  assert.deepEqual([...scenario.storage.values], before);
});

test("equivalent parsed data with different bytes cannot be mistaken for the attempted write", () => {
  const scenario = setup();
  const attempt = uncertain(scenario);
  const differentBytes = JSON.stringify(JSON.parse(scenario.storage.values.get(key)), null, 2);
  scenario.storage.values.set(key, differentBytes);
  assert.equal(reconcileSaveWrite(attempt, owner, scenario.storage, key).failure, "save-conflict");
  assert.equal(scenario.storage.values.get(key), differentBytes);
});

test("a foreign owner, storage key or storage instance cannot use an old receipt", () => {
  const scenario = setup();
  const attempt = uncertain(scenario);
  const before = [...scenario.storage.values];
  assert.equal(reconcileSaveWrite(attempt, "2026-09-09T12:00:00.000Z", scenario.storage, key).failure, "save-conflict");
  assert.equal(reconcileSaveWrite(attempt, owner, scenario.storage, "other").failure, "save-conflict");
  const otherStorage = memoryStorage();
  otherStorage.values.set(key, scenario.storage.values.get(key));
  assert.equal(reconcileSaveWrite(attempt, owner, otherStorage, key).failure, "save-conflict");
  assert.deepEqual([...scenario.storage.values], before);
  assert.equal(reconcileSaveWrite(attempt, owner, scenario.storage, key).status, "confirmed");
});

test("a replaced campaign cannot be adopted or overwritten by the previous owner's receipt", () => {
  const scenario = setup();
  const attempt = uncertain(scenario);
  const replacement = replaceSaveWithStatus(defaultSave("2026-09-09T12:00:00.000Z"), scenario.storage, key);
  assert.equal(replacement.persisted, true);
  const before = [...scenario.storage.values];
  assert.equal(reconcileSaveWrite(attempt, owner, scenario.storage, key).failure, "save-conflict");
  assert.equal(reconcileSaveWrite(attempt, replacement.save.createdAt, scenario.storage, key).failure, "save-conflict");
  assert.equal(writeSaveWithStatus(scenario.next, scenario.storage, key).failure, "save-conflict");
  assert.deepEqual([...scenario.storage.values], before);
});

test("a newer local observation cannot be rewound even if the old attempted bytes reappear", () => {
  const scenario = setup();
  const attempt = uncertain(scenario);
  const attemptedBytes = scenario.storage.values.get(key);
  const newer = JSON.stringify({ ...attempt.save, profile: { ...attempt.save.profile, clanMarks: 901 } });
  scenario.storage.values.set(key, newer);
  loadSaveWithStatus(scenario.storage, key);
  scenario.storage.values.set(key, attemptedBytes);
  assert.equal(reconcileSaveWrite(attempt, owner, scenario.storage, key).failure, "save-conflict");
  assert.equal(writeSaveWithStatus(scenario.next, scenario.storage, key).failure, "save-conflict");
});

test("caller mutation or a fabricated result cannot change the private attempted bytes", () => {
  const scenario = setup();
  const attempt = uncertain(scenario);
  const forged = { ...attempt };
  assert.equal(reconcileSaveWrite(forged, owner, scenario.storage, key).failure, "save-conflict");
  attempt.save.homeworld.evidenceIds.push("memory-register");
  const recovered = reconcileSaveWrite(attempt, owner, scenario.storage, key);
  assert.equal(recovered.status, "confirmed");
  assert.deepEqual(recovered.save.homeworld.evidenceIds, ["suspect-trophy"]);
  assert.equal(reconcileSaveWrite(attempt, owner, scenario.storage, key).failure, "save-conflict");
});

// Execute the real GameClient callback in a small hook/ref harness. The storage
// model above is not a copy of the component's retry or acknowledgement logic.
const client = await readFile(new URL("../app/game/GameClient.tsx", import.meta.url), "utf8");
const start = client.indexOf("  const pendingSocialWriteRef =");
const end = client.indexOf("  const persistHomeworldProgress =", start);
assert.ok(start > 0 && end > start, "GameClient social callback remains available for integration testing");
const harnessSource = `
export function mount(initial, api, storage, key) {
  const saveRef = { current: initial };
  let rendered = initial, failure = null, toast = "";
  const useRef = current => ({ current });
  const useCallback = callback => callback;
  const pendingTerminalRunRef = { current: null };
  const activeHuntSessionRef = { current: null };
  const isExplorationMission = () => false;
  const explorationWriteFailure = () => null;
  const reconcileHuntWrite = () => null;
  const setSave = next => { rendered = next; };
  const setSaveFailure = next => { failure = next; };
  const setToast = next => { toast = next; };
  const writeSaveWithStatus = next => api.writeSaveWithStatus(next, storage, key);
  const reconcileSaveWrite = (attempt, owner) => api.reconcileSaveWrite(attempt, owner, storage, key);
  ${client.slice(start, end)}
  return {
    act: persistSocialProgress,
    get save() { return saveRef.current; }, get rendered() { return rendered; },
    get failure() { return failure; }, get toast() { return toast; },
    replaceLocal(next) { saveRef.current = next; rendered = next; },
  };
}`;
const harnessJs = await transform(harnessSource, { loader: "ts", format: "esm", target: "es2022" });
const { mount } = await import(`data:text/javascript;base64,${Buffer.from(harnessJs.code).toString("base64")}`);

test("GameClient retries the identical city choice without duplicating it or changing inventory", () => {
  const scenario = setup();
  const component = mount(scenario.initial, api, scenario.storage, key);
  const inventory = structuredClone(scenario.initial.inventory);
  const update = { homeworld: scenario.next.homeworld };
  scenario.storage.faults.readback = true;
  assert.equal(component.act(update), false);
  assert.deepEqual(component.save.homeworld.evidenceIds, []);
  assert.equal(component.failure, "write-failed");
  const writes = scenario.storage.primaryWrites;
  assert.equal(component.act(structuredClone(update)), true);
  assert.equal(component.failure, null);
  assert.equal(scenario.storage.primaryWrites, writes);
  assert.deepEqual(component.save.homeworld.evidenceIds, ["suspect-trophy"]);
  assert.deepEqual(component.rendered.homeworld, component.save.homeworld);
  assert.deepEqual(component.save.inventory, inventory);
});

test("GameClient refreshes then rejects a different stale action before it can erase the confirmed one", () => {
  const scenario = setup();
  const component = mount(scenario.initial, api, scenario.storage, key);
  scenario.storage.faults.readback = true;
  assert.equal(component.act({ homeworld: scenario.next.homeworld }), false);
  const staleVisit = { ...scenario.initial.homeworld, visitedDistrictIds: ["port"] };
  const before = scenario.storage.values.get(key);
  assert.equal(component.act({ homeworld: staleVisit }), false);
  assert.equal(scenario.storage.values.get(key), before);
  assert.deepEqual(component.save.homeworld.evidenceIds, ["suspect-trophy"]);
  assert.deepEqual(component.save.homeworld.visitedDistrictIds, []);
  assert.match(component.toast, /Réessaie.*actualisé/);
  const recomputed = { ...component.save.homeworld, visitedDistrictIds: ["port"] };
  assert.equal(component.act({ homeworld: recomputed }), true);
  assert.deepEqual(component.save.homeworld.evidenceIds, ["suspect-trophy"]);
  assert.deepEqual(component.save.homeworld.visitedDistrictIds, ["port"]);
});

test("GameClient also requires a fresh action when a different social subsystem triggered recovery", () => {
  const scenario = setup();
  const component = mount(scenario.initial, api, scenario.storage, key);
  scenario.storage.faults.readback = true;
  assert.equal(component.act({ homeworld: scenario.next.homeworld }), false);
  const justice = { ...scenario.initial.justice, originChoice: "rupture", declaration: "exiled" };
  assert.equal(component.act({ justice }), false);
  assert.equal(component.save.justice.originChoice, null);
  assert.deepEqual(component.save.homeworld.evidenceIds, ["suspect-trophy"]);
  assert.equal(component.act({ justice }), true);
  assert.equal(component.save.justice.originChoice, "rupture");
  assert.deepEqual(component.save.homeworld.evidenceIds, ["suspect-trophy"]);
});

test("GameClient retries quota failures and continues to refuse a genuinely concurrent writer", () => {
  for (const concurrent of [false, true]) {
    const scenario = setup();
    const component = mount(scenario.initial, api, scenario.storage, key);
    scenario.storage.faults.quota = true;
    assert.equal(component.act({ homeworld: scenario.next.homeworld }), false);
    scenario.storage.faults.quota = false;
    if (concurrent) scenario.storage.values.set(key, JSON.stringify({ ...scenario.initial, updatedAt: "2099-01-01T00:00:00.000Z" }));
    const before = scenario.storage.values.get(key);
    assert.equal(component.act({ homeworld: scenario.next.homeworld }), !concurrent);
    if (concurrent) {
      assert.equal(component.failure, "save-conflict");
      assert.equal(scenario.storage.values.get(key), before);
      assert.deepEqual(component.save.homeworld.evidenceIds, []);
    }
  }
});

test("GameClient drops an old owner's pending receipt without rolling a replacement back", () => {
  const scenario = setup();
  const component = mount(scenario.initial, api, scenario.storage, key);
  scenario.storage.faults.readback = true;
  assert.equal(component.act({ homeworld: scenario.next.homeworld }), false);
  const replacement = replaceSaveWithStatus(defaultSave("2026-09-09T12:00:00.000Z"), scenario.storage, key).save;
  component.replaceLocal(replacement);
  const before = [...scenario.storage.values];
  const visit = { ...replacement.homeworld, visitedDistrictIds: ["port"] };
  assert.equal(component.act({ homeworld: visit }), false);
  assert.equal(component.save.createdAt, replacement.createdAt);
  assert.deepEqual([...scenario.storage.values], before);
  assert.equal(component.act({ homeworld: visit }), true);
  assert.equal(component.save.createdAt, replacement.createdAt);
  assert.deepEqual(component.save.homeworld.evidenceIds, []);
});
