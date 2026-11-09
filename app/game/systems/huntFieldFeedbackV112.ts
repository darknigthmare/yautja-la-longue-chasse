import type { RitesOfHuntV77 } from "./ritesOfHuntV77";

export type HuntFieldSoundV112 = "field-work" | "field-secure";
type WorkObservation = Pick<RitesOfHuntV77, "operation" | "completedEventIds">;
const isWork = (action: string) => action === "flay" || action === "hang" || action.startsWith("harvest-");

/** Discrete feedback on the simulation clock. Loading a ledger, interrupting a
 * gesture or repainting a frame never produces a successful-work sound. */
export function huntFieldWorkSoundsV112(before: WorkObservation, after: WorkObservation): HuntFieldSoundV112[] {
  const completed = after.completedEventIds.some(id =>
    isWork(id.split(":", 1)[0]) && !before.completedEventIds.includes(id));
  if (completed) return ["field-secure"];
  const operation = after.operation;
  if (!operation || !isWork(operation.action) || !Number.isFinite(operation.elapsed) || operation.elapsed <= 0) return [];
  const previous = before.operation;
  if (!previous || previous.corpseId !== operation.corpseId || previous.action !== operation.action) return ["field-work"];
  if (operation.elapsed <= previous.elapsed) return [];
  // One quiet stroke at most per update, even after a long frame. No timers,
  // persistent audio loops or offline catch-up are introduced.
  return previous.elapsed === 0 || Math.floor(operation.elapsed / .64) > Math.floor(previous.elapsed / .64)
    ? ["field-work"] : [];
}
