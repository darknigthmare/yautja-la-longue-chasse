import type { PitEditionTechniqueDefinition } from './pitFirstEdition';

/** Published V4–V8 recipe. Never reinterpret a saved trap as a flying bolt. */
export const PIT_FERAL_LEGACY_TRAP: PitEditionTechniqueDefinition = Object.freeze({
  id: 'feral-bolt-trap', device: 'bolt-trap', contactEffect: 'strike', motion: 'stationary', trigger: 'contact',
  lifetimeFrames: 180, armFrames: 7, speed: 0, returnFrame: null, width: 70, height: 24, verticalOffset: 0,
  damageScale: .8, chipScale: 1, hitstunBonus: 0, blockstunBonus: 0, pushbackScale: 1,
  guardBreak: false, knockdown: false, ownerDashSpeed: 0, maxHits: 1, rehitFrames: 0,
  status: 'pinned', statusFrames: 90, movementScale: .48, jumpLocked: true, cloakLocked: false,
});

/** V54 workbook 05_MOVES_PROPOSES!P10: physical bolts, acquired point, no plasma.
 * Timings and damage remain duel adaptations, not measurements of the film.
 */
export const PIT_FERAL_GUIDED_BOLTS: PitEditionTechniqueDefinition = Object.freeze({
  ...PIT_FERAL_LEGACY_TRAP,
  id: 'feral-guided-bolts-v58', device: 'bolt', motion: 'linear',
  lifetimeFrames: 90, armFrames: 0, speed: 14, width: 22, height: 5, verticalOffset: 58,
  damageScale: .34, chipScale: .34, pushbackScale: .35,
  status: null, statusFrames: 0, movementScale: 1, jumpLocked: false,
});

/** Explicit reviewed costume IDs; never infer equipment from a translated label. */
export const PIT_FERAL_UNMASKED_VARIANTS = Object.freeze([
  'feral-sans-casque-75100c4c5e',
  'feral-bear-blood-sans-casque-2eb5851afc',
  'feral-camo-reveal-sans-casque-8b307ed73e',
] as const);

export function pitFeralHasTargetingMask(variantId?: string | null): boolean {
  return !PIT_FERAL_UNMASKED_VARIANTS.some(id => id === variantId);
}

export interface PitFeralBoltFlight {
  readonly volleyId: number;
  readonly index: 0 | 1 | 2;
  readonly guided: boolean;
  readonly targetX: number;
  readonly targetY: number;
  readonly velocityX: number;
  readonly velocityY: number;
}
