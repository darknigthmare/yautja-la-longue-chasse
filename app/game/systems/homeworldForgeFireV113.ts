/** Existing painted Pit flame frames, reused for one Homeworld hearth.
 * Source presence and this binding do not grant human artistic admission. */
export const HOMEWORLD_FORGE_FIRE_V113 = {
  targetId: 'target-v81-63-141',
  buildingId: 'deep-forge',
  buildingSource: '/game/homeworld/v72/civic-identity-atlas.png',
  buildingCell: {x: 0, y: 512, width: 520, height: 512},
  framesPerSecond: 8,
  reducedMotionFrame: 0,
  // Authored aperture coordinates are local to the original V72 cell.
  // The mask keeps the existing hood and front lip in front of the fire.
  aperture: '140,381 141,356 150,343 165,341 177,350 184,381',
  hearthAnchor: {x: 162, y: 381},
  flameScaleInBuildingPixels: 0.064,
  sourceWidth: 1536,
  sourceHeight: 1024,
  status: 'EXISTING_NATIVE_REUSE_CANDIDATE_NOT_HUMAN_ADMITTED',
} as const;

/** These original PNGs remain intact. Hot-core baselines were measured on
 * their native pixels (R>245,G>190,B<160,A>128), not translated PNG copies. */
export const HOMEWORLD_FORGE_FIRE_FRAMES_V113 = [
  {src: '/game/sprites/v33/pit-arenas/the-pit/p3-c-brazier-flame-f00.png', pivot: {x: 762, y: 811}, sha256: 'c7e2903e1ff3021b8a81fb36817769716b68d6c920f1e76811b9ed78d2a4357d'},
  {src: '/game/sprites/v33/pit-arenas/the-pit/p3-c-brazier-flame-f01.png', pivot: {x: 778, y: 880}, sha256: '6dbb39f0d2b2a54cd74463ee54136446a5cb4a676e29d6da138d70fe39d7ff0b'},
  {src: '/game/sprites/v33/pit-arenas/the-pit/p3-c-brazier-flame-f02.png', pivot: {x: 777, y: 853}, sha256: 'b8afc945c9021d55216bd117ae2b2751cc30153fafd176d09adf9d277b9fba86'},
  {src: '/game/sprites/v33/pit-arenas/the-pit/p3-c-brazier-flame-f03.png', pivot: {x: 790, y: 871}, sha256: 'cf27819e6f2934263fbe939865f013ad53f5cc8e8aafb423bf379f81d7c8e8d5'},
  {src: '/game/sprites/v33/pit-arenas/the-pit/p3-c-brazier-flame-f04.png', pivot: {x: 784, y: 826}, sha256: '321b1b1eb34c2e131ec7a37bce3ffec5ef51aaa215a1d7e067d127ccd9e46a22'},
  {src: '/game/sprites/v33/pit-arenas/the-pit/p3-c-brazier-flame-f05.png', pivot: {x: 825, y: 873}, sha256: 'bc7e020f0a13b8bd652656c8667a35d72422ebc18ffbdf0e31079d190e819721'},
] as const;

export interface HomeworldForgeBuildingV113 {
  readonly id: string;
  readonly art: {readonly src: string; readonly sourceRect?: {readonly x: number; readonly y: number; readonly width: number; readonly height: number}};
}
export function homeworldForgeFireFrameV113(seconds: number, reducedMotion = false): number {
  return reducedMotion || !Number.isFinite(seconds) || seconds < 0 ? 0
    : Math.floor(seconds * HOMEWORLD_FORGE_FIRE_V113.framesPerSecond) % HOMEWORLD_FORGE_FIRE_FRAMES_V113.length;
}
export function homeworldForgeFireCompatibleV113(building: HomeworldForgeBuildingV113, width: number, height: number): boolean {
  const expected = HOMEWORLD_FORGE_FIRE_V113, cell = building.art.sourceRect;
  return building.id === expected.buildingId && building.art.src === expected.buildingSource && !!cell
    && cell.x === expected.buildingCell.x && cell.y === expected.buildingCell.y
    && cell.width === expected.buildingCell.width && cell.height === expected.buildingCell.height
    && Number.isFinite(width) && width > 0 && Number.isFinite(height) && height > 0
    && Math.abs(width / cell.width - height / cell.height) < 0.000001;
}
export function homeworldForgeFireImageV113(frameIndex: number) {
  const frame = HOMEWORLD_FORGE_FIRE_FRAMES_V113[frameIndex] ?? HOMEWORLD_FORGE_FIRE_FRAMES_V113[0];
  const source = HOMEWORLD_FORGE_FIRE_V113, scale = source.flameScaleInBuildingPixels;
  return {src: frame.src, x: source.hearthAnchor.x - frame.pivot.x * scale,
    y: source.hearthAnchor.y - frame.pivot.y * scale,
    width: source.sourceWidth * scale, height: source.sourceHeight * scale};
}
