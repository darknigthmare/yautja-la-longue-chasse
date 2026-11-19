/**
 * MOB-012 · Montures biologiques (V153).
 *
 * Sources (classeur mobilité 20261108 et classeur V6) :
 * - Reste_a_faire MOB-012 : « BOND, endurance, blessures, peur, soins et
 *   recrutement explicite » ; réserve « Aucun animal attribué par défaut ».
 * - Acquisition kha_rha : « Capturer un jeune adulte durant la quête « Premier
 *   lien », puis réussir trois exercices de confiance. »
 * - Fonctionnement / catalogue : faiblesses citées mot pour mot dans
 *   MOUNT_REACTION_SOURCES_V153.
 * - Maintenance : « les soins biologiques ne sont pas une réparation
 *   mécanique » ; kha_rha « Soins / repos ; aucun lien BOND gratuit » ;
 *   formule ceil((100−état) × 1,2 + (100−énergie) × 0,2).
 * - Equipements_montures : « Aucun équipement ne crée une recrue ou un BOND ».
 * - V6 « V5 États communs » STATE5-14 mountBond 0..100, « Maximum 5 points par
 *   séance valide » ; un événement déjà consommé ne s'applique pas à nouveau.
 *   STATE5-15 mountFatigue 0..100, « Le lien élevé ne ramène pas la fatigue à
 *   zéro ».
 * - V6 « Lien des montures » MOUNT-01..16 : lien initial 0, paliers 25/50/75/100,
 *   gain max 5 par séance, « Une mauvaise approche interrompt l'exercice »,
 *   « Le soigneur propose une reprise courte ».
 *   Attention : dans V6, MOB-35..50 désignent d'autres créatures (MOB-35 =
 *   « Porte-corne des cendres ») que le catalogue du jeu (index 35 = kha_rha).
 *   Seules les règles communes aux 16 fiches sont reprises ; leur application
 *   aux montures du catalogue est PROPOSÉE.
 *
 * Tout chiffre ou contenu non fixé par ces sources est marqué « proposé ».
 * Module pur : aucune écriture de sauvegarde, aucun accès navigateur.
 */
import { MOBILITY_CATALOGUE, mobilityDefinition, mobilityRankIndex } from './catalogue.ts';
import { inspectMobilityLedger, mobilityCampaignEligible, type MobilityLedger } from './ledger.ts';
import type { SaveGame } from '../../types';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** STATE5-14 : 0..100. */
export const MOUNT_BOND_MAX_V153 = 100;
/** STATE5-14 / MOUNT-xx « Gain max par seance » : 5. */
export const MOUNT_SESSION_GAIN_CAP_V153 = 5;
/** MOUNT-01..16 : paliers 25/50/75/100 (transposés au catalogue du jeu : proposé). */
export const MOUNT_BOND_THRESHOLDS_V153 = [25, 50, 75, 100] as const;
/** Proposé : « faible BOND » = sous le premier palier V6 (25). */
export const MOUNT_LOW_BOND_V153 = 25;
/** Proposé : fatigue à partir de laquelle l'animal refuse tout exercice. */
export const MOUNT_FATIGUE_REFUSAL_V153 = 80;
/** Proposé : blessure à partir de laquelle l'animal refuse tout exercice. */
export const MOUNT_INJURY_REFUSAL_V153 = 50;
/** Proposé : blessure infligée par une panique. */
export const MOUNT_PANIC_INJURY_V153 = 10;
/** Proposé : « explosions répétées » = à partir de la 2e exposition d'une même séance. */
export const MOUNT_REPEATED_EXPLOSIONS_V153 = 2;
export const MOUNT_EVENT_MEMORY_V153 = 64;

// ---------------------------------------------------------------------------
// Profils (tirés du catalogue)
// ---------------------------------------------------------------------------

export const MOUNT_CONDITIONS_V153 = ['calm', 'fire', 'toxic', 'explosions', 'isolation', 'intense-light', 'enclosed'] as const;
export type MountConditionV153 = (typeof MOUNT_CONDITIONS_V153)[number];
export const MOUNT_CONDITION_LABELS_V153: Record<MountConditionV153, string> = {
  calm: 'Terrain calme', fire: 'Feu ou brasier proche', toxic: 'Environnement toxique',
  explosions: 'Explosion à proximité', isolation: 'Isolé du troupeau', 'intense-light': 'Lumière intense', enclosed: 'Espace clos',
};

export interface MountReactionV153 {
  trigger: Exclude<MountConditionV153, 'calm'>;
  reaction: 'panic' | 'refusal';
  /** Réaction seulement sous ce BOND ; null = quel que soit le BOND. */
  bondBelow: number | null;
  /** Nombre d'expositions dans la séance avant la réaction ; null = dès la première. */
  repeated: number | null;
  /** Texte exact du catalogue. */
  source: string;
  /** Ce qui est proposé dans l'interprétation (seuil, équipement…). */
  proposed: string;
}

/** Faiblesses du catalogue converties en réactions. Les textes sont cités exactement. */
export const MOUNT_REACTION_SOURCES_V153: readonly MountReactionV153[] = Object.freeze([
  { trigger: 'fire', reaction: 'panic', bondBelow: MOUNT_LOW_BOND_V153, repeated: null, source: 'Peur du feu au faible BOND', proposed: 'Seuil « faible BOND » fixé à 25 ; la peur se traduit par une panique.' },
  { trigger: 'toxic', reaction: 'refusal', bondBelow: null, repeated: null, source: 'Refuse les environnements toxiques sans équipement', proposed: 'Aucun équipement biologique n’est implémenté : le refus est donc permanent.' },
  { trigger: 'explosions', reaction: 'panic', bondBelow: null, repeated: MOUNT_REPEATED_EXPLOSIONS_V153, source: 'Panique face aux explosions répétées', proposed: '« Répétées » = deuxième exposition dans la même séance.' },
  { trigger: 'isolation', reaction: 'panic', bondBelow: MOUNT_LOW_BOND_V153, repeated: null, source: 'Panique si isolé du troupeau à faible BOND', proposed: 'Seuil « faible BOND » fixé à 25.' },
  { trigger: 'intense-light', reaction: 'refusal', bondBelow: null, repeated: null, source: 'Déteste les lumières intenses', proposed: '« Déteste » traduit par un refus de l’exercice.' },
  { trigger: 'enclosed', reaction: 'refusal', bondBelow: null, repeated: null, source: 'Refuse les espaces clos', proposed: 'Aucun.' },
]);

export interface TrustOptionV153 { id: string; label: string; ok: boolean; feedback: string }
export interface TrustExerciseV153 { id: string; label: string; source: string; options: readonly TrustOptionV153[] }

/**
 * Les « trois exercices de confiance » de la fiche Acquisition kha_rha.
 * La source ne décrit pas leur contenu : les trois exercices ci-dessous sont
 * PROPOSÉS et s'appuient chacun sur une ligne du catalogue citée dans `source`.
 */
export const KHA_RHA_TRUST_EXERCISES_V153: readonly TrustExerciseV153[] = Object.freeze([
  {
    id: 'approach-without-fire', label: 'Approche sans flamme',
    source: 'Faiblesse « Peur du feu au faible BOND » (contenu de l’exercice proposé).',
    options: [
      { id: 'torch', label: 'Avancer torche allumée pour bien voir l’animal', ok: false, feedback: 'La flamme l’affole : il recule et souffle. L’exercice est interrompu ; une reprise courte reste possible.' },
      { id: 'no-fire', label: 'Éteindre la torche et approcher de côté, à son allure', ok: true, feedback: 'Il te laisse approcher à portée de main sans reculer.' },
    ],
  },
  {
    id: 'shared-scent', label: 'Partager la piste',
    source: 'Capacité « Odorat de piste » (contenu de l’exercice proposé).',
    options: [
      { id: 'pull', label: 'Tirer sur la longe pour le mettre sur la piste', ok: false, feedback: 'Il se braque contre la longe. L’exercice est interrompu ; une reprise courte reste possible.' },
      { id: 'scent-first', label: 'Lui laisser sentir la trace, puis le suivre quand il la prend', ok: true, feedback: 'Il prend la trace et revient vers toi au bout de la piste.' },
    ],
  },
  {
    id: 'short-circuit', label: 'Circuit court avec arrêt et retour',
    source: 'Faiblesse « Fatigue réelle » ; motif V6 « effectuer un circuit court avec arrêt et retour » (transposé, proposé).',
    options: [
      { id: 'no-stop', label: 'Enchaîner le circuit sans s’arrêter', ok: false, feedback: 'Essoufflé, il refuse d’aller plus loin. L’exercice est interrompu ; une reprise courte reste possible.' },
      { id: 'stop-return', label: 'S’arrêter au repère, le laisser souffler, puis revenir au pas', ok: true, feedback: 'Il marque l’arrêt avec toi et revient au point de départ.' },
    ],
  },
]);

export interface MountExerciseV153 { id: string; label: string; minBond: number; gain: number; fatigue: number; maxFatigueBefore: number | null }
/**
 * Séances de lien. Paliers et intitulés repris des fiches MOUNT-xx V6
 * (« 25 : déplacement en main et rappel. 50 : circuit monté… 75 : charge
 * adaptée avec pause de fatigue ») ; gains et fatigue : PROPOSÉS.
 */
export const MOUNT_EXERCISES_V153: readonly MountExerciseV153[] = Object.freeze([
  { id: 'groundwork', label: 'Approche et pansage', minBond: 0, gain: 2, fatigue: 8, maxFatigueBefore: null },
  { id: 'lead', label: 'Déplacement en main et rappel', minBond: 25, gain: 3, fatigue: 12, maxFatigueBefore: null },
  { id: 'mounted-circuit', label: 'Circuit monté court', minBond: 50, gain: 4, fatigue: 18, maxFatigueBefore: null },
  { id: 'charge', label: 'Charge adaptée avec pause de fatigue', minBond: 75, gain: 5, fatigue: 25, maxFatigueBefore: 40 },
]);

export interface MountProfileV153 {
  id: string; name: string; acquisition: string; weaknesses: readonly string[];
  reactions: readonly MountReactionV153[];
  /** Seule voie jouable implémentée ; null = obtention non implémentée. */
  recruitment: 'trust-exercises' | null;
  trustExercises: readonly TrustExerciseV153[];
}

export const MOUNT_PROFILES_V153: readonly MountProfileV153[] = Object.freeze(
  MOBILITY_CATALOGUE.filter(d => d.kind === 'mount').map(d => ({
    id: d.id, name: d.name, acquisition: d.acquisition, weaknesses: d.weaknesses,
    reactions: MOUNT_REACTION_SOURCES_V153.filter(r => d.weaknesses.includes(r.source)),
    recruitment: d.id === 'kha_rha' ? 'trust-exercises' as const : null,
    trustExercises: d.id === 'kha_rha' ? KHA_RHA_TRUST_EXERCISES_V153 : [],
  })),
);
export const mountProfileV153 = (id: unknown): MountProfileV153 | undefined => MOUNT_PROFILES_V153.find(p => p.id === id);

/** Réaction d'une monture à une condition, selon son BOND et les expositions de la séance (compte inclus). */
export function mountReactionV153(profile: MountProfileV153, condition: MountConditionV153, bond: number, exposures = 1): 'none' | 'panic' | 'refusal' {
  for (const r of profile.reactions) {
    if (r.trigger !== condition) continue;
    if (r.bondBelow !== null && bond >= r.bondBelow) continue;
    if (r.repeated !== null && exposures < r.repeated) continue;
    return r.reaction;
  }
  return 'none';
}

// ---------------------------------------------------------------------------
// État de campagne
// ---------------------------------------------------------------------------

export interface MountTrialV153 {
  id: string; mountId: string; status: 'open' | 'complete';
  passed: { exerciseId: string; eventId: string }[];
  attempts: number;
}
export interface MountV153 {
  id: string; recruitedRevision: number;
  proof: { kind: 'trust-exercises'; trialId: string; eventIds: string[] };
  bond: number; fatigue: number; injury: number; sessions: number;
}
export interface MountSessionV153 { id: string; mountId: string; gain: number; explosions: number }
export interface MountsV153 {
  version: 1; ownerCreatedAt: string; revision: number;
  trial: MountTrialV153 | null;
  mounts: MountV153[];
  session: MountSessionV153 | null;
  lastSession: { id: string; mountId: string; gain: number; outcome: 'closed' | 'interrupted' } | null;
  nextSessionId: number;
  consumedEventIds: string[];
  spentMarks: number;
}

export type MountOrderV153 =
  | { type: 'begin-trial'; mountId: string }
  | { type: 'trust-exercise'; trialId: string; exerciseId: string; optionId: string; eventId: string }
  | { type: 'recruit'; mountId: string; trialId: string }
  | { type: 'open-session'; mountId: string }
  | { type: 'exercise'; sessionId: string; exerciseId: string; condition: MountConditionV153; eventId: string }
  | { type: 'close-session'; sessionId: string }
  | { type: 'care'; mountId: string; expectedCost: number };
export type MountCommandV153 = MountOrderV153 & { ownerCreatedAt: string; expectedRevision: number };
export type MountOutcomeV153 = 'recorded' | 'passed' | 'interrupted' | 'completed' | 'refused' | 'panic';
export interface MountResultV153 { accepted: boolean; message: string; state: MountsV153 | null; clanMarks: number; outcome: MountOutcomeV153 | null }
export interface MountReceiptV153 { accepted: boolean; message: string; state: MountsV153 | null }
export type MountWriterV153 = (command: MountCommandV153) => MountReceiptV153;

const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const integer = (v: unknown, lo = 0, hi = 1_000_000_000): v is number => Number.isSafeInteger(v) && (v as number) >= lo && (v as number) <= hi;
const keys = (v: object, allowed: readonly string[]) => Object.keys(v).length === allowed.length && allowed.every(k => Object.hasOwn(v, k));
const EVENT_ID = /^[a-z0-9][a-z0-9-]{3,63}$/;
const trialIdFor = (mountId: string) => `trial-${mountId.replace(/_/g, '-')}`;

/** Aucun animal par défaut : l'état neuf est vide. */
export const createMountsV153 = (ownerCreatedAt: string): MountsV153 => ({
  version: 1, ownerCreatedAt, revision: 0, trial: null, mounts: [], session: null, lastSession: null,
  nextSessionId: 1, consumedEventIds: [], spentMarks: 0,
});

export function inspectMountsV153(raw: unknown, owner: string): { status: 'absent' | 'valid' | 'future-version' | 'invalid-save'; state: MountsV153 | null } {
  const bad = { status: 'invalid-save' as const, state: null };
  if (raw === undefined || raw === null) return { status: 'absent', state: null };
  if (!record(raw)) return bad;
  if (typeof raw.version === 'number' && raw.version > 1) return { status: 'future-version', state: null };
  if (raw.version !== 1 || raw.ownerCreatedAt !== owner || !Number.isFinite(Date.parse(owner)) ||
      !keys(raw, ['version', 'ownerCreatedAt', 'revision', 'trial', 'mounts', 'session', 'lastSession', 'nextSessionId', 'consumedEventIds', 'spentMarks']) ||
      !integer(raw.revision) || !integer(raw.nextSessionId, 1) || !integer(raw.spentMarks) ||
      !Array.isArray(raw.mounts) || raw.mounts.length > MOUNT_PROFILES_V153.length ||
      !Array.isArray(raw.consumedEventIds) || raw.consumedEventIds.length > MOUNT_EVENT_MEMORY_V153 ||
      !raw.consumedEventIds.every(e => typeof e === 'string' && EVENT_ID.test(e)) ||
      new Set(raw.consumedEventIds).size !== raw.consumedEventIds.length) return bad;
  const trial = raw.trial;
  if (trial !== null) {
    if (!record(trial) || !keys(trial, ['id', 'mountId', 'status', 'passed', 'attempts']) || typeof trial.mountId !== 'string') return bad;
    const profile = mountProfileV153(trial.mountId);
    if (!profile || profile.recruitment !== 'trust-exercises' || trial.id !== trialIdFor(profile.id) ||
        !['open', 'complete'].includes(String(trial.status)) || !Array.isArray(trial.passed) || !integer(trial.attempts) ||
        trial.passed.length > profile.trustExercises.length || trial.attempts < trial.passed.length) return bad;
    for (const [i, p] of trial.passed.entries()) {
      if (!record(p) || !keys(p, ['exerciseId', 'eventId']) || p.exerciseId !== profile.trustExercises[i].id ||
          typeof p.eventId !== 'string' || !EVENT_ID.test(p.eventId)) return bad;
    }
    if ((trial.status === 'complete') !== (trial.passed.length === profile.trustExercises.length)) return bad;
  }
  const ids = new Set<string>();
  for (const m of raw.mounts) {
    if (!record(m) || !keys(m, ['id', 'recruitedRevision', 'proof', 'bond', 'fatigue', 'injury', 'sessions']) || typeof m.id !== 'string' || ids.has(m.id)) return bad;
    const profile = mountProfileV153(m.id);
    // Aucune monture sans voie de recrutement jouable ; jamais de propriété par défaut.
    if (!profile || profile.recruitment !== 'trust-exercises') return bad;
    if (!integer(m.recruitedRevision, 1) || m.recruitedRevision > (raw.revision as number) || !integer(m.bond, 0, MOUNT_BOND_MAX_V153) ||
        !integer(m.fatigue, 0, 100) || !integer(m.injury, 0, 100) || !integer(m.sessions)) return bad;
    const proof = m.proof;
    if (!record(proof) || !keys(proof, ['kind', 'trialId', 'eventIds']) || proof.kind !== 'trust-exercises' || !record(trial) ||
        trial.status !== 'complete' || trial.mountId !== m.id || proof.trialId !== trial.id || !Array.isArray(proof.eventIds) ||
        JSON.stringify(proof.eventIds) !== JSON.stringify((trial.passed as { eventId: string }[]).map(p => p.eventId))) return bad;
    ids.add(m.id);
  }
  const s = raw.session;
  if (s !== null) {
    if (!record(s) || !keys(s, ['id', 'mountId', 'gain', 'explosions']) || typeof s.id !== 'string' || !/^S[1-9][0-9]{0,9}$/.test(s.id) ||
        Number(s.id.slice(1)) >= (raw.nextSessionId as number) || typeof s.mountId !== 'string' || !ids.has(s.mountId) ||
        !integer(s.gain, 0, MOUNT_SESSION_GAIN_CAP_V153) || !integer(s.explosions, 0, 1000)) return bad;
  }
  const l = raw.lastSession;
  if (l !== null) {
    if (!record(l) || !keys(l, ['id', 'mountId', 'gain', 'outcome']) || typeof l.id !== 'string' || !/^S[1-9][0-9]{0,9}$/.test(l.id) ||
        Number(l.id.slice(1)) >= (raw.nextSessionId as number) || typeof l.mountId !== 'string' || !ids.has(l.mountId) ||
        !integer(l.gain, 0, MOUNT_SESSION_GAIN_CAP_V153) || !['closed', 'interrupted'].includes(String(l.outcome))) return bad;
  }
  return { status: 'valid', state: structuredClone(raw) as unknown as MountsV153 };
}

/** Maintenance kha_rha : ceil((100−état) × 1,2 + (100−énergie) × 0,2), avec état = 100 − blessure et énergie = 100 − fatigue (correspondance proposée). */
export function mountCareQuoteV153(state: MountsV153, mountId: string): number | null {
  const m = state.mounts.find(v => v.id === mountId);
  if (!m || state.session || (m.injury === 0 && m.fatigue === 0)) return null;
  return Math.max(1, Math.ceil(m.injury * 1.2 + m.fatigue * 0.2));
}

/** Raison pour laquelle l'exercice serait refusé par l'animal (avant toute condition), ou null. */
export function mountExerciseRefusalV153(m: MountV153, exercise: MountExerciseV153): string | null {
  if (m.injury >= MOUNT_INJURY_REFUSAL_V153) return 'Blessé, il refuse l’exercice : des soins sont nécessaires.';
  if (m.fatigue >= MOUNT_FATIGUE_REFUSAL_V153) return 'Épuisé, il refuse l’exercice : repos et soins nécessaires. Le lien ne remplace pas le repos.';
  if (exercise.maxFatigueBefore !== null && m.fatigue > exercise.maxFatigueBefore) return 'Trop fatigué pour une charge : pause de fatigue nécessaire.';
  return null;
}

type Campaign = Pick<SaveGame, 'createdAt' | 'profile' | 'prologue'> & { mobilityV1?: MobilityLedger | null; mountsV153?: MountsV153 | null };

export function actMountsV153(campaign: Campaign, command: MountCommandV153): MountResultV153 {
  const refuse = (message: string): MountResultV153 => ({ accepted: false, message, state: null, clanMarks: campaign.profile.clanMarks, outcome: null });
  if (!record(command) || command.ownerCreatedAt !== campaign.createdAt) return refuse('Le propriétaire de la campagne a changé.');
  const inspected = inspectMountsV153(campaign.mountsV153, campaign.createdAt);
  if (!['absent', 'valid'].includes(inspected.status)) return refuse('Registre des montures incompatible ; il reste protégé.');
  const mobility = inspectMobilityLedger(campaign.mobilityV1, campaign.createdAt);
  if (!['absent', 'valid'].includes(mobility.status)) return refuse('Archive de mobilité incompatible ; elle reste protégée.');
  if (mobility.state?.active) return refuse('Aire des convois occupée : remise l’engin avant de t’occuper d’une monture.');
  const old = inspected.state ?? createMountsV153(campaign.createdAt);
  if (command.expectedRevision !== old.revision) return refuse('Le registre des montures a changé. Actualise avant de confirmer.');
  if (!mobilityCampaignEligible(campaign)) return refuse('Le rite Blooded doit être reconnu avant cette activité autonome.');
  if (!integer(campaign.profile.clanMarks) || old.revision >= 1e9 - 1) return refuse('Registre ou solde hors limites.');
  const state = structuredClone(old);
  let marks = campaign.profile.clanMarks, message = 'Registre des montures confirmé.', outcome: MountOutcomeV153 = 'recorded';
  const consume = (eventId: unknown): boolean => {
    if (typeof eventId !== 'string' || !EVENT_ID.test(eventId) || state.consumedEventIds.includes(eventId)) return false;
    state.consumedEventIds.push(eventId);
    if (state.consumedEventIds.length > MOUNT_EVENT_MEMORY_V153) state.consumedEventIds.shift();
    return true;
  };
  const closeSession = (result: 'closed' | 'interrupted') => {
    const s = state.session!;
    state.lastSession = { id: s.id, mountId: s.mountId, gain: s.gain, outcome: result };
    state.session = null;
  };

  if (command.type === 'begin-trial') {
    const profile = mountProfileV153(command.mountId), d = mobilityDefinition(command.mountId);
    if (!profile || !d || profile.recruitment !== 'trust-exercises') return refuse('Aucune voie de recrutement jouable pour cette monture.');
    if (mobilityRankIndex(campaign.profile.rankId) < mobilityRankIndex(d.minimumRank)) return refuse('Rang insuffisant pour approcher cette monture.');
    if (state.trial || state.mounts.some(m => m.id === profile.id) || mobility.state?.owned.some(v => v.id === profile.id)) return refuse('Une approche existe déjà pour cette monture.');
    state.trial = { id: trialIdFor(profile.id), mountId: profile.id, status: 'open', passed: [], attempts: 0 };
    message = 'Approche ouverte. Aucun animal n’est attribué : trois exercices de confiance réussis, puis un recrutement confirmé, sont nécessaires.';
  } else if (command.type === 'trust-exercise') {
    const trial = state.trial;
    if (!trial || trial.id !== command.trialId || trial.status !== 'open') return refuse('Aucune approche ouverte pour cet exercice.');
    const profile = mountProfileV153(trial.mountId)!;
    const exercise = profile.trustExercises[trial.passed.length];
    if (!exercise || exercise.id !== command.exerciseId) return refuse('Les exercices de confiance se font dans l’ordre.');
    const option = exercise.options.find(o => o.id === command.optionId);
    if (!option) return refuse('Choix inconnu.');
    if (!consume(command.eventId)) return refuse('Événement déjà consommé ou identifiant invalide.');
    trial.attempts++;
    if (option.ok) {
      trial.passed.push({ exerciseId: exercise.id, eventId: command.eventId });
      if (trial.passed.length === profile.trustExercises.length) trial.status = 'complete';
      outcome = 'passed';
      message = `${exercise.label} réussi. ${option.feedback}`;
    } else {
      outcome = 'interrupted';
      message = option.feedback;
    }
  } else if (command.type === 'recruit') {
    const profile = mountProfileV153(command.mountId), d = mobilityDefinition(command.mountId);
    const trial = state.trial;
    if (!profile || !d || profile.recruitment !== 'trust-exercises') return refuse('Aucune voie de recrutement jouable pour cette monture.');
    if (!trial || trial.id !== command.trialId || trial.mountId !== profile.id || trial.status !== 'complete') return refuse('Preuve absente : les trois exercices de confiance doivent être réussis.');
    if (state.mounts.some(m => m.id === profile.id) || mobility.state?.owned.some(v => v.id === profile.id)) return refuse('Cette monture est déjà inscrite.');
    if (mobilityRankIndex(campaign.profile.rankId) < mobilityRankIndex(d.minimumRank)) return refuse('Rang insuffisant pour recruter cette monture.');
    state.mounts.push({
      id: profile.id, recruitedRevision: state.revision + 1,
      proof: { kind: 'trust-exercises', trialId: trial.id, eventIds: trial.passed.map(p => p.eventId) },
      bond: 0, fatigue: 0, injury: 0, sessions: 0,
    });
    message = `${profile.name} recruté. BOND 0 : le lien se construit séance par séance (5 points au plus par séance).`;
  } else if (command.type === 'open-session') {
    const m = state.mounts.find(v => v.id === command.mountId);
    if (!m) return refuse('Monture non recrutée.');
    if (state.session) return refuse('Une séance est déjà ouverte.');
    if (state.nextSessionId >= 1e9) return refuse('Limite du registre atteinte.');
    state.session = { id: `S${state.nextSessionId++}`, mountId: m.id, gain: 0, explosions: 0 };
    m.sessions++;
    message = `Séance ${state.session.id} ouverte. Gain de BOND plafonné à ${MOUNT_SESSION_GAIN_CAP_V153} pour cette séance.`;
  } else if (command.type === 'exercise') {
    const s = state.session;
    if (!s || s.id !== command.sessionId) return refuse('Séance absente ou périmée.');
    const m = state.mounts.find(v => v.id === s.mountId)!;
    const profile = mountProfileV153(m.id)!;
    const exercise = MOUNT_EXERCISES_V153.find(e => e.id === command.exerciseId);
    if (!exercise) return refuse('Exercice inconnu.');
    if (m.bond < exercise.minBond) return refuse(`Exercice verrouillé : BOND ${exercise.minBond} requis.`);
    if (!(MOUNT_CONDITIONS_V153 as readonly string[]).includes(command.condition)) return refuse('Condition inconnue.');
    if (!consume(command.eventId)) return refuse('Événement déjà consommé ou identifiant invalide.');
    const refusal = mountExerciseRefusalV153(m, exercise);
    if (command.condition === 'explosions') s.explosions++;
    const reaction = refusal ? 'refusal' : mountReactionV153(profile, command.condition, m.bond, s.explosions);
    if (refusal) { outcome = 'refused'; message = refusal; }
    else if (reaction === 'refusal') { outcome = 'refused'; message = `${profile.name} refuse l’exercice (${MOUNT_CONDITION_LABELS_V153[command.condition].toLowerCase()}). Aucun BOND.`; }
    else if (reaction === 'panic') {
      m.injury = Math.min(100, m.injury + MOUNT_PANIC_INJURY_V153);
      m.fatigue = Math.min(100, m.fatigue + exercise.fatigue);
      closeSession('interrupted');
      outcome = 'panic';
      message = `Panique (${MOUNT_CONDITION_LABELS_V153[command.condition].toLowerCase()}) : séance interrompue, blessure +${MOUNT_PANIC_INJURY_V153}, aucun BOND. Le soigneur propose une reprise courte dans une nouvelle séance.`;
    } else {
      // Le BOND n'abaisse jamais la fatigue (STATE5-15).
      m.fatigue = Math.min(100, m.fatigue + exercise.fatigue);
      const gain = Math.max(0, Math.min(exercise.gain, MOUNT_SESSION_GAIN_CAP_V153 - s.gain, MOUNT_BOND_MAX_V153 - m.bond));
      m.bond += gain; s.gain += gain;
      outcome = 'completed';
      message = gain > 0 ? `${exercise.label} réussi : BOND +${gain} (séance ${s.gain}/${MOUNT_SESSION_GAIN_CAP_V153}), fatigue ${m.fatigue}.`
        : `${exercise.label} réussi, mais aucun BOND supplémentaire : plafond de séance ou maximum atteint. Fatigue ${m.fatigue}.`;
    }
  } else if (command.type === 'close-session') {
    if (!state.session || state.session.id !== command.sessionId) return refuse('Séance absente ou périmée.');
    const gain = state.session.gain;
    closeSession('closed');
    message = `Séance close : BOND +${gain} au total.`;
  } else if (command.type === 'care') {
    const m = state.mounts.find(v => v.id === command.mountId);
    if (!m) return refuse('Monture non recrutée.');
    const cost = mountCareQuoteV153(state, m.id);
    if (cost === null || cost !== command.expectedCost || cost > marks || state.spentMarks + cost > 1e9) return refuse('Soins inutiles, séance ouverte, devis périmé ou marques insuffisantes.');
    marks -= cost; state.spentMarks += cost;
    m.injury = 0; m.fatigue = 0;
    message = 'Soins et repos confirmés : blessures et fatigue traitées. Aucun BOND gratuit ; ce n’est pas une réparation mécanique.';
  } else {
    return refuse('Ordre inconnu pour une monture.');
  }
  state.revision++;
  if (inspectMountsV153(state, campaign.createdAt).status !== 'valid') return refuse('Résultat incompatible ; aucune modification appliquée.');
  return { accepted: true, message, state, clanMarks: marks, outcome };
}
