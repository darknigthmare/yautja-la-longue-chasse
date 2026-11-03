import type { YouthActor, YouthEvent, YouthPhase } from "./youthTraining";

/** Original guided encounter for this project, not an attested canon quest. */
export const YOUTH_PATROL_PHASES = ["patrol-briefing", "patrol-route", "patrol-ambush", "patrol-defeat", "patrol-assessment", "patrol-return", "patrol-complete"] as const;
export const YOUTH_PATROL_MILESTONES = ["youth-patrol-departure", "youth-patrol-route", "youth-patrol-encounter", "youth-patrol-evaluation", "youth-patrol-return"] as const;
export const YOUTH_PATROL_HALTS = [{ x: 280, label: "Premier repère de la patrouille" }, { x: 810, label: "Passage derrière les blocs de basalte" }] as const;
export const YOUTH_PATROL_HOLD_TICKS = 36;
export const YOUTH_PATROL_TIMING = { watch: 45, telegraph: 54, recover: 42, chargeSpeed: 6.4, requiredEvasions: 3 } as const;
export const isYouthPatrolPhase = (phase: string) => phase.startsWith("patrol-");
export interface YouthPatrolGrazer {
  x: number; direction: -1 | 1; phase: "watch" | "telegraph" | "charge" | "recover";
  ticks: number; targetX: number; hit: boolean; responded: boolean;
}
export interface YouthPatrolProgress {
  version: 1; halts: number; holdTicks: number; attempts: number; evaded: number;
  hits: number; totalHits: number; grazer: YouthPatrolGrazer;
}
const freshGrazer = (): YouthPatrolGrazer => ({ x: 120, direction: 1, phase: "watch", ticks: 0, targetX: 520, hit: false, responded: false });
export const createYouthPatrol = (): YouthPatrolProgress => ({ version: 1, halts: 0, holdTicks: 0, attempts: 1, evaded: 0, hits: 0, totalHits: 0, grazer: freshGrazer() });
export function retryYouthPatrol(patrol: YouthPatrolProgress) {
  patrol.attempts++; patrol.evaded = 0; patrol.hits = 0; patrol.grazer = freshGrazer();
}
export const cloneYouthPatrol = (patrol: YouthPatrolProgress | null | undefined) => patrol ? { ...patrol, grazer: { ...patrol.grazer } } : null;
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const integer = (v: unknown, min: number, max: number): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= min && v <= max;
export function normalizeYouthPatrol(value: unknown, phase: YouthPhase): YouthPatrolProgress | null {
  if (!record(value) || value.version !== 1 || !record(value.grazer)) return null;
  for (const [key, min, max] of [["halts", 0, 2], ["holdTicks", 0, 35], ["attempts", 1, 1000000], ["evaded", 0, 3], ["hits", 0, 3], ["totalHits", 0, 3000000]] as const) if (!integer(value[key], min, max)) return null;
  const g = value.grazer;
  if (typeof g.x !== "number" || !Number.isFinite(g.x) || g.x < 90 || g.x > 870 || typeof g.targetX !== "number" || !Number.isFinite(g.targetX) || g.targetX < 70 || g.targetX > 890 || (g.direction !== -1 && g.direction !== 1) || !["watch", "telegraph", "charge", "recover"].includes(String(g.phase)) || !integer(g.ticks, 0, 135) || typeof g.hit !== "boolean" || typeof g.responded !== "boolean") return null;
  if (Number(value.totalHits) !== (Number(value.attempts) - 1) * 3 + Number(value.hits)) return null;
  const beforeEncounter = phase === "patrol-briefing" || phase === "patrol-route";
  const afterEncounter = ["patrol-assessment", "patrol-return", "patrol-complete"].includes(phase);
  if (phase === "patrol-briefing" && (value.halts !== 0 || value.holdTicks !== 0) || phase === "patrol-route" && value.halts === 2 || !beforeEncounter && value.halts !== 2 || phase !== "patrol-route" && value.holdTicks !== 0) return null;
  if (beforeEncounter && (value.attempts !== 1 || value.evaded !== 0 || value.hits !== 0 || value.totalHits !== 0 || Object.entries(freshGrazer()).some(([key, expected]) => g[key] !== expected))) return null;
  if (afterEncounter && (value.evaded !== 3 || value.hits === 3 || g.phase !== "recover") || phase === "patrol-defeat" && value.hits !== 3 || phase === "patrol-ambush" && value.hits === 3) return null;
  return { version: 1, halts: value.halts as number, holdTicks: value.holdTicks as number, attempts: value.attempts as number, evaded: value.evaded as number, hits: value.hits as number, totalHits: value.totalHits as number,
    grazer: { x: g.x, direction: g.direction as -1 | 1, phase: g.phase as YouthPatrolGrazer["phase"], ticks: g.ticks, targetX: g.targetX, hit: g.hit, responded: g.responded } };
}
/** One visible, announced charge; no random hit, death reward or off-screen damage. */
export function stepYouthPatrolEncounter(patrol: YouthPatrolProgress, player: YouthActor, events: YouthEvent[]): "cleared" | "defeated" | null {
  const g = patrol.grazer; g.ticks++;
  if (g.phase === "watch" && g.ticks >= YOUTH_PATROL_TIMING.watch) {
    g.phase = "telegraph"; g.ticks = 0; g.direction = player.x < g.x ? -1 : 1;
    g.targetX = player.x; g.hit = false; g.responded = false;
  } else if (g.phase === "telegraph" && g.ticks >= YOUTH_PATROL_TIMING.telegraph) {
    g.phase = "charge"; g.ticks = 0;
  }
  const dodge = player.action === "dodge" && player.actionTick >= 2 && player.actionTick <= 17;
  if (g.phase === "telegraph" || g.phase === "charge") {
    g.responded ||= player.y <= 375 || dodge || Math.abs(player.x - g.targetX) >= 90;
  }
  if (g.phase === "charge") {
    g.x = Math.max(90, Math.min(870, g.x + g.direction * YOUTH_PATROL_TIMING.chargeSpeed));
    if (!g.hit && !dodge && player.y > 375 && Math.abs(player.x - g.x) <= 58) {
      g.hit = true; patrol.hits++; patrol.totalHits++;
      player.composure = Math.max(0, 100 - patrol.hits * 34);
      player.action = player.composure === 0 ? "ko" : "hurt"; player.actionTick = 0;
      player.vx = g.direction * 3; player.vy = -1.7;
      events.push({ type: "hit", actor: "rival", action: "jab", amount: 34 });
      if (player.composure === 0) return "defeated";
    }
    if (g.x === 90 || g.x === 870 || g.ticks >= 135) {
      if (!g.hit && g.responded && g.direction * (g.x - g.targetX) >= -20) patrol.evaded = Math.min(3, patrol.evaded + 1);
      g.phase = "recover"; g.ticks = 0;
    }
  }
  if (g.phase === "recover" && g.ticks >= YOUTH_PATROL_TIMING.recover) {
    if (patrol.evaded >= YOUTH_PATROL_TIMING.requiredEvasions) return "cleared";
    g.phase = "watch"; g.ticks = 0;
  }
  return null;
}
export function youthPatrolAssessment(patrol: YouthPatrolProgress): string {
  return patrol.attempts === 1 && patrol.totalHits === 0
    ? "Le maître relève trois charges évitées sans choc. Tu as gardé le groupe à distance et respecté le territoire de l’animal."
    : `Le maître relève trois charges évitées et ${patrol.attempts} tentative${patrol.attempts > 1 ? "s" : ""}. Il reprend avec toi les ${patrol.totalHits} choc${patrol.totalHits > 1 ? "s" : ""} subis : lire la menace, garder de l’espace, puis se dégager sans poursuivre l’animal.`;
}
