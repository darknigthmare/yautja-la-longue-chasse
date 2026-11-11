/**
 * V146 campaign-level customisation state (campaign bible, "Personnalisation"):
 * saved outfits, one outfit per mode, share codes, clan palette for NPCs,
 * cosmetics earned in play, earned marks, persistent heavy wear, and the
 * solo/coop biome camouflage. Colours themselves live in the appearance
 * (`piecesV146`, `lightsV146`, `marksV146`); this module never grants combat stats.
 */
import {
  HUNTER_PIECES_V146, HUNTER_PIECE_IDS_V146, hexToRgbV146, normalizeHexV146,
  normalizeLightsV146, normalizePieceColorsV146,
  type HunterLightsV146, type HunterPieceColorsV146, type HunterPieceIdV146,
} from "../hunterPiecesV146.ts";
import { CHROMATIC_CHANNELS_V113, normalizeHunterChromaticsV113 } from "../hunterChromaticsV113.ts";

const isRecord = (v: unknown): v is Record<string, unknown> =>
  v !== null && typeof v === "object" && !Array.isArray(v);

// ---------------------------------------------------------------------------
// Earned marks
// ---------------------------------------------------------------------------

export const HUNTER_MARK_IDS_V146 = [
  "xeno-acid", "queen-blood", "duel-scar", "bad-blood", "rank-blooded", "rank-elite", "rank-elder",
] as const;
export type HunterMarkIdV146 = (typeof HUNTER_MARK_IDS_V146)[number];
export type HunterMarksDisplayV146 = Partial<Record<HunterMarkIdV146, { color: string | null }>>;

export const HUNTER_MARKS_V146: readonly {
  readonly id: HunterMarkIdV146; readonly label: string; readonly where: "biomask" | "skin";
  readonly how: string; readonly defaultColor: string;
}[] = Object.freeze([
  { id: "xeno-acid", label: "Marque du sang de Xénomorphe", where: "biomask", how: "Tuer un Xénomorphe et rapporter le trophée.", defaultColor: "#c8d48a" },
  { id: "queen-blood", label: "Marque du sang de reine", where: "biomask", how: "Rapporter un trophée de reine.", defaultColor: "#e0c35a" },
  { id: "duel-scar", label: "Cicatrices de duel", where: "skin", how: "Rapporter un trophée de Yautja.", defaultColor: "#b9a08a" },
  { id: "bad-blood", label: "Marque Bad Blood", where: "biomask", how: "Être déclaré Bad Blood par la justice du clan.", defaultColor: "#8a1f1f" },
  { id: "rank-blooded", label: "Marque de Blooded", where: "biomask", how: "Atteindre le rang Blooded.", defaultColor: "#d6d1c4" },
  { id: "rank-elite", label: "Marque d'Elite", where: "biomask", how: "Atteindre le rang Elite.", defaultColor: "#c9a24a" },
  { id: "rank-elder", label: "Marque d'Elder", where: "biomask", how: "Atteindre le rang Elder.", defaultColor: "#e8e2d0" },
]);

export function normalizeMarksDisplayV146(source: unknown): HunterMarksDisplayV146 {
  const result: HunterMarksDisplayV146 = {};
  if (!isRecord(source)) return result;
  for (const id of HUNTER_MARK_IDS_V146) {
    const raw = source[id];
    if (!isRecord(raw)) continue;
    result[id] = { color: normalizeHexV146(raw.color) };
  }
  return result;
}

// ---------------------------------------------------------------------------
// Cosmetics earned in play (colour wheel stays free)
// ---------------------------------------------------------------------------

export interface CosmeticProgressV146 {
  readonly honor: number;
  readonly rankId: "young-blood" | "blooded" | "elite" | "elder";
  readonly trophies: readonly { definitionId: string; targetKind: string; targetName: string; sourceEnemyId?: string }[];
  readonly justiceDeclaration?: string;
}

type CosmeticCondition =
  | { kind: "honor"; minimum: number }
  | { kind: "rank"; rank: CosmeticProgressV146["rankId"] }
  | { kind: "trophy"; targetKind?: string; match?: RegExp; count: number }
  | { kind: "bad-blood" };

export interface CosmeticUnlockV146 {
  readonly id: string;
  readonly category: "mark" | "pattern" | "material";
  readonly label: string;
  readonly condition: CosmeticCondition;
}

const RANK_ORDER = ["young-blood", "blooded", "elite", "elder"] as const;
const XENO = /x[ée]no|alien|drone|warrior|praetor/i;
const QUEEN = /queen|reine/i;

export const COSMETIC_UNLOCKS_V146: readonly CosmeticUnlockV146[] = Object.freeze([
  { id: "mark:xeno-acid", category: "mark", label: "Marque du sang de Xénomorphe", condition: { kind: "trophy", match: XENO, count: 1 } },
  { id: "mark:queen-blood", category: "mark", label: "Marque du sang de reine", condition: { kind: "trophy", match: QUEEN, count: 1 } },
  { id: "mark:duel-scar", category: "mark", label: "Cicatrices de duel", condition: { kind: "trophy", targetKind: "yautja", count: 1 } },
  { id: "mark:bad-blood", category: "mark", label: "Marque Bad Blood", condition: { kind: "bad-blood" } },
  { id: "mark:rank-blooded", category: "mark", label: "Marque de Blooded", condition: { kind: "rank", rank: "blooded" } },
  { id: "mark:rank-elite", category: "mark", label: "Marque d'Elite", condition: { kind: "rank", rank: "elite" } },
  { id: "mark:rank-elder", category: "mark", label: "Marque d'Elder", condition: { kind: "rank", rank: "elder" } },
  { id: "pattern:spots", category: "pattern", label: "Motif : taches", condition: { kind: "honor", minimum: 0 } },
  { id: "pattern:stripes", category: "pattern", label: "Motif : rayures", condition: { kind: "trophy", targetKind: "beast", count: 3 } },
  { id: "pattern:marbled", category: "pattern", label: "Motif : marbrures", condition: { kind: "honor", minimum: 150 } },
  { id: "pattern:scales", category: "pattern", label: "Motif : écailles", condition: { kind: "trophy", targetKind: "human", count: 5 } },
  { id: "pattern:bands", category: "pattern", label: "Motif : bandes", condition: { kind: "rank", rank: "elite" } },
  { id: "material:bone", category: "material", label: "Matière : os poli", condition: { kind: "trophy", count: 10 } },
  { id: "material:gold", category: "material", label: "Matière : or cérémoniel", condition: { kind: "rank", rank: "elder" } },
]);

export const SKIN_PATTERN_IDS_V146 = ["spots", "stripes", "marbled", "scales", "bands"] as const;
export type SkinPatternIdV146 = (typeof SKIN_PATTERN_IDS_V146)[number];

function conditionMet(condition: CosmeticCondition, progress: CosmeticProgressV146): boolean {
  switch (condition.kind) {
    case "honor": return progress.honor >= condition.minimum;
    case "rank": return RANK_ORDER.indexOf(progress.rankId) >= RANK_ORDER.indexOf(condition.rank);
    case "bad-blood": return progress.justiceDeclaration === "bad-blood";
    case "trophy": return progress.trophies.filter(trophy =>
      (!condition.targetKind || trophy.targetKind === condition.targetKind) &&
      (!condition.match || condition.match.test(
        [trophy.definitionId, trophy.targetName, trophy.sourceEnemyId ?? ""].join(" ")))).length >= condition.count;
  }
}

/** Earned cosmetics stay earned: new ones are added, none are removed. */
export function earnedCosmeticsV146(
  progress: CosmeticProgressV146, alreadyEarned: readonly string[] = [],
): string[] {
  const known = new Set(COSMETIC_UNLOCKS_V146.map(item => item.id));
  const earned = new Set(alreadyEarned.filter(id => known.has(id)));
  for (const item of COSMETIC_UNLOCKS_V146) if (conditionMet(item.condition, progress)) earned.add(item.id);
  return COSMETIC_UNLOCKS_V146.map(item => item.id).filter(id => earned.has(id));
}

/** Drops marks the player has not earned (a share code cannot grant them). */
export function allowedMarksV146(
  marks: HunterMarksDisplayV146, earned: readonly string[],
): HunterMarksDisplayV146 {
  const out: HunterMarksDisplayV146 = {};
  for (const [id, value] of Object.entries(marks) as [HunterMarkIdV146, { color: string | null }][]) {
    if (earned.includes("mark:" + id)) out[id] = value;
  }
  return out;
}

// ---------------------------------------------------------------------------
// Outfits, modes, share codes, clan palette
// ---------------------------------------------------------------------------

export const OUTFIT_SLOTS_V146 = 10;
export const CUSTOMIZATION_MODES_V146 = ["campaign", "multiplayer", "pit"] as const;
export type CustomizationModeV146 = (typeof CUSTOMIZATION_MODES_V146)[number];

/** Appearance snapshot stored in an outfit; normalised by save.ts on read. */
/** Any plain object: interfaces such as HunterAppearance have no index signature. */
export type OutfitAppearanceV146 = object;
export interface OutfitV146 {
  name: string;
  savedAt: string;
  appearance: OutfitAppearanceV146;
}

export interface ClanPaletteV146 { primary: string; secondary: string; accent: string }

export interface CustomizationV146 {
  version: 1;
  outfits: (OutfitV146 | null)[];
  modeOutfits: Record<CustomizationModeV146, number | null>;
  clanPalette: ClanPaletteV146 | null;
  earned: string[];
  /** 0 = intact, 1-3 = cracks and chips that stay until repaired at the forge. */
  heavyWear: Partial<Record<HunterPieceIdV146, number>>;
}

export function emptyCustomizationV146(): CustomizationV146 {
  return {
    version: 1,
    outfits: Array.from({ length: OUTFIT_SLOTS_V146 }, () => null),
    modeOutfits: { campaign: null, multiplayer: null, pit: null },
    clanPalette: null,
    earned: [],
    heavyWear: {},
  };
}

const MAX_WEAR = 3;

export function normalizeCustomizationV146(
  source: unknown,
  normalizeAppearance: (raw: unknown) => OutfitAppearanceV146,
): CustomizationV146 {
  const result = emptyCustomizationV146();
  if (!isRecord(source) || source.version !== 1) return result;
  if (Array.isArray(source.outfits)) {
    source.outfits.slice(0, OUTFIT_SLOTS_V146).forEach((raw, index) => {
      if (!isRecord(raw)) return;
      const name = typeof raw.name === "string" && raw.name.trim()
        ? raw.name.trim().slice(0, 40) : `Tenue ${index + 1}`;
      const savedAt = typeof raw.savedAt === "string" && Number.isFinite(Date.parse(raw.savedAt))
        ? raw.savedAt : new Date(0).toISOString();
      result.outfits[index] = { name, savedAt, appearance: normalizeAppearance(raw.appearance) };
    });
  }
  if (isRecord(source.modeOutfits)) {
    for (const mode of CUSTOMIZATION_MODES_V146) {
      const slot = source.modeOutfits[mode];
      result.modeOutfits[mode] = Number.isInteger(slot) && (slot as number) >= 0 &&
        (slot as number) < OUTFIT_SLOTS_V146 && result.outfits[slot as number] ? slot as number : null;
    }
  }
  if (isRecord(source.clanPalette)) {
    const primary = normalizeHexV146(source.clanPalette.primary);
    const secondary = normalizeHexV146(source.clanPalette.secondary);
    const accent = normalizeHexV146(source.clanPalette.accent);
    if (primary && secondary && accent) result.clanPalette = { primary, secondary, accent };
  }
  if (Array.isArray(source.earned)) {
    const known = new Set(COSMETIC_UNLOCKS_V146.map(item => item.id));
    result.earned = [...new Set(source.earned.filter((id): id is string => typeof id === "string" && known.has(id)))];
  }
  if (isRecord(source.heavyWear)) {
    for (const id of HUNTER_PIECE_IDS_V146) {
      const level = source.heavyWear[id];
      if (typeof level === "number" && Number.isFinite(level) && level > 0) {
        result.heavyWear[id] = Math.min(MAX_WEAR, Math.round(level));
      }
    }
  }
  return result;
}

export function saveOutfitV146(
  state: CustomizationV146, slot: number, name: string,
  appearance: OutfitAppearanceV146, now = new Date().toISOString(),
): CustomizationV146 {
  if (!Number.isInteger(slot) || slot < 0 || slot >= OUTFIT_SLOTS_V146) return state;
  const outfits = [...state.outfits];
  outfits[slot] = { name: name.trim().slice(0, 40) || `Tenue ${slot + 1}`, savedAt: now, appearance: structuredClone(appearance) };
  return { ...state, outfits };
}

export function deleteOutfitV146(state: CustomizationV146, slot: number): CustomizationV146 {
  if (!state.outfits[slot]) return state;
  const outfits = [...state.outfits];
  outfits[slot] = null;
  const modeOutfits = { ...state.modeOutfits };
  for (const mode of CUSTOMIZATION_MODES_V146) if (modeOutfits[mode] === slot) modeOutfits[mode] = null;
  return { ...state, outfits, modeOutfits };
}

export function assignModeOutfitV146(
  state: CustomizationV146, mode: CustomizationModeV146, slot: number | null,
): CustomizationV146 {
  if (slot !== null && !state.outfits[slot]) return state;
  return { ...state, modeOutfits: { ...state.modeOutfits, [mode]: slot } };
}

/** The outfit worn in a mode, or null to keep the current appearance. */
export function outfitForModeV146(state: CustomizationV146, mode: CustomizationModeV146): OutfitV146 | null {
  const slot = state.modeOutfits[mode];
  return slot === null ? null : state.outfits[slot] ?? null;
}

const SHARE_PREFIX = "YLC1.";

function toBase64Url(text: string): string {
  const bytes = new TextEncoder().encode(text);
  let binary = "";
  bytes.forEach(byte => { binary += String.fromCharCode(byte); });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function fromBase64Url(text: string): string {
  const padded = text.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((text.length + 3) % 4);
  const binary = atob(padded);
  return new TextDecoder().decode(Uint8Array.from(binary, c => c.charCodeAt(0)));
}

/** Share code: pieces, colours, lights, materials and module choices. */
export function encodeOutfitShareCodeV146(appearance: OutfitAppearanceV146): string {
  return SHARE_PREFIX + toBase64Url(JSON.stringify({ v: 1, a: appearance }));
}

export type ShareDecodeV146 =
  | { ok: true; appearance: OutfitAppearanceV146; replaced: string[] }
  | { ok: false; reason: "format" | "version" };

/**
 * Decodes a code for THIS player: anything not earned here (marks) is dropped
 * and listed, so the receiver sees the base piece with the shared colours.
 */
export function decodeOutfitShareCodeV146(
  code: string,
  normalizeAppearance: (raw: unknown) => OutfitAppearanceV146,
  earned: readonly string[],
): ShareDecodeV146 {
  const trimmed = code.trim();
  if (!trimmed.startsWith(SHARE_PREFIX)) return { ok: false, reason: "format" };
  let payload: unknown;
  try { payload = JSON.parse(fromBase64Url(trimmed.slice(SHARE_PREFIX.length))); }
  catch { return { ok: false, reason: "format" }; }
  if (!isRecord(payload)) return { ok: false, reason: "format" };
  if (payload.v !== 1) return { ok: false, reason: "version" };
  const appearance = normalizeAppearance(payload.a);
  const replaced: string[] = [];
  const marks = normalizeMarksDisplayV146(isRecord(payload.a) ? payload.a.marksV146 : undefined);
  const allowed = allowedMarksV146(marks, earned);
  for (const id of Object.keys(marks)) if (!(id in allowed)) replaced.push("mark:" + id);
  return { ok: true, appearance: { ...appearance, marksV146: allowed }, replaced };
}

/** Small deterministic per-NPC variation around the clan palette (bible: proposé). */
export function clanColorsForNpcV146(palette: ClanPaletteV146, npcId: string): ClanPaletteV146 {
  let hash = 2166136261;
  for (const ch of npcId) hash = Math.imul(hash ^ ch.charCodeAt(0), 16777619);
  const jitter = (hex: string, salt: number) => {
    const shift = (((hash >>> salt) & 0xff) / 255 - .5) * 0.16; // ±8 % lightness
    const rgb = hexToRgbV146(hex).map(v => Math.max(0, Math.min(255, Math.round(v + (shift > 0 ? (255 - v) : v) * shift))));
    return "#" + rgb.map(v => v.toString(16).padStart(2, "0")).join("");
  };
  return { primary: jitter(palette.primary, 0), secondary: jitter(palette.secondary, 8), accent: jitter(palette.accent, 16) };
}

/** Clan-palette pieces for an NPC of the player's clan (armour + biomask). */
export function clanNpcPiecesV146(palette: ClanPaletteV146, npcId: string): HunterPieceColorsV146 {
  const c = clanColorsForNpcV146(palette, npcId);
  const out: HunterPieceColorsV146 = {};
  for (const piece of HUNTER_PIECES_V146) {
    if (piece.group !== "armure" && piece.id !== "biomask") continue;
    out[piece.id] = { primary: c.primary, secondary: c.secondary, accent: c.accent, light: null };
  }
  // The clan cloth: the only clan colour visible on unarmoured Homeworld residents.
  out.fishnet = { primary: c.secondary, secondary: null, accent: null, light: null };
  return out;
}

// ---------------------------------------------------------------------------
// Biome camouflage (solo and coop only)
// ---------------------------------------------------------------------------

export const CAMOUFLAGE_CAP_V146 = 0.10;
export type PlayModeV146 = "solo" | "coop" | "pvp" | "pit";

function colorDistance(a: string, b: string): number {
  const x = hexToRgbV146(a), y = hexToRgbV146(b);
  return Math.hypot(x[0] - y[0], x[1] - y[1], x[2] - y[2]) / Math.hypot(255, 255, 255);
}

const VISIBLE_PIECES: readonly HunterPieceIdV146[] = [
  "skin", "chest", "shoulder", "belt", "thigh", "knee", "shin", "bracer", "fishnet", "biomask", "dreads",
];

/** Colour actually shown on a piece: its own primary, else the channel colour, else the authored one. */
export function effectivePrimaryV146(
  appearance: { chromaticsV113?: unknown; piecesV146?: unknown }, id: HunterPieceIdV146,
): string | null {
  const pieces = normalizePieceColorsV146(appearance.piecesV146);
  if (pieces[id]?.primary) return pieces[id]!.primary;
  const piece = HUNTER_PIECES_V146.find(p => p.id === id);
  if (!piece?.channel) return null;
  const chroma = normalizeHunterChromaticsV113(appearance.chromaticsV113);
  const key = ({ skin: "skinHex", dreads: "dreadHex", outfit: "outfitHex", armor: "armorHex", biomask: "maskHex" } as const)[piece.channel];
  const own = chroma[key];
  if (typeof own === "string") return own;
  return CHROMATIC_CHANNELS_V113.find(channel => channel.id === piece.channel)?.naturalHex ?? null;
}

/**
 * Multiplier applied to visual detection when the hunter is NOT cloaked.
 * 1 = no effect; down to 1 - CAMOUFLAGE_CAP_V146 when the visible colours
 * match the biome. PvP and the Pit always return 1.
 */
export function camouflageVisibilityV146(
  appearance: { chromaticsV113?: unknown; piecesV146?: unknown },
  biomePalette: readonly string[],
  mode: PlayModeV146,
): number {
  if (mode === "pvp" || mode === "pit") return 1;
  const palette = biomePalette.map(normalizeHexV146).filter((hex): hex is string => !!hex);
  if (!palette.length) return 1;
  const colors = VISIBLE_PIECES.map(id => effectivePrimaryV146(appearance, id))
    .filter((hex): hex is string => !!hex);
  if (!colors.length) return 1;
  const match = colors.reduce((sum, hex) => {
    const nearest = Math.min(...palette.map(p => colorDistance(hex, p)));
    return sum + Math.max(0, 1 - nearest / .35);
  }, 0) / colors.length;
  return 1 - CAMOUFLAGE_CAP_V146 * match;
}

// ---------------------------------------------------------------------------
// Wear
// ---------------------------------------------------------------------------

/** Mission wear (scratches, dirt, blood): 0..1 from damage taken, cleared on return. */
export function missionWearV146(damageTaken: number, maxHealth: number): number {
  if (!(maxHealth > 0) || !(damageTaken > 0)) return 0;
  return Math.min(1, damageTaken / (maxHealth * 2));
}

/** A hit of at least 20 % of max health leaves cracks on one armour piece. */
export const HEAVY_HIT_RATIO_V146 = 0.2;
const WEAR_ROTATION: readonly HunterPieceIdV146[] = ["chest", "shoulder", "shin", "thigh", "bracer", "biomask", "knee", "belt"];
export function heavyHitPieceV146(amount: number, maxHealth: number, heavyHitsSoFar: number): HunterPieceIdV146 | null {
  if (!(maxHealth > 0) || amount < maxHealth * HEAVY_HIT_RATIO_V146) return null;
  return WEAR_ROTATION[heavyHitsSoFar % WEAR_ROTATION.length];
}

export function applyHeavyWearV146(state: CustomizationV146, pieces: readonly HunterPieceIdV146[]): CustomizationV146 {
  if (!pieces.length) return state;
  const heavyWear = { ...state.heavyWear };
  for (const id of pieces) heavyWear[id] = Math.min(MAX_WEAR, (heavyWear[id] ?? 0) + 1);
  return { ...state, heavyWear };
}

/** Forge repair cost in harvested materials (bible economy: materials, not currency). */
export function repairCostV146(state: CustomizationV146, id: HunterPieceIdV146): number {
  return (state.heavyWear[id] ?? 0) * 2;
}
export function repairPieceV146(state: CustomizationV146, id: HunterPieceIdV146): CustomizationV146 {
  if (!state.heavyWear[id]) return state;
  const heavyWear = { ...state.heavyWear };
  delete heavyWear[id];
  return { ...state, heavyWear };
}

/**
 * Pays a repair with harvested materials: units are taken from the specimen
 * archive (largest stacks first). Returns null when the archive is too small.
 */
export function payRepairFromArchiveV146<T extends { count: number }>(
  archive: readonly T[], cost: number,
): T[] | null {
  if (cost <= 0) return archive.map(entry => ({ ...entry }));
  const total = archive.reduce((sum, entry) => sum + Math.max(0, entry.count), 0);
  if (total < cost) return null;
  const order = archive.map((entry, index) => ({ index, count: entry.count })).sort((a, b) => b.count - a.count);
  const next = archive.map(entry => ({ ...entry }));
  let remaining = cost;
  for (const { index } of order) {
    if (!remaining) break;
    const take = Math.min(next[index].count, remaining);
    next[index].count -= take;
    remaining -= take;
  }
  return next.filter(entry => entry.count > 0);
}

/** CSS / canvas filter for a piece given its wear (no dedicated wear plates yet). */
export function wearFilterV146(missionWear: number, heavyLevel = 0): string {
  const parts: string[] = [];
  if (missionWear > 0) parts.push(`saturate(${(1 - missionWear * .3).toFixed(3)})`, `brightness(${(1 - missionWear * .12).toFixed(3)})`);
  if (heavyLevel > 0) parts.push(`contrast(${(1 + heavyLevel * .08).toFixed(3)})`, `brightness(${(1 - heavyLevel * .07).toFixed(3)})`);
  return parts.join(" ");
}

export { normalizeLightsV146, normalizePieceColorsV146 };
export type { HunterLightsV146, HunterPieceColorsV146 };
