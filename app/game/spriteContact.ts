/** Contact registration reads alpha, never edits source pixels or combat coordinates. */
export interface SpriteContact {
  readonly left: number;
  readonly right: number;
  readonly supportY: number;
  readonly offsetY: number;
}
type Rect = readonly [number, number, number, number];
type Source = HTMLImageElement | HTMLCanvasElement;
const cache = new WeakMap<Source, Map<string, SpriteContact | null>>();

/** Ignore faint antialias fringes and isolated pixels; preserve deliberate raised poses. */
export function measureSpriteContact(pixels: ArrayLike<number>, width: number, height: number, pivotY: number): SpriteContact | null {
  if (!Number.isSafeInteger(width) || !Number.isSafeInteger(height) || width <= 0 || height <= 0 ||
    pixels.length !== width * height * 4 || !Number.isFinite(pivotY)) return null;
  let supportY = -1;
  const minimumPixels = Math.max(2, Math.min(8, Math.ceil(width * .003)));
  for (let y = height - 1; y >= 0; y--) {
    let count = 0;
    for (let x = 0; x < width; x++) if (pixels[(y * width + x) * 4 + 3] >= 128) count++;
    if (count >= minimumPixels) { supportY = y; break; }
  }
  if (supportY < 0) return null;
  const band = Math.max(2, Math.min(40, Math.ceil(height * .025)));
  let left = width, right = -1;
  for (let y = Math.max(0, supportY - band); y <= supportY; y++) for (let x = 0; x < width; x++) {
    if (pixels[(y * width + x) * 4 + 3] >= 128) { left = Math.min(left, x); right = Math.max(right, x); }
  }
  const supportEdgeY = supportY + 1;
  const gap = pivotY - supportEdgeY;
  // Only sub-2%-of-cell fringe padding is adjusted. Knees/airborne drawings keep their authored origin.
  const offsetY = gap >= 0 && gap <= height * .02 ? gap : 0;
  return right >= left ? { left, right, supportY: supportEdgeY, offsetY } : null;
}

/** One cached read per cell, including failed readback. No per-frame pixel processing. */
export function getSpriteContact(source: Source, rect: Rect, pivotY: number): SpriteContact | null {
  let entries = cache.get(source);
  if (!entries) { entries = new Map(); cache.set(source, entries); }
  const key = [...rect, pivotY].join(',');
  if (entries.has(key)) return entries.get(key)!;
  let contact: SpriteContact | null = null;
  let scratch: HTMLCanvasElement | null = null;
  try {
    const [x, y, width, height] = rect;
    if (typeof document !== 'undefined') {
      scratch = document.createElement('canvas'); scratch.width = width; scratch.height = height;
      const context = scratch.getContext('2d', { willReadFrequently: true });
      if (context) {
        context.drawImage(source, x, y, width, height, 0, 0, width, height);
        contact = measureSpriteContact(context.getImageData(0, 0, width, height).data, width, height, pivotY);
      }
    }
  } catch { /* A failed readback keeps the reviewed authored pivot; never prevents drawing. */ }
  finally { if (scratch) { scratch.width = 0; scratch.height = 0; } }
  entries.set(key, contact); return contact;
}

/** Ground shadows stay on the support plane while an airborne actor rises away. */
export function drawActorContactShadow(context: CanvasRenderingContext2D, x: number, supportY: number,
  halfWidth: number, elevation = 0, opacity = 1): void {
  if (![x, supportY, halfWidth, elevation, opacity].every(Number.isFinite) || halfWidth <= 0) return;
  const lift = Math.max(0, elevation), radius = halfWidth * Math.max(.42, 1 - lift / 360);
  context.save();
  context.fillStyle = '#080706';
  context.globalAlpha *= Math.max(0, Math.min(1, opacity)) * Math.max(.08, .28 - lift / 600);
  context.beginPath(); context.ellipse(x, supportY + 1, radius + 3, Math.max(2, halfWidth * .08), 0, 0, Math.PI * 2); context.fill();
  if (lift < 3) {
    context.globalAlpha *= 1.8;
    context.beginPath(); context.ellipse(x, supportY + .6, radius, 1.25, 0, 0, Math.PI * 2); context.fill();
  }
  context.restore();
}
