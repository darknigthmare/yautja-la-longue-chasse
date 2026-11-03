import { HOMEWORLD_GROUND_ART_V64, HOMEWORLD_INTERIOR_ART_V64 } from './homeworldArtV64';
import { HOMEWORLD_GEOMETRY_V64 } from './homeworldGeometryV64';
import type { HomeworldInteriorV64 } from './homeworldInteriorsV64';

export type HomeworldInteriorWallSideV64 = 'north' | 'west' | 'east';
export interface HomeworldInteriorPanelV64 {
  id: string;
  side: HomeworldInteriorWallSideV64;
  artId: string;
  art: typeof HOMEWORLD_INTERIOR_ART_V64[HomeworldInteriorWallSideV64];
  /** Original full module pivot; the final partial module is clipped, never stretched. */
  groundPivot: { x: number; y: number };
  localPaintPivot: { x: number; y: number };
  visibleLength: number;
  dimensions: { width: number; depth: number; height: number };
  footprint: { left: number; right: number; top: number; bottom: number };
}
export interface HomeworldInteriorWallGroupV64 {
  side: HomeworldInteriorWallSideV64;
  clip: { left: number; top: number; width: number; height: number };
  panels: HomeworldInteriorPanelV64[];
}

/** One source for the renderer and element codex. These clip windows preserve
 * the previously reviewed composition. They are screen rectangles; all public
 * panel footprints and dimensions below remain on the unprojected ground.
 * The room perimeter owns collision; overlapping visual panels add no collider. */
export function homeworldInteriorShellV64(room: Pick<HomeworldInteriorV64, 'buildingId' | 'width' | 'depth'>) {
  const groups: HomeworldInteriorWallGroupV64[] = (['north', 'west', 'east'] as const).map(side => {
    const art = HOMEWORLD_INTERIOR_ART_V64[side], length = side === 'north' ? room.width : room.depth;
    const moduleLength = art.moduleLengthWorld, count = Math.ceil(length / moduleLength);
    const clip = side === 'north'
      ? { left: 0, top: -170, width: room.width, height: 175 }
      : { left: side === 'west' ? -20 : room.width - 20, top: -50, width: 40, height: room.depth * HOMEWORLD_GEOMETRY_V64.depthScale + 53 };
    const panels = Array.from({ length: count }, (_, index): HomeworldInteriorPanelV64 => {
      const start = index * moduleLength, end = Math.min(length, start + moduleLength), visibleLength = end - start;
      const x = side === 'north' ? (index + .5) * moduleLength : side === 'west' ? 0 : room.width;
      const y = side === 'north' ? 0 : (index + 1) * moduleLength;
      return { id: `${room.buildingId}-${side}-${index}`, side, artId: `wall-${side}`, art,
        groundPivot: { x, y },
        localPaintPivot: { x: side === 'north' ? x : 20,
          y: side === 'north' ? 170 : y * HOMEWORLD_GEOMETRY_V64.depthScale + 50 },
        visibleLength,
        dimensions: { width: side === 'north' ? visibleLength : art.footprintWorld.width,
          depth: side === 'north' ? art.footprintWorld.depth : visibleLength, height: art.cutawayWallHeightWorld },
        footprint: side === 'north' ? { left: start, right: end, top: -art.footprintWorld.depth, bottom: 0 }
          : { left: x - art.footprintWorld.width / 2, right: x + art.footprintWorld.width / 2, top: start, bottom: end },
      };
    });
    return { side, clip, panels };
  });
  return { floor: { id: `${room.buildingId}-floor`, x: 0, y: 0, width: room.width, depth: room.depth, art: HOMEWORLD_GROUND_ART_V64 }, groups };
}
