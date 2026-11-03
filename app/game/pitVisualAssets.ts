import type { PitFighterId } from "./systems/pitCombat";
import { getPitCombatBitmapArtDefinition } from "./pitCombatBitmapArt";

/** Selection illustrations only. Combat animation keeps its own rendering contract. */
export interface PitFighterKeyArt {
  readonly fighterId: PitFighterId;
  readonly src: string;
  readonly width: number;
  readonly height: number;
  readonly kind: "selection-key-art" | "static-bitmap";
  readonly nativeFacing: "right" | "left";
  readonly background: "#101916";
  readonly alt: string;
}

export const PIT_ILLUSTRATED_FIGHTER_IDS = [
  "jungle-hunter", "city-hunter", "berserker", "wolf",
] as const satisfies readonly PitFighterId[];

export type PitIllustratedFighterId = typeof PIT_ILLUSTRATED_FIGHTER_IDS[number];

/**
 * Three opaque V23 WebP illustrations remain unchanged. City Hunter uses the
 * repaired V31 alpha plate shared with combat, never the superseded hand art.
 * City Hunter also has an independently generated left pose for the opponent.
 * Other V23 opponents retain their provisional mirror convention, not an
 * independently authored reverse view. Always contain the complete image.
 * Other V5/V31 cutouts supply the remaining IDs; frontal art stays neutral.
 */
const cityHunterPlate = getPitCombatBitmapArtDefinition("city-hunter")!;
export const PIT_FIGHTER_KEY_ART: Readonly<Record<PitIllustratedFighterId, PitFighterKeyArt>> = {
  "jungle-hunter": {
    fighterId: "jungle-hunter",
    src: "/game/assets/v23/pit/fighters/jungle-hunter-key-art.webp",
    width: 1024,
    height: 1536,
    kind: "selection-key-art",
    nativeFacing: "right",
    background: "#101916",
    alt: "Jungle Hunter en pied, biomask argenté et équipement de chasse du film Predator.",
  },
  "city-hunter": {
    fighterId: "city-hunter",
    src: cityHunterPlate.src,
    width: cityHunterPlate.width,
    height: cityHunterPlate.height,
    kind: "static-bitmap",
    nativeFacing: "right",
    background: "#101916",
    alt: "City Hunter en pied, biomask cuivré et équipement de chasse du film Predator 2.",
  },
  berserker: {
    fighterId: "berserker",
    src: "/game/assets/v23/pit/fighters/berserker-key-art.webp",
    width: 1024,
    height: 1536,
    kind: "selection-key-art",
    nativeFacing: "right",
    background: "#101916",
    alt: "Berserker en pied, biomask orné d’une mâchoire osseuse et armure du film Predators.",
  },
  wolf: {
    fighterId: "wolf",
    src: "/game/assets/v23/pit/fighters/wolf-key-art.webp",
    width: 1024,
    height: 1536,
    kind: "selection-key-art",
    nativeFacing: "right",
    background: "#101916",
    alt: "Wolf en pied, biomask gravé et équipement de vétéran du film Aliens vs. Predator: Requiem.",
  },
};

export const PIT_CITY_HUNTER_LEFT_KEY_ART: PitFighterKeyArt = Object.freeze({
  fighterId: "city-hunter",
  src: "/game/sprites/v31/film-plates/city-hunter-left.png",
  width: 1098, height: 1493, kind: "static-bitmap", nativeFacing: "left",
  background: "#101916",
  alt: "City Hunter en pied orienté à gauche, pose OpenAI originale avec biomask cuivré et combistick.",
});

export function getPitFighterKeyArt(
  fighterId: PitFighterId,
  requestedFacing: "right" | "left" = "right",
): PitFighterKeyArt | null {
  if (fighterId === "city-hunter" && requestedFacing === "left") return PIT_CITY_HUNTER_LEFT_KEY_ART;
  return Object.hasOwn(PIT_FIGHTER_KEY_ART, fighterId)
    ? PIT_FIGHTER_KEY_ART[fighterId as PitIllustratedFighterId]
    : null;
}
