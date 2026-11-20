/**
 * V147 renderer of THE PIT personal slot: the modular hunter rig of the base
 * fighter, each layer tinted with the campaign piece colours through the V146
 * bridge (`chromaticsForPieceV146`, `pieceForArmorSlotV146`) and the same
 * canvas recolouring as the hunt (`chromaticCanvasSourceV113`).
 *
 * Only the personal slot is drawn here; every roster fighter keeps its
 * published combat art. Presentation only: no combat state is written.
 */
import { chromaticCanvasSourceV113 } from "./hunterChromaticCanvasV113";
import { pieceCanvasSourceV148, pieceZoneColorsV148 } from "./hunterPieceZonesV148";
import { maskChromaticsForAppearanceV131, type ChromaticChannelV113 } from "./hunterChromaticsV113";
import { chromaticsForPieceV146, pieceForArmorSlotV146, type HunterPieceIdV146 } from "./hunterPiecesV146";
import {
  drawPitModularFighter, isPitFighterArtReady, loadPitFighterArt,
  type PitFighterArtBank, type PitFighterArtLayer, type PitFighterRenderOptions,
} from "./pitFighterRendering";
import { PIT_PERSONAL_FIGHTER_BASE_V147 } from "./systems/pitPersonalFighterV147";
import type { PitFighterState } from "./systems/pitCombat";

export interface PitPersonalLayerTintV147 {
  readonly channel: ChromaticChannelV113;
  readonly piece: HunterPieceIdV146;
}

/**
 * Rig layer id (see `getPitFighterArtLayers`) to the customisable piece and
 * its V113 channel. Equipment without a tintable plate yet (wrist computer,
 * blades, shoulder cannon) keeps its authored colours.
 */
export function pitPersonalLayerTintV147(layerId: string): PitPersonalLayerTintV147 | null {
  if (layerId.startsWith("body-")) return { channel: "skin", piece: "skin" };
  if (layerId.startsWith("net-")) return { channel: "outfit", piece: "fishnet" };
  if (layerId.startsWith("dread-") || layerId.startsWith("dside-")) return { channel: "dreads", piece: "dreads" };
  if (layerId === "mask") return { channel: "biomask", piece: "biomask" };
  if (layerId.startsWith("armor-")) {
    const slot = layerId.slice("armor-".length).replace(/-back$/, "");
    const piece = pieceForArmorSlotV146(slot);
    return piece ? { channel: "armor", piece } : null;
  }
  return null;
}

export interface PitPersonalAppearanceV147 {
  readonly presetId?: string;
  readonly biomaskId?: string | null;
  readonly chromaticsV113?: unknown;
  readonly piecesV146?: unknown;
}

/** Chromatics used for one layer: piece colour over channel colour, mask rules kept. */
export function pitPersonalLayerChromaticsV147(appearance: PitPersonalAppearanceV147, tint: PitPersonalLayerTintV147) {
  if (tint.channel === "biomask") {
    return chromaticsForPieceV146({ ...appearance, chromaticsV113: maskChromaticsForAppearanceV131(appearance) }, tint.piece);
  }
  return chromaticsForPieceV146(appearance, tint.piece);
}

export function loadPitPersonalFighterArtV147(): Promise<PitFighterArtBank> {
  return loadPitFighterArt([PIT_PERSONAL_FIGHTER_BASE_V147]);
}

export function isPitPersonalFighterArtReadyV147(bank: PitFighterArtBank | null): bank is PitFighterArtBank {
  return Boolean(bank && isPitFighterArtReady(bank, PIT_PERSONAL_FIGHTER_BASE_V147));
}

/**
 * Draws the personal slot. Returns false (nothing drawn) when the rig art is
 * not complete, so the caller falls back to the base fighter's published art.
 */
export function drawPitPersonalFighterV147(
  context: CanvasRenderingContext2D,
  bank: PitFighterArtBank | null,
  fighter: PitFighterState,
  simulationFrame: number,
  groundY: number,
  appearance: PitPersonalAppearanceV147,
  options: PitFighterRenderOptions = {},
): boolean {
  if (fighter.definitionId !== PIT_PERSONAL_FIGHTER_BASE_V147 || !isPitPersonalFighterArtReadyV147(bank)) return false;
  return drawPitModularFighter(context, bank, fighter, simulationFrame, groundY, {
    ...options,
    layerSource: (layer: PitFighterArtLayer, image: HTMLImageElement) => {
      const tint = pitPersonalLayerTintV147(layer.id);
      if (!tint || typeof document === "undefined") return null;
      // V148: three zones when the piece has zone colours, else the V113 pigment.
      const zoned = pieceCanvasSourceV148(image, pieceZoneColorsV148(appearance, tint.piece), layer.placement, layer.filter);
      return zoned ?? chromaticCanvasSourceV113(image, pitPersonalLayerChromaticsV147(appearance, tint), tint.channel, layer.placement, layer.filter);
    },
  });
}
