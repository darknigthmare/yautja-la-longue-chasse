/**
 * V170 — Fins d'origine des six voies (classeur V6).
 *
 * Ce qui suit les sources (`data/originEndingsV170.json`, textes repris tels
 * quels avec leur numéro de ligne) :
 *   - « Fins des six voies » : trois fins par voie (O1-E1 … O6-E3), lignes 6–23 ;
 *     « Les six voies », colonne « Directions de fin » (déjà dans
 *     `originsV151.json`, champ `endings`) ;
 *   - « Missions des six voies », Ox-M29 (rang minimal Elite) : « Sélectionner
 *     une seule fin » ; « Enregistrer la visite de sélection séparément de sa
 *     réussite. Écrire Ox.endingId avec exactement une valeur valide et
 *     Ox.endingChoiceConfirmed=true uniquement après confirmation explicite ;
 *     une sortie, un refus ou un choix provisoire conserve le choix non
 *     confirmé » ; « aucune mission ultérieure ne le remplace » ; jalon :
 *     « le rang Elite ne dépend pas de la voie ni du Warp » ;
 *   - Ox-M30 : « Écrire Ox.endingRealized=true uniquement après clôture
 *     effectivement jouée et réussie » ;
 *   - « V5 États communs » : STATE5-08 `originEndingId` « Identifiant de fin
 *     choisi à Elite », « Choix exclusif de dénouement », « Elder et Ancient
 *     prolongent cette fin sans la remplacer », lecteurs « Épilogues et
 *     transmission » ; STATE5-07 `eliteTrialOutcome` (« Épreuve solitaire
 *     commune », lecteurs « AccèsElite et fin de voie ») ;
 *   - « V5 Transitions des voies », STORY5-TR-Ox-06 (système « Transmission ») :
 *     entrée « Fin Oi verrouillée à Elite ; rang Elder ou Ancient commun selon
 *     la scène ; successeur volontaire et présent » ; sortie « Aucun changement
 *     de Ox.endingId, des rangs communs ».
 *
 * Choix du jeu « proposé » :
 *   - condition d'accès : l'épreuve solitaire commune (STATE5-07) n'existe pas
 *     dans le jeu (la preuve « solitary-trial » de la chronique n'est écrite par
 *     aucune scène) ; l'accès lit le rang Elite acquis du profil
 *     (`profile.rankId` elite ou elder) ;
 *   - l'état d'entrée « Ox-M28 résolue » n'est pas lu (les missions 28 de voie
 *     n'existent pas dans le jeu), comme en V158 ;
 *   - O5 : la ligne O5-M29 exige « EXP10 réussie et Mara.departureConfirmed=true » ;
 *     ni EXP10 ni ce drapeau n'existent dans le jeu : la sélection O5 est
 *     refusée et expliquée ;
 *   - lieu : la sélection s'affiche à l'atelier de trophées, avec les autres
 *     panneaux de voie (le classeur nomme un lieu par voie : cercle, salle,
 *     plan, atelier… qui n'existent pas tous) ;
 *   - confirmation en deux temps : « Examiner » présente la fin complète
 *     (condition, sens, séquence, conséquences) et enregistre la visite ;
 *     « Confirmer définitivement » écrit la fin une fois ;
 *   - Ox-M30 (réalisation) n'est pas jouée : `endingRealized` reste faux ;
 *   - STORY5-TR-Ox-06 : seul l'état « déverrouillée » est calculé (fin
 *     confirmée et rang Elder) ; la scène n'est pas jouée, aucun successeur
 *     volontaire n'existe dans le jeu, et le rang Ancient n'est pas un rang du
 *     profil.
 */
import source from "../data/originEndingsV170.json" with { type: "json" };
import { rankAtLeastV149 } from "./residenceV149";
import {
  isOriginEndingIdV151, type OriginEndingStateV151, type OriginIdV151, type OriginStateV151,
} from "./originsV151";

export interface OriginEndingSourceV170 {
  id: string; title: string; originId: OriginIdV151; condition: string; meaning: string; finalSequence: string;
  consequences: string; extension: string; persistentState: string; sourceRow: number;
}
export interface PathMissionRowV170 {
  id: string; title: string; originId: OriginIdV151; act: string; minimumRank: string; entry: string; conditions: string;
  scene: string; choices: string; failure: string; exit: string; milestone: string; sourceRow: number;
}
export interface TransmissionSourceV170 {
  id: string; title: string; originId: OriginIdV151; system: string; entry: string; scene: string; choices: string;
  consequence: string; failure: string; exit: string; sourceRow: number;
}
export interface CommonStateSourceV170 {
  id: string; name: string; owner: string; values: string; writing: string; invariant: string; readers: string; sourceRow: number;
}

export const ORIGIN_ENDINGS_V170 = source.endings as OriginEndingSourceV170[];
export const ENDING_SELECTIONS_V170 = source.selections as PathMissionRowV170[];
export const ENDING_REALIZATIONS_V170 = source.realizations as PathMissionRowV170[];
export const TRANSMISSIONS_V170 = source.transmissions as TransmissionSourceV170[];
export const ENDING_STATES_V170 = source.states as CommonStateSourceV170[];

export const originEndingsV170 = (originId: OriginIdV151) => ORIGIN_ENDINGS_V170.filter(ending => ending.originId === originId);
export const originEndingV170 = (id: unknown) => ORIGIN_ENDINGS_V170.find(ending => ending.id === id) ?? null;
export const endingSelectionV170 = (originId: OriginIdV151) => ENDING_SELECTIONS_V170.find(row => row.originId === originId)!;
export const endingRealizationV170 = (originId: OriginIdV151) => ENDING_REALIZATIONS_V170.find(row => row.originId === originId)!;
export const transmissionV170 = (originId: OriginIdV151) => TRANSMISSIONS_V170.find(row => row.originId === originId)!;

/** Proposé : les voies dont la sélection ne peut pas être jouée dans ce jeu (voir l'en-tête). */
const UNPLAYABLE: Partial<Record<OriginIdV151, string>> = {
  O5: "Non jouable dans ce jeu : O5-M29 exige « EXP10 réussie et Mara.departureConfirmed=true » ; ni l’expédition EXP10 ni le départ confirmé de Mara n’existent dans le jeu.",
};

export interface EndingContextV170 {
  /** `SaveGame.profile.rankId`. */
  rankId: string;
  /** Proposé : la sélection se tient à l'atelier de trophées. */
  atWorkshop: boolean;
}

/** The confirmed ending (STATE5-08), or null. */
export function originEndingIdV170(state: OriginStateV151): string | null {
  return state.ending?.endingChoiceConfirmed ? state.ending.originEndingId : null;
}

/** Why the selection cannot be made now, or null when it is open. */
export function endingSelectionRefusalV170(state: OriginStateV151, context: EndingContextV170): string | null {
  if (originEndingIdV170(state)) return "Ta fin de voie est déjà choisie ; aucune mission ne la remplace.";
  const unplayable = UNPLAYABLE[state.originId];
  if (unplayable) return unplayable;
  // Proposé: the common solitary trial (STATE5-07) is not in the game; the Elite rank acquired stands for it.
  if (!rankAtLeastV149(context.rankId, "elite")) return "Rang minimal : Elite. La fin de voie se choisit après la reconnaissance d’Elite.";
  if (!context.atWorkshop) return "La sélection se tient à l’atelier de trophées.";
  return null;
}

export type OriginEndingChangeV170 =
  | { ok: true; state: OriginStateV151; changed: boolean; message: string }
  | { ok: false; reason: string };
const refuse = (reason: string): OriginEndingChangeV170 => ({ ok: false, reason });
const emptyEnding = (): OriginEndingStateV151 =>
  ({ version: 1, selectionVisited: false, originEndingId: null, endingChoiceConfirmed: false, endingRealized: false });

/**
 * First step: examine one ending. Records the visit once (event `Ox-M29:visited`);
 * nothing is chosen — leaving afterwards keeps the choice unconfirmed.
 */
export function examineEndingV170(current: OriginStateV151, endingId: string, context: EndingContextV170): OriginEndingChangeV170 {
  const refused = endingSelectionRefusalV170(current, context);
  if (refused) return refuse(refused);
  if (!isOriginEndingIdV151(current.originId, endingId)) return refuse("Cette fin n’appartient pas à ta voie.");
  const ending = originEndingV170(endingId)!;
  const eventId = `${endingSelectionV170(current.originId).id}:visited`;
  const message = `${ending.title} : ${ending.meaning}`;
  if (current.consumed.includes(eventId)) return { ok: true, state: current, changed: false, message };
  const state = structuredClone(current);
  state.consumed = [...state.consumed, eventId];
  state.ending = { ...(state.ending ?? emptyEnding()), selectionVisited: true };
  return { ok: true, state, changed: true, message };
}

/**
 * Second step: explicit confirmation. `confirmation` must repeat the examined
 * ending id. Written once (event `Ox-M29:confirmed`); never replaced.
 * Only the origin record changes: no common rank, no reward.
 */
export function confirmEndingV170(current: OriginStateV151, endingId: string, confirmation: string, context: EndingContextV170): OriginEndingChangeV170 {
  const refused = endingSelectionRefusalV170(current, context);
  if (refused) return refuse(refused);
  if (!isOriginEndingIdV151(current.originId, endingId)) return refuse("Cette fin n’appartient pas à ta voie.");
  const selection = endingSelectionV170(current.originId);
  const eventId = `${selection.id}:confirmed`;
  if (current.consumed.includes(eventId)) return refuse("Ta fin de voie est déjà choisie ; aucune mission ne la remplace.");
  if (!current.ending?.selectionVisited) return refuse("Examine d’abord la fin et ses conditions.");
  if (confirmation !== endingId) return refuse("Confirmation absente : le choix reste non confirmé.");
  const ending = originEndingV170(endingId)!;
  const state = structuredClone(current);
  state.consumed = [...state.consumed, eventId];
  state.ending = { version: 1, selectionVisited: true, originEndingId: endingId, endingChoiceConfirmed: true, endingRealized: false };
  return { ok: true, state, changed: true, message: `Fin choisie : ${ending.title}. Ce choix est définitif ; il ne change aucun rang.` };
}

/** STORY5-TR-Ox-06 entry, as far as the game can read it. The scene itself is not played. */
export interface TransmissionStatusV170 {
  transmission: TransmissionSourceV170;
  endingLocked: boolean;
  /** Elder reached (Ancient is not a profile rank). */
  rankReached: boolean;
  /** Ending locked at Elite and Elder reached. */
  unlocked: boolean;
  /** Always false: no volunteer successor exists in the game. */
  scenePlayable: false;
  note: string;
}
export function transmissionStatusV170(state: OriginStateV151, rankId: string): TransmissionStatusV170 {
  const transmission = transmissionV170(state.originId);
  const endingLocked = !!originEndingIdV170(state);
  const rankReached = rankId === "elder";
  const unlocked = endingLocked && rankReached;
  const note = !endingLocked ? "Transmission verrouillée : la fin de voie n’est pas encore choisie."
    : !rankReached ? "Transmission verrouillée : rang Elder requis."
    : "Transmission déverrouillée. La scène n’est pas jouable dans ce jeu : aucun successeur volontaire n’y existe.";
  return { transmission, endingLocked, rankReached, unlocked, scenePlayable: false, note };
}
