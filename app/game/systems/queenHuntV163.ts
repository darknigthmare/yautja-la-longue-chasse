import { evaluateChronicleAccess, type ChronicleAccessContext } from './clanChronicle';

/**
 * V163 — mode Queen Hunt (bible : « Mode Queen Hunt », « Ruches et Reine Mère »,
 * Échelle des rangs L5/L7/L8 ; classeur V6 : Xeno Prime XP-Z09/XP-Z12,
 * V5 États communs STATE5-06).
 *
 * Ce qui suit les sources :
 * - le mode s'ouvre au rang Elite (Level 5) ; les contrats se prennent à bord
 *   (« une ruche choisie sur la carte galactique ») ;
 * - trois tailles Petite / Moyenne / Grande, contenus, temps et récompenses
 *   repris mot pour mot de la bible, où ces valeurs sont déjà « proposées » ;
 * - les ruches procédurales ne comptent pas pour les rangs : ce module n'écrit
 *   ni rang, ni preuve de chronique, ni honneur ;
 * - firstQueenResolved (non_resolu, reussi, echoue, replie) n'est écrit que par
 *   la reine ACTIVE de XP-Z12 (le Berceau enfoui) ; le vestige XP-Z09 et les
 *   contrats ne l'écrivent jamais ; un événement consommé ne s'applique pas deux fois.
 *
 * Proposé (non fixé par les sources) : la mission support des contrats, le
 * score minimal par taille, le passage echoue/replie -> reussi du jalon,
 * l'état non jouable de la Descente.
 */

export const QUEEN_HUNT_VERSION_V163 = 1 as const;
/** Proposé : seule chasse existante dont le bestiaire V7 contient des Xénomorphes
 * (drone et prétorien, vague « ice-salvagers »). Sa cible finale reste le
 * Cryostalker Alpha : aucune reine n'apparaît dans cette mission. */
export const QUEEN_HUNT_SUPPORT_MISSION_V163 = 'ice-cryostalker' as const;
export const QUEEN_HUNT_SUPPORT_XENO_IDS_V163 = ['xeno-drone', 'xeno-praetorian'] as const;

export type QueenHuntSizeIdV163 = 'petite' | 'moyenne' | 'grande';
export interface QueenHuntContractV163 {
  id: `queen-hunt-${QueenHuntSizeIdV163}`;
  size: QueenHuntSizeIdV163;
  label: string;
  /** Bible, colonne « Contenu » (valeurs proposées par la bible). */
  content: string;
  queen: string;
  durationMinutes: number;
  rewardText: string;
  rewardHonorProposed: number;
  /** Proposé : exigence de score de la mission support. */
  minimumScore: number;
}

export const QUEEN_HUNT_CONTRACTS_V163: readonly QueenHuntContractV163[] = [
  { id: 'queen-hunt-petite', size: 'petite', label: 'Petite ruche', content: 'drones, facehuggers, une reine jeune',
    queen: 'reine jeune', durationMinutes: 10, rewardText: '400 d’honneur, crâne de reine, chitine', rewardHonorProposed: 400, minimumScore: 50 },
  { id: 'queen-hunt-moyenne', size: 'moyenne', label: 'Ruche moyenne', content: 'drones, facehuggers, guerriers, un praetorien',
    queen: 'reine (âge non précisé par la bible)', durationMinutes: 18, rewardText: '700, crâne, chitine et acide figé', rewardHonorProposed: 700, minimumScore: 65 },
  { id: 'queen-hunt-grande', size: 'grande', label: 'Grande ruche', content: 'drones, facehuggers, guerriers, variantes de la planète hôte, deux praetoriens',
    queen: 'reine adulte', durationMinutes: 25, rewardText: '1 100, crâne, matériaux rares', rewardHonorProposed: 1100, minimumScore: 80 },
];

/** Bible : « une ruche sans fin par paliers ; le joueur remonte quand il veut et
 * garde ce qu'il rapporte ; une reine tous les 5 paliers ; classement en ligne
 * au palier atteint (proposé) ». Données seulement : rien de cela n'est jouable. */
export const QUEEN_HUNT_DESCENT_V163 = {
  id: 'queen-hunt-descente',
  label: 'Descente',
  rule: 'Ruche sans fin par paliers ; remontée libre en gardant ce qui est rapporté ; une reine tous les 5 paliers.',
  queenEveryFloors: 5,
  leaderboard: 'Classement en ligne au palier atteint (proposé) : le jeu n’a aucun service en ligne.',
  playable: false,
  status: 'Non jouable dans cette version : aucun générateur de paliers ni reine jouable n’existe encore.',
} as const;

/** Rang : seules les ruches écrites des étapes de rang comptent (bible). */
export const QUEEN_HUNT_RANK_NOTE_V163 = 'Les ruches de ce mode ne comptent pas pour les rangs : seules les ruches écrites (3 pour Clan Leader, 5 + Reine Mère pour Adjudicator) comptent.';

export type FirstQueenValueV163 = 'non_resolu' | 'reussi' | 'echoue' | 'replie';
export const FIRST_QUEEN_VALUES_V163: readonly FirstQueenValueV163[] = ['non_resolu', 'reussi', 'echoue', 'replie'];
/** Même zone que CRADLE_CAMPAIGN_SOURCE.zoneId (buriedCradleCampaign.ts). */
export const FIRST_QUEEN_ZONE_V163 = 'XP-Z12' as const;
export const FIRST_QUEEN_VESTIGE_ZONE_V163 = 'XP-Z09' as const;

export interface FirstQueenRecordV163 {
  value: FirstQueenValueV163;
  eventId: string | null;
  zoneId: typeof FIRST_QUEEN_ZONE_V163 | null;
  at: string | null;
}
export type QueenHuntOutcomeV163 = 'reussi' | 'echoue' | 'replie';
export interface QueenHuntActiveContractV163 {
  contractId: QueenHuntContractV163['id'];
  missionId: typeof QUEEN_HUNT_SUPPORT_MISSION_V163;
  /** missionProgress.attempts au moment de la prise : seule cette rencontre règle le contrat. */
  encounterRun: number;
  takenAt: string;
}
export interface QueenHuntResultV163 {
  eventId: string;
  contractId: QueenHuntContractV163['id'];
  outcome: QueenHuntOutcomeV163;
  score: number;
  xenoEncountered: boolean;
  at: string;
}
export interface QueenHuntStateV163 {
  version: typeof QUEEN_HUNT_VERSION_V163;
  ownerCreatedAt: string;
  activeContract: QueenHuntActiveContractV163 | null;
  results: QueenHuntResultV163[];
  firstQueenResolved: FirstQueenRecordV163;
}
export interface QueenHuntInspectionV163 { status: 'absent' | 'valid' | 'future-version' | 'invalid'; state: QueenHuntStateV163 | null }
export interface QueenHuntUpdateV163 { accepted: boolean; changed: boolean; state: QueenHuntStateV163; message: string }

const MAX_RESULTS_V163 = 200;
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === 'object' && !Array.isArray(v);
const isoDate = (v: unknown): v is string => typeof v === 'string' && v.length <= 40 && Number.isFinite(Date.parse(v));
const safeId = (v: unknown): v is string => typeof v === 'string' && v.length > 0 && v.length <= 160 && /^[A-Za-z0-9:._-]+$/.test(v);
const contractIds = new Set<string>(QUEEN_HUNT_CONTRACTS_V163.map(c => c.id));
const nonNegativeInteger = (v: unknown): v is number => Number.isSafeInteger(v) && (v as number) >= 0;

export function queenHuntContractV163(id: unknown): QueenHuntContractV163 | null {
  return QUEEN_HUNT_CONTRACTS_V163.find(c => c.id === id) ?? null;
}
export function emptyQueenHuntV163(ownerCreatedAt: string): QueenHuntStateV163 {
  return { version: 1, ownerCreatedAt, activeContract: null, results: [],
    firstQueenResolved: { value: 'non_resolu', eventId: null, zoneId: null, at: null } };
}

export function inspectQueenHuntV163(value: unknown, ownerCreatedAt: string): QueenHuntInspectionV163 {
  if (value == null) return { status: 'absent', state: null };
  if (record(value) && typeof value.version === 'number' && value.version > QUEEN_HUNT_VERSION_V163) return { status: 'future-version', state: null };
  const invalid: QueenHuntInspectionV163 = { status: 'invalid', state: null };
  if (!record(value) || value.version !== 1 || value.ownerCreatedAt !== ownerCreatedAt || !isoDate(ownerCreatedAt) ||
      !Array.isArray(value.results) || value.results.length > MAX_RESULTS_V163 || !record(value.firstQueenResolved)) return invalid;
  const active = value.activeContract;
  let activeContract: QueenHuntActiveContractV163 | null = null;
  if (active !== null) {
    if (!record(active) || !contractIds.has(String(active.contractId)) || active.missionId !== QUEEN_HUNT_SUPPORT_MISSION_V163 ||
        !nonNegativeInteger(active.encounterRun) || !isoDate(active.takenAt)) return invalid;
    activeContract = { contractId: active.contractId as QueenHuntActiveContractV163['contractId'], missionId: QUEEN_HUNT_SUPPORT_MISSION_V163,
      encounterRun: active.encounterRun, takenAt: active.takenAt };
  }
  const results: QueenHuntResultV163[] = [];
  const seen = new Set<string>();
  for (const r of value.results) {
    if (!record(r) || !safeId(r.eventId) || seen.has(r.eventId) || !contractIds.has(String(r.contractId)) ||
        !['reussi', 'echoue', 'replie'].includes(String(r.outcome)) || !nonNegativeInteger(r.score) || (r.score as number) > 100 ||
        typeof r.xenoEncountered !== 'boolean' || !isoDate(r.at)) return invalid;
    seen.add(r.eventId);
    results.push({ eventId: r.eventId, contractId: r.contractId as QueenHuntResultV163['contractId'], outcome: r.outcome as QueenHuntOutcomeV163,
      score: r.score as number, xenoEncountered: r.xenoEncountered, at: r.at });
  }
  const fq = value.firstQueenResolved;
  if (!FIRST_QUEEN_VALUES_V163.includes(fq.value as FirstQueenValueV163)) return invalid;
  const unresolved = fq.value === 'non_resolu';
  if (unresolved ? fq.eventId !== null || fq.zoneId !== null || fq.at !== null
    : !safeId(fq.eventId) || fq.zoneId !== FIRST_QUEEN_ZONE_V163 || !isoDate(fq.at)) return invalid;
  return { status: 'valid', state: { version: 1, ownerCreatedAt, activeContract, results,
    firstQueenResolved: { value: fq.value as FirstQueenValueV163, eventId: fq.eventId as string | null,
      zoneId: fq.zoneId as FirstQueenRecordV163['zoneId'], at: fq.at as string | null } } };
}
export function normalizeQueenHuntV163(value: unknown, ownerCreatedAt: string): QueenHuntStateV163 | null {
  return inspectQueenHuntV163(value, ownerCreatedAt).state;
}

/** Données minimales de la campagne lues pour l'accès ; rien n'est écrit. */
export interface QueenHuntSaveEvidenceV163 {
  createdAt: string;
  profile: { rankId: string };
  prologue?: { chronicle: unknown } | null;
  missionProgress: Record<string, { status: string; attempts: number; completions: number } | undefined>;
  buriedCradle?: { status?: unknown; outcome?: unknown; ownerCreatedAt?: unknown } | null;
}
export interface QueenHuntAccessV163 { allowed: boolean; missing: string[] }

export function evaluateQueenHuntAccessV163(save: QueenHuntSaveEvidenceV163, context: ChronicleAccessContext): QueenHuntAccessV163 {
  const missing: string[] = [];
  if (save.prologue) {
    // Campagne révisée : rang narratif Elite + vaisseau réellement disponible.
    const access = evaluateChronicleAccess(save.prologue.chronicle, 'elite-contracts', context);
    missing.push(...access.missing.map(m => m.label));
  } else {
    if (!['elite', 'elder'].includes(save.profile.rankId)) missing.push('Rang requis : Elite');
    if (context.personalShipAvailable !== true) missing.push('Vaisseau personnel réellement disponible');
  }
  const support = save.missionProgress[QUEEN_HUNT_SUPPORT_MISSION_V163];
  if (!support || !['available', 'completed'].includes(support.status)) missing.push('Mission support « Chaleur sous la glace » ouverte');
  return { allowed: missing.length === 0, missing };
}

const refuse = (state: QueenHuntStateV163, message: string): QueenHuntUpdateV163 => ({ accepted: false, changed: false, state, message });

export function takeQueenHuntContractV163(state: QueenHuntStateV163 | null | undefined, save: QueenHuntSaveEvidenceV163,
  context: ChronicleAccessContext, contractId: unknown, at: string): QueenHuntUpdateV163 {
  const current = state ? inspectQueenHuntV163(state, save.createdAt).state : emptyQueenHuntV163(save.createdAt);
  const base = current ?? emptyQueenHuntV163(save.createdAt);
  if (!current) return refuse(base, 'Le registre Queen Hunt n’appartient pas à cette campagne.');
  const contract = queenHuntContractV163(contractId);
  if (!contract) return refuse(current, 'Contrat de ruche inconnu.');
  const access = evaluateQueenHuntAccessV163(save, context);
  if (!access.allowed) return refuse(current, 'Accès refusé : ' + access.missing.join(' ; ') + '.');
  if (current.activeContract) return refuse(current, 'Un contrat de ruche est déjà en cours.');
  if (!isoDate(at)) return refuse(current, 'Date de prise invalide.');
  const encounterRun = save.missionProgress[QUEEN_HUNT_SUPPORT_MISSION_V163]!.attempts;
  return { accepted: true, changed: true, message: `${contract.label} acceptée. La prochaine sortie « Chaleur sous la glace » règle ce contrat.`,
    state: { ...current, activeContract: { contractId: contract.id, missionId: QUEEN_HUNT_SUPPORT_MISSION_V163, encounterRun, takenAt: at } } };
}

export function abandonQueenHuntContractV163(state: QueenHuntStateV163): QueenHuntUpdateV163 {
  if (!state.activeContract) return { accepted: true, changed: false, state, message: 'Aucun contrat en cours.' };
  // Aucune sortie jouée : rien n'est enregistré, le jalon n'est pas touché.
  return { accepted: true, changed: true, state: { ...state, activeContract: null }, message: 'Contrat rendu sans sortie : aucun résultat enregistré.' };
}

export interface QueenHuntMissionEvidenceV163 {
  missionId: string; outcome: 'success' | 'failed' | 'abandoned' | string; score: number;
  discoveredEnemyIds?: readonly string[]; completedAt: string;
}
export interface QueenHuntSessionEvidenceV163 { runId: string; missionId: string; encounterRun: number; ownerSaveCreatedAt: string }

/** Règle le contrat suivi avec le résultat d'une sortie réelle de la mission support.
 * Le runId de la session est l'identifiant d'événement : un second règlement est ignoré. */
export function settleQueenHuntMissionV163(state: QueenHuntStateV163 | null | undefined, result: QueenHuntMissionEvidenceV163,
  session: QueenHuntSessionEvidenceV163 | null, attemptsAfter: number): QueenHuntUpdateV163 {
  if (!state) return { accepted: true, changed: false, state: state as unknown as QueenHuntStateV163, message: 'Aucun registre Queen Hunt.' };
  const active = state.activeContract;
  if (!session || !safeId(session.runId)) return { accepted: true, changed: false, state, message: 'Aucune session de chasse liée.' };
  if (state.results.some(r => r.eventId === session.runId)) return { accepted: true, changed: false, state, message: 'Résultat déjà enregistré.' };
  if (!active || result.missionId !== active.missionId || session.missionId !== active.missionId) {
    return { accepted: true, changed: false, state, message: 'Cette chasse ne concerne pas un contrat de ruche.' };
  }
  if (session.ownerSaveCreatedAt !== state.ownerCreatedAt || session.encounterRun !== active.encounterRun ||
      attemptsAfter !== active.encounterRun + 1) return refuse(state, 'La progression ne confirme pas la sortie liée au contrat.');
  const contract = queenHuntContractV163(active.contractId)!;
  const score = Math.max(0, Math.min(100, Math.round(Number(result.score) || 0)));
  const outcome: QueenHuntOutcomeV163 = result.outcome === 'success' ? (score >= contract.minimumScore ? 'reussi' : 'echoue')
    : result.outcome === 'abandoned' ? 'replie' : 'echoue';
  const at = isoDate(result.completedAt) ? result.completedAt : new Date().toISOString();
  const xenoEncountered = (result.discoveredEnemyIds ?? []).some(id => (QUEEN_HUNT_SUPPORT_XENO_IDS_V163 as readonly string[]).includes(id));
  const results = [...state.results, { eventId: session.runId, contractId: contract.id, outcome, score, xenoEncountered, at }].slice(-MAX_RESULTS_V163);
  const label = outcome === 'reussi' ? 'réussi' : outcome === 'replie' ? 'repli' : 'échoué';
  return { accepted: true, changed: true, state: { ...state, activeContract: null, results },
    message: `${contract.label} : contrat ${label} (score ${score}/${contract.minimumScore}). Récompense de la bible non versée : aucune reine n’apparaît dans la mission support.` };
}

/** Événement de reine pouvant viser le jalon commun. Seule la reine ACTIVE de XP-Z12 l'écrit. */
export interface FirstQueenEventV163 { eventId: string; zoneId: string; queenState: 'active' | 'vestige'; value: FirstQueenValueV163; at: string }

export function recordFirstQueenV163(state: QueenHuntStateV163, event: FirstQueenEventV163): QueenHuntUpdateV163 {
  if (!record(event) || !safeId(event.eventId) || !isoDate(event.at)) return refuse(state, 'Événement de reine invalide.');
  if (event.zoneId === FIRST_QUEEN_VESTIGE_ZONE_V163 || event.queenState === 'vestige') return refuse(state, 'Le vestige XP-Z09 ne peut pas écrire ce jalon.');
  if (event.zoneId !== FIRST_QUEEN_ZONE_V163 || event.queenState !== 'active') return refuse(state, 'Seule la reine active de XP-Z12 écrit ce jalon.');
  if (!['reussi', 'echoue', 'replie'].includes(event.value)) return refuse(state, 'Valeur de jalon invalide.');
  const current = state.firstQueenResolved;
  if (current.eventId === event.eventId) return { accepted: true, changed: false, state, message: 'Événement déjà consommé.' };
  // Proposé : « reussi » est définitif ; un repli ou un échec peut être suivi d'une victoire.
  if (current.value === 'reussi') return { accepted: true, changed: false, state, message: 'Jalon déjà résolu par une victoire.' };
  return { accepted: true, changed: true, message: 'Jalon firstQueenResolved enregistré.',
    state: { ...state, firstQueenResolved: { value: event.value, eventId: event.eventId, zoneId: FIRST_QUEEN_ZONE_V163, at: event.at } } };
}

/** Le Berceau enfoui (PLAN08, XP-Z11 -> XP-Z12) est la reine active existante.
 * Sorties terminales : boss vaincu -> reussi ; repli -> replie. Le Berceau n'a
 * pas d'état d'échec distinct : « echoue » n'en sort donc jamais. */
export function firstQueenEventFromCradleV163(save: QueenHuntSaveEvidenceV163, at: string): FirstQueenEventV163 | null {
  const cradle = save.buriedCradle;
  if (!record(cradle) || cradle.ownerCreatedAt !== save.createdAt || !['extracted', 'reported'].includes(String(cradle.status))) return null;
  const value: FirstQueenValueV163 | null = cradle.outcome === 'crown-returned' || cradle.outcome === 'victory-without-crown' ? 'reussi'
    : cradle.outcome === 'retreated' ? 'replie' : null;
  if (!value) return null;
  return { eventId: `buried-cradle:${String(cradle.status)}:${String(cradle.outcome)}`, zoneId: FIRST_QUEEN_ZONE_V163, queenState: 'active', value, at };
}

export function syncFirstQueenFromCradleV163(state: QueenHuntStateV163, save: QueenHuntSaveEvidenceV163, at: string): QueenHuntUpdateV163 {
  const event = firstQueenEventFromCradleV163(save, at);
  if (!event) return { accepted: true, changed: false, state, message: 'Aucune issue de la reine active à enregistrer.' };
  return recordFirstQueenV163(state, event);
}
