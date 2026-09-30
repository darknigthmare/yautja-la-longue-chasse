import type { PitExplicitStageAssociation } from './pitLoreStages';

/** V56 additions only. The V55 195-identity source plan and its visual proof remain historical. */
export const PIT_ORIGINAL_STAGE_ASSOCIATIONS_V56 = [
  { fighterId: 'original-arid-ermit-yautja', stageId: 'arena-087-cercle-ambre', classification: 'original-exhibition', sourceStatus: 'original-selected',
    reason: 'Cercle Ambre : cadre d’exposition original déjà jouable, choisi pour ce duel. Ce choix n’affirme ni planète natale, clan, ni biographie pour Arid Ermit Yautja.', sourceUrls: [] },
  { fighterId: 'original-mutated-yautja', stageId: 'arena-085-cercle-sang', classification: 'original-exhibition', sourceStatus: 'original-selected',
    reason: 'Cercle Sang : lieu d’exposition original du jeu, sans lien canonique ou cause de mutation attribuée à Yautja Mutated. Aucune scène de film réécrite.', sourceUrls: [] },
  { fighterId: 'guest-amengi-female', stageId: 'arena-081-cercle-obsidienne', classification: 'original-exhibition', sourceStatus: 'original-selected',
    reason: 'Cercle Obsidienne : terrain de duel original partagé. La sélection Amengi vient du nom fourni ; ce cadre ne prouve ni origine, captivité, époque, ni rencontre canonique.', sourceUrls: [] },
] as const satisfies readonly PitExplicitStageAssociation[];
