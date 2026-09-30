import type { PitNarrativeTrial, PitNarrativeOutcome } from './pitNarrativeTrialsV57';

/** The workbook's clan trial is an alternate scenario, not an extra scene from Predator 2. */
export function resolvePitNarrativePresentation(trial: PitNarrativeTrial, requestedReducedGore: boolean) {
  const nonLethalTrial = trial.combatPolicy?.kind === 'non-lethal-clan-trial';
  return {
    nonLethalTrial,
    // The current renderer only substitutes gold contact rings for red rings.
    // Do not claim this supplies a new finishing animation or nonlethal combat system.
    reducedGore: nonLethalTrial || requestedReducedGore,
  } as const;
}

/** Describes the completed bout; has no save or reward side effects. */
export function pitNarrativeOutcomeDescription(trial: PitNarrativeTrial, outcome: PitNarrativeOutcome | null): string {
  if (outcome === 'victory') return trial.victory;
  if (outcome === 'defeat') return trial.combatPolicy?.kind === 'non-lethal-clan-trial'
    ? 'City Hunter remporte cette épreuve de clan. Greyback se retire ; aucun des deux chasseurs n’est tué dans cette branche alternative. Reprenez ce même face-à-face si vous le souhaitez.'
    : 'La défaite ne vous renvoie pas au début d’une campagne. Vous pouvez reprendre ce face-à-face, avec les mêmes combattants et le même terrain.';
  if (outcome === 'draw') return trial.combatPolicy?.kind === 'non-lethal-clan-trial'
    ? 'L’épreuve de clan reste indécise. Les deux chasseurs se retirent sans mise à mort ; vous pouvez reprendre ce même duel.'
    : 'Aucun vainqueur n’est désigné. Reprenez le duel pour résoudre cette rencontre.';
  return 'Vous avez quitté avant de résoudre la rencontre. Aucun succès ni récompense ne sont attribués.';
}
