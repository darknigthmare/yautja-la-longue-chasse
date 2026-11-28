/**
 * V165 — Warp : quête commune d'accès, module, branches d'époque, voyage
 * engagé, retour réservé et état de branche persistant.
 *
 * Sources (citées, pas réinventées) :
 * - Bible de campagne : L-10 « Le Warp, époques canon » (W-01 → W-05,
 *   W-02 = Japon féodal 1629), « Warp gate d'après le lore NECA »,
 *   « Missions du Warp » (mini-arc, chasse complète, contrats ; règle canon
 *   des héros ; discrétion temporelle et échos), R2-M030 → R2-M033.
 * - Classeur V6 : « Règles du Warp » WARP-R01 → R24, « Époques du Warp »
 *   (WARP-E06), « Missions du Warp » (WARP-M16 → M18), « Guerre et Warp »
 *   W3-WARP01 → 12, « V5 États communs » STATE5-25 → STATE5-30.
 *
 * Tout ce que ces sources ne fixent pas porte `proposed: true` ou la mention
 * « proposé » dans le texte affiché. Ce module n'écrit ni rang, ni honneur, ni
 * trophée du présent (WARP-R02, WARP-R24) : la branche garde sa propre
 * population, ses morts et ses objets (STATE5-27, STATE5-30, W3-WARP06/07).
 *
 * Fonctions réutilisables par d'autres branches (ex. 2204 / Tantalus) :
 * `warpAccessContextFromSaveV165`, `evaluateWarpDepartureV165`,
 * `departWarpV165`, `canReturnFromWarpV165`, `returnFromWarpV165`,
 * `branchVisitV165`. Elles ne dépendent pas de W-02.
 *
 * V167 — Exception écrite dans la bible (décision du 20 novembre 2026) : le
 * Warp peut aussi atteindre 2204 (Tantalus) ; 2204 est une branche du Warp
 * (`warp-tantalus-2204`). Le classeur V6 n'a pas d'époque 2204 : aucune fiche
 * WARP-E ne la décrit. Le contenu propre à la branche (choix de l'Echo-8) vit
 * dans `tantalusV164.ts` et utilise ce même état (un seul voyage engagé, un
 * seul retour réservé, état de branche STATE5-30).
 */
import type { MissionDefinition, MissionResult, SaveGame } from "../types";
import {
  W01_FJORD_BRANCH, W01_FJORD_ROUTES, normalizeWarpFjordRecord, warpFjordWithinReach,
  type WarpFjordAction, type WarpFjordRecord,
} from "./warpFjordW01";
import { actWarpVillage, normalizeWarpVillage, type WarpVillageOrder, type WarpVillageRecord } from "./warpVillageR2M048";
import {
  evaluateChronicleAccess, getChronicleFunctions, getChronicleRank, migrateV35ClanChronicle, type ChronicleAccessContext, type ClanChronicle,
} from "./clanChronicle";
import { shipAcquisitionOwnedHullV89 } from "./shipAcquisitionV89";
import {
  advanceWarpCommonR2, normalizeWarpCommonR2, warpCommonViewR2, WARP_COMMON_PARTS_R2,
  type WarpCommonCommandR2, type WarpCommonRecordR2,
} from "./warpCommonRouteR2";

export const WARP_EPOCHS_V165_VERSION = 1 as const;

// ---------------------------------------------------------------------------
// Données de source
// ---------------------------------------------------------------------------

/** Identifiant de la branche 2204, repris de la PR #163 (sauvegardes `tantalusV164`). */
export const WARP_TANTALUS_BRANCH_ID_V165 = "warp-tantalus-2204" as const;
export type WarpBranchIdV165 = "W-01" | "W-02" | "W-03" | "W-04" | "W-05" | "W-GB" | typeof WARP_TANTALUS_BRANCH_ID_V165;
export const WARP_BRANCH_IDS_V165: readonly WarpBranchIdV165[] = ["W-01", "W-02", "W-03", "W-04", "W-05", "W-GB", WARP_TANTALUS_BRANCH_ID_V165];

export interface WarpCanonHeroV165 {
  id: string;
  name: string;
  year: number;
  /** Règle canon de la bible : le joueur peut les croiser, pas les tuer. */
  killable: false;
}
export interface WarpBranchV165 {
  id: WarpBranchIdV165;
  label: string;
  /** Cadre canon tel qu'écrit dans la bible (L-10). */
  canonFrame: string;
  /** Scène proposée par la bible (colonne « Scène proposée »). */
  proposedScene: string;
  year: number | null;
  canonHeroes: readonly WarpCanonHeroV165[];
  /** Une reconnaissance suffit à ouvrir la branche. L’arc complet est suivi à part. */
  status: "jouable" | "non-implemente";
}

export const WARP_BRANCHES_V165: readonly WarpBranchV165[] = [
  { id: "W-01", label: "Scandinavie viking, 841", canonFrame: "Scandinavie viking, 841 (Killer of Killers)", proposedScene: "fjord en hiver, chasse d'un guerrier champion", year: 841,
    canonHeroes: [{ id: "ursa", name: "Ursa", year: 841, killable: false }], status: "jouable" },
  { id: "W-02", label: "Japon féodal, 1629", canonFrame: "Japon féodal, 1629 (duel des frères en 1609) (Killer of Killers)", proposedScene: "château de nuit, duel au sabre", year: 1629,
    canonHeroes: [{ id: "kenji", name: "Kenji", year: 1629, killable: false }], status: "jouable" },
  { id: "W-03", label: "1715", canonFrame: "1715 (pistolet de Predator 2)", proposedScene: "navire et port, trophée d'un capitaine", year: 1715,
    canonHeroes: [], status: "non-implemente" },
  { id: "W-04", label: "Grandes Plaines, 1719", canonFrame: "Grandes Plaines, 1719 (Prey)", proposedScene: "plaine et forêt, chasse sans technologie lourde", year: 1719,
    canonHeroes: [{ id: "naru", name: "Naru", year: 1719, killable: false }], status: "non-implemente" },
  { id: "W-05", label: "1942", canonFrame: "1942 (Killer of Killers)", proposedScene: "ciel et terrain de bataille aérienne", year: 1942,
    canonHeroes: [{ id: "torres", name: "Torres", year: 1942, killable: false }], status: "non-implemente" },
  { id: "W-GB", label: "XVIIIe siècle, piste de Greyback", canonFrame: "Greyback sur Terre au XVIIIe siècle contre des pirates (bio NECA, résumée par la bible)", proposedScene: "branche sur la piste de Greyback et des pirates", year: null,
    canonHeroes: [], status: "non-implemente" },
  // Exception du 20 novembre 2026 : seule destination future du Warp. Le
  // classeur V6 n'a pas d'époque 2204 ; le cadre vient de la section
  // « Crossover : USS Tantalus » de la bible (mission annexe proposée).
  { id: WARP_TANTALUS_BRANCH_ID_V165, label: "Tantalus Reach, 2204", canonFrame: "2204, Tantalus Reach, station Asphodèle (crossover USS Tantalus) — exception : époque future, absente du classeur V6", proposedScene: "« Le silence d'Asphodèle » : abordage de la station, sort de l'Echo-8", year: 2204,
    canonHeroes: [], status: "jouable" },
];
export const WARP_CANON_HERO_IDS_V165: readonly string[] = WARP_BRANCHES_V165.flatMap(branch => branch.canonHeroes.map(hero => hero.id));

/** Arc du prototype volé (bible, « La storyline (proposée) »). Données seulement. */
export const WARP_PROTOTYPE_ARC_V165 = {
  status: "non-implemente" as const,
  source: "Bible : « Warp gate d'après le lore NECA ». Le texte des bios NECA n'est pas dans le dépôt ; seuls les résumés de la bible sont repris.",
  figures: [
    { id: "armored-lost", name: "Armored Lost", role: "Entraîné par ruse dans le vol ; allié méfiant possible (voie Enforcer, en plaidant sa cause)." },
    { id: "spiked-tail", name: "Spiked Tail", role: "Chef de la Rogue Space Tribe ; antagoniste de l'arc (décision du 6 novembre)." },
    { id: "lasershot", name: "Lasershot", role: "Bad Blood obsédé par la technologie, en partie cybernétique ; antagoniste de l'arc." },
  ],
  routes: [
    { id: "enforcer", label: "Voie Enforcer : récupérer le module sur le prototype avec l'accord du conseil." },
    { id: "bad-blood", label: "Voie Bad Blood : utiliser le module volé ; chaque portail attire les Enforcers ; trahison finale (proposé)." },
  ],
  endings: ["prototype détruit", "prototype rendu au conseil", "prototype gardé par le clan"],
} as const;

export type WarpComponentIdV165 = "stabilisateur" | "repere-retour" | "interface-navigation";
export const WARP_COMPONENTS_V165: readonly { id: WarpComponentIdV165; label: string }[] = [
  { id: "stabilisateur", label: "Stabilisateur" },
  { id: "repere-retour", label: "Repère de retour" },
  { id: "interface-navigation", label: "Interface de navigation" },
];

export const WARP_W02_BONSHO_V165 = "/game/warp-universe/20261109-p1/193_japon_cloche_bonsho.png";
export const WARP_W02_TERRACE_ALERT_V165 = "terrasse-clochettes";

export type WarpW02StepIdV165 = "WARP-M16" | "WARP-M17" | "WARP-M18";
export interface WarpStepChoiceV165 { id: string; label: string; effect: string }
export interface WarpStepV165 {
  id: WarpW02StepIdV165;
  title: string;
  scene: string;
  choices: readonly WarpStepChoiceV165[];
}
/** Mini-arc W-02 : fiches V6 WARP-M16 → M18 (époque WARP-E06, « Japon médiéval
 * inspiré »). Leur rattachement à W-02 = 1629 est proposé. */
export const WARP_W02_STEPS_V165: readonly WarpStepV165[] = [
  { id: "WARP-M16", title: "Les clochettes de la terrasse",
    scene: "Des clochettes signalent les passages entre terrasses. Observe leur mouvement, traverse les bambous et suis une proie qui évite les chemins fréquentés. Un guetteur voit seulement certaines portions du trajet.",
    choices: [
      { id: "contourner", label: "Contourner les signaux", effect: "Les habitants ignorent ton passage." },
      { id: "declencher", label: "Faire sonner la cloche pour détourner le guetteur", effect: "Le guetteur quitte la terrasse. Il rejoint le camp où se trouve la lame." },
    ] },
  { id: "WARP-M17", title: "Un duel accepté",
    scene: "Un combattant local équipé attend dans une cour ouverte. Les gestes fixent un début et une interruption possibles. Kenji, héros du film, n'est pas ce combattant et n'est jamais une cible.",
    choices: [
      { id: "affronter", label: "Accepter le duel (chasse complète)", effect: "Le duel se joue dans la chasse complète ; son issue réelle résout l'étape." },
      { id: "hauteurs", label: "Signaler une autre proie et poursuivre par les hauteurs", effect: "Étape close sans duel ; aucun trophée de duel." },
    ] },
  { id: "WARP-M18", title: "La lame qui reste",
    scene: "Une arme locale demeure au sol. Distingue objet abandonné, prêté ou encore réclamé, puis prépare ton retour au seuil.",
    choices: [
      { id: "rendre", label: "Replacer l'arme sur un support visible", effect: "L'arme rendue ne reste pas dans l'inventaire." },
      { id: "accepter-don", label: "Accepter le don explicitement proposé", effect: "L'arme part avec toi ; sa provenance garde la décision réelle." },
      { id: "depot", label: "Laisser l'arme au dépôt (propriétaire absent)", effect: "Aucun transfert de propriété." },
    ] },
];

/** Contrats rejouables d'après la bible (3e forme). Aucun n'est implémenté. */
export const WARP_W02_CONTRACTS_V165 = [
  { id: "w02-contrat-procedural", label: "Chasses procédurales de l'époque 1629", status: "non-implemente" as const,
    note: "La bible prévoit des chasses procédurales une fois l'époque terminée ; aucun générateur n'existe encore." },
] as const;

// ---------------------------------------------------------------------------
// État sauvegardé (STATE5-25 → STATE5-30)
// ---------------------------------------------------------------------------

export type WarpQuestOutcomeV165 = "non_commence" | "en_cours" | "reussi" | "echoue";
export type WarpReturnReservationV165 = "inactive" | "reservee" | "utilisee";
export interface WarpStepRecordV165 { resolved: boolean; success: boolean; choice: string }
export interface WarpTrophyV165 {
  id: string;
  name: string;
  branchId: WarpBranchIdV165;
  year: number | null;
  ownerCreatedAt: string;
  container: "vaisseau";
  circumstances: string;
}
/** Choix d'honneur de la branche 2204 (bible, « Crossover : USS Tantalus »). */
export type WarpTantalusEcho8ChoiceV165 = "emporte" | "marque";
export interface WarpTantalusEcho8V165 { choice: WarpTantalusEcho8ChoiceV165; tripId: string }
export interface WarpBranchVisitV165 {
  visits: number;
  steps: Partial<Record<WarpW02StepIdV165, WarpStepRecordV165>>;
  alertedPassages: string[];
  /** Morts de la branche ; jamais réinitialisés (W3-WARP06, STATE5-30). */
  deadIds: string[];
  /** Objets uniques prélevés ; un original ne se multiplie pas (WARP-R09). */
  takenObjectIds: string[];
  localKills: number;
  huntRuns: number;
  huntSuccess: boolean;
  trophy: WarpTrophyV165 | null;
  epochCompleted: boolean;
  /** V167, branche 2204 seulement : sort de l'Echo-8, décidé une fois et conservé (STATE5-30). Absent ailleurs. */
  echo8?: WarpTantalusEcho8V165;
  r2M048?: WarpVillageRecord;
  /** Première reconnaissance W-01, archivée seulement après le retour à pied. */
  fjordW01?: WarpFjordRecord;
}
export interface WarpEchoV165 { id: string; fromBranchId: WarpBranchIdV165; toBranchId: WarpBranchIdV165; text: string; effect: string }
export type WarpSurveyR2 = { tripId: string; stage: "marker" | "complete"; nicheVisited: boolean };
export type WarpSurveyActionR2 = { kind: "marker" | "niche" | "return"; at: number };
export interface WarpEpochsStateV165 {
  version: 1;
  ownerCreatedAt: string;
  /** STATE5-25 */
  warpQuestOutcome: WarpQuestOutcomeV165;
  questStartChoice: "stabilite" | "energie" | null;
  components: Partial<Record<WarpComponentIdV165, "reparer" | "variante">>;
  installChoice: "marge" | "fenetre-courte" | null;
  /** STATE5-26 */
  warpModuleInstalled: boolean;
  /** STATE5-27 */
  warpBranchId: WarpBranchIdV165 | null;
  /** STATE5-28 */
  activeWarpTripId: string | null;
  activeTripBranchId: WarpBranchIdV165 | null;
  /** STATE5-29 */
  warpReturnReservation: WarpReturnReservationV165;
  tripCount: number;
  /** STATE5-30 */
  branchVisitState: Partial<Record<WarpBranchIdV165, WarpBranchVisitV165>>;
  echoes: WarpEchoV165[];
  /** Événements consommés : un même événement ne s'applique pas deux fois. */
  consumedEventIds: string[];
  commonRouteR2?: WarpCommonRecordR2;
  firstSurveyR2?: WarpSurveyR2;
}

export function createWarpEpochsV165(ownerCreatedAt: string): WarpEpochsStateV165 {
  return {
    version: WARP_EPOCHS_V165_VERSION, ownerCreatedAt,
    warpQuestOutcome: "non_commence", questStartChoice: null, components: {}, installChoice: null,
    warpModuleInstalled: false, warpBranchId: null, activeWarpTripId: null, activeTripBranchId: null,
    warpReturnReservation: "inactive", tripCount: 0, branchVisitState: {}, echoes: [], consumedEventIds: [],
  };
}
export function emptyBranchVisitV165(): WarpBranchVisitV165 {
  return { visits: 0, steps: {}, alertedPassages: [], deadIds: [], takenObjectIds: [], localKills: 0,
    huntRuns: 0, huntSuccess: false, trophy: null, epochCompleted: false };
}
export function branchVisitV165(state: WarpEpochsStateV165, branchId: WarpBranchIdV165): WarpBranchVisitV165 {
  return state.branchVisitState[branchId] ?? emptyBranchVisitV165();
}

// ---------------------------------------------------------------------------
// Validation et migration additive
// ---------------------------------------------------------------------------

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const safeId = (value: unknown, max = 120): value is string =>
  typeof value === "string" && value.length > 0 && value.length <= max && /^[A-Za-z0-9][A-Za-z0-9:._-]*$/.test(value);
const count = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0 && value <= 1_000_000;
const branchId = (value: unknown): value is WarpBranchIdV165 => WARP_BRANCH_IDS_V165.includes(value as WarpBranchIdV165);
const idList = (value: unknown, max = 400): string[] | null =>
  Array.isArray(value) && value.length <= max && value.every(item => safeId(item)) && new Set(value).size === value.length ? [...value] as string[] : null;
const oneOf = <T extends string>(value: unknown, allowed: readonly T[]): value is T => allowed.includes(value as T);

function normalizeVisit(value: unknown, id: WarpBranchIdV165): WarpBranchVisitV165 | null {
  if (!record(value) || !count(value.visits) || !count(value.localKills) || !count(value.huntRuns) ||
      typeof value.huntSuccess !== "boolean" || typeof value.epochCompleted !== "boolean" || !record(value.steps)) return null;
  const alertedPassages = idList(value.alertedPassages), deadIds = idList(value.deadIds), takenObjectIds = idList(value.takenObjectIds);
  if (!alertedPassages || !deadIds || !takenObjectIds) return null;
  // Un héros canon ne peut figurer parmi les morts d'une branche.
  if (deadIds.some(id => WARP_CANON_HERO_IDS_V165.includes(id))) return null;
  const steps: WarpBranchVisitV165["steps"] = {};
  for (const [key, raw] of Object.entries(value.steps)) {
    const step = WARP_W02_STEPS_V165.find(entry => entry.id === key);
    if (!step || !record(raw) || typeof raw.resolved !== "boolean" || typeof raw.success !== "boolean" ||
        !step.choices.some(choice => choice.id === raw.choice)) return null;
    steps[step.id] = { resolved: raw.resolved, success: raw.success, choice: raw.choice as string };
  }
  let trophy: WarpTrophyV165 | null = null;
  if (value.trophy !== null) {
    const t = value.trophy;
    if (!record(t) || !safeId(t.id) || typeof t.name !== "string" || t.name.length > 120 || !branchId(t.branchId) ||
        !(t.year === null || count(t.year)) || typeof t.ownerCreatedAt !== "string" || t.container !== "vaisseau" ||
        typeof t.circumstances !== "string" || t.circumstances.length > 400) return null;
    trophy = { id: t.id, name: t.name, branchId: t.branchId, year: t.year as number | null, ownerCreatedAt: t.ownerCreatedAt, container: "vaisseau", circumstances: t.circumstances };
  }
  let echo8: WarpTantalusEcho8V165 | undefined;
  if (value.echo8 !== undefined) {
    const e = value.echo8;
    if (id !== WARP_TANTALUS_BRANCH_ID_V165 || !record(e) || Object.keys(e).length !== 2 ||
        (e.choice !== "emporte" && e.choice !== "marque") || !safeId(e.tripId)) return null;
    echo8 = { choice: e.choice, tripId: e.tripId };
  }
  let r2M048: WarpVillageRecord | null = null;
  if (Object.hasOwn(value, "r2M048")) {
    if (id !== "W-02" || value.visits < 1) return null;
    r2M048 = normalizeWarpVillage(value.r2M048);
    if (!r2M048) return null;
  }
  let fjordW01: WarpFjordRecord | null = null;
  if (Object.hasOwn(value, "fjordW01")) {
    if (id !== W01_FJORD_BRANCH || value.visits < 1) return null;
    fjordW01 = normalizeWarpFjordRecord(value.fjordW01);
    if (!fjordW01) return null;
  }
  return { visits: value.visits, steps, alertedPassages, deadIds, takenObjectIds, localKills: value.localKills,
    huntRuns: value.huntRuns, huntSuccess: value.huntSuccess, trophy, epochCompleted: value.epochCompleted,
    ...(echo8 ? { echo8 } : {}), ...(r2M048 ? { r2M048 } : {}), ...(fjordW01 ? { fjordW01 } : {}) };
}

/** Renvoie l'état normalisé, ou null si la forme est invalide ou d'une autre campagne. */
export function normalizeWarpEpochsV165(value: unknown, ownerCreatedAt: string): WarpEpochsStateV165 | null {
  if (!record(value) || value.version !== WARP_EPOCHS_V165_VERSION || value.ownerCreatedAt !== ownerCreatedAt) return null;
  if (!oneOf(value.warpQuestOutcome, ["non_commence", "en_cours", "reussi", "echoue"] as const) ||
      !(value.questStartChoice === null || oneOf(value.questStartChoice, ["stabilite", "energie"] as const)) ||
      !(value.installChoice === null || oneOf(value.installChoice, ["marge", "fenetre-courte"] as const)) ||
      typeof value.warpModuleInstalled !== "boolean" ||
      !(value.warpBranchId === null || branchId(value.warpBranchId)) ||
      !(value.activeWarpTripId === null || safeId(value.activeWarpTripId)) ||
      !(value.activeTripBranchId === null || branchId(value.activeTripBranchId)) ||
      !oneOf(value.warpReturnReservation, ["inactive", "reservee", "utilisee"] as const) ||
      !count(value.tripCount) || !record(value.components) || !record(value.branchVisitState) || !Array.isArray(value.echoes)) return null;
  const consumedEventIds = idList(value.consumedEventIds, 2000);
  if (!consumedEventIds) return null;
  const components: WarpEpochsStateV165["components"] = {};
  for (const [key, raw] of Object.entries(value.components)) {
    if (!WARP_COMPONENTS_V165.some(c => c.id === key) || !oneOf(raw, ["reparer", "variante"] as const)) return null;
    components[key as WarpComponentIdV165] = raw;
  }
  const branchVisitState: WarpEpochsStateV165["branchVisitState"] = {};
  for (const [key, raw] of Object.entries(value.branchVisitState)) {
    const visit = branchId(key) ? normalizeVisit(raw, key) : null;
    if (!visit) return null;
    branchVisitState[key as WarpBranchIdV165] = visit;
  }
  const historicalOrders = branchVisitState["W-02"]?.r2M048?.orders ?? [];
  const historicalEvents = consumedEventIds.filter(id => id.startsWith("W-02:R2-M048:"));
  if (historicalEvents.length !== historicalOrders.length ||
      !historicalOrders.every((id, index) => historicalEvents[index] === `W-02:R2-M048:${index}:${id}`)) return null;
  if (historicalOrders.length > 0 && (!value.warpModuleInstalled || value.tripCount < (branchVisitState["W-02"]?.visits ?? 0))) return null;
  const echoes: WarpEchoV165[] = [];
  for (const raw of value.echoes) {
    if (!record(raw) || !safeId(raw.id) || !branchId(raw.fromBranchId) || !branchId(raw.toBranchId) ||
        typeof raw.text !== "string" || raw.text.length > 400 || typeof raw.effect !== "string" || raw.effect.length > 400) return null;
    echoes.push({ id: raw.id, fromBranchId: raw.fromBranchId, toBranchId: raw.toBranchId, text: raw.text, effect: raw.effect });
  }
  // Cohérence : un voyage actif a toujours un retour réservé, et inversement.
  const tripActive = value.activeWarpTripId !== null;
  if (tripActive !== (value.warpReturnReservation === "reservee") || tripActive !== (value.activeTripBranchId !== null)) return null;
  if (value.warpModuleInstalled && value.warpQuestOutcome !== "reussi") return null;
  const fjord = branchVisitState[W01_FJORD_BRANCH]?.fjordW01;
  if (fjord) {
    const prefix = "trip:" + fjord.tripId;
    const depart = consumedEventIds.indexOf(prefix + ":depart");
    const observe = consumedEventIds.indexOf(prefix + ":w01-observe-" + fjord.route);
    const otherRoute = fjord.route === "quai" ? "falaise" : "quai";
    const returned = consumedEventIds.indexOf(prefix + ":return");
    const report = consumedEventIds.indexOf(prefix + ":w01-report");
    if (!value.warpModuleInstalled || Number(fjord.tripId.slice(10)) > value.tripCount ||
        depart < 0 || observe <= depart || consumedEventIds.includes(prefix + ":w01-observe-" + otherRoute)) return null;
    if (fjord.returned) {
      if (returned <= observe || report <= returned || value.activeWarpTripId === fjord.tripId) return null;
    } else if (returned !== -1 || report !== -1 || value.activeWarpTripId !== fjord.tripId ||
        value.activeTripBranchId !== W01_FJORD_BRANCH) return null;
  }
  const fjordReports = consumedEventIds.filter(id => /:w01-report$/.test(id));
  if (fjordReports.length !== (fjord?.returned ? 1 : 0)) return null;
  const commonRouteR2 = value.commonRouteR2 === undefined ? undefined : normalizeWarpCommonR2(value.commonRouteR2, ownerCreatedAt);
  if (commonRouteR2 === null) return null;
  if (commonRouteR2) {
    const played = warpCommonViewR2(commonRouteR2);
    const intended = played.installed ? "reussi" : played.survey ? "en_cours" : "non_commence";
    if (intended !== value.warpQuestOutcome || played.survey !== value.questStartChoice ||
        played.installed !== value.installChoice || !!played.installed !== value.warpModuleInstalled ||
        WARP_COMMON_PARTS_R2.some(part => components[part.id] !== (played.hauled ? played.parts[part.id]?.method : undefined)) ||
        consumedEventIds.includes("quest:R2-M030") !== !!played.survey ||
        consumedEventIds.includes("quest:R2-M032") !== !!played.installed ||
        WARP_COMMON_PARTS_R2.some(part => consumedEventIds.includes("quest:R2-M031:" + part.id) !== played.hauled)) return null;
  }
  let firstSurveyR2: WarpSurveyR2 | undefined;
  const survey = value.firstSurveyR2;
  if (survey !== undefined) {
    if (!record(survey) || Object.keys(survey).length !== 3 ||
        typeof survey.tripId !== "string" || !/^warp-trip-[1-9]\d*$/.test(survey.tripId) ||
        Number(survey.tripId.slice(10)) > value.tripCount ||
        (survey.stage !== "marker" && survey.stage !== "complete") || typeof survey.nicheVisited !== "boolean" ||
        !value.warpModuleInstalled || !branchVisitState["W-02"]?.visits ||
        !consumedEventIds.includes("trip:" + survey.tripId + ":depart") ||
        !consumedEventIds.includes("trip:" + survey.tripId + ":m033-marker") ||
        consumedEventIds.includes("trip:" + survey.tripId + ":m033-niche") !== survey.nicheVisited) return null;
    const ended = consumedEventIds.includes("trip:" + survey.tripId + ":return");
    const reported = consumedEventIds.includes("trip:" + survey.tripId + ":m033-report");
    if (survey.stage === "marker" ? ended || reported || value.activeWarpTripId !== survey.tripId ||
        value.activeTripBranchId !== "W-02" : !ended || !reported || value.activeWarpTripId === survey.tripId) return null;
    firstSurveyR2 = { tripId: survey.tripId, stage: survey.stage, nicheVisited: survey.nicheVisited };
  }
  return {
    version: WARP_EPOCHS_V165_VERSION, ownerCreatedAt,
    warpQuestOutcome: value.warpQuestOutcome, questStartChoice: value.questStartChoice as WarpEpochsStateV165["questStartChoice"],
    components, installChoice: value.installChoice as WarpEpochsStateV165["installChoice"],
    warpModuleInstalled: value.warpModuleInstalled, warpBranchId: value.warpBranchId as WarpBranchIdV165 | null,
    activeWarpTripId: value.activeWarpTripId as string | null, activeTripBranchId: value.activeTripBranchId as WarpBranchIdV165 | null,
    warpReturnReservation: value.warpReturnReservation, tripCount: value.tripCount,
    branchVisitState, echoes, consumedEventIds, ...(commonRouteR2 ? { commonRouteR2 } : {}),
    ...(firstSurveyR2 ? { firstSurveyR2 } : {}),
  };
}

export type WarpEpochsInspectionV165 =
  | { status: "absent"; state: null }
  | { status: "valid"; state: WarpEpochsStateV165 }
  | { status: "future-version" | "invalid-save"; state: null };
/** Une version future est refusée sans effacer les octets du joueur. */
export function inspectWarpEpochsV165(value: unknown, ownerCreatedAt: string): WarpEpochsInspectionV165 {
  if (value === undefined || value === null) return { status: "absent", state: null };
  if (record(value) && typeof value.version === "number" && value.version > WARP_EPOCHS_V165_VERSION) return { status: "future-version", state: null };
  if (record(value) && record(value.commonRouteR2) && typeof value.commonRouteR2.version === "number" &&
      value.commonRouteR2.version > 1) return { status: "future-version", state: null };
  const state = normalizeWarpEpochsV165(value, ownerCreatedAt);
  return state ? { status: "valid", state } : { status: "invalid-save", state: null };
}

// ---------------------------------------------------------------------------
// Conditions d'accès (WARP-R01, W3-WARP01) — réutilisables
// ---------------------------------------------------------------------------

export interface WarpAccessContextV165 {
  blooded: boolean;
  personalShip: boolean;
  /** Fonction Adjutant actuelle du joueur. */
  adjutant: boolean;
}
type ChronicleSaveSource = { prologue?: { chronicle?: ClanChronicle | null } | null } & Record<string, unknown>;
/** Lit la chronique existante (rang, rite Adjutant) et la disponibilité réelle du vaisseau. */
export function warpAccessContextFromSaveV165(save: unknown, ship: ChronicleAccessContext): WarpAccessContextV165 {
  const source = (record(save) ? save : {}) as ChronicleSaveSource;
  const chronicle = source.prologue?.chronicle ?? migrateV35ClanChronicle(save);
  const blooded = evaluateChronicleAccess(chronicle, "personal-ship-acquisition").allowed;
  const ownedHull = typeof source.createdAt === "string"
    ? shipAcquisitionOwnedHullV89(source.shipAcquisitionV89, source.createdAt)
    : null;
  return {
    blooded,
    personalShip: ship?.personalShipAvailable === true || ownedHull !== null,
    adjutant: getChronicleFunctions(chronicle).includes("adjutant"),
  };
}

export interface WarpRequirementV165 { id: string; label: string; where: string }
export interface WarpEvaluationV165 { allowed: boolean; missing: WarpRequirementV165[] }

/** Les cinq conditions de départ ; chacune indique où la compléter. */
export function warpConditionsV165(state: WarpEpochsStateV165 | null, ctx: WarpAccessContextV165): WarpRequirementV165[] {
  const missing: WarpRequirementV165[] = [];
  if (!ctx.blooded) missing.push({ id: "blooded", label: "Rang Blooded", where: "Rite du Temple des Trois Ombres (chronique)" });
  if (!ctx.personalShip) missing.push({ id: "ship", label: "Vaisseau personnel réellement possédé", where: "Chantier naval" });
  if (!ctx.adjutant) missing.push({ id: "adjutant", label: "Fonction Adjutant du joueur", where: "Nomination comme second de chasse (chronique)" });
  if (state?.warpQuestOutcome !== "reussi") missing.push({ id: "quest", label: "Quête commune du Warp réussie (STATE5-25)", where: "R2-M030 → R2-M032, ci-dessous" });
  if (state?.warpModuleInstalled !== true) missing.push({ id: "module", label: "Module installé dans le vaisseau (STATE5-26)", where: "R2-M032, ci-dessous" });
  return missing;
}

export function evaluateWarpDepartureV165(state: WarpEpochsStateV165 | null, ctx: WarpAccessContextV165): WarpEvaluationV165 {
  const missing = warpConditionsV165(state, ctx);
  if (state?.activeWarpTripId) missing.push({ id: "trip-active", label: "Un voyage est déjà engagé", where: "Revenir par le retour réservé" });
  const branch = WARP_BRANCHES_V165.find(entry => entry.id === state?.warpBranchId);
  if (!branch) missing.push({ id: "branch", label: "Choisir une branche (STATE5-27)", where: "Carte des branches" });
  else if (branch.status !== "jouable") missing.push({ id: "branch-not-implemented", label: `${branch.id} n'est pas encore implémentée`, where: "Choisir W-01, W-02 ou 2204" });
  return { allowed: missing.length === 0, missing };
}

// ---------------------------------------------------------------------------
// Transitions
// ---------------------------------------------------------------------------

export interface WarpUpdateV165 { accepted: boolean; changed: boolean; state: WarpEpochsStateV165; message: string }
const refuse = (state: WarpEpochsStateV165, message: string): WarpUpdateV165 => ({ accepted: false, changed: false, state, message });
const consumed = (state: WarpEpochsStateV165, eventId: string) => state.consumedEventIds.includes(eventId);
function commit(state: WarpEpochsStateV165, eventId: string, next: Omit<WarpEpochsStateV165, "consumedEventIds">, message: string): WarpUpdateV165 {
  if (consumed(state, eventId)) return { accepted: true, changed: false, state, message: "Événement déjà appliqué." };
  return { accepted: true, changed: true, state: { ...next, consumedEventIds: [...state.consumedEventIds, eventId] }, message };
}
function withVisit(state: WarpEpochsStateV165, id: WarpBranchIdV165, update: (visit: WarpBranchVisitV165) => WarpBranchVisitV165) {
  return { ...state.branchVisitState, [id]: update(branchVisitV165(state, id)) };
}

/** R2-M030 — Entrée : Adjutant actif, vaisseau possédé. */
export function startWarpCommonQuestV165(state: WarpEpochsStateV165, ctx: WarpAccessContextV165, choice: "stabilite" | "energie"): WarpUpdateV165 {
  if (state.warpQuestOutcome !== "non_commence") return refuse(state, "La quête commune est déjà commencée.");
  if (!ctx.adjutant || !ctx.personalShip) return refuse(state, "Le seuil du Warp demande la fonction Adjutant et un vaisseau possédé.");
  if (!oneOf(choice, ["stabilite", "energie"] as const)) return refuse(state, "Choix inconnu.");
  return commit(state, "quest:R2-M030", { ...state, warpQuestOutcome: "en_cours", questStartChoice: choice },
    "Observatoire des Seuils atteint ; dispositif de passage retrouvé.");
}

/** R2-M031 — chaque pièce est testée avant transport. */
export function verifyWarpComponentV165(state: WarpEpochsStateV165, component: WarpComponentIdV165, choice: "reparer" | "variante"): WarpUpdateV165 {
  if (state.warpQuestOutcome !== "en_cours") return refuse(state, "Commence d'abord le seuil du Warp (R2-M030).");
  if (!WARP_COMPONENTS_V165.some(c => c.id === component) || !oneOf(choice, ["reparer", "variante"] as const)) return refuse(state, "Pièce ou choix inconnu.");
  if (state.components[component]) return { accepted: true, changed: false, state, message: "Pièce déjà testée." };
  return commit(state, `quest:R2-M031:${component}`, { ...state, components: { ...state.components, [component]: choice } },
    "Pièce testée et transportée.");
}

/** R2-M032 — l'installation matérielle, distincte de la possession des pièces. */
export function installWarpModuleV165(state: WarpEpochsStateV165, choice: "marge" | "fenetre-courte"): WarpUpdateV165 {
  if (state.warpQuestOutcome !== "en_cours") return refuse(state, "La quête commune n'est pas en cours.");
  if (!WARP_COMPONENTS_V165.every(c => state.components[c.id])) return refuse(state, "Les trois pièces doivent être testées avant l'installation.");
  if (!oneOf(choice, ["marge", "fenetre-courte"] as const)) return refuse(state, "Choix inconnu.");
  return commit(state, "quest:R2-M032", { ...state, installChoice: choice, warpModuleInstalled: true, warpQuestOutcome: "reussi" },
    "Module aligné et relié ; test de retour à vide réussi.");
}

/** New saves play the authored route. Existing component and reservation transitions remain authoritative. */
export function advanceWarpCommonRouteV165(
  state: WarpEpochsStateV165, ctx: WarpAccessContextV165, hullInstanceId: string | undefined, action: WarpCommonCommandR2,
): WarpUpdateV165 {
  if (!ctx.blooded || !ctx.adjutant || !ctx.personalShip || !hullInstanceId) {
    return refuse(state, "L’observatoire demande le rite Blooded, la fonction Adjutant et la coque acquise.");
  }
  if (state.activeWarpTripId || (!state.commonRouteR2 && state.warpQuestOutcome !== "non_commence")) {
    return refuse(state, "Un autre dossier de voyage est déjà ouvert.");
  }
  const accepted = advanceWarpCommonR2(state.commonRouteR2, state.ownerCreatedAt, hullInstanceId, action);
  if (!accepted.record || !accepted.view) return refuse(state, accepted.message);
  let next = state;
  if (action.kind === "survey") {
    const begun = startWarpCommonQuestV165(next, ctx, action.choice);
    if (!begun.changed) return refuse(state, begun.message);
    next = begun.state;
  }
  if (action.kind === "haul") {
    for (const part of WARP_COMMON_PARTS_R2) {
      const choice = accepted.view.parts[part.id]?.method;
      if (!choice) return refuse(state, "Vérifie toutes les pièces avant de les transporter.");
      const delivered = verifyWarpComponentV165(next, part.id, choice);
      if (!delivered.changed) return refuse(state, delivered.message);
      next = delivered.state;
    }
  }
  if (action.kind === "dry-return") {
    const installed = installWarpModuleV165(next, action.choice);
    if (!installed.changed) return refuse(state, installed.message);
    next = installed.state;
  }
  return { accepted: true, changed: true, state: { ...next, commonRouteR2: accepted.record }, message: accepted.message };
}

/** STATE5-27 — choix de destination ; pas de changement pendant un voyage. */
export function selectWarpBranchV165(state: WarpEpochsStateV165, id: WarpBranchIdV165): WarpUpdateV165 {
  const branch = WARP_BRANCHES_V165.find(entry => entry.id === id);
  if (!branch) return refuse(state, "Branche inconnue.");
  if (state.activeWarpTripId) return refuse(state, "Un voyage est engagé : reviens avant de changer de branche.");
  if (branch.status !== "jouable") return refuse(state, `${branch.id} (${branch.label}) n'est pas encore implémentée.`);
  if (state.warpBranchId === id) return { accepted: true, changed: false, state, message: "Branche déjà choisie." };
  return { accepted: true, changed: true, state: { ...state, warpBranchId: id }, message: `Destination : ${branch.id}, ${branch.label}.` };
}

/** STATE5-28/29 — le départ engage le voyage et réserve le retour. */
export function departWarpV165(state: WarpEpochsStateV165, ctx: WarpAccessContextV165): WarpUpdateV165 {
  const evaluation = evaluateWarpDepartureV165(state, ctx);
  if (!evaluation.allowed) return refuse(state, evaluation.missing.map(m => m.label).join(" · "));
  const target = state.warpBranchId!;
  const tripId = `warp-trip-${state.tripCount + 1}`;
  return commit(state, `trip:${tripId}:depart`, {
    ...state, tripCount: state.tripCount + 1, activeWarpTripId: tripId, activeTripBranchId: target, warpReturnReservation: "reservee",
    branchVisitState: withVisit(state, target, visit => ({ ...visit, visits: visit.visits + 1 })),
  }, `Voyage ${tripId} engagé vers ${target}. Retour réservé.`);
}

/** Le retour ne dépend que de la réservation (WARP-R05, W3-WARP02, STATE5-29). */
export function canReturnFromWarpV165(state: WarpEpochsStateV165 | null): boolean {
  return !!state?.activeWarpTripId && state.warpReturnReservation === "reservee";
}
export function returnFromWarpV165(state: WarpEpochsStateV165): WarpUpdateV165 {
  if (!canReturnFromWarpV165(state)) return refuse(state, "Aucun voyage engagé.");
  const next: WarpEpochsStateV165 = { ...state, activeWarpTripId: null, activeTripBranchId: null, warpReturnReservation: "utilisee" };
  if (next.firstSurveyR2?.stage === "marker") delete next.firstSurveyR2;
  const fjord = next.branchVisitState[W01_FJORD_BRANCH]?.fjordW01;
  if (state.activeTripBranchId === W01_FJORD_BRANCH && fjord && !fjord.returned) {
    next.branchVisitState = withVisit(next, W01_FJORD_BRANCH, visit => {
      const retreat = { ...visit };
      delete retreat.fjordW01;
      return retreat;
    });
  }
  return commit(state, `trip:${state.activeWarpTripId}:return`, next,
    "Retour par la fenêtre réservée. La branche garde son état.");
}

/** W-01 demande une observation puis un retour à pied dans le même voyage. */
export function advanceWarpFjordW01(state: WarpEpochsStateV165, action: WarpFjordAction): WarpUpdateV165 {
  const tripId = state.activeWarpTripId;
  const visit = branchVisitV165(state, W01_FJORD_BRANCH);
  const fjord = visit.fjordW01;
  if (!tripId || state.activeTripBranchId !== W01_FJORD_BRANCH || !canReturnFromWarpV165(state) || fjord?.returned) {
    return refuse(state, "La première reconnaissance demande un voyage engagé vers W-01.");
  }
  const prefix = "trip:" + tripId;
  if (action.kind === "observe") {
    const route = W01_FJORD_ROUTES[action.route];
    if (!route || !warpFjordWithinReach(action.at, route.checkpoint)) return refuse(state, "Approche du point d’observation.");
    if (fjord) return refuse(state, "Le relevé est prêt. Rejoins la caverne.");
    return commit(state, prefix + ":w01-observe-" + action.route, {
      ...state,
      branchVisitState: withVisit(state, W01_FJORD_BRANCH, previous => ({
        ...previous, fjordW01: { tripId, route: action.route, returned: false },
      })),
    }, "L’équipage et la piste du guerrier sont relevés. Reviens par la caverne.");
  }
  if (!fjord || fjord.tripId !== tripId || action.route !== "grotte" || !warpFjordWithinReach(action.at, 0)) {
    return refuse(state, "Reviens à l’ancre de la caverne avec ton relevé.");
  }
  const returned = returnFromWarpV165(state);
  if (!returned.changed) return returned;
  return commit(returned.state, prefix + ":w01-report", {
    ...returned.state,
    branchVisitState: withVisit(returned.state, W01_FJORD_BRANCH, previous => ({
      ...previous, fjordW01: { ...fjord, returned: true },
    })),
  }, "Retour par la fenêtre réservée. Le registre du vaisseau conserve ton relevé.");
}

export function isWarpFjordSuccessorW01(previous: WarpEpochsStateV165 | null | undefined, next: WarpEpochsStateV165 | null | undefined): boolean {
  const before = previous?.branchVisitState[W01_FJORD_BRANCH]?.fjordW01;
  const after = next?.branchVisitState[W01_FJORD_BRANCH]?.fjordW01;
  if (JSON.stringify(before ?? null) === JSON.stringify(after ?? null)) return true;
  const tripId = previous?.activeWarpTripId;
  if (!tripId || previous.activeTripBranchId !== W01_FJORD_BRANCH || !next || before?.returned ||
      !normalizeWarpEpochsV165(next, previous.ownerCreatedAt)) return false;
  if (!before) return !!after && !after.returned && after.tripId === tripId && next.activeWarpTripId === tripId;
  if (next.activeWarpTripId !== null || !next.consumedEventIds.includes("trip:" + tripId + ":return")) return false;
  return !after || (after.returned && after.tripId === before.tripId && after.route === before.route);
}

/** Short W-02 reconnaissance. The always-available emergency return grants no survey report. */
export function advanceWarpSurveyR2(state: WarpEpochsStateV165, action: WarpSurveyActionR2): WarpUpdateV165 {
  const tripId = state.activeWarpTripId;
  const survey = state.firstSurveyR2;
  if (!tripId || state.activeTripBranchId !== "W-02" || !canReturnFromWarpV165(state) ||
      !state.warpModuleInstalled || survey?.stage === "complete") {
    return refuse(state, "Le relevé se joue lors d’une traversée de reconnaissance W-02.");
  }
  const post = action.kind === "marker" ? 4 : action.kind === "niche" ? 11 : action.kind === "return" ? 0 : -2;
  if (!Number.isInteger(action.at) || action.at < 0 || action.at > 16 || Math.abs(action.at - post) > 1) {
    return refuse(state, "Approche du repère de terrain indiqué.");
  }
  const mark = "trip:" + tripId + ":m033-";
  if (action.kind === "marker" && !survey) return commit(state, mark + "marker",
    { ...state, firstSurveyR2: { tripId, stage: "marker", nicheVisited: false } }, "Le repère de terrain est fixé.");
  if (!survey || survey.tripId !== tripId) return refuse(state, "Pose d’abord le repère de terrain.");
  if (action.kind === "niche" && !survey.nicheVisited) return commit(state, mark + "niche",
    { ...state, firstSurveyR2: { ...survey, nicheVisited: true } }, "L’alcôve est notée au dos du repère.");
  if (action.kind !== "return") return refuse(state, "Ce point de la reconnaissance est déjà noté.");
  const returned = returnFromWarpV165({ ...state, firstSurveyR2: { ...survey, stage: "complete" } });
  if (!returned.changed) return refuse(state, returned.message);
  return commit(returned.state, mark + "report", returned.state, "Fenêtre franchie. Le compte rendu de reconnaissance est enregistré.");
}

export function isWarpSurveySuccessorR2(previous: WarpEpochsStateV165 | null | undefined, next: WarpEpochsStateV165 | null | undefined): boolean {
  const prior = previous?.firstSurveyR2;
  const survey = next?.firstSurveyR2;
  if (JSON.stringify(prior ?? null) === JSON.stringify(survey ?? null)) return true;
  if (!previous || !next || prior?.stage === "complete" || previous.activeTripBranchId !== "W-02") return false;
  if (!survey) return !!prior && next.activeWarpTripId === null && next.consumedEventIds.includes("trip:" + prior.tripId + ":return");
  if (survey.tripId !== previous.activeWarpTripId) return false;
  if (!prior) return survey.stage === "marker" && !survey.nicheVisited;
  if (survey.stage === "complete") return survey.nicheVisited === prior.nicheVisited;
  return next.activeWarpTripId === survey.tripId && !prior.nicheVisited && survey.nicheVisited;
}

function requireTripIn(state: WarpEpochsStateV165, id: WarpBranchIdV165): string | null {
  return state.activeWarpTripId && state.activeTripBranchId === id ? null : `Il faut un voyage engagé dans ${id}.`;
}

type WarpVillageCampaign = Pick<SaveGame, "createdAt" | "profile" | "prologue">;
export function warpVillageRankAllowed(save: WarpVillageCampaign): boolean {
  if (!save.prologue) return save.profile.rankId === "elite" || save.profile.rankId === "elder";
  if (save.prologue.status !== "completed") return false;
  const rank = getChronicleRank(save.prologue.chronicle);
  return rank === "elite" || rank === "elder" || rank === "ancient";
}

/** R2-M048 writes only the chosen branch and requires the real reserved trip. */
export function actWarpVillageV165(state: WarpEpochsStateV165, save: WarpVillageCampaign, order: WarpVillageOrder): WarpUpdateV165 {
  const current = normalizeWarpEpochsV165(state, save.createdAt);
  if (!current || !warpVillageRankAllowed(save) || !current.warpModuleInstalled ||
      !canReturnFromWarpV165(current) || requireTripIn(current, "W-02")) {
    return refuse(state, "Le hameau demande le rang Elite et un voyage engagé vers W-02.");
  }
  const visit = branchVisitV165(current, "W-02");
  if (visit.visits < 1 || !current.consumedEventIds.includes(`trip:${current.activeWarpTripId}:depart`) ||
      current.consumedEventIds.length >= 2000) return refuse(state, "Le relevé du voyage ne peut pas être confirmé.");
  const next = actWarpVillage(visit.r2M048, order);
  if (!next) return refuse(state, "Le relevé local attend l’étape indiquée.");
  return commit(current, `W-02:R2-M048:${next.orders.length - 1}:${order}`, {
    ...current, branchVisitState: withVisit(current, "W-02", previous => ({ ...previous, r2M048: next })),
  }, next.advancedBranchResolved ? "Le trajet du hameau est consigné dans W-02." : "Relevé du hameau enregistré.");
}

/** Résout une étape texte du mini-arc W-02. M17 « affronter » se résout par la chasse. */
export function resolveW02StepV165(state: WarpEpochsStateV165, stepId: WarpW02StepIdV165, choiceId: string): WarpUpdateV165 {
  const blocked = requireTripIn(state, "W-02");
  if (blocked) return refuse(state, blocked);
  const step = WARP_W02_STEPS_V165.find(entry => entry.id === stepId);
  const choice = step?.choices.find(entry => entry.id === choiceId);
  if (!step || !choice) return refuse(state, "Étape ou choix inconnu.");
  const visit = branchVisitV165(state, "W-02");
  if (visit.steps[stepId]?.resolved) return { accepted: true, changed: false, state, message: "Étape déjà résolue dans cette branche." };
  if (stepId === "WARP-M17" && !visit.steps["WARP-M16"]?.resolved) return refuse(state, "Résous d'abord « Les clochettes de la terrasse ».");
  if (stepId === "WARP-M18" && !visit.steps["WARP-M17"]?.resolved) return refuse(state, "Résous d'abord « Un duel accepté ».");
  if (stepId === "WARP-M17" && choiceId === "affronter") {
    // Le duel réel se joue dans la chasse complète ; l'étape reste ouverte.
    if (visit.steps["WARP-M17"]?.choice === "affronter") return { accepted: true, changed: false, state, message: "Duel déjà accepté : lance la chasse complète." };
    return { accepted: true, changed: true, message: "Duel accepté. Lance la chasse complète pour l'affronter.",
      state: { ...state, branchVisitState: withVisit(state, "W-02", v => ({ ...v, steps: { ...v.steps, "WARP-M17": { resolved: false, success: false, choice: "affronter" } } })) } };
  }
  if (stepId === "WARP-M18" && choiceId === "accepter-don" && !(visit.steps["WARP-M17"]?.choice === "affronter" && visit.huntSuccess))
    return refuse(state, "Aucun don n'est proposé : le duel n'a pas eu lieu ou n'a pas été remporté.");
  const objectId = "w02-lame-locale";
  if (stepId === "WARP-M18" && choiceId === "accepter-don" && visit.takenObjectIds.includes(objectId))
    return refuse(state, "Cet original a déjà quitté la branche.");
  return commit(state, `trip:${state.activeWarpTripId}:${stepId}`, {
    ...state,
    branchVisitState: withVisit(state, "W-02", v => ({
      ...v,
      steps: { ...v.steps, [stepId]: { resolved: true, success: true, choice: choiceId } },
      alertedPassages: stepId === "WARP-M16" && choiceId === "declencher" && !v.alertedPassages.includes(WARP_W02_TERRACE_ALERT_V165)
        ? [...v.alertedPassages, WARP_W02_TERRACE_ALERT_V165] : v.alertedPassages,
      takenObjectIds: stepId === "WARP-M18" && choiceId === "accepter-don" ? [...v.takenObjectIds, objectId] : v.takenObjectIds,
      epochCompleted: v.epochCompleted || (stepId === "WARP-M18" && v.huntSuccess),
    })),
  }, choice.effect);
}

/** Les héros canon ne figurent jamais parmi les morts d'une branche. */
export function recordBranchDeathV165(state: WarpEpochsStateV165, id: WarpBranchIdV165, personId: string): WarpUpdateV165 {
  if (WARP_CANON_HERO_IDS_V165.includes(personId)) return refuse(state, "Héros canon intouchable : le canon le fait survivre.");
  if (!safeId(personId)) return refuse(state, "Identité invalide.");
  if (branchVisitV165(state, id).deadIds.includes(personId)) return { accepted: true, changed: false, state, message: "Déjà mort dans cette branche." };
  return { accepted: true, changed: true, message: "Mort enregistrée dans la branche.",
    state: { ...state, branchVisitState: withVisit(state, id, v => ({ ...v, deadIds: [...v.deadIds, personId] })) } };
}

export const W02_CHAMPION_ID_V165 = "w02-champion-chateau";

export function canLaunchW02HuntV165(state: WarpEpochsStateV165 | null): { allowed: boolean; reason: string } {
  if (!state) return { allowed: false, reason: "Aucun dossier Warp." };
  const blocked = requireTripIn(state, "W-02");
  if (blocked) return { allowed: false, reason: blocked };
  const visit = branchVisitV165(state, "W-02");
  if (!visit.steps["WARP-M16"]?.resolved) return { allowed: false, reason: "Résous d'abord « Les clochettes de la terrasse »." };
  if (visit.deadIds.includes(W02_CHAMPION_ID_V165)) return { allowed: false, reason: "Le champion est mort dans cette branche ; la chasse complète est close." };
  return { allowed: true, reason: "" };
}

/** Applique une seule fois le résultat réel de HuntCanvas à la branche W-02.
 * Aucune écriture d'honneur, de rang, de trophée ou de statistique du présent. */
export function applyW02HuntResultV165(state: WarpEpochsStateV165, result: Pick<MissionResult, "outcome" | "completedObjectiveIds" | "kills" | "trophyClaims" | "completedAt">, aborted: boolean): WarpUpdateV165 {
  const launch = canLaunchW02HuntV165(state);
  if (!launch.allowed) return refuse(state, launch.reason);
  const visit = branchVisitV165(state, "W-02");
  const run = visit.huntRuns + 1;
  const success = !aborted && result.outcome === "success";
  const techLeft = !Array.isArray(result.completedObjectiveIds) || !result.completedObjectiveIds.includes("recover-transponder");
  const kills = count(result.kills) ? result.kills : 0;
  const branch = WARP_BRANCHES_V165.find(entry => entry.id === "W-02")!;
  const duelAccepted = visit.steps["WARP-M17"]?.choice === "affronter";
  const echoId = "echo-w02-lame-copiee";
  const addEcho = techLeft && !state.echoes.some(echo => echo.id === echoId);
  return commit(state, `trip:${state.activeWarpTripId}:hunt:${run}`, {
    ...state,
    echoes: addEcho ? [...state.echoes, { id: echoId, fromBranchId: "W-02", toBranchId: "W-03",
      text: "Un armurier japonais copie une lame de poignet abandonnée (exemple proposé par la bible).",
      effect: "La chasse de l'époque suivante (W-03) sera plus difficile : proies prévenues, pièges adaptés. W-03 n'est pas encore implémentée." }] : state.echoes,
    branchVisitState: withVisit(state, "W-02", v => ({
      ...v,
      huntRuns: run,
      localKills: v.localKills + kills,
      huntSuccess: v.huntSuccess || success,
      deadIds: success && !v.deadIds.includes(W02_CHAMPION_ID_V165) ? [...v.deadIds, W02_CHAMPION_ID_V165] : v.deadIds,
      trophy: v.trophy ?? (success && result.trophyClaims.length > 0 ? {
        id: "trophy-warp-w02-champion", name: "Mon du champion du château (proposé)", branchId: "W-02", year: branch.year,
        ownerCreatedAt: state.ownerCreatedAt, container: "vaisseau",
        circumstances: `Chasse personnelle dans la branche W-02 (1629), voyage ${state.activeWarpTripId}${duelAccepted ? ", duel accepté" : ""}. Pas une chronique de film.`,
      } : null),
      steps: duelAccepted && !v.steps["WARP-M17"]?.resolved
        ? { ...v.steps, "WARP-M17": { resolved: true, success, choice: "affronter" } } : v.steps,
      epochCompleted: v.epochCompleted || (success && !!v.steps["WARP-M18"]?.resolved),
    })),
  }, success ? "Champion vaincu dans la branche W-02." : aborted ? "Retrait : la chasse se clôt sans prise." : "Chasse échouée : aucun trophée.");
}

// ---------------------------------------------------------------------------
// Mission de chasse existante adaptée (Sang dans la canopée → W-02)
// ---------------------------------------------------------------------------

export const W02_HUNT_BASE_MISSION_ID_V165 = "jungle-vey" as const;

/** Adapte une chasse existante. Le guetteur détourné se replie au camp. */
export function warpW02HuntMissionV165(base: MissionDefinition, terraceAlerted = false): MissionDefinition {
  if (base.id !== W02_HUNT_BASE_MISSION_ID_V165) throw new Error("Mission de base inattendue pour W-02.");
  const label = (id: string, text: string, description: string) => {
    const objective = base.objectives.find(o => o.id === id);
    return objective ? { ...objective, label: text, description } : null;
  };
  const objectives = [
    label("scan-vanguard", "Étudier la garde du château", "Scanne trois signatures de la garde de nuit avant de t'approcher de la cour."),
    label("recover-transponder", "Reprendre la lame de poignet perdue", "Ne laisse aucune technologie dans la branche : une lame abandonnée produirait un écho (proposé)."),
    label("defeat-vey", "Affronter le champion du château", "Duel au sabre dans la cour. Kenji n'est pas ce champion et n'est jamais une cible."),
    label("extract-jungle-trophy", "Revenir au seuil", "Rejoins la fenêtre de retour réservée."),
  ].filter((o): o is NonNullable<typeof o> => o !== null);
  const attackLabels: Record<string, string> = { burst: "Tir d'arquebuse", area: "Feu révélateur", melee: "Coupe au sabre" };
  const enemyWaves = terraceAlerted ? base.enemyWaves.flatMap((wave): MissionDefinition["enemyWaves"] => {
    if (wave.id !== "jungle-patrol" || wave.count < 2) return [wave];
    return [
      { ...wave, count: wave.count - 1 },
      { ...wave, id: "w02-terrace-guard", trigger: "objective", triggerId: "recover-transponder", count: 1 },
    ];
  }) : base.enemyWaves;
  return {
    ...base,
    title: "W-02 · Le champion du château",
    subtitle: "Japon féodal, 1629 — branche Warp (chasse proposée)",
    planetName: "Terre · branche W-02 (1629)",
    targetName: "Champion du château",
    briefing: "Branche W-02, 1629. Traverse le col des cèdres de nuit pour rejoindre la cour où t’attend le champion du château. Les héros canon restent intouchables.",
    presentation: {
      backgroundPath: "/game/warp/w02/cedar-pass-1629.webp",
      backgroundLayout: "single",
      revealAnnouncement: "Le feu de la garde révèle ta silhouette.",
    },
    debrief: {
      success: "Le champion est tombé dans la branche W-02. Sa mort reste inscrite dans cette branche ; le présent n'en reçoit ni honneur ni rang.",
      failureHint: "Étudie la garde, reprends la lame de poignet, puis affronte le champion.",
      nextLead: "Retour par la fenêtre réservée.",
    },
    prerequisiteMissionId: null,
    baseRewards: { ...base.baseRewards, honor: 0, clanMarks: 0 },
    objectives,
    enemyWaves,
    boss: {
      ...base.boss,
      name: "Champion du château",
      title: "Duel au sabre (proposé)",
      attacks: base.boss.attacks.map(attack => ({ ...attack, label: attackLabels[attack.behavior] ?? attack.label })),
      phases: base.boss.phases.map((phase, index) => ({ ...phase,
        label: ["Garde de nuit", "Renforts de la cour", "Duel au sabre"][index] ?? phase.label })),
    },
    trophy: { ...base.trophy, id: "trophy-warp-w02-champion", name: "Mon du champion (proposé)",
      description: "Insigne d'un champion d'une branche Warp ; provenance : W-02, 1629.", targetName: "Champion du château" },
    codexUnlockIds: [],
  };
}
