import { MISSIONS } from "../game/data";
import { RANK_THRESHOLDS } from "../game/save";
import type { SaveGame } from "../game/types";
import { anatomyPartsV112 } from "../game/systems/anatomyHarvestV112";
import { CHRONICLE_EVIDENCE, CHRONICLE_RITES, normalizeClanChronicle } from "../game/systems/clanChronicle";
import { ELITE_CLAN_TRIALS, verifyEliteClanTrial } from "../game/systems/eliteClanRitesV175";
import { ELITE_RECOGNITION_PROOFS } from "../game/systems/eliteRecognitionV174";
import { createSoloV68State, normalizeSoloV68State, SOLO_V68_PROOFS } from "../game/systems/firstHuntSoloV68";
import { emptyHarvestInventoryV112 } from "../game/systems/harvestInventoryV112";
import { HOUND_CATALOGUE_V147, recruitAtKennelV147 } from "../game/systems/houndKennelV147";
import { HOUND_KENNEL_LOCATION_V147, woundHoundV147 } from "../game/systems/huntingHoundsV147";
import { createMobilityLedger } from "../game/systems/mobility/ledger";
import { createNurseryCampaign } from "../game/systems/nurseryCampaign";
import { createOriginV151 } from "../game/systems/originsV151";
import { createTrainingDrill, startTrainingDrill, stepTrainingDrill, submitTrainingDrillAction } from "../game/systems/trainingDrill";
import {
  WARP_COMPONENTS_V165, WARP_TANTALUS_BRANCH_ID_V165, createWarpEpochsV165, installWarpModuleV165,
  selectWarpBranchV165, startWarpCommonQuestV165, verifyWarpComponentV165, type WarpUpdateV165,
} from "../game/systems/warpEpochsV165";

function preparedChronicle(save: SaveGame) {
  const base = createNurseryCampaign();
  const evidence = CHRONICLE_EVIDENCE.map(({ id, sourceId }) => ({ id, sourceId }));
  const rites = CHRONICLE_RITES
    .filter(({ grantsRankId }) => grantsRankId !== "elder" && grantsRankId !== "ancient")
    .map(({ id, sourceId }) => ({ id, sourceId }));
  return {
    ...base,
    status: "completed" as const,
    completedAt: save.createdAt,
    chronicle: normalizeClanChronicle({ ...base.chronicle, evidence, rites }),
  };
}

function preparedEliteTrials() {
  return ELITE_CLAN_TRIALS.map(trial => {
    let drill = startTrainingDrill(createTrainingDrill(trial.disciplineId, trial.seed, trial.clanPlasma));
    const trace = drill.sequence.map(action => {
      drill = stepTrainingDrill(drill, 0.12);
      const sample = { action, elapsedSeconds: drill.cueElapsedSeconds };
      drill = submitTrainingDrillAction(drill, action).state;
      return sample;
    });
    const receipt = verifyEliteClanTrial(trial.id, trace);
    if (!receipt) throw new Error("La préparation des reçus de la terrasse est invalide.");
    return receipt;
  });
}

export function createDevRecognitionCheckpoint() {
  const state = createSoloV68State();
  const milestoneCount = SOLO_V68_PROOFS.indexOf("mentor-report");
  state.phase = "debrief";
  state.tick = milestoneCount;
  state.phaseStartedAt = milestoneCount;
  state.route = "ridge";
  state.formationTicks = 45;
  state.player.x = 160;
  state.companions = [
    { ...state.companions[0], joined: true, following: true, x: 115 },
    { ...state.companions[1], joined: true, following: true, x: 65 },
  ];
  state.prey = { ...state.prey, phase: "gone", touches: 2, dodges: 2 };
  SOLO_V68_PROOFS.slice(0, milestoneCount).forEach((id, index) => { state.milestones[id] = index + 1; });
  const checkpoint = normalizeSoloV68State(state);
  if (!checkpoint) throw new Error("Le point de reprise M015 est invalide.");
  return checkpoint;
}

function preparedWarp(save: SaveGame, id: string) {
  const requireState = (update: WarpUpdateV165) => {
    if (!update.accepted) throw new Error(update.message);
    return update.state;
  };
  let state = requireState(startWarpCommonQuestV165(createWarpEpochsV165(save.createdAt),
    { blooded: true, personalShip: true, adjutant: true }, "stabilite"));
  for (const { id } of WARP_COMPONENTS_V165) {
    state = requireState(verifyWarpComponentV165(state, id, "reparer"));
  }
  state = requireState(installWarpModuleV165(state, "marge"));
  const branch = id === "dev-warp-w02" ? "W-02" : id === "dev-warp-tantalus" ? WARP_TANTALUS_BRANCH_ID_V165 : "W-01";
  return requireState(selectWarpBranchV165(state, branch));
}

/** Historical inputs are prepared only in the disposable owner created by /dev. */
export function prepareDevExercise(save: SaveGame, id: string): SaveGame {
  if (id === "dev-vehicles" || id === "dev-mounts") {
    save.profile = { ...save.profile, rankId: "blooded", honor: RANK_THRESHOLDS.blooded, clanMarks: 500 };
    save.mobilityV1 = { ...createMobilityLedger(save.createdAt), circulationPermit: id === "dev-vehicles" };
  }
  if (id === "dev-warp" || id === "dev-warp-w02" || id === "dev-warp-tantalus") {
    save.prologue = preparedChronicle(save);
    save.warpEpochsV165 = preparedWarp(save, id);
  }
  if (id === "dev-l06") {
    for (const { id } of MISSIONS) {
      save.missionProgress[id] = { ...save.missionProgress[id], status: "completed", attempts: 1, completions: 1 };
    }
  }
  if (id === "dev-o6-terrace") {
    save.prologue = preparedChronicle(save);
    save.originV151 = createOriginV151("O6");
    save.eliteRecognitionV174 = {
      version: 1, ownerCreatedAt: save.createdAt, revision: 9, proofs: [...ELITE_RECOGNITION_PROOFS],
      audience: "restricted", witnessed: true, prepared: true, recognized: true, trials: preparedEliteTrials(),
    };
  }
  if (id === "dev-acheron-field" || id === "dev-forge") {
    save.loadout = { ...save.loadout, weaponIds: ["plasma-caster", "smart-disc"] };
  }
  if (id === "dev-forge") {
    const sources = ["oseris-iv--thunder-macaque", "oseris-iv--vineback-grazer"];
    const archive = sources.flatMap(speciesId => anatomyPartsV112(speciesId).map(part => ({
      speciesId, partId: part.partId, label: part.label, count: 20, qualityTotal: 1500,
    })));
    save.inventory.harvestV112 = { ...emptyHarvestInventoryV112(), archive };
  }
  if (id === "dev-kennel") {
    const candidate = HOUND_CATALOGUE_V147[0];
    const recruited = recruitAtKennelV147(save.houndsV147, { catalogueId: candidate.id, locationId: HOUND_KENNEL_LOCATION_V147 });
    if (!recruited.ok) throw new Error("Le chien de test est introuvable au chenil.");
    const wounded = woundHoundV147(recruited.state, candidate.id, save.createdAt);
    if (!wounded.ok) throw new Error("Le soin de test ne peut pas être préparé.");
    save.houndsV147 = {
      ...wounded.state,
      hounds: wounded.state.hounds.map(hound => ({ ...hound, bond: 75 })),
    };
  }
  return save;
}
