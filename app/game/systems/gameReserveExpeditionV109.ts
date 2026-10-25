import type {GameReserveV107RouteRecord, GameReserveV107Tactics} from './gameReserveExpeditionV107';

/** Project-original adaptations of two proposed catalogue geographies. Native art is reused. */
export const GAME_RESERVE_V109_IDS = ['khar-duun-canyon-expedition', 'iskhel-ice-expedition'] as const;
export type GameReserveV109Id = typeof GAME_RESERVE_V109_IDS[number];
export type GameReserveChoiceV109 = 1 | 2 | 3 | 4 | GameReserveV109Id;
export type GameReserveV109Behavior = 'cache-guard' | 'repair-cover' | 'carrier-escort';
export type GameReserveV109RouteRecord = GameReserveV107RouteRecord;
export interface GameReserveV109Site {id: string; name: string; x: number; y: number; range: number; ticks: number; sector: number; description: string}
export interface GameReserveV109Person {
  id: string; name: string; role: 'leader' | 'technician' | 'marksman' | 'veteran';
  art: 'raider' | 'marine' | 'sniper'; description: string; tactics: GameReserveV107Tactics;
  behavior?: GameReserveV109Behavior;
}
export interface GameReserveV109Definition {
  id: GameReserveV109Id; name: string; biome: 'desert' | 'ice'; introduction: string;
  world: {width: number; height: number; ground: number; returnX: number};
  sectors: readonly {id: string; name: string; left: number; right: number; atmosphere: string; terrain: string}[];
  platforms: readonly {x: number; y: number; w: number; kind: 'ledge' | 'gantry'}[];
  cover: readonly {x: number; w: number; top: number}[];
  supplies: readonly number[]; ships: readonly {id: string; name: string; x: number}[];
  sites: readonly GameReserveV109Site[]; people: readonly GameReserveV109Person[];
  factions: readonly {id: string; name: string; description: string}[];
  cacheObjectives: readonly number[]; mechanicGoal: number; interceptionGoal: number;
  art: {background: string; ledge: string; gantry: string; cover: string};
}
const world = {width: 12800, height: 540, ground: 438, returnX: 115} as const;
const platform = (rows: readonly (readonly [number, number, number])[]) => rows.map(([x, y, w], index) => ({x, y, w, kind: index % 4 === 3 ? 'gantry' as const : 'ledge' as const}));
const sectors = (prefix: string, names: readonly string[], colors: readonly string[], terrain: readonly string[]) => names.map((name, index) => ({id: `${prefix}-${index + 1}`, name, left: index * 1600, right: (index + 1) * 1600, atmosphere: colors[index], terrain: terrain[index]}));
const site = (id: string, name: string, x: number, y: number, sector: number, description: string): GameReserveV109Site => ({id, name, x, y, range: 30, ticks: 120, sector, description});
const people = (prefix: string, names: readonly string[], biome: 'desert' | 'ice'): GameReserveV109Person[] => names.map((name, index) => {
  const slot = index % 4, role = (['leader', 'technician', 'marksman', 'veteran'] as const)[slot];
  const behavior: GameReserveV109Behavior | undefined = slot === 0 ? 'carrier-escort' : slot === 3 ? biome === 'desert' ? 'cache-guard' : 'repair-cover' : undefined;
  return {id: `${prefix}-${name.toLocaleLowerCase('fr').normalize('NFD').replace(/[\u0300-\u036f]/g, '')}`, name, role,
    art: slot === 2 ? 'sniper' : (index + (biome === 'ice' ? 1 : 0)) % 2 ? 'marine' : 'raider', behavior,
    description: `Adulte armé du groupe ${Math.floor(index / 4) + 1}. ${slot === 1 ? 'Mécanicien : transporte les composants puis répare son appareil.' : behavior === 'cache-guard' ? 'Garde un dépôt connu tant que son équipe collecte ; reprend le travail dès les pièces réunies.' : behavior === 'repair-cover' ? 'Couvre un mécanicien réellement présent à la rampe puis rejoint l’embarquement.' : behavior === 'carrier-escort' ? 'Accompagne un porteur visible proche sans connaître la position cachée du chasseur.' : 'Éclaireur armé : collecte les pièces et participe aux réparations.'}`,
    tactics: {sight: 300 + index * 9, speed: .88 + index * .013, carryingSpeed: .63 + index * .008,
      repair: slot === 1 ? 2.55 + index * .013 : .42 + index * .017, shotCooldown: 112 + index * 3,
      witnessRange: 125 + index * 4, windup: 24},
  };
});

export const GAME_RESERVE_KHAR_DUUN_V109: GameReserveV109Definition = {
  id: 'khar-duun-canyon-expedition', name: 'Khar-Duun', biome: 'desert', world,
  introduction: 'Khar-Duun : huit secteurs de canyons, corniches et fonds de gorge. Quatre groupes armés réparent leurs transports. Rapporte quatre relevés et neutralise un lot dans chacun des trois dépôts indiqués au carnet.',
  sectors: sectors('khar', ['Débarcadère Sec', 'Gorges des Deux Rives', 'Corniche Vitrifiée', 'Chantier des Arches', 'Oued des Plaques', 'Rempart des Caravanes', 'Ravin des Crêtes', 'Terminal des Sables'],
    ['#7f6243', '#9b6a3c', '#8a7951', '#7f6c51', '#ac8152', '#88614b', '#8e7250', '#78634d'],
    ['Banquettes basses autour du retour.', 'Corniches successives au-dessus du fond praticable.', 'Dalles vitrifiées et caches abritées.', 'Étais miniers et arche haute.', 'Détours au sol entre les plaques.', 'Postes décalés derrière les parois.', 'Corniches et descente couverte.', 'Dernier quai au bord des dunes.']),
  platforms: platform([[360,368,260],[760,294,240],[1140,348,300],[1720,378,270],[2090,308,260],[2460,248,310],[2890,338,230],[3320,360,300],[3740,288,300],[4180,340,290],[4570,270,240],[4900,370,280],[5290,310,300],[5700,240,320],[6110,330,250],[6520,374,300],[6950,295,260],[7350,342,250],[7720,274,260],[8120,378,240],[8470,305,270],[8860,235,310],[9290,324,250],[9740,360,290],[10170,280,290],[10610,330,300],[11010,260,170],[11310,370,260],[11700,300,280],[12110,355,250],[12410,270,300]]),
  cover: [450,1180,1780,2790,3450,4340,5030,5950,6660,7540,8250,9140,9860,10730,11480,12580].map((x, index) => {const top = 335 - index % 2 * 15; return {x, w: (438 - top) * 311 / 720, top};}),
  supplies: [650,1030,1560,1950,3740,4150,4570,4980,6860,7280,7730,8160,10080,10520,11040,11570],
  ships: [{id:'khar-west-cargo',name:'Cargo des gorges',x:2690},{id:'khar-arch-shuttle',name:'Navette des arches',x:5900},{id:'khar-caravan-transport',name:'Transport des caravanes',x:9130},{id:'khar-dune-skiff',name:'Skiff des sables',x:12360}],
  sites: [site('khar-river-record','Vue des deux rives',2600,248,1,'Monter les trois corniches de la gorge.'),site('khar-arch-record','Repères des arches',5840,240,3,'Remonter les étais miniers jusqu’à l’arche.'),site('khar-rempart-record','Relevé du rempart',9000,235,5,'Atteindre la corniche haute derrière les plaques.'),site('khar-terminal-record','Notes du terminal',12525,270,7,'Relever le dernier quai puis revenir par le terrain.')],
  people: people('khar',['Adren','Belen','Cyra','Darek','Elyan','Ferya','Goran','Hedra','Ilyes','Jessa','Karel','Lyra','Marekha','Nerin','Olya','Pavel'],'desert'),
  factions: [{id:'khar-quarry-escort',name:'Escorte des carrières',description:'Récupère le cargo occidental.'},{id:'khar-arch-engineers',name:'Équipe des arches',description:'Remet en route la navette minière.'},{id:'khar-caravan-watch',name:'Garde des caravanes',description:'Protège les porteurs du rempart.'},{id:'khar-terminal-salvage',name:'Récupérateurs du terminal',description:'Prépare le skiff oriental.'}],
  cacheObjectives: [1,7,13], mechanicGoal: 0, interceptionGoal: 0,
  art: {background:'/game/backgrounds/desert-depth-v8.png',ledge:'/game/assets/v19/biome-decor/desert/plt/plt-sandstone-ledge-01-low-wide.webp',gantry:'/game/assets/v19/biome-decor/desert/plt/plt-mining-gantry-01-low-wide.webp',cover:'/game/assets/v19/biome-decor/desert/cov/cov-obsidian-glass-fin-01-narrow.webp'},
};
export const GAME_RESERVE_ISKHEL_V109: GameReserveV109Definition = {
  id: 'iskhel-ice-expedition', name: 'Iskhel', biome: 'ice', world,
  introduction: 'Iskhel : huit secteurs de terrasses glacées, galeries basses et épaves. Rapporte quatre relevés, identifie deux mécaniciens par observation locale et tente d’interrompre un appareil après le démarrage de ses moteurs.',
  sectors: sectors('iskhel',['Halte Boréale','Terrasses du Givre','Passage Crevassé','Galerie Bleue','Épave Congelée','Mine Blanche','Voûte des Aiguilles','Refuge Astral'],
    ['#526e83','#647c9b','#65798b','#4e7189','#696c87','#668da0','#5b7295','#687e9b'],
    ['Banquettes basses et retour occidental.','Trois terrasses jusqu’au poste du glacier.','Traverses au-dessus de la galerie praticable.','Passage bas et remonte par les étais.','Ponts d’épave et couverts de glace.','Escalier haut au-dessus de la troisième rampe.','Passerelles étroites et descentes alternées.','Dernière galerie puis refuge de retour.']),
  platforms: platform([[320,360,320],[790,285,280],[1200,350,260],[1700,350,340],[2140,275,300],[2540,205,330],[2970,315,200],[3320,375,350],[3790,305,250],[4170,350,310],[4590,280,240],[4880,370,300],[5310,300,290],[5710,285,320],[6140,365,230],[6500,355,320],[6940,280,290],[7350,340,300],[7780,270,190],[8110,365,320],[8550,290,270],[8940,215,300],[9360,320,200],[9730,370,260],[10110,295,320],[10550,350,290],[10960,275,200],[11300,365,300],[11720,290,270],[12110,230,300],[12520,310,220]]),
  cover: [540,1230,1830,2810,3430,4310,5000,6020,6650,7530,8240,9170,9890,10780,11460,12600].map((x,index)=>{const top = 325 - index % 2 * 15; return {x,w:(438-top)*259/720,top};}),
  supplies: [630,1060,1510,1970,3650,4090,4540,4960,6840,7270,7740,8180,10020,10480,10990,11480],
  ships: [{id:'iskhel-glacier-cargo',name:'Cargo du glacier',x:2730},{id:'iskhel-gallery-shuttle',name:'Navette de la galerie',x:5890},{id:'iskhel-mine-transport',name:'Transport de la mine',x:9180},{id:'iskhel-refuge-skiff',name:'Skiff du refuge',x:12470}],
  sites: [site('iskhel-glacier-record','Repères du glacier',2685,205,1,'Rejoindre la troisième terrasse au-dessus de la galerie.'),site('iskhel-gallery-record','Relevé de la galerie',5830,285,3,'Prendre les étais à partir du passage bas.'),site('iskhel-mine-record','Vue de la mine',9070,215,5,'Remonter les trois plateformes de glace.'),site('iskhel-refuge-record','Notes du refuge',12260,230,7,'Atteindre le pont gelé puis revenir à la halte boréale.')],
  people: people('iskhel',['Alvek','Brisa','Ceylan','Deren','Estra','Falko','Gelia','Harek','Ivara','Joren','Kessa','Lenor','Myra','Narel','Osten','Pria'],'ice'),
  factions: [{id:'iskhel-glacier-recovery',name:'Récupération du glacier',description:'Évacue le cargo occidental.'},{id:'iskhel-gallery-guard',name:'Garde des galeries',description:'Protège la réparation sous la glace.'},{id:'iskhel-mine-workers',name:'Équipe de la mine',description:'Transporte les composants de la mine blanche.'},{id:'iskhel-refuge-escort',name:'Escorte du refuge',description:'Répare le dernier appareil.'}],
  cacheObjectives: [], mechanicGoal: 2, interceptionGoal: 1,
  art: {background:'/game/backgrounds/ice-depth-v4.webp',ledge:'/game/assets/v19/biome-decor/ice/plt/plt-glacier-shelf-01-low-wide.webp',gantry:'/game/assets/v19/biome-decor/ice/plt/plt-mine-gantry-01-low-wide.webp',cover:'/game/assets/v19/biome-decor/ice/cov/cov-fractured-ice-pillar-01-narrow.webp'},
};
export const GAME_RESERVE_CATALOGUE_V109 = [GAME_RESERVE_KHAR_DUUN_V109, GAME_RESERVE_ISKHEL_V109] as const;
export const GAME_RESERVE_V109_ART_DIMENSIONS = {
  desert: {background:[1823,863],branch:[768,166],industrialPlatform:[768,241],ferns:[359,768]},
  ice: {background:[1672,941],branch:[768,227],industrialPlatform:[768,226],ferns:[307,768]},
} as const;
export function gameReserveV109Definition(value?: {version?: number; reserveId?: string}): GameReserveV109Definition | null {
  return value?.version === 5 ? GAME_RESERVE_CATALOGUE_V109.find(definition=>definition.id===value.reserveId)??null : null;
}
export function parseGameReserveChoiceV109(value: string): GameReserveChoiceV109 {
  return GAME_RESERVE_V109_IDS.includes(value as GameReserveV109Id) ? value as GameReserveV109Id : value === '4' ? 4 : value === '3' ? 3 : value === '2' ? 2 : 1;
}
