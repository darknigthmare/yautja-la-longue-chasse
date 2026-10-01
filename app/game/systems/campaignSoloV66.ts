import type { SaveGame } from "../types";
import { normalizeYouthCampaign } from "./youthCampaign";
import { normalizeNurseryCampaign } from "./nurseryCampaign";
import { recordChronicleEvidence } from "./clanChronicle";
import { createSoloV66State, normalizeSoloV66State, soloV66Receipts, type SoloV66State, type SoloV66Receipt } from "./firstTracksSoloV66";

export interface SoloV66Campaign {
  version: 1; status: "active" | "completed"; checkpoint: SoloV66State;
  receipts: SoloV66Receipt[]; startedAt: string; completedAt: string | null;
}
/** Optional field preserves older V9 campaigns; an explicit invalid field must be refused by the save reader. */
export type SoloV66Save = SaveGame & { soloV66?: SoloV66Campaign | null };
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const iso = (v: unknown): v is string => typeof v === "string" && v.length <= 128 && Number.isFinite(Date.parse(v));
const equal = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
export function normalizeSoloV66Campaign(value: unknown): SoloV66Campaign | null {
  if (!record(value) || value.version !== 1 || (value.status !== "active" && value.status !== "completed") || !iso(value.startedAt)) return null;
  const checkpoint = normalizeSoloV66State(value.checkpoint);
  if (!checkpoint || !Array.isArray(value.receipts)) return null;
  const receipts = soloV66Receipts(checkpoint);
  if (!equal(value.receipts, receipts)) return null;
  const completed = checkpoint.phase === "complete";
  if ((value.status === "completed") !== completed || (completed ? !iso(value.completedAt) || Date.parse(value.completedAt) < Date.parse(value.startedAt) : value.completedAt !== null)) return null;
  return { version: 1, status: value.status as SoloV66Campaign["status"], checkpoint, receipts, startedAt: value.startedAt, completedAt: value.completedAt as string | null };
}
function prerequisites(value: Record<string, unknown>) {
  const youth = normalizeYouthCampaign(value.youthTraining), prologue = normalizeNurseryCampaign(value.prologue);
  const greeted = record(value.homeworld) && Array.isArray(value.homeworld.greetedNpcIds) ? value.homeworld.greetedNpcIds : [];
  return prologue?.status === "completed" && youth?.checkpoint.phase === "cage-complete" && youth.receipts.length === 20 &&
    prologue.chronicle.evidence.some(e => e.id === "training-completed") &&
    prologue.chronicle.rites.length === 1 && prologue.chronicle.rites[0].id === "nursery-recognition" &&
    ["hunt-king", "terrace-instructor"].every(id => greeted.includes(id));
}
/** Cross-field check: an isolated first-tracks claim is never accepted as a played chapter. */
export function soloV66MatchesSave(value: unknown): boolean {
  if (!record(value)) return false;
  const prologue = normalizeNurseryCampaign(value.prologue);
  const hasProof = prologue?.chronicle.evidence.some(e => e.id === "first-tracks") ?? false;
  if (value.soloV66 === undefined || value.soloV66 === null) return !hasProof;
  const progress = normalizeSoloV66Campaign(value.soloV66);
  return !!progress && !!prerequisites(value) && hasProof === (progress.status === "completed");
}
export function canStartSoloV66(save: unknown): boolean {
  return record(save) && !!prerequisites(save) && soloV66MatchesSave(save);
}
export function startSoloV66Campaign(save: SoloV66Save, now = new Date().toISOString()): SoloV66Save | null {
  if (!canStartSoloV66(save) || !iso(now)) return null;
  if (save.soloV66) return save;
  return { ...save, soloV66: { version: 1, status: "active", checkpoint: createSoloV66State(), receipts: [], startedAt: now, completedAt: null } };
}
function advance(save: SoloV66Save, state: SoloV66State, incoming: readonly SoloV66Receipt[], now: string): SoloV66Save | null {
  const previous = normalizeSoloV66Campaign(save.soloV66), checkpoint = normalizeSoloV66State(state);
  if (!previous || !checkpoint || !soloV66MatchesSave(save) || !iso(now) || Date.parse(now) < Date.parse(previous.startedAt)) return null;
  const old = previous.checkpoint, receipts = soloV66Receipts(checkpoint);
  if (checkpoint.tick < old.tick || checkpoint.phaseStartedAt < old.phaseStartedAt || checkpoint.clues < old.clues || checkpoint.attempts < old.attempts ||
      old.falseTrailRead && !checkpoint.falseTrailRead || previous.receipts.some((r, i) => !equal(r, receipts[i])) ||
      previous.status === "completed" && !equal(checkpoint, old)) return null;
  const phaseAllowed: Record<SoloV66State["phase"], readonly SoloV66State["phase"][]> = {
    briefing: ["briefing", "trail"], trail: ["trail", "stalk"], stalk: ["stalk", "setback", "return"],
    setback: ["setback", "stalk"], return: ["return", "debrief"], debrief: ["debrief", "complete"], complete: ["complete"],
  };
  if (!phaseAllowed[old.phase].includes(checkpoint.phase)) return null;
  if (checkpoint.attempts !== old.attempts + (old.phase === "setback" && checkpoint.phase === "stalk" ? 1 : 0)) return null;
  const fresh = receipts.slice(previous.receipts.length);
  if (fresh.length > 1 || fresh.some(r => !incoming.some(i => equal(r, i))) ||
      incoming.some(i => !receipts.some(r => equal(r, i))) || new Set(incoming.map(i => i.id)).size !== incoming.length) return null;
  const completed = checkpoint.phase === "complete";
  const soloV66: SoloV66Campaign = { ...previous, checkpoint, receipts, status: completed ? "completed" : "active", completedAt: completed ? previous.completedAt ?? now : null };
  if (!normalizeSoloV66Campaign(soloV66)) return null;
  const proof = completed ? recordChronicleEvidence(save.prologue!.chronicle, { id: "first-tracks", sourceId: "chronicle.first-tracks.completed" }) : null;
  if (proof && !proof.accepted) return null;
  return { ...save, soloV66, profile: { ...save.profile, playTimeSeconds: save.profile.playTimeSeconds + Math.max(0, Math.floor(checkpoint.tick / 60) - Math.floor(old.tick / 60)) },
    prologue: proof ? { ...save.prologue!, chronicle: proof.state } : save.prologue };
}
export const withSoloV66Checkpoint = (save: SoloV66Save, state: SoloV66State, now = new Date().toISOString()) => advance(save, state, [], now);
export const withSoloV66Progress = (save: SoloV66Save, receipts: readonly SoloV66Receipt[], state: SoloV66State, now = new Date().toISOString()) => advance(save, state, receipts, now);
export const soloV66NeedsScene = (progress: SoloV66Campaign | null | undefined) => progress?.status === "active";
