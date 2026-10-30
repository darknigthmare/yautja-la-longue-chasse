import type { CSSProperties } from "react";
import type { HunterAppearance } from "./types";
import type { ChromaticChannelV113 } from "./hunterChromaticsV113";
import { chromaticOverlayStyleV113 } from "./hunterChromaticsV113";

/** Aligned to the existing 256x384 Yautja rig; never replaces bones or original art. */
export default function ChromaticSurfaceV113({
  appearance, channel, maskPath, style, placement,
}: {
  appearance?: Pick<HunterAppearance, "chromaticsV113">;
  channel: ChromaticChannelV113;
  maskPath: string;
  style?: CSSProperties;
  placement?: { x: number; y: number; width: number; height: number };
}) {
  const chromatic = chromaticOverlayStyleV113(appearance?.chromaticsV113, channel, maskPath);
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
