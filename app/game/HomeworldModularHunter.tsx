"use client";
/* eslint-disable @next/next/no-img-element -- registered transparent layers share the canonical V3 canvas */
import { useContext, type CSSProperties } from "react";
import { ClanPaletteContextV146 } from "./clanPaletteContextV146";
import { clanNpcPiecesV146 } from "./systems/hunterCustomizationV146";
import ChromaticSurfaceV113 from "./ChromaticSurfaceV113";
import { pieceForArmorSlotV146 } from "./hunterPiecesV146";
import { SkinPatternSurfaceV146 } from "./HunterCosmeticOverlaysV146";
import DecalSurfaceV133 from "./DecalSurfaceV133";
import { maskChromaticsForAppearanceV131 } from "./hunterChromaticsV113";
import { HUNTER_SKIN_FILTERS_V114, HUNTER_DREAD_FILTERS_V114, HUNTER_ARMOR_FILTERS_V114 } from "./hunterPaletteFiltersV114";
import type { HunterBodyMorphId, DreadStyleId, HunterAppearance, ArmorId } from "./types";
import type { HunterBodyPartId } from "./hunterVisuals";
import { hunterBodyFullPath, hunterBodyPartPath, hunterBodyPartPlacement, hunterDreadPath, hunterArmorPath, hunterMaskRigPath, hunterMaskRigPlacement, HUNTER_ASSET_ROOT_V3, HUNTER_BODY_PART_IDS, HUNTER_ARMOR_MODULES, HUNTER_EQUIPMENT_V3, hunterWristbladeRegistrationMatrix, hunterShoulderPlateMatrixV145, hunterGreaveMatrixV145, HUNTER_ARMOR_KEEP_CLIP_V145 } from "./hunterVisuals";
import { gauntletFrontArmMatrixV145, gauntletRigSpriteV139 } from "./systems/gauntletRigSpritesV139";
import { hunterBodyPartColorV62, hunterBodyPartClipCssV62 } from "./hunterHeadArtV62";
import { HUNTER_DREAD_STRANDS_V63, solveHunterDreadsV63, solveHunterSideDreadsV145 } from "./hunterDreadsV63";
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
/** Rest-pose (bind) matrix in 256x384 units as CSS, like HunterRigPreview's cssMatrix. */
const restMatrixCss = (m: { a: number; b: number; c: number; d: number; e: number; f: number }) =>
  `translate(${m.e / 256 * 100}%, ${m.f / 384 * 100}%) matrix(${m.a}, ${m.b}, ${m.c}, ${m.d}, 0, 0)`;
const imageStyle: CSSProperties = { position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "fill", pointerEvents: "none", userSelect: "none" };
/**
 * These are the exact registered 256x384 V3 plates used by HunterRigPreview.
 * Homeworld remains a static/resting composite; no pose is invented or
 * substituted for the pre-existing six body morphologies.
 */
export function homeworldArmorSlotsV114(
  appearance: Partial<Pick<HunterAppearance, "armorStyleId">> | undefined,
  armorId: ArmorId,
  hasWristblades: boolean,
): Array<{ id: string; z: number; shoulder?: boolean; greave?: "front" | "back"; wrap?: HunterBodyPartId }> {
  const family = HUNTER_ARMOR_MODULES[appearance?.armorStyleId ?? "classic"];
  // V145 wrap: `wrap` plates are drawn under the body (z 9) and again over it,
  // masked to that limb, so they read as going around the limb.
  const parts: Array<{ id: string; z: number; shoulder?: boolean; greave?: "front" | "back"; wrap?: HunterBodyPartId }> = [
    { id: family.chest, z: 18 },
    { id: "belt", z: 19 },
    { id: family.shoulder, z: 22, shoulder: true, wrap: "upper-arm-front" },
  ];
  // Blades are on the back forearm since V145, so the front one always keeps its
  // bracer; hasWristblades no longer changes the plate list.
  if (armorId !== "scout") {
    parts.push({ id: "bracer", z: 23 });
    parts.push(
      { id: "thigh", z: 17, wrap: "thigh-front" },
      { id: "thigh-lower", z: 17, greave: "front", wrap: "shin-front" },
      { id: "knee", z: 19 },
      { id: "shin", z: 18, greave: "front", wrap: "shin-front" },
      { id: "thigh-lower", z: 17, greave: "back", wrap: "shin-back" },
      { id: "shin", z: 17, greave: "back", wrap: "shin-back" },
    );
  }
  return parts;
}

/** Modular body bitmaps with constrained strand motion; not a full body sheet. */
export default function HomeworldModularHunter({ morphId, dreadStyleId, className, appearance: appearanceProp, style, motionPhase = 0, speed = 0, dreadAngles, showArmor = false, armorId = "hunter", hasWristblades = false, gauntletVariantId = "jungle-hunter", clanNpcId }: {
  morphId: HunterBodyMorphId; dreadStyleId: DreadStyleId; className?: string;
  style?: CSSProperties;
  motionPhase?: number; speed?: number;
  dreadAngles?: readonly number[];
  /** Only the playable Homeworld character enables this: anatomical chooser remains unobscured. */
  showArmor?: boolean;
  armorId?: ArmorId;
  hasWristblades?: boolean;
  /** Wrist computer identity worn on the back (left) forearm; same V139 shells as the rig. */
  gauntletVariantId?: string;
  appearance?: Pick<HunterAppearance, "skinId" | "dreadTintId" | "headStyleId"> &
    Partial<Pick<HunterAppearance, "armorStyleId" | "armorTintId" | "chromaticsV113" | "presetId" | "biomaskId" | "piecesV146" | "skinPatternIdV146">>;
  /** V146: a member of the player's clan; wears the clan palette with a small personal variation. */
  clanNpcId?: string;
}) {
  const clanPalette = useContext(ClanPaletteContextV146);
  const appearance = clanNpcId && clanPalette && appearanceProp && !appearanceProp.piecesV146
    ? { ...appearanceProp, piecesV146: clanNpcPiecesV146(clanPalette, clanNpcId) }
    : appearanceProp;
  return <span className={className} style={style} data-modular-homeworld-character data-body-morph={morphId} data-modular-status="static-bitmap-composition" aria-hidden="true">
    <span style={{ position: "absolute", height: "100%", aspectRatio: "2 / 3", left: "50%", bottom: 0, transform: "translateX(-50%)", isolation: "isolate" }}>
      {solveHunterDreadsV63(REST_FRAME, morphId, dreadStyleId, appearance?.headStyleId,
        dreadAngles ?? HUNTER_DREAD_STRANDS_V63.map((_, i) => Math.min(.24, Math.abs(speed) / 1000) + (speed > 5 ? Math.sin(motionPhase * 8 + i) * .02 : 0))
      ).map((strand, index) => <span key={index} data-homeworld-layer="dread" data-dread-collisions={strand.collisions} style={{ ...imageStyle,
        zIndex: index, transformOrigin: `${HOMEWORLD_DREAD_ROOT.x / 256 * 100}% ${HOMEWORLD_DREAD_ROOT.y / 384 * 100}%`,
        transform: `translate(${strand.x / 256 * 100}%, ${strand.y / 384 * 100}%) rotate(${strand.angle}rad) scale(${strand.scale})`,
      }}>
        <img alt="" draggable={false} src={hunterDreadPath(dreadStyleId)} style={{ ...imageStyle, filter: HUNTER_DREAD_FILTERS_V114[appearance?.dreadTintId ?? "obsidian"] }} />
        <ChromaticSurfaceV113 appearance={appearance} channel="dreads" piece="dreads" maskPath={hunterDreadPath(dreadStyleId)} style={imageStyle} />
      </span>)}
      {/* Apply the base grade to anatomical bitmap pixels only. A filter on
          this parent also recolors tattoos, custom pigments and decals;
          the animated rig and hunt Canvas do NOT grade those overlays. */}
      <span data-homeworld-layer="body" style={{ ...imageStyle, zIndex: 10 }}>
        {HUNTER_BODY_PART_IDS.map(partId => {
          const placement = hunterBodyPartPlacement(morphId, partId, appearance?.headStyleId);
          const source = hunterBodyPartPath(morphId, partId, appearance?.headStyleId);
          const gradedFilter = hunterBodyPartColorV62(morphId, partId,
            HUNTER_SKIN_FILTERS_V114[appearance?.skinId ?? "ochre-mottle"]);
          return <span key={partId} style={{ ...imageStyle }} data-homeworld-body-part={partId}>
            <img alt="" draggable={false} src={source} style={placement ? {
              position: "absolute", left: `${placement.x / 256 * 100}%`, top: `${placement.y / 384 * 100}%`,
              width: `${placement.width / 256 * 100}%`, height: `${placement.height / 384 * 100}%`, objectFit: "fill", zIndex: 1,
              filter: gradedFilter,
            } : { ...imageStyle, filter: gradedFilter, clipPath: hunterBodyPartClipCssV62(morphId, partId) }} />
            <ChromaticSurfaceV113 appearance={appearance} channel="skin" piece="skin" maskPath={source} placement={placement}
              style={{ ...imageStyle, zIndex: 2, clipPath: hunterBodyPartClipCssV62(morphId, partId) }} />
            <SkinPatternSurfaceV146 appearance={appearance} maskPath={source} placement={placement}
              style={{ ...imageStyle, zIndex: 2, clipPath: hunterBodyPartClipCssV62(morphId, partId) }} />
            {(partId === "head" || partId === "torso") && <DecalSurfaceV133
              appearance={appearance} zone={partId === "head" ? "face" : "body"}
              maskPath={source} placement={placement} style={{ ...imageStyle, zIndex: 3,
                clipPath: hunterBodyPartClipCssV62(morphId, partId) }} />}
          </span>;
        })}
      </span>
      {/* The legacy net plate contains old facial pixels: keep only clothing below the neck. */}
      <img alt="" draggable={false} data-homeworld-layer="clothing" src={`${HUNTER_ASSET_ROOT_V3}/body/${morphId}/net/full.webp`} style={{ ...imageStyle, zIndex: 11, opacity: .9, filter: hunterBodyPartColorV62(morphId, "torso", HUNTER_SKIN_FILTERS_V114[appearance?.skinId ?? "ochre-mottle"]), clipPath: "inset(27.34375% 0 0 0)", maskImage: `url("${hunterBodyFullPath(morphId)}")`, maskSize: "100% 100%", maskRepeat: "no-repeat" }} />
      <img alt="" draggable={false} data-homeworld-layer="loincloth" src={`${HUNTER_ASSET_ROOT_V3}/body/${morphId}/net/full.webp`} style={{ ...imageStyle, zIndex: 12, clipPath: clothClip(morphId) }} />
      <ChromaticSurfaceV113 appearance={appearance} channel="outfit" piece="fishnet" maskPath={`${HUNTER_ASSET_ROOT_V3}/body/${morphId}/net/full.webp`}
        style={{ ...imageStyle, zIndex: 13, clipPath: clothClip(morphId) }} />
      {appearance?.biomaskId
        && <span data-homeworld-biomask-pigment-v131 style={{ ...imageStyle, zIndex: 71 }}>
          <img alt="" draggable={false} src={hunterMaskRigPath(appearance.biomaskId)} style={{
            position: "absolute",
            left: String(hunterMaskRigPlacement(appearance.biomaskId).x / 256 * 100) + "%",
            top: String(hunterMaskRigPlacement(appearance.biomaskId).y / 384 * 100) + "%",
            width: String(hunterMaskRigPlacement(appearance.biomaskId).width / 256 * 100) + "%",
            height: String(hunterMaskRigPlacement(appearance.biomaskId).height / 384 * 100) + "%",
          }} />
          <ChromaticSurfaceV113 channel="biomask" piece="biomask"
            appearance={{ chromaticsV113: maskChromaticsForAppearanceV131(appearance), piecesV146: appearance?.piecesV146 }}
            maskPath={hunterMaskRigPath(appearance.biomaskId)}
            placement={hunterMaskRigPlacement(appearance.biomaskId)} style={imageStyle} />
          <DecalSurfaceV133 appearance={appearance} zone="biomask"
            maskPath={hunterMaskRigPath(appearance.biomaskId)}
            placement={hunterMaskRigPlacement(appearance.biomaskId)} style={imageStyle} />
        </span>}
      {showArmor && homeworldArmorSlotsV114(appearance, armorId, hasWristblades).map(plate => {
        const path = hunterArmorPath(plate.id);
        // V145 registration: shoulder mirrored onto the deltoid, greaves widened
        // under the knee and repeated on the back shin.
        const fit = plate.shoulder ? hunterShoulderPlateMatrixV145(morphId)
          : plate.greave ? hunterGreaveMatrixV145(morphId, plate.id === "shin" ? "shin" : "thigh-lower", plate.greave) : undefined;
        const keep = HUNTER_ARMOR_KEEP_CLIP_V145[plate.id]?.[0];
        const clipPath = keep ? `inset(${keep[1] / 384 * 100}% ${(256 - keep[0] - keep[2]) / 256 * 100}% ${(384 - keep[1] - keep[3]) / 384 * 100}% ${keep[0] / 256 * 100}%)` : undefined;
        const far = plate.greave === "back";
        const plateLayer = (zIndex: number, key: string) => <span key={key} data-homeworld-layer="armor" data-armor-module={plate.id}
          style={{ ...imageStyle, zIndex, transformOrigin: fit ? "0 0" : undefined, transform: fit ? restMatrixCss(fit) : undefined }}>
          <img alt="" draggable={false} src={path} style={{ ...imageStyle, clipPath,
            filter: HUNTER_ARMOR_FILTERS_V114[appearance?.armorTintId ?? "bronze"] + (far ? " brightness(.72)" : "") }} />
          <ChromaticSurfaceV113 appearance={appearance} channel="armor" piece={pieceForArmorSlotV146(plate.id)} maskPath={path} style={{ ...imageStyle, clipPath }} />
          {plate.id === HUNTER_ARMOR_MODULES[appearance?.armorStyleId ?? "classic"].chest &&
            <DecalSurfaceV133 appearance={appearance} zone="armor" maskPath={path} style={imageStyle} />}
        </span>;
        const id = plate.id + (far ? "-far" : "");
        if (!plate.wrap) return plateLayer(plate.z, id);
        const limb = hunterBodyPartPath(morphId, plate.wrap, appearance?.headStyleId);
        return <span key={id}>
          {plateLayer(9, id + "-under")}
          <span data-homeworld-armor-wrap={plate.id} style={{ ...imageStyle, zIndex: plate.z,
            maskImage: `url("${limb}")`, WebkitMaskImage: `url("${limb}")`, maskSize: "100% 100%", WebkitMaskSize: "100% 100%",
            maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat" }}>{plateLayer(0, id + "-over")}</span>
        </span>;
      })}
      {/* V145 side dreadlocks over the near shoulder. */}
      {showArmor && solveHunterSideDreadsV145(REST_FRAME, morphId, dreadStyleId, appearance?.headStyleId, dreadAngles ?? []).map((strand, index) =>
        <span key={"side-" + index} data-homeworld-layer="dread-side" style={{ ...imageStyle, zIndex: 23,
          transformOrigin: "0 0", transform: restMatrixCss(strand.matrix) }}>
          <img alt="" draggable={false} src={hunterDreadPath(dreadStyleId)} style={{ ...imageStyle, filter: HUNTER_DREAD_FILTERS_V114[appearance?.dreadTintId ?? "obsidian"] }} />
          <ChromaticSurfaceV113 appearance={appearance} channel="dreads" piece="dreads" maskPath={hunterDreadPath(dreadStyleId)} style={imageStyle} />
        </span>)}
      {/* Worn kit at rest, with the same forearm fits as HunterRigPreview (V145):
          wrist computer on the front forearm, blade housing on the back one. */}
      {showArmor && (() => {
        const gauntlet = restMatrixCss(gauntletFrontArmMatrixV145(morphId, true));
        return <>
          {(["base", "lid"] as const).map((part, index) => <img key={part} alt="" draggable={false}
            data-homeworld-layer="gauntlet" data-gauntlet-part={part} src={gauntletRigSpriteV139(gauntletVariantId, part)}
            style={{ ...imageStyle, zIndex: 24 + index, transformOrigin: "0 0", transform: gauntlet }} />)}
          {hasWristblades && <img alt="" draggable={false} data-homeworld-layer="blade-housing"
            src={HUNTER_EQUIPMENT_V3.wristblades.housing}
            style={{ ...imageStyle, zIndex: 26, transformOrigin: "0 0", transform: restMatrixCss(hunterWristbladeRegistrationMatrix(morphId)) }} />}
        </>;
      })()}
    </span>
  </span>;
}
