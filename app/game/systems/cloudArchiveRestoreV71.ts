import { ARCHIVE_TRANSFER_JOURNAL_KEY } from "./archiveTransferGuard";
import type { ArchiveReplacement, ArchiveStorage, ArchiveRecoveryResult } from "./archiveTransaction";
import { captureCloudArchiveV71, CLOUD_LOCAL_RESCUE_PREFIX_V71, CLOUD_WORKSPACE_OWNER_KEY_V71,
  cloudArchiveIdentityV71, isCloudArchiveStorageKeyV71, parseCloudArchiveV71, type CloudArchiveV71, type CloudArchiveStorageV71 } from "./cloudArchiveV71";
import { isCloudAccountIdV71 } from "./cloudSyncV71";

export interface CloudArchiveRestorePlanV71 { accountId: string; before: CloudArchiveV71; after: CloudArchiveV71; workspaceOwnerBefore: string | null }
interface CloudJournalV71 {
  format: "yautja-cloud-archive-transaction"; version: 1; id: string; accountId: string;
  phase: "prepared" | "committed"; leaseUntil: number; replacements: ArchiveReplacement[];
  beforeMeta: Pick<CloudArchiveV71, "contentVersion" | "capturedAt">;
  afterMeta: Pick<CloudArchiveV71, "contentVersion" | "capturedAt">;
}
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const blocked = (message: string): ArchiveRecoveryResult => ({ status: "blocked", message });
const bytes = (v: string) => new TextEncoder().encode(v).byteLength;
export function isCloudArchiveJournalV71(raw: string | null): boolean {
  if (raw === null) return false;
  try { const v: unknown = JSON.parse(raw); return record(v) && v.format === "yautja-cloud-archive-transaction"; } catch { return false; }
}
export function readCloudWorkspaceOwnerV71(storage: ArchiveStorage): string | null {
  const raw = storage.getItem(CLOUD_WORKSPACE_OWNER_KEY_V71);
  if (raw !== null && !isCloudAccountIdV71(raw)) throw new Error("Propriétaire local incompatible : archives conservées.");
  return raw;
}
export function prepareCloudArchiveRestoreV71(storage: CloudArchiveStorageV71, accountId: string, snapshot: CloudArchiveV71): CloudArchiveRestorePlanV71 {
  if (!isCloudAccountIdV71(accountId)) throw new Error("Compte invalide.");
  const parsed = parseCloudArchiveV71(JSON.stringify(snapshot));
  if (!parsed.archive) throw new Error(parsed.error ?? "Archive cloud incompatible.");
  return { accountId, before: captureCloudArchiveV71(storage), after: parsed.archive, workspaceOwnerBefore: readCloudWorkspaceOwnerV71(storage) };
}
function replacementsFor(plan: CloudArchiveRestorePlanV71): ArchiveReplacement[] {
  const before = new Map(plan.before.entries.map(e => [e.key, e.raw])), after = new Map(plan.after.entries.map(e => [e.key, e.raw]));
  const keys = [...new Set([...before.keys(), ...after.keys()])].sort((a, b) =>
    a === "yautja-long-hunt.save" ? 1 : b === "yautja-long-hunt.save" ? -1 : a.localeCompare(b));
  const replacements = keys.map(key => ({ key, before: before.get(key) ?? null, after: after.get(key) ?? null }));
  // Binding is part of the same commit, so the next session cannot silently upload another account's workspace.
  replacements.push({ key: CLOUD_WORKSPACE_OWNER_KEY_V71, before: plan.workspaceOwnerBefore, after: plan.accountId });
  return replacements;
}
function snapshotFrom(journal: CloudJournalV71, side: "before" | "after"): CloudArchiveV71 {
  const meta = side === "before" ? journal.beforeMeta : journal.afterMeta;
  return { format: "yautja-account-archive", version: 1, ...meta,
    entries: journal.replacements.filter(e => e.key !== CLOUD_WORKSPACE_OWNER_KEY_V71 && e[side] !== null).map(e => ({ key: e.key, raw: e[side]! })) };
}
function parseJournal(raw: string): CloudJournalV71 | null {
  try {
    if (bytes(raw) > 34 * 1024 * 1024) return null;
    const v: unknown = JSON.parse(raw);
    if (!record(v) || v.format !== "yautja-cloud-archive-transaction" || v.version !== 1 || !isCloudAccountIdV71(v.id) || !isCloudAccountIdV71(v.accountId) ||
      !["prepared", "committed"].includes(v.phase as string) || !Number.isFinite(v.leaseUntil) || !Array.isArray(v.replacements) || v.replacements.length > 1025 || !record(v.beforeMeta) || !record(v.afterMeta)) return null;
    const keys = new Set<string>();
    for (const e of v.replacements) {
      if (!record(e) || typeof e.key !== "string" || keys.has(e.key) || (!isCloudArchiveStorageKeyV71(e.key) && e.key !== CLOUD_WORKSPACE_OWNER_KEY_V71) ||
        (e.before !== null && typeof e.before !== "string") || (e.after !== null && typeof e.after !== "string")) return null;
      keys.add(e.key);
    }
    const journal = v as unknown as CloudJournalV71, owner = journal.replacements.find(e => e.key === CLOUD_WORKSPACE_OWNER_KEY_V71);
    if (!owner || owner.after !== journal.accountId || owner.before !== null && !isCloudAccountIdV71(owner.before) || journal.replacements.at(-1)?.key !== CLOUD_WORKSPACE_OWNER_KEY_V71) return null;
    if (!parseCloudArchiveV71(JSON.stringify(snapshotFrom(journal, "before"))).archive || !parseCloudArchiveV71(JSON.stringify(snapshotFrom(journal, "after"))).archive) return null;
    return journal;
  } catch { return null; }
}
const rescueKeyFor = (journal: CloudJournalV71) => CLOUD_LOCAL_RESCUE_PREFIX_V71 + journal.id;
function rescueRawFor(journal: CloudJournalV71): string {
  return JSON.stringify({ format: "yautja-cloud-local-rescue", version: 1,
    accountId: journal.replacements.find(e => e.key === CLOUD_WORKSPACE_OWNER_KEY_V71)!.before,
    snapshot: snapshotFrom(journal, "before") });
}
function assign(storage: ArchiveStorage, key: string, raw: string | null): void {
  if (raw === null) storage.removeItem(key); else storage.setItem(key, raw);
  if (storage.getItem(key) !== raw) throw new Error("unconfirmed-write");
}
function sameJournal(storage: ArchiveStorage, raw: string): void { if (storage.getItem(ARCHIVE_TRANSFER_JOURNAL_KEY) !== raw) throw new Error("journal-conflict"); }

/** Caller holds withArchiveTransferLock; recover this format before the legacy importer. */
export function recoverCloudArchiveV71(storage: ArchiveStorage, options: { ownedTransactionId?: string; now?: number } = {}): ArchiveRecoveryResult {
  let raw: string | null;
  try { raw = storage.getItem(ARCHIVE_TRANSFER_JOURNAL_KEY); } catch { return blocked("Lecture du journal cloud impossible."); }
  if (raw === null) return { status: "none", message: "" };
  const journal = parseJournal(raw);
  if (!journal) return blocked("Journal cloud incompatible : aucune sauvegarde effacée.");
  if (options.ownedTransactionId !== undefined && options.ownedTransactionId !== journal.id) return blocked("Ce transfert appartient à une autre session.");
  if (journal.phase === "prepared" && options.ownedTransactionId !== journal.id && (options.now ?? Date.now()) < journal.leaseUntil) return blocked("Une autre session synchronise les parties. Réessayez après son transfert.");
  const target = journal.phase === "committed" ? "after" : "before";
  try {
    // Never overwrite a third device/tab's change while attempting rollback.
    for (const e of journal.replacements) {
      const current = storage.getItem(e.key);
      if (journal.phase === "committed" ? current !== e.after : current !== e.before && current !== e.after) return blocked("Une autre session a modifié les archives. Journal et secours local conservés.");
    }
    if (journal.phase === "committed" && storage.getItem(rescueKeyFor(journal)) !== rescueRawFor(journal)) return blocked("Secours local non confirmé. Journal conservé.");
    if (journal.phase === "prepared") for (const e of [...journal.replacements].reverse()) {
      sameJournal(storage, raw);
      if (storage.getItem(e.key) !== e.before) assign(storage, e.key, e.before);
    }
    for (const e of journal.replacements) if (storage.getItem(e.key) !== e[target]) throw new Error("archive-conflict");
    sameJournal(storage, raw); storage.removeItem(ARCHIVE_TRANSFER_JOURNAL_KEY);
    if (storage.getItem(ARCHIVE_TRANSFER_JOURNAL_KEY) !== null) throw new Error("journal-not-removed");
    return journal.phase === "committed" ? { status: "committed", message: "Les cinq parties du compte ont été restaurées ; copie locale conservée." }
      : { status: "rolled-back", message: "Transfert interrompu annulé ; sauvegardes locales restaurées." };
  } catch {
    try {
      if (storage.getItem(ARCHIVE_TRANSFER_JOURNAL_KEY) === null && journal.replacements.every(e => storage.getItem(e.key) === e[target])) {
        return { status: journal.phase === "committed" ? "committed" : "rolled-back", message: "Archives vérifiées après clôture du journal." };
      }
    } catch { /* Keep the workspace frozen until an actual recovery succeeds. */ }
    return blocked("Récupération cloud non confirmée. Libérez le stockage puis réessayez ; données protégées.");
  }
}

/** Never call without the shared browser archive lock; commit/reload is required before playing. */
export function applyCloudArchiveRestoreV71(storage: CloudArchiveStorageV71, plan: CloudArchiveRestorePlanV71,
  options: { transactionId?: string; now?: number } = {}): { persisted: boolean; recovery: ArchiveRecoveryResult; rescueKey: string | null } {
  const failure = (message: string) => ({ persisted: false, recovery: blocked(message), rescueKey: null });
  const transactionId = options.transactionId ?? globalThis.crypto.randomUUID();
  if (!isCloudAccountIdV71(transactionId) || !isCloudAccountIdV71(plan.accountId)) return failure("Identité de transfert invalide.");
  const incoming = parseCloudArchiveV71(JSON.stringify(plan.after)), previous = parseCloudArchiveV71(JSON.stringify(plan.before));
  if (!incoming.archive || !previous.archive) return failure("Plan de restauration invalide ou plus récent.");
  let fresh: CloudArchiveV71;
  try { fresh = captureCloudArchiveV71(storage); } catch { return failure("Archives protégées ou modifiées ; aucune restauration."); }
  if (cloudArchiveIdentityV71(fresh) !== cloudArchiveIdentityV71(previous.archive) || readCloudWorkspaceOwnerV71(storage) !== plan.workspaceOwnerBefore) return failure("Les sauvegardes ont changé depuis la confirmation. Comparez-les à nouveau.");
  const journal: CloudJournalV71 = { format: "yautja-cloud-archive-transaction", version: 1, id: transactionId, accountId: plan.accountId,
    phase: "prepared", leaseUntil: (options.now ?? Date.now()) + 15_000, replacements: replacementsFor(plan),
    beforeMeta: { contentVersion: plan.before.contentVersion, capturedAt: plan.before.capturedAt }, afterMeta: { contentVersion: plan.after.contentVersion, capturedAt: plan.after.capturedAt } };
  const prepared = JSON.stringify(journal), rescueKey = rescueKeyFor(journal), rescueRaw = rescueRawFor(journal);
  if (!parseJournal(prepared)) return failure("Journal de restauration invalide.");
  try {
    if (storage.getItem(ARCHIVE_TRANSFER_JOURNAL_KEY) !== null || storage.getItem(rescueKey) !== null) return failure("Un transfert ou secours existe déjà ; aucune donnée remplacée.");
    for (const e of journal.replacements) if (storage.getItem(e.key) !== e.before) return failure("Les sauvegardes ont changé avant le transfert.");
    storage.setItem(ARCHIVE_TRANSFER_JOURNAL_KEY, prepared); sameJournal(storage, prepared);
    // A quota failure here rolls back before a single campaign byte is changed.
    assign(storage, rescueKey, rescueRaw);
    for (const e of journal.replacements) {
      sameJournal(storage, prepared);
      if (storage.getItem(e.key) !== e.before) throw new Error("archive-conflict");
      if (e.after !== e.before) assign(storage, e.key, e.after);
    }
    for (const e of journal.replacements) if (storage.getItem(e.key) !== e.after) throw new Error("archive-conflict");
    sameJournal(storage, prepared);
    const committed = JSON.stringify({ ...journal, phase: "committed" });
    storage.setItem(ARCHIVE_TRANSFER_JOURNAL_KEY, committed); sameJournal(storage, committed);
    const recovery = recoverCloudArchiveV71(storage, { ownedTransactionId: transactionId, now: options.now });
    return { persisted: recovery.status === "committed", recovery, rescueKey };
  } catch {
    const recovery = recoverCloudArchiveV71(storage, { ownedTransactionId: transactionId, now: options.now });
    return { persisted: recovery.status === "committed", recovery: recovery.status === "none" ? blocked("Stockage plein ou inaccessible avant le transfert. Parties locales intactes.") : recovery, rescueKey };
  }
}
