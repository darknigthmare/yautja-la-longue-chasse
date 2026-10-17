import {
  synchronizeShipProgression,
  validateCanonicalShipProgression,
  type ShipProgressionState,
  type ShipProgressionWriteResult,
} from "./progression";
import type { SaveGame } from "../types";

/** A legacy void receiver only confirms delivery. A cooperating host may
 * explicitly acknowledge durable persistence of the exact requested state.
 * This contract does not itself read remote storage or grant additional state. */
export type ShipTrainingAcknowledgementV94 = void | ShipProgressionWriteResult;
export type ShipTrainingReceiverV94 = (state: ShipProgressionState) =>
  ShipTrainingAcknowledgementV94 | Promise<ShipTrainingAcknowledgementV94>;

export function classifyShipTrainingAcknowledgementV94(
  response: unknown, expected: ShipProgressionState, save: SaveGame,
): "confirmed" | "unverified" | "uncertain" {
  try {
    if (!response || typeof response !== "object" || !("persisted" in response)) return "unverified";
    const result = response as ShipProgressionWriteResult;
    if (result.persisted !== true || result.failure !== null) return "uncertain";
    const actual = validateCanonicalShipProgression(result.state, save);
    if (!actual || expected.ownerSaveCreatedAt !== save.createdAt) return "uncertain";
    // Writers may stamp the outer save clock, not change the earned operation.
    const wanted = synchronizeShipProgression(expected, save, expected.updatedAt);
    const normalized = synchronizeShipProgression(actual, save, expected.updatedAt);
    return JSON.stringify(wanted) === JSON.stringify(normalized) ? "confirmed" : "uncertain";
  } catch { return "uncertain"; }
}
