import { anatomyPartsV112 } from './anatomyHarvestV112.ts';
import type { AnatomyActionV112 } from './anatomyHarvestV112';
import type { HuntRiteActionV77, RiteCorpseV77 } from './ritesOfHuntV77';
import {
  HUNTER_RIG_CANVAS, invertAffine, solveHunterRig, transformPoint,
  type HunterRigFrame, type HunterRigInput, type RigPoint,
} from '../hunterRig.ts';

/** Presentation of confirmed field work. Its only clock is the real operation;
 * it never grants a part, progresses a rite or changes the collision body. */
export interface HuntFieldWorkInputV112 {
  action: HuntRiteActionV77;
  elapsed: number;
  duration: number;
  player: { x: number; y: number; width: number; height: number; grounded: boolean; climbing: boolean };
  corpse: { x: number; y: number; width?: number; height?: number };
}
export interface HuntFieldWorkV112 {
  action: 'flay' | AnatomyActionV112;
  label: string;
  progress: number;
  elapsed: number;
  duration: number;
  phase: 'approach' | 'work' | 'secure';
  /** Bounded intent point on the visible body, not a new hit/collision point. */
  workPoint: RigPoint;
  playerCenterX: number;
  facing: -1 | 1;
  settle: number;
  stroke: number;
}
/** World-space length used by BOTH the actual drawn tool and its reach check. */
export const HUNT_FIELD_TOOL_LENGTH_V112 = 13;
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const ease = (value: number) => { const t = clamp(value, 0, 1); return t * t * (3 - 2 * t); };
const labels = {
  flay: 'Préparer la peau',
  'harvest-hide': 'Détacher la peau',
  'harvest-tissue': 'Isoler le tissu',
  'harvest-bone': 'Dégager l’os secondaire',
} as const;

export function describeHuntFieldWorkV112(input: HuntFieldWorkInputV112): HuntFieldWorkV112 | null {
  if (!Object.hasOwn(labels, input.action) || !input.player.grounded || input.player.climbing ||
    ![input.elapsed, input.duration, input.player.x, input.player.y, input.player.width, input.player.height,
      input.corpse.x, input.corpse.y].every(Number.isFinite) || input.duration <= 0 || input.elapsed < 0 ||
    input.player.width <= 0 || input.player.height <= 0) return null;
  const action = input.action as HuntFieldWorkV112['action'];
  const progress = clamp(input.elapsed / input.duration, 0, 1);
  const centerX = input.player.x + input.player.width / 2;
  const facing = input.corpse.x < centerX ? -1 : 1;
  const corpseWidth = clamp(Number.isFinite(input.corpse.width) ? input.corpse.width! : 48, 20, 180);
  const corpseHeight = clamp(Number.isFinite(input.corpse.height) ? input.corpse.height! : 40, 10, 180);
  // Work on the near edge rather than reaching through the whole dead actor.
  const nearEdge = input.corpse.x - facing * corpseWidth * .24;
  const edgeX = facing > 0 ? Math.max(centerX + 6, nearEdge) : Math.min(centerX - 6, nearEdge);
  const settle = ease(progress / .12) * (1 - ease((progress - .92) / .08));
  const active = progress > .12 && progress < .92;
  const stroke = active ? Math.sin(input.elapsed * (action === 'harvest-bone' ? 9 : 13)) * settle : 0;
  return {
    action, label: labels[action], progress, elapsed: input.elapsed, duration: input.duration,
    phase: progress < .12 ? 'approach' : progress < .92 ? 'work' : 'secure',
    workPoint: { x: edgeX + stroke * 2, y: input.corpse.y - 7 - corpseHeight * .12 },
    playerCenterX: centerX, facing, settle, stroke,
  };
}

/** Solve two existing limb segments; their lengths and image registrations are
 * unchanged. A distant work point is clamped to natural reach, never stretched. */
function twoBone(target: RigPoint, first: RigPoint, second: RigPoint, bend: -1 | 1) {
  const a = Math.hypot(first.x, first.y), b = Math.hypot(second.x, second.y);
  const distance = clamp(Math.hypot(target.x, target.y), Math.abs(a - b) + .01, a + b - .01);
  const elbow = Math.acos(clamp((distance * distance - a * a - b * b) / (2 * a * b), -1, 1)) * bend;
  const upper = Math.atan2(target.y, target.x) - Math.atan2(b * Math.sin(elbow), a + b * Math.cos(elbow));
  const firstAngle = Math.atan2(first.y, first.x), secondAngle = Math.atan2(second.y, second.x);
  return { upper: upper - firstAngle, lower: elbow + firstAngle - secondAngle };
}
const at = (frame: HunterRigFrame, bone: keyof HunterRigFrame['bones']) => transformPoint(frame.bones[bone], { x: 0, y: 0 });

/** The original articulated body, armor, dreadlocks and equipment all consume
 * this same frame. No replacement character or fabricated sprite clip exists. */
export function solveHuntFieldWorkRigV112(input: HunterRigInput, work: HuntFieldWorkV112): HunterRigFrame {
  const base: HunterRigInput = { ...input, pose: 'idle', phase: 0, facing: work.facing,
    aimAngle: undefined, handAimAngle: undefined, recoil: 0, jointRotations: undefined,
    rootOffset: undefined, rootRotation: 0 };
  const standing = solveHunterRig(base);
  const joints: NonNullable<HunterRigInput['jointRotations']> = {
    pelvis: -.06 * work.settle, torso: .42 * work.settle, head: .12 * work.settle,
  };
  const posed: HunterRigInput = { ...base, rootOffset: { x: 12 * work.settle, y: 60 * work.settle }, jointRotations: joints };
  const body = solveHunterRig(posed);
  const pelvisInverse = invertAffine(body.bones.pelvis);
  // Knees bend, while both original foot pivots remain planted at their idle
  // world positions. This affects artwork only; the PlayerState never moves.
  for (const [upper, lower, foot, hip, first, second, bend] of [
    ['legFrontUpper', 'legFrontLower', 'footFront', { x: 26, y: 22 }, { x: 16, y: 62 }, { x: 6, y: 61 }, 1],
    ['legBackUpper', 'legBackLower', 'footBack', { x: -19, y: 23 }, { x: -18, y: 58 }, { x: -20, y: 66 }, -1],
  ] as const) {
    const target = transformPoint(pelvisInverse, at(standing, foot));
    const angles = twoBone({ x: target.x - hip.x, y: target.y - hip.y }, first, second, bend);
    joints[upper] = angles.upper; joints[lower] = angles.lower;
    // Counter the leg rotations so the soles retain their original orientation.
    joints[foot] = -(joints.pelvis ?? 0) - angles.upper - angles.lower;
  }
  const torsoInverse = invertAffine(body.bones.torso);
  const point = transformPoint(torsoInverse, work.workPoint);
  for (const [upper, lower, shoulder, first, second, bend, offsetX] of [
    ['armFrontUpper', 'armFrontLower', { x: 34, y: -73 }, { x: 24, y: 35 }, { x: 27, y: 55 }, -1, 0],
    ['armBackUpper', 'armBackLower', { x: -39, y: -85 }, { x: -33, y: 35 }, { x: -10, y: 70 }, 1, -10],
  ] as const) {
    const angles = twoBone({ x: point.x - shoulder.x + offsetX, y: point.y - shoulder.y }, first, second, bend);
    // Enter/leave the pose continuously, including a restored mid-operation.
    joints[upper] = angles.upper * work.settle;
    joints[lower] = angles.lower * work.settle;
  }
  return solveHunterRig(posed);
}

/** Admission uses the same original rig and real tool as the work renderer.
 * The feet stay planted, no segment stretches, and the complete ±2 px stroke
 * must stay in contact. Inspect/analyze ranges and collision remain independent.
 * Only the settled work phase needs contact; approach/secure are transitions. */
export function huntFieldWorkReachableV112(site: Pick<HuntFieldWorkInputV112, 'player' | 'corpse'>): boolean {
  const work = describeHuntFieldWorkV112({ ...site, action: 'flay', elapsed: 1.6, duration: 3.2 });
  if (!work) return false;
  const input: HunterRigInput = {
    pose: 'idle', phase: 0, facing: work.facing,
    worldX: site.player.x + site.player.width / 2 - HUNTER_RIG_CANVAS.width / 2,
    worldY: site.player.y + site.player.height - HUNTER_RIG_CANVAS.groundY,
    scale: site.player.height / HUNTER_RIG_CANVAS.height,
  };
  const center = work.workPoint.x - work.stroke * 2;
  for (const stroke of [-1, 0, 1]) {
    const sample = { ...work, stroke, workPoint: { x: center + stroke * 2, y: work.workPoint.y } };
    const frame = solveHuntFieldWorkRigV112(input, sample);
    if (Math.hypot(frame.anchors.handGrip.x - sample.workPoint.x, frame.anchors.handGrip.y - sample.workPoint.y) >
      HUNT_FIELD_TOOL_LENGTH_V112 - .1) return false;
  }
  return true;
}

export interface PreparedCorpsePresentationV112 {
  id: string; x: number; y: number; prepared: boolean;
  parts: { action: AnatomyActionV112; label: string; harvested: boolean }[];
}
export function describePreparedCorpseV112(
  corpse: Pick<RiteCorpseV77, 'id' | 'sourceEnemyId' | 'x' | 'y' | 'flayed'>,
  completedEventIds: readonly string[],
): PreparedCorpsePresentationV112 {
  return { id: corpse.id, x: corpse.x, y: corpse.y, prepared: corpse.flayed,
    parts: anatomyPartsV112(corpse.sourceEnemyId).map(part => ({ action: part.action, label: part.label,
      harvested: completedEventIds.includes(`${part.action}:${corpse.id}`) })) };
}

/** Non-explicit preparation marks sit over the original, species-correct dead
 * sprite. Small stock glyphs reflect the canonical finite harvest ledger. */
export function drawPreparedCorpseV112(
  context: CanvasRenderingContext2D, corpse: PreparedCorpsePresentationV112,
  bounds: { x: number; y: number; width: number; height: number } = { x: corpse.x - 24, y: corpse.y - 20, width: 48, height: 20 },
): void {
  if (!corpse.prepared && !corpse.parts.some(part => part.harvested)) return;
  const width = clamp(bounds.width, 20, 160), height = clamp(bounds.height, 10, 70);
  const centerX = bounds.x + bounds.width / 2, centerY = bounds.y + bounds.height * .6;
  context.save();
  if (corpse.prepared) {
    context.fillStyle = '#b7a27444'; context.strokeStyle = '#e4c899'; context.lineWidth = 1.2;
    context.beginPath(); context.ellipse(centerX, centerY, width * .39, height * .22, -.06, 0, Math.PI * 2); context.fill(); context.stroke();
    // A controlled preparation seam, without adding blood or a generic organ.
    context.beginPath(); context.moveTo(centerX - width * .3, centerY);
    context.quadraticCurveTo(centerX, centerY + height * .1, centerX + width * .3, centerY); context.stroke();
    for (let index = -1; index <= 1; index++) {
      const x = centerX + index * width * .18;
      context.beginPath(); context.moveTo(x - 2, centerY - 3); context.lineTo(x + 2, centerY + 3); context.stroke();
    }
  }
  const startX = centerX - (corpse.parts.length - 1) * 8;
  corpse.parts.forEach((part, index) => {
    const x = startX + index * 16, y = bounds.y - 8;
    context.strokeStyle = part.harvested ? '#8b9690' : '#f0d19d'; context.fillStyle = '#10201de6'; context.lineWidth = 1.2;
    context.beginPath(); context.arc(x, y, 6, 0, Math.PI * 2); context.fill(); context.stroke();
    if (part.harvested) {
      context.beginPath(); context.moveTo(x - 3, y); context.lineTo(x - 1, y + 2); context.lineTo(x + 3, y - 2); context.stroke();
    } else {
      context.beginPath();
      if (part.action === 'harvest-hide') {
        context.moveTo(x - 3, y - 3); context.lineTo(x, y - 2); context.lineTo(x + 3, y - 3);
        context.lineTo(x + 2, y); context.lineTo(x + 3, y + 3); context.lineTo(x, y + 2);
        context.lineTo(x - 3, y + 3); context.lineTo(x - 2, y); context.closePath();
      } else if (part.action === 'harvest-tissue') context.ellipse(x, y, 3, 2, -.4, 0, Math.PI * 2);
      else { context.moveTo(x - 3, y + 2); context.lineTo(x + 3, y - 2); }
      context.stroke();
    }
  });
  context.restore();
}

/** Tool motion is tied to the rig's real hand anchor. The work point is an
 * intent mark on the real corpse; neither one is a gameplay/hit-test proxy. */
export function drawHuntFieldWorkV112(
  context: CanvasRenderingContext2D, work: HuntFieldWorkV112, frame: HunterRigFrame,
  options: { reducedMotion?: boolean } = {},
): void {
  const hand = frame.anchors.handGrip;
  const dx = work.workPoint.x - hand.x, dy = work.workPoint.y - hand.y;
  const angle = Math.atan2(dy, dx), toolLength = HUNT_FIELD_TOOL_LENGTH_V112;
  context.save(); context.globalAlpha = .95 * work.settle;
  context.translate(hand.x, hand.y); context.rotate(angle);
  context.fillStyle = '#413c2d'; context.strokeStyle = '#ccb98d'; context.lineWidth = 1;
  context.fillRect(-4, -2.5, 7, 5); context.strokeRect(-4, -2.5, 7, 5);
  context.fillStyle = '#dce0cb'; context.beginPath(); context.moveTo(3, -2); context.lineTo(toolLength, -1);
  context.lineTo(toolLength - 3, 2); context.lineTo(3, 2); context.closePath(); context.fill();
  context.restore();
  context.save();
  context.strokeStyle = '#eed6a3'; context.lineWidth = 1.3;
  const span = 4 + work.progress * 10;
  context.setLineDash(work.phase === 'work' ? [] : [2, 3]);
  context.beginPath(); context.moveTo(work.workPoint.x - span, work.workPoint.y);
  context.lineTo(work.workPoint.x + span, work.workPoint.y); context.stroke();
  if (work.phase === 'work' && !options.reducedMotion) {
    // Two quiet material flecks follow the operation clock, not render time.
    const cycle = (work.elapsed * 3) % 1;
    context.globalAlpha = (1 - cycle) * .65; context.fillStyle = '#c6b687';
    for (const direction of [-1, 1]) context.fillRect(work.workPoint.x + direction * cycle * 7,
      work.workPoint.y - Math.sin(cycle * Math.PI) * 5, 1.5, 1.5);
  }
  context.setLineDash([]); context.fillStyle = '#091813df';
  context.fillRect(work.workPoint.x - 30, work.workPoint.y - 20, 60, 4);
  context.fillStyle = '#d6c18e'; context.fillRect(work.workPoint.x - 30, work.workPoint.y - 20, 60 * work.progress, 4);
  context.restore();
}
