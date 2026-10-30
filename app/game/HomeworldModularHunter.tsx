/* eslint-disable @next/next/no-img-element -- registered transparent layers share the canonical V3 canvas */
import { Fragment, type CSSProperties } from "react";
import { phgMaterialForV113 } from "./hunterMaterialsV113";
import { HUNTER_SKIN_FILTERS_V114, HUNTER_DREAD_FILTERS_V114 } from "./hunterPaletteFiltersV114";
import type { HunterBodyMorphId, DreadStyleId, HunterAppearance } from "./types";
import { hunterBodyFullPath, hunterBodyPartPath, hunterBodyPartPlacement, hunterDreadPath, HUNTER_ASSET_ROOT_V3, HUNTER_BODY_PART_IDS } from "./hunterVisuals";
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

/** Modular body bitmaps with constrained strand motion; not a full body sheet. */
export default function HomeworldModularHunter({ morphId, dreadStyleId, className, appearance, style, motionPhase = 0, speed = 0, dreadAngles }: {
  morphId: HunterBodyMorphId; dreadStyleId: DreadStyleId; className?: string;
  style?: CSSProperties;
  motionPhase?: number; speed?: number;
  dreadAngles?: readonly number[];
  appearance?: Pick<HunterAppearance, "skinId" | "dreadTintId" | "headStyleId" | "skinMaterialId" | "dreadMaterialId" | "outfitMaterialId">;
}) {
  const skinMaterial = phgMaterialForV113("skin", appearance?.skinMaterialId);
  const dreadMaterial = phgMaterialForV113("dread", appearance?.dreadMaterialId);
  const outfitMaterial = phgMaterialForV113("outfit", appearance?.outfitMaterialId);
  return <span className={className} style={style} data-modular-homeworld-character data-body-morph={morphId} data-modular-status="static-bitmap-composition" aria-hidden="true">
    <span style={{ position: "absolute", height: "100%", aspectRatio: "2 / 3", left: "50%", bottom: 0, transform: "translateX(-50%)", isolation: "isolate" }}>
      {solveHunterDreadsV63(REST_FRAME, morphId, dreadStyleId, appearance?.headStyleId,
        dreadAngles ?? HUNTER_DREAD_STRANDS_V63.map((_, i) => Math.min(.24, Math.abs(speed) / 1000) + (speed > 5 ? Math.sin(motionPhase * 8 + i) * .02 : 0))
      ).map((strand, index) => {
        const motion: CSSProperties = { ...imageStyle, zIndex: index,
          transformOrigin: `${HOMEWORLD_DREAD_ROOT.x / 256 * 100}% ${HOMEWORLD_DREAD_ROOT.y / 384 * 100}%`,
          transform: `translate(${strand.x / 256 * 100}%, ${strand.y / 384 * 100}%) rotate(${strand.angle}rad) scale(${strand.scale})`,
        };
        const mask = `url("${hunterDreadPath(dreadStyleId)}")`;
        return <Fragment key={index}>
          <img alt="" draggable={false} data-homeworld-layer="dread" data-dread-collisions={strand.collisions} src={hunterDreadPath(dreadStyleId)} style={{ ...motion, filter: HUNTER_DREAD_FILTERS_V114[appearance?.dreadTintId ?? "obsidian"] }} />
          {dreadMaterial && <span data-homeworld-material="dread" style={{ ...motion, maskImage: mask, WebkitMaskImage: mask, maskSize: "100% 100%", WebkitMaskSize: "100% 100%", maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat", backgroundImage: `url("${dreadMaterial.src}")`, backgroundSize: "68px 68px", mixBlendMode: "color", opacity: .86 }} />}
        </Fragment>;
      })}
      <span data-homeworld-layer="body" style={{ ...imageStyle, zIndex: 10, filter: HUNTER_SKIN_FILTERS_V114[appearance?.skinId ?? "ochre-mottle"] }}>
        {HUNTER_BODY_PART_IDS.map(partId => {
          const placement = hunterBodyPartPlacement(morphId, partId, appearance?.headStyleId);
          return <img key={partId} alt="" draggable={false} data-homeworld-body-part={partId} src={hunterBodyPartPath(morphId, partId, appearance?.headStyleId)} style={placement ? {
            position: "absolute", left: `${placement.x / 256 * 100}%`, top: `${placement.y / 384 * 100}%`,
            width: `${placement.width / 256 * 100}%`, height: `${placement.height / 384 * 100}%`, objectFit: "fill", zIndex: 1,
          } : { ...imageStyle, filter: hunterBodyPartColorV62(morphId, partId, "none"), clipPath: hunterBodyPartClipCssV62(morphId, partId) }} />;
        })}
        {skinMaterial && HUNTER_BODY_PART_IDS.map(partId => {
          const path = hunterBodyPartPath(morphId, partId, appearance?.headStyleId);
          const placement = hunterBodyPartPlacement(morphId, partId, appearance?.headStyleId);
          const mask = `url("${path}")`;
          return <span key={`phg-skin-${partId}`} data-homeworld-material="skin" style={{
            ...imageStyle, zIndex: 2,
            ...(placement ? { left: `${placement.x / 256 * 100}%`, top: `${placement.y / 384 * 100}%`, width: `${placement.width / 256 * 100}%`, height: `${placement.height / 384 * 100}%` } : {}),
            backgroundImage: `url("${skinMaterial.src}")`, backgroundRepeat: "repeat", backgroundSize: "68px 68px",
            maskImage: mask, WebkitMaskImage: mask, maskSize: "100% 100%", WebkitMaskSize: "100% 100%",
            maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat",
            clipPath: placement ? undefined : hunterBodyPartClipCssV62(morphId, partId), mixBlendMode: "color", opacity: .86,
          }} />;
        })}
      </span>
      {/* The legacy net plate contains old facial pixels: keep only clothing below the neck. */}
      <img alt="" draggable={false} data-homeworld-layer="clothing" src={`${HUNTER_ASSET_ROOT_V3}/body/${morphId}/net/full.webp`} style={{ ...imageStyle, zIndex: 11, opacity: .9, filter: hunterBodyPartColorV62(morphId, "torso", HUNTER_SKIN_FILTERS_V114[appearance?.skinId ?? "ochre-mottle"]), clipPath: "inset(27.34375% 0 0 0)", maskImage: `url("${hunterBodyFullPath(morphId)}")`, maskSize: "100% 100%", maskRepeat: "no-repeat" }} />
      <img alt="" draggable={false} data-homeworld-layer="loincloth" src={`${HUNTER_ASSET_ROOT_V3}/body/${morphId}/net/full.webp`} style={{ ...imageStyle, zIndex: 12, clipPath: clothClip(morphId) }} />
      {outfitMaterial && <span data-homeworld-material="outfit" style={{ ...imageStyle, zIndex: 13, backgroundImage: `url("${outfitMaterial.src}")`, backgroundSize: "68px 68px", maskImage: `url("${HUNTER_ASSET_ROOT_V3}/body/${morphId}/net/full.webp")`, maskSize: "100% 100%", maskRepeat: "no-repeat", clipPath: clothClip(morphId), opacity: .86, mixBlendMode: "color" }} />}
    </span>
  </span>;
}
