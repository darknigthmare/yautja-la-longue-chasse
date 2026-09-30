import { PIT_ARENAS, type PitCombatState } from './pitCombat';

export interface PitImpactFlash {
  frame: number;
  x: number;
  y: number;
  blocked: boolean;
}

/** Resource awards and terminal events can follow a hit in the same tick.
 * Select contact independently so those events cannot suppress its feedback.
 */
export function getPitImpactFeedback(state: PitCombatState): PitImpactFlash | null {
  for (let index = state.events.length - 1; index >= 0; index--) {
    const event = state.events[index];
    if (event.type !== 'hit' && event.type !== 'block') continue;
    const defender = state.fighters.find(fighter => fighter.definitionId === event.defenderId);
    if (!defender) return null;
    return { frame: state.frame, x: defender.x,
      y: PIT_ARENAS[state.arenaId].groundY - defender.y - 64, blocked: event.type === 'block' };
  }
  return null;
}
