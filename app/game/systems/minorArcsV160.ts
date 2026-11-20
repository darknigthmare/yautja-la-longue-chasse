import type { MissionResult, RankId, SaveGame } from '../types';
import { canVisitHomeworldVillagesV69, type HomeworldAccessSaveV69 } from './homeworldAccessV69';
import {
  canMeetContractGiverV68, contractRegionNameV68, normalizeContractFieldEventV68,
  type ContractDefinitionV68, type ContractFieldActionV68, type ContractFieldEventV68, type ContractRegionIdV68,
} from './homeworldContractsV68';

/**
 * Mini-arcs de la Lost Tribe (LT-1 → LT-3) et du Serpent Clan (SC-1 → SC-3).
 *
 * Source unique : docs/campagne/BIBLE_DE_CAMPAGNE.md, sections
 * « Personnages de la Lost Tribe, du Serpent Clan et des Matriarches » et
 * « Mini-arcs de la Lost Tribe et du Serpent Clan (missions proposées) »
 * (décisions du 6 novembre). Le classeur V6 ne contient aucune ligne sur ces
 * factions (vérifié : aucune occurrence de Lost, Serpent, Viper ou Snake).
 *
 * La bible marque elle-même les six missions comme « proposées ». Les
 * personnages canon (bios NECA cités par la bible) sont marqués `canon` ;
 * Ssik'thar, Vhar'nesh et le conseil des trois Matriarches sont « proposés ».
 * Aucune bio ni citation de produit n'est reproduite ici : le dépôt ne
 * contient pas le texte des bios NECA de Scout, Viper ou Snake, seulement
 * le résumé qu'en fait la bible.
 *
 * Les étapes jouables réutilisent les systèmes existants : rencontre en
 * personne validée par `canMeetContractGiverV68`, preuves de terrain des
 * villages V68 validées par `normalizeContractFieldEventV68`, et résultat de
 * chasse réellement appliqué par `applyMissionResult` (chasse 3, Cinder-12).
 * Le registre des contrats V68/V69 n'est pas étendu : son catalogue est figé
 * (32 définitions, schéma 2) et un ajout le rendrait illisible aux anciens
 * clients ; ce registre-ci est un champ additif séparé de la sauvegarde.
 */

export const MINOR_ARCS_SCHEMA_VERSION_V160 = 1 as const;
export const MINOR_ARCS_BIBLE_SOURCE_V160 = {
  file: 'docs/campagne/BIBLE_DE_CAMPAGNE.md',
  sections: [
    'Personnages de la Lost Tribe, du Serpent Clan et des Matriarches',
    'Mini-arcs de la Lost Tribe et du Serpent Clan (missions proposées)',
    'La voie Enforcer (Alliés : le Serpent Clan de Viper)',
    'Figures canon en personnages secondaires',
  ],
  decision: 'Lost Tribe canon (bios NECA) ; Serpent Clan (Viper, Snake + 2 proposés) ; conseil de 3 Matriarches proposé. Mini-arcs LT-1→3 et SC-1→3.',
  workbookV6: 'aucune ligne sur la Lost Tribe ni le Serpent Clan',
} as const;

export type MinorArcIdV160 = 'lost-tribe' | 'serpent-clan';
export type MinorArcStageIdV160 = 'LT-1' | 'LT-2' | 'LT-3' | 'SC-1' | 'SC-2' | 'SC-3';
export type LoreStatusV160 = 'canon' | 'proposé';

export interface MinorArcCharacterV160 { id: string; name: string; faction: MinorArcIdV160 | 'matriarches'; status: LoreStatusV160; canon: string | null; role: string; roleStatus: LoreStatusV160 }

/** Rôles « canon » = colonne Canon de la bible ; rôles en jeu = colonne « Rôle dans le jeu (proposé) ». */
export const MINOR_ARC_CHARACTERS_V160: readonly MinorArcCharacterV160[] = [
  { id: 'greyback', name: 'Greyback', faction: 'lost-tribe', status: 'canon', canon: 'chef et fondateur de la Lost Tribe', role: 'piste du XVIIIe siècle dans l’arc Warp', roleStatus: 'proposé' },
  { id: 'warrior', name: 'Warrior', faction: 'lost-tribe', status: 'canon', canon: 'maître d’armes, bras droit de Greyback, combat à la hache géante', role: 'maître d’armes de l’atelier quand la Lost Tribe est alliée ; duel d’entraînement en Pit', roleStatus: 'proposé' },
  { id: 'shaman', name: 'Shaman', faction: 'lost-tribe', status: 'canon', canon: 'chef spirituel, connaît les rituels et peut-être les prophéties', role: 'modèle et mentor du rang Philosopher ; visions au Level 9', roleStatus: 'proposé' },
  { id: 'scout', name: 'Scout', faction: 'lost-tribe', status: 'canon', canon: 'tireur d’élite au fusil à plasma', role: 'guide des chasses à longue distance ; contrat de tir', roleStatus: 'proposé' },
  { id: 'guardian', name: 'Guardian', faction: 'lost-tribe', status: 'canon', canon: 'expert en explosifs et armes lourdes, ancien Temple Guard devenu Elite', role: 'lien avec les Temple Guards dans l’arc de guerre', roleStatus: 'proposé' },
  { id: 'boar', name: 'Boar', faction: 'lost-tribe', status: 'canon', canon: 'protection, extraction, trophées', role: 'contrats d’extraction et de récupération de trophées', roleStatus: 'proposé' },
  { id: 'stalker', name: 'Stalker', faction: 'lost-tribe', status: 'canon', canon: 'le planificateur (frères Boar)', role: 'contrats d’extraction et de récupération de trophées', roleStatus: 'proposé' },
  { id: 'city-hunter', name: 'City Hunter', faction: 'lost-tribe', status: 'canon', canon: 'jeune, chassait à Los Angeles, tué par Harrigan (1997)', role: 'mort avant la campagne ; montré dans la vision du Shaman (LT-3)', roleStatus: 'proposé' },
  { id: 'snake', name: 'Snake', faction: 'serpent-clan', status: 'canon', canon: 'assassin ; contrats discrets pour les Elders', role: 'passerelle entre la Lost Tribe et le Serpent Clan', roleStatus: 'proposé' },
  { id: 'viper', name: 'Viper', faction: 'serpent-clan', status: 'canon', canon: 'chef du Serpent Clan, mercenaires, aide les Enforcers contre immunité', role: 'recrute le joueur Enforcer ou le traque s’il devient Bad Blood', roleStatus: 'proposé' },
  { id: 'ssikthar', name: 'Ssik’thar', faction: 'serpent-clan', status: 'proposé', canon: null, role: 'second de Viper, négocie l’immunité ; peut trahir le joueur selon son honneur', roleStatus: 'proposé' },
  { id: 'vharnesh', name: 'Vhar’nesh', faction: 'serpent-clan', status: 'proposé', canon: null, role: 'maître des poisons et des pièges du clan ; vend les améliorations discrétion', roleStatus: 'proposé' },
  { id: 'nhalvesh', name: 'Nhal’vesh', faction: 'matriarches', status: 'proposé', canon: null, role: 'arbitre des clans ; préside G-8 L’arbitrage des Matriarches', roleStatus: 'proposé' },
  { id: 'kyradhen', name: 'Kyr’adhen', faction: 'matriarches', status: 'proposé', canon: null, role: 'gardienne des lignées ; reconnaît la fondation d’un clan et le titre de Prince', roleStatus: 'proposé' },
  { id: 'theska', name: 'Thes’ka', faction: 'matriarches', status: 'proposé', canon: null, role: 'commandante de vaisseau ; contrats de flotte et reconnaissance du titre de King', roleStatus: 'proposé' },
];

export type MinorArcStepDefinitionV160 =
  | { kind: 'field'; regionId: ContractRegionIdV68; action: ContractFieldActionV68; text: string }
  | { kind: 'hunt'; missionId: 'volcano-bad-blood'; objectiveId: 'defeat-bad-blood'; honorRuleId: 'stop-purge'; text: string };

export interface MinorArcGiverV160 { npcId: string; pointId: string; buildingId: string; speaker: string; place: string; placeStatus: LoreStatusV160 }

export interface MinorArcStageV160 {
  id: MinorArcStageIdV160; arcId: MinorArcIdV160; order: 1 | 2 | 3; title: string;
  /** Colonnes « Déroulé » et « Issue » de la bible, reformulées sans ajout. */
  bible: { conduct: string; outcome: string };
  characters: readonly string[];
  places: readonly { label: string; status: LoreStatusV160 }[];
  /** Toujours « proposé » : la bible titre la section « missions proposées ». */
  missionStatus: 'proposé';
  prerequisite: MinorArcStageIdV160 | null;
  implementation: 'jouable' | 'non implémentée';
  giver: MinorArcGiverV160 | null;
  steps: readonly MinorArcStepDefinitionV160[];
  /** Comment l'étape jouable traduit le déroulé de la bible avec les systèmes existants (proposé). */
  adaptation: string | null;
  outcomeId: string | null; outcomeText: string | null;
}

const DOCK_RELAY: MinorArcGiverV160 = { npcId: 'dock-officer', pointId: 'dock-officer-point', buildingId: 'dock-control',
  speaker: 'Scout (Lost Tribe)', place: 'Relais de chasse : poste de l’Officier des quais, Contrôle d’amarrage', placeStatus: 'proposé' };
const ENFORCER_BASTION: MinorArcGiverV160 = { npcId: 'enforcer-captain', pointId: 'enforcer-point', buildingId: 'enforcer-bastion',
  speaker: 'Ssik’thar (Serpent Clan, proposé)', place: 'Salle des preuves du Bastion des Enforcers', placeStatus: 'proposé' };

export const MINOR_ARC_STAGES_V160: readonly MinorArcStageV160[] = [
  { id: 'LT-1', arcId: 'lost-tribe', order: 1, title: 'La piste de Greyback',
    bible: { conduct: 'À un relais de chasse, Scout met le joueur à l’épreuve : trois cibles à longue distance sans être repéré.', outcome: 'La Lost Tribe accepte de parler au joueur.' },
    characters: ['scout'], places: [{ label: 'Relais de chasse de la Lost Tribe', status: 'proposé' }, { label: 'Jungle des Piliers, Chaîne des Orages, Couronne Froide', status: 'proposé' }],
    missionStatus: 'proposé', prerequisite: null, implementation: 'jouable', giver: DOCK_RELAY,
    steps: [
      { kind: 'field', regionId: 'pillar-jungle', action: 'track', text: 'Première cible : lire les trois perchoirs puis observer le traqueur des piliers à distance, sans entrer dans sa portée, et revenir au guide.' },
      { kind: 'field', regionId: 'storm-chain', action: 'track', text: 'Deuxième cible : après ce retour, observer le planeur cuirassé entre les rafales depuis le chemin, puis revenir au guide.' },
      { kind: 'field', regionId: 'cold-crown', action: 'track', text: 'Troisième cible : enfin, observer le carnivore de la Couronne après ses trois traces, puis revenir au guide.' },
    ],
    adaptation: 'Les trois cibles sont les trois observations à distance des villages V68 (action « pistage » : 210 à 550 unités de la proie, sans arme ni charge déclenchée). Le jeu n’a pas de tir de précision sur cible : aucun tir n’est simulé.',
    outcomeId: 'lost-tribe-listens', outcomeText: 'La Lost Tribe accepte de parler au joueur.' },
  { id: 'LT-2', arcId: 'lost-tribe', order: 2, title: 'Le contrat des frères Boar',
    bible: { conduct: 'Extraction de trophées sur une planète réserve avec Boar et Stalker ; Guardian fournit les explosifs ; Stalker planifie, Boar fonce : le joueur arbitre.', outcome: 'Trophées partagés ou gardés (honneur).' },
    characters: ['boar', 'stalker', 'guardian'], places: [{ label: 'Planète réserve (non nommée par la bible)', status: 'proposé' }],
    missionStatus: 'proposé', prerequisite: 'LT-1', implementation: 'non implémentée', giver: null, steps: [], adaptation: null, outcomeId: null, outcomeText: null },
  { id: 'LT-3', arcId: 'lost-tribe', order: 3, title: 'La vision du Shaman',
    bible: { conduct: 'Le Shaman montre au joueur la mort du City Hunter (1997) et demande un serment ; choix : alliance ou refus.', outcome: 'Alliée : Warrior ouvre l’atelier, Greyback donne la piste du XVIIIe siècle (arc Warp). Rivale : la Lost Tribe conteste un territoire dans l’arc de guerre.' },
    characters: ['shaman', 'city-hunter', 'warrior', 'greyback'], places: [{ label: 'Cercle de vision du Shaman', status: 'proposé' }],
    missionStatus: 'proposé', prerequisite: 'LT-2', implementation: 'non implémentée', giver: null, steps: [], adaptation: null, outcomeId: null, outcomeText: null },
  { id: 'SC-1', arcId: 'serpent-clan', order: 1, title: 'L’offre de Viper',
    bible: { conduct: 'Ssik’thar propose un contrat : éliminer un Bad Blood sans laisser de trace.', outcome: 'Le Serpent Clan juge le joueur.' },
    characters: ['ssikthar', 'viper'], places: [{ label: 'Bastion des Enforcers (le Serpent Clan aide les Enforcers, d’après la bible)', status: 'proposé' }, { label: 'Cinder-12, chasse « Le dernier rite »', status: 'proposé' }],
    missionStatus: 'proposé', prerequisite: null, implementation: 'jouable', giver: ENFORCER_BASTION,
    steps: [
      { kind: 'hunt', missionId: 'volcano-bad-blood', objectiveId: 'defeat-bad-blood', honorRuleId: 'stop-purge', text: 'Réussir la chasse « Le dernier rite » (Cinder-12) après l’accord : juger le Bad Blood et respecter la règle « Ne laisser aucune trace » (autodestruction interrompue, technologie profanée récupérée).' },
    ],
    adaptation: 'Le Bad Blood est le Paria de Cinder-12, cible déjà jouable que la bible attribue à la voie Enforcer. « Sans laisser de trace » correspond à la règle d’honneur existante « Ne laisser aucune trace » de cette chasse. Seule une réussite obtenue après l’accord compte.',
    outcomeId: 'serpent-clan-judged', outcomeText: 'Le Serpent Clan juge le joueur. Le contenu du verdict n’est pas fixé par la bible ; il est consigné pour SC-3.' },
  { id: 'SC-2', arcId: 'serpent-clan', order: 2, title: 'Le contrat de Snake',
    bible: { conduct: 'Snake et le joueur exécutent un contrat pour un Elder, avec les pièges de Vhar’nesh ; la cible se révèle innocente.', outcome: 'Dilemme d’honneur : finir le contrat (perte d’honneur, gain d’argent) ou l’abandonner.' },
    characters: ['snake', 'vharnesh'], places: [{ label: 'Repaire du Serpent Clan (fosses, pièges, fioles de poison)', status: 'proposé' }],
    missionStatus: 'proposé', prerequisite: 'SC-1', implementation: 'non implémentée', giver: null, steps: [], adaptation: null, outcomeId: null, outcomeText: null },
  { id: 'SC-3', arcId: 'serpent-clan', order: 3, title: 'Le prix de l’immunité',
    bible: { conduct: 'Viper réclame un service en échange de l’immunité ; si l’honneur est bas, Ssik’thar trahit le joueur.', outcome: 'Allié : mercenaires dans l’arc de guerre, améliorations discrétion, aide pour la voie Enforcer. Ennemi : le Serpent Clan traque le joueur (événements d’embuscade).' },
    characters: ['viper', 'ssikthar'], places: [{ label: 'Non précisé par la bible', status: 'proposé' }],
    missionStatus: 'proposé', prerequisite: 'SC-2', implementation: 'non implémentée', giver: null, steps: [], adaptation: null, outcomeId: null, outcomeText: null },
];

export const MINOR_ARCS_V160: readonly { id: MinorArcIdV160; title: string; music: string; stages: readonly MinorArcStageIdV160[] }[] = [
  { id: 'lost-tribe', title: 'Mini-arc de la Lost Tribe', music: 'MUS-61', stages: ['LT-1', 'LT-2', 'LT-3'] },
  { id: 'serpent-clan', title: 'Mini-arc du Serpent Clan', music: 'MUS-73', stages: ['SC-1', 'SC-2', 'SC-3'] },
];

/** « Chaque faction a un mini-arc de trois missions […], débloqué après Blooded. » */
export const MINOR_ARC_RANKS_V160: readonly RankId[] = ['blooded', 'elite', 'elder'];

export const minorArcStageV160 = (id: unknown) => typeof id === 'string' ? MINOR_ARC_STAGES_V160.find(stage => stage.id === id) ?? null : null;

// ---------------------------------------------------------------------------
// Registre sauvegardé
// ---------------------------------------------------------------------------

export interface MinorArcFieldStepV160 { kind: 'field'; regionId: ContractRegionIdV68; runId: string | null; proof: ContractFieldEventV68 | null; reportTick: number | null }
export interface MinorArcHuntProofV160 { missionId: 'volcano-bad-blood'; completedAt: string; objectiveId: 'defeat-bad-blood'; honorRuleId: 'stop-purge' }
export interface MinorArcHuntStepV160 { kind: 'hunt'; missionId: 'volcano-bad-blood'; proof: MinorArcHuntProofV160 | null }
export type MinorArcStepStateV160 = MinorArcFieldStepV160 | MinorArcHuntStepV160;
export interface MinorArcEntryV160 {
  stageId: MinorArcStageIdV160; status: 'active' | 'abandoned' | 'completed'; acceptanceSerial: number;
  steps: MinorArcStepStateV160[]; outcomeId: string | null; completionSerial: number | null;
}
export interface MinorArcsV160 { version: 1; ownerCreatedAt: string; serial: number; entries: MinorArcEntryV160[] }

const record = (raw: unknown): raw is Record<string, unknown> => !!raw && typeof raw === 'object' && !Array.isArray(raw);
const integer = (raw: unknown, minimum = 0, maximum = 1_000_000): raw is number => typeof raw === 'number' && Number.isSafeInteger(raw) && raw >= minimum && raw <= maximum;
const runIdValid = (raw: unknown): raw is string => typeof raw === 'string' && /^[a-zA-Z0-9][a-zA-Z0-9:_-]{0,99}$/.test(raw);
const isoDate = (raw: unknown): raw is string => typeof raw === 'string' && Number.isFinite(Date.parse(raw));

export const defaultMinorArcsV160 = (ownerCreatedAt: string): MinorArcsV160 => ({ version: 1, ownerCreatedAt, serial: 0, entries: [] });

function normalizeStep(definition: MinorArcStepDefinitionV160, raw: unknown): MinorArcStepStateV160 | null {
  if (!record(raw) || raw.kind !== definition.kind) return null;
  if (definition.kind === 'hunt') {
    if (raw.missionId !== definition.missionId) return null;
    if (raw.proof === null) return { kind: 'hunt', missionId: definition.missionId, proof: null };
    const proof = raw.proof;
    if (!record(proof) || proof.missionId !== definition.missionId || proof.objectiveId !== definition.objectiveId
      || proof.honorRuleId !== definition.honorRuleId || !isoDate(proof.completedAt)) return null;
    return { kind: 'hunt', missionId: definition.missionId, proof: { missionId: definition.missionId, objectiveId: definition.objectiveId, honorRuleId: definition.honorRuleId, completedAt: proof.completedAt } };
  }
  if (raw.regionId !== definition.regionId || raw.runId !== null && !runIdValid(raw.runId)) return null;
  const proof = raw.proof === null ? null : normalizeContractFieldEventV68(raw.proof);
  if (raw.proof !== null && (!proof || proof.regionId !== definition.regionId || proof.action !== definition.action || proof.runId !== raw.runId)) return null;
  if (raw.reportTick !== null && (!proof || !integer(raw.reportTick, proof.tick + 1, 5_184_000))) return null;
  return { kind: 'field', regionId: definition.regionId, runId: raw.runId as string | null, proof, reportTick: raw.reportTick as number | null };
}

const stepDone = (step: MinorArcStepStateV160) => step.kind === 'hunt' ? !!step.proof : !!step.proof && step.reportTick !== null;

function normalizeEntry(raw: unknown, serial: number): MinorArcEntryV160 | null {
  if (!record(raw)) return null;
  const stage = minorArcStageV160(raw.stageId);
  if (!stage || stage.implementation !== 'jouable' || !['active', 'abandoned', 'completed'].includes(String(raw.status))
    || !integer(raw.acceptanceSerial, 1, serial) || !Array.isArray(raw.steps) || raw.steps.length !== stage.steps.length) return null;
  const steps: MinorArcStepStateV160[] = [];
  for (const [index, definition] of stage.steps.entries()) {
    const step = normalizeStep(definition, raw.steps[index]);
    if (!step) return null;
    // Étapes ordonnées : une étape ne peut être liée avant la confirmation de la précédente.
    if (index > 0 && !stepDone(steps[index - 1]) && (step.kind === 'field' ? step.runId !== null : !!step.proof)) return null;
    steps.push(step);
  }
  if (raw.status === 'completed') {
    if (!steps.every(stepDone) || raw.outcomeId !== stage.outcomeId || !integer(raw.completionSerial, raw.acceptanceSerial as number, serial)) return null;
  } else if (raw.outcomeId !== null || raw.completionSerial !== null) return null;
  return { stageId: stage.id, status: raw.status as MinorArcEntryV160['status'], acceptanceSerial: raw.acceptanceSerial as number, steps,
    outcomeId: raw.outcomeId as string | null, completionSerial: raw.completionSerial as number | null };
}

export type MinorArcsInspectionV160 =
  | { status: 'absent'; state: null } | { status: 'valid'; state: MinorArcsV160 }
  | { status: 'future'; state: null } | { status: 'invalid'; state: null };

/** Lecture stricte : une version future ou un registre d'un autre propriétaire n'est jamais réécrit. */
export function inspectMinorArcsV160(raw: unknown, ownerCreatedAt: string): MinorArcsInspectionV160 {
  if (raw === undefined || raw === null) return { status: 'absent', state: null };
  if (record(raw) && typeof raw.version === 'number' && raw.version > MINOR_ARCS_SCHEMA_VERSION_V160) return { status: 'future', state: null };
  if (!record(raw) || raw.version !== 1 || raw.ownerCreatedAt !== ownerCreatedAt || !integer(raw.serial) || !Array.isArray(raw.entries)
    || raw.entries.length > MINOR_ARC_STAGES_V160.length) return { status: 'invalid', state: null };
  const entries = raw.entries.map(entry => normalizeEntry(entry, raw.serial as number));
  if (!entries.every(Boolean)) return { status: 'invalid', state: null };
  const valid = entries as MinorArcEntryV160[];
  if (new Set(valid.map(entry => entry.stageId)).size !== valid.length) return { status: 'invalid', state: null };
  const serials = valid.flatMap(entry => [entry.acceptanceSerial, ...(entry.completionSerial === null ? [] : [entry.completionSerial])]);
  if (new Set(serials).size !== serials.length) return { status: 'invalid', state: null };
  for (const entry of valid) {
    const prerequisite = minorArcStageV160(entry.stageId)!.prerequisite;
    if (prerequisite && !valid.some(prior => prior.stageId === prerequisite && prior.status === 'completed' && prior.completionSerial! < entry.acceptanceSerial)) return { status: 'invalid', state: null };
  }
  return { status: 'valid', state: { version: 1, ownerCreatedAt, serial: raw.serial as number, entries: valid } };
}
export const normalizeMinorArcsV160 = (raw: unknown, ownerCreatedAt: string): MinorArcsV160 | null => inspectMinorArcsV160(raw, ownerCreatedAt).state;

// ---------------------------------------------------------------------------
// Accès
// ---------------------------------------------------------------------------

export type MinorArcAccessSaveV160 = HomeworldAccessSaveV69 & Pick<SaveGame, 'createdAt' | 'profile' | 'missionProgress'> & { minorArcsV160?: unknown };
export interface MinorArcAccessV160 { unlocked: boolean; playable: boolean; allowed: boolean; reason: string }

/** Conditions : rang Blooded atteint (bible), villages ouverts, étape précédente remise, chasse cible accessible. */
export function minorArcAccessV160(save: MinorArcAccessSaveV160, stageId: MinorArcStageIdV160): MinorArcAccessV160 {
  const stage = minorArcStageV160(stageId);
  if (!stage) return { unlocked: false, playable: false, allowed: false, reason: 'Étape inconnue.' };
  const inspection = inspectMinorArcsV160(save.minorArcsV160, save.createdAt);
  if (inspection.status === 'future' || inspection.status === 'invalid')
    return { unlocked: false, playable: false, allowed: false, reason: 'Le registre des mini-arcs de cette sauvegarde ne peut pas être modifié.' };
  if (!MINOR_ARC_RANKS_V160.includes(save.profile.rankId))
    return { unlocked: false, playable: stage.implementation === 'jouable', allowed: false, reason: 'Ce mini-arc s’ouvre après le rang Blooded.' };
  if (!canVisitHomeworldVillagesV69(save))
    return { unlocked: false, playable: stage.implementation === 'jouable', allowed: false, reason: 'Les sorties vers les villages ne sont pas encore autorisées par ton maître.' };
  if (stage.prerequisite) {
    const done = inspection.state?.entries.some(entry => entry.stageId === stage.prerequisite && entry.status === 'completed');
    if (!done) return { unlocked: false, playable: stage.implementation === 'jouable', allowed: false, reason: `Termine d’abord ${stage.prerequisite} · ${minorArcStageV160(stage.prerequisite)!.title}.` };
  }
  if (stage.implementation !== 'jouable')
    return { unlocked: true, playable: false, allowed: false, reason: 'Étape débloquée, mais non implémentée dans cette version : aucune mission n’est simulée.' };
  for (const step of stage.steps) if (step.kind === 'hunt' && save.missionProgress[step.missionId]?.status === 'locked')
    return { unlocked: true, playable: true, allowed: false, reason: 'La chasse de Cinder-12 n’est pas encore ouverte dans ta campagne.' };
  return { unlocked: true, playable: true, allowed: true, reason: '' };
}

// ---------------------------------------------------------------------------
// Actions
// ---------------------------------------------------------------------------

export type MinorArcActionV160 = { kind: 'accept' | 'abandon' | 'resume' | 'deliver'; stageId: MinorArcStageIdV160 };
export interface MinorArcMeetContextV160 { interiorId: string | null; pointId: string | null; npcId: string | null; actor: { x: number; y: number }; suspended?: boolean }
export interface MinorArcResultV160 { state: MinorArcsV160 | null; ok: boolean; changed: boolean; message: string }

const giverDefinition = (giver: MinorArcGiverV160): ContractDefinitionV68 => ({ id: 'minor-arc-giver', title: '', category: 'npc', giverNpcId: giver.npcId,
  giverName: giver.speaker, pointId: giver.pointId, buildingId: giver.buildingId, brief: '', restriction: '', rewardMarks: 0, objectives: [] });

/** Rencontre physique : même validation que les commanditaires des contrats V68 (pièce, point, personne, position praticable). */
export function canMeetMinorArcGiverV160(stage: MinorArcStageV160, context: MinorArcMeetContextV160): boolean {
  return !!stage.giver && canMeetContractGiverV68(giverDefinition(stage.giver), { eligible: true, ...context });
}

const out = (state: MinorArcsV160 | null, ok: boolean, changed: boolean, message: string): MinorArcResultV160 => ({ state, ok, changed, message });

export function applyMinorArcV160(save: MinorArcAccessSaveV160, action: MinorArcActionV160, context: MinorArcMeetContextV160): MinorArcResultV160 {
  const inspection = inspectMinorArcsV160(save.minorArcsV160, save.createdAt);
  if (inspection.status === 'future' || inspection.status === 'invalid') return out(null, false, false, 'Le registre des mini-arcs de cette sauvegarde ne peut pas être modifié.');
  const state: MinorArcsV160 = structuredClone(inspection.state ?? defaultMinorArcsV160(save.createdAt));
  const stage = minorArcStageV160(action?.stageId);
  if (!stage || !['accept', 'abandon', 'resume', 'deliver'].includes(action?.kind)) return out(state, false, false, 'Cette demande n’existe pas.');
  if (stage.implementation !== 'jouable') return out(state, false, false, `${stage.id} n’est pas implémentée dans cette version.`);
  if (context.suspended || !canMeetMinorArcGiverV160(stage, context)) return out(state, false, false, `Rejoins ${stage.giver!.speaker} en personne : ${stage.giver!.place}.`);
  const existing = state.entries.find(entry => entry.stageId === stage.id);
  if (existing?.status === 'completed') return out(state, true, false, `${stage.id} est déjà inscrite. Son issue n’est pas enregistrée deux fois.`);
  if (action.kind === 'accept' || action.kind === 'resume') {
    if (existing?.status === 'active') return out(state, true, false, 'Cette épreuve est déjà suivie.');
    if (action.kind === 'resume' && !existing) return out(state, false, false, 'Aucune épreuve mise de côté à reprendre.');
    const access = minorArcAccessV160(save, stage.id);
    if (!access.allowed) return out(state, false, false, access.reason);
    if (state.serial >= 1_000_000) return out(state, false, false, 'Le registre a atteint sa limite.');
    state.serial++;
    const entry: MinorArcEntryV160 = { stageId: stage.id, status: 'active', acceptanceSerial: state.serial, outcomeId: null, completionSerial: null,
      steps: stage.steps.map(step => step.kind === 'field' ? { kind: 'field', regionId: step.regionId, runId: null, proof: null, reportTick: null } : { kind: 'hunt', missionId: step.missionId, proof: null }) };
    if (existing) state.entries[state.entries.indexOf(existing)] = entry; else state.entries.push(entry);
    return out(state, true, true, stage.arcId === 'lost-tribe'
      ? 'Épreuve acceptée. Pars vers les villages indiqués ; les sorties précédentes ne comptent pas.'
      : 'Contrat accepté. Seule une chasse réussie après cet accord sera retenue.');
  }
  if (!existing || existing.status !== 'active') return out(state, false, false, 'Cette épreuve n’est pas suivie.');
  if (action.kind === 'abandon') { existing.status = 'abandoned'; return out(state, true, true, 'Épreuve mise de côté. Une reprise demandera de tout refaire.'); }
  if (!existing.steps.every(stepDone)) return out(state, false, false, 'Il manque une preuve confirmée avant la remise.');
  state.serial++;
  existing.status = 'completed'; existing.outcomeId = stage.outcomeId; existing.completionSerial = state.serial;
  return out(state, true, true, `${stage.id} terminée · ${stage.outcomeText}`);
}

/** À appeler avec la sortie de village nouvellement créée, dans la même écriture que son départ. */
export function bindMinorArcsRunV160(raw: unknown, ownerCreatedAt: string, regionId: string, runId: string): MinorArcResultV160 {
  const inspection = inspectMinorArcsV160(raw, ownerCreatedAt);
  if (inspection.status !== 'valid') return out(null, inspection.status === 'absent', false, 'Aucun mini-arc à lier.');
  if (!runIdValid(runId)) return out(inspection.state, false, false, 'Départ non reconnu.');
  const state = structuredClone(inspection.state);
  let changed = false;
  for (const entry of state.entries) if (entry.status === 'active') for (const [index, step] of entry.steps.entries()) {
    if (step.kind !== 'field' || index > 0 && !stepDone(entry.steps[index - 1])) continue;
    if (step.regionId !== regionId || step.reportTick !== null || step.runId === runId) continue;
    step.runId = runId; step.proof = null; changed = true;
  }
  return out(state, true, changed, changed ? 'Sortie liée à l’épreuve suivie.' : 'Aucune épreuve nouvelle pour cette sortie.');
}

/** Même événement physique que les contrats V68 ; appelé uniquement depuis l'interaction réussie du village. */
export function recordMinorArcsFieldEventV160(raw: unknown, ownerCreatedAt: string, eventRaw: unknown, context: { regionId: string; runId: string; suspended?: boolean }): MinorArcResultV160 {
  const inspection = inspectMinorArcsV160(raw, ownerCreatedAt), event = normalizeContractFieldEventV68(eventRaw);
  if (inspection.status !== 'valid') return out(null, inspection.status === 'absent', false, 'Aucun mini-arc suivi.');
  if (!event || context.suspended || event.runId !== context.runId || event.regionId !== context.regionId) return out(inspection.state, false, false, 'Observation non valide.');
  const state = structuredClone(inspection.state);
  let changed = false;
  for (const entry of state.entries) {
    if (entry.status !== 'active') continue;
    const stage = minorArcStageV160(entry.stageId)!;
    for (const [index, step] of entry.steps.entries()) {
      const definition = stage.steps[index];
      if (step.kind !== 'field' || definition.kind !== 'field' || index > 0 && !stepDone(entry.steps[index - 1])) continue;
      if (step.regionId !== event.regionId || step.runId !== event.runId || step.reportTick !== null) continue;
      if (event.action === 'report' && step.proof && event.tick > step.proof.tick) { step.reportTick = event.tick; changed = true; }
      else if (event.action === definition.action && step.proof === null) { step.proof = event; changed = true; }
    }
  }
  return out(state, true, changed, changed ? 'Preuve inscrite pour l’épreuve de la Lost Tribe.' : 'Aucune épreuve ne réclame cette observation.');
}

/** Appelé par applyMissionResult sur une réussite effectivement appliquée. */
export function recordMinorArcsHuntResultV160(raw: unknown, ownerCreatedAt: string,
  result: Pick<MissionResult, 'missionId' | 'outcome' | 'completedObjectiveIds' | 'honorEvents' | 'completedAt'>): MinorArcResultV160 {
  const inspection = inspectMinorArcsV160(raw, ownerCreatedAt);
  if (inspection.status !== 'valid') return out(null, inspection.status === 'absent', false, '');
  if (result.outcome !== 'success' || !isoDate(result.completedAt)) return out(inspection.state, true, false, '');
  const state = structuredClone(inspection.state);
  let changed = false;
  for (const entry of state.entries) {
    if (entry.status !== 'active') continue;
    const stage = minorArcStageV160(entry.stageId)!;
    for (const [index, step] of entry.steps.entries()) {
      const definition = stage.steps[index];
      if (step.kind !== 'hunt' || definition.kind !== 'hunt' || step.proof || index > 0 && !stepDone(entry.steps[index - 1])) continue;
      const kept = result.honorEvents.some(event => event.id === `honor-rule:${definition.honorRuleId}` && event.kind === 'objective' && event.value > 0);
      if (result.missionId !== definition.missionId || !result.completedObjectiveIds.includes(definition.objectiveId) || !kept) continue;
      step.proof = { missionId: definition.missionId, objectiveId: definition.objectiveId, honorRuleId: definition.honorRuleId, completedAt: result.completedAt };
      changed = true;
    }
  }
  return out(state, true, changed, changed ? 'Contrat du Serpent Clan rempli : retourne voir Ssik’thar.' : '');
}

// ---------------------------------------------------------------------------
// Journal (présentation)
// ---------------------------------------------------------------------------

export type MinorArcPhaseV160 = 'locked' | 'offer' | 'field' | 'return' | 'completed' | 'abandoned' | 'not-implemented' | 'unavailable';
export interface MinorArcStageViewV160 {
  stage: MinorArcStageV160; phase: MinorArcPhaseV160; reason: string;
  steps: readonly { text: string; status: 'confirmed' | 'report' | 'field' | 'later' }[];
  nextAction: string | null; outcomeText: string | null;
}
export function minorArcsJournalV160(save: MinorArcAccessSaveV160) {
  const inspection = inspectMinorArcsV160(save.minorArcsV160, save.createdAt);
  const writable = inspection.status === 'valid' || inspection.status === 'absent';
  const views: MinorArcStageViewV160[] = MINOR_ARC_STAGES_V160.map(stage => {
    const entry = inspection.state?.entries.find(item => item.stageId === stage.id);
    const access = minorArcAccessV160(save, stage.id);
    const current = entry ? entry.steps.findIndex(step => !stepDone(step)) : -1;
    const steps = stage.steps.map((definition, index) => {
      const step = entry?.steps[index];
      const status = step && stepDone(step) ? 'confirmed' as const : step?.kind === 'field' && step.proof ? 'report' as const
        : !entry || index === current || current === -1 && index === 0 ? 'field' as const : 'later' as const;
      return { text: definition.kind === 'field' ? `${contractRegionNameV68(definition.regionId)} · ${definition.text}` : definition.text, status };
    });
    let phase: MinorArcPhaseV160;
    if (!writable) phase = 'unavailable';
    else if (entry?.status === 'completed') phase = 'completed';
    else if (entry?.status === 'abandoned') phase = 'abandoned';
    else if (entry?.status === 'active') phase = current === -1 ? 'return' : 'field';
    else if (stage.implementation !== 'jouable') phase = access.unlocked ? 'not-implemented' : 'locked';
    else phase = access.allowed ? 'offer' : 'locked';
    const step = entry && current >= 0 ? entry.steps[current] : null;
    const nextAction = phase === 'return' ? `Remettre l’épreuve à ${stage.giver!.speaker}` : phase === 'field' && step
      ? step.kind === 'hunt' ? 'Réussir la chasse de Cinder-12 en respectant « Ne laisser aucune trace »'
        : step.proof ? `Faire confirmer le retour au guide · ${contractRegionNameV68(step.regionId)}` : step.runId ? 'Effectuer l’observation à distance' : `Partir vers ${contractRegionNameV68(step.regionId)}`
      : null;
    return { stage, phase, reason: phase === 'locked' || phase === 'not-implemented' || phase === 'unavailable' ? access.reason : '', steps, nextAction,
      outcomeText: entry?.status === 'completed' ? stage.outcomeText : null };
  });
  return { writable, arcs: MINOR_ARCS_V160.map(arc => ({ ...arc, views: views.filter(view => view.stage.arcId === arc.id),
    completed: views.filter(view => view.stage.arcId === arc.id && view.phase === 'completed').length })) };
}
