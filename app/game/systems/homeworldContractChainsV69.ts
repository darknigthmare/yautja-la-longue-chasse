import type { ContractDefinitionV68, ContractObjectiveV68 } from './homeworldContractsV68';

/** Authored local relationships, not a canonical clan-wide bounty institution.
 * Each chapter records existing physical village actions; none moves an escort,
 * invents a kill, awards a rite or changes the campaign's criminal evidence. */
export interface ContractChainV69 { id: string; title: string; chapter: number; total: number; relation: string }
const people = {
  market: { giverNpcId: 'market-artisan', giverName: 'Artisane du marché', pointId: 'market-service', buildingId: 'market-armory' },
  healer: { giverNpcId: 'clan-healer', giverName: 'Soigneuse des délégations', pointId: 'medbay-service', buildingId: 'clan-lodge' },
  dock: { giverNpcId: 'dock-officer', giverName: 'Officier des quais', pointId: 'dock-officer-point', buildingId: 'dock-control' },
  forge: { giverNpcId: 'forge-artisan', giverName: 'Maîtresse des parures', pointId: 'forge-service', buildingId: 'deep-forge' },
  memory: { giverNpcId: 'memory-keeper', giverName: 'Conservatrice des marques', pointId: 'memory-register-point', buildingId: 'memory-vault' },
} as const;
function chapter(id: string, title: string, person: keyof typeof people, chain: ContractChainV69,
  prerequisites: readonly string[], objectives: readonly ContractObjectiveV68[], brief: string,
  restriction: string, completionText: string, rewardMarks: number): ContractDefinitionV68 {
  return { id, title, ...people[person], category: person === 'market' ? 'tracking' : 'npc',
    chain, prerequisites, sequential: true, objectives, brief, restriction, completionText, rewardMarks };
}
const returns = (chapter: number, relation: string): ContractChainV69 => ({ id: 'return-line', title: 'Les balises du retour', chapter, total: 4, relation });
const measure = (chapter: number, relation: string): ContractChainV69 => ({ id: 'hunter-measure', title: 'La mesure du chasseur', chapter, total: 4, relation });
export const HOMEWORLD_CHAIN_CONTRACTS_V69: readonly ContractDefinitionV68[] = [
  chapter('v69-return-1', 'Lire les deux souffles', 'market', returns(1, 'L’Artisane prépare un dossier de terrain pour la Soigneuse.'), [], [
    { regionId: 'ash-marches', action: 'track', text: 'Lire les trois traces et observer le cuirassé des Cendres, puis revenir au guide.' },
    { regionId: 'thermal-caves', action: 'survey', text: 'Après ce retour, relever les trois indices des Grottes et les faire confirmer.' },
  ], 'La cendre sèche et la vapeur brouillent les lectures de deux façons. Commence par trois traces et l’observation calme du cuirassé des Cendres, fais confirmer ce retour, puis relève les indices des Grottes. Les deux rapports remis ici permettront à la Soigneuse de préparer sa propre demande.',
  'Le relevé ne rend pas la région sûre et ne remplace pas une escorte. Aucun ancien rapport ne compte.',
  'Deux terrains comparés. La Soigneuse peut maintenant te confier la suite, en personne à la maison des délégations.', 44),
  chapter('v69-return-2', 'Les appuis de ceux qui reviennent', 'healer', returns(2, 'La Soigneuse s’appuie sur le dossier réellement remis à l’Artisane.'), ['v69-return-1'], [
    { regionId: 'luminous-marshes', action: 'ward', text: 'Protéger les deux balises des Marais pendant les bonnes fenêtres et revenir au guide.' },
    { regionId: 'cold-crown', action: 'recover', text: 'Puis récupérer la caisse de balises de la Couronne après avoir évité le danger.' },
  ], 'Le dossier de l’Artisane distingue déjà la cendre de la vapeur. Il manque les racines humides et les anciennes cordées. Protège le passage des Marais, puis rapporte les balises de la Couronne. Chaque guide doit confirmer sa part.',
  'Tu prépares des repères de retour, sans soin improvisé, sans prélèvement sur un habitant et sans promettre un convoi invulnérable.',
  'Les deux retours sont documentés. L’Officier des quais peut te demander de vérifier la ligne exposée au vent.', 54),
  chapter('v69-return-3', 'La ligne tenue', 'dock', returns(3, 'Les quais travaillent à partir des retours remis à la Soigneuse.'), ['v69-return-2'], [
    { regionId: 'storm-chain', action: 'ward', text: 'Protéger les deux balises des Orages et faire confirmer l’intervention.' },
    { regionId: 'leviathan-coast', action: 'track', text: 'Puis observer la présence côtière après les trois traces du rivage.' },
  ], 'Une ligne de retour doit rester repérable dans les rafales avant qu’on étudie son débouché sur la côte. Rejoins les Orages, stabilise leurs balises, puis observe la proie territoriale du rivage depuis la terre ferme. Reviens aux quais.',
  'Ce travail ne lance aucune traversée orbitale et ne prouve pas qu’un léviathan a été chassé.',
  'Le vent et le rivage sont comparés. La Maîtresse des parures peut préparer son relevé d’implantation des relais.', 58),
  chapter('v69-return-4', 'Des repères sans parure', 'forge', returns(4, 'La Forge termine le dossier confié successivement au marché, aux soins et aux quais.'), ['v69-return-3'], [
    { regionId: 'thermal-caves', action: 'recover', text: 'Récupérer la caisse des Grottes pendant l’accalmie, puis revenir au guide.' },
    { regionId: 'glass-desert', action: 'track', text: 'Puis observer le fouisseur du Verre et faire confirmer le retour.' },
    { regionId: 'first-city-ruins', action: 'survey', text: 'Enfin relever les trois traces des Ruines sans déplacer le patrimoine.' },
  ], 'Un relais utile ne devient pas une parure de chasse. Rapporte d’abord les boîtiers des Grottes, observe ensuite les sorties du fouisseur du Verre, puis vérifie les traces des Ruines. La Forge réunira les trois rapports, pas trois trophées inventés.',
  'Aucune arme, parure gratuite ou installation automatique n’est attribuée ; les vestiges restent en place.',
  'Le dossier des balises du retour est clos. Les quatre remises restent dans ton carnet ; aucune région entière n’est déclarée pacifiée.', 72),
  chapter('v69-measure-1', 'À la distance juste', 'market', measure(1, 'L’Artisane distingue une observation de chasse d’une prise proclamée.'), [], [
    { regionId: 'ash-marches', action: 'track', text: 'Observer le cuirassé des Cendres après les trois traces et revenir au guide.' },
    { regionId: 'glass-desert', action: 'track', text: 'Puis observer le fouisseur du Verre pendant une accalmie.' },
  ], 'Deux proies, deux distances. Observe d’abord le cuirassé sans déclencher sa charge, puis le fouisseur sans marteler le sol du village. Remets les deux observations au marché avant de demander une épreuve à la Forge.',
  'Les animaux restent vivants. Un contrat d’observation ne prouve ni victoire ni prise de crâne.',
  'Les deux distances sont attestées. La Maîtresse des parures peut maintenant te proposer la confrontation mesurée.', 46),
  chapter('v69-measure-2', 'La riposte et l’empreinte', 'forge', measure(2, 'La Forge demande une maîtrise après les observations remises au marché.'), ['v69-measure-1'], [
    { regionId: 'glass-desert', action: 'challenge', text: 'Éviter deux charges du fouisseur et placer trois touches pendant sa reprise, puis revenir au guide.' },
    { regionId: 'cold-crown', action: 'track', text: 'Puis suivre les trois indices et observer le carnivore de la Couronne.' },
  ], 'La distance observée au Verre permet d’y éprouver ta maîtrise sans poursuivre la créature après son retrait. Fais confirmer ce défi, puis pars lire l’empreinte froide : une signature thermique brouillée ne vaut pas absence de proie.',
  'Défi non létal contre la faune territoriale autorisée. Aucun habitant ou adversaire désarmé n’est une cible.',
  'Maîtrise et observation ont leurs rapports distincts. La Conservatrice peut t’apprendre ce que ces rapports ne prouvent pas.', 62),
  chapter('v69-measure-3', 'Ce que l’épreuve ne prouve pas', 'memory', measure(3, 'La Conservatrice replace les faits de la Forge dans leur contexte.'), ['v69-measure-2'], [
    { regionId: 'first-city-ruins', action: 'survey', text: 'Relever les traces des Ruines, puis les faire confirmer sans ouvrir d’archive scellée.' },
    { regionId: 'forbidden-reserve', action: 'recover', text: 'Puis récupérer la caisse extérieure de la Réserve après le danger du chemin.' },
  ], 'Une épreuve réussie ne t’autorise pas à raconter une histoire qui n’a pas eu lieu. Documente d’abord les traces des Ruines, puis rapporte le relais extérieur de la Réserve. Les deux guides confirmeront des lieux précis, pas une vérité royale.',
  'Ne déplace pas le patrimoine, n’ouvre pas d’enclos et ne transforme pas une récupération en chasse à une créature importée.',
  'Les limites du témoignage sont consignées. L’Officier des quais peut te confier le dernier circuit de maîtrise et de protection.', 60),
  chapter('v69-measure-4', 'Ne pas emporter la route', 'dock', measure(4, 'Les quais associent la maîtrise de la Forge aux limites établies par la Conservatrice.'), ['v69-measure-3'], [
    { regionId: 'leviathan-coast', action: 'challenge', text: 'Éprouver la proie côtière : deux charges évitées et trois touches, puis retour au guide.' },
    { regionId: 'pillar-jungle', action: 'ward', text: 'Puis protéger les deux balises de la Jungle et faire confirmer l’intervention.' },
    { regionId: 'storm-chain', action: 'track', text: 'Enfin observer le planeur des Orages après les trois traces.' },
  ], 'Engage seulement la proie territoriale de la Côte, laisse-la se retirer, puis protège les repères de la Jungle au lieu d’y chercher une autre prise. Termine par l’observation du planeur des Orages et ramène les trois rapports aux quais.',
  'Le chemin reste aux clans qui l’habitent. Ni léviathan tué, ni escorte inventée, ni rang supérieur n’est décerné.',
  'Le circuit de la mesure du chasseur est clos. Ses quatre remises documentent tes actes sans te décerner de rite ni de rang.', 78),
];
