/** A playable, original formation expedition. It never represents the Blooded rite. */
export const SOLO_V68_PHASES = ["briefing", "formation", "route", "tracks", "relay", "encounter", "setback", "shelter", "medicine", "rescue", "extraction", "return", "debrief", "recognition", "complete"] as const;
export type SoloV68Phase = typeof SOLO_V68_PHASES[number];
export type SoloV68Route = "ridge" | "ravine";
export const SOLO_V68_PROOFS = ["briefed", "triad-formed", "route-chosen", "tracks-read", "relay-crossed", "clearing-mastered", "shelter-reached", "medicomp-retrieved", "companion-stabilized", "extracted", "returned", "mentor-report", "aspirant-recognition"] as const;
export type SoloV68Proof = typeof SOLO_V68_PROOFS[number];
export interface SoloV68Receipt { id: SoloV68Proof; sourceId: "solo.cohort.v68"; tick: number }
export interface SoloV68Actor { x: number; y: number; vx: number; vy: number; facing: -1 | 1; health: number; invulnerable: number; strike: number; cooldown: number }
export interface SoloV68Companion { id: "saar" | "vek"; x: number; y: number; vx: number; vy: number; facing: -1 | 1; joined: boolean; following: boolean; injured: boolean }
export interface SoloV68Prey { x: number; facing: -1 | 1; phase: "watch" | "telegraph" | "charge" | "recover" | "retreat" | "gone"; timer: number; touches: number; dodges: number; chargeHit: boolean }
export interface SoloV68State {
  version: 1; phase: SoloV68Phase; tick: number; phaseStartedAt: number; route: SoloV68Route | null;
  player: SoloV68Actor; companions: [SoloV68Companion, SoloV68Companion]; prey: SoloV68Prey;
  scan: number; attempts: number; medicine: boolean; formationTicks: number;
  inputArmed: boolean; previousJump: boolean; previousInteract: boolean; previousAttack: boolean; previousCommand: boolean;
  milestones: Partial<Record<SoloV68Proof, number>>;
}
export interface SoloV68Input { move?: -1 | 0 | 1; jump?: boolean; attack?: boolean; interact?: boolean; command?: boolean }
export interface SoloV68Environment { assetsReady: boolean; pageVisible: boolean; paused: boolean }
export const SOLO_V68_WORLD = { width: 5480, height: 540, ground: 430, left: 65, right: 5390, mentorX: 160, medicineX: 4930, shelterX: 4500, extractionX: 5260, recoveryX: 2800 } as const;
export const SOLO_V68_PREPARATION = [
  { route: "ridge", x: 560, label: "Crête des guetteurs", description: "Deux affleurements hauts, un passage ouvert. Les trois chasseurs suivent le même itinéraire." },
  { route: "ravine", x: 730, label: "Ravin des relais", description: "Trois obstacles bas et davantage de sauts. Aucun partenaire ne reste derrière." },
] as const;
export const SOLO_V68_RELAY = [2120, 2240, 2360] as const;
export const SOLO_V68_TRACK_X = 2020;
const clamp = (n: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, n));
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const finite = (v: unknown, lo: number, hi: number): v is number => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;
const integer = (v: unknown, lo: number, hi: number): v is number => finite(v, lo, hi) && Number.isSafeInteger(v);
const freshPrey = (): SoloV68Prey => ({ x: 3560, facing: -1, phase: "watch", timer: 0, touches: 0, dodges: 0, chargeHit: false });
export const soloV68Rocks = (route: SoloV68Route | null) => route === "ridge" ? [{ x: 1040, y: 338, width: 120, height: 92 }, { x: 1510, y: 323, width: 145, height: 107 }] : route === "ravine" ? [{ x: 990, y: 382, width: 185, height: 48 }, { x: 1330, y: 365, width: 105, height: 65 }, { x: 1600, y: 379, width: 135, height: 51 }] : [];
export function createSoloV68State(): SoloV68State {
  return { version: 1, phase: "briefing", tick: 0, phaseStartedAt: 0, route: null,
    player: { x: 125, y: 430, vx: 0, vy: 0, facing: 1, health: 100, invulnerable: 0, strike: 0, cooldown: 0 },
    companions: [ { id: "saar", x: 335, y: 430, vx: 0, vy: 0, facing: -1, joined: false, following: false, injured: false }, { id: "vek", x: 440, y: 430, vx: 0, vy: 0, facing: -1, joined: false, following: false, injured: false } ],
    prey: freshPrey(), scan: 0, attempts: 1, medicine: false, formationTicks: 0,
    inputArmed: false, previousJump: false, previousInteract: false, previousAttack: false, previousCommand: false, milestones: {} };
}
export function soloV68ProofCount(s: Pick<SoloV68State, "phase">) {
  const count: Record<SoloV68Phase, number> = { briefing: 0, formation: 1, route: 2, tracks: 3, relay: 4, encounter: 5, setback: 5, shelter: 6, medicine: 7, rescue: 8, extraction: 9, return: 10, debrief: 11, recognition: 12, complete: 13 };
  return count[s.phase];
}
export function soloV68Receipts(s: SoloV68State): SoloV68Receipt[] { return SOLO_V68_PROOFS.slice(0, soloV68ProofCount(s)).map(id => ({ id, sourceId: "solo.cohort.v68", tick: s.milestones[id]! })); }
export function soloV68Support(s: Pick<SoloV68State, "route">, a: Pick<SoloV68Actor, "x" | "y">) { return soloV68Rocks(s.route).find(r => a.x > r.x - 17 && a.x < r.x + r.width + 17 && a.y <= r.y + .01)?.y ?? 430; }
export function normalizeSoloV68State(v: unknown): SoloV68State | null {
  if (!record(v) || v.version !== 1 || !SOLO_V68_PHASES.some(p => p === v.phase) || !record(v.player) || !record(v.prey) || !record(v.milestones) || !Array.isArray(v.companions) || v.companions.length !== 2 ||
      !integer(v.tick, 0, 5_184_000) || !integer(v.phaseStartedAt, 0, v.tick) || !integer(v.scan, 0, 89) || !integer(v.formationTicks, 0, 45) || !integer(v.attempts, 1, 999) || typeof v.medicine !== "boolean" ||
      (v.route !== null && v.route !== "ridge" && v.route !== "ravine")) return null;
  const phase = v.phase as SoloV68Phase, route = v.route as SoloV68Route | null, a = v.player, b = v.prey;
  const physical = (a: Record<string, unknown>) => finite(a.x, 65, 5390) && finite(a.y, 170, 430) && finite(a.vx, -3.5, 3.5) && finite(a.vy, -12, 16) && (a.facing === -1 || a.facing === 1) && !soloV68Rocks(route).some(r => (a.x as number) > r.x - 17 + .01 && (a.x as number) < r.x + r.width + 17 - .01 && (a.y as number) > r.y + .01);
  if (!physical(a) || !integer(a.health, 0, 100) || !integer(a.invulnerable, 0, 75) || !integer(a.strike, 0, 22) || !integer(a.cooldown, 0, 42) ||
      !finite(b.x, 3050, 4390) || (b.facing !== -1 && b.facing !== 1) || !["watch", "telegraph", "charge", "recover", "retreat", "gone"].some(p => p === b.phase) || !integer(b.timer, 0, 240) || !integer(b.touches, 0, 2) || !integer(b.dodges, 0, 999) || typeof b.chargeHit !== "boolean") return null;
  const companions: SoloV68Companion[] = [];
  for (let i = 0; i < 2; i++) { const c = v.companions[i]; if (!record(c) || c.id !== (i === 0 ? "saar" : "vek") || !physical(c) || typeof c.joined !== "boolean" || typeof c.following !== "boolean" || typeof c.injured !== "boolean" || (!c.joined && (c.following || c.injured)) || (c.injured && (i !== 0 || c.following || !finite(c.x, 4200, 4800) || c.y !== 430))) return null; companions.push({ id: c.id as SoloV68Companion["id"], x: c.x as number, y: c.y as number, vx: c.vx as number, vy: c.vy as number, facing: c.facing as -1 | 1, joined: c.joined, following: c.following, injured: c.injured }); }
  const count = soloV68ProofCount({ phase }), afterMastery = count >= 6, afterFormation = count >= 2;
  if ((count < 3 ? route !== null : route === null) || (afterFormation && companions.some(c => !c.joined)) || (phase === "briefing" && companions.some(c => c.joined)) ||
      (phase === "setback" ? a.health !== 0 : a.health === 0) || (afterMastery ? b.touches !== 2 || b.dodges < 2 || !["retreat", "gone"].includes(b.phase as string) : ["retreat", "gone"].includes(b.phase as string)) ||
      (count >= 7 && b.phase !== "gone") || (companions[0].injured !== ["medicine", "rescue"].includes(phase)) ||
      (v.medicine !== (phase === "rescue")) || (!['tracks', 'relay', 'medicine', 'rescue', 'recognition'].includes(phase) && v.scan !== 0) ||
      (count < 5 && phase !== "relay" && v.formationTicks !== 0) || (count >= 5 && v.formationTicks !== 45)) return null;
  if (Object.keys(v.milestones).length !== count) return null;
  const milestones: SoloV68State["milestones"] = {}; let previous = 0;
  for (const id of SOLO_V68_PROOFS.slice(0, count)) { const tick = v.milestones[id]; if (!integer(tick, 1, v.tick) || tick <= previous) return null; previous = tick; milestones[id] = tick; }
  if (previous > v.phaseStartedAt) return null;
  return { version: 1, phase, tick: v.tick, phaseStartedAt: v.phaseStartedAt, route,
    player: { x: a.x as number, y: a.y as number, vx: a.vx as number, vy: a.vy as number, facing: a.facing as -1 | 1, health: a.health, invulnerable: a.invulnerable, strike: a.strike, cooldown: a.cooldown },
    companions: companions as SoloV68State["companions"], prey: { x: b.x, facing: b.facing, phase: b.phase as SoloV68Prey["phase"], timer: b.timer, touches: b.touches, dodges: b.dodges, chargeHit: b.chargeHit }, scan: v.scan, attempts: v.attempts, medicine: v.medicine, formationTicks: v.formationTicks,
    inputArmed: false, previousJump: false, previousInteract: false, previousAttack: false, previousCommand: false, milestones };
}
function moveActor(s: SoloV68State, a: Pick<SoloV68Actor, "x" | "y" | "vx" | "vy" | "facing">, direction: -1 | 0 | 1, jump: boolean, speed: number) {
  const oldX = a.x, oldY = a.y; a.vx = direction * speed; if (direction) a.facing = direction;
  if (jump && a.vy === 0 && a.y === soloV68Support(s, a)) a.vy = -11.7;
  a.x = clamp(a.x + a.vx, 65, 5390);
  for (const r of soloV68Rocks(s.route)) if (oldY > r.y + .01 && a.x > r.x - 17 && a.x < r.x + r.width + 17) { a.x = oldX <= r.x - 17 ? r.x - 17 : r.x + r.width + 17; a.vx = 0; }
  a.vy = Math.min(16, a.vy + .52); let y = a.y + a.vy;
  for (const r of soloV68Rocks(s.route)) if (a.vy >= 0 && oldY <= r.y && y >= r.y && a.x > r.x - 17 && a.x < r.x + r.width + 17) { y = r.y; a.vy = 0; }
  if (y >= 430) { y = 430; a.vy = 0; } a.y = y;
}
function moveCompanions(s: SoloV68State) {
  const inCombat = ["encounter", "setback", "shelter"].includes(s.phase);
  s.companions.forEach((c, index) => {
    if (!c.joined || c.injured) { c.vx = 0; c.vy = 0; return; }
    const target = inCombat && s.prey.phase !== "gone" ? 2800 - index * 120 : s.player.x - 120 * (index + 1) * s.player.facing;
    const direction = c.following && Math.abs(target - c.x) > 5 ? target < c.x ? -1 : 1 : 0;
    const rock = soloV68Rocks(s.route).find(r => direction > 0 ? r.x - 17 >= c.x && r.x - 17 - c.x < 64 : r.x + r.width + 17 <= c.x && c.x - r.x - r.width - 17 < 64);
    moveActor(s, c, direction, direction !== 0 && !!rock && c.vy === 0, 3.5);
  });
}
function movePrey(s: SoloV68State) {
  const b = s.prey, a = s.player;
  if (b.phase === "gone") return;
  if (b.phase === "retreat") { b.x = Math.min(4390, b.x + 5); b.facing = 1; if (b.x === 4390) { b.phase = "gone"; b.timer = 0; } return; }
  if (s.phase !== "encounter") return;
  b.timer++;
  if (b.phase === "watch" && b.timer >= 40 && a.x >= 3020 && Math.abs(b.x - a.x) <= 150) { b.phase = "telegraph"; b.timer = 0; b.facing = a.x < b.x ? -1 : 1; b.chargeHit = false; }
  else if (b.phase === "telegraph" && b.timer >= 48) { b.phase = "charge"; b.timer = 0; }
  else if (b.phase === "charge") { b.x = clamp(b.x + b.facing * 6.5, 3050, 3990); if (!b.chargeHit && Math.abs(b.x - a.x) < 64 && a.y > 368 && !a.invulnerable) { a.health = Math.max(0, a.health - 25); a.invulnerable = 75; b.chargeHit = true; } if (b.timer >= 90 || b.x === 3050 || b.x === 3990) { if (!b.chargeHit) b.dodges++; b.phase = "recover"; b.timer = 0; } }
  else if (b.phase === "recover" && b.timer >= 105) { b.phase = "watch"; b.timer = 0; }
  b.timer = Math.min(240, b.timer);
  if (b.phase === "recover" && a.strike === 14 && Math.abs(a.x - b.x) < 105 && a.y >= 400 && a.facing === (b.x < a.x ? -1 : 1)) b.touches = Math.min(2, b.touches + 1);
}
export function stepSoloV68(state: SoloV68State, input: SoloV68Input, env: SoloV68Environment): { state: SoloV68State; receipts: SoloV68Receipt[] } {
  const s: SoloV68State = { ...state, player: { ...state.player }, companions: state.companions.map(c => ({ ...c })) as SoloV68State["companions"], prey: { ...state.prey }, milestones: { ...state.milestones } }, receipts: SoloV68Receipt[] = [];
  if (!env.assetsReady || !env.pageVisible || env.paused || s.phase === "complete") { s.inputArmed = false; s.previousJump = false; s.previousInteract = false; s.previousAttack = false; s.previousCommand = false; return { state: s, receipts }; }
  if (!s.inputArmed) { if (!input.move && !input.jump && !input.attack && !input.interact && !input.command) s.inputArmed = true; return { state: s, receipts }; }
  const jump = input.jump === true && !s.previousJump, interact = input.interact === true && !s.previousInteract, attack = input.attack === true && !s.previousAttack, command = input.command === true && !s.previousCommand;
  s.previousJump = input.jump === true; s.previousInteract = input.interact === true; s.previousAttack = input.attack === true; s.previousCommand = input.command === true; s.tick++;
  const a = s.player; a.cooldown = Math.max(0, a.cooldown - 1); a.invulnerable = Math.max(0, a.invulnerable - 1); a.strike = Math.max(0, a.strike - 1);
  if (attack && !a.cooldown && s.phase === "encounter") { a.strike = 22; a.cooldown = 42; }
  moveActor(s, a, input.move === -1 || input.move === 1 ? input.move : 0, jump, s.phase === "setback" ? 2 : 3.5);
  if (command && a.y === 430) { const c = s.companions.filter(c => c.joined && !c.injured && Math.abs(c.x - a.x) < 85).sort((c, d) => Math.abs(c.x - a.x) - Math.abs(d.x - a.x))[0]; if (c) c.following = !c.following; }
  moveCompanions(s); movePrey(s);
  const near = (x: number, range = 38) => Math.abs(a.x - x) < range && a.y === 430;
  const together = (x: number, range = 300) => s.companions.every(c => c.joined && !c.injured && c.y === 430 && Math.abs(c.x - x) < range);
  const transition = (phase: SoloV68Phase) => { s.phase = phase; s.phaseStartedAt = s.tick; s.scan = 0; s.inputArmed = false; s.previousJump = false; s.previousInteract = false; s.previousAttack = false; s.previousCommand = false; };
  const proof = (id: SoloV68Proof) => { s.milestones[id] = s.tick; receipts.push({ id, sourceId: "solo.cohort.v68", tick: s.tick }); };
  if (s.phase === "briefing" && near(160) && interact) { proof("briefed"); transition("formation"); }
  else if (s.phase === "formation" && interact) { const c = s.companions.find(c => !c.joined && near(c.x, 65)); if (c) { c.joined = true; c.following = true; } if (s.companions.every(c => c.joined)) { proof("triad-formed"); transition("route"); } }
  else if (s.phase === "route" && interact && a.vx === 0) { const route = SOLO_V68_PREPARATION.find(r => near(r.x)); if (route && together(a.x)) { s.route = route.route; proof("route-chosen"); transition("tracks"); } }
  else if (s.phase === "tracks") { s.scan = near(2020) && input.interact && a.vx === 0 && together(a.x) ? s.scan + 1 : 0; if (s.scan >= 60) { proof("tracks-read"); transition("relay"); } }
  else if (s.phase === "relay") { const actors = [s.companions[1], s.companions[0], a]; const aligned = actors.every((a, i) => Math.abs(a.x - SOLO_V68_RELAY[i]) < 35 && a.y === 430 && a.vx === 0); s.formationTicks = aligned && input.interact ? s.formationTicks + 1 : 0; s.scan = s.formationTicks; if (s.formationTicks >= 45) { proof("relay-crossed"); transition("encounter"); } }
  else if (s.phase === "encounter") { if (a.health === 0) transition("setback"); else if (s.prey.touches >= 2 && s.prey.dodges >= 2) { s.prey.phase = "retreat"; s.prey.timer = 0; proof("clearing-mastered"); transition("shelter"); } }
  else if (s.phase === "setback" && near(2800) && interact) { a.health = 100; a.invulnerable = 0; a.strike = 0; a.cooldown = 0; s.prey = freshPrey(); s.attempts++; transition("encounter"); }
  else if (s.phase === "shelter" && s.prey.phase === "gone" && near(4500) && together(a.x) && interact) { const c = s.companions[0]; c.vx = 0; c.vy = 0; c.injured = true; c.following = false; proof("shelter-reached"); transition("medicine"); }
  else if (s.phase === "medicine") { s.scan = near(4930) && input.interact && a.vx === 0 ? s.scan + 1 : 0; if (s.scan >= 45) { s.medicine = true; proof("medicomp-retrieved"); transition("rescue"); } }
  else if (s.phase === "rescue") { s.scan = near(s.companions[0].x) && input.interact && a.vx === 0 && s.medicine ? s.scan + 1 : 0; if (s.scan >= 90) { s.medicine = false; s.companions[0].injured = false; s.companions[0].following = true; proof("companion-stabilized"); transition("extraction"); } }
  else if (s.phase === "extraction" && near(5260) && together(a.x) && interact) { proof("extracted"); transition("return"); }
  else if (s.phase === "return" && near(160) && together(a.x) && interact) { proof("returned"); transition("debrief"); }
  else if (s.phase === "debrief" && near(160) && together(a.x) && interact) { proof("mentor-report"); transition("recognition"); }
  else if (s.phase === "recognition") { s.scan = near(160) && together(a.x) && a.vx === 0 && input.interact ? s.scan + 1 : 0; if (s.scan >= 90) { proof("aspirant-recognition"); transition("complete"); } }
  return { state: s, receipts };
}
export function soloV68Objective(s: SoloV68State): { title: string; instruction: string; targetX: number | null } {
  const objectives: Record<SoloV68Phase, [string, string, number | null]> = {
    briefing: ["La Cohorte des Aspirants", "Le clan examinera ta Piste sans guide après cette sortie de formation. Ramène Saar et Vek, le relevé de terrain et aucun compagnon abandonné. Parle au maître.", 160],
    formation: ["Former la triade", "Rejoins séparément Saar et Vek, puis interagis auprès de chacun. Ils suivent tes pas et franchissent les obstacles. La commande à proximité permet d’attendre ou de suivre.", s.companions.find(c => !c.joined)?.x ?? 440],
    route: ["Choisir ensemble le passage", "Rassemble les trois aspirants au repère des crêtes ou du ravin. Interagis à l’arrêt pour conserver votre itinéraire commun.", 560],
    tracks: ["Une piste, trois regards", "Franchis les affleurements puis rassemble la triade sur la branche fraîche. Maintiens Interagir à l’arrêt pour relever la piste ensemble.", 2020],
    relay: ["Les Trois Relais", "Vek, Saar et toi occupez les trois repères de gauche à droite. À l’arrêt sur le dernier repère, maintiens Interagir. Les partenaires doivent être présents sur le sol.", 2360],
    encounter: ["Ouvrir la clairière", "Les partenaires se mettent à couvert. Le brouteur télégraphie sa charge : saute pour l’éviter, puis touche-le pendant sa récupération. Deux esquives et deux touches le font se retirer vivant.", s.prey.x],
    setback: ["Le repli de la triade", "Reviens au repère de regroupement et interagis pour reprendre la rencontre. Les traces et le franchissement restent conservés ; les partenaires n’ont pas été abandonnés.", 2800],
    shelter: ["Rassembler au refuge", "Attends le retrait du brouteur, puis conduis les trois aspirants au refuge. Interagis uniquement lorsque les partenaires t’ont rejoint.", 4500],
    medicine: ["La cheville de Saar", "Saar s’est blessé sur l’éboulis et attend au refuge. Récupère le medicomp de secours au repère plus loin en maintenant Interagir. Vek peut te suivre.", 4930],
    rescue: ["Le Poids d’un compagnon", "Reviens auprès de Saar avec le medicomp. Maintiens Interagir à l’arrêt pour stabiliser sa cheville. Le secours ne compte pas tant que le soin n’est pas terminé.", s.companions[0].x],
    extraction: ["Personne ne reste derrière", "Mène Saar et Vek au dernier repère. Interagis lorsque la triade est regroupée : tous doivent pouvoir revenir avant le départ.", 5260],
    return: ["Retrouver la voie du clan", "Reparcours ton itinéraire avec les deux aspirants. Aucun retour immédiat : ramène physiquement la triade auprès du maître.", 160],
    debrief: ["Le maître écoute les trois", "« Seul, tu as retrouvé la piste. Avec les autres, tu as trouvé le chemin du retour. » Interagis auprès du maître lorsque Saar et Vek sont présents.", 160],
    recognition: ["Reconnaissance de l’Aspirant", "Le mentor examine la Piste sans guide et reçoit la triade revenue. Maintiens Interagir auprès de lui pour accepter la reconnaissance Young Blood. Le Premier Sang est une autre épreuve.", 160],
    complete: ["Young Blood · Aspirant", "Le clan a reçu les preuves et officialisé ta candidature à l’initiation. Tu n’es pas encore Blooded. Aucun vaisseau, plasma caster personnel ni trophée de mise à mort n’a été accordé.", null],
  };
  const [title, instruction, targetX] = objectives[s.phase]; return { title, instruction, targetX };
}
export function soloV68CameraX(s: Pick<SoloV68State, "phase" | "player">, viewportWidth: number) { return clamp(s.player.x - viewportWidth * (["encounter", "setback", "shelter"].includes(s.phase) ? .5 : .39), 0, Math.max(0, 5480 - viewportWidth)); }
