/* eslint-disable @next/next/no-img-element -- native atlas cells are clipped without changing source pixels */
import type { CSSProperties } from 'react';

export interface HomeworldNativeSpriteCellV64 {
  src: string;
  sourceWidth: number;
  sourceHeight: number;
  sourceRect: { x: number; y: number; width: number; height: number };
  /** Pixels local to this cell, never an ambiguous full-atlas coordinate. */
  pivot: { x: number; y: number };
  alphaBounds: { x: number; y: number; width: number; height: number };
  heightWorld: number;
}

/** Native cell, one uniform scale, and a measured support point. The caller
 * supplies an already projected ground anchor; depth remains unprojected y. */
export default function HomeworldNativePropV64({ id, artId, art, x, y, depth, heightWorld = art.heightWorld, className, style }: {
  id: string; artId: string; art: HomeworldNativeSpriteCellV64;
  x: number; y: number; depth: number; heightWorld?: number;
  className?: string; style?: CSSProperties;
}) {
  const scale = heightWorld / art.alphaBounds.height;
  return <span className={className} data-homeworld-prop-id={id} data-homeworld-art-id={artId}
    data-native-source-rect={`${art.sourceRect.x},${art.sourceRect.y},${art.sourceRect.width},${art.sourceRect.height}`}
    style={{ position: 'absolute', left: x - art.pivot.x * scale, top: y - art.pivot.y * scale,
      width: art.sourceRect.width * scale, height: art.sourceRect.height * scale,
      overflow: 'hidden', pointerEvents: 'none', zIndex: Math.round(depth), ...style }}>
    <img alt="" draggable={false} src={art.src} style={{ position: 'absolute', maxWidth: 'none',
      left: -art.sourceRect.x * scale, top: -art.sourceRect.y * scale,
      width: art.sourceWidth * scale, height: art.sourceHeight * scale }} />
  </span>;
}
