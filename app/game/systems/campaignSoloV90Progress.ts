import {
  normalizeSoloV90State, soloV90Receipts, soloV90CompanionPost, soloV90ObservationPostReady,
  SOLO_V90_SOURCE_SHA, type SoloV90Receipt, type SoloV90State,
} from './firstHuntSoloV90';

export interface SoloV90Campaign { version: 1; ownerCreatedAt: string; sourceSha256: string; status: 'active' | 'completed'; checkpoint: SoloV90State; receipts: SoloV90Receipt[]; startedAt: string; completedAt: string | null }
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

export function soloV90AtTempleHandoffM017(progress: SoloV90Campaign | null | undefined): boolean {
  const state = progress?.checkpoint;
  return progress?.status === 'active' && !!state && soloV90ObservationPostReady(state) &&
    state.tick === state.milestones['roles-positioned'] && state.observedCycles === 0 &&
    state.drone.mode === 'watch' && state.drone.age === 0 && state.drone.cycles === 0 &&
    state.player.vy === 0 && state.roleMode === 'posts' &&
    state.partnerObservations?.saar !== undefined && state.partnerObservations.vek !== undefined &&
    state.companions.every((companion, index) => Math.abs(companion.x - soloV90CompanionPost(state, index)) < 5);
}
