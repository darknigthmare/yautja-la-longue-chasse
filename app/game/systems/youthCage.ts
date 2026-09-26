import type { YouthActor, YouthPhase } from "./youthTraining";
/** Original playable rules for the user-requested small fenced youth Fosse. No adult PIT entitlement. */
export const YOUTH_CAGE_PHASES = ["cage-briefing", "cage-intro", "cage-countdown", "cage-duel", "cage-defeat", "cage-victory", "cage-reward", "cage-return", "cage-complete"] as const;
export const YOUTH_CAGE_MILESTONES = ["youth-cage-entry", "youth-cage-victory", "youth-cage-insignia", "youth-cage-return"] as const;
export const YOUTH_CAGE = { left: 190, right: 770, roofY: 225, introTicks: 120, countdownTicks: 180, resultTicks: 120, gateX: 230, rewardX: 710 } as const;
export const YOUTH_CAGE_REWARD = { id: "fosse-novice-insignia", name: "Insigne de la petite Fosse", description: "Souvenir cosmétique de ton premier duel de jeunesse. Aucun bonus de combat, rang, rite ni monnaie adulte." } as const;
export interface YouthCageProgress { version: 1; attempts: number; damageDealt: number; damageTaken: number; totalDamageTaken: number; insignia: boolean }
export const isYouthCagePhase = (phase: string): phase is typeof YOUTH_CAGE_PHASES[number] => phase.startsWith("cage-");
export const createYouthCage = (): YouthCageProgress => ({ version: 1, attempts: 1, damageDealt: 0, damageTaken: 0, totalDamageTaken: 0, insignia: false });
export const cloneYouthCage = (cage: YouthCageProgress | null | undefined): YouthCageProgress | null => cage ? { ...cage } : null;
export function retryYouthCage(cage: YouthCageProgress) { cage.attempts++; cage.damageDealt = 0; cage.damageTaken = 0; }
export function youthCageProofCount(phase: YouthPhase): number { return phase === "cage-complete" ? 4 : phase === "cage-return" ? 3 : ["cage-victory", "cage-reward"].includes(phase) ? 2 : phase === "cage-briefing" ? 0 : 1; }
export function youthCageCountdown(phaseTick: number) { return Math.max(1, 3 - Math.floor(phaseTick / 60)); }
const integer = (v: unknown, a: number, b: number): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= a && v <= b;
export function normalizeYouthCage(value: unknown, phase: YouthPhase, player: YouthActor, rival: YouthActor, phaseTick: number): YouthCageProgress | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const v = value as Record<string, unknown>;
  if (v.version !== 1 || !integer(v.attempts, 1, 1000000) || !integer(v.damageDealt, 0, 100) || !integer(v.damageTaken, 0, 100) || !integer(v.totalDamageTaken, 0, 100000000) || typeof v.insignia !== "boolean") return null;
  if (v.totalDamageTaken !== (v.attempts - 1) * 100 + v.damageTaken) return null;
  if (player.x < YOUTH_CAGE.left || player.x > YOUTH_CAGE.right || rival.x < YOUTH_CAGE.left || rival.x > YOUTH_CAGE.right || player.y < YOUTH_CAGE.roofY + 112 || rival.y < YOUTH_CAGE.roofY + 112) return null;
  const before = ["cage-briefing", "cage-intro", "cage-countdown"].includes(phase);
  if (before && (v.damageDealt !== 0 || v.damageTaken !== 0) || phase === "cage-briefing" && v.attempts !== 1) return null;
  if (phase === "cage-intro" && phaseTick >= YOUTH_CAGE.introTicks || phase === "cage-countdown" && phaseTick >= YOUTH_CAGE.countdownTicks || phase === "cage-victory" && phaseTick >= YOUTH_CAGE.resultTicks) return null;
  if (player.composure !== 100 - v.damageTaken || rival.composure !== 100 - v.damageDealt) return null;
  if (phase === "cage-defeat" ? v.damageTaken !== 100 : v.damageTaken === 100) return null;
  const won = ["cage-victory", "cage-reward", "cage-return", "cage-complete"].includes(phase);
  if (won && v.damageDealt !== 100 || before && rival.action === "ko") return null;
  if (v.insignia !== ["cage-return", "cage-complete"].includes(phase)) return null;
  return { version: 1, attempts: v.attempts, damageDealt: v.damageDealt, damageTaken: v.damageTaken, totalDamageTaken: v.totalDamageTaken, insignia: v.insignia };
}
