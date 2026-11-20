import type { CSSProperties, ReactNode } from "react";
import type { HunterAppearance } from "./types";
import type { ChromaticChannelV113 } from "./hunterChromaticsV113";
import { chromaticOverlayStyleV113 } from "./hunterChromaticsV113";
import { chromaticsForPieceV146, type HunterPieceIdV146 } from "./hunterPiecesV146";
import { pieceZoneColorsV148 } from "./hunterPieceZonesV148";
import PieceZoneLayerV148 from "./PieceZoneLayerV148";

/** Pigment and material rendering in the registered 256x384 rig frame. */
export default function ChromaticSurfaceV113({
  appearance, channel, maskPath, style, placement, piece, base, baseFilter, slot, zoneStyle = style,
}: {
  appearance?: Pick<HunterAppearance, "chromaticsV113"> & Partial<Pick<HunterAppearance, "piecesV146">>;
  /** V146: per-piece colour for this layer (falls back to the channel colour). */
  piece?: HunterPieceIdV146 | null;
  channel: ChromaticChannelV113;
  maskPath: string;
  style?: CSSProperties;
  base: ReactNode;
  baseFilter?: string;
  slot?: string;
  zoneStyle?: CSSProperties;
  placement?: { x: number; y: number; width: number; height: number };
}) {
  const zoneColors = pieceZoneColorsV148(appearance, piece);
  if (zoneColors) return <PieceZoneLayerV148 src={maskPath} colors={zoneColors} placement={placement}
    piece={piece ?? undefined} style={zoneStyle} base={base} baseFilter={baseFilter} slot={slot} />;
  const chromatics = piece && appearance ? chromaticsForPieceV146(appearance, piece) : appearance?.chromaticsV113;
  const chromatic = chromaticOverlayStyleV113(chromatics, channel, maskPath);
  if (!chromatic) return base;
  const layer = chromatic as CSSProperties;
  if (placement) return <>{base}<span aria-hidden="true" data-chromatic-channel={channel}
    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", ...style, pointerEvents: "none" }}>
    <span style={{ ...layer, inset: "auto",
      left: String(placement.x / 256 * 100) + "%",
      top: String(placement.y / 384 * 100) + "%",
      width: String(placement.width / 256 * 100) + "%",
      height: String(placement.height / 384 * 100) + "%",
    }} />
  </span></>;
  return <>{base}<span aria-hidden="true" data-chromatic-channel={channel}
    style={{ ...layer, ...style, pointerEvents: "none" }} /></>;
}
