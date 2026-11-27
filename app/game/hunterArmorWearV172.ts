import type { HunterPieceIdV146 } from "./hunterPiecesV146";
import { HUNTER_RIG_CANVAS } from "./hunterRig";
import type { HunterLayerPlacement } from "./hunterHeadArtV62";
import type { ArmorId } from "./types";

type WearLevel = 0 | 1 | 2 | 3;
type Line = readonly (readonly [number, number])[];
type Keep = readonly (readonly [number, number, number, number])[];
export type ArmorWearV172 = { light: number; heavy: number };
const { width, height } = HUNTER_RIG_CANVAS;
const plateWear = new WeakMap<HTMLImageElement, Map<string, HTMLCanvasElement>>();
const MAX_PLATE_OVERLAYS = 6;

export function armorWearPieceIsWornV172(piece: HunterPieceIdV146, armor: ArmorId, maskWorn: boolean): boolean {
  switch (piece) {
    case "biomask": return maskWorn;
    case "chest": case "shoulder": case "belt": return true;
    case "bracer": case "thigh": case "knee": case "shin": return armor !== "scout";
    default: return false;
  }
}

function level(value: number): WearLevel {
  return (Number.isFinite(value) ? Math.min(3, Math.max(0, Math.ceil(value))) : 0) as WearLevel;
}

function stroke(context: CanvasRenderingContext2D, points: Line, color: string, thickness: number, offset = 0) {
  context.strokeStyle = color;
  context.lineWidth = thickness;
  context.beginPath();
  context.moveTo(points[0][0], points[0][1] + offset);
  for (const [x, y] of points.slice(1)) context.lineTo(x, y + offset);
  context.stroke();
}

function nearestOpaque(pixels: Uint8ClampedArray, x: number, y: number): [number, number] {
  let nearest: [number, number] = [x, y];
  let distance = Infinity;
  for (let row = 0; row < height; row++) {
    const vertical = (row - y) ** 2;
    if (vertical >= distance) continue;
    for (let column = 0; column < width; column++) {
      const metric = vertical + (column - x) ** 2;
      if (metric < distance && pixels[(row * width + column) * 4 + 3] >= 160) {
        nearest = [column, row];
        distance = metric;
      }
    }
  }
  return nearest;
}

/** Original scratches and fractures composed on the actual plate alpha in bind space.
 * The caller applies the same limb fit, clipping and animation as the intact plate. */
export function armorWearCanvasV172(image: HTMLImageElement, wear: ArmorWearV172, placement?: HunterLayerPlacement,
  keep?: Keep): HTMLCanvasElement | null {
  const light = level(wear.light), heavy = level(wear.heavy);
  if ((!light && !heavy) || !image.naturalWidth || typeof document === "undefined") return null;
  const key = JSON.stringify([light, heavy, placement, keep]);
  const overlays = plateWear.get(image) ?? new Map<string, HTMLCanvasElement>();
  const previous = overlays.get(key);
  if (previous) return previous;

  const mask = document.createElement("canvas");
  mask.width = width;
  mask.height = height;
  const silhouette = mask.getContext("2d", { willReadFrequently: true });
  if (!silhouette) return null;
  if (keep?.length) {
    silhouette.beginPath();
    for (const rect of keep) silhouette.rect(...rect);
    silhouette.clip();
  }
  silhouette.drawImage(image, placement?.x ?? 0, placement?.y ?? 0, placement?.width ?? width, placement?.height ?? height);
  let pixels: Uint8ClampedArray;
  try { pixels = silhouette.getImageData(0, 0, width, height).data; } catch { return null; }
  let left: number = width, top: number = height, right = -1, bottom = -1;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    if (pixels[(y * width + x) * 4 + 3] < 160) continue;
    left = Math.min(left, x);
    right = Math.max(right, x);
    top = Math.min(top, y);
    bottom = Math.max(bottom, y);
  }
  if (right < left || bottom < top) return null;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext("2d");
  if (!context) return null;
  context.lineJoin = "round";
  context.lineCap = "round";
  const span = Math.min(24, Math.max(4, (right - left + bottom - top) / 7));
  for (let index = 0; index < light; index++) {
    const [x, y] = nearestOpaque(pixels, left + (right - left) * (.3 + index * .21), top + (bottom - top) * (.39 + index * .09));
    stroke(context, [[x - span * .4, y + span * .22], [x + span * .4, y - span * .2]], "rgba(241,226,193,.48)", .75);
  }
  for (let index = 0; index < heavy; index++) {
    const [x, y] = nearestOpaque(pixels, left + (right - left) * (.43 + index * .16), top + (bottom - top) * (.42 + index * .15));
    const direction = index === 1 ? -1 : 1;
    const d = span * direction;
    const main: Line = [[x - d * .7, y - span * .55], [x - d * .23, y - span * .06], [x, y],
      [x + d * .13, y + span * .28], [x + d * .55, y + span * .71]];
    const fork: Line = [[x, y], [x + d * .34, y - span * .2], [x + d * .62, y - span * .14]];
    stroke(context, main, "rgba(241,220,177,.88)", 1.7, .85);
    stroke(context, fork, "rgba(241,220,177,.65)", 1.15, .6);
    stroke(context, main, "rgba(19,15,14,.95)", 1.65);
    stroke(context, fork, "rgba(19,15,14,.85)", 1.05);
  }
  context.globalCompositeOperation = "destination-in";
  context.drawImage(mask, 0, 0);
  if (overlays.size >= MAX_PLATE_OVERLAYS) {
    const oldest = overlays.keys().next();
    if (!oldest.done) overlays.delete(oldest.value);
  }
  overlays.set(key, canvas);
  plateWear.set(image, overlays);
  return canvas;
}
