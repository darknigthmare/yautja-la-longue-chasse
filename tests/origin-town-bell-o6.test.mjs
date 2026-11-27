import assert from "node:assert/strict";
import test from "node:test";
import { playTownOrderO6, town, townActorPositionO6, townAdmissionO6, townCheckpointO6 } from "./helpers/origin-town-bell-o6.mjs";

const route = ["begin", "workshops", "square", "unlatch", "deliver", "ring", "regroup"];
const receipt = save => save.originV151.townBellO6;
const procession = start => route.reduce(playTownOrderO6, start);

test("The proper mission opens only at Saar's native landing from a real resolved M02", () => {
  const { activeRace, ready } = townAdmissionO6();
  const site = townActorPositionO6("begin");
  assert.deepEqual(town.townBellActionsO6(activeRace), []);
  assert.equal(town.townBellActionAtO6(activeRace, site.levelId, site.point, null), undefined);
  assert.deepEqual(town.townBellActionsO6(ready), ["begin"]);
  assert.equal(town.townBellActionAtO6(ready, "+1", site.point, null), undefined);
  assert.equal(town.townBellActionAtO6(ready, site.levelId, site.point, null), "begin");
  const old = { ...ready, originV151: null };
  assert.deepEqual(town.townBellActionsO6(old), []);
  assert.equal(town.parseSaveImport(JSON.stringify(old)).failure, null);
  assert.equal(town.parseSaveImport(JSON.stringify(ready)).save.originV151.townBellO6, undefined);
});

test("The native streets hold the delivery, the forge gate and the bell are separate gestures", () => {
  const { ready } = townAdmissionO6();
  const started = playTownOrderO6(ready, "begin");
  assert.equal(receipt(started).carriesPiece, true);
  assert.equal(town.recordTownBellOrderO6(started, "ring", townCheckpointO6(started, "ring")), null);
  const opened = ["workshops", "square", "unlatch"].reduce(playTownOrderO6, started);
  assert.equal(receipt(opened).carriesPiece, true);
  const forge = townActorPositionO6("deliver"), bell = townActorPositionO6("ring");
  assert.equal(forge.interiorId, "deep-forge");
  assert.equal(bell.interiorId, forge.interiorId);
  assert.ok(Math.hypot(forge.point.x - bell.point.x, forge.point.y - bell.point.y) > 50);
  const delivery = playTownOrderO6(opened, "deliver");
  assert.equal(receipt(delivery).carriesPiece, false);
  assert.deepEqual(receipt(delivery).transfers, ["pièce-remise-aux-forges"]);
  const signalled = playTownOrderO6(delivery, "ring");
  assert.equal(receipt(signalled).resolved, false);
  assert.ok(receipt(signalled).observations.includes("signal-de-livraison-entendu"));
  assert.deepEqual(signalled.inventory, ready.inventory);
  assert.deepEqual(signalled.prologue, ready.prologue);
  for (const [from, to] of [["begin", "workshops"], ["workshops", "square"], ["square", "unlatch"]]) {
    const a = townActorPositionO6(from), b = townActorPositionO6(to);
    assert.equal(town.homeworldWalkRouteV109(a.levelId, a.point, b.point).status, "reachable", from + " -> " + to);
  }
});

test("Yena and Tov are physical first visits and the second visit stays possible", () => {
  const normal = procession(townAdmissionO6().ready);
  assert.deepEqual(town.townBellActionsO6(normal), ["workshop", "kennel", "postpone"]);
  for (const [first, second] of [["workshop", "kennel"], ["kennel", "workshop"]]) {
    const visited = playTownOrderO6(normal, first);
    assert.equal(receipt(visited).choice, first);
    assert.equal(receipt(visited).success, true);
    assert.equal(receipt(visited).resolved, true);
    assert.deepEqual(town.townBellActionsO6(visited), [second]);
    const both = playTownOrderO6(visited, second);
    assert.equal(receipt(both).choice, first);
    assert.equal(receipt(both).transfers.length, 4);
    assert.deepEqual(town.townBellActionsO6(both), []);
  }
});

test("A real deferred M02 adjusts the delivery and a deferred visit does not invent its transfer", () => {
  const { ready } = townAdmissionO6({ partial: true });
  const normal = procession(ready);
  assert.equal(receipt(normal).race.success, false);
  assert.equal(receipt(normal).race.connected, null);
  assert.equal(receipt(normal).race.choice, "observe");
  assert.match(town.townBellReplyO6(ready, "begin"), /La manche attendra/);
  const deferred = playTownOrderO6(normal, "postpone");
  assert.equal(receipt(deferred).resolved, true);
  assert.equal(receipt(deferred).success, false);
  assert.equal(receipt(deferred).choice, null);
  assert.deepEqual(town.townBellActionsO6(deferred), ["workshop", "kennel"]);
  const recovered = playTownOrderO6(deferred, "kennel");
  assert.equal(receipt(recovered).choice, "kennel");
  assert.equal(receipt(recovered).success, false);
  assert.ok(receipt(recovered).transfers.includes("consigne-du-chenil-avec-tov"));
  assert.deepEqual(town.townBellActionsO6(recovered), ["workshop"]);
});

test("Import and writes reject wrong physical sites, fabricated effects, future records and rollback", () => {
  const { ready } = townAdmissionO6();
  const first = playTownOrderO6(ready, "begin");
  const stepped = playTownOrderO6(first, "workshops");
  const bad = structuredClone(stepped);
  bad.originV151.townBellO6.journal[1].at = townCheckpointO6(stepped, "begin");
  assert.equal(town.parseSaveImport(JSON.stringify(bad)).failure, "invalid-save");
  bad.originV151.townBellO6 = { ...receipt(stepped), transfers: ["pièce-remise-aux-forges"] };
  assert.equal(town.parseSaveImport(JSON.stringify(bad)).failure, "invalid-save");
  bad.originV151.townBellO6 = { ...receipt(stepped), race: { ...receipt(stepped).race, roundsLost: 10 } };
  assert.equal(town.parseSaveImport(JSON.stringify(bad)).failure, "invalid-save");
  bad.originV151.townBellO6 = { ...receipt(stepped), version: 2 };
  assert.equal(town.parseSaveImport(JSON.stringify(bad)).failure, "future-version");
  const items = new Map([[town.SAVE_STORAGE_KEY, JSON.stringify(first)]]);
  const storage = { getItem: key => items.get(key) ?? null, setItem: (key, value) => items.set(key, value),
    removeItem: key => items.delete(key) };
  assert.ok(town.loadSaveWithStatus(storage).loaded);
  assert.ok(town.writeSaveWithStatus(stepped, storage).persisted);
  assert.equal(town.writeSaveWithStatus(first, storage).persisted, false);
  assert.deepEqual(town.loadSaveWithStatus(storage).save.homeworld.locationV77, receipt(stepped).journal.at(-1).at);
});
