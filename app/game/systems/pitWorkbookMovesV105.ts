import plan from '../data/pitWorkbookAnimationPlanV100.json';

/** Source targets only: importing this table does not enable a combat recipe. */
export const PIT_WORKBOOK_MOVE_KEYS_V105 = [
  '5L', '5M', '5H', '2L', '2M', '2H', 'jL', 'jM', 'jH',
  'TH_F', 'TH_B', '6M', 'S1', 'S2', 'S3', 'S4', 'SUPER', 'EQUIP',
] as const;
export const PIT_WORKBOOK_PRESENTATION_KEYS_V105 = [
  'INTRO', 'VICTOIRE', 'DEFAITE', 'TAUNT_1', 'TAUNT_2', 'FATALITE_1', 'FATALITE_2', 'CLEMENCE',
] as const;
export type PitWorkbookMoveKeyV105 = typeof PIT_WORKBOOK_MOVE_KEYS_V105[number];
export type PitWorkbookPresentationKeyV105 = typeof PIT_WORKBOOK_PRESENTATION_KEYS_V105[number];
export type PitWorkbookFighterIdV105 = 'feral-hunter' | 'scar';

interface PitWorkbookSourceV105 {
  readonly fighterId: PitWorkbookFighterIdV105;
  readonly actionId: string;
  readonly cell: string;
  readonly sheet: string;
  readonly label: string;
  /** Verbatim pinned V54 extraction; historical source status is never rewritten. */
  readonly sourceText: string;
  readonly bodyId: string;
  /** Required entity definitions, not proof that their runtime mechanics exist. */
  readonly entityIds: readonly string[];
}

export interface PitWorkbookMoveV105 extends PitWorkbookSourceV105 {
  readonly key: PitWorkbookMoveKeyV105;
  readonly command: string;
  readonly weapon: string;
  readonly startup: number;
  readonly active: number;
  readonly recovery: number;
  readonly damage: number;
  /** Percent of gauge in the design source, never legacy engine meter units. */
  readonly costPercent: number;
  /** Preserve ambiguous special heights instead of silently deciding "mid". */
  readonly guardLevelText: string;
  readonly sourceFamily: string;
}

export interface PitWorkbookPresentationV105 extends PitWorkbookSourceV105 {
  readonly key: PitWorkbookPresentationKeyV105;
  readonly triggerText: string;
}

export function isPitWorkbookMoveKeyV105(value: unknown): value is PitWorkbookMoveKeyV105 {
  return PIT_WORKBOOK_MOVE_KEYS_V105.includes(value as PitWorkbookMoveKeyV105);
}

function sourceEntities(sourceText: string): readonly string[] {
  return [...new Set(sourceText.match(/\bE_F\d{3}_[a-zA-Z0-9_]+\b/g) ?? [])];
}

/** All 36 move targets, including unimplemented entity, inventory and super work.
 * This is a source adapter, deliberately independent of combat and sprite banks. */
export const PIT_WORKBOOK_MOVES_V105: readonly PitWorkbookMoveV105[] = plan.fighters.flatMap(fighter =>
  fighter.actions.filter(action => action.category === 'move').map(action => {
    const numbers = /Préparation \/ actif \/ récupération : (\d+) \/ (\d+) \/ (\d+) images · dégâts (\d+) · coût (\d+) %/.exec(action.sourceText);
    const commandLine = /^Commande (.+) · (.+) · (.+)$/m.exec(action.sourceText);
    const body = /^Corps : (\S+)$/m.exec(action.sourceText);
    if (!isPitWorkbookMoveKeyV105(action.key) || !numbers || !commandLine || !body || !action.phaseTicks || !action.command || !action.weapon) {
      throw new Error('Incomplete V105 workbook move source: ' + action.id);
    }
    const [startup, active, recovery, damage, costPercent] = numbers.slice(1).map(Number);
    if (commandLine[1] !== action.command || startup !== action.phaseTicks.startup || active !== action.phaseTicks.active || recovery !== action.phaseTicks.recovery) {
      throw new Error('Conflicting V105 workbook move source: ' + action.id);
    }
    return {
      fighterId: fighter.fighterId as PitWorkbookFighterIdV105,
      key: action.key, actionId: action.id, cell: action.cell, sheet: action.sheet,
      label: action.label, sourceText: action.sourceText, command: action.command,
      weapon: action.weapon, startup, active, recovery, damage, costPercent,
      guardLevelText: commandLine[2], sourceFamily: commandLine[3],
      bodyId: body[1], entityIds: sourceEntities(action.sourceText),
    };
  }));

/** The 16 exact presentation briefs. Contextual partners are not inferred from BODY art. */
export const PIT_WORKBOOK_PRESENTATIONS_V105: readonly PitWorkbookPresentationV105[] = plan.fighters.flatMap(fighter =>
  fighter.actions.filter(action => action.category === 'presentation').map(action => {
    const body = /^Sprite : (\S+) · objets :/m.exec(action.sourceText);
    const trigger = /^Déclenchement : (.+)$/m.exec(action.sourceText);
    if (!PIT_WORKBOOK_PRESENTATION_KEYS_V105.includes(action.key as PitWorkbookPresentationKeyV105) || !body || !trigger) {
      throw new Error('Incomplete V105 workbook presentation source: ' + action.id);
    }
    return {
      fighterId: fighter.fighterId as PitWorkbookFighterIdV105,
      key: action.key as PitWorkbookPresentationKeyV105,
      actionId: action.id, cell: action.cell, sheet: action.sheet,
      label: action.label, sourceText: action.sourceText,
      bodyId: body[1], entityIds: sourceEntities(action.sourceText), triggerText: trigger[1],
    };
  }));

export function getPitWorkbookMoveV105(fighterId: string, key: unknown): PitWorkbookMoveV105 | undefined {
  return PIT_WORKBOOK_MOVES_V105.find(move => move.fighterId === fighterId && move.key === key);
}

export function getPitWorkbookPresentationV105(fighterId: string, key: unknown): PitWorkbookPresentationV105 | undefined {
  return PIT_WORKBOOK_PRESENTATIONS_V105.find(scene => scene.fighterId === fighterId && scene.key === key);
}
