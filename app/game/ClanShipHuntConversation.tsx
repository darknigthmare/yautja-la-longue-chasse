'use client';

import { useId, useState } from 'react';
import type { SaveGame } from './types';
import type { ClanShipNpcId } from './systems/clanShipOperations';
import type { ClanShipRoomId } from './systems/clanShipDocking';
import { clanShipHuntDialogue, type ClanHuntReportId } from './systems/clanShipHuntDialogue';
import styles from './ClanShipOperationsPanel.module.css';

/** Local disclosure UI, never an operation or a second persistence system. */
export default function ClanShipHuntConversation({ save, npcId, roomId, suspended }: {
  save: SaveGame; npcId: ClanShipNpcId; roomId: ClanShipRoomId; suspended: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [selected, setSelected] = useState<ClanHuntReportId | null>(null);
  const regionId = useId();
  const view = clanShipHuntDialogue(save, npcId, roomId, selected, !suspended);
  if (!view) return null;
  return <div data-clan-hunt-conversation={npcId}>
    <div className={styles.conversationTopics}>
      <button type="button" aria-expanded={open} aria-controls={regionId} disabled={suspended}
        data-clan-hunt-toggle onClick={() => setOpen(value => !value)}>
        {open ? 'Refermer les récits de chasse' : 'Parler des chasses rapportées'}
      </button>
    </div>
    <section id={regionId} hidden={!open} aria-label={`Chasses évoquées avec ${view.name}`}
      data-clan-hunt-status={view.status}>
      {open && <>
        <p className={styles.detail}>Choisis le retour dont tu veux parler. Il ne remplace pas le récit de ta dernière sortie.</p>
        <div className={styles.conversationTopics} role="group" aria-label="Chasses rapportées au clan">
          {view.options.map(option => <button key={option.id} type="button" disabled={suspended}
            aria-pressed={view.selected?.id === option.id} data-clan-hunt-report={option.id}
            onClick={() => setSelected(option.id)}>{option.label}</button>)}
        </div>
        <div aria-live="polite" aria-atomic="true">
          {view.selected ? <>
            <blockquote data-clan-hunt-line={view.selected.id}>{view.selected.line}</blockquote>
            <p className={styles.detail}>{view.selected.detail}</p>
          </> : <p className={styles.detail}>{view.message}</p>}
        </div>
      </>}
    </section>
  </div>;
}
