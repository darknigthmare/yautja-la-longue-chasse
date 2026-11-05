import { getChronicleRank } from './clanChronicle';
import type { MissionId } from '../types';
import type { ClanShipDockingState, ClanShipRoomId } from './clanShipDocking';
import {
  createClanShipSpaceEncounter, inspectClanShipSpaceEncounter, actClanShipSpaceEncounter,
  type ClanShipSpaceEncounter, type ClanShipSpaceKind, type ClanShipSpaceCrewRole,
} from './clanShipSpaceEncounter';

/** Original clan doctrine and playable contracts, not additional AVP canon.
 * This owner-bound DTO never owns a ship, promotes a hunter or writes storage. */
export const CLAN_SHIP_OPERATIONS_VERSION = 1 as const;
export const CLAN_SHIP_CONTRACT_IDS = [
  'welcome-aboard', 'ship-seal-check', 'ship-armory-audit', 'ship-triage-route', 'ship-training-circuit',
  'field-jungle-survey', 'field-ice-route', 'field-bad-blood', 'field-ruins-memory',
  'space-screening', 'space-interception', 'space-recovery',
] as const;
export type ClanShipContractId = typeof CLAN_SHIP_CONTRACT_IDS[number];
export const CLAN_SHIP_NPC_IDS = ['ash-scar', 'star-watch', 'iron-claw', 'cold-trace', 'black-suture', 'threshold-guard'] as const;
export type ClanShipNpcId = typeof CLAN_SHIP_NPC_IDS[number];
export type ClanShipOperationsPhase = 'blooded-required' | 'welcome' | 'mandate' | 'operations' | 'circle-confirmed';
export type ClanShipContractKind = 'onboarding' | 'interior' | 'field' | 'space';
export interface ClanShipOperationStep { id: string; roomId: ClanShipRoomId; label: string; description: string }
export const CLAN_SHIP_ONBOARDING_STEPS: readonly ClanShipOperationStep[] = [
  { id: 'berth-register', roomId: 'hangar', label: 'Enregistrer ton poste d’amarrage', description: 'Contrôle le repère de ton vaisseau personnel avec le registre du hangar.' },
  { id: 'medical-baseline', roomId: 'soins', label: 'Effectuer le contrôle de retour', description: 'Vérifie le poste de contrôle et dépose ton relevé médical initial.' },
  { id: 'archive-orientation', roomId: 'archives', label: 'Consulter la doctrine de ce clan', description: 'Lis les règles d’expédition et identifie les responsabilités du visiteur.' },
];

export interface ClanShipContractDefinition {
  id: ClanShipContractId;
  kind: ClanShipContractKind;
  name: string;
  summary: string;
  briefing: string;
  clanMarksReward: number;
  roomId: ClanShipRoomId;
  prerequisiteIds: readonly ClanShipContractId[];
  steps: readonly ClanShipOperationStep[];
  missionId: MissionId | null;
  minimumScore: number;
  minimumScans: number;
  spaceKind: ClanShipSpaceKind | null;
}
const contract = (definition: Pick<ClanShipContractDefinition, 'id' | 'kind' | 'name' | 'summary' | 'briefing'> & Partial<ClanShipContractDefinition>): ClanShipContractDefinition => ({
  clanMarksReward: 0, roomId: 'conseil', prerequisiteIds: [], steps: [], missionId: null,
  minimumScore: 0, minimumScans: 0, spaceKind: null, ...definition,
});
export const CLAN_SHIP_CONTRACTS: readonly ClanShipContractDefinition[] = [
  contract({ id: 'welcome-aboard', kind: 'onboarding', name: 'Une place à bord',
    summary: 'Enregistre ton arrivée, puis rencontre les responsables des soins et des archives.',
    briefing: 'Fais enregistrer ton arrivée, prends connaissance des usages de bord, puis présente-toi au conseil. Le clan te confiera tes premières responsabilités.',
    roomId: 'hangar', steps: CLAN_SHIP_ONBOARDING_STEPS }),
  contract({ id: 'ship-seal-check', kind: 'interior', name: 'Le seuil demeure fermé',
    summary: 'Contrôle une chaîne de confinement entre le hangar, les soins et les archives.',
    briefing: 'Garde du Seuil attend une procédure complète : un témoin isolé ne prouve pas la fermeture du circuit.', clanMarksReward: 15,
    steps: [
      { id: 'seal-read', roomId: 'hangar', label: 'Lire les témoins du sas', description: 'Relève la position des verrous sur le pupitre du hangar.' },
      { id: 'seal-compare', roomId: 'soins', label: 'Comparer le relevé sanitaire', description: 'Vérifie la correspondance du lot avec le registre des soins.' },
      { id: 'seal-register', roomId: 'archives', label: 'Enregistrer la chaîne de contrôle', description: 'Reporte les deux relevés dans le journal de confinement.' },
      { id: 'seal-close', roomId: 'hangar', label: 'Confirmer la fermeture du circuit', description: 'Contrôle de nouveau les témoins au poste du sas.' },
    ] }),
  contract({ id: 'ship-armory-audit', kind: 'interior', name: 'Les armes répondent de leur porteur',
    summary: 'Réconcilie un râtelier et son registre avec Griffe de Fer.',
    briefing: 'Chaque pièce porte une marque. Relève celles du râtelier, compare-les au registre et rends compte à Griffe de Fer.', clanMarksReward: 20,
    steps: [
      { id: 'armory-inventory', roomId: 'armurerie', label: 'Inspecter les scellés du râtelier', description: 'Relève les marques des emplacements de l’arsenal.' },
      { id: 'armory-compare', roomId: 'archives', label: 'Comparer les signatures du registre', description: 'Vérifie les correspondances dans le dossier des équipements.' },
      { id: 'armory-reconcile', roomId: 'armurerie', label: 'Clore l’audit du râtelier', description: 'Valide les emplacements concordants auprès de Griffe de Fer.' },
    ] }),
  contract({ id: 'ship-triage-route', kind: 'interior', name: 'Le chemin du retour',
    summary: 'Prépare et vérifie la route entre le débarquement et le poste de soins.',
    briefing: 'Suture Noire veut préparer le prochain retour de chasse. Vérifie le poste de soins et le passage depuis le hangar avant de lui remettre ton relevé.', clanMarksReward: 20,
    steps: [
      { id: 'triage-prepare', roomId: 'soins', label: 'Préparer le poste de triage', description: 'Vérifie les emplacements du nécessaire d’accueil.' },
      { id: 'triage-route', roomId: 'hangar', label: 'Contrôler le point de transfert', description: 'Vérifie le passage prévu depuis le vaisseau personnel.' },
      { id: 'triage-confirm', roomId: 'soins', label: 'Confirmer le parcours médical', description: 'Rends le relevé de préparation au poste de soins.' },
    ] }),
  contract({ id: 'ship-training-circuit', kind: 'interior', name: 'La trace et le geste',
    summary: 'Prépare un exercice et confronte son objectif aux archives des trophées.',
    briefing: 'Balafre de Cendre te confie la préparation d’un exercice. Observe une trace de chasse dans la galerie et choisis les repères que tu présenteras au vétéran.', clanMarksReward: 20,
    steps: [
      { id: 'training-set', roomId: 'entrainement', label: 'Préparer les repères de l’exercice', description: 'Contrôle la disposition des cibles au poste d’entraînement.' },
      { id: 'training-study', roomId: 'trophees', label: 'Étudier la trace d’une chasse', description: 'Lis le dossier d’exposition et relève les limites de l’exercice.' },
      { id: 'training-brief', roomId: 'entrainement', label: 'Présenter la préparation au vétéran', description: 'Expose les repères retenus à Balafre de Cendre.' },
    ] }),
  contract({ id: 'field-jungle-survey', kind: 'field', name: 'Les traces d’Osiris',
    summary: 'Termine « Sang dans la canopée » avec au moins un scan et 50 points.',
    briefing: 'Trace Froide attend des observations fraîches. Accepte ce mandat, puis repars dans la jungle ; le pisteur examinera tes relevés après une extraction réussie.',
    clanMarksReward: 40, missionId: 'jungle-vey', minimumScore: 50, minimumScans: 1 }),
  contract({ id: 'field-ice-route', kind: 'field', name: 'La route sous la glace',
    summary: 'Termine « Chaleur sous la glace » avec au moins un scan et 50 points.',
    briefing: 'Veille des Astres prépare les prochaines routes du clan. Après avoir accepté son mandat, rapporte une nouvelle chasse réussie et tes observations du terrain gelé.',
    clanMarksReward: 50, missionId: 'ice-cryostalker', minimumScore: 50, minimumScans: 1 }),
  contract({ id: 'field-bad-blood', kind: 'field', name: 'Le dossier des cendres',
    summary: 'Termine « Le dernier rite » avec au moins 60 points.',
    briefing: 'Le conseil te confie un mandat contre le Bad Blood. Reparcours sa piste après avoir accepté le dossier et rapporte le résultat de cette nouvelle chasse.',
    clanMarksReward: 65, missionId: 'volcano-bad-blood', minimumScore: 60, prerequisiteIds: ['field-jungle-survey'] }),
  contract({ id: 'field-ruins-memory', kind: 'field', name: 'Ce que gardent les ruines',
    summary: 'Termine « Les chasseurs de pierre » avec deux scans et au moins 60 points.',
    briefing: 'Les archives gardent encore des questions sur les ruines. Accepte ce mandat, observe leurs gardiens et reviens avec les relevés de ta nouvelle expédition.',
    clanMarksReward: 90, missionId: 'ruins-ancient-guardian', minimumScore: 60, minimumScans: 2, prerequisiteIds: ['field-ice-route'] }),
  contract({ id: 'space-screening', kind: 'space', name: 'Ouvrir un passage sûr',
    summary: 'Conduis une escorte tactique depuis la table du conseil.',
    briefing: 'Des chasseurs reviennent au vaisseau. Identifie la menace, couvre trois segments de leur route puis ordonne l’extraction. Les membres de ton cercle prépareront la formation avec toi.',
    clanMarksReward: 45, spaceKind: 'escort' }),
  contract({ id: 'space-interception', kind: 'space', name: 'L’interception mesurée',
    summary: 'Intercepte un bâtiment hostile avant qu’il ne compromette les routes du clan.',
    briefing: 'Identifie le contact et maîtrise la distance. Réserve assez d’énergie pour neutraliser le bâtiment ou permettre à ton équipe de l’aborder.',
    clanMarksReward: 65, spaceKind: 'interception', prerequisiteIds: ['space-screening'] }),
  contract({ id: 'space-recovery', kind: 'space', name: 'Ramener le signal',
    summary: 'Mène une récupération sous pression puis confirme l’extraction.',
    briefing: 'Une capsule dérive sous la menace d’un bâtiment hostile. Prépare l’approche de l’équipe, sécurise la récupération puis donne le signal d’extraction.',
    clanMarksReward: 55, spaceKind: 'recovery', prerequisiteIds: ['space-screening'] }),
];

export interface ClanShipRecruitDefinition {
  id: ClanShipNpcId; name: string; role: string; roomId: ClanShipRoomId;
  summary: string; effect: string; requiredContractIds: readonly ClanShipContractId[];
  spaceCrewRole: ClanShipSpaceCrewRole; joinLine: string;
}
/** Original French epithets. A recruitment is an agreement after proof, not a purchase. */
export const CLAN_SHIP_RECRUITS: readonly ClanShipRecruitDefinition[] = [
  { id: 'ash-scar', name: 'Balafre de Cendre', role: 'Vétéran des exercices', roomId: 'entrainement',
    summary: 'Il demande une préparation complète avant de rejoindre ton cercle.', effect: 'À l’entraînement ; sa coordination réduit les pertes de la formation pendant les opérations spatiales.',
    requiredContractIds: ['ship-training-circuit'], spaceCrewRole: 'veteran', joinLine: 'Tes gestes ont un but. Je préparerai les prochaines sorties avec toi.' },
  { id: 'star-watch', name: 'Veille des Astres', role: 'Navigatrice', roomId: 'conseil',
    summary: 'Elle attend les données confirmées d’une chasse sur glace.', effect: 'Au conseil ; sa première manœuvre place la formation à portée rapprochée.',
    requiredContractIds: ['field-ice-route'], spaceCrewRole: 'navigator', joinLine: 'Ces relevés méritent une route. Je prendrai place à ta table.' },
  { id: 'iron-claw', name: 'Griffe de Fer', role: 'Armurier', roomId: 'armurerie',
    summary: 'Il vérifie que tu rends compte des équipements confiés.', effect: 'À l’armurerie ; sa préparation renforce les tirs et la neutralisation des moteurs.',
    requiredContractIds: ['ship-armory-audit'], spaceCrewRole: 'armorer', joinLine: 'Tu as rendu leurs marques aux armes. Je suivrai leur préparation.' },
  { id: 'cold-trace', name: 'Trace Froide', role: 'Pisteur des archives', roomId: 'archives',
    summary: 'Il attend une extraction et des observations récentes de la jungle.', effect: 'Aux archives ; il identifie le contact et prépare l’abordage en une seule analyse.',
    requiredContractIds: ['field-jungle-survey'], spaceCrewRole: 'tracker', joinLine: 'La trace subsiste dans ton rapport. Je l’étudierai avec ton cercle.' },
  { id: 'black-suture', name: 'Suture Noire', role: 'Responsable des soins', roomId: 'soins',
    summary: 'Elle demande un parcours médical préparé jusqu’au hangar.', effect: 'Aux soins ; son assistance réduit les pertes de la formation pendant les engagements.',
    requiredContractIds: ['ship-triage-route'], spaceCrewRole: 'medic', joinLine: 'Tu prépares aussi le retour. Je veillerai sur ce passage.' },
  { id: 'threshold-guard', name: 'Garde du Seuil', role: 'Responsable du confinement', roomId: 'hangar',
    summary: 'Il exige que toute la chaîne de confinement ait été contrôlée.', effect: 'Au hangar ; il réduit le coût d’abordage et les pertes du transport ou de la capsule.',
    requiredContractIds: ['ship-seal-check'], spaceCrewRole: 'warden', joinLine: 'Aucun témoin n’a été oublié. Nous garderons ensemble ce seuil.' },
];

export interface ClanShipActiveContract {
  contractId: ClanShipContractId;
  acceptedRevision: number;
  stepIndex: number;
  /** Stable across active-hunt runId rotation on resume. */
  missionEncounterRun: number | null;
  baselineCompletions: number;
}
export type ClanShipContractProof =
  | { kind: 'onboarding' | 'interior'; stepIds: string[] }
  | { kind: 'field'; missionId: MissionId; encounterRun: number; completedAt: string; score: number; scans: number }
  | { kind: 'space'; encounter: ClanShipSpaceEncounter };
export interface ClanShipContractReceipt { contractId: ClanShipContractId; completedRevision: number; proof: ClanShipContractProof }
export interface ClanShipOperationsState {
  version: 1; ownerCreatedAt: string; revision: number;
  onboardingStep: number; mandateAccepted: boolean; circleConfirmed: boolean;
  activeContract: ClanShipActiveContract | null;
  completedContracts: ClanShipContractReceipt[];
  recruitedNpcIds: ClanShipNpcId[];
  spaceEncounter: ClanShipSpaceEncounter | null;
}
export interface ClanShipCampaignEvidence {
  createdAt: string;
  prologue?: { status?: string; chronicle: unknown } | null;
  missionProgress: Partial<Record<MissionId, { status: string; attempts: number; completions: number }>>;
}
export interface ClanShipOperationsContext {
  ownerCreatedAt: string;
  docking: Pick<ClanShipDockingState, 'ownerCreatedAt' | 'status' | 'roomId'> | null;
  campaign: ClanShipCampaignEvidence;
}
type SpaceCommand = Parameters<typeof actClanShipSpaceEncounter>[1];
export type ClanShipOperationsAction = { expectedRevision: number } & (
  | { type: 'onboard-step'; stepId: string }
  | { type: 'accept-mandate' }
  | { type: 'accept-contract'; contractId: ClanShipContractId }
  | { type: 'interior-step'; stepId: string }
  | { type: 'cancel-contract' }
  | { type: 'recruit'; npcId: ClanShipNpcId }
  | { type: 'confirm-circle' }
  | { type: 'space-command'; command: SpaceCommand }
);
export interface ClanShipOperationsResult {
  accepted: boolean; changed: boolean; state: ClanShipOperationsState;
  reason: string | null; message: string; clanMarksReward: number;
}
export interface ClanShipOperationsInspection {
  status: 'absent' | 'valid' | 'future-version' | 'invalid-save';
  state: ClanShipOperationsState | null; reason: string | null;
}
export interface ClanShipOperationsEvaluation { allowed: boolean; reason: string }

const record = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};
const identity = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 160 && value.trim() === value && !/[\x00-\x1f\x7f]/.test(value);
const integer = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) < Number.MAX_SAFE_INTEGER;
const exact = (value: Record<string, unknown>, keys: readonly string[]) => Reflect.ownKeys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const access = (allowed: boolean, reason: string): ClanShipOperationsEvaluation => ({ allowed, reason });
export const clanShipContract = (id: unknown): ClanShipContractDefinition | undefined => CLAN_SHIP_CONTRACTS.find(item => item.id === id);
export const clanShipRecruit = (id: unknown): ClanShipRecruitDefinition | undefined => CLAN_SHIP_RECRUITS.find(item => item.id === id);
const completed = (state: ClanShipOperationsState, id: ClanShipContractId) => state.completedContracts.some(item => item.contractId === id);
const allRecruited = (state: ClanShipOperationsState) => CLAN_SHIP_RECRUITS.every(item => state.recruitedNpcIds.includes(item.id));
const circleReady = (state: ClanShipOperationsState) => allRecruited(state) && state.completedContracts.some(item => item.proof.kind === 'field') && state.completedContracts.some(item => item.proof.kind === 'space');

/** Preserves existing adult saves. The narrative chronicle, never honor, gates a prologue campaign. */
export function evaluateClanShipAccess(campaign: Pick<ClanShipCampaignEvidence, 'prologue'>): ClanShipOperationsEvaluation {
  if (!record(campaign)) return access(false, 'La campagne ne peut pas être relue.');
  if (campaign.prologue == null) return access(true, 'Accès adulte existant conservé.');
  if (!record(campaign.prologue)) return access(false, 'La chronique de campagne est incompatible.');
  const rank = getChronicleRank(campaign.prologue.chronicle);
  return ['blooded', 'elite', 'elder', 'ancient'].includes(rank ?? '')
    ? access(true, 'Rite Blooded reconnu dans la chronique.')
    : access(false, 'Le rite Blooded doit être reconnu avant les opérations autonomes.');
}
export function evaluateClanShipOperationsPhase(campaign: Pick<ClanShipCampaignEvidence, 'prologue'>, state: ClanShipOperationsState | null | undefined): ClanShipOperationsPhase {
  if (!evaluateClanShipAccess(campaign).allowed) return 'blooded-required';
  if (!state || state.onboardingStep < CLAN_SHIP_ONBOARDING_STEPS.length) return 'welcome';
  if (!state.mandateAccepted) return 'mandate';
  return state.circleConfirmed ? 'circle-confirmed' : 'operations';
}
export function createClanShipOperations(ownerCreatedAt: string): ClanShipOperationsState {
  if (!identity(ownerCreatedAt)) throw new TypeError('Une identité de campagne valide est requise.');
  return { version: 1, ownerCreatedAt, revision: 0, onboardingStep: 0, mandateAccepted: false,
    circleConfirmed: false, activeContract: null, completedContracts: [], recruitedNpcIds: [], spaceEncounter: null };
}

function validProof(raw: unknown, definition: ClanShipContractDefinition): boolean {
  if (!record(raw) || raw.kind !== definition.kind) return false;
  if (raw.kind === 'onboarding' || raw.kind === 'interior') {
    return exact(raw, ['kind', 'stepIds']) && Array.isArray(raw.stepIds) && raw.stepIds.length === definition.steps.length &&
      definition.steps.every((step, index) => (raw.stepIds as unknown[])[index] === step.id);
  }
  if (raw.kind === 'field') return exact(raw, ['kind', 'missionId', 'encounterRun', 'completedAt', 'score', 'scans']) &&
    raw.missionId === definition.missionId && integer(raw.encounterRun) && typeof raw.completedAt === 'string' &&
    Number.isFinite(Date.parse(raw.completedAt)) && integer(raw.score) && raw.score >= definition.minimumScore && raw.score <= 100 &&
    integer(raw.scans) && raw.scans >= definition.minimumScans;
  if (raw.kind === 'space') {
    const inspected = inspectClanShipSpaceEncounter(raw.encounter);
    return exact(raw, ['kind', 'encounter']) && inspected.status === 'valid' && inspected.state?.status === 'victory' && inspected.state.kind === definition.spaceKind;
  }
  return false;
}

/** Reject explicit malformed/future state before normalizing at a save boundary. */
export function inspectClanShipOperations(raw: unknown, ownerCreatedAt: string): ClanShipOperationsInspection {
  const invalid = (reason: string): ClanShipOperationsInspection => ({ status: 'invalid-save', state: null, reason });
  if (raw == null) return identity(ownerCreatedAt) ? { status: 'absent', state: null, reason: null } : invalid('invalid-owner');
  if (!record(raw)) return invalid('invalid-record');
  if (integer(raw.version) && raw.version > CLAN_SHIP_OPERATIONS_VERSION) return { status: 'future-version', state: null, reason: 'unsupported-version' };
  if (raw.version !== 1) return invalid('invalid-version');
  if (!exact(raw, ['version', 'ownerCreatedAt', 'revision', 'onboardingStep', 'mandateAccepted', 'circleConfirmed', 'activeContract', 'completedContracts', 'recruitedNpcIds', 'spaceEncounter'])) return invalid('invalid-fields');
  if (!identity(ownerCreatedAt) || raw.ownerCreatedAt !== ownerCreatedAt) return invalid('owner-mismatch');
  if (!integer(raw.revision) || !integer(raw.onboardingStep) || raw.onboardingStep > CLAN_SHIP_ONBOARDING_STEPS.length ||
      typeof raw.mandateAccepted !== 'boolean' || typeof raw.circleConfirmed !== 'boolean') return invalid('invalid-progression');
  if (!Array.isArray(raw.completedContracts) || raw.completedContracts.length > CLAN_SHIP_CONTRACTS.length ||
      !Array.isArray(raw.recruitedNpcIds) || raw.recruitedNpcIds.length > CLAN_SHIP_RECRUITS.length) return invalid('invalid-ledger');
  const ids = new Set<ClanShipContractId>();
  let lastRevision = 0;
  let minimumRevision = raw.onboardingStep + Number(raw.mandateAccepted) + raw.recruitedNpcIds.length + Number(raw.circleConfirmed);
  for (const receipt of raw.completedContracts) {
    if (!record(receipt) || !exact(receipt, ['contractId', 'completedRevision', 'proof'])) return invalid('invalid-receipt');
    if (record(receipt.proof) && receipt.proof.kind === 'space' && inspectClanShipSpaceEncounter(receipt.proof.encounter).status === 'future-version') return { status: 'future-version', state: null, reason: 'unsupported-space-version' };
    const definition = clanShipContract(receipt.contractId);
    if (!definition || ids.has(definition.id) || !integer(receipt.completedRevision) || receipt.completedRevision <= lastRevision || receipt.completedRevision > raw.revision ||
        !definition.prerequisiteIds.every(id => ids.has(id)) || !validProof(receipt.proof, definition)) return invalid('invalid-receipt');
    if (definition.kind !== 'onboarding' && (!raw.mandateAccepted || !ids.has('welcome-aboard'))) return invalid('missing-mandate');
    if (definition.kind === 'onboarding') {
      if (receipt.completedRevision !== CLAN_SHIP_ONBOARDING_STEPS.length) return invalid('impossible-receipt-revision');
    } else {
      const proof = receipt.proof as ClanShipContractProof;
      const commands = 1 + (definition.kind === 'interior' ? definition.steps.length : proof.kind === 'space' ? proof.encounter.turn : 2);
      // One acceptance, then the ordered steps, bound hunt/result or space
      // turns. There cannot be two completed contracts in those same revisions.
      if (receipt.completedRevision < Math.max(lastRevision, CLAN_SHIP_ONBOARDING_STEPS.length + 1) + commands) return invalid('impossible-receipt-revision');
      minimumRevision += commands;
      if (proof.kind === 'space' && proof.encounter.crewRoles.some(role =>
          !CLAN_SHIP_RECRUITS.find(npc => npc.spaceCrewRole === role)?.requiredContractIds.every(id => ids.has(id)))) return invalid('unearned-space-crew');
    }
    ids.add(definition.id); lastRevision = receipt.completedRevision;
  }
  if (ids.has('welcome-aboard') !== (raw.onboardingStep === CLAN_SHIP_ONBOARDING_STEPS.length) ||
      raw.mandateAccepted && !ids.has('welcome-aboard')) return invalid('invalid-onboarding');
  if (!raw.mandateAccepted && raw.revision !== raw.onboardingStep) return invalid('impossible-revision');
  const recruited = new Set<ClanShipNpcId>();
  for (const npcId of raw.recruitedNpcIds) {
    const npc = clanShipRecruit(npcId);
    if (!npc || recruited.has(npc.id) || !raw.mandateAccepted || !npc.requiredContractIds.every(id => ids.has(id))) return invalid('invalid-recruit');
    recruited.add(npc.id);
  }
  const earnedCrew = new Set([...recruited].map(id => clanShipRecruit(id)!.spaceCrewRole));
  for (const receipt of raw.completedContracts as unknown as ClanShipContractReceipt[]) {
    if (receipt.proof.kind === 'space' && receipt.proof.encounter.crewRoles.some(role => !earnedCrew.has(role))) return invalid('unearned-space-crew');
  }
  const inspectedSpace = inspectClanShipSpaceEncounter(raw.spaceEncounter);
  if (inspectedSpace.status === 'future-version') return { status: 'future-version', state: null, reason: 'unsupported-space-version' };
  if (inspectedSpace.status === 'invalid-save') return invalid('invalid-space-encounter');
  if (raw.spaceEncounter !== null && inspectedSpace.status === 'absent') return invalid('invalid-space-encounter');
  if (inspectedSpace.state?.crewRoles.some(role => !earnedCrew.has(role))) return invalid('unearned-space-crew');
  const active = raw.activeContract;
  if (active !== null) {
    if (!record(active) || !exact(active, ['contractId', 'acceptedRevision', 'stepIndex', 'missionEncounterRun', 'baselineCompletions'])) return invalid('invalid-active-contract');
    const definition = clanShipContract(active.contractId);
    if (!definition || definition.kind === 'onboarding' || !raw.mandateAccepted || ids.has(definition.id) ||
        !definition.prerequisiteIds.every(id => ids.has(id)) || !integer(active.acceptedRevision) ||
        active.acceptedRevision <= Math.max(lastRevision, CLAN_SHIP_ONBOARDING_STEPS.length + 1) ||
        active.acceptedRevision > raw.revision || !integer(active.stepIndex) || !integer(active.baselineCompletions) ||
        active.missionEncounterRun !== null && !integer(active.missionEncounterRun)) return invalid('invalid-active-contract');
    if (definition.kind === 'interior' ? active.stepIndex >= definition.steps.length : active.stepIndex !== 0) return invalid('invalid-step');
    if (definition.kind !== 'field' && (active.missionEncounterRun !== null || active.baselineCompletions !== 0)) return invalid('unexpected-field-proof');
    if (definition.kind === 'space') {
      if (!inspectedSpace.state || inspectedSpace.state.kind !== definition.spaceKind || inspectedSpace.state.status !== 'active') return invalid('invalid-active-space');
    } else if (inspectedSpace.state !== null) return invalid('unexpected-space-encounter');
    const commandsAfterAcceptance = Number(active.stepIndex) + Number(active.missionEncounterRun !== null) + (inspectedSpace.state?.turn ?? 0);
    if (active.acceptedRevision + commandsAfterAcceptance > raw.revision) return invalid('impossible-active-revision');
    minimumRevision += 1 + commandsAfterAcceptance;
  } else if (inspectedSpace.state?.status === 'active') return invalid('orphan-active-space');
  if (inspectedSpace.state?.status === 'victory') {
    const receipt = raw.completedContracts.at(-1);
    // Compare canonical encounter data, not the insertion order of JSON keys.
    if (!record(receipt) || !record(receipt.proof) || receipt.proof.kind !== 'space' ||
        JSON.stringify(inspectClanShipSpaceEncounter(receipt.proof.encounter).state) !== JSON.stringify(inspectedSpace.state)) return invalid('unreceipted-space-victory');
  } else if (inspectedSpace.state && inspectedSpace.state.status !== 'active') {
    minimumRevision += 1 + inspectedSpace.state.turn;
    if (raw.revision < Math.max(lastRevision, CLAN_SHIP_ONBOARDING_STEPS.length + 1) + 1 + inspectedSpace.state.turn) return invalid('impossible-space-revision');
  }
  if (inspectedSpace.state && !raw.mandateAccepted) return invalid('space-before-mandate');
  const state = structuredClone(raw) as unknown as ClanShipOperationsState;
  if (state.circleConfirmed && (!state.mandateAccepted || !circleReady(state))) return invalid('invalid-circle');
  // Recruits, recognition and the remaining active/terminal encounter also
  // require their own accepted commands, even when no timestamp is recorded.
  if (state.revision < minimumRevision) return invalid('impossible-revision');
  return { status: 'valid', state, reason: null };
}

/** Final-save boundary only: applyMissionResult temporarily advances the
 * campaign before its contract is settled. Never call this from normalizeSave.
 * Counters are compared to their own saved baselines, not to one another:
 * older campaigns may retain completions from before attempt tracking. */
export function evaluateClanShipOperationsCampaign(state: ClanShipOperationsState, campaign: unknown): ClanShipOperationsEvaluation {
  if (!record(campaign) || !identity(campaign.createdAt) || !record(campaign.missionProgress) ||
      inspectClanShipOperations(state, campaign.createdAt).status !== 'valid') return access(false, 'Le dossier et les chasses doivent appartenir à la même campagne.');
  const missionProgress = campaign.missionProgress;
  const progressFor = (missionId: MissionId) => {
    const progress = missionProgress[missionId];
    return record(progress) && typeof progress.status === 'string' && ['available', 'completed'].includes(progress.status) &&
      Number.isSafeInteger(progress.attempts) && Number(progress.attempts) >= 0 &&
      Number.isSafeInteger(progress.completions) && Number(progress.completions) >= 0 ? progress : null;
  };
  const active = state.activeContract, definition = clanShipContract(active?.contractId);
  if (active && definition?.kind === 'field' && definition.missionId) {
    const progress = progressFor(definition.missionId);
    if (!progress || progress.completions !== active.baselineCompletions ||
        active.missionEncounterRun !== null && progress.attempts !== active.missionEncounterRun) return access(false, 'La chasse suivie ne correspond plus aux compteurs du contrat.');
  }
  for (const receipt of state.completedContracts) {
    if (receipt.proof.kind !== 'field') continue;
    const progress = progressFor(receipt.proof.missionId);
    if (!progress || progress.status !== 'completed' || Number(progress.completions) < 1 ||
        Number(progress.attempts) <= receipt.proof.encounterRun) return access(false, 'Une preuve de contrat ne correspond à aucune chasse accomplie dans cette campagne.');
  }
  return access(true, 'Les contrats correspondent aux chasses de cette campagne.');
}

export function getClanShipActiveStep(state: ClanShipOperationsState): ClanShipOperationStep | null {
  if (state.onboardingStep < CLAN_SHIP_ONBOARDING_STEPS.length) return CLAN_SHIP_ONBOARDING_STEPS[state.onboardingStep] ?? null;
  const definition = clanShipContract(state.activeContract?.contractId);
  return definition?.kind === 'interior' ? definition.steps[state.activeContract?.stepIndex ?? 0] ?? null : null;
}
export function evaluateClanShipContract(state: ClanShipOperationsState, id: ClanShipContractId, campaign: ClanShipCampaignEvidence): ClanShipOperationsEvaluation {
  const definition = clanShipContract(id);
  if (!definition) return access(false, 'Contrat inconnu.');
  if (definition.kind === 'onboarding') return access(false, 'L’accueil se poursuit directement aux postes indiqués.');
  if (!evaluateClanShipAccess(campaign).allowed || !state.mandateAccepted) return access(false, 'Reçois le mandat du conseil après l’accueil à bord.');
  if (completed(state, id)) return access(false, 'Ce contrat est déjà accompli.');
  if (state.activeContract) return access(false, 'Un contrat est déjà suivi. Termine-le ou retire-le au conseil.');
  const missing = definition.prerequisiteIds.find(required => !completed(state, required));
  if (missing) return access(false, `Dossier requis : ${clanShipContract(missing)?.name ?? missing}.`);
  if (definition.missionId) {
    if (!record(campaign.missionProgress)) return access(false, 'La progression des chasses est incompatible.');
    const progress = campaign.missionProgress[definition.missionId];
    if (!progress || !['available', 'completed'].includes(progress.status) || !integer(progress.attempts) || !integer(progress.completions)) return access(false, 'Cette chasse doit être accessible dans la campagne.');
  }
  return access(true, 'Contrat disponible à la table du conseil.');
}
export function evaluateClanShipRecruit(state: ClanShipOperationsState, id: ClanShipNpcId): ClanShipOperationsEvaluation {
  const npc = clanShipRecruit(id);
  if (!npc) return access(false, 'Membre du clan inconnu.');
  if (state.recruitedNpcIds.includes(id)) return access(false, 'Ce membre a déjà rejoint ton cercle.');
  if (!state.mandateAccepted) return access(false, 'Le conseil doit d’abord confier un mandat.');
  const missing = npc.requiredContractIds.find(required => !completed(state, required));
  return missing ? access(false, `Preuve attendue : ${clanShipContract(missing)?.name ?? missing}.`) : access(true, `Rencontre ${npc.name} à son poste pour proposer le recrutement.`);
}

const refused = (state: ClanShipOperationsState, reason: string, message: string): ClanShipOperationsResult => ({ accepted: false, changed: false, state, reason, message, clanMarksReward: 0 });
const unchanged = (state: ClanShipOperationsState, message: string): ClanShipOperationsResult => ({ accepted: true, changed: false, state, reason: null, message, clanMarksReward: 0 });
function changed(state: ClanShipOperationsState, patch: Partial<ClanShipOperationsState>, message: string, clanMarksReward = 0): ClanShipOperationsResult {
  if (state.revision >= Number.MAX_SAFE_INTEGER - 1) return refused(state, 'revision-exhausted', 'Le compteur d’opérations ne peut plus avancer.');
  const next = { ...state, ...patch, revision: state.revision + 1 };
  return { accepted: true, changed: true, state: next, reason: null, message, clanMarksReward };
}
function receiptFor(state: ClanShipOperationsState, definition: ClanShipContractDefinition, proof: ClanShipContractProof): ClanShipContractReceipt {
  return { contractId: definition.id, completedRevision: state.revision + 1, proof };
}
function finishContract(state: ClanShipOperationsState, definition: ClanShipContractDefinition, proof: ClanShipContractProof, spaceEncounter: ClanShipSpaceEncounter | null = null): ClanShipOperationsResult {
  return changed(state, { activeContract: null, completedContracts: [...state.completedContracts, receiptFor(state, definition, proof)], spaceEncounter },
    `${definition.name} : dossier accompli. Les membres concernés attendent ta proposition à leur poste.`, definition.clanMarksReward);
}
function validAction(action: unknown): action is ClanShipOperationsAction {
  if (!record(action) || !integer(action.expectedRevision)) return false;
  const base = ['type', 'expectedRevision'];
  if (action.type === 'onboard-step' || action.type === 'interior-step') return exact(action, [...base, 'stepId']) && identity(action.stepId);
  if (action.type === 'accept-contract') return exact(action, [...base, 'contractId']) && !!clanShipContract(action.contractId);
  if (action.type === 'recruit') return exact(action, [...base, 'npcId']) && !!clanShipRecruit(action.npcId);
  if (action.type === 'space-command') return exact(action, [...base, 'command']) && record(action.command);
  return exact(action, base) && ['accept-mandate', 'cancel-contract', 'confirm-circle'].includes(String(action.type));
}

/** Caller acknowledges only after one durable write of state + currency. */
export function actClanShipOperations(state: ClanShipOperationsState, action: ClanShipOperationsAction, context: ClanShipOperationsContext): ClanShipOperationsResult {
  if (!record(context) || !identity(context.ownerCreatedAt) || !record(context.campaign) || context.campaign.createdAt !== context.ownerCreatedAt ||
      !record(context.campaign.missionProgress)) return refused(state, 'invalid-context', 'La campagne courante est incompatible.');
  const inspected = inspectClanShipOperations(state, context.ownerCreatedAt);
  if (inspected.status !== 'valid') return refused(state, inspected.status, 'Le dossier enregistré ne peut pas être modifié.');
  if (!validAction(action)) return refused(state, 'invalid-action', 'Commande d’opération invalide.');
  if (action.expectedRevision !== state.revision) return refused(state, 'stale-revision', 'Le dossier a changé. Relis la table avant cette action.');
  if (!evaluateClanShipAccess(context.campaign).allowed) return refused(state, 'blooded-required', 'Le rite Blooded doit être reconnu avant cette opération.');
  if (!context.docking || context.docking.ownerCreatedAt !== state.ownerCreatedAt || context.docking.status !== 'aboard') return refused(state, 'not-aboard', 'Cette action exige ta présence à bord.');
  const at = (roomId: ClanShipRoomId) => context.docking?.roomId === roomId;
  const wrongRoom = () => refused(state, 'wrong-room', 'Rejoins le poste indiqué avant cette action.');
  switch (action.type) {
    case 'onboard-step': {
      const step = CLAN_SHIP_ONBOARDING_STEPS[state.onboardingStep];
      if (!step || step.id !== action.stepId) return refused(state, 'wrong-step', 'Poursuis la prochaine étape de l’accueil.');
      if (!at(step.roomId)) return wrongRoom();
      const onboardingStep = state.onboardingStep + 1;
      return changed(state, { onboardingStep, ...(onboardingStep === CLAN_SHIP_ONBOARDING_STEPS.length ? {
        completedContracts: [...state.completedContracts, receiptFor(state, clanShipContract('welcome-aboard')!, { kind: 'onboarding', stepIds: CLAN_SHIP_ONBOARDING_STEPS.map(item => item.id) })],
      } : {}) }, onboardingStep === CLAN_SHIP_ONBOARDING_STEPS.length ? 'Accueil enregistré. Le conseil peut maintenant te confier un mandat.' : 'Contrôle enregistré. Rejoins le poste suivant.');
    }
    case 'accept-mandate':
      if (!at('conseil')) return wrongRoom();
      if (state.mandateAccepted || !completed(state, 'welcome-aboard')) return refused(state, 'mandate-unavailable', 'Le mandat exige l’accueil complet et ne se reçoit qu’une fois.');
      return changed(state, { mandateAccepted: true }, 'Le conseil confie un mandat d’opération. Le vaisseau reste celui du clan.');
    case 'accept-contract': {
      if (!at('conseil')) return wrongRoom();
      const evaluated = evaluateClanShipContract(state, action.contractId, context.campaign);
      if (!evaluated.allowed) return refused(state, 'contract-unavailable', evaluated.reason);
      const definition = clanShipContract(action.contractId)!;
      const roles = state.recruitedNpcIds.map(id => clanShipRecruit(id)!.spaceCrewRole);
      return changed(state, { activeContract: { contractId: definition.id, acceptedRevision: state.revision + 1, stepIndex: 0,
        missionEncounterRun: null, baselineCompletions: definition.missionId ? context.campaign.missionProgress[definition.missionId]!.completions : 0 },
        spaceEncounter: definition.spaceKind ? createClanShipSpaceEncounter(definition.spaceKind, roles) : null },
      definition.kind === 'field' ? 'Contrat accepté. Rejoins le hangar, désamarre, puis lance la chasse indiquée.' : 'Contrat accepté. Ses objectifs sont maintenant suivis.');
    }
    case 'interior-step': {
      const definition = clanShipContract(state.activeContract?.contractId);
      const step = definition?.steps[state.activeContract?.stepIndex ?? -1];
      if (!definition || definition.kind !== 'interior' || !step || step.id !== action.stepId || !state.activeContract) return refused(state, 'wrong-step', 'Cette étape ne correspond pas au contrat suivi.');
      if (!at(step.roomId)) return wrongRoom();
      if (state.activeContract.stepIndex + 1 === definition.steps.length) return finishContract(state, definition, { kind: 'interior', stepIds: definition.steps.map(item => item.id) });
      return changed(state, { activeContract: { ...state.activeContract, stepIndex: state.activeContract.stepIndex + 1 } }, 'Contrôle enregistré. Poursuis le circuit au poste suivant.');
    }
    case 'cancel-contract':
      if (!at('conseil')) return wrongRoom();
      if (!state.activeContract) return refused(state, 'no-active-contract', 'Aucun contrat ne peut être retiré.');
      if (state.activeContract.missionEncounterRun !== null) return refused(state, 'hunt-in-progress', 'La chasse liée doit être terminée ou abandonnée avant le retrait du contrat.');
      return changed(state, { activeContract: null, spaceEncounter: null }, 'Contrat retiré sans preuve ni récompense.');
    case 'recruit': {
      const evaluated = evaluateClanShipRecruit(state, action.npcId);
      if (!evaluated.allowed) return refused(state, 'recruit-unavailable', evaluated.reason);
      const npc = clanShipRecruit(action.npcId)!;
      if (!at(npc.roomId)) return wrongRoom();
      return changed(state, { recruitedNpcIds: [...state.recruitedNpcIds, npc.id] }, `${npc.name} : « ${npc.joinLine} »`);
    }
    case 'confirm-circle':
      if (!at('conseil')) return wrongRoom();
      if (state.circleConfirmed || !circleReady(state)) return refused(state, 'circle-incomplete', 'Le cercle demande les six accords, une chasse de contrat et une opération spatiale accomplies.');
      return changed(state, { circleConfirmed: true }, 'Le conseil reconnaît ton cercle d’expédition. Aucun rang ni titre de propriété n’a changé.');
    case 'space-command': {
      if (!at('conseil')) return wrongRoom();
      const definition = clanShipContract(state.activeContract?.contractId);
      if (!definition || definition.kind !== 'space' || !state.spaceEncounter) return refused(state, 'no-space-encounter', 'Aucune opération spatiale active.');
      const result = actClanShipSpaceEncounter(state.spaceEncounter, action.command);
      if (!result.accepted || !result.changed) return refused(state, result.reason ?? 'space-command-refused', result.message);
      if (result.state.status === 'victory') return finishContract(state, definition, { kind: 'space', encounter: result.state }, result.state);
      if (result.state.status === 'defeat' || result.state.status === 'withdrawn') return changed(state, { activeContract: null, spaceEncounter: result.state }, result.message);
      return changed(state, { spaceEncounter: result.state }, result.message);
    }
  }
}

export interface ClanShipMissionBinding { ownerCreatedAt: string; missionId: MissionId; encounterRun: number; expectedRevision: number }
function validMissionBinding(binding: unknown): binding is ClanShipMissionBinding {
  return record(binding) && exact(binding, ['ownerCreatedAt', 'missionId', 'encounterRun', 'expectedRevision']) &&
    identity(binding.ownerCreatedAt) && identity(binding.missionId) && integer(binding.encounterRun) && integer(binding.expectedRevision);
}
/** Call in the same transaction that creates planetArrival + its frozen run. */
export function bindClanShipMission(state: ClanShipOperationsState, binding: ClanShipMissionBinding): ClanShipOperationsResult {
  if (!validMissionBinding(binding)) return refused(state, 'invalid-binding', 'Le départ ne possède pas d’identité de rencontre valide.');
  if (inspectClanShipOperations(state, binding.ownerCreatedAt).status !== 'valid') return refused(state, 'invalid-state', 'Le dossier ne peut pas être lié à ce départ.');
  if (binding.expectedRevision !== state.revision) return refused(state, 'stale-revision', 'Le contrat a changé avant le départ.');
  const definition = clanShipContract(state.activeContract?.contractId);
  if (!definition || definition.kind !== 'field' || definition.missionId !== binding.missionId || !state.activeContract) return unchanged(state, 'Ce départ ne concerne pas le contrat suivi.');
  if (state.activeContract.missionEncounterRun !== null) return state.activeContract.missionEncounterRun === binding.encounterRun
    ? unchanged(state, 'Cette rencontre est déjà liée au contrat.') : refused(state, 'already-bound', 'Une autre rencontre est encore liée à ce contrat.');
  return changed(state, { activeContract: { ...state.activeContract, missionEncounterRun: binding.encounterRun } }, 'Le contrat suit cette rencontre de campagne.');
}
/** Release only after the caller has verified and retired this exact recovery
 * session. A death screen with an in-place retry is not a retired encounter.
 * Persist this result with the recovery retirement, never separately. */
export function releaseClanShipMissionBinding(state: ClanShipOperationsState, binding: ClanShipMissionBinding): ClanShipOperationsResult {
  if (!validMissionBinding(binding)) return refused(state, 'invalid-binding', 'La reprise ne possède pas d’identité de rencontre valide.');
  if (inspectClanShipOperations(state, binding.ownerCreatedAt).status !== 'valid') return refused(state, 'invalid-state', 'Le dossier ne peut pas libérer cette reprise.');
  if (binding.expectedRevision !== state.revision) return refused(state, 'stale-revision', 'Le contrat a changé avant le retrait de la reprise.');
  const active = state.activeContract, definition = clanShipContract(active?.contractId);
  if (!active || definition?.kind !== 'field' || definition.missionId !== binding.missionId) return unchanged(state, 'Cette reprise ne concerne pas le contrat suivi.');
  if (active.missionEncounterRun === null) return unchanged(state, 'Le contrat ne suit plus de rencontre.');
  if (active.missionEncounterRun !== binding.encounterRun) return refused(state, 'encounter-mismatch', 'Une autre rencontre est encore liée à ce contrat.');
  return changed(state, { activeContract: { ...active, missionEncounterRun: null } }, 'Reprise retirée sans preuve ni récompense. Le contrat reste disponible pour une nouvelle sortie.');
}
export interface ClanShipMissionEvidence {
  missionId: MissionId; outcome: string; score: number; scans: number; completedAt: string;
}
export interface ClanShipHuntSessionEvidence { ownerSaveCreatedAt: string; missionId: string; encounterRun: number }
/** Only after checkHuntSessionForSettlement + applyMissionResult. A raw "success"
 * or old aggregate statistics cannot create this receipt. The caller persists
 * the returned state and reward with the accepted mission result in one write. */
export function settleClanShipMission(state: ClanShipOperationsState, before: ClanShipCampaignEvidence, progressed: ClanShipCampaignEvidence,
  result: ClanShipMissionEvidence, session: ClanShipHuntSessionEvidence | null): ClanShipOperationsResult {
  if (!record(before) || !record(progressed) || !record(before.missionProgress) || !record(progressed.missionProgress) ||
      inspectClanShipOperations(state, before.createdAt).status !== 'valid' || progressed.createdAt !== before.createdAt) return refused(state, 'invalid-owner', 'Le résultat et le contrat doivent appartenir à la même campagne.');
  const active = state.activeContract, definition = clanShipContract(active?.contractId);
  if (!active || !definition || definition.kind !== 'field') return unchanged(state, 'Aucun contrat de terrain ne suit cette chasse.');
  if (!record(result) || definition.missionId !== result.missionId) return unchanged(state, 'Cette chasse ne concerne pas le contrat suivi.');
  const previous = before.missionProgress[result.missionId], next = progressed.missionProgress[result.missionId];
  if (!session || session.ownerSaveCreatedAt !== state.ownerCreatedAt || session.missionId !== result.missionId ||
      !integer(session.encounterRun) || active.missionEncounterRun !== session.encounterRun || !record(previous) || !record(next) ||
      previous.attempts !== session.encounterRun || previous.completions !== active.baselineCompletions ||
      !['available', 'completed'].includes(previous.status) || !integer(previous.attempts) || !integer(previous.completions) ||
      !Number.isSafeInteger(next.attempts) || !Number.isSafeInteger(next.completions) ||
      next.attempts !== previous.attempts + 1) return refused(state, 'unproven-encounter', 'La progression ne confirme pas la rencontre liée au contrat.');
  const success = result.outcome === 'success' && next.completions === previous.completions + 1 && next.status === 'completed';
  const failed = ['failed', 'abandoned'].includes(result.outcome) && next.completions === previous.completions && next.status === previous.status;
  if (!success && !failed) return refused(state, 'unproven-result', 'Le résultat n’a pas été accepté par la progression de campagne.');
  if (success && integer(result.score) && result.score <= 100 && result.score >= definition.minimumScore && integer(result.scans) &&
      result.scans >= definition.minimumScans && typeof result.completedAt === 'string' && Number.isFinite(Date.parse(result.completedAt))) {
    return finishContract(state, definition, { kind: 'field', missionId: result.missionId, encounterRun: session.encounterRun,
      completedAt: result.completedAt, score: result.score, scans: result.scans });
  }
  return changed(state, { activeContract: { ...active, missionEncounterRun: null, baselineCompletions: next.completions } },
    success ? 'Chasse enregistrée ; les exigences du contrat restent à remplir lors d’une nouvelle sortie.' : 'Sortie terminée sans preuve de contrat. Une nouvelle tentative reste possible.');
}
