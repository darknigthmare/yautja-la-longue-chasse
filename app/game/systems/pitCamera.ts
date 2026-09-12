import {
  PIT_ARENAS,
  PIT_FIGHTERS,
  getPitFighterBoxes,
  getPitTechniqueBox,
  type PitArenaId,
  type PitCombatState,
  type PitFighterState,
} from "./pitCombat";
import { getPitCombatBitmapVisualBounds } from "../pitCombatBitmapArt";

/** Presentation only. No camera values enter collision, input, saves or replays. */
export interface PitPresentationCamera {
  readonly arenaId: PitArenaId;
  readonly frame: number;
  readonly mode: "follow" | "fixed";
  readonly centerX: number;
  readonly centerY: number;
  readonly zoom: number;
  readonly targetZoom: number;
}
export interface PitCameraOptions { readonly reducedMotion?: boolean }
export interface PitPresentationBounds {
  readonly left: number; readonly right: number;
  readonly top: number; readonly bottom: number;
}
const MIN_ZOOM = 0.8;
const MAX_ZOOM = 1.95;
const FIXED_ZOOM = 0.9;
const SIDE_MARGIN = 72;
const TOP_MARGIN = 48;
const FLOOR_MARGIN = 42;
const ZOOM_DEAD_ZONE = 0.035;
const CENTER_DEAD_ZONE = 3;

const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

/** Reserve the actual per-ID PNG and the vector fallback before loading.
 * The fallback arm, cloak/status outline, hit cue and floor shadow are included.
 * These bounds are never used as gameplay hitboxes.
 */
export function getPitFighterPresentationBounds(
  fighter: PitFighterState, groundY: number,
): PitPresentationBounds {
  const boxes = getPitFighterBoxes(fighter);
  const body = boxes.pushbox;
  const definition = PIT_FIGHTERS[fighter.definitionId];
  const fallbackReach = fighter.phase === "active" ? 66 : 46;
  const bodyTop = groundY - fighter.y - body.height;
  let left = Math.min(fighter.x - 40, fighter.x + (fighter.facing === -1 ? -fallbackReach : -40),
    boxes.hurtbox.x - 7, fighter.x - definition.bodyWidth * 0.72 - 3);
  let right = Math.max(fighter.x + 40, fighter.x + (fighter.facing === 1 ? fallbackReach : 40),
    boxes.hurtbox.x + boxes.hurtbox.width + 7, fighter.x + definition.bodyWidth * 0.72 + 3);
  let top = Math.min(bodyTop - 14, groundY - boxes.hurtbox.y - boxes.hurtbox.height - 7);
  let bottom = Math.max(groundY + 16, groundY - fighter.y + 14);
  const art = getPitCombatBitmapVisualBounds(fighter, groundY);
  if (art) {
    left = Math.min(left, art.x - 4); right = Math.max(right, art.x + art.width + 4);
    top = Math.min(top, art.y - 4); bottom = Math.max(bottom, art.y + art.height + 4);
  }
  if (boxes.hitbox) {
    left = Math.min(left, boxes.hitbox.x - 4);
    right = Math.max(right, boxes.hitbox.x + boxes.hitbox.width + 4);
    top = Math.min(top, groundY - boxes.hitbox.y - boxes.hitbox.height - 12);
    bottom = Math.max(bottom, groundY - boxes.hitbox.y + 4);
  }
  return { left, right, top, bottom };
}

export function getPitPresentationBounds(state: PitCombatState): PitPresentationBounds {
  const arena = PIT_ARENAS[state.arenaId];
  const fighters = state.fighters.map(fighter => getPitFighterPresentationBounds(fighter, arena.groundY));
  let left = Math.min(...fighters.map(box => box.left));
  let right = Math.max(...fighters.map(box => box.right));
  let top = Math.min(...fighters.map(box => box.top));
  let bottom = Math.max(...fighters.map(box => box.bottom));
  for (const effect of state.techniqueEffects) {
    const box = getPitTechniqueBox(state, effect);
    left = Math.min(left, box.x - 14); right = Math.max(right, box.x + box.width + 14);
    top = Math.min(top, arena.groundY - box.y - box.height - 14);
    bottom = Math.max(bottom, arena.groundY - box.y + 14);
  }
  return { left, right, top, bottom };
}

const fitCenter = (center: number, span: number, low: number, high: number): number =>
  span >= high - low ? (low + high) / 2 : clamp(center, low + span / 2, high - span / 2);

export function targetPitPresentationCamera(
  state: PitCombatState, options: PitCameraOptions = {},
): PitPresentationCamera {
  const arena = PIT_ARENAS[state.arenaId];
  // A constant wider view reserves edge weapon tips and normal aerial motion;
  // it never tracks fighters, shakes, or zooms with attacks.
  if (options.reducedMotion) return {
    arenaId: state.arenaId, frame: state.frame, mode: "fixed",
    centerX: arena.width / 2, centerY: arena.height / 2,
    zoom: FIXED_ZOOM, targetZoom: FIXED_ZOOM,
  };
  const bounds = getPitPresentationBounds(state);
  const left = bounds.left - SIDE_MARGIN, right = bounds.right + SIDE_MARGIN;
  const top = bounds.top - TOP_MARGIN;
  const bottom = Math.max(bounds.bottom, arena.groundY + FLOOR_MARGIN);
  const zoom = clamp(Math.min(arena.width / Math.max(1, right - left),
    arena.height / Math.max(1, bottom - top)), MIN_ZOOM, MAX_ZOOM);
  return {
    arenaId: state.arenaId, frame: state.frame, mode: "follow",
    centerX: fitCenter((left + right) / 2, arena.width / zoom, Math.min(0, left), Math.max(arena.width, right)),
    centerY: fitCenter((top + bottom) / 2, arena.height / zoom, Math.min(0, top), Math.max(arena.height, bottom)),
    zoom, targetZoom: zoom,
  };
}

/** Outward safety constraint uses visible art, not the larger target margins.
 * This keeps interpolation where possible without cropping a newly extended
 * weapon or jump while the presentation catches up. No combat state is edited.
 */
function containVisuals(camera: PitPresentationCamera, state: PitCombatState): PitPresentationCamera {
  const arena = PIT_ARENAS[state.arenaId], bounds = getPitPresentationBounds(state);
  const zoom = Math.min(camera.zoom, arena.width / Math.max(1, bounds.right - bounds.left),
    arena.height / Math.max(1, bounds.bottom - bounds.top));
  const halfW = arena.width / zoom / 2, halfH = arena.height / zoom / 2;
  return { ...camera, zoom,
    centerX: clamp(camera.centerX, bounds.right - halfW, bounds.left + halfW),
    centerY: clamp(camera.centerY, bounds.bottom - halfH, bounds.top + halfH),
  };
}

export function advancePitPresentationCamera(
  previous: PitPresentationCamera | null, state: PitCombatState, options: PitCameraOptions = {},
): PitPresentationCamera {
  const target = targetPitPresentationCamera(state, options);
  if (!previous || previous.arenaId !== state.arenaId || previous.mode !== target.mode ||
    state.frame < previous.frame ||
    ![previous.centerX, previous.centerY, previous.zoom].every(Number.isFinite)) return target;
  // Image loading, HUD changes and impact removal can redraw an unchanged tick.
  // They must not snap an interpolating camera to its target.
  if (state.frame === previous.frame) return previous;
  if (target.mode === "fixed") return target;
  const frames = clamp(state.frame - previous.frame, 1, 12);
  const positionAlpha = 1 - Math.pow(0.84, frames);
  const zoomAlpha = 1 - Math.pow(0.88, frames);
  const desiredZoom = Math.abs(target.zoom - previous.zoom) <= ZOOM_DEAD_ZONE ? previous.zoom : target.zoom;
  const desiredX = Math.abs(target.centerX - previous.centerX) <= CENTER_DEAD_ZONE ? previous.centerX : target.centerX;
  const desiredY = Math.abs(target.centerY - previous.centerY) <= CENTER_DEAD_ZONE ? previous.centerY : target.centerY;
  return containVisuals({
    ...target,
    centerX: previous.centerX + (desiredX - previous.centerX) * positionAlpha,
    centerY: previous.centerY + (desiredY - previous.centerY) * positionAlpha,
    zoom: previous.zoom + (desiredZoom - previous.zoom) * zoomAlpha,
  }, state);
}

export function applyPitPresentationCamera(
  context: CanvasRenderingContext2D, arenaWidth: number, arenaHeight: number, camera: PitPresentationCamera,
): void {
  context.translate(arenaWidth / 2, arenaHeight / 2);
  context.scale(camera.zoom, camera.zoom);
  context.translate(-camera.centerX, -camera.centerY);
}
export const PIT_CAMERA_LIMITS = {
  minZoom: MIN_ZOOM, maxZoom: MAX_ZOOM, fixedZoom: FIXED_ZOOM,
  zoomDeadZone: ZOOM_DEAD_ZONE, centerDeadZone: CENTER_DEAD_ZONE,
} as const;
