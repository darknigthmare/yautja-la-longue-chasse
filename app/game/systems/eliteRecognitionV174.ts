import type { SaveGame } from "../types";
import { inspectBuriedCradleCampaign } from "./buriedCradleCampaign";
import { getChronicleRank } from "./clanChronicle";
import { inspectEliteMastery, MASTERY_DISCIPLINES } from "./eliteMasteryV170";
import { HONOR_RANK_THRESHOLDS_V166 } from "./honorProgressionV166";
import { honorForCampaignRankV169 } from "./honorSourcesV169";
import { rankTrialsBlockedV147 } from "./honorTribunalV147";
import { hasQuatzaReturn, quatzaCampaignMatchesSave } from "./quatzaRij";

export const ELITE_RECOGNITION_PROOFS = ["crown", "hunt", "mastery"] as const;
export type EliteRecognitionProof = typeof ELITE_RECOGNITION_PROOFS[number];
export type EliteRecognitionAudience = "public" | "restricted";
export type EliteRecognitionPoint = { column: number; row: number };

export const ELITE_RECOGNITION_GROUND = [
  "#########",
  "#..p#r..#",
  "#...g...#",
  "#..c.h..#",
  "#...m...#",
  "#...@...#",
  "#########",
] as const;

export const ELITE_RECOGNITION_POSTS = {
  entry: { column: 4, row: 5 },
  crown: { column: 3, row: 3 },
  hunt: { column: 5, row: 3 },
  mastery: { column: 4, row: 4 },
  public: { column: 3, row: 1 },
  restricted: { column: 5, row: 1 },
  mark: { column: 4, row: 2 },
} satisfies Record<string, EliteRecognitionPoint>;

export type EliteRecognitionV174 = {
  version: 1;
  ownerCreatedAt: string;
  revision: number;
  proofs: EliteRecognitionProof[];
  audience: EliteRecognitionAudience | null;
  witnessed: boolean;
  prepared: boolean;
};

export type EliteRecognitionSave = SaveGame & { eliteRecognitionV174?: EliteRecognitionV174 | null };
export type EliteRecognitionCommand = {
  expectedRevision: number;
  position: EliteRecognitionPoint;
  operation:
    | { type: "present"; proof: EliteRecognitionProof }
    | { type: "audience"; audience: EliteRecognitionAudience }
    | { type: "hear" }
    | { type: "mark" };
};
export type EliteRecognitionResponse = { ok: boolean; message: string };
type Result =
  | { ok: true; message: string; state: EliteRecognitionV174 }
  | { ok: false; message: string };
type Inspection = {
  status: "absent" | "valid" | "invalid-save" | "future-version";
  state: EliteRecognitionV174 | null;
};

const record = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const isAudience = (value: unknown): value is EliteRecognitionAudience =>
  value === "public" || value === "restricted";

const isProof = (value: unknown): value is EliteRecognitionProof =>
  ELITE_RECOGNITION_PROOFS.some(proof => proof === value);

export function sameEliteRecognitionPoint(a: EliteRecognitionPoint, b: EliteRecognitionPoint): boolean {
  return a.column === b.column && a.row === b.row;
}

export function canWalkEliteRecognition(point: EliteRecognitionPoint): boolean {
  if (!point || !Number.isSafeInteger(point.column) || !Number.isSafeInteger(point.row)) return false;
  const terrain = ELITE_RECOGNITION_GROUND[point.row]?.[point.column];
  return terrain !== undefined && terrain !== "#";
}

export function inspectEliteRecognition(raw: unknown, owner: string): Inspection {
  if (raw == null) return { status: "absent", state: null };
  const invalid = { status: "invalid-save", state: null } as const;
  if (!record(raw) || !owner || raw.ownerCreatedAt !== owner) return invalid;
  if (typeof raw.version === "number" && Number.isInteger(raw.version) && raw.version > 1) {
    return { status: "future-version", state: null };
  }
  const { proofs, audience, witnessed, prepared, revision } = raw;
  if (raw.version !== 1 || Object.keys(raw).length !== 7 || !Array.isArray(proofs) ||
      !Array.from(proofs).every(isProof) || new Set(proofs).size !== proofs.length ||
      !(audience === null || isAudience(audience)) || typeof witnessed !== "boolean" ||
      typeof prepared !== "boolean") return invalid;
  if (revision !== proofs.length + Number(audience !== null) + Number(witnessed) + Number(prepared) ||
      revision < 1 || (proofs.length > 0 && audience === null) ||
      (witnessed && proofs.length !== ELITE_RECOGNITION_PROOFS.length) || (prepared && !witnessed)) return invalid;
  return { status: "valid", state: { version: 1, ownerCreatedAt: owner, revision,
    proofs: [...proofs], audience, witnessed, prepared } };
}

export function eliteRecognitionEvidence(save: SaveGame) {
  const crown = inspectBuriedCradleCampaign(save.buriedCradle, save.createdAt).state;
  const mastery = inspectEliteMastery(save.eliteMasteryV170, save.createdAt).state;
  const disciplines = MASTERY_DISCIPLINES.filter(discipline => mastery?.stages[discipline] === 2);
  const rank = save.prologue ? getChronicleRank(save.prologue.chronicle) : save.profile.rankId;
  const honor = honorForCampaignRankV169(save.profile.honor, save.honorSourcesV169);
  return {
    crown: crown?.status === "reported" && crown.crownDelivered,
    hunt: hasQuatzaReturn(save.quatzaRij, save.createdAt, "solo") && quatzaCampaignMatchesSave(save),
    mastery: Boolean(mastery?.profile && disciplines.length >= 2),
    disciplines,
    rank,
    honor,
  };
}

export function canEnterEliteRecognition(save: SaveGame): boolean {
  const { crown, hunt, mastery, rank, honor } = eliteRecognitionEvidence(save);
  return (rank === "blooded" || rank === "elite" || rank === "elder" || rank === "ancient") &&
    crown && hunt && mastery && honor >= HONOR_RANK_THRESHOLDS_V166.elite && !rankTrialsBlockedV147(save.tribunalV147);
}

/** Validate a past receipt without revoking it for a later honor loss or freeze. */
export function eliteRecognitionMatchesSave(save: EliteRecognitionSave): boolean {
  const inspection = inspectEliteRecognition(save.eliteRecognitionV174, save.createdAt);
  if (inspection.status === "absent") return true;
  const state = inspection.state;
  if (!state) return false;
  const { crown, hunt, mastery, rank } = eliteRecognitionEvidence(save);
  if (!crown || !hunt || !mastery) return false;
  if (!save.prologue) return true;
  return rank === "blooded" || rank === "elite" || rank === "elder" || rank === "ancient";
}

export function isEliteRecognitionSuccessor(previous: EliteRecognitionV174 | null | undefined, next: EliteRecognitionV174): boolean {
  if (!inspectEliteRecognition(next, next.ownerCreatedAt).state) return false;
  if (!previous) return next.revision === 1 && next.audience !== null;
  return previous.ownerCreatedAt === next.ownerCreatedAt && !previous.prepared &&
    next.revision === previous.revision + 1 && (!previous.audience || previous.audience === next.audience) &&
    (!previous.witnessed || next.witnessed) && previous.proofs.every((proof, index) => next.proofs[index] === proof);
}

const PROOF_MESSAGES: Record<EliteRecognitionProof, string> = {
  crown: "La crête rapportée et le relevé du Berceau sont déposés sur le socle.",
  hunt: "La peau et le crâne du Quatza-Rij sont présentés avec le reçu de ton retour solitaire.",
  mastery: "Le profil du terrain et les disciplines accomplies sont présentés aux témoins.",
};

export function commitEliteRecognition(save: EliteRecognitionSave, command: EliteRecognitionCommand): Result {
  const refuse = (message: string): Result => ({ ok: false, message });
  if (!canEnterEliteRecognition(save)) {
    return refuse("Le retour exige la crête, le Quatza-Rij solitaire, deux disciplines et 5 000 points d’honneur.");
  }
  const inspection = inspectEliteRecognition(save.eliteRecognitionV174, save.createdAt);
  if (inspection.status !== "absent" && inspection.status !== "valid") return refuse("Le registre de reconnaissance est incompatible.");
  const state = inspection.state ?? {
    version: 1 as const, ownerCreatedAt: save.createdAt, revision: 0,
    proofs: [], audience: null, witnessed: false, prepared: false,
  };
  const { operation, position, expectedRevision } = command;
  if (state.prepared) return refuse("Le retour préparatoire figure déjà au registre.");
  if (state.revision !== expectedRevision || !canWalkEliteRecognition(position)) return refuse("Rejoins le poste et vérifie le registre avant de reprendre.");
  const at = (point: EliteRecognitionPoint) => sameEliteRecognitionPoint(position, point);
  const accept = (patch: Partial<EliteRecognitionV174>, message: string): Result => ({
    ok: true, message, state: { ...state, ...patch, revision: state.revision + 1 },
  });

  if (operation.type === "audience" && isAudience(operation.audience) && !state.audience && at(ELITE_RECOGNITION_POSTS.entry)) {
    return accept({ audience: operation.audience }, operation.audience === "public"
      ? "Tu as choisi le retour devant la cohorte." : "Tu as choisi le retour avec les témoins de l’assemblée.");
  }
  if (operation.type === "present" && isProof(operation.proof) && state.audience &&
      !state.proofs.includes(operation.proof) && at(ELITE_RECOGNITION_POSTS[operation.proof])) {
    return accept({ proofs: [...state.proofs, operation.proof] }, PROOF_MESSAGES[operation.proof]);
  }
  if (operation.type === "hear" && state.audience && state.proofs.length === ELITE_RECOGNITION_PROOFS.length &&
      !state.witnessed && at(ELITE_RECOGNITION_POSTS[state.audience])) {
    return accept({ witnessed: true }, "Le témoin confirme les trois preuves et t’attend au socle de reconnaissance.");
  }
  if (operation.type === "mark" && state.witnessed && at(ELITE_RECOGNITION_POSTS.mark)) {
    return accept({ prepared: true }, "Geste préparé et choix des témoins consignés. Les rites du clan restent à vérifier.");
  }
  return refuse("Cette action attend le poste ou la preuve correspondante.");
}
