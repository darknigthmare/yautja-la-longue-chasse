"use client";

import { useEffect, useRef, type CSSProperties } from "react";
import { armorWearCanvasV172 } from "./hunterArmorWearV172";
import type { HunterPieceIdV146 } from "./hunterPiecesV146";
import { HUNTER_RIG_CANVAS, type HunterLayerPlacement } from "./hunterVisuals";

export default function HunterArmorWearLayerV172({ src, piece, level, placement, keep, style }: {
  src: string;
  piece: HunterPieceIdV146;
  level: number;
  placement?: HunterLayerPlacement;
  keep?: readonly (readonly [number, number, number, number])[];
  style: CSSProperties;
}) {
  const target = useRef<HTMLCanvasElement>(null);
  const { x, y, width, height } = placement ?? {};
  useEffect(() => {
    const canvas = target.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    let current = true;
    delete canvas.dataset.wearReady;
    context.clearRect(0, 0, canvas.width, canvas.height);
    const image = new Image();
    image.src = src;
    void image.decode().then(() => {
      if (!current) return;
      const box = x !== undefined && y !== undefined && width !== undefined && height !== undefined
        ? { x, y, width, height } : undefined;
      const wear = armorWearCanvasV172(image, { light: 0, heavy: level }, box, keep);
      if (!wear) return;
      context.drawImage(wear, 0, 0);
      canvas.dataset.wearReady = "true";
    }).catch(() => undefined);
    return () => { current = false; };
  }, [src, level, x, y, width, height, keep]);
  return <canvas ref={target} width={HUNTER_RIG_CANVAS.width} height={HUNTER_RIG_CANVAS.height}
    data-piece-wear={piece} data-wear-source={src} data-wear-level={level} aria-hidden="true"
    style={{ ...style, pointerEvents: "none" }} />;
}
