import { HOMEWORLD_BUILDINGS } from './homeworldCity';
import { homeworldInteriorForBuildingV64 } from './homeworldInteriorsV64';
import { homeworldResidentActivityV69, type HomeworldResidentV69 } from './homeworldLifeV69';
import type { HomeworldElementRecordV64 } from './homeworldElementCodexV64';

export const HOMEWORLD_RESIDENT_TOPICS_V75 = [
  { id: 'daily', label: 'Ton travail' },
  { id: 'places', label: 'Les lieux proches' },
  { id: 'customs', label: 'Les usages du clan' },
] as const;
export type HomeworldResidentTopicV75 = typeof HOMEWORLD_RESIDENT_TOPICS_V75[number]['id'];

/** Authored everyday life of this playable clan. These are local adaptations,
 * never a universal Yautja government, invented canon rite or free reward. */
const districts = {
  port: {
    daily: ['Les caisses sont regroupées près des dépôts avant leur transfert. Le passage piéton reste à côté du pad ; nous ne travaillons pas sous les appareils.', 'Les navettes du clan assurent le dernier trajet. Les gros appareils restent en orbite ; leurs cargaisons passent par le contrôle d’amarrage.'],
    customs: 'Ici, nous identifions le destinataire avant d’ouvrir une caisse. Un bien confié au convoi ne devient pas un trophée du porteur.',
    buildings: ['dock-control'],
  },
  market: {
    daily: ['Les échanges se préparent sous la halle. L’armurerie, à côté, conserve les demandes des commanditaires : lis les conditions avant une sortie.', 'Nous séparons les outils, les parures et les prises consignées. Une étiquette de commande permet de rendre chaque objet à la bonne personne.'],
    customs: 'Dans ce marché, une parure ne prouve ni un rang ni une chasse. Les matériaux se négocient ; les exploits restent attachés à ceux qui les ont accomplis.',
    buildings: ['market-canopy', 'market-armory'],
  },
  forges: {
    daily: ['Les pièces arrivent des convois, puis passent au poste de travail. Nous contrôlons les fixations avant de rendre une arme à son propriétaire.', 'Le travail des parures et celui d’une lame demandent des gestes différents. Les commandes restent repérées jusqu’à leur remise dans l’atelier.'],
    customs: 'Les artisans de ce quartier conservent les marques des commandes. Modifier une arme n’autorise pas à revendiquer l’histoire de son ancien porteur.',
    buildings: ['deep-forge'],
  },
  clans: {
    daily: ['Les délégations passent par la maison commune ; les soins se donnent dans son aile dédiée. Les logements alentour restent des demeures, pas des ateliers ouverts.', 'Nous transmettons les réponses aux visiteurs avant leur retour vers les villages. Chaque délégation garde ses anciens et ses usages.'],
    customs: 'Cette cité accueille plusieurs clans. Une décision de notre maison ne commande pas à tous les Yautja ni à toutes leurs communautés.',
    buildings: ['clan-lodge'],
  },
  memory: {
    daily: ['Les récits sont rapprochés des marques consignées dans le registre. Quand une origine manque, nous la laissons incertaine au lieu de lui inventer une chasse.', 'La conservatrice garde les archives dans leurs salles propres. Les témoignages sont consultés puis remis à leur place, à l’écart du passage principal.'],
    customs: 'Nous distinguons le récit transmis de la prise réellement reconnue. Lire une archive aide à comprendre ; cela ne donne aucun exploit à son lecteur.',
    buildings: ['memory-vault'],
  },
  terraces: {
    daily: ['Les aspirants rejoignent leur maître dans la salle des maîtres. Les exercices se préparent au dojo ; le chemin public sert aux déplacements, pas aux duels.', 'Une cohorte se rassemble avant de partir. Au retour, le maître reçoit son bilan avant de reconnaître la prochaine étape de formation.'],
    customs: 'Dans cette cohorte, nous apprenons la maîtrise avant de demander une reconnaissance. Une visite du dojo ne suffit pas à achever une épreuve.',
    buildings: ['training-hall'],
  },
  temple: {
    daily: ['La gardienne reçoit les récits dans le sanctuaire. Le vestibule reste libre pour laisser passer ceux qui attendent, sans encombrer le seuil.', 'Les braseros et les supports du sanctuaire appartiennent aux lieux. Nous les entretenons ; nous n’y exposons pas les prises d’une autre personne comme les nôtres.'],
    customs: 'Ici, la gardienne vérifie les étapes du parcours avant une reconnaissance. Entrer dans la salle ne remplace jamais l’épreuve qui lui est liée.',
    buildings: ['rite-sanctum'],
  },
  arenas: {
    daily: ['Les visiteurs se rassemblent près de l’entrée de la Fosse. Les passages restent libres pour les combattants et les gardiens, même quand l’attente grandit.', 'Les Chroniques de la Fosse mettent en scène des récits de combat. Nous préparons les lieux pour leurs participants ; les prises reconnues restent consignées dans leurs propres archives.'],
    customs: 'Nous séparons les duels et les récits reconstitués des chasses réellement accomplies. Les maîtres reçoivent les retours de leur cohorte avant de reconnaître ses étapes de formation.',
    buildings: ['pit-gate'],
  },
  undercity: {
    daily: ['Le refuge permet aux habitants des galeries de se rencontrer à l’abri. Les espaces de repos et de témoignage ne sont pas un couloir de chargement.', 'Les galeries ont leurs propres habitants. Nous attendons qu’un témoin termine son récit avant de le confronter aux autres informations.'],
    customs: 'Dans ce refuge, nous distinguons ce qu’une personne a vu de ce qu’elle a entendu. Une accusation mérite plusieurs faits, pas une simple rumeur.',
    buildings: ['undercity-refuge'],
  },
  enforcers: {
    daily: ['Les dossiers sont reçus dans la salle des preuves. Les gardiens contrôlent leur origine avant de soutenir une intervention ou un accès réservé.', 'Les relevés d’un retour doivent correspondre à la demande reçue. Le bastion garde une place pour les témoignages ; une marque isolée ne suffit pas à leur donner un sens.'],
    customs: 'Les gardiens de ce clan demandent des éléments durables avant d’autoriser une route sensible. Un conseil entendu dans la rue ne constitue pas une permission.',
    buildings: ['enforcer-bastion'],
  },
  citadel: {
    daily: ['Les émissaires attendent dans l’aile publique avant l’audience. Le chef du clan reçoit les dossiers ; les sièges et l’axe central restent dégagés.', 'Les réponses de cette cour sont transmises aux délégations. Au-delà des murs, les villages gardent leur propre organisation.'],
    customs: 'Le chef parle pour notre clan. Les délégations apportent les paroles de leurs propres anciens ; nous les recevons sans prétendre commander à toutes leurs communautés.',
    buildings: ['throne-audience'],
  },
  'convoy-works': {
    daily: ['Le dépôt reçoit les caisses, puis l’atelier prépare leur transfert. L’abri de cour permet aux équipes d’attendre sans couper le passage des porteurs.', 'Nous séparons les outils à réparer des colis prêts à repartir. Les scellés et les destinataires restent visibles jusqu’à la remise.'],
    customs: 'Dans ces ateliers, la garde d’un colis engage son porteur. Les biens confiés ne sont ni un butin personnel ni une preuve de chasse.',
    buildings: ['convoy-workshop', 'convoy-store', 'convoy-south-shelter'],
  },
  'rampart-walk': {
    daily: ['Les relais accueillent les équipes entre les voies hautes. Le poste des remparts permet de comparer les observations avant un départ.', 'Nous observons les abords depuis les relais, puis transmettons les changements. Une silhouette de rocher n’est pas une passerelle : suis le sol public jusqu’au seuil réel.'],
    customs: 'Les guides de ces relais demandent que chacun conserve une route de retour. Les permissions du passage sont reconnues à son seuil, pas déduites du paysage.',
    buildings: ['rampart-watch', 'rampart-north-lodge', 'rampart-south-lodge'],
  },
  esplanade: {
    daily: ['Le héraut reçoit les récits au mausolée public. Les prises ne sont présentées que si elles appartiennent réellement au parcours enregistré.', 'La galerie sépare la consultation des récits du registre des prises. Les visiteurs peuvent regarder sans recevoir les exploits exposés.'],
    customs: 'Le récit d’un autre peut t’apprendre quelque chose. Le reconnaître dans la galerie ne fait pas de sa prise ton trophée.',
    buildings: ['trophy-mausoleum'],
  },
} as const;
export const HOMEWORLD_DISTRICT_CONVERSATIONS_V75 = districts;

export function homeworldResidentPlacesV75(resident: HomeworldResidentV69) {
  const district = districts[resident.districtId as keyof typeof districts];
  return (district?.buildings ?? []).flatMap(id => {
    const building = HOMEWORLD_BUILDINGS.find(candidate => candidate.id === id);
    const interior = homeworldInteriorForBuildingV64(id);
    return building && interior ? [{ id: `building:${id}`, buildingId: id, label: building.label, description: interior.description }] : [];
  });
}
export function homeworldResidentConversationV75(resident: HomeworldResidentV69, topic: HomeworldResidentTopicV75, seconds: number) {
  const district = districts[resident.districtId as keyof typeof districts];
  if (!district) return 'Nous habitons cette cité. Les repères indiquent les lieux et leurs conditions actuelles ; une visite ne donne aucune autorisation nouvelle.';
  if (topic === 'customs') return district.customs;
  if (topic === 'places') return homeworldResidentPlacesV75(resident).map(place => `${place.label} — ${place.description}`).join(' ') + ' Marque le lieu sur ton registre et rejoins sa porte à pied. La personne qui t’y recevra te dira ce qu’elle peut faire pour toi.';
  const slot = Math.floor((Math.max(0, seconds) + resident.phaseSeconds) / 60) % 2;
  return `${resident.name ?? resident.role} — ${homeworldResidentActivityV69(resident, seconds)}. ${district.daily[slot]}`;
}

export const HOMEWORLD_CONVERSATION_CODEX_V75: readonly (HomeworldElementRecordV64 & { associatedElementIds: readonly string[] })[] = Object.entries(districts).map(([districtId, content]) => ({
  id: `conversation-v75:${districtId}`, label: `Vie du quartier · ${districtId}`, category: 'panel', districtId, spaceId: 'world',
  position: { x: 0, y: 0, z: 0 }, dimensions: { width: 0, depth: 0, height: 0 }, footprint: null, door: null,
  lore: 'original-adaptation', source: [], asset: null, associatedElementIds: content.buildings,
  constraints: ['Trois sujets accessibles auprès des habitants réels : travail, lieux proches, usages locaux.',
    'Deux récits de travail alternent avec l’horloge de cité et la phase existante du résident. Aucun minuteur ni sauvegarde supplémentaire.',
    'Les repères correspondent aux bâtiments et pièces existants ; ils ne déplacent pas le personnage, ne donnent aucun rang, trophée, récompense ou permission.',
    'Les propos décrivent les usages de cette cité originale, pas un code universel ou une institution canonique nouvelle.',
    ...content.daily, content.customs],
}));
