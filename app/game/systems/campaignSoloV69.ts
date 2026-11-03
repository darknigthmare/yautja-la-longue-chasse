import type { SaveGame } from '../types';
import { normalizeSoloV68Campaign, soloV68MatchesSave } from './campaignSoloV68';
import { getChronicleRank } from './clanChronicle';
import { createSoloV69State, normalizeSoloV69State, soloV69Receipts, soloV69ProofCount, soloV69GateIndex, soloV69Hazard, SOLO_V69_GATES, SOLO_V69_POSTS, SOLO_V69_PHASES, type SoloV69State, type SoloV69Receipt } from './firstHuntSoloV69';

export interface SoloV69Campaign { version: 1; status: 'active' | 'completed'; checkpoint: SoloV69State; receipts: SoloV69Receipt[]; startedAt: string; completedAt: string | null }
export type SoloV69Save = SaveGame & { soloV69?: SoloV69Campaign | null };
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const iso = (v: unknown): v is string => typeof v === 'string' && v.length <= 128 && Number.isFinite(Date.parse(v));
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
export function normalizeSoloV69Campaign(v: unknown): SoloV69Campaign | null {
  if (!record(v) || v.version !== 1 || !['active', 'completed'].includes(String(v.status)) || !iso(v.startedAt)) return null;
  const checkpoint = normalizeSoloV69State(v.checkpoint);
  if (!checkpoint || !Array.isArray(v.receipts) || !same(v.receipts, soloV69Receipts(checkpoint))) return null;
  const completed = checkpoint.phase === 'complete';
  if ((v.status === 'completed') !== completed || (completed ? !iso(v.completedAt) || Date.parse(v.completedAt) < Date.parse(v.startedAt) : v.completedAt !== null)) return null;
  return { version: 1, status: v.status as SoloV69Campaign['status'], checkpoint, receipts: soloV69Receipts(checkpoint), startedAt: v.startedAt, completedAt: v.completedAt as string | null };
}
function prerequisites(v: unknown): v is SoloV69Save {
  if (!record(v) || !soloV68MatchesSave(v) || normalizeSoloV68Campaign(v.soloV68)?.status !== 'completed') return false;
  const save = v as unknown as SoloV69Save;
  return getChronicleRank(save.prologue!.chronicle) === 'young-blood' && save.prologue!.chronicle.rites.length === 2;
}
function otherJourneyActive(v: Record<string, unknown>) {
  return record(v.homeworldRegionV68) && v.homeworldRegionV68.status !== 'at-city' || record(v.homeworldPassageV67) && v.homeworldPassageV67.status !== 'at-city' || record(v.gameReserveV66) && v.gameReserveV66.status === 'active';
}
export function soloV69MatchesSave(v: unknown): boolean {
  if (!record(v)) return false;
  if (v.soloV69 === undefined || v.soloV69 === null) return true;
  const progress = normalizeSoloV69Campaign(v.soloV69);
  return prerequisites(v) && !!progress && !(progress.status === 'active' && otherJourneyActive(v));
}
export const canStartSoloV69 = (v: unknown) => record(v) && prerequisites(v) && soloV69MatchesSave(v) && !otherJourneyActive(v);
export function startSoloV69Campaign(save: SoloV69Save, now = new Date().toISOString()): SoloV69Save | null {
  if (!canStartSoloV69(save) || !iso(now)) return null;
  return save.soloV69 ? save : { ...save, soloV69: { version: 1, status: 'active', checkpoint: createSoloV69State(), receipts: [], startedAt: now, completedAt: null } };
}
function advance(save: SoloV69Save, raw: SoloV69State, incoming: readonly SoloV69Receipt[], now: string): SoloV69Save | null {
  const before = normalizeSoloV69Campaign(save.soloV69), next = normalizeSoloV69State(raw);
  if (!before || !next || !canStartSoloV69(save) || !iso(now) || Date.parse(now) < Date.parse(before.startedAt)) return null;
  const old = before.checkpoint, receipts = soloV69Receipts(next), delta = next.tick - old.tick, oldPhase = SOLO_V69_PHASES.indexOf(old.phase), newPhase = SOLO_V69_PHASES.indexOf(next.phase);
  if (delta < 0 || next.phaseStartedAt < old.phaseStartedAt || newPhase < oldPhase || newPhase > oldPhase + 1 || before.status === 'completed' && !same(next, old) || next.walked < old.walked || next.walked - old.walked > delta * 3.5 + .1 || Math.abs(next.player.x - old.player.x) > delta * 3.5 + .1 || Math.abs(next.trainee.x - old.trainee.x) > delta * 2.9 + .1 || next.shadowPosts < old.shadowPosts || next.shadowPosts > old.shadowPosts + 1 || next.gatesCrossed < old.gatesCrossed || next.gatesCrossed > old.gatesCrossed + 1 || next.observedTicks < old.observedTicks || next.observedTurns < old.observedTurns || next.veteran.turns < old.veteran.turns || next.detections < old.detections || old.waitingSignal && !next.waitingSignal || old.scouted && !next.scouted || old.trainee.reached && !next.trainee.reached || next.escortSignals < old.escortSignals || next.escortSignals - old.escortSignals > Math.max(1, delta) || before.receipts.some((r, i) => !same(r, receipts[i]))) return null;
  const fresh = receipts.slice(before.receipts.length);
  if (fresh.length > 1 || fresh.some(r => !incoming.some(i => same(i, r))) || incoming.some(i => !receipts.some(r => same(i, r))) || new Set(incoming.map(i => i.id)).size !== incoming.length) return null;
  const near = (x: number, tolerance = 40) => Math.abs(next.player.x - x) < tolerance && next.player.y === 430;
  if (next.shadowPosts > old.shadowPosts && (old.phase !== 'stealth' || !near(SOLO_V69_POSTS[old.shadowPosts]) || next.alarm !== 0)) return null;
  if (!old.waitingSignal && next.waitingSignal && (old.phase !== 'escort' || next.trainee.following || next.trainee.x < 4400 || next.trainee.x > 4520)) return null;
  if (!old.scouted && next.scouted && (old.phase !== 'escort' || !near(5050) || !next.waitingSignal || next.trainee.following || soloV69Hazard(next.tick) !== 'calm')) return null;
  const gateIndex = soloV69GateIndex(old.phase);
  for (let i = 0; i < 3; i++) if (next.gateTimers[i] > Math.max(0, old.gateTimers[i] - delta) && (i !== gateIndex || !near(SOLO_V69_GATES[i].leverX) && !near(SOLO_V69_GATES[i].x + 45) || next.gateTimers[i] > SOLO_V69_GATES[i].openTicks)) return null;
  if (fresh.length) {
    const id = fresh[0].id;
    if ((['briefed', 'returned', 'mentor-report', 'preparation-certified'].includes(id) && !near(160)) || id === 'veteran-observed' && !near(820) || id === 'signals-read' && (!near(1070) || next.alarm !== 0) || id === 'shadow-route' && !near(2070) || id === 'evacuation-briefed' && !near(4300) || id === 'trainee-extracted' && (!near(5460) || next.trainee.x < 5300 || !next.trainee.reached) || id === 'returned' && next.walked < 10500) return null;
    if (gateIndex >= 0 && id === receipts[receipts.length - 1].id && (next.player.x < SOLO_V69_GATES[gateIndex].exitX || next.player.y !== 430 || next.gatesCrossed !== old.gatesCrossed + 1)) return null;
  }
  const completed = next.phase === 'complete', soloV69: SoloV69Campaign = { ...before, checkpoint: next, receipts, status: completed ? 'completed' : 'active', completedAt: completed ? before.completedAt ?? now : null };
  if (!normalizeSoloV69Campaign(soloV69) || soloV69ProofCount(next) !== receipts.length) return null;
  // Certification is kept exclusively here. No chronicle rite, hunt kill,
  // equipment, permanent weapon, ship, honor or career rank is inferred.
  return { ...save, soloV69, profile: { ...save.profile, playTimeSeconds: save.profile.playTimeSeconds + Math.max(0, Math.floor(next.tick / 60) - Math.floor(old.tick / 60)) } };
}
export const withSoloV69Checkpoint = (save: SoloV69Save, state: SoloV69State, now = new Date().toISOString()) => advance(save, state, [], now);
export const withSoloV69Progress = (save: SoloV69Save, receipts: readonly SoloV69Receipt[], state: SoloV69State, now = new Date().toISOString()) => advance(save, state, receipts, now);
export const soloV69NeedsScene = (progress: SoloV69Campaign | null | undefined) => progress?.status === 'active';
