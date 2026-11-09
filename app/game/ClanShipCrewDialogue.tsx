'use client';

import { useState } from 'react';
import type { SaveGame } from './types';
import type { ClanShipRoomId } from './systems/clanShipDocking';
import type { ClanShipNpcId } from './systems/clanShipOperations';
import { CLAN_SHIP_DIALOGUE_TOPICS, clanShipDialogue, type ClanShipDialogueTopic } from './systems/clanShipDialogue';
import ClanShipHuntConversation from './ClanShipHuntConversation';
import styles from './ClanShipOperationsPanel.module.css';

/** Local topic selection only; no mutation of the campaign or auto-recruitment. */
export default function ClanShipCrewDialogue({ save, npcId, roomId, suspended }: {
  save: SaveGame; npcId: ClanShipNpcId; roomId: ClanShipRoomId; suspended: boolean;
}) {
  const [topic, setTopic] = useState<ClanShipDialogueTopic>('greeting');
  // Physical absence closes the interview. A temporary save or focus pause
  // hides its controls while preserving this topic and the nested report state.
  const dialogue = clanShipDialogue(save, npcId, roomId, topic, true);
  if (!dialogue?.present) return null;
  return <section className={styles.conversation} hidden={suspended} inert={suspended}
    aria-label={`Conversation avec ${dialogue.name}`}
    data-clan-dialogue={npcId} data-dialogue-topic={topic} data-dialogue-phase={dialogue.phase}>
    <p className={styles.eyebrow}>À CE POSTE · {dialogue.name}</p>
    <blockquote aria-live={suspended ? 'off' : 'polite'} aria-atomic="true">{dialogue.line}</blockquote>
    <div className={styles.conversationTopics} role="group" aria-label="Sujets de conversation">
      {CLAN_SHIP_DIALOGUE_TOPICS.map(entry => <button key={entry.id} type="button"
        aria-pressed={entry.id === topic} disabled={suspended} data-clan-dialogue-topic={entry.id}
        onClick={() => setTopic(entry.id)}>{entry.label}</button>)}
    </div>
    {dialogue.detail && <p className={styles.detail}>{dialogue.detail}</p>}
    <ClanShipHuntConversation key={`${save.createdAt}:${npcId}`} save={save} npcId={npcId} roomId={roomId} suspended={suspended} />
  </section>;
}
