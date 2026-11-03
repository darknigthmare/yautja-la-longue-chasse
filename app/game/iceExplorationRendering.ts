import type { ExplorationProgress } from "./types";
import type { WorldPlatform, WorldRect } from "./systems/worldBlueprints";
import { ICE_CACHE, ICE_DOOR, ICE_HATCH, ICE_HATCH_ID, ICE_HIGH_PLATFORM, ICE_RELAY, ICE_RELAY_ID, ICE_SECRET_ID } from "./systems/iceExplorationRegion";

/** Existing original V19 exports. Loading belongs to HuntCanvas's normal asset queue. */
export const ICE_REGION_TEXTURE_PATHS = {
  ice: "/game/assets/v19/biome-decor/ice/plt/plt-glacier-shelf-01-low-wide.webp",
  metal: "/game/assets/v19/biome-decor/ice/plt/plt-mine-gantry-01-low-wide.webp",
  relay: "/game/assets/v19/biome-decor/ice/orn/orn-emergency-beacon-01-single.webp",
} as const;
export interface IceRegionTextures {
  ice: HTMLImageElement | null;
  metal: HTMLImageElement | null;
  relay: HTMLImageElement | null;
}
function fittedSprite(context: CanvasRenderingContext2D, image: HTMLImageElement, bounds: WorldRect): void {
  // V19 exports share transparent 24px borders. Preserve the object ratio after that crop.
  const width = image.naturalWidth - 48;
  const height = image.naturalHeight - 48;
  if (width <= 0 || height <= 0) return;
  const scale = Math.min(bounds.width / width, bounds.height / height);
  const w = width * scale;
  const h = height * scale;
  context.drawImage(image, 24, 24, width, height, bounds.x + (bounds.width - w) / 2, bounds.y + bounds.height - h, w, h);
}
export function drawIceRegionBackdrop(context: CanvasRenderingContext2D, cameraX: number, textures?: IceRegionTextures): void {
  if (cameraX > 1500 || cameraX + 1280 < 440) return;
  context.save();
  const wash = context.createLinearGradient(0, 80, 0, 570);
  wash.addColorStop(0, "#09243420");
  wash.addColorStop(1, "#102c38cc");
  context.fillStyle = wash;
  context.fillRect(795, 80, 665, 510);
  // Hoist columns sit behind the actors. They do not imply climbable surfaces.
  for (const x of [835, 1090, 1410]) {
    context.fillStyle = "#24465477";
    context.fillRect(x, 96, 18, 454);
    context.strokeStyle = "#42687577";
    context.lineWidth = 2;
    for (let y = 124; y < 530; y += 48) {
      context.beginPath(); context.moveTo(x, y); context.lineTo(x + 18, y + 28); context.stroke();
    }
  }
  context.strokeStyle = "#628f9a55";
  context.lineWidth = 5;
  context.beginPath(); context.moveTo(842, 96); context.lineTo(1420, 96); context.stroke();
  context.strokeStyle = "#688d9677";
  context.lineWidth = 2;
  context.beginPath(); context.moveTo(988, 96); context.lineTo(988, ICE_HIGH_PLATFORM.y - 40); context.stroke();
  if (textures?.metal) {
    context.globalAlpha = 0.27;
    fittedSprite(context, textures.metal, { x: 840, y: 332, width: 230, height: 90 });
  }
  context.restore();
}
export function drawIceRegionPlatform(context: CanvasRenderingContext2D, platform: WorldPlatform, textures: Pick<IceRegionTextures, "ice" | "metal">): void {
  context.save();
  const icy = platform.material === "ice";
  context.fillStyle = icy ? "#426b81" : "#283e4a";
  context.fillRect(platform.x, platform.y, platform.width, platform.height);
  const texture = icy ? textures.ice : textures.metal;
  if (texture && texture.naturalWidth > 48 && texture.naturalHeight > 48) {
    context.beginPath(); context.rect(platform.x, platform.y, platform.width, platform.height); context.clip();
    const sourceWidth = texture.naturalWidth - 48;
    const sourceHeight = texture.naturalHeight - 48;
    const tileWidth = 240;
    const tileHeight = tileWidth * sourceHeight / sourceWidth;
    for (let x = platform.x; x < platform.x + platform.width; x += tileWidth) {
      for (let y = platform.y; y < platform.y + platform.height; y += tileHeight) {
        context.drawImage(texture, 24, 24, sourceWidth, sourceHeight, x, y, tileWidth, tileHeight);
      }
    }
  }
  context.restore();
  // Collision silhouettes stay readable even while an image is still loading.
  context.save();
  context.strokeStyle = icy ? "#bdebf5" : "#b2d0d1";
  context.lineWidth = 2;
  context.strokeRect(platform.x + 1, platform.y + 1, platform.width - 2, platform.height - 2);
  if (platform.collision === "one-way") {
    context.setLineDash([4, 4]);
    context.strokeStyle = "#bdebf577";
    context.beginPath(); context.moveTo(platform.x, platform.y + platform.height + 4); context.lineTo(platform.x + platform.width, platform.y + platform.height + 4); context.stroke();
  }
  context.restore();
}
function label(context: CanvasRenderingContext2D, bounds: WorldRect, text: string, color = "#d2f4ff"): void {
  context.font = "800 11px system-ui, sans-serif";
  context.textAlign = "center";
  const width = context.measureText(text).width + 14;
  const x = bounds.x + bounds.width / 2;
  context.fillStyle = "#071722ee";
  context.fillRect(x - width / 2, bounds.y - 25, width, 20);
  context.fillStyle = color;
  context.fillText(text, x, bounds.y - 11);
}
export function drawIceRegionDevices(context: CanvasRenderingContext2D, progress: ExplorationProgress, textures: IceRegionTextures): void {
  context.save();
  const powered = progress.openedGateIds.includes(ICE_RELAY_ID);
  const hatch = progress.openedGateIds.includes(ICE_HATCH_ID);
  const cache = progress.secretIds.includes(ICE_SECRET_ID);
  context.fillStyle = "#233e4a";
  context.fillRect(ICE_RELAY.x - 8, ICE_RELAY.y + ICE_RELAY.height - 8, ICE_RELAY.width + 16, 8);
  if (textures.relay) fittedSprite(context, textures.relay, ICE_RELAY);
  else {
    context.fillStyle = "#4a7487"; context.fillRect(ICE_RELAY.x + 8, ICE_RELAY.y, ICE_RELAY.width - 16, ICE_RELAY.height);
  }
  context.fillStyle = powered ? "#a1f0d1" : "#e7bf70";
  context.beginPath(); context.arc(ICE_RELAY.x + ICE_RELAY.width / 2, ICE_RELAY.y + 16, 5, 0, Math.PI * 2); context.fill();
  label(context, ICE_RELAY, powered ? "RELAIS ALIMENTÉ" : "RELAIS MINIER");
  if (!powered) {
    context.fillStyle = "#d9b170";
    for (let y = 30; y < ICE_DOOR.height; y += 34) context.fillRect(ICE_DOOR.x + 10, y, 8, 13);
  }
  // Independent battery capsule: its plinth persists after collection; the capsule does not.
  context.fillStyle = "#203642";
  context.fillRect(ICE_CACHE.x - 5, ICE_CACHE.y + ICE_CACHE.height - 7, ICE_CACHE.width + 10, 7);
  if (!cache) {
    context.fillStyle = "#456477";
    context.fillRect(ICE_CACHE.x + 9, ICE_CACHE.y + 4, 30, 37);
    context.strokeStyle = "#bee7f4"; context.lineWidth = 2;
    context.strokeRect(ICE_CACHE.x + 9, ICE_CACHE.y + 4, 30, 37);
    context.fillStyle = "#8fe7e8";
    context.fillRect(ICE_CACHE.x + 16, ICE_CACHE.y + 10, 16, 24);
    context.fillStyle = "#27475a";
    context.fillRect(ICE_CACHE.x + 12, ICE_CACHE.y, 24, 6);
    label(context, ICE_CACHE, "RÉSERVE · +15");
  }
  if (!hatch) {
    context.strokeStyle = "#e1c383";
    context.lineWidth = 3;
    for (let x = ICE_HATCH.x + 8; x < ICE_HATCH.x + ICE_HATCH.width - 12; x += 22) {
      context.beginPath(); context.moveTo(x, ICE_HATCH.y + 4); context.lineTo(x + 12, ICE_HATCH.y + 19); context.stroke();
    }
    label(context, ICE_HATCH, "TRAPPE");
  }
  context.restore();
}
