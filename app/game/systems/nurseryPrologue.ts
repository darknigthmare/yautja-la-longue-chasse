/**
 * Pure, fixed-step Youngling opening. No rendering, assets, adult rig or storage.
 * The source describes a non-lethal nursery duel, then a camera reveal and title.
 * Tuning below is an original 2D adaptation, not a franchise combat specification.
 */
export const NURSERY_SOURCE = {
  threadId: "6aa9e35a-3288-83eb-a8bf-45d3197113bf",
  userTurnId: "7efc0ab0-c5af-4bea-a1ba-c62bc14676e2",
  continuity: "original-game-adaptation",
  artPolicy: "authored-youngling-only-no-adult-fallback",
  skeleton: "ancient-dry-hollow-centipede",
  title: "Yautja: The Long Hunt",
} as const;
export const NURSERY_TIMING = {
  tickRate: 60, readyHoldTicks: 120, arrivalTicks: 90, koTicks: 90,
  villageRevealTicks: 240, moonTitleTicks: 180,
} as const;
export const NURSERY_ARENA = {
  width: 960, height: 540, left: 96, right: 864, groundY: 414,
  playerSpawnX: 326, rivalSpawnX: 634, bladeSpawnX: 454,
  halfWidth: 19, actorHeight: 88, gravity: 0.55,
  // Spectator spikes remain outside the safe duel ring; no lethal hazard exists.
} as const;
export type NurseryPhase = "loading" | "prompt" | "arrival" | "ready" | "duel" |
  "defeat" | "ko" | "village-reveal" | "moon-title" | "complete";
export type NurseryActorId = "player" | "rival";
export type NurseryAction = "idle" | "jab" | "blade" | "throw" | "dodge" | "hurt" | "thrown" | "ko";
export interface NurseryActor {
  id: NurseryActorId;
  x: number; y: number; vx: number; vy: number; facing: -1 | 1;
  /** Non-lethal remaining composure, never a displayed health bar. */
  composure: number;
  action: NurseryAction; actionTick: number; actionHitResolved: boolean;
}
export interface NurseryActions {
  move?: -1 | 0 | 1;
  confirm?: boolean; ready?: boolean; light?: boolean; blade?: boolean;
  dodge?: boolean; throw?: boolean; pickup?: boolean; retry?: boolean;
}
type NurseryButtons = Required<Omit<NurseryActions, "move">>;
export interface NurseryEnvironment {
  /** True only after the actual Youngling and scene resources have been validated. */
  assetsReady: boolean;
  pageVisible: boolean;
  paused: boolean;
  nextChapterReady: boolean;
}
export interface NurseryState {
  version: 1;
  readyMode: "hold" | "press";
  phase: NurseryPhase; tick: number; phaseTick: number; readyTicks: number;
  inputArmed: boolean; previousButtons: NurseryButtons;
  player: NurseryActor; rival: NurseryActor;
  blade: { holder: NurseryActorId | null; x: number };
  rivalDecisionTicks: number;
  winner: NurseryActorId | null;
  duelStartedAt: number | null; knockoutAt: number | null; titleStartedAt: number | null;
  attempt: number;
}
export type NurseryEvent =
  | { type: "phase"; phase: NurseryPhase }
  | { type: "action"; actor: NurseryActorId; action: NurseryAction }
  | { type: "hit"; actor: NurseryActorId; target: NurseryActorId; action: "jab" | "blade" | "throw"; amount: number }
  | { type: "pickup"; actor: NurseryActorId }
  | { type: "knockout"; winner: NurseryActorId }
  | { type: "complete" };
export interface NurseryCompletionReceipt {
  id: "intro-completed";
  sourceId: "chronicle.intro.completed";
  sceneId: "nursery-prologue";
  attempt: number;
}
export interface NurseryStep {
  state: NurseryState;
  events: NurseryEvent[];
  /** Emitted only by the final transition, never merely by loading a checkpoint. */
  completion: NurseryCompletionReceipt | null;
}

const buttonIds = ["confirm", "ready", "light", "blade", "dodge", "throw", "pickup", "retry"] as const;
const noButtons = (): NurseryButtons => ({ confirm: false, ready: false, light: false, blade: false,
  dodge: false, throw: false, pickup: false, retry: false });
const idleActor = (id: NurseryActorId): NurseryActor => ({ id,
  x: id === "player" ? NURSERY_ARENA.playerSpawnX : NURSERY_ARENA.rivalSpawnX,
  y: NURSERY_ARENA.groundY, vx: 0, vy: 0, facing: id === "player" ? 1 : -1,
  composure: 100, action: "idle", actionTick: 0, actionHitResolved: false });
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value));
const sign = (value: number): -1 | 1 => value < 0 ? -1 : 1;
const grounded = (actor: NurseryActor) => actor.y === NURSERY_ARENA.groundY;
const idle = (actor: NurseryActor) => actor.action === "idle" && grounded(actor) && actor.composure > 0;
const clone = (state: NurseryState): NurseryState => ({ ...state, player: { ...state.player }, rival: { ...state.rival },
  blade: { ...state.blade }, previousButtons: { ...state.previousButtons } });

export function createNurseryPrologue(options: { readyMode?: "hold" | "press" } = {}): NurseryState {
  return { version: 1, readyMode: options.readyMode === "press" ? "press" : "hold", phase: "loading",
    tick: 0, phaseTick: 0, readyTicks: 0, inputArmed: false, previousButtons: noButtons(),
    player: idleActor("player"), rival: idleActor("rival"), blade: { holder: null, x: NURSERY_ARENA.bladeSpawnX },
    rivalDecisionTicks: 45, winner: null, duelStartedAt: null, knockoutAt: null, titleStartedAt: null, attempt: 1 };
}

const MOVES = {
  jab: { startup: 8, duration: 27, reach: 60, damage: 12 },
  blade: { startup: 12, duration: 34, reach: 70, damage: 14 },
  throw: { startup: 14, duration: 40, reach: 48, damage: 18 },
  dodge: { startup: 0, duration: 20, reach: 0, damage: 0 },
} as const;

function transition(state: NurseryState, phase: NurseryPhase, events: NurseryEvent[]): void {
  state.phase = phase; state.phaseTick = 0; state.readyTicks = 0;
  state.inputArmed = false; state.previousButtons = noButtons();
  state.player.vx = 0; state.rival.vx = 0;
  if (phase === "duel") state.duelStartedAt = state.tick;
  if (phase === "moon-title") state.titleStartedAt = state.tick;
  events.push({ type: "phase", phase });
}
function beginMove(actor: NurseryActor, target: NurseryActor, action: keyof typeof MOVES,
  direction: -1 | 0 | 1, events: NurseryEvent[]): void {
  if (!idle(actor)) return;
  actor.facing = sign(target.x - actor.x); actor.action = action;
  actor.actionTick = 0; actor.actionHitResolved = false;
  actor.vx = action === "dodge" ? (direction || -actor.facing) * 5.2 : 0;
  events.push({ type: "action", actor: actor.id, action });
}
function choosePlayerMove(state: NurseryState, input: Required<NurseryActions>, pressed: NurseryButtons, events: NurseryEvent[]): void {
  const actor = state.player;
  if (!idle(actor)) return;
  if (pressed.dodge) beginMove(actor, state.rival, "dodge", input.move, events);
  else if (pressed.throw) beginMove(actor, state.rival, "throw", input.move, events);
  else if (pressed.blade && state.blade.holder === "player") beginMove(actor, state.rival, "blade", input.move, events);
  else if (pressed.light) beginMove(actor, state.rival, "jab", input.move, events);
  else if (pressed.pickup && state.blade.holder === null && Math.abs(actor.x - state.blade.x) <= 42) {
    state.blade.holder = "player"; events.push({ type: "pickup", actor: "player" });
  }
  if (idle(actor)) { actor.vx = input.move * 2.8; if (input.move) actor.facing = input.move; }
}
function chooseRivalMove(state: NurseryState, events: NurseryEvent[]): void {
  const actor = state.rival; const target = state.player;
  state.rivalDecisionTicks = Math.max(0, state.rivalDecisionTicks - 1);
  if (!idle(actor)) return;
  const distance = Math.abs(actor.x - target.x);
  actor.facing = sign(target.x - actor.x);
  actor.vx = distance > 51 ? actor.facing * 1.65 : 0;
  if (state.rivalDecisionTicks > 0 || distance > 59) return;
  const variation = Math.floor(state.tick / 44) % 4;
  beginMove(actor, target, variation === 3 && distance <= 47 ? "throw" : "jab", 0, events);
  state.rivalDecisionTicks = 44;
}
function advanceActor(actor: NurseryActor): void {
  if (actor.action !== "idle") actor.actionTick++;
  const move = actor.action in MOVES ? MOVES[actor.action as keyof typeof MOVES] : null;
  if (move && actor.actionTick >= move.duration) { actor.action = "idle"; actor.actionTick = 0; actor.vx = 0; }
  if ((actor.action === "hurt" && actor.actionTick >= 16 || actor.action === "thrown" && actor.actionTick >= 28) && grounded(actor)) {
    actor.action = "idle"; actor.actionTick = 0; actor.vx = 0;
  }
  actor.x = clamp(actor.x + actor.vx, NURSERY_ARENA.left, NURSERY_ARENA.right);
  if (actor.x === NURSERY_ARENA.left || actor.x === NURSERY_ARENA.right) actor.vx = 0;
  if (actor.y < NURSERY_ARENA.groundY || actor.vy < 0) {
    actor.vy = Math.min(18, actor.vy + NURSERY_ARENA.gravity);
    actor.y = Math.min(NURSERY_ARENA.groundY, actor.y + actor.vy);
    if (grounded(actor)) actor.vy = 0;
  }
  if (actor.action === "hurt" || actor.action === "thrown" || actor.action === "ko") actor.vx *= grounded(actor) ? 0.77 : 0.985;
  if (Math.abs(actor.vx) < 0.01) actor.vx = 0;
}
function resolveSeparation(state: NurseryState): void {
  const a = state.player; const b = state.rival;
  if (!grounded(a) || !grounded(b) || a.action === "thrown" || b.action === "thrown") return;
  const separation = NURSERY_ARENA.halfWidth * 2;
  const distance = Math.abs(a.x - b.x);
  if (distance >= separation) return;
  const direction = sign(b.x - a.x); const half = (separation - distance) / 2;
  a.x = clamp(a.x - direction * half, NURSERY_ARENA.left, NURSERY_ARENA.right);
  b.x = clamp(b.x + direction * half, NURSERY_ARENA.left, NURSERY_ARENA.right);
  if (Math.abs(a.x - b.x) < separation) {
    if (a.x === NURSERY_ARENA.left || a.x === NURSERY_ARENA.right) b.x = a.x + direction * separation;
    else a.x = b.x - direction * separation;
  }
}
type Strike = { actor: NurseryActorId; target: NurseryActorId; action: "jab" | "blade" | "throw"; damage: number };
function pendingStrike(actor: NurseryActor, target: NurseryActor): Strike | null {
  if (actor.action !== "jab" && actor.action !== "blade" && actor.action !== "throw") return null;
  const move = MOVES[actor.action];
  if (actor.actionHitResolved || actor.actionTick !== move.startup) return null;
  actor.actionHitResolved = true;
  const dodging = target.action === "dodge" && target.actionTick >= 2 && target.actionTick <= 12;
  const invulnerable = target.action === "hurt" || target.action === "thrown" || target.action === "ko";
  if (dodging || invulnerable || !grounded(actor) || Math.abs(actor.y - target.y) > 30 ||
    Math.abs(actor.x - target.x) > move.reach || sign(target.x - actor.x) !== actor.facing) return null;
  return { actor: actor.id, target: target.id, action: actor.action, damage: move.damage };
}
function applyStrike(state: NurseryState, strike: Strike, events: NurseryEvent[]): void {
  const actor = state[strike.actor]; const target = state[strike.target];
  const direction = sign(target.x - actor.x);
  target.composure = Math.max(0, target.composure - strike.damage);
  target.action = target.composure === 0 ? "ko" : strike.action === "throw" ? "thrown" : "hurt";
  target.actionTick = 0; target.actionHitResolved = false;
  target.vx = direction * (strike.action === "throw" ? 8.5 : 3.2);
  target.vy = strike.action === "throw" ? -8.8 : -1.7;
  // Launch a real ballistic trajectory; no teleport or damage from scenery.
  target.y -= 0.01;
  if (target.composure === 0 && state.blade.holder === target.id) {
    state.blade.holder = null; state.blade.x = target.x;
  }
  events.push({ type: "hit", actor: strike.actor, target: strike.target, action: strike.action, amount: strike.damage });
}

/** One call is exactly one 1/60s step. Never pass elapsed background time as catch-up steps. */
export function stepNurseryPrologue(previous: NurseryState, rawInput: NurseryActions, environment: NurseryEnvironment): NurseryStep {
  const state = clone(previous); const events: NurseryEvent[] = [];
  const result: NurseryStep = { state, events, completion: null };
  const input: Required<NurseryActions> = { ...noButtons(), move: 0 };
  for (const id of buttonIds) input[id] = rawInput?.[id] === true;
  input.move = rawInput?.move === -1 || rawInput?.move === 1 ? rawInput.move : 0;
  if (environment?.paused !== false || environment?.pageVisible !== true || environment?.assetsReady !== true) {
    // Lost focus/pause cancels partial readiness and requires a neutral frame on return.
    state.readyTicks = 0; state.inputArmed = false; state.previousButtons = noButtons();
    return result;
  }
  if (state.phase === "complete") return result;
  const neutral = input.move === 0 && buttonIds.every(id => !input[id]);
  if (!state.inputArmed) {
    if (neutral) state.inputArmed = true;
    state.previousButtons = Object.fromEntries(buttonIds.map(id => [id, input[id]])) as unknown as NurseryButtons;
  }
  const pressed = noButtons();
  if (state.inputArmed) for (const id of buttonIds) pressed[id] = input[id] && !previous.previousButtons[id];
  const usable = state.inputArmed;
  state.previousButtons = Object.fromEntries(buttonIds.map(id => [id, input[id]])) as unknown as NurseryButtons;
  // Readiness and focus recovery require a full release, including movement axes.
  // Neither fighter gets a head start while the player cannot control the duel.
  // Preserve airborne momentum and do not replay this waiting time afterwards.
  if (state.phase === "duel" && !usable) return result;
  state.tick++; state.phaseTick++;

  switch (state.phase) {
    case "loading": transition(state, "prompt", events); break;
    case "prompt": if (usable && pressed.confirm) transition(state, "arrival", events); break;
    case "arrival": if (state.phaseTick >= NURSERY_TIMING.arrivalTicks) transition(state, "ready", events); break;
    case "ready":
      if (state.readyMode === "press") {
        if (usable && pressed.ready) transition(state, "duel", events);
      } else {
        state.readyTicks = usable && input.ready ? state.readyTicks + 1 : 0;
        if (state.readyTicks >= NURSERY_TIMING.readyHoldTicks) transition(state, "duel", events);
      }
      break;
    case "duel": {
      if (usable) choosePlayerMove(state, input, pressed, events);
      else if (idle(state.player)) state.player.vx = 0;
      chooseRivalMove(state, events);
      advanceActor(state.player); advanceActor(state.rival); resolveSeparation(state);
      // Sample both attacks before applying either, so traded blows are deterministic.
      const attacks = [pendingStrike(state.player, state.rival), pendingStrike(state.rival, state.player)].filter((s): s is Strike => s !== null);
      for (const attack of attacks) applyStrike(state, attack, events);
      if (state.player.composure === 0 || state.rival.composure === 0) {
        state.winner = state.player.composure === 0 ? "rival" : "player";
        state.knockoutAt = state.tick;
        // Preserve the launch momentum through the KO phase.
        const playerVx = state.player.vx; const rivalVx = state.rival.vx;
        transition(state, state.winner === "player" ? "ko" : "defeat", events);
        state.player.vx = playerVx; state.rival.vx = rivalVx;
        events.push({ type: "knockout", winner: state.winner });
      }
      break;
    }
    case "defeat":
      advanceActor(state.player); advanceActor(state.rival);
      if (usable && pressed.retry) {
        state.player = idleActor("player"); state.rival = idleActor("rival");
        state.blade = { holder: null, x: NURSERY_ARENA.bladeSpawnX }; state.rivalDecisionTicks = 45;
        state.winner = null; state.duelStartedAt = null; state.knockoutAt = null; state.titleStartedAt = null;
        state.attempt++; transition(state, "ready", events);
      }
      break;
    case "ko":
      advanceActor(state.player); advanceActor(state.rival);
      if (state.phaseTick >= NURSERY_TIMING.koTicks && grounded(state.player) && grounded(state.rival)) transition(state, "village-reveal", events);
      break;
    case "village-reveal":
      if (state.phaseTick >= NURSERY_TIMING.villageRevealTicks) transition(state, "moon-title", events);
      break;
    case "moon-title":
      if (state.phaseTick >= NURSERY_TIMING.moonTitleTicks && environment.nextChapterReady === true) {
        transition(state, "complete", events); events.push({ type: "complete" });
        result.completion = { id: "intro-completed", sourceId: "chronicle.intro.completed", sceneId: "nursery-prologue", attempt: state.attempt };
      }
      break;
  }
  return result;
}

export interface NurseryPresentation {
  phase: NurseryPhase;
  hud: false;
  vision: "natural-red-orange-yellow";
  controlEnabled: boolean;
  readyGestureProgress: number;
  showStartPrompt: boolean;
  showReadyPrompt: boolean;
  camera: { shot: "black" | "arena" | "village" | "red-moon"; progress: number; blur: number };
  showTitle: boolean;
  title: "Yautja: The Long Hunt";
  awaitingNextChapter: boolean;
  groundBlade: { visible: boolean; x: number; y: number };
  actors: readonly { id: NurseryActorId; actorKind: "youngling"; x: number; y: number;
    facing: -1 | 1; pose: NurseryAction | "ready" | "walk"; poseTick: number; holdsDetachedBlade: boolean }[];
}
/** A canvas consumes this director; no generic shape or adult character is a valid asset fallback. */
export function getNurseryPresentation(state: NurseryState): NurseryPresentation {
  const phase = state.phase;
  const shot = phase === "loading" || phase === "prompt" ? "black" :
    phase === "village-reveal" ? "village" : phase === "moon-title" || phase === "complete" ? "red-moon" : "arena";
  const progress = phase === "village-reveal" ? clamp(state.phaseTick / NURSERY_TIMING.villageRevealTicks, 0, 1) :
    phase === "moon-title" ? clamp(state.phaseTick / NURSERY_TIMING.moonTitleTicks, 0, 1) : phase === "complete" ? 1 : 0;
  return { phase, hud: false, vision: "natural-red-orange-yellow", controlEnabled: phase === "duel" && state.inputArmed,
    readyGestureProgress: clamp(state.readyTicks / NURSERY_TIMING.readyHoldTicks, 0, 1),
    showStartPrompt: phase === "prompt", showReadyPrompt: phase === "ready",
    camera: { shot, progress, blur: phase === "arrival" ? 1 - clamp(state.phaseTick / NURSERY_TIMING.arrivalTicks, 0, 1) : 0 },
    showTitle: phase === "moon-title" || phase === "complete", title: NURSERY_SOURCE.title,
    awaitingNextChapter: phase === "moon-title" && state.phaseTick >= NURSERY_TIMING.moonTitleTicks,
    groundBlade: { visible: state.blade.holder === null, x: state.blade.x, y: NURSERY_ARENA.groundY },
    actors: [state.player, state.rival].map(actor => ({ id: actor.id, actorKind: "youngling", x: actor.x, y: actor.y,
      facing: actor.facing, pose: actor.id === "player" && phase === "ready" && state.readyTicks > 0 ? "ready" : actor.action === "idle" && Math.abs(actor.vx) > 0.1 ? "walk" : actor.action,
      poseTick: actor.action === "idle" ? state.tick : actor.actionTick, holdsDetachedBlade: state.blade.holder === actor.id })) };
}

const phases: readonly NurseryPhase[] = ["loading", "prompt", "arrival", "ready", "duel", "defeat", "ko", "village-reveal", "moon-title", "complete"];
const actions: readonly NurseryAction[] = ["idle", "jab", "blade", "throw", "dodge", "hurt", "thrown", "ko"];
const MAX_TICK = 3_600_000;
const integer = (value: unknown, min: number, max: number): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= min && value <= max;
const finite = (value: unknown, min: number, max: number): value is number => typeof value === "number" && Number.isFinite(value) && value >= min && value <= max;
function restoreActor(value: unknown, id: NurseryActorId): NurseryActor | null {
  if (!record(value) || value.id !== id || !finite(value.x, NURSERY_ARENA.left, NURSERY_ARENA.right) ||
    !finite(value.y, 128, NURSERY_ARENA.groundY) || !finite(value.vx, -12, 12) || !finite(value.vy, -12, 18) ||
    (value.facing !== -1 && value.facing !== 1) || !integer(value.composure, 0, 100) ||
    !actions.includes(value.action as NurseryAction) || !integer(value.actionTick, 0, MAX_TICK) || typeof value.actionHitResolved !== "boolean") return null;
  if (value.composure === 0 && value.action !== "ko" || value.composure > 0 && value.action === "ko") return null;
  if (value.y === NURSERY_ARENA.groundY && value.vy !== 0) return null;
  if ((value.action as string) in MOVES && value.actionTick >= MOVES[value.action as keyof typeof MOVES].duration) return null;
  if (value.action === "idle" && (value.actionTick !== 0 || value.y !== NURSERY_ARENA.groundY)) return null;
  return { id, x: value.x, y: value.y, vx: value.vx, vy: value.vy, facing: value.facing,
    composure: value.composure, action: value.action as NurseryAction, actionTick: value.actionTick, actionHitResolved: value.actionHitResolved };
}

/** Invalid checkpoints are rejected, not repaired into wins. Restored input always needs release. */
export function normalizeNurseryCheckpoint(raw: unknown): NurseryState | null {
  if (!record(raw) || raw.version !== 1 || (raw.readyMode !== "hold" && raw.readyMode !== "press") ||
    !phases.includes(raw.phase as NurseryPhase) || !integer(raw.tick, 0, MAX_TICK) ||
    !integer(raw.phaseTick, 0, raw.tick) || !integer(raw.readyTicks, 0, NURSERY_TIMING.readyHoldTicks) ||
    !integer(raw.rivalDecisionTicks, 0, 600) || !integer(raw.attempt, 1, 10000) ||
    !record(raw.blade) || !finite(raw.blade.x, NURSERY_ARENA.left, NURSERY_ARENA.right) ||
    ![null, "player", "rival"].includes(raw.blade.holder as string | null) ||
    ![null, "player", "rival"].includes(raw.winner as string | null)) return null;
  const player = restoreActor(raw.player, "player"); const rival = restoreActor(raw.rival, "rival");
  if (!player || !rival) return null;
  for (const key of ["duelStartedAt", "knockoutAt", "titleStartedAt"] as const) {
    if (raw[key] !== null && !integer(raw[key], 0, raw.tick)) return null;
  }
  const phase = raw.phase as NurseryPhase;
  const beforeDuel = ["loading", "prompt", "arrival", "ready"].includes(phase);
  if (beforeDuel && (raw.winner !== null || raw.duelStartedAt !== null || raw.knockoutAt !== null || raw.titleStartedAt !== null ||
    player.composure !== 100 || rival.composure !== 100 || player.action !== "idle" || rival.action !== "idle" || raw.blade.holder !== null ||
    player.x !== NURSERY_ARENA.playerSpawnX || rival.x !== NURSERY_ARENA.rivalSpawnX || player.vx !== 0 || rival.vx !== 0)) return null;
  if (phase === "duel" && (raw.duelStartedAt === null || raw.knockoutAt !== null || raw.winner !== null || raw.titleStartedAt !== null ||
    player.composure === 0 || rival.composure === 0)) return null;
  const afterDuel = ["defeat", "ko", "village-reveal", "moon-title", "complete"].includes(phase);
  if (afterDuel && (!integer(raw.duelStartedAt, 0, raw.tick) || !integer(raw.knockoutAt, raw.duelStartedAt + 1, raw.tick))) return null;
  if (phase === "defeat" && (raw.winner !== "rival" || player.composure !== 0 || raw.titleStartedAt !== null)) return null;
  if (["ko", "village-reveal", "moon-title", "complete"].includes(phase) && (raw.winner !== "player" || rival.composure !== 0 || player.composure === 0)) return null;
  if (["village-reveal", "moon-title", "complete"].includes(phase) &&
    (!integer(raw.knockoutAt, 0, raw.tick - NURSERY_TIMING.koTicks) || !grounded(player) || !grounded(rival))) return null;
  if (phase === "moon-title" || phase === "complete") {
    if (!integer(raw.titleStartedAt, (raw.knockoutAt as number) + NURSERY_TIMING.koTicks + NURSERY_TIMING.villageRevealTicks, raw.tick)) return null;
    if (phase === "complete" && raw.tick < raw.titleStartedAt + NURSERY_TIMING.moonTitleTicks) return null;
  } else if (raw.titleStartedAt !== null) return null;
  // Both clocks describe the same elapsed simulation. A structurally valid but
  // inconsistent phase counter must not bypass the knockout/reveal/title time.
  if (phase === "duel" && raw.phaseTick !== raw.tick - (raw.duelStartedAt as number)) return null;
  if ((phase === "ko" || phase === "defeat") && raw.phaseTick !== raw.tick - (raw.knockoutAt as number)) return null;
  if (phase === "village-reveal" && (raw.phaseTick >= NURSERY_TIMING.villageRevealTicks ||
    raw.tick - raw.phaseTick < (raw.knockoutAt as number) + NURSERY_TIMING.koTicks)) return null;
  if (phase === "moon-title" && raw.phaseTick !== raw.tick - (raw.titleStartedAt as number)) return null;
  if (phase === "complete" && raw.phaseTick !== 0) return null;
  return { version: 1, readyMode: raw.readyMode, phase, tick: raw.tick, phaseTick: raw.phaseTick, readyTicks: 0,
    inputArmed: false, previousButtons: noButtons(), player, rival,
    blade: { holder: raw.blade.holder as NurseryActorId | null, x: raw.blade.x }, rivalDecisionTicks: raw.rivalDecisionTicks,
    winner: raw.winner as NurseryActorId | null, duelStartedAt: raw.duelStartedAt as number | null,
    knockoutAt: raw.knockoutAt as number | null, titleStartedAt: raw.titleStartedAt as number | null, attempt: raw.attempt };
}


export interface NurseryFrameAdapter {
  state: NurseryState;
  /** Presentation clock is intentionally not part of a saved checkpoint. */
  clock: { lastTimestampMs: number | null; accumulatorMs: number };
}
export interface NurseryFrameResult extends NurseryStep { adapter: NurseryFrameAdapter; steps: number }
export function createNurseryFrameAdapter(state = createNurseryPrologue()): NurseryFrameAdapter {
  return { state: clone(state), clock: { lastTimestampMs: null, accumulatorMs: 0 } };
}

/** requestAnimationFrame adapter: discard stalls, reset on blur, cap catch-up at six steps. */
export function advanceNurseryFrame(adapter: NurseryFrameAdapter, actions: NurseryActions,
  environment: NurseryEnvironment, timestampMs: number): NurseryFrameResult {
  const blocked = environment?.paused !== false || environment?.pageVisible !== true ||
    environment?.assetsReady !== true || !Number.isFinite(timestampMs) || timestampMs < 0;
  if (blocked) {
    const result = stepNurseryPrologue(adapter.state, actions, { ...environment, paused: true });
    return { ...result, adapter: { state: result.state, clock: { lastTimestampMs: null, accumulatorMs: 0 } }, steps: 0 };
  }
  const last = adapter.clock.lastTimestampMs;
  if (last === null) {
    return { state: adapter.state, events: [], completion: null,
      adapter: { state: adapter.state, clock: { lastTimestampMs: timestampMs, accumulatorMs: 0 } }, steps: 0 };
  }
  const elapsed = timestampMs - last;
  if (!Number.isFinite(elapsed) || elapsed < 0 || elapsed > 250) {
    const result = stepNurseryPrologue(adapter.state, actions, { ...environment, paused: true });
    return { ...result, adapter: { state: result.state, clock: { lastTimestampMs: timestampMs, accumulatorMs: 0 } }, steps: 0 };
  }
  const fixedMs = 1000 / NURSERY_TIMING.tickRate;
  let accumulatorMs = Math.min(fixedMs * 6, Math.max(0, adapter.clock.accumulatorMs) + Math.min(elapsed, 100));
  let state = adapter.state;
  let completion: NurseryCompletionReceipt | null = null;
  const events: NurseryEvent[] = [];
  let steps = 0;
  while (accumulatorMs + 1e-7 >= fixedMs && steps < 6) {
    const result = stepNurseryPrologue(state, actions, environment);
    state = result.state; events.push(...result.events); completion = result.completion ?? completion;
    accumulatorMs = Math.max(0, accumulatorMs - fixedMs); steps++;
    if (completion) { accumulatorMs = 0; break; }
  }
  return { state, events, completion, steps, adapter: { state, clock: { lastTimestampMs: timestampMs, accumulatorMs } } };
}
