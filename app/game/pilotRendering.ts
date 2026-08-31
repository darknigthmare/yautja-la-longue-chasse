import type { ExplorationProgress } from "./types";
import type { WorldPlatform, WorldRect } from "./systems/worldBlueprints";
import { PILOT_ROOMS, PILOT_MODULE, PILOT_CACHE, PILOT_SEAL, PILOT_HATCH } from "./systems/metroidvaniaPilot";

type PilotTextures = { stone: HTMLImageElement | null; module: HTMLImageElement | null };

/** Reusable pieces share collision bounds. Decorations remain on their own plane. */
export function drawPilotBackdrop(context: CanvasRenderingContext2D, cameraX: number): void {
  context.save();
  for (const room of PILOT_ROOMS.filter(room => room.level === "upper")) {
    if (room.x > cameraX + 1280 || room.x + room.width < cameraX) continue;
    const wash = context.createLinearGradient(0, 150, 0, 392);
    wash.addColorStop(0, "#09231b00");
    wash.addColorStop(1, "#081e19e8");
    context.fillStyle = wash;
    context.fillRect(room.x, 140, room.width, 252);
    // Recessed columns and inscriptions sit behind gameplay, never masquerade as walls.
    for (let x = room.x + 80; x < room.x + room.width - 35; x += 184) {
      context.fillStyle = "#31504755";
      context.fillRect(x, 172, 18, 210);
      context.fillStyle = "#8fbe9677";
      for (let y = 210; y < 330; y += 29) context.fillRect(x + 4, y, 10, 3);
    }
  }
  context.restore();
}

export function drawPilotPlatform(context: CanvasRenderingContext2D, platform: WorldPlatform, texture: HTMLImageElement | null): void {
  context.save();
  context.fillStyle = "#263e32";
  context.fillRect(platform.x, platform.y, platform.width, platform.height);
  if (texture) {
    context.beginPath();
    context.rect(platform.x, platform.y, platform.width, platform.height);
    context.clip();
    context.globalAlpha = 0.82;
    for (let x = platform.x; x < platform.x + platform.width; x += 180) {
      for (let y = platform.y; y < platform.y + platform.height; y += 60) context.drawImage(texture, x, y - 12, 180, 92);
    }
    context.globalAlpha = 1;
  }
  context.strokeStyle = "#b6c699";
  context.lineWidth = 2;
  context.strokeRect(platform.x + 1, platform.y + 1, platform.width - 2, platform.height - 2);
  context.restore();
}

function label(context: CanvasRenderingContext2D, rect: WorldRect, title: string, color: string): void {
  const x = rect.x + rect.width / 2;
  context.font = "800 12px system-ui, sans-serif";
  context.textAlign = "center";
  const width = context.measureText(title).width + 20;
  context.fillStyle = "#06100fe8";
  context.fillRect(x - width / 2, rect.y - 32, width, 24);
  context.fillStyle = color;
  context.fillText(title, x, rect.y - 15);
}

/** Separate foreground objects; their presence reflects permanent acquisition. */
export function drawPilotDevices(context: CanvasRenderingContext2D, progress: ExplorationProgress, textures: PilotTextures): void {
  context.save();
  const hasBoost = progress.abilityIds.includes("aerial-boost");
  const hasCache = progress.secretIds.includes("jungle-clan-cache");
  for (const [rect, acquired, title] of [[PILOT_MODULE, hasBoost, "MODULE D’IMPULSION"], [PILOT_CACHE, hasCache, "CACHE DU CLAN · +15"]] as const) {
    context.fillStyle = "#142b23";
    context.fillRect(rect.x - 10, rect.y + rect.height - 10, rect.width + 20, 10);
    context.strokeStyle = acquired ? "#49665a" : "#b7e79e";
    context.lineWidth = 2;
    context.strokeRect(rect.x - 10, rect.y + rect.height - 10, rect.width + 20, 10);
    if (!acquired) {
      if (rect === PILOT_MODULE && textures.module) {
        const scale = Math.min(rect.width / textures.module.naturalWidth, rect.height / textures.module.naturalHeight);
        const width = textures.module.naturalWidth * scale;
        const height = textures.module.naturalHeight * scale;
        context.drawImage(textures.module, rect.x + (rect.width - width) / 2, rect.y + rect.height - height - 10, width, height);
      } else {
        // The energy cell is its own object, independent of room and plinth.
        context.fillStyle = "#253a2c";
        context.fillRect(rect.x + 4, rect.y + 8, rect.width - 8, rect.height - 19);
        context.strokeRect(rect.x + 4, rect.y + 8, rect.width - 8, rect.height - 19);
        context.fillStyle = "#b7e79e";
        for (let x = rect.x + 12; x < rect.x + rect.width - 8; x += 12) context.fillRect(x, rect.y + 15, 5, 15);
      }
      label(context, rect, title, "#d9f1ad");
    }
  }
  if (!progress.openedGateIds.includes("jungle-resonance-seal")) {
    context.fillStyle = "#d9b277";
    for (let y = 48; y < PILOT_SEAL.height; y += 37) context.fillRect(PILOT_SEAL.x + 10, y, 8, 15);
    label(context, { ...PILOT_SEAL, y: 262 }, "SCEAU DE RÉSONANCE", "#ebc482");
  }
  if (!progress.openedGateIds.includes("jungle-canopy-hatch")) {
    context.strokeStyle = "#ddbb7c";
    context.lineWidth = 3;
    for (let x = PILOT_HATCH.x + 10; x < PILOT_HATCH.x + PILOT_HATCH.width; x += 25) {
      context.beginPath(); context.moveTo(x, 396); context.lineTo(x + 13, 410); context.stroke();
    }
    label(context, PILOT_HATCH, "TRAPPE DE RETOUR", "#ebc482");
  }
  context.restore();
}
