"use client";

/* eslint-disable @next/next/no-img-element */

import type { CSSProperties } from "react";

import type {
  ArmorId,
  GearId,
  HunterAppearance,
  WeaponId,
} from "./types";
import {
  hunterBodyPartHasNet,
  HUNTER_ARMOR_MODULES,
  HUNTER_BODY_PART_BONES,
  HUNTER_EQUIPMENT_V3,
  HUNTER_GEAR_V3,
  HUNTER_TROPHIES_V3,
  HUNTER_WEAPONS_V3,
  hunterArmorPath,
  hunterBodyPartPath,
  hunterDreadPath,
  hunterMaskPath,
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

const DREAD_GROUPS: Readonly<
  Record<HunterAppearance["dreadStyleId"], readonly HunterAppearance["dreadStyleId"][]>
> = {
  classic: ["classic", "ringed", "temple", "veteran"],
  ringed: ["ringed", "classic", "veteran", "temple"],
  braided: ["braided", "huntress", "ringed", "temple"],
  veteran: ["veteran", "elder", "ringed", "classic"],
  elder: ["elder", "veteran", "temple", "classic"],
  temple: ["temple", "classic", "ringed"],
  feral: ["feral", "temple", "classic"],
  huntress: ["huntress", "braided", "ringed", "elder"],
};

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
  const frame = solveHunterRig({
    pose,
    phase,
    facing,
    speed,
    verticalVelocity,
    extractionProgress,
    aimAngle: resolvedAimAngle,
    recoil,
  });
  const boneMatrix = (boneId: HunterRigBoneId) =>
    relativeBoneMatrix(frame, BIND_FRAME, boneId);

  const showsCaster = weaponIds.includes("plasma-caster");
  const showsWristblades = weaponIds.includes("wristblades");
  const showsTrophy =
    trophyCarried || appearance.trophyAdornmentId === "skull-spine";
  const carriedWeaponId = weaponIds.find(
    (weaponId) =>
      weaponId !== "plasma-caster" && weaponId !== "wristblades",
  );
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
    armorSlots.push(
      { id: "bracer", bone: "armFrontLower", z: 55 },
      { id: "thigh", bone: "legFrontUpper", z: 47 },
      { id: "shin", bone: "legFrontLower", z: 48 },
    );
  }

  const lidBase = boneMatrix("armBackLower");
  const lidMatrix = multiplyAffine(
    lidBase,
    rotationAround(77, 202, gauntletOpen ? -1.12 : 0),
  );
  const bladeMatrix = multiplyAffine(
    boneMatrix("armFrontLower"),
    translation(bladesExtended ? 42 : 5, bladesExtended ? -3 : 0),
  );
  const muzzle = frame.anchors.muzzle;
  const reticleDistance = aiming ? 126 : 92;
  const reticle = {
    x: muzzle.x + Math.cos(resolvedAimAngle) * reticleDistance,
    y: muzzle.y + Math.sin(resolvedAimAngle) * reticleDistance,
  };

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

      {DREAD_GROUPS[appearance.dreadStyleId].map((dreadId, index) => {
        const matrix = boneMatrix("head");
        const sway = 2.2 + index * 0.75;
        return (
          <span
            aria-hidden="true"
            data-rig-slot={`dread-${index}`}
            key={`${dreadId}-${index}`}
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
              src={hunterDreadPath(dreadId)}
              style={
                {
                  ...fullCanvasImage,
                  filter: DREAD_FILTER[appearance.dreadTintId],
                  transformOrigin: `${38 + index * 3}% ${12 + index * 1.4}%`,
                  animation:
                    `hunter-rig-v3-dread-sway ${3.5 + index * 0.28}s ` +
                    `${-index * 0.61}s ease-in-out infinite`,
                  "--dread-rest": `${-sway * 0.24}deg`,
                  "--dread-sway": `${sway}deg`,
                  "--dread-drift": `${-sway * 0.45}deg`,
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
            trophyCarried
              ? multiplyAffine(
                  boneMatrix("handFront"),
                  translation(122, -9),
                )
              : boneMatrix("pelvis"),
            trophyCarried ? 73 : 12,
            "trophy-spine",
            "drop-shadow(0 3px 3px rgb(0 0 0 / .9))",
          )}
          {registeredLayer(
            HUNTER_TROPHIES_V3.skull,
            trophyCarried
              ? multiplyAffine(
                  boneMatrix("handFront"),
                  translation(122, -9),
                )
              : boneMatrix("pelvis"),
            trophyCarried ? 74 : 13,
            "trophy-skull",
            "drop-shadow(0 3px 3px rgb(0 0 0 / .9))",
          )}
          {registeredLayer(
            HUNTER_TROPHIES_V3.bindings,
            trophyCarried
              ? multiplyAffine(
                  boneMatrix("handFront"),
                  translation(122, -9),
                )
              : boneMatrix("pelvis"),
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
            boneMatrix(slot.bone),
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
              translation(gearIndex === 0 ? -22 : 24, gearIndex * 5),
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
          hunterMaskPath(appearance.biomaskId),
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
        boneMatrix("armBackLower"),
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
          66,
          "blade-housing",
        )}
      {showsWristblades &&
        registeredLayer(
          HUNTER_EQUIPMENT_V3.wristblades.blades,
          bladeMatrix,
          67,
          "wristblades",
          undefined,
          bladesExtended ? 1 : 0.68,
        )}

      {carriedWeaponId === "combistick" &&
        registeredLayer(
          HUNTER_WEAPONS_V3.combistick,
          boneMatrix("handFront"),
          76,
          "weapon-combistick",
          "drop-shadow(0 3px 3px rgb(0 0 0 / .9))",
        )}
      {carriedWeaponId === "smart-disc" &&
        registeredLayer(
          HUNTER_WEAPONS_V3.smartDisc,
          boneMatrix("handFront"),
          76,
          "weapon-smart-disc",
          "drop-shadow(0 3px 3px rgb(0 0 0 / .9))",
        )}
      {carriedWeaponId === "yautja-bow" && (
        <>
          {registeredLayer(
            HUNTER_WEAPONS_V3.yautjaBow,
            boneMatrix("handFront"),
            76,
            "weapon-yautja-bow",
            "drop-shadow(0 3px 3px rgb(0 0 0 / .9))",
          )}
          {aiming &&
            registeredLayer(
              HUNTER_WEAPONS_V3.arrow,
              boneMatrix("handFront"),
              77,
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
              left: `${(muzzle.x / 256) * 100}%`,
              top: `${(muzzle.y / 384) * 100}%`,
              width: "50%",
              height: 2,
              background:
                "linear-gradient(90deg, rgb(255 48 42 / .92), rgb(255 48 42 / .06))",
              boxShadow: "0 0 6px rgb(255 49 41 / .82)",
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
              left: `${(reticle.x / 256) * 100}%`,
              top: `${(reticle.y / 384) * 100}%`,
              width: "8%",
              aspectRatio: "1",
              border: "2px solid #ff3b34",
              borderRadius: "50%",
              boxShadow:
                "0 0 0 1px rgb(15 0 0 / .75), 0 0 9px rgb(255 48 42 / .76)",
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
              left: `${(matrix.e / 256) * 100}%`,
              top: `${(matrix.f / 384) * 100}%`,
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
