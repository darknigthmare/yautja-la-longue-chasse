import assert from "node:assert/strict";
import { completeInterior, fixture, docking, ops, qa, saves } from "./clan-ship-trophy-hearing-fixture.mjs";
import { playShipAcquisitionV161 } from "./ship-receipt-v161.mjs";

const assembly = qa.load("app/game/systems/elderAssemblyV168.ts");
const acquisition = qa.load("app/game/systems/shipAcquisitionV89.ts");

export function elderWorkshopAdmissionV172(seed) {
  let save = fixture({ evidence: false, seed });
  save.profile.honor = 8000;
  save = saves.parseSaveImport(JSON.stringify(save)).save;
  assert.ok(save);
  if (!seed) {
    save.elderMentoringV168 = { version: 1, revision: 6, ownerCreatedAt: save.createdAt, supports: ["west", "east"],
      attempt: { choice: "alone", observed: 2 }, resolved: true };
    save.elderPassageJudgmentV168 = { version: 1, revision: 5, ownerCreatedAt: save.createdAt, traces: 3, anchors: 0, replayed: true,
      trial: { method: "schedule", delay: 3 }, resolved: true };
    for (const operation of [{ type: "hear", act: "mentoring" }, { type: "hear", act: "judgment" },
      { type: "accept", responsibility: "council" }]) {
      const result = assembly.commitElderAssembly(save, { operation, expectedRevision: save.elderAssemblyV168?.revision ?? 0 });
      assert.equal(result.ok, true, result.message);
      save.elderAssemblyV168 = result.state;
    }
  }
  save = completeInterior(save, "ship-armory-audit");
  if (!seed) save = playShipAcquisitionV161(qa, { ...save, clanShipDocking: null });
  const ship = acquisition.shipAcquisitionOwnedHullV89(save.shipAcquisitionV89, save.createdAt);
  assert.ok(ship);
  const context = { ownerCreatedAt: save.createdAt, personalShipId: ship.shipId };
  let berth = docking.createClanShipDockingState(save.createdAt, ship.shipId);
  for (const action of [{ type: "approach" }, { type: "dock" }, { type: "board" }, { type: "move-room", roomId: "armurerie" }]) {
    const result = docking.actClanShipDocking(berth, action, context);
    assert.equal(result.accepted, true, result.message);
    berth = result.state;
  }
  save = { ...save, clanShipDocking: berth };
  const result = ops.actClanShipOperations(save.clanShipOperations,
    { type: "recruit", npcId: "iron-claw", expectedRevision: save.clanShipOperations.revision },
    { ownerCreatedAt: save.createdAt, campaign: save, docking: save.clanShipDocking });
  assert.equal(result.accepted, true, result.message);
  return { ...save, clanShipOperations: result.state };
}

