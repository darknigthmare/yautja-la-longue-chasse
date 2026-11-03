import assert from "node:assert/strict";
import test from "node:test";
import { build } from "esbuild";
import { fileURLToPath } from "node:url";
import type { ClanChronicle, ChronicleEvidenceId, ChronicleRankId, ChronicleRiteId } from "../app/game/systems/clanChronicle";

const bundle = await build({ entryPoints: [fileURLToPath(new URL("../app/game/systems/clanChronicle.ts", import.meta.url))],
  bundle: true, format: "esm", platform: "node", target: "es2022", write: false });
const api = await import("data:text/javascript;base64," + Buffer.from(bundle.outputFiles[0].text).toString("base64")) as typeof import("../app/game/systems/clanChronicle");

function prove(state: ClanChronicle, ...ids: ChronicleEvidenceId[]): ClanChronicle {
  for (const id of ids) {
    const definition = api.CHRONICLE_EVIDENCE.find(e => e.id === id)!;
    const result = api.recordChronicleEvidence(state, { id, sourceId: definition.sourceId });
    assert.equal(result.accepted, true);
    state = result.state;
  }
  return state;
}
function rite(state: ClanChronicle, id: ChronicleRiteId): ClanChronicle {
  const definition = api.CHRONICLE_RITES.find(r => r.id === id)!;
  const result = api.performChronicleRite(state, { id, sourceId: definition.sourceId });
  assert.equal(result.accepted, true, id);
  return result.state;
}
function journeyTo(rank: ChronicleRankId): ClanChronicle {
  let state = prove(api.createClanChronicle(), "intro-begun");
  if (rank === "youngling") return state;
  for (const definition of api.CHRONICLE_RITES) {
    if (definition.grantsRankId === null) continue;
    state = prove(state, ...definition.requiredEvidenceIds);
    state = rite(state, definition.id);
    if (definition.grantsRankId === rank) return state;
  }
  throw new Error("Unknown fixture rank");
}

test("foundation starts with no invented narrative journey or access", () => {
  const state = api.createClanChronicle();
  assert.equal(api.getChronicleRank(state), null);
  assert.deepEqual(api.getChronicleFunctions(state), []);
  for (const id of ["homeworld-normal", "personal-ship-acquisition", "first-queen-mission", "warp-universe"]) {
    assert.equal(api.evaluateChronicleAccess(state, id).allowed, false);
  }
  assert.equal(api.getChronicleRank({ ...state, rankId: "ancient", honor: 999999, functions: ["adjutant"] }), null);
});

test("V35 migration preserves recognition without converting honor to rites or rewriting the save", () => {
  for (const rankId of ["young-blood", "blooded", "elite", "elder"]) {
    const save = { createdAt: "2026-09-13T12:00:00.000Z", profile: { rankId, honor: 8000 },
      inventory: { unlockedWeaponIds: ["plasma-caster"] }, trophies: [{ id: "existing-queen" }] };
    const before = JSON.stringify(save);
    const state = api.migrateV35ClanChronicle(save);
    assert.equal(state.legacyRecognition?.rankId, rankId);
    assert.equal(state.legacyRecognition?.honor, 8000);
    assert.equal(state.legacyRecognition?.accessPolicy, "preserve-v35-access");
    assert.deepEqual(state.evidence, []);
    assert.deepEqual(state.rites, []);
    assert.equal(api.getChronicleRank(state), null);
    assert.equal(api.evaluateChronicleAccess(state, "warp-universe").allowed, false);
    assert.equal(api.evaluateChronicleAccess(state, "warp-universe").legacyAccessPreserved, true);
    assert.equal(JSON.stringify(save), before);
  }
});

test("unknown or malformed old profiles do not gain recognized access", () => {
  for (const profile of [{ rankId: "ancient", honor: 8000 }, { rankId: "elder", honor: Infinity },
    { rankId: "elder", honor: -1 }, { rankId: "elder", honor: "1800" }, { rankId: "elder", honor: 1.2 }]) {
    assert.equal(api.migrateV35ClanChronicle({ createdAt: "2026-09-13T12:00:00Z", profile }).legacyRecognition, null);
  }
  assert.equal(api.migrateV35ClanChronicle({ createdAt: "invalid", profile: { rankId: "elder", honor: 1800 } }).legacyRecognition, null);
});

test("a completed mission does not promote until the separate rite is actually confirmed", () => {
  const prepared = prove(journeyTo("youngling"), "intro-completed");
  assert.equal(api.evaluateChroniclePromotion(prepared, "nursery-recognition").allowed, true);
  assert.equal(api.getChronicleRank(prepared), "youngling");
  assert.equal(api.getChronicleRank(rite(prepared, "nursery-recognition")), "unblooded");
});

test("missing evidence and out-of-order rites remain blocked despite XP or rank claims", () => {
  const state = prove(journeyTo("youngling"), "first-tracks");
  const evaluated = api.evaluateChroniclePromotion(state, "nursery-recognition");
  assert.equal(evaluated.allowed, false);
  assert.deepEqual(evaluated.missing.map(x => x.id), ["intro-completed"]);
  const receipt = api.CHRONICLE_RITES.find(r => r.id === "ancient-recognition")!;
  assert.equal(api.performChronicleRite({ ...state, honor: 999999, rankId: "elder" }, receipt).accepted, false);
  const forged = { ...state, rites: api.CHRONICLE_RITES.map(({ id, sourceId }) => ({ id, sourceId })) };
  assert.deepEqual(api.normalizeClanChronicle(forged).rites, []);
});

test("all promotion proofs without an introduced character still do not invent a journey", () => {
  const state = { ...api.createClanChronicle(),
    evidence: api.CHRONICLE_EVIDENCE.filter(e => e.id !== "intro-begun").map(({ id, sourceId }) => ({ id, sourceId })),
    rites: api.CHRONICLE_RITES.map(({ id, sourceId }) => ({ id, sourceId })) };
  assert.equal(api.getChronicleRank(state), null);
  assert.deepEqual(api.getChronicleFunctions(state), []);
});

test("every promotion survives a save round trip with canonical order and no inferred Adjutant function", () => {
  for (const rank of api.CHRONICLE_RANK_IDS) {
    const state = journeyTo(rank);
    assert.equal(api.getChronicleRank(state), rank);
    assert.deepEqual(api.getChronicleFunctions(state), []);
    const imported = api.normalizeClanChronicle(JSON.parse(JSON.stringify({ ...state, evidence: [...state.evidence].reverse(), rites: [...state.rites].reverse() })));
    assert.deepEqual(imported, state);
    assert.deepEqual(api.normalizeClanChronicle(imported), imported);
  }
});

test("Elder and Ancient each require the authored passage of time, not just combat proofs", () => {
  const elite = prove(journeyTo("elite"), "long-hunt-history", "next-generation");
  assert.deepEqual(api.evaluateChroniclePromotion(elite, "elder-recognition").missing.map(x => x.id), ["elder-time-passage"]);
  const elder = rite(prove(elite, "elder-time-passage"), "elder-recognition");
  const beforeAncient = prove(elder, "lasting-legacy", "forgotten-debt");
  assert.deepEqual(api.evaluateChroniclePromotion(beforeAncient, "ancient-recognition").missing.map(x => x.id), ["ancient-time-passage"]);
});

test("the first queen mission is available before Elite and its outcome remains an Elite proof", () => {
  let state = journeyTo("blooded");
  assert.equal(api.evaluateChronicleAccess(state, "first-queen-mission").allowed, false);
  state = prove(state, "queen-mission-briefing");
  assert.equal(api.evaluateChronicleAccess(state, "first-queen-mission").allowed, true);
  assert.equal(api.evaluateChronicleAccess(state, "elite-contracts", { personalShipAvailable: true }).allowed, false);
  assert.ok(api.evaluateChroniclePromotion(state, "elite-recognition").missing.some(x => x.id === "first-queen-hunt"));
  state = prove(state, "first-queen-hunt", "diverse-mastery", "solitary-trial");
  assert.equal(api.getChronicleRank(state), "blooded");
  assert.equal(api.evaluateChronicleAccess(rite(state, "elite-recognition"), "elite-contracts", { personalShipAvailable: true }).allowed, true);
});

test("Warp requires actual appointment, quest, ship and installed module, even for a high rank", () => {
  let state = prove(journeyTo("elite"), "warp-module-quest", "multiple-world-hunts", "team-extraction");
  const hardware = { personalShipAvailable: true, warpModuleInstalled: true };
  assert.deepEqual(api.evaluateChronicleAccess(state, "warp-universe", hardware).missing.map(x => x.id), ["adjutant"]);
  state = rite(state, "adjutant-appointment");
  assert.deepEqual(api.getChronicleFunctions(state), ["adjutant"]);
  assert.equal(api.getChronicleRank(state), "elite");
  assert.equal(api.evaluateChronicleAccess(state, "warp-universe", hardware).allowed, true);
  assert.equal(api.evaluateChronicleAccess(state, "warp-universe", { personalShipAvailable: true }).allowed, false);
  assert.equal(api.evaluateChronicleAccess(state, "warp-universe", { warpModuleInstalled: true }).allowed, false);
  const noQuest = { ...state, evidence: state.evidence.filter(e => e.id !== "warp-module-quest") };
  assert.equal(api.evaluateChronicleAccess(noQuest, "warp-universe", hardware).allowed, false);
  const tooYoung = prove(journeyTo("young-blood"), "multiple-world-hunts", "team-extraction");
  assert.equal(api.evaluateChroniclePromotion(tooYoung, "adjutant-appointment").allowed, false);
});

test("the explicit Lava and Darkjungle Young Blood requirement is not broadened to Unblooded", () => {
  const novice = journeyTo("unblooded");
  assert.equal(api.evaluateChronicleAccess(novice, "homeworld-normal").allowed, true);
  for (const access of ["homeworld-lava", "homeworld-dark-jungle"]) {
    assert.equal(api.evaluateChronicleAccess(novice, access).allowed, false);
    assert.equal(api.evaluateChronicleAccess(journeyTo("young-blood"), access).allowed, true);
  }
});

test("reserve access needs acquired coordinates and an available personal ship", () => {
  const state = journeyTo("blooded");
  assert.equal(api.evaluateChronicleAccess(state, "personal-ship-acquisition").allowed, true);
  assert.equal(api.evaluateChronicleAccess(state, "reserve-hunt", { personalShipAvailable: true }).allowed, false);
  const discovered = prove(state, "reserve-coordinates");
  assert.equal(api.evaluateChronicleAccess(discovered, "reserve-hunt").allowed, false);
  assert.equal(api.evaluateChronicleAccess(discovered, "reserve-hunt", { personalShipAvailable: true }).allowed, true);
});

test("receipts are exact, idempotent, immutable and cannot use prototype or foreign IDs", () => {
  const state = journeyTo("unblooded");
  const before = JSON.stringify(state);
  for (const receipt of [{ id: "intro-begun", sourceId: "debug-button" }, { id: "__proto__", sourceId: "chronicle.intro.started" }, null, true]) {
    assert.equal(api.recordChronicleEvidence(state, receipt).accepted, false);
    assert.equal(api.performChronicleRite(state, receipt).accepted, false);
  }
  const existing = state.evidence[0];
  assert.equal(api.recordChronicleEvidence(state, existing).changed, false);
  assert.equal(api.performChronicleRite(state, state.rites[0]).changed, false);
  assert.equal(JSON.stringify(state), before);
  assert.equal(api.evaluateChronicleAccess(state, "toString").allowed, false);
  assert.equal(api.evaluateChroniclePromotion(state, "__proto__").allowed, false);
});

test("unsupported or malformed imported chronicles fail closed", () => {
  for (const value of [null, [], true, { version: 2 }, { version: "1" }, { version: 1, evidence: "intro-begun", rites: {} }]) {
    assert.deepEqual(api.normalizeClanChronicle(value), api.createClanChronicle());
  }
  const duplicated = journeyTo("blooded");
  assert.deepEqual(api.normalizeClanChronicle({ ...duplicated, evidence: [...duplicated.evidence, ...duplicated.evidence], rites: [...duplicated.rites, ...duplicated.rites] }), duplicated);
  const foreign = { ...duplicated, evidence: duplicated.evidence.map(e => ({ ...e, sourceId: "foreign" })) };
  assert.equal(api.getChronicleRank(foreign), null);
  assert.deepEqual(api.normalizeClanChronicle(foreign).rites, []);
});

const aboard = { recruited: true, available: true, assignedShipId: "classic-predator-spaceship", assignmentActive: true,
  moduleInstalled: true, moduleCompatible: true, refitCompleted: true, deployed: false, location: "aboard" };
const ship = { personalShipId: "classic-predator-spaceship", shipPhysicallyAvailable: true };

test("a companion and module cannot materialize before recruitment, assignment, refit and real ship", () => {
  assert.equal(api.canCompanionAppearAboard(aboard, ship), true);
  for (const field of ["recruited", "assignmentActive", "moduleInstalled", "moduleCompatible", "refitCompleted"]) {
    const assignment = { ...aboard, [field]: false };
    assert.equal(api.isCompanionModuleVisible(assignment, ship), false, field);
    assert.equal(api.canCompanionAppearAboard(assignment, ship), false, field);
  }
  for (const context of [{ ...ship, personalShipId: null }, { ...ship, shipPhysicallyAvailable: false }, { ...ship, personalShipId: "another-ship" }, null, { ...ship, personalShipId: "" }]) {
    assert.equal(api.canCompanionAppearAboard(aboard, context), false);
    assert.equal(api.isCompanionModuleVisible(aboard, context), false);
  }
  assert.equal(api.canCompanionAppearAboard({ ...aboard, recruited: "true" }, ship), false);
});

test("deployment removes the occupant without demolishing a module outside a shipyard", () => {
  for (const assignment of [{ ...aboard, deployed: true, location: "field" }, { ...aboard, available: false, location: "elsewhere" }, { ...aboard, location: "reserve" }]) {
    assert.equal(api.canCompanionAppearAboard(assignment, ship), false);
    assert.equal(api.isCompanionModuleVisible(assignment, ship), true);
  }
  assert.equal(api.canCompanionAppearAboard({ ...aboard, deployed: true }, ship), false);
  assert.equal(api.canCompanionAppearAboard({ ...aboard, deployed: false, location: "field" }, ship), false);
  assert.equal(api.isCompanionModuleVisible({ ...aboard, assignmentActive: false }, ship), false);
});


test("the post-nursery recognition occurs before first tracks and the city stage", () => {
  const nursery = prove(journeyTo("youngling"), "intro-completed");
  const novice = rite(nursery, "nursery-recognition");
  assert.equal(api.getChronicleRank(novice), "unblooded");
  assert.equal(novice.evidence.some(e => e.id === "first-tracks"), false);
  assert.equal(api.evaluateChronicleAccess(novice, "homeworld-normal").allowed, true);
  assert.equal(api.evaluateChroniclePromotion(novice, "unguided-hunt-recognition").allowed, false);
});

test("Blooded requires the authored triad route and a generic xenomorph kill cannot bypass it", () => {
  const aspirant = journeyTo("young-blood");
  assert.equal(api.evaluateChronicleAccess(aspirant, "quatza-rij-triad-hunt").allowed, true);
  assert.equal(api.evaluateChronicleAccess(aspirant, "temple-three-shadows").allowed, false);
  const afterQuatza = prove(aspirant, "quatza-rij-triad-hunt");
  assert.equal(api.evaluateChronicleAccess(afterQuatza, "temple-three-shadows").allowed, true);
  const definition = api.CHRONICLE_RITES.find(r => r.id === "blooding-mark")!;
  for (const missingId of definition.requiredEvidenceIds) {
    const incomplete = prove(aspirant, ...definition.requiredEvidenceIds.filter(id => id !== missingId));
    assert.deepEqual(api.evaluateChroniclePromotion(incomplete, definition.id).missing.map(x => x.id), [missingId]);
    assert.equal(api.performChronicleRite(incomplete, definition).accepted, false);
  }
  for (const receipt of [
    { id: "xenomorph-initiation", sourceId: "chronicle.initiation-xenomorph.completed" },
    { id: "first-blood-expedition", sourceId: "chronicle.first-blood.completed" },
  ]) assert.equal(api.recordChronicleEvidence(afterQuatza, receipt).accepted, false);
  const ready = prove(aspirant, ...definition.requiredEvidenceIds);
  assert.equal(api.getChronicleRank(ready), "young-blood");
  assert.equal(api.getChronicleRank(rite(ready, "blooding-mark")), "blooded");
});

test("mutators reject future or malformed chronicles instead of replacing them with fresh V1 state", () => {
  const ready = prove(journeyTo("youngling"), "intro-completed");
  const evidenceReceipt = api.CHRONICLE_EVIDENCE.find(e => e.id === "first-tracks")!;
  const riteReceipt = api.CHRONICLE_RITES.find(r => r.id === "nursery-recognition")!;
  assert.equal(api.recordChronicleEvidence(ready, evidenceReceipt).changed, true);
  assert.equal(api.performChronicleRite(ready, riteReceipt).changed, true);
  const invalidValues = [
    null, undefined, false, [], {},
    { ...ready, version: 2, futureState: { keep: "untouched" } },
    { ...ready, version: "1" },
    { ...ready, evidence: undefined }, { ...ready, evidence: "broken" },
    { ...ready, rites: undefined }, { ...ready, rites: {} },
    { ...ready, legacyRecognition: undefined }, { ...ready, legacyRecognition: {} },
    { ...ready, evidence: [...ready.evidence, null] },
    { ...ready, evidence: [...ready.evidence, { id: "future-proof", sourceId: "future.completed" }] },
    { ...ready, rites: [{ id: "nursery-recognition", sourceId: "unrecognized" }] },
    { ...ready, evidence: new Array(129).fill(ready.evidence[0]) },
    { ...ready, rites: new Array(65).fill(riteReceipt) },
  ];
  for (const value of invalidValues) {
    const before = JSON.stringify(value);
    for (const result of [api.recordChronicleEvidence(value, evidenceReceipt), api.performChronicleRite(value, riteReceipt)]) {
      assert.equal(result.accepted, false, before);
      assert.equal(result.changed, false, before);
    }
    assert.equal(JSON.stringify(value), before);
  }
  // Read-only salvage remains deliberately independent from permission to write.
  assert.equal(api.getChronicleRank({ ...ready, legacyRecognition: {} }), "youngling");
  const legacy = api.migrateV35ClanChronicle({ createdAt: "2026-09-13T12:00:00.000Z", profile: { rankId: "elder", honor: 1800 } });
  const legacyBefore = JSON.stringify(legacy.legacyRecognition);
  const start = api.recordChronicleEvidence(legacy, api.CHRONICLE_EVIDENCE.find(e => e.id === "intro-begun")!);
  assert.equal(start.accepted, true);
  assert.equal(JSON.stringify(start.state.legacyRecognition), legacyBefore);
});
