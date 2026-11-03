import type { CSSProperties, ImgHTMLAttributes } from "react";

/* eslint-disable @next/next/no-img-element -- exact native atlas geometry is required for pixel crops */

import {
  getV6Visual,
  V6_ATLASES,
  type V6VisualId,
} from "./v6Visuals";

export interface V6AtlasSpriteProps {
  /** Stable semantic identifier, never raw atlas coordinates. */
  id: V6VisualId;
  /** Overrides the catalogue label announced by assistive technologies. */
  label?: string;
  /** Decorative sprites are removed from the accessibility tree. */
  decorative?: boolean;
  className?: string;
  style?: CSSProperties;
  loading?: ImgHTMLAttributes<HTMLImageElement>["loading"];
}

/**
 * Displays one isolated atlas cell while preserving its measured aspect ratio.
 * The source image is shifted and scaled inside an overflow-hidden viewport;
 * adjacent objects can therefore never appear in the rendered frame.
 */
export function V6AtlasSprite({
  id,
  label,
  decorative = false,
  className,
  style,
  loading = "lazy",
}: V6AtlasSpriteProps) {
  const visual = getV6Visual(id);
  const atlas = V6_ATLASES[visual.atlasId];
  const { crop } = visual;

  const frameStyle: CSSProperties = {
    position: "relative",
    display: "inline-block",
    overflow: "hidden",
    width: "100%",
    maxWidth: "100%",
    aspectRatio: `${crop.width} / ${crop.height}`,
    ...style,
  };
  const imageStyle: CSSProperties = {
    position: "absolute",
    top: `${(-crop.y / crop.height) * 100}%`,
    left: `${(-crop.x / crop.width) * 100}%`,
    width: `${(atlas.width / crop.width) * 100}%`,
    height: `${(atlas.height / crop.height) * 100}%`,
    maxWidth: "none",
    maxHeight: "none",
    pointerEvents: "none",
    userSelect: "none",
  };

  return (
    <span
      className={className}
      style={frameStyle}
      role={decorative ? undefined : "img"}
      aria-label={decorative ? undefined : (label ?? visual.label)}
      aria-hidden={decorative || undefined}
      data-v6-visual-id={id}
      data-v6-atlas={visual.atlasId}
      data-v6-crop={`${crop.x},${crop.y},${crop.width},${crop.height}`}
    >
      <img
        src={atlas.src}
        alt=""
        aria-hidden="true"
        draggable={false}
        decoding="async"
        loading={loading}
        width={atlas.width}
        height={atlas.height}
        style={imageStyle}
      />
    </span>
  );
}

export default V6AtlasSprite;
