import type { MissionId, SaveGame, TrophyRecord } from "../types";
import { MISSION_BY_ID, MISSIONS } from "../data";
import { houseV149, respectForV149, type ResidenceStateV149 } from "./residenceV149";

type Place = { site: "ship" } | { site: "home"; houseId: string };

export type TrophyIntroductionR2M038 = {
  trophyId: string;
  missionId: MissionId;
  claimedAt: string;
} & ({ stage: "support" | "provenance" | "mount" } | { stage: "complete"; place: Place });

export type TrophyIntroductionActionR2M038 = { kind: "introduce"; trophyId: string } & (
  | { step: "inspect" | "support" | "abandon" }
  | { step: "label"; missionId: MissionId }
  | { step: "install"; site: "ship" | "home" }
);

const record = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === "object" && !Array.isArray(value);

export function trophyIntroductionIdentity(trophy: TrophyRecord) {
  return { trophyId: trophy.id, missionId: trophy.missionId, claimedAt: trophy.claimedAt };
}

export function trophyIntroductionMission(id: unknown) {
  return typeof id === "string" && Object.hasOwn(MISSION_BY_ID, id) ? MISSION_BY_ID[id as MissionId] : null;
}

export function trophyIntroductionChoices(trophy: TrophyRecord) {
  const origin = trophyIntroductionMission(trophy.missionId);
  if (!origin) return [];
  const index = MISSIONS.findIndex(mission => mission.id === origin.id);
  return [origin, MISSIONS[(index + 1) % MISSIONS.length], MISSIONS[(index + 3) % MISSIONS.length]]
    .sort((a, b) => a.planetName.localeCompare(b.planetName, "fr"));
}

export function trophyIntroductionResidence(residence: ResidenceStateV149 | null | undefined) {
  const id = residence?.activeResidenceId;
  if (!residence || !id || residence.transfer || !residence.rights.includes(id)) return null;
  const house = houseV149(id);
  return house && respectForV149(residence, house.communityId) >= house.respect.furnish ? house : null;
}

/**
 * A completed field label is historical. Rehousing, storing or trading the
 * original does not erase the mount ceremony. An unfinished job still needs
 * the same physical original to be owned and present.
 */
export function normalizeTrophyIntroductionR2M038(source: unknown, trophies: readonly Pick<TrophyRecord, "id" | "missionId" | "claimedAt">[]): TrophyIntroductionR2M038 | null {
  if (!record(source) || typeof source.trophyId !== "string" || !source.trophyId || source.trophyId.length > 300 ||
      typeof source.claimedAt !== "string" || !Number.isFinite(Date.parse(source.claimedAt))) return null;
  const mission = trophyIntroductionMission(source.missionId);
  if (!mission) return null;
  const identity = { trophyId: source.trophyId, missionId: mission.id, claimedAt: source.claimedAt };
  const matchingOriginal = trophies.some(trophy => trophy.id === identity.trophyId &&
    trophy.missionId === identity.missionId && trophy.claimedAt === identity.claimedAt);
  if (source.stage === "complete" && record(source.place)) {
    if (source.place.site === "ship") return { ...identity, stage: "complete", place: { site: "ship" } };
    if (source.place.site === "home" && typeof source.place.houseId === "string" && houseV149(source.place.houseId)) {
      return { ...identity, stage: "complete", place: { site: "home", houseId: source.place.houseId } };
    }
  }
  if (matchingOriginal && (source.stage === "support" || source.stage === "provenance" || source.stage === "mount")) {
    return { ...identity, stage: source.stage };
  }
  return null;
}

export function residenceTrophiesR2M038(save: Pick<SaveGame, "trophies" | "trophyUsagesV147">, houseId: string) {
  return save.trophies.filter(trophy => {
    const assignment = save.trophyUsagesV147?.assignments[trophy.id];
    return assignment?.usage === "displayed" && assignment.site === "home" && assignment.residenceId === houseId;
  });
}
