import type { EnvironmentPropRole } from "./environmentPropRuntimeData";

export interface EnvironmentPropDrawBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface EnvironmentPropDrawPlan {
  source: EnvironmentPropDrawBounds;
  tiles: EnvironmentPropDrawBounds[];
  clip: EnvironmentPropDrawBounds | null;
}

// The V19 pipeline preserves at least 24 fully transparent pixels on every edge.
// Crop it only for covers, hazards and floor modules. Platforms and climbables
// retain their existing full-image framing and reach. All scales stay uniform.
const V19_TRANSPARENT_PADDING = 24;
const MAX_MODULES_PER_PROP = 256;

export function environmentPropDrawPlan(
  naturalWidth: number,
  naturalHeight: number,
  role: EnvironmentPropRole,
  bounds: EnvironmentPropDrawBounds,
): EnvironmentPropDrawPlan | null {
  const padding = role === "cover" || role === "surface" || role === "hazard"
    ? V19_TRANSPARENT_PADDING
    : 0;
  if (
    ![naturalWidth, naturalHeight, bounds.x, bounds.y, bounds.width, bounds.height].every(Number.isFinite) ||
    naturalWidth <= padding * 2 ||
    naturalHeight <= padding * 2 ||
    bounds.width <= 0 ||
    bounds.height <= 0 ||
    !Number.isFinite(bounds.x + bounds.width) ||
    !Number.isFinite(bounds.y + bounds.height)
  ) return null;

  const source = {
    x: padding,
    y: padding,
    width: naturalWidth - padding * 2,
    height: naturalHeight - padding * 2,
  };
  const ratio = source.width / source.height;
  const bottom = bounds.y + bounds.height;
  let width = bounds.width;
  let height = width / ratio;
  let x = bounds.x;
  let y = bounds.y;

  if (role === "surface" || role === "hazard") {
    // Upright emitters mark an unchanged hazard zone at regular intervals.
    // Horizontal hazards and floor material use adjoining modules instead.
    const emitters = role === "hazard" && ratio <= 1.25;
    height = Math.min(132, Math.max(bounds.height, emitters ? 96 : 48));
    width = height * ratio;
    const count = Math.ceil(bounds.width / (emitters ? 360 : width));
    if (!Number.isFinite(count) || count < 1 || count > MAX_MODULES_PER_PROP) return null;
    const tiles: EnvironmentPropDrawBounds[] = [];
    if (emitters) {
      const cellWidth = bounds.width / count;
      width = Math.min(width, cellWidth);
      height = width / ratio;
      for (let index = 0; index < count; index += 1) {
        tiles.push({
          x: bounds.x + (index + 0.5) * cellWidth - width / 2,
          y: bottom - height,
          width,
          height,
        });
      }
    } else {
      for (let index = 0; index < count; index += 1) {
        tiles.push({ x: bounds.x + index * width, y: bottom - height, width, height });
      }
    }
    return {
      source,
      tiles,
      clip: { x: bounds.x, y: bottom - height, width: bounds.width, height },
    };
  }

  if (role === "climbable") {
    height = bounds.height;
    width = height * ratio;
    x = bounds.x + (bounds.width - width) / 2;
  } else if (role === "cover") {
    const scale = Math.min(bounds.width * 1.5 / source.width, bounds.height * 1.18 / source.height);
    width = source.width * scale;
    height = source.height * scale;
    x = bounds.x + (bounds.width - width) / 2;
    y = bottom - height;
  } else if (role === "platform") {
    width = bounds.width * 1.06;
    height = width / ratio;
    x = bounds.x - bounds.width * 0.03;
    y = bounds.y - 4;
  }

  if (![x, y, width, height].every(Number.isFinite) || width <= 0 || height <= 0) return null;
  return { source, tiles: [{ x, y, width, height }], clip: null };
}

export function drawEnvironmentProp(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  role: EnvironmentPropRole,
  bounds: EnvironmentPropDrawBounds,
  opacity = 1,
): void {
  if (!Number.isFinite(opacity) || opacity <= 0) return;
  const plan = environmentPropDrawPlan(image.naturalWidth, image.naturalHeight, role, bounds);
  if (!plan) return;
  context.save();
  context.globalAlpha = Math.min(1, opacity);
  context.imageSmoothingEnabled = false;
  if (plan.clip) {
    context.beginPath();
    context.rect(plan.clip.x, plan.clip.y, plan.clip.width, plan.clip.height);
    context.clip();
  }
  for (const tile of plan.tiles) {
    context.drawImage(
      image,
      plan.source.x, plan.source.y, plan.source.width, plan.source.height,
      tile.x, tile.y, tile.width, tile.height,
    );
  }
  context.restore();
}
