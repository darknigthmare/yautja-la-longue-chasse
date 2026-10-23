import {getPitWorkbookMoveV105} from './pitWorkbookMovesV105';
import {isPitWorkbookRecipeV106, isPitWorkbookCombatMoveV106, isPitWorkbookActionInputV106, type PitWorkbookRecipeV106, type PitWorkbookActionInputV106, type PitWorkbookCombatMoveKeyV106} from './pitWorkbookCombatV106';

export const PIT_WORKBOOK_COMBAT_RECIPE_V107 = 'workbook-v107' as const;
export const PIT_WORKBOOK_COMBAT_STATE_VERSION_V107 = 15 as const;
export type PitWorkbookRecipeV107 = PitWorkbookRecipeV106 | typeof PIT_WORKBOOK_COMBAT_RECIPE_V107;
export type PitWorkbookActionInputV107 = PitWorkbookActionInputV106 | 'mine' | 'shuriken';
export function isPitWorkbookRecipeV107(value: unknown): value is PitWorkbookRecipeV107 {
  return value === PIT_WORKBOOK_COMBAT_RECIPE_V107 || isPitWorkbookRecipeV106(value);
}
/** V107 inherits the admitted V106 mechanics without changing its archive admission. */
export function usesPitWorkbookMechanicsV106(value: unknown): boolean {
  return value === 'workbook-v106' || value === PIT_WORKBOOK_COMBAT_RECIPE_V107;
}
export function isPitWorkbookDeviceMoveV107(fighterId: string, key: unknown): key is 'S2' | 'S4' {
  return fighterId === 'feral-hunter' && key === 'S4' || fighterId === 'scar' && key === 'S2';
}
export function isPitWorkbookCombatMoveV107(fighterId: string, key: unknown): key is PitWorkbookCombatMoveKeyV106 {
  return isPitWorkbookCombatMoveV106(fighterId, key) || isPitWorkbookDeviceMoveV107(fighterId, key);
}
export function getPitWorkbookCombatMoveV107(fighterId: string, key: unknown) {
  return isPitWorkbookCombatMoveV107(fighterId, key) ? getPitWorkbookMoveV105(fighterId, key) : undefined;
}
export function isPitWorkbookActionInputV107(value: unknown): value is PitWorkbookActionInputV107 {
  return value === 'mine' || value === 'shuriken' || isPitWorkbookActionInputV106(value);
}

export type PitWorkbookDeviceKindV107 = 'mine' | 'shuriken';
export interface PitWorkbookDeviceInventoryV107 {
  item: PitWorkbookDeviceKindV107;
  status: 'ready' | 'held' | 'deployed' | 'spent';
  effectId: number | null;
}
export interface PitWorkbookDeviceStateV107 {
  id: number;
  ownerSlot: 0 | 1;
  kind: PitWorkbookDeviceKindV107;
  x: number;
  y: number;
  direction: -1 | 1;
  createdFrame: number;
  age: number;
  phase: 'off' | 'amber' | 'armed' | 'flight';
}
/** Source BODY clocks remain 34/90/30 and 23/4/29. Entity release/life are
 * explicit adaptations constrained by the first native detached drawing. */
export const PIT_WORKBOOK_DEVICES_V107 = {
  mine: {fighterId:'feral-hunter', key:'S4', release:20, armAge:74, lifetime:134, width:22, height:14, proximity:62, damage:105, cost:350},
  shuriken: {fighterId:'scar', key:'S2', release:27, lifetime:50, speed:14, width:26, height:26, damage:90, cost:250},
} as const;
export function getPitWorkbookDevicePhaseV107(kind: PitWorkbookDeviceKindV107, age: number): PitWorkbookDeviceStateV107['phase'] {
  return kind === 'shuriken' ? 'flight' : age >= 74 ? 'armed' : age < 44 ? 'amber' : 'off';
}
