import {createHash} from 'node:crypto';
import {isDeepStrictEqual} from 'node:util';
import {openClanPracticeJournalV127} from './clan-war-practice-journal-v127.mjs';

/** Replay the authoritative inputs and verify the resulting hidden state before listening. */
export function openClanWarCoopJournal(directory, header, replay, snapshot) {
  if (directory === undefined) return null;
  if (typeof directory !== 'string' || !directory.trim()) throw new Error('Répertoire du journal coopératif invalide.');
  const journal = openClanPracticeJournalV127(directory);
  const fingerprint = () => createHash('sha256').update(JSON.stringify(snapshot())).digest('hex');
  if (journal.header === undefined) journal.append(header);
  else if (!isDeepStrictEqual(journal.header, header)) {
    throw new Error('Le journal coopératif ne correspond pas à ce salon.');
  }
  for (const row of journal.events()) {
    if (!row?.event || !replay(row.event) || row.stateSha256 !== fingerprint()) {
      throw new Error('Ordre ou état du journal coopératif incohérent.');
    }
  }

  let failed = false;
  return {
    assertCurrent() {
      if (failed) throw new Error('Le journal coopératif doit être rouvert.');
      journal.assertCurrent();
    },
    commit(event) {
      journal.append({event, stateSha256: fingerprint()});
    },
    invalidate() {
      failed = true;
    },
  };
}

export function coopOrderSequences(personal) {
  return Array.from(personal, ([id, {sequence, orders}]) => ({id, sequence, orders: [...orders]}));
}
