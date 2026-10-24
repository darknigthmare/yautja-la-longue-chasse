import type {PitCombatState} from './pitCombat';
import type {PitRoundPresentationView} from './pitRoundPresentation';
import {PIT_WORKBOOK_COMBAT_RECIPE_V105} from './pitWorkbookCombatV105';

/** Native theatre owns wall time, never additional replay/engine ticks.
 * Keep the final historical round-transition tick until the complete victory
 * and defeat clips have played. The caller must pass its latest local state
 * after every tick in a RAF batch, before it decides whether to step again. */
export function applyPitWorkbookPresentationClockV105(
  view: PitRoundPresentationView,
  combat: PitCombatState | null,
  nativeDurationMs: number | null,
): PitRoundPresentationView {
  if (combat?.rules.normalMoves !== PIT_WORKBOOK_COMBAT_RECIPE_V105 && combat?.rules.normalMoves !== 'workbook-v106' && combat?.rules.normalMoves !== 'workbook-v107') return view;
  const durationMs = nativeDurationMs !== null && Number.isFinite(nativeDurationMs) && nativeDurationMs > 0 && nativeDurationMs <= 10_000
    ? nativeDurationMs : view.durationMs;
  const blocksSimulation = view.phase === 'round-result' && combat.phase === 'round-over' && view.round === combat.round
    ? combat.transitionFramesRemaining <= 1 && view.elapsedMs < durationMs
    : view.blocksSimulation;
  return durationMs === view.durationMs && blocksSimulation === view.blocksSimulation ? view : {...view, durationMs, blocksSimulation};
}
