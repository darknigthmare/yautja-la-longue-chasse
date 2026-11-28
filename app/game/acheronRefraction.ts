const MAX_LENS_EDGE = 512;
const LENS_BANDS = 24;

const layers = new WeakMap<HTMLCanvasElement, CanvasRenderingContext2D>();

function refractionLayer(canvas: HTMLCanvasElement): CanvasRenderingContext2D | null {
  const existing = layers.get(canvas);
  if (existing) return existing;
  const layer = canvas.ownerDocument.createElement("canvas");
  layer.width = MAX_LENS_EDGE;
  layer.height = MAX_LENS_EDGE;
  const context = layer.getContext("2d");
  if (context) layers.set(canvas, context);
  return context;
}

/** Refract already painted scenery inside the field, in physical framebuffer pixels. */
export function drawAcheronRefraction(
  context: CanvasRenderingContext2D,
  center: { x: number; y: number },
  radius: number,
  elapsed: number,
): void {
  const canvas = context.canvas;
  const camera = context.getTransform();
  const x = camera.a * center.x + camera.e;
  const y = camera.d * center.y + camera.f;
  const rx = radius * camera.a;
  const ry = radius * camera.d;
  const left = Math.max(0, Math.floor(x - rx));
  const top = Math.max(0, Math.floor(y - ry));
  const width = Math.min(canvas.width, Math.ceil(x + rx)) - left;
  const height = Math.min(canvas.height, Math.ceil(y + ry)) - top;
  if (width < 2 || height < 2 || rx <= 0 || ry <= 0) return;

  const layer = refractionLayer(canvas);
  if (!layer) return;
  const scale = Math.min(1, MAX_LENS_EDGE / width, MAX_LENS_EDGE / height);
  const sampleWidth = Math.max(1, Math.floor(width * scale));
  const sampleHeight = Math.max(1, Math.floor(height * scale));
  layer.clearRect(0, 0, sampleWidth, sampleHeight);
  layer.drawImage(canvas, left, top, width, height, 0, 0, sampleWidth, sampleHeight);

  context.save();
  context.resetTransform();
  context.beginPath();
  context.ellipse(x, y, rx, ry, 0, 0, Math.PI * 2);
  context.clip();
  // Trim the source strip when it moves toward an edge. The underlying frame
  // stays visible where the shifted sample falls outside the viewport.
  const bands = Math.min(LENS_BANDS, sampleHeight);
  for (let index = 0; index < bands; index++) {
    const start = Math.floor(index * sampleHeight / bands);
    const end = Math.floor((index + 1) * sampleHeight / bands);
    const worldY = top + ((start + end) * height) / (sampleHeight * 2);
    const edge = Math.max(0, 1 - Math.abs(worldY - y) / ry);
    const shift = Math.sin((worldY - y) * 0.066 + elapsed * 8) * edge * 8 * camera.a;
    const sourceTrim = Math.min(sampleWidth - 1, Math.ceil(Math.abs(shift) * sampleWidth / width));
    const sourceX = shift < 0 ? sourceTrim : 0;
    const paintWidth = (sampleWidth - sourceTrim) * width / sampleWidth;
    const paintX = left + (shift < 0 ? sourceTrim * width / sampleWidth : 0) + shift;
    context.drawImage(layer.canvas, sourceX, start, sampleWidth - sourceTrim, end - start,
      paintX, top + start * height / sampleHeight, paintWidth, (end - start) * height / sampleHeight);
  }
  context.restore();
}
