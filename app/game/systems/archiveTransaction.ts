import { ARCHIVE_TRANSFER_JOURNAL_KEY } from "./archiveTransferGuard";

export interface ArchiveStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}
export interface ArchiveReplacement { key: string; before: string | null; after: string | null }
interface TransferJournal {
  format: "yautja-archive-transaction"; version: 1; id: string;
  phase: "prepared" | "committed"; leaseUntil: number; replacements: ArchiveReplacement[];
}
export interface ArchiveRecoveryResult {
  status: "none" | "rolled-back" | "committed" | "blocked";
  message: string;
}
export const ARCHIVE_TRANSACTION_MAX_BYTES = 8 * 1024 * 1024;
const CAMPAIGN_KEY = "yautja-long-hunt.save";
const byteLength = (text: string) => new TextEncoder().encode(text).byteLength;
const object = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

function validReplacements(value: unknown): value is ArchiveReplacement[] {
  if (!Array.isArray(value) || value.length !== 6) return false;
  if (!value.every((entry) => object(entry) && typeof entry.key === "string" &&
    (entry.before === null || typeof entry.before === "string") &&
    (entry.after === null || typeof entry.after === "string"))) return false;
  const campaign = value.find((entry) => entry.key === CAMPAIGN_KEY);
  if (typeof campaign?.after !== "string") return false;
  let owner: unknown;
  try { owner = JSON.parse(campaign.after).createdAt; } catch { return false; }
  if (typeof owner !== "string" || owner.length > 128 || !Number.isFinite(Date.parse(owner))) return false;
  const keys = new Set([CAMPAIGN_KEY, CAMPAIGN_KEY + ".backup",
    "yautja-long-hunt.active-hunt", "yautja-long-hunt.ship-progression",
    "yautja-long-hunt.the-pit." + encodeURIComponent(owner),
    "yautja-long-hunt.the-pit.replay." + encodeURIComponent(owner)]);
  return value.every((entry) => keys.delete(entry.key)) && keys.size === 0 &&
    value[value.length - 1].key === CAMPAIGN_KEY;
}
function parseJournal(raw: string): TransferJournal | null {
  if (byteLength(raw) > ARCHIVE_TRANSACTION_MAX_BYTES) return null;
  try {
    const value: unknown = JSON.parse(raw);
    if (!object(value) || value.format !== "yautja-archive-transaction" || value.version !== 1 ||
      typeof value.id !== "string" || value.id.length > 128 ||
      (value.phase !== "prepared" && value.phase !== "committed") ||
      typeof value.leaseUntil !== "number" || !Number.isFinite(value.leaseUntil) ||
      !validReplacements(value.replacements)) return null;
    return value as unknown as TransferJournal;
  } catch { return null; }
}
function sameJournal(storage: ArchiveStorage, raw: string): void {
  if (storage.getItem(ARCHIVE_TRANSFER_JOURNAL_KEY) !== raw) throw new Error("journal-conflict");
}
function assign(storage: ArchiveStorage, key: string, value: string | null): void {
  if (value === null) storage.removeItem(key);
  else storage.setItem(key, value);
  if (storage.getItem(key) !== value) throw new Error("unconfirmed-write");
}
const blocked = (message: string): ArchiveRecoveryResult => ({ status: "blocked", message });

/**
 * Caller must hold the browser archive-transfer lock. A prepared journal is
 * rolled back, never guessed complete from identical campaign bytes. Only a
 * separately confirmed committed journal is a commit marker.
 */
export function recoverArchiveTransaction(
  storage: ArchiveStorage, options: { now?: number; ownedTransactionId?: string } = {},
): ArchiveRecoveryResult {
  let raw: string | null;
  try { raw = storage.getItem(ARCHIVE_TRANSFER_JOURNAL_KEY); }
  catch { return blocked("Lecture du journal impossible. Les archives restent protégées."); }
  if (raw === null) return { status: "none", message: "" };
  const journal = parseJournal(raw);
  if (!journal) return blocked("Journal d’import illisible ou plus récent. Aucune archive n’a été effacée.");
  if (options.ownedTransactionId !== undefined && journal.id !== options.ownedTransactionId) {
    return blocked("Le journal appartient à un autre transfert. Aucune confirmation ni récupération de ses données.");
  }
  if (journal.phase === "prepared" && options.ownedTransactionId !== journal.id &&
      (options.now ?? Date.now()) < journal.leaseUntil) {
    return blocked("Un import est en cours dans une autre session. Réessayez dans quelques secondes.");
  }
  try {
    // Preflight the whole set before restoring anything; preserve a third
    // session's divergent bytes instead of overwriting them with a preimage.
    for (const entry of journal.replacements) {
      const current = storage.getItem(entry.key);
      const allowed = journal.phase === "committed"
        ? current === entry.after : current === entry.before || current === entry.after;
      if (!allowed) return blocked("Une autre session a modifié une archive pendant l’import. Données et journal conservés ; ne fermez pas cette session avant un export.");
    }
    if (journal.phase === "prepared") {
      for (const entry of [...journal.replacements].reverse()) {
        sameJournal(storage, raw);
        const current = storage.getItem(entry.key);
        if (current === entry.before) continue;
        if (current !== entry.after) throw new Error("archive-conflict");
        assign(storage, entry.key, entry.before);
      }
    }
    const target = journal.phase === "committed" ? "after" : "before";
    for (const entry of journal.replacements) {
      if (storage.getItem(entry.key) !== entry[target]) throw new Error("archive-conflict");
    }
    sameJournal(storage, raw);
    storage.removeItem(ARCHIVE_TRANSFER_JOURNAL_KEY);
    if (storage.getItem(ARCHIVE_TRANSFER_JOURNAL_KEY) !== null) throw new Error("journal-not-removed");
    return journal.phase === "committed"
      ? { status: "committed", message: "Import intégral confirmé ; journal de reprise clôturé." }
      : { status: "rolled-back", message: "Import interrompu annulé : les archives précédentes ont été restaurées." };
  } catch {
    // Removal can succeed before its readback throws. Reconcile the exact
    // completed set once, so an already committed import never frees writers
    // while falsely reporting that the old in-memory campaign is authoritative.
    try {
      const target = journal.phase === "committed" ? "after" : "before";
      if (storage.getItem(ARCHIVE_TRANSFER_JOURNAL_KEY) === null &&
          journal.replacements.every((entry) => storage.getItem(entry.key) === entry[target])) {
        return journal.phase === "committed"
          ? { status: "committed", message: "Import intégral confirmé après vérification de la clôture." }
          : { status: "rolled-back", message: "Archives précédentes restaurées après vérification de la clôture." };
      }
    } catch { /* Keep the caller frozen until recovery can be confirmed. */ }
    return blocked("La récupération n’est pas confirmée. Les données et tout journal encore présent restent protégés ; libérez le stockage puis réessayez.");
  }
}

/** Synchronous writes under the browser lock; the campaign is written last. */
export function applyArchiveTransaction(
  storage: ArchiveStorage, replacements: ArchiveReplacement[],
  options: { id?: string; now?: number } = {},
): { persisted: boolean; recovery: ArchiveRecoveryResult } {
  const fail = (message: string) => ({ persisted: false, recovery: blocked(message) });
  if (!validReplacements(replacements)) return fail("Plan d’import invalide. Aucune donnée remplacée.");
  const now = options.now ?? Date.now();
  const id = options.id ?? globalThis.crypto.randomUUID();
  const journal: TransferJournal = {
    format: "yautja-archive-transaction", version: 1, id, phase: "prepared",
    leaseUntil: now + 15_000, replacements,
  };
  const prepared = JSON.stringify(journal);
  if (byteLength(prepared) > ARCHIVE_TRANSACTION_MAX_BYTES) return fail("Import trop volumineux pour le journal de récupération.");
  try {
    if (storage.getItem(ARCHIVE_TRANSFER_JOURNAL_KEY) !== null) return fail("Un import précédent attend sa récupération.");
    for (const entry of replacements) {
      if (storage.getItem(entry.key) !== entry.before) return fail("Les archives ont changé depuis la prévisualisation. Rechargez le fichier pour confirmer l’état actuel.");
    }
    storage.setItem(ARCHIVE_TRANSFER_JOURNAL_KEY, prepared);
    sameJournal(storage, prepared);
    for (const entry of replacements) {
      sameJournal(storage, prepared);
      if (storage.getItem(entry.key) !== entry.before) throw new Error("archive-conflict");
      if (entry.after !== entry.before) assign(storage, entry.key, entry.after);
    }
    // Check every durable sidecar before writing the atomic commit marker.
    for (const entry of replacements) {
      if (storage.getItem(entry.key) !== entry.after) throw new Error("archive-conflict");
    }
    sameJournal(storage, prepared);
    const committed = JSON.stringify({ ...journal, phase: "committed" });
    storage.setItem(ARCHIVE_TRANSFER_JOURNAL_KEY, committed);
    sameJournal(storage, committed);
    const recovery = recoverArchiveTransaction(storage, { ownedTransactionId: id, now });
    return { persisted: recovery.status === "committed", recovery };
  } catch {
    // Includes setItem succeeding followed by a readback failure. Recovery
    // decides from the durable phase marker, never from an optimistic flag.
    const recovery = recoverArchiveTransaction(storage, { ownedTransactionId: id, now });
    return { persisted: recovery.status === "committed", recovery };
  }
}

/** Cross-tab imports/recovery require Web Locks; no unsafe lease imitation. */
export async function withArchiveTransferLock<T>(operation: () => T): Promise<
  { acquired: true; value: T } | { acquired: false; reason: string }
> {
  if (typeof navigator === "undefined" || !navigator.locks?.request) {
    return { acquired: false, reason: "L’import intégral nécessite le verrou navigateur disponible sur HTTPS ou dans l’édition PC. L’export léger reste accessible." };
  }
  try {
    return await navigator.locks.request("yautja-full-archive-transfer", { ifAvailable: true }, (lock) =>
      lock ? { acquired: true as const, value: operation() }
        : { acquired: false as const, reason: "Une autre session transfère ses archives. Réessayez après sa fermeture." });
  } catch {
    return { acquired: false, reason: "Le verrou des archives n’a pas pu être obtenu. Aucune modification demandée." };
  }
}
