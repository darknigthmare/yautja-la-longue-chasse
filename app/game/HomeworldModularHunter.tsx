/* eslint-disable @next/next/no-img-element -- registered transparent layers share the canonical V3 canvas */
import type { CSSProperties } from "react";
import type { HunterBodyMorphId, DreadStyleId, HunterAppearance } from "./types";
import { hunterBodyFullPath, hunterDreadPath, HUNTER_ASSET_ROOT_V3 } from "./hunterVisuals";

/** Same authored skull socket and strand placement used by HunterRigPreview, at rest. */
export const HOMEWORLD_DREAD_ROOT = { x: 143, y: 43, canvasWidth: 256, canvasHeight: 384 } as const;
const STRANDS = [
  { x: -12, y: 3, rotation: -12, scale: .88 }, { x: -8, y: -1, rotation: -8, scale: .96 },
  { x: -4, y: -4, rotation: -4, scale: 1.04 }, { x: 0, y: -5, rotation: 0, scale: 1.08 },
  { x: 4, y: -3, rotation: 4, scale: 1.02 }, { x: 8, y: 2, rotation: -10, scale: .72 },
  { x: 12, y: 7, rotation: -16, scale: .62 },
] as const;
// Whole-body city plates are three-quarter views. Their rear scalp lies left
// of the part-rig skull pivot, so register the shared dread root to that socket.
const FULL_BODY_DREAD_SOCKET = { x: 110, y: 43 } as const;
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

/** Static modular bitmap composition; never claims a complete animation sheet. */
export default function HomeworldModularHunter({ morphId, dreadStyleId, className, appearance }: {
  morphId: HunterBodyMorphId; dreadStyleId: DreadStyleId; className?: string;
  appearance?: Pick<HunterAppearance, "skinId" | "dreadTintId">;
}) {
  return <span className={className} data-modular-homeworld-character data-body-morph={morphId} data-modular-status="static-bitmap-composition" aria-hidden="true">
    <span style={{ position: "absolute", height: "100%", aspectRatio: "2 / 3", left: "50%", bottom: 0, transform: "translateX(-50%)", isolation: "isolate" }}>
      {STRANDS.map((strand, index) => <img key={index} alt="" draggable={false} data-homeworld-layer="dread" src={hunterDreadPath(dreadStyleId)} style={{ ...imageStyle,
        zIndex: index, filter: dreadFilter[appearance?.dreadTintId ?? "obsidian"],
        transformOrigin: `${HOMEWORLD_DREAD_ROOT.x / 256 * 100}% ${HOMEWORLD_DREAD_ROOT.y / 384 * 100}%`,
        transform: `translate(${(strand.x + FULL_BODY_DREAD_SOCKET.x - HOMEWORLD_DREAD_ROOT.x) / 256 * 100}%, ${(strand.y + FULL_BODY_DREAD_SOCKET.y - HOMEWORLD_DREAD_ROOT.y) / 384 * 100}%) rotate(${strand.rotation}deg) scale(${strand.scale})`,
      }} />)}
      <img alt="" draggable={false} data-homeworld-layer="body" src={hunterBodyFullPath(morphId)} style={{ ...imageStyle, zIndex: 10, filter: skinFilter[appearance?.skinId ?? "ochre-mottle"] }} />
      <img alt="" draggable={false} data-homeworld-layer="clothing" src={`${HUNTER_ASSET_ROOT_V3}/body/${morphId}/net/full.webp`} style={{ ...imageStyle, zIndex: 11, opacity: .9, maskImage: `url("${hunterBodyFullPath(morphId)}")`, maskSize: "100% 100%", maskRepeat: "no-repeat" }} />
      <img alt="" draggable={false} data-homeworld-layer="loincloth" src={`${HUNTER_ASSET_ROOT_V3}/body/${morphId}/net/full.webp`} style={{ ...imageStyle, zIndex: 12, clipPath: clothClip(morphId) }} />
    </span>
  </span>;
}
