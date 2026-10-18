import type { SaveGame } from '../types';
import source from '../data/campaignTrainingSourceV90.json';
import { getChronicleRank } from './clanChronicle';
import { normalizeSoloV70Campaign, soloV70MatchesSave } from './campaignSoloV70';
import { createSoloV90State, normalizeSoloV90State, soloV90Receipts, stepSoloV90, unpackSoloV90Input, SOLO_V90_SOURCE_SHA, type SoloV90Receipt, type SoloV90State } from './firstHuntSoloV90';
export const CAMPAIGN_TRAINING_SOURCE_V90 = source;
export interface SoloV90Campaign { version: 1; ownerCreatedAt: string; sourceSha256: string; status: 'active' | 'completed'; checkpoint: SoloV90State; receipts: SoloV90Receipt[]; startedAt: string; completedAt: string | null }
export type SoloV90Save = SaveGame & { soloV90?: SoloV90Campaign | null };
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const iso = (v: unknown): v is string => typeof v === 'string' && v.length <= 128 && Number.isFinite(Date.parse(v));
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
export function normalizeSoloV90Campaign(v: unknown): SoloV90Campaign | null {
  if (!record(v) || v.version !== 1 || !iso(v.ownerCreatedAt) || v.sourceSha256 !== SOLO_V90_SOURCE_SHA || !['active', 'completed'].includes(String(v.status)) || !iso(v.startedAt)) return null;
  const checkpoint = normalizeSoloV90State(v.checkpoint);
  if (!checkpoint || checkpoint.replay.length || !same(v.receipts, soloV90Receipts(checkpoint))) return null;
  const complete = checkpoint.phase === 'complete';
  if ((v.status === 'completed') !== complete || (complete ? !iso(v.completedAt) || Date.parse(v.completedAt) < Date.parse(v.startedAt) : v.completedAt !== null)) return null;
  return { version: 1, ownerCreatedAt: v.ownerCreatedAt, sourceSha256: SOLO_V90_SOURCE_SHA, status: complete ? 'completed' : 'active', checkpoint, receipts: soloV90Receipts(checkpoint), startedAt: v.startedAt, completedAt: v.completedAt as string | null };
}
function prerequisites(v: Record<string, unknown>): v is Record<string, unknown> & SoloV90Save {
  if (!soloV70MatchesSave(v) || normalizeSoloV70Campaign(v.soloV70)?.status !== 'completed' || !iso(v.createdAt) || !record(v.prologue)) return false;
  const chronicle = v.prologue.chronicle;
  return getChronicleRank(chronicle) === 'young-blood' && record(chronicle) && Array.isArray(chronicle.rites) && chronicle.rites.length === 2;
}
const journey = (v: Record<string, unknown>) => record(v.homeworldRegionV68) && v.homeworldRegionV68.status !== 'at-city' || record(v.homeworldPassageV67) && v.homeworldPassageV67.status !== 'at-city' || record(v.gameReserveV66) && v.gameReserveV66.status === 'active';
export function soloV90MatchesSave(v: unknown): boolean {
  if (!record(v)) return false;
  if (v.soloV90 === undefined || v.soloV90 === null) return true;
  const state = normalizeSoloV90Campaign(v.soloV90);
  return prerequisites(v) && !!state && state.ownerCreatedAt === v.createdAt && !(state.status === 'active' && journey(v));
}
export const canStartSoloV90 = (v: unknown) => record(v) && prerequisites(v) && soloV90MatchesSave(v) && !journey(v);
export function startSoloV90Campaign(save: SoloV90Save, now = new Date().toISOString()): SoloV90Save | null {
  if (!canStartSoloV90(save) || !iso(now)) return null;
  return save.soloV90 ? save : { ...save, soloV90: { version: 1, ownerCreatedAt: save.createdAt, sourceSha256: SOLO_V90_SOURCE_SHA, status: 'active', checkpoint: createSoloV90State(), receipts: [], startedAt: now, completedAt: null } };
}
/** Exact replay of actual physical commands, not inferred from endpoints. A
 * forged kill, teleport, heal, role contribution or phase cannot be persisted. */
function advance(save: SoloV90Save, raw: SoloV90State, incoming: readonly SoloV90Receipt[], now: string): SoloV90Save | null {
  const before = normalizeSoloV90Campaign(save.soloV90), next = normalizeSoloV90State(raw);
  if (!before || !next || !canStartSoloV90(save) || !iso(now) || Date.parse(now) < Date.parse(before.startedAt) || !Array.isArray(incoming)) return null;
  // Storage may have committed but readback remained uncertain. The owner
  // can later reconcile that same checkpoint before the UI retries its old
  // pending window. Recognize its exact durable result without replaying or
  // crediting time twice. This never accepts a different position or proof.
  if (same({ ...next, replay: [] }, before.checkpoint) &&
      incoming.every(r => before.receipts.some(p => same(p, r))) &&
      new Set(incoming.map(r => r.id)).size === incoming.length) return save;
  let replay = before.checkpoint;
  const produced: SoloV90Receipt[] = [];
  for (const code of next.replay) {
    const output = stepSoloV90(replay, unpackSoloV90Input(code), { assetsReady: true, pageVisible: true, paused: false });
    replay = output.state; produced.push(...output.receipts);
  }
  if (!same(replay, next) || produced.length > 1 || incoming.some(r => !produced.some(p => same(p, r)) && !before.receipts.some(p => same(p, r))) ||
      produced.some(p => !incoming.some(r => same(p, r))) || new Set(incoming.map(r => r.id)).size !== incoming.length) return null;
  const checkpoint = { ...next, replay: [] }, completed = checkpoint.phase === 'complete';
  const soloV90: SoloV90Campaign = { ...before, checkpoint, receipts: soloV90Receipts(checkpoint), status: completed ? 'completed' : 'active', completedAt: completed ? before.completedAt ?? now : null };
  if (!normalizeSoloV90Campaign(soloV90)) return null;
  // Local training only: no chronicle evidence, rite, career rank, XP, weapon,
  // ship, ownership agreement or global Quatza-Rij success is ever produced.
  return { ...save, soloV90, profile: { ...save.profile, playTimeSeconds: save.profile.playTimeSeconds + Math.max(0, Math.floor(next.tick / 60) - Math.floor(before.checkpoint.tick / 60)) } };
}
export const withSoloV90Checkpoint = (save: SoloV90Save, state: SoloV90State, now = new Date().toISOString()) => advance(save, state, [], now);
export const withSoloV90Progress = (save: SoloV90Save, receipts: readonly SoloV90Receipt[], state: SoloV90State, now = new Date().toISOString()) => advance(save, state, receipts, now);
export const soloV90NeedsScene = (progress: SoloV90Campaign | null | undefined) => progress?.status === 'active';
