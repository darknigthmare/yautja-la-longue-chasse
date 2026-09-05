import type { ExplorationProgress } from "./types";
import type { WorldRect } from "./systems/worldBlueprints";
import { normalizeExplorationProgress } from "./systems/explorationProgress";
import { expansionExplorationSpec } from "./systems/expansionExplorationRegions";

/**
 * Existing V3 originals: a reusable installation reader and ritual carrying
 * bindings. These are interface/support props, not new artwork representing
 * the exact six biome upgrades or the anatomy of their unique trophies.
 */
export const EXPANSION_DEVICE_TEXTURE_PATHS = {
  module: "/game/assets/v3/actors/yautja/hunter/gear/motion-sensor.webp",
  bindings: "/game/assets/v3/actors/yautja/hunter/trophies/trophy-bindings.webp",
} as const;
export type ExpansionDeviceTextures = {
  -readonly [Key in keyof typeof EXPANSION_DEVICE_TEXTURE_PATHS]: HTMLImageElement | null;
};
export interface ExpansionDeviceVisual {
  id: string;
  kind: "module" | "gate" | "trophy" | "shortcut";
  bounds: Readonly<WorldRect>;
  state: "available" | "blocked" | "complete";
  label: string;
  detail: string;
  texture: keyof ExpansionDeviceTextures | null;
}

/** Shared geometry and persisted progress are the only source of visual state. */
export function expansionDeviceVisuals(
  missionId: unknown,
  progress: ExplorationProgress,
): ExpansionDeviceVisual[] {
  const region = expansionExplorationSpec(missionId);
  if (!region) return [];
  const state = normalizeExplorationProgress(progress);
  const { layout } = region;
  const installed = state.abilityIds.includes(region.abilityId);
  const gateOpen = state.openedGateIds.includes(region.gateId);
  const shortcutOpen = state.openedGateIds.includes(region.shortcutId);
  const canOpenShortcut = gateOpen && state.abilityIds.includes(region.shortcutRequirement);
  const recovered = state.secretIds.includes(region.secretId);
  const vaultKnown = state.discoveredRoomIds.includes(region.prefix + "-vault") || recovered;
  return [
    {
      id: region.prefix + "-module-device", kind: "module", bounds: layout.module,
      state: installed ? "complete" : state.abilityIds.includes("aerial-boost") ? "available" : "blocked",
      label: installed ? "INSTALLÉ" : "MODULE",
      detail: installed ? region.copy.abilityLabel + " installée" : region.copy.moduleLabel,
      texture: "module",
    },
    {
      id: region.gateId, kind: "gate",
      bounds: { x: layout.gate.x - 30, y: layout.moduleFloorY - 42, width: 24, height: 34 },
      state: gateOpen ? "complete" : installed ? "available" : "blocked",
      label: gateOpen ? "PASSAGE OUVERT" : "VERROU",
      detail: region.copy.gateLabel,
      texture: null,
    },
    ...(vaultKnown ? [{
      id: region.secretId, kind: "trophy" as const, bounds: layout.secret,
      state: recovered ? "complete" as const : gateOpen ? "available" as const : "blocked" as const,
      label: recovered ? "RÉCUPÉRÉ" : "TROPHÉE · +5",
      detail: region.copy.secretLabel,
      texture: recovered ? null : "bindings" as const,
    }] : []),
    {
      id: region.shortcutId, kind: "shortcut",
      bounds: { x: layout.hatch.x - 32, y: layout.vaultFloorY - 40, width: 28, height: 32 },
      state: shortcutOpen ? "complete" : canOpenShortcut ? "available" : "blocked",
      label: shortcutOpen ? "RETOUR OUVERT" : canOpenShortcut ? "RACCOURCI" : "REVISITE",
      detail: region.copy.shortcutLabel,
      texture: null,
    },
  ];
}

function fitImage(context: CanvasRenderingContext2D, image: HTMLImageElement, bounds: WorldRect): boolean {
  if (image.naturalWidth <= 0 || image.naturalHeight <= 0) return false;
  const scale = Math.min(bounds.width / image.naturalWidth, bounds.height / image.naturalHeight);
  const width = image.naturalWidth * scale;
  const height = image.naturalHeight * scale;
  context.drawImage(image, bounds.x + (bounds.width - width) / 2,
    bounds.y + bounds.height - height, width, height);
  return true;
}

function drawLabel(context: CanvasRenderingContext2D, bounds: WorldRect, text: string, color: string): void {
  context.font = "800 10px system-ui, sans-serif";
  context.textAlign = "center";
  const center = bounds.x + bounds.width / 2;
  const width = context.measureText(text).width + 12;
  context.fillStyle = "#0a1519ee";
  context.fillRect(center - width / 2, bounds.y - 23, width, 18);
  context.fillStyle = color;
  context.fillText(text, center, bounds.y - 10);
}

/** Drawn before actors, with no animation or new hitbox and no held-input action. */
export function drawExpansionRegionDevices(
  context: CanvasRenderingContext2D,
  missionId: unknown,
  progress: ExplorationProgress,
  textures: ExpansionDeviceTextures,
  player: WorldRect,
): void {
  for (const device of expansionDeviceVisuals(missionId, progress)) {
    const { bounds } = device;
    const near = Math.hypot(
      player.x + player.width / 2 - bounds.x - bounds.width / 2,
      player.y + player.height / 2 - bounds.y - bounds.height / 2,
    ) <= 170;
    // Do not announce names through the ceiling; the local map reveals the
    // trophy separately only after its actual vault has been visited.
    const sameLevel = Math.abs(player.y + player.height - bounds.y - bounds.height) <= 85;
    const color = device.state === "complete" ? "#a5e6b5"
      : device.state === "available" ? "#f6d47d" : "#bf9aa1";
    context.save();
    context.globalAlpha = device.state === "complete" ? 0.62 : 1;
    const image = device.texture ? textures[device.texture] : null;
    const drawn = image ? fitImage(context, image, bounds) : false;
    if (!drawn && device.kind !== "trophy") {
      // An explicit status panel remains legible if the image cannot load.
      context.fillStyle = "#1b3036";
      context.fillRect(bounds.x + 4, bounds.y + 4, bounds.width - 8, bounds.height - 8);
      context.strokeStyle = color;
      context.lineWidth = 2;
      context.strokeRect(bounds.x + 4, bounds.y + 4, bounds.width - 8, bounds.height - 8);
    }
    context.globalAlpha = 1;
    context.fillStyle = color;
    context.beginPath();
    context.arc(bounds.x + bounds.width / 2, bounds.y + bounds.height - 6, 3.5, 0, Math.PI * 2);
    context.fill();
    if (near && sameLevel) drawLabel(context, bounds, device.detail, color);
    else if (device.state !== "complete") drawLabel(context, bounds, device.label, color);
    context.restore();
  }
}
