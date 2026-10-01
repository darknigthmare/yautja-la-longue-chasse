import type { SaveGame } from '../types';
import { canVisitHomeworldVillagesV69 } from './homeworldAccessV69';
/** Wayfinding follows completed chapters; reading it grants no progress. */
export function campaignWelcomeV69(save: SaveGame) {
  if(!save.prologue) return {title:'Chasseur indépendant — La cité du clan',intro:'Ton parcours antérieur reste conservé.',next:'Les villages, les commanditaires et les archives publiques gardent leurs propres conditions de progression.'};
  const villages=canVisitHomeworldVillagesV69(save);
  if(save.soloV69?.status==='completed') return {
    title:'Young Blood — Les seuils maîtrisés',
    intro:'La préparation au Premier Sang est attestée : observation, progression discrète, sas et retour du jeune au refuge.',
    next:'Les villages et leurs guides attendent tes relevés. Consulte le Tableau des chasses à l’armurerie du marché et les demandes des commanditaires. Le vrai rite d’initiation contre un xénomorphe reste une expédition distincte ; tu es encore Young Blood.',
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
  return {title:'Quelques années plus tard — Unblooded',intro:'Ton apprentissage se déroule auprès du clan : accueil du chef, dojo du maître, armurerie, camp et baraquements. Chaque étape conserve les exercices réellement réussis.',
    next:'Rejoins le chef à la Citadelle, au nord-est, puis l’instructeur des terrasses. Approche-les et utilise Interaction. Le dojo, l’équipement de formation et les Premières Pistes précèdent les sorties vers les villages. Le vaisseau personnel attend le rite Blooded.'};
}
