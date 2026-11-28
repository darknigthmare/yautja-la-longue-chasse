import assert from "node:assert/strict";
import { test } from "node:test";
import { admitLegacyElitePreparation, admitEliteCampaign, qa } from "./helpers/elite-recognition-played-v175.mjs";

const ceremony = qa.load("app/game/systems/eliteRecognitionV174.ts");
const trialRules = qa.load("app/game/systems/eliteClanRitesV175.ts");
const drill = qa.load("app/game/systems/trainingDrill.ts");
const saves = qa.load("app/game/save.ts");
const chronicle = qa.load("app/game/systems/clanChronicle.ts");
const { ELITE_RECOGNITION_POSTS: POSTS } = ceremony;
const { rankCampaignReceiptsV168: rankReceipts } = qa.load("app/game/systems/rankRiteDossierV168.ts");
const owner = "2026-11-27T08:45:00.000Z";
const admission = admitLegacyElitePreparation();

function command(save, operation, position, expectedRevision = save.eliteRecognitionV174?.revision ?? 0) {
  return ceremony.commitEliteRecognition(save, { operation, position, expectedRevision });
}

test("the return requires the same owner's authentic Cradle, solo return and mastery, plus honor and no freeze", () => {
  assert(ceremony.canEnterEliteRecognition(admission));
  for (const field of ["buriedCradle", "quatzaRij", "eliteMasteryV170"]) {
    const missing = { ...admission, [field]: null };
    assert(!ceremony.canEnterEliteRecognition(missing), field);
    assert(!command(missing, { type: "audience", audience: "public" }, POSTS.entry).ok);
  }
  assert(!ceremony.canEnterEliteRecognition({ ...admission, createdAt: "2026-11-27T08:46:00.000Z" }));
  assert(!ceremony.canEnterEliteRecognition({ ...admission, profile: { ...admission.profile, honor: 4999 } }));
  assert(!ceremony.canEnterEliteRecognition({ ...admission, tribunalV147: { freeze: { rankId: "blooded" }, exile: null } }));
  assert(!ceremony.canWalkEliteRecognition({ row: 1, column: 4 }));
  assert(!ceremony.canWalkEliteRecognition({ row: -1, column: 1 }));
  assert(!command(admission, { type: "mark" }, POSTS.mark).ok);
  assert(!command(admission, { type: "audience", audience: "public" }, POSTS.crown).ok);
});

for (const audience of ["public", "restricted"]) test("physical proofs, witness and reload preserve a " + audience + " preparatory return", () => {
  let save = structuredClone(admission);
  function advance(operation, position) {
    const before = JSON.stringify(save);
    const result = command(save, operation, position);
    assert(result.ok, result.message);
    assert.equal(JSON.stringify(save), before);
    assert(ceremony.isEliteRecognitionSuccessor(save.eliteRecognitionV174, result.state));
    save = JSON.parse(JSON.stringify({ ...save, eliteRecognitionV174: result.state }));
    assert(ceremony.eliteRecognitionMatchesSave(save));
  }
  advance({ type: "audience", audience }, POSTS.entry);
  assert(!command(save, { type: "hear" }, POSTS[audience]).ok);
  assert(!command(save, { type: "present", proof: "crown" }, POSTS.mastery).ok);
  assert(!command(save, { type: "present", proof: "crown" }, POSTS.crown, 0).ok);
  for (const proof of ["mastery", "crown", "hunt"]) advance({ type: "present", proof }, POSTS[proof]);
  assert(!command(save, { type: "hear" }, POSTS[audience === "public" ? "restricted" : "public"]).ok);
  assert(!command(save, { type: "mark" }, POSTS.mark).ok);
  advance({ type: "hear" }, POSTS[audience]);
  advance({ type: "mark" }, POSTS.mark);
  assert.deepEqual(save.eliteRecognitionV174, {
    version: 1, ownerCreatedAt: owner, revision: 6,
    proofs: ["mastery", "crown", "hunt"], audience, witnessed: true, prepared: true,
  });
  assert.deepEqual(save.prologue, admission.prologue, "Preparing the receipt grants no narrative rite");
  assert.deepEqual(save.profile, admission.profile, "Career rank and honor remain unchanged");
  assert(!command(save, { type: "mark" }, POSTS.mark).ok);
  assert(ceremony.eliteRecognitionMatchesSave({ ...save, profile: { ...save.profile, honor: 400 } }));
  assert(!ceremony.eliteRecognitionMatchesSave({ ...save, quatzaRij: null }));
  assert.equal(ceremony.inspectEliteRecognition({ ...save.eliteRecognitionV174, version: 2 }, owner).status, "future-version");
  assert(!ceremony.isEliteRecognitionSuccessor(null, save.eliteRecognitionV174));
  assert(!ceremony.isEliteRecognitionSuccessor(save.eliteRecognitionV174, { ...save.eliteRecognitionV174, revision: 7 }));
});

test("the hall exposes preparation through actual board focus and advertises no rank grant", () => {
  const html = qa.render("app/game/EliteRecognition.tsx", { save: admission, onClose() {}, onCommand() { throw new Error("No SSR writes"); } });
  assert.match(html, /data-elite-recognition-board/);
  assert.match(html, /data-elite-audience="public"/);
  assert.match(html, /data-elite-audience="restricted"/);
  assert.doesNotMatch(html, /data-elite-mark|insigne Élite/);
});

function playedTrial(trial, override) {
  let state = drill.startTrainingDrill(drill.createTrainingDrill(trial.disciplineId, trial.seed, trial.clanPlasma));
  const trace = [];
  for (const [index, expected] of state.sequence.entries()) {
    const action = override?.(expected, index) ?? expected;
    state = drill.stepTrainingDrill(state, 0.12);
    trace.push({ action, elapsedSeconds: state.cueElapsedSeconds });
    state = drill.submitTrainingDrillAction(state, action).state;
  }
  assert.equal(state.status, "complete");
  return trace;
}

test("the clan opens L06 after its eight hunts and rejects a free sidecar score or protected shot", () => {
  const beforeQueen = admitEliteCampaign({ returnCrown: false });
  const [blades, plasma, hunt] = trialRules.ELITE_CLAN_TRIALS;
  assert(trialRules.canEnterEliteClanRites(beforeQueen));
  assert(!ceremony.canEnterEliteRecognition(beforeQueen));
  const start = command(beforeQueen, { type: "trial", id: blades.id, trace: playedTrial(blades) }, POSTS.entry);
  assert(start.ok, start.message);
  const bound = { ...beforeQueen, eliteRecognitionV174: start.state };
  assert(ceremony.eliteRecognitionMatchesSave(bound));
  assert(!command(bound, { type: "trial", id: hunt.id, trace: playedTrial(hunt) }, POSTS.entry).ok);
  assert(!command(bound, { type: "trial", id: plasma.id, trace: playedTrial(plasma, (cue, index) => index === 3 ? "primary" : cue) }, POSTS.entry).ok);
  assert(!command(bound, { type: "trial", id: plasma.id, score: 100, trace: [] }, POSTS.entry).ok);
  assert(!command(bound, { type: "trial", id: plasma.id, trace: playedTrial(plasma) }, POSTS.public).ok);
  assert.equal(chronicle.getChronicleRank(bound.prologue.chronicle), "blooded");
  const droppedHunt = structuredClone(bound);
  droppedHunt.missionProgress[Object.keys(droppedHunt.missionProgress)[0]].status = "available";
  assert(!trialRules.canEnterEliteClanRites(droppedHunt));
  assert(!ceremony.eliteRecognitionMatchesSave(droppedHunt));
});

test("the real campaign records each exercise, rejects standalone promotion and commits Elite atomically", () => {
  let save = admitEliteCampaign();
  const memory = new Map();
  const disk = { getItem: key => memory.get(key) ?? null, setItem: (key, value) => memory.set(key, value),
    removeItem: key => memory.delete(key) };
  const initial = saves.replaceSaveWithStatus(save, disk);
  assert(initial.persisted, initial.failure);
  save = initial.save;
  const advance = (operation, position) => {
    const result = command(save, operation, position);
    assert(result.ok, result.message);
    assert(ceremony.isEliteRecognitionSuccessor(save.eliteRecognitionV174, result.state));
    const next = { ...save, eliteRecognitionV174: result.state, ...(result.prologue ? { prologue: result.prologue } : {}) };
    const written = saves.writeSaveWithStatus(next, disk);
    assert(written.persisted, written.failure);
    const imported = saves.parseSaveImport(saves.exportSave(written.save));
    assert(imported.save, imported.failure);
    save = imported.save;
  };
  assert.equal(chronicle.getChronicleRank(save.prologue.chronicle), "blooded");
  advance({ type: "audience", audience: "restricted" }, POSTS.entry);
  for (const proof of ["mastery", "crown", "hunt"]) advance({ type: "present", proof }, POSTS[proof]);
  advance({ type: "hear" }, POSTS.restricted);
  advance({ type: "mark" }, POSTS.mark);
  assert(!command(save, { type: "recognize" }, POSTS.mark).ok);
  for (const trial of trialRules.ELITE_CLAN_TRIALS) advance({
    type: "trial", id: trial.id, trace: playedTrial(trial),
  }, POSTS.entry);
  assert.equal(chronicle.getChronicleRank(save.prologue.chronicle), "blooded");
  assert(!command(save, { type: "recognize" }, POSTS.crown).ok);
  const forged = command(save, { type: "recognize" }, POSTS.mark);
  assert(forged.ok, forged.message);
  assert(!saves.writeSaveWithStatus({ ...save, prologue: forged.prologue }, disk).persisted);
  assert(!saves.writeSaveWithStatus({ ...save, eliteRecognitionV174: forged.state }, disk).persisted);
  const stale = save;
  advance({ type: "recognize" }, POSTS.mark);
  assert.equal(chronicle.getChronicleRank(save.prologue.chronicle), "elite");
  assert(save.eliteRecognitionV174.recognized);
  assert.equal(rankReceipts(save)[1].status, "recognized");
  assert.notEqual(rankReceipts({ ...save, quatzaRij: null })[1].status, "recognized");
  assert.equal(saves.writeSaveWithStatus(stale, disk).failure, "save-conflict");
  assert(!command(save, { type: "recognize" }, POSTS.mark).ok);
});

test("the chief writes one owner-bound mandate after trials reached on the arena floor", () => {
  const hall = trialRules.ELITE_CLAN_RITES_POSTS;
  assert(trialRules.canWalkEliteClanRites(hall.hunt));
  assert(!trialRules.canWalkEliteClanRites({ column: 4, row: 3 }));
  assert(!trialRules.canWalkEliteClanRites({ column: 4, row: 1 }));
  const diskState = new Map();
  const disk = { getItem: key => diskState.get(key) ?? null, setItem: (key, value) => diskState.set(key, value),
    removeItem: key => diskState.delete(key) };
  let save = saves.replaceSaveWithStatus(admitEliteCampaign({ returnCrown: false }), disk).save;
  assert(save && !save.buriedCradle);
  const mandate = { type: "queen-mandate" };
  assert(!command(save, mandate, hall.hunt).ok);
  for (const trial of trialRules.ELITE_CLAN_TRIALS) {
    const result = command(save, { type: "trial", id: trial.id, trace: playedTrial(trial) }, hall[trial.id]);
    assert(result.ok, result.message);
    const written = saves.writeSaveWithStatus({ ...save, eliteRecognitionV174: result.state }, disk);
    assert(written.persisted, written.failure);
    save = written.save;
  }
  const legacy = save;
  assert(saves.parseSaveImport(saves.exportSave(legacy)).save, "Campaigns with old trials remain readable");
  assert(!command(save, mandate, hall.entry).ok);
  assert(!command(save, mandate, hall.hunt, 2).ok);
  const result = command(save, mandate, hall.hunt);
  assert(result.ok, result.message);
  const written = saves.writeSaveWithStatus({ ...save, eliteRecognitionV174: result.state }, disk);
  assert(written.persisted, written.failure);
  const imported = saves.parseSaveImport(saves.exportSave(written.save)).save;
  assert(imported.eliteRecognitionV174.queenMandate);
  assert.equal(imported.eliteRecognitionV174.revision, 4);
  assert.equal(chronicle.getChronicleRank(imported.prologue.chronicle), "blooded");
  assert(!imported.buriedCradle);
  assert.deepEqual(imported.prologue, legacy.prologue);
  assert(!command(imported, mandate, hall.hunt).ok);
  assert(!saves.writeSaveWithStatus(legacy, disk).persisted);
  const tampered = { ...legacy.eliteRecognitionV174, trials: legacy.eliteRecognitionV174.trials.slice(0, 2),
    queenMandate: true };
  assert.equal(ceremony.inspectEliteRecognition(tampered, legacy.createdAt).status, "invalid-save");
});
