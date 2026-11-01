/**
 * Offline project-local binding for Alien Base canonical identity records.
 * Origin: darknigthmare/alien_base PR #8 (descendant of PR #4),
 * data/bindings.v1.json at 557f7ca2bc245e0d85a31dd1b7cdca69c99627ce.
 * No GitHub fetch at runtime; never imports combat stats, artwork or save IDs.
 */
export const ALIEN_BASE_HUNTER_IDS_V1 = Object.freeze({
  "jungle-hunter": "character.yautja.jungle_hunter",
  "city-hunter": "character.yautja.city_hunter",
  "wolf": "character.yautja.wolf_predator",
  "feral-hunter": "character.yautja.feral_predator",
  "alpha": "character.yautja.alpha_predator",
  "samurai": "character.yautja.samurai_predator"
} as const);
export const ALIEN_BASE_HUNTER_KIT_IDS_V1 = Object.freeze({
  "wristblades": "item.yautja.wristblades",
  "plasma-caster": "item.yautja.plasma_caster",
  "combistick": "item.yautja.combistick",
  "smart-disc": "item.yautja.smart_disc",
  "netgun": "item.yautja.netgun"
} as const);
export const getAlienBaseHunterIdentityV1 = (id: string): string | null =>
  Object.hasOwn(ALIEN_BASE_HUNTER_IDS_V1, id)
    ? ALIEN_BASE_HUNTER_IDS_V1[id as keyof typeof ALIEN_BASE_HUNTER_IDS_V1]
    : null;
export const getAlienBaseHunterKitIdentityV1 = (id: string): string | null =>
  Object.hasOwn(ALIEN_BASE_HUNTER_KIT_IDS_V1, id)
    ? ALIEN_BASE_HUNTER_KIT_IDS_V1[id as keyof typeof ALIEN_BASE_HUNTER_KIT_IDS_V1]
    : null;
