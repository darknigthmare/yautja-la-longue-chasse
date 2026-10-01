import villageLife from '../data/homeworldVillageLifeV69.json';
import type { HunterBodyMorphId, DreadStyleId, HunterAppearance } from '../types';
import type { HomeworldVec2 } from './homeworldCity';
import { isHomeworldRegionWalkableV68, type HomeworldRegionIdV68 } from './homeworldRegionsV68';
import { HOMEWORLD_PROP_ART_V64 } from './homeworldArtV64';

export interface VillageResidentV69 {
  id: string; name: string; role: string; morphId: HunterBodyMorphId; dreadStyleId: DreadStyleId;
  skinId: HunterAppearance['skinId']; dreadTintId: HunterAppearance['dreadTintId']; sceneId: string | null;
  path: HomeworldVec2[]; speed: number; dwellSeconds: number; phaseSeconds: number; greeting: string;
}
export interface VillageSceneV69 extends HomeworldVec2 { id: string; name: string; description: string; nativeStation: string }
export interface VillagePropV69 extends HomeworldVec2 {
  id: string; artId: keyof typeof HOMEWORLD_PROP_ART_V64; depth: number; buildingId: string;
  socket: 'front-foundation-ledge'; collisionPolicy: 'existing-building-footprint'; sceneId: string | null;
}
export interface VillageLifeV69 { regionId: HomeworldRegionIdV68; residents: VillageResidentV69[]; scenes: VillageSceneV69[]; props: VillagePropV69[] }
export const HOMEWORLD_VILLAGE_LIFE_V69 = Object.fromEntries(villageLife.villages.map(v => [v.regionId, v])) as Record<HomeworldRegionIdV68, VillageLifeV69>;
export interface VillagePoseV69 extends HomeworldVec2 { facing: -1 | 1; moving: boolean; yielding: boolean; progress: number }

/** Local seconds are derived solely from the existing paused V68 tick. No new
 * save field or ambient timer can advance while menus or storage refuse input. */
export function homeworldVillageResidentPoseV69(regionId: HomeworldRegionIdV68, resident: VillageResidentV69, tick: number, actor?: HomeworldVec2): VillagePoseV69 {
  const a = resident.path[0], b = resident.path.at(-1)!, distance = Math.hypot(b.x - a.x, b.y - a.y), travel = distance / resident.speed;
  const cycle = travel * 2 + resident.dwellSeconds * 2, time = (Math.max(0, tick) / 60 + resident.phaseSeconds) % cycle;
  const outbound = time < travel + resident.dwellSeconds, progress = outbound ? Math.min(1, time / travel) : Math.max(0, 1 - (time - travel - resident.dwellSeconds) / travel);
  const pose: VillagePoseV69 = { x: a.x + (b.x - a.x) * progress, y: a.y + (b.y - a.y) * progress, facing: ((b.x >= a.x ? 1 : -1) * (outbound ? 1 : -1)) as -1 | 1, moving: outbound ? time < travel : time < travel * 2 + resident.dwellSeconds, yielding: false, progress };
  if (!actor) return pose;
  const separation = Math.hypot(pose.x - actor.x, pose.y - actor.y);
  if (separation >= 108) return pose;
  const push = Math.min(78, (108 - separation) * .85), side = pose.x >= actor.x ? 1 : -1;
  // A short lateral courtesy step never creates a collider or invalidates an old
  // checkpoint. Whole-body support is checked before displaying the offset.
  for (const [dx, dy] of [[side, 0], [0, pose.y >= actor.y ? 1 : -1], [-side, 0]]) {
    const p = { x: pose.x + dx * push, y: pose.y + dy * push };
    if (isHomeworldRegionWalkableV68(regionId, 'village', p, tick)) return { ...pose, ...p, yielding: true };
  }
  return pose;
}

/** Projected native canvas bounds include roof-height padding; callers supply
 * the visible unscaled world rectangle rather than arbitrary NPC counts. */
export function homeworldVillageLifeVisibleV69(point: HomeworldVec2, rect: { left: number; top: number; right: number; bottom: number }, depthScale: number, pad = 240) {
  return point.x >= rect.left - pad && point.x <= rect.right + pad && point.y * depthScale >= rect.top - pad && point.y * depthScale <= rect.bottom + pad;
}
export function nearestHomeworldVillageResidentV69(regionId: HomeworldRegionIdV68, tick: number, actor: HomeworldVec2, radius = 120) {
  let nearest: VillageResidentV69 | null = null, best = radius;
  for (const n of HOMEWORLD_VILLAGE_LIFE_V69[regionId].residents) {
    const p = homeworldVillageResidentPoseV69(regionId, n, tick, actor), distance = Math.hypot(actor.x - p.x, actor.y - p.y);
    if (distance < best) { nearest = n; best = distance; }
  }
  return nearest;
}
