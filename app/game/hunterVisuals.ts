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
import { preservedBiomaskV62, referenceBiomaskV62, referenceBiomaskPathV62 } from "./biomaskCatalogueV62.ts";
import { conceptBiomaskV133 } from "./conceptBiomasksV133.ts";
import {conceptMaskRigPlacementV137} from "./conceptMaskFitV137.ts";
import { hunterHeadArtV62, type HunterLayerPlacement } from "./hunterHeadArtV62.ts";

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
  headStyleId: "reference" | "legacy-clan" = "reference",
): string {
  if (partId === "head" && headStyleId !== "legacy-clan") return hunterHeadArtV62(morphId).path;
  return `${HUNTER_ASSET_ROOT_V3}/body/${morphId}/parts/${partId}.webp`;
}

export function hunterBodyPartPlacement(morphId: HunterBodyMorphId, partId: HunterBodyPartId, headStyleId: "reference" | "legacy-clan" = "reference"): HunterLayerPlacement | undefined {
  return partId === "head" && headStyleId !== "legacy-clan" ? hunterHeadArtV62(morphId).placement : undefined;
}

export function hunterNetPartPath(
  morphId: HunterBodyMorphId,
  partId: HunterBodyPartId,
): string {
  return `${HUNTER_ASSET_ROOT_V3}/body/${morphId}/net/parts/${partId}.webp`;
}

export function hunterMaskThumbnailPath(maskId: BiomaskId): string {
  const concept=conceptBiomaskV133(maskId);
  if(concept)return concept.assetPath;
  const referencePath = referenceBiomaskPathV62(maskId);
  if (referencePath) return referencePath;
  const preserved = preservedBiomaskV62(maskId);
  if (preserved) return `${HUNTER_ASSET_ROOT_V3}/masks/${preserved.legacyMaskId}.webp`;
  return `${HUNTER_ASSET_ROOT_V3}/masks/${maskId}.webp`;
}

export function hunterMaskRigPath(maskId: BiomaskId): string {
  const concept=conceptBiomaskV133(maskId);
  if(concept)return concept.assetPath;
  const referencePath = referenceBiomaskPathV62(maskId);
  if (referencePath) return referencePath;
  const preserved = preservedBiomaskV62(maskId);
  if (preserved) return `${HUNTER_ASSET_ROOT_V3}/masks/registered/${preserved.legacyMaskId}.webp`;
  return `${HUNTER_ASSET_ROOT_V3}/masks/registered/${maskId}.webp`;
}

/** Native V62 alpha cutouts keep their original pixels; layout aligns them to the V3 head socket. */
export function hunterMaskRigPlacement(maskId: BiomaskId) {
  return conceptMaskRigPlacementV137(maskId)
    ?? referenceBiomaskV62(maskId)?.placement
    ?? {x:0,y:0,width:256,height:384};
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

export const HUNTER_GAUNTLET_HINGE = { x: 51, y: 202 } as const;

/**
 * V145 arm assignment (user decision, 6 Nov 2026): wristblades on the BACK
 * (background) forearm, wrist computer on the FRONT forearm — always on
 * opposite arms, as in the films.
 *
 * Wristblade registration on the back forearm. The source housing and blades
 * were drawn horizontally (blades toward +x, housing top toward -y). The
 * bind-pose back forearm runs from the elbow (55,149) to the wrist (45,219).
 * The art is flipped vertically, so its top faces outward (back of the wrist),
 * turned onto that axis and seated on the lower forearm; the blades then
 * extend past the hand along the arm. Per-morph offsets reuse
 * HUNTER_GAUNTLET_FIT_BY_MORPH, measured on the same back forearm.
 * Applied after the armBackLower bone and before the blade slide (256x384).
 */
export const HUNTER_WRISTBLADE_REGISTRATION = {
  pivot: { x: 198, y: 211 },
  rotation: Math.atan2(219 - 149, 45 - 55),
  flipY: true,
  target: { x: 47.8, y: 199.4 },
} as const;

/** Same fit as an affine matrix (a, b, c, d, e, f) for DOM and Canvas renderers. */
export function hunterWristbladeRegistrationMatrix(morphId: HunterBodyMorphId = "classic"): { a: number; b: number; c: number; d: number; e: number; f: number } {
  const { pivot, rotation, flipY, target } = HUNTER_WRISTBLADE_REGISTRATION;
  const fit = HUNTER_GAUNTLET_FIT_BY_MORPH[morphId];
  const cos = Math.cos(rotation), sin = Math.sin(rotation), fy = flipY ? -1 : 1;
  // T(target + morph) * R * F, applied to (p - pivot).
  const a = cos, b = sin, c = -sin * fy, d = cos * fy;
  return {
    a, b, c, d,
    e: target.x + fit.translateX - a * pivot.x - c * pivot.y,
    f: target.y + fit.translateY - 3 - b * pivot.x - d * pivot.y,
  };
}

export const HUNTER_GAUNTLET_FIT_BY_MORPH: Readonly<
  Record<HunterBodyMorphId, { translateX: number; translateY: number }>
> = {
  classic: { translateX: 1, translateY: 3 },
  elder: { translateX: 0, translateY: 3 },
  super: { translateX: -10, translateY: 3 },
  feral: { translateX: -2, translateY: 3 },
  huntress: { translateX: 2, translateY: 3 },
  young: { translateX: 1, translateY: 3 },
};

export const HUNTER_ARMOR_FIT_BY_MORPH: Readonly<
  Record<HunterBodyMorphId, { shoulderScale: number }>
> = {
  classic: { shoulderScale: 1 },
  elder: { shoulderScale: 0.96 },
  super: { shoulderScale: 1 },
  feral: { shoulderScale: 0.96 },
  huntress: { shoulderScale: 0.88 },
  young: { shoulderScale: 0.86 },
};

type AffineV145 = { a: number; b: number; c: number; d: number; e: number; f: number };
const multiplyV145 = (l: AffineV145, r: AffineV145): AffineV145 => ({
  a: l.a * r.a + l.c * r.b, b: l.b * r.a + l.d * r.b,
  c: l.a * r.c + l.c * r.d, d: l.b * r.c + l.d * r.d,
  e: l.a * r.e + l.c * r.f + l.e, f: l.b * r.e + l.d * r.f + l.f,
});
const scaleAboutV145 = (x: number, y: number, sx: number, sy: number): AffineV145 =>
  ({ a: sx, b: 0, c: 0, d: sy, e: x - sx * x, f: y - sy * y });
const translateV145 = (x: number, y: number): AffineV145 => ({ a: 1, b: 0, c: 0, d: 1, e: x, f: y });

/**
 * V145 armour registration, measured on the 256x384 bind plates.
 *
 * Shoulder: every shoulder-* plate was drawn over the pectoral (x 122-185)
 * with its strap loop on the OUTER side. Mirrored about x 153 and moved onto
 * the front deltoid (upper-arm-front top, x 161-169 by morph), the dome caps
 * the shoulder, the flare runs down the outer arm and the strap sits toward the
 * neck, as on the Jungle Hunter's right pauldron.
 *
 * Greaves: shin + thigh-lower form one shin guard from below the knee to the
 * ankle. thigh-lower was 14 px behind the shin and is moved under the knee;
 * the shin plate is widened to the shin (25-28 px). The back leg gets the same
 * greave, shifted onto shin-back and drawn behind the body.
 */
export const HUNTER_ARMOR_REGISTRATION_V145 = {
  shoulder: {
    mirrorX: 153,
    shiftY: -2,
    shiftXByMorph: { classic: 18, elder: 20, super: 24, feral: 19, huntress: 17, young: 19 } as Record<HunterBodyMorphId, number>,
  },
  greave: {
    shinScale: { x: 1.18, y: 1.05, pivot: { x: 175, y: 312 } },
    thighLowerOffset: { x: 15, y: 4 },
    frontShiftXByMorph: { classic: 0, elder: -3, super: -1, feral: -5.5, huntress: -3.8, young: -2.9 } as Record<HunterBodyMorphId, number>,
    backShiftXByMorph: { classic: -94.5, elder: -96.8, super: -97.9, feral: -104.5, huntress: -99, young: -98.8 } as Record<HunterBodyMorphId, number>,
    backShiftY: 4,
  },
} as const;

/** Detached stray pixels inside some registered plates (source-space rects x, y, w, h to KEEP). */
export const HUNTER_ARMOR_KEEP_CLIP_V145: Readonly<Record<string, readonly (readonly [number, number, number, number])[]>> = {
  "shoulder-avp": [[0, 0, 256, 132]],
  "shoulder-super": [[0, 0, 256, 135]],
  shin: [[0, 0, 200, 384]],
};

/** Mirror + move + per-morph scale for any shoulder-* plate, relative to armFrontUpper. */
export function hunterShoulderPlateMatrixV145(morphId: HunterBodyMorphId): AffineV145 {
  const { mirrorX, shiftY, shiftXByMorph } = HUNTER_ARMOR_REGISTRATION_V145.shoulder;
  const shiftX = shiftXByMorph[morphId];
  const mirror: AffineV145 = { a: -1, b: 0, c: 0, d: 1, e: 2 * mirrorX, f: 0 };
  const scale = HUNTER_ARMOR_FIT_BY_MORPH[morphId].shoulderScale;
  return multiplyV145(scaleAboutV145(mirrorX + shiftX, 110 + shiftY, scale, scale),
    multiplyV145(translateV145(shiftX, shiftY), mirror));
}

/** Greave plate registration, relative to legFrontLower (front) or legBackLower (back). */
export function hunterGreaveMatrixV145(morphId: HunterBodyMorphId, part: "shin" | "thigh-lower", side: "front" | "back"): AffineV145 {
  const g = HUNTER_ARMOR_REGISTRATION_V145.greave;
  const local = part === "shin"
    ? scaleAboutV145(g.shinScale.pivot.x, g.shinScale.pivot.y, g.shinScale.x, g.shinScale.y)
    : translateV145(g.thighLowerOffset.x, g.thighLowerOffset.y);
  const shift = side === "front"
    ? translateV145(g.frontShiftXByMorph[morphId], 0)
    : translateV145(g.backShiftXByMorph[morphId], g.backShiftY);
  return multiplyV145(shift, local);
}

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
