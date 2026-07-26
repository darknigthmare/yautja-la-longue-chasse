"use client";

/* eslint-disable @next/next/no-img-element */

import type { CSSProperties } from "react";

import type {
  ArmorId,
  GearId,
  HunterAppearance,
  LaserColorId,
  WeaponId,
} from "./types";
import {
  hunterBodyPartHasNet,
  HUNTER_ARMOR_FIT_BY_MORPH,
  HUNTER_ARMOR_MODULES,
  HUNTER_BODY_PART_BONES,
  HUNTER_EQUIPMENT_V3,
  HUNTER_GAUNTLET_FIT_BY_MORPH,
  HUNTER_GAUNTLET_HINGE,
  HUNTER_GEAR_V3,
  HUNTER_TROPHIES_V3,
  HUNTER_WEAPONS_V3,
  hunterArmorPath,
  hunterBodyPartPath,
  hunterDreadPath,
  hunterMaskRigPath,
  hunterNetPartPath,
  type HunterBodyPartId,
} from "./hunterVisuals";
import {
  HUNTER_RIG_CANVAS,
  multiplyAffine,
  relativeBoneMatrix,
  solveHunterRig,
  type AffineMatrix,
  type HunterRigBoneId,
  type HunterRigFacing,
  type HunterRigPose,
} from "./hunterRig";

export interface HunterRigPreviewProps {
  appearance: HunterAppearance;
  armorId: ArmorId;
  weaponIds: readonly WeaponId[];
  gearIds?: readonly GearId[];
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  label?: string;
  maskWorn?: boolean;
  gauntletOpen?: boolean;
  bladesExtended?: boolean;
  aiming?: boolean;
  trophyCarried?: boolean;
  pose?: HunterRigPose;
  phase?: number;
  facing?: HunterRigFacing;
  speed?: number;
  verticalVelocity?: number;
  extractionProgress?: number;
  aimAngle?: number;
  recoil?: number;
  debugBones?: boolean;
}

const SKIN_FILTER: Record<HunterAppearance["skinId"], string> = {
  "ochre-mottle": "none",
  "ashen-mottle":
    "grayscale(.42) sepia(.12) hue-rotate(155deg) brightness(.96)",
  "dark-mottle": "saturate(.78) brightness(.72) contrast(1.12)",
};

const DREAD_FILTER: Record<HunterAppearance["dreadTintId"], string> = {
  obsidian: "saturate(.72) brightness(.68) contrast(1.22)",
  umber: "sepia(.54) saturate(.9) brightness(.76)",
  ashen: "grayscale(.82) brightness(1.05) contrast(.94)",
};

const ARMOR_FILTER: Record<HunterAppearance["armorTintId"], string> = {
  gunmetal: "brightness(1)",
  bronze: "sepia(.48) saturate(1.22) hue-rotate(346deg) brightness(1.02)",
  obsidian: "saturate(.68) brightness(.58) contrast(1.2)",
};

const LASER_COLORS: Readonly<Record<LaserColorId, { solid: string; fade: string; shadow: string }>> = {
  crimson: { solid: "rgb(255 48 42)", fade: "rgb(255 48 42 / .06)", shadow: "rgb(255 48 42 / .82)" },
  electric: { solid: "rgb(41 137 255)", fade: "rgb(41 137 255 / .06)", shadow: "rgb(41 137 255 / .82)" },
  amber: { solid: "rgb(255 177 43)", fade: "rgb(255 177 43 / .06)", shadow: "rgb(255 177 43 / .82)" },
  violet: { solid: "rgb(184 71 255)", fade: "rgb(184 71 255 / .06)", shadow: "rgb(184 71 255 / .82)" },
  cyan: { solid: "rgb(64 239 255)", fade: "rgb(64 239 255 / .06)", shadow: "rgb(64 239 255 / .82)" },
};

const ARMOR_LABEL: Record<ArmorId, string> = {
  scout: "éclaireur",
  hunter: "chasseur",
  berserker: "berserker",
};

const BODY_LAYER_ORDER: readonly HunterBodyPartId[] = [
  "thigh-back",
  "shin-back",
  "foot-back",
  "upper-arm-back",
  "lower-arm-back",
  "hand-back",
  "pelvis",
  "torso",
  "head",
  "thigh-front",
  "shin-front",
  "foot-front",
  "upper-arm-front",
  "lower-arm-front",
  "hand-front",
];

/**
 * One dread texture represents one independently animated strand. These
 * offsets distribute seven instances around the canonical skull root instead
 * of stacking several unrelated styles at exactly the same coordinates.
 */
const DREAD_STRANDS = [
  { x: -12, y: 3, rest: -12, scale: 0.88, mirror: false },
  { x: -8, y: -1, rest: -8, scale: 0.96, mirror: false },
  { x: -4, y: -4, rest: -4, scale: 1.04, mirror: false },
  { x: 0, y: -5, rest: 0, scale: 1.08, mirror: false },
  { x: 4, y: -3, rest: 4, scale: 1.02, mirror: false },
  { x: 8, y: 2, rest: -10, scale: 0.72, mirror: false },
  { x: 12, y: 7, rest: -16, scale: 0.62, mirror: false },
] as const;

const DREAD_ROOT = { x: 143, y: 43 } as const;
const HAND_WEAPON_PIVOT = { x: 218, y: 229 } as const;

const GEAR_SLOT_OFFSETS = [
  { x: -24, y: 5 },
  { x: 24, y: 7 },
] as const;

const TROPHY_LAYOUT = {
  spine: {
    pivot: { x: 85, y: 216 },
    carry: { x: 130, y: 5, scale: 0.72 },
    belt: { x: -10, y: -4, scale: 0.62 },
  },
  skull: {
    pivot: { x: 99, y: 210 },
    carry: { x: 119, y: 14, scale: 0.62 },
    belt: { x: 28, y: 2, scale: 0.58 },
  },
  bindings: {
    pivot: { x: 85, y: 210 },
    carry: { x: 143, y: 18, scale: 0.45 },
    belt: { x: 68, y: 2, scale: 0.5 },
  },
} as const;

const BIND_FRAME = solveHunterRig({
  pose: "idle",
  facing: 1,
  phase: 0,
  aimAngle: 0,
});

const fullCanvasImage: CSSProperties = {
  position: "absolute",
  inset: 0,
  width: "100%",
  height: "100%",
  objectFit: "fill",
  transformOrigin: "0 0",
  pointerEvents: "none",
  userSelect: "none",
};

const rootBaseStyle: CSSProperties = {
  position: "relative",
  display: "inline-block",
  flex: "0 0 auto",
  aspectRatio: "2 / 3",
  overflow: "visible",
  isolation: "isolate",
  pointerEvents: "none",
  userSelect: "none",
};

function cssMatrix(matrix: AffineMatrix): string {
  // The browser normalizes CSS matrix numbers to six decimals before React
  // hydrates the server markup. Emitting that stable representation ourselves
  // keeps the SSR and client attributes byte-for-byte identical.
  const linearValues = [
    matrix.a,
    matrix.b,
    matrix.c,
    matrix.d,
    0,
    0,
  ].map((value) => Number(value.toFixed(6)));
  const translateX = Number(
    ((matrix.e / HUNTER_RIG_CANVAS.width) * 100).toFixed(6),
  );
  const translateY = Number(
    ((matrix.f / HUNTER_RIG_CANVAS.height) * 100).toFixed(6),
  );
  return (
    `translate(${translateX}%, ${translateY}%) ` +
    `matrix(${linearValues.join(", ")})`
  );
}

function cssPercentage(value: number, total: number): string {
  return `${Number(((value / total) * 100).toFixed(6))}%`;
}

function translation(x: number, y: number): AffineMatrix {
  return { a: 1, b: 0, c: 0, d: 1, e: x, f: y };
}

function rotationAround(
  x: number,
  y: number,
  angle: number,
): AffineMatrix {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  const rotation: AffineMatrix = {
    a: cosine,
    b: sine,
    c: -sine,
    d: cosine,
    e: 0,
    f: 0,
  };
  return multiplyAffine(
    multiplyAffine(translation(x, y), rotation),
    translation(-x, -y),
  );
}

function scaleAround(x: number, y: number, scale: number): AffineMatrix {
  return scaleAroundAxes(x, y, scale, scale);
}

function scaleAroundAxes(
  x: number,
  y: number,
  scaleX: number,
  scaleY: number,
): AffineMatrix {
  const scaling: AffineMatrix = {
    a: scaleX,
    b: 0,
    c: 0,
    d: scaleY,
    e: 0,
    f: 0,
  };
  return multiplyAffine(
    multiplyAffine(translation(x, y), scaling),
    translation(-x, -y),
  );
}

function buildAccessibleLabel({
  appearance,
  armorId,
  weaponIds,
  maskWorn,
  gauntletOpen,
  bladesExtended,
  aiming,
  trophyCarried,
}: Required<
  Pick<
    HunterRigPreviewProps,
    | "appearance"
    | "armorId"
    | "weaponIds"
    | "maskWorn"
    | "gauntletOpen"
    | "bladesExtended"
    | "aiming"
    | "trophyCarried"
  >
>): string {
  const details = [
    `morphologie ${appearance.bodyMorphId}`,
    `armure ${ARMOR_LABEL[armorId]} ${appearance.armorStyleId}`,
    maskWorn && appearance.biomaskId
      ? `biomasque ${appearance.biomaskId} porté`
      : "visage découvert",
    gauntletOpen ? "gantelet ouvert" : "gantelet fermé",
  ];

  if (weaponIds.includes("wristblades")) {
    details.push(bladesExtended ? "griffes sorties" : "griffes rétractées");
  }
  if (weaponIds.includes("plasma-caster")) {
    details.push(aiming ? "canon plasma en visée" : "canon plasma au repos");
  }
  if (trophyCarried) details.push("trophée porté");

  return `Aperçu modulaire du chasseur Yautja, ${details.join(", ")}.`;
}

function registeredLayer(
  path: string,
  matrix: AffineMatrix,
  zIndex: number,
  slot: string,
  filter?: string,
  opacity?: number,
): React.ReactNode {
  return (
    <img
      aria-hidden="true"
      alt=""
      data-rig-slot={slot}
      draggable={false}
      src={path}
      style={{
        ...fullCanvasImage,
        zIndex,
        opacity,
        filter,
        transform: cssMatrix(matrix),
      }}
    />
  );
}

export function HunterRigPreview({
  appearance,
  armorId,
  weaponIds,
  gearIds = [],
  size = 240,
  className,
  style,
  label,
  maskWorn = appearance.biomaskId !== null,
  gauntletOpen = false,
  bladesExtended = false,
  aiming = false,
  trophyCarried = false,
  pose = "idle",
  phase = 0,
  facing = 1,
  speed = 0,
  verticalVelocity = 0,
  extractionProgress = 0,
  aimAngle,
  recoil = 0,
  debugBones = false,
}: HunterRigPreviewProps) {
  const resolvedAimAngle =
    aimAngle ??
    (facing > 0
      ? aiming
        ? -0.24
        : 0
      : aiming
        ? Math.PI + 0.24
        : Math.PI);
  const carriedWeaponId = weaponIds.find(
    (weaponId) =>
      weaponId !== "plasma-caster" && weaponId !== "wristblades",
  );
  const frame = solveHunterRig({
    pose,
    phase,
    facing,
    speed,
    verticalVelocity,
    extractionProgress,
    aimAngle: aiming ? resolvedAimAngle : undefined,
    handAimAngle:
      aiming && carriedWeaponId === "yautja-bow"
        ? resolvedAimAngle
        : undefined,
    recoil,
  });
  const boneMatrix = (boneId: HunterRigBoneId) =>
    relativeBoneMatrix(frame, BIND_FRAME, boneId);

  const showsCaster = weaponIds.includes("plasma-caster");
  const showsWristblades = weaponIds.includes("wristblades");
  const showsTrophy =
    trophyCarried || appearance.trophyAdornmentId === "skull-spine";
  const handWeaponMatrix =
    carriedWeaponId === "yautja-bow" && aiming
      ? multiplyAffine(
          boneMatrix("handFront"),
          rotationAround(
            HAND_WEAPON_PIVOT.x,
            HAND_WEAPON_PIVOT.y,
            facing > 0
              ? resolvedAimAngle
              : Math.PI - resolvedAimAngle,
          ),
        )
      : boneMatrix("handFront");
  const uprightCarryMatrix: AffineMatrix = {
    a: facing,
    b: 0,
    c: 0,
    d: 1,
    e:
      frame.anchors.trophyCarry.x -
      facing * BIND_FRAME.anchors.trophyCarry.x +
      (pose === "extract" ? 18 * facing : 0),
    f:
      frame.anchors.trophyCarry.y -
      BIND_FRAME.anchors.trophyCarry.y,
  };
  const trophyMatrix = (partId: keyof typeof TROPHY_LAYOUT) => {
    const layout = TROPHY_LAYOUT[partId];
    const slot = trophyCarried ? layout.carry : layout.belt;
    return multiplyAffine(
      trophyCarried ? uprightCarryMatrix : boneMatrix("pelvis"),
      multiplyAffine(
        translation(slot.x, slot.y),
        scaleAround(layout.pivot.x, layout.pivot.y, slot.scale),
      ),
    );
  };
  const armorFamily = HUNTER_ARMOR_MODULES[appearance.armorStyleId];
  const armorFilter = `${ARMOR_FILTER[appearance.armorTintId]} drop-shadow(0 3px 3px rgb(0 0 0 / .82))`;
  const netOpacity =
    appearance.armorStyleId === "feral"
      ? 0.28
      : appearance.bodyMorphId === "super"
        ? 0.58
        : 0.9;
  const resolvedLabel =
    label ??
    buildAccessibleLabel({
      appearance,
      armorId,
      weaponIds,
      maskWorn,
      gauntletOpen,
      bladesExtended,
      aiming,
      trophyCarried,
    });

  const armorSlots: Array<{
    id: string;
    bone: HunterRigBoneId;
    z: number;
  }> = [
    { id: armorFamily.chest, bone: "torso", z: 44 },
    { id: armorFamily.shoulder, bone: "armFrontUpper", z: 52 },
    { id: "belt", bone: "pelvis", z: 49 },
  ];
  if (armorId !== "scout") {
    if (!showsWristblades) {
      armorSlots.push({ id: "bracer", bone: "armFrontLower", z: 55 });
    }
    armorSlots.push(
      { id: "thigh", bone: "legFrontUpper", z: 47 },
      { id: "knee", bone: "legFrontLower", z: 49 },
      { id: "thigh-lower", bone: "legFrontLower", z: 47 },
      { id: "shin", bone: "legFrontLower", z: 48 },
    );
  }

  const gauntletFit =
    HUNTER_GAUNTLET_FIT_BY_MORPH[appearance.bodyMorphId];
  const gauntletMatrix = multiplyAffine(
    boneMatrix("armBackLower"),
    translation(gauntletFit.translateX, gauntletFit.translateY),
  );
  const lidBase = gauntletMatrix;
  const lidMatrix = multiplyAffine(
    lidBase,
    rotationAround(
      HUNTER_GAUNTLET_HINGE.x,
      HUNTER_GAUNTLET_HINGE.y,
      gauntletOpen ? -1.12 : 0,
    ),
  );
  const bladeMatrix = multiplyAffine(
    boneMatrix("armFrontLower"),
    translation(bladesExtended ? 0 : -46, 0),
  );
  const muzzle = frame.anchors.muzzle;
  const reticleDistance = aiming ? 126 : 92;
  const reticle = {
    x: muzzle.x + Math.cos(resolvedAimAngle) * reticleDistance,
    y: muzzle.y + Math.sin(resolvedAimAngle) * reticleDistance,
  };
  const laserColor = LASER_COLORS[appearance.laserColorId ?? "crimson"];

  return (
    <div
      className={className}
      role="img"
      aria-label={resolvedLabel}
      data-hunter-rig=""
      data-rig-version="3"
      data-preset={appearance.presetId}
      data-body-morph={appearance.bodyMorphId}
      data-armor={armorId}
      data-armor-style={appearance.armorStyleId}
      data-mask={
        maskWorn && appearance.biomaskId ? appearance.biomaskId : "off"
      }
      data-aiming={aiming ? "true" : "false"}
      data-pose={pose}
      style={{
        ...rootBaseStyle,
        width: size,
        ...style,
      }}
    >
      <style>
        {`
          @keyframes hunter-rig-v3-dread-sway {
            0%, 100% { transform: rotate(var(--dread-rest)); }
            48% { transform: rotate(var(--dread-sway)); }
            74% { transform: rotate(var(--dread-drift)); }
          }
          @keyframes hunter-rig-v3-reticle {
            0%, 100% { opacity: .48; scale: .88; }
            50% { opacity: 1; scale: 1.1; }
          }
          @media (prefers-reduced-motion: reduce) {
            [data-rig-dread-inner],
            [data-hunter-rig-reticle] { animation: none !important; }
          }
        `}
      </style>

      {DREAD_STRANDS.map((strand, index) => {
        const offsetMatrix = multiplyAffine(
          translation(strand.x, strand.y),
          multiplyAffine(
            rotationAround(
              DREAD_ROOT.x,
              DREAD_ROOT.y,
              (strand.rest * Math.PI) / 180,
            ),
            scaleAroundAxes(
              DREAD_ROOT.x,
              DREAD_ROOT.y,
              strand.mirror ? -strand.scale : strand.scale,
              strand.scale,
            ),
          ),
        );
        const matrix = multiplyAffine(boneMatrix("head"), offsetMatrix);
        const sway = 2.4 + index * 0.58;
        return (
          <span
            aria-hidden="true"
            data-rig-slot={`dread-${index}`}
            key={`${appearance.dreadStyleId}-${index}`}
            style={{
              ...fullCanvasImage,
              zIndex: 4 + index,
              transform: cssMatrix(matrix),
            }}
          >
            <img
              alt=""
              data-rig-dread-inner=""
              draggable={false}
              src={hunterDreadPath(appearance.dreadStyleId)}
              style={
                {
                  ...fullCanvasImage,
                  filter: DREAD_FILTER[appearance.dreadTintId],
                  transformOrigin:
                    `${(DREAD_ROOT.x / HUNTER_RIG_CANVAS.width) * 100}% ` +
                    `${(DREAD_ROOT.y / HUNTER_RIG_CANVAS.height) * 100}%`,
                  animation:
                    `hunter-rig-v3-dread-sway ${3.5 + index * 0.28}s ` +
                    `${-index * 0.61}s ease-in-out infinite`,
                  "--dread-rest": "0deg",
                  "--dread-sway": `${sway}deg`,
                  "--dread-drift": `${-sway * 0.72}deg`,
                } as CSSProperties
              }
            />
          </span>
        );
      })}

      {showsTrophy && (
        <>
          {registeredLayer(
            HUNTER_TROPHIES_V3.spine,
            trophyMatrix("spine"),
            trophyCarried ? 73 : 12,
            "trophy-spine",
            "drop-shadow(0 3px 3px rgb(0 0 0 / .9))",
          )}
          {registeredLayer(
            HUNTER_TROPHIES_V3.skull,
            trophyMatrix("skull"),
            trophyCarried ? 74 : 13,
            "trophy-skull",
            "drop-shadow(0 3px 3px rgb(0 0 0 / .9))",
          )}
          {registeredLayer(
            HUNTER_TROPHIES_V3.bindings,
            trophyMatrix("bindings"),
            trophyCarried ? 75 : 14,
            "trophy-bindings",
            "drop-shadow(0 3px 3px rgb(0 0 0 / .9))",
          )}
        </>
      )}

      {BODY_LAYER_ORDER.flatMap((partId, index) => {
        const boneId = HUNTER_BODY_PART_BONES[partId] as HunterRigBoneId;
        const matrix = boneMatrix(boneId);
        const z = 20 + index * 2;
        return [
          <img
            aria-hidden="true"
            alt=""
            data-rig-slot={`body-${partId}`}
            draggable={false}
            key={`body-${partId}`}
            src={hunterBodyPartPath(appearance.bodyMorphId, partId)}
            style={{
              ...fullCanvasImage,
              zIndex: z,
              filter: SKIN_FILTER[appearance.skinId],
              transform: cssMatrix(matrix),
            }}
          />,
          ...(hunterBodyPartHasNet(appearance.bodyMorphId, partId)
            ? [
                <img
                  aria-hidden="true"
                  alt=""
                  data-rig-slot={`net-${partId}`}
                  draggable={false}
                  key={`net-${partId}`}
                  src={hunterNetPartPath(appearance.bodyMorphId, partId)}
                  style={{
                    ...fullCanvasImage,
                    zIndex: z + 1,
                    opacity: netOpacity,
                    transform: cssMatrix(matrix),
                  }}
                />,
              ]
            : []),
        ];
      })}

      {armorSlots.map((slot) => (
        <span key={`${slot.id}-${slot.bone}`}>
          {registeredLayer(
            hunterArmorPath(slot.id),
            slot.id === armorFamily.shoulder
              ? multiplyAffine(
                  boneMatrix(slot.bone),
                  scaleAround(
                    153,
                    110,
                    HUNTER_ARMOR_FIT_BY_MORPH[appearance.bodyMorphId]
                      .shoulderScale,
                  ),
                )
              : boneMatrix(slot.bone),
            slot.z,
            `armor-${slot.id}`,
            armorFilter,
          )}
        </span>
      ))}

      {gearIds.slice(0, 2).map((gearId, gearIndex) => (
        <span key={gearId}>
          {registeredLayer(
            HUNTER_GEAR_V3[gearId],
            multiplyAffine(
              boneMatrix("pelvis"),
              translation(
                GEAR_SLOT_OFFSETS[gearIndex].x,
                GEAR_SLOT_OFFSETS[gearIndex].y,
              ),
            ),
            53 + gearIndex,
            `gear-${gearId}`,
            "drop-shadow(0 2px 2px rgb(0 0 0 / .85))",
          )}
        </span>
      ))}

      {maskWorn &&
        appearance.biomaskId &&
        registeredLayer(
          hunterMaskRigPath(appearance.biomaskId),
          boneMatrix("head"),
          70,
          `mask-${appearance.biomaskId}`,
          "drop-shadow(0 2px 2px rgb(0 0 0 / .9))",
        )}

      {showsCaster && (
        <>
          {registeredLayer(
            HUNTER_EQUIPMENT_V3.plasma.mount,
            boneMatrix("casterShoulderMount"),
            56,
            "caster-mount",
          )}
          {registeredLayer(
            HUNTER_EQUIPMENT_V3.plasma.upperArm,
            boneMatrix("casterUpperArm"),
            57,
            "caster-upper-arm",
          )}
          {registeredLayer(
            HUNTER_EQUIPMENT_V3.plasma.lowerArm,
            boneMatrix("casterLowerArm"),
            58,
            "caster-lower-arm",
          )}
          {registeredLayer(
            HUNTER_EQUIPMENT_V3.plasma.yoke,
            boneMatrix("casterYoke"),
            59,
            "caster-yoke",
          )}
          {registeredLayer(
            HUNTER_EQUIPMENT_V3.plasma.cannon,
            boneMatrix("casterCannon"),
            60,
            "caster-cannon",
          )}
          {registeredLayer(
            HUNTER_EQUIPMENT_V3.plasma.barrel,
            boneMatrix("casterBarrel"),
            61,
            "caster-barrel",
          )}
          {registeredLayer(
            HUNTER_EQUIPMENT_V3.plasma.muzzle,
            boneMatrix("casterMuzzle"),
            62,
            "caster-muzzle",
          )}
          {registeredLayer(
            HUNTER_EQUIPMENT_V3.plasma.laser,
            boneMatrix("casterMuzzle"),
            63,
            "caster-laser-emitter",
          )}
        </>
      )}

      {registeredLayer(
        HUNTER_EQUIPMENT_V3.gauntlet.base,
        gauntletMatrix,
        64,
        "gauntlet-base",
      )}
      {registeredLayer(
        HUNTER_EQUIPMENT_V3.gauntlet.lid,
        lidMatrix,
        65,
        "gauntlet-lid",
      )}

      {showsWristblades &&
        registeredLayer(
          HUNTER_EQUIPMENT_V3.wristblades.housing,
          boneMatrix("armFrontLower"),
          68,
          "blade-housing",
        )}
      {showsWristblades &&
        registeredLayer(
          HUNTER_EQUIPMENT_V3.wristblades.blades,
          bladeMatrix,
          67,
          "wristblades",
          undefined,
          bladesExtended ? 1 : 0,
        )}

      {carriedWeaponId === "combistick" &&
        registeredLayer(
          HUNTER_WEAPONS_V3.combistick,
          handWeaponMatrix,
          49,
          "weapon-combistick",
          "drop-shadow(0 3px 3px rgb(0 0 0 / .9))",
        )}
      {carriedWeaponId === "smart-disc" &&
        registeredLayer(
          HUNTER_WEAPONS_V3.smartDisc,
          handWeaponMatrix,
          49,
          "weapon-smart-disc",
          "drop-shadow(0 3px 3px rgb(0 0 0 / .9))",
        )}
      {carriedWeaponId === "yautja-bow" && (
        <>
          {registeredLayer(
            HUNTER_WEAPONS_V3.yautjaBow,
            handWeaponMatrix,
            49,
            "weapon-yautja-bow",
            "drop-shadow(0 3px 3px rgb(0 0 0 / .9))",
          )}
          {aiming &&
            registeredLayer(
              HUNTER_WEAPONS_V3.arrow,
              handWeaponMatrix,
              49,
              "weapon-arrow",
            )}
        </>
      )}

      {aiming && showsCaster && (
        <>
          <span
            aria-hidden="true"
            data-rig-slot="laser-beam"
            style={{
              position: "absolute",
              zIndex: 80,
              left: cssPercentage(muzzle.x, HUNTER_RIG_CANVAS.width),
              top: cssPercentage(muzzle.y, HUNTER_RIG_CANVAS.height),
              width: "50%",
              height: 2,
              background: `linear-gradient(90deg, ${laserColor.solid}, ${laserColor.fade})`,
              boxShadow: `0 0 6px ${laserColor.shadow}`,
              transform: `rotate(${resolvedAimAngle}rad)`,
              transformOrigin: "left center",
            }}
          />
          <span
            aria-hidden="true"
            data-hunter-rig-reticle=""
            style={{
              position: "absolute",
              zIndex: 81,
              left: cssPercentage(reticle.x, HUNTER_RIG_CANVAS.width),
              top: cssPercentage(reticle.y, HUNTER_RIG_CANVAS.height),
              width: "8%",
              aspectRatio: "1",
              border: `2px solid ${laserColor.solid}`,
              borderRadius: "50%",
              boxShadow: `0 0 0 1px rgb(0 0 0 / .75), 0 0 9px ${laserColor.shadow}`,
              translate: "-50% -50%",
              animation: "hunter-rig-v3-reticle 1.25s ease-in-out infinite",
            }}
          />
        </>
      )}

      {debugBones &&
        Object.entries(frame.bones).map(([boneId, matrix]) => (
          <span
            aria-hidden="true"
            data-rig-debug-bone={boneId}
            key={boneId}
            style={{
              position: "absolute",
              zIndex: 100,
              left: cssPercentage(matrix.e, HUNTER_RIG_CANVAS.width),
              top: cssPercentage(matrix.f, HUNTER_RIG_CANVAS.height),
              width: 5,
              height: 5,
              border: "1px solid #fff",
              borderRadius: "50%",
              background: "#ff3b34",
              translate: "-50% -50%",
              boxShadow: "0 0 4px #000",
            }}
          />
        ))}
    </div>
  );
}

export default HunterRigPreview;
