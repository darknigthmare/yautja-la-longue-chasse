import assert from "node:assert/strict";
import test from "node:test";
import { admittedFirstShockO6, firstShock as n, walkFirstShockToO6 } from "./helpers/origin-first-shock-o6.mjs";

function saved(save) {
  const result = n.parseSaveImport(JSON.stringify(save));
  assert.equal(result.failure, null);
  return result.save;
}

function approachHarek(save) {
  const record = n.firstShockActiveO6(save);
  const net = walkFirstShockToO6(n.firstShockResumeX(record), record.netX);
  assert.equal(n.applyFirstShockO6(save, "reach-harek", n.FIRST_SHOCK_HAREK_O6), null);
  assert.equal(n.applyFirstShockO6(save, "retrieve", n.FIRST_SHOCK_HAREK_O6), null);
  const pickedUp = saved(n.applyFirstShockO6(save, "retrieve", net).save);
  const harek = walkFirstShockToO6(net, n.FIRST_SHOCK_HAREK_O6);
  assert.equal(n.applyFirstShockO6(pickedUp, "reach-harek", net), null);
  return { harek, save: saved(n.applyFirstShockO6(pickedUp, "reach-harek", harek).save) };
}

test("an actually completed O6 opening starts the episode once alongside the common receipt", () => {
  const { waiting, completed, receipt, state } = admittedFirstShockO6();
  assert.equal(n.firstShockActiveO6(waiting), null);
  const active = n.firstShockActiveO6(saved(completed));
  assert.deepEqual(active.journal, []);
  assert.equal(active.netX, n.nurseryOpeningNetX(state.opening));
  assert.equal(n.keepsFirstShockO6(waiting, completed), true);
  assert.equal(n.withNurseryCompletion(completed, receipt, state), completed);
  assert.equal(n.firstShockActiveO6(admittedFirstShockO6({ originId: "O2" }).completed), null);
  assert.equal(n.firstShockActiveO6(admittedFirstShockO6({ legacy: true }).completed), null);
  assert.equal(n.firstShockActiveO6(saved({ ...completed, originV151: n.createOriginV151("O6") })), null);
});

test("Harek hears the played reading and keeps only the learned transfer", () => {
  const { completed } = admittedFirstShockO6();
  const { save, harek } = approachHarek(completed);
  assert.deepEqual(n.firstShockActiveO6(save).observations, ["harek-cohort"]);
  assert.deepEqual(n.firstShockActiveO6(save).transfers, []);
  const heard = saved(n.applyFirstShockO6(save, "hear-harek", harek).save);
  const active = n.firstShockActiveO6(heard);
  assert.equal(active.choice, "listen-harek");
  assert.equal(active.resolved, true);
  assert.equal(active.success, true);
  assert.deepEqual(active.transfers, ["harek-lesson"]);
  const net = walkFirstShockToO6(harek, active.netX);
  const returned = saved(n.applyFirstShockO6(heard, "return-weapon", net).save);
  assert.equal(n.firstShockActiveO6(returned), null);
  assert.deepEqual(returned.prologue, completed.prologue);
  assert.deepEqual(returned.inventory, completed.inventory);
  assert.deepEqual(returned.statistics, completed.statistics);
});

test("Saar's missed support reopens the net, and reporting it is distinct from success", () => {
  const { completed } = admittedFirstShockO6();
  const { harek, save } = approachHarek(completed);
  const chosen = saved(n.applyFirstShockO6(save, "choose-saar", harek).save);
  const record = n.firstShockActiveO6(chosen);
  assert.equal(n.applyFirstShockO6(chosen, "postpone", record.netX + 12), null);
  const missed = n.applyFirstShockO6(chosen, "test-brace", record.netX + 12);
  const missedSave = saved(missed.save);
  const after = n.firstShockActiveO6(missedSave);
  assert.equal(n.firstShockResumeX(after), missed.retryAt);
  assert.equal(after.resolved, false);
  assert.equal(after.success, false);
  assert.deepEqual(after.transfers, []);
  assert.equal(n.applyFirstShockO6(missedSave, "test-brace", record.netX + 12).save, missedSave);
  const review = saved(n.applyFirstShockO6(missedSave, "test-brace", n.firstShockBraceX(after)).save);
  assert.deepEqual(n.firstShockActiveO6(review).transfers, ["saar-brace"]);
  assert.equal(n.firstShockActiveO6(review).success, true);
  const postponed = saved(n.applyFirstShockO6(missedSave, "postpone", record.netX + 12).save);
  assert.equal(n.firstShockActiveO6(postponed).resolved, true);
  assert.equal(n.firstShockActiveO6(postponed).success, false);
  assert.deepEqual(n.firstShockActiveO6(postponed).transfers, []);
  assert.deepEqual(postponed.prologue, completed.prologue);
});

test("foreign owners, future or fabricated receipts and lost progress are rejected", () => {
  const { completed } = admittedFirstShockO6();
  const { save, harek } = approachHarek(completed);
  const heard = n.applyFirstShockO6(save, "hear-harek", harek).save;
  const forged = structuredClone(heard);
  forged.originV151.firstShockO6.transfers.push("saar-brace");
  assert.equal(n.parseSaveImport(JSON.stringify(forged)).failure, "invalid-save");
  forged.originV151.firstShockO6 = { ...heard.originV151.firstShockO6, ownerCreatedAt: "2020-07-12T00:00:00.000Z" };
  assert.equal(n.parseSaveImport(JSON.stringify(forged)).failure, "invalid-save");
  forged.originV151.firstShockO6 = { ...heard.originV151.firstShockO6, version: 2 };
  assert.equal(n.parseSaveImport(JSON.stringify(forged)).failure, "future-version");
  assert.equal(n.keepsFirstShockO6(heard, save), false);
  assert.equal(n.keepsFirstShockO6(completed, heard), false);
});

test("the observed reading comes from Saar's actual intervention when the opening was assisted", () => {
  const { completed } = admittedFirstShockO6({ assist: true });
  const { save } = approachHarek(completed);
  assert.deepEqual(n.firstShockActiveO6(save).observations, ["harek-assistance"]);
  assert.deepEqual(n.firstShockActiveO6(save).transfers, []);
});

test("writing the actual prologue receipt and then the courtyard works across cold reloads", () => {
  const { waiting, completed } = admittedFirstShockO6();
  const items = new Map([[n.SAVE_STORAGE_KEY, JSON.stringify(waiting)]]);
  const storage = {
    getItem: key => items.get(key) ?? null,
    setItem: (key, value) => items.set(key, value),
    removeItem: key => items.delete(key),
  };
  assert.ok(n.loadSaveWithStatus(storage).loaded);
  assert.ok(n.writeSaveWithStatus(completed, storage).persisted);
  const staged = n.loadSaveWithStatus(storage).save;
  const state = n.firstShockActiveO6(staged);
  const played = n.applyFirstShockO6(staged, "retrieve", state.netX).save;
  assert.ok(n.writeSaveWithStatus(played, storage).persisted);
  assert.equal(n.firstShockCourtO6(n.firstShockActiveO6(n.loadSaveWithStatus(storage).save), state.netX).stage, "escort");
  assert.equal(n.writeSaveWithStatus(staged, storage).persisted, false);
});

test("an imported city or dojo save can only keep a completed courtyard departure", () => {
  const { completed } = admittedFirstShockO6();
  const previousOrigin = n.createOriginV151("O6");
  const legacyCity = { ...completed, originV151: previousOrigin,
    homeworld: { ...completed.homeworld, greetedNpcIds: ["hunt-king", "terrace-instructor"] } };
  const youth = n.startYouthCampaign(legacyCity);
  assert.ok(youth);
  assert.ok(saved(youth).youthTraining);
  const premature = { ...youth, originV151: completed.originV151 };
  assert.equal(n.parseSaveImport(JSON.stringify(premature)).failure, "invalid-save");

  const { save, harek } = approachHarek(completed);
  const heard = n.applyFirstShockO6(save, "hear-harek", harek).save;
  const state = n.firstShockActiveO6(heard);
  assert.equal(n.parseSaveImport(JSON.stringify({ ...youth, originV151: heard.originV151 })).failure, "invalid-save");
  const departed = n.applyFirstShockO6(heard, "return-weapon", state.netX).save;
  assert.ok(saved({ ...youth, originV151: departed.originV151 }).youthTraining);
});

test("the completed native nursery preserves M006 admission and starts only the explicit O6 episode", () => {
  const { waiting, completed } = admittedFirstShockO6({ ceremony: true });
  assert.equal(waiting.prologue.ceremonyM006, true);
  const after = saved(completed);
  assert.equal(after.prologue.ceremonyM006, true);
  assert.deepEqual(n.firstShockActiveO6(after).journal, []);
  const other = saved(admittedFirstShockO6({ originId: "O2", ceremony: true }).completed);
  assert.equal(other.prologue.ceremonyM006, true);
  assert.equal(n.firstShockActiveO6(other), null);
});
