import source from '../data/pitWorkbookDeviceAnchorsV107.json';

export interface PitWorkbookDeviceAnchorV107 {
  readonly point: readonly number[]; readonly pivot: readonly number[]; readonly rect: readonly number[];
  readonly bodyHeightPx: number; readonly contactOffsetPx: number; readonly path: string; readonly index: number;
}
export const PIT_WORKBOOK_DEVICE_SOURCES_V107 = source;
const side = (facing: 'left' | 'right' | -1 | 1): 'left' | 'right' => {
  if (facing === 'left' || facing === -1) return 'left';
  if (facing === 'right' || facing === 1) return 'right';
  throw new Error('Unadmitted device facing');
};
export function getPitWorkbookMinePlacementV107(facing: 'left' | 'right' | -1 | 1): PitWorkbookDeviceAnchorV107 {
  return source.mine.anchors[side(facing)];
}
export function getPitWorkbookShurikenLaunchV107(facing: 'left' | 'right' | -1 | 1): PitWorkbookDeviceAnchorV107 {
  return source.shuriken.anchors[side(facing)];
}
export function projectPitWorkbookDeviceAnchorV107(anchor: PitWorkbookDeviceAnchorV107, x: number, y: number, bodyHeight: number) {
  const scale = bodyHeight / anchor.bodyHeightPx;
  return {x: x + (anchor.point[0] - anchor.pivot[0]) * scale,
    y: y + (anchor.pivot[1] - anchor.point[1] - anchor.contactOffsetPx) * scale};
}
