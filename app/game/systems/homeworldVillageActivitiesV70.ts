import { HOMEWORLD_VILLAGE_LIFE_V69 } from './homeworldVillageLifeV69';
import { HOMEWORLD_REGIONS_V68, HOMEWORLD_REGION_IDS_V68, isHomeworldRegionWalkableV68, type HomeworldRegionIdV68, type HomeworldRegionStateV68 } from './homeworldRegionsV68';
import { HOMEWORLD_PROP_ART_V64 } from './homeworldArtV64';
import type { HomeworldVec2 } from './homeworldCity';

export type VillageActivityKindV70 = 'sort' | 'calibrate' | 'observe' | 'prepare';
export interface VillageActivityV70 {
  id: string; regionId: HomeworldRegionIdV68; name: string; description: string;
  kind: VillageActivityKindV70; stationId: string; station: HomeworldVec2; approach: HomeworldVec2;
  material: string; instruction: string; choices: readonly [string, string, string];
  sequence: readonly [number, number, number]; steps: readonly [string, string, string];
  destinationId: string; completion: string;
}
// These civilian places are original to the game, not a claim that a canonical
// film specifies the layout or customs of ten homeworld settlements.
const MATERIALS: Record<HomeworldRegionIdV68, readonly [string, string, string, string]> = {
  'ash-marches': ['charges cendrées', 'balises de corniche', 'dépôts de cendre', 'réserves du convoi'],
  'glass-desert': ['coffrets des citernes', 'conduits de débit', 'poussière abritée', 'réserve d’eau scellée'],
  'pillar-jungle': ['charges des treuils', 'ancrages des passerelles', 'écorces des piliers', 'relève des hauteurs'],
  'luminous-marshes': ['charges des socles', 'résonateurs des crues', 'racines hors d’eau', 'réserves du poste aval'],
  'storm-chain': ['lests des cordées', 'harnais de crête', 'dépôts sous le vent', 'relève des guetteurs'],
  'leviathan-coast': ['charges des amarres', 'repères de marée', 'algues échouées', 'réserves de corniche'],
  'thermal-caves': ['matériaux de forge', 'outils de conduite', 'dépôts de vapeur', 'réserve de la galerie fraîche'],
  'cold-crown': ['charges sous abri', 'joints des vestibules', 'dépôts de givre', 'réserves du refuge'],
  'first-city-ruins': ['fragments hors monument', 'socles de conservation', 'marques de surface', 'archives du camp'],
  'forbidden-reserve': ['caisses du poste extérieur', 'signaux de confinement', 'lisière extérieure', 'relève hors enclos'],
};
const kinds: readonly VillageActivityKindV70[] = ['sort', 'calibrate', 'observe', 'prepare'];
const choices = [['Charge intacte', 'Charge fragile', 'Coffret scellé'], ['Isoler', 'Comparer', 'Stabiliser'], ['Surface abritée', 'Bord exposé', 'Limite du dépôt'], ['Examiner le coffret', 'Vérifier le joint', 'Fermer le coffret']] as const;
const sequences = [[1, 0, 2], [0, 1, 2], [1, 0, 2], [0, 1, 2]] as const;
const steps = [
  ['Mettre la charge fragile à part.', 'Placer la charge intacte sur le plateau libre.', 'Conserver le coffret scellé avec ses marques.'],
  ['Isoler le circuit avant de toucher au réglage.', 'Comparer le repère de contrôle avec la lecture stable.', 'Stabiliser la lecture, sans changer la consigne du poste.'],
  ['Observer d’abord le bord exposé.', 'Comparer ensuite la surface abritée.', 'Distinguer la limite du dépôt sans arracher ni prélever.'],
  ['Examiner le coffret, sans prendre son contenu.', 'Vérifier le joint et les marques du propriétaire.', 'Refermer le coffret ; il reste au village.'],
] as const;

export const HOMEWORLD_VILLAGE_ACTIVITIES_V70 = Object.fromEntries(HOMEWORLD_REGION_IDS_V68.map(regionId => {
  const definition = HOMEWORLD_REGIONS_V68[regionId];
  return [regionId, HOMEWORLD_VILLAGE_LIFE_V69[regionId].scenes.map((scene, index): VillageActivityV70 => {
    const station = definition.props.find(p => p.id === scene.nativeStation)!;
    // A front approach keeps the native object solid. No formerly saved floor
    // gains a new collider and no doorway or V68 proof target is moved.
    const candidates = [{ x: station.x, y: station.y + 110 }, { x: station.x - 115, y: station.y + 110 }, { x: station.x + 115, y: station.y + 110 }];
    const approach = candidates.find(p => isHomeworldRegionWalkableV68(regionId, 'village', p, 0));
    if (!approach) throw new Error('No physical approach for ' + scene.id);
    const destinationId = ['door:hall', 'door:forge', 'door:clinic', 'field'][index];
    return { id: scene.id, regionId, name: scene.name, description: scene.description, kind: kinds[index], stationId: station.id, station: { x: station.x, y: station.y }, approach,
      material: MATERIALS[regionId][index], instruction: steps[index][0], choices: choices[index], sequence: sequences[index], steps: steps[index], destinationId,
      completion: index === 2 ? 'Les deux surfaces ont été comparées ici. Ce repère local ne constitue pas un relevé de chasse.' : 'La préparation locale est terminée. Le matériel reste à son propriétaire ; aucune prise n’est attribuée.' };
  })];
})) as Record<HomeworldRegionIdV68, VillageActivityV70[]>;

export interface VillageActivitySessionV70 { runId: string; progress: Record<string, number>; feedback: Record<string, string> }
export const createVillageActivitySessionV70 = (runId: string): VillageActivitySessionV70 => ({ runId, progress: {}, feedback: {} });
export function nearestVillageActivityV70(regionId: HomeworldRegionIdV68, actor: HomeworldVec2) {
  return HOMEWORLD_VILLAGE_ACTIVITIES_V70[regionId].filter(a => Math.hypot(actor.x - a.approach.x, actor.y - a.approach.y) <= 80).sort((a, b) => Math.hypot(actor.x - a.approach.x, actor.y - a.approach.y) - Math.hypot(actor.x - b.approach.x, actor.y - b.approach.y))[0] ?? null;
}
/** Local session only. This intentionally cannot accept a SaveGame or emit a
 * contract event, witness, inventory item, rank, currency or durable reward. */
export function stepVillageActivityV70(session: VillageActivitySessionV70, state: HomeworldRegionStateV68, activityId: string, choice: number, allowed: boolean): VillageActivitySessionV70 {
  if (!allowed || state.status !== 'walking' || state.zone !== 'village' || state.pendingFieldEvent || session.runId !== state.runId) return session;
  const a = HOMEWORLD_VILLAGE_ACTIVITIES_V70[state.regionId].find(a => a.id === activityId);
  if (!a || !isHomeworldRegionWalkableV68(state.regionId, 'village', state.actor, state.tick) || Math.hypot(state.actor.x - a.approach.x, state.actor.y - a.approach.y) > 80 || !Number.isInteger(choice) || choice < 0 || choice > 2) return session;
  const before = session.progress[a.id] ?? 0;
  if (before >= 3) return session;
  const correct = choice === a.sequence[before];
  return { runId: session.runId, progress: { ...session.progress, [a.id]: correct ? before + 1 : before }, feedback: { ...session.feedback, [a.id]: correct ? before === 2 ? a.completion : 'Le geste est correct. Passe au repère suivant.' : 'Reprends le repère indiqué. Les affaires du clan restent en place.' } };
}

export function villageActivitySceneV70(activity: VillageActivityV70, tick: number, progress: number) {
  const phase = Math.floor(Math.max(0, tick) / 150) % 3;
  const labels = { sort: ['Plateau fragile', 'Plateau intact', 'Coffrets scellés'], calibrate: ['Lecture au repos', 'Contrôle du repère', 'Lecture stable'], observe: ['Bord exposé', 'Surface abritée', 'Limite du dépôt'], prepare: ['Marques du coffret', 'État du joint', 'Fermeture du coffret'] };
  return { phase, progress: Math.min(3, Math.max(0, progress)), signal: progress >= 3 ? 'Prête' : labels[activity.kind][phase], brightness: progress >= 3 ? .9 : .35 + phase * .2 };
}

/** Native small coffrets sit on the measured tabletop, not on a guessed
 * screen baseline. They stay within the original solid table footprint. */
export function villageActivityLoadsV70(activity: VillageActivityV70, progress: number) {
  if (activity.kind !== 'sort') return [];
  const table = HOMEWORLD_PROP_ART_V64.table, chest = HOMEWORLD_PROP_ART_V64.chest, heightWorld = 12;
  // Three front-edge sockets leave both bowls painted in the native table cell
  // uncovered. The chosen coffret moves only after a local player gesture.
  return [-50, 0, 50].map((offset, index) => ({ id: activity.id + '-load-' + index, artId: 'chest' as const, x: activity.station.x + offset, y: activity.station.y - 18 - (activity.sequence.slice(0, progress).includes(index) ? 9 : 0),
    altitude: table.physicalHeightWorldEstimate, heightWorld, depth: activity.station.y + 1,
    footprint: { width: chest.footprintWorld.width * heightWorld / chest.heightWorld, depth: chest.footprintWorld.depth * heightWorld / chest.heightWorld }, supportId: activity.stationId }));
}
