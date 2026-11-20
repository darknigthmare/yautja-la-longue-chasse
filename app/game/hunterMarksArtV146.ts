/**
 * V146 earned marks and skin patterns drawn procedurally until their art
 * plates exist. Coordinates are in the 256x384 rig source space of the HEAD
 * bone, so the same paths serve the DOM preview (SVG) and the hunt (Path2D).
 */
import { HUNTER_MARKS_V146, type HunterMarkIdV146, type SkinPatternIdV146 } from "./systems/hunterCustomizationV146";
import { normalizeHexV146 } from "./hunterPiecesV146";

export interface MarkAnchorV146 { x: number; y: number; width: number; height: number }

export interface MarkStrokeV146 { readonly d: string; readonly width: number; readonly fill: boolean }

/** Where a mark sits: biomask marks need the mask worn, skin marks show bare. */
export function markLayerV146(id: HunterMarkIdV146): "biomask" | "skin" {
  return HUNTER_MARKS_V146.find(mark => mark.id === id)?.where ?? "biomask";
}

const f = (n: number) => Math.round(n * 10) / 10;

/** Paths for one mark, placed relative to the mask (or face) rectangle. */
export function markStrokesV146(id: HunterMarkIdV146, a: MarkAnchorV146): MarkStrokeV146[] {
  const cx = a.x + a.width * .52, top = a.y + a.height * .12;
  const u = Math.max(4, a.width / 12);
  switch (id) {
    case "xeno-acid": // forked line etched down the forehead (Scar's mark, AVP 2004)
      return [{ d: `M${f(cx)} ${f(top)}L${f(cx)} ${f(top + u * 2.4)}M${f(cx)} ${f(top + u * .9)}L${f(cx - u)} ${f(top + u * 2.1)}M${f(cx)} ${f(top + u * .9)}L${f(cx + u)} ${f(top + u * 2.1)}`, width: 1.6, fill: false }];
    case "queen-blood":
      return [0, 1, 2].map(i => ({ d: circle(cx + (i - 1) * u * .9, top + u * .6, u * .28), width: 0, fill: true }));
    case "bad-blood": // slash across the mask
      return [{ d: `M${f(a.x + a.width * .2)} ${f(a.y + a.height * .2)}L${f(a.x + a.width * .82)} ${f(a.y + a.height * .7)}`, width: 2.2, fill: false }];
    case "rank-blooded":
      return [{ d: chevron(cx, top + u * 2.9, u, 1), width: 1.4, fill: false }];
    case "rank-elite":
      return [0, 1].map(i => ({ d: chevron(cx, top + u * (2.7 + i * .8), u, 1), width: 1.4, fill: false }));
    case "rank-elder":
      return [0, 1, 2].map(i => ({ d: chevron(cx, top + u * (2.5 + i * .8), u, 1), width: 1.4, fill: false }));
    case "duel-scar": // three diagonal scars across the cheek
      return [0, 1, 2].map(i => {
        const x = a.x + a.width * (.55 + i * .09), y = a.y + a.height * .45;
        return { d: `M${f(x)} ${f(y)}L${f(x + u * .9)} ${f(y + u * 2)}`, width: 1.3, fill: false };
      });
  }
}

function circle(x: number, y: number, r: number): string {
  return `M${f(x - r)} ${f(y)}a${f(r)} ${f(r)} 0 1 0 ${f(r * 2)} 0a${f(r)} ${f(r)} 0 1 0 ${f(-r * 2)} 0Z`;
}
function chevron(x: number, y: number, u: number, s: number): string {
  return `M${f(x - u * s)} ${f(y)}L${f(x)} ${f(y + u * .55)}L${f(x + u * s)} ${f(y)}`;
}

export function markColorV146(id: HunterMarkIdV146, chosen: string | null | undefined): string {
  return normalizeHexV146(chosen) ?? HUNTER_MARKS_V146.find(mark => mark.id === id)?.defaultColor ?? "#d6d1c4";
}

/** CSS background for a skin pattern overlay (masked to the skin layer by the caller). */
export function skinPatternBackgroundV146(
  pattern: SkinPatternIdV146, first: string, second: string,
): { backgroundImage: string; backgroundSize: string } {
  switch (pattern) {
    case "spots": return {
      backgroundImage: `radial-gradient(circle at 30% 30%, ${first} 0 22%, transparent 24%), radial-gradient(circle at 75% 70%, ${second} 0 14%, transparent 16%)`,
      backgroundSize: "7% 4.6%, 9% 6%",
    };
    case "stripes": return {
      backgroundImage: `repeating-linear-gradient(100deg, ${first} 0 1.2%, transparent 1.2% 4%, ${second} 4% 4.6%, transparent 4.6% 7%)`,
      backgroundSize: "100% 100%",
    };
    case "marbled": return {
      backgroundImage: `radial-gradient(ellipse 60% 30% at 40% 50%, ${first} 0 30%, transparent 60%), radial-gradient(ellipse 30% 60% at 70% 30%, ${second} 0 25%, transparent 55%)`,
      backgroundSize: "18% 12%, 14% 16%",
    };
    case "scales": return {
      backgroundImage: `radial-gradient(circle at 50% 100%, transparent 42%, ${first} 44% 52%, transparent 54%)`,
      backgroundSize: "3.2% 2.2%",
    };
    case "bands": return {
      backgroundImage: `repeating-linear-gradient(0deg, ${first} 0 1%, transparent 1% 5%, ${second} 5% 5.6%, transparent 5.6% 9%)`,
      backgroundSize: "100% 100%",
    };
  }
}
