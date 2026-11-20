/**
 * V147 personal roster slot of THE PIT (campaign bible, "Modes multijoueur
 * dédiés" : le roster a une case de plus, le Yautja de sa campagne).
 *
 * The slot is a presentation layer over one existing first-edition fighter:
 * combat rules, replays, checksums and the Pit sidecar keep recording that
 * fighter's identifier, so no new fighter id enters a replay or a save. Name
 * and appearance come from the campaign save and are never written back.
 * Arcade, Circuit and Descent keep per-fighter progress: the slot stays out of
 * them so it cannot advance the base fighter's chronicle.
 */
import type { PitFirstEditionFighterId } from "./pitFirstEdition";
import type { ModeAppearanceSourceV147 } from "./hunterModeAppearanceV147.ts";

/** Combat profile of the slot: the shared balanced Yautja duel profile. */
export const PIT_PERSONAL_FIGHTER_BASE_V147 = "jungle-hunter" as const satisfies PitFirstEditionFighterId;
export const PIT_PERSONAL_FIGHTER_MODES_V147 = Object.freeze(["cpu", "local", "training"] as const);
export const PIT_PERSONAL_FIGHTER_SLOT_V147 = 0 as const;
export const PIT_PERSONAL_NAME_MAX_V147 = 40;
export const PIT_PERSONAL_NAME_FALLBACK_V147 = "Ton Yautja";

export interface PitPersonalLoadoutV147 {
  readonly armorId: string;
  readonly weaponIds: readonly string[];
  readonly gearIds: readonly string[];
}

export interface PitPersonalFighterV147<A = unknown, L extends PitPersonalLoadoutV147 = PitPersonalLoadoutV147> {
  readonly name: string;
  readonly appearance: A;
  readonly appearanceSource: ModeAppearanceSourceV147;
  readonly outfitName: string | null;
  /** Campaign equipment, shown on the selection card. */
  readonly loadout: L;
  readonly baseFighterId: typeof PIT_PERSONAL_FIGHTER_BASE_V147;
}

export function normalizePitPersonalNameV147(value: unknown): string {
  const name = typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, PIT_PERSONAL_NAME_MAX_V147).trim() : "";
  return name || PIT_PERSONAL_NAME_FALLBACK_V147;
}

export function createPitPersonalFighterV147<A, L extends PitPersonalLoadoutV147>(input: {
  readonly hunterName: unknown;
  readonly appearance: A;
  readonly appearanceSource: ModeAppearanceSourceV147;
  readonly outfitName: string | null;
  readonly loadout: L;
}): PitPersonalFighterV147<A, L> {
  return Object.freeze({
    name: normalizePitPersonalNameV147(input.hunterName),
    appearance: input.appearance,
    appearanceSource: input.appearanceSource,
    outfitName: input.outfitName,
    loadout: Object.freeze({ ...input.loadout }),
    baseFighterId: PIT_PERSONAL_FIGHTER_BASE_V147,
  });
}

export function canPitPersonalFighterEnterModeV147(mode: string): boolean {
  return (PIT_PERSONAL_FIGHTER_MODES_V147 as readonly string[]).includes(mode);
}

const PIT_MODES_V147 = ["cpu", "local", "training", "arcade", "circuit", "descent"] as const;
type PitModeV147 = typeof PIT_MODES_V147[number];

/** Mode cycling (gamepad LB/RB) that never lands on a mode the slot cannot enter. */
export function cyclePitPersonalModeV147(current: PitModeV147, direction: -1 | 1): PitModeV147 {
  const index = PIT_MODES_V147.indexOf(current);
  for (let offset = 1; offset <= PIT_MODES_V147.length; offset++) {
    const candidate = PIT_MODES_V147[(index + direction * offset + PIT_MODES_V147.length) % PIT_MODES_V147.length];
    if (canPitPersonalFighterEnterModeV147(candidate)) return candidate;
  }
  return current;
}

/**
 * The slot is shown in a live duel only: J1 holds the base fighter, the
 * selection asked for the personal slot and the duel is not a replay (a
 * replay carries no presentation data and replays the base fighter).
 */
export function isPitPersonalFighterLiveV147(input: {
  readonly selected: boolean;
  readonly available: boolean;
  readonly playback: boolean;
  readonly slotFighterId: string | null | undefined;
}): boolean {
  return input.selected && input.available && !input.playback && input.slotFighterId === PIT_PERSONAL_FIGHTER_BASE_V147;
}

/** Display name of a combat slot. Gameplay identifiers are never renamed. */
export function pitSlotDisplayNameV147(
  slot: number, definitionName: string, personal: Pick<PitPersonalFighterV147, "name"> | null, live: boolean,
): string {
  return live && personal && slot === PIT_PERSONAL_FIGHTER_SLOT_V147 ? personal.name : definitionName;
}
