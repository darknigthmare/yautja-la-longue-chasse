import type {PitInput, PitCombatState} from './pitCombat';
import {pitForwardThrowInputV109, pitForwardThrowCpuInputV109} from './pitForwardThrowControlsV109';
import {PIT_WORKBOOK_COMBAT_STATE_VERSION_V112, PIT_WORKBOOK_BACKWARD_THROW_LANDING_AGE_V112} from './pitWorkbookCombatV112';
/** Resolve current assigned L+M identically; the real fighter's initial facing
 * and held 4 direction decide TH_B at the fresh throw edge inside the engine. */
export function pitThrowInputV112(input: PitInput, options: Parameters<typeof pitForwardThrowInputV109>[1]): PitInput {
  return pitForwardThrowInputV109(input, options.recipe === 'workbook-v112' ? {...options, recipe: 'workbook-v109'} : options);
}
/** Five-tick visible reaction, never knowledge of queued human controls. */
export function pitBackwardThrowCpuInputV112(state: PitCombatState): PitInput | null {
  const pending = state.sourceThrowV112;
  if (state.version !== PIT_WORKBOOK_COMBAT_STATE_VERSION_V112 || !pending || pending.age >= PIT_WORKBOOK_BACKWARD_THROW_LANDING_AGE_V112) return null;
  return pending.techEligible && pending.attackerSlot === 0 && pending.age === 5 && pending.capturedFrame % 3 !== 0 ? {throw: true} : {};
}

/** Public CPU adapter preserves V16 and reacts to either explicitly selected V17 source pair. */
export function pitThrowCpuInputV112(state: PitCombatState): PitInput | null {
  if (state.version !== PIT_WORKBOOK_COMBAT_STATE_VERSION_V112) return pitForwardThrowCpuInputV109(state);
  if (state.sourceThrowV112) return pitBackwardThrowCpuInputV112(state);
  return pitForwardThrowCpuInputV109({...state, version: 16});
}
