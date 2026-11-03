import plan from '../data/pitWorkbookAnimationPlanV100.json';
import type { PitAttackKind, PitAttackDefinition } from './pitCombat';

/** Explicit opt-in recipe. Missing rules retain every published combat value. */
export const PIT_WORKBOOK_NORMALS_RECIPE_V104 = 'workbook-v104' as const;
/** Only opt-in snapshots/replays use12; published default combat remains11. */
export const PIT_WORKBOOK_NORMALS_STATE_VERSION_V104 = 12 as const;
export const PIT_WORKBOOK_NORMAL_KEYS_V104 = ['5L', '5M', '5H', '2L', '2M', '2H', 'jL', 'jM', 'jH'] as const;
export type PitWorkbookNormalKeyV104 = typeof PIT_WORKBOOK_NORMAL_KEYS_V104[number];
export type PitWorkbookNormalsRecipeV104 = typeof PIT_WORKBOOK_NORMALS_RECIPE_V104;
export interface PitWorkbookNormalV104 {
  readonly key: PitWorkbookNormalKeyV104;
  readonly fighterId: 'feral-hunter' | 'scar';
  readonly actionId: string;
  readonly cell: string;
  readonly sheet: string;
  readonly label: string;
  readonly sourceText: string;
  readonly attack: Exclude<PitAttackKind, 'technique'>;
  readonly posture: 'stand' | 'crouch' | 'air';
  readonly startup: number;
  readonly active: number;
  readonly recovery: number;
  readonly damage: number;
  readonly hitLevel: 'high' | 'mid' | 'low';
  readonly antiAir: boolean;
}
export function isPitWorkbookNormalKeyV104(value: unknown): value is PitWorkbookNormalKeyV104 {
  return PIT_WORKBOOK_NORMAL_KEYS_V104.includes(value as PitWorkbookNormalKeyV104);
}
export function ownsPitWorkbookNormalsV104(fighterId: string, variantId?: string | null): boolean {
  return (fighterId === 'feral-hunter' || fighterId === 'scar') && !variantId;
}
/** Timings, base damage and guard level come from the pinned V54 extraction.
 * Existing range, hurtboxes, power, stun, knockback and combo rules stay explicit
 * engine adaptations: this recipe does not claim to implement the whole kit. */
export const PIT_WORKBOOK_NORMALS_V104: readonly PitWorkbookNormalV104[] = plan.fighters.flatMap(fighter =>
  fighter.actions.filter(action => isPitWorkbookNormalKeyV104(action.key)).map(action => {
    const key = action.key as PitWorkbookNormalKeyV104;
    const damage = /· dégâts (\d+) · coût 0 %/.exec(action.sourceText);
    const level = /Commande [^\n]+ · (Haut|Milieu(?: \/ anti-air)?|Bas) · Base de duel/.exec(action.sourceText);
    const timing = action.phaseTicks;
    if (!damage || !level || !timing) throw new Error('Incomplete V104 normal source: ' + action.id);
    return {
      fighterId: fighter.fighterId as PitWorkbookNormalV104['fighterId'], key, actionId: action.id,
      cell: action.cell, sheet: action.sheet, label: action.label, sourceText: action.sourceText,
      attack: ({L: 'light', M: 'medium', H: 'heavy'} as const)[key[1] as 'L' | 'M' | 'H'],
      posture: key[0] === '5' ? 'stand' : key[0] === '2' ? 'crouch' : 'air',
      ...timing, damage: Number(damage[1]),
      hitLevel: level[1] === 'Haut' ? 'high' : level[1] === 'Bas' ? 'low' : 'mid',
      antiAir: level[1].includes('anti-air'),
    };
  }));
export function getPitWorkbookNormalV104(fighterId: string, key: unknown): PitWorkbookNormalV104 | undefined {
  return PIT_WORKBOOK_NORMALS_V104.find(move => move.fighterId === fighterId && move.key === key);
}
export function pitWorkbookNormalKeyV104(attack: PitAttackKind, grounded: boolean, crouching: boolean): PitWorkbookNormalKeyV104 | undefined {
  if (attack === 'technique') return undefined;
  return `${!grounded ? 'j' : crouching ? '2' : '5'}${({light:'L',medium:'M',heavy:'H'} as const)[attack]}` as PitWorkbookNormalKeyV104;
}
export function applyPitWorkbookNormalV104(base: PitAttackDefinition, move: PitWorkbookNormalV104): PitAttackDefinition {
  return { ...base, label: move.label, startup: move.startup, active: move.active, recovery: move.recovery,
    damage: move.damage, hitLevel: move.hitLevel, antiAir: move.antiAir };
}
