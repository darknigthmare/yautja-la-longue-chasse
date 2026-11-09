import type { WarRulesV6 } from "./clanWarBibleV6";
import { WAR_OPERATIONS_STORAGE_V115, WAR_OPERATIONS_LEGACY_STORAGE_V115, readWarOperationsV115, type WarOperationsStateV115 } from "./clanWarOperationsV115";
import { WarFenceErrorV94, type WarFencePortV94, type WarFenceRecordV94 } from "./clanWarFenceV94";

type Storage = Pick<globalThis.Storage, "getItem" | "setItem">;
export interface WarOperationsArchiveBaseline {
  raw: string | null;
  fence: WarFenceRecordV94 | null;
  /** Only present before a new namespace exists. First writes must not silently
   * bypass an old exercise which appeared while the empty view was open. */
  legacy?: WarOperationsLegacySnapshot;
}
export interface WarOperationsLegacySnapshot {
  raw: string | null;
  fence: WarFenceRecordV94 | null;
  fenceFailure?: "conflict" | "incompatible" | "unavailable";
  rawAfterFenceRead?: string | null;
}
export type WarOperationsArchiveRead = {
  status: "ready" | "recovery";
  state: WarOperationsStateV115 | null;
  baseline: WarOperationsArchiveBaseline;
} | {
  status: "legacy-available" | "legacy-blocked";
  state: WarOperationsStateV115 | null;
  baseline: WarOperationsArchiveBaseline;
  legacy: WarOperationsLegacySnapshot;
  reason: string;
} | { status: "conflict" | "incompatible" | "unavailable" };
export type WarOperationsArchiveWrite = {
  status: "committed";
  baseline: WarOperationsArchiveBaseline;
} | { status: "recovery"; baseline: WarOperationsArchiveBaseline }
  | { status: "conflict" | "incompatible" | "unavailable" };
const key = WAR_OPERATIONS_STORAGE_V115;
const sameFence = (a: WarFenceRecordV94 | null, b: WarFenceRecordV94 | null) =>
  a === null || b === null ? a === b : a.token === b.token && a.phase === b.phase &&
    a.version === b.version && a.before === b.before && a.after === b.after;
const failure = (error: unknown): "conflict" | "incompatible" | "unavailable" =>
  error instanceof WarFenceErrorV94 && error.reason !== "unavailable" ? error.reason : "unavailable";

export async function snapshotWarOperationsLegacyArchive(storage: Storage, fence: WarFencePortV94): Promise<WarOperationsLegacySnapshot> {
  const raw = storage.getItem(WAR_OPERATIONS_LEGACY_STORAGE_V115);
  let record: WarFenceRecordV94 | null;
  try { record = await fence.read(WAR_OPERATIONS_LEGACY_STORAGE_V115); }
  catch (error) { return { raw, fence: null, fenceFailure: failure(error) }; }
  const after = storage.getItem(WAR_OPERATIONS_LEGACY_STORAGE_V115);
  return { raw, fence: record, ...(after === raw ? {} : { rawAfterFenceRead: after }) };
}

async function legacyArchive(storage: Storage, rules: WarRulesV6, fence: WarFencePortV94): Promise<{
  snapshot: WarOperationsLegacySnapshot; state: WarOperationsStateV115 | null; available: boolean; reason: string;
}> {
  const snapshot = await snapshotWarOperationsLegacyArchive(storage, fence), { raw, fence: record } = snapshot;
  if (snapshot.fenceFailure) {
    return { snapshot, state: null, available: false,
      reason: "Le registre de l’ancienne archive est indisponible ou incompatible. Exportez ses octets avant toute reprise." };
  }
  if (Object.hasOwn(snapshot, "rawAfterFenceRead")) return { snapshot, state: null, available: false,
    reason: "L’ancienne archive a changé pendant sa lecture. Rechargez pour examiner sa nouvelle provenance." };
  const state = raw === null ? null : readWarOperationsV115(raw, rules);
  if (record && (record.phase !== "confirmed" || raw !== record.after)) return { snapshot, state: null, available: false,
    reason: "L’ancien miroir et son intention ne sont pas confirmés ensemble. Ils restent conservés : exportez les deux versions pour les récupérer, sans choisir automatiquement une progression." };
  if (raw !== null && !state) return { snapshot, state: null, available: false,
    reason: "L’ancienne archive est illisible ou provient d’un autre format. Ses octets sont conservés et exportables." };
  return { snapshot, state, available: true, reason: "L’ancienne archive reste intacte. Adopter copie exactement la version présentée dans le nouveau registre isolé, sans rejouer de mandat ni débiter de RAV. Les anciens clients continueront sur leur propre archive." };
}

/** The isolated namespace is authoritative once it exists. A durable intent is displayed but
 * never replayed into localStorage until the player explicitly repairs it.
 * All mutations below still require the panel's origin-wide Web Lock.
 * Old bundles keep writing their separate legacy namespace; no cloud or
 * same-origin malicious-writer protection is claimed. */
export async function readWarOperationsArchive(
  storage: Storage, rules: WarRulesV6, fence: WarFencePortV94,
): Promise<WarOperationsArchiveRead> {
  try {
    const raw = storage.getItem(key);
    const original = raw === null ? null : readWarOperationsV115(raw, rules);
    if (raw !== null && !original) return { status: "incompatible" };
    const record = await fence.read(key);
    // The read may have yielded while another document committed a new mirror.
    if (storage.getItem(key) !== raw) return { status: "conflict" };
    if (!record && raw === null) {
      const legacy = await legacyArchive(storage, rules, fence);
      if (storage.getItem(key) !== null) return { status: "conflict" };
      const baseline = { raw: null, fence: null, legacy: legacy.snapshot };
      if (!legacy.available || legacy.snapshot.raw !== null || legacy.snapshot.fence !== null) return {
        status: legacy.available ? "legacy-available" : "legacy-blocked", state: legacy.state,
        baseline, legacy: legacy.snapshot, reason: legacy.reason,
      };
      return { status: "ready", state: null, baseline };
    }
    if (!record) return { status: "ready", state: original, baseline: { raw, fence: null } };
    if (raw !== record.before && raw !== record.after) return { status: "conflict" };
    const intended = readWarOperationsV115(record.after, rules);
    if (!intended) return { status: "incompatible" };
    return {
      status: record.phase === "confirmed" && raw === record.after ? "ready" : "recovery",
      state: intended, baseline: { raw, fence: record },
    };
  } catch (error) { return { status: failure(error) }; }
}

async function finishIntent(
  storage: Storage, fence: WarFencePortV94, baseline: WarOperationsArchiveBaseline,
): Promise<WarOperationsArchiveWrite> {
  const record = baseline.fence;
  if (!record) return { status: "incompatible" };
  try {
    if (storage.getItem(key) !== baseline.raw) return { status: "conflict" };
    if (baseline.raw !== record.after) {
      try { storage.setItem(key, record.after); } catch { /* A setter can write, then throw. Read it back. */ }
    }
    const raw = storage.getItem(key);
    if (raw !== record.after) {
      if (raw !== baseline.raw) return { status: "conflict" };
      return { status: "recovery", baseline };
    }
    const confirmed = await fence.confirm(key, record);
    // Never announce a turn/result after a newer non-cooperating mirror write.
    if (storage.getItem(key) !== record.after) return { status: "conflict" };
    return { status: "committed", baseline: { raw: record.after, fence: confirmed } };
  } catch (error) {
    const status = failure(error);
    return status === "unavailable" ? { status: "recovery", baseline } : { status };
  }
}

export async function writeWarOperationsArchive(
  storage: Storage, rules: WarRulesV6, fence: WarFencePortV94,
  baseline: WarOperationsArchiveBaseline, state: WarOperationsStateV115,
): Promise<WarOperationsArchiveWrite> {
  try {
    const raw = JSON.stringify(state);
    if (!readWarOperationsV115(raw, rules)) return { status: "incompatible" };
    if (baseline.fence && (baseline.fence.phase !== "confirmed" || baseline.raw !== baseline.fence.after)) {
      return { status: "incompatible" };
    }
    if (storage.getItem(key) !== baseline.raw) return { status: "conflict" };
    if (baseline.raw === null && baseline.fence === null) {
      if (!baseline.legacy || baseline.legacy.raw !== null || baseline.legacy.fence !== null || baseline.legacy.fenceFailure) return { status: "incompatible" };
      const legacy = await legacyArchive(storage, rules, fence);
      if (!legacy.available || legacy.snapshot.raw !== null || legacy.snapshot.fence !== null) return { status: "conflict" };
      if (storage.getItem(key) !== null) return { status: "conflict" };
    }
    const reserved = await fence.reserve(key, baseline.fence, baseline.raw, raw);
    return finishIntent(storage, fence, { raw: baseline.raw, fence: reserved });
  } catch (error) { return { status: failure(error) }; }
}

/** Explicit one-way adoption of a stable, understood legacy snapshot. Never
 * changes/removes old mirror or old fence, never recomputes an operation. The
 * new namespace reservation is the adoption point; subsequent old-client
 * progress remains independently recoverable in its untouched old namespace. */
export async function adoptWarOperationsLegacyArchive(
  storage: Storage, rules: WarRulesV6, fence: WarFencePortV94,
  baseline: WarOperationsArchiveBaseline, legacy: WarOperationsLegacySnapshot,
): Promise<WarOperationsArchiveWrite> {
  try {
    if (baseline.raw !== null || baseline.fence !== null || storage.getItem(key) !== null) return { status: "conflict" };
    if (!legacy.raw || legacy.fenceFailure || !readWarOperationsV115(legacy.raw, rules)) return { status: "incompatible" };
    const observed = await legacyArchive(storage, rules, fence);
    if (!observed.available || observed.snapshot.raw !== legacy.raw || !sameFence(observed.snapshot.fence, legacy.fence)) return { status: "conflict" };
    if (storage.getItem(key) !== null) return { status: "conflict" };
    const reserved = await fence.reserve(key, null, null, legacy.raw);
    return finishIntent(storage, fence, { raw: null, fence: reserved });
  } catch (error) { return { status: failure(error) }; }
}

/** Recovery export is a provenance envelope, not a save import or a merged
 * campaign. Keeping both raw strings preserves future/corrupt/forked input. */
export function exportWarOperationsLegacyArchive(legacy: WarOperationsLegacySnapshot): string {
  return JSON.stringify({ format: "yautja-v115-legacy-recovery", version: 1,
    legacyKey: WAR_OPERATIONS_LEGACY_STORAGE_V115, canonicalKey: key,
    warning: "Sources preserved separately; this file is not an automatically merged exercise.",
    mirror: legacy.raw, ...(Object.hasOwn(legacy, "rawAfterFenceRead") ? { mirrorAfterFenceRead: legacy.rawAfterFenceRead } : {}),
    fence: legacy.fence, fenceFailure: legacy.fenceFailure ?? null }, null, 2);
}

export async function repairWarOperationsArchive(
  storage: Storage, rules: WarRulesV6, fence: WarFencePortV94,
  baseline: WarOperationsArchiveBaseline,
): Promise<WarOperationsArchiveWrite> {
  try {
    const current = await fence.read(key);
    if (!sameFence(current, baseline.fence)) return { status: "conflict" };
    if (!current || !readWarOperationsV115(current.after, rules)) return { status: "incompatible" };
    // After an interrupted mirror write, either the old or intended bytes may
    // be present. Any third value is somebody else's archive, never a repair.
    const raw = storage.getItem(key);
    if (raw !== current.before && raw !== current.after) return { status: "conflict" };
    return finishIntent(storage, fence, { raw, fence: current });
  } catch (error) { return { status: failure(error) }; }
}
