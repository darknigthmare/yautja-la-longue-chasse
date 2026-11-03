/**
 * Narrative contracts from the September 2026 rank/companion conversations.
 * This is a foundation, not a declaration that these chapters are playable.
 * Rank names draw on several works; this order, rites and access rules are an
 * original tradition of the player clan, never a universal canon hierarchy.
 * No storage, XP conversion, equipment grant or mutation of the V35 save.
 */
export const CLAN_CHRONICLE_VERSION = 1 as const;
export const CLAN_CHRONICLE_SOURCE = {
  youthThreadId: "6aa9e35a-3288-83eb-a8bf-45d3197113bf",
  nurseryUserTurnId: "7efc0ab0-c5af-4bea-a1ba-c62bc14676e2",
  rankThreadId: "6aa9f019-c838-83eb-9cb1-e58acfb2027e",
  companionThreadId: "6aa75f94-6384-83eb-91d3-f3d466a2307b",
  continuity: "original-clan-adaptation",
  runtimeStatus: "foundation-only",
} as const;

export const CHRONICLE_RANK_IDS = [
  "youngling", "unblooded", "young-blood", "blooded", "elite", "elder", "ancient",
] as const;
export type ChronicleRankId = typeof CHRONICLE_RANK_IDS[number];
export const CHRONICLE_RANK_LABELS: Readonly<Record<ChronicleRankId, string>> = {
  youngling: "Youngling · Jeune du clan", unblooded: "Unblooded · Novice",
  "young-blood": "Young Blood · Aspirant", blooded: "Blooded · Chasseur reconnu",
  elite: "Elite · Chasseur d’élite", elder: "Elder · Aîné du clan",
  ancient: "Ancient · Très ancien",
};

/** Exact receipts must come from a completed authored chapter, never a UI toggle. */
export const CHRONICLE_EVIDENCE = [
  { id: "intro-begun", label: "Introduction de jeunesse commencée", sourceId: "chronicle.intro.started" },
  { id: "intro-completed", label: "KO de la nurserie et carton de fin de jeunesse achevés", sourceId: "chronicle.intro.completed" },
  { id: "first-tracks", label: "Les Premières Pistes réussies", sourceId: "chronicle.first-tracks.completed" },
  { id: "training-completed", label: "Formation initiale validée", sourceId: "chronicle.training.completed" },
  { id: "unguided-hunt", label: "La Piste sans guide réussie", sourceId: "chronicle.unguided-hunt.completed" },
  { id: "quatza-rij-triad-hunt", label: "Chasse au Quatza-Rij accomplie en triade", sourceId: "chronicle.quatza-rij.triad-completed" },
  { id: "temple-three-shadows-triad", label: "Temple des Trois Ombres : épreuve de la triade accomplie", sourceId: "chronicle.temple-three-shadows.triad-completed" },
  { id: "temple-three-shadows-changing-layout", label: "Pyramide changeante franchie pendant le rite", sourceId: "chronicle.temple-three-shadows.changing-layout-completed" },
  { id: "temple-three-shadows-no-energy", label: "Épreuve du temple accomplie sans armes à énergie", sourceId: "chronicle.temple-three-shadows.no-energy-completed" },
  { id: "initiation-return", label: "Retour de la triade pour la reconnaissance du clan", sourceId: "chronicle.initiation.return-completed" },
  { id: "multiple-world-hunts", label: "Expérience confirmée sur plusieurs mondes", sourceId: "chronicle.multiple-world-hunts.completed" },
  { id: "team-extraction", label: "Le Poids des autres : participants protégés et extraits", sourceId: "chronicle.team-extraction.completed" },
  { id: "warp-module-quest", label: "Quête du module Warp Universe terminée", sourceId: "chronicle.warp-module.completed" },
  { id: "reserve-coordinates", label: "Coordonnées d’une réserve obtenues", sourceId: "chronicle.reserve-coordinates.acquired" },
  { id: "queen-mission-briefing", label: "Mission scénarisée de première reine préparée", sourceId: "chronicle.queen-briefing.completed" },
  { id: "first-queen-hunt", label: "Première chasse majeure de reine réussie", sourceId: "chronicle.first-queen.completed" },
  { id: "diverse-mastery", label: "Maîtrise démontrée dans plusieurs types de mission", sourceId: "chronicle.diverse-mastery.completed" },
  { id: "solitary-trial", label: "La Traque solitaire réussie", sourceId: "chronicle.solitary-trial.completed" },
  { id: "long-hunt-history", label: "Longue histoire de chasses et de transmission établie", sourceId: "chronicle.long-hunt-history.completed" },
  { id: "next-generation", label: "Ceux qui reviendront : nouvelle génération initiée", sourceId: "chronicle.next-generation.completed" },
  { id: "elder-time-passage", label: "Ellipse narrative compatible avec la dignité d’Elder", sourceId: "chronicle.elder-time-passage.completed" },
  { id: "ancient-time-passage", label: "Très grande ancienneté établie dans le récit", sourceId: "chronicle.ancient-time-passage.completed" },
  { id: "lasting-legacy", label: "Héritage durable transmis", sourceId: "chronicle.lasting-legacy.completed" },
  { id: "forgotten-debt", label: "Arc des anciennes dettes achevé", sourceId: "chronicle.forgotten-debt.completed" },
] as const;
export type ChronicleEvidenceId = typeof CHRONICLE_EVIDENCE[number]["id"];
export interface ChronicleEvidenceReceipt { id: ChronicleEvidenceId; sourceId: string }
export type ChronicleRiteId = "nursery-recognition" | "unguided-hunt-recognition" |
  "blooding-mark" | "elite-recognition" | "elder-recognition" | "ancient-recognition" |
  "adjutant-appointment";
export interface ChronicleRiteDefinition {
  id: ChronicleRiteId;
  label: string;
  sourceId: string;
  fromRankId: ChronicleRankId;
  grantsRankId: ChronicleRankId | null;
  requiredEvidenceIds: readonly ChronicleEvidenceId[];
}
export const CHRONICLE_RITES: readonly ChronicleRiteDefinition[] = [
  { id: "nursery-recognition", label: "Reconnaissance après la nurserie", sourceId: "chronicle.rite.nursery", fromRankId: "youngling", grantsRankId: "unblooded", requiredEvidenceIds: ["intro-completed"] },
  { id: "unguided-hunt-recognition", label: "Reconnaissance de la Piste sans guide", sourceId: "chronicle.rite.unguided-hunt", fromRankId: "unblooded", grantsRankId: "young-blood", requiredEvidenceIds: ["first-tracks", "training-completed", "unguided-hunt"] },
  { id: "blooding-mark", label: "Reconnaissance du Temple des Trois Ombres", sourceId: "chronicle.rite.blooding", fromRankId: "young-blood", grantsRankId: "blooded", requiredEvidenceIds: ["quatza-rij-triad-hunt", "temple-three-shadows-triad", "temple-three-shadows-changing-layout", "temple-three-shadows-no-energy", "initiation-return"] },
  { id: "elite-recognition", label: "Reconnaissance de l’Elite", sourceId: "chronicle.rite.elite", fromRankId: "blooded", grantsRankId: "elite", requiredEvidenceIds: ["first-queen-hunt", "diverse-mastery", "solitary-trial"] },
  { id: "elder-recognition", label: "Conseil des aînés", sourceId: "chronicle.rite.elder", fromRankId: "elite", grantsRankId: "elder", requiredEvidenceIds: ["long-hunt-history", "next-generation", "elder-time-passage"] },
  { id: "ancient-recognition", label: "Transmission de l’héritage ancien", sourceId: "chronicle.rite.ancient", fromRankId: "elder", grantsRankId: "ancient", requiredEvidenceIds: ["ancient-time-passage", "lasting-legacy", "forgotten-debt"] },
  { id: "adjutant-appointment", label: "Nomination comme second de chasse", sourceId: "chronicle.appointment.adjutant", fromRankId: "blooded", grantsRankId: null, requiredEvidenceIds: ["multiple-world-hunts", "team-extraction"] },
];
export interface ChronicleRiteReceipt { id: ChronicleRiteId; sourceId: string }
export interface ChronicleLegacyRecognition {
  source: "v35";
  /** Historical recognition only. It never proves a narrative rite. */
  rankId: "young-blood" | "blooded" | "elite" | "elder";
  honor: number;
  saveCreatedAt: string;
  accessPolicy: "preserve-v35-access";
}
export interface ClanChronicle {
  version: 1;
  evidence: ChronicleEvidenceReceipt[];
  rites: ChronicleRiteReceipt[];
  legacyRecognition: ChronicleLegacyRecognition | null;
}
export interface ChronicleRequirement { id: string; label: string }
export interface ChronicleEvaluation {
  allowed: boolean;
  missing: ChronicleRequirement[];
  /** A UI must keep showing the independent V35 journey, not reset it. */
  legacyAccessPreserved: boolean;
}

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);
const rankIndex = (rank: ChronicleRankId | null) => rank === null ? -1 : CHRONICLE_RANK_IDS.indexOf(rank);
const legacyRankIds = ["young-blood", "blooded", "elite", "elder"] as const;
function legacyRecognition(value: unknown): ChronicleLegacyRecognition | null {
  if (!record(value) || value.source !== "v35" || value.accessPolicy !== "preserve-v35-access" ||
      !legacyRankIds.includes(value.rankId as typeof legacyRankIds[number]) ||
      typeof value.honor !== "number" || !Number.isSafeInteger(value.honor) || value.honor < 0 ||
      typeof value.saveCreatedAt !== "string" || value.saveCreatedAt.length > 64 ||
      !/^\d{4}-\d{2}-\d{2}T/.test(value.saveCreatedAt) || !Number.isFinite(Date.parse(value.saveCreatedAt))) return null;
  return { source: "v35", rankId: value.rankId as ChronicleLegacyRecognition["rankId"], honor: value.honor,
    saveCreatedAt: value.saveCreatedAt, accessPolicy: "preserve-v35-access" };
}

export function createClanChronicle(): ClanChronicle {
  return { version: CLAN_CHRONICLE_VERSION, evidence: [], rites: [], legacyRecognition: null };
}

/** Call explicitly with the existing save; do not mistake honor for chapter history. */
export function migrateV35ClanChronicle(save: unknown): ClanChronicle {
  const result = createClanChronicle();
  if (!record(save) || !record(save.profile)) return result;
  result.legacyRecognition = legacyRecognition({ source: "v35", rankId: save.profile.rankId,
    honor: save.profile.honor, saveCreatedAt: save.createdAt, accessPolicy: "preserve-v35-access" });
  return result;
}

/** Rebuild the ordered narrative chain; arbitrary rankId/functions fields are ignored. */
export function normalizeClanChronicle(value: unknown): ClanChronicle {
  const result = createClanChronicle();
  if (!record(value) || value.version !== CLAN_CHRONICLE_VERSION) return result;
  result.legacyRecognition = legacyRecognition(value.legacyRecognition);
  const evidence = Array.isArray(value.evidence) ? value.evidence.slice(0, 128) : [];
  for (const definition of CHRONICLE_EVIDENCE) {
    if (evidence.some(item => record(item) && item.id === definition.id && item.sourceId === definition.sourceId)) {
      result.evidence.push({ id: definition.id, sourceId: definition.sourceId });
    }
  }
  const rawRites = Array.isArray(value.rites) ? value.rites.slice(0, 64) : [];
  let currentRank: ChronicleRankId | null = result.evidence.some(e => e.id === "intro-begun") ? "youngling" : null;
  for (const definition of CHRONICLE_RITES) {
    const hasReceipt = rawRites.some(item => record(item) && item.id === definition.id && item.sourceId === definition.sourceId);
    const correctRank = definition.grantsRankId === null
      ? rankIndex(currentRank) >= rankIndex(definition.fromRankId)
      : currentRank === definition.fromRankId;
    if (hasReceipt && correctRank && definition.requiredEvidenceIds.every(id => result.evidence.some(e => e.id === id))) {
      result.rites.push({ id: definition.id, sourceId: definition.sourceId });
      if (definition.grantsRankId !== null) currentRank = definition.grantsRankId;
    }
  }
  return result;
}

function normalizedRank(state: ClanChronicle): ChronicleRankId | null {
  if (!state.evidence.some(e => e.id === "intro-begun")) return null;
  let result: ChronicleRankId = "youngling";
  for (const definition of CHRONICLE_RITES) {
    if (definition.grantsRankId && state.rites.some(r => r.id === definition.id)) result = definition.grantsRankId;
  }
  return result;
}
export function getChronicleRank(value: unknown): ChronicleRankId | null {
  return normalizedRank(normalizeClanChronicle(value));
}
export function getChronicleFunctions(value: unknown): readonly "adjutant"[] {
  return normalizeClanChronicle(value).rites.some(r => r.id === "adjutant-appointment") ? ["adjutant"] : [];
}

function evaluation(state: ClanChronicle, missing: ChronicleRequirement[]): ChronicleEvaluation {
  return { allowed: missing.length === 0, missing, legacyAccessPreserved: state.legacyRecognition !== null };
}
export function evaluateChroniclePromotion(value: unknown, riteId: unknown): ChronicleEvaluation {
  const state = normalizeClanChronicle(value);
  const definition = CHRONICLE_RITES.find(rite => rite.id === riteId);
  if (!definition) return evaluation(state, [{ id: "unknown-rite", label: "Rite non défini" }]);
  if (state.rites.some(r => r.id === definition.id)) return evaluation(state, []);
  const currentRank = normalizedRank(state);
  const missing: ChronicleRequirement[] = [];
  const rankMatches = definition.grantsRankId === null
    ? rankIndex(currentRank) >= rankIndex(definition.fromRankId)
    : currentRank === definition.fromRankId;
  if (!rankMatches) missing.push({ id: "required-rank", label: "Parcours narratif requis : " + CHRONICLE_RANK_LABELS[definition.fromRankId] });
  for (const id of definition.requiredEvidenceIds) {
    if (!state.evidence.some(e => e.id === id)) missing.push({ id, label: CHRONICLE_EVIDENCE.find(e => e.id === id)!.label });
  }
  return evaluation(state, missing);
}

export interface ChronicleUpdate { state: ClanChronicle; accepted: boolean; changed: boolean }
/**
 * Read normalization may salvage known facts. A write must never turn a future
 * or malformed document into a new V1 journey and invite overwriting its data.
 */
function writableChronicle(value: unknown): value is ClanChronicle {
  if (!record(value) || value.version !== CLAN_CHRONICLE_VERSION ||
      !Array.isArray(value.evidence) || value.evidence.length > 128 ||
      !Array.isArray(value.rites) || value.rites.length > 64 ||
      (value.legacyRecognition !== null && legacyRecognition(value.legacyRecognition) === null)) return false;
  return Array.from(value.evidence).every(item => record(item) &&
      CHRONICLE_EVIDENCE.some(definition => item.id === definition.id && item.sourceId === definition.sourceId)) &&
    Array.from(value.rites).every(item => record(item) &&
      CHRONICLE_RITES.some(definition => item.id === definition.id && item.sourceId === definition.sourceId));
}
/** Trusted chapter-result integration only. This is not a player-facing unlock action. */
export function recordChronicleEvidence(value: unknown, receipt: unknown): ChronicleUpdate {
  if (!writableChronicle(value)) return { state: normalizeClanChronicle(value), accepted: false, changed: false };
  const state = normalizeClanChronicle(value);
  const definition = record(receipt) ? CHRONICLE_EVIDENCE.find(e => e.id === receipt.id && e.sourceId === receipt.sourceId) : undefined;
  if (!definition) return { state, accepted: false, changed: false };
  if (state.evidence.some(e => e.id === definition.id)) return { state, accepted: true, changed: false };
  return { state: normalizeClanChronicle({ ...state, evidence: [...state.evidence, { id: definition.id, sourceId: definition.sourceId }] }), accepted: true, changed: true };
}

/** A rite receipt is separate from its completed mission proofs. No XP path exists. */
export function performChronicleRite(value: unknown, receipt: unknown): ChronicleUpdate {
  if (!writableChronicle(value)) return { state: normalizeClanChronicle(value), accepted: false, changed: false };
  const state = normalizeClanChronicle(value);
  const definition = record(receipt) ? CHRONICLE_RITES.find(r => r.id === receipt.id && r.sourceId === receipt.sourceId) : undefined;
  if (!definition || !evaluateChroniclePromotion(state, definition.id).allowed) return { state, accepted: false, changed: false };
  if (state.rites.some(r => r.id === definition.id)) return { state, accepted: true, changed: false };
  return { state: normalizeClanChronicle({ ...state, rites: [...state.rites, { id: definition.id, sourceId: definition.sourceId }] }), accepted: true, changed: true };
}

export type ChronicleAccessId = "homeworld-normal" | "homeworld-lava" | "homeworld-dark-jungle" | "personal-ship-acquisition" | "autonomous-hunt" |
  "reserve-hunt" | "quatza-rij-triad-hunt" | "temple-three-shadows" | "first-queen-mission" | "elite-contracts" | "warp-universe";
export interface ChronicleAccessContext {
  /** Actual ownership/availability from the game, never inferred from a rank label. */
  personalShipAvailable?: boolean;
  warpModuleInstalled?: boolean;
}
export function evaluateChronicleAccess(value: unknown, accessId: unknown, context: ChronicleAccessContext = {}): ChronicleEvaluation {
  const state = normalizeClanChronicle(value);
  const rank = normalizedRank(state);
  const missing: ChronicleRequirement[] = [];
  const requireRank = (minimum: ChronicleRankId) => {
    if (rankIndex(rank) < rankIndex(minimum)) missing.push({ id: "required-rank", label: "Rang narratif requis : " + CHRONICLE_RANK_LABELS[minimum] });
  };
  const requireEvidence = (id: ChronicleEvidenceId) => {
    if (!state.evidence.some(e => e.id === id)) missing.push({ id, label: CHRONICLE_EVIDENCE.find(e => e.id === id)!.label });
  };
  const requireShip = () => {
    if (context?.personalShipAvailable !== true) missing.push({ id: "personal-ship", label: "Vaisseau personnel réellement disponible" });
  };
  switch (accessId) {
    case "homeworld-normal": requireRank("unblooded"); break;
    // Explicit Mission jeunesse requirements override a later assistant simplification.
    case "homeworld-lava":
    case "homeworld-dark-jungle": requireRank("young-blood"); break;
    case "personal-ship-acquisition": requireRank("blooded"); break;
    case "autonomous-hunt": requireRank("blooded"); requireShip(); break;
    case "quatza-rij-triad-hunt": requireRank("young-blood"); break;
    case "temple-three-shadows": requireRank("young-blood"); requireEvidence("quatza-rij-triad-hunt"); break;
    case "reserve-hunt": requireRank("blooded"); requireShip(); requireEvidence("reserve-coordinates"); break;
    // The first queen is a story hunt available BEFORE Elite, not an Elite-only contract.
    case "first-queen-mission": requireRank("blooded"); requireEvidence("queen-mission-briefing"); break;
    case "elite-contracts": requireRank("elite"); requireShip(); break;
    case "warp-universe":
      requireRank("blooded"); requireShip(); requireEvidence("warp-module-quest");
      if (!state.rites.some(r => r.id === "adjutant-appointment")) missing.push({ id: "adjutant", label: "Nomination réelle comme Adjutant" });
      if (context?.warpModuleInstalled !== true) missing.push({ id: "warp-installed", label: "Module Warp Universe installé" });
      break;
    default: missing.push({ id: "unknown-access", label: "Accès non défini" });
  }
  return evaluation(state, missing);
}

export interface CompanionAboardAssignment {
  recruited: boolean;
  available: boolean;
  assignedShipId: string | null;
  assignmentActive: boolean;
  moduleInstalled: boolean;
  moduleCompatible: boolean;
  refitCompleted: boolean;
  deployed: boolean;
  location: "aboard" | "field" | "reserve" | "elsewhere";
}
export interface CompanionShipContext { personalShipId: string | null; shipPhysicallyAvailable: boolean }
const shipIdentifier = (value: unknown): value is string => typeof value === "string" &&
  value.length > 0 && value.length <= 100 && /^[a-z0-9][a-z0-9-]*$/.test(value);

/** Active modules stay installed while an ally is deployed; only a refit removes them. */
export function isCompanionModuleVisible(assignment: unknown, context: unknown): boolean {
  if (!record(assignment) || !record(context)) return false;
  return context.shipPhysicallyAvailable === true && shipIdentifier(context.personalShipId) &&
    assignment.recruited === true && assignment.assignmentActive === true &&
    assignment.assignedShipId === context.personalShipId && assignment.moduleInstalled === true &&
    assignment.moduleCompatible === true && assignment.refitCompleted === true;
}

/** The occupant cannot appear both in a ship room and on the mission field. */
export function canCompanionAppearAboard(assignment: unknown, context: unknown): boolean {
  return record(assignment) && isCompanionModuleVisible(assignment, context) &&
    assignment.available === true && assignment.deployed === false && assignment.location === "aboard";
}
