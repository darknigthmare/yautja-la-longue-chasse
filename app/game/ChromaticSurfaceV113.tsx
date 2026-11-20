import type { CSSProperties } from "react";
import type { HunterAppearance } from "./types";
import type { ChromaticChannelV113 } from "./hunterChromaticsV113";
import { chromaticOverlayStyleV113 } from "./hunterChromaticsV113";
import { chromaticsForPieceV146, type HunterPieceIdV146 } from "./hunterPiecesV146";

/** Aligned to the existing 256x384 Yautja rig; never replaces bones or original art. */
export default function ChromaticSurfaceV113({
  appearance, channel, maskPath, style, placement, piece,
}: {
  appearance?: Pick<HunterAppearance, "chromaticsV113"> & Partial<Pick<HunterAppearance, "piecesV146">>;
  /** V146: per-piece colour for this layer (falls back to the channel colour). */
  piece?: HunterPieceIdV146 | null;
  channel: ChromaticChannelV113;
  maskPath: string;
  style?: CSSProperties;
  placement?: { x: number; y: number; width: number; height: number };
}) {
  const chromatics = piece && appearance ? chromaticsForPieceV146(appearance, piece) : appearance?.chromaticsV113;
  const chromatic = chromaticOverlayStyleV113(chromatics, channel, maskPath);
  if (!chromatic) return null;
  const layer = chromatic as CSSProperties;
  if (placement) return <span aria-hidden="true" data-chromatic-channel={channel}
    style={{ ...style, position: "absolute", pointerEvents: "none" }}>
    <span style={{ ...layer, inset: "auto",
      left: String(placement.x / 256 * 100) + "%",
      top: String(placement.y / 384 * 100) + "%",
      width: String(placement.width / 256 * 100) + "%",
      height: String(placement.height / 384 * 100) + "%",
    }} />
  </span>;
  return <span aria-hidden="true" data-chromatic-channel={channel}
    style={{ ...layer, ...style, pointerEvents: "none" }} />;
}
