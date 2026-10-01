import type { SaveGame } from '../types';
import { getChronicleRank } from './clanChronicle';
import { HOMEWORLD_ACTOR, stepHomeworldActorOnFloor, type HomeworldActor, type HomeworldVec2 } from './homeworldCity';
import { HOMEWORLD_GEOMETRY_V64 } from './homeworldGeometryV64';
import type { HomeworldPlayableRegionId } from './homeworld';

export type HomeworldPassageDirectionV67 = 'outbound' | 'return';
export interface HomeworldPassageStateV67 {
  version: 1; regionId: HomeworldPlayableRegionId; direction: HomeworldPassageDirectionV67;
  journeyId: string; tick: number; actor: HomeworldActor; visited: number[]; walked: number;
  status: 'travelling' | 'at-city' | 'at-biome';
}
export interface HomeworldPassageDefinitionV67 {
  id: HomeworldPlayableRegionId; title: string; destination: string; panorama: string;
  world: { width: number; depth: number }; halfWidth: number;
  nodes: readonly (HomeworldVec2 & { title: string; note: string })[];
  bridges: readonly { x: number; y: number; modules: number }[];
}
const node = (x: number, y: number, title: string, note: string) => ({ x, y, title, note });
/** Original game geography; these routes are not claims about a canonical city map. */
export const HOMEWORLD_PASSAGES_V67: Record<HomeworldPlayableRegionId, HomeworldPassageDefinitionV67> = {
  'ash-marches': {
    id: 'ash-marches', title: 'La Chaussée des Cendres', destination: 'Marches de Cendre',
    panorama: '/game/homeworld/v67/ash-causeway-vista.png', world: { width: 22_000, depth: 3_000 }, halfWidth: 150,
    nodes: [
      node(320, 1800, 'Parvis extérieur', 'La cité reste derrière toi. Suis les bornes jusqu’aux Marches ; tu peux revenir sur tes pas.'),
      node(2800, 1800, 'Corniche des convois', 'La chaussée longe le canyon. Les convois utilisent cette voie ; aucun trophée n’est accordé pour son passage.'),
      node(4500, 1250, 'Premier grand pont', 'Le tablier traverse la faille. Ses bords limitent réellement la marche.'),
      node(8100, 1250, 'Balcon de la faille', 'Observe les cendres au loin. Ce panorama est une création du jeu, pas la reconstitution d’un lieu canonique.'),
      node(8800, 2050, 'Chemin bas', 'La route redescend vers les abords minéraux. Les bornes restent à l’écart du passage.'),
      node(11800, 2050, 'Repos des porteurs', 'Le chemin continue vers le nord-est. Les huit autres régions ne sont pas ouvertes par ce trajet.'),
      node(13800, 1200, 'Pont des Marches', 'Un second ouvrage franchit le dernier bras du canyon.'),
      node(17400, 1200, 'Éperon oriental', 'Les quais de la cité sont désormais hors de vue. Il faut encore suivre la corniche.'),
      node(18700, 1650, 'Lisière des cendres', 'Les Marches commencent au-delà de la dernière borne. L’enquête existante garde ses propres objectifs.'),
      node(21600, 1650, 'Accès aux Marches', 'Approche puis interagis pour poursuivre dans les Marches. Le retour empruntera la chaussée en sens inverse.'),
    ], bridges: [{ x: 4500, y: 1250, modules: 3 }, { x: 13800, y: 1200, modules: 3 }],
  },
  'glass-desert': {
    id: 'glass-desert', title: 'La Voie du Verre', destination: 'Désert de Verre',
    panorama: '/game/homeworld/v67/glass-processional-vista.png', world: { width: 22_800, depth: 3_000 }, halfWidth: 150,
    nodes: [
      node(320, 1350, 'Terrasse de départ', 'Le rapport des Marches a été remis. La voie reste réservée aux chasseurs autorisés à quitter la cité.'),
      node(3100, 1350, 'Promenade basaltique', 'Le verre lointain ne forme pas le sol de cette voie : le chasseur suit encore les dalles du clan.'),
      node(5100, 2050, 'Descente des balises', 'Suis le coude vers le sud-est. Le canyon ne se traverse pas en ligne droite.'),
      node(8700, 2050, 'Pont du ravin clair', 'L’ouvrage laisse le paysage visible sous son tablier. Aucun transport ne remplace cette marche.'),
      node(10000, 1200, 'Belvédère du verre', 'Les plaques vitrifiées appartiennent au biome voisin. Ce passage est un raccord original de la cité.'),
      node(12900, 1200, 'Chemin des crêtes', 'La promenade se poursuit sur plusieurs travées. Revenir à la cité demande de parcourir le chemin inverse.'),
      node(15000, 1850, 'Long pont oriental', 'La dernière traversée domine la vallée. Les silhouettes du fond restent lointaines.'),
      node(18600, 1850, 'Terrasse des éclats', 'La route change d’orientation avant la limite de la zone d’enquête.'),
      node(19500, 1450, 'Approche du désert', 'Le désert garde ses dangers et ses preuves distincts. Cette marche ne termine aucune mission.'),
      node(22400, 1450, 'Accès au Désert', 'Approche puis interagis pour entrer dans le Désert de Verre. Aucun rite ni récompense n’est accordé ici.'),
    ], bridges: [{ x: 5100, y: 2050, modules: 3 }, { x: 15000, y: 1850, modules: 3 }],
  },
};
export const HOMEWORLD_PASSAGE_BRIDGE_V67 = {
  src: '/game/homeworld/v67/processional-bridge.png', sourceWidth: 1536, sourceHeight: 1024,
  // Actual native pixels inspected: level interior of the deck, inside its raised perimeter.
  deck: { left: 148, right: 1388, back: 252, front: 365 }, width: 1200,
  measurementStatus: 'native-deck-interior-visually-measured',
} as const;
export function homeworldPassageBridgeDepthV67() {
  const b = HOMEWORLD_PASSAGE_BRIDGE_V67;
  return (b.deck.front - b.deck.back) * b.width / (b.deck.right - b.deck.left) / HOMEWORLD_GEOMETRY_V64.depthScale;
}
export const homeworldPassageMetresV67 = (units: number) => units * HOMEWORLD_GEOMETRY_V64.adultMetres / HOMEWORLD_GEOMETRY_V64.adultHeight;
export function homeworldPassageLengthV67(id: HomeworldPlayableRegionId) {
  const nodes = HOMEWORLD_PASSAGES_V67[id].nodes;
  return nodes.slice(1).reduce((length, point, i) => length + Math.hypot(point.x - nodes[i].x, point.y - nodes[i].y), 0);
}
export function canEnterHomeworldPassageV67(save: Pick<SaveGame, 'prologue' | 'homeworld'>, id: unknown) {
  if (id !== 'ash-marches' && id !== 'glass-desert') return { allowed: false, reason: 'Cette région n’a pas encore de passage jouable.' };
  const youth = !!save.prologue && !['blooded', 'elite', 'elder', 'ancient'].includes(getChronicleRank(save.prologue.chronicle) ?? '');
  if (youth) return { allowed: false, reason: 'Les sorties de jeunesse restent accompagnées par le maître. Cette route adulte ne remplace pas ta formation.' };
  if (!save.homeworld.evidenceIds.includes('suspect-trophy')) return { allowed: false, reason: 'Relève d’abord la marque du trophée du convoi au port avant de suivre sa route hors de la cité.' };
  if (id === 'glass-desert' && !save.homeworld.expeditions['ash-marches']) return { allowed: false, reason: 'Remets le rapport durable des Marches avant de parcourir la Voie du Verre.' };
  return { allowed: true, reason: '' };
}
function segmentDistance(point: HomeworldVec2, a: HomeworldVec2, b: HomeworldVec2) {
  const dx = b.x - a.x, dy = b.y - a.y, t = Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / (dx * dx + dy * dy)));
  return Math.hypot(point.x - a.x - dx * t, point.y - a.y - dy * t);
}
export function homeworldPassageFloorContainsV67(id: HomeworldPlayableRegionId, point: HomeworldVec2) {
  if (![point.x, point.y].every(Number.isFinite)) return false;
  const definition = HOMEWORLD_PASSAGES_V67[id];
  const bridge = definition.bridges.find(b => point.x >= b.x && point.x <= b.x + b.modules * HOMEWORLD_PASSAGE_BRIDGE_V67.width);
  if (bridge) return Math.abs(point.y - bridge.y) <= homeworldPassageBridgeDepthV67() / 2;
  return definition.nodes.slice(1).some((node, index) => segmentDistance(point, definition.nodes[index], node) <= definition.halfWidth);
}
/** Beacon bases stay on the painted road shoulder; narrow bridge decks receive no loose props. */
export function homeworldPassagePropsV67(id: HomeworldPlayableRegionId) {
  const definition = HOMEWORLD_PASSAGES_V67[id];
  return definition.nodes.slice(1).flatMap((point, index) => {
    const previous = definition.nodes[index], dx = point.x - previous.x, dy = point.y - previous.y, length = Math.hypot(dx, dy);
    const x = (point.x + previous.x) / 2 - dy / length * 108, y = (point.y + previous.y) / 2 + dx / length * 108;
    // Place a beacon on a straight shoulder, never on the inside of a bend.
    return definition.bridges.some(b => x >= b.x - 60 && x <= b.x + b.modules * HOMEWORLD_PASSAGE_BRIDGE_V67.width + 60) ? [] : [{ id: `beacon-${index}`, x, y, halfWidth: 24, halfDepth: 22 }];
  });
}
/** Same whole-body footprint as the city; corners may never cut across the canyon. */
export function isHomeworldPassageWalkableV67(id: HomeworldPlayableRegionId, point: HomeworldVec2) {
  return [[0, 0], [-24, -14], [-24, 14], [24, -14], [24, 14]].every(([x, y]) => homeworldPassageFloorContainsV67(id, { x: point.x + x, y: point.y + y }))
    && !homeworldPassagePropsV67(id).some(prop => Math.abs(point.x - prop.x) < prop.halfWidth + 24 && Math.abs(point.y - prop.y) < prop.halfDepth + 14);
}
export function createHomeworldPassageV67(regionId: HomeworldPlayableRegionId, direction: HomeworldPassageDirectionV67 = 'outbound', journeyId = `${regionId}-${direction}`): HomeworldPassageStateV67 {
  const nodes = HOMEWORLD_PASSAGES_V67[regionId].nodes, index = direction === 'outbound' ? 0 : nodes.length - 1;
  return { version: 1, regionId, direction, journeyId, tick: 0, actor: { x: nodes[index].x, y: nodes[index].y, vx: 0, vy: 0, grounded: true, facing: direction === 'outbound' ? 1 : -1 }, visited: [index], walked: 0, status: 'travelling' };
}
/** Only an expedition reached at its real far threshold can start the inverse walk. */
export function beginReturnHomeworldPassageV67(previous: unknown): HomeworldPassageStateV67 | null {
  const state = normalizeHomeworldPassageV67(previous);
  return state?.status === 'at-biome' ? createHomeworldPassageV67(state.regionId, 'return', state.journeyId) : null;
}
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value);
const finite = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value);
export function normalizeHomeworldPassageV67(value: unknown): HomeworldPassageStateV67 | null {
  if (!record(value) || value.version !== 1 || (value.regionId !== 'ash-marches' && value.regionId !== 'glass-desert') || (value.direction !== 'outbound' && value.direction !== 'return')
    || typeof value.journeyId !== 'string' || !/^[\w:-]{1,100}$/.test(value.journeyId) || !Number.isSafeInteger(value.tick) || (value.tick as number) < 0
    || !finite(value.walked) || value.walked < 0 || value.walked > (value.tick as number) * HOMEWORLD_ACTOR.walkSpeed / 60 + .01
    || !record(value.actor) || !Array.isArray(value.visited) || !value.visited.length || typeof value.status !== 'string' || !['travelling', 'at-city', 'at-biome'].includes(value.status)) return null;
  const a = value.actor;
  if (![a.x, a.y, a.vx, a.vy].every(finite) || a.grounded !== true || (a.facing !== -1 && a.facing !== 1) || Math.abs(a.vx as number) > 330.001 || Math.abs(a.vy as number) > 260.001 || !isHomeworldPassageWalkableV67(value.regionId, a as unknown as HomeworldVec2)) return null;
  const definition = HOMEWORLD_PASSAGES_V67[value.regionId], first = value.direction === 'outbound' ? 0 : definition.nodes.length - 1, sign = value.direction === 'outbound' ? 1 : -1;
  if (value.visited.length > definition.nodes.length || !value.visited.every((index, n) => index === first + sign * n)) return null;
  if (Math.hypot((a.x as number) - definition.nodes[first].x, (a.y as number) - definition.nodes[first].y) > value.walked + .01) return null;
  const visited = value.visited as number[];
  const minimumWalk = visited.slice(1).reduce((distance, index, n) => distance + Math.hypot(definition.nodes[index].x - definition.nodes[visited[n]].x, definition.nodes[index].y - definition.nodes[visited[n]].y), 0) - (visited.length - 1) * 360;
  if (value.walked + .01 < minimumWalk || (value.status === 'at-city' && value.direction === 'return' && value.visited.length !== definition.nodes.length)) return null;
  const end = value.status === 'at-city' ? definition.nodes[0] : definition.nodes.at(-1)!;
  if (value.status !== 'travelling' && (Math.hypot((a.x as number) - end.x, (a.y as number) - end.y) > 100 || (value.status === 'at-biome' && (value.direction !== 'outbound' || value.visited.length !== definition.nodes.length)))) return null;
  return structuredClone(value) as unknown as HomeworldPassageStateV67;
}
export function canAdvanceHomeworldPassageV67(previous: unknown, next: unknown) {
  const b = normalizeHomeworldPassageV67(next); if (!b) return false;
  if (previous === undefined || previous === null) return b.tick === 0;
  const a = normalizeHomeworldPassageV67(previous); if (!a) return false;
  if (a.status === 'at-biome' && b.direction === 'return') return JSON.stringify(beginReturnHomeworldPassageV67(a)) === JSON.stringify(b);
  if (a.regionId !== b.regionId || a.direction !== b.direction || a.journeyId !== b.journeyId || b.tick < a.tick || b.walked < a.walked || b.visited.length < a.visited.length) return false;
  if (a.status !== 'travelling') return JSON.stringify(a) === JSON.stringify(b);
  const maximum = (b.tick - a.tick) * HOMEWORLD_ACTOR.walkSpeed / 60 + .01;
  return Math.hypot(b.actor.x - a.actor.x, b.actor.y - a.actor.y) <= maximum && b.walked - a.walked <= maximum;
}
export function homeworldPassageInteractionV67(state: HomeworldPassageStateV67): 'city' | 'biome' | null {
  const nodes = HOMEWORLD_PASSAGES_V67[state.regionId].nodes;
  if ((state.direction === 'outbound' || state.visited.length === nodes.length) && Math.hypot(state.actor.x - nodes[0].x, state.actor.y - nodes[0].y) <= 100) return 'city';
  if (state.direction === 'outbound' && state.visited.length === nodes.length && Math.hypot(state.actor.x - nodes.at(-1)!.x, state.actor.y - nodes.at(-1)!.y) <= 100) return 'biome';
  return null;
}
export function stepHomeworldPassageV67(state: HomeworldPassageStateV67, input: { x?: number; y?: number; interact?: boolean } = {}, paused = false): HomeworldPassageStateV67 {
  if (paused || state.status !== 'travelling') return state;
  const next = structuredClone(state), definition = HOMEWORLD_PASSAGES_V67[state.regionId];
  next.actor = stepHomeworldActorOnFloor(state.actor, { moveX: input.x ?? 0, climb: input.y ?? 0, jumpPressed: false }, 1 / 60, point => isHomeworldPassageWalkableV67(state.regionId, point), () => state.actor);
  next.tick++; next.walked += Math.hypot(next.actor.x - state.actor.x, next.actor.y - state.actor.y);
  const nextIndex = next.visited.at(-1)! + (next.direction === 'outbound' ? 1 : -1), target = definition.nodes[nextIndex];
  if (target && Math.hypot(next.actor.x - target.x, next.actor.y - target.y) < 180) next.visited.push(nextIndex);
  const interaction = homeworldPassageInteractionV67(next);
  if (input.interact && interaction) { next.status = interaction === 'city' ? 'at-city' : 'at-biome'; next.actor.vx = 0; next.actor.vy = 0; }
  return next;
}
