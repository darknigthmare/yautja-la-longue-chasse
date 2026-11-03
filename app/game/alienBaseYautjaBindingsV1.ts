/**
 * Offline project-local binding for Alien Base canonical identity records.
 * Origin: darknigthmare/alien_base PR #21 (consolidated on #8, #4),
 * data/bindings.v1.json at d2ff9fef4df40934f35796b9fe361e65315d1ac2.
 * No GitHub fetch at runtime; never imports combat stats, artwork or save IDs.
 */
export const ALIEN_BASE_HUNTER_IDS_V1 = Object.freeze({
  "jungle-hunter": "character.yautja.jungle_hunter",
  "city-hunter": "character.yautja.city_hunter",
  "wolf": "character.yautja.wolf_predator",
  "feral-hunter": "character.yautja.feral_predator",
  "alpha": "character.yautja.alpha_predator",
  "samurai": "character.yautja.samurai_predator",
  "scar": "character.yautja.scar_avp_2004",
  "celtic": "character.yautja.celtic_avp_2004",
  "chopper": "character.yautja.chopper_avp_2004",
  "berserker": "character.yautja.berserker_2010",
  "falconer": "character.yautja.falconer_2010",
  "tracker": "character.yautja.tracker_2010",
  "fugitive": "character.yautja.fugitive_2018",
  "dek": "character.yautja.dek_badlands_2025",
  "kwei": "character.yautja.kwei_badlands_2025"
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
