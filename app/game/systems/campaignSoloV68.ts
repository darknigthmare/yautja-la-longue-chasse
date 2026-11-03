import type { SaveGame } from "../types";
import { normalizeNurseryCampaign } from "./nurseryCampaign";
import { normalizeYouthCampaign } from "./youthCampaign";
import { normalizeSoloV66Campaign } from "./campaignSoloV66";
import { normalizeSoloV67Campaign } from "./campaignSoloV67";
import { performChronicleRite } from "./clanChronicle";
import { createSoloV68State, normalizeSoloV68State, soloV68Receipts, soloV68ProofCount, type SoloV68Receipt, type SoloV68State } from "./firstHuntSoloV68";

export interface SoloV68Campaign { version: 1; status: "active" | "completed"; checkpoint: SoloV68State; receipts: SoloV68Receipt[]; startedAt: string; completedAt: string | null }
export type SoloV68Save = SaveGame & { soloV68?: SoloV68Campaign | null };
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const iso = (v: unknown): v is string => typeof v === "string" && v.length <= 128 && Number.isFinite(Date.parse(v));
const same = (a: unknown, b: unknown) => JSON.stringify(a) === JSON.stringify(b);
export function normalizeSoloV68Campaign(v: unknown): SoloV68Campaign | null {
  if (!record(v) || v.version !== 1 || (v.status !== "active" && v.status !== "completed") || !iso(v.startedAt)) return null;
  const checkpoint = normalizeSoloV68State(v.checkpoint);
  if (!checkpoint || !Array.isArray(v.receipts) || !same(v.receipts, soloV68Receipts(checkpoint))) return null;
  const completed = checkpoint.phase === "complete";
  if ((v.status === "completed") !== completed || (completed ? !iso(v.completedAt) || Date.parse(v.completedAt) < Date.parse(v.startedAt) : v.completedAt !== null)) return null;
  return { version: 1, status: v.status, checkpoint, receipts: soloV68Receipts(checkpoint), startedAt: v.startedAt, completedAt: v.completedAt as string | null };
}
/** Validate the complete authored prior chain, rather than granting a rank from a loose evidence entry. */
function prerequisites(v: Record<string, unknown>) {
  const nursery = normalizeNurseryCampaign(v.prologue), youth = normalizeYouthCampaign(v.youthTraining), firstTracks = normalizeSoloV66Campaign(v.soloV66), unguided = normalizeSoloV67Campaign(v.soloV67);
  const greeted = record(v.homeworld) && Array.isArray(v.homeworld.greetedNpcIds) ? v.homeworld.greetedNpcIds : [];
  return nursery?.status === "completed" && youth?.checkpoint.phase === "cage-complete" && youth.receipts.length === 20 && firstTracks?.status === "completed" && firstTracks.receipts.length === 7 && unguided?.status === "completed" && unguided.receipts.length === 9 &&
    ["first-tracks", "training-completed", "unguided-hunt"].every(id => nursery.chronicle.evidence.some(e => e.id === id)) && ["hunt-king", "terrace-instructor"].every(id => greeted.includes(id));
}
export function soloV68MatchesSave(v: unknown): boolean {
  if (!record(v)) return false;
  const chronicle = normalizeNurseryCampaign(v.prologue)?.chronicle;
  const recognized = chronicle?.rites.some(r => r.id === "unguided-hunt-recognition") ?? false;
  if (v.soloV68 === undefined || v.soloV68 === null) return !recognized;
  const progress = normalizeSoloV68Campaign(v.soloV68);
  return !!progress && !!prerequisites(v) && recognized === (progress.status === "completed") && !!chronicle && chronicle.rites.length === (progress.status === "completed" ? 2 : 1) && chronicle.rites[0].id === "nursery-recognition";
}
export const canStartSoloV68 = (v: unknown) => record(v) && !!prerequisites(v) && soloV68MatchesSave(v);
export function startSoloV68Campaign(save: SoloV68Save, now = new Date().toISOString()): SoloV68Save | null {
  if (!canStartSoloV68(save) || !iso(now)) return null;
  return save.soloV68 ? save : { ...save, soloV68: { version: 1, status: "active", checkpoint: createSoloV68State(), receipts: [], startedAt: now, completedAt: null } };
}
function advance(save: SoloV68Save, raw: SoloV68State, incoming: readonly SoloV68Receipt[], now: string): SoloV68Save | null {
  const before = normalizeSoloV68Campaign(save.soloV68), next = normalizeSoloV68State(raw);
  if (!before || !next || !soloV68MatchesSave(save) || !iso(now) || Date.parse(now) < Date.parse(before.startedAt)) return null;
  const old = before.checkpoint, receipts = soloV68Receipts(next), retry = old.phase === "setback" && next.phase === "encounter";
  if (next.tick < old.tick || next.phaseStartedAt < old.phaseStartedAt || old.route !== null && next.route !== old.route || next.attempts !== old.attempts + (retry ? 1 : 0) || before.receipts.some((r, i) => !same(r, receipts[i])) || before.status === "completed" && !same(next, old)) return null;
  if (retry ? next.prey.touches !== 0 || next.prey.dodges !== 0 || next.player.health !== 100 : next.prey.touches < old.prey.touches || next.prey.dodges < old.prey.dodges || next.player.health > old.player.health) return null;
  if (old.companions.some((c, i) => c.joined && !next.companions[i].joined || c.injured && old.phase !== "rescue" && (!next.companions[i].injured || c.x !== next.companions[i].x))) return null;
  const phases: Record<SoloV68State["phase"], readonly SoloV68State["phase"][]> = {
    briefing: ["briefing", "formation"], formation: ["formation", "route"], route: ["route", "tracks"], tracks: ["tracks", "relay"], relay: ["relay", "encounter"], encounter: ["encounter", "setback", "shelter"], setback: ["setback", "encounter"], shelter: ["shelter", "medicine"], medicine: ["medicine", "rescue"], rescue: ["rescue", "extraction"], extraction: ["extraction", "return"], return: ["return", "debrief"], debrief: ["debrief", "recognition"], recognition: ["recognition", "complete"], complete: ["complete"],
  };
  if (!phases[old.phase].includes(next.phase)) return null;
  const fresh = receipts.slice(before.receipts.length);
  if (fresh.length > 1 || fresh.some(r => !incoming.some(i => same(i, r))) || incoming.some(i => !receipts.some(r => same(i, r))) || new Set(incoming.map(i => i.id)).size !== incoming.length) return null;
  // A chapter receipt acknowledges a physical scene endpoint, not an arbitrary phase edit.
  if (fresh.length) {
    const near = (x: number, tolerance = 40) => Math.abs(next.player.x - x) < tolerance && next.player.y === 430;
    const grouped = next.companions.every(c => c.joined && !c.injured && c.y === 430 && Math.abs(c.x - next.player.x) < 300);
    const id = fresh[0].id;
    if ((["briefed", "returned", "mentor-report", "aspirant-recognition"].includes(id) && !near(160)) || (["returned", "mentor-report", "aspirant-recognition", "extracted", "route-chosen", "tracks-read"].includes(id) && !grouped) ||
        (id === "tracks-read" && !near(2020)) || (id === "relay-crossed" && (!near(2360) || next.formationTicks !== 45)) || (id === "shelter-reached" && !near(4500)) ||
        (id === "medicomp-retrieved" && !near(4930)) || (id === "companion-stabilized" && !near(next.companions[0].x)) || (id === "extracted" && !near(5260))) return null;
  }
  const completed = next.phase === "complete", soloV68: SoloV68Campaign = { ...before, checkpoint: next, receipts, status: completed ? "completed" : "active", completedAt: completed ? before.completedAt ?? now : null };
  if (!normalizeSoloV68Campaign(soloV68) || soloV68ProofCount(next) !== receipts.length) return null;
  const rite = completed ? performChronicleRite(save.prologue!.chronicle, { id: "unguided-hunt-recognition", sourceId: "chronicle.rite.unguided-hunt" }) : null;
  if (rite && !rite.accepted) return null;
  return { ...save, soloV68, profile: { ...save.profile, playTimeSeconds: save.profile.playTimeSeconds + Math.max(0, Math.floor(next.tick / 60) - Math.floor(old.tick / 60)) }, prologue: rite ? { ...save.prologue!, chronicle: rite.state } : save.prologue };
}
export const withSoloV68Checkpoint = (save: SoloV68Save, state: SoloV68State, now = new Date().toISOString()) => advance(save, state, [], now);
export const withSoloV68Progress = (save: SoloV68Save, receipts: readonly SoloV68Receipt[], state: SoloV68State, now = new Date().toISOString()) => advance(save, state, receipts, now);
export const soloV68NeedsScene = (progress: SoloV68Campaign | null | undefined) => progress?.status === "active";
