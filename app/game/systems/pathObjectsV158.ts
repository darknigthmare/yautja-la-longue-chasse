/**
 * V158 — Objets des voies et matériaux de maison.
 *
 * Deux manques des V154/V157 :
 *   - les transitions « Trophée » STORY5-TR-Ox-02 ne trouvaient jamais leur
 *     objet central (lame de Varek, crâne partagé, fragment ancien, arme
 *     fautive, câble de Mara) : aucune mission de voie ne le procurait ;
 *   - les scènes de résidence S1–S3 inscrivaient des matériaux (cales,
 *     plaquette, matériau, entretoise, module d'éclairage) sans stock réel.
 *
 * Ce qui suit les sources (classeur V6) :
 *   - provenance de chaque original : mission de voie qui le met en jeu
 *     (« Missions des six voies », textes repris dans `data/pathObjectsV158.json`) :
 *     O1-M16 « La lame rendue », O2-M16 « Le trophée sous un autre angle »,
 *     O3-M12 « Le nom qui reste inconnu », O4-M07 « La lame sous le tissu »,
 *     O5-M19 « La main sur le câble » ;
 *   - le choix de la mission fixe la garde matérielle (O1-M16 : conserver
 *     l'arme ou la remettre à une garde neutre ; O3-M12 : refuge ou atelier de
 *     comparaison ; O4-M07 : dépôt ou examen neutre) ;
 *   - STATE5-31/32 : un propriétaire et un emplacement uniques ; l'événement
 *     est enregistré avant sa conséquence et ne s'applique pas deux fois ;
 *     « L'exposition n'équivaut pas à transfert de propriété » ;
 *   - STORY5-TR-O1-02 : « la lame de Varek ne peut être présentée que si le
 *     joueur en a encore la garde […] Si elle a été rendue, la scène utilise
 *     le relevé » ; même lecture pour les autres lignes -02 (« objet réel, prêt
 *     autorisé ou relevé explicitement identifié ; propriété vérifiée ») ;
 *   - STORY5-TR-O4-02 : « Déposer l'arme aux archives » déplace l'original ;
 *   - « V5 Aménagements » : « Les matériaux sont retirés d'un stock réel à la
 *     confirmation » ; « V5 Scènes des résidences » : « un aménagement confirmé
 *     consomme les matériaux indiqués » ; HOME-R20 : stocks séparés, remise
 *     traçable ;
 *   - « Pièces des maisons » : « Les entretoises de pilotis offrent une matière
 *     de mobilier propre au quartier » (HOME-CM07-P3) ; « Les cales résonantes
 *     offrent une matière de mobilier propre au quartier » (HOME-CM14-P3).
 *
 * Choix du jeu « proposé » :
 *   - l'état d'entrée « Ox-Mnn-1 résolue » n'est pas lu (les missions de voie
 *     précédentes n'existent pas dans le jeu) ; restent la voie, le rang
 *     minimal et le lieu ;
 *   - lieux : O1-M16 sur la route des Marches de Cendre (« ash-marches », où
 *     Varek poursuit le joueur en O1-M15) ; O3-M12 dans une sortie de région où
 *     le coffret a été relevé (lecture des « décombres ») ; O2-M16 et O4-M07 à
 *     l'atelier de trophées (« atelier », « support d'atelier ») ;
 *   - découpage de chaque scène en trois gestes ordonnés et du choix en deux
 *     options ;
 *   - O2-M16 : le trophée familial (le crâne partagé) reste propriété de la
 *     famille et passe en prêt autorisé à l'atelier du joueur ;
 *   - « atelier de comparaison » (O3-M12) et « dépôt » (O4-M07) lus comme
 *     l'atelier du joueur ;
 *   - O5-M19 n'est pas jouable : Namarra (PLAN13), le vaisseau personnel et
 *     EXP01–02 n'existent pas dans le jeu, et la mission ne transfère pas le
 *     câble (O5-M24 : « Ses biens restent à elle ») ;
 *   - matériaux : achetés en marques de clan à l'atelier du quartier qui les
 *     produit, 2 marques l'unité, avec le respect « habiter » du quartier
 *     (confiance de l'artisan) ; cale → HOME-CM14, entretoise → HOME-CM07
 *     (sources ci-dessus) ; module d'éclairage → HOME-CM08 (« lanternes
 *     basses »), plaquette et matériau → HOME-CM04 (aucune source de
 *     provenance) ; « du matériau » (CM04-S3) compte pour une unité ;
 *   - une scène confirmée avant V158 ne reprend rien rétroactivement.
 */
import source from "../data/pathObjectsV158.json" with { type: "json" };
import {
  houseV149, rankAtLeastV149, residenceAccessV149,
  type ResidenceContextV149, type ResidenceRankV149, type ResidenceStateV149,
} from "./residenceV149";
import { isOriginIdV151, type OriginIdV151, type OriginStateV151 } from "./originsV151";
import { trophyTransitionChooseV157, trophyTransitionV157, type TrophyWorkshopContextV157 } from "./originTrophyV157";
import {
  SCENE_CONSUMPTION_V154, applySceneActionV154, sceneConsumptionV154,
  type ResidenceScenesV154, type SceneActionV154, type SceneContextV154,
} from "./residenceScenesV154";

// ---------------------------------------------------------------------------
// Sources
// ---------------------------------------------------------------------------

export interface PathMissionSourceV158 {
  id: string; title: string; originId: OriginIdV151; act: string; minimumRank: string; entry: string;
  conditions: string; scene: string; choices: string; failure: string; exit: string; sourceRow: number;
}
export const PATH_MISSIONS_SOURCE_V158 = source.missions as PathMissionSourceV158[];

export type PathLocationV158 =
  /** Under the hunter's own custody (workshop or personal keeping). */
  | { kind: "hunter" }
  /** Held elsewhere (neutral guard, refuge, examiner, archives): only its relevé reaches the workshop. */
  | { kind: "held"; holder: string };

export type PathPlaceV158 =
  | { kind: "workshop" }
  | { kind: "region"; regionId: string | null; zone: "passage" | null; action: string | null; label: string };

export interface PathOriginalDefinitionV158 {
  id: string;
  originId: OriginIdV151;
  label: string;
  /** Mission that puts the original in play (provenance). */
  missionId: string;
  /** STATE5-31 owner once in play. */
  owner: string;
}
interface PathMissionPlayV158 {
  playable: boolean;
  /** Why the mission cannot be played in this game (unplayable only). */
  unplayable: string | null;
  place: PathPlaceV158;
  steps: readonly [string, string, string];
  options: readonly [string, string];
  /** Custody fixed by each option. */
  outcomes: readonly [PathLocationV158, PathLocationV158];
  reactions: readonly [string, string];
}
const HUNTER: PathLocationV158 = { kind: "hunter" };
const held = (holder: string): PathLocationV158 => ({ kind: "held", holder });

export const PATH_ORIGINALS_V158: Readonly<Record<Exclude<OriginIdV151, "O6">, PathOriginalDefinitionV158>> = {
  O1: { id: "voie:O1:lame-de-varek", originId: "O1", label: "Lame de Varek", missionId: "O1-M16", owner: "Varek" },
  O2: { id: "voie:O2:crane-partage", originId: "O2", label: "Crâne partagé (trophée familial)", missionId: "O2-M16", owner: "famille du joueur" },
  O3: { id: "voie:O3:fragment-ancien", originId: "O3", label: "Fragment ancien à la marque incomplète", missionId: "O3-M12", owner: "inconnu (aucune attribution certaine)" },
  O4: { id: "voie:O4:arme-de-l-ancetre", originId: "O4", label: "Arme fautive de l’ancêtre", missionId: "O4-M07", owner: "famille du joueur" },
  O5: { id: "voie:O5:cable-de-mara", originId: "O5", label: "Câble de Mara", missionId: "O5-M19", owner: "Mara Venn" },
};
export const PATH_ORIGINAL_IDS_V158 = Object.values(PATH_ORIGINALS_V158).map(entry => entry.id);
export function pathOriginalForOriginV158(originId: OriginIdV151): PathOriginalDefinitionV158 | null {
  return originId === "O6" ? null : PATH_ORIGINALS_V158[originId];
}
const definitionById = (id: string) => Object.values(PATH_ORIGINALS_V158).find(entry => entry.id === id) ?? null;

/** Proposé : lecture jouable de chaque mission (voir l'en-tête). */
const PLAY: Readonly<Record<string, PathMissionPlayV158>> = {
  "O1-M16": {
    playable: true, unplayable: null,
    place: { kind: "region", regionId: "ash-marches", zone: "passage", action: null, label: "sur la route des Marches de Cendre" },
    steps: ["Revenir par un autre itinéraire", "Dégager le socle", "Récupérer l’arme sans la présenter comme trophée de victoire"],
    options: ["Conserver l’arme pour la confrontation", "Remettre l’arme à une garde neutre"],
    outcomes: [HUNTER, held("garde neutre")],
    reactions: ["La lame reste sous ta garde, avec sa provenance : elle appartient à Varek et ne compte pour aucune victoire.",
      "La garde neutre reçoit la lame ; sa restitution reste visible dans la galerie, où seul son relevé peut paraître."],
  },
  "O2-M16": {
    playable: true, unplayable: null,
    place: { kind: "workshop" },
    steps: ["Orienter le trophée familial sur son berceau", "Examiner les marques situées à des angles opposés", "Conserver chaque observation séparément"],
    options: ["Construire une chronologie complète", "Annoter les trois phases sans les relier"],
    outcomes: [HUNTER, HUNTER],
    reactions: ["Piste, combat, extraction : la chronologie relie les traces, l’incertitude reste écrite là où elle existe.",
      "Trois annotations séparées : chaque phase garde ses traces, sans lien affirmé entre elles."],
  },
  "O3-M12": {
    playable: true, unplayable: null,
    place: { kind: "region", regionId: null, zone: null, action: "recover", label: "dans une sortie de région où le coffret a été relevé" },
    steps: ["Examiner le fragment découvert dans les décombres", "Comparer trois objets", "Interroger deux familles"],
    options: ["Conserver le fragment au refuge", "Confier le fragment à l’atelier de comparaison"],
    outcomes: [held("refuge"), HUNTER],
    reactions: ["Le fragment reste au refuge, sur un support séparé : la question demeure ouverte.",
      "Le fragment rejoint ton atelier de comparaison, avec une entrée inconnue honnête au registre."],
  },
  "O4-M07": {
    playable: true, unplayable: null,
    place: { kind: "workshop" },
    steps: ["Découvrir l’arme de l’ancêtre emballée dans la réserve familiale", "Orienter l’arme sous la lumière", "Comparer le textile coincé dans la garde sur un support d’atelier"],
    options: ["Conserver l’arme en dépôt", "Demander immédiatement un examen neutre"],
    outcomes: [HUNTER, held("examen neutre")],
    reactions: ["L’arme reste en dépôt à ton atelier ; la piste est documentée, sans mérite ni culpabilité pour toi.",
      "L’arme part à l’examen neutre ; sa chaîne de garde est écrite, seul son relevé reste à l’atelier."],
  },
  "O5-M19": {
    playable: false,
    unplayable: "Non jouable dans ce jeu : Namarra (PLAN13), le vaisseau personnel et l’expédition EXP01–02 n’existent pas, et la mission ne transfère pas le câble (O5-M24 : « Ses biens restent à elle »).",
    place: { kind: "region", regionId: null, zone: null, action: null, label: "Namarra (PLAN13)" },
    steps: ["Suivre une proie près d’une falaise instable", "Saisir le câble tendu par Mara Venn", "Affronter séparément la menace immédiate"],
    options: ["Accepter son point d’appui", "Atteindre une seconde prise avant de la rejoindre"],
    outcomes: [held("Mara Venn"), held("Mara Venn")],
    reactions: ["", ""],
  },
};

export interface PathMissionV158 extends PathMissionSourceV158, PathMissionPlayV158 {}
export function pathMissionV158(missionId: string): PathMissionV158 | null {
  const row = PATH_MISSIONS_SOURCE_V158.find(entry => entry.id === missionId);
  return row ? { ...row, ...PLAY[row.id] } : null;
}
export function pathMissionForOriginV158(originId: OriginIdV151): PathMissionV158 | null {
  const original = pathOriginalForOriginV158(originId);
  return original ? pathMissionV158(original.missionId) : null;
}

// ---------------------------------------------------------------------------
// Materials
// ---------------------------------------------------------------------------

export const MATERIAL_PRICE_V158 = 2;
export const MATERIAL_MAX_V158 = 99;
export interface MaterialSourceV158 {
  /** House whose workshop (P3) sells it. */
  houseId: string;
  /** Workbook text that ties the material to that quarter, or null (proposé without source). */
  quote: string | null;
}
/** Keys are the item names of `SCENE_CONSUMPTION_V154`. */
export const MATERIAL_SOURCES_V158: Readonly<Record<string, MaterialSourceV158>> = {
  cale: { houseId: "HOME-CM14", quote: "Les cales résonantes offrent une matière de mobilier propre au quartier." },
  entretoise: { houseId: "HOME-CM07", quote: "Les entretoises de pilotis offrent une matière de mobilier propre au quartier." },
  "module d’éclairage": { houseId: "HOME-CM08", quote: null },
  plaquette: { houseId: "HOME-CM04", quote: null },
  "matériau": { houseId: "HOME-CM04", quote: null },
};
export const MATERIAL_IDS_V158 = Object.keys(MATERIAL_SOURCES_V158);
export const isMaterialV158 = (item: unknown): item is string => typeof item === "string" && item in MATERIAL_SOURCES_V158;

/** Real stock a confirmed scene option takes (quantity not given by the row → 1, proposé). */
export function sceneMaterialNeedsV158(sceneId: string, choice: 0 | 1): { item: string; quantity: number }[] {
  return sceneConsumptionV154(sceneId, choice).map(entry => ({ item: entry.item, quantity: entry.quantity ?? 1 }));
}
export function materialsSoldAtV158(houseId: string): string[] {
  return MATERIAL_IDS_V158.filter(item => MATERIAL_SOURCES_V158[item].houseId === houseId);
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export const PATH_OBJECTS_VERSION_V158 = 1 as const;
export interface PathOriginalRecordV158 {
  /** STATE5-31. */
  owner: string;
  /** STATE5-32: one location. */
  location: PathLocationV158;
  /** Mission (provenance) and its choice. */
  missionId: string;
  choice: 0 | 1;
}
export interface PathMissionRecordV158 { steps: number; resolved: boolean; choice: 0 | 1 | null }
export interface PathObjectsV158 {
  version: typeof PATH_OBJECTS_VERSION_V158;
  missions: Record<string, PathMissionRecordV158>;
  originals: Record<string, PathOriginalRecordV158>;
  materials: Record<string, number>;
  /** Event ids already applied (never twice). */
  receipts: string[];
}
export const emptyPathObjectsV158 = (): PathObjectsV158 => ({ version: 1, missions: {}, originals: {}, materials: {}, receipts: [] });

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
export const isFuturePathObjectsV158 = (raw: unknown) => isRecord(raw) && typeof raw.version === "number" && raw.version > PATH_OBJECTS_VERSION_V158;

function normalizeLocation(raw: unknown): PathLocationV158 | null {
  if (!isRecord(raw)) return null;
  if (raw.kind === "hunter") return { kind: "hunter" };
  if (raw.kind === "held" && typeof raw.holder === "string" && raw.holder && raw.holder.length <= 80) return { kind: "held", holder: raw.holder };
  return null;
}

/**
 * Tolerant reader. Unknown entries are dropped; an original is kept only with
 * its provenance mission resolved (never given for free); a stock is a whole
 * number in [0, 99]. Null for a future version or a non-record.
 */
export function normalizePathObjectsV158(raw: unknown): PathObjectsV158 | null {
  if (!isRecord(raw) || isFuturePathObjectsV158(raw)) return null;
  const state = emptyPathObjectsV158();
  if (isRecord(raw.missions)) for (const [id, value] of Object.entries(raw.missions)) {
    const mission = pathMissionV158(id);
    if (!mission || !mission.playable || !isRecord(value)) continue;
    const steps = Number.isInteger(value.steps) ? Math.max(0, Math.min(mission.steps.length, Number(value.steps))) : 0;
    const choice = value.choice === 0 || value.choice === 1 ? value.choice : null;
    const resolved = value.resolved === true && choice !== null && steps === mission.steps.length;
    state.missions[id] = { steps, resolved, choice: resolved ? choice : null };
  }
  if (isRecord(raw.originals)) for (const [id, value] of Object.entries(raw.originals)) {
    const definition = definitionById(id);
    const mission = definition && state.missions[definition.missionId];
    if (!definition || !mission?.resolved || !isRecord(value)) continue;
    const location = normalizeLocation(value.location);
    if (!location) continue;
    state.originals[id] = { owner: definition.owner, location, missionId: definition.missionId, choice: mission.choice! };
  }
  if (isRecord(raw.materials)) for (const [item, value] of Object.entries(raw.materials))
    if (isMaterialV158(item) && Number.isInteger(value) && Number(value) > 0) state.materials[item] = Math.min(MATERIAL_MAX_V158, Number(value));
  if (Array.isArray(raw.receipts)) state.receipts = [...new Set(raw.receipts.filter((r): r is string => typeof r === "string" && r.length <= 200))].slice(-400);
  return state;
}

/** Originals under the hunter's custody now (what the workshop can really hold). */
export function heldPathOriginalIdsV158(state: PathObjectsV158 | null): string[] {
  if (!state) return [];
  return Object.entries(state.originals).filter(([, record]) => record.location.kind === "hunter").map(([id]) => id);
}

/** The voie originals and the residence objects never share an id (one registry per original). */
export function pathRegistryConflictsV158(state: PathObjectsV158, residence: ResidenceStateV149 | null): string[] {
  const residenceIds = new Set((residence?.objects ?? []).map(object => object.id));
  return Object.keys(state.originals).filter(id => residenceIds.has(id));
}

// ---------------------------------------------------------------------------
// Provenance missions
// ---------------------------------------------------------------------------

export interface PathPlaceContextV158 {
  originId: OriginIdV151;
  rankId: string;
  atWorkshop: boolean;
  /** Region run checkpoint, when the hunter is in a Homeworld region. */
  region: { regionId: string; runId: string; zone: string; eventReceipts: readonly string[] } | null;
}
export type PathChangeV158 = { ok: true; state: PathObjectsV158; message: string } | { ok: false; reason: string };
const refuse = (reason: string): { ok: false; reason: string } => ({ ok: false, reason });

const RANKS: Record<string, ResidenceRankV149> = { "Unblooded": "unblooded", "Young Blood": "young-blood", "Blooded": "blooded", "Elite": "elite" };

/** Null when the mission can be played here and now; otherwise the reason. */
export function pathMissionClosedV158(mission: PathMissionV158, context: PathPlaceContextV158): string | null {
  if (!mission.playable) return mission.unplayable;
  if (context.originId !== mission.originId) return "Cette mission appartient à une autre voie.";
  const rank = RANKS[mission.minimumRank];
  if (rank && !rankAtLeastV149(context.rankId, rank)) return `Rang minimal : ${mission.minimumRank}.`;
  const place = mission.place;
  if (place.kind === "workshop") return context.atWorkshop ? null : "La mission se joue à l’atelier de trophées.";
  const region = context.region;
  if (!region) return `La mission se joue ${place.label}.`;
  if (place.regionId && region.regionId !== place.regionId) return `La mission se joue ${place.label}.`;
  if (place.zone && region.zone !== place.zone) return `La mission se joue ${place.label}.`;
  if (place.action && !region.eventReceipts.includes(place.action)) return `La mission se joue ${place.label}.`;
  return null;
}

export function pathMissionStepV158(current: PathObjectsV158, missionId: string, stepIndex: number, context: PathPlaceContextV158): PathChangeV158 {
  const mission = pathMissionV158(missionId);
  if (!mission) return refuse("Mission inconnue.");
  const closed = pathMissionClosedV158(mission, context);
  if (closed) return refuse(closed);
  const record = current.missions[mission.id] ?? { steps: 0, resolved: false, choice: null };
  if (record.resolved) return refuse("Cette mission est déjà résolue.");
  if (!Number.isInteger(stepIndex) || stepIndex < 0 || stepIndex >= mission.steps.length) return refuse("Geste inconnu.");
  if (stepIndex < record.steps) return refuse("Déjà fait.");
  if (stepIndex > record.steps) return refuse(mission.failure);
  const state = structuredClone(current);
  state.missions[mission.id] = { ...record, steps: record.steps + 1 };
  return { ok: true, state, message: `${mission.steps[stepIndex]} : fait.` };
}

/** The choice closes the mission once and puts its original in play with one owner and one location. */
export function pathMissionChooseV158(current: PathObjectsV158, missionId: string, choice: 0 | 1, context: PathPlaceContextV158): PathChangeV158 {
  const mission = pathMissionV158(missionId);
  if (!mission) return refuse("Mission inconnue.");
  const closed = pathMissionClosedV158(mission, context);
  if (closed) return refuse(closed);
  const eventId = `${mission.id}:resolved`;
  if (current.receipts.includes(eventId)) return refuse("Cette mission est déjà résolue.");
  const record = current.missions[mission.id];
  if (!record || record.steps < mission.steps.length) return refuse("Termine d’abord les gestes de la mission.");
  if (choice !== 0 && choice !== 1) return refuse("Choix inconnu.");
  const definition = pathOriginalForOriginV158(mission.originId)!;
  if (current.originals[definition.id]) return refuse("Cet original est déjà enregistré.");
  const state = structuredClone(current);
  // The event is recorded before its consequence (STATE5-31).
  state.receipts = [...state.receipts, eventId];
  state.missions[mission.id] = { steps: record.steps, resolved: true, choice };
  state.originals[definition.id] = { owner: definition.owner, location: structuredClone(mission.outcomes[choice]), missionId: mission.id, choice };
  return { ok: true, state, message: mission.reactions[choice] };
}

export type PathMissionActionV158 = { kind: "step"; missionId: string; index: number } | { kind: "choose"; missionId: string; choice: 0 | 1 };
export function applyPathMissionActionV158(current: PathObjectsV158, action: PathMissionActionV158, context: PathPlaceContextV158): PathChangeV158 {
  if (action.kind === "step") return pathMissionStepV158(current, action.missionId, action.index, context);
  if (action.kind === "choose") return pathMissionChooseV158(current, action.missionId, action.choice, context);
  return refuse("Action inconnue.");
}

// ---------------------------------------------------------------------------
// Trophy transitions -02 with the real original
// ---------------------------------------------------------------------------

export type TrophyWithOriginalsChangeV158 =
  | { ok: true; origin: OriginStateV151; objects: PathObjectsV158; message: string }
  | { ok: false; reason: string };

/**
 * STORY5-TR-Ox-02 choice, reading the originals really held. With the
 * original under the hunter's custody the scene can succeed; otherwise the
 * V157 relevé variant stands. O4, option « Déposer l'arme aux archives » on a
 * held original moves it to the archives in the same validation.
 */
export function trophyChooseWithOriginalsV158(origin: OriginStateV151, objects: PathObjectsV158, trophyId: string, choice: 0 | 1, context: TrophyWorkshopContextV157): TrophyWithOriginalsChangeV158 {
  const held = heldPathOriginalIdsV158(objects);
  const change = trophyTransitionChooseV157(origin, trophyId, choice, { ...context, heldOriginalIds: held });
  if (!change.ok) return change;
  const transition = trophyTransitionV157(origin.originId);
  let next = objects;
  const definition = isOriginIdV151(origin.originId) ? pathOriginalForOriginV158(origin.originId) : null;
  if (origin.originId === "O4" && choice === 0 && definition && held.includes(definition.id)) {
    next = structuredClone(objects);
    next.receipts = [...next.receipts, `${transition.id}:archives`];
    next.originals[definition.id] = { ...next.originals[definition.id], location: { kind: "held", holder: "archives" } };
  }
  return { ok: true, origin: change.state, objects: next, message: change.message };
}

// ---------------------------------------------------------------------------
// Materials: purchase and consumption
// ---------------------------------------------------------------------------

export type MaterialChangeV158 = { ok: true; state: PathObjectsV158; clanMarks: number; message: string } | { ok: false; reason: string };

/** Buy one unit at the workshop of the quarter that produces it (proposé). */
export function buyMaterialV158(current: PathObjectsV158, clanMarks: number, item: string, residence: ResidenceStateV149, context: ResidenceContextV149): MaterialChangeV158 {
  if (!isMaterialV158(item)) return refuse("Matériau inconnu.");
  const origin = MATERIAL_SOURCES_V158[item];
  const house = houseV149(origin.houseId)!;
  if (context.atHouseId !== house.id) return refuse(`Ce matériau s’obtient à l’atelier de ${house.title}.`);
  const access = residenceAccessV149(residence, house.id, context);
  if (!access.rank) return refuse(`Rang minimal : ${house.minimumRank}.`);
  if (!access.region) return refuse("Accès réel à la région requis.");
  if (access.respect < house.respect.inhabit) return refuse(`Confiance de l’artisan : respect ${access.respect}/${house.respect.inhabit}.`);
  if ((current.materials[item] ?? 0) >= MATERIAL_MAX_V158) return refuse("Réserve pleine.");
  if (!Number.isInteger(clanMarks) || clanMarks < MATERIAL_PRICE_V158) return refuse(`Marques de clan insuffisantes : ${MATERIAL_PRICE_V158} requises.`);
  const state = structuredClone(current);
  state.materials[item] = (state.materials[item] ?? 0) + 1;
  return { ok: true, state, clanMarks: clanMarks - MATERIAL_PRICE_V158, message: `1 × ${item} acheté à ${house.title} (${MATERIAL_PRICE_V158} marques). Réserve : ${state.materials[item]}.` };
}

export type SceneWithStockChangeV158 =
  | { ok: true; scenes: ResidenceScenesV154; objects: PathObjectsV158; message: string }
  | { ok: false; reason: string };

/**
 * V154 scene action with the real stock: a confirmed option that names
 * materials takes them once from the reserve, or is refused if they are missing.
 */
export function applySceneActionWithStockV158(scenes: ResidenceScenesV154, objects: PathObjectsV158, residence: ResidenceStateV149, action: SceneActionV154, context: SceneContextV154): SceneWithStockChangeV158 {
  if (action.kind !== "choose") {
    const change = applySceneActionV154(scenes, residence, action, context);
    return change.ok ? { ok: true, scenes: change.state, objects, message: change.message } : change;
  }
  // The scene's own rules first (open, gestures done, not yet resolved); nothing is written before the stock check.
  const change = applySceneActionV154(scenes, residence, action, context);
  if (!change.ok) return change;
  const needs = SCENE_CONSUMPTION_V154[action.sceneId] ? sceneMaterialNeedsV158(action.sceneId, action.choice) : [];
  const eventId = `${action.sceneId}:materials`;
  if (needs.length && objects.receipts.includes(eventId)) return refuse("Ces matériaux ont déjà été consommés.");
  const missing = needs.filter(need => (objects.materials[need.item] ?? 0) < need.quantity);
  if (missing.length) return refuse(`Matériaux insuffisants : ${missing.map(need => {
    const house = houseV149(MATERIAL_SOURCES_V158[need.item]?.houseId);
    return `${need.quantity} × ${need.item} requis, ${objects.materials[need.item] ?? 0} en réserve${house ? ` (atelier de ${house.title})` : ""}`;
  }).join(" ; ")}.`);
  if (!needs.length) return { ok: true, scenes: change.state, objects, message: change.message };
  const next = structuredClone(objects);
  next.receipts = [...next.receipts, eventId];
  for (const need of needs) {
    const left = (next.materials[need.item] ?? 0) - need.quantity;
    if (left > 0) next.materials[need.item] = left; else delete next.materials[need.item];
  }
  return { ok: true, scenes: change.state, objects: next, message: `${change.message} Prélevé : ${needs.map(need => `${need.quantity} × ${need.item}`).join(", ")}.` };
}
