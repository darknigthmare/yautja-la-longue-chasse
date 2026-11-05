"use client";

import { useState } from 'react';
import type { ClanShipRecruitDefinition } from './systems/clanShipOperations';
import type { ClanShipRoomId } from './systems/clanShipDocking';
import { clanShipIncidentTarget, getClanShipIncidentStep, type ClanShipIncidentsState } from './systems/clanShipIncidents';
import { selectClanShipCrewDialogue } from './clanShipCrewDialogues';
import styles from './ClanShipOperationsPanel.module.css';

interface Props {
  npc: ClanShipRecruitDefinition;
  roomId: ClanShipRoomId;
  incidents: ClanShipIncidentsState | null | undefined;
  suspended: boolean;
  onNavigate: (roomId: ClanShipRoomId) => void;
}

export default function ClanShipCrewConversation({ npc, roomId, incidents, suspended, onNavigate }: Props) {
  const [topic, setTopic] = useState<'board' | 'commitment'>('board');
  const line = selectClanShipCrewDialogue(npc.id, incidents);
  const step = getClanShipIncidentStep(incidents);
  const target = step && line.activeIncidentId ? clanShipIncidentTarget(step.targetId) : null;
  if (roomId !== npc.roomId) return <button type="button" disabled={suspended} className={styles.secondary}
    data-clan-crew-conversation-route={npc.id} onClick={() => onNavigate(npc.roomId)}>Parler à {npc.name} à son poste</button>;

  return <div className={styles.crewConversation} data-clan-crew-dialogue={npc.id} data-clan-dialogue-line={topic === 'board' ? line.id : `${npc.id}-commitment`}>
    <div className={styles.conversationTopics} aria-label={`Sujets de conversation avec ${npc.name}`}>
      <button type="button" disabled={suspended} aria-pressed={topic === 'board'} data-clan-dialogue-topic="board"
        onClick={() => setTopic('board')}>À propos du bord</button>
      <button type="button" disabled={suspended} aria-pressed={topic === 'commitment'} data-clan-dialogue-topic="commitment"
        onClick={() => setTopic('commitment')}>Ton engagement</button>
    </div>
    <p className={styles.joined} aria-live="polite">« {topic === 'board' ? line.text : npc.joinLine} »</p>
    {topic === 'board' && target && <button type="button" disabled={suspended} className={styles.secondary}
      data-clan-dialogue-objective={npc.id} onClick={() => onNavigate(target.roomId)}>Rejoindre l’intervention évoquée</button>}
  </div>;
}
