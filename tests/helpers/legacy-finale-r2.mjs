import assert from "node:assert/strict";
import { homeworldSceneSsrV78 } from "./homeworld-scene-ssr-v78.mjs";
import { withResidenceO6, HOUSE, yard } from "./origin-training-yard-o6.mjs";
import { continuation, continuationAdmissionO6, regionContextO6, walkO6 } from "./origin-continuation-o6.mjs";
import { narrativeLongMemoryAdmission } from "./senior-rite-campaign.mjs";
import { playShipAcquisitionV161 } from "./ship-receipt-v161.mjs";

const qa = homeworldSceneSsrV78();
const history = qa.load("app/game/systems/clanChronicle.ts");
const endings = qa.load("app/game/systems/originEndingsV170.ts");

export const finale = qa.load("app/game/systems/legacyFinaleR2.ts");
export const saves = qa.load("app/game/save.ts");
export const houseSite = { kind: "residence", id: HOUSE };

function playYardO6(save) {
  for (const order of yard.TRAINING_YARD_ORDERS_O6) {
    save = walkO6(save, yard.TRAINING_YARD_POSTS_O6[order]);
    const origin = yard.applyTrainingYardO6(save.originV151, save.residenceV149, save.homeworldRegionV68, regionContextO6(save), order);
    assert.ok(origin, order);
    save = { ...save, originV151: origin };
  }
  return save;
}

function chooseLegacyO6Ending(save) {
  const place = { rankId: save.profile.rankId, atWorkshop: true };
  const shown = endings.examineEndingV170(save.originV151, "O6-E1", place);
  assert.ok(shown.ok, shown.reason);
  const selected = endings.confirmEndingV170(shown.state, "O6-E1", "O6-E1", place);
  assert.ok(selected.ok, selected.reason);
  return { ...save, originV151: selected.state };
}

export function playLegacyO6Lesson(save) {
  for (let step = 0; step < 18; step++) {
    const view = continuation.continuationViewO6(save, save.originV151, save.homeworldRegionV68, regionContextO6(save));
    assert.ok(view);
    const active = view.next ? view : view.practice;
    if (!active?.next) {
      assert.equal(save.originV151.ending.endingRealized, true);
      return save;
    }
    save = walkO6(save, active.post);
    const changed = continuation.applyContinuationO6(save, save.originV151, save.homeworldRegionV68, regionContextO6(save), active.next);
    assert.ok(changed, active.next);
    save = { ...save, originV151: changed.origin };
  }
  throw new Error("Leçon O6 incomplète");
}

export function legacyFixture({ realized = true, ancient = true } = {}) {
  if (ancient) return legacyCanonicalCohortFixture({ realized });
  const save = continuationAdmissionO6("review", "O6-E1");
  return realized ? playLegacyO6Lesson(save) : save;
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
    if (state.status === "aboard" && action.type === "move-room" && action.roomId === state.roomId) continue;
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
    // The setup plays the existing berth, onboarding, audit and recruitment reducers.
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

const cultural = qa.load("app/game/systems/bibleSceneCulturalV86.ts");
const haltBinding = cultural.BIBLE_CULTURAL_BINDING_V86;
export const legacyRegions = qa.load("app/game/systems/homeworldRegionsV68.ts");
export const legacyHaltApproach = haltBinding.approach;

export function legacyHaltFixture({ realized = true, walkthrough = true, approach = haltBinding.approach } = {}) {
  const save = legacyFixture({ realized, ancient: false });
  const region = legacyRegions.createHomeworldRegionV68(haltBinding.regionId, "legacy-epilogue-crests", true);
  // Prepared regional return admission, matching the existing V86 fixture.
  // Completing the halt below still uses the actual cultural reducer.
  Object.assign(region, { tick: 3600, walked: 8000, greeted: ["guide"], traces: ["trail-1", "trail-2", "trail-3"],
    observedTicks: 90, reported: true, eventReceipts: ["track", "report"], actor: { ...region.actor, ...approach } });
  save.homeworldRegionV68 = region;
  if (walkthrough) {
    const context = cultural.bibleCulturalContextV86({ save, ownerSaveCreatedAt: save.createdAt, region,
      sceneActive: true, focused: true, suspended: false, host: { id: haltBinding.npcId, present: true, alive: true, conscious: true },
      table: { id: haltBinding.tableId, ...haltBinding.table } });
    assert.ok(context.eligible, context.denial);
    for (const type of ["open", "choose-b", "reply", "sit", "listen", "tidy"]) {
      const result = cultural.applyBibleSceneActionV86(save.homeworld.bibleScenesV86, { type }, context);
      assert.ok(result.ok, result.message);
      save.homeworld.bibleScenesV86 = result.ledger;
    }
  }
  return save;
}

let ancientHouse;
export function legacyCanonicalCohortFixture({ realized = true } = {}) {
  if (ancientHouse) return realized ? playLegacyO6Lesson(structuredClone(ancientHouse)) : structuredClone(ancientHouse);
  const ancient = qa.load("app/game/systems/ancientHearingR2M056.ts");
  const residence = qa.load("app/game/systems/companionResidence.ts");
  let save = narrativeLongMemoryAdmission();
  const witnessOrders = [["open-register", "archives"], ["read-hunt", "hangar"], ["read-workshop", "armurerie"],
    ["read-teaching", "archives"], ["choose-intimate", "archives"], ["reserve-post", "archives"]];
  const relays = [...ancient.ANCIENT_DEBT_POSTS, ...ancient.ANCIENT_SERVICE_POSTS].map(post => [post.order, post.room]);
  for (const [order, roomId] of [...witnessOrders, ...relays, ["recognize", "archives"]]) {
    // Bring the operation to its authored station before issuing the native hearing command.
    save = moveLegacyClanFixture(save, { type: "move-room", roomId });
    const result = operations.actClanShipOperations(save.clanShipOperations, {
      type: "ancient-hearing", order, expectedRevision: save.clanShipOperations.revision,
    }, { ownerCreatedAt: save.createdAt, campaign: save, docking: save.clanShipDocking,
      availableCrewIds: residence.availableClanResidenceCrew(save), crewPostRooms: residence.clanResidenceCrewPostRooms(save) });
    assert.ok(result.accepted, result.message);
    save = { ...save, clanShipOperations: result.state,
      ...(result.ancientChronicle ? { prologue: { ...save.prologue, chronicle: result.ancientChronicle } } : {}) };
  }
  assert.equal(history.getChronicleRank(save.prologue.chronicle), "ancient");
  assert.equal(ancient.ancientHearingRecognized(save.clanShipOperations.ancientHearing), true);
  save = moveLegacyClanFixture(save, { type: "move-room", roomId: "hangar" }, { type: "return-to-personal" }, { type: "undock" });
  ancientHouse = chooseLegacyO6Ending(playYardO6(withResidenceO6(save)));
  return realized ? playLegacyO6Lesson(structuredClone(ancientHouse)) : structuredClone(ancientHouse);
}

export function legacyPersonalShipFixture({ realized = true, stopAt } = {}) {
  const base = { ...legacyFixture({ realized, ancient: false }), homeworldRegionV68: null };
  return playShipAcquisitionV161(qa, base, stopAt);
}
