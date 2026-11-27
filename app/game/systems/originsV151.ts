/**
 * V151 — Origines actives (BUILD5-05, classeur V6).
 *
 * Critère : « Deux origines jouent le même jalon avec des réactions
 * différentes. » Le jalon commun pris ici est la résidence réellement active
 * (BUILD5-07) ; chaque origine y joue sa transition « Maison »
 * STORY5-TR-Ox-01 (onglet « V5 Transitions des voies »).
 *
 * Suivi du classeur :
 *   - STATE5-01 `playerOriginId` O1..O6 : fixé à la création du personnage,
 *     jamais réécrit ; une ancienne sauvegarde reçoit une valeur par défaut
 *     documentée (ci-dessous) ;
 *   - « État à la sortie » : `resolved` et `success` distincts ; décisions
 *     locales, relations et emplacements mémorisés ; aucun changement de fin
 *     d'origine, de rang commun ni de récompense déjà appliquée ;
 *   - « Échec et reprise » : un geste mal ordonné se corrige avant validation,
 *     sans perte (droit de résidence intact) ;
 *   - un événement déjà consommé ne s'applique pas deux fois.
 *
 * Choix du jeu « proposé » :
 *   - valeur par défaut d'une ancienne sauvegarde : O6 « La Longue Chasse »
 *     (voie du titre du jeu), marquée `legacy-default` ;
 *   - découpage de chaque scène en gestes ordonnés et des « Choix et effets »
 *     en deux options, à partir du texte du classeur ;
 *   - réactions courtes affichées après le choix ;
 *   - relation écrite : le personnage nommé par la scène, avec la décision
 *     prise et son statut (présent, attendu, absent).
 */
import source from "../data/originsV151.json" with { type: "json" };
import { residenceAccessV149, type ResidenceContextV149, type ResidenceStateV149 } from "./residenceV149";
import { normalizeTrainingYardO6, type TrainingYardRecordO6 } from "./originTrainingYardO6";
import { normalizeContinuationO6, type ContinuationRecordO6 } from "./originContinuationO6";
import { normalizeSoloReturnO6, type SoloReturnRecordO6 } from "./originSoloReturnO6";
import { normalizeFirstShockO6, type FirstShockRecordO6 } from "./originFirstShockO6";
import { normalizeCohortRaceO6, type CohortRaceRecordO6 } from "./originCohortRaceO6";
import { normalizeTownBellO6, type TownBellRecordO6 } from "./originTownBellO6";
import { normalizeRivalRaceO6, type RivalRaceRecordO6 } from "./originRivalRaceO6";

export const ORIGIN_IDS_V151 = ["O1", "O2", "O3", "O4", "O5", "O6"] as const;
export type OriginIdV151 = (typeof ORIGIN_IDS_V151)[number];
export const LEGACY_DEFAULT_ORIGIN_V151: OriginIdV151 = "O6";

export interface OriginDefinitionV151 {
  id: OriginIdV151; title: string; promise: string; story: string; characters: string;
  playStyle: string; endings: string; coherence: string; sourceRow: number;
}
export interface HouseTransitionSourceV151 {
  id: string; title: string; originId: OriginIdV151; system: string; entry: string; scene: string;
  choices: string; consequence: string; failure: string; exit: string; sourceRow: number;
}
export const ORIGINS_V151 = source.origins as OriginDefinitionV151[];
export const HOUSE_TRANSITIONS_SOURCE_V151 = source.houseTransitions as HouseTransitionSourceV151[];
/** V157 : lignes STORY5-TR-Ox-02 (système « Trophée »), même forme que les lignes « Maison ». */
export const TROPHY_TRANSITIONS_SOURCE_V151 = source.trophyTransitions as HouseTransitionSourceV151[];
/** Gestures per scene: three for every -01 and -02 transition. */
export const TRANSITION_STEP_COUNT_V151 = 3;
export const originV151 = (id: unknown) => ORIGINS_V151.find(origin => origin.id === id) ?? null;
export const isOriginIdV151 = (id: unknown): id is OriginIdV151 => (ORIGIN_IDS_V151 as readonly unknown[]).includes(id);

/**
 * Playable reading of each house transition (proposé): ordered gestures from
 * « Scène en 2D », the two options of « Choix et effets », the character the
 * scene names and the reaction shown after the choice.
 */
interface HouseScenePlayV151 {
  steps: readonly string[];
  options: readonly [string, string];
  reactions: readonly [string, string];
  character: { id: string; name: string; presence: "present" | "awaited" | "absent" } | null;
}
const PLAY: Record<OriginIdV151, HouseScenePlayV151> = {
  O1: {
    steps: ["Déplacer la poignée intérieure", "Tester le passage chargé", "Installer un appui pour un visiteur plus petit"],
    options: ["Conserver un rappel de l’ancienne maison", "Créer une entrée entièrement personnelle"],
    reactions: ["La poignée d’origine reste à côté de la nouvelle, plus basse : la marche trop haute devient un souvenir qu’on choisit de garder.",
      "Rien ne rappelle le seuil familial : l’entrée est à ta hauteur et à celle de tes visiteurs."],
    character: { id: "O1:dhera", name: "Dhera", presence: "awaited" },
  },
  O2: {
    steps: ["Déplacer les supports", "Vérifier les lignes de vue", "Placer le masque avec les traces de piste, de combat et de secours"],
    options: ["Créer une ligne chronologique", "Créer trois stations reliées"],
    reactions: ["Les visiteurs suivent la chasse dans l’ordre ; le coup final de l’ancêtre reste nommé, les gestes oubliés sont à leur place.",
      "Piste, combat et secours ont chacun leur station : on comprend qui a fait quoi en marchant d’un poste à l’autre."],
    character: null,
  },
  O3: {
    steps: ["Déballer les objets réellement sauvés", "Choisir l’étagère", "Laisser Tava proposer son aide sans décider"],
    options: ["Conserver un espace de mémoire", "Donner un nouvel usage à l’espace"],
    reactions: ["L’étagère garde un vide : la perte a une place dans la maison, sans qu’on l’explique à chaque visite.",
      "Un objet de ta vie actuelle prend la place ; le deuil n’est pas effacé, il n’occupe plus toute la pièce."],
    character: { id: "O3:tava", name: "Tava", presence: "awaited" },
  },
  O4: {
    steps: ["Fixer le support de la plaque", "Choisir les informations rendues publiques", "Répondre à un voisin pendant la tâche"],
    options: ["Garder le nom accompagné de contexte", "Employer le signe provisoire choisi dans la voie"],
    reactions: ["Les voisins te saluent par ton nom, plaque et contexte lisibles : ni expulsion, ni absolution.",
      "Le signe provisoire marque le seuil ; les salutations changent, le dossier reste ouvert jusqu’au choix de fin."],
    character: null,
  },
  O5: {
    steps: ["Préparer un couchage de visite", "Régler les accès", "Laisser les objets personnels dans une garde séparée"],
    options: ["Proposer une halte courte", "Proposer une simple rencontre dehors"],
    reactions: ["La chambre de passage est prête ; si Mara vient, elle repartira sur sa route, sans devenir résidente.",
      "La rencontre aura lieu dehors, comme elle le préfère ; la maison reste la tienne seule."],
    character: { id: "O5:mara", name: "Mara Venn", presence: "absent" },
  },
  O6: {
    steps: ["Installer un appui", "Installer un râtelier", "Dégager une zone libre"],
    options: ["Conserver un exercice ancien", "Créer une nouvelle séquence"],
    reactions: ["L’exercice de la cour revient, à l’échelle de ta maison : un ancien camarade le reconnaîtra au premier pas.",
      "Une séquence nouvelle, la tienne : la première visite découvrira un parcours qui n’existait pas dans la cohorte."],
    character: { id: "O6:cohorte", name: "un ancien camarade", presence: "awaited" },
  },
};

export interface HouseTransitionV151 extends HouseTransitionSourceV151, HouseScenePlayV151 {}
export function houseTransitionV151(originId: OriginIdV151): HouseTransitionV151 {
  const sourceRow = HOUSE_TRANSITIONS_SOURCE_V151.find(entry => entry.originId === originId)!;
  return { ...sourceRow, ...PLAY[originId] };
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export interface TransitionRecordV151 {
  /** Gestures completed in order. */
  steps: number;
  resolved: boolean;
  success: boolean;
  choice: 0 | 1 | null;
  /** House where the scene was resolved (local decision). */
  houseId: string | null;
  /**
   * V157, « Trophée » (-02) transitions only: the owned trophy (SaveGame.trophies id)
   * placed at the bench. Absent from house records, whose shape is unchanged.
   */
  trophyId?: string | null;
}
export interface RelationV151 { name: string; presence: "present" | "awaited" | "absent"; transitionId: string; choice: 0 | 1 }
export interface OriginStateV151 {
  version: 1 | 2;
  originId: OriginIdV151;
  source: "creation" | "legacy-default";
  transitions: Record<string, TransitionRecordV151>;
  relations: Record<string, RelationV151>;
  /** Event ids already applied (never twice). */
  consumed: string[];
  /**
   * V170, STATE5-08 « originEndingId » : fin de voie choisie à Elite (Ox-M29).
   * Clé additive : absente tant que la sélection n'a pas été visitée.
   */
  ending?: OriginEndingStateV151;
  trainingYardO6?: TrainingYardRecordO6;
  continuationO6?: ContinuationRecordO6;
  soloReturnO6?: SoloReturnRecordO6;
  firstShockO6?: FirstShockRecordO6;
  cohortRaceO6?: CohortRaceRecordO6;
  townBellO6?: TownBellRecordO6;
  rivalRaceO6?: RivalRaceRecordO6;
}
/** V170 : Ox-M29 « Enregistrer la visite de sélection séparément de sa réussite » ; écrit une fois. */
export interface OriginEndingStateV151 {
  version: 1;
  /** Ox-M29 visitée (examen d'au moins une fin). */
  selectionVisited: boolean;
  /** STATE5-08 : exactement une valeur valide Ox-E1..E3 de la voie, ou null. */
  originEndingId: string | null;
  /** Ox.endingChoiceConfirmed : vrai seulement après confirmation explicite. */
  endingChoiceConfirmed: boolean;
  /** Ox.endingRealized : vrai seulement après la clôture Ox-M30 jouée (non jouée dans ce jeu). */
  endingRealized: boolean;
}
const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);
export const isFutureOriginV151 = (raw: unknown) => isRecord(raw) && ((typeof raw.version === "number" && (raw.version > 2 || (raw.version === 2 && !Object.hasOwn(raw, "soloReturnO6"))))
  // V170: a future ending record makes the whole origin record future (never overwritten by an older game).
  || (isRecord(raw.ending) && typeof raw.ending.version === "number" && raw.ending.version > 1)
  || (isRecord(raw.trainingYardO6) && typeof raw.trainingYardO6.version === "number" && raw.trainingYardO6.version > 1)
  || (isRecord(raw.continuationO6) && typeof raw.continuationO6.version === "number" && raw.continuationO6.version > 2)
  || (isRecord(raw.soloReturnO6) && typeof raw.soloReturnO6.version === "number" && raw.soloReturnO6.version > 1)
  || (isRecord(raw.firstShockO6) && typeof raw.firstShockO6.version === "number" && raw.firstShockO6.version > 2)
  || (isRecord(raw.cohortRaceO6) && typeof raw.cohortRaceO6.version === "number" && raw.cohortRaceO6.version > 1)
  || (isRecord(raw.rivalRaceO6) && typeof raw.rivalRaceO6.version === "number" && raw.rivalRaceO6.version > 1)
  || (isRecord(raw.townBellO6) && typeof raw.townBellO6.version === "number" && raw.townBellO6.version > 1));
/** V170 : identifiant de fin valide pour la voie (Ox-E1..Ox-E3, « Fins des six voies »). */
export const isOriginEndingIdV151 = (originId: OriginIdV151, id: unknown): id is string =>
  typeof id === "string" && /^O[1-6]-E[1-3]$/.test(id) && id.startsWith(`${originId}-`);
function normalizeEnding(originId: OriginIdV151, raw: unknown): OriginEndingStateV151 | null {
  if (!isRecord(raw) || raw.version !== 1) return null;
  // Confirmed and identified go together: a provisional or invalid value stays unconfirmed (Ox-M29).
  const confirmed = raw.endingChoiceConfirmed === true && isOriginEndingIdV151(originId, raw.originEndingId);
  return { version: 1, selectionVisited: raw.selectionVisited === true || confirmed,
    originEndingId: confirmed ? raw.originEndingId as string : null, endingChoiceConfirmed: confirmed,
    endingRealized: confirmed && raw.endingRealized === true };
}

export function createOriginV151(originId: OriginIdV151, sourceKind: OriginStateV151["source"] = "creation"): OriginStateV151 {
  return { version: 1, originId, source: sourceKind, transitions: {}, relations: {}, consumed: [] };
}
/** The origin of a save: stored, or the documented default for an older save (not written until used). */
export function originOfSaveV151(raw: unknown): OriginStateV151 {
  return normalizeOriginV151(raw) ?? createOriginV151(LEGACY_DEFAULT_ORIGIN_V151, "legacy-default");
}
export function normalizeOriginV151(raw: unknown): OriginStateV151 | null {
  if (!isRecord(raw) || isFutureOriginV151(raw) || !isOriginIdV151(raw.originId)) return null;
  const state = createOriginV151(raw.originId, raw.source === "legacy-default" ? "legacy-default" : "creation");
  const houseIds = new Set(HOUSE_TRANSITIONS_SOURCE_V151.map(entry => entry.id));
  const trophyIds = new Set(TROPHY_TRANSITIONS_SOURCE_V151.map(entry => entry.id));
  const ids = new Set([...houseIds, ...trophyIds]);
  const max = TRANSITION_STEP_COUNT_V151;
  if (isRecord(raw.transitions)) for (const [id, value] of Object.entries(raw.transitions)) {
    if (!ids.has(id) || !isRecord(value)) continue;
    const steps = Number.isInteger(value.steps) ? Math.max(0, Math.min(max, Number(value.steps))) : 0;
    const choice = value.choice === 0 || value.choice === 1 ? value.choice : null;
    if (trophyIds.has(id)) {
      // V157: a trophy scene keeps its bench trophy; gestures or a resolution without it are not kept.
      const trophyId = typeof value.trophyId === "string" && value.trophyId ? value.trophyId : null;
      const kept = trophyId ? steps : 0;
      const resolved = value.resolved === true && choice !== null && kept === max;
      state.transitions[id] = { steps: kept, resolved, success: resolved && value.success === true, choice: resolved ? choice : null,
        houseId: null, trophyId };
      continue;
    }
    const resolved = value.resolved === true && choice !== null && steps === max;
    state.transitions[id] = { steps, resolved, success: resolved && value.success === true, choice: resolved ? choice : null,
      houseId: typeof value.houseId === "string" ? value.houseId : null };
  }
  if (isRecord(raw.relations)) for (const [id, value] of Object.entries(raw.relations)) {
    if (!isRecord(value) || typeof value.name !== "string" || !ids.has(String(value.transitionId)) || (value.choice !== 0 && value.choice !== 1)) continue;
    if (!["present", "awaited", "absent"].includes(String(value.presence))) continue;
    state.relations[id] = { name: value.name, presence: value.presence as RelationV151["presence"], transitionId: String(value.transitionId), choice: value.choice };
  }
  const ending = normalizeEnding(state.originId, raw.ending);
  if (ending) state.ending = ending;
  if (Object.hasOwn(raw, "trainingYardO6")) {
    const yard = normalizeTrainingYardO6(raw.trainingYardO6);
    if (state.originId !== "O6" || !yard) return null;
    state.trainingYardO6 = yard;
  }
  if (Object.hasOwn(raw, "continuationO6")) {
    const continuation = normalizeContinuationO6(raw.continuationO6);
    if (state.originId !== "O6" || !continuation) return null;
    state.continuationO6 = continuation;
  }
  if (Object.hasOwn(raw, "soloReturnO6")) {
    const soloReturn = normalizeSoloReturnO6(raw.soloReturnO6);
    if (raw.version !== 2 || state.originId !== "O6" || !soloReturn) return null;
    state.version = 2;
    state.soloReturnO6 = soloReturn;
  }
  if (Object.hasOwn(raw, "firstShockO6")) {
    const firstShock = normalizeFirstShockO6(raw.firstShockO6);
    if (state.originId !== "O6" || state.source !== "creation" || !firstShock) return null;
    state.firstShockO6 = firstShock;
  }
  if (Object.hasOwn(raw, "cohortRaceO6")) {
    const race = normalizeCohortRaceO6(raw.cohortRaceO6);
    if (state.originId !== "O6" || state.source !== "creation" || !state.firstShockO6 || !race) return null;
    state.cohortRaceO6 = race;
  }
  if (Object.hasOwn(raw, "townBellO6")) {
    const townBell = normalizeTownBellO6(raw.townBellO6);
    if (state.originId !== "O6" || state.source !== "creation" || !state.cohortRaceO6?.resolved || !townBell) return null;
    state.townBellO6 = townBell;
  }
  if (Object.hasOwn(raw, "rivalRaceO6")) {
    const rival = normalizeRivalRaceO6(raw.rivalRaceO6);
    if (state.originId !== "O6" || state.source !== "creation" || !state.townBellO6?.resolved || !rival) return null;
    state.rivalRaceO6 = rival;
  }
  if (Array.isArray(raw.consumed)) state.consumed = [...new Set(raw.consumed.filter((v): v is string => typeof v === "string"))].slice(-200);
  return state;
}

// ---------------------------------------------------------------------------
// The house transition
// ---------------------------------------------------------------------------

export type OriginChangeV151 = { ok: true; state: OriginStateV151; message: string } | { ok: false; reason: string };
const refuse = (reason: string): OriginChangeV151 => ({ ok: false, reason });

/** Entry state of the sheet: residence really unlocked and active, local mission and respect acquired. */
export function houseTransitionOpenV151(residence: ResidenceStateV149, context: ResidenceContextV149): boolean {
  const houseId = residence.activeResidenceId;
  return !!houseId && context.atHouseId === houseId && residenceAccessV149(residence, houseId, context).inhabit;
}

export function houseTransitionRecordV151(current: OriginStateV151, houseId: string | null): TransitionRecordV151 | undefined {
  const transition = houseTransitionV151(current.originId);
  const record = current.transitions[transition.id];
  return record && (record.resolved || record.houseId === houseId) ? record : undefined;
}

/** One gesture of the scene. Out of order: the sheet's failure text, nothing lost. */
export function houseTransitionStepV151(current: OriginStateV151, residence: ResidenceStateV149, stepIndex: number, context: ResidenceContextV149): OriginChangeV151 {
  if (!houseTransitionOpenV151(residence, context)) return refuse("La scène se joue dans ta résidence active.");
  const transition = houseTransitionV151(current.originId);
  const record = houseTransitionRecordV151(current, residence.activeResidenceId)
    ?? { steps: 0, resolved: false, success: false, choice: null, houseId: null };
  if (record.resolved) return refuse("Cette scène est déjà résolue.");
  if (!Number.isInteger(stepIndex) || stepIndex < 0 || stepIndex >= transition.steps.length) return refuse("Geste inconnu.");
  if (stepIndex < record.steps) return refuse("Déjà fait.");
  if (stepIndex > record.steps) return refuse(transition.failure);
  const state = structuredClone(current);
  state.transitions[transition.id] = { ...record, steps: record.steps + 1, houseId: residence.activeResidenceId };
  return { ok: true, state, message: `${transition.steps[stepIndex]} : fait.` };
}

/** The choice closes the scene: resolved and success, decision and relation recorded once. */
export function houseTransitionChooseV151(current: OriginStateV151, residence: ResidenceStateV149, choice: 0 | 1, context: ResidenceContextV149): OriginChangeV151 {
  if (!houseTransitionOpenV151(residence, context)) return refuse("La scène se joue dans ta résidence active.");
  const transition = houseTransitionV151(current.originId);
  const eventId = `${transition.id}:resolved`;
  if (current.consumed.includes(eventId)) return refuse("Cette scène est déjà résolue.");
  const record = houseTransitionRecordV151(current, residence.activeResidenceId);
  if (record?.resolved) return refuse("Cette scène est déjà résolue.");
  if (!record || record.steps < transition.steps.length) return refuse("Termine d’abord les gestes de la scène.");
  if (choice !== 0 && choice !== 1) return refuse("Choix inconnu.");
  const state = structuredClone(current);
  state.consumed = [...state.consumed, eventId];
  // Resolved ≠ success: without the named person (O5: Mara not available) the scene closes as a general preparation.
  const success = !transition.character || transition.character.presence !== "absent";
  state.transitions[transition.id] = { ...record, resolved: true, success, choice, houseId: residence.activeResidenceId };
  if (transition.character)
    state.relations[transition.character.id] = { name: transition.character.name, presence: transition.character.presence, transitionId: transition.id, choice };
  return { ok: true, state, message: success ? transition.reactions[choice]
    : `${transition.reactions[choice]} ${transition.character!.name} n’est pas disponible : la pièce reste une préparation générale d’accueil.` };
}
