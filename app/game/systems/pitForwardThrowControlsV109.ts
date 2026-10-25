import type {ControlBindings} from './controlBindings';
import type {PitInput, PitCombatState} from './pitCombat';
import {PIT_WORKBOOK_COMBAT_STATE_VERSION_V109, PIT_WORKBOOK_THROW_LANDING_AGE_V109} from './pitWorkbookCombatV109';

/** Resolve the actual assigned L+M controls before the ordinary attack priority
 * discards M. The engine still owns groundedness, range and fresh input edges. */
export function pitForwardThrowInputV109(input: PitInput, options: {
  recipe?: string;
  player: 1 | 2;
  codes: ReadonlySet<string>;
  bindings: ControlBindings;
  pad?: {readonly buttons: readonly {readonly pressed: boolean}[]} | null;
  requested?: boolean;
}): PitInput {
  if (options.recipe !== 'workbook-v109') return input;
  const held = (suffix: 'AttackLight' | 'AttackMedium') =>
    options.bindings[`pit.p${options.player}${suffix}`].some(code => options.codes.has(code));
  const light = held('AttackLight') || Boolean(options.pad?.buttons[2]?.pressed);
  const medium = held('AttackMedium') || Boolean(options.pad?.buttons[3]?.pressed);
  return options.requested || light && medium
    ? {...input, attack: undefined, workbookAction: undefined, throw: true} : input;
}

/** Match the historical opponent's visible five-tick reaction. This sees the
 * serialised capture only, never a queued human input or a future collision. */
export function pitForwardThrowCpuInputV109(state: PitCombatState): PitInput | null {
  const capture = state.sourceThrowV109;
  if (state.version !== PIT_WORKBOOK_COMBAT_STATE_VERSION_V109 || !capture || capture.age >= PIT_WORKBOOK_THROW_LANDING_AGE_V109) return null;
  return capture.techEligible && capture.attackerSlot === 0 && capture.age === 5 && capture.capturedFrame % 3 !== 0
    ? {throw: true} : {};
}
