/* eslint-disable @next/next/no-img-element -- registered transparent layers share the canonical V3 canvas */
import type { CSSProperties } from "react";
import ChromaticSurfaceV113 from "./ChromaticSurfaceV113";
import type { HunterBodyMorphId, DreadStyleId, HunterAppearance, ArmorId } from "./types";
import { hunterBodyFullPath, hunterBodyPartPath, hunterBodyPartPlacement, hunterDreadPath, hunterArmorPath, HUNTER_ASSET_ROOT_V3, HUNTER_BODY_PART_IDS, HUNTER_ARMOR_MODULES, HUNTER_ARMOR_FIT_BY_MORPH } from "./hunterVisuals";
import { hunterBodyPartColorV62, hunterBodyPartClipCssV62 } from "./hunterHeadArtV62";
import { HUNTER_DREAD_STRANDS_V63, solveHunterDreadsV63 } from "./hunterDreadsV63";
import { solveHunterRig } from "./hunterRig";

/** Same authored skull socket and strand placement used by HunterRigPreview, at rest. */
export const HOMEWORLD_DREAD_ROOT = { x: 143, y: 43, canvasWidth: 256, canvasHeight: 384 } as const;
const REST_FRAME = solveHunterRig({ pose: "idle", facing: 1, phase: 0, aimAngle: 0 });
// Preserve the authored belt and hanging cloth outside the body alpha. The
// surrounding net plates contain stray silhouette pixels, so only the measured
// cloth rectangle is overlaid without a body mask. Coordinates use 256 x 384.
const CLOTH_RECT: Record<HunterBodyMorphId, readonly [number, number, number, number]> = {
  classic: [100, 160, 177, 254], elder: [96, 164, 174, 257],
  huntress: [101, 147, 175, 239], super: [101, 162, 183, 255],
  young: [116, 152, 186, 242], feral: [84, 153, 159, 244],
};
const clothClip = (morphId: HunterBodyMorphId) => {
  const [left, top, right, bottom] = CLOTH_RECT[morphId];
  return `inset(${top / 384 * 100}% ${(256 - right) / 256 * 100}% ${(384 - bottom) / 384 * 100}% ${left / 256 * 100}%)`;
};
const imageStyle: CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill", pointerEvents: "none", userSelect: "none" };
const skinFilter = { "ochre-mottle": "none", "ashen-mottle": "grayscale(.42) sepia(.12) hue-rotate(155deg) brightness(.96)", "dark-mottle": "saturate(.78) brightness(.72) contrast(1.12)" };
const dreadFilter = { obsidian: "saturate(.72) brightness(.68) contrast(1.22)", umber: "sepia(.54) saturate(.9) brightness(.76)", ashen: "grayscale(.82) brightness(1.05) contrast(.94)" };
const armorFilter: Record<HunterAppearance["armorTintId"], string> = {
  gunmetal: "brightness(1)",
  bronze: "sepia(.48) saturate(1.22) hue-rotate(346deg) brightness(1.02)",
  obsidian: "saturate(.68) brightness(.58) contrast(1.2)",
};
/**
 * These are the exact registered 256x384 V3 plates used by HunterRigPreview.
 * Homeworld remains a static/resting composite; no pose is invented or
 * substituted for the pre-existing six body morphologies.
 */
export function homeworldArmorSlotsV114(
  appearance: Pick<HunterAppearance, "armorStyleId"> | undefined,
  armorId: ArmorId,
  hasWristblades: boolean,
): Array<{ id: string; z: number; shoulder?: boolean }> {
  const family = HUNTER_ARMOR_MODULES[appearance?.armorStyleId ?? "classic"];
  const parts: Array<{ id: string; z: number; shoulder?: boolean }> = [
    { id: family.chest, z: 18 },
    { id: "belt", z: 19 },
    { id: family.shoulder, z: 22, shoulder: true },
  ];
  if (armorId !== "scout") {
    if (!hasWristblades) parts.push({ id: "bracer", z: 23 });
    parts.push(
      { id: "thigh", z: 17 },
      { id: "thigh-lower", z: 17 },
      { id: "knee", z: 19 },
      { id: "shin", z: 18 },
    );
  }
  return parts;
}

/** Modular body bitmaps with constrained strand motion; not a full body sheet. */
export default function HomeworldModularHunter({ morphId, dreadStyleId, className, appearance, style, motionPhase = 0, speed = 0, dreadAngles, showArmor = false, armorId = "hunter", hasWristblades = false }: {
  morphId: HunterBodyMorphId; dreadStyleId: DreadStyleId; className?: string;
  style?: CSSProperties;
  motionPhase?: number; speed?: number;
  dreadAngles?: readonly number[];
  /** Only the playable Homeworld character enables this: anatomical chooser remains unobscured. */
  showArmor?: boolean;
  armorId?: ArmorId;
  hasWristblades?: boolean;
  appearance?: Pick<HunterAppearance, "skinId" | "dreadTintId" | "headStyleId" | "armorStyleId" | "armorTintId" | "chromaticsV113">;
}) {
  return <span className={className} style={style} data-modular-homeworld-character data-body-morph={morphId} data-modular-status="static-bitmap-composition" aria-hidden="true">
    <span style={{ position: "absolute", height: "100%", aspectRatio: "2 / 3", left: "50%", bottom: 0, transform: "translateX(-50%)", isolation: "isolate" }}>
      {solveHunterDreadsV63(REST_FRAME, morphId, dreadStyleId, appearance?.headStyleId,
        dreadAngles ?? HUNTER_DREAD_STRANDS_V63.map((_, i) => Math.min(.24, Math.abs(speed) / 1000) + (speed > 5 ? Math.sin(motionPhase * 8 + i) * .02 : 0))
      ).map((strand, index) => <span key={index} data-homeworld-layer="dread" data-dread-collisions={strand.collisions} style={{ ...imageStyle,
        zIndex: index, transformOrigin: `${HOMEWORLD_DREAD_ROOT.x / 256 * 100}% ${HOMEWORLD_DREAD_ROOT.y / 384 * 100}%`,
        transform: `translate(${strand.x / 256 * 100}%, ${strand.y / 384 * 100}%) rotate(${strand.angle}rad) scale(${strand.scale})`,
      }}>
        <img alt="" draggable={false} src={hunterDreadPath(dreadStyleId)} style={{ ...imageStyle, filter: dreadFilter[appearance?.dreadTintId ?? "obsidian"] }} />
        <ChromaticSurfaceV113 appearance={appearance} channel="dreads" maskPath={hunterDreadPath(dreadStyleId)} style={imageStyle} />
      </span>)}
      <span data-homeworld-layer="body" style={{ ...imageStyle, zIndex: 10, filter: skinFilter[appearance?.skinId ?? "ochre-mottle"] }}>
        {HUNTER_BODY_PART_IDS.map(partId => {
          const placement = hunterBodyPartPlacement(morphId, partId, appearance?.headStyleId);
          const source = hunterBodyPartPath(morphId, partId, appearance?.headStyleId);
          return <span key={partId} style={{ ...imageStyle }} data-homeworld-body-part={partId}>
            <img alt="" draggable={false} src={source} style={placement ? {
              position: "absolute", left: `${placement.x / 256 * 100}%`, top: `${placement.y / 384 * 100}%`,
              width: `${placement.width / 256 * 100}%`, height: `${placement.height / 384 * 100}%`, objectFit: "fill", zIndex: 1,
            } : { ...imageStyle, filter: hunterBodyPartColorV62(morphId, partId, "none"), clipPath: hunterBodyPartClipCssV62(morphId, partId) }} />
            <ChromaticSurfaceV113 appearance={appearance} channel="skin" maskPath={source} placement={placement}
              style={{ ...imageStyle, zIndex: 2, clipPath: hunterBodyPartClipCssV62(morphId, partId) }} />
          </span>;
        })}
      </span>
      {/* The legacy net plate contains old facial pixels: keep only clothing below the neck. */}
      <img alt="" draggable={false} data-homeworld-layer="clothing" src={`${HUNTER_ASSET_ROOT_V3}/body/${morphId}/net/full.webp`} style={{ ...imageStyle, zIndex: 11, opacity: .9, filter: hunterBodyPartColorV62(morphId, "torso", skinFilter[appearance?.skinId ?? "ochre-mottle"]), clipPath: "inset(27.34375% 0 0 0)", maskImage: `url("${hunterBodyFullPath(morphId)}")`, maskSize: "100% 100%", maskRepeat: "no-repeat" }} />
      <img alt="" draggable={false} data-homeworld-layer="loincloth" src={`${HUNTER_ASSET_ROOT_V3}/body/${morphId}/net/full.webp`} style={{ ...imageStyle, zIndex: 12, clipPath: clothClip(morphId) }} />
      <ChromaticSurfaceV113 appearance={appearance} channel="outfit" maskPath={`${HUNTER_ASSET_ROOT_V3}/body/${morphId}/net/full.webp`}
        style={{ ...imageStyle, zIndex: 13, clipPath: clothClip(morphId) }} />
      {showArmor && homeworldArmorSlotsV114(appearance, armorId, hasWristblades).map(plate => {
        const path = hunterArmorPath(plate.id);
        const shoulderScale = HUNTER_ARMOR_FIT_BY_MORPH[morphId].shoulderScale;
        return <span key={plate.id} data-homeworld-layer="armor" data-armor-module={plate.id}
          style={{ ...imageStyle, zIndex: plate.z, transform: plate.shoulder ? `scale(${shoulderScale})` : undefined,
            transformOrigin: plate.shoulder ? "59.765625% 28.645833%" : undefined }}>
          <img alt="" draggable={false} src={path} style={{ ...imageStyle, filter: armorFilter[appearance?.armorTintId ?? "bronze"] }} />
          <ChromaticSurfaceV113 appearance={appearance} channel="armor" maskPath={path} style={imageStyle} />
        </span>;
      })}
    </span>
  </span>;
}
