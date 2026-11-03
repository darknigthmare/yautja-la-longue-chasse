import { evaluateChronicleAccess, getChronicleRank, type ChronicleAccessContext } from './clanChronicle';
import { normalizeShipProgression, SHIP_PROGRESSION_STORAGE_KEY, SHIP_PROGRESSION_VERSION } from './progression';
import type { SaveGame } from '../types';

export type MainMenuGameModeV81 = 'the-pit' | 'game-reserve';
export const MAIN_MENU_MODE_LABELS_V81 = { 'the-pit': 'The Pit', 'game-reserve': 'Game Reserve Planet' } as const;
export const MAIN_MENU_BONUS_PREFIX_V81 = 'yautja-main-menu-bonus.v81.';
export const MAIN_MENU_BONUS_OWNER_V81 = '2026-10-04T00:00:00.000Z';

/** Narrative receipts, rather than an editable profile rank, open adult modes.
 * A null campaign is never confused with a fresh legacy adult save. */
export function mainMenuModeAccessV81(save: SaveGame | null, context: ChronicleAccessContext = {}): Readonly<Record<MainMenuGameModeV81, boolean>> {
  const rank = save?.prologue ? getChronicleRank(save.prologue.chronicle) : null;
  const adult = Boolean(save && (!save.prologue || ['blooded', 'elite', 'elder', 'ancient'].includes(rank ?? '')));
  return { 'the-pit': adult, 'game-reserve': Boolean(save && (!save.prologue || evaluateChronicleAccess(save.prologue.chronicle, 'reserve-hunt', context).allowed)) };
}

/** Unlike loadShipProgression, this title-menu read never adopts/writes an old
 * sidecar or treats its default fallback as ownership evidence. */
export function mainMenuShipContextV81(save: SaveGame | null, storage: Pick<MainMenuBonusStorageV81, 'getItem'> | null): ChronicleAccessContext {
  if (!save || !storage) return { personalShipAvailable: false };
  try {
    const raw = storage.getItem(SHIP_PROGRESSION_STORAGE_KEY);
    if (!raw || raw.length > 1_000_000) return { personalShipAvailable: false };
    const source = JSON.parse(raw);
    if (!source || source.version !== SHIP_PROGRESSION_VERSION || source.ownerSaveCreatedAt !== save.createdAt || !Array.isArray(source.unlockedShipIds) || !source.unlockedShipIds.includes(source.selectedShipId)) return { personalShipAvailable: false };
    const fleet = normalizeShipProgression(source, save, save.updatedAt);
    return { personalShipAvailable: fleet.unlockedShipIds.includes(fleet.selectedShipId) && source.unlockedShipIds.includes(fleet.selectedShipId) };
  } catch { return { personalShipAvailable: false }; }
}

export function mainMenuBrowserShipContextV81(save: SaveGame | null): ChronicleAccessContext {
  try { return mainMenuShipContextV81(save, typeof window === 'undefined' ? null : window.localStorage); }
  catch { return { personalShipAvailable: false }; }
}

export interface MainMenuBonusStorageV81 {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

/** An explicit free-play visit may store its own routes, never a campaign key.
 * All keys passed by existing PIT controllers are sandboxed under this prefix.
 * These local records are deliberately outside campaign/cloud archives. */
export function mainMenuBonusStorageV81(storage: MainMenuBonusStorageV81): MainMenuBonusStorageV81 {
  return {
    getItem: key => storage.getItem(MAIN_MENU_BONUS_PREFIX_V81 + key),
    setItem: (key, value) => storage.setItem(MAIN_MENU_BONUS_PREFIX_V81 + key, value),
    removeItem: key => storage.removeItem(MAIN_MENU_BONUS_PREFIX_V81 + key),
  };
}
