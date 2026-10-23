import {getPitWorkbookMoveV105, type PitWorkbookMoveV105} from './pitWorkbookMovesV105';
import {isPitWorkbookRecipe, isPitWorkbookCombatMoveV105, type PitWorkbookRecipe, type PitWorkbookCombatMoveKeyV105, type PitWorkbookActionInputV105} from './pitWorkbookCombatV105';

export const PIT_WORKBOOK_COMBAT_RECIPE_V106 = 'workbook-v106' as const;
export const PIT_WORKBOOK_COMBAT_STATE_VERSION_V106 = 14 as const;
export type PitWorkbookRecipeV106 = PitWorkbookRecipe | typeof PIT_WORKBOOK_COMBAT_RECIPE_V106;
export type PitWorkbookCombatMoveKeyV106 = PitWorkbookCombatMoveKeyV105 | 'S2' | 'SUPER';
export type PitWorkbookActionInputV106 = PitWorkbookActionInputV105 | 'projectile' | 'shield' | 'super';
export function isPitWorkbookRecipeV106(value: unknown): value is PitWorkbookRecipeV106 {
  return value === PIT_WORKBOOK_COMBAT_RECIPE_V106 || isPitWorkbookRecipe(value);
}
export function isPitWorkbookCombatMoveV106(fighterId: string, key: unknown): key is PitWorkbookCombatMoveKeyV106 {
  return (fighterId === 'feral-hunter' || fighterId === 'scar') && key === 'SUPER' || isPitWorkbookCombatMoveV105(fighterId, key) || fighterId === 'feral-hunter' && (key === 'S1' || key === 'S2') || fighterId === 'scar' && key === 'S3';
}
export function getPitWorkbookCombatMoveV106(fighterId: string, key: unknown): PitWorkbookMoveV105 | undefined {
  return isPitWorkbookCombatMoveV106(fighterId, key) ? getPitWorkbookMoveV105(fighterId, key) : undefined;
}
export function isPitWorkbookProjectileV106(fighterId: string, key: unknown): key is 'S1' | 'S3' {
  return fighterId === 'feral-hunter' && key === 'S1' || fighterId === 'scar' && key === 'S3';
}
export function isPitWorkbookActionInputV106(value: unknown): value is PitWorkbookActionInputV106 {
  return value === 'equipment' || value === 'contact' || value === 'counter' || value === 'projectile' || value === 'shield' || value === 'super';
}
