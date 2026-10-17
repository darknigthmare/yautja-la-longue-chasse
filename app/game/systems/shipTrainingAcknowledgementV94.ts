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

/** A deadline is a warning, not a cancellation or permission to send again.
 * A valid late acknowledgement can still be examined while its owner is alive.
 * Dispose drops UI closures even if an uncooperative host Promise never settles.
 */
export const SHIP_TRAINING_ACK_WAIT_MS_V94 = 15_000;
export function observeShipTrainingAcknowledgementV94(
  response: PromiseLike<unknown>,
  callbacks: { onSettled: (value: unknown, rejected: boolean) => void; onExpired: () => void },
): () => void {
  let observers: typeof callbacks | null = callbacks;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const stop = () => {
    if (timer !== undefined) clearTimeout(timer);
    timer = undefined;
    observers = null;
  };
  const settle = (value: unknown, rejected: boolean) => {
    const current = observers;
    stop();
    // Presentation failures cannot create a rejected child Promise or a resend.
    try { current?.onSettled(value, rejected); } catch { /* No persistence fallback. */ }
  };
  timer = setTimeout(() => {
    timer = undefined;
    try { observers?.onExpired(); } catch { /* Preserve observation of a late acknowledgement. */ }
  }, SHIP_TRAINING_ACK_WAIT_MS_V94);
  // Both handlers are attached even when the owner closed during the request.
  void Promise.resolve(response).then(value => settle(value, false), () => settle(undefined, true));
  return stop;
}
