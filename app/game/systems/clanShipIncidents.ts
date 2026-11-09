import type { SaveGame } from '../types';
import type { ClanShipRoomId } from './clanShipDocking';
import { CLAN_SHIP_INTERIOR_METRICS, CLAN_SHIP_INTERIOR_ROOMS, isClanShipInteriorWalkable } from './clanShipInterior';
import { CLAN_SHIP_RECRUITS, evaluateClanShipAccess, evaluateClanShipRecruit, inspectClanShipOperations, type ClanShipContractId, type ClanShipNpcId } from './clanShipOperations';
import { availableClanResidenceCrew, type CompanionCampaign } from './companionResidence';
import { CLAN_SHIP_TROPHY_CASE, clanShipTrophyConclusion, emptyClanShipTrophyCase,
  type ClanShipTrophyCaseView, type ClanShipTrophyConclusion } from './clanShipTrophyCase';
import { CLAN_SHIP_TROPHY_HEARING_TARGET, clanShipTrophyHearingPresence, clanShipTrophyHearingView, clanShipTrophyWitnessPost,
  inspectClanShipTrophyHearing, recordClanShipTrophyHearingDecision, reduceClanShipTrophyHearing,
  type ClanShipTrophyHearingAction, type ClanShipTrophyHearingResult, type ClanShipTrophyHearingState } from './clanShipTrophyHearing';

export const CLAN_SHIP_INCIDENT_VERSION = 2 as const;
export type ClanShipIncidentId = 'sealed-lot' | 'relay-fault' | 'contested-trophy';
export type ClanShipIncidentBranch = 'A' | 'B';
export type ClanShipIncidentOperation = 'accept' | 'inspect-witness' | 'read-reference' | 'isolate' | 'check-pressure' | 'close-lot' |
  'collect-component' | 'install-component' | 'restore-circuit' | 'verify-signal' |
  'examine-trophy' | 'read-hunt-report' | 'read-transfer-record' | 'hear-veteran' | 'conclude-provenance' | 'acknowledge-provenance';
export type ClanShipIncidentTargetId = 'hangar-briefing' | 'seal-controls' | 'lot-archive' | 'medical-pressure' |
  'armory-briefing' | 'relay-controls' | 'relay-archive' | 'relay-component' | 'council-signal' |
  'trophy-briefing' | 'trophy-support' | 'trophy-hunt-report' | 'trophy-transfer-record' | 'trophy-veteran';
export interface ClanShipIncidentTarget {
  id: ClanShipIncidentTargetId; roomId: ClanShipRoomId; x: number; y: number; label: string;
}
/** Interaction points are on the real authored floor, outside fixture solids.
 * The two new props replace matching terminal art; their collision stays native. */
export const CLAN_SHIP_INCIDENT_TARGETS: Readonly<Record<ClanShipIncidentTargetId, ClanShipIncidentTarget>> = {
  'hangar-briefing': { id: 'hangar-briefing', roomId: 'hangar', x: 820, y: 650, label: 'Garde du Seuil — lot sous scellé' },
  'seal-controls': { id: 'seal-controls', roomId: 'hangar', x: 1060, y: 620, label: 'Boîtier du lot scellé' },
  'lot-archive': { id: 'lot-archive', roomId: 'archives', x: 790, y: 645, label: 'Registre des lots' },
  'medical-pressure': { id: 'medical-pressure', roomId: 'soins', x: 1030, y: 620, label: 'Diagnostic de pression' },
  'armory-briefing': { id: 'armory-briefing', roomId: 'armurerie', x: 700, y: 635, label: 'Griffe de Fer — relais instable' },
  'relay-controls': { id: 'relay-controls', roomId: 'conseil', x: 350, y: 620, label: 'Relais à deux circuits' },
  'relay-archive': { id: 'relay-archive', roomId: 'archives', x: 390, y: 620, label: 'Cycle de référence' },
  'relay-component': { id: 'relay-component', roomId: 'armurerie', x: 1010, y: 640, label: 'Casier du composant R-2' },
  'council-signal': { id: 'council-signal', roomId: 'conseil', x: 740, y: 650, label: 'Contrôle de la projection' },
  'trophy-briefing': { id: 'trophy-briefing', roomId: 'archives', x: 790, y: 645, label: 'Entretien avec Trace Froide' },
  'trophy-support': { id: 'trophy-support', roomId: 'trophees', x: 830, y: 650, label: 'Support du trophée C-37' },
  'trophy-hunt-report': { id: 'trophy-hunt-report', roomId: 'archives', x: 390, y: 620, label: 'Relevé de chasse C-37/01' },
  'trophy-transfer-record': { id: 'trophy-transfer-record', roomId: 'trophees', x: 400, y: 620, label: 'Relevé de transfert C-37/02' },
  'trophy-veteran': { id: 'trophy-veteran', roomId: 'entrainement', x: 1010, y: 650, label: 'Entretien avec Balafre de Cendre' },
};
export const CLAN_SHIP_INCIDENTS = [
  { id: 'sealed-lot' as const, reference: 'OPS-B01', name: 'Le scellé qui ment', npcId: 'threshold-guard' as ClanShipNpcId,
    prerequisite: 'ship-seal-check' as ClanShipContractId, start: 'hangar-briefing' as const, reward: 25,
    briefing: 'Un témoin de fermeture ne correspond pas au lot annoncé. Garde du Seuil a laissé la coursive libre, mais il refuse de toucher aux isolateurs à l’aveugle. « Retrouve ce qui a été chargé. Ensuite seulement, nous choisirons le circuit à couper. » Compare les relevés, vérifie la pression, puis referme le lot.' },
  { id: 'relay-fault' as const, reference: 'OPS-B02', name: 'Une lumière dans le relais', npcId: 'iron-claw' as ClanShipNpcId,
    prerequisite: 'ship-armory-audit' as ClanShipContractId, start: 'armory-briefing' as const, reward: 30,
    briefing: 'La projection du conseil vacille alors que les routes de chasse y sont examinées. Griffe de Fer te montre les deux circuits : « Remplacer au hasard ferait perdre le second relais. Écoute leur cadence, puis compare-la au cycle conservé. » Isole la panne, remplace la pièce et rétablis les circuits dans l’ordre.' },
  { id: 'contested-trophy' as const, reference: 'OPS-B03', name: 'La trace du véritable porteur', npcId: 'cold-trace' as ClanShipNpcId,
    prerequisite: 'field-ruins-memory' as ClanShipContractId, start: 'trophy-briefing' as const, reward: 35,
    briefing: 'Le trophée du Goulet porte la marque de Balafre et la ligature de Trace. La plaque confond la prise et son retour. « Je l’ai porté, dit Trace. Cela ne fait pas de moi celui qui l’a abattu. » Examine le support C-37 et les deux relevés, puis écoute Balafre avant de retenir une inscription. Ta propre collection n’est pas en jeu.' },
] as const;
export const clanShipIncidentDefinition = (id: unknown) => CLAN_SHIP_INCIDENTS.find(entry => entry.id === id);
export interface ClanShipIncidentObservation { roomId: ClanShipRoomId; x: number; y: number }
export interface ClanShipIncidentEvent {
  revision: number; type: ClanShipIncidentOperation; observation: ClanShipIncidentObservation;
  branch?: ClanShipIncidentBranch;
  conclusion?: ClanShipTrophyConclusion;
  interlocutor?: 'cold-trace' | 'ash-scar';
}
export interface ClanShipIncidentRun { id: ClanShipIncidentId; events: ClanShipIncidentEvent[] }
export interface ClanShipIncidentsState {
  /** V1 is preserved on read and upgraded only by a confirmed intervention. */
  version: 1 | typeof CLAN_SHIP_INCIDENT_VERSION; ownerCreatedAt: string; revision: number; incidents: ClanShipIncidentRun[];
}
export type ClanShipIncidentCommand = { type: Exclude<ClanShipIncidentOperation, 'isolate' | 'restore-circuit' | 'conclude-provenance'>; incidentId: ClanShipIncidentId } |
  { type: 'isolate' | 'restore-circuit'; incidentId: ClanShipIncidentId; branch: ClanShipIncidentBranch } |
  { type: 'conclude-provenance'; incidentId: 'contested-trophy'; conclusion: ClanShipTrophyConclusion };
export type ClanShipIncidentAction = ClanShipIncidentCommand & { ownerCreatedAt: string; expectedRevision: number };
export type ClanShipIncidentCampaign = CompanionCampaign & Pick<SaveGame, 'clanShipIncidents' | 'clanShipTrophyHearing'>;
export interface ClanShipIncidentContext { save: ClanShipIncidentCampaign; active: boolean; observation: ClanShipIncidentObservation | null }
export interface ClanShipIncidentResult {
  accepted: boolean; changed: boolean; state: ClanShipIncidentsState | null; clanMarksReward: number; message: string;
  /** Optional meeting receipt shares the exact incident/reward transaction. */
  hearingState?: ClanShipTrophyHearingState;
}
export interface ClanShipIncidentView {
  id: ClanShipIncidentId; accepted: boolean; completedRevision: number | null; witness: boolean; reference: boolean;
  diagnosticCurrent: boolean; chosenBranch: ClanShipIncidentBranch | null; isolatedBranch: ClanShipIncidentBranch | null;
  pressureChecked: boolean; component: 'absent' | 'carried' | 'installed'; restored: ClanShipIncidentBranch[];
  faults: number; lastMessage: string;
  trophy?: ClanShipTrophyCaseView;
}
export interface ClanShipIncidentVariant {
  branch: ClanShipIncidentBranch; other: ClanShipIncidentBranch; lotCode: string;
  /** A stable, readable reference, never a timed flicker or random retry. */
  cycles: Readonly<Record<ClanShipIncidentBranch, string>>;
}
const plain = (value: unknown): value is Record<string, unknown> => !!value && typeof value === 'object' && !Array.isArray(value) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(value)) && Reflect.ownKeys(value).every(key => typeof key === 'string' &&
    Object.getOwnPropertyDescriptor(value, key)?.enumerable && 'value' in Object.getOwnPropertyDescriptor(value, key)!);
const exact = (value: Record<string, unknown>, keys: readonly string[]) => Reflect.ownKeys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const integer = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) < Number.MAX_SAFE_INTEGER;
const identity = (value: unknown): value is string => typeof value === 'string' && value.trim() === value && value.length > 0 && value.length <= 160 && !/[\x00-\x1f\x7f]/.test(value);
const operations: readonly ClanShipIncidentOperation[] = ['accept', 'inspect-witness', 'read-reference', 'isolate', 'check-pressure', 'close-lot', 'collect-component', 'install-component', 'restore-circuit', 'verify-signal',
  'examine-trophy', 'read-hunt-report', 'read-transfer-record', 'hear-veteran', 'conclude-provenance', 'acknowledge-provenance'];
const branch = (value: unknown): value is ClanShipIncidentBranch => value === 'A' || value === 'B';
const branching = (type: unknown) => type === 'isolate' || type === 'restore-circuit';

export function clanShipIncidentVariant(owner: string, id: ClanShipIncidentId): ClanShipIncidentVariant {
  const checksum = [...owner].reduce((sum, character) => (sum * 31 + character.charCodeAt(0)) % 997, id === 'sealed-lot' ? 17 : 29);
  const selected: ClanShipIncidentBranch = checksum % 2 ? 'A' : 'B', other = selected === 'A' ? 'B' : 'A';
  return { branch: selected, other, lotCode: `K-${String(10 + checksum % 80).padStart(2, '0')}`,
    cycles: { [selected]: '2 impulsions · pause · 1 impulsion', [other]: '1 impulsion · pause · 1 impulsion' } as Record<ClanShipIncidentBranch, string> };
}
const emptyView = (id: ClanShipIncidentId): ClanShipIncidentView => ({ id, accepted: false, completedRevision: null,
  witness: false, reference: false, diagnosticCurrent: false, chosenBranch: null, isolatedBranch: null,
  pressureChecked: false, component: 'absent', restored: [], faults: 0, lastMessage: '',
  ...(id === 'contested-trophy' ? { trophy: emptyClanShipTrophyCase() } : {}) });

/** Dialogues follow the real resident after a refit. Historical events keep the
 * room of the meeting; a later reassignment never rewrites a recorded witness. */
export function clanShipIncidentInterlocutor(id: ClanShipIncidentId, type: ClanShipIncidentOperation): 'cold-trace' | 'ash-scar' | null {
  if (id !== 'contested-trophy') return null;
  return type === 'accept' || type === 'conclude-provenance' ? 'cold-trace'
    : type === 'hear-veteran' || type === 'acknowledge-provenance' ? 'ash-scar' : null;
}
export function clanShipIncidentNpcRoom(save: ClanShipIncidentCampaign, npcId: ClanShipNpcId): ClanShipRoomId | null {
  return clanShipTrophyWitnessPost(save, npcId);
}
function conversationTarget(target: ClanShipIncidentTarget, roomId: unknown): ClanShipIncidentTarget | null {
  if (typeof roomId !== 'string' || !Object.hasOwn(CLAN_SHIP_INTERIOR_ROOMS, roomId)) return null;
  const room = CLAN_SHIP_INTERIOR_ROOMS[roomId as ClanShipRoomId];
  return { ...target, roomId: room.id, ...room.servicePoint };
}
export function evaluateClanShipIncidentPresence(save: ClanShipIncidentCampaign, id: ClanShipIncidentId, type: ClanShipIncidentOperation): { allowed: boolean; reason: string } {
  if (id === 'contested-trophy' && (type === 'conclude-provenance' || type === 'acknowledge-provenance') && save.clanShipTrophyHearing != null) {
    const state = inspectClanShipTrophyHearing(save.clanShipTrophyHearing, save.createdAt).state, hearing = clanShipTrophyHearingView(state);
    if (!state) return { allowed: false, reason: 'Le journal de la restitution doit être récupéré avant de poursuivre.' };
    if (!hearing.gathered) return { allowed: false, reason: 'Invite physiquement Balafre puis Trace avant de les retrouver à la galerie.' };
    if (!hearing.ready) return { allowed: false, reason: 'Compare les trois échantillons enregistrés de C-37 devant les deux témoins avant de conclure.' };
    return clanShipTrophyHearingPresence(save);
  }
  const npcId = clanShipIncidentInterlocutor(id, type);
  if (!npcId) return { allowed: true, reason: '' };
  const roomId = clanShipIncidentNpcRoom(save, npcId), npc = CLAN_SHIP_RECRUITS.find(entry => entry.id === npcId)!;
  if (roomId) return { allowed: true, reason: `${npc.name} est présent : ${CLAN_SHIP_INTERIOR_ROOMS[roomId].label}.` };
  const operations = inspectClanShipOperations(save.clanShipOperations, save.createdAt).state;
  const missing = npc.requiredContractIds.filter(contractId => !operations?.completedContracts.some(receipt => receipt.contractId === contractId));
  return { allowed: false, reason: missing.length ? `${npc.name} attend encore ces dossiers : ${missing.join(', ')}.`
    : `${npc.name} doit être présent et disponible au Clan Ship pour cet entretien. Sa réserve, son affectation ailleurs ou ses soins ne valent pas un témoignage.` };
}
export function clanShipIncidentTarget(id: ClanShipIncidentId, type: ClanShipIncidentOperation, save?: ClanShipIncidentCampaign): ClanShipIncidentTarget | null {
  if (id === 'contested-trophy') {
    if (save?.clanShipTrophyHearing != null && (type === 'conclude-provenance' || type === 'acknowledge-provenance'))
      return CLAN_SHIP_TROPHY_HEARING_TARGET;
    const key = ({ accept: 'trophy-briefing', 'examine-trophy': 'trophy-support', 'read-hunt-report': 'trophy-hunt-report',
      'read-transfer-record': 'trophy-transfer-record', 'hear-veteran': 'trophy-veteran', 'conclude-provenance': 'trophy-briefing',
      'acknowledge-provenance': 'trophy-veteran' } as Partial<Record<ClanShipIncidentOperation, ClanShipIncidentTargetId>>)[type];
    if (!key) return null;
    const target = CLAN_SHIP_INCIDENT_TARGETS[key], npcId = clanShipIncidentInterlocutor(id, type);
    const roomId = save && npcId ? clanShipIncidentNpcRoom(save, npcId) : null;
    return roomId ? conversationTarget(target, roomId) : target;
  }
  const key = id === 'sealed-lot'
    ? ({ accept: 'hangar-briefing', 'inspect-witness': 'seal-controls', 'read-reference': 'lot-archive', isolate: 'seal-controls', 'check-pressure': 'medical-pressure', 'close-lot': 'hangar-briefing' } as Partial<Record<ClanShipIncidentOperation, ClanShipIncidentTargetId>>)[type]
    : ({ accept: 'armory-briefing', 'inspect-witness': 'relay-controls', 'read-reference': 'relay-archive', isolate: 'relay-controls', 'collect-component': 'relay-component', 'install-component': 'relay-controls', 'restore-circuit': 'relay-controls', 'verify-signal': 'council-signal' } as Partial<Record<ClanShipIncidentOperation, ClanShipIncidentTargetId>>)[type];
  return key ? CLAN_SHIP_INCIDENT_TARGETS[key] : null;
}
export function clanShipIncidentInReach(observation: ClanShipIncidentObservation | null, target: ClanShipIncidentTarget): boolean {
  return !!observation && observation.roomId === target.roomId && Number.isFinite(observation.x) && Number.isFinite(observation.y) &&
    isClanShipInteriorWalkable(target.roomId, observation) && Math.hypot(observation.x - target.x, observation.y - target.y) <= CLAN_SHIP_INTERIOR_METRICS.interactionReach;
}

type Transition = { accepted: boolean; changed: boolean; view: ClanShipIncidentView; message: string };
/** Replayed both at the action boundary and while inspecting imported events. */
function transition(before: ClanShipIncidentView, type: ClanShipIncidentOperation, selected: ClanShipIncidentBranch | undefined,
  revision: number, variant: ClanShipIncidentVariant, conclusion?: ClanShipTrophyConclusion): Transition {
  const no = (message: string): Transition => ({ accepted: false, changed: false, view: before, message });
  const same = (message: string): Transition => ({ accepted: true, changed: false, view: before, message });
  const next = { ...before, restored: [...before.restored], ...(before.trophy ? { trophy: { ...before.trophy } } : {}) };
  const yes = (message: string): Transition => ({ accepted: true, changed: true, view: { ...next, lastMessage: message }, message });
  if (before.completedRevision !== null) return same('Ce dossier a déjà été contrôlé et sa gratification enregistrée.');
  if (type === 'accept') {
    if (before.accepted) return same('L’incident est déjà suivi. Reprends au prochain objet indiqué.');
    next.accepted = true;
    return yes(before.id === 'contested-trophy'
      ? 'Trace Froide : « Sur C-37, la ligature du retour masque une trace plus ancienne. Compare le support et les deux relevés, puis écoute Balafre. Nous conserverons ce qui peut être établi. »'
      : 'Intervention acceptée. Le passage et les services historiques restent praticables.');
  }
  if (!before.accepted) return no('Accepte d’abord l’intervention au poste indiqué.');
  if (before.id === 'contested-trophy') {
    const trophy = next.trophy!;
    if (type === 'examine-trophy') {
      if (trophy.supportRead) return same('Le support C-37, sa strie et sa ligature sont déjà relevés.');
      trophy.supportRead = true; return yes(CLAN_SHIP_TROPHY_CASE.support);
    }
    if (!trophy.supportRead) return no('Examine d’abord le support C-37 dans la galerie : une attribution exige la trace de cet objet.');
    if (type === 'read-hunt-report' || type === 'read-transfer-record') {
      const hunt = type === 'read-hunt-report', record = hunt ? 'hunt-report' : 'transfer-record';
      if ((hunt ? trophy.huntReportRead : trophy.transferRecordRead) && trophy.reviewRequired !== record)
        return same(hunt ? CLAN_SHIP_TROPHY_CASE.huntReport : CLAN_SHIP_TROPHY_CASE.transferRecord);
      if (hunt) trophy.huntReportRead = true; else trophy.transferRecordRead = true;
      if (trophy.reviewRequired === record) trophy.reviewRequired = null;
      return yes(hunt ? CLAN_SHIP_TROPHY_CASE.huntReport : CLAN_SHIP_TROPHY_CASE.transferRecord);
    }
    if (!trophy.huntReportRead) return no('Le relevé de chasse C-37/01 manque : il nomme l’auteur du prélèvement et la marque correspondante.');
    if (!trophy.transferRecordRead) return no('Le relevé de transfert C-37/02 manque : il précise qui a porté le même trophée après la chasse.');
    if (type === 'hear-veteran') {
      if (trophy.testimonyHeard) return same(CLAN_SHIP_TROPHY_CASE.testimony);
      trophy.testimonyHeard = true; return yes(CLAN_SHIP_TROPHY_CASE.testimony);
    }
    if (!trophy.testimonyHeard) return no('Écoute Balafre de Cendre avant de confronter son témoignage aux deux relevés.');
    if (trophy.reviewRequired) return no(trophy.reviewRequired === 'hunt-report'
      ? 'La proposition reste non étayée. Relis physiquement le relevé C-37/01 avant de présenter une autre conclusion.'
      : 'La proposition reste non étayée. Relis physiquement le relevé C-37/02 avant de présenter une autre conclusion.');
    if (type === 'conclude-provenance') {
      if (trophy.conclusion) return same('La conclusion et ses preuves sont déjà inscrites. Présente-la à Balafre pour recueillir sa réponse.');
      const choice = clanShipTrophyConclusion(conclusion);
      if (!choice) return no('Choisis une conclusion et le motif qu’elle conserve.');
      trophy.proposedConclusion = choice.id;
      if ('review' in choice) {
        trophy.reviewRequired = choice.review; next.faults += 1;
        return yes(choice.refusal);
      }
      trophy.conclusion = choice.id; trophy.traceReaction = true;
      return yes(`${choice.plaque}. ${choice.traceReply} Présente maintenant ce relevé à Balafre de Cendre.`);
    }
    if (type === 'acknowledge-provenance') {
      const choice = clanShipTrophyConclusion(trophy.conclusion);
      if (!choice || !('veteranReply' in choice) || !trophy.traceReaction)
        return no('Une conclusion motivée doit d’abord être inscrite avec Trace Froide.');
      trophy.veteranReaction = true; next.completedRevision = revision;
      return yes(`${choice.veteranReply} Dossier C-37 clôturé : les preuves, les deux interlocuteurs et l’inscription restent consultables.`);
    }
    return no('Cette intervention ne correspond pas au dossier de provenance.');
  }
  if (type === 'inspect-witness') {
    if (before.witness) return same('Le témoin a déjà été relevé et conservé.');
    next.witness = true;
    return yes(before.id === 'sealed-lot' ? `Lot ${variant.lotCode} : le témoin indique « fermé », mais le retour du scellé reste ouvert. Consulte son identité aux archives.`
      : `Mesure conservée : A = ${variant.cycles.A} ; B = ${variant.cycles.B}. Compare ces cycles à la référence des archives.`);
  }
  if (type === 'read-reference') {
    if (!before.witness) return no('Relève d’abord le témoin réel avant de rapprocher son archive.');
    if (before.reference && (before.id === 'relay-fault' || before.diagnosticCurrent)) return same('Le rapprochement est déjà conservé.');
    next.reference = true; next.diagnosticCurrent = true;
    return yes(before.id === 'sealed-lot' ? `Registre confirmé : lot ${variant.lotCode}, conduite ${variant.branch}. L’isolateur ${variant.other} dessert un autre lot et doit rester libre.`
      : `Référence : la branche ${variant.branch} à deux impulsions doit être isolée. Après remplacement, rétablir ${variant.other} (témoin stable), puis ${variant.branch}. Composant requis : R-2.`);
  }
  if (!before.witness || !before.reference) return no('Le témoin et sa référence sont tous deux requis ; une supposition ne remplace pas les indices.');
  if (type === 'isolate') {
    if (!selected) return no('Choisis un des deux circuits identifiés.');
    if (before.id === 'sealed-lot' && !before.diagnosticCurrent) return no('Le lot reste restreint. Reviens au registre des archives pour revalider le diagnostic.');
    if (before.isolatedBranch === selected && selected === variant.branch) return same('La bonne branche est déjà isolée.');
    next.chosenBranch = selected; next.pressureChecked = false; next.restored = [];
    if (selected !== variant.branch) {
      next.isolatedBranch = null; next.faults += 1;
      if (before.id === 'sealed-lot') next.diagnosticCurrent = false;
      return yes(before.id === 'sealed-lot' ? `L’isolateur ${selected} ne correspond pas au lot. Restriction maintenue : revalide le diagnostic aux archives. La coursive reste libre.`
        : `La branche ${selected} ne correspond pas au cycle relevé. Le test est remis à zéro ; mesures, référence et composant sont conservés.`);
    }
    next.isolatedBranch = selected;
    return yes(before.id === 'sealed-lot' ? `Conduite ${selected} isolée. Le lot reste restreint jusqu’au contrôle de pression et de fermeture.`
      : `Branche ${selected} isolée. Le circuit témoin reste lisible ; récupère R-2 à l’armurerie puis répare ce relais.`);
  }
  if (before.isolatedBranch !== variant.branch) return no('La branche identifiée doit être réellement isolée.');
  if (before.id === 'sealed-lot') {
    if (type === 'check-pressure') {
      if (before.pressureChecked) return same('La pression résiduelle a déjà été contrôlée à zéro.');
      next.pressureChecked = true; return yes('Mesure médicale enregistrée : pression résiduelle nulle. La fermeture peut être contrôlée au hangar.');
    }
    if (type === 'close-lot') {
      if (!before.pressureChecked || !before.diagnosticCurrent) return no('Le lot exige le diagnostic valide et le contrôle de pression avant sa fermeture.');
      next.completedRevision = revision;
      return yes('Fermeture vérifiée. La restriction du lot est levée et le dossier de Garde du Seuil est conservé.');
    }
    return no('Cette intervention ne correspond pas au boîtier de confinement.');
  }
  if (type === 'collect-component') {
    if (before.component !== 'absent') return same('R-2 est déjà prélevé ou installé. Aucun deuxième composant n’est délivré.');
    next.component = 'carried'; return yes('Composant R-2 prélevé au casier identifié. Il est réservé à ce relais.');
  }
  if (type === 'install-component') {
    if (before.component === 'absent') return no('Récupère le composant R-2 au casier de l’armurerie.');
    if (before.component === 'installed') return same('R-2 est déjà installé. Sa remise à l’essai ne consomme pas une seconde pièce.');
    next.component = 'installed'; next.restored = [];
    return yes(`R-2 installé une seule fois. Rétablis d’abord le circuit témoin ${variant.other}, puis le circuit ${variant.branch}.`);
  }
  if (type === 'restore-circuit') {
    if (before.component !== 'installed') return no('Le remplacement du composant précède la remise sous tension.');
    if (!selected) return no('Choisis le circuit à remettre sous tension.');
    if (before.restored.includes(selected)) return same('Ce circuit est déjà stable dans le test courant.');
    const expected = before.restored.length === 0 ? variant.other : variant.branch;
    if (selected !== expected) {
      next.restored = []; next.faults += 1;
      return yes(`Permutation refusée : rétablir ${variant.other} avant ${variant.branch}. Seul le test est réinitialisé ; R-2 reste installé.`);
    }
    next.restored.push(selected);
    return yes(next.restored.length === 2 ? 'Les deux circuits sont stables. Rejoins la table du conseil pour contrôler la projection.' : `Circuit ${selected} rétabli et stable. Le second circuit reste isolé pour la dernière vérification.`);
  }
  if (type === 'verify-signal') {
    if (before.restored.length !== 2) return no('Les deux circuits doivent être rétablis avant le contrôle final.');
    next.completedRevision = revision;
    return yes('Signal stable contrôlé au conseil. Les deux circuits, le composant et le dossier de Griffe de Fer sont enregistrés.');
  }
  return no('Cette intervention ne correspond pas au relais.');
}

export function createClanShipIncidents(ownerCreatedAt: string): ClanShipIncidentsState {
  if (!identity(ownerCreatedAt)) throw new TypeError('Propriétaire de campagne invalide.');
  return { version: CLAN_SHIP_INCIDENT_VERSION, ownerCreatedAt, revision: 0, incidents: [] };
}
export function clanShipIncidentView(state: ClanShipIncidentsState | null | undefined, id: ClanShipIncidentId): ClanShipIncidentView {
  let view = emptyView(id);
  if (!state) return view;
  const variant = clanShipIncidentVariant(state.ownerCreatedAt, id);
  for (const event of state.incidents.find(run => run.id === id)?.events ?? []) view = transition(view, event.type, event.branch, event.revision, variant, event.conclusion).view;
  return view;
}
export function inspectClanShipIncidents(raw: unknown, ownerCreatedAt: string): { status: 'absent' | 'valid' | 'future-version' | 'invalid-save'; state: ClanShipIncidentsState | null } {
  if (raw === undefined || raw === null) return { status: 'absent', state: null };
  if (plain(raw) && integer(raw.version) && raw.version > CLAN_SHIP_INCIDENT_VERSION) return { status: 'future-version', state: null };
  const invalid = { status: 'invalid-save' as const, state: null };
  if (!plain(raw) || !exact(raw, ['version', 'ownerCreatedAt', 'revision', 'incidents']) || raw.version !== 1 && raw.version !== CLAN_SHIP_INCIDENT_VERSION ||
      !identity(ownerCreatedAt) || raw.ownerCreatedAt !== ownerCreatedAt || !integer(raw.revision) ||
      raw.revision > (raw.version === 1 ? 192 : 288) || !Array.isArray(raw.incidents) || raw.incidents.length > (raw.version === 1 ? 2 : 3)) return invalid;
  const runs: ClanShipIncidentRun[] = [], revisions: number[] = [];
  for (const entry of raw.incidents) {
    if (!plain(entry) || !exact(entry, ['id', 'events']) || !clanShipIncidentDefinition(entry.id) || raw.version === 1 && entry.id === 'contested-trophy' || runs.some(run => run.id === entry.id) ||
        !Array.isArray(entry.events) || entry.events.length === 0 || entry.events.length > 96) return invalid;
    const id = entry.id as ClanShipIncidentId, variant = clanShipIncidentVariant(ownerCreatedAt, id);
    let view = emptyView(id), previousRevision = 0;
    const events: ClanShipIncidentEvent[] = [];
    for (const event of entry.events) {
      if (!plain(event)) return invalid;
      const interlocutor = clanShipIncidentInterlocutor(id, event.type as ClanShipIncidentOperation);
      if (!exact(event, ['revision', 'type', 'observation', ...(branching(event.type) ? ['branch'] : []),
          ...(event.type === 'conclude-provenance' ? ['conclusion'] : []), ...(interlocutor ? ['interlocutor'] : [])]) ||
          !integer(event.revision) || event.revision < 1 || event.revision > raw.revision || event.revision <= previousRevision ||
          !operations.includes(event.type as ClanShipIncidentOperation) || branching(event.type) && !branch(event.branch) ||
          event.type === 'conclude-provenance' && !clanShipTrophyConclusion(event.conclusion) || interlocutor && event.interlocutor !== interlocutor ||
          !plain(event.observation) || !exact(event.observation, ['roomId', 'x', 'y'])) return invalid;
      const baseTarget = clanShipIncidentTarget(id, event.type as ClanShipIncidentOperation);
      const target = baseTarget && interlocutor ? conversationTarget(baseTarget, event.observation.roomId) : baseTarget;
      if (!target || !clanShipIncidentInReach(event.observation as unknown as ClanShipIncidentObservation, target)) return invalid;
      const result = transition(view, event.type as ClanShipIncidentOperation, event.branch as ClanShipIncidentBranch | undefined, event.revision, variant,
        event.conclusion as ClanShipTrophyConclusion | undefined);
      if (!result.accepted || !result.changed || events.length >= 88 && result.view.faults > view.faults) return invalid;
      view = result.view; previousRevision = event.revision; revisions.push(event.revision);
      events.push(JSON.parse(JSON.stringify(event)) as ClanShipIncidentEvent);
    }
    if (runs.length && runs[runs.length - 1].events[0].revision >= events[0].revision) return invalid;
    runs.push({ id, events });
  }
  if (revisions.length !== raw.revision || revisions.sort((a, b) => a - b).some((revision, index) => revision !== index + 1)) return invalid;
  return { status: 'valid', state: { version: raw.version, ownerCreatedAt, revision: raw.revision, incidents: runs } };
}
export function evaluateClanShipIncidentsCampaign(state: ClanShipIncidentsState, save: ClanShipIncidentCampaign): { allowed: boolean; reason: string } {
  if (inspectClanShipIncidents(state, save.createdAt).status !== 'valid' || !evaluateClanShipAccess(save).allowed)
    return { allowed: false, reason: 'Le registre des incidents et l’accès Blooded doivent appartenir à cette campagne.' };
  const operations = inspectClanShipOperations(save.clanShipOperations, save.createdAt).state;
  if (state.incidents.some(run => !operations?.completedContracts.some(receipt => receipt.contractId === clanShipIncidentDefinition(run.id)!.prerequisite)))
    return { allowed: false, reason: 'Le parcours de poste préalable doit être conservé dans le dossier du clan.' };
  return { allowed: true, reason: 'Les incidents correspondent aux dossiers de cette campagne.' };
}
export function evaluateClanShipIncidentOffer(save: ClanShipIncidentCampaign, id: ClanShipIncidentId): { allowed: boolean; reason: string } {
  const definition = clanShipIncidentDefinition(id)!;
  if (!evaluateClanShipAccess(save).allowed) return { allowed: false, reason: 'Le rite Blooded doit être reconnu.' };
  const operations = inspectClanShipOperations(save.clanShipOperations, save.createdAt).state;
  if (!operations?.completedContracts.some(receipt => receipt.contractId === definition.prerequisite))
    return { allowed: false, reason: `Accomplis d’abord le dossier ${definition.prerequisite}.` };
  if (id === 'contested-trophy') return evaluateClanShipIncidentPresence(save, id, 'accept');
  const interlocutor = operations.recruitedNpcIds.includes(definition.npcId) ? availableClanResidenceCrew(save).includes(definition.npcId)
    : evaluateClanShipRecruit(operations, definition.npcId).allowed;
  return interlocutor ? { allowed: true, reason: 'L’interlocuteur et le dossier sont disponibles au poste indiqué.' }
    : { allowed: false, reason: 'Cet interlocuteur est affecté ailleurs ou indisponible. Reviens lorsqu’il sera présent au Clan Ship.' };
}
function validAction(action: unknown): action is ClanShipIncidentAction {
  if (!plain(action) || !identity(action.ownerCreatedAt) || !integer(action.expectedRevision) || !clanShipIncidentDefinition(action.incidentId) ||
      !operations.includes(action.type as ClanShipIncidentOperation)) return false;
  return exact(action, ['type', 'incidentId', 'ownerCreatedAt', 'expectedRevision', ...(branching(action.type) ? ['branch'] : []),
    ...(action.type === 'conclude-provenance' ? ['conclusion'] : [])]) &&
    (!branching(action.type) || branch(action.branch)) &&
    (action.type !== 'conclude-provenance' || action.incidentId === 'contested-trophy' && !!clanShipTrophyConclusion(action.conclusion));
}
export function actClanShipIncident(action: ClanShipIncidentAction, context: ClanShipIncidentContext): ClanShipIncidentResult {
  const { save, observation } = context, inspected = inspectClanShipIncidents(save.clanShipIncidents, save.createdAt), current = inspected.state;
  const refuse = (message: string): ClanShipIncidentResult => ({ accepted: false, changed: false, state: current, clanMarksReward: 0, message });
  if (inspected.status === 'invalid-save' || inspected.status === 'future-version') return refuse('Le registre existant doit être récupéré avant une intervention.');
  if (!validAction(action) || !context.active || action.ownerCreatedAt !== save.createdAt) return refuse('Cette commande n’appartient pas à la scène de campagne active.');
  const state = current ?? createClanShipIncidents(save.createdAt);
  if (action.expectedRevision !== state.revision) return refuse('Le dossier a changé. Relis son état avant cette intervention.');
  if (!evaluateClanShipIncidentsCampaign(state, save).allowed) return refuse('Les preuves et l’accès de la campagne ne correspondent pas à ce dossier.');
  const hearing = inspectClanShipTrophyHearing(save.clanShipTrophyHearing, save.createdAt);
  if (hearing.status === 'invalid-save' || hearing.status === 'future-version' || hearing.state &&
      !evaluateClanShipTrophyHearingCampaign(hearing.state, save).allowed) return refuse('Le journal de la restitution doit être récupéré avant une nouvelle intervention.');
  const docking = save.clanShipDocking, target = clanShipIncidentTarget(action.incidentId, action.type, save);
  if (!docking || docking.ownerCreatedAt !== save.createdAt || docking.status !== 'aboard' || docking.roomId !== observation?.roomId ||
      !target || !clanShipIncidentInReach(observation, target)) return refuse('Approche physiquement l’objet indiqué dans la bonne salle avant de confirmer.');
  if (save.clanShipOperations?.spaceEncounter?.status === 'active') return refuse('Termine l’engagement spatial avant cette intervention de maintenance.');
  const view = clanShipIncidentView(state, action.incidentId);
  if (action.type === 'accept' && !view.accepted) {
    const offer = evaluateClanShipIncidentOffer(save, action.incidentId);
    if (!offer.allowed) return refuse(offer.reason);
  }
  if (view.completedRevision === null) {
    const presence = evaluateClanShipIncidentPresence(save, action.incidentId, action.type);
    if (!presence.allowed) return refuse(presence.reason);
  }
  const result = transition(view, action.type, 'branch' in action ? action.branch : undefined, state.revision + 1,
    clanShipIncidentVariant(save.createdAt, action.incidentId), 'conclusion' in action ? action.conclusion : undefined);
  if (!result.accepted) return refuse(result.message);
  if (!result.changed) return { accepted: true, changed: false, state: current, clanMarksReward: 0, message: result.message };
  const run = state.incidents.find(entry => entry.id === action.incidentId);
  // Keep enough journal slots for the complete successful recovery. Repeated
  // wrong inputs cannot consume the final slots and strand an accepted case.
  if ((run?.events.length ?? 0) >= 88 && result.view.faults > view.faults)
    return refuse('L’essai incorrect est refusé sans modifier le dossier. Les indices conservés indiquent la branche et l’ordre nécessaires à la reprise.');
  if ((run?.events.length ?? 0) >= 96) return refuse('La limite de journal de cet incident est atteinte ; conserve cette sauvegarde pour récupération.');
  const reward = result.view.completedRevision !== null && view.completedRevision === null ? clanShipIncidentDefinition(action.incidentId)!.reward : 0;
  if (!integer(save.profile.clanMarks) || !integer(save.profile.clanMarks + reward)) return refuse('Le solde de campagne ne peut pas recevoir cette gratification.');
  const interlocutor = clanShipIncidentInterlocutor(action.incidentId, action.type);
  const event: ClanShipIncidentEvent = { revision: state.revision + 1, type: action.type, observation: { ...observation! },
    ...('branch' in action ? { branch: action.branch } : {}), ...('conclusion' in action ? { conclusion: action.conclusion } : {}),
    ...(interlocutor ? { interlocutor } : {}) };
  const next: ClanShipIncidentsState = { ...state, version: CLAN_SHIP_INCIDENT_VERSION, revision: state.revision + 1,
    incidents: run ? state.incidents.map(entry => entry.id === run.id ? { ...entry, events: [...entry.events, event] } : entry)
      : [...state.incidents, { id: action.incidentId, events: [event] }] };
  const hearingState = hearing.state && action.incidentId === 'contested-trophy' && result.view.trophy?.conclusion &&
    (action.type === 'conclude-provenance' || action.type === 'acknowledge-provenance')
    ? recordClanShipTrophyHearingDecision(hearing.state, action.type === 'conclude-provenance' ? 'conclude' : 'acknowledge',
      result.view.trophy.conclusion, next.revision, observation!) : undefined;
  return { accepted: true, changed: true, state: next, clanMarksReward: reward,
    ...(hearingState ? { hearingState } : {}),
    message: result.message + (reward ? ` ${reward} marques attribuées une seule fois.` : '') };
}

const trophyEvidenceReady = (view: ClanShipIncidentView) => !!view.accepted && !!view.trophy &&
  view.trophy.supportRead && view.trophy.huntReportRead && view.trophy.transferRecordRead && view.trophy.testimonyHeard;

/** Cross-ledger checks live in this adapter, so the pure hearing ledger never
 * imports the incident reducer. Reassignment after the meeting is legitimate. */
export function evaluateClanShipTrophyHearingCampaign(state: ClanShipTrophyHearingState, save: ClanShipIncidentCampaign): { allowed: boolean; reason: string } {
  const refuse = { allowed: false, reason: 'La restitution ne correspond pas aux preuves et aux décisions de cette campagne.' };
  if (inspectClanShipTrophyHearing(state, save.createdAt).status !== 'valid') return refuse;
  const incidents = inspectClanShipIncidents(save.clanShipIncidents, save.createdAt).state;
  if (!incidents || !evaluateClanShipIncidentsCampaign(incidents, save).allowed) return refuse;
  const run = incidents.incidents.find(entry => entry.id === 'contested-trophy');
  if (!run) return refuse;
  for (const event of state.events) {
    if (event.incidentRevision > incidents.revision) return refuse;
    const at = clanShipIncidentView({ ...incidents, incidents: [{ ...run, events: run.events.filter(entry => entry.revision <= event.incidentRevision) }] }, 'contested-trophy');
    if (!trophyEvidenceReady(at)) return refuse;
    if (event.type === 'invite' || event.type === 'record-sample') {
      if (at.completedRevision !== null || at.trophy?.conclusion || at.trophy?.reviewRequired) return refuse;
    } else {
      const receipt = run.events.find(entry => entry.revision === event.incidentRevision);
      if (!receipt || receipt.type !== (event.type === 'conclude' ? 'conclude-provenance' : 'acknowledge-provenance') ||
          at.trophy?.conclusion !== event.conclusion || event.type === 'conclude' && receipt.conclusion !== event.conclusion ||
          receipt.observation.roomId !== event.observation.roomId || receipt.observation.x !== event.observation.x || receipt.observation.y !== event.observation.y) return refuse;
    }
  }
  const view = clanShipIncidentView(incidents, 'contested-trophy'), hearing = clanShipTrophyHearingView(state);
  if (!!view.trophy?.conclusion !== hearing.concluded || view.trophy?.conclusion !== hearing.conclusion ||
      (view.completedRevision !== null) !== hearing.completed) return refuse;
  return { allowed: true, reason: 'Les invitations, échantillons et réponses correspondent au dossier C-37 conservé.' };
}

export function actClanShipTrophyHearing(action: ClanShipTrophyHearingAction, context: ClanShipIncidentContext): ClanShipTrophyHearingResult {
  const { save } = context, inspected = inspectClanShipIncidents(save.clanShipIncidents, save.createdAt);
  const hearing = inspectClanShipTrophyHearing(save.clanShipTrophyHearing, save.createdAt);
  if (!inspected.state || inspected.status !== 'valid' || !evaluateClanShipIncidentsCampaign(inspected.state, save).allowed ||
      hearing.status === 'invalid-save' || hearing.status === 'future-version' || hearing.state && !evaluateClanShipTrophyHearingCampaign(hearing.state, save).allowed)
    return { accepted: false, changed: false, state: hearing.state, message: 'Le dossier C-37 et son journal doivent être récupérés avant de préparer la restitution.' };
  const view = clanShipIncidentView(inspected.state, 'contested-trophy');
  return reduceClanShipTrophyHearing(action, { ...context, incidentRevision: inspected.state.revision,
    evidenceReady: trophyEvidenceReady(view) && !view.trophy?.reviewRequired, caseConcluded: !!view.trophy?.conclusion, caseCompleted: view.completedRevision !== null });
}

/** Stable next actions drive world affordances and the accessible panel alike. */
export function clanShipIncidentNext(view: ClanShipIncidentView, save?: ClanShipIncidentCampaign): { type: ClanShipIncidentOperation; label: string; target: ClanShipIncidentTarget } | null {
  if (view.completedRevision !== null) return null;
  if (view.id === 'contested-trophy') {
    const trophy = view.trophy!;
    const type: ClanShipIncidentOperation = !view.accepted ? 'accept' : !trophy.supportRead ? 'examine-trophy'
      : !trophy.huntReportRead || trophy.reviewRequired === 'hunt-report' ? 'read-hunt-report'
        : !trophy.transferRecordRead || trophy.reviewRequired === 'transfer-record' ? 'read-transfer-record'
          : !trophy.testimonyHeard ? 'hear-veteran' : !trophy.conclusion ? 'conclude-provenance' : 'acknowledge-provenance';
    const labels = { accept: 'Ouvrir le dossier avec Trace Froide', 'examine-trophy': 'Examiner la strie et la ligature',
      'read-hunt-report': 'Comparer le relevé de chasse C-37/01', 'read-transfer-record': 'Comparer le transfert C-37/02',
      'hear-veteran': 'Écouter le témoignage de Balafre', 'conclude-provenance': 'Choisir une conclusion motivée',
      'acknowledge-provenance': 'Présenter le relevé à Balafre et clore le dossier' };
    return { type, label: labels[type as keyof typeof labels], target: clanShipIncidentTarget(view.id, type, save)! };
  }
  const type: ClanShipIncidentOperation = !view.accepted ? 'accept' : !view.witness ? 'inspect-witness' : !view.reference || view.id === 'sealed-lot' && !view.diagnosticCurrent ? 'read-reference'
    : !view.isolatedBranch ? 'isolate' : view.id === 'sealed-lot' ? !view.pressureChecked ? 'check-pressure' : 'close-lot'
      : view.component === 'absent' ? 'collect-component' : view.component === 'carried' ? 'install-component' : view.restored.length < 2 ? 'restore-circuit' : 'verify-signal';
  const labels = { accept: 'Accepter l’intervention', 'inspect-witness': 'Relever le témoin', 'read-reference': 'Lire et rapprocher la référence', isolate: 'Choisir l’isolateur', 'check-pressure': 'Mesurer la pression résiduelle', 'close-lot': 'Contrôler la fermeture', 'collect-component': 'Prélever le composant R-2', 'install-component': 'Installer R-2 dans le relais', 'restore-circuit': 'Rétablir les circuits dans l’ordre', 'verify-signal': 'Contrôler le signal du conseil' };
  return { type, label: labels[type as keyof typeof labels], target: clanShipIncidentTarget(view.id, type, save)! };
}
