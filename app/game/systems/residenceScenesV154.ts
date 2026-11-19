/**
 * V154 — Scènes de résidence S1–S3 jouables (classeur V6, onglet
 * « V5 Scènes des résidences », 60 fiches V5-HOME-CMxx-S1..S3).
 *
 * Ce qui suit la source (textes repris de `data/residencesV149.json`) :
 *   - gestes : « Séquence jouable » découpée sur « ; », dans l'ordre ;
 *   - deux choix : « Choix » découpé sur « ou » (une seule occurrence par
 *     fiche ; première lettre mise en capitale, point final retiré) ;
 *   - « Réaction et conséquence » affichée et la décision enregistrée ;
 *   - « Coût et reprise » : « Les aperçus de placement sont gratuits ; un
 *     aménagement confirmé consomme les matériaux indiqués dans sa recette.
 *     Une sortie de scène conserve les gestes achevés et laisse la décision
 *     finale ouverte. » → chaque geste est écrit dès qu'il est fait ; quitter
 *     la scène ne perd rien ; la décision reste ouverte jusqu'à confirmation ;
 *   - « Continuité » : la scène exige la maison active ; aucun jalon commun
 *     n'est accordé ;
 *   - le résultat est enregistré une seule fois (pas de second choix, pas de
 *     seconde consommation).
 *
 * Consommations chiffrées par la fiche elle-même (colonne « Réaction et
 * conséquence ») : CM02-S2 (deux cales), CM04-S1 (une plaquette), CM04-S3
 * (du matériau, quantité non indiquée), CM07-S1 (une entretoise), CM10-S2 (un
 * module d'éclairage).
 *
 * Choix du jeu « proposé » :
 *   - aucun de ces matériaux n'existe dans le jeu (pas de stock domestique) :
 *     la consommation est inscrite dans le registre de la scène, rien n'est
 *     prélevé et le choix n'est pas bloqué ;
 *   - lecture des déclencheurs dans l'état de partie (table TRIGGERS) ; les
 *     conditions de météo ou d'heure « fictionnelles » ne sont pas simulées ;
 *   - le déclencheur est exigé pour commencer (premier geste) ; une scène
 *     commencée se reprend ensuite dans la résidence active même si le
 *     déclencheur n'est plus réuni (invité reparti, par exemple).
 */
import {
  TRAVEL_CONTAINER_ID_V149, houseV149, objectsInHouseV149, residenceAccessV149, scenesForHouseV149,
  type ResidenceContextV149, type ResidenceSceneV149, type ResidenceStateV149,
} from "./residenceV149";
import { GUEST_IDS_V150, visitViewV150, type GuestIdV150, type ResidenceLifeV150 } from "./residenceLifeV150";

// ---------------------------------------------------------------------------
// Playable reading of the source rows
// ---------------------------------------------------------------------------

const capitalize = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
const trimEnd = (text: string) => text.trim().replace(/\.$/, "").trim();

/** « Séquence jouable » → ordered gestures (text kept, split on « ; »). */
export function sceneGesturesV154(scene: ResidenceSceneV149): string[] {
  return scene.sequence.split(";").map(part => capitalize(trimEnd(part))).filter(Boolean);
}
/** « Choix » → the two options (split on the single « ou »). */
export function sceneOptionsV154(scene: ResidenceSceneV149): [string, string] {
  const at = scene.choices.indexOf(" ou ");
  if (at < 0) return [trimEnd(scene.choices), ""];
  return [capitalize(trimEnd(scene.choices.slice(0, at))), capitalize(trimEnd(scene.choices.slice(at + 4)))];
}

export interface SceneConsumptionV154 { item: string; quantity: number | null; source: string }
/** Material use quoted from « Réaction et consequence », by option index. */
export const SCENE_CONSUMPTION_V154: Readonly<Record<string, Partial<Record<0 | 1, SceneConsumptionV154[]>>>> = {
  "V5-HOME-CM02-S2": { 0: [{ item: "cale", quantity: 2, source: "Le premier choix consomme deux cales" }] },
  "V5-HOME-CM04-S1": { 1: [{ item: "plaquette", quantity: 1, source: "Le second choix utilise une plaquette" }] },
  "V5-HOME-CM04-S3": { 1: [{ item: "matériau", quantity: null, source: "le rail coûte du matériau" }] },
  "V5-HOME-CM07-S1": { 0: [{ item: "entretoise", quantity: 1, source: "le premier choix consomme une entretoise" }] },
  "V5-HOME-CM10-S2": { 1: [{ item: "module d’éclairage", quantity: 1, source: "le second consomme un module d’éclairage" }] },
};
/** No material named here exists in the game's inventory (checked against the save types). */
export const MATERIALS_IN_GAME_V154: readonly string[] = [];
export function sceneConsumptionV154(sceneId: string, choice: 0 | 1): SceneConsumptionV154[] {
  return SCENE_CONSUMPTION_V154[sceneId]?.[choice] ?? [];
}

// ---------------------------------------------------------------------------
// Triggers (« Déclencheur »)
// ---------------------------------------------------------------------------

export type SceneConditionV154 =
  | { k: "active" }
  | { k: "furnish" }
  | { k: "receive" }
  | { k: "respect"; min: number }
  | { k: "guests"; min: number }
  | { k: "guest"; id: GuestIdV150 }
  | { k: "invitation" }
  | { k: "slot"; slot: "display" | "bench" }
  | { k: "original" }
  | { k: "run"; actions: string[] | null }
  | { k: "rank"; ranks: string[] }
  | { k: "never"; reason: string };
export interface SceneTriggerV154 {
  /** Any alternative whose conditions all hold reaches the trigger. */
  any: SceneConditionV154[][];
  /** True when the reading is a game choice (proposé), false when the row says it directly. */
  proposed: boolean;
}

const RUN_ANY = [{ k: "run", actions: null }] as SceneConditionV154[];
const t = (proposed: boolean, ...any: SceneConditionV154[][]): SceneTriggerV154 => ({ proposed, any });
/** One entry per row; the row's own words stay in `scene.trigger`. */
export const TRIGGERS_V154: Readonly<Record<string, SceneTriggerV154>> = {
  "V5-HOME-CM01-S1": t(true, RUN_ANY), // Premier retour après une bourrasque
  "V5-HOME-CM01-S2": t(true, [{ k: "guests", min: 1 }, { k: "slot", slot: "display" }]), // Premier visiteur après exposition d’un souvenir
  "V5-HOME-CM01-S3": t(false, [{ k: "furnish" }]), // Respect d’aménagement atteint
  "V5-HOME-CM02-S1": t(true, RUN_ANY), // Soir de froid fictionnel après une mission
  "V5-HOME-CM02-S2": t(true, [{ k: "active" }]), // Arme confiée en entretien
  "V5-HOME-CM02-S3": t(true, [{ k: "receive" }, { k: "guests", min: 1 }]), // Rival disponible et réception autorisée
  "V5-HOME-CM03-S1": t(true, [{ k: "furnish" }]), // Nouvel écran installé
  "V5-HOME-CM03-S2": t(true, [{ k: "original" }]), // Objet trouvé lors d’une mission désertique
  "V5-HOME-CM03-S3": t(true, [{ k: "furnish" }]), // Livraison d’un meuble repliable
  "V5-HOME-CM04-S1": t(true, [{ k: "active" }]), // Après la mission de la Citerne Haute
  "V5-HOME-CM04-S2": t(false, [{ k: "receive" }, { k: "guests", min: 2 }]), // Réception avec plusieurs personnes
  "V5-HOME-CM04-S3": t(true, [{ k: "guests", min: 1 }]), // Retour d’un voisin fatigué
  "V5-HOME-CM05-S1": t(true, RUN_ANY), // Après un trajet sous forte pluie fictionnelle
  "V5-HOME-CM05-S2": t(true, [{ k: "run", actions: ["track", "challenge"] }]), // Faune locale aperçue dans la frondaison
  "V5-HOME-CM05-S3": t(true, [{ k: "original" }]), // Petit trophée compatible disponible
  "V5-HOME-CM06-S1": t(true, RUN_ANY), // Retour pendant une scène de vent
  "V5-HOME-CM06-S2": t(true, [{ k: "guests", min: 1 }]), // Mentor disponible
  "V5-HOME-CM06-S3": t(false, [{ k: "furnish" }]), // Aménagement autorisé
  "V5-HOME-CM07-S1": t(false, [{ k: "active" }]), // HOME-CM07 active ; mission de seuil réussie
  "V5-HOME-CM07-S2": t(false, [{ k: "respect", min: 60 }]), // Respect 60 atteint à HOME-CM07
  "V5-HOME-CM07-S3": t(false, [{ k: "respect", min: 80 }]), // Respect 80 atteint à HOME-CM07
  "V5-HOME-CM08-S1": t(true, RUN_ANY), // Brume fictionnelle et lanternes ouvertes
  "V5-HOME-CM08-S2": t(false, [{ k: "invitation" }]), // Invitation en cours
  "V5-HOME-CM08-S3": t(true, [{ k: "slot", slot: "display" }]), // Trophée installé près de la véranda
  "V5-HOME-CM09-S1": t(true, [{ k: "run", actions: ["recover"] }]), // Retour avec une charge encombrante
  "V5-HOME-CM09-S2": t(true, [{ k: "guests", min: 1 }]), // Rival en visite au col
  "V5-HOME-CM09-S3": t(false, [{ k: "furnish" }]), // Aménagement autorisé
  "V5-HOME-CM10-S1": t(true, RUN_ANY), // Après l’ouverture du guet
  "V5-HOME-CM10-S2": t(true, [{ k: "original" }]), // Trophée portant une marque discrète
  "V5-HOME-CM10-S3": t(true, [{ k: "receive" }, { k: "guests", min: 1 }]), // Réception autorisée ; allié disponible
  "V5-HOME-CM11-S1": t(true, RUN_ANY), // Retour maritime fictionnel
  "V5-HOME-CM11-S2": t(true, [{ k: "original" }]), // Souvenir côtier autorisé
  "V5-HOME-CM11-S3": t(false, [{ k: "receive" }]), // Réception au respect requis
  "V5-HOME-CM12-S1": t(true, RUN_ANY), // Après une tempête fictionnelle
  "V5-HOME-CM12-S2": t(true, [{ k: "guests", min: 2 }]), // Deux témoins disponibles
  "V5-HOME-CM12-S3": t(true, [{ k: "furnish" }]), // Livraison de grand cadre
  "V5-HOME-CM13-S1": t(true, [{ k: "slot", slot: "bench" }]), // Premier usage prolongé de l’atelier
  "V5-HOME-CM13-S2": t(true, [{ k: "never", reason: "Aucun invité d’une autre région n’existe dans le jeu : les invités sont les habitants du village." }]), // Invité venant d’une autre région
  "V5-HOME-CM13-S3": t(true, [{ k: "original" }]), // Objet minéral disponible
  "V5-HOME-CM14-S1": t(true, [{ k: "slot", slot: "bench" }, { k: "run", actions: null }]), // Atelier actif après un retour
  "V5-HOME-CM14-S2": t(true, [{ k: "original" }]), // Objet réparé confié
  "V5-HOME-CM14-S3": t(true, [{ k: "guests", min: 1 }]), // Apprenti ou rival disponible
  "V5-HOME-CM15-S1": t(true, RUN_ANY), // Retour après une scène de neige
  "V5-HOME-CM15-S2": t(true, [{ k: "guests", min: 1 }]), // Atelier mal éclairé pendant une visite
  "V5-HOME-CM15-S3": t(true, [{ k: "guest", id: "guide" }]), // Pisteur du givre disponible
  "V5-HOME-CM16-S1": t(true, RUN_ANY), // Scène de nuit polaire
  "V5-HOME-CM16-S2": t(true, [{ k: "guests", min: 1 }]), // Proche présent après un retour difficile
  "V5-HOME-CM16-S3": t(true, [{ k: "active" }]), // Départ d’expédition préparé
  "V5-HOME-CM17-S1": t(false, [{ k: "active" }]), // Maison des Marches Anciennes active
  "V5-HOME-CM17-S2": t(true, [{ k: "original" }]), // Objet ancien autorisé à l’étude
  "V5-HOME-CM17-S3": t(true, [{ k: "guest", id: "keeper" }]), // Visite du conservateur
  "V5-HOME-CM18-S1": t(true, [{ k: "active" }]), // Cour accessible après installation
  "V5-HOME-CM18-S2": t(true, [{ k: "guests", min: 2 }]), // Témoins aux récits différents
  "V5-HOME-CM18-S3": t(true, [{ k: "guests", min: 1 }]), // Transmission locale disponible
  "V5-HOME-CM19-S1": t(true, [{ k: "run", actions: ["survey"] }]), // Après un relevé autorisé
  "V5-HOME-CM19-S2": t(true, [{ k: "original" }]), // Objet inconnu en étude
  "V5-HOME-CM19-S3": t(false, [{ k: "receive" }]), // Respect de réception atteint
  "V5-HOME-CM20-S1": t(false, [{ k: "active" }]), // Après la mission Le détour de la bête (mission de seuil de HOME-CM20)
  "V5-HOME-CM20-S2": t(true, [{ k: "run", actions: ["track"] }]), // Observation réussie sans affrontement
  "V5-HOME-CM20-S3": t(true, [{ k: "rank", ranks: ["elite", "elder"] }], [{ k: "guests", min: 1 }]), // Elite avancé ou transmission locale
};

const ACTION_LABELS: Record<string, string> = {
  survey: "relevé du territoire", track: "observation de l’animal", recover: "coffret relevé", ward: "balise fixée",
  challenge: "défi de l’animal", report: "rapport vérifié",
};

/** What the scene reads from the game besides the residence rules. */
export interface SceneContextV154 extends ResidenceContextV149 {
  /** Region run the hunter is in (null outside a region). */
  runId: string | null;
  /** Guests seated in the house now (visit stage « present », V150). */
  guestsPresent: GuestIdV150[];
  /** A visit to this house is invited or under way. */
  invitationPending: boolean;
}

/** Guests inside `houseId` at the region tick, and whether an invitation is pending. */
export function guestsAtHouseV154(life: ResidenceLifeV150 | null, houseId: string, region: { runId: string; tick: number } | null): { present: GuestIdV150[]; pending: boolean } {
  if (!life) return { present: [], pending: false };
  const visits = life.visits.filter(visit => visit.houseId === houseId && visit.stage !== "done");
  const present = region ? visits.filter(visit => visit.stage === "under-way" && visit.runId === region.runId
    && visitViewV150(visit, region.tick).stage === "present").map(visit => visit.guestId) : [];
  return { present: GUEST_IDS_V150.filter(id => present.includes(id)), pending: visits.length > 0 };
}

function conditionMet(condition: SceneConditionV154, residence: ResidenceStateV149, houseId: string, context: SceneContextV154): { ok: boolean; label: string } {
  const house = houseV149(houseId)!;
  const access = residenceAccessV149(residence, houseId, context);
  const objects = objectsInHouseV149(residence, houseId);
  switch (condition.k) {
    case "active": return { ok: access.active, label: "résidence active" };
    case "furnish": return { ok: access.furnish, label: `respect « aménager » (${house.respect.furnish})` };
    case "receive": return { ok: access.receive, label: `respect « recevoir » (${house.respect.receive})` };
    case "respect": return { ok: access.active && access.respect >= condition.min, label: `respect ${condition.min}` };
    case "guests": return { ok: context.guestsPresent.length >= condition.min, label: condition.min > 1 ? `${condition.min} invités présents` : "un invité présent dans la maison" };
    case "guest": return { ok: context.guestsPresent.includes(condition.id), label: `invité présent : ${condition.id === "guide" ? "pisteur du clan" : condition.id === "keeper" ? "gardienne des récits" : condition.id}` };
    case "invitation": return { ok: context.invitationPending || context.guestsPresent.length > 0, label: "invitation en cours" };
    case "slot": return {
      ok: objects.some(object => object.location.kind === "room" && object.location.slotId === condition.slot),
      label: condition.slot === "display" ? "un original sur le meuble d’exposition" : "un original sur l’établi local" };
    case "original": return { ok: objects.some(object => object.id !== TRAVEL_CONTAINER_ID_V149), label: "un original rangé dans la maison" };
    case "run": {
      const prefix = context.runId ? `${context.runId}:` : null;
      const done = prefix ? residence.respectReceipts.filter(r => r.startsWith(prefix)).map(r => r.slice(prefix.length)) : [];
      const ok = condition.actions ? done.some(action => condition.actions!.includes(action)) : done.length > 0;
      return { ok, label: condition.actions ? `dans cette sortie : ${condition.actions.map(a => ACTION_LABELS[a] ?? a).join(" ou ")}` : "retour d’une action de terrain dans cette sortie" };
    }
    case "rank": return { ok: condition.ranks.includes(context.rankId), label: "rang Elite" };
    case "never": return { ok: false, label: condition.reason };
  }
}

export interface SceneTriggerStateV154 { reached: boolean; proposed: boolean; missing: string[]; readings: string[] }
export function sceneTriggerV154(scene: ResidenceSceneV149, residence: ResidenceStateV149, context: SceneContextV154): SceneTriggerStateV154 {
  const trigger = TRIGGERS_V154[scene.id];
  if (!trigger) return { reached: false, proposed: true, missing: ["Déclencheur non lu par le jeu."], readings: [] };
  const results = trigger.any.map(all => all.map(condition => conditionMet(condition, residence, scene.houseId, context)));
  const reached = results.some(all => all.every(entry => entry.ok));
  const readings = results.map(all => all.map(entry => entry.label).join(" + "));
  const missing = reached ? [] : results.length === 1 ? results[0].filter(entry => !entry.ok).map(entry => entry.label) : [readings.join(" ou ")];
  return { reached, proposed: trigger.proposed, missing, readings };
}

// ---------------------------------------------------------------------------
// State
// ---------------------------------------------------------------------------

export const RESIDENCE_SCENES_VERSION_V154 = 1 as const;
export interface HouseSceneRecordV154 {
  /** Gestures done, in order (« une sortie de scène conserve les gestes achevés »). */
  gestures: number;
  /** Decision, recorded once. */
  choice: 0 | 1 | null;
  /** Material use inscribed with the decision (no stock exists: nothing is withdrawn). */
  consumed: { item: string; quantity: number | null }[];
  /** Region run in which the decision was confirmed. */
  runId: string | null;
}
export interface ResidenceScenesV154 {
  version: typeof RESIDENCE_SCENES_VERSION_V154;
  scenes: Record<string, HouseSceneRecordV154>;
}
export const emptyResidenceScenesV154 = (): ResidenceScenesV154 => ({ version: 1, scenes: {} });

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);
export const isFutureResidenceScenesV154 = (raw: unknown) => isRecord(raw) && typeof raw.version === "number" && raw.version > RESIDENCE_SCENES_VERSION_V154;

export function sceneV154(sceneId: unknown): ResidenceSceneV149 | null {
  if (typeof sceneId !== "string") return null;
  const houseId = sceneId.replace(/^V5-/, "").replace(/-S[1-3]$/, "");
  return scenesForHouseV149(houseId).find(scene => scene.id === sceneId) ?? null;
}

/** Tolerant reader: unknown scenes dropped; a decision without all its gestures is not kept; consumption follows the row. */
export function normalizeResidenceScenesV154(raw: unknown): ResidenceScenesV154 | null {
  if (!isRecord(raw) || isFutureResidenceScenesV154(raw)) return null;
  const state = emptyResidenceScenesV154();
  if (isRecord(raw.scenes)) for (const [id, value] of Object.entries(raw.scenes)) {
    const scene = sceneV154(id);
    if (!scene || !isRecord(value)) continue;
    const total = sceneGesturesV154(scene).length;
    const gestures = typeof value.gestures === "number" && Number.isInteger(value.gestures) ? Math.max(0, Math.min(total, value.gestures)) : 0;
    const choice = (value.choice === 0 || value.choice === 1) && gestures === total ? value.choice : null;
    state.scenes[id] = {
      gestures, choice,
      consumed: choice === null ? [] : sceneConsumptionV154(id, choice).map(({ item, quantity }) => ({ item, quantity })),
      runId: choice !== null && typeof value.runId === "string" ? value.runId.slice(0, 200) : null,
    };
  }
  return state;
}

// ---------------------------------------------------------------------------
// Changes
// ---------------------------------------------------------------------------

export type SceneChangeV154 = { ok: true; state: ResidenceScenesV154; message: string } | { ok: false; reason: string };
const refuse = (reason: string): SceneChangeV154 => ({ ok: false, reason });

/** The scene belongs to the active residence the hunter stands in, with the right to live there. */
function sceneOpen(scene: ResidenceSceneV149, residence: ResidenceStateV149, context: SceneContextV154): string | null {
  if (residence.activeResidenceId !== scene.houseId) return "La scène se joue dans la résidence active.";
  if (context.atHouseId !== scene.houseId) return "La scène se joue sur place, dans la maison.";
  if (!residenceAccessV149(residence, scene.houseId, context).inhabit) return "Droit d’habiter requis.";
  return null;
}

export function playableScenesV154(residence: ResidenceStateV149, houseId: string, context: SceneContextV154): ResidenceSceneV149[] {
  return scenesForHouseV149(houseId).filter(scene => !sceneOpen(scene, residence, context) && sceneTriggerV154(scene, residence, context).reached);
}

export function sceneGestureV154(current: ResidenceScenesV154, residence: ResidenceStateV149, sceneId: string, index: number, context: SceneContextV154): SceneChangeV154 {
  const scene = sceneV154(sceneId);
  if (!scene) return refuse("Scène inconnue.");
  const closed = sceneOpen(scene, residence, context);
  if (closed) return refuse(closed);
  const gestures = sceneGesturesV154(scene);
  const record = current.scenes[scene.id] ?? { gestures: 0, choice: null, consumed: [], runId: null };
  if (record.choice !== null) return refuse("Cette scène est déjà résolue.");
  if (record.gestures === 0) {
    const trigger = sceneTriggerV154(scene, residence, context);
    if (!trigger.reached) return refuse(`Déclencheur non atteint : ${scene.trigger}. Manque : ${trigger.missing.join(", ")}.`);
  }
  if (!Number.isInteger(index) || index < 0 || index >= gestures.length) return refuse("Geste inconnu.");
  if (index < record.gestures) return refuse("Geste déjà fait.");
  if (index > record.gestures) return refuse(`D’abord : ${gestures[record.gestures]}.`);
  const state = structuredClone(current);
  state.scenes[scene.id] = { ...record, gestures: record.gestures + 1 };
  return { ok: true, state, message: `${gestures[index]} : fait.` };
}

/** Confirmed decision: recorded once, with the material use the row names. */
export function sceneChooseV154(current: ResidenceScenesV154, residence: ResidenceStateV149, sceneId: string, choice: 0 | 1, context: SceneContextV154): SceneChangeV154 {
  const scene = sceneV154(sceneId);
  if (!scene) return refuse("Scène inconnue.");
  const closed = sceneOpen(scene, residence, context);
  if (closed) return refuse(closed);
  const record = current.scenes[scene.id];
  if (record?.choice != null) return refuse("Cette scène est déjà résolue.");
  if (!record || record.gestures < sceneGesturesV154(scene).length) return refuse("Termine d’abord les gestes de la scène.");
  if (choice !== 0 && choice !== 1) return refuse("Choix inconnu.");
  const consumed = sceneConsumptionV154(scene.id, choice).map(({ item, quantity }) => ({ item, quantity }));
  const state = structuredClone(current);
  state.scenes[scene.id] = { ...record, choice, consumed, runId: context.runId };
  return { ok: true, state, message: `${sceneOptionsV154(scene)[choice]}. ${scene.consequence}` };
}

export type SceneActionV154 = { kind: "gesture"; sceneId: string; index: number } | { kind: "choose"; sceneId: string; choice: 0 | 1 };
export function applySceneActionV154(current: ResidenceScenesV154, residence: ResidenceStateV149, action: SceneActionV154, context: SceneContextV154): SceneChangeV154 {
  if (action.kind === "gesture") return sceneGestureV154(current, residence, action.sceneId, action.index, context);
  if (action.kind === "choose") return sceneChooseV154(current, residence, action.sceneId, action.choice, context);
  return refuse("Action inconnue.");
}
