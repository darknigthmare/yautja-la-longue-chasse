/**
 * Runtime catalogue for the OpenAI V6 sprite atlases.
 *
 * The source atlases stay immutable. Each entry below exposes one isolated,
 * padded rectangle so React and Canvas callers can render a real object
 * without leaking neighbouring cells into the frame.
 */

import type {
  BiomaskId,
  GearId,
  LaserColorId,
  MissionId,
  RankId,
  TrophyPartId,
  WeaponId,
} from "./types";

export const V6_ATLASES = {
  ships: {
    src: "/game/sprites/v6/ships-atlas.png",
    width: 1536,
    height: 1024,
  },
  prey: {
    src: "/game/sprites/v6/prey-atlas.png",
    width: 1536,
    height: 1024,
  },
  equipment: {
    src: "/game/sprites/v6/equipment-atlas.png",
    width: 1448,
    height: 1086,
  },
  "masks-trophies": {
    src: "/game/sprites/v6/masks-trophies-atlas.png",
    width: 1536,
    height: 1024,
  },
  "ranks-lasers": {
    src: "/game/sprites/v6/ranks-lasers-atlas.png",
    width: 1536,
    height: 1024,
  },
} as const;

export type V6AtlasId = keyof typeof V6_ATLASES;

export type V6VisualKind =
  | "ship"
  | "prey"
  | "weapon"
  | "gear"
  | "equipment"
  | "mask"
  | "trophy"
  | "rank"
  | "laser";

export interface V6CropRectangle {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
}

export interface V6VisualCellDefinition {
  readonly atlasId: V6AtlasId;
  readonly kind: V6VisualKind;
  readonly label: string;
  readonly crop: V6CropRectangle;
}

/**
 * Pixel rectangles were measured against the deployed transparent PNGs.
 * Regular atlases use hard cell boundaries; the asymmetrical ship sheet uses
 * padded hand-measured rectangles around each silhouette.
 */
export const V6_VISUAL_CELLS = {
  // Ships: one clan capital ship and two independent lower-row craft.
  "ship-clan-dreadnought": {
    atlasId: "ships",
    kind: "ship",
    label: "Vaisseau-mère du clan",
    crop: { x: 24, y: 24, width: 1488, height: 510 },
  },
  "ship-hunting-interceptor": {
    atlasId: "ships",
    kind: "ship",
    label: "Intercepteur de chasse Yautja",
    crop: { x: 36, y: 538, width: 734, height: 410 },
  },
  "ship-extraction-dropship": {
    atlasId: "ships",
    kind: "ship",
    label: "Navette d’extraction Yautja",
    crop: { x: 807, y: 536, width: 714, height: 410 },
  },

  // Fauna: stable 2 × 2 regions split through the transparent gutters.
  "prey-thornback-ravager": {
    atlasId: "prey",
    kind: "prey",
    label: "Ravageur à épines",
    crop: { x: 0, y: 0, width: 805, height: 432 },
  },
  "prey-glacier-shellback": {
    atlasId: "prey",
    kind: "prey",
    label: "Carapacier des glaces",
    crop: { x: 805, y: 0, width: 731, height: 432 },
  },
  "prey-cindermaw-drake": {
    atlasId: "prey",
    kind: "prey",
    label: "Drake à gueule de braise",
    crop: { x: 0, y: 432, width: 805, height: 592 },
  },
  "prey-horned-grazer": {
    atlasId: "prey",
    kind: "prey",
    label: "Grand herbivore cornu",
    crop: { x: 805, y: 432, width: 731, height: 592 },
  },

  // Armory: 4 × 3 regions bounded by the actual transparent gutters.
  "equipment-audio-decoy": {
    atlasId: "equipment",
    kind: "gear",
    label: "Module de leurre audio",
    crop: { x: 20, y: 0, width: 310, height: 346 },
  },
  "weapon-combistick": {
    atlasId: "equipment",
    kind: "weapon",
    label: "Combistick télescopique",
    crop: { x: 330, y: 0, width: 410, height: 346 },
  },
  "weapon-smart-disc": {
    atlasId: "equipment",
    kind: "weapon",
    label: "Smart Disc",
    crop: { x: 740, y: 0, width: 315, height: 346 },
  },
  "gear-netgun": {
    atlasId: "equipment",
    kind: "gear",
    label: "Lance-filet",
    crop: { x: 1055, y: 0, width: 393, height: 346 },
  },
  "weapon-speargun": {
    atlasId: "equipment",
    kind: "weapon",
    label: "Fusil à harpon Yautja",
    crop: { x: 20, y: 346, width: 370, height: 344 },
  },
  "weapon-yautja-bow": {
    atlasId: "equipment",
    kind: "weapon",
    label: "Arc Yautja",
    crop: { x: 390, y: 346, width: 340, height: 344 },
  },
  "weapon-razor-whip": {
    atlasId: "equipment",
    kind: "weapon",
    label: "Fouet-lame",
    crop: { x: 730, y: 346, width: 335, height: 344 },
  },
  "weapon-wristblades": {
    atlasId: "equipment",
    kind: "weapon",
    label: "Lames de poignet",
    crop: { x: 1065, y: 346, width: 383, height: 344 },
  },
  "equipment-wrist-computer": {
    atlasId: "equipment",
    kind: "equipment",
    label: "Ordinateur de poignet ouvert",
    crop: { x: 20, y: 690, width: 345, height: 396 },
  },
  "equipment-plasma-caster": {
    atlasId: "equipment",
    kind: "equipment",
    label: "Canon plasmacaster",
    crop: { x: 365, y: 690, width: 380, height: 396 },
  },
  "equipment-plasma-caster-arm": {
    atlasId: "equipment",
    kind: "equipment",
    label: "Bras articulé du plasmacaster",
    crop: { x: 745, y: 690, width: 330, height: 396 },
  },
  "gear-proximity-mine": {
    atlasId: "equipment",
    kind: "gear",
    label: "Piège de proximité",
    crop: { x: 1075, y: 690, width: 373, height: 396 },
  },

  // Biomasks: first two rows, split between the measured silhouettes.
  "mask-hunter-bronze": {
    atlasId: "masks-trophies",
    kind: "mask",
    label: "Biomask Hunter bronze",
    crop: { x: 0, y: 0, width: 360, height: 342 },
  },
  "mask-scarred-bone": {
    atlasId: "masks-trophies",
    kind: "mask",
    label: "Biomask osseux scarifié",
    crop: { x: 360, y: 0, width: 330, height: 342 },
  },
  "mask-scout-teal": {
    atlasId: "masks-trophies",
    kind: "mask",
    label: "Biomask Scout turquoise",
    crop: { x: 690, y: 0, width: 335, height: 342 },
  },
  "mask-elite-crown": {
    atlasId: "masks-trophies",
    kind: "mask",
    label: "Biomask couronné d’élite",
    crop: { x: 1025, y: 0, width: 511, height: 342 },
  },
  "mask-ritual-bone": {
    atlasId: "masks-trophies",
    kind: "mask",
    label: "Biomask rituel en os",
    crop: { x: 0, y: 342, width: 350, height: 327 },
  },
  "mask-city-gunmetal": {
    atlasId: "masks-trophies",
    kind: "mask",
    label: "Biomask urbain gunmetal",
    crop: { x: 350, y: 342, width: 330, height: 327 },
  },
  "mask-elder-runes": {
    atlasId: "masks-trophies",
    kind: "mask",
    label: "Biomask Elder gravé de runes",
    crop: { x: 680, y: 342, width: 345, height: 327 },
  },
  "mask-stalker-obsidian": {
    atlasId: "masks-trophies",
    kind: "mask",
    label: "Biomask Stalker obsidienne",
    crop: { x: 1025, y: 342, width: 511, height: 327 },
  },

  // Trophy plaques: bottom row, kept separate from all masks.
  "trophy-horned-skull": {
    atlasId: "masks-trophies",
    kind: "trophy",
    label: "Crâne cornu sur plaque rituelle",
    crop: { x: 0, y: 669, width: 370, height: 355 },
  },
  "trophy-drake-skull": {
    atlasId: "masks-trophies",
    kind: "trophy",
    label: "Crâne de drake sur plaque rituelle",
    crop: { x: 370, y: 669, width: 355, height: 355 },
  },
  "trophy-fanged-skull": {
    atlasId: "masks-trophies",
    kind: "trophy",
    label: "Crâne à défenses sur plaque rituelle",
    crop: { x: 725, y: 669, width: 360, height: 355 },
  },
  "trophy-skull-spine-plaque": {
    atlasId: "masks-trophies",
    kind: "trophy",
    label: "Crâne et colonne sur plaque rituelle",
    crop: { x: 1085, y: 669, width: 451, height: 355 },
  },

  // Seven independent caste emblems above the laser bands.
  "rank-initiate": {
    atlasId: "ranks-lasers",
    kind: "rank",
    label: "Caste Initié",
    crop: { x: 0, y: 0, width: 213, height: 350 },
  },
  "rank-young-blood": {
    atlasId: "ranks-lasers",
    kind: "rank",
    label: "Rang Young Blood",
    crop: { x: 213, y: 0, width: 214, height: 350 },
  },
  "rank-blooded": {
    atlasId: "ranks-lasers",
    kind: "rank",
    label: "Rang Blooded",
    crop: { x: 427, y: 0, width: 214, height: 350 },
  },
  "rank-hunter": {
    atlasId: "ranks-lasers",
    kind: "rank",
    label: "Caste Hunter",
    crop: { x: 641, y: 0, width: 229, height: 350 },
  },
  "rank-elite": {
    atlasId: "ranks-lasers",
    kind: "rank",
    label: "Rang Elite",
    crop: { x: 870, y: 0, width: 206, height: 350 },
  },
  "rank-elder": {
    atlasId: "ranks-lasers",
    kind: "rank",
    label: "Rang Elder",
    crop: { x: 1076, y: 0, width: 219, height: 350 },
  },
  "rank-clan-leader": {
    atlasId: "ranks-lasers",
    kind: "rank",
    label: "Caste chef de clan",
    crop: { x: 1295, y: 0, width: 241, height: 350 },
  },

  // Five full-width optical bands; the vertical bounds never overlap.
  "laser-crimson": {
    atlasId: "ranks-lasers",
    kind: "laser",
    label: "Faisceau plasma cramoisi",
    crop: { x: 0, y: 350, width: 1536, height: 143 },
  },
  "laser-electric": {
    atlasId: "ranks-lasers",
    kind: "laser",
    label: "Faisceau plasma électrique",
    crop: { x: 0, y: 493, width: 1536, height: 111 },
  },
  "laser-amber": {
    atlasId: "ranks-lasers",
    kind: "laser",
    label: "Faisceau plasma ambre",
    crop: { x: 0, y: 604, width: 1536, height: 112 },
  },
  "laser-violet": {
    atlasId: "ranks-lasers",
    kind: "laser",
    label: "Faisceau plasma violet",
    crop: { x: 0, y: 716, width: 1536, height: 113 },
  },
  "laser-cyan": {
    atlasId: "ranks-lasers",
    kind: "laser",
    label: "Faisceau plasma cyan",
    crop: { x: 0, y: 829, width: 1536, height: 195 },
  },
} as const satisfies Readonly<Record<string, V6VisualCellDefinition>>;

export type V6VisualId = keyof typeof V6_VISUAL_CELLS;

export const V6_ALL_VISUAL_IDS = Object.freeze(
  Object.keys(V6_VISUAL_CELLS) as V6VisualId[],
);

export function isV6VisualId(value: string): value is V6VisualId {
  return Object.prototype.hasOwnProperty.call(V6_VISUAL_CELLS, value);
}

export function getV6Visual(id: V6VisualId): V6VisualCellDefinition {
  return V6_VISUAL_CELLS[id];
}

export const V6_SHIP_VISUAL_BY_ROLE = {
  clanHub: "ship-clan-dreadnought",
  huntTravel: "ship-hunting-interceptor",
  extraction: "ship-extraction-dropship",
} as const satisfies Readonly<Record<string, V6VisualId>>;

export const V6_WEAPON_VISUAL_BY_ID = {
  wristblades: "weapon-wristblades",
  combistick: "weapon-combistick",
  "plasma-caster": "equipment-plasma-caster",
  "smart-disc": "weapon-smart-disc",
  "yautja-bow": "weapon-yautja-bow",
} as const satisfies Readonly<Record<WeaponId, V6VisualId>>;

export const V6_GEAR_VISUAL_BY_ID = {
  netgun: "gear-netgun",
  "motion-sensor": "equipment-wrist-computer",
  "audio-decoy": "equipment-audio-decoy",
  snare: "gear-proximity-mine",
} as const satisfies Readonly<Record<GearId, V6VisualId>>;

/** The cannon and its movable support remain two independently renderable cells. */
export const V6_PLASMA_CASTER_ASSEMBLY = {
  cannonId: "equipment-plasma-caster",
  articulatedArmId: "equipment-plasma-caster-arm",
} as const satisfies Readonly<Record<string, V6VisualId>>;

export const V6_ARMORY_RACK_ORDER = [
  "equipment-audio-decoy",
  "weapon-combistick",
  "weapon-smart-disc",
  "gear-netgun",
  "weapon-speargun",
  "weapon-yautja-bow",
  "weapon-razor-whip",
  "weapon-wristblades",
  "equipment-wrist-computer",
  "equipment-plasma-caster",
  "equipment-plasma-caster-arm",
  "gear-proximity-mine",
] as const satisfies readonly V6VisualId[];

export const V6_MASK_VISUAL_BY_ID = {
  jungle: "mask-hunter-bronze",
  city: "mask-city-gunmetal",
  elder: "mask-elder-runes",
  scar: "mask-scarred-bone",
  celtic: "mask-elite-crown",
  chopper: "mask-ritual-bone",
  wolf: "mask-stalker-obsidian",
  feral: "mask-ritual-bone",
  boar: "mask-city-gunmetal",
  snake: "mask-city-gunmetal",
  falconer: "mask-stalker-obsidian",
  berserker: "mask-elite-crown",
  fugitive: "mask-scout-teal",
  dek: "mask-city-gunmetal",
  enforcer: "mask-stalker-obsidian",
} as const satisfies Readonly<Record<BiomaskId, V6VisualId>>;

export const V6_TROPHY_VISUAL_BY_PART_ID = {
  skull: "trophy-horned-skull",
  "skull-and-spine": "trophy-skull-spine-plaque",
  mask: "mask-stalker-obsidian",
  insignia: "rank-hunter",
} as const satisfies Readonly<Record<TrophyPartId, V6VisualId>>;

export const V6_TROPHY_VISUAL_BY_DEFINITION_ID: Readonly<
  Record<string, V6VisualId>
> = {
  "trophy-vey": "rank-hunter",
  "trophy-cryostalker": "trophy-horned-skull",
  "trophy-bad-blood": "mask-stalker-obsidian",
};

/**
 * Resolves the identity of the physical claim. Definition mappings win over
 * generic anatomy so named trophies never regress to an unrelated skull.
 */
export function resolveV6TrophyVisualId(
  trophy: Readonly<{ definitionId?: string | null; partId: TrophyPartId }>,
): V6VisualId {
  return (
    (trophy.definitionId
      ? V6_TROPHY_VISUAL_BY_DEFINITION_ID[trophy.definitionId]
      : undefined) ?? V6_TROPHY_VISUAL_BY_PART_ID[trophy.partId]
  );
}

export const V6_TROPHY_GALLERY_ORDER = [
  "trophy-horned-skull",
  "trophy-drake-skull",
  "trophy-fanged-skull",
  "trophy-skull-spine-plaque",
] as const satisfies readonly V6VisualId[];

export const V6_PREY_GALLERY_ORDER = [
  "prey-thornback-ravager",
  "prey-glacier-shellback",
  "prey-cindermaw-drake",
  "prey-horned-grazer",
] as const satisfies readonly V6VisualId[];

export const V6_RANK_VISUAL_BY_ID = {
  "young-blood": "rank-young-blood",
  blooded: "rank-blooded",
  elite: "rank-elite",
  elder: "rank-elder",
} as const satisfies Readonly<Record<RankId, V6VisualId>>;

export const V6_RANK_AND_CASTE_ORDER = [
  "rank-initiate",
  "rank-young-blood",
  "rank-blooded",
  "rank-hunter",
  "rank-elite",
  "rank-elder",
  "rank-clan-leader",
] as const satisfies readonly V6VisualId[];

export const V6_LASER_VISUAL_BY_COLOR_ID = {
  crimson: "laser-crimson",
  electric: "laser-electric",
  amber: "laser-amber",
  violet: "laser-violet",
  cyan: "laser-cyan",
} as const satisfies Readonly<Record<LaserColorId, V6VisualId>>;

export interface V6MissionVisualSet {
  readonly faunaId: V6VisualId;
  readonly trophyId: V6VisualId;
  readonly arrivalShipId: V6VisualId;
  readonly extractionShipId: V6VisualId;
}

/**
 * Mission mappings deliberately call the creatures "fauna": the jungle
 * mission still targets a human and the volcano mission a Bad Blood.
 */
export const V6_MISSION_VISUALS = {
  "jungle-vey": {
    faunaId: "prey-thornback-ravager",
    trophyId: "rank-hunter",
    arrivalShipId: "ship-hunting-interceptor",
    extractionShipId: "ship-extraction-dropship",
  },
  "ice-cryostalker": {
    faunaId: "prey-glacier-shellback",
    trophyId: "trophy-horned-skull",
    arrivalShipId: "ship-hunting-interceptor",
    extractionShipId: "ship-extraction-dropship",
  },
  "volcano-bad-blood": {
    faunaId: "prey-cindermaw-drake",
    trophyId: "mask-stalker-obsidian",
    arrivalShipId: "ship-hunting-interceptor",
    extractionShipId: "ship-extraction-dropship",
  },
  "swamp-hydra": {
    faunaId: "prey-thornback-ravager",
    trophyId: "trophy-horned-skull",
    arrivalShipId: "ship-hunting-interceptor",
    extractionShipId: "ship-extraction-dropship",
  },
  "desert-sandmaw": {
    faunaId: "prey-cindermaw-drake",
    trophyId: "trophy-fanged-skull",
    arrivalShipId: "ship-hunting-interceptor",
    extractionShipId: "ship-extraction-dropship",
  },
  "ocean-leviathan": {
    faunaId: "prey-glacier-shellback",
    trophyId: "trophy-horned-skull",
    arrivalShipId: "ship-hunting-interceptor",
    extractionShipId: "ship-extraction-dropship",
  },
  "fungal-hivemind": {
    faunaId: "prey-thornback-ravager",
    trophyId: "trophy-skull-spine-plaque",
    arrivalShipId: "ship-hunting-interceptor",
    extractionShipId: "ship-extraction-dropship",
  },
  "ruins-ancient-guardian": {
    faunaId: "prey-cindermaw-drake",
    trophyId: "mask-elder-runes",
    arrivalShipId: "ship-hunting-interceptor",
    extractionShipId: "ship-extraction-dropship",
  },
} as const satisfies Readonly<Record<MissionId, V6MissionVisualSet>>;

export const V6_VISUAL_COUNTS = Object.freeze(
  V6_ALL_VISUAL_IDS.reduce<Record<V6VisualKind, number>>(
    (counts, id) => {
      counts[V6_VISUAL_CELLS[id].kind] += 1;
      return counts;
    },
    {
      ship: 0,
      prey: 0,
      weapon: 0,
      gear: 0,
      equipment: 0,
      mask: 0,
      trophy: 0,
      rank: 0,
      laser: 0,
    },
  ),
);
