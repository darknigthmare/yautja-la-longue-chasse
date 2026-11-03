import { getPitTechniqueBox, type PitCombatState, type PitTechniqueEffectState } from './systems/pitCombat';
import type { PitHoundVariantId } from './systems/pitCompanion';
import { drawActorContactShadow } from './spriteContact';
import source from './data/pitCompanionArtV56.json';

type HoundPose = 'idle' | 'telegraph' | 'charge-a' | 'charge-b' | 'bite' | 'recoil';
export interface PitCompanionFrame {
  readonly pose: HoundPose;
  readonly rect: readonly [number, number, number, number];
  readonly pivot: readonly [number, number];
  readonly topY: number;
  readonly alphaBounds: readonly [number, number, number, number];
}

export interface PitCompanionArtDefinition {
  readonly variantId: PitHoundVariantId;
  readonly facing: -1 | 1;
  readonly src: string;
  readonly width: number;
  readonly height: number;
  /** Midpoint of the supporting paws, not the silhouette's horn tips. */
  readonly pivot: readonly [number, number];
  readonly topY: number;
  readonly frames: readonly PitCompanionFrame[];
}

/** Only independently reviewed native sides belong here; never synthesize a missing view. */
export const PIT_COMPANION_ART: readonly PitCompanionArtDefinition[] = source.records as unknown as readonly PitCompanionArtDefinition[];

export function pitCompanionPose(effect: PitTechniqueEffectState, variantId: PitHoundVariantId, reducedMotion = false): HoundPose {
  if (variantId === 'hellhound-longhorn') return 'idle';
  if (effect.phase === 'arming') return 'telegraph';
  if (effect.phase === 'returning' && effect.rehitFrames > 0) return effect.hitCount > 0 ? 'bite' : 'recoil';
  return reducedMotion || Math.floor(effect.age / 6) % 2 === 0 ? 'charge-a' : 'charge-b';
}

export interface PitCompanionArtBank {
  variantId: PitHoundVariantId;
  images: ReadonlyMap<-1 | 1, HTMLImageElement>;
  failed: boolean;
  cancelled: boolean;
}

function validImage(image: HTMLImageElement, definition: PitCompanionArtDefinition): boolean {
  if (image.naturalWidth !== definition.width || image.naturalHeight !== definition.height) return false;
  const canvas = document.createElement('canvas');
  canvas.width = definition.width; canvas.height = definition.height;
  try {
    const context = canvas.getContext('2d', { willReadFrequently: true });
    if (!context) return false;
    context.drawImage(image, 0, 0);
    const pixels = context.getImageData(0, 0, canvas.width, canvas.height).data;
    let opaque = false, transparent = false;
    for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
      const alpha = pixels[(y * canvas.width + x) * 4 + 3];
      if (alpha > 128) opaque = true;
      if (alpha === 0) transparent = true;
      if ((x === 0 || y === 0 || x === canvas.width - 1 || y === canvas.height - 1) && alpha > 8) return false;
    }
    if (!opaque || !transparent) return false;
    for (const frame of definition.frames) {
      const [sx, sy, width, height] = frame.rect;
      if (sx < 0 || sy < 0 || width <= 0 || height <= 0 || sx + width > canvas.width || sy + height > canvas.height) return false;
      let visible = false;
      for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
        const alpha = pixels[((sy + y) * canvas.width + sx + x) * 4 + 3];
        if (alpha > 16) {
          visible = true;
          if (x < 8 || y < 8 || x >= width - 8 || y >= height - 8) return false;
        }
      }
      if (!visible) return false;
    }
    return true;
  } finally { canvas.width = 0; canvas.height = 0; }
}

export async function loadPitCompanionArt(variantId: PitHoundVariantId, options: { signal?: AbortSignal; timeoutMs?: number } = {}): Promise<PitCompanionArtBank> {
  const images = new Map<-1 | 1, HTMLImageElement>();
  const definitions = PIT_COMPANION_ART.filter(art => art.variantId === variantId);
  const bank = () => ({ variantId, images, failed: images.size !== 2, cancelled: Boolean(options.signal?.aborted) });
  if (definitions.length !== 2 || typeof Image === 'undefined' || options.signal?.aborted) return bank();
  await Promise.all(definitions.map(async definition => {
    const image = await new Promise<HTMLImageElement | null>(resolve => {
      const candidate = new Image(); let settled = false;
      const finish = (success: boolean) => {
        if (settled) return; settled = true;
        clearTimeout(timer); options.signal?.removeEventListener('abort', abort);
        candidate.onload = null; candidate.onerror = null;
        if (!success) candidate.src = '';
        resolve(success && !options.signal?.aborted ? candidate : null);
      };
      const abort = () => finish(false);
      const timer = setTimeout(() => finish(false), Math.max(1, Math.min(30_000, options.timeoutMs ?? 12_000)));
      candidate.onload = () => { try { finish(validImage(candidate, definition)); } catch { finish(false); } };
      candidate.onerror = () => finish(false);
      options.signal?.addEventListener('abort', abort, { once: true });
      if (options.signal?.aborted) finish(false); else candidate.src = definition.src;
    });
    if (image) images.set(definition.facing, image);
  }));
  return bank();
}

/** Native sides and individually measured rectangles; the longhorn variant remains a single held pose. */
export function drawPitCompanion(context: CanvasRenderingContext2D, state: PitCombatState, effect: PitTechniqueEffectState,
  bank: PitCompanionArtBank | null, groundY: number, highContrast: boolean, showHitboxes: boolean, reducedMotion = false): boolean {
  const variantId = state.houndVariantId ?? 'tracker-hound';
  if (!bank || bank.variantId !== variantId || bank.failed || bank.cancelled) return false;
  const art = PIT_COMPANION_ART.find(definition => definition.variantId === variantId && definition.facing === effect.direction);
  const image = bank.images.get(effect.direction);
  if (!art || !image) return false;
  const pose = pitCompanionPose(effect, variantId, reducedMotion);
  const frame = art.frames.find(frame => frame.pose === pose) ?? art.frames[0];
  if (!frame) return false;
  const box = getPitTechniqueBox(state, effect), x = box.x + box.width / 2;
  // One scale per native side: a crouched telegraph must stay smaller than standing.
  const scale = 86 / (art.pivot[1] - art.topY);
  context.save();
  try {
  drawActorContactShadow(context, x, groundY, box.width * .42);
  if (effect.phase === 'arming') {
    context.strokeStyle = highContrast ? '#ffffff' : '#edbd66'; context.lineWidth = 3;
    context.beginPath(); context.ellipse(x, groundY + 1, box.width * .6, 7, 0, 0, Math.PI * 2); context.stroke();
    context.fillStyle = context.strokeStyle; context.font = 'bold 11px sans-serif'; context.textAlign = 'center';
    context.fillText('CHARGE', x, groundY - 92);
  }
  context.globalAlpha = effect.phase === 'returning' ? .8 : 1;
  context.drawImage(image, ...frame.rect, x - frame.pivot[0] * scale, groundY - frame.pivot[1] * scale, frame.rect[2] * scale, frame.rect[3] * scale);
  if (showHitboxes) {
    context.globalAlpha = .85; context.strokeStyle = effect.phase === 'active' ? '#ff735d' : '#73e0df'; context.lineWidth = 1.5;
    context.strokeRect(box.x, groundY - box.y - box.height, box.width, box.height);
  }
    return true;
  } catch { return false; }
  finally { context.restore(); }
}
