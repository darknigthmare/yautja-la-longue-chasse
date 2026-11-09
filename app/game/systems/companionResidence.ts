import { isShipId, shipForId, type ShipId } from '../shipCatalogue';
import type { MissionId, SaveGame } from '../types';
import { CLAN_SHIP_RECRUITS, evaluateClanShipAccess, inspectClanShipOperations, type ClanShipNpcId } from './clanShipOperations';
import { CLAN_SHIP_INTERIOR_METRICS, CLAN_SHIP_INTERIOR_ROOMS } from './clanShipInterior';
import type { ClanShipRoomId } from './clanShipDocking';
import { isNearShipInterior25dStation, isShipInterior25dRoomId, type ShipInterior25dRoomId } from './shipInterior25d';
import { TRIO_MEMBERS, inspectExpeditionRoster, normalizePlanetInsertionPlan, type ExpeditionMemberId, type ExpeditionRoster, type PlanetInsertionPlan } from './planetInsertion';

/** C1/C2 of the campaign bible. Recruitment stays in its existing owner for the
 * triad and the clan circle. This ledger owns their refits, never a second copy
 * of the person. New contacts require a fresh, bound campaign hunt. */
export const COMPANION_RESIDENCE_VERSION = 1 as const;
export const COMPANION_PILOT_IDS = ['breche', 'eclisse', 'lance-fendue', 'opale'] as const;
export type CompanionPilotId = typeof COMPANION_PILOT_IDS[number];
export type CompanionResidentId = ExpeditionMemberId | ClanShipNpcId | CompanionPilotId;
export type CompanionQuarterKey = 'hunterAlcove' | 'humanCabin' | 'syntheticBay' | 'arborealPerch' |
  'amphibianBasin' | 'darkNest' | 'armoredKennel' | 'serekhWorkshop' | 'drakelMaintenance' | 'ossuaryDock';
export type CompanionHost = { kind: 'personal'; shipId: ShipId } | { kind: 'clan'; shipId: 'avp-predator-mothership' };
export type CompanionAvailability = 'ready' | 'recovering' | 'missing' | 'suspended' | 'dead';
export interface CompanionResidenceDefinition {
  id: CompanionResidentId; name: string; role: string; source: 'triad' | 'clan' | 'pilot';
  module: CompanionQuarterKey; moduleLabel: string; installationCost: number;
  /** Only the two actors actually supported by HuntCanvas can deploy. */
  fieldReady: boolean;
}

export const COMPANION_RESIDENCE_DEFINITIONS: readonly CompanionResidenceDefinition[] = [
  ...TRIO_MEMBERS.map(member => ({ id: member.id, name: member.name, role: member.role, source: 'triad' as const,
    module: 'hunterAlcove' as const, moduleLabel: 'Alcôve de chasseur', installationCost: 20, fieldReady: true })),
  ...CLAN_SHIP_RECRUITS.map(member => ({ id: member.id, name: member.name, role: member.role, source: 'clan' as const,
    module: 'hunterAlcove' as const, moduleLabel: 'Alcôve de chasseur', installationCost: 20, fieldReady: false })),
  { id: 'breche', name: 'Brèche', role: 'Hell-Hound recueilli', source: 'pilot', module: 'armoredKennel',
    moduleLabel: 'Habitat blindé', installationCost: 45, fieldReady: false },
  { id: 'eclisse', name: 'Éclisse', role: 'Mécanicien multipode', source: 'pilot', module: 'syntheticBay',
    moduleLabel: 'Baie de maintenance', installationCost: 30, fieldReady: false },
  { id: 'lance-fendue', name: 'Lance-Fendue', role: 'Vétéran instructeur', source: 'pilot', module: 'hunterAlcove',
    moduleLabel: 'Alcôve du vétéran', installationCost: 20, fieldReady: false },
  { id: 'opale', name: 'Opale', role: 'Synthétique d’expédition', source: 'pilot', module: 'syntheticBay',
    moduleLabel: 'Baie de repos et diagnostic', installationCost: 30, fieldReady: false },
];
export const companionResidenceDefinition = (id: unknown) => COMPANION_RESIDENCE_DEFINITIONS.find(entry => entry.id === id);

interface RecruitmentStep {
  id: string; title: string; description: string;
  personalRoom: ShipInterior25dRoomId; clanRoom: ClanShipRoomId;
  choices: readonly { id: string; label: string; accepted: boolean; response: string }[];
}
export interface CompanionRecruitmentDefinition {
  id: CompanionPilotId; rumour: string; missionId: MissionId; world: string;
  briefing: string; minimumScans: number; minimumScore: number;
  consent: string; steps: readonly RecruitmentStep[];
}
/** Authored secondary agreements, distinct from the eight main hunt objectives
 * and from canonical movie events. Finishing a hunt alone recruits nobody. */
export const COMPANION_RECRUITMENT: readonly CompanionRecruitmentDefinition[] = [
  { id: 'breche', rumour: 'Un appel près d’un ancien chenil', missionId: 'jungle-vey', world: 'Oseris-IV', minimumScans: 1, minimumScore: 40,
    briefing: 'Le gardien du chenil veut revoir la piste avant de confier Brèche à un autre chasseur. Retourne dans la canopée et rapporte tes observations. Au port, il te demandera comment tu comptes approcher le chien et le rappeler.',
    consent: 'Le gardien accepte de te confier Brèche. Le chien reste au refuge avec lui tant que son habitat n’est pas prêt.',
    steps: [
      { id: 'care', title: 'Préparer le retour au calme', description: 'Le gardien désigne le collier : « Pas encore. Avant de le lui passer, dis-moi ce que tu fais s’il ne te laisse pas approcher. »', personalRoom: 'medical-bay', clanRoom: 'soins', choices: [
        { id: 'quiet-care', label: 'Isoler le bruit, examiner puis nourrir', accepted: true, response: '« D’abord le calme et l’examen. Bien. Je reste près de lui pour les premiers soins ; tu ne prendras pas sa peur pour un ordre compris. »' },
        { id: 'force', label: 'Forcer immédiatement le collier de chasse', accepted: false, response: '« Il tirera contre le collier, et tu ne sauras pas pourquoi. Nous ne commencerons pas comme ça. »' },
      ] },
      { id: 'recall', title: 'Convenir d’un essai sans proie', description: '« Quand il partira, il faudra le faire revenir. Pour le premier essai, je veux savoir à quel moment tu arrêtes, pas ce que tu espères lui faire abattre. »', personalRoom: 'training-arena', clanRoom: 'entrainement', choices: [
        { id: 'recall-stop', label: 'Rappel, arrêt de l’essai, retour au refuge', accepted: true, response: '« Nous essaierons le rappel, puis nous rentrerons. S’il s’agite, l’essai s’arrête là. La chasse viendra après. »' },
        { id: 'live-bait', label: 'Utiliser une cible vivante pour accélérer', accepted: false, response: '« Avec une proie devant lui, tu verras s’il sait poursuivre. Ce n’est pas ce que je te demande. Montre-moi d’abord comment tu le rappelleras. »' },
      ] },
    ] },
  { id: 'eclisse', rumour: 'Une unité de commande répond encore', missionId: 'ruins-ancient-guardian', world: 'Acheron-Sigma', minimumScans: 2, minimumScore: 40,
    briefing: 'Un atelier reçoit encore les réponses d’Éclisse depuis Acheron-Sigma. Ses commandes ne suffisent pas à expliquer ce qui l’entoure. Repars observer les ruines ; le mécanicien veut comparer tes relevés avant de préparer son branchement.',
    consent: 'Le mécanicien te confie Éclisse. L’unité attendra à l’atelier tant que tu n’auras pas préparé sa baie et son alimentation.',
    steps: [
      { id: 'isolate', title: 'Isoler la commande de l’atelier', description: 'Le mécanicien garde la carte loin du connecteur du vaisseau. « Elle répond, oui. Je ne sais pas encore à quoi elle reste reliée. Où veux-tu commencer ? »', personalRoom: 'appearance-forge', clanRoom: 'armurerie', choices: [
        { id: 'isolated-bus', label: 'Isoler le bus avant tout branchement', accepted: true, response: '« Sur l’établi, avec une alimentation séparée. Nous regarderons ses réponses avant de lui ouvrir autre chose. »' },
        { id: 'ship-network', label: 'Brancher directement le réseau du vaisseau', accepted: false, response: 'Le mécanicien retient le câble. « Pas dans le vaisseau. Je n’y brancherai pas une commande dont je ne connais pas les liaisons. »' },
      ] },
      { id: 'calibrate', title: 'Limiter les droits de maintenance', description: '« Donne-lui une première tâche, pas tout le bord. Quels outils veux-tu lui confier, et comment l’arrêteras-tu si quelque chose se passe mal ? »', personalRoom: 'clan-archives', clanRoom: 'archives', choices: [
        { id: 'local-tools', label: 'Diagnostic local, outils consignés, arrêt manuel', accepted: true, response: '« Ce poste, ces outils, et un arrêt à portée de main. Je peux préparer ça. Nous élargirons son travail quand nous le connaîtrons mieux. »' },
        { id: 'all-access', label: 'Accès permanent à tous les systèmes', accepted: false, response: '« Tout le bord ? Tu n’as même pas encore vu une intervention se terminer. Choisis d’abord un poste. »' },
      ] },
    ] },
  { id: 'lance-fendue', rumour: 'Un vétéran écoute les rapports de retour', missionId: 'jungle-vey', world: 'Oseris-IV', minimumScans: 2, minimumScore: 50,
    briefing: 'Lance-Fendue ne s’intéresse pas à un ancien récit. Il veut tes observations d’une nouvelle chasse dans la canopée, puis entendre comment tu préparerais le retour avec un partenaire.',
    consent: '« Tu as pensé au retour. Je veux bien préparer tes sorties avec toi. Pour ma place à bord, nous en parlerons au quai. »',
    steps: [
      { id: 'retreat', title: 'Présenter la priorité d’extraction', description: 'Lance-Fendue pose le cas devant toi : « Ton partenaire décroche. Tu peux encore poursuivre la proie, mais vous n’avez plus de point de retour commun. Que fais-tu ? »', personalRoom: 'training-arena', clanRoom: 'entrainement', choices: [
        { id: 'bring-back', label: 'Sécuriser le repli et ramener le partenaire', accepted: true, response: '« Alors fixe le point de repli avant le départ. Je saurai où te retrouver. C’est avec ce chasseur-là que j’accepte de sortir. »' },
        { id: 'chase-trophy', label: 'Poursuivre la proie sans point de retour', accepted: false, response: '« Tu peux choisir de poursuivre. Mais ne me demande pas de partir avec toi sans savoir où nous devons nous retrouver. »' },
      ] },
      { id: 'boundaries', title: 'Fixer les limites de l’accord', description: '« Je peux préparer un exercice avec toi. Pour ton épreuve personnelle, mes coups ne compteront pas. Nous sommes d’accord ? »', personalRoom: 'clan-archives', clanRoom: 'archives', choices: [
        { id: 'own-rites', label: 'Conserver mes rites solitaires et son autonomie', accepted: true, response: '« Bien. Je garderai ma chasse, tu garderas la tienne. Nous aurons encore de quoi travailler ensemble. »' },
        { id: 'win-for-me', label: 'Lui confier mes épreuves individuelles', accepted: false, response: '« Non. Tu reviendrais avec mon combat à raconter. Ce n’est pas l’accord que je te propose. »' },
      ] },
    ] },
  { id: 'opale', rumour: 'Une expédition cherche la mémoire de son équipe', missionId: 'swamp-hydra', world: 'Naraka-Delta', minimumScans: 2, minimumScore: 40,
    briefing: 'Opale cherche à comprendre ce qui est arrivé à son équipe sur Naraka-Delta. Elle demande des observations récentes du terrain, pas une conclusion arrangée pour la convaincre de partir avec toi.',
    consent: '« Je travaillerai avec toi. Je garde mes souvenirs, et je te dirai quand je refuse une sortie. Pour la baie, nous verrons au quai. »',
    steps: [
      { id: 'memory', title: 'Restituer le dossier d’expédition', description: '« Donne-moi tout ce que tu as relevé. Même les passages où tu n’as rien compris. Je préfère une question à une réponse inventée sur mon équipe. »', personalRoom: 'clan-archives', clanRoom: 'archives', choices: [
        { id: 'full-report', label: 'Remettre le rapport entier avec ses incertitudes', accepted: true, response: 'Opale parcourt les relevés. « Il reste des blancs. Au moins, tu ne les as pas remplis à ma place. »' },
        { id: 'wipe-memory', label: 'Effacer les souvenirs avant l’activation', accepted: false, response: '« Tu veux mes compétences sans ce que j’ai vécu. Tu n’auras pas cet accord. »' },
      ] },
      { id: 'autonomy', title: 'Préparer un espace choisi', description: 'Opale regarde les connexions proposées. « Je veux pouvoir couper cette liaison moi-même. Me préparer une baie ne te donne pas mes décisions. »', personalRoom: 'medical-bay', clanRoom: 'soins', choices: [
        { id: 'consent', label: 'Garantir son autonomie et un réseau isolable', accepted: true, response: '« Une liaison que je peux isoler. Cela me convient. Il reste à décider si nous partons ensemble. »' },
        { id: 'override', label: 'Exiger une commande d’obéissance permanente', accepted: false, response: '« Alors tu cherches un outil, pas une alliée. Ce ne sera pas moi. »' },
      ] },
    ] },
];
export const companionRecruitmentDefinition = (id: unknown) => COMPANION_RECRUITMENT.find(entry => entry.id === id);

export interface CompanionContact {
  id: CompanionPilotId; stage: 'discovered' | 'accepted' | 'proven' | 'recruited'; step: number;
  baselineAttempts: number; baselineCompletions: number; encounterRun: number | null;
  proof: { missionId: MissionId; encounterRun: number; completedAt: string; score: number; scans: number } | null;
}
export interface CompanionInstallation { host: CompanionHost; module: CompanionQuarterKey; berth: number; completedRevision: number }
export interface CompanionRefit { host: CompanionHost; stage: 'planned' | 'funded'; reservedMarks: number; berth: number | null }
export interface CompanionResident {
  id: CompanionResidentId; assignment: CompanionHost | null; installation: CompanionInstallation | null;
  refit: CompanionRefit | null; relation: 'active' | 'suspended';
  /** An existing clan duty remains in force while its first refit is planned.
   * This preserves a historic appointment, without inventing a new quarter. */
  legacyClanPost: boolean;
  /** The mission lease owns actual field participation. */
  deployment: { missionId: MissionId; encounterRun: number; shipId: ShipId } | null;
}
export interface CompanionResidenceState {
  version: typeof COMPANION_RESIDENCE_VERSION; ownerCreatedAt: string; revision: number;
  /** Total persons including the player, matching the bible's 7 / 13 / 19. */
  clanCapacity: 7 | 13 | 19;
  contacts: CompanionContact[]; members: CompanionResident[];
}
export type CompanionResidenceInspection = { status: 'absent' | 'valid' | 'future-version' | 'invalid-save'; state: CompanionResidenceState | null };

const object = (raw: unknown): raw is Record<string, unknown> => !!raw && typeof raw === 'object' && !Array.isArray(raw) &&
  [Object.prototype, null].includes(Object.getPrototypeOf(raw)) && Reflect.ownKeys(raw).every(key => typeof key === 'string' &&
    Object.getOwnPropertyDescriptor(raw, key)?.enumerable && 'value' in Object.getOwnPropertyDescriptor(raw, key)!);
const exact = (raw: Record<string, unknown>, keys: readonly string[]) => Reflect.ownKeys(raw).length === keys.length && keys.every(key => Object.hasOwn(raw, key));
const count = (raw: unknown): raw is number => Number.isSafeInteger(raw) && Number(raw) >= 0 && Number(raw) < Number.MAX_SAFE_INTEGER;
const identity = (raw: unknown): raw is string => typeof raw === 'string' && raw.length > 0 && raw.length <= 160 && raw.trim() === raw && !/[\x00-\x1f\x7f]/.test(raw);
const missionIds: readonly MissionId[] = ['jungle-vey', 'ice-cryostalker', 'volcano-bad-blood', 'swamp-hydra', 'desert-sandmaw', 'ocean-leviathan', 'fungal-hivemind', 'ruins-ancient-guardian'];
const mission = (raw: unknown): raw is MissionId => missionIds.includes(raw as MissionId);
const host = (raw: unknown): raw is CompanionHost => object(raw) && exact(raw, ['kind', 'shipId']) &&
  (raw.kind === 'clan' ? raw.shipId === 'avp-predator-mothership' : raw.kind === 'personal' && isShipId(raw.shipId));
export const sameCompanionHost = (a: CompanionHost | null | undefined, b: CompanionHost | null | undefined): boolean => !!a && !!b && a.kind === b.kind && a.shipId === b.shipId;
export const companionHostLabel = (target: CompanionHost | null): string => !target ? 'Réserve du réseau' : target.kind === 'clan' ? 'Clan Ship AVP' : shipForId(target.shipId).name;

const PERSONAL_ROOMS: readonly ShipInterior25dRoomId[] = ['wall-armory', 'clan-archives', 'appearance-forge', 'launch-airlock'];
const CLAN_ROOMS: readonly ClanShipRoomId[] = ['entrainement', 'archives', 'armurerie', 'soins', 'hangar', 'trophees'];
export function companionBerthRoom(target: CompanionHost, berth: number): ShipInterior25dRoomId | ClanShipRoomId {
  return target.kind === 'personal' ? PERSONAL_ROOMS[berth] : CLAN_ROOMS[berth % CLAN_ROOMS.length];
}
/** A declared project layout budget, not a canonical spacecraft measurement. */
export function companionBerthCapacity(target: CompanionHost, state: CompanionResidenceState): number {
  if (target.kind === 'clan') return state.clanCapacity - 1;
  return personalBerthCapacity(target.shipId);
}
const personalBerthCapacity = (shipId: ShipId) => ['escape-pod', 'fighter', 'glider', 'fleet'].includes(shipForId(shipId).role) ? 0 : PERSONAL_ROOMS.length;
function compatibleBerth(definition: CompanionResidenceDefinition, target: CompanionHost, berth: number): boolean {
  const room = companionBerthRoom(target, berth);
  if (definition.module === 'armoredKennel') return room === 'launch-airlock' || room === 'hangar';
  if (definition.module === 'syntheticBay') return ['clan-archives', 'appearance-forge', 'archives', 'armurerie'].includes(room);
  return true;
}

export function createCompanionResidence(ownerCreatedAt: string): CompanionResidenceState {
  if (!identity(ownerCreatedAt)) throw new TypeError('Propriétaire de campagne invalide.');
  return { version: COMPANION_RESIDENCE_VERSION, ownerCreatedAt, revision: 0, clanCapacity: 7, contacts: [], members: [] };
}

/** No catalogue-driven migration, and no discarded foreign/future data. */
export function inspectCompanionResidence(raw: unknown, ownerCreatedAt: string): CompanionResidenceInspection {
  if (raw === undefined || raw === null) return { status: 'absent', state: null };
  if (object(raw) && count(raw.version) && raw.version > COMPANION_RESIDENCE_VERSION) return { status: 'future-version', state: null };
  const invalid: CompanionResidenceInspection = { status: 'invalid-save', state: null };
  if (!object(raw) || !exact(raw, ['version', 'ownerCreatedAt', 'revision', 'clanCapacity', 'contacts', 'members']) ||
      raw.version !== COMPANION_RESIDENCE_VERSION || raw.ownerCreatedAt !== ownerCreatedAt || !identity(ownerCreatedAt) ||
      !count(raw.revision) || typeof raw.clanCapacity !== 'number' || ![7, 13, 19].includes(raw.clanCapacity) || !Array.isArray(raw.contacts) ||
      raw.contacts.length > COMPANION_PILOT_IDS.length || !Array.isArray(raw.members) || raw.members.length > COMPANION_RESIDENCE_DEFINITIONS.length) return invalid;
  const contacts: CompanionContact[] = [];
  for (const value of raw.contacts) {
    if (!object(value) || !exact(value, ['id', 'stage', 'step', 'baselineAttempts', 'baselineCompletions', 'encounterRun', 'proof'])) return invalid;
    const definition = companionRecruitmentDefinition(value.id);
    if (!definition || contacts.some(entry => entry.id === value.id) || !['discovered', 'accepted', 'proven', 'recruited'].includes(String(value.stage)) ||
        !count(value.step) || value.step > definition.steps.length || !count(value.baselineAttempts) || !count(value.baselineCompletions) ||
        (value.encounterRun !== null && (!count(value.encounterRun) || value.encounterRun < value.baselineAttempts)) ||
        (value.stage !== 'accepted' && value.encounterRun !== null)) return invalid;
    if (value.stage === 'discovered' || value.stage === 'accepted') {
      if (value.step !== 0 || value.proof !== null) return invalid;
    } else {
      const proof = value.proof;
      if (!object(proof) || !exact(proof, ['missionId', 'encounterRun', 'completedAt', 'score', 'scans']) ||
          proof.missionId !== definition.missionId || !count(proof.encounterRun) || proof.encounterRun < value.baselineAttempts ||
          !identity(proof.completedAt) || !Number.isFinite(Date.parse(proof.completedAt)) ||
          !count(proof.score) || proof.score > 100 || proof.score < definition.minimumScore || !count(proof.scans) || proof.scans < definition.minimumScans ||
          (value.stage === 'recruited' && value.step !== definition.steps.length)) return invalid;
    }
    contacts.push(JSON.parse(JSON.stringify(value)) as CompanionContact);
  }
  const members: CompanionResident[] = [];
  for (const value of raw.members) {
    if (!object(value) || !exact(value, ['id', 'assignment', 'installation', 'refit', 'relation', 'legacyClanPost', 'deployment'])) return invalid;
    const definition = companionResidenceDefinition(value.id);
    if (!definition || members.some(entry => entry.id === value.id) || !['active', 'suspended'].includes(String(value.relation)) ||
        (value.assignment !== null && !host(value.assignment)) || typeof value.legacyClanPost !== 'boolean' ||
        (value.legacyClanPost && (definition.source !== 'clan' || value.assignment !== null || value.installation !== null || value.deployment !== null))) return invalid;
    if (definition.source === 'pilot' && !contacts.some(entry => entry.id === value.id && entry.stage === 'recruited')) return invalid;
    if (value.installation !== null) {
      const installation = value.installation;
      if (!object(installation) || !exact(installation, ['host', 'module', 'berth', 'completedRevision']) || !host(installation.host) ||
          installation.module !== definition.module || !count(installation.berth) || !count(installation.completedRevision) ||
          installation.completedRevision < 1 || installation.completedRevision > raw.revision ||
          !sameCompanionHost(value.assignment as CompanionHost | null, installation.host) ||
          installation.berth >= (installation.host.kind === 'clan' ? raw.clanCapacity - 1 : personalBerthCapacity(installation.host.shipId)) ||
          !compatibleBerth(definition, installation.host, installation.berth)) return invalid;
    }
    if ((value.assignment === null) !== (value.installation === null)) return invalid;
    if (value.refit !== null) {
      const refit = value.refit;
      if (!object(refit) || !exact(refit, ['host', 'stage', 'reservedMarks', 'berth']) || !host(refit.host) ||
          !['planned', 'funded'].includes(String(refit.stage)) || !count(refit.reservedMarks) ||
          (refit.stage === 'planned' ? refit.reservedMarks !== 0 || refit.berth !== null :
            refit.reservedMarks !== definition.installationCost || !count(refit.berth) ||
            refit.berth >= (refit.host.kind === 'clan' ? raw.clanCapacity - 1 : personalBerthCapacity(refit.host.shipId)) ||
            !compatibleBerth(definition, refit.host, refit.berth))) return invalid;
      if (sameCompanionHost(value.assignment as CompanionHost | null, refit.host)) return invalid;
    }
    if (value.deployment !== null) {
      const deployment = value.deployment;
      if (!definition.fieldReady || !object(deployment) || !exact(deployment, ['missionId', 'encounterRun', 'shipId']) ||
          !mission(deployment.missionId) || !count(deployment.encounterRun) || !isShipId(deployment.shipId) ||
          !host(value.assignment) || value.assignment.kind !== 'personal' || value.assignment.shipId !== deployment.shipId ||
          value.refit !== null || value.relation !== 'active') return invalid;
    }
    members.push(JSON.parse(JSON.stringify(value)) as CompanionResident);
  }
  if (contacts.some(contact => contact.stage === 'recruited' && !members.some(member => member.id === contact.id))) return invalid;
  if (contacts.filter(contact => contact.stage === 'accepted').length > 1) return invalid;
  const occupied = new Set<string>();
  for (const member of members) {
    for (const slot of [member.installation && { host: member.installation.host, berth: member.installation.berth },
      member.refit?.stage === 'funded' ? { host: member.refit.host, berth: member.refit.berth } : null]) {
      if (!slot) continue;
      const key = `${slot.host.kind}:${slot.host.shipId}:${slot.berth}`;
      if (occupied.has(key)) return invalid;
      occupied.add(key);
    }
  }
  if (raw.revision === 0 && (contacts.length || members.length || raw.clanCapacity !== 7)) return invalid;
  return { status: 'valid', state: { version: COMPANION_RESIDENCE_VERSION, ownerCreatedAt, revision: raw.revision,
    clanCapacity: raw.clanCapacity as 7 | 13 | 19, contacts, members } };
}

export type CompanionCampaign = Pick<SaveGame, 'createdAt' | 'prologue' | 'missionProgress' | 'profile' | 'expeditionRoster' |
  'clanShipOperations' | 'clanShipDocking' | 'planetArrival' | 'companionResidence'>;

export function companionHasRecruitment(save: CompanionCampaign, id: CompanionResidentId): boolean {
  const definition = companionResidenceDefinition(id);
  if (definition?.source === 'triad') return !!inspectExpeditionRoster(save.expeditionRoster, save.createdAt).state?.members.some(member => member.id === id);
  if (definition?.source === 'clan') return save.clanShipOperations?.ownerCreatedAt === save.createdAt &&
    save.clanShipOperations.recruitedNpcIds.includes(id as ClanShipNpcId);
  return !!inspectCompanionResidence(save.companionResidence, save.createdAt).state?.contacts.some(contact => contact.id === id && contact.stage === 'recruited');
}

export function evaluateCompanionResidenceCampaign(state: CompanionResidenceState, save: CompanionCampaign): { allowed: boolean; reason: string } {
  if (inspectCompanionResidence(state, save.createdAt).status !== 'valid') return { allowed: false, reason: 'Registre de présence incompatible avec cette campagne.' };
  if (!evaluateClanShipAccess(save).allowed) return { allowed: false, reason: 'L’accès Blooded est requis pour ces accords de bord.' };
  for (const member of state.members) {
    if (companionResidenceDefinition(member.id)?.source !== 'pilot' && !companionHasRecruitment(save, member.id))
      return { allowed: false, reason: 'Un accord historique de compagnon manque dans cette campagne.' };
    if (member.deployment) {
      const progress = save.missionProgress?.[member.deployment.missionId];
      const partner = save.expeditionRoster?.members.find(entry => entry.id === member.id);
      if (!companionResidenceDefinition(member.id)?.fieldReady || !progress || progress.status === 'locked' ||
          progress.attempts !== member.deployment.encounterRun || member.assignment?.kind !== 'personal' ||
          member.assignment.shipId !== member.deployment.shipId || partner?.assignedShipId !== member.deployment.shipId ||
          partner.availability !== 'ready')
        return { allowed: false, reason: 'Le déploiement doit appartenir à la tentative et à la coque réellement engagées.' };
    }
  }
  for (const contact of state.contacts) {
    const definition = companionRecruitmentDefinition(contact.id)!;
    const progress = save.missionProgress?.[definition.missionId];
    if (!progress || progress.status === 'locked' || !count(progress.attempts) || !count(progress.completions) ||
        progress.attempts < contact.baselineAttempts || progress.completions < contact.baselineCompletions)
      return { allowed: false, reason: 'Le contact doit correspondre à une route découverte dans cette campagne.' };
    if (contact.proof && (progress.status !== 'completed' || progress.attempts <= contact.proof.encounterRun || progress.completions <= contact.baselineCompletions))
      return { allowed: false, reason: 'La preuve du contact ne correspond pas à un retour de chasse enregistré.' };
    if (contact.encounterRun !== null && progress.attempts !== contact.encounterRun)
      return { allowed: false, reason: 'La rencontre liée au contact est devenue incohérente.' };
  }
  if (state.clanCapacity > 7 && !save.clanShipOperations?.mandateAccepted || state.clanCapacity > 13 && !save.clanShipOperations?.circleConfirmed)
    return { allowed: false, reason: 'Le palier des quartiers demande le mandat et l’accord du conseil.' };
  return { allowed: true, reason: 'Accords et présence rapprochés de la campagne.' };
}

export type CompanionResidenceObservation = { site: 'personal'; roomId: ShipInterior25dRoomId; x: number; y: number } |
  { site: 'clan'; roomId: ClanShipRoomId; x: number; y: number };
export interface CompanionResidenceContext {
  save: CompanionCampaign; selectedShipId: ShipId; ownedShipIds: readonly ShipId[];
  /** The caller supplies its current screen and pause/lease guards, not the action. */
  active: boolean; site: 'personal' | 'clan'; observation: CompanionResidenceObservation | null;
}
export type CompanionResidenceCommand =
  | { type: 'discover' }
  | { type: 'accept-contact' | 'cancel-contact' | 'recruit'; id: CompanionPilotId }
  | { type: 'prepare-contact'; id: CompanionPilotId; stepId: string; choiceId: string }
  | { type: 'plan-refit'; id: CompanionResidentId; host: CompanionHost }
  | { type: 'fund-refit' | 'complete-refit' | 'cancel-refit' | 'reserve' | 'suspend' | 'resume'; id: CompanionResidentId }
  | { type: 'expand-clan-quarters' };
export type CompanionResidenceAction = CompanionResidenceCommand & { expectedRevision: number; ownerCreatedAt: string };
export interface CompanionResidenceResult {
  accepted: boolean; changed: boolean; state: CompanionResidenceState | null; message: string;
  clanMarks: number; expeditionRoster?: ExpeditionRoster;
}

export function companionObservationRoom(context: CompanionResidenceContext): string | null {
  const { observation, site, save } = context;
  if (!context.active || !observation || observation.site !== site || !Number.isFinite(observation.x) || !Number.isFinite(observation.y)) return null;
  if (observation.site === 'personal') return isShipInterior25dRoomId(observation.roomId) &&
    isNearShipInterior25dStation(observation.roomId, observation) ? observation.roomId : null;
  const docking = save.clanShipDocking;
  const room = CLAN_SHIP_INTERIOR_ROOMS[observation.roomId];
  return room && docking?.ownerCreatedAt === save.createdAt && docking.status === 'aboard' && docking.roomId === observation.roomId &&
    Math.hypot(observation.x - room.servicePoint.x, observation.y - room.servicePoint.y) <= CLAN_SHIP_INTERIOR_METRICS.interactionReach ? observation.roomId : null;
}
export function companionAtRefit(context: CompanionResidenceContext): boolean {
  const room = companionObservationRoom(context), docking = context.save.clanShipDocking;
  return room === 'hangar' && context.site === 'clan' || room === 'launch-airlock' && context.site === 'personal' &&
    docking?.ownerCreatedAt === context.save.createdAt && ['docked', 'aboard'].includes(docking.status) && docking.personalShipId === context.selectedShipId;
}
export function companionResidenceAvailability(save: CompanionCampaign, member: CompanionResident): CompanionAvailability {
  if (member.relation === 'suspended') return 'suspended';
  if (companionResidenceDefinition(member.id)?.source === 'triad') {
    return inspectExpeditionRoster(save.expeditionRoster, save.createdAt).state?.members.find(entry => entry.id === member.id)?.availability ?? 'missing';
  }
  return 'ready';
}
function crewBusy(save: CompanionCampaign, member: CompanionResident): boolean {
  return member.deployment !== null || (member.legacyClanPost || sameCompanionHost(member.assignment, { kind: 'clan', shipId: 'avp-predator-mothership' })) &&
    save.clanShipOperations?.spaceEncounter?.status === 'active';
}
function blankMember(id: CompanionResidentId, legacyClanPost = false): CompanionResident {
  return { id, assignment: null, installation: null, refit: null, relation: 'active', legacyClanPost, deployment: null };
}
function slotFor(state: CompanionResidenceState, target: CompanionHost, definition: CompanionResidenceDefinition): number | null {
  const slots = Array.from({ length: companionBerthCapacity(target, state) }, (_, berth) => berth);
  // Ordinary cabins use the general rooms first, leaving the only kennel and
  // isolated maintenance bays available for the residents who need them.
  if (definition.module === 'hunterAlcove') {
    const priority = (berth: number) => {
      const room = companionBerthRoom(target, berth);
      return ['hangar', 'launch-airlock'].includes(room) ? 2 : ['archives', 'armurerie', 'clan-archives', 'appearance-forge'].includes(room) ? 1 : 0;
    };
    slots.sort((a, b) => priority(a) - priority(b) || a - b);
  }
  for (const berth of slots) {
    if (!compatibleBerth(definition, target, berth)) continue;
    const taken = state.members.some(member => member.installation && sameCompanionHost(member.installation.host, target) && member.installation.berth === berth ||
      member.refit?.stage === 'funded' && sameCompanionHost(member.refit.host, target) && member.refit.berth === berth);
    if (!taken) return berth;
  }
  return null;
}
function validCommand(action: unknown): action is CompanionResidenceAction {
  if (!object(action) || !count(action.expectedRevision) || !identity(action.ownerCreatedAt)) return false;
  const base = ['type', 'expectedRevision', 'ownerCreatedAt'];
  if (action.type === 'discover' || action.type === 'expand-clan-quarters') return exact(action, base);
  if (action.type === 'accept-contact' || action.type === 'cancel-contact' || action.type === 'recruit') return exact(action, [...base, 'id']) && !!companionRecruitmentDefinition(action.id);
  if (action.type === 'prepare-contact') return exact(action, [...base, 'id', 'stepId', 'choiceId']) && !!companionRecruitmentDefinition(action.id) && identity(action.stepId) && identity(action.choiceId);
  if (action.type === 'plan-refit') return exact(action, [...base, 'id', 'host']) && !!companionResidenceDefinition(action.id) && host(action.host);
  return ['fund-refit', 'complete-refit', 'cancel-refit', 'reserve', 'suspend', 'resume'].includes(String(action.type)) && exact(action, [...base, 'id']) && !!companionResidenceDefinition(action.id);
}

/** Pure transaction. The caller acknowledges only after its normal campaign
 * writer confirms state + escrow + legacy hull assignment together. */
export function actCompanionResidence(action: CompanionResidenceAction, context: CompanionResidenceContext): CompanionResidenceResult {
  const { save } = context;
  const inspected = inspectCompanionResidence(save.companionResidence, save.createdAt);
  const current = inspected.state;
  const marks = save.profile.clanMarks;
  const refuse = (message: string): CompanionResidenceResult => ({ accepted: false, changed: false, state: current, clanMarks: marks, message });
  if (inspected.status === 'invalid-save' || inspected.status === 'future-version') return refuse('Le registre enregistré doit être récupéré avant une modification.');
  if (!validCommand(action) || action.ownerCreatedAt !== save.createdAt || !context.active || !count(marks)) return refuse('Cette commande ne correspond pas à la campagne active.');
  const state = current ?? createCompanionResidence(save.createdAt);
  if (action.expectedRevision !== state.revision) return refuse('Le registre a changé. Relis le dossier avant cette action.');
  if (state.revision >= Number.MAX_SAFE_INTEGER - 1) return refuse('Le registre ne peut plus accepter de révision.');
  if (!evaluateCompanionResidenceCampaign(state, save).allowed || !evaluateClanShipAccess(save).allowed) return refuse('Les accords et l’accès Blooded doivent être confirmés.');
  const room = companionObservationRoom(context);
  if (!room) return refuse('Approche physiquement un poste de bord avant de confirmer cette action.');
  const next: CompanionResidenceState = { ...state, members: state.members.map(member => JSON.parse(JSON.stringify(member)) as CompanionResident),
    contacts: state.contacts.map(contact => JSON.parse(JSON.stringify(contact)) as CompanionContact) };
  const finish = (message: string, balance = marks, roster?: ExpeditionRoster): CompanionResidenceResult => {
    next.revision += 1;
    return { accepted: true, changed: true, state: next, clanMarks: balance, message, ...(roster ? { expeditionRoster: roster } : {}) };
  };
  const same = (message: string): CompanionResidenceResult => ({ accepted: true, changed: false, state: current, clanMarks: marks, message });
  const archive = room === 'clan-archives' || room === 'archives';
  if (action.type === 'discover') {
    if (!archive) return refuse('Consulte les appels du réseau au poste des archives.');
    for (const definition of COMPANION_RECRUITMENT) {
      const progress = save.missionProgress[definition.missionId];
      if (progress?.status !== 'completed' || state.contacts.some(contact => contact.id === definition.id)) continue;
      next.contacts.push({ id: definition.id, stage: 'discovered', step: 0, baselineAttempts: progress.attempts,
        baselineCompletions: progress.completions, encounterRun: null, proof: null });
    }
    return next.contacts.length === state.contacts.length ? same('Aucun nouvel appel sur les routes que tu as reconnues.') : finish('Les appels accessibles sont enregistrés. Aucun accord ni quartier n’a été attribué.');
  }
  if (action.type === 'accept-contact' || action.type === 'cancel-contact' || action.type === 'prepare-contact' || action.type === 'recruit') {
    const contact = next.contacts.find(entry => entry.id === action.id), definition = companionRecruitmentDefinition(action.id)!;
    if (!contact) return refuse('Ce contact n’a pas été découvert dans la campagne.');
    if (action.type === 'accept-contact') {
      if (!archive || contact.stage !== 'discovered') return refuse('Accepte l’appel découvert depuis les archives.');
      if (next.contacts.some(entry => entry.stage === 'accepted')) return refuse('Un appel suit déjà ta prochaine chasse. Termine-le ou retire-le.');
      const progress = save.missionProgress[definition.missionId];
      if (!progress || !['available', 'completed'].includes(progress.status)) return refuse('La route de cet appel est indisponible.');
      Object.assign(contact, { stage: 'accepted', baselineAttempts: progress.attempts, baselineCompletions: progress.completions });
      return finish('Accord de reconnaissance enregistré. Prépare une nouvelle chasse sur la route indiquée.');
    }
    if (action.type === 'cancel-contact') {
      if (!archive || contact.stage !== 'accepted' || contact.encounterRun !== null) return refuse('Le retrait exige les archives et aucune chasse encore liée.');
      contact.stage = 'discovered';
      return finish('Appel retiré sans recrutement. Tu pourras reprendre contact plus tard.');
    }
    if (action.type === 'prepare-contact') {
      const step = definition.steps[contact.step];
      if (contact.stage !== 'proven' || !step || action.stepId !== step.id) return refuse('Cette préparation attend le rapport de la nouvelle chasse et l’étape précédente.');
      if (room !== (context.site === 'personal' ? step.personalRoom : step.clanRoom)) return refuse('Rejoins le poste indiqué pour cette préparation.');
      const choice = step.choices.find(candidate => candidate.id === action.choiceId);
      if (!choice?.accepted) return refuse(choice?.response ?? 'Choix inconnu.');
      contact.step += 1;
      return finish(choice.response);
    }
    if (!archive || contact.stage !== 'proven' || contact.step !== definition.steps.length) return refuse('Les préparations et un accord explicite aux archives sont requis.');
    contact.stage = 'recruited'; next.members.push(blankMember(contact.id));
    return finish(definition.consent);
  }
  if (action.type === 'expand-clan-quarters') {
    if (!companionAtRefit(context) || context.site !== 'clan') return refuse('Les ponts du clan sont aménagés depuis son hangar.');
    if (state.clanCapacity === 19) return same('Les trois paliers de quartiers sont déjà ouverts.');
    if (!save.clanShipOperations?.mandateAccepted || state.clanCapacity === 13 && !save.clanShipOperations.circleConfirmed)
      return refuse(state.clanCapacity === 7 ? 'Le mandat du conseil est requis.' : 'Le cercle d’expédition doit être reconnu par le conseil.');
    const cost = state.clanCapacity === 7 ? 120 : 240;
    if (marks < cost) return refuse(`L’aménagement demande ${cost} marques de fournitures.`);
    next.clanCapacity = state.clanCapacity === 7 ? 13 : 19;
    return finish(`Capacité portée à ${next.clanCapacity} personnes, joueur compris. Les places restent vacantes sans affectation.`, marks - cost);
  }
  const id = action.id;
  if (!companionHasRecruitment(save, id)) return refuse('Un accord de recrutement réel est requis avant toute affectation.');
  const definition = companionResidenceDefinition(id)!;
  let member = next.members.find(entry => entry.id === id);
  if (!member) { member = blankMember(id, definition.source === 'clan'); next.members.push(member); }
  const availability = companionResidenceAvailability(save, member);
  const oldRoster = inspectExpeditionRoster(save.expeditionRoster, save.createdAt).state;
  const rosterWith = (target: CompanionHost | null): ExpeditionRoster | undefined => definition.source === 'triad' && oldRoster
    ? { ...oldRoster, members: oldRoster.members.map(entry => entry.id === id ? { ...entry, assignedShipId: target?.kind === 'personal' ? target.shipId : null } : entry) } : undefined;
  if (action.type === 'plan-refit') {
    if (member.refit) return refuse('Confirme ou annule le réaménagement déjà préparé.');
    if (crewBusy(save, member) || availability === 'missing' || availability === 'suspended') return refuse('Cet allié doit être disponible avant de préparer son déplacement.');
    if (sameCompanionHost(member.assignment, action.host)) return same('Cet allié possède déjà son quartier sur ce navire.');
    if (action.host.kind === 'personal' && !context.ownedShipIds.includes(action.host.shipId)) return refuse('Cette coque n’appartient pas à ta campagne.');
    if (action.host.kind === 'clan' && !save.clanShipOperations?.mandateAccepted) return refuse('Le conseil doit autoriser les affectations dans le Clan Ship.');
    if (slotFor(next, action.host, definition) === null) return refuse('Aucun emplacement compatible n’est libre sur ce navire.');
    member.refit = { host: { ...action.host }, stage: 'planned', reservedMarks: 0, berth: null };
    return finish('Réaménagement programmé. L’affectation actuelle reste en place jusqu’à la confirmation au quai.');
  }
  if (action.type === 'cancel-refit') {
    if (!member.refit) return same('Aucun travail n’est réservé pour cet allié.');
    const refunded = marks + member.refit.reservedMarks;
    if (!count(refunded)) return refuse('Le solde ne permet pas le remboursement intégral.');
    member.refit = null;
    return finish('Travaux annulés. Les fournitures réservées sont restituées une seule fois ; l’ancien quartier reste en place.', refunded);
  }
  if (!companionAtRefit(context)) return refuse('Confirme le réaménagement au hangar du Clan Ship ou au sas du vaisseau personnel amarré.');
  if (crewBusy(save, member)) return refuse('Cet allié participe encore à une mission. Termine son retour avant de modifier son affectation.');
  if (action.type === 'fund-refit' || action.type === 'complete-refit') {
    const refit = member.refit;
    if (!refit || availability === 'missing' || availability === 'suspended') return refuse('Un réaménagement préparé et un allié disponible sont requis.');
    if (refit.host.kind === 'personal' && (!context.ownedShipIds.includes(refit.host.shipId) || refit.host.shipId !== context.selectedShipId)) return refuse('La coque visée doit être possédée et physiquement amarrée ici.');
    if (refit.host.kind === 'clan' && !save.clanShipOperations?.mandateAccepted) return refuse('Le mandat d’affectation du conseil manque.');
    if (action.type === 'fund-refit') {
      if (refit.stage === 'funded') return same('Les fournitures sont déjà réservées.');
      const berth = slotFor(next, refit.host, definition);
      if (berth === null) return refuse('L’emplacement prévu a été pris. Choisis une autre affectation.');
      if (marks < definition.installationCost) return refuse(`Il faut ${definition.installationCost} marques pour les fournitures.`);
      refit.stage = 'funded'; refit.reservedMarks = definition.installationCost; refit.berth = berth;
      return finish('Fournitures et emplacement réservés. Confirme les travaux au quai, ou annule pour être remboursé.', marks - definition.installationCost);
    }
    if (refit.stage !== 'funded' || refit.berth === null) return refuse('Les fournitures doivent être réservées avant les travaux.');
    member.assignment = { ...refit.host };
    member.installation = { host: { ...refit.host }, module: definition.module, berth: refit.berth, completedRevision: state.revision + 1 };
    member.legacyClanPost = false;
    member.refit = null;
    return finish(`${definition.name} : affectation et installation confirmées.`, marks, rosterWith(member.assignment));
  }
  if (member.refit) return refuse('Annule d’abord les travaux en attente pour conserver leurs fournitures.');
  if (action.type === 'reserve') {
    member.assignment = null; member.installation = null; member.deployment = null;
    member.legacyClanPost = false;
    return finish(`${definition.name} reste recruté en réserve. Son état médical et ses reçus sont conservés.`, marks, rosterWith(null));
  }
  if (action.type === 'suspend') {
    member.relation = 'suspended';
    return finish('L’affectation est suspendue : espace fermé, aucun occupant ni service actif.');
  }
  if (action.type === 'resume') {
    if (member.relation !== 'suspended') return same('Cet accord est déjà actif.');
    member.relation = 'active';
    return finish('L’affectation reprend au quai, avec le même quartier et le même état médical.');
  }
  return refuse('Commande inconnue.');
}

export interface CompanionPresence {
  id: CompanionResidentId; definition: CompanionResidenceDefinition; assignment: CompanionHost;
  installation: CompanionInstallation; quarterVisible: boolean; avatarVisible: boolean; serviceAvailable: boolean;
  availability: CompanionAvailability; location: 'aboard' | 'medical' | 'mission' | 'missing' | 'closed';
  roomId: ShipInterior25dRoomId | ClanShipRoomId; avatarRoomId: ShipInterior25dRoomId | ClanShipRoomId;
}
/** Reconstruct visibility from evidence. Absence never reveals a named empty
 * habitat, while a deployed or missing ally keeps its installed return berth. */
export function companionResidencePresence(save: CompanionCampaign, target: CompanionHost): CompanionPresence[] {
  const state = inspectCompanionResidence(save.companionResidence, save.createdAt).state;
  if (!state || !evaluateCompanionResidenceCampaign(state, save).allowed) return [];
  return state.members.flatMap(member => {
    if (!member.assignment || !member.installation || !sameCompanionHost(member.assignment, target) || !companionHasRecruitment(save, member.id)) return [];
    const definition = companionResidenceDefinition(member.id)!;
    const availability = companionResidenceAvailability(save, member);
    if (definition.source === 'triad' && target.kind === 'personal' &&
        save.expeditionRoster?.members.find(entry => entry.id === member.id)?.assignedShipId !== target.shipId) return [];
    const deployed = !!member.deployment || definition.fieldReady && target.kind === 'personal' && save.planetArrival?.personalShipId === target.shipId &&
      save.planetArrival.insertion?.team === 'triad';
    const roomId = companionBerthRoom(target, member.installation.berth);
    const location = member.relation === 'suspended' ? 'closed' : deployed ? 'mission' : availability === 'missing' ? 'missing' : availability === 'recovering' ? 'medical' : 'aboard';
    const quarterVisible = location !== 'closed';
    return [{ id: member.id, definition, assignment: member.assignment, installation: member.installation,
      quarterVisible, avatarVisible: quarterVisible && ['aboard', 'medical'].includes(location), serviceAvailable: location === 'aboard' && availability === 'ready',
      availability, location, roomId, avatarRoomId: location === 'medical' ? target.kind === 'personal' ? 'medical-bay' : 'soins' : roomId } as CompanionPresence];
  });
}
/** Historical clan appointments remain valid until explicitly managed here.
 * Once a member has a residence record, only its active clan posting lends a
 * service; recruitment alone can never keep a transferred member's bonus. */
export function availableClanResidenceCrew(save: CompanionCampaign): ClanShipNpcId[] {
  const inspected = inspectCompanionResidence(save.companionResidence, save.createdAt), state = inspected.state;
  if (inspected.status === 'invalid-save' || inspected.status === 'future-version') return [];
  const presence = companionResidencePresence(save, { kind: 'clan', shipId: 'avp-predator-mothership' });
  return (save.clanShipOperations?.recruitedNpcIds ?? []).filter(id => !state?.members.some(member => member.id === id) ||
    state?.members.some(member => member.id === id && member.legacyClanPost && member.relation === 'active') ||
    presence.some(member => member.id === id && member.serviceAvailable));
}

/** Existing interview actors remain available. A managed resident is drawn by
 * the residence layer only; a suspended or transferred appointment disappears. */
export function companionUsesLegacyClanPost(save: CompanionCampaign, id: ClanShipNpcId): boolean {
  const inspected = inspectCompanionResidence(save.companionResidence, save.createdAt);
  if (inspected.status === 'invalid-save' || inspected.status === 'future-version') return false;
  const member = inspected.state?.members.find(entry => entry.id === id);
  return !member || member.legacyClanPost && member.relation === 'active';
}

export interface CompanionMissionBinding { ownerCreatedAt: string; missionId: MissionId; encounterRun: number; shipId: ShipId; insertion: PlanetInsertionPlan }
export interface CompanionMissionUpdate { accepted: boolean; changed: boolean; state: CompanionResidenceState | null; message: string }
const missionUnchanged = (state: CompanionResidenceState | null, message = 'Aucun accord concerné.'): CompanionMissionUpdate => ({ accepted: true, changed: false, state, message });
const missionRefused = (state: CompanionResidenceState | null, message: string): CompanionMissionUpdate => ({ accepted: false, changed: false, state, message });

/** Bridge a newly accepted clan agreement into reserve. The old save's existing
 * appointments remain untouched; this hook runs in the recruitment transaction,
 * never on load or catalogue discovery. */
export function registerCompanionResidenceRecruitment(before: CompanionCampaign, progressed: CompanionCampaign, id: ClanShipNpcId): CompanionMissionUpdate {
  const inspected = inspectCompanionResidence(before.companionResidence, before.createdAt);
  const current = inspected.state;
  if (inspected.status === 'invalid-save' || inspected.status === 'future-version') return missionRefused(current, 'Le registre existant doit être récupéré avant ce recrutement.');
  const oldClan = inspectClanShipOperations(before.clanShipOperations, before.createdAt).state;
  const newClan = inspectClanShipOperations(progressed.clanShipOperations, progressed.createdAt).state;
  if (progressed.createdAt !== before.createdAt || !oldClan || !newClan || oldClan.recruitedNpcIds.includes(id) ||
      !CLAN_SHIP_RECRUITS.some(definition => definition.id === id) || !newClan.recruitedNpcIds.includes(id) ||
      newClan.revision !== oldClan.revision + 1 || newClan.recruitedNpcIds.length !== oldClan.recruitedNpcIds.length + 1 ||
      oldClan.recruitedNpcIds.some(existing => !newClan.recruitedNpcIds.includes(existing)) ||
      current?.members.some(member => member.id === id) || !evaluateClanShipAccess(progressed).allowed)
    return missionRefused(current, 'Un nouvel accord du clan accepté par la campagne est requis.');
  const state = current ?? createCompanionResidence(before.createdAt);
  if (!evaluateCompanionResidenceCampaign(state, before).allowed) return missionRefused(current, 'Les accords antérieurs ne correspondent pas à cette campagne.');
  if (state.revision >= Number.MAX_SAFE_INTEGER - 1) return missionRefused(current, 'Le registre ne peut plus accepter de révision.');
  const next = { ...state, revision: state.revision + 1, members: [...state.members, blankMember(id)] };
  return { accepted: true, changed: true, state: next, message: 'Accord de recrutement enregistré en réserve. L’affectation et le quartier seront choisis au quai.' };
}

export function bindCompanionResidenceMission(save: CompanionCampaign, binding: CompanionMissionBinding): CompanionMissionUpdate {
  const inspected = inspectCompanionResidence(save.companionResidence, save.createdAt), state = inspected.state;
  if (inspected.status === 'absent') return missionUnchanged(null);
  const insertion = normalizePlanetInsertionPlan(binding.insertion);
  if (!state || binding.ownerCreatedAt !== save.createdAt || !mission(binding.missionId) || !count(binding.encounterRun) ||
      !isShipId(binding.shipId) || !insertion || state.revision >= Number.MAX_SAFE_INTEGER - 1 ||
      !evaluateCompanionResidenceCampaign(state, save).allowed || save.missionProgress[binding.missionId]?.attempts !== binding.encounterRun) return missionRefused(state, 'Le départ ne correspond pas au registre des compagnons.');
  const next = JSON.parse(JSON.stringify(state)) as CompanionResidenceState;
  let changed = false;
  for (const contact of next.contacts) {
    if (contact.stage !== 'accepted' || companionRecruitmentDefinition(contact.id)?.missionId !== binding.missionId) continue;
    if (contact.encounterRun !== null && contact.encounterRun !== binding.encounterRun) return missionRefused(state, 'Une autre rencontre est encore liée à cet appel.');
    if (contact.encounterRun === null) { contact.encounterRun = binding.encounterRun; changed = true; }
  }
  if (insertion.team === 'triad') {
    // A legacy hull posting still exists until its first refit completes. Its
    // suspension or pending work must block departure even without a new berth.
    for (const member of next.members.filter(entry => companionResidenceDefinition(entry.id)?.fieldReady &&
      save.expeditionRoster?.members.some(legacy => legacy.id === entry.id && legacy.assignedShipId === binding.shipId))) {
      if (member.refit || member.relation !== 'active' || companionResidenceAvailability(save, member) !== 'ready' ||
          member.assignment && !sameCompanionHost(member.assignment, { kind: 'personal', shipId: binding.shipId }))
        return missionRefused(state, 'Un partenaire affecté est indisponible ou attend son réaménagement.');
    }
    for (const member of next.members.filter(entry => companionResidenceDefinition(entry.id)?.fieldReady &&
      entry.assignment?.kind === 'personal' && entry.assignment.shipId === binding.shipId)) {
      if (member.refit || member.relation !== 'active' || companionResidenceAvailability(save, member) !== 'ready' ||
          save.expeditionRoster?.members.find(entry => entry.id === member.id)?.assignedShipId !== binding.shipId)
        return missionRefused(state, 'Un partenaire affecté est indisponible ou attend son réaménagement.');
      if (member.deployment && (member.deployment.missionId !== binding.missionId || member.deployment.encounterRun !== binding.encounterRun))
        return missionRefused(state, 'Ce partenaire est encore engagé ailleurs.');
      if (!member.deployment) { member.deployment = { missionId: binding.missionId, encounterRun: binding.encounterRun, shipId: binding.shipId }; changed = true; }
    }
  }
  if (!changed) return missionUnchanged(state);
  next.revision += 1;
  return { accepted: true, changed: true, state: next, message: 'Appel et passagers liés à la rencontre réellement lancée.' };
}

export function settleCompanionResidenceMission(before: CompanionCampaign, progressed: CompanionCampaign,
  result: { missionId: MissionId; outcome: string; score: number; scans: number; completedAt: string },
  session: { ownerSaveCreatedAt: string; missionId: string; encounterRun: number } | null): CompanionMissionUpdate {
  const inspected = inspectCompanionResidence(before.companionResidence, before.createdAt), state = inspected.state;
  if (inspected.status === 'absent') return missionUnchanged(null);
  if (!state || state.revision >= Number.MAX_SAFE_INTEGER - 1 || progressed.createdAt !== before.createdAt ||
      !evaluateCompanionResidenceCampaign(state, before).allowed) return missionRefused(state, 'Le retour ne correspond pas au registre des compagnons.');
  const affected = state.contacts.some(contact => contact.stage === 'accepted' && companionRecruitmentDefinition(contact.id)?.missionId === result.missionId) ||
    state.members.some(member => member.deployment?.missionId === result.missionId);
  if (!affected) return missionUnchanged(state);
  const previous = before.missionProgress[result.missionId], progress = progressed.missionProgress[result.missionId];
  if (!session || session.ownerSaveCreatedAt !== before.createdAt || session.missionId !== result.missionId || !count(session.encounterRun) ||
      previous?.attempts !== session.encounterRun || progress?.attempts !== previous.attempts + 1 || !count(result.score) || result.score > 100 ||
      !count(result.scans) || !identity(result.completedAt) || !Number.isFinite(Date.parse(result.completedAt))) return missionRefused(state, 'Une nouvelle rencontre acceptée par la campagne est requise.');
  const succeeded = result.outcome === 'success' && progress.status === 'completed' && progress.completions === previous.completions + 1;
  const failed = ['failed', 'abandoned'].includes(result.outcome) && progress.completions === previous.completions && progress.status === previous.status;
  if (!succeeded && !failed) return missionRefused(state, 'La progression n’a pas confirmé ce résultat.');
  const next = JSON.parse(JSON.stringify(state)) as CompanionResidenceState;
  for (const contact of next.contacts) {
    const definition = companionRecruitmentDefinition(contact.id)!;
    if (contact.stage !== 'accepted' || definition.missionId !== result.missionId) continue;
    if (contact.encounterRun !== session.encounterRun || contact.baselineCompletions !== previous.completions)
      return missionRefused(state, 'Le résultat n’appartient pas à la reconnaissance acceptée.');
    contact.encounterRun = null;
    if (succeeded && result.score >= definition.minimumScore && result.scans >= definition.minimumScans) {
      contact.stage = 'proven'; contact.proof = { missionId: result.missionId, encounterRun: session.encounterRun,
        completedAt: result.completedAt, score: result.score, scans: result.scans };
    } else { contact.baselineAttempts = progress.attempts; contact.baselineCompletions = progress.completions; }
  }
  for (const member of next.members) {
    if (member.deployment?.missionId !== result.missionId) continue;
    if (member.deployment.encounterRun !== session.encounterRun) return missionRefused(state, 'Un autre départ possède encore ce passager.');
    member.deployment = null;
  }
  next.revision += 1;
  return { accepted: true, changed: true, state: next, message: 'Retour des compagnons et reconnaissance enregistrés sans recrutement automatique.' };
}

/** Only after the actual hunt recovery has been retired, as for clan contracts. */
export function releaseCompanionResidenceMission(save: CompanionCampaign, binding: { ownerCreatedAt: string; missionId: MissionId; encounterRun: number }): CompanionMissionUpdate {
  const inspected = inspectCompanionResidence(save.companionResidence, save.createdAt), state = inspected.state;
  if (inspected.status === 'absent') return missionUnchanged(null);
  if (!state || state.revision >= Number.MAX_SAFE_INTEGER - 1 || binding.ownerCreatedAt !== save.createdAt || !mission(binding.missionId) || !count(binding.encounterRun) ||
      !evaluateCompanionResidenceCampaign(state, save).allowed) return missionRefused(state, 'La reprise ne correspond pas au registre des compagnons.');
  const next = JSON.parse(JSON.stringify(state)) as CompanionResidenceState;
  let changed = false;
  for (const contact of next.contacts) {
    if (companionRecruitmentDefinition(contact.id)?.missionId !== binding.missionId || contact.encounterRun === null) continue;
    if (contact.encounterRun !== binding.encounterRun) return missionRefused(state, 'Une autre reconnaissance est encore active.');
    contact.encounterRun = null; changed = true;
  }
  for (const member of next.members) {
    if (member.deployment?.missionId !== binding.missionId) continue;
    if (member.deployment.encounterRun !== binding.encounterRun) return missionRefused(state, 'Un autre départ est encore actif.');
    member.deployment = null; changed = true;
  }
  if (!changed) return missionUnchanged(state);
  next.revision += 1;
  return { accepted: true, changed: true, state: next, message: 'Reprise retirée sans preuve ni recrutement.' };
}
