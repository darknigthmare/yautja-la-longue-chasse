/**
 * V148: three visible zones on the EXISTING colour plates.
 *
 * The bible format (greyscale base + authored zone map) needs new art. Until
 * those plates exist, zones are derived from each plate's own shading:
 *   - secondary = darkest part (straps, recesses),
 *   - accent    = brightest part (rivets, edges, engravings),
 *   - primary   = everything in between (the plate itself).
 * Each zone is re-centred on its own median brightness, so the chosen colour
 * is shown faithfully (a pale colour works on a black sprite) while the
 * plate's volumes are kept. Zones the player left alone keep their original
 * pixels. This is provisional: an authored zone map always wins when present.
 */
import {
  hexToRgbV146, normalizeHexV146, normalizePieceColorsV146,
  type HunterPieceIdV146, type PieceColorsV146,
} from "./hunterPiecesV146.ts";

/** Share of opaque pixels given to the dark (secondary) and bright (accent) zones. */
export const AUTO_ZONE_DARK_SHARE_V148 = 0.22;
export const AUTO_ZONE_BRIGHT_SHARE_V148 = 0.12;
/** Half-width of the soft edge between two zones, in luminance (0..1). */
export const AUTO_ZONE_FEATHER_V148 = 0.035;

const luminance = (r: number, g: number, b: number) => (0.299 * r + 0.587 * g + 0.114 * b) / 255;
const smooth = (edge: number, value: number, feather: number) => {
  const t = Math.max(0, Math.min(1, (value - (edge - feather)) / (2 * feather)));
  return t * t * (3 - 2 * t);
};

export interface AutoZoneStatsV148 {
  /** Luminance thresholds between secondary|primary and primary|accent. */
  readonly darkEdge: number;
  readonly brightEdge: number;
  /** Median luminance of each zone: [secondary, primary, accent]. */
  readonly medians: readonly [number, number, number];
  readonly opaquePixels: number;
}

/** Histogram-based zone thresholds for one plate. */
export function autoZoneStatsV148(rgba: Uint8ClampedArray): AutoZoneStatsV148 {
  const histogram = new Uint32Array(256);
  let opaque = 0;
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] < 16) continue;
    histogram[Math.round(luminance(rgba[i], rgba[i + 1], rgba[i + 2]) * 255)]++;
    opaque++;
  }
  if (!opaque) return { darkEdge: 0.25, brightEdge: 0.75, medians: [0.15, 0.5, 0.85], opaquePixels: 0 };
  const percentile = (share: number, from = 0, to = 255) => {
    let total = 0;
    for (let v = from; v <= to; v++) total += histogram[v];
    let seen = 0;
    for (let v = from; v <= to; v++) {
      seen += histogram[v];
      if (seen >= total * share) return v / 255;
    }
    return to / 255;
  };
  let darkEdge = percentile(AUTO_ZONE_DARK_SHARE_V148);
  let brightEdge = percentile(1 - AUTO_ZONE_BRIGHT_SHARE_V148);
  // Flat plates: keep the three zones apart so each stays selectable.
  if (brightEdge - darkEdge < 4 * AUTO_ZONE_FEATHER_V148) {
    const middle = (darkEdge + brightEdge) / 2;
    darkEdge = middle - 2 * AUTO_ZONE_FEATHER_V148;
    brightEdge = middle + 2 * AUTO_ZONE_FEATHER_V148;
  }
  const d = Math.max(0, Math.round(darkEdge * 255)), b = Math.min(255, Math.round(brightEdge * 255));
  const medians: [number, number, number] = [
    percentile(0.5, 0, Math.max(0, d - 1)),
    percentile(0.5, d, Math.max(d, b - 1)),
    percentile(0.5, b, 255),
  ];
  return { darkEdge, brightEdge, medians, opaquePixels: opaque };
}

/** Zone weights [secondary, primary, accent] of a pixel, summing to 1. */
export function autoZoneWeightsV148(lum: number, stats: AutoZoneStatsV148): [number, number, number] {
  const aboveDark = smooth(stats.darkEdge, lum, AUTO_ZONE_FEATHER_V148);
  const aboveBright = smooth(stats.brightEdge, lum, AUTO_ZONE_FEATHER_V148);
  return [1 - aboveDark, aboveDark * (1 - aboveBright), aboveDark * aboveBright];
}

/** Luminance re-centred on a zone median: the median maps to exactly 0.5. */
function recentred(lum: number, median: number): number {
  const m = Math.min(0.98, Math.max(0.02, median));
  return lum <= m ? 0.5 * lum / m : 0.5 + 0.5 * (lum - m) / (1 - m);
}

/** Shading strength kept inside a zone (1 = full original contrast). */
const ZONE_CONTRAST_V148 = 0.85;

function shade(color: readonly [number, number, number], grey: number, channel: number): number {
  const g = 0.5 + (grey - 0.5) * ZONE_CONTRAST_V148;
  return g <= 0.5 ? color[channel] * g * 2 : color[channel] + (255 - color[channel]) * (g - 0.5) * 2;
}

export function hasZoneColorsV148(colors: PieceColorsV146 | undefined | null): boolean {
  return !!colors && !!(colors.primary || colors.secondary || colors.accent);
}

/**
 * Recolours one plate in place of its original pixels. Zones without a
 * player colour keep the plate's own colours; alpha is never changed.
 */
export function recolorPlateAutoV148(
  rgba: Uint8ClampedArray, colors: PieceColorsV146, precomputed?: AutoZoneStatsV148,
  /** Overlay mode: pixels of zones without a colour become transparent. */
  untintedTransparent = false,
): Uint8ClampedArray {
  const out = new Uint8ClampedArray(rgba);
  if (!hasZoneColorsV148(colors)) return out;
  const stats = precomputed ?? autoZoneStatsV148(rgba);
  if (!stats.opaquePixels) return out;
  const tint = (hex: string | null) => (hex && normalizeHexV146(hex) ? hexToRgbV146(hex) : null);
  // Index order matches autoZoneWeightsV148: secondary, primary, accent.
  const tints = [tint(colors.secondary), tint(colors.primary), tint(colors.accent)] as const;
  for (let i = 0; i < rgba.length; i += 4) {
    if (rgba[i + 3] === 0) continue;
    const lum = luminance(rgba[i], rgba[i + 1], rgba[i + 2]);
    const weights = autoZoneWeightsV148(lum, stats);
    let r = 0, g = 0, b = 0, tinted = 0;
    for (let zone = 0; zone < 3; zone++) {
      const w = weights[zone];
      if (!w) continue;
      const color = tints[zone];
      if (color) {
        const grey = recentred(lum, stats.medians[zone]);
        r += shade(color, grey, 0) * w; g += shade(color, grey, 1) * w; b += shade(color, grey, 2) * w;
        tinted += w;
      } else if (!untintedTransparent) {
        r += rgba[i] * w; g += rgba[i + 1] * w; b += rgba[i + 2] * w;
      }
    }
    if (untintedTransparent) {
      if (tinted <= 0) { out[i + 3] = 0; continue; }
      out[i] = r / tinted; out[i + 1] = g / tinted; out[i + 2] = b / tinted;
      out[i + 3] = rgba[i + 3] * tinted;
      continue;
    }
    out[i] = r; out[i + 1] = g; out[i + 2] = b;
  }
  return out;
}

/** The zone colours a piece wears, or null when the player set none. */
export function pieceZoneColorsV148(
  appearance: { piecesV146?: unknown } | null | undefined, piece: HunterPieceIdV146 | null | undefined,
): PieceColorsV146 | null {
  if (!appearance || !piece) return null;
  const colors = normalizePieceColorsV146(appearance.piecesV146)[piece];
  return hasZoneColorsV148(colors) ? colors! : null;
}

// ---------------------------------------------------------------------------
// Canvas helper (browser only)
// ---------------------------------------------------------------------------

type Placement = { x: number; y: number; width: number; height: number };
const CANVAS_W = 256;
const CANVAS_H = 384;
const cache = new WeakMap<object, Map<string, HTMLCanvasElement>>();

/**
 * One authored bitmap mapped into the 256x384 rig frame, graded with the
 * layer's base filter, then recoloured by zones. Cached per image and colours.
 * Returns null when the piece has no zone colour or pixels cannot be read.
 */
export function pieceCanvasSourceV148(
  original: HTMLImageElement | HTMLCanvasElement,
  colors: PieceColorsV146 | null,
  placement?: Placement,
  baseFilter = "none",
): HTMLCanvasElement | null {
  if (!colors || !hasZoneColorsV148(colors) || typeof document === "undefined") return null;
  const key = [
    colors.primary ?? "", colors.secondary ?? "", colors.accent ?? "", baseFilter,
    placement ? [placement.x, placement.y, placement.width, placement.height].join(":") : "full",
  ].join("|");
  let perImage = cache.get(original);
  const hit = perImage?.get(key);
  if (hit) return hit;
  const canvas = document.createElement("canvas");
  canvas.width = CANVAS_W; canvas.height = CANVAS_H;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;
  ctx.filter = baseFilter || "none";
  ctx.drawImage(original, placement?.x ?? 0, placement?.y ?? 0, placement?.width ?? CANVAS_W, placement?.height ?? CANVAS_H);
  ctx.filter = "none";
  let pixels: ImageData;
  try { pixels = ctx.getImageData(0, 0, CANVAS_W, CANVAS_H); } catch { return null; }
  pixels.data.set(recolorPlateAutoV148(pixels.data, colors));
  ctx.putImageData(pixels, 0, 0);
  if (!perImage) { perImage = new Map(); cache.set(original, perImage); }
  if (perImage.size >= 12) perImage.clear();
  perImage.set(key, canvas);
  return canvas;
}
