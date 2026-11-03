/**
 * All ordinary persistence writers stop while an archive transfer is pending.
 * This module intentionally has no dependencies so every save family can use
 * it without import cycles. Presence, even empty/corrupt, requires recovery.
 */
export const ARCHIVE_TRANSFER_JOURNAL_KEY = "yautja-long-hunt.archive-transfer";

// Storage events are delivered only to other documents. Once another tab
// starts a transfer, this tab's in-memory callbacks remain stale even after
// the journal is cleaned up, including an import with unchanged campaign bytes.
let sessionInvalidated = false;
if (typeof window !== "undefined" && typeof window.addEventListener === "function") {
  window.addEventListener("storage", (event: StorageEvent) => {
    if (event.key !== ARCHIVE_TRANSFER_JOURNAL_KEY || event.newValue === null) return;
    try {
      if (event.storageArea !== window.localStorage) return;
    } catch {
      sessionInvalidated = true;
      return;
    }
    sessionInvalidated = true;
  });
}

export function archiveSessionInvalidated(): boolean {
  return sessionInvalidated;
}

export function archiveTransferPending(
  storage: { getItem(key: string): string | null },
): boolean {
  if (sessionInvalidated) return true;
  try {
    return storage.getItem(ARCHIVE_TRANSFER_JOURNAL_KEY) !== null;
  } catch {
    // A journal we cannot inspect must never be mistaken for no transaction.
    return true;
  }
}
