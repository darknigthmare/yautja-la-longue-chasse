/** The Isles V1 · isometric camera (MODE_THE_ISLES section 4.1): 35° pitch, 4 quarter turns,
 * 3 zooms, look-ahead while running, and the cut-away that keeps the hunter visible.
 * The cut-away formula is shared with the shader in islesSceneV1.ts. */
import {heightAtV1, isWetV1, kindAtV1, tileAtV1, type IslesMapV1} from "./islesMapV1";

export interface IslesCameraTuningV1 {
  pitchDegrees: number; baseYawDegrees: number; zoomHalfHeights: number[]; zoomNames: string[]; defaultZoom: number;
  leadSeconds: number; leadMax: number; leadSmoothing: number;
  cutawayRadius: number; cutawayMinDepth: number; cutawayFeetMargin: number; distance: number;
}

export interface Vec3V1 { x: number; y: number; z: number }

/** Orthonormal view basis for one rotation: toCamera points from the scene to the camera. */
export interface IslesViewBasisV1 { toCamera: Vec3V1; right: Vec3V1; screenUp: Vec3V1; forward: {x: number; z: number}; yaw: number; pitch: number }

/** Body extents used by the cut-away, relative to the chest point. */
export const BODY_BELOW_CHEST_V1 = 1.1;
export const BODY_ABOVE_CHEST_V1 = 1.2;

export function viewBasisV1(rotation: number, tuning: IslesCameraTuningV1): IslesViewBasisV1 {
  const quarter = ((rotation % 4) + 4) % 4;
  const yaw = (tuning.baseYawDegrees + 90 * quarter) * Math.PI / 180;
  const pitch = tuning.pitchDegrees * Math.PI / 180;
  const s = Math.sin(yaw), c = Math.cos(yaw), sp = Math.sin(pitch), cp = Math.cos(pitch);
  return {
    yaw, pitch,
    toCamera: {x: s * cp, y: sp, z: c * cp},
    right: {x: c, y: 0, z: -s},
    screenUp: {x: -s * sp, y: cp, z: -c * sp},
    forward: {x: -s, z: -c},
  };
}

/** Stick or keys (x right, y up on screen) to a world-space move direction for this rotation. */
export function screenToWorldMoveV1(inputX: number, inputY: number, basis: IslesViewBasisV1): {x: number; z: number} {
  return {x: basis.right.x * inputX + basis.forward.x * inputY, z: basis.right.z * inputX + basis.forward.z * inputY};
}

/** Look-ahead offset: the camera leans toward where the hunter is running. */
export function stepCameraLeadV1(lead: {x: number; z: number}, velocity: {x: number; z: number}, running: boolean,
  tuning: IslesCameraTuningV1, dt: number): {x: number; z: number} {
  let wantX = 0, wantZ = 0;
  if (running) {
    wantX = velocity.x * tuning.leadSeconds; wantZ = velocity.z * tuning.leadSeconds;
    const length = Math.hypot(wantX, wantZ);
    if (length > tuning.leadMax) { wantX *= tuning.leadMax / length; wantZ *= tuning.leadMax / length; }
  }
  const k = 1 - Math.exp(-tuning.leadSmoothing * Math.max(0, dt));
  return {x: lead.x + (wantX - lead.x) * k, z: lead.z + (wantZ - lead.z) * k};
}

/** True when a world point must be cut away to show the hunter whose feet are at `feet`.
 * The point is cut when it lies, on screen, within `cutawayRadius` of the projected body
 * segment and is nearer the camera than the body there. Ground at the feet level is kept. */
export function cutawayHidesV1(point: Vec3V1, feet: Vec3V1, basis: IslesViewBasisV1, tuning: IslesCameraTuningV1): boolean {
  if (point.y <= feet.y + tuning.cutawayFeetMargin) return false;
  const vx = point.x - feet.x, vy = point.y - (feet.y + BODY_BELOW_CHEST_V1), vz = point.z - feet.z;
  const t = vx * basis.toCamera.x + vy * basis.toCamera.y + vz * basis.toCamera.z;
  const sx = vx * basis.right.x + vz * basis.right.z;
  const su = vx * basis.screenUp.x + vy * basis.screenUp.y + vz * basis.screenUp.z;
  const cp = Math.cos(basis.pitch), sp = Math.sin(basis.pitch);
  const u = Math.min(BODY_ABOVE_CHEST_V1, Math.max(-BODY_BELOW_CHEST_V1, su / cp));
  const dx = sx, du = su - u * cp;
  if (dx * dx + du * du >= tuning.cutawayRadius * tuning.cutawayRadius) return false;
  return t > u * sp + tuning.cutawayMinDepth;
}

/** Ray-marches from points of the hunter's silhouette toward the camera and returns every solid
 * sample that the cut-away would leave opaque. Empty means the hunter is never hidden. */
export function uncutOccludersV1(map: IslesMapV1, feet: Vec3V1, radius: number, basis: IslesViewBasisV1,
  tuning: IslesCameraTuningV1, maxDistance = 40, step = 0.2): Vec3V1[] {
  const left: Vec3V1[] = [];
  for (const h of [0.5, 1.2, 2.0]) {
    for (const s of [-radius, 0, radius]) {
      const sx = feet.x + basis.right.x * s, sy = feet.y + h, sz = feet.z + basis.right.z * s;
      for (let d = step; d <= maxDistance; d += step) {
        const p = {x: sx + basis.toCamera.x * d, y: sy + basis.toCamera.y * d, z: sz + basis.toCamera.z * d};
        const [tx, tz] = tileAtV1(map, p.x, p.z);
        const kind = kindAtV1(map, tx, tz);
        if (isWetV1(kind) || p.y >= heightAtV1(map, tx, tz)) continue;
        if (!cutawayHidesV1(p, feet, basis, tuning)) left.push(p);
      }
    }
  }
  return left;
}
