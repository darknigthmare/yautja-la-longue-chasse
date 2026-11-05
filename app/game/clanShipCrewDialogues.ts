import dialogueData from './data/clanShipCrewDialogues.json';
import { getClanShipIncidentStep, type ClanShipIncidentId, type ClanShipIncidentsState } from './systems/clanShipIncidents';
import type { ClanShipNpcId } from './systems/clanShipOperations';

interface DialogueLine {
  id: string;
  priority: number;
  text: string;
  when: { activeIncidentId?: ClanShipIncidentId; currentStepIds?: readonly string[]; completedIncidentId?: ClanShipIncidentId };
}
interface DialogueCharacter { id: ClanShipNpcId; name: string; fallback: string; lines: readonly DialogueLine[] }
export const CLAN_SHIP_CREW_DIALOGUES = dialogueData.npcs as readonly DialogueCharacter[];

/** Conversation is read-only and never substitutes for a physical evidence step. */
export function selectClanShipCrewDialogue(npcId: ClanShipNpcId, incidents: ClanShipIncidentsState | null | undefined) {
  const character = CLAN_SHIP_CREW_DIALOGUES.find(npc => npc.id === npcId)!;
  const activeId = incidents?.activeIncident?.incidentId;
  const stepId = getClanShipIncidentStep(incidents)?.id;
  let selected: DialogueLine | null = null;
  for (const line of character.lines) {
    const condition = line.when;
    if (condition.activeIncidentId && condition.activeIncidentId !== activeId) continue;
    if (condition.currentStepIds && (!stepId || !condition.currentStepIds.includes(stepId))) continue;
    if (condition.completedIncidentId && !incidents?.completedIncidents.some(receipt => receipt.incidentId === condition.completedIncidentId)) continue;
    if (!selected || line.priority > selected.priority) selected = line;
  }
  return selected ? { id: selected.id, text: selected.text, activeIncidentId: selected.when.activeIncidentId ?? null }
    : { id: `${npcId}-daily`, text: character.fallback, activeIncidentId: null };
}
