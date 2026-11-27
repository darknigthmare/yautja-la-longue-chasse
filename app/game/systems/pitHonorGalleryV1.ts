/** Read-only catalogue guidance for the 18 existing PIT distinctions.
 * These rewards are original gameplay distinctions, never newly asserted lore.
 * Route requests prepare selection only: chapterId cannot advance a run.
 */
import { PIT_ARCADE_LADDERS, PIT_DESCENT_FLOOR_COUNT } from "./pitArcade";
import { PIT_CLAN_CIRCUITS } from "./pitCircuit";
import type { PitFighterId } from "./pitCombat";
import type { PitRewardSlotV1, PitUnlockConditionV1, PitUnlockEvaluationV1 } from "./pitContentAccessV1";
import {
  PIT_FIRST_EDITION_FIGHTER_IDS, PIT_FIRST_EDITION_FIGHTERS,
  isPitFirstEditionFighterId, type PitFirstEditionFighterId,
} from "./pitFirstEdition";
import { PIT_SAVE_DESCENT_COSMETIC_ID } from "./pitSave";

export interface PitHonorRouteRequestV1 {
  readonly mode: "arcade" | "circuit" | "descent";
  readonly fighterId?: PitFighterId;
  /** Goal to explain, never a request to skip preceding fights. */
  readonly chapterId?: string;
}

const CHAPTERS = PIT_CLAN_CIRCUITS[PIT_FIRST_EDITION_FIGHTER_IDS[0]].chapters;

/** One shared boundary for the gallery, application shell and combat selection.
 * The three progression modes accept the historical twelve fighters. Other
 * versus identities cannot become progression fighters through this request.
 */
export function normalizePitHonorRouteV1(value: unknown): PitHonorRouteRequestV1 | null {
  try {
    if (!value || typeof value !== "object" || Array.isArray(value)) return null;
    const candidate = value as Record<string, unknown>;
    const { mode, fighterId, chapterId } = candidate;
    if (mode !== "arcade" && mode !== "circuit" && mode !== "descent") return null;
    if (fighterId !== undefined && (typeof fighterId !== "string" || !isPitFirstEditionFighterId(fighterId))) return null;
    if (chapterId !== undefined && (mode !== "circuit" || typeof chapterId !== "string" || !CHAPTERS.some(plan => plan.chapter.id === chapterId))) return null;
    return {
      mode,
      ...(fighterId === undefined ? {} : { fighterId: fighterId as PitFirstEditionFighterId }),
      ...(chapterId === undefined ? {} : { chapterId: chapterId as string }),
    };
  } catch {
    return null;
  }
}

export const PIT_HONOR_SOURCE_LABELS_V1 = {
  arcade: "Arcade", circuit: "Circuit du clan", descent: "Descente",
} as const;

export interface PitHonorGalleryPathV1 {
  readonly fighterId: PitFirstEditionFighterId;
  readonly fighterName: string;
  readonly current: number;
  readonly total: number;
  readonly progressLabel: string;
  readonly complete: boolean;
  readonly route: PitHonorRouteRequestV1;
}

export interface PitHonorGalleryDetailV1 {
  readonly sourceLabel: string;
  readonly routeLabel: string;
  readonly route: PitHonorRouteRequestV1;
  readonly steps: readonly string[];
  readonly progressNote: string;
  readonly paths: readonly PitHonorGalleryPathV1[];
  readonly loreLabel: "Distinction originale de THE PIT";
}

function readCounter(slot: PitRewardSlotV1, counterId: string): number {
  if (slot.definition.access.kind !== "reward" || !slot.access.condition) return 0;
  function read(rule: PitUnlockConditionV1, result: PitUnlockEvaluationV1, depth: number): number {
    if (depth > 12 || !result.valid || rule.kind !== result.kind) return 0;
    if (rule.kind === "counter") {
      return rule.counterId === counterId && Number.isSafeInteger(result.current)
        ? Math.max(0, Math.min(result.current ?? 0, rule.minimum)) : 0;
    }
    if (rule.kind !== "all" && rule.kind !== "any") return 0;
    return Math.max(0, ...rule.conditions.slice(0, 64).map((child, index) => {
      const childResult = result.children?.[index];
      return childResult ? read(child, childResult, depth + 1) : 0;
    }));
  }
  return read(slot.definition.access.condition, slot.access.condition, 0);
}

/** Derives routes from published reward IDs, not names or arbitrary client data.
 * Hidden/unknown identities expose no route, biography or hidden condition here.
 */
export function buildPitHonorGalleryDetailV1(slot: PitRewardSlotV1): PitHonorGalleryDetailV1 | null {
  if (slot.access.discovery !== "identified") return null;
  const { honor } = slot;
  const fighterId = PIT_FIRST_EDITION_FIGHTER_IDS.find(id => PIT_ARCADE_LADDERS[id].cosmeticRewardId === honor.id);
  const chapter = CHAPTERS.find(plan => plan.chapter.cosmeticRewardId === honor.id);
  const isDescent = honor.id === PIT_SAVE_DESCENT_COSMETIC_ID;
  if (!fighterId && !chapter && !isDescent) return null;
  const mode = fighterId ? "arcade" : chapter ? "circuit" : "descent";
  const offset = chapter ? chapter.fights[0].index - 1 : 0;
  const total = fighterId ? PIT_ARCADE_LADDERS[fighterId].encounters.length
    : chapter ? chapter.fights.length : PIT_DESCENT_FLOOR_COUNT;
  const unit = mode === "arcade" ? "rencontres" : mode === "circuit" ? "combats de ce chapitre" : "étages";
  const ids = fighterId ? [fighterId] : PIT_FIRST_EDITION_FIGHTER_IDS;
  let bestCounter = -1;
  let bestIndex = 0;
  const paths: PitHonorGalleryPathV1[] = ids.map((id, index) => {
    const counterId = `${mode}:${id}:${mode === "arcade" ? "encounters" : mode === "circuit" ? "fights" : "floors"}`;
    const counter = readCounter(slot, counterId);
    if (counter > bestCounter) { bestCounter = counter; bestIndex = index; }
    const current = Math.max(0, Math.min(total, counter - offset));
    return {
      fighterId: id, fighterName: PIT_FIRST_EDITION_FIGHTERS[id].name,
      current, total, progressLabel: `${current}/${total} ${unit}`, complete: current >= total,
      route: { mode, fighterId: id, ...(chapter ? { chapterId: chapter.chapter.id } : {}) },
    };
  });
  const route = paths[bestIndex].route;
  const steps = fighterId ? [
    `Choisir ${PIT_FIRST_EDITION_FIGHTERS[fighterId].name} dans le mode Arcade.`,
    `Remporter les ${total} rencontres du même parcours.`,
    "La palette rejoint automatiquement les distinctions à la fin de l’Arcade.",
  ] : chapter ? [
    "Choisir l’un des douze chasseurs du Circuit du clan.",
    `Atteindre « ${chapter.chapter.name} » et en remporter les ${total} ${total === 1 ? "combat" : "combats"} avec ce chasseur.`,
    "La distinction est attribuée automatiquement à la fin de ce chapitre.",
  ] : [
    "Choisir l’un des douze chasseurs de la Descente.",
    `Terminer les ${total} étages du même parcours, dernier adversaire compris.`,
    "La bannière est attribuée automatiquement à la fin de la Descente.",
  ];
  return {
    sourceLabel: PIT_HONOR_SOURCE_LABELS_V1[mode],
    routeLabel: mode === "arcade" ? "Préparer l’Arcade" : mode === "circuit" ? "Préparer le Circuit" : "Préparer la Descente",
    route, steps, paths, loreLabel: "Distinction originale de THE PIT",
    progressNote: fighterId
      ? "Ce compteur conserve le meilleur parcours de ce chasseur. La palette appartient à cette campagne et reste réservée à THE PIT."
      : chapter
        ? "Un seul chasseur doit remplir la condition. Les victoires de chasseurs différents ne s’additionnent pas. Les chapitres précédents restent nécessaires : le parcours commence au début ou à votre reprise."
        : "Un seul chasseur doit terminer la Descente. Les étages atteints par des chasseurs différents ne s’additionnent pas. Les reliques temporaires du parcours ne sont pas des distinctions permanentes.",
  };
}
