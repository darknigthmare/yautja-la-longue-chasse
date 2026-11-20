import assert from "node:assert/strict";
import { test } from "node:test";
import { createRequire } from "node:module";
import { build } from "esbuild";
import { homeworldInteriorPointFixture } from "./helpers/homeworld-interior-point-fixture.mjs";

const bundle = await build({ stdin: { contents: `
export * as sources from './app/game/systems/honorSourcesV169';
export * as honor from './app/game/systems/honorProgressionV166';
export * as saves from './app/game/save';
export * as contracts from './app/game/systems/homeworldContractsV68';
export * as justice from './app/game/systems/justice';
export * as chronicle from './app/game/systems/clanChronicle';
export * as sideStory from './app/game/systems/homeworldSideStoryV66';
export {HOMEWORLD_REGIONS_V68,HOMEWORLD_REGION_TRACES_V68} from './app/game/systems/homeworldRegionsV68';
export {homeworldInteriorForBuildingV64,isHomeworldInteriorWalkableV64,nearestHomeworldInteriorTargetV64} from './app/game/systems/homeworldInteriorsV64';
export {MISSIONS,MISSION_BY_ID} from './app/game/data';
`, resolveDir: process.cwd() }, bundle: true, write: false, format: "cjs", platform: "node",
external: ["react", "react/jsx-runtime", "react-dom"], loader: { ".css": "empty" }, outfile: "honor-sources-v169-test.cjs", logLevel: "silent" });
const evaluated = { exports: {} };
new Function("require", "module", "exports", bundle.outputFiles.find(item => item.path.endsWith(".cjs")).text)(createRequire(import.meta.url), evaluated, evaluated.exports);
const api = evaluated.exports;
const { sources, honor, saves, contracts, justice } = api;

const CREATED = "2026-11-20T08:00:00.000Z";

// ---------------------------------------------------------------------------
// Fixtures réelles : contrat remis par le registre V68, dossier de justice joué
// ---------------------------------------------------------------------------

const contract = id => contracts.HOMEWORLD_ALL_CONTRACTS_V69.find(item => item.id === id);
const where = definition => {
  const room = api.homeworldInteriorForBuildingV64(definition.buildingId);
  return { eligible: true, interiorId: room.buildingId, pointId: definition.pointId, npcId: definition.giverNpcId,
    actor: homeworldInteriorPointFixture(api, room, definition.pointId), suspended: false };
};
const fieldActor = (regionId, action) => action === "survey" ? { x: api.HOMEWORLD_REGION_TRACES_V68[2].x, y: api.HOMEWORLD_REGION_TRACES_V68[2].y }
  : action === "recover" ? { x: 7720, y: 2220 }
  : action === "report" ? { x: api.HOMEWORLD_REGIONS_V68[regionId].residents[0].x, y: api.HOMEWORLD_REGIONS_V68[regionId].residents[0].y + 45 }
  : { x: 7450, y: 2050 };
const fieldEvent = (regionId, action, overrides = {}) => ({ version: 1, regionId, runId: "village-fresh-1", tick: 1500,
  action, siteId: `${regionId}-${action === "survey" ? "trail-3" : action === "recover" ? "cache" : action === "report" ? "guide" : action}`,
  targetId: `${regionId}-${action === "survey" ? "trail" : action === "report" ? "guide" : action === "track" || action === "challenge" ? "fauna" : "relay"}`,
  walked: 2300, actor: fieldActor(regionId, action), trailCount: 3, evaded: 2, armed: false,
  observedTicks: 90, touches: 3, interventions: 2, ...overrides });
function deliveredContract(id) {
  const definition = contract(id);
  let state = contracts.applyHomeworldContractV68(undefined, { contractId: id, kind: "accept" }, where(definition)).state;
  for (const [index, objective] of definition.objectives.entries()) {
    const runId = `village-fresh-${index + 1}`;
    state = contracts.bindContractsVillageRunV68(state, objective.regionId, runId).state;
    const proof = fieldEvent(objective.regionId, objective.action, { runId });
    const ctx = { regionId: objective.regionId, runId, suspended: false };
    state = contracts.recordContractsFieldEventV68(state, proof, ctx).state;
    state = contracts.recordContractsFieldEventV68(state, fieldEvent(objective.regionId, "report", { runId, tick: proof.tick + 300 }), ctx).state;
  }
  const paid = contracts.applyHomeworldContractV68(state, { contractId: id, kind: "deliver" }, where(definition));
  assert.equal(paid.ok, true, paid.message);
  assert.equal(paid.state.entries[0].status, "completed");
  return paid.state;
}
function act(progress, action) {
  const result = justice.applyJusticeAction(progress, action);
  assert.equal(result.ok, true, result.message);
  return result.progress;
}
/** Revente rituelle choisie, transmise, identifiée, reddition, puis verdict. */
function resaleVerdict(method) {
  let p = justice.defaultJusticeProgress();
  p = act(p, { type: "choose-origin", choice: "resale" });
  p = act(p, { type: "transmit-evidence", evidenceId: "cargo-recording", jurisdictionId: "homeworld" });
  p = act(p, { type: "identify", jurisdictionId: "homeworld", source: "transponder" });
  p = act(p, { type: "request-control", jurisdictionId: "homeworld" });
  p = act(p, { type: "answer-control", response: "surrender" });
  return act(p, { type: "resolve-case", incidentId: "ritual-trophy-case", method });
}
function badBloodDeclared() {
  let p = justice.defaultJusticeProgress();
  p = act(p, { type: "choose-origin", choice: "resale" });
  p = act(p, { type: "transmit-evidence", evidenceId: "cargo-recording", jurisdictionId: "homeworld" });
  p = act(p, { type: "identify", jurisdictionId: "homeworld", source: "transponder" });
  return act(p, { type: "defy-warrant" });
}

function freshSave(profile = {}) {
  const save = saves.defaultSave(CREATED);
  save.profile = { ...save.profile, ...profile };
  return save;
}
function memoryStorage() {
  const values = new Map();
  return { values, getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) };
}
const chronicleWith = ids => ({ version: 1, evidence: ids.map(id => ({ id, sourceId: api.chronicle.CHRONICLE_EVIDENCE.find(e => e.id === id).sourceId })), rites: [], legacyRecognition: null });

// ---------------------------------------------------------------------------

test("contrat remis : versé une fois, à l'écriture comme au règlement répété", () => {
  const save = freshSave();
  save.homeworld = { ...save.homeworld, contractsV68: deliveredContract("ash-marches-track") };
  const once = sources.settleHonorSourcesV169(save);
  assert.equal(once.save.profile.honor, contract("ash-marches-track").rewardMarks, "1 honneur par marque (18)");
  assert.deepEqual(once.settled.map(({ id, source, delta }) => [id, source, delta]), [["contract:ash-marches-track", "contract", 18]]);
  const twice = sources.settleHonorSourcesV169(once.save);
  assert.equal(twice.changed, false);
  assert.equal(twice.save.profile.honor, 18);

  const storage = memoryStorage();
  const written = saves.writeSaveWithStatus(save, storage);
  assert.equal(written.persisted, true);
  assert.equal(written.save.profile.honor, 18);
  const rewritten = saves.writeSaveWithStatus(written.save, storage);
  assert.equal(rewritten.persisted, true);
  assert.equal(rewritten.save.profile.honor, 18, "un second enregistrement ne reverse rien");
  // Un contrat abandonné ou seulement accepté ne verse rien.
  const pending = freshSave();
  pending.homeworld = { ...pending.homeworld, contractsV68: contracts.applyHomeworldContractV68(undefined, { contractId: "ash-marches-track", kind: "accept" }, where(contract("ash-marches-track"))).state };
  assert.equal(sources.settleHonorSourcesV169(pending).save.profile.honor, 0);
});

test("chronique, campagnes solo, cité : chaque événement une fois, valeurs de la bible ou proposées", () => {
  const save = freshSave();
  save.prologue = { version: 1, status: "completed", checkpoint: null, completedAt: CREATED,
    chronicle: chronicleWith(["intro-begun", "intro-completed", "training-completed", "first-queen-hunt", "queen-mission-briefing"]) };
  save.soloV68 = { version: 1, status: "completed", completedAt: CREATED };
  save.soloV69 = { version: 1, status: "active", completedAt: null };
  const settled = sources.settleHonorSourcesV169(save);
  const byId = Object.fromEntries(settled.settled.map(({ id, delta }) => [id, delta]));
  assert.deepEqual(byId, {
    "chronicle:intro-completed": 100, // bible : Unblooded 100 à la fin de l'intro
    "chronicle:training-completed": 50, // proposé : (500 − 100) / 8
    "chronicle:first-queen-hunt": 400, // bible : reine 400
    "solo:soloV68": 50,
  });
  assert.equal(settled.save.profile.honor, 600);
  assert.equal(sources.settleHonorSourcesV169(settled.save).changed, false);
  // Valeurs : la chronique respecte le repère de la bible (Young Blood 500).
  const youth = ["intro-completed", "first-tracks", "training-completed", "unguided-hunt", "quatza-rij-triad-hunt",
    "temple-three-shadows-triad", "temple-three-shadows-changing-layout", "temple-three-shadows-no-energy", "initiation-return"];
  assert.equal(youth.reduce((sum, id) => sum + sources.CHRONICLE_HONOR_V169[id], 0), 500);
  assert.equal(sources.CHRONICLE_HONOR_V169["intro-begun"], 0);
  assert.equal(sources.CHRONICLE_HONOR_V169["elder-time-passage"], 0);
});

test("histoire annexe V66 conclue : 50, une fois ; en cours : rien", () => {
  const done = { version: 1, accepted: true, clues: api.sideStory.SIDE_STORY_CLUES_V66.map(({ id }) => id), archiveRead: true, chronologyVerified: true,
    deductionVerified: true, testimonyHeard: true, resolution: "recorded-review", branchVerified: true, completed: true };
  assert.equal(api.sideStory.isHomeworldSideStoryV66State(done), true);
  const save = freshSave();
  save.homeworld = { ...save.homeworld, sideStoryV66: { ...done, completed: false } };
  assert.equal(sources.settleHonorSourcesV169(save).save.profile.honor, 0);
  save.homeworld = { ...save.homeworld, sideStoryV66: done };
  const settled = sources.settleHonorSourcesV169(save);
  assert.equal(settled.save.profile.honor, 50);
  assert.equal(sources.settleHonorSourcesV169(settled.save).save.profile.honor, 50);
});

test("plafond : catalogue fini, rites plafonnés à 20 par chasse, violations − 15", () => {
  assert.equal(contracts.HOMEWORLD_ALL_CONTRACTS_V69.length, 32);
  assert.equal(contracts.HOMEWORLD_ALL_CONTRACTS_V69.reduce((sum, c) => sum + c.rewardMarks, 0), 1_142);
  assert.ok(sources.honorSourceCatalogueSizeV169() <= 256, "le registre ne peut pas déborder");
  const ev = (action, corpse, kind = "honored") => ({ id: `jungle-vey:0:${action}:${corpse}`, kind });
  const many = Array.from({ length: 10 }, (_, i) => ["mark", "flay", "hang"].map(a => ev(a, `c${i}`))).flat();
  assert.deepEqual(sources.riteHonorForRunV169(many, true), { gained: 20, lost: 0 });
  assert.deepEqual(sources.riteHonorForRunV169([ev("mark", "a"), ev("flay", "a")], true), { gained: 4, lost: 0 });
  assert.deepEqual(sources.riteHonorForRunV169([ev("flay", "a"), ev("flay", "b", "violation")], false), { gained: 0, lost: 15 },
    "chasse échouée : pas de gain, la violation compte");
  // Projection depuis l'état réel des rites V77 : marque sur proie indigne ignorée.
  const projected = sources.riteHonorEventsFromHuntV169({ runId: "jungle-vey:3", completedEventIds: ["mark:x", "flay:x", "mark:y", "hang:y", "flay:y"],
    corpses: [{ id: "x", worthy: true, protectedPrey: false }, { id: "y", worthy: false, protectedPrey: false }] });
  assert.deepEqual(projected, [
    { id: "jungle-vey:3:mark:x", kind: "honored" }, { id: "jungle-vey:3:flay:x", kind: "honored" },
    { id: "jungle-vey:3:flay:y", kind: "violation" }, { id: "jungle-vey:3:hang:y", kind: "violation" },
  ]);
});

function victory(missionId, overrides = {}) {
  const mission = api.MISSION_BY_ID[missionId];
  return {
    missionId, difficultyId: "hunter", outcome: "success", score: 70, elapsedSeconds: mission.parTimeSeconds,
    completedObjectiveIds: mission.objectives.filter(({ required, kind }) => required || kind === "extract").map(({ id }) => id),
    honorEvents: [{ id: "o", label: "Objectifs", value: 50, kind: "objective" }, { id: "t", label: "Trophée", value: 50, kind: "objective" }],
    trophyQuality: "blooded",
    trophyClaims: [{ id: `${missionId}-apex`, definitionId: mission.trophy.id, targetName: mission.targetName,
      targetKind: mission.targetKind, partId: mission.trophy.partId, condition: "intact", quality: "blooded" }],
    kills: 6, scans: 3, secondWindUsed: false, completedAt: CREATED, ...overrides,
  };
}

test("rites d'une chasse : réglés une fois par rencontre, jamais pour une rencontre périmée", () => {
  const base = freshSave();
  const rites = [{ id: "jungle-vey:0:mark:a", kind: "honored" }, { id: "jungle-vey:0:flay:a", kind: "honored" }, { id: "jungle-vey:0:hang:a", kind: "honored" }];
  const withoutRites = saves.applyMissionResult(base, victory("jungle-vey", { harvestEncounterRunV112: 0 }));
  const withRites = saves.applyMissionResult(base, victory("jungle-vey", { harvestEncounterRunV112: 0, riteEventsV169: rites }));
  assert.equal(withRites.profile.honor - withoutRites.profile.honor, 7, "1 + 3 + 3");
  assert.deepEqual(withRites.honorSourcesV169.riteSettledRuns, { "jungle-vey": 0 });
  assert.deepEqual(withRites.honorSourcesV169.riteTotals, { runs: 1, gained: 7, lost: 0 });
  // Rejouer le même résultat (rencontre 0) sur la sauvegarde réglée : refusé.
  const replayed = sources.applyRiteHonorV169(withRites, withRites, { missionId: "jungle-vey", outcome: "success", harvestEncounterRunV112: 0, riteEventsV169: rites });
  assert.equal(replayed.outcome.accepted, false);
  assert.equal(replayed.save.profile.honor, withRites.profile.honor);
  // Rencontre suivante : rites d'une autre rencontre refusés.
  const foreign = saves.applyMissionResult(withRites, victory("jungle-vey", { harvestEncounterRunV112: 1, riteEventsV169: rites }));
  assert.equal(foreign.honorSourcesV169.riteTotals.runs, 1);
  // Échec : violations comptées, aucun gain.
  const failed = saves.applyMissionResult(base, victory("jungle-vey", { outcome: "failed", harvestEncounterRunV112: 0,
    riteEventsV169: [{ id: "jungle-vey:0:flay:z", kind: "violation" }, { id: "jungle-vey:0:mark:a", kind: "honored" }] }));
  assert.deepEqual(failed.honorSourcesV169.riteTotals, { runs: 1, gained: 0, lost: 15 });
  assert.equal(failed.profile.honor, 0, "plancher à 0");
});

test("pertes : verdict de la justice, Bad Blood ; le rang acquis reste", () => {
  for (const [method, loss] of [["restitution", 500], ["conditional-release", 1_000]]) {
    const save = freshSave({ honor: 6_000, rankId: "elite", acquiredRankIdV166: "elite" });
    save.justice = resaleVerdict(method);
    const settled = sources.settleHonorSourcesV169(save);
    assert.equal(settled.save.profile.honor, 6_000 - loss, method);
    assert.equal(settled.save.profile.rankId, "elite");
    assert.equal(sources.settleHonorSourcesV169(settled.save).save.profile.honor, 6_000 - loss, "verdict compté une fois");
  }
  // Exonération : aucune perte. (Fausse accusation, attestation d'archives.)
  let p = justice.defaultJusticeProgress();
  p = act(p, { type: "choose-origin", choice: "investigator" });
  p = act(p, { type: "inspect-alibi" });
  const innocent = freshSave({ honor: 900 });
  innocent.justice = p;
  assert.equal(sources.settleHonorSourcesV169(innocent).save.profile.honor, 900);

  // Bad Blood : tout l'honneur du rang en cours (au-dessus du seuil du rang acquis).
  const elder = freshSave({ honor: 9_200, rankId: "elder", acquiredRankIdV166: "elder" });
  elder.justice = badBloodDeclared();
  const exiled = sources.settleHonorSourcesV169(elder);
  assert.equal(exiled.save.profile.honor, 8_000);
  assert.equal(exiled.save.profile.rankId, "elder");
  // Sous le seuil (rang déjà acquis) : rien de plus à perdre, le rang reste.
  const low = freshSave({ honor: 3_000, rankId: "elder", acquiredRankIdV166: "elder" });
  low.justice = badBloodDeclared();
  const lowSettled = sources.settleHonorSourcesV169(low);
  assert.equal(lowSettled.save.profile.honor, 3_000);
  assert.equal(saves.normalizeSave(lowSettled.save).profile.rankId, "elder");
  // Le plancher est 0.
  const poor = freshSave({ honor: 200 });
  poor.justice = resaleVerdict("restitution");
  assert.equal(sources.settleHonorSourcesV169(poor).save.profile.honor, 0);
});

test("ancienne sauvegarde : lue intacte ; au premier enregistrement, gains versés une fois, pertes non rétroactives", () => {
  const legacy = freshSave({ honor: 1_000, rankId: "elder" });
  delete legacy.honorSourcesV169;
  delete legacy.profile.acquiredRankIdV166;
  legacy.homeworld = { ...legacy.homeworld, contractsV68: deliveredContract("glass-desert-challenge") };
  legacy.justice = resaleVerdict("restitution");
  const read = saves.normalizeSave(legacy);
  assert.equal(read.honorSourcesV169, undefined, "la lecture n'ajoute rien");
  assert.equal(read.profile.honor, 1_000);
  assert.equal(read.profile.rankId, "elite", "rang affiché conservé (anciens seuils : 650 ≤ 1 000)");
  assert.deepEqual(saves.normalizeSave(read), read, "lecture stable");
  const parsed = saves.parseSaveImport(JSON.stringify(legacy));
  assert.equal(parsed.failure, null);
  assert.equal(parsed.save.profile.honor, 1_000);

  const written = saves.writeSaveWithStatus(read, memoryStorage());
  assert.equal(written.persisted, true);
  assert.equal(written.save.profile.honor, 1_032, "contrat 32 versé ; verdict antérieur inscrit sans perte");
  assert.deepEqual(written.save.honorSourcesV169.entries.map(({ id, delta }) => [id, delta]),
    [["contract:glass-desert-challenge", 32], ["justice:verdict:ritual-trophy-case", 0]]);
  assert.equal(written.save.profile.rankId, "elite");
  assert.equal(sources.settleHonorSourcesV169(written.save).changed, false);
  // Un import explicite écrit les octets choisis, sans règlement.
  const imported = saves.importSaveWithStatus(JSON.stringify(legacy), memoryStorage());
  assert.equal(imported.persisted, true);
  assert.equal(imported.save.profile.honor, 1_000);
});

test("sauvegarde aller-retour : registre conservé, version future et registre invalide refusés", () => {
  const save = freshSave();
  save.homeworld = { ...save.homeworld, contractsV68: deliveredContract("ash-marches-track") };
  const storage = memoryStorage();
  const written = saves.writeSaveWithStatus(save, storage);
  const reloaded = saves.loadSaveWithStatus(storage);
  assert.deepEqual(reloaded.save.honorSourcesV169, written.save.honorSourcesV169);
  assert.equal(reloaded.save.profile.honor, 18);
  const exported = JSON.parse(JSON.stringify(written.save));
  assert.deepEqual(saves.parseSaveImport(JSON.stringify(exported)).save.honorSourcesV169, written.save.honorSourcesV169);
  assert.equal(saves.parseSaveImport(JSON.stringify({ ...exported, honorSourcesV169: { ...exported.honorSourcesV169, version: 2 } })).failure, "future-version");
  const duplicated = { ...exported.honorSourcesV169, entries: [...exported.honorSourcesV169.entries, ...exported.honorSourcesV169.entries] };
  assert.equal(saves.parseSaveImport(JSON.stringify({ ...exported, honorSourcesV169: duplicated })).failure, "invalid-save");
  // Un registre illisible n'est jamais réécrit et ne reverse rien.
  const broken = { ...written.save, honorSourcesV169: { version: 1, entries: "x" } };
  assert.equal(sources.settleHonorSourcesV169(broken).changed, false);
  // Nouvelle partie : registre vide dès la création.
  assert.deepEqual(saves.defaultSave(CREATED).honorSourcesV169, sources.emptyHonorSourcesV169());
});

test("estimation : sources incluses, aucun rang du jeu à moins de 2 h du précédent, Black God très long", () => {
  const campaign = honor.campaignForEstimateV166(api.MISSIONS);
  const gameRanks = [{ label: "Blooded", threshold: 1_500 }, { label: "Elite", threshold: 5_000 }, { label: "Elder", threshold: 8_000 }, { label: "Black God", threshold: 40_000 }];
  const rapide = { campaignRewardMultiplier: 1.35, rewardMultiplier: 1.6, replayStrategy: "shortest", qualityBonus: 40, score: 100 };
  const scenarios = {
    reference: { extraSources: sources.paceSourcesV169() },
    "rapide, toutes sources": { ...rapide, extraSources: sources.paceSourcesV169({ includeUnplayedChronicle: true }) },
    // Borne la plus rapide : chasses et rites au plafond, sans activité de cité.
    "rapide, chasses + rites": { ...rapide, extraSources: { prelude: [], interleaved: [], perRunHonor: sources.RITE_HONOR_V169.capPerRun } },
  };
  for (const [name, assumptions] of Object.entries(scenarios)) {
    const pace = honor.estimateHonorPaceV166(campaign, { ...assumptions, thresholds: gameRanks });
    assert.equal(pace.length, 4, name);
    for (const tier of pace.slice(1)) assert.ok(tier.gapHours >= 2, `${name} : ${tier.label} à +${tier.gapHours.toFixed(2)} h`);
    assert.ok(pace.at(-1).hours >= 40, `${name} : Black God à ${pace.at(-1).hours.toFixed(1)} h`);
  }
  const reference = honor.estimateHonorPaceV166(campaign, scenarios.reference);
  assert.equal(reference.length, 10);
  assert.ok(reference.at(-1).hours > 80 && reference.at(-1).hours < 100, `Black God : ${reference.at(-1).hours}`);
  // Sans extraSources, l'estimation V166 est inchangée.
  assert.deepEqual(honor.estimateHonorPaceV166(campaign, { extraSources: undefined }), honor.estimateHonorPaceV166(campaign));
  // Le prélude et les activités ponctuelles sont comptés une seule fois.
  const s = sources.paceSourcesV169();
  assert.equal(new Set([...s.prelude, ...s.interleaved].map(({ id }) => id)).size, s.prelude.length + s.interleaved.length);
  const total = [...s.prelude, ...s.interleaved].reduce((sum, a) => sum + a.honor, 0);
  assert.equal(total, 450 + 1_142 + 150 + 400);
});
