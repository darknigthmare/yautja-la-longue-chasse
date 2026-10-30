import type { ArmorTintId, DreadTintId, HunterSkinId } from "./types";

/**
 * Compatibility palette filters for authored modular bitmaps.
 * The first three values of each family retain their original appearance.
 * These are restrained fallback color adjustments, not replacements for
 * separately authored / imported skin, dread and armor materials.
 */
export const HUNTER_SKIN_FILTERS_V114: Readonly<Record<HunterSkinId, string>> = Object.freeze({
  "ochre-mottle": "none",
  "ashen-mottle": "grayscale(.42) sepia(.12) hue-rotate(155deg) brightness(.96)",
  "dark-mottle": "saturate(.78) brightness(.72) contrast(1.12)",
  "moss-mottle": "sepia(.38) saturate(1.1) hue-rotate(64deg) brightness(.88)",
  "copper-mottle": "sepia(.67) saturate(1.28) hue-rotate(330deg) brightness(.95)",
  "sand-mottle": "sepia(.48) saturate(.82) brightness(1.09)",
  "storm-mottle": "grayscale(.33) sepia(.17) hue-rotate(174deg) brightness(.77) contrast(1.14)",
  "ivory-mottle": "grayscale(.72) sepia(.13) brightness(1.26) contrast(.92)",
});

export const HUNTER_DREAD_FILTERS_V114: Readonly<Record<DreadTintId, string>> = Object.freeze({
  obsidian: "saturate(.72) brightness(.68) contrast(1.22)",
  umber: "sepia(.54) saturate(.9) brightness(.76)",
  ashen: "grayscale(.82) brightness(1.05) contrast(.94)",
  copper: "sepia(.7) saturate(1.35) hue-rotate(332deg) brightness(.94)",
  bone: "grayscale(.62) sepia(.22) brightness(1.16) contrast(.96)",
  moss: "sepia(.65) hue-rotate(62deg) saturate(.9) brightness(.78)",
  "blue-black": "sepia(.28) hue-rotate(165deg) saturate(.7) brightness(.59) contrast(1.23)",
});

export const HUNTER_ARMOR_FILTERS_V114: Readonly<Record<ArmorTintId, string>> = Object.freeze({
  gunmetal: "brightness(1)",
  bronze: "sepia(.48) saturate(1.22) hue-rotate(346deg) brightness(1.02)",
  obsidian: "saturate(.68) brightness(.58) contrast(1.2)",
  crimson: "sepia(.82) saturate(1.6) hue-rotate(310deg) brightness(.87)",
  rust: "sepia(.72) saturate(1.22) hue-rotate(338deg) brightness(.84)",
  bone: "grayscale(.8) sepia(.19) brightness(1.18) contrast(.96)",
  jade: "sepia(.57) hue-rotate(72deg) saturate(.94) brightness(.87)",
});
