import type { SaveGame } from '../types';
import { canVisitHomeworldVillagesV69 } from './homeworldAccessV69';
/** Wayfinding follows completed chapters; reading it grants no progress. */
export function campaignWelcomeV69(save: SaveGame) {
  if(!save.prologue) return {title:'Chasseur indépendant — La cité du clan',intro:'Ton parcours antérieur reste conservé.',next:'Les villages, les commanditaires et les archives publiques gardent leurs propres conditions de progression.'};
  const villages=canVisitHomeworldVillagesV69(save);
  if(save.soloV70?.status==='completed') return {
    title:'Young Blood — Temple des Trois Ombres, acte I',
    intro:'Le premier acte du temple, les salles supérieures et le confinement local sont rapportés au maître.',
    next:'Les profondeurs du temple, la reine et le vrai Premier Sang restent distincts. Les villages du clan et les demandes des commanditaires sont accessibles ; aucun vaisseau personnel ni rang Blooded ne vient de cette ouverture.',
  };
  if(save.soloV69?.status==='completed') return {
    title:'Young Blood — Les seuils maîtrisés',
    intro:'La préparation au Premier Sang est attestée : observation, progression discrète, sas et retour du jeune au refuge.',
    next:'Le maître prépare le premier acte du Temple des Trois Ombres. Rejoins-le à la Maison des Terrasses. Les villages et leurs guides attendent aussi tes relevés. Consulte le Tableau des chasses à l’armurerie du marché et les demandes des commanditaires. Le vrai rite d’initiation contre un xénomorphe reste une expédition distincte ; tu es encore Young Blood.',
  };
  if(save.soloV68?.status==='completed') return {
    title:'Young Blood — La cohorte reconnue',
    intro:'Ta cohorte est revenue avec ses deux compagnons. Le clan a reconnu ton parcours Young Blood.',
    next:'Rejoins le maître à la Maison des Terrasses pour préparer Les Seuils du Premier Sang. Tu peux aussi visiter les villages ordinaires à pied et prendre leurs commandes au marché. Le vaisseau personnel attend le rite Blooded.',
  };
  if(save.soloV67?.status==='completed') return {
    title:'Unblooded — La piste rapportée',intro:'La Piste sans guide et le retour au maître sont enregistrés.',
    next:'Retrouve le maître à la Maison des Terrasses pour rejoindre La Cohorte des Aspirants. Les villages ordinaires et les relevés de terrain sont ouverts ; aucune chasse locale ne te donne encore Blooded.',
  };
  if(villages) return {
    title:'Unblooded — Les Premières Pistes accomplies',intro:'Ta formation et le premier relevé de terrain sont conservés. Les routes ordinaires des villages sont ouvertes.',
    next:'Le maître prépare La Piste sans guide à la Maison des Terrasses. Les guides régionaux et le Tableau des chasses du marché proposent aussi des relevés, observations et défis non létaux. Respecte les conditions propres à chaque territoire.',
  };
  if(save.prologue.checkpoint.continuityV72?.receptionPage===4) return {
    title:'Unblooded — Après l’audience du clan',
    intro:'Ton nom a été annoncé et le chef a rappelé le code devant l’assemblée. Après la formation qui a suivi ton enfance, tu as rejoint le hall comme Unblooded, puis quitté l’audience à pied. Aucun trophée, rang Blooded ou vaisseau personnel ne t’a été accordé.',
    next:'Cette audience publique annonce ta venue. Rejoins le chef dans l’aile d’audience de la Citadelle pour confirmer personnellement ton affectation et recevoir ses consignes, puis l’instructeur des terrasses. Dojo, armurerie, camp et baraquements restent des étapes jouables ; le Premier Sang est une expédition distincte.',
  };
  return {
    title:'Quelques années plus tard — L’appel de la Citadelle',
    intro:'Le souvenir du cercle de jeunesse est derrière toi. Tu as grandi parmi les tiens sans trophée ni marque de Blooded. La reconnaissance gagnée enfant t’a seulement permis de poursuivre l’apprentissage ; aujourd’hui, le clan te reçoit enfin comme Unblooded.',
    next:'Le chef t’a convoqué à la Citadelle, au nord-est. Présente-toi à lui avant de rejoindre le maître des terrasses : dojo, armurerie, camp et Premières Pistes formeront ta véritable préparation. Le Blooding et le droit de chasser seul viendront plus tard.',
  };
}
