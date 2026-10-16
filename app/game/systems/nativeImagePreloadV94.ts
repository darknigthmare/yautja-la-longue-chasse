export interface NativeImageSourceV94 {
  src: string;
  sourceWidth: number;
  sourceHeight: number;
  kind?: 'scene';
}
export interface NativeImageProgressV94 {
  ready: boolean;
  error: string | null;
  loaded: number;
  total: number;
}
export const NATIVE_IMAGE_CONCURRENCY_V94 = 6;
export const NATIVE_IMAGE_TIMEOUT_MS_V94 = 20_000;

/** Bounded, cancellable native PNG verification. No pixels, URLs or saves are rewritten. */
export function preloadNativeImagesV94({
  sources, reload = false, onProgress,
  concurrency = NATIVE_IMAGE_CONCURRENCY_V94,
  timeoutMs = NATIVE_IMAGE_TIMEOUT_MS_V94,
}: {
  sources: readonly NativeImageSourceV94[];
  reload?: boolean;
  onProgress: (progress: NativeImageProgressV94) => void;
  concurrency?: number;
  timeoutMs?: number;
}) {
  const queue = [...sources];
  const total = queue.length;
  const limit = Number.isFinite(concurrency) ? Math.max(1, Math.min(12, Math.floor(concurrency))) : NATIVE_IMAGE_CONCURRENCY_V94;
  const deadlineMs = Number.isFinite(timeoutMs) ? Math.max(1, Math.min(120_000, timeoutMs)) : NATIVE_IMAGE_TIMEOUT_MS_V94;
  const pending = new Set<() => void>();
  let alive = true, cursor = 0, loaded = 0, error: string | null = null;
  const report = () => { if (alive) onProgress({ready: loaded === total && error === null, error, loaded, total}); };

  async function load(source: NativeImageSourceV94): Promise<void> {
    const controller = new AbortController();
    let image: HTMLImageElement | null = null, settled = false;
    let rejectStop: (reason: Error) => void = () => {};
    const stop = new Promise<never>((_, reject) => { rejectStop = reject; });
    const detach = () => { image?.removeAttribute('src'); image = null; };
    const cancel = () => { controller.abort(); detach(); rejectStop(new Error('Chargement annulé.')); };
    pending.add(cancel);
    const timeout = setTimeout(() => {
      controller.abort(); detach();
      rejectStop(new Error(`Délai de chargement dépassé : ${source.src}. Vérifie la connexion puis réessaie.`));
    }, deadlineMs);
    try {
      const work = (async () => {
        if (reload) {
          // Refresh the exact CSS URL: a cache-busting query would warm a different entry.
          const response = await fetch(source.src, {cache: 'reload', signal: controller.signal});
          if (!response.ok) throw new Error(`PNG indisponible (HTTP ${response.status}) : ${source.src}`);
          await response.arrayBuffer();
        }
        if (!alive || controller.signal.aborted || settled) return;
        image = new Image(); image.decoding = 'async'; image.src = source.src;
        await image.decode();
        if (!alive || controller.signal.aborted || settled || !image) return;
        if (image.naturalWidth !== source.sourceWidth || image.naturalHeight !== source.sourceHeight) {
          throw new Error(`Dimensions ${source.kind === 'scene' ? 'de décor' : 'd’animation'} incompatibles : ${source.src}. Attendues ${source.sourceWidth}×${source.sourceHeight}, reçues ${image.naturalWidth}×${image.naturalHeight}.`);
        }
      })();
      await Promise.race([work, stop]);
      if (alive && !controller.signal.aborted) { loaded++; report(); }
    } catch (reason) {
      if (!alive) return;
      error ??= reason instanceof Error && /^(Dimensions |Délai de chargement dépassé)/.test(reason.message)
        ? reason.message
        : `Impossible de charger ou de décoder ${source.kind === 'scene' ? 'le décor natif' : 'l’animation'} : ${source.src}. Vérifie la connexion puis réessaie.`;
      report();
    } finally {
      settled = true; clearTimeout(timeout); pending.delete(cancel); image = null;
    }
  }
  async function worker(): Promise<void> {
    while (alive && cursor < total) { const source = queue[cursor++]; await load(source); }
  }
  report(); // Empty batches also settle as ready; non-empty retries start unready.
  const done = Promise.allSettled(Array.from({length: Math.min(limit, total)}, () => worker())).then(() => undefined);
  return {
    done,
    cancel: () => { alive = false; for (const cancel of pending) cancel(); pending.clear(); },
  };
}
