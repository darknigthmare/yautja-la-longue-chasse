import test from "node:test";
import assert from "node:assert/strict";
import { homeworldSceneSsrV78 } from "./helpers/homeworld-scene-ssr-v78.mjs";

const qa = homeworldSceneSsrV78();
const trials = qa.load("app/game/systems/rankTrialsV168.ts");
const saves = qa.load("app/game/save.ts");
const progression = qa.load("app/game/systems/progression.ts");
const { MISSION_BY_ID } = qa.load("app/game/data.ts");

const CREATED = "2026-11-20T08:00:00.000Z";
const LATER = "2026-11-20T10:00:00.000Z";

function campaignSave(profile = {}, missionsDone = 8) {
  const save = saves.defaultSave(CREATED);
  save.profile = { ...save.profile, ...profile };
  const ids = Object.keys(save.missionProgress);
  ids.slice(0, missionsDone).forEach((id) => {
    save.missionProgress[id] = { ...save.missionProgress[id], status: "completed", completions: 1, bestScore: 70 };
  });
  if (missionsDone < ids.length) save.missionProgress[ids[missionsDone]] = { ...save.missionProgress[ids[missionsDone]], status: "available" };
  return saves.normalizeSave(save);
}

function hunt(missionId, overrides = {}) {
  const mission = MISSION_BY_ID[missionId];
  return {
    missionId, difficultyId: "hunter", outcome: "success", score: 70,
    elapsedSeconds: mission.parTimeSeconds,
    completedObjectiveIds: mission.objectives.filter(({ required, kind }) => required || kind === "extract").map(({ id }) => id),
    honorEvents: [{ id: "objectifs", label: "Objectifs", value: 50, kind: "objective" }],
    trophyQuality: "blooded",
    trophyClaims: [{ id: `${missionId}-apex-${overrides.completedAt ?? LATER}`, definitionId: mission.trophy.id, targetName: mission.targetName,
      targetKind: mission.targetKind, partId: mission.trophy.partId, condition: "intact", quality: "blooded" }],
    kills: 6, scans: 3, secondWindUsed: false, completedAt: LATER,
    ...overrides,
  };
}

function triadOutcome(leftBehind = []) {
  const members = ["karhek", "saketh"].map((id) => ({ id, status: leftBehind.includes(id) ? "left-behind" : "extracted", health: 50, maxHealth: 100 }));
  return { version: 1, runId: "run", plan: { version: 1, method: "pod", team: "triad" }, members,
    extracted: members.filter((m) => m.status === "extracted").map((m) => m.id), leftBehind, injured: [] };
}

function arm(save, partId) {
  const update = trials.armRankTrialV168(save, partId, LATER);
  assert.equal(update.ok, true, update.message);
  return saves.normalizeSave({ ...save, profile: update.profile });
}

const status = (save, rankId) => trials.rankTrialStatusV168(save, rankId);

test("bible : un volet par rang, substituts annoncés, seuils V166", () => {
  assert.deepEqual(trials.RANK_TRIALS_V168.map((t) => [t.rankId, t.bibleTrial, t.threshold]), [
    ["blooded", "la pyramide", 1_500], ["elite", "crâne de reine + Quatza-Rij seul", 5_000], ["elder", "transmission observée", 8_000],
  ]);
  for (const trial of trials.RANK_TRIALS_V168) {
    assert.ok(trial.parts.some((part) => part.kind === "hunt"), `${trial.rankId} : au moins une chasse jouable`);
    for (const part of trial.parts) {
      if (part.origin === "substitut proposé") assert.ok(part.missingContent, `${part.id} nomme le contenu absent`);
      if (part.kind === "hunt") assert.ok(MISSION_BY_ID[part.hunt.missionId], `${part.id} vise une chasse existante`);
    }
  }
  assert.equal(trials.RANK_TRIAL_BY_ID_V168.elite.parts.find((p) => p.kind === "proof").origin, "bible");
});

test("déblocage au seuil : l'honneur seul ne fait plus monter", () => {
  const below = campaignSave({ honor: 1_499 }, 5);
  assert.equal(status(below, "blooded"), "locked-honor");
  assert.equal(trials.armRankTrialV168(below, "blooded-sanctuary-hunt", LATER).ok, false);
  const at = campaignSave({ honor: 1_500 }, 5);
  assert.equal(at.profile.rankId, "young-blood");
  assert.equal(status(at, "blooded"), "unlocked");
  assert.equal(status(at, "elite"), "locked-previous-rank");

  // Une chasse ordinaire au-dessus du seuil ne promeut pas.
  const ordinary = saves.applyMissionResult(at, hunt("volcano-bad-blood"));
  assert.ok(ordinary.profile.honor > 1_500);
  assert.equal(ordinary.profile.rankId, "young-blood");
  assert.equal(ordinary.profile.rankTrialsV168.attemptCounts["blooded-sanctuary-hunt"], undefined, "non engagée : aucune tentative");

  // Une partie qui passe 5 000 sans épreuve reste au rang acquis.
  const rich = campaignSave({ honor: 9_000 });
  assert.equal(rich.profile.rankId, "young-blood");
  assert.equal(status(rich, "blooded"), "unlocked");
});

test("montée seulement après réussite ; échec puis nouvel essai", () => {
  let save = arm(campaignSave({ honor: 1_500 }, 5), "blooded-sanctuary-hunt");
  assert.equal(save.profile.rankTrialsV168.armed.missionId, "volcano-bad-blood");

  // Une autre chasse ne consomme pas l'épreuve engagée.
  save = saves.applyMissionResult(save, hunt("jungle-vey"));
  assert.equal(save.profile.rankTrialsV168.armed.partId, "blooded-sanctuary-hunt");

  // Échec : infraction au code pendant la chasse d'épreuve.
  const failed = saves.applyMissionResult(save, hunt("volcano-bad-blood", {
    honorEvents: [{ id: "accept-final-duel", label: "Duel rompu", value: -30, kind: "violation" }],
  }));
  assert.equal(failed.profile.rankId, "young-blood");
  const trialState = failed.profile.rankTrialsV168;
  assert.equal(trialState.armed, null);
  assert.equal(trialState.attemptCounts["blooded-sanctuary-hunt"], 1);
  assert.deepEqual(trialState.attempts.at(-1).reasons, ["Le code a été enfreint pendant la chasse."]);
  const view = trials.rankTrialViewsV168(failed).find((v) => v.trial.rankId === "blooded");
  assert.equal(view.status, "unlocked", "l'épreuve reste ouverte après un échec");
  assert.deepEqual(view.parts[0].lastFailureReasons, ["Le code a été enfreint pendant la chasse."]);

  // Une chasse perdue compte aussi comme tentative.
  const lost = saves.applyMissionResult(arm(failed, "blooded-sanctuary-hunt"), hunt("volcano-bad-blood", { outcome: "failed", trophyClaims: [], trophyQuality: null }));
  assert.equal(lost.profile.rankTrialsV168.attemptCounts["blooded-sanctuary-hunt"], 2);
  assert.equal(lost.profile.rankId, "young-blood");

  // Nouvel essai réussi.
  const passed = saves.applyMissionResult(arm(lost, "blooded-sanctuary-hunt"), hunt("volcano-bad-blood", { completedAt: "2026-11-20T11:00:00.000Z" }));
  assert.equal(passed.profile.rankId, "blooded");
  assert.equal(passed.profile.acquiredRankIdV166, "blooded");
  assert.deepEqual(passed.profile.rankTrialsV168.passed.map(({ rankId, via }) => [rankId, via]), [["blooded", "trial"]]);
  assert.equal(passed.profile.rankTrialsV168.attemptCounts["blooded-sanctuary-hunt"], 3);
  assert.equal(trials.armRankTrialV168(passed, "blooded-sanctuary-hunt", LATER).ok, false, "déjà acquis");
});

test("Elite : crête du Berceau ET traque solitaire ; Elder : triade ramenée", () => {
  let save = campaignSave({ honor: 5_000, rankId: "blooded", acquiredRankIdV166: "blooded" });
  assert.equal(status(save, "elite"), "unlocked");
  save = saves.applyMissionResult(arm(save, "elite-solitary-hunt"), hunt("ice-cryostalker", { secondWindUsed: true }));
  assert.deepEqual(save.profile.rankTrialsV168.attempts.at(-1).reasons, ["Le second souffle a été utilisé."]);
  save = saves.applyMissionResult(arm(save, "elite-solitary-hunt"), hunt("ice-cryostalker", { insertionOutcome: triadOutcome() }));
  assert.deepEqual(save.profile.rankTrialsV168.attempts.at(-1).reasons, ["L'épreuve se passe seul : la triade est partie."]);
  save = saves.applyMissionResult(arm(save, "elite-solitary-hunt"), hunt("ice-cryostalker", { completedAt: "2026-11-20T12:00:00.000Z" }));
  assert.deepEqual(save.profile.rankTrialsV168.completedPartIds, ["elite-solitary-hunt"]);
  assert.equal(save.profile.rankId, "blooded", "sans crête, pas de rang (L-07)");

  // La crête rapportée (Berceau enfoui) complète l'épreuve à la normalisation.
  const crown = { ...save, buriedCradle: { crownDelivered: true } };
  const settled = trials.settleRankTrialsV168(crown, LATER);
  assert.equal(settled.profile.rankId, "elite");
  assert.equal(trials.settleRankTrialsV168(settled, LATER), settled, "idempotent");

  // Elder : mener la triade et la ramener entière.
  let elder = campaignSave({ honor: 8_000, rankId: "elite", acquiredRankIdV166: "elite" });
  elder = saves.applyMissionResult(arm(elder, "elder-led-triad-hunt"), hunt("ruins-ancient-guardian"));
  assert.deepEqual(elder.profile.rankTrialsV168.attempts.at(-1).reasons, ["L'épreuve demande de mener la triade."]);
  elder = saves.applyMissionResult(arm(elder, "elder-led-triad-hunt"), hunt("ruins-ancient-guardian", { insertionOutcome: triadOutcome(["saketh"]) }));
  assert.deepEqual(elder.profile.rankTrialsV168.attempts.at(-1).reasons, ["Un membre de la triade n'a pas été ramené."]);
  elder = saves.applyMissionResult(arm(elder, "elder-led-triad-hunt"), hunt("ruins-ancient-guardian", { insertionOutcome: triadOutcome(), completedAt: "2026-11-20T13:00:00.000Z" }));
  assert.equal(elder.profile.rankId, "elder");
});

test("honneur repassé sous le seuil : épreuve verrouillée, rang acquis conservé", () => {
  // L'honneur ne baisse pas encore en jeu (constat V166) ; on le simule.
  const blooded = campaignSave({ honor: 900, rankId: "blooded", acquiredRankIdV166: "blooded" });
  assert.equal(blooded.profile.rankId, "blooded");
  assert.equal(status(blooded, "blooded"), "passed");
  assert.equal(status(blooded, "elite"), "locked-honor");

  const armed = arm(campaignSave({ honor: 5_100, rankId: "blooded", acquiredRankIdV166: "blooded" }), "elite-solitary-hunt");
  const dropped = saves.normalizeSave({ ...armed, profile: { ...armed.profile, honor: 4_900 } });
  assert.equal(status(dropped, "elite"), "locked-honor");
  assert.equal(dropped.profile.rankId, "blooded");
  assert.equal(trials.armRankTrialV168(dropped, "elite-solitary-hunt", LATER).ok, false);
  // La chasse engagée avant la baisse n'est pas comptée et se désengage.
  const after = saves.applyMissionResult(dropped, hunt("ice-cryostalker", { honorEvents: [] }));
  assert.equal(after.profile.rankTrialsV168.armed, null);
  assert.equal(after.profile.rankTrialsV168.attemptCounts["elite-solitary-hunt"], undefined);

  // Volets réussis puis honneur sous le seuil : pas de reconnaissance tant que verrouillée.
  const parts = { ...trials.createRankTrialsV168(), completedPartIds: ["elite-solitary-hunt"] };
  const low = saves.normalizeSave({ ...dropped, buriedCradle: undefined, profile: { ...dropped.profile, honor: 4_000, rankTrialsV168: parts } });
  assert.equal(trials.settleRankTrialsV168({ ...low, buriedCradle: { crownDelivered: true } }, LATER).profile.rankId, "blooded");
});

test("migration : les rangs déjà acquis sont réputés épreuve réussie", () => {
  // Sauvegarde V166 (champ acquis, pas d'état V168).
  const v166 = saves.defaultSave(CREATED);
  v166.profile = { ...v166.profile, honor: 5_200, rankId: "elite", acquiredRankIdV166: "elite" };
  delete v166.profile.rankTrialsV168;
  const migrated = saves.normalizeSave(v166);
  assert.equal(migrated.profile.rankId, "elite");
  assert.deepEqual(migrated.profile.rankTrialsV168.passed.map(({ rankId, via }) => [rankId, via]), [["blooded", "migration"], ["elite", "migration"]]);
  assert.equal(status(migrated, "elder"), "locked-honor");

  // Sauvegarde antérieure à V166 : rang des anciens seuils conservé.
  for (const [honor, expected] of [[0, "young-blood"], [250, "blooded"], [650, "elite"], [1_800, "elder"]]) {
    const legacy = saves.defaultSave(CREATED);
    legacy.profile = { ...legacy.profile, honor };
    delete legacy.profile.acquiredRankIdV166;
    delete legacy.profile.rankTrialsV168;
    const result = saves.normalizeSave(legacy);
    assert.equal(result.profile.rankId, expected, `honneur ${honor}`);
    assert.equal(result.profile.honor, honor);
    assert.equal(result.profile.rankTrialsV168.passed.length, ["young-blood", "blooded", "elite", "elder"].indexOf(expected));
    assert.deepEqual(saves.normalizeSave(result), result, "migration stable");
  }

  // V166 promouvait au seuil au chargement : une sauvegarde V166 au-dessus
  // d'un seuil garde ce rang (aucune partie ne perd ce qu'elle affichait).
  const v166High = saves.defaultSave(CREATED);
  v166High.profile = { ...v166High.profile, honor: 1_600, acquiredRankIdV166: "young-blood" };
  delete v166High.profile.rankTrialsV168;
  assert.equal(saves.normalizeSave(v166High).profile.rankId, "blooded");

  // Champ V168 illisible : traité comme antérieur, jamais comme une perte.
  const broken = saves.defaultSave(CREATED);
  broken.profile = { ...broken.profile, honor: 100, acquiredRankIdV166: "elder", rankTrialsV168: { version: 99 } };
  assert.equal(saves.normalizeSave(broken).profile.rankId, "elder");
});

test("aller-retour de sauvegarde : état, tentatives et épreuve engagée conservés", () => {
  let save = arm(campaignSave({ honor: 1_500 }, 5), "blooded-sanctuary-hunt");
  save = saves.applyMissionResult(save, hunt("volcano-bad-blood", { secondWindUsed: true, honorEvents: [{ id: "x", label: "x", value: -10, kind: "violation" }] }));
  save = arm(save, "blooded-sanctuary-hunt");
  const exported = JSON.parse(JSON.stringify(save));
  const reloaded = saves.normalizeSave(exported);
  assert.deepEqual(reloaded.profile, save.profile);
  assert.deepEqual(reloaded.profile.rankTrialsV168.armed.partId, "blooded-sanctuary-hunt");
  assert.equal(reloaded.profile.rankTrialsV168.attemptCounts["blooded-sanctuary-hunt"], 1);

  // Entrées forgées ou inconnues ignorées.
  const forged = saves.normalizeSave({ ...exported, profile: { ...exported.profile, rankTrialsV168: {
    version: 1, passed: [{ rankId: "black-god", via: "trial", at: LATER }], completedPartIds: ["elite-queen-crest", "nope"],
    attemptCounts: { nope: 3 }, attempts: [{ partId: "nope" }], armed: { rankId: "elite", partId: "blooded-sanctuary-hunt", missionId: "volcano-bad-blood", armedAt: LATER },
  } } });
  assert.deepEqual(forged.profile.rankTrialsV168, trials.createRankTrialsV168());
  assert.equal(forged.profile.rankId, "young-blood");
});

test("progression : la console expose les épreuves avec le contenu manquant", () => {
  const save = campaignSave({ honor: 1_500 }, 5);
  const state = progression.createDefaultShipProgression(save);
  const views = trials.rankTrialViewsV168(save, { triadAccess: { allowed: false, reason: "Le rite Blooded doit être reconnu." } });
  assert.deepEqual(views.map((v) => v.status), ["unlocked", "locked-previous-rank", "locked-previous-rank"]);
  assert.match(views[0].parts[0].part.missingContent, /Nef de la Reine/);
  // 5 chasses faites : celle d'Acheron-Sigma est encore verrouillée.
  assert.deepEqual(views[2].parts[0].blockers, ["La chasse de cette épreuve n'est pas encore ouverte.", "Le rite Blooded doit être reconnu."]);
  assert.deepEqual(trials.rankTrialViewsV168(campaignSave({ honor: 1_500 }), {}).at(-1).parts[0].blockers, []);
  const snapshot = progression.evaluateClanProgression(save, state);
  assert.deepEqual(snapshot.rankTrialsV168.map((v) => v.status), ["unlocked", "locked-previous-rank", "locked-previous-rank"]);
  assert.equal(snapshot.rankId, "young-blood");
});
