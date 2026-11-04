import { inspectWolfCastleCombat, wolfCastleCombatPending, type WolfCastleCombatState } from './wolfCastleCombat';
import type { WolfCastleVisit } from './wolfCastle';

/** Authored campaign mandate: these objectives do not assert any additional canonical lore. */
export const WOLF_CASTLE_DUNGEON_VERSION = 1 as const;
export const WOLF_CASTLE_DUNGEON_ID = 'wolf-castle-first-mandate' as const;
export const WOLF_CASTLE_DUNGEON_REWARD = 2 as const;
export type WolfCastleDungeonStatus = 'accepted' | 'ready' | 'active' | 'failed' | 'victory' | 'completed' | 'abandoned';
export interface WolfCastleDungeonState {
  version: 1;
  questId: typeof WOLF_CASTLE_DUNGEON_ID;
  status: WolfCastleDungeonStatus;
  objectives: { archives: boolean; gallery: boolean; council: boolean };
  attempts: number;
  combat: WolfCastleCombatState | null;
  reward: { claimed: boolean; receipt: string | null };
}
export interface WolfCastleDungeonInspection {
  status: 'absent' | 'valid' | 'future-version' | 'invalid-save';
  state: WolfCastleDungeonState | null;
  reason: string | null;
}
const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value));
const keys = (value: Record<string, unknown>, expected: string[]) => Object.keys(value).length === expected.length && expected.every(key => Object.hasOwn(value, key));

export function wolfCastleDungeonReceipt(ownerCreatedAt: string): string {
  return `${WOLF_CASTLE_DUNGEON_ID}:${ownerCreatedAt}`;
}
export function wolfCastleDungeonObjectivesComplete(state: Pick<WolfCastleDungeonState, 'objectives'>): boolean {
  return state.objectives.archives && state.objectives.gallery && state.objectives.council;
}
export function createWolfCastleDungeon(): WolfCastleDungeonState {
  return { version: WOLF_CASTLE_DUNGEON_VERSION, questId: WOLF_CASTLE_DUNGEON_ID, status: 'accepted',
    objectives: { archives: false, gallery: false, council: false }, attempts: 0, combat: null,
    reward: { claimed: false, receipt: null } };
}

/** The visit owns this DTO. Receipt and terminal combat must agree before any archive can be imported. */
export function inspectWolfCastleDungeon(raw: unknown, ownerCreatedAt: string): WolfCastleDungeonInspection {
  const invalid = (reason: string): WolfCastleDungeonInspection => ({ status: 'invalid-save', state: null, reason });
  if (raw === null || raw === undefined) return { status: 'absent', state: null, reason: null };
  if (!record(raw)) return invalid('dungeon-record');
  if (typeof raw.version === 'number' && Number.isSafeInteger(raw.version) && raw.version > WOLF_CASTLE_DUNGEON_VERSION) return { status: 'future-version', state: null, reason: 'dungeon-version' };
  if (raw.version !== WOLF_CASTLE_DUNGEON_VERSION || !keys(raw, ['version', 'questId', 'status', 'objectives', 'attempts', 'combat', 'reward']) ||
    raw.questId !== WOLF_CASTLE_DUNGEON_ID || !['accepted', 'ready', 'active', 'failed', 'victory', 'completed', 'abandoned'].includes(raw.status as string)) return invalid('dungeon-fields');
  if (!record(raw.objectives) || !keys(raw.objectives, ['archives', 'gallery', 'council']) ||
    !Object.values(raw.objectives).every(value => typeof value === 'boolean')) return invalid('dungeon-objectives');
  if (!Number.isSafeInteger(raw.attempts) || (raw.attempts as number) < 0 || (raw.attempts as number) > 9999) return invalid('dungeon-attempts');
  if (!record(raw.reward) || !keys(raw.reward, ['claimed', 'receipt']) || typeof raw.reward.claimed !== 'boolean' ||
    raw.reward.claimed !== (raw.status === 'completed') ||
    raw.reward.receipt !== (raw.reward.claimed ? wolfCastleDungeonReceipt(ownerCreatedAt) : null)) return invalid('dungeon-receipt');
  const inspected = inspectWolfCastleCombat(raw.combat);
  if (inspected.status === 'future-version') return { status: 'future-version', state: null, reason: inspected.reason };
  if (inspected.status === 'invalid-save') return invalid(inspected.reason ?? 'dungeon-combat');
  const combat = inspected.state;
  if ((combat === null) !== (raw.attempts === 0) || (combat && (combat.scenario !== 'dungeon' || combat.attempt !== raw.attempts))) return invalid('dungeon-combat-owner');
  const complete = Object.values(raw.objectives).every(value => value === true);
  if ((raw.status === 'accepted' && (complete || combat !== null)) ||
    (raw.status === 'ready' && (!complete || (combat && !['defeat', 'abandoned'].includes(combat.status)))) ||
    (raw.status === 'active' && (!combat || !wolfCastleCombatPending(combat))) ||
    (raw.status === 'failed' && combat?.status !== 'defeat') ||
    (['victory', 'completed'].includes(raw.status as string) && combat?.status !== 'victory') ||
    (raw.status === 'abandoned' && combat && !['defeat', 'abandoned'].includes(combat.status)) ||
    (combat && !complete)) return invalid('dungeon-progress');
  if (combat && combat.dossier.victories !== (['victory', 'completed'].includes(raw.status as string) ? 1 : 0)) return invalid('dungeon-result');
  return { status: 'valid', state: { version: WOLF_CASTLE_DUNGEON_VERSION, questId: WOLF_CASTLE_DUNGEON_ID,
    status: raw.status as WolfCastleDungeonStatus,
    objectives: { archives: raw.objectives.archives as boolean, gallery: raw.objectives.gallery as boolean, council: raw.objectives.council as boolean },
    attempts: raw.attempts as number, combat,
    reward: { claimed: raw.reward.claimed, receipt: raw.reward.receipt as string | null } }, reason: null };
}

/** Training owns its original dossier even while the mandate has an independent opponent. */
export function wolfCastleActiveCombat(visit: WolfCastleVisit): WolfCastleCombatState | null {
  if (wolfCastleCombatPending(visit.combat)) return visit.combat;
  if (visit.dungeon && ['active', 'failed', 'victory'].includes(visit.dungeon.status)) return visit.dungeon.combat;
  return visit.combat;
}

export function wolfCastleDungeonObjective(visit: WolfCastleVisit): string | null {
  const dungeon = visit.dungeon;
  if (!dungeon) return null;
  if (dungeon.status === 'completed') return 'Mandat remis. Deux marques de clan ont été accordées une seule fois. Rejoins la baie ou poursuis ta visite.';
  if (dungeon.status === 'abandoned') return 'Mandat abandonné. Reviens à l’audience pour le reprendre ; tes repères explorés sont conservés.';
  if (dungeon.status === 'victory') return 'Sentinelle maîtrisée. Retourne à l’audience pour remettre le mandat et recevoir deux marques de clan.';
  if (dungeon.status === 'failed') return 'Échec face à la sentinelle. Retourne à la cour pour réessayer, ou abandonne le mandat. Les trois repères sont conservés.';
  if (dungeon.status === 'active') return dungeon.combat?.status === 'intermission'
    ? 'La sentinelle change de posture. Engage la phase suivante ou abandonne le mandat.'
    : `Mandat · Sentinelle, phase ${(dungeon.combat?.encounterIndex ?? 0) + 1} / 3. Pare l’estoc, esquive le balayage, puis contre-attaque.`;
  if (dungeon.status === 'ready') return 'Les trois repères sont réunis. Rejoins le cercle de combat de la cour pour affronter la sentinelle.';
  const remaining = [!dungeon.objectives.archives && 'terminal des archives', !dungeon.objectives.gallery && 'repère de la galerie', !dungeon.objectives.council && 'table du conseil'].filter(Boolean);
  return `Mandat accepté. Relève les repères : ${remaining.join(' · ')}.`;
}

/** A pure guard for the one transaction which writes both the receipt and the profile delta. */
export function wolfCastleDungeonRewardDelta(before: WolfCastleVisit, after: WolfCastleVisit): number {
  if (before.ownerCreatedAt !== after.ownerCreatedAt || before.dungeon?.status !== 'victory' || before.dungeon.reward.claimed ||
    after.dungeon?.status !== 'completed' || !after.dungeon.reward.claimed ||
    inspectWolfCastleDungeon(before.dungeon, before.ownerCreatedAt).status !== 'valid' ||
    inspectWolfCastleDungeon(after.dungeon, after.ownerCreatedAt).status !== 'valid') return 0;
  const expected = { ...before.dungeon, status: 'completed', reward: { claimed: true, receipt: wolfCastleDungeonReceipt(before.ownerCreatedAt) } };
  return JSON.stringify(expected) === JSON.stringify(after.dungeon) ? WOLF_CASTLE_DUNGEON_REWARD : 0;
}
