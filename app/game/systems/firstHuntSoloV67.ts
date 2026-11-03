/** Original clan assessment, not a universal canon rite. Fixed 60 Hz, no storage or rank grants. */
export const SOLO_V67_PHASES = ["briefing", "preparation", "tracks", "approach", "encounter", "setback", "proof", "return", "debrief", "complete"] as const;
export type SoloV67Phase = typeof SOLO_V67_PHASES[number];
export type SoloV67Route = "ridge" | "ravine";
export const SOLO_V67_PROOFS = ["departure", "prepared", "first-sign", "second-sign", "identified", "mastered", "proof-secured", "returned", "mentor-report"] as const;
export type SoloV67Proof = typeof SOLO_V67_PROOFS[number];
export interface SoloV67Receipt { id: SoloV67Proof; sourceId: "solo.unguided-hunt.v67"; tick: number }
export interface SoloV67Actor { x: number; y: number; vx: number; vy: number; facing: -1 | 1; health: number; invulnerable: number; strike: number; cooldown: number }
export interface SoloV67Prey { x: number; facing: -1 | 1; phase: "watch" | "telegraph" | "charge" | "recover" | "retreat" | "gone"; timer: number; touches: number; dodges: number; chargeHit: boolean }
export interface SoloV67State {
  version: 1; phase: SoloV67Phase; tick: number; phaseStartedAt: number; route: SoloV67Route | null;
  player: SoloV67Actor; prey: SoloV67Prey; clues: number; scan: number; attempts: number;
  inputArmed: boolean; previousJump: boolean; previousInteract: boolean; previousAttack: boolean;
  milestones: Partial<Record<SoloV67Proof, number>>;
}
export interface SoloV67Input { move?: -1 | 0 | 1; jump?: boolean; attack?: boolean; interact?: boolean }
export interface SoloV67Environment { assetsReady: boolean; pageVisible: boolean; paused: boolean }
export const SOLO_V67_WORLD = { width: 3800, height: 540, ground: 430, left: 65, right: 3710, mentorX: 160, recoveryX: 2250, identifyX: 2380, proofX: 3000 } as const;
export const SOLO_V67_PREPARATION = [
  { route: "ridge", x: 380, label: "Par les crêtes", description: "Deux affleurements hauts, vue dégagée sur les empreintes. Observe avant de franchir." },
  { route: "ravine", x: 560, label: "Par le ravin", description: "Trois obstacles plus bas, piste interrompue entre les roches. Relie les marques." },
] as const;
export const SOLO_V67_CLUES = [1200, 1900] as const;
// The narrowest logical viewport is 320px. Combat centers the actor, so either
// native orientation is visible before the 48-tick warning, including the return charge.
export const SOLO_V67_ENGAGE_DISTANCE = 150;
export function soloV67CameraX(s: Pick<SoloV67State, "phase" | "player">, viewportWidth: number) {
  const ratio = ["encounter", "setback", "proof"].includes(s.phase) ? .5 : .39;
  return Math.max(0, Math.min(SOLO_V67_WORLD.width - viewportWidth, s.player.x - viewportWidth * ratio));
}
export const soloV67Rocks = (route: SoloV67Route | null) => route === "ridge" ? [
  { x: 810, y: 350, width: 120, height: 80 }, { x: 1470, y: 317, width: 145, height: 113 },
] : route === "ravine" ? [
  { x: 820, y: 382, width: 185, height: 48 }, { x: 1380, y: 359, width: 100, height: 71 }, { x: 1600, y: 382, width: 135, height: 48 },
] : [];
const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const finite = (v: unknown, lo: number, hi: number): v is number => typeof v === "number" && Number.isFinite(v) && v >= lo && v <= hi;
const integer = (v: unknown, lo: number, hi: number): v is number => finite(v, lo, hi) && Number.isSafeInteger(v);
const freshPrey = (): SoloV67Prey => ({ x: 3010, facing: -1, phase: "watch", timer: 0, touches: 0, dodges: 0, chargeHit: false });
export function createSoloV67State(): SoloV67State {
  return { version: 1, phase: "briefing", tick: 0, phaseStartedAt: 0, route: null,
    player: { x: 125, y: 430, vx: 0, vy: 0, facing: 1, health: 100, invulnerable: 0, strike: 0, cooldown: 0 },
    prey: freshPrey(), clues: 0, scan: 0, attempts: 1, inputArmed: false, previousJump: false, previousInteract: false, previousAttack: false, milestones: {} };
}
export function soloV67ProofCount(s: Pick<SoloV67State, "phase" | "clues">) {
  if (s.phase === "briefing") return 0;
  if (s.phase === "preparation") return 1;
  if (s.phase === "tracks") return 2 + s.clues;
  if (s.phase === "approach") return 4;
  if (s.phase === "encounter" || s.phase === "setback") return 5;
  return s.phase === "proof" ? 6 : s.phase === "return" ? 7 : s.phase === "debrief" ? 8 : 9;
}
export function soloV67Receipts(s: SoloV67State): SoloV67Receipt[] {
  return SOLO_V67_PROOFS.slice(0, soloV67ProofCount(s)).map(id => ({ id, sourceId: "solo.unguided-hunt.v67", tick: s.milestones[id]! }));
}
export function normalizeSoloV67State(v: unknown): SoloV67State | null {
  if (!record(v) || v.version !== 1 || !SOLO_V67_PHASES.some(p => p === v.phase) || !record(v.player) || !record(v.prey) || !record(v.milestones) ||
      !integer(v.tick, 0, 5_184_000) || !integer(v.phaseStartedAt, 0, v.tick) || !integer(v.clues, 0, 2) || !integer(v.scan, 0, 59) || !integer(v.attempts, 1, 999) ||
      (v.route !== null && v.route !== "ridge" && v.route !== "ravine")) return null;
  const a = v.player, b = v.prey, phase = v.phase as SoloV67Phase, route = v.route as SoloV67Route | null;
  if (!finite(a.x, SOLO_V67_WORLD.left, SOLO_V67_WORLD.right) || !finite(a.y, 170, 430) || !finite(a.vx, -3.5, 3.5) || !finite(a.vy, -12, 16) ||
      (a.facing !== -1 && a.facing !== 1) || !integer(a.health, 0, 100) || !integer(a.invulnerable, 0, 75) || !integer(a.strike, 0, 22) || !integer(a.cooldown, 0, 42) ||
      !finite(b.x, 2490, 3650) || (b.facing !== -1 && b.facing !== 1) || !["watch", "telegraph", "charge", "recover", "retreat", "gone"].some(p => p === b.phase) ||
      !integer(b.timer, 0, 240) || !integer(b.touches, 0, 3) || !integer(b.dodges, 0, 999) || typeof b.chargeHit !== "boolean") return null;
  if (soloV67Rocks(route).some(r => a.x as number > r.x - 17 + .01 && a.x as number < r.x + r.width + 17 - .01 && a.y as number > r.y + .01)) return null;
  const beforeTrail = phase === "briefing" || phase === "preparation";
  const afterMastery = ["proof", "return", "debrief", "complete"].includes(phase);
  if ((beforeTrail ? route !== null || v.clues !== 0 : route === null) ||
      (phase === "tracks" ? v.clues >= 2 : !beforeTrail && v.clues !== 2) ||
      (phase === "setback" ? a.health !== 0 : a.health === 0) ||
      (afterMastery ? b.touches !== 3 || b.dodges < 2 || !["retreat", "gone"].includes(b.phase as string) : ["retreat", "gone"].includes(b.phase as string)) ||
      (["return", "debrief", "complete"].includes(phase) && b.phase !== "gone") ||
      (!['tracks', 'approach', 'proof'].includes(phase) && v.scan !== 0)) return null;
  const count = soloV67ProofCount({ phase, clues: v.clues });
  if (Object.keys(v.milestones).length !== count) return null;
  const milestones: SoloV67State["milestones"] = {}; let previous = 0;
  for (const id of SOLO_V67_PROOFS.slice(0, count)) {
    const tick = v.milestones[id]; if (!integer(tick, 1, v.tick) || tick <= previous) return null;
    previous = tick; milestones[id] = tick;
  }
  if (previous > v.phaseStartedAt && phase !== "tracks") return null;
  return { version: 1, phase, tick: v.tick, phaseStartedAt: v.phaseStartedAt, route,
    player: { x: a.x, y: a.y, vx: a.vx, vy: a.vy, facing: a.facing, health: a.health, invulnerable: a.invulnerable, strike: a.strike, cooldown: a.cooldown },
    prey: { x: b.x, facing: b.facing, phase: b.phase as SoloV67Prey["phase"], timer: b.timer, touches: b.touches, dodges: b.dodges, chargeHit: b.chargeHit },
    clues: v.clues, scan: v.scan, attempts: v.attempts, inputArmed: false, previousJump: false, previousInteract: false, previousAttack: false, milestones };
}
export function soloV67Support(s: Pick<SoloV67State, "player" | "route">) {
  return soloV67Rocks(s.route).find(r => s.player.x > r.x - 17 && s.player.x < r.x + r.width + 17 && s.player.y <= r.y + .01)?.y ?? 430;
}
function move(s: SoloV67State, input: SoloV67Input, jumpEdge: boolean, attackEdge: boolean) {
  const a = s.player, oldX = a.x, oldY = a.y, rocks = soloV67Rocks(s.route);
  a.cooldown = Math.max(0, a.cooldown - 1); a.invulnerable = Math.max(0, a.invulnerable - 1); a.strike = Math.max(0, a.strike - 1);
  const direction = input.move === -1 || input.move === 1 ? input.move : 0;
  a.vx = direction * (s.phase === "setback" ? 2 : 3.5); if (direction) a.facing = direction;
  if (jumpEdge && a.vy === 0 && a.y === soloV67Support(s)) a.vy = -11.7;
  if (attackEdge && a.cooldown === 0 && s.phase === "encounter") { a.strike = 22; a.cooldown = 42; }
  a.x = clamp(a.x + a.vx, SOLO_V67_WORLD.left, SOLO_V67_WORLD.right);
  for (const r of rocks) if (oldY > r.y + .01 && a.x > r.x - 17 && a.x < r.x + r.width + 17) { a.x = oldX <= r.x - 17 ? r.x - 17 : r.x + r.width + 17; a.vx = 0; }
  a.vy = Math.min(16, a.vy + .52); let nextY = a.y + a.vy;
  for (const r of rocks) if (a.vy >= 0 && oldY <= r.y && nextY >= r.y && a.x > r.x - 17 && a.x < r.x + r.width + 17) { nextY = r.y; a.vy = 0; }
  if (nextY >= 430) { nextY = 430; a.vy = 0; } a.y = nextY;
}
function prey(s: SoloV67State) {
  const b = s.prey, a = s.player;
  if (b.phase === "gone") return;
  if (b.phase === "retreat") { b.facing = 1; b.x = Math.min(3650, b.x + 5); if (b.x >= 3650) { b.phase = "gone"; b.timer = 0; } return; }
  if (s.phase !== "encounter") return;
  b.timer++;
  if (b.phase === "watch" && b.timer >= 40 && a.x >= 2460 && Math.abs(b.x - a.x) <= SOLO_V67_ENGAGE_DISTANCE) { b.phase = "telegraph"; b.timer = 0; b.facing = a.x < b.x ? -1 : 1; b.chargeHit = false; }
  else if (b.phase === "telegraph" && b.timer >= 48) { b.phase = "charge"; b.timer = 0; }
  else if (b.phase === "charge") {
    b.x = clamp(b.x + b.facing * 6.5, 2490, 3390);
    if (!b.chargeHit && Math.abs(b.x - a.x) < 64 && a.y > 368 && !a.invulnerable) { a.health = Math.max(0, a.health - 25); a.invulnerable = 75; b.chargeHit = true; }
    if (b.timer >= 90 || b.x === 2490 || b.x === 3390) { if (!b.chargeHit) b.dodges++; b.phase = "recover"; b.timer = 0; }
  } else if (b.phase === "recover" && b.timer >= 105) { b.phase = "watch"; b.timer = 0; }
  b.timer = Math.min(240, b.timer);
  // A real strike is accepted only in the recovery window, in reach and facing the living target.
  if (b.phase === "recover" && a.strike === 14 && Math.abs(a.x - b.x) < 105 && a.y >= 400 && a.facing === (b.x < a.x ? -1 : 1)) b.touches = Math.min(3, b.touches + 1);
}
export function stepSoloV67(state: SoloV67State, input: SoloV67Input, env: SoloV67Environment): { state: SoloV67State; receipts: SoloV67Receipt[] } {
  const s: SoloV67State = { ...state, player: { ...state.player }, prey: { ...state.prey }, milestones: { ...state.milestones } }, receipts: SoloV67Receipt[] = [];
  const neutral = !input.move && !input.jump && !input.attack && !input.interact;
  if (!env.assetsReady || !env.pageVisible || env.paused || s.phase === "complete") { s.inputArmed = false; s.previousJump = false; s.previousInteract = false; s.previousAttack = false; return { state: s, receipts }; }
  if (!s.inputArmed) { if (neutral) s.inputArmed = true; return { state: s, receipts }; }
  const jump = input.jump === true && !s.previousJump, interact = input.interact === true && !s.previousInteract, attack = input.attack === true && !s.previousAttack;
  s.previousJump = input.jump === true; s.previousInteract = input.interact === true; s.previousAttack = input.attack === true; s.tick++;
  move(s, input, jump, attack); prey(s);
  const near = (x: number, range = 40) => Math.abs(s.player.x - x) < range && s.player.y === 430;
  const transition = (phase: SoloV67Phase) => { s.phase = phase; s.phaseStartedAt = s.tick; s.scan = 0; s.inputArmed = false; s.previousJump = false; s.previousInteract = false; s.previousAttack = false; };
  const proof = (id: SoloV67Proof) => { s.milestones[id] = s.tick; receipts.push({ id, sourceId: "solo.unguided-hunt.v67", tick: s.tick }); };
  if (s.phase === "briefing" && near(160) && interact) { proof("departure"); transition("preparation"); }
  else if (s.phase === "preparation" && interact && s.player.vx === 0) {
    const choice = SOLO_V67_PREPARATION.find(choice => near(choice.x));
    if (choice) { s.route = choice.route; proof("prepared"); transition("tracks"); }
  } else if (s.phase === "tracks") {
    s.scan = near(SOLO_V67_CLUES[s.clues]) && input.interact && s.player.vx === 0 ? s.scan + 1 : 0;
    if (s.scan >= 48) { proof(s.clues === 0 ? "first-sign" : "second-sign"); s.clues++; s.scan = 0; if (s.clues === 2) transition("approach"); else { s.inputArmed = false; s.previousInteract = false; } }
  } else if (s.phase === "approach") {
    s.scan = near(SOLO_V67_WORLD.identifyX) && input.interact && s.player.vx === 0 && s.player.facing === 1 ? s.scan + 1 : 0;
    if (s.scan >= 60) { proof("identified"); transition("encounter"); }
  } else if (s.phase === "encounter") {
    if (s.player.health === 0) { s.player.strike = 0; transition("setback"); }
    else if (s.prey.touches >= 3 && s.prey.dodges >= 2) { proof("mastered"); s.prey.phase = "retreat"; s.prey.timer = 0; transition("proof"); }
  } else if (s.phase === "setback" && near(SOLO_V67_WORLD.recoveryX) && interact) {
    s.player.health = 100; s.player.invulnerable = 0; s.player.strike = 0; s.player.cooldown = 0; s.prey = freshPrey(); s.attempts++; transition("encounter");
  } else if (s.phase === "proof") {
    s.scan = s.prey.phase === "gone" && near(SOLO_V67_WORLD.proofX) && input.interact && s.player.vx === 0 ? s.scan + 1 : 0;
    if (s.scan >= 60) { proof("proof-secured"); transition("return"); }
  } else if (s.phase === "return" && near(160) && interact) { proof("returned"); transition("debrief"); }
  else if (s.phase === "debrief" && near(160) && interact) { proof("mentor-report"); transition("complete"); }
  return { state: s, receipts };
}
export function soloV67Objective(s: SoloV67State) {
  const route = s.route === "ridge" ? "Par les crêtes" : "Par le ravin";
  if (s.phase === "briefing") return { title: "La Piste sans guide", instruction: "Prépare ton itinéraire, retrouve seul le brouteur territorial et maîtrise ses charges. Reviens avec le relevé demandé. Le maître reste au départ.", targetX: 160 };
  if (s.phase === "preparation") return { title: "Préparer la traque", instruction: "Rejoins un des deux repères et interagis à l’arrêt : les crêtes sont hautes et dégagées ; le ravin multiplie les obstacles bas. Ton choix sera conservé.", targetX: 380 };
  if (s.phase === "tracks") return { title: `${route} · indice ${s.clues + 1}/2`, instruction: "Franchis les obstacles choisis, puis maintiens Interagir à l’arrêt sur la trace. Les marques récentes mènent au gué.", targetX: SOLO_V67_CLUES[s.clues] };
  if (s.phase === "approach") return { title: "Identifier la bonne cible", instruction: "Au repère du gué, regarde vers la droite et maintiens Interagir. Tu dois relier les traces à cet animal avant de l’approcher.", targetX: SOLO_V67_WORLD.identifyX };
  if (s.phase === "encounter") return { title: "Maîtriser la rencontre", instruction: "Le brouteur baisse la tête avant sa charge. Saute pour l’éviter, puis touche-le pendant sa récupération : trois touches et deux charges évitées. Cette traque de contrôle ne demande pas sa mort.", targetX: s.prey.x };
  if (s.phase === "setback") return { title: "Repli nécessaire", instruction: "Reviens au repère avant le gué et interagis pour te rétablir puis recommencer la rencontre. Les deux indices et ton itinéraire restent acquis.", targetX: SOLO_V67_WORLD.recoveryX };
  if (s.phase === "proof") return { title: "Consigner le relevé de terrain", instruction: "Attends que l’animal se retire, puis consigne ton observation maîtrisée au gué en maintenant Interagir. Aucun crâne ni trophée de mise à mort n’est accordé.", targetX: SOLO_V67_WORLD.proofX };
  if (s.phase === "return") return { title: "Revenir sans guide", instruction: "Reprends le chemin choisi jusqu’au maître. La traque reste incomplète tant que le retour et ton compte rendu ne sont pas joués.", targetX: 160 };
  if (s.phase === "debrief") return { title: "Le maître examine le relevé", instruction: "« Tu as choisi, suivi, maîtrisé et retrouvé le chemin du retour. Le clan peut examiner ta candidature. » Interagis encore pour consigner cette traque.", targetX: 160 };
  return { title: "La Piste sans guide consignée", instruction: "La preuve est conservée. Aucune promotion automatique : la reconnaissance du clan est une étape distincte. Le rite Blooded et le vaisseau restent à venir.", targetX: null };
}
