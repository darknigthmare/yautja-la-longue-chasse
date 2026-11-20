"use client";

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import type { PieceColorsV146 } from "./hunterPiecesV146";
import { hasZoneColorsV148, pieceCanvasSourceV148 } from "./hunterPieceZonesV148";
import { HUNTER_RIG_CANVAS } from "./hunterRig";

type Placement = { x: number; y: number; width: number; height: number };

type Props = {
  src: string;
  colors: PieceColorsV146 | null;
  placement?: Placement;
  style?: CSSProperties;
  piece?: string;
  base: ReactNode;
  baseFilter?: string;
  slot?: string;
};

export default function PieceZoneLayerV148(props: Props) {
  const { src, colors, placement, base, baseFilter } = props;
  if (!colors || !hasZoneColorsV148(colors)) return base;
  const key = JSON.stringify([src, colors.primary, colors.secondary, colors.accent, colors.finish,
    placement?.x, placement?.y, placement?.width, placement?.height, baseFilter]);
  return <ColoredPlate key={key} {...props} colors={colors} />;
}

const { width, height } = HUNTER_RIG_CANVAS;

function ColoredPlate({ src, colors, placement, style, piece, base, baseFilter, slot }: Props & { colors: PieceColorsV146 }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [ready, setReady] = useState(false);
  const { primary, secondary, accent, finish } = colors;
  const { x, y, width: plateWidth, height: plateHeight } = placement ?? {};
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let alive = true;
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      if (!alive) return;
      try {
        const position = x !== undefined && y !== undefined && plateWidth !== undefined && plateHeight !== undefined
          ? { x, y, width: plateWidth, height: plateHeight } : undefined;
        const plate = pieceCanvasSourceV148(image, { primary, secondary, accent, light: null, finish }, position, baseFilter);
        if (!plate) return;
        context.clearRect(0, 0, width, height);
        context.drawImage(plate, 0, 0);
        setReady(true);
      } catch {
        // The authored image remains visible if the recoloured plate cannot be drawn.
      }
    };
    image.src = src;
    return () => {
      alive = false;
      image.onload = null;
    };
  }, [src, primary, secondary, accent, finish, x, y, plateWidth, plateHeight, baseFilter]);

  // Both plates contain the source alpha. Showing them together alters the silhouette.
  return <>
    {!ready && base}
    <canvas ref={ref} width={width} height={height} aria-hidden="true" data-piece-zones-v148={piece}
      data-rig-slot={ready ? slot : undefined} style={{ position: "absolute", inset: 0, width: "100%", height: "100%",
        pointerEvents: "none", ...style, display: ready ? style?.display : "none" }} />
  </>;
}
