import {ARCHIVE_TRANSFER_JOURNAL_KEY} from './archiveTransferGuard';
import {recoverArchiveTransaction,type ArchiveStorage} from './archiveTransaction';
import {isCloudArchiveJournalV71,recoverCloudArchiveV71} from './cloudArchiveRestoreV71';
/** One recovery dispatcher runs before either menu migration or session hydration. */
export function recoverAnyArchiveV71(storage:ArchiveStorage){
 return isCloudArchiveJournalV71(storage.getItem(ARCHIVE_TRANSFER_JOURNAL_KEY))
  ?recoverCloudArchiveV71(storage):recoverArchiveTransaction(storage);
}
