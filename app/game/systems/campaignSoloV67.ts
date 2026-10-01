import type { SaveGame } from "../types";
import { normalizeNurseryCampaign } from "./nurseryCampaign";
import { normalizeYouthCampaign } from "./youthCampaign";
import { normalizeSoloV66Campaign } from "./campaignSoloV66";
import { recordChronicleEvidence } from "./clanChronicle";
import { createSoloV67State, normalizeSoloV67State, soloV67Receipts, type SoloV67Receipt, type SoloV67State } from "./firstHuntSoloV67";

export interface SoloV67Campaign {
  version: 1; status: "active" | "completed"; checkpoint: SoloV67State;
  receipts: SoloV67Receipt[]; startedAt: string; completedAt: string | null;
}
export type SoloV67Save = SaveGame & { soloV67?: SoloV67Campaign | null };
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const iso = (v: unknown): v is string => typeof v === "string" && v.length <= 128 && Number.isFinite(Date.parse(v));
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
export function normalizeSoloV67Campaign(v: unknown): SoloV67Campaign | null {
  if (!record(v) || v.version !== 1 || (v.status !== "active" && v.status !== "completed") || !iso(v.startedAt)) return null;
  const checkpoint = normalizeSoloV67State(v.checkpoint);
  if (!checkpoint || !Array.isArray(v.receipts) || !same(v.receipts, soloV67Receipts(checkpoint))) return null;
  const completed = checkpoint.phase === "complete";
  if ((v.status === "completed") !== completed || (completed ? !iso(v.completedAt) || Date.parse(v.completedAt) < Date.parse(v.startedAt) : v.completedAt !== null)) return null;
  return { version: 1, status: v.status, checkpoint, receipts: soloV67Receipts(checkpoint), startedAt: v.startedAt, completedAt: v.completedAt as string | null };
}
function prerequisites(v: Record<string, unknown>) {
  const nursery = normalizeNurseryCampaign(v.prologue), youth = normalizeYouthCampaign(v.youthTraining), firstTracks = normalizeSoloV66Campaign(v.soloV66);
  const greeted = record(v.homeworld) && Array.isArray(v.homeworld.greetedNpcIds) ? v.homeworld.greetedNpcIds : [];
  return nursery?.status === "completed" && youth?.checkpoint.phase === "cage-complete" && youth.receipts.length === 20 &&
    firstTracks?.status === "completed" && firstTracks.receipts.length === 7 &&
    ["first-tracks", "training-completed"].every(id => nursery.chronicle.evidence.some(e => e.id === id)) &&
    nursery.chronicle.rites.length === 1 && nursery.chronicle.rites[0].id === "nursery-recognition" &&
    ["hunt-king", "terrace-instructor"].every(id => greeted.includes(id));
}
/** Missing old fields remain valid; a standalone claim or a rite must never manufacture this assessment. */
export function soloV67MatchesSave(v: unknown): boolean {
  if (!record(v)) return false;
  const chronicle = normalizeNurseryCampaign(v.prologue)?.chronicle;
  const hasProof = chronicle?.evidence.some(e => e.id === "unguided-hunt") ?? false;
  if (v.soloV67 === undefined || v.soloV67 === null) return !hasProof;
  const state = normalizeSoloV67Campaign(v.soloV67);
  return !!state && !!prerequisites(v) && hasProof === (state.status === "completed");
}
export const canStartSoloV67 = (v: unknown) => record(v) && !!prerequisites(v) && soloV67MatchesSave(v);
export function startSoloV67Campaign(save: SoloV67Save, now = new Date().toISOString()): SoloV67Save | null {
  if (!canStartSoloV67(save) || !iso(now)) return null;
  return save.soloV67 ? save : { ...save, soloV67: { version: 1, status: "active", checkpoint: createSoloV67State(), receipts: [], startedAt: now, completedAt: null } };
}
function advance(save: SoloV67Save, raw: SoloV67State, incoming: readonly SoloV67Receipt[], now: string): SoloV67Save | null {
  const before = normalizeSoloV67Campaign(save.soloV67), next = normalizeSoloV67State(raw);
  if (!before || !next || !soloV67MatchesSave(save) || !iso(now) || Date.parse(now) < Date.parse(before.startedAt)) return null;
  const old = before.checkpoint, receipts = soloV67Receipts(next), retry = old.phase === "setback" && next.phase === "encounter";
  if (next.tick < old.tick || next.phaseStartedAt < old.phaseStartedAt || next.clues < old.clues ||
      old.route !== null && next.route !== old.route || next.attempts !== old.attempts + (retry ? 1 : 0) ||
      before.receipts.some((receipt, index) => !same(receipt, receipts[index])) || before.status === "completed" && !same(next, old)) return null;
  if (retry ? next.prey.touches !== 0 || next.prey.dodges !== 0 || next.player.health !== 100 : next.prey.touches < old.prey.touches || next.prey.dodges < old.prey.dodges || next.player.health > old.player.health) return null;
  const phases: Record<SoloV67State["phase"], readonly SoloV67State["phase"][]> = {
    briefing: ["briefing", "preparation"], preparation: ["preparation", "tracks"], tracks: ["tracks", "approach"], approach: ["approach", "encounter"],
    encounter: ["encounter", "setback", "proof"], setback: ["setback", "encounter"], proof: ["proof", "return"], return: ["return", "debrief"], debrief: ["debrief", "complete"], complete: ["complete"],
  };
  if (!phases[old.phase].includes(next.phase)) return null;
  const fresh = receipts.slice(before.receipts.length);
  if (fresh.length > 1 || fresh.some(r => !incoming.some(i => same(i, r))) || incoming.some(i => !receipts.some(r => same(i, r))) || new Set(incoming.map(i => i.id)).size !== incoming.length) return null;
  const completed = next.phase === "complete";
  const soloV67: SoloV67Campaign = { ...before, checkpoint: next, receipts, status: completed ? "completed" : "active", completedAt: completed ? before.completedAt ?? now : null };
  if (!normalizeSoloV67Campaign(soloV67)) return null;
  const evidence = completed ? recordChronicleEvidence(save.prologue!.chronicle, { id: "unguided-hunt", sourceId: "chronicle.unguided-hunt.completed" }) : null;
  if (evidence && !evidence.accepted) return null;
  return { ...save, soloV67, profile: { ...save.profile, playTimeSeconds: save.profile.playTimeSeconds + Math.max(0, Math.floor(next.tick / 60) - Math.floor(old.tick / 60)) },
    prologue: evidence ? { ...save.prologue!, chronicle: evidence.state } : save.prologue };
}
export const withSoloV67Checkpoint = (save: SoloV67Save, state: SoloV67State, now = new Date().toISOString()) => advance(save, state, [], now);
export const withSoloV67Progress = (save: SoloV67Save, receipts: readonly SoloV67Receipt[], state: SoloV67State, now = new Date().toISOString()) => advance(save, state, receipts, now);
export const soloV67NeedsScene = (progress: SoloV67Campaign | null | undefined) => progress?.status === "active";
