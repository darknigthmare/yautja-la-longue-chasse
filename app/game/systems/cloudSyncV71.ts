import { cloudArchiveHasTraceV71, cloudArchiveIdentityV71, parseCloudArchiveV71, type CloudArchiveV71 } from "./cloudArchiveV71";
import type { ArchiveStorage } from "./archiveTransaction";

export interface CloudAccountArchiveRowV71 { accountId: string; revision: number; snapshot: CloudArchiveV71; updatedAt: string }
export interface CloudSyncBaseV71 { revision: number | null; digest: string | null }
export interface CloudSyncOutboxV71 {
  format: "yautja-cloud-outbox"; version: 1; accountId: string; operationId: string; queuedAt: string;
  expectedRevision: number | null; baseDigest: string | null; snapshot: CloudArchiveV71;
}
export type CloudSyncActionV71 = "none" | "upload-local" | "download-cloud" | "confirmation";
export interface CloudSyncDecisionV71 { action: CloudSyncActionV71; reason: "empty" | "equal" | "local-only" | "cloud-only" | "local-change" | "cloud-change" | "divergence" | "account-change" }
export interface CloudSyncTransportV71 {
  pull(input: { accountId: string }): Promise<CloudAccountArchiveRowV71 | null>;
  push(input: { accountId: string; expectedRevision: number | null; snapshot: CloudArchiveV71 }): Promise<CloudAccountArchiveRowV71>;
}
export class CloudSyncConflictV71 extends Error { constructor(message = "L’archive du compte a changé sur un autre appareil.") { super(message); this.name = "CloudSyncConflictV71"; } }
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
export function isCloudAccountIdV71(value: unknown): value is string { return typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value); }
const revision = (v: unknown): v is number => Number.isSafeInteger(v) && Number(v) >= 1 && Number(v) <= 1_000_000_000;
const digestValid = (v: unknown): v is string => typeof v === "string" && /^[a-f0-9]{64}$/.test(v);
const iso = (v: unknown): v is string => typeof v === "string" && v.length <= 128 && Number.isFinite(Date.parse(v));
export const cloudOutboxStorageKeyV71 = (accountId: string): string => {
  if (!isCloudAccountIdV71(accountId)) throw new Error("Identité de compte invalide.");
  return "yautja-long-hunt.cloud.outbox-v71." + accountId;
};
export const cloudSyncBaseStorageKeyV71 = (accountId: string): string => {
  if (!isCloudAccountIdV71(accountId)) throw new Error("Identité de compte invalide.");
  return "yautja-long-hunt.cloud.base-v71." + accountId;
};
export async function cloudArchiveDigestV71(snapshot: CloudArchiveV71): Promise<string> {
  const hash = await globalThis.crypto.subtle.digest("SHA-256", new TextEncoder().encode(cloudArchiveIdentityV71(snapshot)));
  return [...new Uint8Array(hash)].map(n => n.toString(16).padStart(2, "0")).join("");
}

/** Three-way reconcile; neither device's clock decides whose progress to erase. */
export function reconcileCloudArchiveV71(input: {
  accountId: string; workspaceAccountId: string | null; local: CloudArchiveV71;
  cloud: CloudAccountArchiveRowV71 | null; localDigest: string; cloudDigest: string | null; base: CloudSyncBaseV71 | null;
}): CloudSyncDecisionV71 {
  if (!isCloudAccountIdV71(input.accountId) || (input.cloud && input.cloud.accountId !== input.accountId)) throw new Error("Archive d’un autre compte refusée.");
  if (!digestValid(input.localDigest) || (input.cloudDigest !== null && !digestValid(input.cloudDigest))) throw new Error("Empreinte d’archive invalide.");
  const local = cloudArchiveHasTraceV71(input.local), cloud = input.cloud !== null && cloudArchiveHasTraceV71(input.cloud.snapshot);
  if (local && input.workspaceAccountId !== null && input.workspaceAccountId !== input.accountId) return { action: "confirmation", reason: "account-change" };
  if (!local && !cloud) return { action: "none", reason: "empty" };
  if (input.cloud !== null && cloudArchiveIdentityV71(input.local) === cloudArchiveIdentityV71(input.cloud.snapshot)) return { action: "none", reason: "equal" };
  if (local && !cloud) return { action: "upload-local", reason: "local-only" };
  if (!local && cloud) return { action: "download-cloud", reason: "cloud-only" };
  // A remembered baseline is usable only for this actual remote revision or a newer one.
  if (input.base?.digest && input.base.revision !== null && input.cloud && input.cloud.revision >= input.base.revision) {
    if (input.localDigest === input.base.digest && input.cloudDigest !== input.base.digest) return { action: "download-cloud", reason: "cloud-change" };
    if (input.cloudDigest === input.base.digest && input.localDigest !== input.base.digest && input.cloud.revision === input.base.revision) return { action: "upload-local", reason: "local-change" };
  }
  return { action: "confirmation", reason: "divergence" };
}

export function validateCloudRowV71(value: unknown, expectedAccountId: string): CloudAccountArchiveRowV71 {
  if (!record(value) || value.accountId !== expectedAccountId || !isCloudAccountIdV71(expectedAccountId) || !revision(value.revision) || !iso(value.updatedAt)) throw new Error("Réponse cloud incompatible ou appartenant à un autre compte.");
  const parsed = parseCloudArchiveV71(JSON.stringify(value.snapshot));
  if (!parsed.archive) throw new Error(parsed.error ?? "Sauvegarde cloud incompatible.");
  return { accountId: expectedAccountId, revision: value.revision, updatedAt: value.updatedAt, snapshot: parsed.archive };
}

/** One account owns each durable queue. Session access/refresh tokens never enter it. */
export function queueCloudArchiveV71(storage: ArchiveStorage, accountId: string, snapshot: CloudArchiveV71,
  base: CloudSyncBaseV71, options: { operationId?: string; now?: string; expectedRaw?: string | null } = {}): CloudSyncOutboxV71 {
  const key = cloudOutboxStorageKeyV71(accountId), before = storage.getItem(key);
  if (options.expectedRaw !== undefined && options.expectedRaw !== before) throw new CloudSyncConflictV71("La file de cet appareil a changé.");
  // A corrupt/newer pending transfer is protected just like a campaign save.
  if (before !== null) readCloudOutboxV71(storage, accountId);
  if (base.revision !== null && !revision(base.revision) || base.digest !== null && !digestValid(base.digest)) throw new Error("Base de synchronisation invalide.");
  const parsed = parseCloudArchiveV71(JSON.stringify(snapshot));
  if (!parsed.archive) throw new Error(parsed.error ?? "Archive locale incompatible.");
  const outbox: CloudSyncOutboxV71 = { format: "yautja-cloud-outbox", version: 1, accountId,
    operationId: options.operationId ?? globalThis.crypto.randomUUID(), queuedAt: options.now ?? new Date().toISOString(),
    expectedRevision: base.revision, baseDigest: base.digest, snapshot: parsed.archive };
  if (!isCloudAccountIdV71(outbox.operationId) || !iso(outbox.queuedAt)) throw new Error("Identité de transfert invalide.");
  const raw = JSON.stringify(outbox);
  if (storage.getItem(key) !== before) throw new CloudSyncConflictV71("La file de cet appareil a changé.");
  storage.setItem(key, raw);
  if (storage.getItem(key) !== raw) throw new Error("File hors ligne non confirmée. Les sauvegardes locales restent intactes.");
  return outbox;
}
export function readCloudOutboxV71(storage: ArchiveStorage, accountId: string): { outbox: CloudSyncOutboxV71 | null; raw: string | null } {
  const raw = storage.getItem(cloudOutboxStorageKeyV71(accountId));
  if (raw === null) return { raw, outbox: null };
  let value: unknown; try { value = JSON.parse(raw); } catch { throw new Error("File hors ligne illisible, conservée."); }
  if (!record(value) || value.format !== "yautja-cloud-outbox" || value.version !== 1 || value.accountId !== accountId || !isCloudAccountIdV71(value.operationId) || !iso(value.queuedAt) ||
    (value.expectedRevision !== null && !revision(value.expectedRevision)) || (value.baseDigest !== null && !digestValid(value.baseDigest))) throw new Error("File hors ligne incompatible, conservée.");
  const parsed = parseCloudArchiveV71(JSON.stringify(value.snapshot));
  if (!parsed.archive) throw new Error(parsed.error ?? "File hors ligne incompatible.");
  return { raw, outbox: { ...value, snapshot: parsed.archive } as unknown as CloudSyncOutboxV71 };
}

/** Always re-read cloud before a retry. A changed remote does not receive a blind upsert. */
export async function flushCloudOutboxV71(storage: ArchiveStorage, accountId: string, transport: CloudSyncTransportV71,
  options: { isCurrentAccount: () => boolean }): Promise<{ status: "empty" | "synced" | "changed-locally"; row: CloudAccountArchiveRowV71 | null }> {
  const pending = readCloudOutboxV71(storage, accountId);
  if (!pending.outbox) return { status: "empty", row: null };
  const checkOwner = () => { if (!options.isCurrentAccount()) throw new Error("Compte déconnecté ou remplacé : transfert suspendu."); };
  checkOwner();
  const pulled = await transport.pull({ accountId }); checkOwner();
  const cloud = pulled === null ? null : validateCloudRowV71(pulled, accountId);
  // Handles a previous POST that committed remotely while its response was lost.
  let row = cloud;
  if (cloud === null || cloudArchiveIdentityV71(cloud.snapshot) !== cloudArchiveIdentityV71(pending.outbox.snapshot)) {
    if ((cloud?.revision ?? null) !== pending.outbox.expectedRevision) throw new CloudSyncConflictV71();
    checkOwner();
    row = validateCloudRowV71(await transport.push({ accountId, expectedRevision: pending.outbox.expectedRevision, snapshot: pending.outbox.snapshot }), accountId);
    checkOwner();
    if (row.revision !== (pending.outbox.expectedRevision ?? 0) + 1 || cloudArchiveIdentityV71(row.snapshot) !== cloudArchiveIdentityV71(pending.outbox.snapshot)) throw new Error("Écriture cloud non confirmée ; file conservée.");
  }
  if (!row) throw new Error("Archive cloud non confirmée.");
  const key = cloudOutboxStorageKeyV71(accountId);
  if (storage.getItem(key) !== pending.raw) return { status: "changed-locally", row };
  const base: CloudSyncBaseV71 = { revision: row.revision, digest: await cloudArchiveDigestV71(row.snapshot) };
  checkOwner();
  const baseRaw = JSON.stringify(base), baseKey = cloudSyncBaseStorageKeyV71(accountId);
  storage.setItem(baseKey, baseRaw);
  if (storage.getItem(baseKey) !== baseRaw) throw new Error("Base de synchronisation non confirmée ; file conservée.");
  if (storage.getItem(key) !== pending.raw) return { status: "changed-locally", row };
  storage.removeItem(key);
  if (storage.getItem(key) !== null) throw new Error("Sauvegarde cloud confirmée ; clôture locale de la file à réessayer.");
  return { status: "synced", row };
}
export function readCloudSyncBaseV71(storage: ArchiveStorage, accountId: string): CloudSyncBaseV71 | null {
  const raw = storage.getItem(cloudSyncBaseStorageKeyV71(accountId));
  if (raw === null) return null;
  let value: unknown; try { value = JSON.parse(raw); } catch { return null; }
  return record(value) && (value.revision === null || revision(value.revision)) && (value.digest === null || digestValid(value.digest))
    ? { revision: value.revision as number | null, digest: value.digest as string | null } : null;
}

export const CLOUD_REMOTE_RESCUE_PREFIX_V71 = "yautja-long-hunt.cloud.remote-rescue-v71.";
/** Before an explicit 'keep this device' overwrite, retain the remote branch verbatim. */
export function backupRemoteCloudV71(storage: ArchiveStorage, row: CloudAccountArchiveRowV71,
  options: { rescueId?: string; now?: string } = {}): string {
  const clean = validateCloudRowV71(row, row.accountId), rescueId = options.rescueId ?? globalThis.crypto.randomUUID();
  if (!isCloudAccountIdV71(rescueId)) throw new Error("Identité de secours invalide.");
  const key = CLOUD_REMOTE_RESCUE_PREFIX_V71 + clean.accountId + "." + rescueId;
  const copiedAt = options.now ?? new Date().toISOString(); if (!iso(copiedAt)) throw new Error("Date de secours invalide.");
  const raw = JSON.stringify({ format: "yautja-cloud-remote-rescue", version: 1, copiedAt, row: clean });
  if (storage.getItem(key) !== null) throw new Error("Ce secours existe déjà ; aucune copie remplacée.");
  storage.setItem(key, raw);
  if (storage.getItem(key) !== raw) throw new Error("Secours distant non confirmé. Aucun remplacement cloud autorisé.");
  return key;
}
