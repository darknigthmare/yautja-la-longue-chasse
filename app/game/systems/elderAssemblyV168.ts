import type { SaveGame } from "../types";
import { inspectElderMentoring } from "./elderMentoringV168";
import { canJudgeElderPassage, inspectElderPassageJudgment } from "./elderPassageJudgmentV168";
import { rankTrialsBlockedV147 } from "./honorTribunalV147";

export type ElderResponsibility = "council" | "travel";
type AssemblyAct = "mentoring" | "judgment";

export interface ElderAssemblyV168 {
  version: 1;
  ownerCreatedAt: string;
  revision: number;
  mentoringReviewed: boolean;
  judgmentReviewed: boolean;
  responsibility: ElderResponsibility | null;
}

export type AssemblyCommand = {
  expectedRevision: number;
  operation: { type: "hear"; act: AssemblyAct } | { type: "accept"; responsibility: ElderResponsibility };
};

export type AssemblyResponse = { ok: boolean; message: string };
type AssemblySave = Pick<SaveGame, "createdAt" | "profile" | "prologue" | "honorSourcesV169" |
  "tribunalV147" | "elderMentoringV168" | "elderPassageJudgmentV168" | "elderAssemblyV168">;
type AssemblyInspection = { status: "absent" | "valid" | "invalid-save" | "future-version"; state: ElderAssemblyV168 | null };

const isRecord = (value: unknown): value is Record<string, unknown> =>
  value !== null && typeof value === "object" && !Array.isArray(value);

const isResponsibility = (value: unknown): value is ElderResponsibility =>
  value === "council" || value === "travel";

export const ELDER_RESPONSIBILITY_LABELS: Record<ElderResponsibility, string> = {
  council: "Siéger régulièrement au conseil",
  travel: "Assumer un engagement itinérant",
};

export function inspectElderAssembly(raw: unknown, owner: string): AssemblyInspection {
  if (raw == null) return { status: "absent", state: null };
  const invalid = { status: "invalid-save", state: null } as const;
  if (!isRecord(raw) || !owner || raw.ownerCreatedAt !== owner) return invalid;
  if (typeof raw.version === "number" && Number.isInteger(raw.version) && raw.version > 1) {
    return { status: "future-version", state: null };
  }
  if (raw.version !== 1 || Object.keys(raw).length !== 6 || typeof raw.mentoringReviewed !== "boolean" || typeof raw.judgmentReviewed !== "boolean" ||
      (raw.responsibility !== null && !isResponsibility(raw.responsibility))) return invalid;
  const { mentoringReviewed, judgmentReviewed, responsibility } = raw;
  const revision = Number(mentoringReviewed) + Number(judgmentReviewed) + Number(responsibility !== null);
  if (raw.revision !== revision || (responsibility !== null && (!mentoringReviewed || !judgmentReviewed))) return invalid;
  return { status: "valid", state: { version: 1, ownerCreatedAt: owner, revision, mentoringReviewed, judgmentReviewed, responsibility } };
}

export function elderAssemblyProofs(save: Pick<AssemblySave, "elderMentoringV168" | "elderPassageJudgmentV168" | "createdAt">) {
  const mentoring = inspectElderMentoring(save.elderMentoringV168, save.createdAt).state;
  const passage = inspectElderPassageJudgment(save.elderPassageJudgmentV168, save.createdAt).state;
  return {
    mentoring: mentoring?.resolved === true,
    judgment: passage?.resolved === true,
    passageMethod: passage?.resolved ? passage.trial?.method ?? null : null,
  };
}

export function canConveneElderAssembly(save: AssemblySave): boolean {
  const proofs = elderAssemblyProofs(save);
  return proofs.mentoring && proofs.judgment && canJudgeElderPassage(save) && !rankTrialsBlockedV147(save.tribunalV147);
}

export function isElderAssemblySuccessor(previous: ElderAssemblyV168, next: ElderAssemblyV168): boolean {
  return !previous.responsibility && previous.ownerCreatedAt === next.ownerCreatedAt && next.revision === previous.revision + 1 &&
    (!previous.mentoringReviewed || next.mentoringReviewed) && (!previous.judgmentReviewed || next.judgmentReviewed);
}

type AssemblyResult = { ok: true; message: string; state: ElderAssemblyV168 } | { ok: false; message: string };

export function commitElderAssembly(save: AssemblySave, command: AssemblyCommand): AssemblyResult {
  const refuse = (message: string) => ({ ok: false as const, message });
  if (!canConveneElderAssembly(save)) return refuse("Le conseil exige les deux actes observés et une carrière disponible.");
  const inspected = inspectElderAssembly(save.elderAssemblyV168, save.createdAt);
  if (inspected.status !== "absent" && inspected.status !== "valid") return refuse("Le registre de l’assemblée est incompatible.");
  const assembly = inspected.state ?? {
    version: 1 as const, ownerCreatedAt: save.createdAt, revision: 0,
    mentoringReviewed: false, judgmentReviewed: false, responsibility: null,
  };
  if (assembly.responsibility) return refuse("L’engagement a déjà été consigné.");
  if (command.expectedRevision !== assembly.revision) return refuse("Le registre a changé. Reprends l’action.");
  const { operation } = command;
  const accepted = (patch: Partial<ElderAssemblyV168>, message: string): AssemblyResult => ({
    ok: true, message, state: { ...assembly, ...patch, revision: assembly.revision + 1 },
  });

  if (operation.type === "hear") {
    if (operation.act === "mentoring" && !assembly.mentoringReviewed) {
      return accepted({ mentoringReviewed: true }, "Le mentor confirme la décision prise par le novice.");
    }
    if (operation.act === "judgment" && !assembly.judgmentReviewed) {
      return accepted({ judgmentReviewed: true }, "Le témoin confirme que les deux chasseurs ont franchi le passage.");
    }
    return refuse("Cette déposition figure déjà au registre.");
  }
  if (operation.type !== "accept" || !isResponsibility(operation.responsibility) || !assembly.mentoringReviewed ||
      !assembly.judgmentReviewed) return refuse("Écoute les deux dépositions avant de répondre au conseil.");

  return accepted({ responsibility: operation.responsibility }, "L’assemblée reconnaît ton engagement d’Elder.");
}
