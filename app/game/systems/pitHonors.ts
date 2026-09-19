import {
  PIT_ARCADE_COSMETICS,
  PIT_ARCADE_LADDERS,
  PIT_DESCENT_FLOOR_COUNT,
} from "./pitArcade";
import { PIT_CLAN_CIRCUITS } from "./pitCircuit";
import {
  PIT_FIRST_EDITION_FIGHTER_IDS,
  PIT_FIRST_EDITION_FIGHTERS,
} from "./pitFirstEdition";
import {
  PIT_SAVE_ALLOWED_COSMETIC_IDS,
  PIT_SAVE_DESCENT_COSMETIC_ID,
  validateCanonicalPitSave,
  type PitSaveV5,
} from "./pitSave";

export interface PitHonorEntry {
  readonly id: string;
  readonly label: string;
  readonly source: "arcade" | "circuit" | "descent";
  readonly earned: boolean;
  readonly condition: string;
  readonly description: string;
  readonly progress: {
    readonly current: number;
    readonly total: number;
    readonly label: string;
  };
  readonly palette?: {
    readonly primary: string;
    readonly secondary: string;
    readonly accent: string;
  };
}

export interface PitHonors {
  readonly status: "ready" | "empty" | "owner-conflict" | "invalid";
  readonly earnedCount: number;
  readonly totalCount: number;
  readonly entries: readonly PitHonorEntry[];
}

/**
 * Read-only projection of the existing PIT sidecar, never a reward reducer.
 * The caller retains loadPitSave.failure: null alone cannot distinguish missing
 * storage from an unavailable/corrupt sidecar. No storage is accessed here.
 * Unknown cosmetic strings are omitted from this display only; all known
 * rewards and their supporting progress must still pass canonical validation.
 */
export function buildPitHonors(save: PitSaveV5 | null, owner: string): PitHonors {
  const circuit = PIT_CLAN_CIRCUITS[PIT_FIRST_EDITION_FIGHTER_IDS[0]];
  const totalCount = PIT_FIRST_EDITION_FIGHTER_IDS.length + circuit.chapters.length + 1;
  const rejected = (status: "owner-conflict" | "invalid"): PitHonors => ({
    status, earnedCount: 0, totalCount, entries: [],
  });
  if (typeof owner !== "string" || owner.length === 0 || owner.length > 128 || Number.isNaN(Date.parse(owner))) {
    return rejected("invalid");
  }

  let canonical: PitSaveV5 | null = null;
  if (save !== null) {
    try {
      if (!save || typeof save.ownerSaveCreatedAt !== "string") return rejected("invalid");
      // Compare the exact campaign identity, not equivalent parsed timestamps.
      if (save.ownerSaveCreatedAt !== owner) return rejected("owner-conflict");
      if (!Array.isArray(save.unlockedCosmeticIds) || save.unlockedCosmeticIds.some(id => typeof id !== "string")) {
        return rejected("invalid");
      }
      canonical = validateCanonicalPitSave({
        ...save,
        unlockedCosmeticIds: save.unlockedCosmeticIds.filter(id => PIT_SAVE_ALLOWED_COSMETIC_IDS.includes(id)),
      });
    } catch {
      return rejected("invalid");
    }
    if (!canonical) return rejected("invalid");
  }

  const earnedIds = new Set(canonical?.unlockedCosmeticIds ?? []);
  const entries: PitHonorEntry[] = PIT_FIRST_EDITION_FIGHTER_IDS.map(fighterId => {
    const cosmetic = PIT_ARCADE_COSMETICS[fighterId];
    const total = PIT_ARCADE_LADDERS[fighterId].encounters.length;
    const current = canonical?.arcadeProgress[fighterId].bestEncounter ?? 0;
    return {
      id: cosmetic.id,
      label: cosmetic.label,
      source: "arcade",
      earned: earnedIds.has(cosmetic.id),
      condition: `Terminer les ${total} rencontres de l’Arcade avec ${PIT_FIRST_EDITION_FIGHTERS[fighterId].name}.`,
      description: "Palette cosmétique réservée à THE PIT, sans modification de l’apparence de campagne.",
      progress: { current, total, label: `${current}/${total} rencontres · meilleur parcours de ce chasseur` },
      palette: { ...cosmetic.palette },
    };
  });

  // Never add progress across fighters: a chapter must be cleared on one path.
  const bestCircuit = Math.max(0, ...PIT_FIRST_EDITION_FIGHTER_IDS.map(fighterId => canonical?.circuitProgress[fighterId].bestFight ?? 0));
  for (const plan of circuit.chapters) {
    const total = plan.fights.length;
    const firstFight = plan.fights[0].index;
    const current = Math.max(0, Math.min(total, bestCircuit - (firstFight - 1)));
    entries.push({
      id: plan.chapter.cosmeticRewardId,
      label: plan.chapter.name,
      source: "circuit",
      earned: earnedIds.has(plan.chapter.cosmeticRewardId),
      condition: `Terminer le chapitre « ${plan.chapter.name} » du Circuit avec un même chasseur.`,
      description: plan.chapter.objective,
      progress: { current, total, label: `${current}/${total} combats de ce chapitre · meilleur parcours` },
    });
  }

  const bestFloor = Math.max(0, ...PIT_FIRST_EDITION_FIGHTER_IDS.map(fighterId => canonical?.descentProgress[fighterId].bestFloor ?? 0));
  entries.push({
    id: PIT_SAVE_DESCENT_COSMETIC_ID,
    label: "Bannière du Survivant de la Descente",
    source: "descent",
    earned: earnedIds.has(PIT_SAVE_DESCENT_COSMETIC_ID),
    condition: `Terminer les ${PIT_DESCENT_FLOOR_COUNT} étages de la Descente, boss final compris, avec un même chasseur.`,
    description: "Récompense finale unique de la Descente. Les reliques temporaires du parcours ne sont pas des distinctions permanentes.",
    progress: {
      current: bestFloor,
      total: PIT_DESCENT_FLOOR_COUNT,
      label: `${bestFloor}/${PIT_DESCENT_FLOOR_COUNT} étages · meilleur parcours`,
    },
  });

  return {
    status: canonical ? "ready" : "empty",
    earnedCount: entries.filter(entry => entry.earned).length,
    totalCount: entries.length,
    entries,
  };
}
