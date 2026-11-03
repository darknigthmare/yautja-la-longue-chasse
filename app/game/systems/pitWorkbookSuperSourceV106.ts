import source from '../data/pitWorkbookSuperAnchorsV106.json';
import type {PitWorkbookFacingV106, PitWorkbookProjectileAnchorV106, PitWorkbookShieldGeometryV106} from './pitWorkbookProjectileSourceV106';

export type PitWorkbookSuperPhaseV106 = 'startup' | 'active' | 'recoveryMiss' | 'recoveryConfirmed';
export interface PitWorkbookSuperFrameReferenceV106 {readonly index: number; readonly durationTicks: number}
export interface PitWorkbookSuperContactGeometryV106 extends PitWorkbookShieldGeometryV106 {
  readonly drawingIndex: number;
  readonly contact: 'opening' | 'extension';
  readonly segment?: readonly [readonly [number, number], readonly [number, number]];
}
export const PIT_WORKBOOK_SUPER_SOURCES_V106 = source.entries;

const facingOf = (facing: PitWorkbookFacingV106): 'left' | 'right' | undefined =>
  facing === -1 || facing === 'left' ? 'left' : facing === 1 || facing === 'right' ? 'right' : undefined;

export function getPitWorkbookSuperFramePlanV106(fighterId: string):
  Readonly<Record<PitWorkbookSuperPhaseV106, readonly PitWorkbookSuperFrameReferenceV106[]>> | undefined {
  return source.entries.find(entry => entry.fighterId === fighterId)?.framePlan;
}

export function getPitWorkbookSuperContactGeometryV106(
  fighterId: string, facing: PitWorkbookFacingV106, contact: 'opening' | 'extension',
): PitWorkbookSuperContactGeometryV106 | undefined {
  const direction = facingOf(facing);
  if (!direction) return undefined;
  const frame = source.entries.find(entry => entry.fighterId === fighterId)?.geometry.find(
    frame => frame.facing === direction && frame.contact === contact);
  // activeFrameIndex is the single opening/full-thrust contact, not a new drawing.
  return frame ? {...frame, activeFrameIndex: 0} as unknown as PitWorkbookSuperContactGeometryV106 : undefined;
}

export function getPitWorkbookSuperProjectileAnchorV106(
  fighterId: string, facing: PitWorkbookFacingV106,
): PitWorkbookProjectileAnchorV106 | undefined {
  const direction = facingOf(facing);
  if (!direction) return undefined;
  return source.entries.find(entry => entry.fighterId === fighterId)?.anchors.find(
    frame => frame.facing === direction) as unknown as PitWorkbookProjectileAnchorV106 | undefined;
}
