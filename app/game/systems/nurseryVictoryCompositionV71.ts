import { NURSERY_TIMING, type NurseryPresentation } from "./nurseryPrologue";

/** Reviewed anchors on village.png's actual sandy ring, in source-image space.
 * The camera transform belongs to the backdrop, so neither actor slides while it widens.
 * This is presentation only: the duel's winner, clocks and campaign proof stay untouched. */
export const NURSERY_VICTORY_COMPOSITION_V71 = {
  scene: "/game/prologue/v47/village.png",
  bodyHeightFraction: 0.062,
  gestureDelayTicks: 36,
  player: { x: 0.458, supportY: 0.850, direction: "right", clip: "ready", detachedBlade: false },
  rival: { x: 0.544, supportY: 0.862, direction: "left", clip: "ko", detachedBlade: false },
  adaptation: "original-game-youngling-duel-nonlethal",
} as const;

export interface NurseryBackdropProjection {
  scale: number;
  x: number;
  y: number;
}

export function nurseryBackdropProjection(imageWidth: number, imageHeight: number,
  viewportWidth: number, viewportHeight: number, zoom = 1, centerY = 0.5): NurseryBackdropProjection {
  const scale = Math.max(viewportWidth / imageWidth, viewportHeight / imageHeight) * zoom;
  return { scale, x: (viewportWidth - imageWidth * scale) / 2, y: viewportHeight / 2 - imageHeight * scale * centerY };
}

/** Only the genuine post-KO wide shot has this composition; defeat never celebrates. */
export function nurseryVictoryDrawingTicksV71(presentation: NurseryPresentation, reducedMotion: boolean): number | null {
  const rival = presentation.actors.find(actor => actor.id === "rival");
  const player = presentation.actors.find(actor => actor.id === "player");
  if (presentation.phase !== "village-reveal" || presentation.camera.shot !== "village" ||
    rival?.pose !== "ko" || !player || player.pose === "ko") return null;
  // Two existing, distinct drawings lift the arm and then hold it; no sprite rotation or looping KO.
  return reducedMotion ? NURSERY_TIMING.villageRevealTicks :
    Math.max(0, Math.floor(Math.max(0, Math.min(1, presentation.camera.progress)) * NURSERY_TIMING.villageRevealTicks) -
      NURSERY_VICTORY_COMPOSITION_V71.gestureDelayTicks);
}
