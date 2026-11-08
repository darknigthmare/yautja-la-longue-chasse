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
  testimony: 'Balafre de Cendre : « B-17 était déjà gravé lorsque j’ai confié le coffre à Trace. Il a ramené le trophée en gardant sa ligature T-04. Ma chasse et son retour sont deux actes distincts ; les deux relevés décrivent le même objet. »',
} as const;

export const CLAN_SHIP_TROPHY_CONCLUSIONS = [
  { id: 'hunt-attribution', label: 'Restituer la chasse à Balafre',
    reason: 'La strie B-17 atteste le prélèvement. Le registre conserve aussi le portage T-04 de Trace.',
    plaque: 'Chasse : Balafre de Cendre · Portage documenté : Trace Froide',
    traceReply: 'Trace Froide : « La chasse retrouve son auteur. Le portage reste dans le registre, avec sa preuve. »',
    veteranReply: 'Balafre de Cendre : « Tu as rendu sa trace à la chasse sans effacer celui qui l’a ramenée. Je reconnais ce relevé. »' },
  { id: 'paired-roles', label: 'Inscrire les deux rôles sur la plaque',
    reason: 'Présenter ensemble Balafre pour la chasse B-17 et Trace pour le portage T-04, en distinguant leurs actes.',
    plaque: 'Balafre de Cendre — chasse B-17 · Trace Froide — portage T-04',
    traceReply: 'Trace Froide : « Les deux noms peuvent figurer ensemble, puisque leurs actes restent distincts. Je conserve les deux relevés. »',
    veteranReply: 'Balafre de Cendre : « Deux actes, deux mentions. Cette plaque ne confond plus la prise et le retour ; je la reconnais. »' },
  { id: 'bearer-credit', label: 'Attribuer la chasse à Trace',
    reason: 'Considérer la ligature T-04 du porteur comme la marque du prélèvement.',
    review: 'hunt-report',
    refusal: 'La ligature de portage ne prouve pas le prélèvement. Reviens au relevé C-37/01 : il nomme l’auteur de B-17 et montre la base avant le transport. Aucun trophée n’est déplacé.' },
  { id: 'erase-bearer', label: 'Retirer toute mention de Trace',
    reason: 'Écarter le portage du dossier parce qu’il est postérieur à la chasse.',
    review: 'transfer-record',
    refusal: 'Le relevé C-37/02 atteste pourtant le retour du même objet par Trace. Relis ce transfert avant de conclure. Aucun nom ni trophée historique n’est effacé.' },
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
