/**
 * Stable public paths for the layered Yautja hunter artwork.
 *
 * Keeping the paths in one registry lets menus, mission previews and the
 * Canvas runtime share the same visual vocabulary without coupling their
 * rendering implementations.
 */

import type {
  BiomaskId,
  DreadStyleId,
  GearId,
  HunterArmorStyleId,
  HunterBodyMorphId,
  WeaponId,
} from "./types";

export const HUNTER_ASSET_ROOT =
  "/game/assets/v2/actors/yautja/hunter" as const;

export const HUNTER_ASSET_ROOT_V3 =
  "/game/assets/v3/actors/yautja/hunter" as const;

export const HUNTER_BODY_PART_IDS = [
  "head",
  "torso",
  "pelvis",
  "upper-arm-front",
  "lower-arm-front",
  "hand-front",
  "upper-arm-back",
  "lower-arm-back",
  "hand-back",
  "thigh-front",
  "shin-front",
  "foot-front",
  "thigh-back",
  "shin-back",
  "foot-back",
] as const;

export type HunterBodyPartId = (typeof HUNTER_BODY_PART_IDS)[number];

const NET_PARTS_WITHOUT_FEET = [
  "head",
  "torso",
  "pelvis",
  "upper-arm-front",
  "lower-arm-front",
  "hand-front",
  "upper-arm-back",
  "lower-arm-back",
  "hand-back",
  "thigh-front",
  "shin-front",
  "thigh-back",
  "shin-back",
] as const satisfies readonly HunterBodyPartId[];

export const HUNTER_NET_PARTS_BY_MORPH: Readonly<
  Record<HunterBodyMorphId, readonly HunterBodyPartId[]>
> = {
  classic: NET_PARTS_WITHOUT_FEET,
  elder: NET_PARTS_WITHOUT_FEET,
  super: NET_PARTS_WITHOUT_FEET,
  feral: NET_PARTS_WITHOUT_FEET,
  huntress: NET_PARTS_WITHOUT_FEET,
  young: NET_PARTS_WITHOUT_FEET,
};

export function hunterBodyPartHasNet(
  morphId: HunterBodyMorphId,
  partId: HunterBodyPartId,
): boolean {
  return HUNTER_NET_PARTS_BY_MORPH[morphId].includes(partId);
}

export const HUNTER_BODY_PART_BONES = {
  head: "head",
  torso: "torso",
  pelvis: "pelvis",
  "upper-arm-front": "armFrontUpper",
  "lower-arm-front": "armFrontLower",
  "hand-front": "handFront",
  "upper-arm-back": "armBackUpper",
  "lower-arm-back": "armBackLower",
  "hand-back": "handBack",
  "thigh-front": "legFrontUpper",
  "shin-front": "legFrontLower",
  "foot-front": "footFront",
  "thigh-back": "legBackUpper",
  "shin-back": "legBackLower",
  "foot-back": "footBack",
} as const;

export function hunterBodyFullPath(morphId: HunterBodyMorphId): string {
  return `${HUNTER_ASSET_ROOT_V3}/body/${morphId}/full.webp`;
}

export function hunterBodyPartPath(
  morphId: HunterBodyMorphId,
  partId: HunterBodyPartId,
): string {
  return `${HUNTER_ASSET_ROOT_V3}/body/${morphId}/parts/${partId}.webp`;
}

export function hunterNetPartPath(
  morphId: HunterBodyMorphId,
  partId: HunterBodyPartId,
): string {
  return `${HUNTER_ASSET_ROOT_V3}/body/${morphId}/net/parts/${partId}.webp`;
}

export function hunterMaskPath(maskId: BiomaskId): string {
  return `${HUNTER_ASSET_ROOT_V3}/masks/registered/${maskId}.webp`;
}

export function hunterDreadPath(dreadId: DreadStyleId): string {
  return `${HUNTER_ASSET_ROOT_V3}/dreads/registered/${dreadId}.webp`;
}

export function hunterArmorPath(moduleId: string): string {
  return `${HUNTER_ASSET_ROOT_V3}/armor/registered/${moduleId}.webp`;
}

export function hunterEquipmentPath(moduleId: string): string {
  return `${HUNTER_ASSET_ROOT_V3}/equipment/registered/${moduleId}.webp`;
}

export function hunterWeaponPath(moduleId: string): string {
  return `${HUNTER_ASSET_ROOT_V3}/weapons/registered/${moduleId}.webp`;
}

export function hunterGearPath(moduleId: GearId): string {
  return `${HUNTER_ASSET_ROOT_V3}/gear/registered/${moduleId}.webp`;
}

export function hunterTrophyPath(moduleId: string): string {
  return `${HUNTER_ASSET_ROOT_V3}/trophies/registered/${moduleId}.webp`;
}

export const HUNTER_ARMOR_MODULES: Readonly<
  Record<
    HunterArmorStyleId,
    {
      chest: string;
      shoulder: string;
    }
  >
> = {
  classic: { chest: "chest-classic", shoulder: "shoulder-classic" },
  city: { chest: "chest-city", shoulder: "shoulder-classic" },
  avp: { chest: "chest-avp", shoulder: "shoulder-avp" },
  super: { chest: "chest-super", shoulder: "shoulder-super" },
  feral: { chest: "chest-classic", shoulder: "shoulder-feral" },
};

export const HUNTER_EQUIPMENT_V3 = {
  plasma: {
    mount: hunterEquipmentPath("mount"),
    upperArm: hunterEquipmentPath("caster-upper"),
    lowerArm: hunterEquipmentPath("caster-lower"),
    yoke: hunterEquipmentPath("yoke"),
    cannon: hunterEquipmentPath("cannon"),
    barrel: hunterEquipmentPath("barrel"),
    muzzle: hunterEquipmentPath("muzzle"),
    laser: hunterEquipmentPath("laser"),
  },
  gauntlet: {
    base: hunterEquipmentPath("gauntlet-base"),
    lid: hunterEquipmentPath("gauntlet-lid"),
  },
  wristblades: {
    housing: hunterEquipmentPath("blade-housing"),
    blades: hunterEquipmentPath("blades"),
  },
} as const;

export const HUNTER_WEAPONS_V3 = {
  combistick: hunterWeaponPath("combistick"),
  combistickFolded: hunterWeaponPath("combistick-folded"),
  smartDisc: hunterWeaponPath("smart-disc"),
  yautjaBow: hunterWeaponPath("yautja-bow"),
  arrow: hunterWeaponPath("arrow"),
} as const satisfies Readonly<
  Record<
    | "combistick"
    | "combistickFolded"
    | "smartDisc"
    | "yautjaBow"
    | "arrow",
    string
  >
>;

export const HUNTER_GEAR_V3 = {
  netgun: hunterGearPath("netgun"),
  "motion-sensor": hunterGearPath("motion-sensor"),
  "audio-decoy": hunterGearPath("audio-decoy"),
  snare: hunterGearPath("snare"),
} as const satisfies Readonly<Record<GearId, string>>;

export const HUNTER_TROPHIES_V3 = {
  skull: hunterTrophyPath("trophy-skull"),
  spine: hunterTrophyPath("trophy-spine"),
  bindings: hunterTrophyPath("trophy-bindings"),
} as const;

export function hunterCarriedWeaponPath(
  weaponId: WeaponId,
): string | null {
  if (weaponId === "combistick") return HUNTER_WEAPONS_V3.combistick;
  if (weaponId === "smart-disc") return HUNTER_WEAPONS_V3.smartDisc;
  if (weaponId === "yautja-bow") return HUNTER_WEAPONS_V3.yautjaBow;
  return null;
}

export const HUNTER_VISUALS_V2 = {
  body: {
    base: `${HUNTER_ASSET_ROOT}/body/base.webp`,
  },
  dreads: {
    classic: `${HUNTER_ASSET_ROOT}/dreads/classic.webp`,
    ringed: `${HUNTER_ASSET_ROOT}/dreads/classic.webp`,
    braided: `${HUNTER_ASSET_ROOT}/dreads/braided.webp`,
    veteran: `${HUNTER_ASSET_ROOT}/dreads/elder.webp`,
    elder: `${HUNTER_ASSET_ROOT}/dreads/elder.webp`,
    temple: `${HUNTER_ASSET_ROOT}/dreads/braided.webp`,
    feral: `${HUNTER_ASSET_ROOT}/dreads/classic.webp`,
    huntress: `${HUNTER_ASSET_ROOT}/dreads/braided.webp`,
  },
  masks: {
    jungle: `${HUNTER_ASSET_ROOT}/masks/jungle.webp`,
    city: `${HUNTER_ASSET_ROOT}/masks/hunter.webp`,
    elder: `${HUNTER_ASSET_ROOT}/masks/elder.webp`,
    scar: `${HUNTER_ASSET_ROOT}/masks/scarred.webp`,
    celtic: `${HUNTER_ASSET_ROOT}/masks/scarred.webp`,
    chopper: `${HUNTER_ASSET_ROOT}/masks/hunter.webp`,
    wolf: `${HUNTER_ASSET_ROOT}/masks/scarred.webp`,
    feral: `${HUNTER_ASSET_ROOT}/masks/elder.webp`,
    berserker: `${HUNTER_ASSET_ROOT}/masks/hunter.webp`,
    fugitive: `${HUNTER_ASSET_ROOT}/masks/jungle.webp`,
    dek: `${HUNTER_ASSET_ROOT}/masks/elder.webp`,
    enforcer: `${HUNTER_ASSET_ROOT}/masks/scarred.webp`,
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
