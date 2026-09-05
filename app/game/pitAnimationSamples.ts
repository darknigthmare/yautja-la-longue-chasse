import { createPitCombatState, stepPitCombat, type PitFighterState, type PitInput } from "./systems/pitCombat";
import type { PitModularFighterId } from "./pitFighterRendering";

export const PIT_ANIMATION_SAMPLES = [
  ["idle", "Attente"], ["walk", "Marche avant"], ["backward", "Marche arrière"],
  ["jump", "Saut"], ["fall", "Chute"], ["crouch", "Accroupissement"],
  ["guard-high", "Garde haute"], ["guard-low", "Garde basse"],
  ["light", "Frappe légère"], ["medium", "Frappe moyenne"], ["heavy", "Frappe lourde"],
  ["technique", "Technique actuelle"], ["throw", "Tentative de projection"],
  ["hitstun", "Réaction à un coup"], ["blockstun", "Impact sur la garde"],
  ["knockdown", "Renversement"], ["ko", "KO"],
] as const;
export type PitAnimationSampleId = typeof PIT_ANIMATION_SAMPLES[number][0];
export interface PitAnimationSample {
  readonly fighter: PitFighterState;
  readonly frame: number;
}

/** Isolated actual simulation samples: no campaign, storage, reward or replay writes. */
export function createPitAnimationSamples(
  fighterId: PitModularFighterId,
  action: PitAnimationSampleId,
): readonly PitAnimationSample[] {
  const opponent = fighterId === "jungle-hunter" ? "berserker" : "jungle-hunter";
  let state = createPitCombatState(fighterId, opponent);
  const reaction = ["hitstun", "blockstun", "knockdown", "ko"].includes(action);
  state.fighters[0].x = reaction ? 400 : 320;
  state.fighters[1].x = reaction ? 459 : 850;
  if (action === "ko") state.fighters[0].health = 1;
  const samples: PitAnimationSample[] = [];
  for (let tick = 0; tick < 100; tick++) {
    let first: PitInput = {};
    let second: PitInput = {};
    if (action === "walk") first = { right: true };
    else if (action === "backward") first = { left: true };
    else if (action === "crouch") first = { down: true };
    else if (action === "guard-high" || action === "blockstun") first = { guardHigh: true };
    else if (action === "guard-low") first = { guardLow: true };
    else if ((action === "jump" || action === "fall") && tick === 0) first = { jump: true };
    else if (["light", "medium", "heavy", "technique"].includes(action) && tick === 0) {
      first = { attack: action as "light" | "medium" | "heavy" | "technique" };
    } else if (action === "throw" && tick === 0) first = { throw: true };
    if (reaction && tick === 0) {
      second = { attack: action === "knockdown" ? "heavy" : "light" };
    }
    state = stepPitCombat(state, [first, second]);
    const fighter = state.fighters[0];
    samples.push({ frame: state.frame, fighter: { ...fighter, action: fighter.action ? { ...fighter.action } : null } });
    if (state.phase !== "round") break;
  }
  if (reaction) {
    const target = samples.findIndex(({ fighter }) =>
      action === "ko" ? fighter.health <= 0 : fighter.phase === action);
    if (target >= 0) {
      const trimmed = samples.slice(Math.max(0, target - 1));
      // A KO ends its round immediately: extend its unchanged terminal state for inspection.
      if (action === "ko") {
        const last = trimmed.at(-1)!;
        for (let tick = 1; tick <= 60; tick++) trimmed.push({ fighter: last.fighter, frame: last.frame + tick });
      }
      return trimmed;
    }
  }
  if (action === "fall") {
    const firstFalling = samples.findIndex(({ fighter }) => !fighter.grounded && fighter.velocityY < 0);
    if (firstFalling >= 0) return samples.slice(firstFalling);
  }
  return samples;
}
