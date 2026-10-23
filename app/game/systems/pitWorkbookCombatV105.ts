import {getPitWorkbookMoveV105, type PitWorkbookMoveV105} from './pitWorkbookMovesV105';
import {PIT_WORKBOOK_NORMALS_RECIPE_V104, type PitWorkbookNormalsRecipeV104} from './pitWorkbookNormalsV104';

/** Explicit recipe: historical V11/V12 never inherit these actions. */
export const PIT_WORKBOOK_COMBAT_RECIPE_V105 = 'workbook-v105' as const;
export const PIT_WORKBOOK_COMBAT_STATE_VERSION_V105 = 13;
export type PitWorkbookRecipe = PitWorkbookNormalsRecipeV104 | typeof PIT_WORKBOOK_COMBAT_RECIPE_V105;
export type PitWorkbookCombatMoveKeyV105 = '6M' | 'EQUIP' | 'S1' | 'S3' | 'S4';
export type PitWorkbookActionInputV105 = 'equipment' | 'contact' | 'counter';

export function isPitWorkbookRecipe(value: unknown): value is PitWorkbookRecipe {
  return value === PIT_WORKBOOK_NORMALS_RECIPE_V104 || value === PIT_WORKBOOK_COMBAT_RECIPE_V105;
}
export function isPitWorkbookCombatMoveV105(fighterId: string, key: unknown): key is PitWorkbookCombatMoveKeyV105 {
  return (fighterId === 'feral-hunter' || fighterId === 'scar') &&
    (key === '6M' || key === 'EQUIP' || key === (fighterId === 'scar' ? 'S1' : 'S3') || (fighterId === 'scar' && key === 'S4'));
}
export function getPitWorkbookCombatMoveV105(fighterId: string, key: unknown): PitWorkbookMoveV105 | undefined {
  return isPitWorkbookCombatMoveV105(fighterId, key) ? getPitWorkbookMoveV105(fighterId, key) : undefined;
}
