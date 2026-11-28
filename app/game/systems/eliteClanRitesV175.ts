import { MISSIONS } from "../data";
import type { SaveGame } from "../types";
import { getChronicleRank } from "./clanChronicle";
import { rankTrialsBlockedV147 } from "./honorTribunalV147";
import {
  createTrainingDrill, getClanHuntCue, startTrainingDrill, stepTrainingDrill, submitTrainingDrillAction,
  TRAINING_DRILL_ACTIONS, TRAINING_DRILL_CONFIGS, type TrainingDrillAction, type TrainingDrillTrace, type TrainingDrillTraceAction,
} from "./trainingDrill";

export const ELITE_CLAN_TRIALS = [
  { id: "blades", label: "Les lames avec le vétéran", disciplineId: "wristblades", seed: 103, clanPlasma: false },
  { id: "plasma", label: "Le tir sous contrôle", disciplineId: "targeting", seed: 132, clanPlasma: true },
  { id: "hunt", label: "La chasse holographique du clan", disciplineId: "clan-hunt", seed: 1, clanPlasma: false },
] as const;

export type EliteClanRitePoint = { column: number; row: number };

export const ELITE_CLAN_RITES_GROUND = [
  "#########",
  "#...c...#",
  "#...h...#",
  "#.l.v.p.#",
  "#.......#",
  "#...e...#",
  "#########",
] as const;

export const ELITE_CLAN_RITES_POSTS = {
  entry: { column: 4, row: 5 },
  blades: { column: 2, row: 3 },
  plasma: { column: 6, row: 3 },
  hunt: { column: 4, row: 2 },
} as const;

export function canWalkEliteClanRites(point: EliteClanRitePoint): boolean {
  if (!point || !Number.isSafeInteger(point.column) || !Number.isSafeInteger(point.row)) return false;
  const tile = ELITE_CLAN_RITES_GROUND[point.row]?.[point.column];
  return tile !== undefined && tile !== "#" && tile !== "v" && tile !== "c";
}

export type EliteClanTrialId = typeof ELITE_CLAN_TRIALS[number]["id"];
export interface EliteClanTrialReceipt { id: EliteClanTrialId; trace: TrainingDrillTrace }

export function hasEliteClanHuntHistory(save: SaveGame): boolean {
  return MISSIONS.length === 8 && MISSIONS.every(({ id }) => {
    const progress = save.missionProgress[id];
    return progress?.status === "completed" && Number.isSafeInteger(progress.completions) && progress.completions > 0;
  });
}

export function canEnterEliteClanRites(save: SaveGame): boolean {
  const rank = save.prologue ? getChronicleRank(save.prologue.chronicle) : save.profile.rankId;
  return (rank === "blooded" || rank === "elite" || rank === "elder" || rank === "ancient") &&
    hasEliteClanHuntHistory(save) && !rankTrialsBlockedV147(save.tribunalV147);
}

function replayTrial(id: EliteClanTrialId, trace: unknown): EliteClanTrialReceipt | null {
  const trial = ELITE_CLAN_TRIALS.find(item => item.id === id);
  if (!trial) return null;
  const { disciplineId, seed, clanPlasma } = trial;
  const duration = TRAINING_DRILL_CONFIGS[disciplineId].cueDurationSeconds;
  let state = startTrainingDrill(createTrainingDrill(disciplineId, seed, clanPlasma));
  if (!Array.isArray(trace) || trace.length !== state.sequence.length) return null;

  const clean: (TrainingDrillTraceAction | null)[] = [];
  const hits = { track: 0, blades: 0, plasma: 0 };
  const successfulActions = {
    track: new Set<TrainingDrillAction>(),
    blades: new Set<TrainingDrillAction>(),
    plasma: new Set<TrainingDrillAction>(),
  };
  for (const entry of trace) {
    const phase = id === "hunt" ? getClanHuntCue(state)?.phase : id;
    if (!phase || state.status !== "playing") return null;
    if (entry === null) {
      clean.push(null);
      state = stepTrainingDrill(state, duration);
      continue;
    }
    if (typeof entry !== "object" || entry === null || Object.keys(entry).length !== 2 ||
        !TRAINING_DRILL_ACTIONS.includes(entry.action) || typeof entry.elapsedSeconds !== "number" ||
        !Number.isFinite(entry.elapsedSeconds) || entry.elapsedSeconds < 0 || entry.elapsedSeconds >= duration) {
      return null;
    }
    const action = entry.action as TrainingDrillAction;
    const expected = state.sequence[state.cueIndex];
    if (phase === "plasma" && action === "primary" && expected === "secondary") return null;
    const response = submitTrainingDrillAction(stepTrainingDrill(state, entry.elapsedSeconds), action);
    if (response.outcome === "perfect" || response.outcome === "correct") {
      hits[phase]++;
      successfulActions[phase].add(action);
    }
    state = response.state;
    clean.push({ action, elapsedSeconds: entry.elapsedSeconds });
  }

  const showedAttackAndRestraint = (phase: "blades" | "plasma") =>
    successfulActions[phase].has("primary") && successfulActions[phase].has("secondary");
  if (id === "blades" && (hits.blades < 8 || !showedAttackAndRestraint("blades"))) return null;
  if (id === "plasma" && (hits.plasma < 8 || !showedAttackAndRestraint("plasma"))) return null;
  if (id === "hunt" && (hits.track < 3 || hits.blades < 3 || hits.plasma < 3 ||
      !showedAttackAndRestraint("blades") || !showedAttackAndRestraint("plasma"))) return null;
  return state.status === "complete" ? { id, trace: clean } : null;
}

export function inspectEliteClanRites(value: unknown): EliteClanTrialReceipt[] | null {
  if (value === undefined) return [];
  if (!Array.isArray(value) || value.length === 0 || value.length > ELITE_CLAN_TRIALS.length) return null;
  const receipts: EliteClanTrialReceipt[] = [];
  for (const [index, candidate] of value.entries()) {
    const id = ELITE_CLAN_TRIALS[index].id;
    if (!candidate || typeof candidate !== "object" || Object.keys(candidate).length !== 2 || candidate.id !== id) {
      return null;
    }
    const receipt = replayTrial(id, candidate.trace);
    if (!receipt) return null;
    receipts.push(receipt);
  }
  return receipts;
}

export function verifyEliteClanTrial(id: EliteClanTrialId, trace: TrainingDrillTrace): EliteClanTrialReceipt | null {
  return replayTrial(id, trace);
}

export function completedEliteClanRites(receipts: readonly EliteClanTrialReceipt[] | undefined): boolean {
  return receipts?.length === ELITE_CLAN_TRIALS.length;
}
