/** Explicit 1987 final-duel costume, never inferred from an unmasked face. */
export const PIT_JUNGLE_FINAL_DUEL_VARIANT = 'jungle-hunter-final-duel-v57';

export function pitHasShoulderPlasma(fighterId: string, variantId?: string | null): boolean {
  return !(fighterId === 'jungle-hunter' && variantId === PIT_JUNGLE_FINAL_DUEL_VARIANT);
}

export function pitTechniqueUnavailableReason(fighterId: string, variantId?: string | null): string | null {
  return pitHasShoulderPlasma(fighterId, variantId) ? null
    : 'Duel final 1987 · canon et harnais retirés : tir de plasma indisponible. Lames et corps à corps conservés.';
}
