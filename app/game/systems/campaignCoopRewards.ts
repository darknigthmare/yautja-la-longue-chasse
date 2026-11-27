import { DIFFICULTY_BY_ID, MISSION_BY_ID } from "../data";
import type { MissionResult, SaveGame, TrophyRecord } from "../types";
import { checkActiveHuntCompatibility, type ActiveHuntSaveV1 } from "./activeHuntSave";
import { anatomyPartsV112 } from "./anatomyHarvestV112";
import { normalizeHarvestInventoryV112, type FieldSpecimenV112 } from "./harvestInventoryV112";
import { creditCampaignCoopHonorV169 } from "./honorSourcesV169";

interface CampaignCoopParticipant {
  ownerCreatedAt: string;
  honorEventIds: readonly string[];
  trophyClaimIds: readonly string[];
  specimenIds: readonly string[];
}

/** Internal host simulation input after the campaign write was confirmed.
 * No invite, client command or imported reward document satisfies this contract.
 * Rank rites use separate runtimes and do not produce this terminal record. */
export interface CommittedCampaignCoopHunt {
  before: SaveGame;
  committed: SaveGame;
  lease: ActiveHuntSaveV1;
  result: MissionResult;
  participants: readonly CampaignCoopParticipant[];
  finalBlowOwnerCreatedAt: string;
}

export interface CampaignCoopGuestReward {
  receiptId: string;
  ownerCreatedAt: string;
  honor: number;
  trophies: TrophyRecord[];
  specimens: FieldSpecimenV112[];
}

function canonicalOwner(owner: string): boolean {
  return /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(owner) &&
    Number.isFinite(Date.parse(owner)) && new Date(owner).toISOString() === owner;
}

function assignItems<T extends { id: string }>(
  items: readonly T[],
  participants: readonly CampaignCoopParticipant[],
  ids: (participant: CampaignCoopParticipant) => readonly string[],
): Map<string, string> | null {
  const eligible = new Set(items.map(item => item.id));
  const assigned = new Map<string, string>();
  if (eligible.size !== items.length) return null;
  for (const participant of participants) {
    for (const id of ids(participant)) {
      if (!eligible.has(id) || assigned.has(id)) return null;
      assigned.set(id, participant.ownerCreatedAt);
    }
  }
  return assigned;
}

/** Only verified terminal events earn guest honour. Mission mastery, clan marks
 * and other host-only progression rewards remain on the host. */
function attributedHonor(result: MissionResult, assigned: ReadonlyMap<string, string>, owner: string): number {
  const sum = result.honorEvents.reduce((total, event) => assigned.get(event.id) === owner
    ? total + Math.max(-50, Math.min(50, Math.round(Number.isFinite(event.value) ? event.value : 0)))
    : total, 0);
  return Math.max(0, Math.min(100, sum));
}

export function projectCampaignCoopGuestReward(
  hunt: CommittedCampaignCoopHunt,
  ownerCreatedAt: string,
  settle: (save: SaveGame, result: MissionResult) => SaveGame,
): CampaignCoopGuestReward | null {
  const { before, committed, lease, result, participants } = hunt;
  if (participants.length < 2 || participants.length > 3 ||
      participants[0]?.ownerCreatedAt !== before.createdAt ||
      participants.some(member => !canonicalOwner(member.ownerCreatedAt)) ||
      new Set(participants.map(member => member.ownerCreatedAt)).size !== participants.length ||
      ownerCreatedAt === before.createdAt ||
      !participants.some(member => member.ownerCreatedAt === ownerCreatedAt) ||
      !participants.some(member => member.ownerCreatedAt === hunt.finalBlowOwnerCreatedAt)) return null;

  if (result.outcome !== "success" || !Object.hasOwn(MISSION_BY_ID, result.missionId) ||
      !Object.hasOwn(DIFFICULTY_BY_ID, result.difficultyId) ||
      !canonicalOwner(result.completedAt) || result.completedAt < lease.startedAt ||
      committed.createdAt !== before.createdAt || !lease.runId || lease.version !== 1 ||
      result.harvestEncounterRunV112 !== lease.encounterRun) return null;
  const progress = before.missionProgress[result.missionId];
  if (!progress || !checkActiveHuntCompatibility(lease, {
    ownerSaveCreatedAt: before.createdAt,
    missionId: result.missionId,
    difficultyId: result.difficultyId,
    encounterRun: progress.attempts,
    missionAvailable: progress.status !== "locked",
  }).compatible) return null;

  const replay = settle(before, result);
  const completed = replay.missionProgress[result.missionId];
  const saved = committed.missionProgress[result.missionId];
  if (!completed || !saved || completed.attempts !== progress.attempts + 1 ||
      completed.completions !== progress.completions + 1 ||
      saved.attempts !== completed.attempts || saved.completions !== completed.completions ||
      saved.status !== "completed" || saved.lastPlayedAt !== result.completedAt) return null;

  const claimIds = new Set(result.trophyClaims.map(claim => claim.id));
  const trophies = replay.trophies.filter(trophy => claimIds.has(trophy.id) && trophy.claimedAt === result.completedAt);
  const specimenIds = new Set(result.specimensV112?.map(specimen => specimen.id));
  const specimens = replay.inventory.harvestV112?.specimens.filter(specimen => specimenIds.has(specimen.id)) ?? [];
  const honorOwners = assignItems(result.honorEvents, participants, member => member.honorEventIds);
  const trophyOwners = assignItems(trophies, participants, member => member.trophyClaimIds);
  const specimenOwners = assignItems(specimens, participants, member => member.specimenIds);
  if (!honorOwners || !trophyOwners || !specimenOwners) return null;

  const apex = trophies.filter(trophy => trophy.definitionId === MISSION_BY_ID[result.missionId].trophy.id);
  if (apex.length !== 1 || trophyOwners.get(apex[0].id) !== hunt.finalBlowOwnerCreatedAt) return null;

  const sourceGroups = new Map<string, number>();
  const receiptId = `campaign-coop:${before.createdAt}:${result.missionId}:${lease.encounterRun}`;
  const allocatedTrophies: TrophyRecord[] = [];
  for (const trophy of trophies) {
    const owner = trophyOwners.get(trophy.id);
    if (!owner || owner === before.createdAt) continue;
    if (committed.trophies.some(saved => saved.id === trophy.id && saved.claimedAt === result.completedAt)) return null;
    if (owner === ownerCreatedAt) allocatedTrophies.push({ ...trophy, id: `${receiptId}:t:${allocatedTrophies.length}` });
  }

  const allocatedSpecimens: FieldSpecimenV112[] = [];
  for (const specimen of specimens) {
    const owner = specimenOwners.get(specimen.id);
    if (!owner || owner === before.createdAt) continue;
    if (committed.inventory.harvestV112?.specimens.some(saved => saved.id === specimen.id)) return null;
    const part = anatomyPartsV112(specimen.speciesId).find(entry => entry.partId === specimen.partId);
    const prefix = `${result.missionId}:${lease.encounterRun}:`;
    const corpseId = specimen.sourceId.slice(prefix.length);
    if (!part || !corpseId || specimen.label !== part.label || specimen.massKg !== part.massKg ||
        specimen.volumeUnits !== part.volumeUnits ||
        !result.toolUseIdsV112?.includes(`${prefix}${part.action}:${corpseId}`) ||
        (part.requiresFlay && !result.toolUseIdsV112.includes(`${prefix}flay:${corpseId}`))) return null;
    if (owner === ownerCreatedAt) {
      const index = sourceGroups.get(specimen.sourceId) ?? sourceGroups.size;
      sourceGroups.set(specimen.sourceId, index);
      const sourceId = `${receiptId}:s:${index}`;
      allocatedSpecimens.push({ ...specimen, sourceId, id: `${sourceId}:${specimen.partId}` });
    }
  }
  const honor = attributedHonor(result, honorOwners, ownerCreatedAt);
  if (honor === 0 && allocatedTrophies.length === 0 && allocatedSpecimens.length === 0) return null;
  return { receiptId, ownerCreatedAt, honor, trophies: allocatedTrophies, specimens: allocatedSpecimens };
}

export function applyCampaignCoopGuestReward(save: SaveGame, reward: CampaignCoopGuestReward, trophyLimit: number): SaveGame | null {
  if (save.createdAt !== reward.ownerCreatedAt ||
      save.trophies.length + reward.trophies.length > trophyLimit ||
      reward.trophies.some(trophy => save.trophies.some(existing => existing.id === trophy.id))) return null;

  let inventory = save.inventory;
  if (reward.specimens.length > 0) {
    const depot = normalizeHarvestInventoryV112(inventory.harvestV112);
    if (!depot) return null;
    const next = normalizeHarvestInventoryV112({ ...depot, specimens: [...depot.specimens, ...reward.specimens] });
    if (!next) return null;
    inventory = { ...inventory, harvestV112: next };
  }
  const credited = creditCampaignCoopHonorV169(save, reward.receiptId, reward.honor);
  if (!credited) return null;
  return { ...credited, inventory, trophies: [...save.trophies, ...reward.trophies] };
}
