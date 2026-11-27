import assert from "node:assert/strict";
import test from "node:test";
import { applyLittleTrailO6, littleTrailAdmissionO6, town, trail } from "./helpers/origin-little-trail-o6.mjs";

const route = trail.LITTLE_TRAIL_O6;
const latest = save => save.originV151.littleTrailO6;
const lower = (type, x, detail = {}) => ({ type, x, plane: "trail", ...detail });
const upper = (type, x, detail = {}) => ({ type, x, plane: "overlook", ...detail });
const first = lower("observe", route.first - 80);
const far = lower("observe", route.far - 80);
const pebble = lower("sample", route.pebble, { cue: "pebble" });
const rub = lower("sample", route.rub, { cue: "rub" });
const identify = lower("identify", route.rub, { cue: "rub" });
const climb = lower("ascend", route.climb);
const compare = upper("compare", route.gather);
const map = upper("report", route.gather, { choice: "map" });
const behavior = upper("report", route.gather, { choice: "behavior" });

test("Saar offers the lisière only after a real rival receipt at the same public station, including a partial result", () => {
  const activeRace = littleTrailAdmissionO6({ unresolved: true });
  const finishedRace = littleTrailAdmissionO6();
  const partial = littleTrailAdmissionO6({ partial: true });
  assert.equal(trail.beginLittleTrailO6(activeRace, activeRace.homeworld.locationV77), null);
  assert.equal(trail.beginLittleTrailO6(finishedRace, { ...finishedRace.homeworld.locationV77, levelId: "+1" }), null);
  const old = town.parseSaveImport(JSON.stringify(finishedRace));
  assert.equal(old.failure, null);
  assert.equal(latest(old.save), undefined);
  assert.deepEqual(latest(applyLittleTrailO6(finishedRace)).rival, { success: true, choice: "race", memory: "lead" });
  assert.deepEqual(latest(applyLittleTrailO6(partial)).rival, { success: false, choice: "warn", memory: "warning" });
});

test("Follow both stops, compare both physical audio sources and bring a map back on the upper plane", () => {
  const prior = littleTrailAdmissionO6({ nurseryPolicies: true });
  let save = [null, first, pebble].reduce(applyLittleTrailO6, prior);
  assert.equal(trail.playLittleTrailO6(save, identify), null);
  assert.equal(trail.playLittleTrailO6(save, pebble), null);
  assert.equal(trail.playLittleTrailO6(save, lower("sample", route.pebble, { cue: "rub" })), null);
  save = [rub, identify, far].reduce(applyLittleTrailO6, save);
  assert.deepEqual(latest(save).lastConfirmed, { point: "far", x: route.far });
  assert.equal(trail.playLittleTrailO6(save, compare), null);
  save = applyLittleTrailO6(save, climb);
  assert.equal(trail.littleTrailViewO6(latest(save)).plane, "overlook");
  assert.equal(trail.playLittleTrailO6(save, lower("compare", route.gather)), null);
  save = [compare, map].reduce(applyLittleTrailO6, save);
  assert.ok(latest(save).resolved && latest(save).success);
  assert.equal(latest(save).choice, "map");
  assert.deepEqual(latest(save).transfers, ["relevé-de-piste"]);
  assert.ok(latest(save).observations.includes("frottement-authentifié"));
  assert.ok(latest(save).observations.includes("retour-par-le-surplomb"));
  assert.deepEqual(save.originV151.rivalRaceO6, prior.originV151.rivalRaceO6);
  assert.equal(save.prologue.ceremonyM006, true);
  assert.equal(save.prologue.templeTriadFirstM017, true);
  assert.deepEqual(save.trophies, prior.trophies);
  assert.deepEqual(save.inventory, prior.inventory);
  assert.deepEqual(save.profile, prior.profile);
});

test("A startled grazer leaves the last witnessed stop durable and opens a physical older-track recovery", () => {
  const prior = littleTrailAdmissionO6({ partial: true });
  let save = [null, first, pebble, rub, identify, lower("lose", route.far - 37)].reduce(applyLittleTrailO6, prior);
  assert.deepEqual(latest(save).lastConfirmed, { point: "first", x: route.first });
  assert.equal(trail.littleTrailViewO6(latest(save)).stage, "search-anchor");
  const restored = town.parseSaveImport(JSON.stringify(save));
  assert.equal(restored.failure, null);
  assert.deepEqual(latest(restored.save), latest(save));
  assert.equal(trail.playLittleTrailO6(save, lower("scan-old", route.old)), null);
  assert.equal(trail.playLittleTrailO6(save, lower("scan-anchor", route.far)), null);
  save = [lower("scan-anchor", route.first), lower("scan-old", route.old), climb, compare, behavior]
    .reduce(applyLittleTrailO6, restored.save);
  assert.equal(latest(save).resolved, true);
  assert.equal(latest(save).success, false);
  assert.equal(latest(save).choice, "behavior");
  assert.ok(latest(save).observations.includes("empreintes-anciennes-reconnues"));
  assert.ok(!latest(save).observations.includes("arrêt-près-du-tronc-observé"));
  assert.deepEqual(latest(save).transfers, ["lecture-du-comportement"]);
  assert.deepEqual(save.trophies, prior.trophies);
});

test("Following the dry noise and losing the prey before observation preserve only evidence actually seen", () => {
  const prior = littleTrailAdmissionO6();
  const blind = [null, lower("lose", route.first - 30)].reduce(applyLittleTrailO6, prior);
  assert.equal(latest(blind).lastConfirmed, null);
  const trace = applyLittleTrailO6(blind, lower("scan-anchor", route.blind));
  assert.ok(latest(trace).observations.includes("trace-à-lisière-relevée"));
  const lost = [null, first, rub, pebble, lower("identify", route.pebble, { cue: "pebble" })].reduce(applyLittleTrailO6, prior);
  assert.equal(trail.littleTrailViewO6(latest(lost)).loss, "decoy");
  assert.ok(latest(lost).observations.includes("bruit-trompeur-suivi"));
  assert.ok(!latest(lost).observations.includes("frottement-authentifié"));
});

test("Archives cannot swap the source, evidence or physical plane, and an active witness cannot be erased", () => {
  const previous = littleTrailAdmissionO6();
  const active = [null, first, pebble, rub].reduce(applyLittleTrailO6, previous);
  const replace = fields => ({ ...active, originV151: { ...active.originV151, littleTrailO6: { ...latest(active), ...fields } } });
  for (const tampered of [
    replace({ success: true }),
    replace({ rival: { success: true, choice: "warn", memory: "warning" } }),
    replace({ lastConfirmed: { point: "far", x: route.far } }),
    replace({ journal: [upper("observe", route.first - 80)] }),
    { ...active, homeworld: { ...active.homeworld, locationV77: { ...active.homeworld.locationV77, levelId: "+1" } } },
    { ...active, originV151: { ...active.originV151, rivalRaceO6: undefined } },
  ]) assert.notEqual(town.parseSaveImport(JSON.stringify(tampered)).failure, null);
  assert.equal(trail.keepsLittleTrailO6(active, previous), false);
  assert.equal(trail.keepsLittleTrailO6(active, replace({ choice: "map" })), false);
  assert.equal(trail.keepsLittleTrailO6(active, active), true);
});
