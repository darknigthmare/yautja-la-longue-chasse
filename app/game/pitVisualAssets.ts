import type { PitFighterId } from "./systems/pitCombat";

/** Selection illustrations only. Combat animation keeps its own rendering contract. */
export interface PitFighterKeyArt {
  readonly fighterId: PitFighterId;
  readonly src: string;
  readonly width: 1024;
  readonly height: 1536;
  readonly kind: "selection-key-art";
  readonly background: "#101916";
  readonly alt: string;
}

export const PIT_ILLUSTRATED_FIGHTER_IDS = [
  "jungle-hunter", "city-hunter", "berserker", "wolf",
] as const satisfies readonly PitFighterId[];

export type PitIllustratedFighterId = typeof PIT_ILLUSTRATED_FIGHTER_IDS[number];

/**
 * Delivery: opaque WebP, 1024 × 1536 (2:3), whole body inside the image.
 * Background: flat #101916. These illustrations are not modular sprite cutouts.
 * Preserve the authored pose and equipment: contain, never crop or mirror.
 * Only register delivered assets; other fighters retain the mask glyph fallback.
 */
export const PIT_FIGHTER_KEY_ART: Readonly<Record<PitIllustratedFighterId, PitFighterKeyArt>> = {
  "jungle-hunter": {
    fighterId: "jungle-hunter",
    src: "/game/assets/v23/pit/fighters/jungle-hunter-key-art.webp",
    width: 1024,
    height: 1536,
    kind: "selection-key-art",
    background: "#101916",
    alt: "Jungle Hunter en pied, biomask argenté et équipement de chasse du film Predator.",
  },
  "city-hunter": {
    fighterId: "city-hunter",
    src: "/game/assets/v23/pit/fighters/city-hunter-key-art.webp",
    width: 1024,
    height: 1536,
    kind: "selection-key-art",
    background: "#101916",
    alt: "City Hunter en pied, biomask cuivré et équipement de chasse du film Predator 2.",
  },
  berserker: {
    fighterId: "berserker",
    src: "/game/assets/v23/pit/fighters/berserker-key-art.webp",
    width: 1024,
    height: 1536,
    kind: "selection-key-art",
    background: "#101916",
    alt: "Berserker en pied, biomask orné d’une mâchoire osseuse et armure du film Predators.",
  },
  wolf: {
    fighterId: "wolf",
    src: "/game/assets/v23/pit/fighters/wolf-key-art.webp",
    width: 1024,
    height: 1536,
    kind: "selection-key-art",
    background: "#101916",
    alt: "Wolf en pied, biomask gravé et équipement de vétéran du film Aliens vs. Predator: Requiem.",
  },
};

export function getPitFighterKeyArt(fighterId: PitFighterId): PitFighterKeyArt | null {
  return Object.hasOwn(PIT_FIGHTER_KEY_ART, fighterId)
    ? PIT_FIGHTER_KEY_ART[fighterId as PitIllustratedFighterId]
    : null;
}
