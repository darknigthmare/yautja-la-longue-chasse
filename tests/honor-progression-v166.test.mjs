import test from "node:test";
import assert from "node:assert/strict";
import { homeworldSceneSsrV78 } from "./helpers/homeworld-scene-ssr-v78.mjs";

const qa = homeworldSceneSsrV78();
const honor = qa.load("app/game/systems/honorProgressionV166.ts");
const saves = qa.load("app/game/save.ts");
const progression = qa.load("app/game/systems/progression.ts");
const { MISSIONS, MISSION_BY_ID } = qa.load("app/game/data.ts");

const CREATED = "2026-11-20T08:00:00.000Z";
const campaign = honor.campaignForEstimateV166(MISSIONS);

// Bible, « Seuils d'honneur — décision » (6 novembre 2026), recopié.
const BIBLE = [
  [1, "Unblooded", 100], [2, "Young Blood", 500], [3, "Blooded", 1_500],
  [4, "Adjutant", 3_000], [5, "Elite", 5_000], [6, "Elder", 8_000],
  [7, "Clan Leader", 12_000], [8, "Adjudicator", 18_000],
  [9, "Philosopher", 25_000], [10, "Black God", 40_000],
];

function victory(missionId, overrides = {}) {
  const mission = MISSION_BY_ID[missionId];
  return {
    missionId, difficultyId: "hunter", outcome: "success", score: 70,
    elapsedSeconds: mission.parTimeSeconds,
    completedObjectiveIds: mission.objectives.filter(({ required, kind }) => required || kind === "extract").map(({ id }) => id),
    honorEvents: [{ id: "objectifs", label: "Objectifs", value: 50, kind: "objective" }, { id: "trophee", label: "Trophée", value: 50, kind: "objective" }],
    trophyQuality: "blooded",
    trophyClaims: [{ id: `${missionId}-apex`, definitionId: mission.trophy.id, targetName: mission.targetName,
      targetKind: mission.targetKind, partId: mission.trophy.partId, condition: "intact", quality: "blooded" }],
    kills: 6, scans: 3, secondWindUsed: false, completedAt: CREATED,
    ...overrides,
  };
}

function withProfile(profile) {
  const save = saves.defaultSave(CREATED);
  save.profile = { ...save.profile, ...profile };
  return save;
}

test("seuils : la table de la bible, Black God à 40 000, les rangs du jeu suivent la bible", () => {
  assert.deepEqual(honor.BIBLE_HONOR_TIERS_V166.map(({ level, bibleRank, threshold }) => [level, bibleRank, threshold]), BIBLE);
  assert.equal(honor.BLACK_GOD_HONOR_THRESHOLD_V166, 40_000);
  assert.equal(honor.BIBLE_HONOR_TIERS_V166.at(-1).threshold, 40_000);
  assert.deepEqual({ ...saves.RANK_THRESHOLDS }, { "young-blood": 0, blooded: 1_500, elite: 5_000, elder: 8_000 });
  for (const tier of honor.BIBLE_HONOR_TIERS_V166.filter(({ gameRankId }) => gameRankId)) {
    assert.equal(saves.RANK_THRESHOLDS[tier.gameRankId], tier.threshold, tier.bibleRank);
  }
  assert.equal(honor.rankForHonorV166(1_499), "young-blood");
  assert.equal(honor.rankForHonorV166(1_500), "blooded");
  assert.equal(honor.rankForHonorV166(4_999), "blooded");
  assert.equal(honor.rankForHonorV166(5_000), "elite");
  assert.equal(honor.rankForHonorV166(8_000), "elder");
  assert.equal(honor.nextBibleTierV166(8_000).bibleRank, "Clan Leader");
  assert.equal(honor.nextBibleTierV166(40_000), null);
});

test("migration : une sauvegarde antérieure garde le rang qu'elle affichait et son honneur", () => {
  for (const [honorValue, expected] of [[0, "young-blood"], [249, "young-blood"], [250, "blooded"], [650, "elite"], [1_800, "elder"], [3_128, "elder"], [9_000, "elder"]]) {
    const legacy = withProfile({ honor: honorValue, rankId: "young-blood" });
    delete legacy.profile.acquiredRankIdV166;
    const migrated = saves.normalizeSave(legacy);
    assert.equal(migrated.profile.rankId, expected, `honneur ${honorValue}`);
    assert.equal(migrated.profile.acquiredRankIdV166, expected);
    assert.equal(migrated.profile.honor, honorValue, "honneur cumulé conservé tel quel");
    assert.deepEqual(saves.normalizeSave(migrated), migrated, "migration stable");
  }
  // Comme avant V166, un rankId stocké sans le champ V166 n'est pas cru.
  const forged = withProfile({ honor: 10, rankId: "elder" });
  delete forged.profile.acquiredRankIdV166;
  assert.equal(saves.normalizeSave(forged).profile.rankId, "young-blood");
});

test("le rang acquis n'est jamais perdu quand l'honneur repasse sous le seuil", () => {
  const elite = saves.normalizeSave(withProfile({ honor: 1_200, acquiredRankIdV166: "elite" }));
  assert.equal(elite.profile.rankId, "elite");
  assert.equal(honor.promoteRankV166("elder", 0), "elder");
  assert.equal(honor.resolveAcquiredRankV166(0, "elder"), "elder");
  assert.equal(honor.resolveAcquiredRankV166(5_200, "blooded"), "elite", "la promotion au seuil reste automatique");
  assert.equal(honor.resolveAcquiredRankV166(5_200, "inconnu"), "elder", "champ invalide = sauvegarde antérieure : anciens seuils");

  // Constat : une mission réussie ne fait jamais baisser l'honneur aujourd'hui
  // (base ≥ 100, événements bornés à -100) ; le pire cas rapporte encore +12.
  const elder = saves.normalizeSave(withProfile({ honor: 8_010, acquiredRankIdV166: "elder" }));
  const penalty = victory("jungle-vey", {
    honorEvents: [{ id: "a", label: "Code rompu", value: -50, kind: "violation" }, { id: "b", label: "Code rompu", value: -50, kind: "violation" }],
    trophyQuality: "worthy", trophyClaims: undefined,
  });
  assert.equal(saves.applyMissionResult(elder, penalty).profile.honor - elder.profile.honor, Math.round(10 * 1.15));

  // Une partie migrée Elder avec 3 128 d'honneur (sous 8 000) le reste en jouant.
  const legacyElder = withProfile({ honor: 3_128 });
  delete legacyElder.profile.acquiredRankIdV166;
  const afterHunt = saves.applyMissionResult(saves.normalizeSave(legacyElder), penalty);
  assert.ok(afterHunt.profile.honor < 8_000);
  assert.equal(afterHunt.profile.rankId, "elder");
  assert.equal(afterHunt.profile.acquiredRankIdV166, "elder");
});

test("gains : première réussite inchangée, rejouer rapporte le plafond proposé", () => {
  const firstLegacy = { baseHonor: 100, firstCompletion: true, eventHonor: 100, score: 70, qualityBonus: 20, replayQualityBonus: 0, scoreImprovement: 0, rewardMultiplier: 1.15 };
  assert.equal(honor.missionHonorRewardV166(firstLegacy), honor.missionHonorRewardV166(firstLegacy, honor.LEGACY_REPLAY_HONOR_RULES_V35));
  assert.equal(honor.missionHonorRewardV166(firstLegacy), Math.round(220 * 1.15));
  const replay = { ...firstLegacy, firstCompletion: false };
  assert.equal(honor.missionHonorRewardV166(replay, honor.LEGACY_REPLAY_HONOR_RULES_V35), 46);
  assert.equal(honor.missionHonorRewardV166(replay), Math.round(79 * 1.15));
  assert.equal(honor.missionHonorRewardV166({ ...replay, baseHonor: 320, score: 100 }), 92, "plafond brut 80 × 1,15");

  const first = saves.applyMissionResult(saves.defaultSave(CREATED), victory("jungle-vey"));
  assert.equal(first.profile.honor, Math.round(220 * 1.15));
  assert.equal(first.profile.rankId, "young-blood", "Blooded demande désormais 1 500");
  const second = saves.applyMissionResult(first, victory("jungle-vey", { completedAt: "2026-11-20T09:00:00.000Z" }));
  assert.equal(second.profile.honor - first.profile.honor, Math.round(79 * 1.15));

  const promoted = saves.applyMissionResult(withProfile({ honor: 1_450 }), victory("jungle-vey"));
  assert.equal(promoted.profile.rankId, "blooded");
});

test("rythme estimé : avant V166 Elder en moins de 2 h ; après, chaque rang supérieur à plus de 2 h du précédent", () => {
  const legacy = honor.estimateHonorPaceV166(campaign, {
    rules: honor.LEGACY_REPLAY_HONOR_RULES_V35,
    thresholds: [{ label: "blooded", threshold: 250 }, { label: "elite", threshold: 650 }, { label: "elder", threshold: 1_800 }],
  });
  assert.ok(legacy.at(-1).hours < 2, `Elder avant : ${legacy.at(-1).hours} h`);

  const gameRanks = [
    { label: "Blooded", threshold: 1_500 }, { label: "Elite", threshold: 5_000 },
    { label: "Elder", threshold: 8_000 }, { label: "Black God", threshold: 40_000 },
  ];
  const scenarios = {
    // Hypothèse de référence : Hunter, rotation des 8 chasses, sans infraction.
    reference: {},
    // Borne rapide : campagne en Elite, puis la plus courte en difficulté Elder,
    // qualité parfaite et score 100.
    rapide: { campaignRewardMultiplier: 1.35, rewardMultiplier: 1.6, replayStrategy: "shortest", qualityBonus: 40, score: 100 },
  };
  for (const [name, assumptions] of Object.entries(scenarios)) {
    const pace = honor.estimateHonorPaceV166(campaign, { ...assumptions, thresholds: gameRanks });
    assert.equal(pace.length, 4, name);
    for (const tier of pace.slice(1)) assert.ok(tier.gapHours >= 2, `${name} : ${tier.label} à +${tier.gapHours.toFixed(2)} h`);
    assert.ok(pace.at(-1).hours >= 40, `${name} : Black God à ${pace.at(-1).hours} h`);
  }

  const bible = honor.estimateHonorPaceV166(campaign);
  assert.equal(bible.length, 10, "tous les paliers de la bible sont atteints");
  assert.ok(bible.every((tier, index) => index === 0 || tier.hours > bible[index - 1].hours || tier.runs === bible[index - 1].runs));
  const blackGod = bible.at(-1);
  assert.ok(blackGod.hours > 80 && blackGod.hours < 120, `Black God (référence) : ${blackGod.hours} h`);
  for (const tier of bible.filter(({ threshold }) => threshold >= 5_000)) {
    assert.ok(tier.gapHours >= 2, `${tier.label} : +${tier.gapHours.toFixed(2)} h`);
  }
});

test("estimation : fonction pure et cas limites", () => {
  assert.deepEqual(honor.estimateHonorPaceV166([]), []);
  const once = honor.estimateHonorPaceV166(campaign);
  assert.deepEqual(honor.estimateHonorPaceV166(campaign), once);
  const slower = honor.estimateHonorPaceV166(campaign, { durationFactor: 2 });
  assert.ok(Math.abs(slower.at(-1).hours - once.at(-1).hours * 2) < 1e-9);
  const noReplay = honor.estimateHonorPaceV166(campaign, { rules: { ...honor.REPLAY_HONOR_RULES_V166, rawCap: 0 } });
  assert.ok(noReplay.length < 10, "sans gain en rejouant, la simulation s'arrête au lieu de boucler");
});

test("progression du clan : prochain palier de la bible affiché après Elder", () => {
  const save = saves.normalizeSave(withProfile({ honor: 9_000 }));
  const snapshot = progression.evaluateClanProgression(save, progression.createDefaultShipProgression(save, CREATED));
  assert.equal(snapshot.rankId, "elder");
  assert.equal(snapshot.nextRankId, null);
  assert.equal(snapshot.nextBibleTier.bibleRank, "Clan Leader");
  assert.equal(snapshot.nextBibleTier.gameRankId, null);
});
