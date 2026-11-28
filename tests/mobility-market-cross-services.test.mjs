import assert from "node:assert/strict";
import test from "node:test";
import { homeworldSceneSsrV78 } from "./helpers/homeworld-scene-ssr-v78.mjs";

const qa = homeworldSceneSsrV78();
const mobility = qa.load("app/game/systems/mobility/ledger.ts");
const catalogue = qa.load("app/game/systems/mobility/catalogue.ts");
const mounts = qa.load("app/game/systems/mobility/mountsV153.ts");
const kennel = qa.load("app/game/systems/houndKennelV147.ts");
const hounds = qa.load("app/game/systems/huntingHoundsV147.ts");
const saves = qa.load("app/game/save.ts");
const owner = "2026-11-28T09:00:00.000Z";
const mountId = "kha_rha";
const vehicleId = "clan_hoverbike";
const vehicleCost = catalogue.MOBILITY_CATALOGUE.find(model => model.id === vehicleId).purchasePrice;
const mountCost = mounts.KHA_RHA_ADOPTION_MARKS_V153;
const houndCost = kennel.HOUND_KENNEL_ADOPTION_PRICE_V147;
const houndAction = { type: "recruit", catalogueId: kennel.HOUND_CATALOGUE_V147[0].id, name: "Keth’rai" };

function market(balance) {
  const seed = saves.defaultSave(owner);
  seed.profile = { ...seed.profile, clanMarks: balance, rankId: "blooded",
    acquiredRankIdV166: "blooded" };
  seed.mobilityV1 = { ...mobility.createMobilityLedger(owner), circulationPermit: true };
  const entries = new Map();
  const disk = { getItem: key => entries.get(key) ?? null, setItem: (key, value) => entries.set(key, value),
    removeItem: key => entries.delete(key) };
  const commit = next => {
    const result = saves.writeSaveWithStatus(next, disk);
    assert.equal(result.persisted, true, result.failure);
    return result.save;
  };
  return { save: commit(seed), commit, disk };
}

function buyVehicle(save, commit) {
  const result = mobility.actMobility(save, { type: "buy", ownerCreatedAt: owner,
    expectedRevision: save.mobilityV1.revision, modelId: vehicleId, expectedCost: vehicleCost });
  assert.equal(result.accepted, true, result.message);
  return commit({ ...save, mobilityV1: result.state, profile: { ...save.profile, clanMarks: result.clanMarks } });
}

function adoptMount(save, commit) {
  const action = order => {
    const result = mounts.actMountsV153(save, { ...order, ownerCreatedAt: owner,
      expectedRevision: save.mountsV153?.revision ?? 0 });
    assert.equal(result.accepted, true, result.message);
    save = commit({ ...save, mountsV153: result.state, profile: { ...save.profile, clanMarks: result.clanMarks } });
  };
  action({ type: "begin-trial", mountId });
  const trials = [["approach-without-fire", "no-fire"], ["shared-scent", "scent-first"], ["short-circuit", "stop-return"]];
  for (const [index, [exerciseId, optionId]] of trials.entries()) {
    action({ type: "trust-exercise", trialId: "trial-kha-rha", exerciseId, optionId, eventId: "market-" + index });
  }
  action({ type: "adopt", mountId, trialId: "trial-kha-rha", expectedCost: mountCost });
  return save;
}

test("garage, breeder and kennel debit the same campaign wallet and retain their separate receipts", () => {
  const offer = market(vehicleCost + mountCost + houndCost);
  const ownVehicle = buyVehicle(offer.save, offer.commit);
  assert.equal(ownVehicle.profile.clanMarks, mountCost + houndCost);
  const ownMount = adoptMount(ownVehicle, offer.commit);
  assert.equal(ownMount.profile.clanMarks, houndCost);
  const purchase = kennel.applyKennelActionV147(ownMount, houndAction, hounds.HOUND_KENNEL_LOCATION_V147);
  assert.ok(purchase.ok, purchase.reason);
  const both = offer.commit({ ...ownMount, houndsV147: purchase.houndsV147,
    profile: { ...ownMount.profile, clanMarks: purchase.clanMarks } });
  assert.equal(both.profile.clanMarks, 0);
  assert.equal(both.mobilityV1.spentMarks, vehicleCost);
  assert.equal(both.mountsV153.spentMarks, mountCost);
  assert.equal(both.mountsV153.mounts[0].proof.adoptionMarks, mountCost);
  assert.equal(both.houndsV147.hounds[0].name, houndAction.name);
  assert.equal(both.houndsV147.hounds[0].id, houndAction.catalogueId);
  const replay = kennel.applyKennelActionV147(both, houndAction, hounds.HOUND_KENNEL_LOCATION_V147);
  assert.equal(replay.ok, false, "a second kennel order cannot duplicate a companion");
  const archived = saves.parseSaveImport(saves.exportSave(both));
  assert.ok(archived.save, archived.failure);
  assert.deepEqual(archived.save.mobilityV1, both.mobilityV1);
  assert.deepEqual(archived.save.mountsV153, both.mountsV153);
  assert.deepEqual(archived.save.houndsV147, both.houndsV147);
  assert.equal(archived.save.profile.clanMarks, 0);
  assert.equal(saves.loadSaveWithStatus(offer.disk).save.profile.clanMarks, 0);
});

test("spending at the other two counters can leave too little for an adoption", () => {
  const offer = market(vehicleCost + mountCost + houndCost - 1);
  const save = adoptMount(buyVehicle(offer.save, offer.commit), offer.commit);
  const before = JSON.stringify(save);
  const refused = kennel.applyKennelActionV147(save, houndAction, hounds.HOUND_KENNEL_LOCATION_V147);
  assert.deepEqual(refused, { ok: false, reason: "insufficient-clan-marks" });
  assert.equal(JSON.stringify(save), before);
  const persisted = saves.loadSaveWithStatus(offer.disk).save;
  assert.equal(persisted.profile.clanMarks, houndCost - 1);
  assert.equal(persisted.mobilityV1.owned.length, 1);
  assert.equal(persisted.mountsV153.mounts.length, 1);
  assert.equal(persisted.houndsV147?.hounds.length ?? 0, 0);
});
