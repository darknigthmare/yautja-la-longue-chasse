import {getPitWorkbookMoveV105} from './pitWorkbookMovesV105';
import {
  getPitWorkbookCombatMoveV107,
  isPitWorkbookRecipeV107,
  usesPitWorkbookMechanicsV106 as inheritedMechanics,
  type PitWorkbookRecipeV107,
} from './pitWorkbookCombatV107';
import type {PitWorkbookCombatMoveKeyV106} from './pitWorkbookCombatV106';

/** A separate opt-in engine keeps every published V4–V15 input archive exact. */
export const PIT_WORKBOOK_COMBAT_RECIPE_V109 = 'workbook-v109' as const;
export const PIT_WORKBOOK_COMBAT_STATE_VERSION_V109 = 16 as const;
export type PitWorkbookRecipeV109 = PitWorkbookRecipeV107 | typeof PIT_WORKBOOK_COMBAT_RECIPE_V109;
export type PitWorkbookCombatMoveKeyV109 = PitWorkbookCombatMoveKeyV106 | 'TH_F';
export type PitWorkbookThrowFighterV109 = 'feral-hunter' | 'scar';

export function isPitWorkbookRecipeV109(value: unknown): value is PitWorkbookRecipeV109 {
  return value === PIT_WORKBOOK_COMBAT_RECIPE_V109 || isPitWorkbookRecipeV107(value);
}

export function usesPitWorkbookMechanicsV109(value: unknown): boolean {
  return value === PIT_WORKBOOK_COMBAT_RECIPE_V109 || inheritedMechanics(value);
}

export function usesPitWorkbookDevicesV109(value: unknown): boolean {
  return value === PIT_WORKBOOK_COMBAT_RECIPE_V109 || value === 'workbook-v107';
}

export function isPitWorkbookThrowFighterV109(value: unknown): value is PitWorkbookThrowFighterV109 {
  return value === 'feral-hunter' || value === 'scar';
}

export function getPitWorkbookCombatMoveV109(fighterId: string, key: unknown) {
  if (key === 'TH_F' && isPitWorkbookThrowFighterV109(fighterId)) return getPitWorkbookMoveV105(fighterId, key);
  return getPitWorkbookCombatMoveV107(fighterId, key);
}

/** Source values are read from the immutable extraction, then checked rather
 * than inferred from body art. Distances, the tech pause and trajectory are
 * explicit Pit adaptations; they are not additional Excel claims. */
export const PIT_WORKBOOK_FORWARD_THROW_V109 = Object.freeze({
  startup: 8, active: 3, recovery: 30, damage: 110, cost: 0,
  range: 58, techTicks: 8, flightTicks: 12, distance: 120, height: 64,
  knockdownTicks: 42,
});
for (const fighterId of ['feral-hunter', 'scar'] as const) {
  const move = getPitWorkbookCombatMoveV109(fighterId, 'TH_F');
  if (!move || move.startup !== 8 || move.active !== 3 || move.recovery !== 30 || move.damage !== 110 || move.costPercent !== 0)
    throw new Error('V109 forward throw disagrees with its workbook source.');
}

export interface PitWorkbookThrowStateV109 {
  attackerSlot: 0 | 1;
  capturedFrame: number;
  actionFrame: number;
  age: number;
  direction: -1 | 1;
  attackerX: number;
  defenderX: number;
  destinationX: number;
  defenderFacing: -1 | 1;
  /** Eligibility before capture interrupted the target's original action. */
  techEligible: boolean;
}

export const PIT_WORKBOOK_THROW_LANDING_AGE_V109 =
  PIT_WORKBOOK_FORWARD_THROW_V109.techTicks + PIT_WORKBOOK_FORWARD_THROW_V109.flightTicks - 1;

export function getPitWorkbookThrowPhaseV109(age: number): 'capture' | 'flight' | 'landing' {
  return age < PIT_WORKBOOK_FORWARD_THROW_V109.techTicks ? 'capture' :
    age < PIT_WORKBOOK_THROW_LANDING_AGE_V109 ? 'flight' : 'landing';
}

/** Deterministic world movement of the independent target; no pixel transform
 * or pose interpolation occurs here. A wall truncates horizontal travel. */
export function getPitWorkbookThrowPositionV109(throwState: PitWorkbookThrowStateV109) {
  const spec = PIT_WORKBOOK_FORWARD_THROW_V109;
  const progress = Math.max(0, Math.min(1, (throwState.age - spec.techTicks + 1) / spec.flightTicks));
  return {
    x: throwState.defenderX + (throwState.destinationX - throwState.defenderX) * progress,
    y: 4 * spec.height * progress * (1 - progress),
  };
}

export function getPitWorkbookThrowActionFrameV109(age: number, capturedActionFrame: number = PIT_WORKBOOK_FORWARD_THROW_V109.startup): number {
  return capturedActionFrame + Math.max(0, age - PIT_WORKBOOK_FORWARD_THROW_V109.techTicks + 1);
}

/** Six independent victim drawings: caught, yielding, loaded, airborne,
 * landing, rising. A knockout holds the real landing drawing. */
export function getPitWorkbookThrowVictimFrameV109(age: number, knockedOut = false): number {
  if (age < 4) return 0;
  if (age < 8) return 1;
  if (age < 10) return 2;
  if (age < PIT_WORKBOOK_THROW_LANDING_AGE_V109) return 3;
  if (knockedOut || age < PIT_WORKBOOK_THROW_LANDING_AGE_V109 + 24) return 4;
  return 5;
}
