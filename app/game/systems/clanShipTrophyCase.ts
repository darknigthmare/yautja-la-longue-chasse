/** Original case written for OPS-B03, operations-spec.md §12.3. Neither the
 * hunting ground nor these inscriptions are claims about franchise canon.
 * The case concerns a clan display, never an item in the player's inventory. */
export const CLAN_SHIP_TROPHY_CASE = {
  id: 'C-37',
  name: 'Le trophée du Goulet de basalte',
  huntMark: 'B-17',
  transferMark: 'T-04',
  support: 'Support C-37 : une strie B-17 entaille la base. Une ligature T-04 passe au-dessus ; elle a été posée après la strie et peut être retirée sans l’effacer.',
  huntReport: 'Relevé C-37/01 · avant le retour : Balafre de Cendre a prélevé le trophée au Goulet de basalte et gravé B-17. Le croquis montre la base sans ligature. Trace Froide gardait alors le passage de retour.',
  transferRecord: 'Relevé C-37/02 · après la chasse : Trace Froide a transporté le trophée C-37 dans le coffre T-04. Sa ligature identifie le porteur du coffre. Le registre renvoie à C-37/01 pour l’auteur du prélèvement.',
  testimony: 'Balafre de Cendre : « J’avais gravé B-17 avant de lui confier le coffre. T-04, c’est sa ligature. Il l’a ramené ; je ne le nie pas. Mais je ne laisserai pas cette attache me retirer ma chasse. Regarde dessous. »',
} as const;

export const CLAN_SHIP_TROPHY_CONCLUSIONS = [
  { id: 'hunt-attribution', label: 'Restituer la chasse à Balafre',
    reason: 'La strie B-17 atteste le prélèvement. Le registre conserve aussi le portage T-04 de Trace.',
    plaque: 'Chasse : Balafre de Cendre · Portage documenté : Trace Froide',
    traceReply: 'Trace Froide : « Le nom de Balafre revient sur sa prise. Le coffre, c’est moi qui l’ai ramené. Garde aussi cela dans le récit. »',
    veteranReply: 'Balafre de Cendre : « Voilà. Ma chasse n’avait pas besoin qu’on en invente une autre à Trace. Son retour restera nommé. »' },
  { id: 'paired-roles', label: 'Inscrire les deux rôles sur la plaque',
    reason: 'Présenter ensemble Balafre pour la chasse B-17 et Trace pour le portage T-04, en distinguant leurs actes.',
    plaque: 'Balafre de Cendre — chasse B-17 · Trace Froide — portage T-04',
    traceReply: 'Trace Froide : « Laisse les deux noms. Pas pour le même geste. Ceux qui verront cette prise sauront pourquoi chacun y figure. »',
    veteranReply: 'Balafre de Cendre : « Ma marque dessous. Son attache au-dessus. La plaque dit enfin ce que le trophée montrait déjà. »' },
  { id: 'bearer-credit', label: 'Attribuer la chasse à Trace',
    reason: 'Considérer la ligature T-04 du porteur comme la marque du prélèvement.',
    review: 'hunt-report',
    refusal: 'Balafre ne cède pas : « Cette ligature n’a jamais touché la proie vivante. » Le relevé C-37/01 montre B-17 avant le transport. Relis-le avant de lui attribuer la chasse. Rien n’a été changé sur la plaque.' },
  { id: 'erase-bearer', label: 'Retirer toute mention de Trace',
    reason: 'Écarter le portage du dossier parce qu’il est postérieur à la chasse.',
    review: 'transfer-record',
    refusal: 'Trace désigne T-04 : « Le nommer chasseur ne m’efface pas du chemin du retour. » Le relevé C-37/02 atteste le transport du même objet. Relis-le ; la plaque n’a pas encore été modifiée.' },
] as const;

export type ClanShipTrophyConclusion = typeof CLAN_SHIP_TROPHY_CONCLUSIONS[number]['id'];
export type ClanShipTrophyVerdict = 'hunt-attribution' | 'paired-roles';
export type ClanShipTrophyReview = 'hunt-report' | 'transfer-record';
export interface ClanShipTrophyCaseView {
  supportRead: boolean;
  huntReportRead: boolean;
  transferRecordRead: boolean;
  testimonyHeard: boolean;
  reviewRequired: ClanShipTrophyReview | null;
  proposedConclusion: ClanShipTrophyConclusion | null;
  conclusion: ClanShipTrophyVerdict | null;
  traceReaction: boolean;
  veteranReaction: boolean;
}
export const clanShipTrophyConclusion = (value: unknown) => CLAN_SHIP_TROPHY_CONCLUSIONS.find(choice => choice.id === value);
export function emptyClanShipTrophyCase(): ClanShipTrophyCaseView {
  return { supportRead: false, huntReportRead: false, transferRecordRead: false, testimonyHeard: false,
    reviewRequired: null, proposedConclusion: null, conclusion: null, traceReaction: false, veteranReaction: false };
}
