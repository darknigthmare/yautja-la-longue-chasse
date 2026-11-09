import {
  invertAffine, solveHunterRig, transformPoint,
  type HunterRigFrame, type HunterRigInput, type RigPoint,
} from '../hunterRig.ts';

/** The canonical hand-grip socket (6,13), applied to the registered back hand.
 * The front hand's existing socket and all weapon/muzzle anchors stay native. */
export const CANOPY_BACK_HAND_GRIP_V112 = Object.freeze({ x: 6, y: 13 });
export function canopyBackHandGripV112(frame: HunterRigFrame): RigPoint {
  return transformPoint(frame.bones.handBack, CANOPY_BACK_HAND_GRIP_V112);
}

/** A held flexible support needs a visible grasp. Only the rear arm is solved;
 * root, torso, head, legs, front arm and all equipment anchors retain the exact
 * native climb frame. No body motion, segment stretching or resource changes. */
export function solveCanopyGripRigV112(input: HunterRigInput, grip: RigPoint): HunterRigFrame {
  const native = solveHunterRig(input);
  if (input.pose !== 'climb' || !Number.isFinite(grip.x) || !Number.isFinite(grip.y)) return native;
  const local = native.localMatrices;
  const target = transformPoint(invertAffine(native.bones.torso), grip);
  const dx = target.x - local.armBackUpper.e, dy = target.y - local.armBackUpper.f;
  const first = { x: local.armBackLower.e, y: local.armBackLower.f };
  // Turn the registered palm across the strand. Its wrist pivot stays attached
  // to the same forearm; the fingers no longer point down past the support.
  const wristAngle = -Math.PI / 2;
  const palm = CANOPY_BACK_HAND_GRIP_V112;
  const second = {
    x: local.handBack.e + Math.cos(wristAngle) * palm.x - Math.sin(wristAngle) * palm.y,
    y: local.handBack.f + Math.sin(wristAngle) * palm.x + Math.cos(wristAngle) * palm.y,
  };
  const a = Math.hypot(first.x, first.y), b = Math.hypot(second.x, second.y), distance = Math.hypot(dx, dy);
  // A stale/remote point is not made into a fictitious attachment. Actual held
  // pendulum points lie inside this natural reach; gameplay owns that proof.
  if (distance < Math.abs(a - b) + 1e-5 || distance > a + b - 1e-5) return native;
  const elbow = Math.acos(Math.max(-1, Math.min(1, (distance * distance - a * a - b * b) / (2 * a * b))));
  const upper = Math.atan2(dy, dx) - Math.atan2(b * Math.sin(elbow), a + b * Math.cos(elbow)) - Math.atan2(first.y, first.x);
  const lower = elbow + Math.atan2(first.y, first.x) - Math.atan2(second.y, second.x);
  const angle = (bone: 'armBackUpper' | 'armBackLower' | 'handBack') => Math.atan2(local[bone].b, local[bone].a);
  return solveHunterRig({ ...input, jointRotations: {
    ...input.jointRotations,
    armBackUpper: (input.jointRotations?.armBackUpper ?? 0) + upper - angle('armBackUpper'),
    armBackLower: (input.jointRotations?.armBackLower ?? 0) + lower - angle('armBackLower'),
    handBack: (input.jointRotations?.handBack ?? 0) + wristAngle - angle('handBack'),
  } });
}
