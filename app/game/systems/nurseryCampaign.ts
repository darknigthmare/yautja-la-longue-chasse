import { createClanChronicle, normalizeClanChronicle, recordChronicleEvidence, performChronicleRite, type ClanChronicle } from "./clanChronicle";
import { createNurseryPrologue, normalizeNurseryCheckpoint, type NurseryState, type NurseryCompletionReceipt } from "./nurseryPrologue";
import type { SaveGame } from "../types";

/** Embedded in the campaign so checkpoint, completion and rite commit in one key. */
export interface NurseryCampaignProgress {
  version: 1;
  status: "active" | "completed";
  checkpoint: NurseryState;
  chronicle: ClanChronicle;
  completedAt: string | null;
}
const record = (value: unknown): value is Record<string, unknown> => !!value && typeof value === "object" && !Array.isArray(value);
export function createNurseryCampaign(): NurseryCampaignProgress {
  return { version: 1, status: "active", checkpoint: createNurseryPrologue(), chronicle: createClanChronicle(), completedAt: null };
}
/** Missing means legacy adult campaign; malformed explicit progress must be rejected by the save parser. */
export function normalizeNurseryCampaign(value: unknown): NurseryCampaignProgress | null {
  if (!record(value) || value.version !== 1 || !["active", "completed"].includes(String(value.status))) return null;
  const checkpoint = normalizeNurseryCheckpoint(value.checkpoint);
  if (!checkpoint || !record(value.chronicle) || value.chronicle.version !== 1) return null;
  const chronicle = normalizeClanChronicle(value.chronicle);
  if (chronicle.legacyRecognition !== null) return null;
  const begun = chronicle.evidence.some(item => item.id === "intro-begun");
  const completed = chronicle.evidence.some(item => item.id === "intro-completed");
  const recognized = chronicle.rites.some(item => item.id === "nursery-recognition");
  if (value.status === "active") {
    if (checkpoint.phase === "complete" || completed || recognized || value.completedAt !== null) return null;
    if (checkpoint.phase !== "loading" && !begun) return null;
  } else {
    if (checkpoint.phase !== "complete" || !begun || !completed || !recognized || typeof value.completedAt !== "string" || !Number.isFinite(Date.parse(value.completedAt))) return null;
  }
  return { version: 1, status: value.status as NurseryCampaignProgress["status"], checkpoint, chronicle, completedAt: value.completedAt as string | null };
}
/** Nonterminal observations cannot mint completion, rewards or adult statistics. */
export function withNurseryCheckpoint(save: SaveGame, state: NurseryState): SaveGame | null {
  const progress = normalizeNurseryCampaign(save.prologue);
  const checkpoint = normalizeNurseryCheckpoint(state);
  if (!progress || progress.status !== "active" || !checkpoint || checkpoint.phase === "complete" || checkpoint.tick < progress.checkpoint.tick || checkpoint.attempt < progress.checkpoint.attempt) return null;
  const chronicle = checkpoint.phase === "loading" ? progress.chronicle : recordChronicleEvidence(progress.chronicle, { id: "intro-begun", sourceId: "chronicle.intro.started" }).state;
  const playedSeconds = Math.max(0, Math.floor(checkpoint.tick / 60) - Math.floor(progress.checkpoint.tick / 60));
  return { ...save, profile: { ...save.profile, playTimeSeconds: save.profile.playTimeSeconds + playedSeconds }, prologue: { ...progress, checkpoint, chronicle } };
}
/** Trusted scene transition only; durable acknowledgement remains the caller's responsibility. */
export function withNurseryCompletion(save: SaveGame, receipt: NurseryCompletionReceipt, state: NurseryState, now = new Date().toISOString()): SaveGame | null {
  const progress = normalizeNurseryCampaign(save.prologue), checkpoint = normalizeNurseryCheckpoint(state);
  if (!progress || !checkpoint || checkpoint.phase !== "complete" || receipt?.id !== "intro-completed" || receipt.sourceId !== "chronicle.intro.completed" || receipt.sceneId !== "nursery-prologue" || receipt.attempt !== checkpoint.attempt || !Number.isFinite(Date.parse(now))) return null;
  if (progress.status === "completed") return progress.checkpoint.attempt === receipt.attempt ? save : null;
  if (checkpoint.tick < progress.checkpoint.tick || checkpoint.attempt < progress.checkpoint.attempt) return null;
  const begun = recordChronicleEvidence(progress.chronicle, { id: "intro-begun", sourceId: "chronicle.intro.started" });
  const complete = recordChronicleEvidence(begun.state, receipt);
  const recognized = performChronicleRite(complete.state, { id: "nursery-recognition", sourceId: "chronicle.rite.nursery" });
  if (!begun.accepted || !complete.accepted || !recognized.accepted) return null;
  const playedSeconds = Math.max(0, Math.floor(checkpoint.tick / 60) - Math.floor(progress.checkpoint.tick / 60));
  return { ...save, profile: { ...save.profile, playTimeSeconds: save.profile.playTimeSeconds + playedSeconds }, prologue: { version: 1, status: "completed", checkpoint, chronicle: recognized.state, completedAt: now } };
}
