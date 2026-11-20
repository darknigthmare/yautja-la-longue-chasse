/**
 * V157 — transitions de voie « Trophée » (STORY5-TR-Ox-02, classeur V6,
 * onglet « V5 Transitions des voies »), jouées à l'atelier de trophées.
 *
 * Suivi du classeur :
 *   - « État à l'entrée » : atelier accessible ; objet réel, prêt autorisé ou
 *     relevé explicitement identifié ; propriété vérifiée. Ici : l'écran du
 *     mur des trophées est ouvert (atelier) et le trophée posé au banc figure
 *     dans `SaveGame.trophies` ;
 *   - « État à la sortie » : `resolved` et `success` distincts ; décision locale,
 *     relation et emplacement (trophée posé) mémorisés ; aucun changement de
 *     fin, de rang commun ni de récompense : seule la clé `originV151` change ;
 *   - « Échec et reprise » : un geste mal ordonné rend le texte de la ligne,
 *     sans perte (rien n'est retiré, le trophée reste où il est) ;
 *   - STATE5-31 / TR-R01 : l'exposition n'équivaut pas à un transfert ; le
 *     trophée garde son identifiant et son propriétaire (rien n'est écrit dans
 *     `SaveGame.trophies`) ;
 *   - un événement déjà consommé ne s'applique pas deux fois.
 *
 * Choix du jeu « proposé » :
 *   - « propriété vérifiée » lue comme « l'identifiant figure dans
 *     `SaveGame.trophies` » : le jeu n'a pas d'état `objectOwnerId` ;
 *   - découpage de chaque scène en trois gestes ordonnés et des « Choix et
 *     effets » en deux options ;
 *   - objet central de la scène : quand le jeu ne le possède pas (lame de
 *     Varek, crâne partagé, fragment ancien, arme fautive, câble de Mara), la
 *     scène se joue avec le relevé que la ligne autorise et l'absence est
 *     expliquée ; la scène est alors `resolved` sans `success` ;
 *   - réactions courtes affichées après le choix, et explications d'absence ;
 *   - relation écrite seulement quand la ligne nomme une personne (O1 Varek,
 *     O5 Mara Venn, O6 partenaires), sous une clé distincte de celle de -01.
 */
import {
  TRANSITION_STEP_COUNT_V151, TROPHY_TRANSITIONS_SOURCE_V151,
  type HouseTransitionSourceV151, type OriginIdV151, type OriginStateV151, type RelationV151, type TransitionRecordV151,
} from "./originsV151";

interface TrophyScenePlayV157 {
  steps: readonly [string, string, string];
  options: readonly [string, string];
  reactions: readonly [string, string];
  /** The scene's central object; `inGame: false` means the save cannot hold it yet. */
  object: { name: string; inGame: boolean; absence: string | null };
  character: { id: string; name: string; presence: RelationV151["presence"] } | null;
}

/** Proposé : lecture jouable de chaque ligne -02 (voir l'en-tête). */
const PLAY: Record<OriginIdV151, TrophyScenePlayV157> = {
  O1: {
    steps: ["Poser le relevé réellement conservé", "Orienter la lame sur le relevé", "Montrer la trace de l’agression"],
    options: ["Exposer une preuve contextualisée", "Garder l’histoire privée"],
    reactions: ["Le support de preuve montre la trace de l’agression et sa date ; la plaque ne compte aucune victoire de chasse.",
      "Le compartiment privé se referme : l’histoire reste la tienne, les visiteurs ne voient que tes propres prises."],
    object: { name: "lame de Varek", inGame: false,
      absence: "La lame de Varek n’est pas sous ta garde dans cette partie : la scène utilise le relevé et la plaque indique l’absence de l’original." },
    character: { id: "O1:varek:trophee", name: "Varek", presence: "absent" },
  },
  O2: {
    steps: ["Régler la lampe", "Tourner le berceau", "Comparer les angles décrits par les témoins"],
    options: ["Conserver les deux lectures compatibles", "Demander une comparaison supplémentaire"],
    reactions: ["Deux lignes attribuées sur la plaque : le coup final de l’ancêtre et l’extraction, chacune avec son témoin.",
      "La plaque reste provisoire ; la comparaison demandée précisera les angles sans retirer le coup final à l’ancêtre."],
    object: { name: "crâne partagé", inGame: false,
      absence: "Le crâne partagé n’est pas dans tes trophées : la comparaison se fait sur son relevé, identifié comme tel." },
    character: null,
  },
  O3: {
    steps: ["Placer le fragment ancien près du trophée actuel", "Observer les traces", "Choisir des supports"],
    options: ["Relier les objets par un récit personnel", "Exposer les objets séparément"],
    reactions: ["Un seul récit court entre les deux berceaux : ce qui a été perdu, puis la chasse d’aujourd’hui, sans que l’une remplace l’autre.",
      "Deux berceaux, deux plaques : chaque pièce garde sa provenance, le visiteur fait le lien s’il le veut."],
    object: { name: "fragment ancien", inGame: false,
      absence: "Le fragment ancien n’est pas dans tes trophées : il reste en réserve et son relevé est visible à côté du trophée actuel." },
    character: null,
  },
  O4: {
    steps: ["Inspecter l’arme fautive sur un banc distinct", "Choisir la lumière et le support", "Choisir la plaque"],
    options: ["Déposer l’arme aux archives", "Exposer l’arme avec la faute explicitée"],
    reactions: ["L’arme part aux archives avec sa fiche ; la galerie ne montre que ta propre prise.",
      "L’arme est exposée à part, la faute écrite sur la plaque ; ta prise reste sur son propre banc."],
    object: { name: "arme fautive de l’ancêtre", inGame: false,
      absence: "L’arme fautive n’est pas dans tes trophées : la plaque se limite au relevé, sans formulation au-delà des preuves." },
    character: null,
  },
  O5: {
    steps: ["Vérifier si Mara a donné, prêté ou gardé le câble", "Placer les deux appuis de la falaise", "Montrer le geste de traction"],
    options: ["Exposer la coordination technique", "Exposer le récit de gratitude"],
    reactions: ["La table montre les deux appuis et la traction : deux chasseurs, deux gestes, aucun maître de l’autre.",
      "La plaque raconte le secours et nomme Mara ; elle ne lui attribue aucune parole."],
    object: { name: "câble de Mara", inGame: false,
      absence: "Aucun don ni prêt du câble n’est enregistré dans cette partie : la table utilise un relevé autorisé, qui n’a pas le statut d’original." },
    character: { id: "O5:mara:trophee", name: "Mara Venn", presence: "absent" },
  },
  O6: {
    steps: ["Tourner le berceau", "Montrer les marques de leurs gestes", "Placer des plaques distinctes"],
    options: ["Mettre en avant la chronologie", "Mettre en avant les techniques complémentaires"],
    reactions: ["Les plaques suivent la chasse dans l’ordre : qui a pisté, qui a frappé, qui a ramené la prise.",
      "Chaque plaque nomme une technique et son porteur ; la prise montre ce que la cohorte sait faire ensemble."],
    object: { name: "trophée actuel", inGame: true, absence: null },
    character: { id: "O6:partenaires:trophee", name: "les partenaires de la chasse", presence: "absent" },
  },
};

export interface TrophyTransitionV157 extends HouseTransitionSourceV151, TrophyScenePlayV157 {}
export function trophyTransitionV157(originId: OriginIdV151): TrophyTransitionV157 {
  const row = TROPHY_TRANSITIONS_SOURCE_V151.find(entry => entry.originId === originId)!;
  return { ...row, ...PLAY[originId] };
}

/** Where the scene is played: the trophy workshop really open, and the player's own trophies. */
export interface TrophyWorkshopContextV157 {
  atWorkshop: boolean;
  /** `SaveGame.trophies` ids (the player's own claims). */
  ownedTrophyIds: readonly string[];
}
export type OriginTrophyChangeV157 = { ok: true; state: OriginStateV151; message: string } | { ok: false; reason: string };
const refuse = (reason: string): OriginTrophyChangeV157 => ({ ok: false, reason });

export function trophyTransitionOpenV157(context: TrophyWorkshopContextV157): boolean {
  return context.atWorkshop && context.ownedTrophyIds.length > 0;
}

function guard(current: OriginStateV151, trophyId: string, context: TrophyWorkshopContextV157) {
  if (!context.atWorkshop) return "La scène se joue à l’atelier de trophées.";
  if (!context.ownedTrophyIds.length) return "Aucun trophée en ta possession : la scène attend une prise réelle.";
  const transition = trophyTransitionV157(current.originId);
  const bound = current.transitions[transition.id]?.trophyId ?? null;
  // Ownership is checked on every action: a trophy no longer in the save cannot be used.
  if (!context.ownedTrophyIds.includes(trophyId)) return "Ce trophée n’est pas en ta possession.";
  if (bound && bound !== trophyId) return "Un autre trophée est déjà posé au banc pour cette scène.";
  return null;
}

/** One gesture. Out of order: the sheet's failure text, nothing lost. */
export function trophyTransitionStepV157(current: OriginStateV151, trophyId: string, stepIndex: number, context: TrophyWorkshopContextV157): OriginTrophyChangeV157 {
  const refused = guard(current, trophyId, context);
  if (refused) return refuse(refused);
  const transition = trophyTransitionV157(current.originId);
  const record: TransitionRecordV151 = current.transitions[transition.id] ?? { steps: 0, resolved: false, success: false, choice: null, houseId: null, trophyId: null };
  if (record.resolved) return refuse("Cette scène est déjà résolue.");
  if (!Number.isInteger(stepIndex) || stepIndex < 0 || stepIndex >= TRANSITION_STEP_COUNT_V151) return refuse("Geste inconnu.");
  if (stepIndex < record.steps) return refuse("Déjà fait.");
  if (stepIndex > record.steps) return refuse(transition.failure);
  const state = structuredClone(current);
  state.transitions[transition.id] = { ...record, steps: record.steps + 1, houseId: null, trophyId };
  return { ok: true, state, message: `${transition.steps[stepIndex]} : fait.` };
}

/** The choice closes the scene once: resolved and success distinct, decision and relation recorded. */
export function trophyTransitionChooseV157(current: OriginStateV151, trophyId: string, choice: 0 | 1, context: TrophyWorkshopContextV157): OriginTrophyChangeV157 {
  const refused = guard(current, trophyId, context);
  if (refused) return refuse(refused);
  const transition = trophyTransitionV157(current.originId);
  const eventId = `${transition.id}:resolved`;
  if (current.consumed.includes(eventId)) return refuse("Cette scène est déjà résolue.");
  const record = current.transitions[transition.id];
  if (!record || record.steps < TRANSITION_STEP_COUNT_V151) return refuse("Termine d’abord les gestes de la scène.");
  if (choice !== 0 && choice !== 1) return refuse("Choix inconnu.");
  const state = structuredClone(current);
  state.consumed = [...state.consumed, eventId];
  // Resolved ≠ success: without the scene's real object, the line's fallback (relevé, absence explained) closes it.
  const success = transition.object.inGame;
  state.transitions[transition.id] = { ...record, resolved: true, success, choice, houseId: null, trophyId };
  if (transition.character)
    state.relations[transition.character.id] = { name: transition.character.name, presence: transition.character.presence, transitionId: transition.id, choice };
  return { ok: true, state, message: success ? transition.reactions[choice] : `${transition.reactions[choice]} ${transition.object.absence}` };
}
