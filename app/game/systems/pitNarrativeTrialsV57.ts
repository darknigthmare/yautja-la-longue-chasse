import type { PitArenaId } from './pitCombat';
import type { PitVersusFighterId } from './pitRosterExpansion';

/** Explicit extracts from the user's workbook; never substitutes for its eight-step campaigns. */
export interface PitNarrativeTrial {
  readonly id: string;
  readonly title: string;
  readonly leftId: PitVersusFighterId;
  readonly rightId: PitVersusFighterId;
  readonly arenaId: PitArenaId;
  readonly continuity: string;
  readonly briefing: string;
  readonly victory: string;
  readonly conclusion: string;
  readonly limitation: string;
  /** Narrative presentation only: never changes health, hitboxes, weapons or the saved violence setting. */
  readonly combatPolicy?: {
    readonly kind: 'non-lethal-clan-trial';
    readonly sources: readonly string[];
  };
  readonly source: { readonly sheet: '08_CAMPAGNES'; readonly encounterCell: string; readonly contextCells: string; readonly stageMapping?: string };
}

export const PIT_NARRATIVE_TRIALS_V57: readonly PitNarrativeTrial[] = [
  {
    id: 'berserker-classic-rival', title: 'Le chasseur captif', leftId: 'berserker', rightId: 'user-classic-2010',
    arenaId: 'arena-107-predators-2010-hunting-camp', continuity: 'Branche alternative · Predators (2010)',
    briefing: 'Berserker affronte Classic Predator dans le camp de la réserve. Cette rencontre isolée reprend le rival proposé par le classeur : réaffirmer sa domination sur le camp et le chasseur captif.',
    victory: 'Le rival est vaincu. Dans cette branche alternative, le camp reste sous le contrôle de Berserker ; la chasse n’est pourtant pas terminée.',
    conclusion: 'Rencontre résolue · aucune mise à mort scénarisée.',
    limitation: 'Classic 2010 conserve son profil de duel partagé et ses images fournies. Les liens de contention, la balise perdue et les cinématiques dédiées restent à produire.',
    source: { sheet: '08_CAMPAGNES', encounterCell: 'J11', contextCells: 'D11:K11' },
  },
  {
    id: 'enforcer-bad-blood-rival', title: 'La preuve de transgression', leftId: 'enforcer', rightId: 'user-bad-blood',
    arenaId: 'arena-140-bad-blood-pine-barrens', continuity: 'Victoire alternative · Predator: Bad Blood',
    briefing: 'Les traces de meurtres sans règle conduisent Enforcer au renégat. Dans les Pine Barrens, le face-à-face oppose deux usages de la chasse. Ce duel reprend la confrontation proposée, sans rejouer tout le comic.',
    victory: 'Enforcer remporte cette épreuve. La preuve peut être rapportée dans la branche alternative imaginée pour The Pit ; cette victoire ne remplace pas la conclusion du comic.',
    conclusion: 'Neutralisation · le duel s’arrête ici.',
    limitation: 'Bad Blood conserve le profil de duel partagé. La preuve tenue au gantelet, sa restitution et les animations de finition dédiées ne sont pas livrées par cet extrait.',
    source: { sheet: '08_CAMPAGNES', encounterCell: 'J16', contextCells: 'D16:K16', stageMapping: 'new-bad-blood-forest → arena-140-bad-blood-pine-barrens ; rapprochement V56 de 09_STAGES!A27:N27' },
  },
  {
    id: 'greyback-city-rival', title: 'Le jugement de l’ancien', leftId: 'greyback', rightId: 'city-hunter',
    arenaId: 'arena-106-predator-2-1990-trophy-ship', continuity: 'Épreuve de clan alternative · Predator 2',
    briefing: 'Greyback éprouve le jugement de City Hunter dans le vaisseau des trophées. Il s’agit d’une épreuve non létale proposée pour The Pit, pas d’une scène ajoutée au film ni d’un épisode de Golden Angel.',
    victory: 'L’ancien remporte l’épreuve et reconnaît la valeur du face-à-face. Les chasseurs se retirent sans mise à mort. Le trophée évoqué dans le classeur reste un élément narratif, pas un objet attribué à la campagne.',
    conclusion: 'Épreuve non létale · aucun trophée anatomique.',
    combatPolicy: { kind: 'non-lethal-clan-trial', sources: ['08_CAMPAGNES!F18', '08_CAMPAGNES!H18', '08_CAMPAGNES!J18', '07_PRESENTATIONS!J18'] },
    limitation: 'Greyback garde son incarnation démasquée de Predator 2. Son silex et son canon restent inactifs dans ce profil ; aucun geste de lance ou remise de trophée non dessiné n’est annoncé.',
    source: { sheet: '08_CAMPAGNES', encounterCell: 'J18', contextCells: 'D18:K18' },
  },
  {
    id: 'machiko-tichinde-rival', title: 'Défendre Prosperity Wells', leftId: 'machiko-noguchi', rightId: 'user-tichinde',
    arenaId: 'arena-138-avp-ryushi-prosperity-wells', continuity: 'Branche originale · Aliens vs. Predator, comics',
    briefing: 'À Prosperity Wells, Machiko affronte Tichinde pour défendre les colons. Le lieu et le rival viennent de la proposition du classeur ; cette épreuve n’affirme pas que les scènes précédentes ont été accomplies.',
    victory: 'Machiko remporte le duel. Le choix de rester auprès des survivants clôt cette lecture de la branche ; aucun recrutement, départ du clan ou équipement n’est appliqué à votre campagne.',
    conclusion: 'Protéger les survivants · rencontre résolue sans finition.',
    limitation: 'Tichinde conserve le profil de duel partagé. Le fusil de Machiko ne tire pas encore ; les survivants, le départ du clan et les deux fins animées restent à produire.',
    source: { sheet: '08_CAMPAGNES', encounterCell: 'J20', contextCells: 'D20:K20' },
  },
];

export function getPitNarrativeTrial(id: string): PitNarrativeTrial | null {
  return PIT_NARRATIVE_TRIALS_V57.find(trial => trial.id === id) ?? null;
}

export type PitNarrativeOutcome = 'victory' | 'defeat' | 'draw' | 'abandoned';
export interface PitNarrativeResultInput {
  readonly mode: string;
  readonly leftId: string;
  readonly rightId: string;
  readonly arenaId: string;
  readonly winnerId: string | null;
  readonly resultId: string;
}
/** No save, reward, inventory or arcade mutation is reachable from this reducer. */
export function resolvePitNarrativeOutcome(trial: PitNarrativeTrial, result: PitNarrativeResultInput): Exclude<PitNarrativeOutcome, 'abandoned'> | null {
  if (result.mode !== 'cpu' || !result.resultId || result.leftId !== trial.leftId || result.rightId !== trial.rightId || result.arenaId !== trial.arenaId) return null;
  if (result.winnerId === trial.leftId) return 'victory';
  if (result.winnerId === trial.rightId) return 'defeat';
  return result.winnerId === null ? 'draw' : null;
}
