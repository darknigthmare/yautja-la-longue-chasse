import type { CSSProperties } from "react";
import type { HunterAppearance } from "./types";
import {
  markColorV146, markLayerV146, markStrokesV146, skinPatternBackgroundV146, type MarkAnchorV146,
} from "./hunterMarksArtV146";
import type { HunterMarkIdV146 } from "./systems/hunterCustomizationV146";

type Placement = { x: number; y: number; width: number; height: number };

/** V146 skin pattern, masked to one skin layer of the 256x384 rig. */
export function SkinPatternSurfaceV146({ appearance, maskPath, style, placement }: {
  appearance?: Partial<Pick<HunterAppearance, "skinPatternIdV146" | "piecesV146">>;
  maskPath: string;
  style?: CSSProperties;
  placement?: Placement;
}) {
  const pattern = appearance?.skinPatternIdV146;
  if (!pattern) return null;
  const colors = appearance?.piecesV146?.["skin-pattern"];
  const background = skinPatternBackgroundV146(pattern, colors?.primary ?? "#2d241d", colors?.secondary ?? colors?.primary ?? "#4a3a2c");
  const mask = 'url("' + maskPath + '")';
  const layer: CSSProperties = {
    position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none",
    ...background, backgroundRepeat: "repeat",
    maskImage: mask, WebkitMaskImage: mask, maskRepeat: "no-repeat", WebkitMaskRepeat: "no-repeat",
    maskSize: "100% 100%", WebkitMaskSize: "100% 100%", mixBlendMode: "multiply", opacity: .5,
  };
  if (placement) return <span aria-hidden="true" data-skin-pattern-v146={pattern}
    style={{ ...style, position: "absolute", pointerEvents: "none" }}>
    <span style={{ ...layer, inset: "auto",
      left: String(placement.x / 256 * 100) + "%", top: String(placement.y / 384 * 100) + "%",
      width: String(placement.width / 256 * 100) + "%", height: String(placement.height / 384 * 100) + "%" }} />
  </span>;
  return <span aria-hidden="true" data-skin-pattern-v146={pattern} style={{ ...layer, ...style }} />;
}

/** V146 earned marks shown by the player, in head-bone source space. */
export function HunterMarksOverlayV146({ appearance, layer, anchor, style }: {
  appearance?: Partial<Pick<HunterAppearance, "marksV146">>;
  layer: "biomask" | "skin";
  anchor: MarkAnchorV146;
  style?: CSSProperties;
}) {
  const marks = Object.entries(appearance?.marksV146 ?? {}) as [HunterMarkIdV146, { color: string | null }][];
  const shown = marks.filter(([id]) => markLayerV146(id) === layer);
  if (!shown.length) return null;
  return <svg aria-hidden="true" data-hunter-marks-v146={layer} viewBox="0 0 256 384"
    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", overflow: "visible", ...style }}>
    {shown.flatMap(([id, value]) => markStrokesV146(id, anchor).map((stroke, index) => {
      const color = markColorV146(id, value.color);
      return <path key={id + index} d={stroke.d} fill={stroke.fill ? color : "none"}
        stroke={stroke.fill ? "none" : color} strokeWidth={stroke.width} strokeLinecap="round" strokeLinejoin="round" opacity={.9} />;
    }))}
  </svg>;
}
