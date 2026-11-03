import native from '../data/homeworldFurnitureArtV72.json';
import type { HomeworldNativeSpriteCellV64 } from '../HomeworldNativePropV64';

export type HomeworldFurnitureArtIdV72 = keyof typeof native;
export interface HomeworldFurnitureArtV72 extends HomeworldNativeSpriteCellV64 {
  readonly footprintWorld: { readonly width: number; readonly depth: number };
  readonly scaleWorldPerPixel: number;
  readonly sha256: string;
  readonly lore: string;
  readonly measurementStatus: string;
}
export const HOMEWORLD_FURNITURE_ART_V72: Readonly<Record<HomeworldFurnitureArtIdV72, HomeworldFurnitureArtV72>> = native;
export interface HomeworldFurnitureInstanceV72 {
  readonly id: string;
  readonly artId: HomeworldFurnitureArtIdV72;
  readonly x: number;
  readonly y: number;
  readonly scale?: number;
}

/** Front support is the source pivot. Its complete ground volume is behind y,
 * never centred on a table's screen-space rectangle. Layout authors must use
 * this same rectangle for collision and circulation clearance. */
export function homeworldFurnitureFootprintV72(item: HomeworldFurnitureInstanceV72) {
  const art = HOMEWORLD_FURNITURE_ART_V72[item.artId], scale = item.scale ?? 1;
  return { left: item.x - art.footprintWorld.width * scale / 2,
    right: item.x + art.footprintWorld.width * scale / 2,
    top: item.y - art.footprintWorld.depth * scale, bottom: item.y };
}
export function homeworldFurnitureTouchesV72(item: HomeworldFurnitureInstanceV72,
  point: {x: number; y: number}, actor = { halfWidth: 24, halfDepth: 14 }) {
  const box = homeworldFurnitureFootprintV72(item);
  return point.x + actor.halfWidth > box.left && point.x - actor.halfWidth < box.right
    && point.y + actor.halfDepth > box.top && point.y - actor.halfDepth < box.bottom;
}
export function homeworldFurnitureVisibleV72(item: HomeworldFurnitureInstanceV72,
  viewport: {x: number; y: number; width: number; height: number}, depthScale: number) {
  const art = HOMEWORLD_FURNITURE_ART_V72[item.artId], scale = (item.scale ?? 1) * art.scaleWorldPerPixel;
  const left = item.x - art.pivot.x * scale, top = item.y * depthScale - art.pivot.y * scale;
  return left < viewport.x + viewport.width + 120 && left + art.sourceRect.width * scale > viewport.x - 120
    && top < viewport.y + viewport.height + 120 && top + art.sourceRect.height * scale > viewport.y - 120;
}
