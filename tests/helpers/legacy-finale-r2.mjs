import assert from "node:assert/strict";
import { homeworldSceneSsrV78 } from "./homeworld-scene-ssr-v78.mjs";
import { trainingYardAdmissionO6, HOUSE } from "./origin-training-yard-o6.mjs";

const qa = homeworldSceneSsrV78();
const history = qa.load("app/game/systems/clanChronicle.ts");
const endings = qa.load("app/game/systems/originEndingsV170.ts");

export const finale = qa.load("app/game/systems/legacyFinaleR2.ts");
export const saves = qa.load("app/game/save.ts");
export const houseSite = { kind: "residence", id: HOUSE };

export function legacyFixture({ realized = true, ancient = true } = {}) {
  let save = trainingYardAdmissionO6();
  const place = { rankId: "elite", atWorkshop: true };
  const shown = endings.examineEndingV170(save.originV151, "O6-E1", place);
  assert.ok(shown.ok, shown.reason);
  const selected = endings.confirmEndingV170(shown.state, "O6-E1", "O6-E1", place);
  assert.ok(selected.ok, selected.reason);
  save = { ...save, originV151: { ...selected.state, trainingYardO6: {
    version: 1, houses: { [HOUSE]: ["support", "rack", "aisle", "threshold"] },
  } } };
  // Test-only admission for the end of the separately authored O6 quest.
  // This fixture is never a source of a campaign receipt.
  if (realized) save.originV151 = { ...save.originV151, consumed: [...save.originV151.consumed, "O6-M30:realized"],
    ending: { ...save.originV151.ending, endingRealized: true } };
  if (ancient) {
    const beginning = history.CHRONICLE_EVIDENCE.find(entry => entry.id === "intro-begun");
    assert.ok(beginning);
    let chronicle = history.recordChronicleEvidence(history.createClanChronicle(), { id: beginning.id, sourceId: beginning.sourceId }).state;
    for (const rite of history.CHRONICLE_RITES.filter(entry => entry.grantsRankId !== null)) {
      for (const id of rite.requiredEvidenceIds) {
        const proof = history.CHRONICLE_EVIDENCE.find(entry => entry.id === id);
        assert.ok(proof);
        const result = history.recordChronicleEvidence(chronicle, { id, sourceId: proof.sourceId });
        assert.ok(result.accepted);
        chronicle = result.state;
      }
      const result = history.performChronicleRite(chronicle, { id: rite.id, sourceId: rite.sourceId });
      assert.ok(result.accepted, rite.id);
      chronicle = result.state;
    }
    assert.equal(history.getChronicleRank(chronicle), "ancient");
    save.prologue = { chronicle };
  }
  return save;
}

export function legacyPlayer(save = legacyFixture()) {
  return {
    get save() { return save; },
    move(scene, kind, at, fields = {}, site = houseSite) {
      const result = finale.advanceLegacyFinaleR2(save, site, { scene, order: { kind, at, ...fields } });
      assert.ok(result.next, result.message);
      assert.ok(finale.legacyFinaleSuccessorR2(save.legacyFinaleR2, result.next));
      const normalized = finale.normalizeLegacyFinaleR2(result.next, save.createdAt);
      assert.deepEqual(normalized, result.next);
      save = { ...save, legacyFinaleR2: normalized };
      return save;
    },
  };
}

const docks = qa.load("app/game/systems/clanShipDocking.ts");
const operations = qa.load("app/game/systems/clanShipOperations.ts");
const fleet = qa.load("app/game/systems/progression.ts");

export function moveLegacyClanFixture(save, ...commands) {
  const context = { ownerCreatedAt: save.createdAt, personalShipId: fleet.loadShipProgression(save).selectedShipId };
  let state = save.clanShipDocking ?? docks.createClanShipDockingState(context.ownerCreatedAt, context.personalShipId);
  for (const action of commands) {
    const result = docks.actClanShipDocking(state, action, context);
    assert.ok(result.accepted, result.message);
    state = result.state;
  }
  return { ...save, clanShipDocking: state };
}

export function legacyClanFixture({ realized = true, recruit = true } = {}) {
  let save = { ...legacyFixture({ realized, ancient: false }), homeworldRegionV68: null };
  save = moveLegacyClanFixture(save, { type: "approach" }, { type: "dock" }, { type: "board" });
  if (recruit) {
    // The setup plays the existing berth, onboarding, audit and recruitment
    // reducers. Only the separate M30 authoring prerequisite is test admission.
    let state = operations.createClanShipOperations(save.createdAt);
    const act = (room, order) => {
      save = moveLegacyClanFixture(save, { type: "move-room", roomId: room });
      const result = operations.actClanShipOperations(state, { ...order, expectedRevision: state.revision },
        { ownerCreatedAt: save.createdAt, docking: save.clanShipDocking, campaign: save });
      assert.ok(result.accepted, result.message);
      state = result.state;
      save.clanShipOperations = state;
    };
    for (const step of operations.CLAN_SHIP_ONBOARDING_STEPS) act(step.roomId, { type: "onboard-step", stepId: step.id });
    act("conseil", { type: "accept-mandate" });
    act("conseil", { type: "accept-contract", contractId: "ship-armory-audit" });
    for (const step of operations.clanShipContract("ship-armory-audit").steps) act(step.roomId, { type: "interior-step", stepId: step.id });
    act("armurerie", { type: "recruit", npcId: "iron-claw" });
  }
  return moveLegacyClanFixture(save, { type: "move-room", roomId: "trophees" });
}
