import { GAME_CONTENT_VERSION } from "../buildInfo";
import { parseSaveImport, SAVE_STORAGE_KEY } from "../save";
import { CAMPAIGN_SLOT_IDS, campaignSlotStorageKey, loadCampaignSlots } from "./campaignSlots";
import { createCompleteArchive, parseCompleteArchive } from "./completeArchive";
import { ARCHIVE_TRANSFER_JOURNAL_KEY, archiveTransferPending } from "./archiveTransferGuard";
import type { ArchiveStorage } from "./archiveTransaction";
import { ACTIVE_HUNT_STORAGE_KEY, normalizeActiveHuntSave } from "./activeHuntSave";
import { SHIP_PROGRESSION_STORAGE_KEY } from "./progression";
import { PIT_SAVE_STORAGE_KEY, validateCanonicalPitSave } from "./pitSave";
import { PIT_REPLAY_STORAGE_KEY, normalizePitReplayArchive } from "./pitReplayStorage";

/** Raw confirmed bytes, including all five campaigns, not merely the open game. */
export interface CloudArchiveV71 {
  format: "yautja-account-archive"; version: 1; contentVersion: string; capturedAt: string;
  entries: { key: string; raw: string }[];
}
export interface CloudArchiveStorageV71 extends ArchiveStorage { readonly length: number; key(index: number): string | null }
export const CLOUD_ARCHIVE_MAX_BYTES_V71 = 16 * 1024 * 1024;
export const CLOUD_WORKSPACE_OWNER_KEY_V71 = "yautja-long-hunt.cloud.workspace-owner-v71";
export const CLOUD_LOCAL_RESCUE_PREFIX_V71 = "yautja-long-hunt.cloud.local-rescue-v71.";
const BASE_KEYS = [SAVE_STORAGE_KEY, SAVE_STORAGE_KEY + ".backup", ACTIVE_HUNT_STORAGE_KEY,
  SHIP_PROGRESSION_STORAGE_KEY, PIT_SAVE_STORAGE_KEY, PIT_REPLAY_STORAGE_KEY];
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const iso = (v: unknown): v is string => typeof v === "string" && v.length <= 128 && Number.isFinite(Date.parse(v));
const bytes = (v: string) => new TextEncoder().encode(v).byteLength;

/** Deliberately excludes accounts, auth tokens, leases, journals and unrelated games. */
export function isCloudArchiveStorageKeyV71(key: string): boolean {
  if (BASE_KEYS.includes(key)) return true;
  if (/^yautja-long-hunt\.campaign-slot\.[1-5](?:\.backup|\.damaged|\.replaced\.[A-Za-z0-9%_.:-]+)?$/.test(key)) return true;
  if (/^yautja-long-hunt\.campaign-slot\.(?:legacy\.[A-Za-z0-9%_.:-]+|workspace-recovery\.[A-Za-z0-9-]+)$/.test(key)) return true;
  return /^yautja-long-hunt\.the-pit\.(?:replay\.)?[A-Za-z0-9%_.:-]+$/.test(key);
}

function memoryStorage(entries: CloudArchiveV71["entries"]): ArchiveStorage {
  const values = new Map(entries.map(({ key, raw }) => [key, raw]));
  return { getItem: key => values.get(key) ?? null, setItem: () => { throw new Error("Snapshot read-only"); }, removeItem: () => { throw new Error("Snapshot read-only"); } };
}
function keysFrom(storage: CloudArchiveStorageV71): string[] {
  const keys: string[] = [];
  const length = storage.length;
  if (!Number.isSafeInteger(length) || length < 0 || length > 100_000) throw new Error("Registre local indisponible.");
  for (let i = 0; i < length; i++) { const key = storage.key(i); if (key !== null && isCloudArchiveStorageKeyV71(key)) keys.push(key); }
  return [...new Set(keys)].sort();
}

function validateEntries(entries: CloudArchiveV71["entries"]): void {
  const storage = memoryStorage(entries), catalog = loadCampaignSlots(storage);
  if (catalog.status !== "ready" || catalog.slots.some(slot => slot.status === "blocked")) throw new Error("Partie locale endommagée ou plus récente : synchronisation suspendue, données intactes.");
  // Backups and replaced campaigns must remain recoverable on the other device.
  for (const { key, raw } of entries) {
    if (key.endsWith(".damaged")) continue; // Explicit rescue data is preserved verbatim, never activated.
    if (key === ACTIVE_HUNT_STORAGE_KEY && raw === "") continue; // Confirmed clear tombstone.
    let value: unknown;
    try { value = JSON.parse(raw); } catch { throw new Error("Annexe illisible : " + key); }
    if (key === SAVE_STORAGE_KEY || key === SAVE_STORAGE_KEY + ".backup") {
      if (!parseSaveImport(raw).save) throw new Error("Campagne protégée : " + key);
    } else if (/^yautja-long-hunt\.campaign-slot\.[1-5](?:\.backup)?$/.test(key)) {
      const primaryKey = key.replace(/\.backup$/, "");
      const alone = loadCampaignSlots(memoryStorage([{ key: primaryKey, raw }]));
      if (alone.status !== "ready" || alone.slots.some(slot => slot.status === "blocked")) throw new Error("Checkpoint protégé : " + key);
    } else if (key.includes(".replaced.")) {
      if (!record(value) || value.format !== "yautja-replaced-campaign" || value.version !== 1 || !record(value.slot)) throw new Error("Secours de remplacement invalide.");
      const slot = value.slot;
      const id = slot.id;
      if (!CAMPAIGN_SLOT_IDS.includes(id as typeof CAMPAIGN_SLOT_IDS[number])) throw new Error("Secours de partie invalide.");
      const alone = loadCampaignSlots(memoryStorage([{ key: campaignSlotStorageKey(id as typeof CAMPAIGN_SLOT_IDS[number]), raw: JSON.stringify(slot) }]));
      if (alone.slots.some(s => s.status === "blocked") || !parseCompleteArchive(JSON.stringify(value.latest)).archive) throw new Error("Secours de partie incompatible.");
    } else if (key === ACTIVE_HUNT_STORAGE_KEY) {
      if (!normalizeActiveHuntSave(value)) throw new Error("Chasse suspendue incompatible.");
    } else if (key.startsWith(PIT_REPLAY_STORAGE_KEY)) {
      if (!normalizePitReplayArchive(value) || !record(value) || !iso(value.ownerSaveCreatedAt)) throw new Error("Replay incompatible.");
      if (key !== PIT_REPLAY_STORAGE_KEY && key !== PIT_REPLAY_STORAGE_KEY + "." + encodeURIComponent(value.ownerSaveCreatedAt)) throw new Error("Replay d’une autre campagne.");
    } else if (key.startsWith(PIT_SAVE_STORAGE_KEY)) {
      if (!validateCanonicalPitSave(value) || !record(value) || !iso(value.ownerSaveCreatedAt)) throw new Error("THE PIT incompatible.");
      if (key !== PIT_SAVE_STORAGE_KEY && key !== PIT_SAVE_STORAGE_KEY + "." + encodeURIComponent(value.ownerSaveCreatedAt)) throw new Error("THE PIT d’une autre campagne.");
    } else if (key === SHIP_PROGRESSION_STORAGE_KEY) {
      if (!record(value) || ![1, 2, 3].includes(value.version as number) || !iso(value.updatedAt)) throw new Error("Vaisseau incompatible.");
    } else if (key.includes(".legacy.") || key.includes(".workspace-recovery.")) {
      if (!record(value) || value.version !== 1 || !Array.isArray(value.original)) throw new Error("Copie originale incompatible.");
    }
  }
  const primary = storage.getItem(SAVE_STORAGE_KEY);
  if (primary !== null) {
    const save = parseSaveImport(primary).save;
    if (!save) throw new Error("Campagne courante incompatible.");
    createCompleteArchive(save, storage); // Strict active hunt, ship and owned PIT/replay checks.
  } else if (entries.some(({ key }) => key === ACTIVE_HUNT_STORAGE_KEY || key === SHIP_PROGRESSION_STORAGE_KEY)) {
    throw new Error("Annexe sans campagne courante : récupération locale nécessaire.");
  }
}

export function parseCloudArchiveV71(serialized: string): { archive: CloudArchiveV71 | null; error: string | null } {
  try {
    if (typeof serialized !== "string" || bytes(serialized) > CLOUD_ARCHIVE_MAX_BYTES_V71) throw new Error("Archive de compte trop volumineuse.");
    const value: unknown = JSON.parse(serialized);
    if (!record(value) || value.format !== "yautja-account-archive" || value.version !== 1 || !iso(value.capturedAt) ||
      typeof value.contentVersion !== "string" || value.contentVersion.length > 64 || !Array.isArray(value.entries) || value.entries.length > 512) throw new Error("Archive de compte invalide ou plus récente.");
    const keys = new Set<string>();
    for (const entry of value.entries) {
      if (!record(entry) || typeof entry.key !== "string" || entry.key.length > 512 || !isCloudArchiveStorageKeyV71(entry.key) || keys.has(entry.key) || typeof entry.raw !== "string") throw new Error("Clé d’archive interdite ou dupliquée.");
      keys.add(entry.key);
    }
    const archive = value as unknown as CloudArchiveV71;
    validateEntries(archive.entries);
    return { archive, error: null };
  } catch (error) { return { archive: null, error: error instanceof Error ? error.message : "Archive illisible." }; }
}

/** Read twice, with no migration and no in-memory unsaved progress. Caller holds archive lock. */
export function captureCloudArchiveV71(storage: CloudArchiveStorageV71, now = new Date().toISOString()): CloudArchiveV71 {
  if (archiveTransferPending(storage)) throw new Error("Un transfert protège les archives.");
  const keys = keysFrom(storage), entries = keys.map(key => ({ key, raw: storage.getItem(key) }));
  if (entries.some(entry => entry.raw === null)) throw new Error("Les sauvegardes ont changé pendant leur lecture.");
  const candidate: CloudArchiveV71 = { format: "yautja-account-archive", version: 1, contentVersion: GAME_CONTENT_VERSION, capturedAt: now, entries: entries as CloudArchiveV71["entries"] };
  const parsed = parseCloudArchiveV71(JSON.stringify(candidate));
  if (!parsed.archive) throw new Error(parsed.error ?? "Archive refusée.");
  if (JSON.stringify(keysFrom(storage)) !== JSON.stringify(keys) || entries.some(({ key, raw }) => storage.getItem(key) !== raw) || storage.getItem(ARCHIVE_TRANSFER_JOURNAL_KEY) !== null) throw new Error("Une autre session a modifié les sauvegardes. Réessayez.");
  return parsed.archive;
}

/** Capture date/content label do not change equivalence; actual raw bytes do. */
export function cloudArchiveIdentityV71(archive: CloudArchiveV71): string {
  return JSON.stringify([...archive.entries].sort((a, b) => a.key.localeCompare(b.key)).map(({ key, raw }) => [key, raw]));
}
export function cloudArchiveHasTraceV71(archive: CloudArchiveV71): boolean { return archive.entries.length > 0; }
