import { MISSIONS } from "../data";
import type { SaveGame } from "../types";
import { getCradleCrownCondition } from "./buriedCradle";
import { inspectBuriedCradleCampaign } from "./buriedCradleCampaign";
import { evaluateClanShipAccess } from "./clanShipOperations";
import { BIBLE_HONOR_TIERS_V166 } from "./honorProgressionV166";
import { honorForCampaignRankV169 } from "./honorSourcesV169";

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
