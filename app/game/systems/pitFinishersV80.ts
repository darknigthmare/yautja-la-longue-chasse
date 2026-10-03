import catalogue from '../data/pitFinishersV80.json';
import { PIT_ARENAS, PIT_FIGHTERS, type PitCombatState, type PitFighterState } from './pitCombat';
import { PIT_JUNGLE_FINAL_DUEL_VARIANT } from './pitEquipmentV57';

export type PitFinisherModeV80 = 'off' | 'stylized' | 'cinematic';
export type PitFinisherFamilyV80 = 'plasma' | 'blades' | 'disc' | 'staff' | 'bolt' | 'hound' | 'drone' | 'heavy' | 'capture' | 'sweep' | 'rush' | 'counter' | 'ritual';
export type PitFinisherChoiceV80 = 0 | 1 | 2 | 3;
export const PIT_FINISHER_CHOICES_V80 = ['Signature', 'Fauchage et retrait', 'Percée et projection', 'Contre et salut'] as const;
export interface PitFinisherProfileV80 {
  fighterId: string; label: string; family: PitFinisherFamilyV80;
  equipment: string[]; evidence: 'attested-equipment' | 'identity-derived' | 'original-contact';
  sourceUrls: string[]; sourceFiles: string[]; basis: string;
  gesture: number; approachMs: number; signatureMs: number; settleMs: number;
  canonical: false; nativeFinisherAnimation: false;
}
export const PIT_FINISHER_PROFILES_V80 = catalogue.profiles as PitFinisherProfileV80[];
const profiles = new Map(PIT_FINISHER_PROFILES_V80.map(profile => [profile.fighterId, profile]));
export const PIT_FINISHER_COUNTS_V80 = Object.freeze({
  total: profiles.size,
  attestedEquipment: PIT_FINISHER_PROFILES_V80.filter(p => p.evidence === 'attested-equipment').length,
  identityDerived: PIT_FINISHER_PROFILES_V80.filter(p => p.evidence === 'identity-derived').length,
  originalContact: PIT_FINISHER_PROFILES_V80.filter(p => p.evidence === 'original-contact').length,
  nativeFinisherAnimations: 0,
  playableSequences: profiles.size * 4,
});
/** Exact IDs/variant ownership: never infer weapons from a translated name or a shared combat preset. */
export function getPitFinisherProfileV80(fighterId: string, variantId?: string): PitFinisherProfileV80 | null {
  const profile = profiles.get(fighterId);
  if (!profile) return null;
  if (fighterId === 'jungle-hunter' && variantId === PIT_JUNGLE_FINAL_DUEL_VARIANT) {
    return { ...profile, family: 'blades', equipment: ['wrist-blades'], label: 'Dernière mesure · duel sans canon',
      basis: 'Duel final 1987 : canon et harnais retirés. Lames et contact conservés.' };
  }
  return profile;
}
export interface PitFinisherOptionsV80 {
  mode: PitFinisherModeV80; reducedGore: boolean; reducedMotion: boolean;
  narrative: boolean; replay: boolean; cpuWinner: boolean;
}
export type PitFinisherPhaseV80 = 'idle' | 'ready' | 'window' | 'approach' | 'signature' | 'settle' | 'complete';
/** Session presentation only. No combat/save/replay field, rewards or lore death event. */
export interface PitFinisherViewV80 {
  phase: PitFinisherPhaseV80; key: string; winnerSlot: 0 | 1 | null;
  choice: PitFinisherChoiceV80;
  elapsedMs: number; durationMs: number; profile: PitFinisherProfileV80 | null;
  options: PitFinisherOptionsV80; nonlethal: boolean;
  outcome: 'pending' | 'finished' | 'skipped' | 'disabled' | 'ineligible';
}
export const PIT_FINISHER_WINDOW_MS_V80 = 5_000;
export const PIT_FINISHER_MAX_STEP_MS_V80 = 100;
const defaultOptions: PitFinisherOptionsV80 = { mode: 'stylized', reducedGore: true, reducedMotion: false, narrative: false, replay: false, cpuWinner: false };
export function createPitFinisherViewV80(): PitFinisherViewV80 {
  return { phase: 'idle', key: '', winnerSlot: null, choice: 0, elapsedMs: 0, durationMs: 0, profile: null,
    options: defaultOptions, nonlethal: true, outcome: 'pending' };
}
function eligibleWinner(combat: PitCombatState): 0 | 1 | null {
  if (combat.phase !== 'match-over' || combat.rules.mode === 'training' || !combat.matchWinnerId ||
      combat.lastRoundResult?.reason !== 'ko' || combat.lastRoundResult.round !== combat.round ||
      combat.lastRoundResult.winnerId !== combat.matchWinnerId) return null;
  const winners = combat.fighters.filter(f => f.definitionId === combat.matchWinnerId && f.roundsWon >= 2 && f.health > 0);
  if (winners.length !== 1) return null; // Mirrored identities must have an unambiguous winning slot.
  const winner = winners[0], loser = combat.fighters[winner.slot === 0 ? 1 : 0];
  return loser.health <= 0 && loser.roundsWon < winner.roundsWon ? winner.slot : null;
}
export function observePitFinisherV80(current: PitFinisherViewV80, combat: PitCombatState | null,
  key: string, options: PitFinisherOptionsV80): PitFinisherViewV80 {
  if (!combat || combat.phase !== 'match-over') return current.phase === 'idle' ? current : createPitFinisherViewV80();
  if (current.key === key && current.phase !== 'idle') {
    // Live accessibility can only make the running scene safer. Changing a
    // preference must never restart its clock or turn a narrative neutralization lethal.
    const motion = current.options.reducedMotion || options.reducedMotion;
    const safe = current.nonlethal || options.narrative || options.reducedGore;
    return motion === current.options.reducedMotion && safe === current.nonlethal ? current
      : { ...current, options: { ...current.options, reducedMotion: motion, reducedGore: current.options.reducedGore || options.reducedGore }, nonlethal: safe };
  }
  const winnerSlot = eligibleWinner(combat);
  const profile = winnerSlot === null ? null : getPitFinisherProfileV80(combat.fighters[winnerSlot].definitionId, combat.fighters[winnerSlot].variantId);
  const disabled = options.mode === 'off' || options.replay || Boolean(combat.rules.stageJourney);
  const ineligible = winnerSlot === null || !profile;
  return { phase: disabled || ineligible ? 'complete' : 'ready', key, winnerSlot, choice: 0, elapsedMs: 0, durationMs: 0,
    profile, options: { ...options }, nonlethal: options.narrative || options.reducedGore,
    outcome: disabled ? 'disabled' : ineligible ? 'ineligible' : 'pending' };
}
function duration(current: PitFinisherViewV80, phase: 'approach' | 'signature' | 'settle'): number {
  const ms = current.profile?.[`${phase}Ms`] ?? 0;
  return Math.round(ms * (current.options.mode === 'cinematic' ? 1.3 : 1));
}
export function triggerPitFinisherV80(current: PitFinisherViewV80, slot: 0 | 1, choice: PitFinisherChoiceV80 = 0): PitFinisherViewV80 {
  if (current.phase !== 'window' || current.winnerSlot !== slot) return current;
  return { ...current, choice, phase: 'approach', elapsedMs: 0, durationMs: duration(current, 'approach') };
}
export function skipPitFinisherV80(current: PitFinisherViewV80): PitFinisherViewV80 {
  if (current.phase === 'idle' || current.phase === 'complete') return current;
  return { ...current, phase: 'complete', elapsedMs: 0, durationMs: 0, outcome: 'skipped' };
}
/** Hidden/loading/paused time is discarded; a slow tab cannot jump across phases. */
export function advancePitFinisherV80(current: PitFinisherViewV80, elapsedMs: number,
  resultCeremonyReady: boolean, frozen = false): PitFinisherViewV80 {
  if (frozen || current.phase === 'idle' || current.phase === 'complete' || !Number.isFinite(elapsedMs) || elapsedMs <= 0) return current;
  if (current.phase === 'ready') return resultCeremonyReady
    ? { ...current, phase: 'window', elapsedMs: 0, durationMs: PIT_FINISHER_WINDOW_MS_V80 } : current;
  const elapsed = Math.min(current.durationMs, current.elapsedMs + Math.min(PIT_FINISHER_MAX_STEP_MS_V80, elapsedMs));
  if (current.phase === 'window' && current.options.cpuWinner && elapsed >= 800 && current.winnerSlot !== null) {
    return triggerPitFinisherV80({ ...current, elapsedMs: elapsed }, current.winnerSlot);
  }
  if (elapsed >= current.durationMs) {
    if (current.phase === 'window') return skipPitFinisherV80(current);
    if (current.phase === 'settle') return { ...current, phase: 'complete', elapsedMs: elapsed, outcome: 'finished' };
    const phase = current.phase === 'approach' ? 'signature' : 'settle';
    return { ...current, phase, elapsedMs: 0, durationMs: duration(current, phase) };
  }
  return elapsed === current.elapsedMs ? current : { ...current, elapsedMs: elapsed };
}
export function pitFinisherBlocksResultV80(view: PitFinisherViewV80): boolean {
  return view.phase !== 'idle' && view.phase !== 'complete';
}
export function pitFinisherIsSceneV80(view: PitFinisherViewV80): boolean {
  return view.phase === 'approach' || view.phase === 'signature' || view.phase === 'settle';
}
export interface PitFinisherPadStateV80 { revision: number; ready: boolean; previous: boolean[] }
export const createPitFinisherPadStateV80 = (): PitFinisherPadStateV80 => ({ revision: -1, ready: false, previous: [] });
/** Actual adapter supplies assigned-controller revisions; held/reconnected pads
 * must become neutral before emitting a new edge. No gameplay input is produced. */
export function readPitFinisherPadV80(previous: PitFinisherPadStateV80,
  sample: { present: boolean; revision: number; buttons: boolean[]; neutral: boolean; down: boolean; horizontal: -1 | 0 | 1 },
  slot: 0 | 1, view: PitFinisherViewV80, facing: -1 | 1, enabled: boolean) {
  const reset = !sample.present || previous.revision !== sample.revision;
  const prior = reset ? createPitFinisherPadStateV80() : previous;
  const ready = sample.present && (prior.ready || sample.neutral);
  const next = { revision: sample.revision, ready, previous: sample.present ? sample.buttons : [] };
  const edge = sample.buttons.map((pressed, index) => pressed && !prior.previous[index]);
  const active = enabled && ready && !reset && view.phase !== 'idle' && view.phase !== 'ready' && view.phase !== 'complete';
  const pause = active && Boolean(edge[3]), skip = active && !pause && Boolean(edge[1]);
  const trigger = active && !pause && !skip && view.phase === 'window' && view.winnerSlot === slot && !view.options.cpuWinner && (edge[0] || edge[2]);
  const choice: PitFinisherChoiceV80 | null = !trigger ? null : sample.down ? 1 : sample.horizontal === facing ? 2 : sample.horizontal !== 0 ? 3 : 0;
  return { next, pause, skip, choice };
}
export interface PitFinisherSceneV80 {
  actors: [PitFighterState, PitFighterState]; winnerSlot: 0 | 1;
  family: PitFinisherFamilyV80; progress: number; impacts: number[]; phase: PitFinisherPhaseV80;
  nonlethal: boolean; reducedMotion: boolean; gesture: number; nativeAnimationClaimed: false;
  choice: PitFinisherChoiceV80; rotation: [number, number]; alpha: [number, number];
}
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
/** Render-only cloned actors, grounded on the unchanged arena plane; no engine mutation. */
export function samplePitFinisherSceneV80(view: PitFinisherViewV80, combat: PitCombatState): PitFinisherSceneV80 | null {
  if (!pitFinisherIsSceneV80(view) || view.winnerSlot === null || !view.profile) return null;
  const arena = PIT_ARENAS[combat.arenaId], slot = view.winnerSlot, loserSlot = slot === 0 ? 1 : 0;
  const actualWinner = combat.fighters[slot], actualLoser = combat.fighters[loserSlot], dir = actualWinner.x <= actualLoser.x ? 1 : -1;
  const p = clamp(view.elapsedMs / Math.max(1, view.durationMs), 0, 1), smooth = p * p * (3 - 2 * p);
  // Long-range families keep a firing lane. Contact families close outside both pushbox widths.
  const chosenFamily = (['', 'sweep', 'rush', 'counter'] as const)[view.choice] || view.profile.family;
  // Safe mode uses physical restraint, never an invented "nonlethal plasma" setting.
  const family = view.nonlethal && ['plasma', 'bolt', 'disc', 'blades', 'staff'].includes(chosenFamily) ? 'capture' : chosenFamily;
  const ranged = family === 'plasma' || family === 'bolt' || family === 'disc' || family === 'drone';
  const gap = ranged ? 250 : Math.max(105, (PIT_FIGHTERS[actualWinner.definitionId].bodyWidth + PIT_FIGHTERS[actualLoser.definitionId].bodyWidth) / 2 + 24);
  const center = clamp((actualWinner.x + actualLoser.x) / 2, arena.leftWall + gap + 70, arena.rightWall - gap - 70);
  const endX = center - dir * gap / 2, victimX = center + dir * gap / 2;
  let x = endX, victim = victimX, elevation = 0, victimElevation = 0, victimRotation = 0;
  const weight = .8 + view.profile.gesture * .055;
  if (view.phase === 'approach') {
    x = actualWinner.x + (endX - actualWinner.x) * smooth;
    victim = actualLoser.x + (victimX - actualLoser.x) * smooth;
  }
  if (view.phase === 'signature' && !view.options.reducedMotion) {
    const beat = Math.sin(p * Math.PI);
    if (family === 'rush') x += dir * 32 * beat * weight;
    else if (family === 'sweep') x += dir * 12 * beat * weight;
    else if (family === 'counter') x -= dir * 22 * Math.sin(p * Math.PI * 2) * weight;
    else if (family === 'ritual') x -= dir * 15 * beat * weight;
    else if (family === 'heavy') x += dir * 18 * beat * weight;
    else if (family === 'capture') x += dir * 8 * beat * weight;
    if (family === 'heavy' || family === 'rush') victim += dir * 65 * Math.max(0, p - .45) * weight;
    if (family === 'sweep') victimRotation = -dir * (view.choice === 1 ? Math.PI / 2 : .45) * clamp((p - .45) / .4, 0, 1);
    if (family === 'rush' && view.choice === 2) { victimElevation = 40 * Math.sin(clamp((p - .4) / .6, 0, 1) * Math.PI); victimRotation = -dir * .7 * beat; }
    if (family === 'counter') { victim += dir * 25 * Math.max(0, p - .6); victimRotation = -dir * (view.choice === 3 ? .7 : .3) * Math.max(0, p - .6); }
    if (family === 'sweep') elevation = 5 * beat;
  }
  if (view.phase === 'settle' && family === 'sweep' && !view.options.reducedMotion) victimRotation = -dir * (view.choice === 1 ? Math.PI / 2 : .45);
  if (view.options.reducedMotion) { x = actualWinner.x; victim = actualLoser.x; elevation = 0; victimElevation = 0; }
  const actors = combat.fighters.map((fighter, index): PitFighterState => ({ ...fighter,
    x: clamp(index === slot ? x : victim, arena.leftWall + PIT_FIGHTERS[fighter.definitionId].bodyWidth / 2,
      arena.rightWall - PIT_FIGHTERS[fighter.definitionId].bodyWidth / 2), y: index === slot ? elevation : victimElevation,
    facing: index === slot ? dir : dir === 1 ? -1 : 1, grounded: (index === slot ? elevation : victimElevation) === 0,
    velocityX: 0, velocityY: 0, crouching: index === slot && family === 'sweep' && view.phase === 'signature',
    phase: view.phase === 'signature' ? index === slot ? family === 'ritual' || family === 'drone' || family === 'hound' ? 'idle' : 'active' : 'hitstun' : 'idle',
    action: index === slot && view.phase === 'signature' && family !== 'ritual' && family !== 'drone' && family !== 'hound' ? { kind: 'attack', attack: 'heavy', frame: Math.floor(p * 30), connected: true } : null,
  })) as [PitFighterState, PitFighterState];
  const impacts = family === 'bolt' ? [.25, .48, .7] : family === 'blades' ? [.35, .68]
    : family === 'counter' ? [.62] : family === 'ritual' ? [.78] : family === 'disc' ? [.3, .75] : [.5];
  return { actors, winnerSlot: slot, family, progress: p, impacts, phase: view.phase, nonlethal: view.nonlethal,
    reducedMotion: view.options.reducedMotion, gesture: view.profile.gesture, nativeAnimationClaimed: false, choice: view.choice,
    rotation: slot === 0 ? [0, victimRotation] : [victimRotation, 0], alpha: [1, 1] };
}
