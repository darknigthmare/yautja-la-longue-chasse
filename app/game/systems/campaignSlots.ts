import { youthCampaignNeedsScene } from "./youthCampaign";
import { soloV66NeedsScene } from "./campaignSoloV66";
import { soloV67NeedsScene } from "./campaignSoloV67";
import { createNurseryCampaign } from "./nurseryCampaign";
import { GAME_CONTENT_VERSION } from "../buildInfo";
import { defaultSave, parseSaveImport, SAVE_STORAGE_KEY, SAVE_VERSION } from "../save";
import type { SaveGame } from "../types";
import { archiveTransferPending } from "./archiveTransferGuard";
import { applyArchiveTransaction, withArchiveTransferLock, type ArchiveStorage, type ArchiveReplacement } from "./archiveTransaction";
import { createCompleteArchive, importCompleteArchive, parseCompleteArchive, prepareCompleteArchiveImport, COMPLETE_ARCHIVE_FORMAT, type CompleteArchive } from "./completeArchive";
import { createDefaultShipProgression, SHIP_PROGRESSION_STORAGE_KEY, SHIP_PROGRESSION_VERSION } from "./progression";
import { ACTIVE_HUNT_STORAGE_KEY, ACTIVE_HUNT_SAVE_VERSION } from "./activeHuntSave";
import { PIT_SAVE_STORAGE_KEY, pitSaveStorageKey, loadPitSave, PIT_SAVE_VERSION } from "./pitSave";
import { PIT_REPLAY_STORAGE_KEY, pitReplayStorageKey, PIT_REPLAY_STORAGE_VERSION, normalizePitReplayArchive } from "./pitReplayStorage";

export const CAMPAIGN_SLOT_IDS = [1, 2, 3, 4, 5] as const;
export const CAMPAIGN_MANUAL_COUNT = 10;
export const CAMPAIGN_AUTO_COUNT = 2;
export const CAMPAIGN_SLOT_VERSION = 1;
export type CampaignSlotId = typeof CAMPAIGN_SLOT_IDS[number];
export type CampaignResumeLocation = "new-game" | "prologue" | "youth-training" | "deck" | "homeworld" | "mission" | "game-reserve";
export type CampaignCheckpointId = `manual-${number}` | `auto-${number}`;
export type CampaignSlotFailure = "storage-unavailable" | "read-failed" | "write-failed" | "quota-exceeded" | "unconfirmed-write" | "lock-unavailable" | "protected-save" | "future-version" | "invalid-slot" | "slot-occupied" | "slots-full" | "empty-slot" | "missing-checkpoint" | "save-conflict" | "owner-conflict" | "migration-required" | "recovery-required" | "invalid-archive" | "invalid-location" | "too-large";
export interface CampaignCheckpointSummary {
  id: CampaignCheckpointId; kind: "manual" | "auto"; index: number; label: string;
  savedAt: string; hasActiveHunt: boolean; playTimeSeconds: number; resumeLocation: CampaignResumeLocation;
}
interface Checkpoint extends CampaignCheckpointSummary { archive: CompleteArchive }
interface SlotDocument {
  format: "yautja-campaign-slot"; version: 1; id: CampaignSlotId; revision: number;
  ownerCreatedAt: string; label: string; nextAutoIndex: 1 | 2;
  lastCheckpointId: CampaignCheckpointId; checkpoints: Checkpoint[];
}
export interface CampaignSlotSummary {
  id: CampaignSlotId; status: "empty" | "ready" | "blocked"; revision: number;
  ownerCreatedAt: string | null; hunterName: string; label: string;
  checkpoints: CampaignCheckpointSummary[]; lastCheckpointId: CampaignCheckpointId | null;
  failure: CampaignSlotFailure | null; recoveryAvailable: boolean;
}
export interface CampaignSlotCatalog {
  status: "ready" | "blocked" | "unavailable"; failure: CampaignSlotFailure | null;
  slots: CampaignSlotSummary[]; activeSlotId: CampaignSlotId | null;
  legacy: "empty" | "available" | "migrated" | "blocked";
  workspaceRecoveryAvailable?: boolean;
}
export interface CampaignSlotResult {
  ok: boolean; failure: CampaignSlotFailure | null; message: string; catalog: CampaignSlotCatalog;
  save: SaveGame | null; slotId: CampaignSlotId | null; checkpoint: CampaignCheckpointSummary | null;
}
export interface CampaignCheckpointOptions {
  kind: "manual" | "auto"; index?: number; expectedRevision: number; location?: CampaignResumeLocation;
}
const SLOT_PREFIX = "yautja-long-hunt.campaign-slot.";
// A single setItem commits all 12 references and their full snapshots together.
// Browsers may refuse earlier at their own quota; no existing data is deleted.
const MAX_SLOT_BYTES = 36 * 1024 * 1024;
const MAX_REVISION = 1_000_000_000;
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const bytes = (v: string) => new TextEncoder().encode(v).byteLength;
const iso = (v: unknown): v is string => typeof v === "string" && v.length <= 128 && Number.isFinite(Date.parse(v));
const slotIdValid = (v: unknown): v is CampaignSlotId => CAMPAIGN_SLOT_IDS.includes(v as CampaignSlotId);
const locationValid = (v: unknown): v is CampaignResumeLocation => ["new-game", "prologue", "youth-training", "deck", "homeworld", "mission", "game-reserve"].includes(v as string);
export const campaignSlotStorageKey = (id: CampaignSlotId): string => {
  if (!slotIdValid(id)) throw new Error("Invalid campaign slot");
  return SLOT_PREFIX + id;
};
function browserStorage(): ArchiveStorage | null { try { return typeof window === "undefined" ? null : window.localStorage; } catch { return null; } }
class Refusal extends Error { constructor(readonly failure: CampaignSlotFailure, message: string) { super(message); } }
function fail(failure: CampaignSlotFailure, message: string): never { throw new Refusal(failure, message); }
const summary = (c: Checkpoint): CampaignCheckpointSummary => ({ id: c.id, kind: c.kind, index: c.index, label: c.label,
  savedAt: c.savedAt, hasActiveHunt: c.hasActiveHunt, playTimeSeconds: c.playTimeSeconds, resumeLocation: c.resumeLocation });
function checkArchive(raw: string): CompleteArchive {
  const parsed = parseCompleteArchive(raw);
  if (!parsed.archive) fail(parsed.failure === "future-version" ? "future-version" : "invalid-archive", "Une archive intégrale est illisible ou incompatible. Elle reste intacte.");
  return parsed.archive;
}
function parseSlot(raw: string, id: CampaignSlotId): SlotDocument {
  if (raw.length > MAX_SLOT_BYTES || bytes(raw) > MAX_SLOT_BYTES) fail("too-large", "La partie dépasse la taille autorisée.");
  let v: unknown; try { v = JSON.parse(raw); } catch { return fail("invalid-slot", "Cette partie est illisible."); }
  if (record(v) && typeof v.version === "number" && v.version > CAMPAIGN_SLOT_VERSION) fail("future-version", "Cette partie vient d’une version plus récente.");
  if (!record(v) || v.format !== "yautja-campaign-slot" || v.version !== 1 || v.id !== id ||
    !Number.isInteger(v.revision) || Number(v.revision) < 1 || Number(v.revision) > MAX_REVISION || !iso(v.ownerCreatedAt) ||
    typeof v.label !== "string" || v.label.length > 80 || ![1, 2].includes(v.nextAutoIndex as number) ||
    !Array.isArray(v.checkpoints) || !v.checkpoints.length || v.checkpoints.length > 12) fail("invalid-slot", "Le registre de cette partie est invalide.");
  const source = v as unknown as SlotDocument;
  const ids = new Set<string>();
  const checkpoints = source.checkpoints.map(c => {
    if (!record(c) || !["manual", "auto"].includes(c.kind) || !Number.isInteger(c.index) || c.index < 1 ||
      c.index > (c.kind === "manual" ? 10 : 2) || c.id !== `${c.kind}-${c.index}` || ids.has(c.id) ||
      !iso(c.savedAt) || !locationValid(c.resumeLocation) || typeof c.label !== "string" || c.label.length > 80 ||
      typeof c.hasActiveHunt !== "boolean" || !Number.isFinite(c.playTimeSeconds) || c.playTimeSeconds < 0) fail("invalid-slot", "Un emplacement de sauvegarde est invalide.");
    ids.add(c.id);
    const archive = checkArchive(JSON.stringify(c.archive));
    if (archive.campaign.createdAt !== source.ownerCreatedAt || c.hasActiveHunt !== !!archive.attachments.activeHunt ||
      c.playTimeSeconds !== archive.campaign.profile.playTimeSeconds || (c.hasActiveHunt !== (c.resumeLocation === "mission")) ||
      (c.resumeLocation === "prologue" && archive.campaign.prologue?.status !== "active") ||
      (c.resumeLocation === "youth-training" && !archive.campaign.youthTraining) ||
      (c.resumeLocation === "game-reserve" && !archive.campaign.gameReserveV66)) fail("owner-conflict", "Une sauvegarde ne correspond pas à sa partie.");
    return { ...c, archive } as Checkpoint;
  });
  if (!ids.has(source.lastCheckpointId)) fail("invalid-slot", "La dernière sauvegarde est absente.");
  return { ...source, checkpoints };
}
interface SlotRead { raw: string | null; document: SlotDocument | null; failure: CampaignSlotFailure | null; recovery: SlotDocument | null }
function readSlot(storage: ArchiveStorage, id: CampaignSlotId): SlotRead {
  const key = campaignSlotStorageKey(id), raw = storage.getItem(key);
  if (raw === null) {
    const backup = storage.getItem(key + ".backup");
    if (backup === null) return { raw, document: null, failure: null, recovery: null };
    try { return { raw, document: null, failure: "recovery-required", recovery: parseSlot(backup, id) }; }
    catch (error) { return { raw, document: null, failure: error instanceof Refusal ? error.failure : "invalid-slot", recovery: null }; }
  }
  try { return { raw, document: parseSlot(raw, id), failure: null, recovery: null }; }
  catch (error) {
    const failure = error instanceof Refusal ? error.failure : "invalid-slot";
    // Never downgrade a future document through an older recovery copy.
    let recovery: SlotDocument | null = null;
    if (failure !== "future-version") { try { const backup = storage.getItem(key + ".backup"); if (backup) recovery = parseSlot(backup, id); } catch { /* keep both originals */ } }
    return { raw, document: null, failure, recovery };
  }
}
function readWorkingCampaign(storage: ArchiveStorage): { save: SaveGame | null; raw: string | null; recovered: boolean } {
  const raw = storage.getItem(SAVE_STORAGE_KEY), backup = storage.getItem(SAVE_STORAGE_KEY + ".backup");
  const primary = raw === null ? null : parseSaveImport(raw), recovery = backup === null ? null : parseSaveImport(backup);
  if (primary?.failure === "future-version" || recovery?.failure === "future-version") fail("future-version", "Une campagne plus récente reste protégée, y compris sa copie de secours.");
  if (primary?.save) return { save: primary.save, raw, recovered: false };
  if (recovery?.save) return { save: recovery.save, raw, recovered: true };
  if (raw !== null || backup !== null) fail("protected-save", "La campagne actuelle est illisible. Exportez-la ou récupérez-la avant de changer de partie.");
  return { save: null, raw, recovered: false };
}
export function loadCampaignSlots(storage: ArchiveStorage | null = browserStorage()): CampaignSlotCatalog {
  const empty = (id: CampaignSlotId): CampaignSlotSummary => ({ id, status: "empty", revision: 0, ownerCreatedAt: null, hunterName: "", label: `Partie ${id}`, checkpoints: [], lastCheckpointId: null, failure: null, recoveryAvailable: false });
  const catalog: CampaignSlotCatalog = { status: "ready", failure: null, slots: CAMPAIGN_SLOT_IDS.map(empty), activeSlotId: null, legacy: "empty" };
  if (!storage) return { ...catalog, status: "unavailable", failure: "storage-unavailable", legacy: "blocked" };
  try {
    for (const id of CAMPAIGN_SLOT_IDS) {
      const read = readSlot(storage, id), doc = read.document;
      catalog.slots[id - 1] = doc ? { id, status: "ready", revision: doc.revision, ownerCreatedAt: doc.ownerCreatedAt,
        hunterName: doc.checkpoints.find(c => c.id === doc.lastCheckpointId)!.archive.campaign.profile.hunterName,
        label: doc.label, checkpoints: doc.checkpoints.map(summary), lastCheckpointId: doc.lastCheckpointId, failure: null, recoveryAvailable: false }
        : { ...empty(id), status: read.failure ? "blocked" : "empty", ownerCreatedAt: read.recovery?.ownerCreatedAt ?? null, failure: read.failure, recoveryAvailable: !!read.recovery };
    }
    let current: ReturnType<typeof readWorkingCampaign>;
    try { current = readWorkingCampaign(storage); }
    catch(error) { catalog.workspaceRecoveryAvailable = error instanceof Refusal && error.failure === "protected-save"; throw error; }
    catalog.workspaceRecoveryAvailable = current.recovered;
    if (current.save) {
      const owned = catalog.slots.filter(s => s.ownerCreatedAt === current.save!.createdAt);
      if (owned.length > 1) fail("owner-conflict", "Plusieurs parties revendiquent la même identité.");
      catalog.activeSlotId = owned[0]?.id ?? null;
      catalog.legacy = owned.length ? "migrated" : "available";
    }
    if (archiveTransferPending(storage)) fail("protected-save", "Un transfert attend sa récupération. Les parties restent protégées.");
  } catch (error) { catalog.status = "blocked"; catalog.failure = error instanceof Refusal ? error.failure : "read-failed"; catalog.legacy = "blocked"; }
  return catalog;
}
function requireAvailable(storage: ArchiveStorage): void {
  if (archiveTransferPending(storage)) fail("protected-save", "Un transfert ou une autre session protège les sauvegardes.");
}
function requireSlot(storage: ArchiveStorage, id: CampaignSlotId, revision?: number): { raw: string; document: SlotDocument } {
  if (!slotIdValid(id)) fail("invalid-slot", "Numéro de partie invalide.");
  const read = readSlot(storage, id);
  if (!read.document) fail(read.failure ?? "empty-slot", read.recovery ? "Une copie de secours est disponible. Récupérez cette partie d’abord." : "Cette partie est vide ou protégée.");
  if (revision !== undefined && read.document.revision !== revision) fail("save-conflict", "La partie a changé dans une autre session. Actualisez la liste.");
  return { raw: read.raw!, document: read.document };
}
function guardedSet(storage: ArchiveStorage, key: string, value: string, before: string | null): void {
  requireAvailable(storage);
  if (storage.getItem(key) !== before) fail("save-conflict", "Une autre session a modifié cette sauvegarde.");
  try { storage.setItem(key, value); }
  catch (error) {
    // setItem can persist before throwing: do not claim failure/success by guess.
    try { if (storage.getItem(key) === value) return; } catch { fail("unconfirmed-write", "L’écriture n’a pas pu être confirmée. Actualisez sans fermer cette session."); }
    if (record(error) && (error.name === "QuotaExceededError" || error.code === 22 || error.code === 1014)) fail("quota-exceeded", "Stockage plein. Les sauvegardes précédentes restent intactes.");
    fail("write-failed", "L’écriture a été refusée. Les données précédentes restent disponibles.");
  }
  let stored: string | null; try { stored = storage.getItem(key); } catch { return fail("unconfirmed-write", "L’écriture n’a pas pu être relue. Actualisez avant de réessayer."); }
  if (stored !== value) fail("save-conflict", "Une autre session a remplacé l’écriture. Aucune réussite n’est annoncée.");
}
function persistSlot(storage: ArchiveStorage, doc: SlotDocument, before: string | null): void {
  const key = campaignSlotStorageKey(doc.id), serialized = JSON.stringify(doc);
  parseSlot(serialized, doc.id);
  if (before !== null) {
    parseSlot(before, doc.id);
    const backup = storage.getItem(key + ".backup");
    if (backup !== null) parseSlot(backup, doc.id); // preserve malformed/future recovery bytes
    guardedSet(storage, key + ".backup", before, backup);
  }
  guardedSet(storage, key, serialized, before);
}
function snapshotWorking(storage: ArchiveStorage): { archive: CompleteArchive; rawCampaign: string | null; preimage: Map<string, string | null> } {
  const current = readWorkingCampaign(storage);
  if (!current.save) fail("empty-slot", "Aucune campagne active à sauvegarder.");
  const sourceKeys = [SAVE_STORAGE_KEY, SAVE_STORAGE_KEY + ".backup", ACTIVE_HUNT_STORAGE_KEY, SHIP_PROGRESSION_STORAGE_KEY,
    PIT_SAVE_STORAGE_KEY, PIT_REPLAY_STORAGE_KEY, pitSaveStorageKey(current.save.createdAt), pitReplayStorageKey(current.save.createdAt)];
  const preimage = new Map(sourceKeys.map(key => [key, storage.getItem(key)]));
  if (preimage.get(SAVE_STORAGE_KEY) !== current.raw) fail("save-conflict", "La campagne a changé avant sa capture.");
  const overrides = new Map<string, string>();
  // Reading a recovered primary is non-destructive; migration retains its raw bytes.
  if (current.recovered) overrides.set(SAVE_STORAGE_KEY, JSON.stringify(current.save));
  // The old unscoped PIT key is adopted only with an explicit matching owner.
  const scopedPit = pitSaveStorageKey(current.save.createdAt);
  if (storage.getItem(scopedPit) === null && storage.getItem(PIT_SAVE_STORAGE_KEY) !== null) {
    const legacy = loadPitSave({ storage, expectedOwnerSaveCreatedAt: current.save.createdAt });
    if (legacy.failure !== "owner-conflict" && !legacy.save) fail(legacy.failure === "future-version" ? "future-version" : "invalid-archive", "L’ancien dossier THE PIT est illisible ; il n’a pas été ignoré.");
    if (legacy.save) overrides.set(scopedPit, JSON.stringify(legacy.save));
  }
  const scopedReplay = pitReplayStorageKey(current.save.createdAt), oldReplay = storage.getItem(PIT_REPLAY_STORAGE_KEY);
  if (storage.getItem(scopedReplay) === null && oldReplay !== null) {
    let value: unknown; try { value = JSON.parse(oldReplay); } catch { fail("invalid-archive", "L’ancien replay est illisible ; il reste protégé."); }
    if (record(value) && Number(value.version) > PIT_REPLAY_STORAGE_VERSION) fail("future-version", "L’ancien replay vient d’une version plus récente.");
    if (!record(value) || !iso(value.ownerSaveCreatedAt)) fail("invalid-archive", "L’ancien replay n’a pas de propriétaire valide.");
    if (value.ownerSaveCreatedAt === current.save.createdAt) {
      const replay = normalizePitReplayArchive(value);
      if (!replay) fail("invalid-archive", "L’ancien replay est incompatible et n’a pas été ignoré.");
      overrides.set(scopedReplay, JSON.stringify(replay));
    }
  }
  const view: ArchiveStorage = { getItem: key => overrides.get(key) ?? storage.getItem(key), setItem: () => { throw new Error("read-only snapshot"); }, removeItem: () => { throw new Error("read-only snapshot"); } };
  let archive: CompleteArchive;
  try { archive = createCompleteArchive(current.save, view).archive; }
  catch (error) { return fail("invalid-archive", error instanceof Error ? error.message : "L’état complet ne peut pas être sauvegardé."); }
  if ([...preimage].some(([key, raw]) => storage.getItem(key) !== raw)) fail("save-conflict", "La campagne ou une annexe a changé pendant sa capture.");
  return { archive, rawCampaign: current.raw, preimage };
}
function checkpoint(archive: CompleteArchive, kind: "manual" | "auto", index: number, location: CampaignResumeLocation): Checkpoint {
  const hasActiveHunt = !!archive.attachments.activeHunt;
  const resumeLocation = archive.campaign.prologue?.status === "active" ? "prologue"
    : soloV67NeedsScene(archive.campaign.soloV67) || soloV66NeedsScene(archive.campaign.soloV66) || youthCampaignNeedsScene(archive.campaign.youthTraining) ? "youth-training"
    : archive.campaign.prologue?.status === "completed" && location === "youth-training" ? "homeworld"
    : archive.campaign.prologue?.status === "completed" && (location === "prologue" || location === "new-game") ? "homeworld"
    : hasActiveHunt ? "mission"
    : location === "game-reserve" ? archive.campaign.gameReserveV66 ? "game-reserve" : "deck"
    : location === "mission" || location === "prologue" ? "deck" : location;
  return { id: `${kind}-${index}`, kind, index, label: kind === "manual" ? `Sauvegarde manuelle ${index}` : `Autosauvegarde ${index}`,
    savedAt: new Date().toISOString(), hasActiveHunt, playTimeSeconds: archive.campaign.profile.playTimeSeconds, resumeLocation, archive };
}
function initialDocument(id: CampaignSlotId, archive: CompleteArchive, name: string, location: CampaignResumeLocation): SlotDocument {
  const first = checkpoint(archive, "auto", 1, location);
  return { format: "yautja-campaign-slot", version: 1, id, revision: 1, ownerCreatedAt: archive.campaign.createdAt,
    label: name.trim().slice(0, 80) || `Partie ${id}`, nextAutoIndex: 2, lastCheckpointId: first.id, checkpoints: [first] };
}
/** Export time/build labels describe the envelope, not a changed campaign. All game data stays in the comparison. */
function archiveProgressJson(archive: CompleteArchive): string {
  return JSON.stringify({ format: archive.format, version: archive.version, campaign: archive.campaign, attachments: archive.attachments },
    (_key, value: unknown) => record(value) ? Object.fromEntries(Object.keys(value).sort().map(key => [key, value[key]])) : value);
}
function replaceCheckpoint(storage: ArchiveStorage, id: CampaignSlotId, options: CampaignCheckpointOptions, preimageOut?: Map<string, string | null>): Checkpoint {
  if (!options || !Number.isInteger(options.expectedRevision) || options.expectedRevision < 1) fail("save-conflict", "Une révision observée est requise pour sauvegarder.");
  const { raw, document: doc } = requireSlot(storage, id, options.expectedRevision);
  if (doc.revision >= MAX_REVISION) fail("protected-save", "La révision maximale est atteinte.");
  if (!["manual", "auto"].includes(options.kind) || (options.location !== undefined && !locationValid(options.location))) fail("invalid-location", "Type ou lieu de sauvegarde invalide.");
  const index = options.kind === "auto" ? doc.nextAutoIndex : options.index;
  if (!Number.isInteger(index) || Number(index) < 1 || Number(index) > (options.kind === "manual" ? 10 : 2)) fail("missing-checkpoint", "Choisissez un des dix emplacements manuels.");
  const snapshot = snapshotWorking(storage);
  if (snapshot.archive.campaign.createdAt !== doc.ownerCreatedAt) fail("owner-conflict", "Cette partie n’est pas la campagne active.");
  const last = doc.checkpoints.find(c => c.id === doc.lastCheckpointId)!;
  const lastLocation = last.resumeLocation;
  const next = checkpoint(snapshot.archive, options.kind, index!, options.location ?? lastLocation);
  const unchangedAuto = options.kind === "auto" && next.resumeLocation === last.resumeLocation &&
    archiveProgressJson(next.archive) === archiveProgressJson(last.archive);
  if (unchangedAuto) {
    // A no-op must not bypass the recovery protection normally enforced by persistSlot.
    const backup = storage.getItem(campaignSlotStorageKey(id) + ".backup");
    if (backup !== null) parseSlot(backup, id);
  }
  if ([...snapshot.preimage].some(([key, raw]) => storage.getItem(key) !== raw)) fail("save-conflict", "La campagne ou une annexe a changé avant sa sauvegarde.");
  snapshot.preimage.forEach((raw, key) => preimageOut?.set(key, raw));
  if (unchangedAuto) {
    requireAvailable(storage);
    if (storage.getItem(campaignSlotStorageKey(id)) !== raw) fail("save-conflict", "La partie a changé avant sa confirmation.");
    // Keep the latest durable checkpoint, its timestamp, revision and next rotation intact.
    return last;
  }
  persistSlot(storage, { ...doc, revision: doc.revision + 1, nextAutoIndex: options.kind === "auto" ? index === 1 ? 2 : 1 : doc.nextAutoIndex,
    lastCheckpointId: next.id, checkpoints: [...doc.checkpoints.filter(c => c.id !== next.id), next] }, raw);
  return next;
}
type MutationValue = { slotId?: CampaignSlotId; checkpoint?: Checkpoint; save?: SaveGame };
async function mutation(storage: ArchiveStorage | null, operation: (storage: ArchiveStorage) => MutationValue): Promise<CampaignSlotResult> {
  const refused = (failure: CampaignSlotFailure, message: string): CampaignSlotResult => ({ ok: false, failure, message, catalog: loadCampaignSlots(storage), save: null, slotId: null, checkpoint: null });
  if (!storage) return refused("storage-unavailable", "Le stockage local est indisponible.");
  const locked = await withArchiveTransferLock((): CampaignSlotResult => {
    try {
      requireAvailable(storage);
      const value = operation(storage);
      return { ok: true, failure: null, message: "Sauvegarde confirmée.", catalog: loadCampaignSlots(storage), save: value.save ?? null,
        slotId: value.slotId ?? null, checkpoint: value.checkpoint ? summary(value.checkpoint) : null };
    } catch (error) { return refused(error instanceof Refusal ? error.failure : "read-failed", error instanceof Error ? error.message : "La lecture a échoué ; aucune réussite n’est annoncée."); }
  });
  return locked.acquired ? locked.value : refused("lock-unavailable", locked.reason);
}
/** Copies the old complete party into an empty slot. Original known keys are never deleted or changed. */
export async function migrateLegacyCampaignSlot(storage: ArchiveStorage | null = browserStorage()): Promise<CampaignSlotResult> {
  return mutation(storage, data => {
    const catalog = loadCampaignSlots(data);
    if (catalog.status !== "ready") fail(catalog.failure ?? "protected-save", "La campagne existante reste protégée.");
    if (catalog.activeSlotId) return { slotId: catalog.activeSlotId };
    if (catalog.legacy === "empty") return {};
    if (catalog.slots.some(s => s.status === "blocked")) fail("protected-save", "Récupérez les parties protégées avant de migrer une campagne non attribuée.");
    const id = catalog.slots.find(s => s.status === "empty")?.id;
    if (!id) fail("slots-full", "Les cinq parties sont occupées. L’ancienne campagne reste intacte.");
    const { archive, rawCampaign } = snapshotWorking(data), owner = archive.campaign.createdAt;
    const keys = [SAVE_STORAGE_KEY, SAVE_STORAGE_KEY + ".backup", ACTIVE_HUNT_STORAGE_KEY, SHIP_PROGRESSION_STORAGE_KEY,
      PIT_SAVE_STORAGE_KEY, PIT_REPLAY_STORAGE_KEY, pitSaveStorageKey(owner), pitReplayStorageKey(owner)];
    const original = keys.map(key => ({ key, raw: data.getItem(key) }));
    const protectionKey = SLOT_PREFIX + "legacy." + encodeURIComponent(owner);
    const preserved = data.getItem(protectionKey);
    if (preserved === null) guardedSet(data, protectionKey, JSON.stringify({ format: "yautja-legacy-slot-source", version: 1, ownerCreatedAt: owner, original }), null);
    else {
      let value: unknown; try { value = JSON.parse(preserved); } catch { fail("protected-save", "La copie originale de migration est illisible."); }
      if (!record(value) || value.format !== "yautja-legacy-slot-source" || value.version !== 1 || value.ownerCreatedAt !== owner) fail("protected-save", "La copie originale de migration est protégée.");
    }
    if (data.getItem(SAVE_STORAGE_KEY) !== rawCampaign || original.some(e => data.getItem(e.key) !== e.raw)) fail("save-conflict", "L’ancienne campagne a changé pendant sa migration.");
    const doc = initialDocument(id, archive, "Partie existante", archive.attachments.activeHunt ? "mission" : "deck");
    persistSlot(data, doc, null);
    return { slotId: id, checkpoint: doc.checkpoints[0] };
  });
}
/** Creation never replaces an occupied slot and does not activate it implicitly. */
export async function createCampaignSlot(id: CampaignSlotId, name = "", storage: ArchiveStorage | null = browserStorage()): Promise<CampaignSlotResult> {
  return mutation(storage, data => {
    if (!slotIdValid(id)) fail("invalid-slot", "Numéro de partie invalide.");
    const catalog = loadCampaignSlots(data);
    if (catalog.status !== "ready") fail(catalog.failure ?? "protected-save", "Le stockage courant est protégé.");
    if (catalog.legacy === "available") fail("migration-required", "Conservez d’abord la partie existante dans un emplacement.");
    if (catalog.slots[id - 1].status !== "empty" || data.getItem(campaignSlotStorageKey(id)) !== null) fail("slot-occupied", "Cette partie est déjà occupée ; aucune donnée n’est remplacée.");
    const doc = newCampaignDocument(id, name, catalog);
    persistSlot(data, doc, null);
    return { slotId: id, checkpoint: doc.checkpoints[0] };
  });
}
function newCampaignDocument(id: CampaignSlotId, name: string, catalog: CampaignSlotCatalog): SlotDocument {
    if (typeof name !== "string" || name.length > 80) fail("invalid-slot", "Le nom de partie est invalide.");
    const owners = new Set(catalog.slots.map(s => s.ownerCreatedAt));
    let timestamp = Date.now(); while (owners.has(new Date(timestamp).toISOString())) timestamp++;
    const save = defaultSave(new Date(timestamp).toISOString());
    save.prologue = createNurseryCampaign();
    if (name.trim()) save.profile.hunterName = name.trim();
    const archive: CompleteArchive = { format: COMPLETE_ARCHIVE_FORMAT, version: 1, contentVersion: GAME_CONTENT_VERSION,
      exportedAt: new Date().toISOString(), campaign: save,
      attachments: { activeHunt: null, shipProgression: createDefaultShipProgression(save), pit: null, pitReplay: null } };
    return initialDocument(id, checkArchive(JSON.stringify(archive)), name, "prologue");
}
function rejectFutureTargets(replacements: ArchiveReplacement[], owner: string): void {
  for (const entry of replacements) {
    if (!entry.before) continue;
    let value: unknown; try { value = JSON.parse(entry.before); } catch { continue; }
    const max = entry.key === ACTIVE_HUNT_STORAGE_KEY ? ACTIVE_HUNT_SAVE_VERSION : entry.key === SHIP_PROGRESSION_STORAGE_KEY ? SHIP_PROGRESSION_VERSION
      : entry.key === pitSaveStorageKey(owner) ? PIT_SAVE_VERSION : entry.key === pitReplayStorageKey(owner) ? PIT_REPLAY_STORAGE_VERSION : SAVE_VERSION;
    if (record(value) && Number(value.version) > max) fail("future-version", "Une archive plus récente occupe une clé cible. Elle reste intacte.");
  }
}
/** Explicitly confirmed replacement: old campaign, all checkpoints and live
 * progress survive in an immutable rescue archive. Slot and workspace commit together. */
export async function replaceCampaignSlot(id: CampaignSlotId, name: string,
  options: {expectedRevision: number; expectedOwnerCreatedAt: string}, storage: ArchiveStorage | null = browserStorage()): Promise<CampaignSlotResult> {
  return mutation(storage, data => {
    if (!options || !Number.isInteger(options.expectedRevision) || !iso(options.expectedOwnerCreatedAt)) fail("save-conflict", "Confirmez de nouveau la partie à remplacer.");
    const {raw, document: old} = requireSlot(data, id, options.expectedRevision);
    if(old.ownerCreatedAt !== options.expectedOwnerCreatedAt) fail("owner-conflict", "Le propriétaire de cette partie a changé. Confirmez de nouveau.");
    if(old.revision >= MAX_REVISION) fail("protected-save", "La révision maximale est atteinte.");
    const catalog = loadCampaignSlots(data);
    if(catalog.status !== "ready") fail(catalog.failure ?? "protected-save", "La campagne courante est protégée. Récupérez-la explicitement avant tout remplacement.");
    if(catalog.legacy === "available") fail("migration-required", "La campagne non attribuée doit être conservée avant un remplacement.");
    if(readWorkingCampaign(data).recovered) fail("recovery-required", "La campagne courante provient d’un secours. Récupérez-la explicitement avant un remplacement.");
    const workingBackup=data.getItem(SAVE_STORAGE_KEY+".backup");
    if(workingBackup!==null && !parseSaveImport(workingBackup).save)fail("protected-save","La copie de secours courante est illisible. Elle n’est pas remplacée.");
    const key = campaignSlotStorageKey(id), backup = data.getItem(key + ".backup");
    if(backup !== null) parseSlot(backup, id);
    let preserved = old;
    const sourcePreimage = new Map<string,string|null>();
    if(catalog.activeSlotId === id) {
      const snapshot = snapshotWorking(data);snapshot.preimage.forEach((value,key)=>sourcePreimage.set(key,value));
      const latest = checkpoint(snapshot.archive, "auto", old.nextAutoIndex, old.checkpoints.find(c=>c.id===old.lastCheckpointId)!.resumeLocation);
      preserved = {...old,lastCheckpointId:latest.id,nextAutoIndex:old.nextAutoIndex===1?2:1,checkpoints:[...old.checkpoints.filter(c=>c.id!==latest.id),latest]};
    } else if(catalog.activeSlotId) {
      const active=catalog.slots[catalog.activeSlotId-1];
      replaceCheckpoint(data,active.id,{kind:"auto",expectedRevision:active.revision},sourcePreimage);
    }
    const next = {...newCampaignDocument(id,name,catalog),revision:old.revision+1};
    const desired = next.checkpoints[0].archive;
    const plan = prepareCompleteArchiveImport(desired,data);
    rejectFutureTargets(plan.replacements,desired.campaign.createdAt);
    for(const entry of plan.replacements)if(sourcePreimage.has(entry.key))entry.before=sourcePreimage.get(entry.key)!;
    if([...sourcePreimage].some(([key,value])=>data.getItem(key)!==value))fail("save-conflict","La campagne a changé pendant la préparation.");
    const rescueKey = key + ".replaced." + encodeURIComponent(old.ownerCreatedAt);
    const rescueRaw = JSON.stringify({format:"yautja-replaced-campaign",version:1,slot:old,latest:preserved.checkpoints.find(c=>c.id===preserved.lastCheckpointId)!.archive});
    const existingRescue = data.getItem(rescueKey);
    if(existingRescue !== null && existingRescue !== rescueRaw)fail("protected-save","Une archive de secours de cette ancienne campagne existe déjà. Elle n’est pas écrasée.");
    const replacements: ArchiveReplacement[] = [
      {key:rescueKey,before:existingRescue,after:rescueRaw}, {key:key+".backup",before:backup,after:JSON.stringify(preserved)},
      {key,before:raw,after:JSON.stringify(next)}, ...plan.replacements,
    ];
    const result=applyArchiveTransaction(data,replacements);
    if(!result.persisted)fail(result.recovery.status==="blocked"?"recovery-required":"write-failed",result.recovery.message);
    return {slotId:id,checkpoint:next.checkpoints[0],save:desired.campaign};
  });
}
/** Recover a readable checkpoint while quarantining the damaged workspace.
 * Future formats are never downgraded, even after a recovery confirmation. */
export async function recoverCampaignWorkspace(id: CampaignSlotId, checkpointId: CampaignCheckpointId,
  options: {expectedRevision:number}, storage: ArchiveStorage | null = browserStorage()): Promise<CampaignSlotResult> {
  return mutation(storage,data=>{
    const {raw:targetRaw,document:target}=requireSlot(data,id,options?.expectedRevision);
    if(!options || !Number.isInteger(options.expectedRevision))fail("save-conflict","Une révision confirmée est requise.");
    const chosen=target.checkpoints.find(c=>c.id===checkpointId);if(!chosen)fail("missing-checkpoint","Cette sauvegarde est absente.");
    const catalog=loadCampaignSlots(data);
    if(catalog.failure==="future-version")fail("future-version","La campagne courante vient d’une version plus récente. Aucun retour à une ancienne version n’est autorisé.");
    let recovered=false;try{recovered=readWorkingCampaign(data).recovered;}catch(error){if(!(error instanceof Refusal)||error.failure!=="protected-save")throw error;recovered=true;}
    if(!recovered)fail("protected-save","Aucune campagne endommagée ne justifie cette récupération. Utilisez le chargement normal.");
    const plan=prepareCompleteArchiveImport(chosen.archive,data);rejectFutureTargets(plan.replacements,target.ownerCreatedAt);
    const original=plan.replacements.map(entry=>({key:entry.key,raw:entry.before}));
    const rescueKey=SLOT_PREFIX+"workspace-recovery."+globalThis.crypto.randomUUID();
    guardedSet(data,rescueKey,JSON.stringify({format:"yautja-protected-workspace",version:1,original}),null);
    if(data.getItem(campaignSlotStorageKey(id))!==targetRaw)fail("save-conflict","La sauvegarde de récupération a changé.");
    const result=importCompleteArchive(plan,data);
    if(!result.persisted)fail(result.recovery.status==="blocked"?"recovery-required":"write-failed",result.recovery.message);
    return {slotId:id,checkpoint:chosen,save:chosen.archive.campaign};
  });
}
/** Last-resort, explicitly confirmed new start. No readable campaign or future
 * document may be sacrificed. Raw damaged bytes survive in the same transaction. */
export async function recoverAsNewCampaignSlot(id: CampaignSlotId,name:string,storage:ArchiveStorage|null=browserStorage()):Promise<CampaignSlotResult>{
 return mutation(storage,data=>{
  if(!slotIdValid(id))fail("invalid-slot","Numéro de partie invalide.");
  const catalog=loadCampaignSlots(data);
  if(catalog.failure==="future-version")fail("future-version","Une version future reste protégée ; aucune nouvelle chronique ne la remplace.");
  if(!catalog.workspaceRecoveryAvailable||catalog.slots.some(slot=>slot.status==="ready"))fail("protected-save","Utilisez un checkpoint lisible ou le menu normal ; cette récupération est réservée aux archives endommagées sans partie lisible.");
  const key=campaignSlotStorageKey(id),before=data.getItem(key),backup=data.getItem(key+'.backup');
  if(before!==null||backup!==null||catalog.slots[id-1].status!=="empty")fail("protected-save","Cette récupération exige un emplacement vide ; aucun slot endommagé ou futur n’est remplacé.");
  for(const raw of [data.getItem(SAVE_STORAGE_KEY),data.getItem(SAVE_STORAGE_KEY+'.backup')])if(raw!==null&&parseSaveImport(raw).save)fail("recovery-required","Une copie de campagne lisible existe. Conservez-la avant une nouvelle chronique.");
  const next=newCampaignDocument(id,name,catalog),serialized=JSON.stringify(next),desired=next.checkpoints[0].archive;
  const plan=prepareCompleteArchiveImport(desired,data);rejectFutureTargets(plan.replacements,desired.campaign.createdAt);
  const replacements:ArchiveReplacement[]=[{key:key+'.backup',before:backup,after:serialized},{key,before,after:serialized},...plan.replacements];
  const rescueKey=SLOT_PREFIX+'workspace-recovery.'+globalThis.crypto.randomUUID();
  const rescue=JSON.stringify({format:'yautja-protected-workspace',version:1,original:replacements.map(entry=>({key:entry.key,raw:entry.before}))});
  const committed=applyArchiveTransaction(data,[{key:rescueKey,before:null,after:rescue},...replacements]);
  if(!committed.persisted)fail(committed.recovery.status==='blocked'?'recovery-required':'write-failed',committed.recovery.message);
  return {slotId:id,checkpoint:next.checkpoints[0],save:desired.campaign};
 });
}
export async function saveCampaignCheckpoint(id: CampaignSlotId, options: CampaignCheckpointOptions, storage: ArchiveStorage | null = browserStorage()): Promise<CampaignSlotResult> {
  return mutation(storage, data => ({ slotId: id, checkpoint: replaceCheckpoint(data, id, options) }));
}
/** Save the current complete workspace before atomically replacing all six families. */
export async function activateCampaignCheckpoint(id: CampaignSlotId, checkpointId: CampaignCheckpointId,
  options: { expectedRevision: number }, storage: ArchiveStorage | null = browserStorage()): Promise<CampaignSlotResult> {
  return mutation(storage, data => {
    if (!options || !Number.isInteger(options.expectedRevision) || options.expectedRevision < 1) fail("save-conflict", "Une révision observée est requise pour charger.");
    const { raw: targetRaw, document: target } = requireSlot(data, id, options.expectedRevision);
    const chosen = target.checkpoints.find(c => c.id === checkpointId);
    if (!chosen) fail("missing-checkpoint", "Cet emplacement est vide.");
    const catalog = loadCampaignSlots(data);
    if (catalog.status !== "ready") fail(catalog.failure ?? "protected-save", "La campagne active est protégée.");
    if (catalog.legacy === "available") fail("migration-required", "Conservez d’abord la partie courante.");
    // Take the immutable target before rotating autos; loading auto-1 in the
    // current party must not accidentally load the newly captured auto-1.
    const desired = checkArchive(JSON.stringify(chosen.archive));
    const sourcePreimage = new Map<string, string | null>();
    if (catalog.activeSlotId) {
      const current = catalog.slots[catalog.activeSlotId - 1];
      replaceCheckpoint(data, current.id, { kind: "auto", expectedRevision: current.revision }, sourcePreimage);
    }
    if (catalog.activeSlotId !== id && data.getItem(campaignSlotStorageKey(id)) !== targetRaw) fail("save-conflict", "La sauvegarde choisie a changé pendant la préparation.");
    if ([...sourcePreimage].some(([key, raw]) => data.getItem(key) !== raw)) fail("save-conflict", "La partie courante a changé depuis sa sauvegarde préalable.");
    const plan = prepareCompleteArchiveImport(desired, data);
    // Freeze the pre-switch workspace. Never use a later sidecar as a preimage
    // if that newer progress was not included in the safety autosave.
    for (const entry of plan.replacements) if (sourcePreimage.has(entry.key)) entry.before = sourcePreimage.get(entry.key)!;
    for (const entry of plan.replacements) {
      if (entry.before === null || entry.before === "") continue;
      let value: unknown; try { value = JSON.parse(entry.before); } catch { continue; }
      const maxVersion = entry.key === ACTIVE_HUNT_STORAGE_KEY ? ACTIVE_HUNT_SAVE_VERSION : entry.key === SHIP_PROGRESSION_STORAGE_KEY ? SHIP_PROGRESSION_VERSION
        : entry.key === pitSaveStorageKey(desired.campaign.createdAt) ? PIT_SAVE_VERSION : entry.key === pitReplayStorageKey(desired.campaign.createdAt) ? PIT_REPLAY_STORAGE_VERSION : SAVE_VERSION;
      if (record(value) && Number(value.version) > maxVersion) fail("future-version", "Une annexe plus récente occupe une clé cible ; elle reste protégée.");
    }
    const imported = importCompleteArchive(plan, data);
    if (!imported.persisted) fail(imported.recovery.status === "blocked" ? "recovery-required" : "write-failed", imported.recovery.message);
    return { slotId: id, checkpoint: { ...chosen, archive: desired }, save: desired.campaign };
  });
}
/** Resume the actual workspace, including progress newer than the last auto. No import or rollback. */
export async function continueCampaignSlot(id: CampaignSlotId, options: { expectedRevision: number; location?: CampaignResumeLocation },
  storage: ArchiveStorage | null = browserStorage()): Promise<CampaignSlotResult> {
  return mutation(storage, data => {
    const next = replaceCheckpoint(data, id, { kind: "auto", expectedRevision: options.expectedRevision, location: options.location });
    return { slotId: id, checkpoint: next, save: next.archive.campaign };
  });
}
/** Explicit recovery preserves the corrupt primary under a separate immutable key. */
export async function recoverCampaignSlot(id: CampaignSlotId, storage: ArchiveStorage | null = browserStorage()): Promise<CampaignSlotResult> {
  return mutation(storage, data => {
    if (!slotIdValid(id)) fail("invalid-slot", "Numéro de partie invalide.");
    const read = readSlot(data, id);
    if (read.document) return { slotId: id };
    if (!read.recovery || read.failure === "future-version") fail(read.failure ?? "empty-slot", "Aucune copie de secours compatible n’est disponible.");
    const key = campaignSlotStorageKey(id), preserved = data.getItem(key + ".damaged");
    if (preserved !== null && preserved !== read.raw) fail("protected-save", "Une première archive endommagée est déjà conservée. Exportez-la avant de poursuivre.");
    if (preserved === null && read.raw !== null) guardedSet(data, key + ".damaged", read.raw, null);
    guardedSet(data, key, JSON.stringify(read.recovery), read.raw);
    return { slotId: id };
  });
}
