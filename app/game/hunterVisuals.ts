/**
 * Stable public paths for the layered Yautja hunter artwork.
 *
 * Keeping the paths in one registry lets menus, mission previews and the
 * Canvas runtime share the same visual vocabulary without coupling their
 * rendering implementations.
 */

export const HUNTER_ASSET_ROOT =
  "/game/assets/v2/actors/yautja/hunter" as const;

export const HUNTER_VISUALS_V2 = {
  body: {
    base: `${HUNTER_ASSET_ROOT}/body/base.webp`,
  },
  dreads: {
    classic: `${HUNTER_ASSET_ROOT}/dreads/classic.webp`,
    braided: `${HUNTER_ASSET_ROOT}/dreads/braided.webp`,
    elder: `${HUNTER_ASSET_ROOT}/dreads/elder.webp`,
  },
  masks: {
    hunter: `${HUNTER_ASSET_ROOT}/masks/hunter.webp`,
    jungle: `${HUNTER_ASSET_ROOT}/masks/jungle.webp`,
    scarred: `${HUNTER_ASSET_ROOT}/masks/scarred.webp`,
    elder: `${HUNTER_ASSET_ROOT}/masks/elder.webp`,
  },
  armor: {
    scout: `${HUNTER_ASSET_ROOT}/armor/scout.webp`,
    hunter: `${HUNTER_ASSET_ROOT}/armor/hunter.webp`,
    berserker: `${HUNTER_ASSET_ROOT}/armor/berserker.webp`,
  },
  equipment: {
    gauntlet: {
      closed: `${HUNTER_ASSET_ROOT}/equipment/gauntlet-closed.webp`,
      open: `${HUNTER_ASSET_ROOT}/equipment/gauntlet-open.webp`,
    },
    plasmaCaster: `${HUNTER_ASSET_ROOT}/equipment/plasma-caster.webp`,
    wristblades: {
      retracted: `${HUNTER_ASSET_ROOT}/equipment/wristblades-retracted.webp`,
      extended: `${HUNTER_ASSET_ROOT}/equipment/wristblades-extended.webp`,
    },
  },
  trophies: {
    skullSpine: `${HUNTER_ASSET_ROOT}/trophies/skull-spine.webp`,
  },
} as const;

export const HUNTER_VISUALS = HUNTER_VISUALS_V2;

export type HunterDreadVisualId = keyof typeof HUNTER_VISUALS_V2.dreads;
export type HunterMaskVisualId = keyof typeof HUNTER_VISUALS_V2.masks;
export type HunterGauntletVisualState =
  keyof typeof HUNTER_VISUALS_V2.equipment.gauntlet;
export type HunterWristbladeVisualState =
  keyof typeof HUNTER_VISUALS_V2.equipment.wristblades;
