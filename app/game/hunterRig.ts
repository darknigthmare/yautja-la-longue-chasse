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
  pelvis: { parentId: "root", x: 0, y: -142 },
  torso: { parentId: "pelvis", x: 0, y: -82 },
  head: { parentId: "torso", x: 18, y: -70 },

  armFrontUpper: { parentId: "torso", x: 28, y: -20 },
  armFrontLower: { parentId: "armFrontUpper", x: 0, y: 54 },
  handFront: { parentId: "armFrontLower", x: 0, y: 49 },
  armBackUpper: { parentId: "torso", x: -23, y: -17 },
  armBackLower: { parentId: "armBackUpper", x: 0, y: 52 },
  handBack: { parentId: "armBackLower", x: 0, y: 47 },

  legFrontUpper: { parentId: "pelvis", x: 16, y: -3 },
  legFrontLower: { parentId: "legFrontUpper", x: 0, y: 63 },
  footFront: { parentId: "legFrontLower", x: 0, y: 67 },
  legBackUpper: { parentId: "pelvis", x: -15, y: -1 },
  legBackLower: { parentId: "legBackUpper", x: 0, y: 62 },
  footBack: { parentId: "legBackLower", x: 0, y: 68 },

  casterShoulderMount: { parentId: "torso", x: -22, y: -34 },
  casterUpperArm: { parentId: "casterShoulderMount", x: 0, y: 0 },
  casterLowerArm: { parentId: "casterUpperArm", x: 20, y: 0 },
  casterYoke: { parentId: "casterLowerArm", x: 18, y: 0 },
  casterCannon: { parentId: "casterYoke", x: 0, y: 0 },
  casterBarrel: { parentId: "casterCannon", x: 30, y: 0 },
  casterMuzzle: { parentId: "casterBarrel", x: 34, y: 0 },
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

function basePose(): PoseChannels {
  return {
    rootX: 0,
    rootY: 0,
    pelvis: 0,
    torso: -0.035,
    head: 0.055,
    armFrontUpper: -0.36,
    armFrontLower: -0.16,
    armBackUpper: 0.3,
    armBackLower: 0.2,
    legFrontUpper: 0.08,
    legFrontLower: 0.08,
    legBackUpper: -0.07,
    legBackLower: 0.12,
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
        0.12 + Math.max(0, -Math.sin(cycle)) * 0.92 * motion;
      channels.legBackLower =
        0.12 + Math.max(0, -opposite) * 0.92 * motion;
      channels.armFrontUpper = -0.18 - stride * 0.62;
      channels.armBackUpper = 0.18 + stride * 0.62;
      channels.armFrontLower = -0.12 + Math.max(0, stride) * 0.28;
      channels.armBackLower = 0.16 + Math.max(0, -stride) * 0.28;
      break;
    }

    case "jump": {
      const progress = clamp(input.phase ?? 0.45, 0, 1);
      const lift = Math.sin(progress * Math.PI);
      const launch = 1 - smoothstep(progress * 2);
      channels.rootY = launch * 5 - lift * 2;
      channels.pelvis = -0.08 * lift;
      channels.torso = -0.1 - lift * 0.08;
      channels.armFrontUpper = -0.72 + lift * 0.18;
      channels.armBackUpper = 0.58 - lift * 0.12;
      channels.armFrontLower = -0.42;
      channels.armBackLower = 0.46;
      channels.legFrontUpper = -0.34 - lift * 0.16;
      channels.legFrontLower = 0.72 + lift * 0.22;
      channels.legBackUpper = 0.22 + lift * 0.12;
      channels.legBackLower = 0.5 + lift * 0.28;
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
      channels.rootX = progress * 5;
      channels.pelvis = -0.13 * progress;
      channels.torso = -0.04 + progress * 0.34;
      channels.head = 0.055 - progress * 0.18;
      channels.armFrontUpper = -0.36 - progress * 1.03;
      channels.armFrontLower = -0.16 - pull * 0.74;
      channels.armBackUpper = 0.3 + progress * 0.18;
      channels.armBackLower = 0.2 + progress * 0.34;
      channels.legFrontUpper = 0.08 - progress * 0.68;
      channels.legFrontLower = 0.08 + progress * 1.18;
      channels.legBackUpper = -0.07 + progress * 0.28;
      channels.legBackLower = 0.12 + progress * 0.82;
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
  const scale = Math.max(0.001, input.scale ?? 1);
  const recoil = clamp(input.recoil ?? 0, 0, 1);
  const desiredWorldAim =
    input.aimAngle ?? (facing > 0 ? 0 : Math.PI);
  const localAim =
    facing > 0 ? desiredWorldAim : Math.PI - desiredWorldAim;

  const casterMountRotation = 0.08;
  const casterUpperRotation =
    -0.72 + clamp(localAim, -1.5, 1.5) * 0.12;
  const casterLowerRotation =
    1.24 - clamp(localAim, -1.5, 1.5) * 0.08;
  const casterAncestorRotation =
    pose.pelvis +
    pose.torso +
    casterMountRotation +
    casterUpperRotation +
    casterLowerRotation;
  const casterYokeRotation = localAim - casterAncestorRotation;

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
      handGrip: transformPoint(bones.handFront, { x: 0, y: 17 }),
      trophyCarry: transformPoint(bones.pelvis, { x: -20, y: 2 }),
      maskCenter: transformPoint(bones.head, { x: 11, y: -3 }),
    },
  };
}
