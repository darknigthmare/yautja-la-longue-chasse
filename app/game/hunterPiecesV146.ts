/**
 * V146 per-piece customisation (campaign bible, "Personnalisation").
 *
 * Every modular sprite of the player can be tinted on its own, in three zones
 * (primary, secondary, accent) plus a light colour when the piece glows.
 * The V113 channel system stays the rendering fallback: until a plate ships
 * with its greyscale base and zone map, a piece's primary colour replaces the
 * channel colour for that layer only.
 */
import {
  normalizeHunterChromaticsV113,
  type ChromaticChannelV113,
  type HunterChromaticsV113,
} from "./hunterChromaticsV113.ts";

export const HUNTER_PIECE_IDS_V146 = [
  "skin", "skin-pattern", "eyes", "mandibles", "scars", "warpaint",
  "dreads", "jewelry", "biomask",
  "chest", "shoulder", "belt", "thigh", "knee", "shin", "bracer", "fishnet",
  "gauntlet", "wristblades", "caster", "cape", "trophies", "weapons",
] as const;
export type HunterPieceIdV146 = (typeof HUNTER_PIECE_IDS_V146)[number];

export type PieceZoneV146 = "primary" | "secondary" | "accent";

export interface HunterPieceDefinitionV146 {
  readonly id: HunterPieceIdV146;
  readonly label: string;
  readonly group: "corps" | "tete" | "armure" | "equipement";
  /** V113 channel used as rendering fallback; null = no tinted layer yet. */
  readonly channel: ChromaticChannelV113 | null;
  /** Zone names as written in the bible table; null = zone unused. */
  readonly zones: Readonly<Record<PieceZoneV146, string | null>>;
  /** Name of the glowing part, null when the piece never glows. */
  readonly light: string | null;
}

const z = (primary: string, secondary: string | null, accent: string | null) =>
  Object.freeze({ primary, secondary, accent });

export const HUNTER_PIECES_V146: readonly HunterPieceDefinitionV146[] = Object.freeze([
  { id: "skin", label: "Peau", group: "corps", channel: "skin", zones: z("Couleur de base", "Ventre et intérieur des membres", "Rebords des plaques de peau"), light: null },
  { id: "skin-pattern", label: "Motif de peau", group: "corps", channel: null, zones: z("Couleur des taches", "Deuxième couleur du motif", null), light: null },
  { id: "eyes", label: "Yeux", group: "tete", channel: null, zones: z("Iris", null, null), light: "Lueur des yeux" },
  { id: "mandibles", label: "Mandibules", group: "tete", channel: null, zones: z("Mandibules", null, null), light: null },
  { id: "scars", label: "Cicatrices", group: "corps", channel: null, zones: z("Couleur de la cicatrice", null, null), light: null },
  { id: "warpaint", label: "Peinture de guerre", group: "corps", channel: null, zones: z("Couleur de la peinture", null, null), light: null },
  { id: "dreads", label: "Dreads", group: "tete", channel: "dreads", zones: z("Mèches", "Pointes", "Anneaux et attaches"), light: null },
  { id: "jewelry", label: "Bijoux", group: "corps", channel: null, zones: z("Métal ou os", "Pierres", "Liens"), light: null },
  { id: "biomask", label: "Biomasque", group: "tete", channel: "biomask", zones: z("Coque", "Plaques de rebord", "Gravures"), light: "Verres et laser" },
  { id: "chest", label: "Plastron", group: "armure", channel: "armor", zones: z("Plaques", "Sangles", "Rivets et gravures"), light: null },
  { id: "shoulder", label: "Épaulette", group: "armure", channel: "armor", zones: z("Plaque", "Sangle", "Gravures"), light: null },
  { id: "belt", label: "Ceinture et pagne", group: "armure", channel: "armor", zones: z("Ceinture", "Pagne", "Boucles"), light: null },
  { id: "thigh", label: "Cuissard", group: "armure", channel: "armor", zones: z("Plaque", "Sangles", "Rivets"), light: null },
  { id: "knee", label: "Genouillère", group: "armure", channel: "armor", zones: z("Plaque", "Sangles", "Rivets"), light: null },
  { id: "shin", label: "Jambières", group: "armure", channel: "armor", zones: z("Plaque", "Sangles", "Gravures"), light: null },
  { id: "bracer", label: "Brassard d'avant-bras", group: "armure", channel: "armor", zones: z("Plaque", "Sangles", "Rivets"), light: null },
  { id: "fishnet", label: "Filet", group: "armure", channel: "outfit", zones: z("Mailles", null, null), light: null },
  { id: "gauntlet", label: "Ordinateur de poignet", group: "equipement", channel: null, zones: z("Boîtier", "Couvercle", "Rivets"), light: "Écran, glyphes, hologrammes" },
  { id: "wristblades", label: "Lames de poignet", group: "equipement", channel: null, zones: z("Logement", "Lames", "Rivets"), light: "Lames chauffées" },
  { id: "caster", label: "Canon d'épaule", group: "equipement", channel: null, zones: z("Coque", "Bras articulé", "Bouche"), light: "Plasma" },
  { id: "cape", label: "Cape", group: "equipement", channel: null, zones: z("Étoffe", "Doublure", "Franges ou chaîne"), light: null },
  { id: "trophies", label: "Trophées portés", group: "equipement", channel: null, zones: z("Patine de l'os", "Liens", null), light: null },
  { id: "weapons", label: "Armes", group: "equipement", channel: null, zones: z("Corps de l'arme", "Poignée", "Gravures"), light: "Plasma, énergie" },
] satisfies HunterPieceDefinitionV146[]);

export function hunterPieceV146(id: HunterPieceIdV146): HunterPieceDefinitionV146 {
  const piece = HUNTER_PIECES_V146.find(item => item.id === id);
  if (!piece) throw new Error(`Unknown hunter piece ${id}`);
  return piece;
}

export interface PieceColorsV146 {
  primary: string | null;
  secondary: string | null;
  accent: string | null;
  light: string | null;
}
export type HunterPieceColorsV146 = Partial<Record<HunterPieceIdV146, PieceColorsV146>>;

/** Every glowing effect the player can recolour. Null keeps the authored colour. */
export const HUNTER_LIGHT_IDS_V146 = [
  "laser", "plasma", "display", "eyes", "lenses", "cloak", "shield", "hologram",
] as const;
export type HunterLightIdV146 = (typeof HUNTER_LIGHT_IDS_V146)[number];
export type HunterLightsV146 = Partial<Record<HunterLightIdV146, string>>;
export const HUNTER_LIGHT_LABELS_V146: Readonly<Record<HunterLightIdV146, string>> = Object.freeze({
  laser: "Laser de visée (3 points)",
  plasma: "Plasma et tirs d'énergie",
  display: "Écran du brassard et glyphes",
  eyes: "Yeux",
  lenses: "Verres du masque",
  cloak: "Reflet du camouflage optique",
  shield: "Bouclier",
  hologram: "Hologrammes",
});

const HEX = /^#[0-9a-f]{6}$/i;
export function normalizeHexV146(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  if (/^#[0-9a-f]{3}$/i.test(trimmed)) {
    return ("#" + [...trimmed.slice(1)].map(c => c + c).join("")).toLowerCase();
  }
  return HEX.test(trimmed) ? trimmed.toLowerCase() : null;
}

const isRecord = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);

export function normalizePieceColorsV146(source: unknown): HunterPieceColorsV146 {
  const result: HunterPieceColorsV146 = {};
  if (!isRecord(source)) return result;
  for (const id of HUNTER_PIECE_IDS_V146) {
    const raw = source[id];
    if (!isRecord(raw)) continue;
    const def = hunterPieceV146(id);
    const colors: PieceColorsV146 = {
      primary: normalizeHexV146(raw.primary),
      secondary: def.zones.secondary ? normalizeHexV146(raw.secondary) : null,
      accent: def.zones.accent ? normalizeHexV146(raw.accent) : null,
      light: def.light ? normalizeHexV146(raw.light) : null,
    };
    if (colors.primary || colors.secondary || colors.accent || colors.light) result[id] = colors;
  }
  return result;
}

export function normalizeLightsV146(source: unknown): HunterLightsV146 {
  const result: HunterLightsV146 = {};
  if (!isRecord(source)) return result;
  for (const id of HUNTER_LIGHT_IDS_V146) {
    const hex = normalizeHexV146(source[id]);
    if (hex) result[id] = hex;
  }
  return result;
}

export function hasCustomPiecesV146(
  pieces: HunterPieceColorsV146 | undefined, lights?: HunterLightsV146,
): boolean {
  return Object.keys(pieces ?? {}).length > 0 || Object.keys(lights ?? {}).length > 0;
}

const CHANNEL_COLOR_KEY: Readonly<Record<ChromaticChannelV113, keyof HunterChromaticsV113>> = {
  skin: "skinHex", dreads: "dreadHex", outfit: "outfitHex", armor: "armorHex", biomask: "maskHex",
};

/**
 * Save migration: a V113 channel colour becomes the primary colour of every
 * piece of that channel, unless the piece already has its own primary colour.
 */
export function migrateChannelColorsV146(
  chromatics: unknown, pieces: HunterPieceColorsV146,
): HunterPieceColorsV146 {
  const base = normalizeHunterChromaticsV113(chromatics);
  const result: HunterPieceColorsV146 = { ...pieces };
  for (const piece of HUNTER_PIECES_V146) {
    if (!piece.channel) continue;
    const hex = base[CHANNEL_COLOR_KEY[piece.channel]];
    const current = result[piece.id];
    if (typeof hex !== "string" || current?.primary) continue;
    result[piece.id] = {
      primary: hex, secondary: current?.secondary ?? null,
      accent: current?.accent ?? null, light: current?.light ?? null,
    };
  }
  return result;
}

/**
 * Rendering bridge for plates that still use the V113 single-colour tint:
 * returns the appearance chromatics with the piece primary in place of the
 * channel colour. Material, decals and mask identity are untouched.
 */
export function chromaticsForPieceV146(
  appearance: { chromaticsV113?: unknown; piecesV146?: unknown },
  pieceId: HunterPieceIdV146,
): HunterChromaticsV113 {
  const base = normalizeHunterChromaticsV113(appearance.chromaticsV113);
  const piece = hunterPieceV146(pieceId);
  if (!piece.channel || !isRecord(appearance.piecesV146)) return base;
  const raw = appearance.piecesV146[pieceId];
  const primary = isRecord(raw) ? normalizeHexV146(raw.primary) : null;
  if (!primary) return base;
  return { ...base, [CHANNEL_COLOR_KEY[piece.channel]]: primary };
}

/** Rig armour slot (renderers) to customisable piece. */
export const ARMOR_SLOT_PIECE_V146 = Object.freeze({
  chest: "chest", shoulder: "shoulder", belt: "belt", thigh: "thigh",
  "thigh-lower": "shin", shin: "shin", knee: "knee", bracer: "bracer",
} as const satisfies Record<string, HunterPieceIdV146>);
/** Accepts a slot name ("thigh-lower") or an armour module id ("chest-avp"). */
export function pieceForArmorSlotV146(slot: string): HunterPieceIdV146 | null {
  const table = ARMOR_SLOT_PIECE_V146 as Record<string, HunterPieceIdV146>;
  if (table[slot]) return table[slot];
  const family = slot.split("-")[0];
  return family === "chest" || family === "shoulder" ? family : null;
}

/** A recoloured light, or the authored colour when the player kept it. */
export function lightColorV146(
  appearance: { lightsV146?: unknown }, light: HunterLightIdV146, authored: string,
): string {
  if (!isRecord(appearance.lightsV146)) return authored;
  return normalizeHexV146(appearance.lightsV146[light]) ?? authored;
}

// ---------------------------------------------------------------------------
// Zone recolouring (greyscale base + zone map + light map, bible format)
// ---------------------------------------------------------------------------

export function hexToRgbV146(hex: string): [number, number, number] {
  const safe = normalizeHexV146(hex) ?? "#808080";
  return [1, 3, 5].map(i => parseInt(safe.slice(i, i + 2), 16)) as [number, number, number];
}

export interface ZoneRecolorInputV146 {
  /** RGBA of the greyscale base. Its alpha is the sprite silhouette. */
  readonly base: Uint8ClampedArray;
  /** RGBA zone map: red primary, green secondary, blue accent, black fixed. */
  readonly zones: Uint8ClampedArray;
  /** Optional RGBA light map: white where the piece emits light. */
  readonly light?: Uint8ClampedArray | null;
  readonly colors: PieceColorsV146;
  /** Colour used when a zone has no player colour (authored default). */
  readonly fallback?: Partial<Record<PieceZoneV146, string>>;
}

/**
 * Luminance-preserving tint: a 50 % grey pixel takes exactly the chosen
 * colour, darker greys shade it and lighter greys push it toward white, so
 * the plate keeps its volumes. Pixels outside every zone are copied as is.
 */
export function recolorZonesV146(input: ZoneRecolorInputV146): Uint8ClampedArray {
  const { base, zones, light, colors, fallback = {} } = input;
  if (zones.length !== base.length || (light && light.length !== base.length)) {
    throw new Error("Zone and light maps must match the base size");
  }
  const tint = (zone: PieceZoneV146) => {
    const hex = colors[zone] ?? fallback[zone];
    return hex ? hexToRgbV146(hex) : null;
  };
  const tints = [tint("primary"), tint("secondary"), tint("accent")] as const;
  const glow = colors.light ? hexToRgbV146(colors.light) : null;
  const out = new Uint8ClampedArray(base);
  for (let i = 0; i < base.length; i += 4) {
    if (base[i + 3] === 0) continue;
    const grey = (base[i] + base[i + 1] + base[i + 2]) / 3 / 255;
    const weights = [zones[i], zones[i + 1], zones[i + 2]];
    const total = weights[0] + weights[1] + weights[2];
    if (total > 0) {
      let r = 0, g = 0, b = 0, used = 0;
      for (let k = 0; k < 3; k++) {
        const color = tints[k];
        if (!weights[k] || !color) continue;
        const w = weights[k] / total;
        used += w;
        for (let c = 0; c < 3; c++) {
          const shaded = grey <= .5
            ? color[c] * grey * 2
            : color[c] + (255 - color[c]) * (grey - .5) * 2;
          if (c === 0) r += shaded * w; else if (c === 1) g += shaded * w; else b += shaded * w;
        }
      }
      if (used > 0) {
        const keep = 1 - used;
        out[i] = r + base[i] * keep;
        out[i + 1] = g + base[i + 1] * keep;
        out[i + 2] = b + base[i + 2] * keep;
      }
    }
    if (glow && light) {
      const amount = light[i + 3] === 0 ? 0 : (light[i] + light[i + 1] + light[i + 2]) / 765;
      if (amount > 0) {
        for (let c = 0; c < 3; c++) {
          out[i + c] = out[i + c] * (1 - amount) + Math.min(255, glow[c] * (.6 + grey * .8)) * amount;
        }
      }
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Multiplayer readability
// ---------------------------------------------------------------------------

export function relativeLuminanceV146(hex: string): number {
  const [r, g, b] = hexToRgbV146(hex).map(v => {
    const c = v / 255;
    return c <= .03928 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4;
  });
  return .2126 * r + .7152 * g + .0722 * b;
}

/** Minimum luminance applied to colours other players see (bible: proposé). */
export const MP_MINIMUM_LUMINANCE_V146 = 0.06;
/** Fixed team markers, independent of the player's colours. */
export const MP_TEAM_OUTLINE_V146 = Object.freeze({ ally: "#3ad1ff", enemy: "#ff4a3a" });

export function readableForOthersV146(hex: string, minimum = MP_MINIMUM_LUMINANCE_V146): string {
  const safe = normalizeHexV146(hex) ?? "#808080";
  if (relativeLuminanceV146(safe) >= minimum) return safe;
  const [r, g, b] = hexToRgbV146(safe);
  for (let t = .05; t <= 1.0001; t += .05) {
    const mixed = [r, g, b].map(v => Math.round(v + (255 - v) * t));
    const candidate = "#" + mixed.map(v => v.toString(16).padStart(2, "0")).join("");
    if (relativeLuminanceV146(candidate) >= minimum) return candidate;
  }
  return "#ffffff";
}

export function readablePiecesForOthersV146(pieces: HunterPieceColorsV146): HunterPieceColorsV146 {
  const out: HunterPieceColorsV146 = {};
  for (const [id, colors] of Object.entries(pieces) as [HunterPieceIdV146, PieceColorsV146][]) {
    out[id] = {
      primary: colors.primary ? readableForOthersV146(colors.primary) : null,
      secondary: colors.secondary ? readableForOthersV146(colors.secondary) : null,
      accent: colors.accent ? readableForOthersV146(colors.accent) : null,
      light: colors.light,
    };
  }
  return out;
}
