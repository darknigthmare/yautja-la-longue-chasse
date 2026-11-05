import type { ClanShipDockingState, ClanShipRoomId } from './clanShipDocking';
import {
  CLAN_SHIP_INTERIOR_METRICS, isClanShipInteriorWalkable,
  type ClanShipInteriorPoint,
} from './clanShipInterior';
import {
  clanShipContract, evaluateClanShipAccess, evaluateClanShipOperationsCampaign, inspectClanShipOperations,
  type ClanShipCampaignEvidence, type ClanShipContractId, type ClanShipNpcId, type ClanShipOperationsState,
} from './clanShipOperations';

/** Four authored local incidents in this clan's continuity, not universal Yautja
 * doctrine. Save only evidence/decisions and safe escort checkpoints. World
 * positions are fresh scene observations, never a durable or online authority. */
export const CLAN_SHIP_INCIDENTS_VERSION = 1 as const;
export const CLAN_SHIP_INCIDENT_IDS = ['seal-discrepancy', 'relay-flicker', 'trophy-provenance', 'return-transfer'] as const;
export type ClanShipIncidentId = typeof CLAN_SHIP_INCIDENT_IDS[number];
export interface ClanShipIncidentChoice { id: string; label: string; description: string }
export interface ClanShipIncidentStep {
  id: string;
  kind: 'interact' | 'choice' | 'escort-checkpoint';
  targetId: string;
  label: string;
  description: string;
  evidence: string;
  choices?: readonly ClanShipIncidentChoice[];
  correctChoiceId?: string;
  rejection?: string;
}
export interface ClanShipIncidentDefinition {
  id: ClanShipIncidentId;
  name: string;
  summary: string;
  briefing: string;
  originRoomId: ClanShipRoomId;
  sourceNpcId: ClanShipNpcId;
  prerequisiteContractId: ClanShipContractId;
  clanMarksReward: number;
  completion: string;
  steps: readonly ClanShipIncidentStep[];
}
export interface ClanShipIncidentTarget {
  id: string;
  incidentId: ClanShipIncidentId;
  roomId: ClanShipRoomId;
  position: ClanShipInteriorPoint;
  label: string;
  description: string;
  art: 'cargo' | 'relay' | 'tablet' | 'console' | 'medical' | 'crew' | 'checkpoint';
}

export const CLAN_SHIP_INCIDENTS: readonly ClanShipIncidentDefinition[] = [
  {
    id: 'seal-discrepancy', name: 'Le scellé qui ment', originRoomId: 'hangar', sourceNpcId: 'threshold-guard',
    prerequisiteContractId: 'ship-seal-check', clanMarksReward: 8,
    summary: 'Un témoin de fermeture contredit le registre d’un lot de retour.',
    briefing: 'Garde du Seuil maintient le lot sous restriction. Examine son marquage, confronte le registre, puis contrôle l’isolateur et la pression. Le passage du hangar reste libre.',
    completion: 'Garde du Seuil : « Tu as suivi les témoins jusqu’au bout. Ce lot peut rejoindre la réserve. »',
    steps: [
      { id: 'seal-witness', kind: 'interact', targetId: 'seal-cargo', label: 'Examiner le témoin du lot',
        description: 'Approche le conteneur de retour au hangar et compare les marques du témoin.',
        evidence: 'Lot de retour 17 : trois traits sur la fermeture. Le témoin montre la voie amont encore reliée, malgré la mention « isolé ».' },
      { id: 'seal-record', kind: 'interact', targetId: 'seal-manifest', label: 'Lire le manifeste du lot',
        description: 'Aux archives, retrouve le registre du lot 17 et son isolateur associé.',
        evidence: 'Registre du lot 17 : le marquage à trois traits désigne l’isolateur amont. L’isolateur aval appartient au lot voisin, marqué d’un cercle.' },
      { id: 'seal-isolation', kind: 'choice', targetId: 'seal-isolator', label: 'Choisir l’isolateur du lot 17',
        description: 'Au hangar, confronte les deux marques avec tes relevés avant d’isoler le lot.',
        evidence: 'L’isolateur amont à trois traits est fermé. Le lot reste sous restriction jusqu’au contrôle de pression.',
        choices: [
          { id: 'upstream', label: 'Isolateur amont · trois traits', description: 'Couper la voie portant les mêmes marques que le lot 17.' },
          { id: 'downstream', label: 'Isolateur aval · cercle', description: 'Couper la voie du lot voisin.' },
        ], correctChoiceId: 'upstream', rejection: 'La voie à cercle appartient à un autre lot. Le lot 17 reste sous restriction ; les indices sont conservés. Reprends le diagnostic de ses trois traits.' },
      { id: 'seal-pressure', kind: 'interact', targetId: 'seal-pressure', label: 'Contrôler la pression résiduelle',
        description: 'Rejoins le terminal médical raccordé au témoin du lot 17.',
        evidence: 'Le relevé distant confirme une pression résiduelle nulle pour le lot 17. Le contrôle est daté après la fermeture de l’isolateur amont.' },
      { id: 'seal-closure', kind: 'interact', targetId: 'seal-cargo', label: 'Vérifier la fermeture au hangar',
        description: 'Reviens auprès du conteneur pour confronter son témoin avec le dernier relevé.',
        evidence: 'Fermeture vérifiée au conteneur : les trois traits correspondent au registre et le contrôle de pression est acquis.' },
    ],
  },
  {
    id: 'relay-flicker', name: 'Une lumière dans le relais', originRoomId: 'armurerie', sourceNpcId: 'iron-claw',
    prerequisiteContractId: 'ship-armory-audit', clanMarksReward: 10,
    summary: 'Une projection du conseil reçoit un cycle d’alimentation instable.',
    briefing: 'Griffe de Fer demande un diagnostic du relais local. Lis les deux cycles sans urgence, isole la branche fautive puis remplace son module. Les autres services du conseil restent accessibles.',
    completion: 'Griffe de Fer : « Un témoin stable vaut mieux qu’une projection éclatante. Le relais répond. »',
    steps: [
      { id: 'relay-cycle', kind: 'interact', targetId: 'relay-console', label: 'Relever le cycle du relais',
        description: 'Approche le terminal secondaire du conseil. Son cycle est aussi décrit par écrit.',
        evidence: 'Branche A : deux impulsions, pause. Branche B : une impulsion, pause. Le module de la branche B signale une coupure ; le témoin A reste stable.' },
      { id: 'relay-reference', kind: 'interact', targetId: 'relay-reference', label: 'Comparer le schéma d’archive',
        description: 'Lis le schéma du relais aux archives pour identifier la branche à isoler et l’ordre de ses deux contacts.',
        evidence: 'Schéma local : A fournit le repère stable. B doit reproduire deux impulsions. Pour le module B, le contact trois-traits précède le contact cercle.' },
      { id: 'relay-isolate', kind: 'choice', targetId: 'relay-console', label: 'Isoler la branche défaillante',
        description: 'Le terminal permet d’isoler A ou B. Appuie ta décision sur les deux relevés.',
        evidence: 'La branche B défaillante est isolée ; la référence A reste alimentée.',
        choices: [
          { id: 'branch-a', label: 'Isoler A', description: 'Couper le repère à deux impulsions.' },
          { id: 'branch-b', label: 'Isoler B', description: 'Couper la branche dont le module signale la coupure.' },
        ], correctChoiceId: 'branch-b', rejection: 'A est le repère stable. Le test reste arrêté et les relevés restent disponibles : la coupure signalée concerne B.' },
      { id: 'relay-component', kind: 'interact', targetId: 'relay-component', label: 'Prendre le module B de remplacement',
        description: 'À l’armurerie, récupère la cartouche identifiée B, après l’isolement de sa branche.',
        evidence: 'Une cartouche B identifiée a été confiée par l’armurerie. Elle est réservée à ce relais ; un nouveau passage ne crée pas une seconde pièce.' },
      { id: 'relay-permutation', kind: 'choice', targetId: 'relay-console', label: 'Raccorder les deux contacts',
        description: 'Au conseil, place le module en suivant l’ordre lu sur le schéma.',
        evidence: 'Le module B est installé avec trois-traits avant cercle. Son test de signal reste à effectuer.',
        choices: [
          { id: 'marks-circle', label: 'Trois traits → cercle', description: 'Reproduire l’ordre du schéma du module B.' },
          { id: 'circle-marks', label: 'Cercle → trois traits', description: 'Inverser les deux contacts du module B.' },
        ], correctChoiceId: 'marks-circle', rejection: 'Le test refuse cet ordre. La cartouche et les relevés sont conservés ; seul le raccordement reste à corriger selon le schéma.' },
      { id: 'relay-signal', kind: 'interact', targetId: 'relay-console', label: 'Contrôler le signal restauré',
        description: 'Relève les deux cycles au terminal. Le résultat reste lisible sans suivre une animation rapide.',
        evidence: 'A et B donnent deux impulsions puis une pause. La projection locale est stable après le test du module installé.' },
    ],
  },
  {
    id: 'trophy-provenance', name: 'La trace du véritable porteur', originRoomId: 'archives', sourceNpcId: 'cold-trace',
    prerequisiteContractId: 'field-ruins-memory', clanMarksReward: 10,
    summary: 'Deux relevés attribuent différemment le portage d’un trophée de retour.',
    briefing: 'Trace Froide veut identifier le porteur de ce lot précis. La marque de chasse et la marque de transport ne désignent pas forcément le même membre. Aucun trophée de ta collection ne sera déplacé.',
    completion: 'Trace Froide : « Le relevé distingue enfin la prise de son retour. » Balafre de Cendre : « Une mémoire précise ne retire rien à la chasse. »',
    steps: [
      { id: 'provenance-support', kind: 'interact', targetId: 'provenance-support', label: 'Examiner la marque du support',
        description: 'Dans la galerie, examine la tablette attachée au support du lot retrouvé.',
        evidence: 'Le support porte une marque de prise en chevrons et, sous la sangle, trois traits plus récents. La sangle appartient au transport de retour.' },
      { id: 'provenance-record-a', kind: 'interact', targetId: 'provenance-record-a', label: 'Lire le relevé de la prise',
        description: 'Consulte le premier relevé aux archives : il traite de la chasse avant l’extraction.',
        evidence: 'Relevé de prise : la marque en chevrons correspond au chasseur ayant abattu la proie. Ce document ne nomme pas le porteur lors du retour.' },
      { id: 'provenance-record-b', kind: 'interact', targetId: 'provenance-record-b', label: 'Lire le registre de transfert',
        description: 'Compare le second relevé, établi après la collecte du lot.',
        evidence: 'Registre de transfert : Trace Froide a porté le lot vers l’extraction et ajouté trois traits sur la sangle. Son nom ne remplace pas celui du chasseur dans le relevé de prise.' },
      { id: 'provenance-testimony', kind: 'interact', targetId: 'provenance-veteran', label: 'Entendre Balafre de Cendre',
        description: 'Rejoins le cercle d’entraînement pour écouter le témoin du retour.',
        evidence: 'Balafre de Cendre : « J’ai vu Trace Froide reprendre la sangle à trois traits après la chasse. Le porteur du retour et l’auteur de la prise sont bien deux rôles distincts. »' },
      { id: 'provenance-conclusion', kind: 'choice', targetId: 'provenance-support', label: 'Formuler la provenance du support',
        description: 'La conclusion doit expliquer les deux marques et les deux relevés, sans effacer leur différence.',
        evidence: 'Conclusion motivée : la marque en chevrons conserve l’attribution de la chasse ; Trace Froide est identifié comme porteur du retour par les trois traits, le registre et le témoignage.',
        choices: [
          { id: 'distinct-roles', label: 'Distinguer la prise et le portage', description: 'Conserver la marque de chasse ; attribuer le transport de retour à Trace Froide.' },
          { id: 'replace-hunter', label: 'Attribuer aussi la chasse à Trace Froide', description: 'Employer la marque de transport pour remplacer l’auteur de la prise.' },
          { id: 'erase-transfer', label: 'Écarter le relevé de transport', description: 'Retenir seulement la marque la plus ancienne.' },
        ], correctChoiceId: 'distinct-roles', rejection: 'Cette conclusion ne rend pas compte des deux fonctions des marques. Les relevés et le témoignage sont conservés : distingue la prise et son transport.' },
      { id: 'provenance-register', kind: 'interact', targetId: 'provenance-support', label: 'Consigner l’attribution au support',
        description: 'Valide la notice de ce support après la conclusion motivée.',
        evidence: 'La notice du support conserve les deux attributions et leurs témoins. Aucun trophée historique du joueur n’est retiré.' },
    ],
  },
  {
    id: 'return-transfer', name: 'Le retour que l’on prépare', originRoomId: 'soins', sourceNpcId: 'black-suture',
    prerequisiteContractId: 'space-recovery', clanMarksReward: 12,
    summary: 'Préparer l’accueil puis accompagner un membre de l’équipe jusqu’aux soins.',
    briefing: 'Après la récupération spatiale, Suture Noire prépare un contrôle de retour avec Garde du Seuil. Accompagne le membre visible de l’équipe depuis le hangar. Ce contrôle n’invente aucune blessure ni perte individuelle de l’engagement précédent.',
    completion: 'Suture Noire : « Le transfert est terminé et le relevé est transmis. L’équipe peut reprendre son souffle. »',
    steps: [
      { id: 'return-prepare', kind: 'interact', targetId: 'return-medical', label: 'Préparer la zone d’accueil',
        description: 'Rejoins la baie médicale et vérifie la zone d’usage devant le poste. La porte vers le hangar doit rester libre.',
        evidence: 'Le poste médical est prêt et son approche dégagée. Il communique avec le hangar par la porte de gauche du hangar, du côté du poste de transfert proche.' },
      { id: 'return-transfer-choice', kind: 'choice', targetId: 'return-transfer', label: 'Choisir le point de transfert',
        description: 'Au hangar, choisis le point qui garde le passage direct vers les soins.',
        evidence: 'Le point proche de la porte des soins est retenu ; le couloir de fret reste hors du trajet du groupe.',
        choices: [
          { id: 'near-medical', label: 'Point proche des soins', description: 'Prendre le passage de gauche vers la baie médicale, déjà dégagée.' },
          { id: 'freight-lane', label: 'Point du couloir de fret', description: 'Allonger le transfert au milieu des mouvements de chargement.' },
        ], correctChoiceId: 'near-medical', rejection: 'Ce point n’utilise pas la voie dégagée vers les soins. La préparation reste acquise ; choisis le point proche de la porte médicale.' },
      { id: 'return-pickup', kind: 'interact', targetId: 'return-transfer', label: 'Prendre en charge le membre de l’équipe',
        description: 'Approche le point de transfert et attends que le membre de l’équipe t’accompagne. Il suit ton déplacement dans le hangar.',
        evidence: 'Le membre de l’équipe est pris en charge au point de transfert. La reprise peut revenir à ce point sûr jusqu’au prochain contrôle de passage.' },
      { id: 'hangar-door', kind: 'escort-checkpoint', targetId: 'return-hangar-door', label: 'Accompagner jusqu’à la porte des soins',
        description: 'Conduis le groupe à la porte gauche du hangar. Attends que le membre suiveur rejoigne aussi le seuil.',
        evidence: 'Le joueur et le membre accompagné ont atteint ensemble le seuil du hangar vers les soins.' },
      { id: 'medical-entry', kind: 'escort-checkpoint', targetId: 'return-medical-entry', label: 'Faire entrer le groupe dans les soins',
        description: 'Franchis la porte vers les soins avec le groupe, puis rejoins le seuil intérieur avec lui.',
        evidence: 'Le groupe a franchi le passage et rejoint le seuil intérieur de la baie médicale.' },
      { id: 'medical-station', kind: 'escort-checkpoint', targetId: 'return-medical', label: 'Accompagner jusqu’au poste préparé',
        description: 'Avance vers la zone d’accueil et attends le membre suivi. Sa présence près du poste termine le transfert physique.',
        evidence: 'Le joueur et le membre accompagné ont atteint le poste préparé. Le transfert physique est terminé ; le conseil attend encore le relevé.' },
      { id: 'return-report', kind: 'interact', targetId: 'return-report', label: 'Présenter le relevé au conseil',
        description: 'Rejoins la table du conseil après l’arrivée physique de l’équipe aux soins.',
        evidence: 'Le conseil reçoit le relevé des quatre points sûrs du transfert et confirme l’arrivée du membre accompagné aux soins.' },
    ],
  },
];

export const CLAN_SHIP_INCIDENT_TARGETS: readonly ClanShipIncidentTarget[] = [
  { id: 'seal-cargo', incidentId: 'seal-discrepancy', roomId: 'hangar', position: { x: 410, y: 650 }, art: 'cargo', label: 'Lot de retour 17', description: 'Conteneur sous restriction, marqué de trois traits.' },
  { id: 'seal-manifest', incidentId: 'seal-discrepancy', roomId: 'archives', position: { x: 410, y: 650 }, art: 'tablet', label: 'Manifeste du lot 17', description: 'Identité du lot et voie d’isolement associée.' },
  { id: 'seal-isolator', incidentId: 'seal-discrepancy', roomId: 'hangar', position: { x: 1040, y: 640 }, art: 'console', label: 'Deux isolateurs de retour', description: 'Amont : trois traits. Aval : cercle.' },
  { id: 'seal-pressure', incidentId: 'seal-discrepancy', roomId: 'soins', position: { x: 1030, y: 640 }, art: 'medical', label: 'Témoin de pression du lot 17', description: 'Relevé médical distant du conteneur de retour.' },
  { id: 'relay-console', incidentId: 'relay-flicker', roomId: 'conseil', position: { x: 350, y: 635 }, art: 'relay', label: 'Relais de projection local', description: 'Branches A et B, deux cycles lisibles et deux contacts.' },
  { id: 'relay-reference', incidentId: 'relay-flicker', roomId: 'archives', position: { x: 1040, y: 645 }, art: 'tablet', label: 'Schéma du relais', description: 'Ordre des contacts et cycle attendu pour le module B.' },
  { id: 'relay-component', incidentId: 'relay-flicker', roomId: 'armurerie', position: { x: 1010, y: 640 }, art: 'relay', label: 'Cartouche du module B', description: 'Un composant réservé au relais instable.' },
  { id: 'provenance-support', incidentId: 'trophy-provenance', roomId: 'trophees', position: { x: 400, y: 640 }, art: 'tablet', label: 'Support de mémoire du retour', description: 'Une marque de prise et une marque de transport.' },
  { id: 'provenance-record-a', incidentId: 'trophy-provenance', roomId: 'archives', position: { x: 390, y: 640 }, art: 'tablet', label: 'Relevé de la prise', description: 'La marque en chevrons avant l’extraction.' },
  { id: 'provenance-record-b', incidentId: 'trophy-provenance', roomId: 'archives', position: { x: 1050, y: 640 }, art: 'tablet', label: 'Registre de transfert', description: 'Le retour du lot sous la sangle à trois traits.' },
  { id: 'provenance-veteran', incidentId: 'trophy-provenance', roomId: 'entrainement', position: { x: 350, y: 650 }, art: 'crew', label: 'Témoignage de Balafre de Cendre', description: 'Le vétéran répond ici pour ce dossier, sans condition de recrutement.' },
  { id: 'return-medical', incidentId: 'return-transfer', roomId: 'soins', position: { x: 920, y: 640 }, art: 'medical', label: 'Zone d’accueil préparée', description: 'Une approche libre devant le poste de soins.' },
  { id: 'return-transfer', incidentId: 'return-transfer', roomId: 'hangar', position: { x: 410, y: 650 }, art: 'crew', label: 'Point de transfert du retour', description: 'Le membre de l’équipe attend le contrôle de prise en charge.' },
  { id: 'return-hangar-door', incidentId: 'return-transfer', roomId: 'hangar', position: { x: 128, y: 635 }, art: 'checkpoint', label: 'Seuil vers les soins', description: 'Le joueur et le membre accompagné doivent rejoindre ce seuil.' },
  { id: 'return-medical-entry', incidentId: 'return-transfer', roomId: 'soins', position: { x: 1312, y: 635 }, art: 'checkpoint', label: 'Seuil intérieur des soins', description: 'Le passage est confirmé après l’entrée physique du groupe.' },
  { id: 'return-report', incidentId: 'return-transfer', roomId: 'conseil', position: { x: 740, y: 650 }, art: 'console', label: 'Relevé de transfert', description: 'Le conseil attend un transfert physiquement terminé.' },
];

export interface ClanShipIncidentDecision { stepId: string; choiceId: string }
export interface ClanShipActiveIncident {
  incidentId: ClanShipIncidentId;
  acceptedRevision: number;
  /** The completed prefix preserves evidence and safe checkpoints in order. */
  stepIndex: number;
  choices: ClanShipIncidentDecision[];
  lastRejectedChoice: ClanShipIncidentDecision | null;
}
export interface ClanShipIncidentReceipt {
  incidentId: ClanShipIncidentId;
  completedRevision: number;
  proof: { stepIds: string[]; choices: ClanShipIncidentDecision[] };
}
export interface ClanShipIncidentsState {
  version: 1;
  ownerCreatedAt: string;
  revision: number;
  activeIncident: ClanShipActiveIncident | null;
  completedIncidents: ClanShipIncidentReceipt[];
}
export interface ClanShipIncidentsCampaignEvidence extends ClanShipCampaignEvidence {
  clanShipOperations?: ClanShipOperationsState | null;
}
export interface ClanShipIncidentPhysicalContext {
  actor: ClanShipInteriorPoint;
  escort: { roomId: ClanShipRoomId; position: ClanShipInteriorPoint } | null;
}
export interface ClanShipIncidentsContext extends Partial<ClanShipIncidentPhysicalContext> {
  ownerCreatedAt: string;
  docking: Pick<ClanShipDockingState, 'ownerCreatedAt' | 'status' | 'roomId'> | null;
  campaign: ClanShipCampaignEvidence;
  operations: ClanShipOperationsState | null;
}
export type ClanShipIncidentAction = { expectedRevision: number } & (
  | { type: 'start-incident'; incidentId: ClanShipIncidentId }
  | { type: 'cancel-incident' }
  | { type: 'interact'; targetId: string }
  | { type: 'choose'; targetId: string; choiceId: string }
  | { type: 'escort-checkpoint'; checkpointId: string }
);
export type ClanShipIncidentsAction = ClanShipIncidentAction;
export interface ClanShipIncidentsResult {
  accepted: boolean; changed: boolean; state: ClanShipIncidentsState;
  reason: string | null; message: string; clanMarksReward: number;
}
export interface ClanShipIncidentsInspection {
  status: 'absent' | 'valid' | 'future-version' | 'invalid-save';
  state: ClanShipIncidentsState | null; reason: string | null;
}
export interface ClanShipIncidentEvaluation { allowed: boolean; reason: string }
export interface ClanShipIncidentEscort {
  checkpointId: 'hangar-pickup' | 'hangar-door' | 'medical-entry' | 'medical-station';
  roomId: ClanShipRoomId;
  position: ClanShipInteriorPoint;
  follows: boolean;
  arrived: boolean;
}

const record = (value: unknown): value is Record<string, unknown> => {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
};
const identity = (value: unknown): value is string => typeof value === 'string' && value.length > 0 && value.length <= 160 && value.trim() === value && !/[\x00-\x1f\x7f]/.test(value);
const integer = (value: unknown): value is number => Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) < Number.MAX_SAFE_INTEGER;
const exact = (value: Record<string, unknown>, keys: readonly string[]) => Reflect.ownKeys(value).length === keys.length && keys.every(key => Object.hasOwn(value, key));
const evaluation = (allowed: boolean, reason: string): ClanShipIncidentEvaluation => ({ allowed, reason });
export const clanShipIncident = (id: unknown): ClanShipIncidentDefinition | undefined => CLAN_SHIP_INCIDENTS.find(item => item.id === id);
export const clanShipIncidentTarget = (id: unknown): ClanShipIncidentTarget | undefined => CLAN_SHIP_INCIDENT_TARGETS.find(item => item.id === id);

export function createClanShipIncidents(ownerCreatedAt: string): ClanShipIncidentsState {
  if (!identity(ownerCreatedAt)) throw new TypeError('Une identité de campagne valide est requise.');
  return { version: 1, ownerCreatedAt, revision: 0, activeIncident: null, completedIncidents: [] };
}

function validDecisions(raw: unknown, steps: readonly ClanShipIncidentStep[]): boolean {
  const choices = steps.filter(step => step.kind === 'choice');
  return Array.isArray(raw) && raw.length === choices.length && choices.every((step, index) => {
    const decision = raw[index];
    return record(decision) && exact(decision, ['stepId', 'choiceId']) && decision.stepId === step.id && decision.choiceId === step.correctChoiceId;
  });
}

/** Structural validation only. Cross-module evidence is inspected separately,
 * before a save/import/write boundary, never as a destructive normalization. */
export function inspectClanShipIncidents(raw: unknown, ownerCreatedAt: string): ClanShipIncidentsInspection {
  const invalid = (reason: string): ClanShipIncidentsInspection => ({ status: 'invalid-save', state: null, reason });
  if (raw == null) return identity(ownerCreatedAt) ? { status: 'absent', state: null, reason: null } : invalid('invalid-owner');
  if (!record(raw)) return invalid('invalid-record');
  if (integer(raw.version) && raw.version > CLAN_SHIP_INCIDENTS_VERSION) return { status: 'future-version', state: null, reason: 'unsupported-version' };
  if (raw.version !== 1) return invalid('invalid-version');
  if (!exact(raw, ['version', 'ownerCreatedAt', 'revision', 'activeIncident', 'completedIncidents'])) return invalid('invalid-fields');
  if (!identity(ownerCreatedAt) || raw.ownerCreatedAt !== ownerCreatedAt) return invalid('owner-mismatch');
  if (!integer(raw.revision) || !Array.isArray(raw.completedIncidents) || raw.completedIncidents.length > CLAN_SHIP_INCIDENTS.length) return invalid('invalid-ledger');
  const completed = new Set<ClanShipIncidentId>();
  let lastRevision = 0;
  for (const receipt of raw.completedIncidents) {
    if (!record(receipt) || !exact(receipt, ['incidentId', 'completedRevision', 'proof'])) return invalid('invalid-receipt');
    const definition = clanShipIncident(receipt.incidentId);
    if (!definition || completed.has(definition.id) || !integer(receipt.completedRevision) || receipt.completedRevision > raw.revision ||
        receipt.completedRevision < lastRevision + 1 + definition.steps.length) return invalid('invalid-receipt-revision');
    const proof = receipt.proof;
    if (!record(proof) || !exact(proof, ['stepIds', 'choices']) || !Array.isArray(proof.stepIds) || proof.stepIds.length !== definition.steps.length ||
        !definition.steps.every((step, index) => (proof.stepIds as unknown[])[index] === step.id) || !validDecisions(proof.choices, definition.steps)) return invalid('invalid-proof');
    completed.add(definition.id);
    lastRevision = receipt.completedRevision;
  }
  const active = raw.activeIncident;
  if (active !== null) {
    if (!record(active) || !exact(active, ['incidentId', 'acceptedRevision', 'stepIndex', 'choices', 'lastRejectedChoice'])) return invalid('invalid-active-incident');
    const definition = clanShipIncident(active.incidentId);
    if (!definition || completed.has(definition.id) || !integer(active.acceptedRevision) || active.acceptedRevision <= lastRevision ||
        !integer(active.stepIndex) || active.stepIndex >= definition.steps.length || active.acceptedRevision + active.stepIndex > raw.revision ||
        !validDecisions(active.choices, definition.steps.slice(0, active.stepIndex))) return invalid('invalid-active-progression');
    if (active.lastRejectedChoice !== null) {
      const decision = active.lastRejectedChoice, step = definition.steps[active.stepIndex];
      if (!record(decision) || !exact(decision, ['stepId', 'choiceId']) || decision.stepId !== step.id || step.kind !== 'choice' ||
          !step.choices?.some(choice => choice.id === decision.choiceId) || decision.choiceId === step.correctChoiceId ||
          active.acceptedRevision + active.stepIndex + 1 > raw.revision) return invalid('invalid-rejected-choice');
    }
  } else if (raw.revision === lastRevision + 1) {
    // A cancelled incident needs both its start and its cancellation command.
    return invalid('impossible-empty-revision');
  }
  return { status: 'valid', state: structuredClone(raw) as unknown as ClanShipIncidentsState, reason: null };
}

/** Prior receipts remain valid while the operation dossier grows; no equality
 * to its old revision is required. Missing or foreign prerequisite evidence is
 * never repaired by silently discarding incident progress. */
export function evaluateClanShipIncidentsCampaign(state: ClanShipIncidentsState, campaign: unknown): ClanShipIncidentEvaluation {
  if (!record(campaign) || !identity(campaign.createdAt) || inspectClanShipIncidents(state, campaign.createdAt).status !== 'valid') return evaluation(false, 'Le dossier d’incidents doit appartenir à cette campagne.');
  const operations = inspectClanShipOperations(campaign.clanShipOperations, campaign.createdAt);
  const hasProgress = state.revision > 0 || state.activeIncident !== null || state.completedIncidents.length > 0;
  if (!hasProgress && operations.status === 'absent') return evaluation(true, 'Aucun incident n’a encore commencé.');
  if (operations.status !== 'valid' || !operations.state || !evaluateClanShipOperationsCampaign(operations.state, campaign).allowed) return evaluation(false, 'Les incidents exigent les preuves d’opération de cette campagne.');
  const dossier = operations.state;
  if (hasProgress && (!dossier.mandateAccepted || !evaluateClanShipAccess(campaign as unknown as ClanShipCampaignEvidence).allowed)) return evaluation(false, 'Le mandat du clan et l’accès Blooded doivent être établis.');
  if (state.activeIncident && dossier.activeContract) return evaluation(false, 'Un contrat d’opération et un incident ne peuvent pas être actifs ensemble.');
  const ids = [...state.completedIncidents.map(receipt => receipt.incidentId), ...(state.activeIncident ? [state.activeIncident.incidentId] : [])];
  if (ids.some(id => !dossier.completedContracts.some(receipt => receipt.contractId === clanShipIncident(id)?.prerequisiteContractId))) return evaluation(false, 'Un incident ne correspond à aucune preuve préalable du clan.');
  return evaluation(true, 'Les incidents correspondent aux opérations accomplies par cette campagne.');
}

export function evaluateClanShipIncident(state: ClanShipIncidentsState, id: ClanShipIncidentId, campaign: ClanShipIncidentsCampaignEvidence): ClanShipIncidentEvaluation {
  const compatibility = evaluateClanShipIncidentsCampaign(state, campaign);
  if (!compatibility.allowed) return compatibility;
  const definition = clanShipIncident(id), operations = campaign.clanShipOperations;
  if (!definition) return evaluation(false, 'Incident inconnu.');
  if (state.completedIncidents.some(receipt => receipt.incidentId === id)) return evaluation(false, 'Cet incident est résolu ; sa récompense a déjà été attribuée.');
  if (state.activeIncident) return evaluation(false, 'Termine ou annule l’incident en cours avant d’en accepter un autre.');
  if (!operations?.mandateAccepted || !evaluateClanShipAccess(campaign).allowed) return evaluation(false, 'L’accueil, le rite Blooded et le mandat du clan sont requis.');
  if (operations.activeContract) return evaluation(false, 'Termine ou annule le contrat d’opération en cours.');
  if (!operations.completedContracts.some(receipt => receipt.contractId === definition.prerequisiteContractId)) return evaluation(false, `Prérequis : ${clanShipContract(definition.prerequisiteContractId)?.name ?? definition.prerequisiteContractId}.`);
  return evaluation(true, 'Le dossier est disponible au conseil ou au poste qui l’a signalé.');
}

export function getClanShipIncidentStep(state: ClanShipIncidentsState | null | undefined): ClanShipIncidentStep | null {
  const active = state?.activeIncident;
  return active ? clanShipIncident(active.incidentId)?.steps[active.stepIndex] ?? null : null;
}
export function getClanShipIncidentTargets(state: ClanShipIncidentsState | null | undefined): readonly ClanShipIncidentTarget[] {
  return CLAN_SHIP_INCIDENT_TARGETS.filter(target => target.incidentId === state?.activeIncident?.incidentId);
}
export function getClanShipIncidentEvidence(state: ClanShipIncidentsState | null | undefined): readonly { stepId: string; label: string; evidence: string }[] {
  const active = state?.activeIncident;
  return active ? (clanShipIncident(active.incidentId)?.steps.slice(0, active.stepIndex) ?? []).map(step => ({ stepId: step.id, label: step.label, evidence: step.evidence })) : [];
}

/** Positions are checkpoint anchors, not claims about a fine-grained location.
 * A live door transition may briefly place the follower on its paired side;
 * only the next checked physical interaction advances this durable anchor. */
export function getClanShipIncidentEscort(state: ClanShipIncidentsState | null | undefined): ClanShipIncidentEscort | null {
  const active = state?.activeIncident;
  if (active?.incidentId !== 'return-transfer' || active.stepIndex < 3) return null;
  const checkpointId = active.stepIndex === 3 ? 'hangar-pickup' : active.stepIndex === 4 ? 'hangar-door' : active.stepIndex === 5 ? 'medical-entry' : 'medical-station';
  const target = clanShipIncidentTarget(checkpointId === 'hangar-pickup' ? 'return-transfer' : checkpointId === 'hangar-door' ? 'return-hangar-door' : checkpointId === 'medical-entry' ? 'return-medical-entry' : 'return-medical')!;
  return { checkpointId, roomId: target.roomId, position: { ...target.position }, follows: active.stepIndex < 6, arrived: active.stepIndex >= 6 };
}

function validAction(value: unknown): value is ClanShipIncidentAction {
  if (!record(value) || !integer(value.expectedRevision)) return false;
  switch (value.type) {
    case 'start-incident': return exact(value, ['type', 'expectedRevision', 'incidentId']) && !!clanShipIncident(value.incidentId);
    case 'cancel-incident': return exact(value, ['type', 'expectedRevision']);
    case 'interact': return exact(value, ['type', 'expectedRevision', 'targetId']) && !!clanShipIncidentTarget(value.targetId);
    case 'choose': return exact(value, ['type', 'expectedRevision', 'targetId', 'choiceId']) && !!clanShipIncidentTarget(value.targetId) && identity(value.choiceId);
    case 'escort-checkpoint': return exact(value, ['type', 'expectedRevision', 'checkpointId']) && ['hangar-door', 'medical-entry', 'medical-station'].includes(String(value.checkpointId));
    default: return false;
  }
}
const refused = (state: ClanShipIncidentsState, reason: string, message: string): ClanShipIncidentsResult => ({ accepted: false, changed: false, state, reason, message, clanMarksReward: 0 });
function changed(state: ClanShipIncidentsState, patch: Partial<ClanShipIncidentsState>, message: string, clanMarksReward = 0, reason: string | null = null): ClanShipIncidentsResult {
  return { accepted: true, changed: true, state: { ...state, ...patch, revision: state.revision + 1 }, reason, message, clanMarksReward };
}
function near(point: unknown, target: ClanShipIncidentTarget): boolean {
  if (!record(point) || typeof point.x !== 'number' || typeof point.y !== 'number' || !Number.isFinite(point.x) || !Number.isFinite(point.y)) return false;
  const position = { x: point.x, y: point.y };
  return isClanShipInteriorWalkable(target.roomId, position) && Math.hypot(position.x - target.position.x, position.y - target.position.y) <= CLAN_SHIP_INTERIOR_METRICS.interactionReach;
}

/** Pure proposal. The caller commits state and reward in one campaign write;
 * failed/uncertain persistence must not acknowledge an escort checkpoint. */
export function actClanShipIncidents(state: ClanShipIncidentsState, action: ClanShipIncidentAction, context: ClanShipIncidentsContext): ClanShipIncidentsResult {
  if (!record(context) || !identity(context.ownerCreatedAt) || !record(context.campaign) || context.campaign.createdAt !== context.ownerCreatedAt) return refused(state, 'invalid-context', 'La campagne courante est incompatible.');
  const inspection = inspectClanShipIncidents(state, context.ownerCreatedAt);
  if (inspection.status !== 'valid') return refused(state, inspection.status, 'Le dossier enregistré ne peut pas être modifié.');
  if (!validAction(action)) return refused(state, 'invalid-action', 'Commande d’incident invalide.');
  if (action.expectedRevision !== state.revision) return refused(state, 'stale-revision', 'Le dossier a changé ; relis l’objectif avant cette action.');
  if (state.revision >= Number.MAX_SAFE_INTEGER - 1) return refused(state, 'revision-overflow', 'La révision du dossier ne peut plus être incrémentée.');
  const campaign: ClanShipIncidentsCampaignEvidence = { ...context.campaign, clanShipOperations: context.operations };
  const compatibility = evaluateClanShipIncidentsCampaign(state, campaign);
  if (!compatibility.allowed) return refused(state, 'incompatible-campaign', compatibility.reason);
  if (!evaluateClanShipAccess(campaign).allowed) return refused(state, 'blooded-required', 'Le rite Blooded doit être reconnu avant cet incident.');
  if (!context.docking || context.docking.ownerCreatedAt !== state.ownerCreatedAt || context.docking.status !== 'aboard') return refused(state, 'not-aboard', 'Cette action exige ta présence à bord du vaisseau du clan.');
  if (action.type === 'start-incident') {
    const availability = evaluateClanShipIncident(state, action.incidentId, campaign);
    if (!availability.allowed) return refused(state, 'incident-unavailable', availability.reason);
    const definition = clanShipIncident(action.incidentId)!;
    if (context.docking.roomId !== 'conseil' && context.docking.roomId !== definition.originRoomId) return refused(state, 'wrong-room', 'Accepte ce dossier au conseil ou au poste qui l’a signalé.');
    return changed(state, { activeIncident: { incidentId: definition.id, acceptedRevision: state.revision + 1, stepIndex: 0, choices: [], lastRejectedChoice: null } }, `Incident suivi : ${definition.name}. ${definition.steps[0].description}`);
  }
  const active = state.activeIncident;
  if (!active) return refused(state, 'no-active-incident', 'Aucun incident n’est suivi.');
  if (action.type === 'cancel-incident') return changed(state, { activeIncident: null }, 'Le dossier est interrompu sans récompense. L’équipe éventuelle attend en sécurité ; les incidents déjà résolus sont conservés.');
  const definition = clanShipIncident(active.incidentId)!, step = definition.steps[active.stepIndex], target = clanShipIncidentTarget(step.targetId)!;
  if (action.type === 'interact' ? step.kind !== 'interact' || action.targetId !== step.targetId :
      action.type === 'choose' ? step.kind !== 'choice' || action.targetId !== step.targetId :
      step.kind !== 'escort-checkpoint' || action.checkpointId !== step.id) return refused(state, 'wrong-step', 'Les indices et contrôles précédents doivent être accomplis dans l’ordre.');
  if (context.docking.roomId !== target.roomId) return refused(state, 'wrong-room', 'Rejoins la pièce du poste indiqué avant cette action.');
  if (!near(context.actor, target)) return refused(state, 'too-far', 'Approche physiquement le poste indiqué pour agir.');
  if (action.type === 'escort-checkpoint' && (!context.escort || context.escort.roomId !== target.roomId || !near(context.escort.position, target))) return refused(state, 'escort-not-present', 'Attends que le membre accompagné rejoigne aussi le point de contrôle.');
  if (action.type === 'choose') {
    if (!step.choices?.some(choice => choice.id === action.choiceId)) return refused(state, 'unknown-choice', 'Ce choix n’appartient pas au poste courant.');
    if (action.choiceId !== step.correctChoiceId) {
      if (active.lastRejectedChoice?.choiceId === action.choiceId) return refused(state, 'same-rejected-choice', step.rejection ?? 'Le diagnostic reste à corriger.');
      return changed(state, { activeIncident: { ...active, lastRejectedChoice: { stepId: step.id, choiceId: action.choiceId } } }, step.rejection ?? 'Le diagnostic reste à corriger.', 0, 'diagnostic-rejected');
    }
  }
  const choices = action.type === 'choose' ? [...active.choices, { stepId: step.id, choiceId: action.choiceId }] : active.choices;
  if (active.stepIndex + 1 === definition.steps.length) {
    const receipt: ClanShipIncidentReceipt = { incidentId: definition.id, completedRevision: state.revision + 1, proof: { stepIds: definition.steps.map(item => item.id), choices: choices.map(choice => ({ ...choice })) } };
    return changed(state, { activeIncident: null, completedIncidents: [...state.completedIncidents, receipt] }, definition.completion, definition.clanMarksReward);
  }
  return changed(state, { activeIncident: { ...active, stepIndex: active.stepIndex + 1, choices, lastRejectedChoice: null } }, `${step.evidence} Prochaine étape : ${definition.steps[active.stepIndex + 1].label}.`);
}
