/**
 * V156 · Chevauchée du Kha’Rha recruté sur l'aire des convois.
 *
 * Sources :
 * - Classeur mobilité, « Fonctionnement » kha_rha : capacités « Bond long →
 *   Charge à la lance → Odorat de piste → Appel à distance selon le lien BOND » ;
 *   faiblesses « Peur du feu au faible BOND ; Fatigue réelle ; Refuse les
 *   environnements toxiques sans équipement ».
 * - « Stats » kha_rha : vitesse 107 u/s, accélération 89 u/s², résistance au
 *   choc 0,175, virage 2,36 rad/s (formules V1 de `mobilityStats`, reprises ici
 *   telles quelles).
 * - « Maintenance » : « les soins biologiques ne sont pas une réparation
 *   mécanique » ; kha_rha « Soins / repos ; aucun lien BOND gratuit ».
 * - « Reste_a_faire » MOB-010 « Pilotage hors aire » : à faire. Cette sortie
 *   reste donc limitée à l'aire des convois existante.
 * - V6 « Lien des montures » MOUNT-01..16 : « Seuil monte » 50, « Gain max par
 *   seance » 5, « Le lien n’annule ni obstacle physique ni fatigue », « Une
 *   mauvaise approche interrompt l’exercice », « pas de perte du compagnon sur
 *   simple déconnexion ». Ces fiches V6 décrivent d'autres créatures
 *   (MOB-35 = « Porte-corne des cendres ») : leur application au kha_rha est
 *   PROPOSÉE, comme dans V153.
 * - V6 « V5 Missions des montures » : « Jusqu’à 5 points de lien pour la séance
 *   valide » ; « Un arrêt de l’animal invite à descendre ou à revenir à l’appui
 *   précédent » ; « La scène peut être rejouée comme exercice sans récompense
 *   répétée de mission ».
 * - V6 « V5 États communs » STATE5-14 (mountBond, max 5 par séance valide ;
 *   événement déjà consommé sans effet) et STATE5-15 (mountFatigue 0..100,
 *   « Le lien élevé ne ramène pas la fatigue à zéro »).
 *
 * Choix d'architecture : l'aire des machines est pilotée par le registre
 * `mobilityV1` (`active.modelId` doit avoir `trialEnabled`, la monture n'est pas
 * dans `owned`). Pour ne modifier ni ce registre ni sa validation stricte, la
 * chevauchée est une course SÉPARÉE, enregistrée dans un champ distinct
 * `mountRidesV156`. Elle réutilise la géométrie, les collisions, les balises et
 * le trafic de `course.ts`, ainsi que `mobilityStats` du catalogue. Le registre
 * des montures `mountsV153` n'est modifié qu'au retour, dans la même transaction.
 *
 * Tout chiffre non fixé par ces sources est marqué « proposé ».
 * Module pur : aucune écriture de sauvegarde, aucun accès navigateur.
 */
import { emptyMobilityLevels, mobilityStats } from './catalogue.ts';
import {
  COURSE_MAX_TICKS, COURSE_STEP, MOBILITY_YARD, courseCollision, mobilityYardNpcs, validMobilityInput, type MobilityInput,
} from './course.ts';
import { inspectMobilityLedger, mobilityCampaignEligible, type MobilityLedger } from './ledger.ts';
import {
  MOUNT_BOND_MAX_V153, MOUNT_EXERCISES_V153, MOUNT_FATIGUE_REFUSAL_V153, MOUNT_INJURY_REFUSAL_V153, MOUNT_PANIC_INJURY_V153,
  MOUNT_SESSION_GAIN_CAP_V153, MOUNT_EVENT_MEMORY_V153, inspectMountsV153, mountProfileV153, mountReactionV153,
  type MountConditionV153, type MountsV153,
} from './mountsV153.ts';
import type { SaveGame } from '../../types';

// ---------------------------------------------------------------------------
// Constantes
// ---------------------------------------------------------------------------

/** Seule monture avec une voie de recrutement jouable (V153). */
export const MOUNT_RIDE_MODELS_V156 = ['kha_rha'] as const;
/** V6 MOUNT-xx « Seuil monte » 50 (transposé au kha_rha : proposé). */
export const MOUNT_RIDE_MIN_BOND_V156 = 50;
/** Proposé : fatigue gagnée par seconde d'effort au pas ou au galop. */
export const MOUNT_RIDE_FATIGUE_PER_SECOND_V156 = 0.5;
/** Proposé : multiplicateur de fatigue au sprint (commande « boost »). */
export const MOUNT_RIDE_SPRINT_FATIGUE_V156 = 3;
/** Proposé : au-delà du seuil de refus de #151 (80), l'animal ne va plus qu'au pas. */
export const MOUNT_RIDE_EXHAUSTED_SPEED_V156 = 0.35;
/**
 * Gain de BOND d'une sortie réussie : celui de l'exercice V153 « Circuit monté
 * court » (4, proposé dans #151), plafonné à 5 par séance (STATE5-14).
 */
export const MOUNT_RIDE_BOND_GAIN_V156 = MOUNT_EXERCISES_V153.find(e => e.id === 'mounted-circuit')!.gain;

/** Zone de danger d'une aire (feu, toxique…), évaluée avec les réactions V153 du profil. */
export interface MountRideHazardV156 { id: string; condition: Exclude<MountConditionV153, 'calm'>; x: number; y: number; w: number; h: number }
export interface MountRideArenaV156 { id: string; label: string; hazards: readonly MountRideHazardV156[] }
/**
 * L'aire des convois existante ne comporte AUCUN feu, aucune zone toxique et
 * aucune explosion : la bande « CENDRES · ADHÉRENCE RÉDUITE » est un sol de
 * cendres froides qui ralentit, pas un brasier. Aucun feu n'est ajouté. La peur
 * du feu reste donc non déclenchée sur cette aire ; la mécanique est prête pour
 * une aire qui déclarerait une zone (MOB-010).
 */
export const MOUNT_RIDE_YARD_V156: MountRideArenaV156 = Object.freeze({ id: 'convoy-yard', label: 'Aire des convois', hazards: Object.freeze([]) as readonly MountRideHazardV156[] });

// ---------------------------------------------------------------------------
// Course
// ---------------------------------------------------------------------------

export interface MountRideCourseV156 {
  x: number; y: number; heading: number; speed: number; tick: number;
  fatigue: number; injury: number; distance: number; impacts: number; hitCooldown: number;
  npcTicks: [number, number]; checkpoint: number; panicked: boolean; hazardsMet: number;
}
const COURSE_KEYS = ['x', 'y', 'heading', 'speed', 'tick', 'fatigue', 'injury', 'distance', 'impacts', 'hitCooldown', 'npcTicks', 'checkpoint', 'panicked', 'hazardsMet'];
const bounded = (n: number, min: number, max: number) => Math.min(max, Math.max(min, n));
const towards = (n: number, target: number, delta: number) => n < target ? Math.min(n + delta, target) : Math.max(n - delta, target);

export function createMountRideCourseV156(fatigue: number, injury: number): MountRideCourseV156 {
  return { x: MOBILITY_YARD.depot.x, y: MOBILITY_YARD.depot.y, heading: 0, speed: 0, tick: 0, fatigue, injury, distance: 0,
    impacts: 0, hitCooldown: 0, npcTicks: [0, 0], checkpoint: 0, panicked: false, hazardsMet: 0 };
}

export function validMountRideCourseV156(v: unknown): v is MountRideCourseV156 {
  if (!v || typeof v !== 'object' || Array.isArray(v)) return false;
  const s = v as MountRideCourseV156;
  if (Object.keys(s).length !== COURSE_KEYS.length || !COURSE_KEYS.every(k => Object.hasOwn(s, k))) return false;
  const finite = (n: unknown, lo: number, hi: number) => typeof n === 'number' && Number.isFinite(n) && n >= lo && n <= hi;
  const int = (n: unknown, lo: number, hi: number) => Number.isSafeInteger(n) && (n as number) >= lo && (n as number) <= hi;
  return Array.isArray(s.npcTicks) && s.npcTicks.length === 2 && s.npcTicks.every(t => int(t, 0, s.tick)) &&
    finite(s.x, 18, 982) && finite(s.y, 18, 602) && finite(s.heading, -Math.PI, Math.PI) && finite(s.speed, -160, 240) &&
    int(s.tick, 0, COURSE_MAX_TICKS) && finite(s.fatigue, 0, 100) && finite(s.injury, 0, 100) && finite(s.distance, 0, 300000) &&
    int(s.impacts, 0, s.tick) && finite(s.hitCooldown, 0, 1) && int(s.checkpoint, 0, 3) && typeof s.panicked === 'boolean' &&
    int(s.hazardsMet, 0, s.tick);
}

export const mountRideAtDepotV156 = (s: Pick<MountRideCourseV156, 'x' | 'y' | 'speed'>): boolean =>
  Math.hypot(s.x - MOBILITY_YARD.depot.x, s.y - MOBILITY_YARD.depot.y) <= MOBILITY_YARD.depot.radius && Math.abs(s.speed) < 6;

/** L'animal ne peut plus avancer : blessure au seuil de refus de #151 ou panique. « Un arrêt de l’animal invite à descendre. » */
export const mountRideHaltedV156 = (s: Pick<MountRideCourseV156, 'injury' | 'panicked'>): boolean =>
  s.panicked || s.injury >= MOUNT_INJURY_REFUSAL_V153;

/** Circuit monté réussi : trois balises dans l'ordre, retour au sas à l'arrêt, sans panique ni blessure au seuil. Pas de caisse (proposé). */
export function mountRidePassedV156(s: MountRideCourseV156): boolean {
  return s.checkpoint === 3 && s.tick >= 600 && !mountRideHaltedV156(s) && mountRideAtDepotV156(s);
}

/** Réaction de la monture à une zone de danger de l'aire (réactions V153 du profil). */
export function mountRideHazardReactionV156(mountId: string, bond: number, x: number, y: number, arena: MountRideArenaV156 = MOUNT_RIDE_YARD_V156) {
  const profile = mountProfileV153(mountId);
  if (!profile) return null;
  for (const h of arena.hazards) {
    if (x < h.x || x > h.x + h.w || y < h.y || y > h.y + h.h) continue;
    const reaction = mountReactionV153(profile, h.condition, bond);
    if (reaction !== 'none') return { hazard: h, reaction };
  }
  return null;
}

/**
 * Pas fixe de 1/60 s, déterministe. Le BOND n'intervient que dans la peur ;
 * il ne réduit jamais la fatigue (STATE5-15).
 */
export function stepMountRideV156(previous: MountRideCourseV156, input: MobilityInput, mountId: string, bond: number, arena: MountRideArenaV156 = MOUNT_RIDE_YARD_V156): MountRideCourseV156 {
  if (!validMobilityInput(input) || !validMountRideCourseV156(previous) || !(MOUNT_RIDE_MODELS_V156 as readonly string[]).includes(mountId) ||
      !Number.isSafeInteger(bond) || bond < 0 || bond > MOUNT_BOND_MAX_V153) throw new TypeError('Commande de chevauchée incompatible');
  if (previous.tick >= COURSE_MAX_TICKS) return { ...previous, speed: 0 };
  const s: MountRideCourseV156 = { ...previous, npcTicks: [...previous.npcTicks] as [number, number] }, dt = COURSE_STEP;
  // Statistiques du catalogue ; état = 100 − blessure (correspondance proposée dans #151 pour les soins).
  const stats = mobilityStats(mountId, emptyMobilityLevels(), 100 - s.injury, 0);
  const inMud = s.x > MOBILITY_YARD.mud.x && s.x < MOBILITY_YARD.mud.x + MOBILITY_YARD.mud.w && s.y > MOBILITY_YARD.mud.y && s.y < MOBILITY_YARD.mud.y + MOBILITY_YARD.mud.h;
  const able = !mountRideHaltedV156(s);
  const exhausted = s.fatigue >= MOUNT_FATIGUE_REFUSAL_V153;
  const sprint = input.boost && input.throttle > 0 && able && !exhausted;
  const target = able && !input.brake
    ? input.throttle * stats.speed * (input.throttle < 0 ? .35 : sprint ? 1.35 : 1) * (inMud ? .55 : 1) * (exhausted ? MOUNT_RIDE_EXHAUSTED_SPEED_V156 : 1)
    : 0;
  s.speed = towards(s.speed, target, (input.brake || !able ? 240 : input.throttle === 0 ? 45 : stats.acceleration) * dt);
  const turn = able ? input.steer * stats.turn * dt * (Math.abs(s.speed) > 3 ? Math.sign(s.speed) : .35) : 0;
  s.heading = Math.atan2(Math.sin(s.heading + turn), Math.cos(s.heading + turn));
  const x = s.x + Math.cos(s.heading) * s.speed * dt, y = s.y + Math.sin(s.heading) * s.speed * dt;
  const npcs = mobilityYardNpcs(s.npcTicks, s);
  npcs.forEach((npc, i) => { if (npc.state === 'moving') s.npcTicks[i]++; });
  const trafficHit = npcs.some(p => Math.hypot(x - p.x, y - p.y) < 36);
  s.hitCooldown = Math.max(0, s.hitCooldown - dt);
  const hazard = mountRideHazardReactionV156(mountId, bond, x, y, arena);
  if (courseCollision(x, y) || trafficHit) {
    if (Math.abs(s.speed) > 12 && s.hitCooldown === 0) {
      // Même formule de choc que les machines, appliquée en blessure (proposé).
      s.injury = bounded(s.injury + Math.abs(s.speed) * .12 * (1 - stats.collisionResistance), 0, 100); s.impacts++; s.hitCooldown = .7;
    }
    s.speed = 0;
  } else if (hazard?.reaction === 'refusal') {
    // L'animal refuse d'entrer : il s'arrête au bord, sans blessure.
    if (Math.abs(s.speed) > 1) s.hazardsMet++;
    s.speed = 0;
  } else if (hazard?.reaction === 'panic') {
    s.injury = bounded(s.injury + MOUNT_PANIC_INJURY_V153, 0, 100); s.panicked = true; s.hazardsMet++; s.speed = 0;
  } else { s.distance += Math.hypot(x - s.x, y - s.y); s.x = x; s.y = y; }
  // « Fatigue réelle » : elle ne fait que monter pendant la course ; le repos relève des soins.
  if (Math.abs(s.speed) > 1) s.fatigue = bounded(s.fatigue + MOUNT_RIDE_FATIGUE_PER_SECOND_V156 * (sprint ? MOUNT_RIDE_SPRINT_FATIGUE_V156 : 1) * dt, 0, 100);
  const gate = MOBILITY_YARD.checkpoints[s.checkpoint];
  if (gate && Math.hypot(s.x - gate.x, s.y - gate.y) < 55) s.checkpoint++;
  s.tick++;
  return s;
}

// ---------------------------------------------------------------------------
// Registre des chevauchées
// ---------------------------------------------------------------------------

export interface MountRideV156 {
  id: number; mountId: string;
  /** BOND, fatigue et blessure du registre V153 au départ (inchangés pendant la sortie). */
  bond: number; startFatigue: number; startInjury: number;
  course: MountRideCourseV156;
}
export interface MountRideReportV156 {
  rideId: number; mountId: string; result: 'passed' | 'returned' | 'recovered';
  distance: number; impacts: number; ticks: number; fatigue: number; injury: number;
  bondGain: number; sessionId: string | null;
}
export interface MountRidesV156 {
  version: 1; ownerCreatedAt: string; revision: number;
  active: MountRideV156 | null; nextRideId: number; lastReport: MountRideReportV156 | null;
}
export type MountRideOrderV156 =
  | { type: 'mount'; mountId: string }
  | { type: 'ride'; rideId: number; inputs: MobilityInput[] }
  | { type: 'return'; rideId: number }
  | { type: 'dismount'; rideId: number };
export type MountRideCommandV156 = MountRideOrderV156 & { ownerCreatedAt: string; expectedRevision: number };
export interface MountRideResultV156 { accepted: boolean; message: string; rides: MountRidesV156 | null; mounts: MountsV153 | null }
export interface MountRideReceiptV156 { accepted: boolean; message: string; state: MountRidesV156 | null }
export type MountRideWriterV156 = (command: MountRideCommandV156) => MountRideReceiptV156;

const record = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);
const integer = (v: unknown, lo = 0, hi = 1_000_000_000): v is number => Number.isSafeInteger(v) && (v as number) >= lo && (v as number) <= hi;
const finite = (v: unknown, lo: number, hi: number): v is number => typeof v === 'number' && Number.isFinite(v) && v >= lo && v <= hi;
const keys = (v: object, allowed: readonly string[]) => Object.keys(v).length === allowed.length && allowed.every(k => Object.hasOwn(v, k));
const SESSION_ID = /^S[1-9][0-9]{0,9}$/;
/** Identifiant d'événement consommé dans `mountsV153` pour le crédit de BOND d'une sortie. */
export const mountRideEventIdV156 = (rideId: number) => `ride-r${rideId}`;

export const createMountRidesV156 = (ownerCreatedAt: string): MountRidesV156 =>
  ({ version: 1, ownerCreatedAt, revision: 0, active: null, nextRideId: 1, lastReport: null });

/**
 * Validation stricte. `mounts` est le registre V153 déjà inspecté : une sortie
 * active doit correspondre à une monture recrutée dont les valeurs n'ont pas
 * bougé depuis le départ, sans séance V153 ouverte.
 */
export function inspectMountRidesV156(raw: unknown, owner: string, mounts: MountsV153 | null | undefined): { status: 'absent' | 'valid' | 'future-version' | 'invalid-save'; state: MountRidesV156 | null } {
  const bad = { status: 'invalid-save' as const, state: null };
  if (raw === undefined || raw === null) return { status: 'absent', state: null };
  if (!record(raw)) return bad;
  if (typeof raw.version === 'number' && raw.version > 1) return { status: 'future-version', state: null };
  if (raw.version !== 1 || raw.ownerCreatedAt !== owner || !Number.isFinite(Date.parse(owner)) ||
      !keys(raw, ['version', 'ownerCreatedAt', 'revision', 'active', 'nextRideId', 'lastReport']) ||
      !integer(raw.revision) || !integer(raw.nextRideId, 1)) return bad;
  const a = raw.active;
  if (a !== null) {
    if (!record(a) || !keys(a, ['id', 'mountId', 'bond', 'startFatigue', 'startInjury', 'course']) || !integer(a.id, 1) ||
        a.id >= (raw.nextRideId as number) || typeof a.mountId !== 'string' || !(MOUNT_RIDE_MODELS_V156 as readonly string[]).includes(a.mountId) ||
        !integer(a.bond, MOUNT_RIDE_MIN_BOND_V156, MOUNT_BOND_MAX_V153) || !integer(a.startFatigue, 0, MOUNT_FATIGUE_REFUSAL_V153 - 1) ||
        !integer(a.startInjury, 0, MOUNT_INJURY_REFUSAL_V153 - 1) || !validMountRideCourseV156(a.course) ||
        a.course.fatigue < a.startFatigue || a.course.injury < a.startInjury) return bad;
    const m = mounts?.mounts.find(v => v.id === a.mountId);
    if (!mounts || mounts.session !== null || !m || m.bond !== a.bond || m.fatigue !== a.startFatigue || m.injury !== a.startInjury) return bad;
  }
  const r = raw.lastReport;
  if (r !== null) {
    if (!record(r) || !keys(r, ['rideId', 'mountId', 'result', 'distance', 'impacts', 'ticks', 'fatigue', 'injury', 'bondGain', 'sessionId']) ||
        !integer(r.rideId, 1) || r.rideId >= (raw.nextRideId as number) || typeof r.mountId !== 'string' ||
        !(MOUNT_RIDE_MODELS_V156 as readonly string[]).includes(r.mountId) || !['passed', 'returned', 'recovered'].includes(String(r.result)) ||
        !finite(r.distance, 0, 300000) || !integer(r.impacts, 0, COURSE_MAX_TICKS) || !integer(r.ticks, 0, COURSE_MAX_TICKS) ||
        !integer(r.fatigue, 0, 100) || !integer(r.injury, 0, 100) || !integer(r.bondGain, 0, MOUNT_SESSION_GAIN_CAP_V153) ||
        (r.result === 'passed') !== (typeof r.sessionId === 'string') ||
        (r.sessionId !== null && (typeof r.sessionId !== 'string' || !SESSION_ID.test(r.sessionId))) ||
        (r.sessionId === null && r.bondGain !== 0)) return bad;
    if (a !== null && record(a) && (a.id as number) <= (r.rideId as number)) return bad;
  }
  return { status: 'valid', state: structuredClone(raw) as unknown as MountRidesV156 };
}

/** Raison d'un refus de départ, ou null. Seuils de fatigue et de blessure : ceux de #151. */
export function mountRideRefusalV156(mounts: MountsV153, mountId: string): string | null {
  const m = mounts.mounts.find(v => v.id === mountId);
  if (!m || !(MOUNT_RIDE_MODELS_V156 as readonly string[]).includes(mountId)) return 'Monture non recrutée ou non admise sur l’aire.';
  if (mounts.session) return 'Clos la séance de lien en cours avant de monter.';
  if (m.injury >= MOUNT_INJURY_REFUSAL_V153) return 'Blessé, il refuse d’être monté : des soins sont nécessaires.';
  if (m.fatigue >= MOUNT_FATIGUE_REFUSAL_V153) return 'Épuisé, il refuse d’être monté : repos et soins nécessaires. Le lien ne remplace pas le repos.';
  if (m.bond < MOUNT_RIDE_MIN_BOND_V156) return `Lien insuffisant : BOND ${MOUNT_RIDE_MIN_BOND_V156} requis pour monter (actuel ${m.bond}).`;
  return null;
}

type Campaign = Pick<SaveGame, 'createdAt' | 'profile' | 'prologue'> & {
  mobilityV1?: MobilityLedger | null; mountsV153?: MountsV153 | null; mountRidesV156?: MountRidesV156 | null;
};

export function actMountRideV156(campaign: Campaign, command: MountRideCommandV156): MountRideResultV156 {
  const refuse = (message: string): MountRideResultV156 => ({ accepted: false, message, rides: null, mounts: null });
  if (!record(command) || command.ownerCreatedAt !== campaign.createdAt) return refuse('Le propriétaire de la campagne a changé.');
  const mountsInspected = inspectMountsV153(campaign.mountsV153, campaign.createdAt);
  if (mountsInspected.status !== 'valid' || !mountsInspected.state) return refuse('Aucune monture recrutée ou registre des montures protégé.');
  const inspected = inspectMountRidesV156(campaign.mountRidesV156, campaign.createdAt, mountsInspected.state);
  if (!['absent', 'valid'].includes(inspected.status)) return refuse('Registre des chevauchées incompatible ; il reste protégé.');
  const mobility = inspectMobilityLedger(campaign.mobilityV1, campaign.createdAt);
  if (!['absent', 'valid'].includes(mobility.status)) return refuse('Archive de mobilité incompatible ; elle reste protégée.');
  const old = inspected.state ?? createMountRidesV156(campaign.createdAt);
  if (command.expectedRevision !== old.revision) return refuse('Le registre des chevauchées a changé. Actualise avant de confirmer.');
  if (!mobilityCampaignEligible(campaign)) return refuse('Le rite Blooded doit être reconnu avant cette activité autonome.');
  if (old.revision >= 1e9 - 1) return refuse('Registre hors limites.');
  const rides = structuredClone(old);
  let mounts = mountsInspected.state;
  let message = 'Chevauchée enregistrée.';

  if (command.type === 'mount') {
    if (rides.active) return refuse('Une chevauchée est déjà en cours.');
    if (mobility.state?.active) return refuse('Aire des convois occupée par un engin : remise-le d’abord.');
    const refusal = mountRideRefusalV156(mounts, command.mountId);
    if (refusal) return refuse(refusal);
    if (rides.nextRideId >= 1e9) return refuse('Limite du registre atteinte.');
    const m = mounts.mounts.find(v => v.id === command.mountId)!;
    rides.active = { id: rides.nextRideId++, mountId: m.id, bond: m.bond, startFatigue: m.fatigue, startInjury: m.injury,
      course: createMountRideCourseV156(m.fatigue, m.injury) };
    message = 'En selle au sas. Trois balises dans l’ordre, puis retour au sas à l’arrêt. La fatigue monte à chaque foulée.';
  } else if (command.type === 'ride') {
    const active = rides.active;
    if (!active || active.id !== command.rideId || !Array.isArray(command.inputs) || command.inputs.length < 1 || command.inputs.length > 60 ||
        !command.inputs.every(validMobilityInput)) return refuse('Séquence de chevauchée invalide ou périmée.');
    for (const input of command.inputs) active.course = stepMountRideV156(active.course, input, active.mountId, active.bond);
    message = 'Chevauchée sauvegardée.';
  } else if (command.type === 'return' || command.type === 'dismount') {
    const active = rides.active;
    if (!active || active.id !== command.rideId) return refuse('Cette chevauchée est déjà terminée ou appartient à une autre session.');
    if (command.type === 'return' && !mountRideAtDepotV156(active.course)) return refuse('Reviens au sas et arrête l’animal avant de mettre pied à terre.');
    mounts = structuredClone(mounts);
    const m = mounts.mounts.find(v => v.id === active.mountId)!;
    // Valeurs entières du registre V153 : toute hausse entamée compte.
    m.fatigue = Math.min(100, Math.max(m.fatigue, Math.ceil(active.course.fatigue - 1e-9)));
    m.injury = Math.min(100, Math.max(m.injury, Math.ceil(active.course.injury - 1e-9)));
    const passed = command.type === 'return' && mountRidePassedV156(active.course);
    let gain = 0, sessionId: string | null = null;
    if (passed) {
      // La sortie réussie compte comme UNE séance de lien : identifiant de séance V153 unique,
      // événement consommé une seule fois, gain plafonné à 5 (STATE5-14).
      const eventId = mountRideEventIdV156(active.id);
      if (mounts.consumedEventIds.includes(eventId) || mounts.nextSessionId >= 1e9 || mounts.revision >= 1e9 - 1) return refuse('Séance déjà comptée ou registre des montures hors limites.');
      mounts.consumedEventIds.push(eventId);
      if (mounts.consumedEventIds.length > MOUNT_EVENT_MEMORY_V153) mounts.consumedEventIds.shift();
      sessionId = `S${mounts.nextSessionId++}`;
      gain = Math.max(0, Math.min(MOUNT_RIDE_BOND_GAIN_V156, MOUNT_SESSION_GAIN_CAP_V153, MOUNT_BOND_MAX_V153 - m.bond));
      m.bond += gain; m.sessions++;
      mounts.lastSession = { id: sessionId, mountId: m.id, gain, outcome: 'closed' };
    }
    mounts.revision++;
    rides.lastReport = { rideId: active.id, mountId: active.mountId, result: command.type === 'dismount' ? 'recovered' : passed ? 'passed' : 'returned',
      distance: active.course.distance, impacts: active.course.impacts, ticks: active.course.tick, fatigue: m.fatigue, injury: m.injury, bondGain: gain, sessionId };
    rides.active = null;
    if (inspectMountsV153(mounts, campaign.createdAt).status !== 'valid') return refuse('Résultat incompatible ; aucune modification appliquée.');
    message = passed
      ? `Circuit monté réussi : séance ${sessionId}, BOND +${gain}. Fatigue ${m.fatigue}, blessures ${m.injury}. Les soins restent nécessaires pour le repos.`
      : command.type === 'dismount'
        ? `Pied à terre : ${mountProfileV153(m.id)!.name} est ramené en main au sas. Aucun BOND ; fatigue ${m.fatigue} et blessures ${m.injury} conservées.`
        : `Retour au sas sans circuit complet : aucun BOND. Fatigue ${m.fatigue}, blessures ${m.injury}.`;
  } else {
    return refuse('Ordre inconnu pour une chevauchée.');
  }
  rides.revision++;
  if (inspectMountRidesV156(rides, campaign.createdAt, mounts).status !== 'valid') return refuse('Résultat incompatible ; aucune modification appliquée.');
  return { accepted: true, message, rides, mounts: mounts === mountsInspected.state ? null : mounts };
}

// ---------------------------------------------------------------------------
// Contrôleur de prédiction (même principe que MobilityDriveController)
// ---------------------------------------------------------------------------

/** Prédit au plus une demi-seconde puis rejoue les commandes dans la transaction de campagne. */
export class MountRideControllerV156 {
  confirmed: MountRidesV156;
  predicted: MountRideCourseV156;
  pending: MobilityInput[] = [];
  blocked = false;
  message = 'En selle au sas ; reprendre la chevauchée pour partir.';
  constructor(state: MountRidesV156) {
    if (!state.active) throw new TypeError('Chevauchée absente');
    this.confirmed = structuredClone(state); this.predicted = structuredClone(state.active.course);
  }
  step(input: MobilityInput): boolean {
    const active = this.confirmed.active;
    if (this.blocked || this.pending.length >= 30 || !active) return false;
    this.predicted = stepMountRideV156(this.predicted, input, active.mountId, active.bond);
    this.pending.push({ ...input }); return true;
  }
  flush(write: MountRideWriterV156): boolean {
    if (!this.pending.length) return !this.blocked;
    const active = this.confirmed.active;
    if (!active) { this.blocked = true; return false; }
    const command: MountRideCommandV156 = { type: 'ride', ownerCreatedAt: this.confirmed.ownerCreatedAt, expectedRevision: this.confirmed.revision,
      rideId: active.id, inputs: this.pending.map(i => ({ ...i })) };
    let result: MountRideReceiptV156;
    try { result = write(command); } catch { result = { accepted: false, state: null, message: 'Écriture indisponible ; séquence conservée.' }; }
    this.message = result.message;
    const state = result.state;
    if (!result.accepted || !state?.active || state.ownerCreatedAt !== this.confirmed.ownerCreatedAt || state.revision !== this.confirmed.revision + 1 ||
        state.active.id !== active.id || state.active.mountId !== active.mountId || JSON.stringify(state.active.course) !== JSON.stringify(this.predicted)) {
      this.blocked = true;
      if (result.accepted) this.message = 'Accusé de sauvegarde incohérent ; séquence conservée sans avance de simulation.';
      return false;
    }
    this.confirmed = structuredClone(state); this.predicted = structuredClone(state.active.course);
    this.pending = []; this.blocked = false; return true;
  }
}
