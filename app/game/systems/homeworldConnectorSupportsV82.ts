import catalogue from '../data/homeworldConnectorArtV82.json';
import { homeworldProjectGroundV64, homeworldUnprojectGroundV64, type HomeworldGroundPointV64, type HomeworldPixelRectV64 } from './homeworldGeometryV64';

/** Pure source geometry. This module deliberately imports neither V77 nor the
 * V82 renderer-facing catalogue, so V77 can create its real floor pads once. */
export interface HomeworldConnectorGeometryV82<Level extends string = string> {
  readonly id: string; readonly name: string;
  readonly from: { readonly levelId: Level; readonly point: HomeworldGroundPointV64 };
  readonly to: { readonly levelId: Level; readonly point: HomeworldGroundPointV64 };
}
export interface HomeworldConnectorFloorV82<Level extends string = string> {
  readonly id: Level; readonly elevation: number;
}
export interface HomeworldConnectorNativeGeometryV82 {
  readonly sourceWidth: number; readonly sourceHeight: number;
  readonly lowerSocket: HomeworldGroundPointV64; readonly upperSocket: HomeworldGroundPointV64;
  readonly alphaBounds: HomeworldPixelRectV64;
  readonly lowerSupportPixels?: readonly HomeworldGroundPointV64[];
  readonly upperSupportPixels?: readonly HomeworldGroundPointV64[];
}
export interface HomeworldConnectorNativeLayoutV82 {
  readonly left: number; readonly top: number;
  readonly width: number; readonly height: number; readonly scale: number;
  readonly lower: HomeworldGroundPointV64; readonly upper: HomeworldGroundPointV64;
  readonly from: HomeworldGroundPointV64; readonly to: HomeworldGroundPointV64;
  readonly painted: { readonly left: number; readonly top: number; readonly width: number; readonly height: number };
  readonly socketErrorWorld: number;
}
export interface HomeworldConnectorPadV82<Level extends string = string> {
  readonly id: string; readonly label: string; readonly kind: 'passage'; readonly accent: string;
  readonly levelId: Level; readonly connectorId: string; readonly endpoint: 'lower' | 'upper';
  readonly polygon: readonly HomeworldGroundPointV64[];
  readonly nativeSource: string; readonly supportAuthority: 'AUTHORED_NATIVE_FLAT_LANDING';
}
export const HOMEWORLD_CONNECTOR_SOCKET_TOLERANCE_V82 = .75;

/** Same scalar/translation for native drawing and floor support, never a
 * parallel rectangular collider. A direction mismatch adds no ghost ground. */
export function homeworldConnectorNativeLayoutV82(
  art: HomeworldConnectorNativeGeometryV82,
  connector: HomeworldConnectorGeometryV82,
  fromElevation: number,
  toElevation: number,
): HomeworldConnectorNativeLayoutV82 | null {
  if (!Number.isFinite(fromElevation) || !Number.isFinite(toElevation) || fromElevation === toElevation) return null;
  const from = homeworldProjectGroundV64(connector.from.point, fromElevation);
  const to = homeworldProjectGroundV64(connector.to.point, toElevation);
  const fromIsLower = fromElevation < toElevation;
  const nativeFrom = fromIsLower ? art.lowerSocket : art.upperSocket;
  const nativeTo = fromIsLower ? art.upperSocket : art.lowerSocket;
  const px = nativeTo.x - nativeFrom.x, py = nativeTo.y - nativeFrom.y;
  const wx = to.x - from.x, wy = to.y - from.y, denominator = px * px + py * py;
  if (!Number.isFinite(denominator) || denominator <= 0) return null;
  const scale = (wx * px + wy * py) / denominator;
  const socketErrorWorld = Math.hypot(px * scale - wx, py * scale - wy);
  if (!Number.isFinite(scale) || scale <= 0 || socketErrorWorld > HOMEWORLD_CONNECTOR_SOCKET_TOLERANCE_V82) return null;
  const left = from.x - nativeFrom.x * scale, top = from.y - nativeFrom.y * scale;
  return {
    left, top, width: art.sourceWidth * scale, height: art.sourceHeight * scale, scale,
    from, to, lower: fromIsLower ? from : to, upper: fromIsLower ? to : from, socketErrorWorld,
    painted: { left: left + art.alphaBounds.x * scale, top: top + art.alphaBounds.y * scale,
      width: art.alphaBounds.width * scale, height: art.alphaBounds.height * scale },
  };
}

/** The caller supplies its authoritative physical connectors and elevations.
 * Hand-authored polygons cover flat painted landing surfaces, not the whole
 * transparent canvas, side pillars, shadows or the airborne stair/ramp span.
 * These are real walkable floor regions and must be drawn by that same caller.
 * No railing collider, new access permission, point relocation or duration is
 * produced. Pending native sources create no physical support footprint. */
export function homeworldConnectorSupportsV82<Level extends string>(
  connectors: readonly HomeworldConnectorGeometryV82<Level>[],
  elevations: readonly HomeworldConnectorFloorV82<Level>[],
): readonly HomeworldConnectorPadV82<Level>[] {
  const assets = catalogue.assets as unknown as Readonly<Record<string, {
    readonly art: (HomeworldConnectorNativeGeometryV82 & { readonly src: string }) | null;
  }>>;
  const bindings = catalogue.bindings as Readonly<Record<string, { readonly assetId: string }>>;
  const floors = new Map(elevations.map(floor => [floor.id, floor.elevation]));
  const pads: HomeworldConnectorPadV82<Level>[] = [];
  for (const connector of connectors) {
    const binding = bindings[connector.id], art = binding ? assets[binding.assetId]?.art : null;
    if (!art) continue;
    const fromElevation = floors.get(connector.from.levelId), toElevation = floors.get(connector.to.levelId);
    if (fromElevation === undefined || toElevation === undefined) continue;
    const layout = homeworldConnectorNativeLayoutV82(art, connector, fromElevation, toElevation);
    if (!layout) continue;
    const fromIsLower = fromElevation < toElevation;
    for (const endpoint of ['lower', 'upper'] as const) {
      const points = endpoint === 'lower' ? art.lowerSupportPixels : art.upperSupportPixels;
      if (!points || points.length < 3) continue;
      const landing = (endpoint === 'lower') === fromIsLower ? connector.from : connector.to;
      const elevation = floors.get(landing.levelId)!;
      pads.push({
        id: `native-landing-v82:${connector.id}:${endpoint}`, label: `${connector.name} · palier ${endpoint === 'lower' ? 'bas' : 'haut'}`,
        kind: 'passage', accent: '#ad8b55', levelId: landing.levelId, connectorId: connector.id, endpoint,
        polygon: points.map(point => homeworldUnprojectGroundV64({ x: layout.left + point.x * layout.scale, y: layout.top + point.y * layout.scale }, elevation)),
        nativeSource: art.src, supportAuthority: 'AUTHORED_NATIVE_FLAT_LANDING',
      });
    }
  }
  return pads;
}
