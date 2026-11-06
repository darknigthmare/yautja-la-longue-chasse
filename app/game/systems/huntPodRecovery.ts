import { TRIO_INSERTION_OFFSETS, type PlanetInsertionPlan } from './planetInsertion';
import type { WorldBlueprint, WorldRect } from './worldBlueprints';

/** Game-world units, not a claim about a film prop's dimensions or yield. */
export const HUNT_POD_RECOVERY = Object.freeze({
  safeRadius: 360,
  blastRadius: 240,
  radioRange: 2_400,
  countdownSeconds: 3,
  noiseRadius: 2_200,
  investigationSeconds: 18,
  effectSeconds: 3.6,
});

export interface HuntPodAnchor { id: 'hunter' | 'karhek' | 'saketh'; x: number; y: number }
export interface HuntPodRecovery {
  version: 1;
  phase: 'ready' | 'countdown' | 'destroyed';
  remainingSeconds: number;
  destroyedAt: number | null;
  /** Only real enemies that heard the destruction; never a player-following target. */
  alertedIds: string[];
}

export interface HuntPodSafetyInput {
  player: WorldRect & { health: number };
  companions: readonly (WorldRect & { id: string; status: string })[];
  operational: boolean;
}

export type HuntPodSafetyReason = 'ready' | 'unavailable' | 'destroyed' | 'unsafe-player' | 'unsafe-companion' | 'out-of-range';
export interface HuntPodSafety {
  canArm: boolean;
  reason: HuntPodSafetyReason;
  nearestDistance: number;
  radioDistance: number;
  blockedMemberId: string | null;
}

const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);
const finiteBody = (body: WorldRect) => [body.x, body.y, body.width, body.height].every(finite) && body.width > 0 && body.height > 0;

/** Same final ground anchors as the arrival montage, including independently landed triad pods. */
export function huntPodAnchors(plan: PlanetInsertionPlan, world: Pick<WorldBlueprint, 'spawn' | 'floorY'>): HuntPodAnchor[] {
  if (plan.method !== 'pod') return [];
  const origin = { x: Math.max(22, world.spawn.x - 96), y: world.floorY };
  return [{ id: 'hunter', ...origin }, ...(plan.team === 'triad'
    ? (['karhek', 'saketh'] as const).map(id => ({ id, x: origin.x + TRIO_INSERTION_OFFSETS[id], y: origin.y })) : [])];
}

export function createHuntPodRecovery(plan: PlanetInsertionPlan): HuntPodRecovery | undefined {
  return plan.method === 'pod'
    ? { version: 1, phase: 'ready', remainingSeconds: 0, destroyedAt: null, alertedIds: [] } : undefined;
}

export function cloneHuntPodRecovery(state: HuntPodRecovery): HuntPodRecovery {
  return { ...state, alertedIds: [...state.alertedIds] };
}

/** Missing data stays missing: loading an older hunt must not recreate an unrecorded pod. */
export function restoreHuntPodRecovery(raw: unknown, plan: PlanetInsertionPlan): HuntPodRecovery | null | undefined {
  if (raw === undefined) return undefined;
  if (plan.method !== 'pod' || !record(raw) || raw.version !== 1 ||
      !['ready', 'countdown', 'destroyed'].includes(raw.phase as string) ||
      !finite(raw.remainingSeconds) || raw.remainingSeconds < 0 || raw.remainingSeconds > HUNT_POD_RECOVERY.countdownSeconds ||
      !Array.isArray(raw.alertedIds) || raw.alertedIds.length > 512 || new Set(raw.alertedIds).size !== raw.alertedIds.length ||
      !raw.alertedIds.every(id => typeof id === 'string' && id.length > 0 && id.length <= 250)) return null;
  if (raw.phase === 'countdown' ? raw.remainingSeconds <= 0 : raw.remainingSeconds !== 0) return null;
  if (raw.phase === 'destroyed' ? !finite(raw.destroyedAt) || raw.destroyedAt < 0 || raw.destroyedAt > 1e9
    : raw.destroyedAt !== null || raw.alertedIds.length > 0) return null;
  return { version: 1, phase: raw.phase as HuntPodRecovery['phase'], remainingSeconds: raw.remainingSeconds,
    destroyedAt: raw.destroyedAt as number | null, alertedIds: [...raw.alertedIds] as string[] };
}

/** Use the nearest part of the actor's body, so a safe center cannot hide a foot in the blast zone. */
export function huntPodBodyDistance(anchor: HuntPodAnchor, body: WorldRect): number {
  return Math.hypot(anchor.x - Math.max(body.x, Math.min(anchor.x, body.x + body.width)),
    anchor.y - Math.max(body.y, Math.min(anchor.y, body.y + body.height)));
}

export function huntPodSafety(state: HuntPodRecovery | undefined, anchors: readonly HuntPodAnchor[], input: HuntPodSafetyInput): HuntPodSafety {
  const unavailable: HuntPodSafety = { canArm: false, reason: 'unavailable', nearestDistance: 0, radioDistance: 0, blockedMemberId: null };
  if (!state || anchors.length === 0 || !finiteBody(input.player) || anchors.some(pod => !finite(pod.x) || !finite(pod.y))) return unavailable;
  const nearestDistance = Math.min(...anchors.map(pod => huntPodBodyDistance(pod, input.player)));
  const radioDistance = Math.max(...anchors.map(pod => Math.hypot(input.player.x + input.player.width / 2 - pod.x,
    input.player.y + input.player.height / 2 - pod.y)));
  const status = { ...unavailable, nearestDistance, radioDistance };
  if (state.phase === 'destroyed') return { ...status, reason: 'destroyed' };
  if (!input.operational || !finite(input.player.health) || input.player.health <= 0) return status;
  if (nearestDistance < HUNT_POD_RECOVERY.safeRadius) return { ...status, reason: 'unsafe-player' };
  const companion = input.companions.find(member => member.status !== 'extracted' &&
    (!finiteBody(member) || anchors.some(pod => huntPodBodyDistance(pod, member) < HUNT_POD_RECOVERY.safeRadius)));
  if (companion) return { ...status, reason: 'unsafe-companion', blockedMemberId: companion.id };
  if (radioDistance > HUNT_POD_RECOVERY.radioRange) return { ...status, reason: 'out-of-range' };
  return { ...status, canArm: true, reason: 'ready' };
}

export type HuntPodCommandResult = { event: 'armed' | 'cancelled' | 'blocked'; reason: HuntPodSafetyReason };

/** One press toggles the countdown. Keyboard repeat is filtered by the owning input hub. */
export function commandHuntPodRecovery(state: HuntPodRecovery | undefined, anchors: readonly HuntPodAnchor[], input: HuntPodSafetyInput): HuntPodCommandResult {
  if (state?.phase === 'countdown') {
    state.phase = 'ready'; state.remainingSeconds = 0;
    return { event: 'cancelled', reason: 'ready' };
  }
  const safety = huntPodSafety(state, anchors, input);
  if (!state || !safety.canArm) return { event: 'blocked', reason: safety.reason };
  state.phase = 'countdown'; state.remainingSeconds = HUNT_POD_RECOVERY.countdownSeconds;
  return { event: 'armed', reason: 'ready' };
}

/** Fixed simulation time only. Every active tick rechecks all pods and every ally before expiry. */
export function stepHuntPodRecovery(state: HuntPodRecovery | undefined, anchors: readonly HuntPodAnchor[], input: HuntPodSafetyInput,
  delta: number, elapsed: number): { event: 'none' | 'cancelled' | 'detonated'; reason: HuntPodSafetyReason } {
  if (!state || state.phase !== 'countdown') return { event: 'none', reason: 'ready' };
  const safety = huntPodSafety(state, anchors, input);
  if (!safety.canArm) {
    state.phase = 'ready'; state.remainingSeconds = 0;
    return { event: 'cancelled', reason: safety.reason };
  }
  if (!finite(delta) || delta <= 0 || !finite(elapsed) || elapsed < 0) return { event: 'none', reason: 'ready' };
  state.remainingSeconds = Math.max(0, state.remainingSeconds - Math.min(delta, .1));
  if (state.remainingSeconds > 1e-8) return { event: 'none', reason: 'ready' };
  state.phase = 'destroyed'; state.remainingSeconds = 0; state.destroyedAt = elapsed;
  return { event: 'detonated', reason: 'ready' };
}

export function huntPodRecoveryPersistenceKey(state: HuntPodRecovery | undefined): string {
  // The countdown itself is included by normal saves; only transitions demand an immediate write.
  return state ? `${state.phase}:${state.destroyedAt ?? ''}` : '';
}

export function huntPodSafetyText(reason: HuntPodSafetyReason, blockedMemberId: string | null = null): string {
  switch (reason) {
    case 'ready': return 'Liaison établie · chasseurs à distance sûre.';
    case 'unsafe-player': return 'Sécurité active · éloigne-toi de toutes les capsules.';
    case 'unsafe-companion': return `${blockedMemberId === 'karhek' ? 'Ka’rhek' : blockedMemberId === 'saketh' ? 'Sa’keth' : 'Un allié'} est encore près d’une capsule. Éloigne toute la triade.`;
    case 'out-of-range': return 'Hors portée de la télécommande · rapproche-toi du site d’insertion.';
    case 'destroyed': return 'Capsules détruites · aucune technologie récupérable.';
    default: return 'Télécommande indisponible pendant cette action.';
  }
}
