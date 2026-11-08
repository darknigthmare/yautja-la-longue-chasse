/** Original game balancing. Neither prices nor derived units are canon measurements. */
import first from '../../../../docs/campagne/mobilite/catalogue/01-10.json';
import second from '../../../../docs/campagne/mobilite/catalogue/11-20.json';
import third from '../../../../docs/campagne/mobilite/catalogue/21-30.json';
import fourth from '../../../../docs/campagne/mobilite/catalogue/31-40.json';
import fifth from '../../../../docs/campagne/mobilite/catalogue/41-50.json';
export type MobilityRank = 'young-blood' | 'blooded' | 'elite' | 'elder';
export type MobilityModule = 'drive' | 'armor' | 'cargo' | 'cooling';
export type MobilityLevels = Record<MobilityModule, number>;
export interface MobilityDefinition {
  id: string; name: string; index: number; kind: 'machine' | 'mount'; family: string;
  source_class: string; tier: number; crew: string; dimensions: string; silhouette: string;
  role: string; stats: Record<'speed'|'acceleration'|'handling'|'armor'|'offense'|'traversal'|'stealth'|'cargo', number>;
  acquisition: string; acquisitionMode: string; purchasePrice: number | null; minimumRank: MobilityRank;
  abilities: string[]; weapons: string[]; biomes: string[]; level_design_gates: string[];
  weaknesses: string[]; unique_animations: string[]; art_brief: string; mission_hooks: string[]; tags: string[];
  shopEnabled: boolean; trialEnabled: boolean; artStatus: string; previewPath: string | null;
  sourcePath: string | null; artValidated: boolean; canonValidated: boolean; npcPolicy: string; productionStatus: string;
}
const acquisitionPolicies = ['quest','quest','purchase','craft','training-loan','quest','faction','quest','craft','quest','quest','quest','craft','quest','quest','clan-service','faction','faction','quest','clan-service','quest','quest','insertion','narrative','quest','quest','quest','quest','faction','faction','faction','faction','non-pilotable','faction'];
/** The five bible files remain the identity/source-stat authority, never a second rewritten roster. */
export const MOBILITY_CATALOGUE: readonly MobilityDefinition[] = [...first,...second,...third,...fourth,...fifth].map((item,i)=>{
  const n=i+1, acquisitionMode=acquisitionPolicies[i]??'quest';
  return {...item,index:n,kind:n>=35?'mount':'machine',acquisitionMode,purchasePrice:n===3?420:null,
    minimumRank:item.tier<=3?'blooded':item.tier===4?'elite':'elder',shopEnabled:n===3,trialEnabled:n===3||n===5,
    artStatus:n<=40?'source-review':'missing-hd',previewPath:[3,5,19].includes(n)?`/game/mobility/v1/${String(n).padStart(2,'0')}_${item.id}__3q_left.png`:null,
    sourcePath:n<=40?`art-source/mobilite/vehicules-montures/v0.2-individual-hd/${String(n).padStart(2,'0')}_${item.id}__3q_left.png`:null,
    artValidated:false,canonValidated:false,npcPolicy:n>=35?'species-biome':n>=29?'faction-enforcer':n>=25?'outlaw':[16,17,18,20,21,22].includes(n)?'clan-service':'licensed-route',
    productionStatus:n===3||n===5?'playable-yard':n===19?'npc-yard':'catalogue-only'} as MobilityDefinition;
});
export const mobilityDefinition = (id: unknown) => MOBILITY_CATALOGUE.find(d => d.id === id);
export const MOBILITY_MODULES: readonly { id: MobilityModule; name: string; price: number; description: string }[] = [
  { id: 'drive', name: 'Noyau antigrav', price: 80, description: '+8 % vitesse et +10 % accélération par niveau ; consommation accrue de 8 %.' },
  { id: 'armor', name: 'Plaques de protection', price: 70, description: 'Dégâts de choc réduits ; masse supplémentaire : −4 % vitesse par niveau.' },
  { id: 'cargo', name: 'Attaches de transport', price: 60, description: '+25 % charge utile par niveau ; poids chargé réellement appliqué à la conduite.' },
  { id: 'cooling', name: 'Échangeur thermique', price: 65, description: '+25 % refroidissement par niveau ; ne recharge pas le noyau.' },
];
export const emptyMobilityLevels = (): MobilityLevels => ({ drive: 0, armor: 0, cargo: 0, cooling: 0 });
export const mobilityRankIndex = (rank: MobilityRank) => ['young-blood','blooded','elite','elder'].indexOf(rank);
export function mobilityStats(id: string, levels: MobilityLevels = emptyMobilityLevels(), condition = 100, cargoKg = 0) {
  const d = mobilityDefinition(id);
  if (!d) throw new RangeError('Modèle de mobilité inconnu');
  const capacity = 25 * d.stats.cargo * (1 + .25 * levels.cargo);
  const load = Math.min(1, Math.max(0, cargoKg) / capacity);
  return {
    speed: (35 + 9 * d.stats.speed) * (1 + .08 * levels.drive - .04 * levels.armor) * (.45 + .55 * condition / 100) * (1 - .25 * load),
    acceleration: (25 + 8 * d.stats.acceleration) * (1 + .1 * levels.drive) * (1 - .3 * load),
    turn: (1 + d.stats.handling * .17) * (1 - .25 * load),
    collisionResistance: Math.min(.8, d.stats.armor * .035 + .1 * levels.armor),
    capacity, cooling: 6 * (1 + .25 * levels.cooling), energyUse: .12 * (1 + .08 * levels.drive),
  };
}
