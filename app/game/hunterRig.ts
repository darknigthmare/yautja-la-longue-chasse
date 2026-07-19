/**
 * Pure 2D hunter rig solver.
 *
 * The module deliberately has no React, Canvas or DOM dependency. Renderers
 * consume the affine matrices and anchors returned by `solveHunterRig`.
 */

export const HUNTER_RIG_CANVAS = {
  width: 256,
  height: 384,
  groundY: 366,
} as const;

/**
 * Canonical registration points shared with the V3 asset pipeline.
 *
 * Every full-canvas sprite is cut and registered against these coordinates.
 * Keeping the rig bind points here prevents a renderer from rotating a module
 * around a visually convenient, but geometrically incorrect, joint.
 */
export const HUNTER_RIG_BIND_POINTS = {
  root: { x: 128, y: 366 },
  pelvis: { x: 127, y: 199 },
  torso: { x: 127, y: 199 },
  head: { x: 133, y: 95 },
  armBackUpper: { x: 88, y: 114 },
  armBackLower: { x: 55, y: 149 },
  handBack: { x: 45, y: 219 },
  legBackUpper: { x: 108, y: 222 },
  legBackLower: { x: 90, y: 280 },
  footBack: { x: 70, y: 346 },
  armFrontUpper: { x: 161, y: 126 },
  armFrontLower: { x: 185, y: 161 },
  handFront: { x: 212, y: 216 },
  legFrontUpper: { x: 153, y: 221 },
  legFrontLower: { x: 169, y: 283 },
  footFront: { x: 175, y: 344 },
  casterShoulderMount: { x: 103, y: 105 },
  casterUpperArm: { x: 116, y: 91 },
  casterLowerArm: { x: 133, y: 100 },
  casterYoke: { x: 124, y: 92 },
  casterCannon: { x: 132, y: 82 },
  casterBarrel: { x: 196, y: 82 },
  casterMuzzle: { x: 240, y: 82 },
} as const satisfies Record<HunterRigBoneId, RigPoint>;

export type HunterRigPose =
  | "idle"
  | "run"
  | "jump"
  | "fall"
  | "climb"
  | "extract";

export type HunterRigFacing = -1 | 1;

export type HunterRigBoneId =
  | "root"
  | "pelvis"
  | "torso"
  | "head"
  | "armFrontUpper"
  | "armFrontLower"
  | "handFront"
  | "armBackUpper"
  | "armBackLower"
  | "handBack"
  | "legFrontUpper"
  | "legFrontLower"
  | "footFront"
  | "legBackUpper"
  | "legBackLower"
  | "footBack"
  | "casterShoulderMount"
  | "casterUpperArm"
  | "casterLowerArm"
  | "casterYoke"
  | "casterCannon"
  | "casterBarrel"
  | "casterMuzzle";

export interface RigPoint {
  x: number;
  y: number;
}

/**
 * Canvas-compatible affine matrix.
 *
 * x' = a*x + c*y + e
 * y' = b*x + d*y + f
 */
export interface AffineMatrix {
  a: number;
  b: number;
  c: number;
  d: number;
  e: number;
  f: number;
}

export interface HunterRigInput {
  pose: HunterRigPose;
  facing: HunterRigFacing;
  /** Cyclic locomotion phase. Values outside 0..1 are accepted. */
  phase?: number;
  /** Horizontal speed in game units per second. */
  speed?: number;
  /** Vertical speed in game units per second; positive points down. */
  verticalVelocity?: number;
  /** Exact desired world-space cannon angle in radians. */
  aimAngle?: number;
  /** Exact desired world-space hand-weapon angle for two-arm aiming poses. */
  handAimAngle?: number;
  /** Normalized barrel recoil, from 0 to 1. */
  recoil?: number;
  /** Normalized extraction animation progress, from 0 to 1. */
  extractionProgress?: number;
  /** Optional translation applied to the canonical rig. */
  worldX?: number;
  worldY?: number;
  /** Uniform output scale. */
  scale?: number;
}

export interface HunterRigAnchors {
  muzzle: RigPoint;
  handGrip: RigPoint;
  trophyCarry: RigPoint;
  maskCenter: RigPoint;
}

export interface HunterRigFrame {
  canvas: typeof HUNTER_RIG_CANVAS;
  pose: HunterRigPose;
  facing: HunterRigFacing;
  localMatrices: Record<HunterRigBoneId, AffineMatrix>;
  bones: Record<HunterRigBoneId, AffineMatrix>;
  anchors: HunterRigAnchors;
}

interface BoneDefinition {
  parentId: HunterRigBoneId | null;
  x: number;
  y: number;
  rotation?: number;
}

interface PoseChannels {
  rootX: number;
  rootY: number;
  pelvis: number;
  torso: number;
  head: number;
  armFrontUpper: number;
  armFrontLower: number;
  armBackUpper: number;
  armBackLower: number;
  legFrontUpper: number;
  legFrontLower: number;
  legBackUpper: number;
  legBackLower: number;
}

export const HUNTER_RIG_BONE_ORDER: readonly HunterRigBoneId[] = [
  "root",
  "pelvis",
  "torso",
  "head",
  "armBackUpper",
  "armBackLower",
  "handBack",
  "legBackUpper",
  "legBackLower",
  "footBack",
  "armFrontUpper",
  "armFrontLower",
  "handFront",
  "legFrontUpper",
  "legFrontLower",
  "footFront",
  "casterShoulderMount",
  "casterUpperArm",
  "casterLowerArm",
  "casterYoke",
  "casterCannon",
  "casterBarrel",
  "casterMuzzle",
] as const;

const BONE_DEFINITIONS: Record<HunterRigBoneId, BoneDefinition> = {
  root: { parentId: null, x: 0, y: 0 },
  pelvis: { parentId: "root", x: -1, y: -167 },
  // The torso artwork is registered at the pelvis. Its visual chest anchor is
  // not a rotation pivot, so both pelvis and torso intentionally share origin.
  torso: { parentId: "pelvis", x: 0, y: 0 },
  head: { parentId: "torso", x: 6, y: -104 },

  armFrontUpper: { parentId: "torso", x: 34, y: -73 },
  armFrontLower: { parentId: "armFrontUpper", x: 24, y: 35 },
  handFront: { parentId: "armFrontLower", x: 27, y: 55 },
  armBackUpper: { parentId: "torso", x: -39, y: -85 },
  armBackLower: { parentId: "armBackUpper", x: -33, y: 35 },
  handBack: { parentId: "armBackLower", x: -10, y: 70 },

  legFrontUpper: { parentId: "pelvis", x: 26, y: 22 },
  legFrontLower: { parentId: "legFrontUpper", x: 16, y: 62 },
  footFront: { parentId: "legFrontLower", x: 6, y: 61 },
  legBackUpper: { parentId: "pelvis", x: -19, y: 23 },
  legBackLower: { parentId: "legBackUpper", x: -18, y: 58 },
  footBack: { parentId: "legBackLower", x: -20, y: 66 },

  casterShoulderMount: { parentId: "torso", x: -24, y: -94 },
  // Every support-arm bone rotates on the ring used to register its own
  // artwork. Keeping these origins identical to the alpha atlas pivots avoids
  // the links orbiting around a neighbouring module when the caster aims.
  casterUpperArm: { parentId: "casterShoulderMount", x: 13, y: -14 },
  casterLowerArm: { parentId: "casterUpperArm", x: 17, y: 9 },
  casterYoke: { parentId: "casterLowerArm", x: -9, y: -8 },
  casterCannon: { parentId: "casterYoke", x: 8, y: -10 },
  casterBarrel: { parentId: "casterCannon", x: 64, y: 0 },
  casterMuzzle: { parentId: "casterBarrel", x: 44, y: 0 },
};

const TAU = Math.PI * 2;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function smoothstep(value: number): number {
  const normalized = clamp(value, 0, 1);
  return normalized * normalized * (3 - 2 * normalized);
}

function normalizedPhase(value: number): number {
  return ((value % 1) + 1) % 1;
}

function solveTwoBoneAim(
  targetAngle: number,
  targetDistance: number,
  firstOffset: RigPoint,
  secondOffset: RigPoint,
  bendDirection: -1 | 1,
): { upper: number; lower: number } {
  const firstLength = Math.hypot(firstOffset.x, firstOffset.y);
  const secondLength = Math.hypot(secondOffset.x, secondOffset.y);
  const firstRestAngle = Math.atan2(firstOffset.y, firstOffset.x);
  const secondRestAngle = Math.atan2(secondOffset.y, secondOffset.x);
  const reachableDistance = clamp(
    targetDistance,
    Math.abs(firstLength - secondLength) + 0.001,
    firstLength + secondLength - 0.001,
  );
  const jointCosine = clamp(
    (
      reachableDistance * reachableDistance -
      firstLength * firstLength -
      secondLength * secondLength
    ) /
      (2 * firstLength * secondLength),
    -1,
    1,
  );
  const jointAngle = bendDirection * Math.acos(jointCosine);
  const firstWorldAngle =
    targetAngle -
    Math.atan2(
      secondLength * Math.sin(jointAngle),
      firstLength + secondLength * Math.cos(jointAngle),
    );

  return {
    upper: firstWorldAngle - firstRestAngle,
    lower:
      jointAngle -
      (secondRestAngle - firstRestAngle),
  };
}

function basePose(): PoseChannels {
  return {
    rootX: 0,
    rootY: 0,
    pelvis: 0,
    torso: 0,
    head: 0,
    armFrontUpper: 0,
    armFrontLower: 0,
    armBackUpper: 0,
    armBackLower: 0,
    legFrontUpper: 0,
    legFrontLower: 0,
    legBackUpper: 0,
    legBackLower: 0,
  };
}

function solvePose(input: HunterRigInput): PoseChannels {
  const channels = basePose();
  const phase = normalizedPhase(input.phase ?? 0);
  const cycle = phase * TAU;
  const speed = clamp(Math.abs(input.speed ?? 0) / 300, 0, 1);

  switch (input.pose) {
    case "idle": {
      const breath = Math.sin(cycle);
      channels.rootY = breath * 1.4;
      channels.torso += breath * 0.018;
      channels.head -= breath * 0.012;
      channels.armFrontUpper += breath * 0.016;
      channels.armBackUpper -= breath * 0.014;
      break;
    }

    case "run": {
      const motion = Math.max(0.28, speed);
      const stride = Math.sin(cycle) * 0.76 * motion;
      const opposite = Math.sin(cycle + Math.PI);
      channels.rootX = Math.sin(cycle * 2) * 1.1 * motion;
      channels.rootY = -Math.abs(Math.sin(cycle)) * 4.2 * motion;
      channels.pelvis = Math.sin(cycle) * 0.075 * motion;
      channels.torso -= channels.pelvis * 0.72;
      channels.head += Math.sin(cycle * 2) * 0.025 * motion;
      channels.legFrontUpper = stride;
      channels.legBackUpper = -stride;
      channels.legFrontLower =
        Math.max(0, -Math.sin(cycle)) * 0.92 * motion;
      channels.legBackLower =
        Math.max(0, -opposite) * 0.92 * motion;
      channels.armFrontUpper = -stride * 0.62;
      channels.armBackUpper = stride * 0.62;
      channels.armFrontLower = Math.max(0, stride) * 0.28;
      channels.armBackLower = Math.max(0, -stride) * 0.28;
      break;
    }

    case "jump": {
      const progress = clamp(input.phase ?? 0.45, 0, 1);
      const lift = Math.sin(progress * Math.PI);
      channels.rootY = -lift * 2;
      channels.pelvis = -0.08 * lift;
      channels.torso = -lift * 0.18;
      channels.armFrontUpper = -lift * 0.54;
      channels.armBackUpper = lift * 0.46;
      channels.armFrontLower = -lift * 0.42;
      channels.armBackLower = lift * 0.46;
      channels.legFrontUpper = -lift * 0.5;
      channels.legFrontLower = lift * 0.94;
      channels.legBackUpper = lift * 0.34;
      channels.legBackLower = lift * 0.78;
      break;
    }

    case "fall": {
      const fall = clamp((input.verticalVelocity ?? 480) / 900, 0, 1);
      const drift = Math.sin(cycle) * 0.04;
      channels.rootY = drift * 8;
      channels.torso = -0.14 + fall * 0.08;
      channels.head = 0.1 - fall * 0.04;
      channels.armFrontUpper = -0.84 + drift;
      channels.armFrontLower = -0.34;
      channels.armBackUpper = 0.68 - drift;
      channels.armBackLower = 0.34;
      channels.legFrontUpper = -0.24 + drift;
      channels.legFrontLower = 0.52 + fall * 0.16;
      channels.legBackUpper = 0.2 - drift;
      channels.legBackLower = 0.44 + fall * 0.2;
      break;
    }

    case "climb": {
      const reach = Math.sin(cycle) * 0.52;
      channels.rootX = Math.sin(cycle * 2) * 1.8;
      channels.rootY = Math.cos(cycle * 2) * 2.2;
      channels.pelvis = Math.sin(cycle) * 0.05;
      channels.torso = -0.19;
      channels.head = 0.14;
      channels.armFrontUpper = -1.02 + reach;
      channels.armFrontLower = -0.62 - reach * 0.38;
      channels.armBackUpper = 0.94 - reach;
      channels.armBackLower = 0.58 + reach * 0.38;
      channels.legFrontUpper = -0.48 - reach * 0.72;
      channels.legFrontLower = 0.96 + reach * 0.28;
      channels.legBackUpper = 0.46 + reach * 0.72;
      channels.legBackLower = 0.94 - reach * 0.28;
      break;
    }

    case "extract": {
      const progress = smoothstep(
        input.extractionProgress ?? input.phase ?? 0,
      );
      const pull = smoothstep(clamp((progress - 0.32) / 0.48, 0, 1));
      channels.rootY = progress * 11;
      // The torso lunges left while the front arm raises the trophy. This
      // counter-translation keeps the full extraction arc inside the canonical
      // 256 px sheet instead of letting the hand escape past x=256 mid-motion.
      channels.rootX =
        progress * 5 - Math.sin(progress * Math.PI) * 35;
      channels.pelvis = -0.13 * progress;
      channels.torso = progress * 0.3;
      channels.head = -progress * 0.125;
      channels.armFrontUpper = -progress * 1.8;
      channels.armFrontLower = -pull * 1.2;
      channels.armBackUpper = progress * 0.48;
      channels.armBackLower = progress * 0.54;
      channels.legFrontUpper = -progress * 0.6;
      channels.legFrontLower = progress * 1.26;
      channels.legBackUpper = progress * 0.21;
      channels.legBackLower = progress * 0.94;
      break;
    }
  }

  return channels;
}

function matrixFromTransform(
  x: number,
  y: number,
  rotation = 0,
  scaleX = 1,
  scaleY = 1,
): AffineMatrix {
  const cosine = Math.cos(rotation);
  const sine = Math.sin(rotation);
  return {
    a: cosine * scaleX,
    b: sine * scaleX,
    c: -sine * scaleY,
    d: cosine * scaleY,
    e: x,
    f: y,
  };
}

export function multiplyAffine(
  parent: AffineMatrix,
  local: AffineMatrix,
): AffineMatrix {
  return {
    a: parent.a * local.a + parent.c * local.b,
    b: parent.b * local.a + parent.d * local.b,
    c: parent.a * local.c + parent.c * local.d,
    d: parent.b * local.c + parent.d * local.d,
    e: parent.a * local.e + parent.c * local.f + parent.e,
    f: parent.b * local.e + parent.d * local.f + parent.f,
  };
}

export function invertAffine(matrix: AffineMatrix): AffineMatrix {
  const determinant = matrix.a * matrix.d - matrix.b * matrix.c;
  if (Math.abs(determinant) < 1e-10) {
    throw new Error("Cannot invert a singular hunter-rig matrix.");
  }
  const inverseDeterminant = 1 / determinant;
  return {
    a: matrix.d * inverseDeterminant,
    b: -matrix.b * inverseDeterminant,
    c: -matrix.c * inverseDeterminant,
    d: matrix.a * inverseDeterminant,
    e:
      (matrix.c * matrix.f - matrix.d * matrix.e) *
      inverseDeterminant,
    f:
      (matrix.b * matrix.e - matrix.a * matrix.f) *
      inverseDeterminant,
  };
}

export function relativeBoneMatrix(
  frame: HunterRigFrame,
  bindFrame: HunterRigFrame,
  boneId: HunterRigBoneId,
): AffineMatrix {
  return multiplyAffine(frame.bones[boneId], invertAffine(bindFrame.bones[boneId]));
}

export function transformPoint(
  matrix: AffineMatrix,
  point: RigPoint,
): RigPoint {
  return {
    x: matrix.a * point.x + matrix.c * point.y + matrix.e,
    y: matrix.b * point.x + matrix.d * point.y + matrix.f,
  };
}

/**
 * Resolves a complete canonical hunter skeleton for one render frame.
 */
export function solveHunterRig(input: HunterRigInput): HunterRigFrame {
  const pose = solvePose(input);
  const facing: HunterRigFacing = input.facing < 0 ? -1 : 1;
  if (input.handAimAngle !== undefined) {
    const localHandAim =
      facing > 0
        ? input.handAimAngle
        : Math.PI - input.handAimAngle;
    const clampedHandAim = clamp(localHandAim, -1.05, 0.55);
    const frontArm = solveTwoBoneAim(
      clampedHandAim + 0.38,
      60,
      { x: 24, y: 35 },
      { x: 33, y: 68 },
      -1,
    );
    const stringArm = solveTwoBoneAim(
      0.62 + clampedHandAim * 0.18,
      72,
      { x: -33, y: 35 },
      { x: -10, y: 70 },
      -1,
    );
    pose.armFrontUpper = frontArm.upper;
    pose.armFrontLower = frontArm.lower;
    pose.armBackUpper = stringArm.upper;
    pose.armBackLower = stringArm.lower;
  }
  const scale = Math.max(0.001, input.scale ?? 1);
  const recoil = clamp(input.recoil ?? 0, 0, 1);
  const hasExplicitAim = input.aimAngle !== undefined;
  const desiredWorldAim =
    input.aimAngle ?? (facing > 0 ? 0 : Math.PI);
  const localAim = hasExplicitAim
    ? facing > 0
      ? desiredWorldAim
      : Math.PI - desiredWorldAim
    : 0;

  const clampedAim = clamp(localAim, -1.5, 1.5);
  const casterMountRotation = 0;
  // The two support arms articulate independently while the yoke absorbs the
  // remaining angle. At zero aim every module returns exactly to its atlas
  // registration point.
  const casterUpperRotation = clampedAim * 0.16;
  const casterLowerRotation = clampedAim * -0.08;
  const casterAncestorRotation =
    pose.pelvis +
    pose.torso +
    casterMountRotation +
    casterUpperRotation +
    casterLowerRotation;
  const casterYokeRotation = hasExplicitAim
    ? localAim - casterAncestorRotation
    : 0;

  const dynamicRotations: Partial<Record<HunterRigBoneId, number>> = {
    pelvis: pose.pelvis,
    torso: pose.torso,
    head: pose.head,
    armFrontUpper: pose.armFrontUpper,
    armFrontLower: pose.armFrontLower,
    armBackUpper: pose.armBackUpper,
    armBackLower: pose.armBackLower,
    legFrontUpper: pose.legFrontUpper,
    legFrontLower: pose.legFrontLower,
    legBackUpper: pose.legBackUpper,
    legBackLower: pose.legBackLower,
    casterShoulderMount: casterMountRotation,
    casterUpperArm: casterUpperRotation,
    casterLowerArm: casterLowerRotation,
    casterYoke: casterYokeRotation,
  };

  const localMatrices = {} as Record<HunterRigBoneId, AffineMatrix>;
  const bones = {} as Record<HunterRigBoneId, AffineMatrix>;

  for (const boneId of HUNTER_RIG_BONE_ORDER) {
    const definition = BONE_DEFINITIONS[boneId];
    if (boneId === "root") {
      const root = matrixFromTransform(
        HUNTER_RIG_CANVAS.width / 2 +
          (input.worldX ?? 0) +
          pose.rootX * facing * scale,
        HUNTER_RIG_CANVAS.groundY +
          (input.worldY ?? 0) +
          pose.rootY * scale,
        0,
        facing * scale,
        scale,
      );
      localMatrices.root = root;
      bones.root = root;
      continue;
    }

    let x = definition.x;
    if (boneId === "casterBarrel") x -= recoil * 8;
    const local = matrixFromTransform(
      x,
      definition.y,
      (definition.rotation ?? 0) + (dynamicRotations[boneId] ?? 0),
    );
    localMatrices[boneId] = local;
    const parentId = definition.parentId;
    if (!parentId) {
      throw new Error(`Rig bone ${boneId} has no parent.`);
    }
    bones[boneId] = multiplyAffine(bones[parentId], local);
  }

  return {
    canvas: HUNTER_RIG_CANVAS,
    pose: input.pose,
    facing,
    localMatrices,
    bones,
    anchors: {
      muzzle: transformPoint(bones.casterMuzzle, { x: 0, y: 0 }),
      handGrip: transformPoint(bones.handFront, { x: 6, y: 13 }),
      trophyCarry: transformPoint(bones.handFront, { x: 6, y: 13 }),
      maskCenter: transformPoint(bones.head, { x: 31, y: -33 }),
    },
  };
}
