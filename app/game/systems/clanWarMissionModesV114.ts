import { WAR_UNITS_V85 } from "./clanWarV85Data";
import { warTerritoriesForSimulationV96, type WarSimulationV85 } from "./clanWarV85";

/** V114 is an independent V3 exercise: its resources/actors never mutate campaign or V85 archives. */
export type WarMissionModeV114 = "line" | "dispatch" | "stealth" | "rts";
export type WarMissionPhaseV114 = "active" | "victory" | "defeat";
export interface WarMissionTemplateV114 {
  id: string; mode: WarMissionModeV114; title: string; briefing: string; objective: string; threat: number; durationMs?: number;
}
export const WAR_MISSION_TEMPLATES_V114: readonly WarMissionTemplateV114[] = [
  { id: "W114-L01", mode: "line", title: "La brèche des veilleurs", briefing: "Une passe fortifiée abrite des combattants déclarés. Fixer le front sans toucher les foyers.", objective: "Abattre le poste de combat adverse", threat: 1 },
  { id: "W114-L02", mode: "line", title: "La contre-poussée des forges", briefing: "Une colonne rivale marche sur notre porte. Déployer des réserves et préserver le poste.", objective: "Briser les défenses de combat sans perdre la base", threat: 2 },
  { id: "W114-L03", mode: "line", title: "Le dernier seuil", briefing: "Une succession d'échelons militaires garde le dernier passage. Les vétérans coûtent plus de commandement.", objective: "Détruire la position ennemie", threat: 3 },
  { id: "W114-D01", mode: "dispatch", title: "Les yeux de la passe", briefing: "Envoyer un détachement faire rapport, sans démasquer une garnison cachée.", objective: "Obtenir un compte rendu de reconnaissance", threat: 1, durationMs: 120000 },
  { id: "W114-D02", mode: "dispatch", title: "La garde des porteurs", briefing: "Une escorte protège un lot identifié sur une route contestée.", objective: "Rapporter l'état du convoi", threat: 2, durationMs: 300000 },
  { id: "W114-D03", mode: "dispatch", title: "Le signal des disparus", briefing: "Un groupe recherche une patrouille perdue et évalue le risque de repli.", objective: "Rapporter les traces et le sort du détachement", threat: 3, durationMs: 600000 },
  { id: "W114-S01", mode: "stealth", title: "Éteindre le relais", briefing: "Neutraliser un transmetteur militaire, puis sortir sans alerter les sentinelles.", objective: "Approcher, neutraliser et rejoindre l'extraction", threat: 1 },
  { id: "W114-S02", mode: "stealth", title: "Les coordonnées trompeuses", briefing: "Altérer le relais d'observation adverse avant l'arrivée d'une colonne.", objective: "Saboter un relais et quitter la zone", threat: 2 },
  { id: "W114-S03", mode: "stealth", title: "Une nuit sans trace", briefing: "Faire tomber un émetteur sous surveillance. La discrétion prime sur les trophées.", objective: "Saboter sans laisser l'alerte atteindre son seuil", threat: 3 },
  { id: "W114-R01", mode: "rts", title: "Les deux promontoires", briefing: "Commander des groupes de combat en vue de dessus et tenir deux points d'appui.", objective: "Conserver deux points simultanément", threat: 1 },
  { id: "W114-R02", mode: "rts", title: "La ligne des crêtes", briefing: "Occuper les reliefs avant l'arrivée des renforts ennemis.", objective: "Tenir les postes tactiques", threat: 2 },
  { id: "W114-R03", mode: "rts", title: "Le front total", briefing: "Une force organisée conteste chaque accès du secteur.", objective: "Emporter les deux objectifs malgré les renforts", threat: 3 },
];
export const WAR_MISSION_STORAGE_PREFIX_V114 = "yautja.clan-war.missions.v114.free.";
export const warMissionStorageKeyV114 = (planetId: string) => WAR_MISSION_STORAGE_PREFIX_V114 + planetId;
export interface WarMissionReportV114 {
  id: string; templateId: string; mode: WarMissionModeV114; planetId: string;
  fromId: string; targetId: string; success: boolean; losses: number;
  text: string; at: number;
}
export interface WarDispatchV114 {
  id: string; templateId: string; fromId: string; targetId: string;
  startedAt: number; dueAt: number; members: { id: string; xp: number }[];
  status: "running" | "resolved"; result: "success" | "failure" | null; losses: number;
}
export interface WarMissionBoardV114 {
  version: 1; context: "free"; planetId: string; revision: number;
  rav: number; intel: number; readiness: number; sabotage: number;
  reports: WarMissionReportV114[]; dispatches: WarDispatchV114[]; receipts: string[];
}
const bounded = (value: number, a: number, b: number) => Math.min(b, Math.max(a, value));
const finite = (value: unknown): value is number => typeof value === "number" && Number.isFinite(value);
export function createWarMissionBoardV114(planetId: string): WarMissionBoardV114 {
  return { version: 1, context: "free", planetId, revision: 0, rav: 50, intel: 0, readiness: 50, sabotage: 0, reports: [], dispatches: [], receipts: [] };
}
/** A future or malformed local save is preserved by the UI and never silently replaced. */
export function readWarMissionBoardV114(raw: unknown, planetId: string): WarMissionBoardV114 | null {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return null;
  const x = raw as Partial<WarMissionBoardV114>;
  if (x.version !== 1 || x.context !== "free" || x.planetId !== planetId || (typeof x.revision !== "number" || !Number.isSafeInteger(x.revision)) || (x.revision ?? -1) < 0 || (x.revision ?? 0) > 100000) return null;
  if (![x.rav, x.intel, x.readiness, x.sabotage].every(n => finite(n) && n >= 0 && n <= 10000)) return null;
  if (!Array.isArray(x.reports) || x.reports.length > 256 || !x.reports.every(r => r && typeof r.id === "string" && r.id.length <= 120 && typeof r.text === "string" && r.text.length <= 1000 && finite(r.at) && typeof r.success === "boolean" && finite(r.losses) && WAR_MISSION_TEMPLATES_V114.some(t => t.id === r.templateId && t.mode === r.mode))) return null;
  if (!Array.isArray(x.dispatches) || x.dispatches.length > 50 || !x.dispatches.every(d => d && typeof d.id === "string" && d.id.length <= 120 && WAR_MISSION_TEMPLATES_V114.some(t => t.id === d.templateId && t.mode === "dispatch") && finite(d.startedAt) && finite(d.dueAt) && d.dueAt > d.startedAt && ["running", "resolved"].includes(d.status) && [null, "success", "failure"].includes(d.result) && finite(d.losses) && d.losses >= 0 && Array.isArray(d.members) && d.members.length > 0 && d.members.length <= 8 && d.members.every(m => m && typeof m.id === "string" && finite(m.xp)))) return null;
  if (!Array.isArray(x.receipts) || x.receipts.length > 256 || !x.receipts.every(id => typeof id === "string" && id.length <= 120)) return null;
  return x as WarMissionBoardV114;
}
function recordMissionV114(board: WarMissionBoardV114, report: WarMissionReportV114): WarMissionBoardV114 {
  if (board.receipts.includes(report.id) || board.receipts.length >= 256 || board.revision >= 100000) return board;
  const delta = report.success ? 1 : -1;
  return {
    ...board, revision: board.revision + 1,
    rav: bounded(board.rav + (report.success ? (report.mode === "dispatch" ? 8 : 5) : -3), 0, 200),
    intel: bounded(board.intel + (report.success && (report.mode === "stealth" || report.mode === "dispatch") ? 8 : 0), 0, 100),
    readiness: bounded(board.readiness + delta * 4 - report.losses * 2, 0, 100),
    sabotage: bounded(board.sabotage + (report.success && report.mode === "stealth" ? 12 : 0), 0, 100),
    reports: [...board.reports.slice(-254), report],
    receipts: [...board.receipts.slice(-254), report.id],
  };
}
export function finishWarMissionV114(board: WarMissionBoardV114, report: WarMissionReportV114): WarMissionBoardV114 {
  if (report.planetId !== board.planetId || !WAR_MISSION_TEMPLATES_V114.some(t => t.id === report.templateId && t.mode === report.mode)) return board;
  if (!finite(report.at) || report.at < 0 || !Number.isSafeInteger(report.losses) || report.losses < 0 || report.losses > 8 || typeof report.success !== "boolean") return board;
  if (!report.id || report.id.length > 120 || report.text.length > 1000) return board;
  return recordMissionV114(board, report);
}
function stableHash(text: string) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) h = Math.imul(h ^ text.charCodeAt(i), 16777619);
  return h >>> 0;
}
export function issueWarDispatchV114(board: WarMissionBoardV114, simulation: WarSimulationV85, templateId: string, fromId: string, targetId: string, memberIds: readonly string[], now: number): { board: WarMissionBoardV114; error: string | null } {
  const template = WAR_MISSION_TEMPLATES_V114.find(t => t.id === templateId && t.mode === "dispatch");
  if (!template || !finite(now) || now < 0) return { board, error: "Mandat ou horodatage invalide." };
  if ((simulation.planetId ?? "korthas") !== board.planetId) return { board, error: "Le front sélectionné a changé." };
  const from = warTerritoriesForSimulationV96(simulation).find(t => t.id === fromId);
  if (!from || !from.neighbors.includes(targetId) || simulation.territories[fromId]?.controller !== "CON-F01") return { board, error: "Le départ doit être contrôlé et adjacent à l'objectif." };
  if (memberIds.length < 1 || memberIds.length > 8 || new Set(memberIds).size !== memberIds.length) return { board, error: "Choisissez de une à huit personnes distinctes." };
  if (board.dispatches.filter(d => d.status === "running").length >= 3) return { board, error: "Trois détachements sont déjà en opération." };
  const booked = new Set([...board.dispatches.filter(d => d.status === "running").flatMap(d => d.members.map(m => m.id)), ...simulation.orders.flatMap(o => o.combatantIds)]);
  const members = memberIds.map(id => simulation.combatants.find(p => p.id === id));
  if (members.some(p => !p || p.factionId !== "CON-F01" || p.territoryId !== fromId || p.status !== "fit" || p.trainingUntilTurn !== null || booked.has(p.id))) return { board, error: "Au moins une personne est absente, indisponible ou déjà engagée." };
  if (board.rav < 5 || board.revision >= 100000) return { board, error: "Le budget autonome ou le journal ne permet plus de départ." };
  const id = "disp-" + board.planetId + "-" + board.revision + "-" + Math.floor(now);
  const order: WarDispatchV114 = {
    id, templateId, fromId, targetId, startedAt: now, dueAt: now + template.durationMs!,
    members: members.map(p => ({ id: p!.id, xp: p!.xp })), status: "running", result: null, losses: 0,
  };
  return { board: { ...board, revision: board.revision + 1, rav: board.rav - 5, dispatches: [...board.dispatches.slice(-49), order] }, error: null };
}
export function resolveWarDispatchesV114(board: WarMissionBoardV114, now: number): WarMissionBoardV114 {
  if (!finite(now)) return board;
  let next = board;
  for (const operation of board.dispatches) {
    if (operation.status !== "running" || now < operation.dueAt) continue;
    const threat = WAR_MISSION_TEMPLATES_V114.find(t => t.id === operation.templateId)!.threat;
    const roll = stableHash(operation.id + ":" + operation.members.map(m => m.id).join(",")) % 100;
    const strength = bounded(35 + operation.members.length * 9 + Math.floor(operation.members.reduce((n, m) => n + m.xp, 0) / 35) - threat * 13, 8, 95);
    const success = roll < strength;
    const losses = success ? (roll % 7 === 0 ? 1 : 0) : Math.min(operation.members.length, 1 + (roll % 2));
    next = { ...next, dispatches: next.dispatches.map(d => d.id === operation.id ? { ...d, status: "resolved" as const, result: success ? ("success" as const) : ("failure" as const), losses } : d) };
    next = recordMissionV114(next, {
      id: operation.id, templateId: operation.templateId, mode: "dispatch", planetId: board.planetId,
      fromId: operation.fromId, targetId: operation.targetId, success, losses, at: operation.dueAt,
      text: success ? "Le détachement est revenu avec un rapport d'opération." : "Opération échouée. Pertes simulées à vérifier lors d'un vrai ordre stratégique.",
    });
  }
  return next;
}
export interface WarLineActorV114 { id: string; side: "own" | "enemy"; role: number; x: number; hp: number }
export interface WarLineV114 { tick: number; ap: number; ownBase: number; enemyBase: number; lastSpecial: number; seed: number; seq: number; actors: WarLineActorV114[]; phase: WarMissionPhaseV114 }
export const WAR_LINE_ROSTER_V114 = WAR_UNITS_V85.slice(0, 6).map((unit, index) => ({
  id: unit.id, title: unit.name, role: unit.role, cost: bounded(18 + unit.command * 9 + Math.ceil(unit.materials / 6), 20, 95),
  hp: bounded(16 + unit.command * 3, 18, 50), damage: bounded(3 + Math.ceil(unit.command / 2), 4, 11),
  range: index % 3 === 2 ? 13 : 6, speed: index % 3 === 1 ? 3 : 2,
}));
export function createWarLineV114(seed = 1, readiness = 50, threat = 1): WarLineV114 {
  return { tick: 0, ap: bounded(75 + Math.floor(readiness / 5), 0, 160), ownBase: 100, enemyBase: 85 + threat * 15, lastSpecial: -25, seed: seed + threat, seq: 0, actors: [], phase: "active" };
}
export function deployWarLineV114(state: WarLineV114, role: number): WarLineV114 {
  const def = WAR_LINE_ROSTER_V114[role];
  if (!def || state.phase !== "active" || state.ap < def.cost || state.actors.length >= 48) return state;
  return { ...state, ap: state.ap - def.cost, seq: state.seq + 1, actors: [...state.actors, { id: "own-" + (state.seq + 1), side: "own", role, x: 6, hp: def.hp }] };
}
export function activateWarLineSupportV114(state: WarLineV114): WarLineV114 {
  if (state.phase !== "active" || state.tick - state.lastSpecial < 22) return state;
  let remaining = 2;
  return { ...state, lastSpecial: state.tick, actors: state.actors.map(a => {
    if (a.side !== "enemy" || remaining <= 0) return a;
    remaining--; return { ...a, hp: a.hp - 20 };
  }).filter(a => a.hp > 0) };
}
export function stepWarLineV114(state: WarLineV114): WarLineV114 {
  if (state.phase !== "active") return state;
  const tick = state.tick + 1;
  const units = state.actors.map(a => ({ ...a }));
  const front = WAR_LINE_ROSTER_V114;
  if (front.length && tick % 7 === 0 && units.length < 48) {
    const role = (state.seed + Math.floor(tick / 7)) % front.length;
    units.push({ id: "enemy-" + tick, side: "enemy", role, x: 94, hp: front[role].hp });
  }
  let ownBase = state.ownBase, enemyBase = state.enemyBase;
  const harm = new Map<string, number>();
  for (const actor of units) {
    const def = front[actor.role];
    if (!def) continue;
    const target = units.filter(other => other.side !== actor.side && other.hp > 0).sort((a, b) => Math.abs(a.x - actor.x) - Math.abs(b.x - actor.x))[0];
    if (target && Math.abs(target.x - actor.x) <= def.range) harm.set(target.id, (harm.get(target.id) ?? 0) + def.damage);
    else if (!target && (actor.side === "own" ? actor.x >= 91 : actor.x <= 9)) {
      if (actor.side === "own") enemyBase -= def.damage;
      else ownBase -= def.damage;
    } else actor.x = bounded(actor.x + (actor.side === "own" ? def.speed : -def.speed), 2, 98);
  }
  const actors = units.map(a => ({ ...a, hp: a.hp - (harm.get(a.id) ?? 0) })).filter(a => a.hp > 0);
  return { ...state, tick, ap: bounded(state.ap + 6, 0, 160), ownBase: Math.max(0, ownBase), enemyBase: Math.max(0, enemyBase), actors, phase: enemyBase <= 0 ? "victory" : ownBase <= 0 || tick >= 300 ? "defeat" : "active" };
}
export interface WarStealthGuardV114 { id: string; x: number; y: number; axis: "x" | "y"; direction: 1 | -1 }
export interface WarStealthV114 { x: number; y: number; tick: number; energy: number; cloak: boolean; crouch: boolean; alarm: number; planted: boolean; guards: WarStealthGuardV114[]; phase: WarMissionPhaseV114 }
export const WAR_STEALTH_WIDTH_V114 = 12, WAR_STEALTH_HEIGHT_V114 = 8;
export const WAR_STEALTH_WALLS_V114 = new Set(["4,1", "4,2", "4,3", "4,4", "6,5", "7,5", "8,5", "6,1", "6,2"]);
export function createWarStealthV114(): WarStealthV114 {
  return { x: 1, y: 6, tick: 0, energy: 10, cloak: false, crouch: false, alarm: 0, planted: false,
    guards: [{ id: "g1", x: 8, y: 3, axis: "x", direction: 1 }, { id: "g2", x: 3, y: 5, axis: "y", direction: -1 }], phase: "active" };
}
function sightBlocked(x: number, y: number, gx: number, gy: number) {
  if (x === gx) for (let yy = Math.min(y, gy) + 1; yy < Math.max(y, gy); yy++) if (WAR_STEALTH_WALLS_V114.has(x + "," + yy)) return true;
  if (y === gy) for (let xx = Math.min(x, gx) + 1; xx < Math.max(x, gx); xx++) if (WAR_STEALTH_WALLS_V114.has(xx + "," + y)) return true;
  return false;
}
export function actWarStealthV114(state: WarStealthV114, action: "up" | "down" | "left" | "right" | "cloak" | "crouch" | "interact"): WarStealthV114 {
  if (state.phase !== "active") return state;
  if (action === "cloak") return { ...state, cloak: !state.cloak && state.energy > 0 };
  if (action === "crouch") return { ...state, crouch: !state.crouch };
  const dx = action === "left" ? -1 : action === "right" ? 1 : 0;
  const dy = action === "up" ? -1 : action === "down" ? 1 : 0;
  const x = state.x + dx, y = state.y + dy;
  if (action !== "interact" && (x < 0 || x >= WAR_STEALTH_WIDTH_V114 || y < 0 || y >= WAR_STEALTH_HEIGHT_V114 || WAR_STEALTH_WALLS_V114.has(x + "," + y))) return state;
  const planted = state.planted || (action === "interact" && Math.abs(state.x - 9) + Math.abs(state.y - 1) <= 1);
  const nextTick = state.tick + 1;
  const guards = state.guards.map(g => {
    const low = g.id === "g1" ? 7 : 3, high = g.id === "g1" ? 10 : 6;
    const position = g.axis === "x" ? g.x : g.y;
    const direction: 1 | -1 = position >= high ? -1 : position <= low ? 1 : g.direction;
    return { ...g, direction, x: g.axis === "x" ? g.x + direction : g.x, y: g.axis === "y" ? g.y + direction : g.y };
  });
  const energy = bounded(state.energy + (state.cloak ? -2 : 1), 0, 10);
  const cloak = state.cloak && energy > 0;
  const spotted = guards.some(g => {
    const distance = Math.abs(g.x - x) + Math.abs(g.y - y);
    return distance <= (state.crouch ? 1 : 3) && (g.x === x || g.y === y || distance <= 1) && !sightBlocked(x, y, g.x, g.y) && !cloak;
  });
  const alarm = bounded(state.alarm + (spotted ? 1 : -1), 0, 5);
  return { ...state, x: action === "interact" ? state.x : x, y: action === "interact" ? state.y : y,
    tick: nextTick, guards, energy, cloak, alarm, planted, phase: alarm >= 4 ? "defeat" : planted && x === 1 && y === 6 ? "victory" : "active" };
}
export interface WarRtsUnitV114 { id: string; side: "own" | "enemy"; x: number; y: number; targetX: number; targetY: number; hp: number; cooldown: number }
export interface WarRtsV114 { tick: number; points: number; leftCapture: number; rightCapture: number; hold: number; seq: number; units: WarRtsUnitV114[]; phase: WarMissionPhaseV114 }
export const WAR_RTS_WIDTH_V114 = 11, WAR_RTS_HEIGHT_V114 = 7;
export function createWarRtsV114(rav = 50): WarRtsV114 {
  return { tick: 0, points: bounded(65 + rav, 50, 130), leftCapture: 0, rightCapture: 0, hold: 0, seq: 4, phase: "active",
    units: [
      { id: "own-1", side: "own", x: 1, y: 2, targetX: 3, targetY: 3, hp: 34, cooldown: 0 },
      { id: "own-2", side: "own", x: 1, y: 4, targetX: 3, targetY: 3, hp: 34, cooldown: 0 },
      { id: "enemy-3", side: "enemy", x: 9, y: 2, targetX: 7, targetY: 3, hp: 34, cooldown: 0 },
      { id: "enemy-4", side: "enemy", x: 9, y: 4, targetX: 7, targetY: 3, hp: 34, cooldown: 0 },
    ] };
}
export function orderWarRtsV114(state: WarRtsV114, id: string, x: number, y: number): WarRtsV114 {
  if (state.phase !== "active" || !Number.isInteger(x) || !Number.isInteger(y) || x < 0 || y < 0 || x >= WAR_RTS_WIDTH_V114 || y >= WAR_RTS_HEIGHT_V114) return state;
  if (!state.units.some(u => u.id === id && u.side === "own")) return state;
  return { ...state, units: state.units.map(u => u.id === id ? { ...u, targetX: x, targetY: y } : u) };
}
export function deployWarRtsV114(state: WarRtsV114): WarRtsV114 {
  if (state.phase !== "active" || state.points < 35 || state.units.filter(u => u.side === "own").length >= 9) return state;
  const id = "own-" + (state.seq + 1);
  return { ...state, points: state.points - 35, seq: state.seq + 1,
    units: [...state.units, { id, side: "own", x: 0, y: 3, targetX: 3, targetY: 3, hp: 32, cooldown: 0 }] };
}
export function stepWarRtsV114(state: WarRtsV114): WarRtsV114 {
  if (state.phase !== "active") return state;
  const units = state.units.map(u => ({ ...u, cooldown: Math.max(0, u.cooldown - 1) }));
  const tick = state.tick + 1;
  if (tick % 12 === 0 && units.filter(u => u.side === "enemy").length < 9) units.push({ id: "enemy-" + tick, side: "enemy", x: 10, y: 3, targetX: tick % 24 ? 7 : 3, targetY: 3, hp: 30, cooldown: 0 });
  const harm = new Map<string, number>();
  for (const unit of units) {
    const target = units.filter(u => u.side !== unit.side).sort((a, b) => (Math.abs(a.x - unit.x) + Math.abs(a.y - unit.y)) - (Math.abs(b.x - unit.x) + Math.abs(b.y - unit.y)))[0];
    if (target && Math.abs(target.x - unit.x) + Math.abs(target.y - unit.y) <= 2) {
      if (unit.cooldown === 0) { harm.set(target.id, (harm.get(target.id) ?? 0) + 5); unit.cooldown = 2; }
    } else {
      const tx = unit.side === "enemy" ? (state.leftCapture > 4 ? 3 : 7) : unit.targetX;
      const ty = unit.side === "enemy" ? 3 : unit.targetY;
      if (unit.x !== tx) unit.x += unit.x < tx ? 1 : -1;
      else if (unit.y !== ty) unit.y += unit.y < ty ? 1 : -1;
    }
  }
  const alive = units.map(u => ({ ...u, hp: u.hp - (harm.get(u.id) ?? 0) })).filter(u => u.hp > 0);
  const shift = (capture: number, px: number) => {
    const own = alive.some(u => u.side === "own" && Math.abs(u.x - px) + Math.abs(u.y - 3) <= 1);
    const enemy = alive.some(u => u.side === "enemy" && Math.abs(u.x - px) + Math.abs(u.y - 3) <= 1);
    return bounded(capture + (own && !enemy ? 1 : enemy && !own ? -1 : 0), -7, 7);
  };
  const leftCapture = shift(state.leftCapture, 3), rightCapture = shift(state.rightCapture, 7);
  const hold = leftCapture >= 6 && rightCapture >= 6 ? state.hold + 1 : 0;
  return { ...state, tick, points: bounded(state.points + 3, 0, 140), seq: state.seq, units: alive, leftCapture, rightCapture, hold,
    phase: hold >= 6 ? "victory" : (leftCapture <= -7 && rightCapture <= -7 && tick >= 25) || tick >= 450 ? "defeat" : "active" };
}
