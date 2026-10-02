/** One orthographic camera and one physical unit system for exterior/interior scenes.
 * Ground coordinates are never CSS pixel positions. Vertical sprite heights are
 * not compressed by the ground projection. Yautja scale is a project convention. */
export const HOMEWORLD_GEOMETRY_V64 = {
  yawDegrees: 0, pitchDegrees: 35, depthScale: Math.sin(35 * Math.PI / 180),
  zoom: .96, adultHeight: 100, adultMetres: 2.3,
  minimumDoorWidth: 80, minimumDoorHeight: 128, doorApproachDistance: 70,
  planDepthExpansion: 1.55, minimumPrimaryStreetWidth: 160,
} as const;
export interface HomeworldGroundPointV64 { readonly x: number; readonly y: number }
export interface HomeworldPixelRectV64 { readonly x: number; readonly y: number; readonly width: number; readonly height: number }
export interface HomeworldNativeBuildingArtV64 {
  readonly src: string; readonly sourceWidth: number; readonly sourceHeight: number;
  /** Optional atlas window. All socket/bounds coordinates are local to this window. */
  readonly sourceRect?: HomeworldPixelRectV64;
  readonly alphaBounds: HomeworldPixelRectV64;
  readonly foundationFront: { readonly left: number; readonly right: number; readonly y: number };
  readonly threshold: HomeworldGroundPointV64;
  readonly doorway: HomeworldPixelRectV64;
  readonly footprintWorld: { readonly width: number; readonly depth: number };
  readonly wallHeightWorld: number;
  readonly sha256: string;
  readonly measurementStatus?: string;
}
export interface HomeworldGeometryBuildingV64 extends HomeworldGroundPointV64 {
  readonly id: string; readonly width: number; readonly height: number;
  readonly footprint?: { readonly width: number; readonly depth: number };
  readonly art?: HomeworldNativeBuildingArtV64;
}
export function homeworldProjectGroundV64(point: HomeworldGroundPointV64, elevation = 0): HomeworldGroundPointV64 {
  return { x: point.x, y: point.y * HOMEWORLD_GEOMETRY_V64.depthScale - elevation };
}
export function homeworldUnprojectGroundV64(point: HomeworldGroundPointV64, elevation = 0): HomeworldGroundPointV64 {
  return { x: point.x, y: (point.y + elevation) / HOMEWORLD_GEOMETRY_V64.depthScale };
}
export function homeworldBuildingSpriteScaleV64(building: HomeworldGeometryBuildingV64): number {
  if (!building.art) return 1;
  return (building.footprint?.width ?? building.width) / (building.art.foundationFront.right - building.art.foundationFront.left);
}
/** Absolute projected image rectangle, aligned on the measured painted threshold. */
export function homeworldBuildingSpritePlacementV64(building: HomeworldGeometryBuildingV64) {
  const p = homeworldProjectGroundV64(building), art = building.art;
  if (!art) return { left: p.x - building.width / 2, top: p.y - building.height, width: building.width, height: building.height };
  const scale = homeworldBuildingSpriteScaleV64(building);
  return { left: p.x - art.threshold.x * scale, top: p.y - art.threshold.y * scale, width: (art.sourceRect?.width ?? art.sourceWidth) * scale, height: (art.sourceRect?.height ?? art.sourceHeight) * scale };
}
/** Logical threshold, traversal approach and measured source socket stay together. */
export function homeworldBuildingDoorwayV64(building: HomeworldGeometryBuildingV64) {
  const art = building.art, scale = homeworldBuildingSpriteScaleV64(building);
  return {
    threshold: { x: building.x, y: building.y },
    approach: { x: building.x, y: building.y + HOMEWORLD_GEOMETRY_V64.doorApproachDistance },
    clearWidth: art ? art.doorway.width * scale : HOMEWORLD_GEOMETRY_V64.minimumDoorWidth,
    clearHeight: art ? art.doorway.height * scale : HOMEWORLD_GEOMETRY_V64.minimumDoorHeight,
    paintedSocket: art ? { ...art.doorway, threshold: art.threshold, units: 'source-pixels' as const } : null,
    // Measured foot projections form side volumes, not an invisible passage.
    frontOffset: art ? Math.max(0, (art.foundationFront.y - art.threshold.y) * scale / HOMEWORLD_GEOMETRY_V64.depthScale) : 0,
  };
}
export function homeworldBuildingFootprintV64(building: HomeworldGeometryBuildingV64) {
  const width = building.footprint?.width ?? building.width, depth = building.footprint?.depth ?? 340;
  const door = homeworldBuildingDoorwayV64(building);
  return { left: building.x - width / 2, right: building.x + width / 2, top: building.y - depth,
    bottom: building.y + door.frontOffset, thresholdFront: building.y,
    doorLeft: building.x - door.clearWidth / 2, doorRight: building.x + door.clearWidth / 2,
  };
}
