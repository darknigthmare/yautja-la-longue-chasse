import { GAME_CONTENT_VERSION } from "../buildInfo";
import { DIFFICULTIES, MISSIONS } from "../data";
import { normalizeSave, parseSaveImport, SAVE_STORAGE_KEY, type SaveImportFailure } from "../save";
import type { SaveGame } from "../types";
import { ACTIVE_HUNT_STORAGE_KEY, ACTIVE_HUNT_RUNTIME_REVISION, normalizeActiveHuntSave, checkActiveHuntCompatibility, type ActiveHuntSaveV1 } from "./activeHuntSave";
import { createDefaultShipProgression, normalizeShipProgression, SHIP_PROGRESSION_STORAGE_KEY, SHIP_PROGRESSION_VERSION, validateCanonicalShipProgression, type ShipProgressionState } from "./progression";
import { normalizePitSave, pitSaveStorageKey, PIT_SAVE_VERSION, validateCanonicalPitSave, type PitSaveV5 } from "./pitSave";
import { normalizePitReplayArchive, pitReplayStorageKey, type PitReplayArchiveV1 } from "./pitReplayStorage";
import { archiveTransferPending } from "./archiveTransferGuard";
import { applyArchiveTransaction, type ArchiveStorage, type ArchiveReplacement } from "./archiveTransaction";

export const COMPLETE_ARCHIVE_FORMAT = "yautja-complete-archive";
export const COMPLETE_ARCHIVE_MAX_BYTES = 3 * 1024 * 1024;
export interface CompleteArchive {
  format: typeof COMPLETE_ARCHIVE_FORMAT; version: 1; contentVersion: string; exportedAt: string;
  campaign: SaveGame;
  attachments: {
    activeHunt: ActiveHuntSaveV1 | null; shipProgression: ShipProgressionState;
    pit: PitSaveV5 | null; pitReplay: PitReplayArchiveV1 | null;
  };
}
export type CompleteArchiveFailure = SaveImportFailure | "invalid-archive" | "invalid-sidecar" | "owner-conflict" | "incompatible-hunt";
const record = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);
const bytes = (value: string) => new TextEncoder().encode(value).byteLength;
const iso = (value: unknown): value is string => typeof value === "string" && value.length <= 128 && Number.isFinite(Date.parse(value));
function activeCompatible(active: ActiveHuntSaveV1, campaign: SaveGame): boolean {
  const mission = MISSIONS.find(({ id }) => id === active.missionId);
  const progress = mission && campaign.missionProgress[mission.id];
  if (!mission || !progress) return false;
  const configuration = active.configuration;
  return checkActiveHuntCompatibility(active, {
    ownerSaveCreatedAt: campaign.createdAt, encounterRun: progress.attempts,
    missionAvailable: progress.status !== "locked",
    allowedMissionIds: MISSIONS.map(({ id }) => id),
    allowedDifficultyIds: DIFFICULTIES.filter(({ id }) => id !== "elder" || campaign.storyCompleted).map(({ id }) => id),
  }).compatible && record(configuration.inventory) && record(configuration.loadout) &&
    record(configuration.appearance) && record(configuration.visualOptions) &&
    ["screenShake", "reducedGore", "highContrastVision"].every((key) => typeof (configuration.visualOptions as Record<string, unknown>)[key] === "boolean");
}

/** No storage access: one invalid/future/foreign annex refuses the whole file. */
export function parseCompleteArchive(serialized: string): { archive: CompleteArchive | null; failure: CompleteArchiveFailure | null } {
  const bad = (failure: CompleteArchiveFailure) => ({ archive: null, failure });
  if (typeof serialized !== "string" || bytes(serialized) > COMPLETE_ARCHIVE_MAX_BYTES) return bad("too-large");
  let value: unknown;
  try { value = JSON.parse(serialized.replace(/^\uFEFF/, "")); } catch { return bad("invalid-json"); }
  if (!record(value) || value.format !== COMPLETE_ARCHIVE_FORMAT) return bad("invalid-archive");
  if (value.version !== 1) return bad("future-version");
  if (!iso(value.exportedAt) || typeof value.contentVersion !== "string" || value.contentVersion.length > 64 || !record(value.attachments)) return bad("invalid-archive");
  const parsed = parseSaveImport(JSON.stringify(value.campaign));
  if (!parsed.save) return bad(parsed.failure ?? "invalid-save");
  const campaign = parsed.save;
  const annex = value.attachments;
  if (!["activeHunt", "shipProgression", "pit", "pitReplay"].every((key) => Object.hasOwn(annex, key))) return bad("invalid-archive");
  for (const item of Object.values(annex)) {
    if (item !== null && (!record(item) || item.ownerSaveCreatedAt !== campaign.createdAt)) return bad("owner-conflict");
  }
  const ship = annex.shipProgression;
  if (!record(ship) || ship.version !== SHIP_PROGRESSION_VERSION || !iso(ship.updatedAt) ||
      !Array.isArray(ship.loadoutPresets) || !Array.isArray(ship.trophies) ||
      !Array.isArray(ship.displaySlots) || !record(ship.training) || !record(ship.medbay) ||
      bytes(JSON.stringify(ship)) > 1024 * 1024) return bad("invalid-sidecar");
  const shipProgression = validateCanonicalShipProgression(ship, campaign);
  if (!shipProgression) return bad("invalid-sidecar");
  const activeHunt = annex.activeHunt === null ? null : normalizeActiveHuntSave(annex.activeHunt, ACTIVE_HUNT_RUNTIME_REVISION);
  if (annex.activeHunt !== null && !activeHunt) return bad("invalid-sidecar");
  if (activeHunt && !activeCompatible(activeHunt, campaign)) return bad("incompatible-hunt");
  if (record(annex.pit) && Number(annex.pit.version) > PIT_SAVE_VERSION) return bad("future-version");
  const pit = annex.pit === null
    ? null
    : record(annex.pit) && annex.pit.version === PIT_SAVE_VERSION
      ? validateCanonicalPitSave(annex.pit)
      : normalizePitSave(annex.pit);
  const pitReplay = annex.pitReplay === null ? null : normalizePitReplayArchive(annex.pitReplay);
  if ((annex.pit !== null && !pit) || (annex.pitReplay !== null && !pitReplay)) return bad("invalid-sidecar");
  return { archive: {
    format: COMPLETE_ARCHIVE_FORMAT, version: 1, contentVersion: value.contentVersion, exportedAt: value.exportedAt,
    campaign, attachments: { activeHunt, shipProgression, pit, pitReplay },
  }, failure: null };
}
function archiveKeys(owner: string): string[] {
  return [ACTIVE_HUNT_STORAGE_KEY, SHIP_PROGRESSION_STORAGE_KEY, pitSaveStorageKey(owner),
    pitReplayStorageKey(owner), SAVE_STORAGE_KEY + ".backup", SAVE_STORAGE_KEY];
}
function readStable(storage: ArchiveStorage, keys: string[]): Map<string, string | null> {
  const snapshot = new Map(keys.map((key) => [key, storage.getItem(key)]));
  for (const [key, raw] of snapshot) if (storage.getItem(key) !== raw) throw new Error("Les archives ont changé pendant la lecture. Réessayez.");
  return snapshot;
}
function parseSidecar(raw: string | null, label: string): unknown {
  if (raw === null) return null;
  if (bytes(raw) > 1024 * 1024) throw new Error(label + " dépasse sa taille autorisée.");
  try { return JSON.parse(raw); } catch { throw new Error(label + " est illisible ; utilisez l’export léger pour sauver la campagne."); }
}

/** Read-only snapshot: never call loaders that migrate/claim a legacy sidecar. */
export function createCompleteArchive(campaignInMemory: SaveGame, storage: ArchiveStorage, now = new Date().toISOString()): { serialized: string; archive: CompleteArchive; warnings: string[] } {
  if (archiveTransferPending(storage)) throw new Error("Un import attend sa récupération. L’export léger reste disponible.");
  const keys = archiveKeys(campaignInMemory.createdAt);
  const snapshot = readStable(storage, keys);
  const rawCampaign = snapshot.get(SAVE_STORAGE_KEY);
  const parsedCampaign = rawCampaign ? parseSaveImport(rawCampaign) : null;
  if (!parsedCampaign?.save || JSON.stringify(parsedCampaign.save) !== JSON.stringify(normalizeSave(campaignInMemory))) {
    throw new Error("La campagne affichée n’est pas confirmée dans le stockage. Réessayez la sauvegarde ou exportez la version légère.");
  }
  const campaign = parsedCampaign.save;
  const warnings: string[] = [];
  const owned = (raw: string | null, label: string): unknown => {
    const value = parseSidecar(raw, label);
    if (record(value) && iso(value.ownerSaveCreatedAt) && value.ownerSaveCreatedAt !== campaign.createdAt) {
      warnings.push(label + " appartient à une autre campagne et n’a pas été exporté.");
      return null;
    }
    return value;
  };
  // Empty active-hunt tombstones are intentional successful clears.
  const activeRaw = snapshot.get(ACTIVE_HUNT_STORAGE_KEY) ?? null;
  const activeHunt = activeRaw === "" ? null : owned(activeRaw, "La chasse suspendue");
  const shipRaw = owned(snapshot.get(SHIP_PROGRESSION_STORAGE_KEY) ?? null, "Le vaisseau");
  let shipProgression: ShipProgressionState;
  if (shipRaw === null) shipProgression = createDefaultShipProgression(campaign, campaign.updatedAt);
  else {
    if (!record(shipRaw) || ![1,2,SHIP_PROGRESSION_VERSION].includes(shipRaw.version as number) ||
      !iso(shipRaw.updatedAt) || (shipRaw.ownerSaveCreatedAt !== undefined && shipRaw.ownerSaveCreatedAt !== campaign.createdAt) ||
      (shipRaw.version === SHIP_PROGRESSION_VERSION && (shipRaw.ownerSaveCreatedAt !== campaign.createdAt ||
        !Array.isArray(shipRaw.trophies) || !Array.isArray(shipRaw.displaySlots) || !Array.isArray(shipRaw.loadoutPresets) ||
        !record(shipRaw.training) || !record(shipRaw.medbay))) || (shipRaw.ownerSaveCreatedAt === undefined &&
      Date.parse(shipRaw.updatedAt) < Date.parse(campaign.createdAt))) throw new Error("Le vaisseau est incompatible ; aucune annexe n’a été ignorée silencieusement.");
    if (shipRaw.version === SHIP_PROGRESSION_VERSION) {
      const canonical = validateCanonicalShipProgression(shipRaw, campaign);
      if (!canonical) throw new Error("Le vaisseau est corrompu ; aucune valeur n’a été réparée silencieusement.");
      shipProgression = canonical;
    } else {
      shipProgression = normalizeShipProgression(shipRaw, campaign, shipRaw.updatedAt);
    }
  }
  const candidate = { format: COMPLETE_ARCHIVE_FORMAT, version: 1, contentVersion: GAME_CONTENT_VERSION, exportedAt: now, campaign,
    attachments: { activeHunt, shipProgression, pit: owned(snapshot.get(pitSaveStorageKey(campaign.createdAt)) ?? null, "THE PIT"),
      pitReplay: owned(snapshot.get(pitReplayStorageKey(campaign.createdAt)) ?? null, "Le replay THE PIT") } };
  const result = parseCompleteArchive(JSON.stringify(candidate));
  if (!result.archive) throw new Error("Archive intégrale refusée (" + result.failure + "). Aucune donnée locale modifiée.");
  for (const [key, raw] of snapshot) if (storage.getItem(key) !== raw) throw new Error("Une autre session a modifié les archives pendant l’export. Réessayez.");
  if (archiveTransferPending(storage)) throw new Error("Un import a commencé pendant l’export. Réessayez après sa récupération.");
  const serialized = JSON.stringify(result.archive);
  if (bytes(serialized) > COMPLETE_ARCHIVE_MAX_BYTES) throw new Error("Archive intégrale trop volumineuse.");
  return { serialized, archive: result.archive, warnings };
}

export interface CompleteArchiveImportPlan { archive: CompleteArchive; replacements: ArchiveReplacement[] }
/** Capture the explicit replacement preview; the click must still match it. */
export function prepareCompleteArchiveImport(archive: CompleteArchive, storage: ArchiveStorage): CompleteArchiveImportPlan {
  if (archiveTransferPending(storage)) throw new Error("Un import précédent attend sa récupération.");
  const parsed = parseCompleteArchive(JSON.stringify(archive));
  if (!parsed.archive) throw new Error("Archive invalide (" + parsed.failure + ").");
  const clean = parsed.archive;
  const keys = archiveKeys(clean.campaign.createdAt);
  const before = readStable(storage, keys);
  const campaign = JSON.stringify(clean.campaign);
  const values = [clean.attachments.activeHunt, clean.attachments.shipProgression, clean.attachments.pit, clean.attachments.pitReplay];
  const after: (string | null)[] = [...values.map((value) => value === null ? null : JSON.stringify(value)), campaign, campaign];
  return { archive: clean, replacements: keys.map((key, index) => ({ key, before: before.get(key) ?? null, after: after[index] })) };
}
export function importCompleteArchive(plan: CompleteArchiveImportPlan, storage: ArchiveStorage) {
  // Plans come from the UI, but revalidate before any write and reject mutation.
  const parsed = parseCompleteArchive(JSON.stringify(plan.archive));
  if (!parsed.archive) throw new Error("L’archive a changé depuis sa prévisualisation.");
  const clean = parsed.archive;
  const expected = preparePlanValues(clean);
  if (plan.replacements.length !== expected.length || plan.replacements.some((entry, index) => entry.key !== expected[index].key || entry.after !== expected[index].after)) {
    throw new Error("Le plan d’import a changé depuis sa prévisualisation.");
  }
  return applyArchiveTransaction(storage, plan.replacements);
}
function preparePlanValues(archive: CompleteArchive): { key: string; after: string | null }[] {
  const values = [archive.attachments.activeHunt, archive.attachments.shipProgression, archive.attachments.pit, archive.attachments.pitReplay, archive.campaign, archive.campaign];
  return archiveKeys(archive.campaign.createdAt).map((key, index) => ({ key, after: values[index] === null ? null : JSON.stringify(values[index]) }));
}
export function completeArchiveSummary(archive: CompleteArchive): string[] {
  return [
    "Campagne, options, commandes, inventaire, apparence, trophées, Homeworld et Justice",
    archive.attachments.activeHunt ? "Chasse suspendue et checkpoint inclus" : "Aucune chasse suspendue dans cette archive",
    "Vaisseau, préréglages, atelier, entraînement et infirmerie",
    archive.attachments.pit ? "Progression, réglages et parcours THE PIT inclus" : "Aucune progression THE PIT dans cette archive",
    archive.attachments.pitReplay?.latestReplay ? "Dernier replay THE PIT inclus" : "Aucun replay THE PIT dans cette archive",
  ];
}
