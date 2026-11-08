import type { SaveGame } from '../types';
import type { ClanShipRoomId } from './clanShipDocking';
import { CLAN_SHIP_INTERIOR_METRICS, isClanShipInteriorWalkable } from './clanShipInterior';
import { evaluateClanShipAccess, evaluateClanShipRecruit, inspectClanShipOperations, type ClanShipContractId, type ClanShipNpcId } from './clanShipOperations';
import { availableClanResidenceCrew, type CompanionCampaign } from './companionResidence';

export const CLAN_SHIP_INCIDENT_VERSION = 1 as const;
export type ClanShipIncidentId = 'sealed-lot' | 'relay-fault';
export type ClanShipIncidentBranch = 'A' | 'B';
export type ClanShipIncidentOperation = 'accept' | 'inspect-witness' | 'read-reference' | 'isolate' | 'check-pressure' | 'close-lot' |
  'collect-component' | 'install-component' | 'restore-circuit' | 'verify-signal';
export type ClanShipIncidentTargetId = 'hangar-briefing' | 'seal-controls' | 'lot-archive' | 'medical-pressure' |
  'armory-briefing' | 'relay-controls' | 'relay-archive' | 'relay-component' | 'council-signal';
export interface ClanShipIncidentTarget {
  id: ClanShipIncidentTargetId; roomId: ClanShipRoomId; x: number; y: number; label: string;
}
/** Interaction points are on the real authored floor, outside fixture solids.
 * The two new props replace matching terminal art; their collision stays native. */
export const CLAN_SHIP_INCIDENT_TARGETS: Readonly<Record<ClanShipIncidentTargetId, ClanShipIncidentTarget>> = {
  'hangar-briefing': { id: 'hangar-briefing', roomId: 'hangar', x: 820, y: 650, label: 'Dossier de Garde du Seuil' },
  'seal-controls': { id: 'seal-controls', roomId: 'hangar', x: 1060, y: 620, label: 'Boîtier du lot scellé' },
  'lot-archive': { id: 'lot-archive', roomId: 'archives', x: 790, y: 645, label: 'Registre des lots' },
  'medical-pressure': { id: 'medical-pressure', roomId: 'soins', x: 1030, y: 620, label: 'Diagnostic de pression' },
  'armory-briefing': { id: 'armory-briefing', roomId: 'armurerie', x: 700, y: 635, label: 'Dossier de Griffe de Fer' },
  'relay-controls': { id: 'relay-controls', roomId: 'conseil', x: 350, y: 620, label: 'Relais à deux circuits' },
  'relay-archive': { id: 'relay-archive', roomId: 'archives', x: 390, y: 620, label: 'Cycle de référence' },
  'relay-component': { id: 'relay-component', roomId: 'armurerie', x: 1010, y: 640, label: 'Casier du composant R-2' },
  'council-signal': { id: 'council-signal', roomId: 'conseil', x: 740, y: 650, label: 'Contrôle de la projection' },
};
export const CLAN_SHIP_INCIDENTS = [
  { id: 'sealed-lot' as const, reference: 'OPS-B01', name: 'Le scellé qui ment', npcId: 'threshold-guard' as ClanShipNpcId,
    prerequisite: 'ship-seal-check' as ClanShipContractId, start: 'hangar-briefing' as const, reward: 25,
    briefing: 'Garde du Seuil a relevé un témoin de fermeture incompatible avec le registre. Identifie le lot avant de manipuler ses deux isolateurs, puis vérifie sa pression et sa fermeture. La coursive reste ouverte.' },
  { id: 'relay-fault' as const, reference: 'OPS-B02', name: 'Une lumière dans le relais', npcId: 'iron-claw' as ClanShipNpcId,
    prerequisite: 'ship-armory-audit' as ClanShipContractId, start: 'armory-briefing' as const, reward: 30,
    briefing: 'Griffe de Fer signale un cycle instable dans la projection du conseil. Mesure les deux circuits, compare l’archive et remplace le composant identifié avant une remise en service progressive.' },
] as const;
export const clanShipIncidentDefinition = (id: unknown) => CLAN_SHIP_INCIDENTS.find(entry => entry.id === id);
export interface ClanShipIncidentObservation { roomId: ClanShipRoomId; x: number; y: number }
export interface ClanShipIncidentEvent {
  revision: number; type: ClanShipIncidentOperation; observation: ClanShipIncidentObservation;
  branch?: ClanShipIncidentBranch;
}
export interface ClanShipIncidentRun { id: ClanShipIncidentId; events: ClanShipIncidentEvent[] }
export interface ClanShipIncidentsState {
  version: typeof CLAN_SHIP_INCIDENT_VERSION; ownerCreatedAt: string; revision: number; incidents: ClanShipIncidentRun[];
}
export type ClanShipIncidentCommand = { type: Exclude<ClanShipIncidentOperation, 'isolate' | 'restore-circuit'>; incidentId: ClanShipIncidentId } |
  { type: 'isolate' | 'restore-circuit'; incidentId: ClanShipIncidentId; branch: ClanShipIncidentBranch };
export type ClanShipIncidentAction = ClanShipIncidentCommand & { ownerCreatedAt: string; expectedRevision: number };
export type ClanShipIncidentCampaign = CompanionCampaign & Pick<SaveGame, 'clanShipIncidents'>;
export interface ClanShipIncidentContext { save: ClanShipIncidentCampaign; active: boolean; observation: ClanShipIncidentObservation | null }
export interface ClanShipIncidentResult {
  accepted: boolean; changed: boolean; state: ClanShipIncidentsState | null; clanMarksReward: number; message: string;
}
export interface ClanShipIncidentView {
  id: ClanShipIncidentId; accepted: boolean; completedRevision: number | null; witness: boolean; reference: boolean;
  diagnosticCurrent: boolean; chosenBranch: ClanShipIncidentBranch | null; isolatedBranch: ClanShipIncidentBranch | null;
  pressureChecked: boolean; component: 'absent' | 'carried' | 'installed'; restored: ClanShipIncidentBranch[];
  faults: number; lastMessage: string;
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
const operations: readonly ClanShipIncidentOperation[] = ['accept', 'inspect-witness', 'read-reference', 'isolate', 'check-pressure', 'close-lot', 'collect-component', 'install-component', 'restore-circuit', 'verify-signal'];
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
  pressureChecked: false, component: 'absent', restored: [], faults: 0, lastMessage: '' });

export function clanShipIncidentTarget(id: ClanShipIncidentId, type: ClanShipIncidentOperation): ClanShipIncidentTarget | null {
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
  revision: number, variant: ClanShipIncidentVariant): Transition {
  const no = (message: string): Transition => ({ accepted: false, changed: false, view: before, message });
  const same = (message: string): Transition => ({ accepted: true, changed: false, view: before, message });
  const next = { ...before, restored: [...before.restored] };
  const yes = (message: string): Transition => ({ accepted: true, changed: true, view: { ...next, lastMessage: message }, message });
  if (before.completedRevision !== null) return same('Ce dossier a déjà été contrôlé et sa gratification enregistrée.');
  if (type === 'accept') {
    if (before.accepted) return same('L’incident est déjà suivi. Reprends au prochain objet indiqué.');
    next.accepted = true; return yes('Intervention acceptée. Le passage et les services historiques restent praticables.');
  }
  if (!before.accepted) return no('Accepte d’abord l’intervention au poste indiqué.');
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
  for (const event of state.incidents.find(run => run.id === id)?.events ?? []) view = transition(view, event.type, event.branch, event.revision, variant).view;
  return view;
}
export function inspectClanShipIncidents(raw: unknown, ownerCreatedAt: string): { status: 'absent' | 'valid' | 'future-version' | 'invalid-save'; state: ClanShipIncidentsState | null } {
  if (raw === undefined || raw === null) return { status: 'absent', state: null };
  if (plain(raw) && integer(raw.version) && raw.version > CLAN_SHIP_INCIDENT_VERSION) return { status: 'future-version', state: null };
  const invalid = { status: 'invalid-save' as const, state: null };
  if (!plain(raw) || !exact(raw, ['version', 'ownerCreatedAt', 'revision', 'incidents']) || raw.version !== CLAN_SHIP_INCIDENT_VERSION ||
      !identity(ownerCreatedAt) || raw.ownerCreatedAt !== ownerCreatedAt || !integer(raw.revision) || raw.revision > 192 || !Array.isArray(raw.incidents) || raw.incidents.length > 2) return invalid;
  const runs: ClanShipIncidentRun[] = [], revisions: number[] = [];
  for (const entry of raw.incidents) {
    if (!plain(entry) || !exact(entry, ['id', 'events']) || !clanShipIncidentDefinition(entry.id) || runs.some(run => run.id === entry.id) ||
        !Array.isArray(entry.events) || entry.events.length === 0 || entry.events.length > 96) return invalid;
    const id = entry.id as ClanShipIncidentId, variant = clanShipIncidentVariant(ownerCreatedAt, id);
    let view = emptyView(id), previousRevision = 0;
    const events: ClanShipIncidentEvent[] = [];
    for (const event of entry.events) {
      if (!plain(event) || !exact(event, ['revision', 'type', 'observation', ...(branching(event.type) ? ['branch'] : [])]) ||
          !integer(event.revision) || event.revision < 1 || event.revision > raw.revision || event.revision <= previousRevision ||
          !operations.includes(event.type as ClanShipIncidentOperation) || branching(event.type) && !branch(event.branch) ||
          !plain(event.observation) || !exact(event.observation, ['roomId', 'x', 'y'])) return invalid;
      const target = clanShipIncidentTarget(id, event.type as ClanShipIncidentOperation);
      if (!target || !clanShipIncidentInReach(event.observation as unknown as ClanShipIncidentObservation, target)) return invalid;
      const result = transition(view, event.type as ClanShipIncidentOperation, event.branch as ClanShipIncidentBranch | undefined, event.revision, variant);
      if (!result.accepted || !result.changed || events.length >= 88 && result.view.faults > view.faults) return invalid;
      view = result.view; previousRevision = event.revision; revisions.push(event.revision);
      events.push(JSON.parse(JSON.stringify(event)) as ClanShipIncidentEvent);
    }
    if (runs.length && runs[runs.length - 1].events[0].revision >= events[0].revision) return invalid;
    runs.push({ id, events });
  }
  if (revisions.length !== raw.revision || revisions.sort((a, b) => a - b).some((revision, index) => revision !== index + 1)) return invalid;
  return { status: 'valid', state: { version: CLAN_SHIP_INCIDENT_VERSION, ownerCreatedAt, revision: raw.revision, incidents: runs } };
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
  const interlocutor = operations.recruitedNpcIds.includes(definition.npcId) ? availableClanResidenceCrew(save).includes(definition.npcId)
    : evaluateClanShipRecruit(operations, definition.npcId).allowed;
  return interlocutor ? { allowed: true, reason: 'L’interlocuteur et le dossier sont disponibles au poste indiqué.' }
    : { allowed: false, reason: 'Cet interlocuteur est affecté ailleurs ou indisponible. Reviens lorsqu’il sera présent au Clan Ship.' };
}
function validAction(action: unknown): action is ClanShipIncidentAction {
  if (!plain(action) || !identity(action.ownerCreatedAt) || !integer(action.expectedRevision) || !clanShipIncidentDefinition(action.incidentId) ||
      !operations.includes(action.type as ClanShipIncidentOperation)) return false;
  return exact(action, ['type', 'incidentId', 'ownerCreatedAt', 'expectedRevision', ...(branching(action.type) ? ['branch'] : [])]) &&
    (!branching(action.type) || branch(action.branch));
}
export function actClanShipIncident(action: ClanShipIncidentAction, context: ClanShipIncidentContext): ClanShipIncidentResult {
  const { save, observation } = context, inspected = inspectClanShipIncidents(save.clanShipIncidents, save.createdAt), current = inspected.state;
  const refuse = (message: string): ClanShipIncidentResult => ({ accepted: false, changed: false, state: current, clanMarksReward: 0, message });
  if (inspected.status === 'invalid-save' || inspected.status === 'future-version') return refuse('Le registre existant doit être récupéré avant une intervention.');
  if (!validAction(action) || !context.active || action.ownerCreatedAt !== save.createdAt) return refuse('Cette commande n’appartient pas à la scène de campagne active.');
  const state = current ?? createClanShipIncidents(save.createdAt);
  if (action.expectedRevision !== state.revision) return refuse('Le dossier a changé. Relis son état avant cette intervention.');
  if (!evaluateClanShipIncidentsCampaign(state, save).allowed) return refuse('Les preuves et l’accès de la campagne ne correspondent pas à ce dossier.');
  const docking = save.clanShipDocking, target = clanShipIncidentTarget(action.incidentId, action.type);
  if (!docking || docking.ownerCreatedAt !== save.createdAt || docking.status !== 'aboard' || docking.roomId !== observation?.roomId ||
      !target || !clanShipIncidentInReach(observation, target)) return refuse('Approche physiquement l’objet indiqué dans la bonne salle avant de confirmer.');
  if (save.clanShipOperations?.spaceEncounter?.status === 'active') return refuse('Termine l’engagement spatial avant cette intervention de maintenance.');
  const view = clanShipIncidentView(state, action.incidentId);
  if (action.type === 'accept' && !view.accepted) {
    const offer = evaluateClanShipIncidentOffer(save, action.incidentId);
    if (!offer.allowed) return refuse(offer.reason);
  }
  const result = transition(view, action.type, 'branch' in action ? action.branch : undefined, state.revision + 1, clanShipIncidentVariant(save.createdAt, action.incidentId));
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
  const event: ClanShipIncidentEvent = { revision: state.revision + 1, type: action.type, observation: { ...observation! },
    ...('branch' in action ? { branch: action.branch } : {}) };
  const next: ClanShipIncidentsState = { ...state, revision: state.revision + 1,
    incidents: run ? state.incidents.map(entry => entry.id === run.id ? { ...entry, events: [...entry.events, event] } : entry)
      : [...state.incidents, { id: action.incidentId, events: [event] }] };
  return { accepted: true, changed: true, state: next, clanMarksReward: reward,
    message: result.message + (reward ? ` ${reward} marques attribuées une seule fois.` : '') };
}

/** Stable next actions drive world affordances and the accessible panel alike. */
export function clanShipIncidentNext(view: ClanShipIncidentView): { type: ClanShipIncidentOperation; label: string; target: ClanShipIncidentTarget } | null {
  if (view.completedRevision !== null) return null;
  const type: ClanShipIncidentOperation = !view.accepted ? 'accept' : !view.witness ? 'inspect-witness' : !view.reference || view.id === 'sealed-lot' && !view.diagnosticCurrent ? 'read-reference'
    : !view.isolatedBranch ? 'isolate' : view.id === 'sealed-lot' ? !view.pressureChecked ? 'check-pressure' : 'close-lot'
      : view.component === 'absent' ? 'collect-component' : view.component === 'carried' ? 'install-component' : view.restored.length < 2 ? 'restore-circuit' : 'verify-signal';
  const labels: Record<ClanShipIncidentOperation, string> = { accept: 'Accepter l’intervention', 'inspect-witness': 'Relever le témoin', 'read-reference': 'Lire et rapprocher la référence', isolate: 'Choisir l’isolateur', 'check-pressure': 'Mesurer la pression résiduelle', 'close-lot': 'Contrôler la fermeture', 'collect-component': 'Prélever le composant R-2', 'install-component': 'Installer R-2 dans le relais', 'restore-circuit': 'Rétablir les circuits dans l’ordre', 'verify-signal': 'Contrôler le signal du conseil' };
  return { type, label: labels[type], target: clanShipIncidentTarget(view.id, type)! };
}
