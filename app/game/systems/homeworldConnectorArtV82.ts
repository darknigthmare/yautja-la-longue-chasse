import catalogue from '../data/homeworldConnectorArtV82.json';
import { HOMEWORLD_COUNCIL_STAIR_ART_V77 } from './homeworldConnectorArtV77';
import { homeworldConnectorNativeLayoutV82, type HomeworldConnectorNativeGeometryV82, type HomeworldConnectorNativeLayoutV82 } from './homeworldConnectorSupportsV82';
import { HOMEWORLD_CONNECTORS_V77, homeworldLevelV77, type HomeworldConnectorV77 } from './homeworldWorldV77';
export { HOMEWORLD_CONNECTOR_SOCKET_TOLERANCE_V82 } from './homeworldConnectorSupportsV82';

/** Native image coordinates always refer to the complete transparent PNG.
 * Both sockets are the centers of real flat painted landings, not alpha tips.
 * This is visual metrology of a drawing, not calibrated CAD or a QA verdict. */
export interface HomeworldConnectorNativeArtV82 extends HomeworldConnectorNativeGeometryV82 {
  readonly src: string;
  readonly walkBounds: { readonly left: number; readonly right: number };
  readonly sha256: string;
}
export interface HomeworldConnectorAssetV82 {
  readonly title: string;
  readonly kind: 'stairs' | 'ramp' | 'lift';
  readonly material: string;
  readonly sourceStatus: string;
  readonly art: HomeworldConnectorNativeArtV82 | null;
  readonly provenance: {
    readonly toolRequested: string;
    readonly camera: string;
    readonly animation: string;
    readonly socketStatus: string;
    readonly lore: 'LORE_COMPATIBLE_ORIGINAL';
    readonly sourceOriginal?: string;
    readonly nativeMeasurement?: string;
  };
}
interface ConnectorBindingV82 {
  readonly assetId: string;
  readonly role: string;
  readonly populationRule: string;
  readonly decorationRule: string;
}
interface ConnectorCatalogueV82 {
  readonly version: string;
  readonly authority: string;
  readonly transformPolicy: string;
  readonly assets: Readonly<Record<string, HomeworldConnectorAssetV82>>;
  readonly bindings: Readonly<Record<string, ConnectorBindingV82>>;
  readonly unresolved: Readonly<Record<string, {
    readonly status: 'DEDICATED_NATIVE_LIFT_REQUIRED' | 'DEDICATED_DIAGONAL_NATIVE_RAMP_REQUIRED' | 'DEDICATED_NATIVE_GALLERY_STAIR_REQUIRED';
    readonly reason: string; readonly requestedModule: string;
  }>>;
}
export type HomeworldConnectorPlacementV82 = HomeworldConnectorNativeLayoutV82;
export type HomeworldConnectorSourceStateV82 =
  | 'NATIVE_SOCKETS_DEFINED'
  | 'NATIVE_SOURCE_PENDING'
  | 'NATIVE_SOCKET_DIRECTION_MISMATCH'
  | 'DEDICATED_NATIVE_LIFT_REQUIRED'
  | 'DEDICATED_DIAGONAL_NATIVE_RAMP_REQUIRED'
  | 'DEDICATED_NATIVE_GALLERY_STAIR_REQUIRED'
  | 'UNKNOWN_CONNECTOR';

export const HOMEWORLD_CONNECTOR_CATALOGUE_V82 = catalogue as unknown as ConnectorCatalogueV82;

/** Existing Council source is preserved byte-for-byte. Each registered source
 * supplies its original dimensions, alpha envelope, SHA and real floor sockets. */
export function homeworldConnectorArtV82(connectorId: string): HomeworldConnectorNativeArtV82 | null {
  if (connectorId === 'council-stair') return HOMEWORLD_COUNCIL_STAIR_ART_V77;
  const binding = HOMEWORLD_CONNECTOR_CATALOGUE_V82.bindings[connectorId];
  return binding ? HOMEWORLD_CONNECTOR_CATALOGUE_V82.assets[binding.assetId]?.art ?? null : null;
}

/** Map both native sockets to the unchanged physical landings. One positive
 * scalar and one translation preserve every authored pixel and the camera.
 * Never rotate, mirror, or independently stretch width and height to force a
 * front-on ramp onto the diagonal service connection. No physics is mutated. */
export function homeworldConnectorPlacementV82(connector: HomeworldConnectorV77): HomeworldConnectorPlacementV82 | null {
  const art = homeworldConnectorArtV82(connector.id);
  if (!art) return null;
  return homeworldConnectorNativeLayoutV82(art, connector,
    homeworldLevelV77(connector.from.levelId).elevation, homeworldLevelV77(connector.to.levelId).elevation);
}

export function homeworldConnectorSourceStateV82(connectorId: string): HomeworldConnectorSourceStateV82 {
  const connector = HOMEWORLD_CONNECTORS_V77.find(record => record.id === connectorId);
  if (!connector) return 'UNKNOWN_CONNECTOR';
  if (homeworldConnectorArtV82(connectorId)) return homeworldConnectorPlacementV82(connector)
    ? 'NATIVE_SOCKETS_DEFINED' : 'NATIVE_SOCKET_DIRECTION_MISMATCH';
  return HOMEWORLD_CONNECTOR_CATALOGUE_V82.unresolved[connectorId]?.status ?? 'NATIVE_SOURCE_PENDING';
}

/** Preload only real registered sources. Pending art is never an imaginary
 * URL, a completed drawing, or a missing image request in the actual game. */
export const HOMEWORLD_CONNECTOR_SCENE_SOURCES_V82 = [
  HOMEWORLD_COUNCIL_STAIR_ART_V77,
  ...Object.values(HOMEWORLD_CONNECTOR_CATALOGUE_V82.assets).flatMap(asset => asset.art ? [asset.art] : []),
].filter((art, index, all) => all.findIndex(source => source.src === art.src) === index).map(art => ({
  src: art.src, sourceWidth: art.sourceWidth, sourceHeight: art.sourceHeight, kind: 'scene' as const,
}));

/** Codex consumers receive the current physical record, never a copied V82
 * coordinate or duration. Illustration status is separate from gameplay. */
export const HOMEWORLD_CONNECTOR_CODEX_V82 = HOMEWORLD_CONNECTORS_V77.map(connector => ({
  id: connector.id, name: connector.name, kind: connector.kind,
  from: connector.from, to: connector.to, duration: connector.duration,
  sourceState: homeworldConnectorSourceStateV82(connector.id),
  assetId: connector.id === 'council-stair' ? 'council-stair-native-v77'
    : HOMEWORLD_CONNECTOR_CATALOGUE_V82.bindings[connector.id]?.assetId ?? null,
  composition: HOMEWORLD_CONNECTOR_CATALOGUE_V82.bindings[connector.id] ?? null,
  outstanding: homeworldConnectorArtV82(connector.id) ? null : HOMEWORLD_CONNECTOR_CATALOGUE_V82.unresolved[connector.id] ?? null,
  physicalAuthority: 'HOMEWORLD_CONNECTORS_V77',
  nativeAuthority: 'Original lore-compatible city infrastructure; not a canonical architectural blueprint',
  animation: connector.kind==='lift'
    ? 'Static gantry and separate native cabin translated by the actual five-second transit, with boarding; no authored multi-frame clips or persistent station simulation'
    : 'Native architecture is static; the existing actor transit and duration remain the gameplay authority',
}));
