import type { CSSProperties } from "react";

import type {
  ArmorId,
  HunterAppearance,
  WeaponId,
} from "./types";
import { HUNTER_VISUALS_V2 } from "./hunterVisuals";

export interface HunterRigPreviewProps {
  appearance: HunterAppearance;
  armorId: ArmorId;
  weaponIds: readonly WeaponId[];
  size?: number | string;
  className?: string;
  style?: CSSProperties;
  label?: string;
  maskWorn?: boolean;
  gauntletOpen?: boolean;
  bladesExtended?: boolean;
  aiming?: boolean;
  trophyCarried?: boolean;
}

const SKIN_FILTER: Record<HunterAppearance["skinId"], string> = {
  "ochre-mottle": "none",
  "ashen-mottle": "grayscale(0.66) sepia(0.16) hue-rotate(155deg) brightness(0.94)",
  "dark-mottle": "saturate(0.76) brightness(0.68) contrast(1.16)",
};

const DREAD_FILTER: Record<HunterAppearance["dreadTintId"], string> = {
  obsidian: "saturate(0.72) brightness(0.68) contrast(1.22)",
  umber: "sepia(0.54) saturate(0.9) brightness(0.76)",
  ashen: "grayscale(0.82) brightness(1.05) contrast(0.94)",
};

const ARMOR_FILTER: Record<HunterAppearance["armorTintId"], string> = {
  gunmetal: "brightness(1)",
  bronze: "sepia(0.48) saturate(1.22) hue-rotate(346deg) brightness(1.02)",
  obsidian: "saturate(0.68) brightness(0.58) contrast(1.2)",
};

const ARMOR_LABEL: Record<ArmorId, string> = {
  scout: "éclaireur",
  hunter: "chasseur",
  berserker: "berserker",
};

const DREAD_SLICES = [
  { left: 0, right: 74, duration: 3.6, delay: -0.7, angle: 2.5 },
  { left: 24, right: 49, duration: 4.1, delay: -2.2, angle: -2.1 },
  { left: 49, right: 24, duration: 3.8, delay: -1.3, angle: 3.2 },
  { left: 74, right: 0, duration: 4.4, delay: -3.1, angle: -2.7 },
] as const;

const rootBaseStyle: CSSProperties = {
  position: "relative",
  display: "inline-block",
  flex: "0 0 auto",
  aspectRatio: "295 / 405",
  overflow: "visible",
  isolation: "isolate",
  pointerEvents: "none",
  userSelect: "none",
};

const fullLayerStyle: CSSProperties = {
  position: "absolute",
  inset: 0,
  backgroundPosition: "center",
  backgroundRepeat: "no-repeat",
  backgroundSize: "contain",
  pointerEvents: "none",
};

function assetLayer(path: string, style?: CSSProperties): CSSProperties {
  return {
    ...fullLayerStyle,
    backgroundImage: `url("${path}")`,
    ...style,
  };
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
    `armure ${ARMOR_LABEL[armorId]}`,
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
  if (trophyCarried) {
    details.push("trophée porté");
  }

  return `Aperçu du chasseur Yautja, ${details.join(", ")}.`;
}

export function HunterRigPreview({
  appearance,
  armorId,
  weaponIds,
  size = 240,
  className,
  style,
  label,
  maskWorn = appearance.biomaskId !== null,
  gauntletOpen = false,
  bladesExtended = false,
  aiming = false,
  trophyCarried = false,
}: HunterRigPreviewProps) {
  const showsCaster = weaponIds.includes("plasma-caster");
  const showsWristblades = weaponIds.includes("wristblades");
  const showsTrophy =
    trophyCarried || appearance.trophyAdornmentId === "skull-spine";
  const maskId = appearance.biomaskId;
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

  return (
    <div
      className={className}
      role="img"
      aria-label={resolvedLabel}
      data-hunter-rig=""
      data-armor={armorId}
      data-mask={maskWorn && maskId ? maskId : "off"}
      data-aiming={aiming ? "true" : "false"}
      data-trophy={
        trophyCarried ? "carried" : showsTrophy ? "adornment" : "none"
      }
      style={{
        ...rootBaseStyle,
        width: size,
        ...style,
      }}
    >
      <style>
        {`
          @keyframes hunter-rig-dread-sway {
            0%, 100% { transform: rotate(var(--dread-angle-rest)); }
            48% { transform: rotate(var(--dread-angle)); }
            72% { transform: rotate(var(--dread-angle-drift)); }
          }
          @keyframes hunter-rig-reticle-pulse {
            0%, 100% { opacity: .45; transform: scale(.86); }
            50% { opacity: 1; transform: scale(1.12); }
          }
          @media (prefers-reduced-motion: reduce) {
            [data-hunter-rig-dread],
            [data-hunter-rig-reticle] {
              animation: none !important;
            }
          }
        `}
      </style>

      {DREAD_SLICES.map((slice, index) => (
        <span
          aria-hidden="true"
          data-hunter-rig-dread=""
          key={`${appearance.dreadStyleId}-${index}`}
          style={
            {
              ...assetLayer(
                HUNTER_VISUALS_V2.dreads[appearance.dreadStyleId],
                {
                  inset: "1% 31% 45% 2%",
                  zIndex: 1,
                  backgroundPosition: "center",
                  clipPath: `inset(0 ${slice.right}% 0 ${slice.left}%)`,
                  filter: DREAD_FILTER[appearance.dreadTintId],
                  transformOrigin: "72% 22%",
                  animationName: "hunter-rig-dread-sway",
                  animationDuration: `${slice.duration}s`,
                  animationDelay: `${slice.delay}s`,
                  animationTimingFunction: "ease-in-out",
                  animationIterationCount: "infinite",
                },
              ),
              "--dread-angle": `${slice.angle}deg`,
              "--dread-angle-rest": `${slice.angle * -0.45}deg`,
              "--dread-angle-drift": `${slice.angle * -0.16}deg`,
            } as CSSProperties
          }
        />
      ))}

      <span
        aria-hidden="true"
        style={assetLayer(HUNTER_VISUALS_V2.body.base, {
          zIndex: 2,
          filter: SKIN_FILTER[appearance.skinId],
        })}
      />

      <span
        aria-hidden="true"
        style={assetLayer(HUNTER_VISUALS_V2.armor[armorId], {
          inset: "1% 3% 0",
          zIndex: 4,
          filter: `${ARMOR_FILTER[appearance.armorTintId]} drop-shadow(0 3px 3px rgb(0 0 0 / 0.82))`,
        })}
      />

      {maskWorn && maskId && (
        <span
          aria-hidden="true"
          style={assetLayer(HUNTER_VISUALS_V2.masks[maskId], {
            inset: "1% 1% 66% 65%",
            zIndex: 7,
            backgroundPosition: "center",
            filter: "drop-shadow(0 2px 2px rgb(0 0 0 / 0.86))",
          })}
        />
      )}

      {showsCaster && (
        <>
          {aiming && (
            <>
              <span
                aria-hidden="true"
                style={{
                  position: "absolute",
                  zIndex: 5,
                  top: "10.6%",
                  left: "72%",
                  width: "54%",
                  height: 2,
                  transform: "rotate(-4deg)",
                  transformOrigin: "left center",
                  background:
                    "linear-gradient(90deg, rgb(255 48 42 / 0.88), rgb(255 48 42 / 0.08))",
                  boxShadow: "0 0 6px rgb(255 49 41 / 0.82)",
                }}
              />
              <span
                aria-hidden="true"
                data-hunter-rig-reticle=""
                style={{
                  position: "absolute",
                  zIndex: 10,
                  top: "5.5%",
                  right: "-30%",
                  width: "10%",
                  aspectRatio: "1",
                  border: "2px solid #ff3b34",
                  borderRadius: "50%",
                  boxShadow:
                    "0 0 0 1px rgb(15 0 0 / 0.75), 0 0 9px rgb(255 48 42 / 0.76)",
                  animation:
                    "hunter-rig-reticle-pulse 1.25s ease-in-out infinite",
                }}
              />
            </>
          )}
          <span
            aria-hidden="true"
            style={assetLayer(HUNTER_VISUALS_V2.equipment.plasmaCaster, {
              inset: aiming ? "-5% 20% 62% 48%" : "0 25% 60% 43%",
              zIndex: 8,
              backgroundPosition: "center",
              filter: "drop-shadow(0 2px 2px rgb(0 0 0 / 0.9))",
              transform: aiming
                ? "rotate(-8deg) translateX(4%)"
                : "rotate(-1deg)",
              transformOrigin: "44% 72%",
              transition: "transform 180ms ease, inset 180ms ease",
            })}
          />
        </>
      )}

      <span
        aria-hidden="true"
        style={assetLayer(
          HUNTER_VISUALS_V2.equipment.gauntlet[
            gauntletOpen ? "open" : "closed"
          ],
          {
            inset: "47% -4% 35% 65%",
            zIndex: 8,
            backgroundPosition: "center",
            filter: "drop-shadow(0 2px 2px rgb(0 0 0 / 0.9))",
            transform: "rotate(67deg)",
          },
        )}
      />

      {showsWristblades && (
        <span
          aria-hidden="true"
          style={assetLayer(
            HUNTER_VISUALS_V2.equipment.wristblades[
              bladesExtended ? "extended" : "retracted"
            ],
            {
              inset: bladesExtended
                ? "42% -18% 30% 60%"
                : "48% -5% 34% 67%",
              zIndex: 9,
              backgroundPosition: "center",
              filter: "drop-shadow(0 2px 2px rgb(0 0 0 / 0.9))",
              transform: bladesExtended ? "rotate(62deg)" : "rotate(67deg)",
              transformOrigin: "25% 50%",
              transition: "transform 180ms ease, inset 180ms ease",
            },
          )}
        />
      )}

      {showsTrophy && (
        <span
          aria-hidden="true"
          style={assetLayer(HUNTER_VISUALS_V2.trophies.skullSpine, {
            inset: trophyCarried
              ? "47% -8% 3% 55%"
              : "45% 42% 31% 31%",
            zIndex: trophyCarried ? 10 : 6,
            backgroundPosition: "center",
            filter: "drop-shadow(0 3px 3px rgb(0 0 0 / 0.9))",
            transform: trophyCarried
              ? "rotate(9deg)"
              : "rotate(-11deg) scale(0.58)",
            transformOrigin: trophyCarried ? "55% 12%" : "center",
            transition: "transform 180ms ease, inset 180ms ease",
          })}
        />
      )}
    </div>
  );
}

export default HunterRigPreview;
