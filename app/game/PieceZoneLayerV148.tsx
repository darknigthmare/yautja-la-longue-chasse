"use client";
/**
 * V148 DOM overlay: one rig layer recoloured by zones (primary, secondary,
 * accent), drawn on a canvas above the original image. Zones the player left
 * alone stay transparent, so the graded original shows through.
 */
import { useEffect, useRef, type CSSProperties } from "react";
import type { PieceColorsV146 } from "./hunterPiecesV146";
import { hasZoneColorsV148, recolorPlateAutoV148 } from "./hunterPieceZonesV148";

type Placement = { x: number; y: number; width: number; height: number };

export default function PieceZoneLayerV148({ src, colors, placement, style, piece }: {
  src: string;
  colors: PieceColorsV146 | null;
  placement?: Placement;
  style?: CSSProperties;
  piece?: string;
}) {
  const ref = useRef<HTMLCanvasElement | null>(null);
  const primary = colors?.primary ?? "", secondary = colors?.secondary ?? "", accent = colors?.accent ?? "";
  const px = placement?.x, py = placement?.y, pw = placement?.width, ph = placement?.height;
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;
    let alive = true;
    const image = new Image();
    image.decoding = "async";
    image.onload = () => {
      if (!alive) return;
      ctx.clearRect(0, 0, 256, 384);
      ctx.drawImage(image, px ?? 0, py ?? 0, pw ?? 256, ph ?? 384);
      try {
        const pixels = ctx.getImageData(0, 0, 256, 384);
        pixels.data.set(recolorPlateAutoV148(pixels.data,
          { primary: primary || null, secondary: secondary || null, accent: accent || null, light: null }, undefined, true));
        ctx.putImageData(pixels, 0, 0);
      } catch { ctx.clearRect(0, 0, 256, 384); }
    };
    image.src = src;
    return () => { alive = false; };
  }, [src, primary, secondary, accent, px, py, pw, ph]);
  if (!hasZoneColorsV148(colors)) return null;
  return <canvas ref={ref} width={256} height={384} aria-hidden="true" data-piece-zones-v148={piece}
    style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", ...style }} />;
}
