'use client';

import { npcMissionsDialogueV66, npcMissionsJournalV66, type NpcMissionActionV66 } from './systems/homeworldNpcMissionsV66';
import YautjaTranslationV67 from './YautjaTranslationV67';

/** Presentation only: no storage and no local optimistic completion. The Hub
 * revalidates the actual V64 room/proximity before persisting every action. */
export default function HomeworldNpcMissionsV66({ value, npcId, autonomousHunter, disabled, reducedMotion = false, onAction }: {
  value: unknown;
  npcId: string | null | undefined;
  autonomousHunter: boolean;
  disabled: boolean;
  reducedMotion?: boolean;
  onAction(action: NpcMissionActionV66): void;
}) {
  const dialogue = npcMissionsDialogueV66(value, npcId, autonomousHunter);
  if (!dialogue) return null;
  const journal = npcMissionsJournalV66(value);
  return <section aria-label="Missions de la soigneuse" data-npc-missions-v66 data-npc-mission-phase={journal.phase}>
    <h4>{dialogue.title} · {journal.completed}/{journal.total}</h4>
    <p><YautjaTranslationV67 text={dialogue.text} paused={disabled} reducedMotion={reducedMotion || !autonomousHunter} /></p>
    <p><strong>Objectif :</strong> {dialogue.objective}</p>
    {dialogue.options.map(option => <button type="button" key={JSON.stringify(option.action)}
      disabled={disabled} data-npc-mission-action={option.action.kind} data-npc-mission-id={option.action.missionId}
      onClick={() => onAction(option.action)}>{option.label}</button>)}
    <p><small>Demandes originales de cette cité. Les régions existantes sont parcourues à nouveau ; aucune récompense matérielle ni rite n’est attribué.</small></p>
  </section>;
}

export function HomeworldNpcMissionsJournalV66({ value, autonomousHunter }: { value: unknown; autonomousHunter: boolean }) {
  const journal = npcMissionsJournalV66(value);
  return <section aria-label="Journal des missions de PNJ" data-npc-missions-journal-v66>
    <h4>{journal.title} · {journal.completed}/{journal.total}</h4>
    <p>{autonomousHunter ? journal.objective : 'Les demandes des chasseurs autonomes s’ouvriront après ton parcours de jeunesse. Rejoins ton maître pour la formation.'}</p>
  </section>;
}
