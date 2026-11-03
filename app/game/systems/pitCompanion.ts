import type { PitEditionTechniqueDefinition } from './pitFirstEdition';

export const PIT_HOUND_VARIANTS = [
  { id: 'tracker-hound', name: 'Hellhound — crête dorsale' },
  { id: 'hellhound-longhorn', name: 'Hellhound — longues cornes' },
] as const;
export type PitHoundVariantId = typeof PIT_HOUND_VARIANTS[number]['id'];
export function isPitHoundVariantId(value: unknown): value is PitHoundVariantId {
  return typeof value === 'string' && PIT_HOUND_VARIANTS.some(variant => variant.id === value);
}

/** A duel technique, never a recruited campaign companion or a default ship module. */
export const PIT_TRACKER_HOUND: PitEditionTechniqueDefinition = Object.freeze({
  id: 'tracker-hound-2010', device: 'hound', contactEffect: 'strike',
  motion: 'returning', trigger: 'contact', lifetimeFrames: 210, armFrames: 24,
  speed: 5.2, returnFrame: 120, width: 92, height: 46, verticalOffset: 0,
  damageScale: 1, chipScale: 0, hitstunBonus: 2, blockstunBonus: 0,
  pushbackScale: 1, guardBreak: false, knockdown: false, ownerDashSpeed: 0,
  maxHits: 1, rehitFrames: 6, status: null, statusFrames: 0,
  movementScale: 1, jumpLocked: false, cloakLocked: false,
});

/** Immutable published recipe: V4–V6 recordings keep their original counter. */
export const PIT_TRACKER_LEGACY_COUNTER: PitEditionTechniqueDefinition = Object.freeze({
  id: 'tracker-gauntlet-counter', device: 'counter-blade', contactEffect: 'strike',
  motion: 'attached', trigger: 'counter', lifetimeFrames: 18, armFrames: 0,
  speed: 0, returnFrame: null, width: 52, height: 68, verticalOffset: 28,
  damageScale: 1, chipScale: 0, hitstunBonus: 2, blockstunBonus: 0,
  pushbackScale: 1, guardBreak: false, knockdown: false, ownerDashSpeed: 0,
  maxHits: 1, rehitFrames: 0, status: null, statusFrames: 0,
  movementScale: 1, jumpLocked: false, cloakLocked: false,
});
