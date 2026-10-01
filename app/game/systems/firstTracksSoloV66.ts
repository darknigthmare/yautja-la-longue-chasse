/** Original clan exercise: a local tracking assessment, not a canonical rite or a rank grant. */
export const SOLO_V66_PHASES = ["briefing", "trail", "stalk", "setback", "return", "debrief", "complete"] as const;
export type SoloV66Phase = typeof SOLO_V66_PHASES[number];
export const SOLO_V66_PROOFS = ["departure", "fresh-tracks", "crossing-tracks", "last-tracks", "observed", "returned", "mentor-report"] as const;
export type SoloV66Proof = typeof SOLO_V66_PROOFS[number];
export const SOLO_V66_WORLD = { width: 2860, height: 540, ground: 430, playerHeight: 112, left: 65, right: 2780, mentorX: 170, retreatX: 2010, observationX: 2325 } as const;
export const SOLO_V66_ROCKS = [
  { x: 670, y: 365, width: 110, height: 65 },
  { x: 1460, y: 342, width: 150, height: 88 },
  { x: 2110, y: 359, width: 120, height: 71 },
] as const;
export const SOLO_V66_CLUES = [
  { x: 360, kind: "footprints", label: "Empreintes fraîches", reading: "Les bords sont nets et le sable est rejeté vers l’arrière. La piste continue vers la droite." },
  { x: 1120, kind: "branch", label: "Branche récemment rompue", reading: "La fibre claire est encore humide. Les marques plus basses sont anciennes : poursuis vers le second affleurement." },
  { x: 1810, kind: "stone", label: "Frottement sur le basalte", reading: "Le sable sec a été repoussé. Le brouteur est proche : utilise le rocher et observe ses retournements." },
] as const;
export const SOLO_V66_FALSE_TRAIL = { x: 1250, reading: "Cette branche est sèche et couverte de poussière. Elle ne prolonge pas les empreintes fraîches. Rien à prélever ici." } as const;
export const SOLO_V66_SCAN_TICKS = 48;
export const SOLO_V66_OBSERVE_TICKS = 90;
export interface SoloV66Input { move?: -1 | 0 | 1; jump?: boolean; quiet?: boolean; interact?: boolean; attack?: boolean }
export interface SoloV66Environment { assetsReady: boolean; pageVisible: boolean; paused: boolean }
export interface SoloV66Actor { x: number; y: number; vx: number; vy: number; facing: -1 | 1; quiet: boolean }
export interface SoloV66State {
  version: 1; phase: SoloV66Phase; tick: number; phaseStartedAt: number;
  player: SoloV66Actor; inputArmed: boolean; previousJump: boolean; previousInteract: boolean;
  clues: number; scanTicks: number; observationTicks: number; alert: number; attempts: number;
  falseTrailRead: boolean; falseScanTicks: number; notice: "none" | "old-trail" | "no-attack";
  milestones: Partial<Record<SoloV66Proof, number>>;
}
export interface SoloV66Receipt { id: SoloV66Proof; sourceId: "solo.first-tracks.v66"; tick: number }
export const createSoloV66State = (): SoloV66State => ({ version: 1, phase: "briefing", tick: 0, phaseStartedAt: 0,
  player: { x: 125, y: 430, vx: 0, vy: 0, facing: 1, quiet: false }, inputArmed: false, previousJump: false, previousInteract: false,
  clues: 0, scanTicks: 0, observationTicks: 0, alert: 0, attempts: 1, falseTrailRead: false, falseScanTicks: 0, notice: "none", milestones: {} });
const clamp = (n: number, min: number, max: number) => Math.max(min, Math.min(max, n));
const record = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);
const integer = (v: unknown, min: number, max: number): v is number => typeof v === "number" && Number.isSafeInteger(v) && v >= min && v <= max;
const finite = (v: unknown, min: number, max: number): v is number => typeof v === "number" && Number.isFinite(v) && v >= min && v <= max;
export function soloV66ProofCount(s: Pick<SoloV66State, "phase" | "clues">): number {
  return s.phase === "briefing" ? 0 : s.phase === "trail" ? 1 + s.clues : ["stalk", "setback"].includes(s.phase) ? 4 : s.phase === "return" ? 5 : s.phase === "debrief" ? 6 : 7;
}
export function soloV66Receipts(s: SoloV66State): SoloV66Receipt[] {
  return SOLO_V66_PROOFS.slice(0, soloV66ProofCount(s)).map(id => ({ id, sourceId: "solo.first-tracks.v66", tick: s.milestones[id]! }));
}
/** Strict restoration never awards facts and disarms keys. Future/malformed states are not replaced with a fresh exercise. */
export function normalizeSoloV66State(value: unknown): SoloV66State | null {
  if (!record(value) || value.version !== 1 || !SOLO_V66_PHASES.includes(value.phase as SoloV66Phase) ||
      !integer(value.tick, 0, 100000000) || !integer(value.phaseStartedAt, 0, value.tick) || !record(value.player) || !record(value.milestones) ||
      !integer(value.clues, 0, 3) || !integer(value.scanTicks, 0, SOLO_V66_SCAN_TICKS - 1) || !integer(value.falseScanTicks, 0, SOLO_V66_SCAN_TICKS - 1) ||
      !integer(value.observationTicks, 0, SOLO_V66_OBSERVE_TICKS) || !finite(value.alert, 0, 100) || !integer(value.attempts, 1, 1000000) ||
      typeof value.falseTrailRead !== "boolean" || typeof value.notice !== "string" || !["none", "old-trail", "no-attack"].includes(value.notice)) return null;
  const a = value.player;
  if (!finite(a.x, SOLO_V66_WORLD.left, SOLO_V66_WORLD.right) || !finite(a.y, 175, 430) || !finite(a.vx, -3.4, 3.4) ||
      !finite(a.vy, -12, 16) || (a.facing !== -1 && a.facing !== 1) || typeof a.quiet !== "boolean") return null;
  if (SOLO_V66_ROCKS.some(r => a.x as number > r.x - 17 + .01 && a.x as number < r.x + r.width + 17 - .01 && a.y as number > r.y + .01)) return null;
  const phase = value.phase as SoloV66Phase;
  if ((phase === "briefing" && (value.clues !== 0 || value.attempts !== 1 || value.alert !== 0)) ||
      (phase === "trail" && value.clues >= 3) || (!['briefing', 'trail'].includes(phase) && value.clues !== 3) ||
      (["return", "debrief", "complete"].includes(phase) ? value.observationTicks !== SOLO_V66_OBSERVE_TICKS : value.observationTicks >= SOLO_V66_OBSERVE_TICKS) ||
      (phase === "setback" ? value.alert !== 100 : phase === "stalk" && value.alert >= 100) ||
      (phase !== "trail" && (value.scanTicks !== 0 || value.falseScanTicks !== 0))) return null;
  const count = soloV66ProofCount({ phase, clues: value.clues });
  if (Object.keys(value.milestones).length !== count) return null;
  let previous = -1;
  const milestones: SoloV66State["milestones"] = {};
  for (const id of SOLO_V66_PROOFS.slice(0, count)) {
    const tick = value.milestones[id];
    if (!integer(tick, 1, value.tick) || tick <= previous) return null;
    previous = tick; milestones[id] = tick;
  }
  if (previous > value.phaseStartedAt && phase !== "trail") return null;
  return { version: 1, phase, tick: value.tick, phaseStartedAt: value.phaseStartedAt,
    player: { x: a.x, y: a.y, vx: a.vx, vy: a.vy, facing: a.facing as -1 | 1, quiet: a.quiet },
    inputArmed: false, previousJump: false, previousInteract: false,
    clues: value.clues, scanTicks: value.scanTicks, falseScanTicks: value.falseScanTicks, observationTicks: value.observationTicks,
    alert: value.alert, attempts: value.attempts, falseTrailRead: value.falseTrailRead, notice: value.notice as SoloV66State["notice"], milestones };
}
export function soloV66Support(player: SoloV66Actor) {
  return SOLO_V66_ROCKS.find(r => player.x > r.x - 17 && player.x < r.x + r.width + 17 && player.y <= r.y + .01) ?? { x: 0, y: 430, width: SOLO_V66_WORLD.width, height: 0 };
}
export function soloV66Grazer(s: Pick<SoloV66State, "tick">) {
  const cycle = s.tick % 540;
  return { x: 2620, y: 430, facing: (cycle < 210 ? -1 : 1) as -1 | 1, turnIn: cycle < 210 ? 210 - cycle : 540 - cycle };
}
export function soloV66Covered(s: SoloV66State) {
  const eyeY = s.player.y - (s.player.quiet ? 56 : 100), g = soloV66Grazer(s);
  return SOLO_V66_ROCKS.some(r => r.x > s.player.x && r.x + r.width < g.x && r.y <= eyeY);
}
function moveActor(s: SoloV66State, input: SoloV66Input, jumpEdge: boolean) {
  const a = s.player, oldX = a.x, oldY = a.y;
  a.quiet = input.quiet === true;
  const move = input.move === -1 || input.move === 1 ? input.move : 0;
  a.vx = move * (a.quiet ? 1.55 : 3.4); if (move) a.facing = move;
  if (jumpEdge && a.vy === 0 && (a.y === 430 || SOLO_V66_ROCKS.some(r => Math.abs(a.y - r.y) < .01))) a.vy = -11.7;
  a.x = clamp(a.x + a.vx, SOLO_V66_WORLD.left, SOLO_V66_WORLD.right);
  for (const r of SOLO_V66_ROCKS) if (oldY > r.y + .01 && a.x > r.x - 17 && a.x < r.x + r.width + 17) {
    a.x = oldX <= r.x - 17 ? r.x - 17 : r.x + r.width + 17; a.vx = 0;
  }
  a.vy = Math.min(16, a.vy + .52); let nextY = a.y + a.vy;
  for (const r of SOLO_V66_ROCKS) if (a.vy >= 0 && oldY <= r.y && nextY >= r.y && a.x > r.x - 17 && a.x < r.x + r.width + 17) { nextY = r.y; a.vy = 0; }
  if (nextY >= 430) { nextY = 430; a.vy = 0; }
  a.y = nextY;
}
export function stepSoloV66(state: SoloV66State, input: SoloV66Input, env: SoloV66Environment): { state: SoloV66State; receipts: SoloV66Receipt[] } {
  const s: SoloV66State = { ...state, player: { ...state.player }, milestones: { ...state.milestones } }, receipts: SoloV66Receipt[] = [];
  const neutral = !input.move && !input.jump && !input.quiet && !input.interact && !input.attack;
  if (!env.assetsReady || !env.pageVisible || env.paused || s.phase === "complete") {
    s.inputArmed = false; s.previousJump = false; s.previousInteract = false; return { state: s, receipts };
  }
  if (!s.inputArmed) { if (neutral) s.inputArmed = true; return { state: s, receipts }; }
  const jumpEdge = input.jump === true && !s.previousJump, interactEdge = input.interact === true && !s.previousInteract;
  s.previousJump = input.jump === true; s.previousInteract = input.interact === true; s.tick++;
  moveActor(s, input, jumpEdge);
  const near = (x: number, radius = 42) => Math.abs(s.player.x - x) < radius && s.player.y === 430;
  const transition = (phase: SoloV66Phase) => { s.phase = phase; s.phaseStartedAt = s.tick; s.inputArmed = false; s.previousJump = false; s.previousInteract = false; };
  const proof = (id: SoloV66Proof) => { s.milestones[id] = s.tick; receipts.push({ id, sourceId: "solo.first-tracks.v66", tick: s.tick }); };
  if (input.attack) s.notice = "no-attack";
  if (s.phase === "briefing" && near(SOLO_V66_WORLD.mentorX) && interactEdge) { proof("departure"); transition("trail"); }
  else if (s.phase === "trail") {
    const clue = SOLO_V66_CLUES[s.clues];
    s.scanTicks = input.interact && near(clue.x) && s.player.vx === 0 ? s.scanTicks + 1 : 0;
    s.falseScanTicks = !s.falseTrailRead && input.interact && near(SOLO_V66_FALSE_TRAIL.x) && s.player.vx === 0 ? s.falseScanTicks + 1 : 0;
    if (s.falseScanTicks >= SOLO_V66_SCAN_TICKS) { s.falseTrailRead = true; s.falseScanTicks = 0; s.notice = "old-trail"; }
    if (s.scanTicks >= SOLO_V66_SCAN_TICKS) {
      proof(SOLO_V66_PROOFS[1 + s.clues]); s.clues++; s.scanTicks = 0; s.falseScanTicks = 0; s.notice = "none";
      if (s.clues === 3) transition("stalk"); else { s.inputArmed = false; s.previousInteract = false; }
    }
  } else if (s.phase === "stalk") {
    const g = soloV66Grazer(s), distance = Math.abs(g.x - s.player.x);
    const visible = !soloV66Covered(s) && (g.facing === -1 ? s.player.x < g.x : s.player.x > g.x) && distance < 480;
    const noisy = distance < 235 && (Math.abs(s.player.vx) > 2 || s.player.vy !== 0 || input.attack);
    s.alert = clamp(s.alert + (visible || noisy ? 1.1 : -.8), 0, 100);
    const observing = near(SOLO_V66_WORLD.observationX, 32) && s.player.vx === 0 && s.player.facing === 1 && input.interact && !visible && !noisy && s.alert < 30;
    s.observationTicks = observing ? s.observationTicks + 1 : 0;
    if (s.alert >= 100) { s.observationTicks = 0; transition("setback"); }
    else if (s.observationTicks >= SOLO_V66_OBSERVE_TICKS) { proof("observed"); s.alert = 0; transition("return"); }
  } else if (s.phase === "setback" && near(SOLO_V66_WORLD.retreatX) && interactEdge) {
    s.alert = 0; s.attempts++; transition("stalk");
  } else if (s.phase === "return" && near(SOLO_V66_WORLD.mentorX) && interactEdge) { proof("returned"); transition("debrief"); }
  else if (s.phase === "debrief" && near(SOLO_V66_WORLD.mentorX) && interactEdge) { proof("mentor-report"); transition("complete"); }
  return { state: s, receipts };
}
export function soloV66Objective(s: SoloV66State) {
  if (s.phase === "briefing") return { title: "Les Premières Pistes", instruction: "Rejoins le mentor. Tu dois lire la piste, observer le brouteur sans l’affoler et revenir lui rendre compte. Aucun animal à tuer.", targetX: SOLO_V66_WORLD.mentorX };
  if (s.phase === "trail") return { title: `Piste ${s.clues + 1} / 3 — ${SOLO_V66_CLUES[s.clues].label}`, instruction: "Franchis les roches par saut. Près de l’indice, arrête-toi et maintiens Interagir. La branche sèche est une ancienne piste.", targetX: SOLO_V66_CLUES[s.clues].x };
  if (s.phase === "stalk") return { title: "Observer sans être repéré", instruction: "Reste derrière le rocher lorsque le brouteur regarde vers toi. Quand il se détourne, gagne la zone d’observation et maintiens Interagir à l’arrêt, face à lui.", targetX: SOLO_V66_WORLD.observationX };
  if (s.phase === "setback") return { title: "L’animal t’a repéré", instruction: "Replie-toi jusqu’au repère avant le dernier rocher, puis interagis pour tenter une nouvelle approche. Tes indices restent conservés.", targetX: SOLO_V66_WORLD.retreatX };
  if (s.phase === "return") return { title: "Ramener l’observation", instruction: "Le brouteur poursuit sa route. Reviens au mentor à travers les affleurements ; l’évaluation n’est pas terminée avant ton retour.", targetX: SOLO_V66_WORLD.mentorX };
  if (s.phase === "debrief") return { title: "Le compte rendu", instruction: "« Tu as relié les traces et observé sans prélever. Garde cette retenue. La chasse sans guide viendra ensuite. » Interagis de nouveau pour enregistrer l’évaluation.", targetX: SOLO_V66_WORLD.mentorX };
  return { title: "Les Premières Pistes accomplies", instruction: "L’évaluation est conservée dans ta chronique. Tu restes Unblooded. La chasse autonome, les rites et le vaisseau restent à accomplir.", targetX: null };
}
