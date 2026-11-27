import { MISSIONS } from "../data";
import type { SaveGame } from "../types";
import { getCradleCrownCondition } from "./buriedCradle";
import { inspectBuriedCradleCampaign } from "./buriedCradleCampaign";
import { evaluateClanShipAccess } from "./clanShipOperations";
import { BIBLE_HONOR_TIERS_V166 } from "./honorProgressionV166";
import { honorForCampaignRankV169 } from "./honorSourcesV169";
import { inspectBloodedTempleV174, templeAvailableV174, templeHasFoundationV174 } from "./bloodedTempleV174";
import { canEnterEliteRecognition, eliteRecognitionMatchesSave, inspectEliteRecognition } from "./eliteRecognitionV174";
import { canConveneElderAssembly, elderReliefRecorded, inspectElderAssembly } from "./elderAssemblyV168";
import { seniorRiteMatchesRecord } from "./elderNarrativeRank";

export type QueenRiteEvidenceV168 = {
  label: string;
  canOpenExpedition: boolean;
};

/** Exhibit the current Bible thresholds and the specific proof produced by L-07. */
export function rankRiteDossierV168(save: Pick<
  SaveGame, "createdAt" | "profile" | "missionProgress" | "prologue" | "buriedCradle" | "honorSourcesV169"
>) {
  const honor = honorForCampaignRankV169(save.profile.honor, save.honorSourcesV169);
  const huntsRemaining = MISSIONS.filter(mission =>
    save.missionProgress[mission.id]?.status !== "completed").length;
  const cradle = inspectBuriedCradleCampaign(save.buriedCradle, save.createdAt);
  const canOpenExpedition = huntsRemaining === 0 && evaluateClanShipAccess(save).allowed &&
    (cradle.status === "valid" || cradle.status === "absent");
  const queen: QueenRiteEvidenceV168 = { canOpenExpedition, label: "Préparer l’expédition" };

  if (cradle.status === "future-version" || cradle.status === "invalid-save") {
    queen.label = "Relevé d’expédition incompatible";
  } else if (huntsRemaining > 0) {
    queen.label = `${huntsRemaining} sur ${MISSIONS.length} chasses à terminer`;
  } else if (!canOpenExpedition) {
    queen.label = "Reconnaissance Blooded requise";
  } else if (cradle.state) {
    const { status, crownDelivered, progress } = cradle.state;
    const crown = getCradleCrownCondition(progress);
    if (status === "reported" && crownDelivered) {
      queen.label = crown === "marked" ? "Crête marquée rapportée au débrief" : "Crête rapportée au débrief";
    } else if (status === "extracted") {
      queen.label = "Débrief à effectuer";
    } else if (status === "reported") {
      queen.label = crown === "lost" ? "Crête détruite · nouveau prélèvement possible" : "Crête à rapporter";
    } else {
      queen.label = status === "prepared" ? "Expédition préparée" : "Expédition à poursuivre";
    }
  }

  return {
    honor,
    thresholds: BIBLE_HONOR_TIERS_V166.map(tier => ({
      ...tier,
      remainingHonor: Math.max(0, tier.threshold - honor),
    })),
    queen,
  };
}

type CampaignRiteStatus = "locked" | "ready" | "in-progress" | "recognized";

function riteStatus(recognized: boolean, started: boolean, available: boolean): CampaignRiteStatus {
  if (recognized) return "recognized";
  if (started) return "in-progress";
  return available ? "ready" : "locked";
}

/** Each archive entry follows the same journal and campaign owner as its playable rite. */
export function rankCampaignReceiptsV168(save: SaveGame) {
  const chronicle = save.prologue?.chronicle;
  const temple = inspectBloodedTempleV174(save.bloodedTempleV174, save.createdAt);
  const templeStarted = !!temple.state && templeHasFoundationV174(save);
  const blooded = templeStarted && temple.view.stage === "complete" &&
    chronicle?.rites.some(rite => rite.id === "blooding-mark") === true;

  const eliteJournal = inspectEliteRecognition(save.eliteRecognitionV174, save.createdAt).state;
  const eliteStarted = !!eliteJournal && eliteRecognitionMatchesSave(save);
  const elite = eliteStarted && eliteJournal?.recognized === true;

  const elderJournal = inspectElderAssembly(save.elderAssemblyV168, save.createdAt).state;
  const elder = elite && elderReliefRecorded(save) && seniorRiteMatchesRecord(chronicle, "elder-recognition", true);

  return [
    {
      id: "blooded", label: "Blooded", status: riteStatus(blooded, templeStarted, templeAvailableV174(save)),
      detail: blooded ? "La marque et les prises de la triade sont consignées."
        : "Présenter la triade et traverser la pyramide jusqu’à la marque à l’acide.",
    },
    {
      id: "elite", label: "Elite", status: riteStatus(elite, eliteStarted, !!chronicle && canEnterEliteRecognition(save)),
      detail: elite ? "La chasse solitaire, la crête, la maîtrise et les rites du clan sont consignés."
        : "Présenter le retour solitaire, la crête et deux disciplines avant l’audience.",
    },
    {
      id: "elder", label: "Elder", status: riteStatus(elder, !!elderJournal, !!chronicle && canConveneElderAssembly(save)),
      detail: elder ? "L’engagement devant le conseil et la remise à la relève sont consignés."
        : "Consigner le mentorat et le jugement, puis transmettre le registre à la relève.",
    },
  ] as const;
}
