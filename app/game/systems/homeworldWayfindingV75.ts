import type { SaveGame } from '../types';
import { HOMEWORLD_BUILDINGS, HOMEWORLD_DISTRICTS, type HomeworldVec2 } from './homeworldCity';
import { HOMEWORLD_POINTS, homeworldInquiryJournal, type HomeworldPoint } from './homeworld';
import { usesHomeworldYouthAppearanceV69 } from './homeworldAccessV69';
import { canEnterHomeworldRegionV68, isHomeworldRegionIdV68 } from './homeworldRegionsV68';
import { HOMEWORLD_ATLAS_ROUTES_V70 } from './homeworldAtlasRoutesV70';
import { HOMEWORLD_GEOMETRY_V64, homeworldBuildingDoorwayV64 } from './homeworldGeometryV64';
import { homeworldSpatialRoute, isHomeworldRouteSegmentWalkable, type HomeworldSpatialRoute } from './homeworldSpatialCodex';
import { homeworldInteriorForBuildingV64, homeworldInteriorForPointV64, isHomeworldInteriorWalkableV64,
  nearestHomeworldInteriorTargetV64, type HomeworldInteriorV64 } from './homeworldInteriorsV64';

export type HomeworldWayfindingCategoryV75 = 'services' | 'people' | 'evidence' | 'buildings' | 'regions' | 'transport';
export interface HomeworldWayfindingDestinationV75 {
  id: string; label: string; category: HomeworldWayfindingCategoryV75; detail: string;
  district: string; buildingId: string | null; pointId: string | null;
  keywords?: readonly string[];
  approach: HomeworldVec2; access: 'open' | 'restricted' | 'locked'; reason: string; canGuide: boolean;
}
export interface HomeworldWayfindingStageV75 {
  space: string; route: HomeworldSpatialRoute; radius: number; instruction: string;
}
export interface HomeworldWayfindingPlanV75 {
  destinationId: string; stages: HomeworldWayfindingStageV75[]; distance: number;
  status: 'reachable' | 'unavailable' | 'locked'; reason: string;
}
const spaceOf = (interiorId?: string | null) => interiorId ?? 'city';
const districtName = (id: string) => HOMEWORLD_DISTRICTS.find(d => d.id === id)?.name ?? 'Cité';
const youthStations = ['armory', 'customization', 'training', 'medbay', 'pit'];
const serviceWords: Readonly<Record<string, readonly string[]>> = {
  armory: ['armurerie', 'armes', 'équipement'], customization: ['forge', 'atelier', 'personnalisation'],
  training: ['maître', 'dojo', 'formation', 'entraînement'], medbay: ['soins', 'infirmerie', 'repos'],
  codex: ['mémoire', 'archives', 'registre', 'codex'], pit: ['fosse', 'the pit', 'arène'],
  justice: ['gardien', 'justice', 'preuves'], trophies: ['trophées', 'galerie'],
  mausoleum: ['mausolée', 'dlc', 'chroniques'],
};

/** Shared visibility authority for this finder and the existing atlas. Never
 * expose the confinement destination or its coordinates before its real report
 * prerequisite. Reading this result grants neither discovery nor access. */
export function homeworldWayfindingRegionVisibilityV75(save: SaveGame, id: unknown) {
  if (!isHomeworldRegionIdV68(id)) return { visible: false, allowed: false, reason: 'Territoire inconnu.' };
  const access = canEnterHomeworldRegionV68(save, id);
  return { visible: id !== 'forbidden-reserve' || access.allowed, ...access };
}

function pointDetails(point: HomeworldPoint, save: SaveGame) {
  const youth = usesHomeworldYouthAppearanceV69(save);
  if (point.kind === 'ship' && youth) return { access: 'restricted' as const, reason: 'Les quais et transports du clan sont visitables. Ton vaisseau personnel attend le rite Blooded ; ce repère ne lance aucun voyage.' };
  if (point.service && youth && youthStations.includes(point.service)) return { access: 'restricted' as const,
    reason: point.service === 'training'
      ? 'Le maître est accessible dans la Salle des maîtres. Le dojo de jeunesse se reprend dans son dialogue ; les exercices des chasseurs autonomes restent réservés.'
      : 'Bâtiment et interlocuteur visitables. Cette station de chasseur autonome reste réservée pendant la jeunesse ; équipement et soins ne sont pas accordés par la carte.' };
  if (point.evidenceId && youth) return { access: 'restricted' as const, reason: 'La visite est possible. Le dossier du trophée contesté concerne les chasseurs autonomes ; cette carte ne donne aucune preuve.' };
  if (point.evidenceId) {
    const order = ['suspect-trophy', 'memory-register', 'undercity-testimony'];
    const index = order.indexOf(point.evidenceId);
    if (!save.homeworld.evidenceIds.includes(point.evidenceId) && index > save.homeworld.evidenceIds.length)
      return { access: 'restricted' as const, reason: index === 1 ? 'Relève d’abord la marque du trophée aux quais. Tu peux visiter le registre sans fabriquer cette preuve.' : 'Compare d’abord le registre des marques. La visite ne remplace pas le recoupement des preuves.' };
  }
  if (point.kind === 'audience' && !youth && (!save.homeworld.witnessChoice || save.homeworld.evidenceIds.length < 3))
    return { access: 'restricted' as const, reason: 'Le représentant peut être rencontré. Présenter le dossier exige les trois preuves et une position expliquée sur le témoin ; aucune décision n’est prise ici.' };
  return { access: 'open' as const, reason: point.service === 'mausoleum'
    ? 'Consultation publique des archives. Les campagnes DLC scellées conservent leurs propres conditions.'
    : 'Lieu accessible. L’interaction sur place conserve les conditions de ta partie ; aucun service, objet ou rang n’est accordé par le repère.' };
}

/** Physical targets come from the same buildings, rooms, thresholds and point
 * IDs as runtime collision/proximity. No second city coordinate catalogue. */
export function homeworldWayfindingDestinationsV75(save: SaveGame): HomeworldWayfindingDestinationV75[] {
  const youth = usesHomeworldYouthAppearanceV69(save);
  const buildings = HOMEWORLD_BUILDINGS.map(building => {
    const room = homeworldInteriorForBuildingV64(building.id);
    return { id: `building:${building.id}`, label: building.label, category: 'buildings' as const,
      detail: room?.title ?? building.label, district: districtName(building.districtId), buildingId: building.id, pointId: null,
      approach: homeworldBuildingDoorwayV64(building).approach, access: 'open' as const, canGuide: true,
      reason: 'Entrée physique visitable. Entre par la porte éclairée ; les objets de la demeure ne sont pas du butin.' };
  });
  const points = HOMEWORLD_POINTS.filter(point => point.kind !== 'region').map(point => {
    const room = homeworldInteriorForPointV64(point.id), building = HOMEWORLD_BUILDINGS.find(b => b.id === room?.buildingId);
    return { id: `point:${point.id}`, label: youth && point.npcId === 'hunt-king' ? 'Chef du clan · consignes personnelles' : point.label,
      category: point.kind === 'service' ? 'services' as const : point.kind === 'ship' ? 'transport' as const : point.kind === 'evidence' ? 'evidence' as const : 'people' as const,
      detail: room?.title ?? 'Poste extérieur', district: districtName(point.districtId), buildingId: room?.buildingId ?? null, pointId: point.id,
      keywords: point.service ? serviceWords[point.service] ?? [] : point.id === 'dock-officer-point' ? ['amarrage', 'quais', 'convoi', 'contrôle'] : [],
      approach: building ? homeworldBuildingDoorwayV64(building).approach : { x: point.x, y: point.y + 55 }, canGuide: true, ...pointDetails(point, save) };
  });
  const regions = HOMEWORLD_ATLAS_ROUTES_V70.flatMap(region => {
    const access = homeworldWayfindingRegionVisibilityV75(save, region.regionId);
    if (!access.visible) return [];
    return [{ id: `region:${region.regionId}`, label: region.name, category: 'regions' as const,
      detail: access.allowed ? `${region.routeTitle} · ${region.village}` : 'Départ soumis aux étapes de ta partie',
      district: 'Passages du clan', buildingId: null, pointId: `region-${region.regionId}`, approach: region.approach,
      access: access.allowed ? 'open' as const : 'locked' as const, canGuide: access.allowed,
      reason: access.allowed ? 'Rejoins le seuil physique et interagis sur place. Le passage et le village se parcourent ensuite à pied.' : access.reason }];
  });
  return [...points, ...buildings, ...regions];
}

export function homeworldWayfindingSearchV75(destinations: readonly HomeworldWayfindingDestinationV75[], query: string, category: HomeworldWayfindingCategoryV75 | 'all' = 'all') {
  const clean = (value: string) => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('fr').replace(/[’']/g, ' ');
  const tokens = clean(query).trim().split(/\s+/).filter(Boolean);
  return destinations.filter(d => (category === 'all' || d.category === category) && tokens.every(t => clean(`${d.label} ${d.detail} ${d.district} ${d.keywords?.join(' ') ?? ''}`).includes(t)));
}

export function homeworldWayfindingRecommendedV75(save: SaveGame) {
  if (usesHomeworldYouthAppearanceV69(save)) return save.homeworld.greetedNpcIds.includes('hunt-king') ? 'point:training-service' : 'point:audience-point';
  const inquiry = homeworldInquiryJournal(save.homeworld);
  if (inquiry.pointId) return `point:${inquiry.pointId}`;
  const next = ['suspect-trophy-point', 'memory-register-point', 'witness-point'][save.homeworld.evidenceIds.length];
  return next ? `point:${next}` : !save.homeworld.witnessChoice ? 'point:witness-point' : !save.homeworld.audienceOutcome ? 'point:audience-point' : 'point:market-service';
}

export function homeworldWayfindingInteriorSegmentV75(room: HomeworldInteriorV64, from: HomeworldVec2, to: HomeworldVec2) {
  if (![from.x, from.y, to.x, to.y].every(Number.isFinite)) return false;
  const n = Math.max(1, Math.ceil(Math.hypot(to.x - from.x, to.y - from.y) / 4));
  for (let i = 0; i <= n; i++) if (!isHomeworldInteriorWalkableV64(room, { x: from.x + (to.x - from.x) * i / n, y: from.y + (to.y - from.y) * i / n })) return false;
  return true;
}

/** Bounded local BFS, only at a requested plan or a physical room transition.
 * NPC/object centres are solid; goal is a real public interaction approach. */
export function homeworldWayfindingInteriorRouteV75(room: HomeworldInteriorV64, from: HomeworldVec2, targetId: string | 'exit'): HomeworldSpatialRoute {
  const unavailable: HomeworldSpatialRoute = { status: 'unavailable', points: [], distance: 0 };
  if (![from.x, from.y].every(Number.isFinite) || !isHomeworldInteriorWalkableV64(room, from)) return unavailable;
  const goal = (p: HomeworldVec2) => { const near = nearestHomeworldInteriorTargetV64(room, p); return targetId === 'exit'
    ? near?.kind === 'exit' && Math.hypot(p.x - room.exit.x, p.y - room.exit.y) < 12
    : near?.kind === 'point' && near.pointId === targetId && Math.hypot(p.x - near.position.x, p.y - near.position.y) < 48; };
  const queue = [{ point: { ...from }, ix: 0, iy: 0 }], previous = new Map<number, number>(), visited = new Set(['0,0']);
  const budget = Math.ceil(room.width / 12 + 2) * Math.ceil(room.depth / 12 + 2);
  for (let i = 0; i < queue.length && i < budget; i++) {
    const { point: p, ix, iy } = queue[i];
    if (goal(p)) {
      const raw: HomeworldVec2[] = []; let cursor: number | undefined = i;
      while (cursor !== undefined) { raw.push(queue[cursor].point); cursor = previous.get(cursor); } raw.reverse();
      const points = [raw[0]];
      for (let n = 1; n < raw.length; n++) { let last = n; while (last + 1 < raw.length && homeworldWayfindingInteriorSegmentV75(room, points.at(-1)!, raw[last + 1])) last++;
        points.push(raw[last]); n = last; }
      return { status: 'reachable', points, distance: points.slice(1).reduce((sum, p, n) => sum + Math.hypot(p.x - points[n].x, p.y - points[n].y), 0) };
    }
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      // Integer offsets prevent float round-off from visiting the same cell
      // repeatedly when an actor starts between authored grid coordinates.
      const nx = ix + dx, ny = iy + dy, next = { x: from.x + nx * 12, y: from.y + ny * 12 }, key = `${nx},${ny}`;
      if (visited.has(key)) continue; visited.add(key);
      if (!homeworldWayfindingInteriorSegmentV75(room, p, next)) continue;
      previous.set(queue.length, i); queue.push({ point: next, ix: nx, iy: ny });
    }
  }
  return unavailable;
}

export function homeworldWayfindingPlanV75(save: SaveGame, actor: HomeworldVec2, interiorId: string | null, destinationId: string): HomeworldWayfindingPlanV75 {
  const destination = homeworldWayfindingDestinationsV75(save).find(d => d.id === destinationId);
  const empty = (status: 'locked' | 'unavailable', reason: string): HomeworldWayfindingPlanV75 => ({ destinationId, status, reason, stages: [], distance: 0 });
  if (!destination) return empty('unavailable', 'Repère absent du registre accessible de cette partie.');
  if (!destination.canGuide) return empty('locked', destination.reason);
  if (![actor.x, actor.y].every(Number.isFinite)) return empty('unavailable', 'Position indisponible. Aucun itinéraire supposé.');
  const stages: HomeworldWayfindingStageV75[] = [];
  const current = interiorId ? homeworldInteriorForBuildingV64(interiorId) : null;
  let cityFrom = actor;
  const add = (space: string, route: HomeworldSpatialRoute, radius: number, instruction: string) => stages.push({ space, route, radius, instruction });
  if (interiorId && !current) return empty('unavailable', 'Espace inconnu. Aucun itinéraire supposé.');
  if (current && current.buildingId !== destination.buildingId) {
    add(current.buildingId, homeworldWayfindingInteriorRouteV75(current, actor, 'exit'), 12, 'Rejoins le seuil au sud et interagis pour ressortir.');
    const building = HOMEWORLD_BUILDINGS.find(b => b.id === current.buildingId)!;
    cityFrom = homeworldBuildingDoorwayV64(building).approach;
  }
  if (!current || current.buildingId !== destination.buildingId) add('city', homeworldSpatialRoute(cityFrom, destination.approach), 35,
    destination.category === 'regions' ? 'Au seuil, interagis pour demander le passage. Le repère ne lance aucun départ.'
      : destination.buildingId ? 'À la porte éclairée, interagis pour entrer dans le bâtiment.' : 'Approche du poste et interagis sur place.');
  if (destination.buildingId && destination.pointId) {
    const room = homeworldInteriorForBuildingV64(destination.buildingId)!;
    add(room.buildingId, homeworldWayfindingInteriorRouteV75(room, current?.buildingId === room.buildingId ? actor : room.spawn, destination.pointId), 10,
      'Interlocuteur ou objet à portée : utilise Interagir. La carte ne valide pas cette action.');
  } else if (current?.buildingId === destination.buildingId) add(current.buildingId, { status: 'reachable', points: [{ ...actor }], distance: 0 }, 10, 'Tu es dans ce bâtiment. Explore son intérieur à pied.');
  if (stages.some(stage => stage.route.status !== 'reachable')) return empty('unavailable', 'Aucun passage sûr calculé. Rejoins le centre du couloir et recalcule ; les obstacles restent solides.');
  return { destinationId, status: 'reachable', stages, distance: stages.reduce((sum, stage) => sum + stage.route.distance, 0), reason: destination.reason };
}

export function homeworldWayfindingGuidanceV75(plan: HomeworldWayfindingPlanV75, actor: HomeworldVec2, interiorId: string | null) {
  if (plan.status !== 'reachable') return null;
  const index = plan.stages.findIndex(s => s.space === spaceOf(interiorId)), stage = plan.stages[index];
  if (!stage) return { state: 'off-route' as const, direction: 'Recalculer depuis ce lieu', remaining: 0, instruction: 'Ton espace a changé. Recalcule le repère depuis ta position actuelle.' };
  const target = stage.route.points.at(-1)!;
  const room = interiorId ? homeworldInteriorForBuildingV64(interiorId) : null;
  const safe = (p: HomeworldVec2) => room ? homeworldWayfindingInteriorSegmentV75(room, actor, p) : isHomeworldRouteSegmentWalkable(actor, p);
  if (Math.hypot(actor.x - target.x, actor.y - target.y) <= stage.radius && safe(target)) return { state: 'arrived' as const, direction: 'À portée', remaining: plan.stages.slice(index + 1).reduce((sum, s) => sum + s.route.distance, 0), instruction: stage.instruction };
  let waypointIndex = -1;
  for (let n = stage.route.points.length - 1; n >= 0; n--) if (Math.hypot(actor.x - stage.route.points[n].x, actor.y - stage.route.points[n].y) > 5 && safe(stage.route.points[n])) { waypointIndex = n; break; }
  if (waypointIndex < 0) return { state: 'off-route' as const, direction: 'Recalculer le chemin', remaining: 0, instruction: 'Un obstacle sépare ta position du repère. Rejoins un passage et recalcule.' };
  const waypoint = stage.route.points[waypointIndex], angle = Math.atan2((waypoint.y - actor.y) * HOMEWORLD_GEOMETRY_V64.depthScale, waypoint.x - actor.x);
  const direction = ['→ Vers la droite (est)', '↘ Avant et droite (sud-est)', '↓ Vers l’avant (sud)', '↙ Avant et gauche (sud-ouest)', '← Vers la gauche (ouest)', '↖ Fond et gauche (nord-ouest)', '↑ Vers le fond (nord)', '↗ Fond et droite (nord-est)'][(Math.round(angle / (Math.PI / 4)) + 8) % 8];
  const remaining = Math.hypot(actor.x - waypoint.x, actor.y - waypoint.y) + stage.route.points.slice(waypointIndex + 1).reduce((sum, p, n) => sum + Math.hypot(p.x - stage.route.points[waypointIndex + n].x, p.y - stage.route.points[waypointIndex + n].y), 0)
    + plan.stages.slice(index + 1).reduce((sum, s) => sum + s.route.distance, 0);
  return { state: 'walking' as const, direction, remaining, instruction: 'Suis les rues et couloirs. Le prochain virage est calculé autour des obstacles.' };
}
export const homeworldWayfindingMetresV75 = (distance: number) => Number.isFinite(distance) ? Math.max(0, Math.round(distance * HOMEWORLD_GEOMETRY_V64.adultMetres / HOMEWORLD_GEOMETRY_V64.adultHeight)) : 0;
