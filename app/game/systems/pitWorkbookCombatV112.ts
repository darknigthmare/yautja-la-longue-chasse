import {getPitWorkbookMoveV105} from './pitWorkbookMovesV105';
import {isPitWorkbookRecipeV109, usesPitWorkbookMechanicsV109, usesPitWorkbookDevicesV109,
  getPitWorkbookCombatMoveV109, isPitWorkbookThrowFighterV109,
  type PitWorkbookRecipeV109, type PitWorkbookCombatMoveKeyV109} from './pitWorkbookCombatV109';

/** Opt-in V17 keeps every historical input archive on its exact old recipe. */
export const PIT_WORKBOOK_COMBAT_RECIPE_V112 = 'workbook-v112' as const;
export const PIT_WORKBOOK_COMBAT_STATE_VERSION_V112 = 17 as const;
export type PitWorkbookRecipeV112 = PitWorkbookRecipeV109 | typeof PIT_WORKBOOK_COMBAT_RECIPE_V112;
export type PitWorkbookCombatMoveKeyV112 = PitWorkbookCombatMoveKeyV109 | 'TH_B';
export const isPitWorkbookRecipeV112 = (value: unknown): value is PitWorkbookRecipeV112 => value === PIT_WORKBOOK_COMBAT_RECIPE_V112 || isPitWorkbookRecipeV109(value);
export const usesPitWorkbookMechanicsV112 = (value: unknown) => value === PIT_WORKBOOK_COMBAT_RECIPE_V112 || usesPitWorkbookMechanicsV109(value);
export const usesPitWorkbookDevicesV112 = (value: unknown) => value === PIT_WORKBOOK_COMBAT_RECIPE_V112 || usesPitWorkbookDevicesV109(value);
export const usesPitWorkbookForwardThrowV112 = (value: unknown) => value === 'workbook-v109' || value === PIT_WORKBOOK_COMBAT_RECIPE_V112;
export function getPitWorkbookCombatMoveV112(fighterId: string, key: unknown) {
  return key === 'TH_B' && isPitWorkbookThrowFighterV109(fighterId) ? getPitWorkbookMoveV105(fighterId, 'TH_B') : getPitWorkbookCombatMoveV109(fighterId, key);
}

/** 10/3/32,110/0 come from the workbook. Flight/arc/clearance are explicit
 * game adaptations, not inferred from a drawing or presented as source cells. */
export const PIT_WORKBOOK_BACKWARD_THROW_V112 = Object.freeze({startup: 10, active: 3, recovery: 32,
  damage: 110, cost: 0, range: 58, techTicks: 8, flightTicks: 18, distance: 140,
  height: 96, knockdownTicks: 42});
export const PIT_WORKBOOK_BACKWARD_THROW_LANDING_AGE_V112 = 25;
for (const hero of ['feral-hunter', 'scar']) {
  const move = getPitWorkbookCombatMoveV112(hero, 'TH_B');
  if (!move || move.startup !== 10 || move.active !== 3 || move.recovery !== 32 || move.damage !== 110 || move.costPercent !== 0)
    throw new Error('V112 backward throw disagrees with its workbook source.');
}
export interface PitWorkbookBackwardThrowStateV112 {
  attackerSlot: 0 | 1; capturedFrame: number; actionFrame: number; age: number;
  direction: -1 | 1; attackerX: number; defenderX: number; destinationX: number;
  defenderFacing: -1 | 1; techEligible: boolean;
}
export function getPitWorkbookBackwardThrowPositionV112(pending: PitWorkbookBackwardThrowStateV112) {
  const spec = PIT_WORKBOOK_BACKWARD_THROW_V112;
  const progress = Math.max(0, Math.min(1, (pending.age - spec.techTicks + 1) / spec.flightTicks));
  return {x: pending.defenderX + (pending.destinationX - pending.defenderX) * progress,
    y: 4 * spec.height * progress * (1 - progress)};
}
export function getPitWorkbookBackwardThrowActionFrameV112(age: number, capturedActionFrame = 10): number {
  return capturedActionFrame + Math.max(0, age - PIT_WORKBOOK_BACKWARD_THROW_V112.techTicks + 1);
}
export function getPitWorkbookBackwardThrowPhaseV112(age: number): 'capture' | 'flight' | 'landing' {
  return age < 8 ? 'capture' : age < PIT_WORKBOOK_BACKWARD_THROW_LANDING_AGE_V112 ? 'flight' : 'landing';
}
export function getPitWorkbookBackwardThrowVictimFrameV112(age: number, knockedOut = false): number {
  return age < 4 ? 0 : age < 8 ? 1 : age < 11 ? 2 : age < 25 ? 3 : knockedOut || age < 49 ? 4 : 5;
}
