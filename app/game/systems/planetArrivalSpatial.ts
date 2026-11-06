import type { PlanetArrivalShotId } from './planetArrival';

/** One isotropic film plane. Percentages of the browser's aspect ratio are not world units. */
export const ARRIVAL_STAGE = { width: 1280, height: 720 } as const;

export interface ArrivalPoint { x: number; y: number }
export interface ArrivalPose extends ArrivalPoint {
  /** Clockwise degrees in the screen's downward-positive Y axis; artwork faces right. */
  angle: number;
  scale: number;
}

export const ARRIVAL_RELEASE_ORIGIN = { x: 691.2, y: 324 } as const;

type Curve = readonly [ArrivalPoint, ArrivalPoint, ArrivalPoint, ArrivalPoint];
const clampedProgress = (value: number) => Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
const blend = (from: number, to: number, progress: number) => from + (to - from) * progress;
const smooth = (progress: number) => progress * progress * (3 - 2 * progress);

/** Contain the entire film plane; the same scale applies to X, Y, sprites and effects. */
export function fitArrivalStage(width: number, height: number) {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    return { scale: 0, left: 0, top: 0 };
  }
  const scale = Math.min(width / ARRIVAL_STAGE.width, height / ARRIVAL_STAGE.height);
  return { scale, left: (width - ARRIVAL_STAGE.width * scale) / 2, top: (height - ARRIVAL_STAGE.height * scale) / 2 };
}

/**
 * A shared camera for the backdrop, ground and every grounded actor/effect.
 * Apply as translate(x, y) scale(scale), with CSS transform-origin: 0 0.
 * This is a zoom around (0, floorY): the horizon floor stays still and the
 * 1280×720 backdrop covers the frame throughout, without sampling left of it.
 * `reveal` is the caller's already-eased 0..1 progression toward the hunt view.
 */
export function arrivalGroundCamera(reveal: number, floorY = 624, approachScale = 2.25): ArrivalPose {
  const close = Number.isFinite(approachScale) ? Math.max(1, Math.min(2.25, approachScale)) : 2.25;
  const scale = blend(close, 1, clampedProgress(reveal));
  const floor = Number.isFinite(floorY) ? Math.max(0, Math.min(ARRIVAL_STAGE.height, floorY)) : 624;
  return { x: 0, y: floor * (1 - scale), angle: 0, scale };
}

/** Translation, rotation and scale around a sprite's declared local pivot. */
export function attachmentToStage(pose: ArrivalPose, localX: number, localY: number): ArrivalPoint {
  const radians = pose.angle * Math.PI / 180;
  const cos = Math.cos(radians) * pose.scale;
  const sin = Math.sin(radians) * pose.scale;
  return { x: pose.x + localX * cos - localY * sin, y: pose.y + localX * sin + localY * cos };
}

/** The orientation comes from this curve's derivative, never from a second angle timeline. */
function poseOnCurve(points: Curve, progress: number, scale: number): ArrivalPose {
  const [a, b, c, d] = points;
  const p = clampedProgress(progress);
  const q = 1 - p;
  const x = q * q * q * a.x + 3 * q * q * p * b.x + 3 * q * p * p * c.x + p * p * p * d.x;
  const y = q * q * q * a.y + 3 * q * q * p * b.y + 3 * q * p * p * c.y + p * p * p * d.y;
  const dx = 3 * q * q * (b.x - a.x) + 6 * q * p * (c.x - b.x) + 3 * p * p * (d.x - c.x);
  const dy = 3 * q * q * (b.y - a.y) + 6 * q * p * (c.y - b.y) + 3 * p * p * (d.y - c.y);
  return { x, y, angle: Math.atan2(dy, dx) * 180 / Math.PI, scale };
}

/**
 * Largage and descent are one uninterrupted 18-second path. The 31-second shot
 * label changes neither the position nor the tangent, speed or apparent size.
 * The carrier's real transformed socket can replace the default launch point;
 * its first control point moves with it, retaining the initial ejection heading.
 */
export function arrivalFlightPose(shot: PlanetArrivalShotId, progress: number, releaseOrigin: ArrivalPoint = ARRIVAL_RELEASE_ORIGIN): ArrivalPose {
  const p = clampedProgress(progress);
  if (shot === 'atmosphere') {
    // Deliberate cut into a closer camera, preserving the down/right screen direction.
    return poseOnCurve([
      { x: 400, y: 70 }, { x: 500, y: 210 }, { x: 670, y: 420 }, { x: 740, y: 620 },
    ], p, blend(1.1, 1.4, p));
  }
  const origin = Number.isFinite(releaseOrigin.x) && Number.isFinite(releaseOrigin.y) ? releaseOrigin : ARRIVAL_RELEASE_ORIGIN;
  const t = shot === 'release' ? 8 * p / 18 : shot === 'descent' ? (8 + 10 * p) / 18 : 0;
  return poseOnCurve([
    origin,
    { x: origin.x + 78.8, y: origin.y + 26 },
    { x: 820, y: 510 },
    { x: 883.2, y: 680 },
  ], t, blend(.42, 1.3, t));
}

/**
 * The departure starts at the exact approach endpoint. Its first control point
 * accounts for the different shot durations (10 s / 8 s), keeping screen velocity
 * continuous. The ship fully clears the right edge before the layer unmounts.
 */
export function arrivalCarrierPose(shot: PlanetArrivalShotId, progress: number): ArrivalPose {
  const p = clampedProgress(progress);
  if (shot === 'release') {
    return poseOnCurve([
      { x: 691.2, y: 302.4 }, { x: 828.16, y: 276.32 }, { x: 1210, y: 196 }, { x: 1536, y: 120 },
    ], p, blend(1, .45, smooth(p)));
  }
  return poseOnCurve([
    { x: 153.6, y: 410.4 }, { x: 300, y: 396 }, { x: 520, y: 335 }, { x: 691.2, y: 302.4 },
  ], p, blend(.22, 1, smooth(p)));
}

/** The selected hull itself leaves orbit in a surface insertion; no pod is released. */
export function arrivalInsertionShipPose(shot: PlanetArrivalShotId, progress: number): ArrivalPose {
  const p = clampedProgress(progress);
  if (shot === 'carrier' || shot === 'orbit' || shot === 'title') return arrivalCarrierPose('carrier', p);
  if (shot === 'atmosphere') return poseOnCurve([
    { x: 320, y: 170 }, { x: 500, y: 230 }, { x: 700, y: 360 }, { x: 820, y: 490 },
  ], p, blend(.65, .8, p));
  const t = shot === 'release' ? 8 * p / 18 : (8 + 10 * p) / 18;
  // The first tangent is the incoming 10-second carrier shot's actual velocity.
  // Both deorbit labels sample this same 18-second path, preserving continuity.
  return poseOnCurve([
    { x: 691.2, y: 302.4 }, { x: 999.36, y: 243.72 }, { x: 1050, y: 420 }, { x: 1160, y: 720 },
  ], t, blend(1, .75, smooth(t)));
}

/** Staggered independent launches from the carrier's socket at each release time. */
export function arrivalFormationFlightPose(shot: PlanetArrivalShotId, progress: number,
  releaseOrigin: ArrivalPoint, index: number, delayMs: number): ArrivalPose & { visible: boolean } {
  const slot = Math.max(0, Math.min(2, Math.floor(Number.isFinite(index) ? index : 0)));
  if (slot === 0) return { ...arrivalFlightPose(shot, progress, releaseOrigin), visible: true };
  const p = clampedProgress(progress);
  if (shot === 'atmosphere') {
    const pose = arrivalFlightPose(shot, p, releaseOrigin);
    return { ...pose, x: pose.x - slot * 110, y: pose.y - slot * 90,
      scale: pose.scale * (1 - slot * .07), visible: true };
  }
  const elapsed = shot === 'release' ? 8_000 * p : 8_000 + 10_000 * p;
  const delay = Number.isFinite(delayMs) ? Math.max(0, Math.min(1_000, delayMs)) : 0;
  const t = clampedProgress((elapsed - delay) / (18_000 - delay));
  const pose = poseOnCurve([
    releaseOrigin, { x: releaseOrigin.x + 78.8, y: releaseOrigin.y + 26 },
    { x: 820 + slot * 40, y: 510 - slot * 50 }, { x: 883.2 + slot * 60, y: 680 - slot * 50 },
  ], t, blend(.42, 1.3, t));
  return { ...pose, visible: elapsed >= delay };
}

/**
 * Ground contact is the calibrated hull point, not the centre of its image.
 * Ease-out brings vertical and horizontal velocity to zero before disembarking.
 * The last pose is held unchanged throughout egress, including reduced motion.
 */
export function arrivalShipGroundPose(progress: number, contact: ArrivalPoint,
  contactProgress = .62, reducedMotion = false): ArrivalPose & { contact: boolean; descent: number } {
  const end = Number.isFinite(contactProgress) ? Math.max(.1, Math.min(1, contactProgress)) : .62;
  const t = clampedProgress(clampedProgress(progress) / end);
  const remaining = (1 - t) ** 3;
  return {
    x: reducedMotion ? contact.x : contact.x - 420 * remaining,
    y: reducedMotion ? contact.y : contact.y - 460 * remaining,
    // Tilt vanishes with altitude; a slower tilt decay could rotate the far
    // end of a wide hull below the floor just before its declared contact.
    angle: reducedMotion ? 0 : -9 * remaining,
    scale: 1,
    contact: t === 1,
    descent: reducedMotion ? 1 : 1 - remaining,
  };
}

export const ARRIVAL_SURFACE_SHIP_WIDTH = 680;
export const ARRIVAL_SURFACE_SHIP_LEFT = 64;

/** One registered parked-hull frame, shared by disembarkation and the hunt renderer. */
export function arrivalSurfaceShipGeometry(art: { width: number; height: number; groundContact: ArrivalPoint; groundExit: ArrivalPoint },
  facing: 1 | -1, floorY: number) {
  const width = ARRIVAL_SURFACE_SHIP_WIDTH;
  const height = width * art.height / art.width;
  const foot = { x: facing === -1 ? 1 - art.groundContact.x : art.groundContact.x, y: art.groundContact.y };
  const exit = { x: facing === -1 ? 1 - art.groundExit.x : art.groundExit.x, y: art.groundExit.y };
  const contact = { x: ARRIVAL_SURFACE_SHIP_LEFT + foot.x * width, y: floorY };
  const origin = { x: ARRIVAL_SURFACE_SHIP_LEFT, y: floorY - foot.y * height };
  return { width, height, foot, contact, origin,
    exit: { x: origin.x + exit.x * width, y: origin.y + exit.y * height } };
}
