import { getPitTechniqueBox, type PitCombatState, type PitTechniqueEffectState } from './systems/pitCombat';
import { PIT_FALCONER_LEGACY_DRONE, PIT_FALCONER_RECON_DRONE } from './systems/pitFalconerDrone';
import source from './data/pitFalconerDroneArtV58.json';

export type PitFalconerDronePose = 'flight' | 'return';

export interface PitFalconerDroneFrame {
  readonly pose: PitFalconerDronePose;
  readonly rect: readonly [number, number, number, number];
  /** Mechanical body centre, relative to this source rectangle. */
  readonly pivot: readonly [number, number];
  readonly alphaBounds: readonly [number, number, number, number];
}

export interface PitFalconerDroneArtDefinition {
  readonly facing: -1 | 1;
  readonly src: string;
  readonly width: number;
  readonly height: number;
  /** Measured source length used for every pose on this side, not a per-frame fit. */
  readonly referenceWidth: number;
  readonly frames: readonly PitFalconerDroneFrame[];
}

/** Independent native sides only. A missing return drawing holds the flight pose. */
export const PIT_FALCONER_DRONE_ART = source.records as unknown as readonly PitFalconerDroneArtDefinition[];
export const PIT_FALCONER_DRONE_WORLD_WIDTH = source.worldWidth;

export interface PitFalconerDroneArtBank {
  readonly images: ReadonlyMap<-1 | 1, HTMLImageElement>;
  readonly failed: boolean;
  readonly cancelled: boolean;
}

export function resolvePitFalconerDroneFrame(effect: Pick<PitTechniqueEffectState, 'direction' | 'phase'>): {
  art: PitFalconerDroneArtDefinition;
  frame: PitFalconerDroneFrame;
} | null {
  const art = PIT_FALCONER_DRONE_ART.find(record => record.facing === effect.direction);
  if (!art) return null;
  const desired = effect.phase === 'returning' ? 'return' : 'flight';
  const frame = art.frames.find(candidate => candidate.pose === desired)
    ?? art.frames.find(candidate => candidate.pose === 'flight');
  return frame ? { art, frame } : null;
}

function validDefinition(art: PitFalconerDroneArtDefinition): boolean {
  if (![-1, 1].includes(art.facing) || !art.src.startsWith('/game/sprites/v58/pit/falconer/') || !art.src.endsWith('.png')
    || !Number.isInteger(art.width) || !Number.isInteger(art.height) || art.width <= 0 || art.height <= 0
    || !Number.isFinite(art.referenceWidth) || art.referenceWidth <= 0 || art.referenceWidth > art.width
    || !art.frames.some(frame => frame.pose === 'flight')
    || new Set(art.frames.map(frame => frame.pose)).size !== art.frames.length) return false;
  return art.frames.every(frame => {
    const [x, y, width, height] = frame.rect;
    const [pivotX, pivotY] = frame.pivot;
    return ['flight', 'return'].includes(frame.pose)
      && frame.rect.every(Number.isInteger) && x >= 0 && y >= 0 && width > 0 && height > 0
      && x + width <= art.width && y + height <= art.height
      && Number.isFinite(pivotX) && Number.isFinite(pivotY)
      && pivotX >= 0 && pivotY >= 0 && pivotX <= width && pivotY <= height;
  });
}

function validImage(image: HTMLImageElement, art: PitFalconerDroneArtDefinition): boolean {
  if (!validDefinition(art) || image.naturalWidth !== art.width || image.naturalHeight !== art.height) return false;
  const canvas = document.createElement('canvas');
  canvas.width = art.width;
  canvas.height = art.height;
  try {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return false;
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, art.width, art.height).data;
    for (const frame of art.frames) {
      const [sx, sy, width, height] = frame.rect;
      let visible = false;
      let transparent = false;
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const alpha = pixels[((sy + y) * art.width + sx + x) * 4 + 3];
        transparent ||= alpha === 0;
        visible ||= alpha > 128;
        if (alpha > 16 && (x < 4 || y < 4 || x >= width - 4 || y >= height - 4)) return false;
      }
      if (!visible || !transparent) return false;
    }
    return true;
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}

/** Load once for the selected match. Late/aborted callbacks never install a partial bank. */
export async function loadPitFalconerDroneArt(options: { signal?: AbortSignal; timeoutMs?: number } = {}): Promise<PitFalconerDroneArtBank> {
  const images = new Map<-1 | 1, HTMLImageElement>();
  const result = () => ({ images, failed: images.size !== 2, cancelled: Boolean(options.signal?.aborted) });
  if (typeof Image === 'undefined' || options.signal?.aborted
    || PIT_FALCONER_DRONE_ART.length !== 2
    || new Set(PIT_FALCONER_DRONE_ART.map(art => art.facing)).size !== 2
    || !PIT_FALCONER_DRONE_ART.every(validDefinition)) return result();
  await Promise.all(PIT_FALCONER_DRONE_ART.map(async art => {
    const image = await new Promise<HTMLImageElement | null>(resolve => {
      const candidate = new Image();
      let settled = false;
      const finish = (success: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        options.signal?.removeEventListener('abort', abort);
        candidate.onload = null;
        candidate.onerror = null;
        if (!success) candidate.src = '';
        resolve(success && !options.signal?.aborted ? candidate : null);
      };
      const abort = () => finish(false);
      const timer = setTimeout(() => finish(false), Math.max(1, Math.min(30_000, options.timeoutMs ?? 12_000)));
      candidate.onload = () => {
        try { finish(validImage(candidate, art)); } catch { finish(false); }
      };
      candidate.onerror = () => finish(false);
      options.signal?.addEventListener('abort', abort, { once: true });
      if (options.signal?.aborted) finish(false);
      else candidate.src = art.src;
    });
    if (image) images.set(art.facing, image);
  }));
  return result();
}

/** Pure presentation: translation comes from V8/V7 state, never an extra clock or simulated bird cycle. */
export function drawPitFalconerDrone(
  context: CanvasRenderingContext2D,
  state: PitCombatState,
  effect: PitTechniqueEffectState,
  bank: PitFalconerDroneArtBank | null,
  groundY: number,
  highContrast: boolean,
  showHitboxes: boolean,
): boolean {
  if (!bank || bank.failed || bank.cancelled || state.phase !== 'round'
    || state.fighters[effect.ownerSlot]?.definitionId !== 'falconer'
    || ![PIT_FALCONER_RECON_DRONE.id, PIT_FALCONER_LEGACY_DRONE.id].includes(effect.techniqueId)) return false;
  const resolved = resolvePitFalconerDroneFrame(effect);
  const image = bank.images.get(effect.direction);
  if (!resolved || !image) return false;
  const { art, frame } = resolved;
  const box = getPitTechniqueBox(state, effect);
  const centerX = box.x + box.width / 2;
  const centerY = groundY - box.y - box.height / 2;
  const scale = PIT_FALCONER_DRONE_WORLD_WIDTH / art.referenceWidth;
  context.save();
  try {
    // Full opacity preserves the prop's metal silhouette. No colored weapon silhouette or glow is added.
    context.globalAlpha = 1;
    context.drawImage(image, ...frame.rect,
      centerX - frame.pivot[0] * scale, centerY - frame.pivot[1] * scale,
      frame.rect[2] * scale, frame.rect[3] * scale);
    if (showHitboxes) {
      context.strokeStyle = highContrast ? '#ffffff' : '#73e0df';
      context.lineWidth = 1.5;
      context.strokeRect(box.x, groundY - box.y - box.height, box.width, box.height);
    }
    return true;
  } catch {
    return false;
  } finally {
    context.restore();
  }
}
