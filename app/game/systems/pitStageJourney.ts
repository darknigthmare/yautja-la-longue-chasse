import type { PitArenaId, PitCombatState } from "./pitCombat";

/** An opt-in exhibition route reusing two existing places; not two new drawings. */
export const PIT_RESERVE_JOURNEY = "reserve-passage-v1" as const;
export const PIT_RESERVE_GATE: PitArenaId = "arena-019-porte-des-reserves";
export const PIT_RESERVE_COURT: PitArenaId = "arena-011-reserve-des-crocs";
export type PitStageJourneyId = typeof PIT_RESERVE_JOURNEY;
export interface PitStageJourneyState {
  id: PitStageJourneyId;
  sector: "sas" | "court";
  transferFrame: number | null;
  exitSide: -1 | 1 | null;
}
export const createPitStageJourney = (): PitStageJourneyState => ({
  id: PIT_RESERVE_JOURNEY, sector: "sas", transferFrame: null, exitSide: null,
});
export function pitStageSceneArena(state: Pick<PitCombatState, "arenaId" | "stageJourney">): PitArenaId {
  return state.stageJourney?.sector === "court" ? PIT_RESERVE_COURT : state.arenaId;
}
export function pitStageJourneyArtIds(arenaId: PitArenaId, journey?: PitStageJourneyId): readonly PitArenaId[] {
  return journey === PIT_RESERVE_JOURNEY && arenaId === PIT_RESERVE_GATE ? [PIT_RESERVE_GATE, PIT_RESERVE_COURT] : [arenaId];
}
export function validPitStageJourney(value: unknown, rule: unknown, arenaId: unknown, frame: number): boolean {
  if (rule === undefined) return value === undefined;
  if (rule !== PIT_RESERVE_JOURNEY || arenaId !== PIT_RESERVE_GATE || !value || typeof value !== "object" || Array.isArray(value)) return false;
  const candidate = value as Record<string, unknown>;
  if (Object.keys(candidate).length !== 4 || candidate.id !== rule) return false;
  return candidate.sector === "sas" ? candidate.transferFrame === null && candidate.exitSide === null
    : candidate.sector === "court" && Number.isInteger(candidate.transferFrame) && (candidate.transferFrame as number) >= 1
      && (candidate.transferFrame as number) <= frame && (candidate.exitSide === -1 || candidate.exitSide === 1);
}

/** Called only after all impacts and the KO/timeout decision, on the cloned tick state.
 * A capture, tech, block, missed attack or Traque combo-break cannot enter this path.
 * Both fighters share one sector and are relocated in this same authoritative tick.
 */
export function finishPitStageJourneyFrame(state: PitCombatState): void {
  if (state.rules.stageJourney !== PIT_RESERVE_JOURNEY || state.arenaId !== PIT_RESERVE_GATE
    || state.stageJourney?.sector !== "sas" || state.phase !== "round"
    || state.fighters.some(fighter => fighter.health <= 0 || !fighter.grounded)) return;
  const hits = state.events.filter(event => event.type === "hit" && event.attack === "throw" && event.damage > 0);
  if (hits.length !== 1) return;
  const hit = hits[0]; if (hit.type !== "hit") return;
  const defender = state.fighters.find(fighter => fighter.definitionId === hit.defenderId)!;
  // Both scenes deliberately retain the neutral 960x540 floor and walls. The
  // visible exit zones are symmetric; only a landed projection can cross them.
  const exitSide = defender.x <= 110 ? -1 : defender.x >= 850 ? 1 : null;
  if (!exitSide) return;
  const leftSlot = state.fighters[0].x < state.fighters[1].x ? 0 : 1;
  for (const fighter of state.fighters) {
    fighter.x = fighter.slot === leftSlot ? 300 : 660;
    fighter.y = 0;
    fighter.velocityX = 0; fighter.velocityY = 0;
    fighter.facing = fighter.slot === leftSlot ? 1 : -1;
    // Health, Traque, recovery and throw knockdown remain exactly as resolved.
  }
  state.techniqueEffects = [];
  state.pendingThrow = null;
  state.stageJourney = { id: PIT_RESERVE_JOURNEY, sector: "court", transferFrame: state.frame, exitSide };
  state.events.push({ type: "stage-transfer", frame: state.frame, from: "sas", to: "court", exitSide,
    attackerId: hit.attackerId, defenderId: hit.defenderId });
}
