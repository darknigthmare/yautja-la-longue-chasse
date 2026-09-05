/**
 * Deterministic presentation adapter for THE PIT. Poses never change combat
 * positions, hitboxes, action timing, damage, saves or replay inputs.
 * Canonical frames include facing; the Canvas renderer owns screen placement.
 */
import {
  HUNTER_RIG_CANVAS,
  solveHunterRig,
  transformPoint,
  type HunterRigFrame,
  type HunterRigInput,
} from "./hunterRig";
import {
  PIT_FIGHTERS,
  PIT_TICK_RATE,
  type PitFighterState,
} from "./systems/pitCombat";

type ActionStage = "startup" | "active" | "recovery";
type ActionMotion =
  | "light" | "medium" | "heavy" | "throw"
  | "technique-disc" | "technique-ground-slam"
  | "technique-caster" | "technique-charge" | "technique";

export interface PitFighterAnimation {
  frame: HunterRigFrame;
  motion: string;
  /** Normalized visual extension; not an additional combat hitbox. */
  bladeExtension: number;
}

type Joints = NonNullable<HunterRigInput["jointRotations"]>;
interface KeyPose {
  joints: Joints;
  x?: number;
  y?: number;
}

// Local angles are authored once facing right. The rig mirrors the complete
// hierarchy, retaining arm/weapon attachment relationships on the other side.
const READY: KeyPose = {
  joints: {
    torso: 0.045, head: -0.035,
    armFrontUpper: 0.2, armFrontLower: -1.25,
    armBackUpper: -0.25, armBackLower: -0.75,
    legFrontUpper: -0.08, legFrontLower: 0.14,
    legBackUpper: 0.06, legBackLower: 0.08,
  },
};
const GUARD: KeyPose = {
  joints: {
    torso: -0.08, head: 0.06,
    armFrontUpper: 0.45, armFrontLower: -2.1,
    armBackUpper: -0.5, armBackLower: -1.65,
    legFrontUpper: -0.18, legFrontLower: 0.34,
    legBackUpper: 0.2, legBackLower: 0.28,
  },
};
const CROUCH: Joints = {
  pelvis: -0.12, torso: 0.28, head: -0.12,
  legFrontUpper: -1.3, legFrontLower: 1.95, footFront: -0.65,
  legBackUpper: -1.35, legBackLower: 1.9, footBack: -0.55,
};
const ATTACK_KEYS: Record<"light" | "medium" | "heavy" | "throw", readonly [KeyPose, KeyPose]> = {
  light: [
    { joints: { torso: -0.1, head: 0.06, armFrontUpper: 0.48, armFrontLower: -1.94, armBackUpper: -0.5, armBackLower: -1.3 }, x: -5 },
    { joints: { torso: 0.12, head: -0.08, armFrontUpper: -0.72, armFrontLower: 0.55, armBackUpper: -0.45, armBackLower: -1.2 }, x: 9 },
  ],
  medium: [
    { joints: { pelvis: -0.09, torso: -0.23, head: 0.13, armFrontUpper: 0.8, armFrontLower: -1.72, armBackUpper: -0.55, armBackLower: -1.05 }, x: -9 },
    { joints: { pelvis: 0.07, torso: 0.2, head: -0.13, armFrontUpper: -1.05, armFrontLower: 0.7, armBackUpper: -0.85, armBackLower: -0.8 }, x: 12 },
  ],
  heavy: [
    { joints: { torso: -0.12, head: 0.04, armFrontUpper: -1.4, armFrontLower: -1.08, armBackUpper: -1.5, armBackLower: -0.95, legFrontUpper: -0.22, legFrontLower: 0.46 }, x: -7 },
    { joints: { pelvis: 0.05, torso: 0.28, head: -0.18, armFrontUpper: -0.22, armFrontLower: 0.48, armBackUpper: -0.38, armBackLower: -0.55, legFrontUpper: -0.32, legFrontLower: 0.5 }, x: 8 },
  ],
  throw: [
    { joints: { torso: -0.09, armFrontUpper: 0.28, armFrontLower: -1.65, armBackUpper: -0.35, armBackLower: -1.35 }, x: -3 },
    { joints: { torso: 0.17, head: -0.1, armFrontUpper: -0.72, armFrontLower: 0.12, armBackUpper: -1.14, armBackLower: -0.95 }, x: 8 },
  ],
};

const clamp = (value: number, low = 0, high = 1): number =>
  Math.max(low, Math.min(high, value));
const smooth = (value: number): number => {
  const t = clamp(value);
  return t * t * (3 - 2 * t);
};

function blend(a: KeyPose, b: KeyPose, amount: number): KeyPose {
  const t = clamp(amount);
  const joints: Joints = {};
  for (const bone of new Set([...Object.keys(a.joints), ...Object.keys(b.joints)]) as Set<keyof Joints>) {
    const start = a.joints[bone] ?? READY.joints[bone] ?? 0;
    const end = b.joints[bone] ?? READY.joints[bone] ?? 0;
    joints[bone] = start + (end - start) * t;
  }
  return {
    joints: { ...READY.joints, ...joints },
    x: (a.x ?? 0) + ((b.x ?? 0) - (a.x ?? 0)) * t,
    y: (a.y ?? 0) + ((b.y ?? 0) - (a.y ?? 0)) * t,
  };
}

/** Timing is read from the action, including its exact startup/contact window. */
function actionPose(
  fighter: PitFighterState,
): { pose: KeyPose; motion: string; bladeExtension: number; aimAngle?: number; recoil?: number } {
  const action = fighter.action!;
  const definition = PIT_FIGHTERS[fighter.definitionId];
  const stage: ActionStage = fighter.phase === "active"
    ? "active"
    : fighter.phase === "recovery" ? "recovery" : "startup";
  // Throw's current 7/2/21 timing is presentation-only; this module does not
  // expose or change the simulation's private throw constants.
  const durations = action.kind === "throw"
    ? { startup: 7, active: 2, recovery: 21 }
    : definition.attacks[action.attack!];
  const elapsed = action.frame;
  let name: ActionMotion = action.kind === "throw" ? "throw" : action.attack!;
  let keys: readonly [KeyPose, KeyPose];
  let aimAngle: number | undefined;
  let recoil: number | undefined;

  if (name === "technique") {
    const device = definition.technique.device;
    if (device === "disc") {
      name = "technique-disc";
      keys = [
        { joints: { torso: -0.2, armFrontUpper: 0.64, armFrontLower: -1.9, armBackUpper: -0.45, armBackLower: -1.3 }, x: -5 },
        { joints: { torso: 0.12, armFrontUpper: -0.95, armFrontLower: 0.55, armBackUpper: -0.4, armBackLower: -1.1 }, x: 8 },
      ];
    } else if (device === "shockwave" || device === "warlord-wave") {
      name = "technique-ground-slam";
      keys = [
        ATTACK_KEYS.heavy[0],
        { joints: { ...CROUCH, torso: 0.48, armFrontUpper: -0.12, armFrontLower: 0.28, armBackUpper: -0.25, armBackLower: -0.2 }, x: 8 },
      ];
    } else if (device === "plasma") {
      name = "technique-caster";
      keys = [GUARD, { joints: { ...GUARD.joints, torso: -0.12, head: 0.08 }, x: -4 }];
      aimAngle = fighter.facing > 0 ? 0 : Math.PI;
      recoil = stage === "active" ? 1 - clamp((elapsed - durations.startup) / durations.active) : 0;
    } else if (definition.technique.ownerDashSpeed > 0) {
      name = "technique-charge";
      keys = [
        { joints: { ...GUARD.joints, pelvis: -0.12, torso: 0.22, legFrontUpper: -0.38, legFrontLower: 0.62 }, x: -7 },
        { joints: { ...GUARD.joints, pelvis: 0.12, torso: 0.35, head: -0.18, armFrontUpper: 0.35, armFrontLower: -1.9 }, x: 12 },
      ];
    } else {
      keys = ATTACK_KEYS.medium;
    }
  } else {
    keys = ATTACK_KEYS[name];
  }

  const contactEnd = durations.startup + durations.active;
  let pose: KeyPose;
  if (stage === "startup") {
    const progress = clamp(elapsed / Math.max(1, durations.startup));
    // Build anticipation, then travel toward contact before the first active
    // tick. Rendering never starts or delays the combat contact window.
    pose = progress < 0.6
      ? blend(READY, keys[0], smooth(progress / 0.6))
      : blend(keys[0], keys[1], smooth((progress - 0.6) / 0.4));
  } else if (stage === "active") {
    pose = blend(keys[1], { ...keys[1], x: (keys[1].x ?? 0) + 2 }, clamp((elapsed - durations.startup) / Math.max(1, durations.active)) * 0.5);
  } else {
    pose = blend(keys[1], READY, smooth((elapsed - contactEnd) / Math.max(1, durations.recovery - 1)));
  }
  return {
    pose,
    motion: name + "-" + stage,
    bladeExtension: action.kind === "throw" || action.attack === "technique"
      ? 0
      : stage === "startup"
        ? smooth(elapsed / Math.max(1, durations.startup * 0.65))
        : stage === "active" ? 1
          : 1 - smooth((elapsed - contactEnd) / Math.max(1, durations.recovery - 1)),
    aimAngle,
    recoil,
  };
}

/**
 * Resolve only the visible skeleton. A throw pose is a reach and follow-through,
 * not a new synchronized victim-grab mechanic.
 */
export function resolvePitFighterAnimation(
  fighter: PitFighterState,
  simulationFrame: number,
): PitFighterAnimation {
  const tick = Number.isFinite(simulationFrame) ? Math.max(0, Math.floor(simulationFrame)) : 0;
  const cycle = tick / 32 * Math.PI * 2;
  const speed = Math.abs(fighter.velocityX) * PIT_TICK_RATE;
  const definition = PIT_FIGHTERS[fighter.definitionId];
  let motion = "idle";
  let pose: KeyPose = { joints: { ...READY.joints } };
  let bladeExtension = 0;
  let rootRotation = 0;
  let aimAngle: number | undefined;
  let recoil: number | undefined;
  let plantFeet = fighter.grounded;

  if (fighter.health <= 0 || fighter.phase === "knockdown") {
    motion = fighter.health <= 0 ? "ko" : "knockdown";
    const elapsed = Math.max(0, tick - fighter.comboLastHitFrame);
    const fall = smooth(elapsed / 12);
    const rising = fighter.health > 0 && fighter.knockdownFrames < 10
      ? smooth(1 - fighter.knockdownFrames / 10)
      : 0;
    const collapsed = fall * (1 - rising);
    pose = {
      joints: {
        ...READY.joints, torso: 0, head: 0,
        armFrontUpper: 0.2, armFrontLower: 0.4,
        armBackUpper: -0.4, armBackLower: -1,
        legFrontUpper: 0.2, legFrontLower: -0.2,
        legBackUpper: -0.7, legBackLower: 0.7,
      },
      x: 26 * collapsed,
      y: -23 * collapsed,
    };
    rootRotation = -Math.PI / 2 * collapsed;
    plantFeet = false;
  } else if (fighter.phase === "hitstun") {
    motion = "hitstun";
    const recoilAmount = 0.65 + 0.35 * Math.exp(-Math.max(0, tick - fighter.comboLastHitFrame) / 5);
    pose = {
      joints: {
        ...READY.joints, torso: -0.26 * recoilAmount,
        head: -0.14 * recoilAmount,
        armFrontUpper: -0.45, armFrontLower: -0.7,
        armBackUpper: -0.75, armBackLower: -0.25,
      },
      x: -9 * recoilAmount,
    };
  } else if (fighter.phase === "blockstun" || fighter.guard !== null) {
    const low = fighter.guard === "low" || fighter.crouching;
    motion = fighter.phase === "blockstun"
      ? low ? "blockstun-low" : "blockstun-high"
      : low ? "guard-low" : "guard-high";
    pose = {
      joints: { ...GUARD.joints, ...(low ? CROUCH : {}) },
      x: fighter.phase === "blockstun" ? -5 : 0,
    };
  } else if (fighter.action) {
    const result = actionPose(fighter);
    pose = result.pose;
    motion = result.motion;
    bladeExtension = result.bladeExtension;
    aimAngle = result.aimAngle;
    recoil = result.recoil;
    if (fighter.crouching) {
      pose.joints = { ...pose.joints, ...CROUCH, torso: (pose.joints.torso ?? 0) + 0.16 };
    } else if (!fighter.grounded) {
      pose.joints = {
        ...pose.joints, legFrontUpper: -0.65, legFrontLower: 0.95,
        legBackUpper: 0.28, legBackLower: 0.54,
      };
    }
  } else if (!fighter.grounded) {
    motion = fighter.velocityY > 0 ? "jump" : "fall";
    pose = {
      joints: {
        ...READY.joints, torso: motion === "jump" ? -0.1 : 0.04,
        armFrontUpper: -0.32, armFrontLower: -1.05,
        armBackUpper: -0.55, armBackLower: -0.7,
        legFrontUpper: -0.65,
        legFrontLower: motion === "jump" ? 1.15 : 0.68,
        legBackUpper: 0.28,
        legBackLower: motion === "jump" ? 0.64 : 0.25,
      },
    };
  } else if (fighter.crouching) {
    motion = speed > 1 ? "crouch-walk" : "crouch";
    const shuffle = speed > 1 ? Math.sin(cycle) * 0.13 : 0;
    pose = { joints: { ...READY.joints, ...CROUCH, legFrontUpper: CROUCH.legFrontUpper! + shuffle, legBackUpper: CROUCH.legBackUpper! - shuffle } };
  } else if (speed > 1) {
    const forward = fighter.velocityX * fighter.facing >= 0;
    motion = forward ? "walk-forward" : "walk-backward";
    const stride = Math.sin(cycle) * clamp(speed / (definition.walkSpeed * PIT_TICK_RATE)) * (forward ? 0.46 : -0.34);
    pose = {
      joints: {
        ...READY.joints, torso: forward ? 0.08 : -0.04,
        legFrontUpper: -0.06 + stride, legBackUpper: 0.04 - stride,
        legFrontLower: 0.12 + Math.max(0, -stride) * 1.2,
        legBackLower: 0.12 + Math.max(0, stride) * 1.2,
        armFrontUpper: 0.2 - stride * 0.18,
        armBackUpper: -0.25 + stride * 0.3,
      },
    };
  } else {
    const breath = Math.sin(tick / 150 * Math.PI * 2);
    pose.joints.torso = (pose.joints.torso ?? 0) + breath * 0.016;
    pose.joints.head = (pose.joints.head ?? 0) - breath * 0.01;
  }

  const rigInput: HunterRigInput = {
    pose: "idle", phase: 0, facing: fighter.facing,
    jointRotations: pose.joints,
    rootOffset: { x: pose.x ?? 0, y: pose.y ?? 0 },
    rootRotation, aimAngle, recoil,
  };
  if (fighter.grounded && (fighter.crouching || fighter.guard === "low") && plantFeet) {
    // Low guard keeps BOTH soles on the floor. Each leg has different bind
    // vectors, so identical joint angles would leave one foot floating.
    rigInput.rootOffset = { x: pose.x ?? 0, y: (pose.y ?? 0) + 64 };
    const rightFrame = solveHunterRig({ ...rigInput, facing: 1 });
    const parentAngle = Math.atan2(rightFrame.bones.pelvis.b, rightFrame.bones.pelvis.a);
    const joints = { ...pose.joints };
    for (const leg of [
      { upper: "legFrontUpper", lower: "legFrontLower", foot: "footFront", v1: [16, 62], v2: [6, 61], target: [175, 344] },
      { upper: "legBackUpper", lower: "legBackLower", foot: "footBack", v1: [-18, 58], v2: [-20, 66], target: [70, 346] },
    ] as const) {
      const hip = rightFrame.bones[leg.upper];
      const dx = leg.target[0] + (pose.x ?? 0) - hip.e;
      const dy = leg.target[1] - hip.f;
      const length1 = Math.hypot(...leg.v1), length2 = Math.hypot(...leg.v2);
      const distance = Math.max(1, Math.min(length1 + length2 - .001, Math.hypot(dx, dy)));
      const cosine = Math.max(-1, Math.min(1, (length1 * length1 + distance * distance - length2 * length2) / (2 * length1 * distance)));
      const upperAngle = Math.atan2(dy, dx) - Math.acos(cosine);
      const lowerAngle = Math.atan2(dy - Math.sin(upperAngle) * length1, dx - Math.cos(upperAngle) * length1);
      joints[leg.upper] = upperAngle - parentAngle - Math.atan2(leg.v1[1], leg.v1[0]);
      joints[leg.lower] = lowerAngle - parentAngle - joints[leg.upper]! - Math.atan2(leg.v2[1], leg.v2[0]);
      joints[leg.foot] = -(parentAngle + joints[leg.upper]! + joints[leg.lower]!);
    }
    rigInput.jointRotations = joints;
  }
  let frame = solveHunterRig(rigInput);
  if (plantFeet) {
    // Lock the lower support foot to the canonical floor. Crouching bends
    // hips/knees instead of scaling the entire character and its equipment.
    const supportY = Math.max(
      transformPoint(frame.bones.footFront, { x: 0, y: 22 }).y,
      transformPoint(frame.bones.footBack, { x: 0, y: 20 }).y,
    );
    frame = solveHunterRig({
      ...rigInput,
      rootOffset: { x: pose.x ?? 0, y: (rigInput.rootOffset?.y ?? 0) + HUNTER_RIG_CANVAS.groundY - supportY },
    });
  }
  if (fighter.grounded && !plantFeet && (motion === "ko" || motion === "knockdown")) {
    // A fallen body rests on its side, not on the standing foot anchor.
    const supportPoints = [
      transformPoint(frame.bones.head, { x: -30, y: -34 }),
      transformPoint(frame.bones.head, { x: 30, y: -34 }),
      transformPoint(frame.bones.torso, { x: -42, y: -60 }),
      transformPoint(frame.bones.torso, { x: 42, y: -60 }),
      transformPoint(frame.bones.pelvis, { x: -30, y: 20 }),
      transformPoint(frame.bones.pelvis, { x: 30, y: 20 }),
      transformPoint(frame.bones.footFront, { x: 0, y: 22 }),
      transformPoint(frame.bones.footBack, { x: 0, y: 20 }),
    ];
    const bottom = Math.max(...supportPoints.map((point) => point.y));
    frame = solveHunterRig({
      ...rigInput,
      rootOffset: { x: pose.x ?? 0, y: (pose.y ?? 0) + HUNTER_RIG_CANVAS.groundY - bottom },
    });
  }
  return { frame, motion, bladeExtension };
}
