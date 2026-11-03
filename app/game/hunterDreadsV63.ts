import type { DreadStyleId, HunterBodyMorphId, HunterHeadStyleId } from './types';
import { invertAffine, multiplyAffine, relativeBoneMatrix, solveHunterRig, transformPoint, type AffineMatrix, type HunterRigFrame, type RigPoint } from './hunterRig';
import profiles from './data/hunterDreadProfilesV63.json';

/** Every existing bitmap is a single curved strand, registered to this collar. */
export const HUNTER_DREAD_SOURCE_ROOT = { x: 143, y: 43 } as const;
export const HUNTER_DREAD_STRANDS_V63 = [
  { x: -6, y: 5, rest: .10, scale: .82 },
  { x: -4, y: 1, rest: .07, scale: .90 },
  { x: -2, y: -2, rest: .04, scale: .98 },
  { x: 0, y: -4, rest: .02, scale: 1.02 },
  { x: 2, y: -2, rest: .06, scale: .96 },
  { x: 3, y: 3, rest: .10, scale: .76 },
  { x: 4, y: 7, rest: .15, scale: .64 },
] as const;
const BIND = solveHunterRig({ pose: 'idle', facing: 1, phase: 0, aimAngle: 0 });
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const finite = (value: number) => Number.isFinite(value) ? value : 0;

// Rear scalp attachment, never the face or the head's animation pivot.
// Legacy heads remain on their authored canvas; no old image is overwritten.
export function hunterDreadSocketV63(morph: HunterBodyMorphId, head: HunterHeadStyleId = 'reference'): RigPoint {
  if (head === 'legacy-clan') return { x: morph === 'feral' ? 108 : 110, y: 43 };
  return morph === 'feral' ? { x: 112, y: 42 } : morph === 'super' ? { x: 110, y: 41 } : { x: 108, y: 42 };
}

export interface DreadMotion { angles: number[]; velocities: number[] }
/** Bounded damped springs. Substeps make braking/landing stable after slow frames.
 * Call only on active simulation ticks: dt=0 preserves pause exactly. */
export function stepHunterDreadsV63(motion: DreadMotion, dt: number, speed: number, verticalSpeed: number): DreadMotion {
  if (!(dt > 0)) return motion;
  const elapsed = Math.min(finite(dt), .1), steps = Math.max(1, Math.ceil(elapsed * 120)), h = elapsed / steps;
  const angles = HUNTER_DREAD_STRANDS_V63.map((_, i) => clamp(finite(motion.angles[i] ?? 0), -.25, .55));
  const velocities = HUNTER_DREAD_STRANDS_V63.map((_, i) => clamp(finite(motion.velocities[i] ?? 0), -3, 3));
  for (let tick = 0; tick < steps; tick++) for (let i = 0; i < angles.length; i++) {
    // Positive angle trails toward the back in the canonical right-facing rig.
    const target = clamp(finite(speed) / 1100 + finite(verticalSpeed) / 8000, -.13, .34) * (.70 + i * .045);
    velocities[i] += ((target - angles[i]) * (30 - i * 1.3) - velocities[i] * 9) * h;
    angles[i] = clamp(angles[i] + velocities[i] * h, -.25, .55);
    if ((angles[i] === -.25 && velocities[i] < 0) || (angles[i] === .55 && velocities[i] > 0)) velocities[i] = 0;
  }
  return { angles, velocities };
}

interface Collider { id: string; inverse: AffineMatrix; x: number; y: number; rx: number; ry: number }
interface Sample { x: number; y: number; radius: number }
export interface HunterDreadLayerV63 {
  matrix: AffineMatrix;
  root: RigPoint;
  angle: number;
  scale: number;
  x: number;
  y: number;
  collisions: number;
  corrected: boolean;
  samples: readonly Sample[];
}

/** Collision volumes follow the posed head and torso rather than screen bounds.
 * Far-side strands stay behind the body in all renderers as a second safeguard. */
function colliders(frame: HunterRigFrame, morph: HunterBodyMorphId): Collider[] {
  const head = invertAffine(relativeBoneMatrix(frame, BIND, 'head'));
  const torso = invertAffine(relativeBoneMatrix(frame, BIND, 'torso'));
  const broad = morph === 'super';
  return [
    { id: 'skull', inverse: head, x: 140, y: 52, rx: morph === 'feral' ? 23 : 29, ry: 32 },
    { id: 'neck', inverse: torso, x: 128, y: 102, rx: 22, ry: 19 },
    { id: 'torso', inverse: torso, x: 129, y: 152, rx: broad ? 39 : 34, ry: 45 },
  ];
}

function layerMatrix(head: AffineMatrix, root: RigPoint, scale: number, angle: number): AffineMatrix {
  const a = Math.cos(angle) * scale, b = Math.sin(angle) * scale, c = -b, d = a;
  return multiplyAffine(head, { a, b, c, d, e: root.x - a * 143 - c * 43, f: root.y - b * 143 - d * 43 });
}

function contactCount(matrix: AffineMatrix, scale: number, samples: readonly Sample[], bodies: readonly Collider[]): number {
  let count = 0;
  for (const sample of samples) {
    // Collar/short scalp entry is intentionally embedded under the skull layer.
    const attachment = Math.hypot(sample.x - 143, sample.y - 43) < 30;
    const point = transformPoint(matrix, sample);
    for (const body of bodies) {
      if (attachment && body.id === 'skull') continue;
      const local = transformPoint(body.inverse, point);
      const margin = sample.radius * scale;
      if (((local.x - body.x) / (body.rx + margin)) ** 2 + ((local.y - body.y) / (body.ry + margin)) ** 2 < 1) count++;
    }
  }
  return count;
}

/** Project spring angles to the nearest non-penetrating orientation. The source
 * alpha envelope is measured for each style; no texture is warped or mirrored.
 * This is constrained 2D secondary motion, not a 3D rope/mesh simulation. */
export function solveHunterDreadsV63(frame: HunterRigFrame, morph: HunterBodyMorphId, style: DreadStyleId,
  headStyle: HunterHeadStyleId = 'reference', angles: readonly number[] = []): HunterDreadLayerV63[] {
  const head = relativeBoneMatrix(frame, BIND, 'head'), socket = hunterDreadSocketV63(morph, headStyle);
  const bodies = colliders(frame, morph), samples = profiles[style].samples;
  return HUNTER_DREAD_STRANDS_V63.map((strand, index) => {
    const root = { x: socket.x + strand.x, y: socket.y + strand.y };
    const requested = clamp(strand.rest + finite(angles[index] ?? 0), -.25, 1.15);
    let angle = requested, matrix = layerMatrix(head, root, strand.scale, angle);
    let contacts = contactCount(matrix, strand.scale, samples, bodies);
    if (contacts) {
      // Try backward first: falling toward the face is never a valid escape.
      for (let offset = .025; offset <= 1.425; offset += .025) {
        const candidate = Math.min(1.15, requested + offset);
        const next = layerMatrix(head, root, strand.scale, candidate);
        const hits = contactCount(next, strand.scale, samples, bodies);
        if (hits < contacts) { angle = candidate; matrix = next; contacts = hits; }
        if (!hits || candidate === 1.15) break;
      }
    }
    return { matrix, root: transformPoint(head, root), angle, scale: strand.scale, x: root.x - 143, y: root.y - 43,
      collisions: contacts, corrected: angle !== requested, samples };
  });
}
