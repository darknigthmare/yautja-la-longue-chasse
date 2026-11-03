/** Bitmap detail composition needs no additional GPU sampler. A small shared
 * cache serves uniform land, sea and regional atlas construction. The key is
 * visual only: geography, palette, scale and contrast cannot duplicate it. */
const composed = new Map<string, HTMLCanvasElement>();
const pending = new Map<string, Promise<HTMLCanvasElement>>();
export const PLANET_DETAIL_MATERIAL_LIMIT_V103 = 6;

export function planetDetailedMaterialKeyV103(base: string, detail: string, size: number) {
  return `detail-v103:${size}:${base}:${detail}`;
}

function remember(key: string, canvas: HTMLCanvasElement) {
  composed.delete(key); composed.set(key, canvas);
  while (composed.size > PLANET_DETAIL_MATERIAL_LIMIT_V103) composed.delete(composed.keys().next().value!);
  return canvas;
}

export async function loadPlanetDetailedMaterialV103(
  base: string, detail: string, size: number,
  load: (url: string, size: number) => Promise<HTMLCanvasElement>,
): Promise<HTMLCanvasElement> {
  if (!Number.isInteger(size) || size < 16 || size > 1024) throw new RangeError("Detailed material canvas must be between 16 and 1024 pixels");
  const key = planetDetailedMaterialKeyV103(base, detail, size);
  const cached = composed.get(key);
  if (cached) return remember(key, cached);
  const loading = pending.get(key);
  if (loading) return loading;
  const task = (async () => {
    const [baseImage, detailImage] = await Promise.all([load(base, size), load(detail, size)]);
    const canvas = document.createElement("canvas");
    canvas.width = size; canvas.height = size;
    const context = canvas.getContext("2d");
    if (!context) throw new Error("Planet material detail unavailable");
    context.drawImage(baseImage, 0, 0, size, size);
    context.globalCompositeOperation = "soft-light";
    context.globalAlpha = .78;
    context.drawImage(detailImage, 0, 0, size, size);
    context.globalCompositeOperation = "source-over"; context.globalAlpha = 1;
    return remember(key, canvas);
  })();
  pending.set(key, task);
  try { return await task; } finally { pending.delete(key); }
}

export function planetDetailedMaterialStatusV103() {
  return { detailedMaterials: composed.size, detailedMaterialPixels: [...composed.values()].reduce((sum, canvas) => sum + canvas.width * canvas.height, 0), pendingDetailedMaterials: pending.size };
}
