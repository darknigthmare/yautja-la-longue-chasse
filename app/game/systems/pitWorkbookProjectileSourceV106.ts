import calibration from '../data/pitWorkbookEntityAnchorsV106.json';
export {PIT_WORKBOOK_SUPER_SOURCES_V106, getPitWorkbookSuperFramePlanV106,
  getPitWorkbookSuperContactGeometryV106, getPitWorkbookSuperProjectileAnchorV106} from './pitWorkbookSuperSourceV106';

export type PitWorkbookFacingV106 = 'left' | 'right' | 1 | -1;
export type PitWorkbookEntityFighterV106 = 'feral-hunter' | 'scar';
export type PitWorkbookEntityMoveV106 = 'S1' | 'S2' | 'S3';
type Point = readonly [number, number];
type Rect = readonly [number, number, number, number];

interface NativeFrameV106 {
  readonly facing: 'left' | 'right';
  readonly pageId: string;
  readonly path: string;
  readonly rect: Rect;
  readonly pivot: Point;
  readonly bodyHeightPx: number;
  readonly contactOffsetPx: number;
  readonly uncertaintyPx: number;
}

/** Local source-cell pixels. No facing reflection, fitting or inferred alpha edge. */
export interface PitWorkbookProjectileAnchorV106 extends NativeFrameV106 {
  readonly activeFrameIndex: number;
  readonly point: Point;
  readonly bodyOcclusion: true;
  readonly railSpacingPx?: number;
}

export interface PitWorkbookChargeAnchorV106 extends NativeFrameV106 {
  readonly startupFrameIndex: number;
  readonly point: Point;
  readonly bodyOcclusion: true;
}

/** Enclosing visual shield bounds, not a new standalone shield sprite. */
export interface PitWorkbookShieldGeometryV106 extends NativeFrameV106 {
  readonly activeFrameIndex: number;
  readonly bounds: Rect;
}

export interface PitWorkbookEntitySourceV106 {
  readonly fighterId: PitWorkbookEntityFighterV106;
  readonly actionId: string;
  readonly key: PitWorkbookEntityMoveV106;
  readonly bodyId: string;
  readonly entityId: string;
  readonly sourceSheet: string;
  readonly sourceCell: string;
  readonly sourceTargets: {
    readonly startup: number; readonly active: number; readonly recovery: number;
    readonly damage: number; readonly costPercent: number;
  };
  readonly atlasId: string;
  readonly sourceHashes: Readonly<Record<string, string>>;
  readonly anchors?: readonly PitWorkbookProjectileAnchorV106[];
  readonly chargeAnchors?: readonly PitWorkbookChargeAnchorV106[];
  readonly geometry?: readonly PitWorkbookShieldGeometryV106[];
}

/** Public source data, deliberately independent of the duel engine.
 * Its admission is spatial only; it does not certify the eventual mechanics. */
export const PIT_WORKBOOK_ENTITY_SOURCES_V106 =
  calibration.entries as unknown as readonly PitWorkbookEntitySourceV106[];

function nativeFacing(value: PitWorkbookFacingV106): 'left' | 'right' | null {
  return value === 'left' || value === -1 ? 'left'
    : value === 'right' || value === 1 ? 'right' : null;
}

export function getPitWorkbookEntitySourceV106(fighterId: string, key: string): PitWorkbookEntitySourceV106 | undefined {
  return PIT_WORKBOOK_ENTITY_SOURCES_V106.find(source => source.fighterId === fighterId && source.key === key);
}

/** Active frame0 is release; Scar frame1 is its two-tick recoil. Feral has one
 * active drawing. Unknown frames fail closed rather than extrapolating a muzzle. */
export function getPitWorkbookProjectileAnchorV106(
  fighterId: string, facing: PitWorkbookFacingV106, activeFrameIndex = 0,
): PitWorkbookProjectileAnchorV106 | undefined {
  const source = getPitWorkbookEntitySourceV106(fighterId, fighterId === 'scar' ? 'S3' : 'S1');
  const direction = nativeFacing(facing);
  if (!direction || !Number.isInteger(activeFrameIndex) || activeFrameIndex < 0) return undefined;
  return source?.anchors?.find(anchor => anchor.facing === direction && anchor.activeFrameIndex === activeFrameIndex);
}

export function getPitWorkbookShieldGeometryV106(
  facing: PitWorkbookFacingV106, activeFrameIndex = 0,
): PitWorkbookShieldGeometryV106 | undefined {
  const direction = nativeFacing(facing);
  if (!direction || !Number.isInteger(activeFrameIndex) || activeFrameIndex < 0) return undefined;
  return getPitWorkbookEntitySourceV106('feral-hunter', 'S2')?.geometry?.find(
    frame => frame.facing === direction && frame.activeFrameIndex === activeFrameIndex);
}

export function getPitWorkbookChargeAnchorV106(
  facing: PitWorkbookFacingV106,
): PitWorkbookChargeAnchorV106 | undefined {
  const direction = nativeFacing(facing);
  if (!direction) return undefined;
  return getPitWorkbookEntitySourceV106('scar', 'S3')?.chargeAnchors?.find(anchor => anchor.facing === direction);
}

/** Pit coordinates have an upward-positive y axis and an actor pivot at the
 * supporting feet. Keeping the native page reference preserves pose height. */
export function projectPitWorkbookAnchorV106(
  anchor: Pick<PitWorkbookProjectileAnchorV106, 'point' | 'pivot' | 'bodyHeightPx' | 'railSpacingPx' | 'contactOffsetPx'>,
  x: number, y: number, bodyHeight: number,
): {x: number; y: number; railSpacing: number} | null {
  if (![x, y, bodyHeight].every(Number.isFinite) || bodyHeight <= 0) return null;
  const scale = bodyHeight / anchor.bodyHeightPx;
  return {x: x + (anchor.point[0] - anchor.pivot[0]) * scale,
    y: y + (anchor.pivot[1] - anchor.point[1] - anchor.contactOffsetPx) * scale,
    railSpacing: (anchor.railSpacingPx ?? 0) * scale};
}

export function projectPitWorkbookShieldV106(
  shield: PitWorkbookShieldGeometryV106, x: number, y: number, bodyHeight: number,
): {x: number; y: number; width: number; height: number} | null {
  if (![x, y, bodyHeight].every(Number.isFinite) || bodyHeight <= 0) return null;
  const scale = bodyHeight / shield.bodyHeightPx;
  return {x: x + (shield.bounds[0] - shield.pivot[0]) * scale,
    y: y + (shield.pivot[1] - shield.bounds[1] - shield.bounds[3] - shield.contactOffsetPx) * scale,
    width: shield.bounds[2] * scale, height: shield.bounds[3] * scale};
}
