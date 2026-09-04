export const PIT_TICK_RATE = 60;
export const PIT_ROUND_SECONDS = 99;
export const PIT_ROUND_FRAMES = PIT_TICK_RATE * PIT_ROUND_SECONDS;
export const PIT_ROUND_TRANSITION_FRAMES = PIT_TICK_RATE * 2;
export const PIT_COMBO_RESET_FRAMES = 45;
export const PIT_MAX_COMBO_HITS = 6;
export const PIT_STATE_VERSION = 1;

export type PitFighterId = "jungle-hunter" | "berserker";
export type PitAttackKind = "light" | "medium" | "heavy" | "technique";
export type PitHitLevel = "high" | "mid" | "low";
export type PitGuard = "high" | "low" | null;
export type PitCombatPhase =
  | "idle"
  | "startup"
  | "active"
  | "recovery"
  | "hitstun"
  | "blockstun"
  | "knockdown";
export type PitMatchPhase = "round" | "round-over" | "match-over";
export type PitCombatMode = "match" | "training";

export interface PitCombatRules {
  mode: PitCombatMode;
}

export interface PitCombatOptions {
  mode?: PitCombatMode;
}

export interface PitAttackDefinition {
  kind: PitAttackKind;
  label: string;
  startup: number;
  active: number;
  recovery: number;
  damage: number;
  chipDamage: number;
  hitstun: number;
  blockstun: number;
  range: number;
  height: number;
  hitLevel: PitHitLevel;
  pushback: number;
  knockdown: boolean;
  antiAir: boolean;
  launchY: number;
}

export interface PitFighterDefinition {
  id: PitFighterId;
  name: string;
  epithet: string;
  maxHealth: number;
  walkSpeed: number;
  airSpeed: number;
  jumpSpeed: number;
  power: number;
  bodyWidth: number;
  bodyHeight: number;
  crouchHeight: number;
  palette: {
    primary: string;
    secondary: string;
    accent: string;
  };
  attacks: Record<PitAttackKind, PitAttackDefinition>;
}

export interface PitArenaDefinition {
  id: "the-pit";
  name: string;
  width: number;
  height: number;
  groundY: number;
  leftWall: number;
  rightWall: number;
  spawnX: readonly [number, number];
}

export interface PitInput {
  left?: boolean;
  right?: boolean;
  down?: boolean;
  jump?: boolean;
  guardHigh?: boolean;
  guardLow?: boolean;
  attack?: PitAttackKind;
  throw?: boolean;
}

interface PitInputLatch {
  jump: boolean;
  attack: PitAttackKind | null;
  throw: boolean;
}

export interface PitActionState {
  kind: "attack" | "throw";
  attack: PitAttackKind | null;
  frame: number;
  connected: boolean;
}

export interface PitFighterState {
  slot: 0 | 1;
  definitionId: PitFighterId;
  x: number;
  y: number;
  velocityX: number;
  velocityY: number;
  facing: -1 | 1;
  health: number;
  grounded: boolean;
  crouching: boolean;
  guard: PitGuard;
  phase: PitCombatPhase;
  action: PitActionState | null;
  stunFrames: number;
  knockdownFrames: number;
  wakeInvulnerabilityFrames: number;
  comboHitsReceived: number;
  comboLastHitFrame: number;
  roundsWon: number;
  inputLatch: PitInputLatch;
}

export interface PitRoundResult {
  round: number;
  reason: "ko" | "double-ko" | "timeout" | "draw";
  winnerId: PitFighterId | null;
  frame: number;
}

export type PitCombatEvent =
  | { type: "round-start"; frame: number; round: number }
  | { type: "attack-start"; frame: number; fighterId: PitFighterId; attack: PitAttackKind }
  | { type: "throw-start"; frame: number; fighterId: PitFighterId }
  | { type: "hit"; frame: number; attackerId: PitFighterId; defenderId: PitFighterId; attack: PitAttackKind | "throw"; damage: number; combo: number; antiAir: boolean }
  | { type: "block"; frame: number; attackerId: PitFighterId; defenderId: PitFighterId; attack: PitAttackKind; damage: number }
  | { type: "combo-break"; frame: number; fighterId: PitFighterId }
  | { type: "round-end"; frame: number; result: PitRoundResult }
  | { type: "match-end"; frame: number; winnerId: PitFighterId };

export interface PitCombatState {
  version: typeof PIT_STATE_VERSION;
  tickRate: typeof PIT_TICK_RATE;
  frame: number;
  phase: PitMatchPhase;
  round: number;
  roundFramesRemaining: number;
  transitionFramesRemaining: number;
  arenaId: PitArenaDefinition["id"];
  rules: PitCombatRules;
  fighters: [PitFighterState, PitFighterState];
  lastRoundResult: PitRoundResult | null;
  matchWinnerId: PitFighterId | null;
  events: PitCombatEvent[];
}

export interface PitBox {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PitFighterBoxes {
  pushbox: PitBox;
  hurtbox: PitBox;
  hitbox: PitBox | null;
}

const attack = (
  kind: PitAttackKind,
  label: string,
  startup: number,
  active: number,
  recovery: number,
  damage: number,
  hitstun: number,
  blockstun: number,
  range: number,
  height: number,
  hitLevel: PitHitLevel,
  pushback: number,
  knockdown = false,
  antiAir = false,
  launchY = 0,
): PitAttackDefinition => ({
  kind,
  label,
  startup,
  active,
  recovery,
  damage,
  chipDamage: kind === "heavy" || kind === "technique" ? Math.ceil(damage * 0.08) : 0,
  hitstun,
  blockstun,
  range,
  height,
  hitLevel,
  pushback,
  knockdown,
  antiAir,
  launchY,
});

const jungleAttacks: Record<PitAttackKind, PitAttackDefinition> = {
  light: attack("light", "Wrist-blade jab", 5, 3, 10, 55, 15, 8, 62, 38, "high", 14),
  medium: attack("medium", "Combi-stick sweep", 8, 4, 15, 80, 20, 11, 82, 46, "mid", 20),
  heavy: attack("heavy", "Overhead maul", 14, 5, 24, 125, 30, 17, 70, 60, "high", 34, true, true, 8.5),
  technique: attack("technique", "Low disc feint", 11, 4, 20, 95, 24, 14, 90, 26, "low", 26, true),
};

const berserkerAttacks: Record<PitAttackKind, PitAttackDefinition> = {
  light: attack("light", "Savage backhand", 5, 3, 11, 58, 16, 8, 64, 40, "high", 15),
  medium: attack("medium", "Cleaver hook", 9, 4, 15, 84, 21, 12, 78, 48, "mid", 22),
  heavy: attack("heavy", "Crusher blow", 15, 5, 25, 132, 32, 18, 72, 62, "high", 36, true, true, 9),
  technique: attack("technique", "Ankle breaker", 12, 4, 20, 98, 25, 14, 86, 28, "low", 28, true),
};

export const PIT_FIGHTERS: Record<PitFighterId, PitFighterDefinition> = {
  "jungle-hunter": {
    id: "jungle-hunter",
    name: "Jungle Hunter",
    epithet: "The First Hunter",
    maxHealth: 1_000,
    walkSpeed: 4.7,
    airSpeed: 3.2,
    jumpSpeed: 12.4,
    power: 1,
    bodyWidth: 54,
    bodyHeight: 116,
    crouchHeight: 82,
    palette: { primary: "#66714f", secondary: "#30291f", accent: "#d7b45b" },
    attacks: jungleAttacks,
  },
  berserker: {
    id: "berserker",
    name: "Berserker",
    epithet: "Super Predator",
    maxHealth: 1_040,
    walkSpeed: 4.35,
    airSpeed: 2.9,
    jumpSpeed: 11.8,
    power: 1.04,
    bodyWidth: 58,
    bodyHeight: 122,
    crouchHeight: 86,
    palette: { primary: "#5b1f1c", secondary: "#171311", accent: "#bfc5b5" },
    attacks: berserkerAttacks,
  },
};

export const PIT_ARENA: PitArenaDefinition = {
  id: "the-pit",
  name: "THE PIT",
  width: 960,
  height: 540,
  groundY: 430,
  leftWall: 54,
  rightWall: 906,
  spawnX: [300, 660],
};

const THROW_STARTUP = 7;
const THROW_ACTIVE = 2;
const THROW_RECOVERY = 21;
const THROW_RANGE = 58;
const THROW_DAMAGE = 105;
const GRAVITY = 0.72;
const MAX_FALL_SPEED = 15;

function latchFromInput(input: PitInput = {}): PitInputLatch {
  return {
    jump: Boolean(input.jump),
    attack: input.attack ?? null,
    throw: Boolean(input.throw),
  };
}

function freshFighter(
  slot: 0 | 1,
  id: PitFighterId,
  roundsWon = 0,
  inputLatch: PitInputLatch = latchFromInput(),
): PitFighterState {
  const definition = PIT_FIGHTERS[id];
  return {
    slot,
    definitionId: id,
    x: PIT_ARENA.spawnX[slot],
    y: 0,
    velocityX: 0,
    velocityY: 0,
    facing: slot === 0 ? 1 : -1,
    health: definition.maxHealth,
    grounded: true,
    crouching: false,
    guard: null,
    phase: "idle",
    action: null,
    stunFrames: 0,
    knockdownFrames: 0,
    wakeInvulnerabilityFrames: 0,
    comboHitsReceived: 0,
    comboLastHitFrame: -PIT_COMBO_RESET_FRAMES,
    roundsWon,
    inputLatch: { ...inputLatch },
  };
}

export function createPitCombatState(
  leftId: PitFighterId = "jungle-hunter",
  rightId: PitFighterId = "berserker",
  options: PitCombatOptions = {},
): PitCombatState {
  if (leftId === rightId) {
    throw new Error("THE PIT requires Jungle Hunter versus Berserker.");
  }
  if (options.mode !== undefined && options.mode !== "match" && options.mode !== "training") {
    throw new Error("THE PIT requires a valid combat mode.");
  }
  return {
    version: PIT_STATE_VERSION,
    tickRate: PIT_TICK_RATE,
    frame: 0,
    phase: "round",
    round: 1,
    roundFramesRemaining: PIT_ROUND_FRAMES,
    transitionFramesRemaining: 0,
    arenaId: PIT_ARENA.id,
    rules: { mode: options.mode ?? "match" },
    fighters: [freshFighter(0, leftId), freshFighter(1, rightId)],
    lastRoundResult: null,
    matchWinnerId: null,
    events: [{ type: "round-start", frame: 0, round: 1 }],
  };
}

function cloneFighter(fighter: PitFighterState): PitFighterState {
  return {
    ...fighter,
    action: fighter.action ? { ...fighter.action } : null,
    inputLatch: { ...fighter.inputLatch },
  };
}

function cloneState(state: PitCombatState): PitCombatState {
  return {
    ...state,
    rules: { ...state.rules },
    fighters: [cloneFighter(state.fighters[0]), cloneFighter(state.fighters[1])],
    lastRoundResult: state.lastRoundResult ? { ...state.lastRoundResult } : null,
    events: [],
  };
}

function actionDuration(actionState: PitActionState, fighterId: PitFighterId): number {
  if (actionState.kind === "throw") return THROW_STARTUP + THROW_ACTIVE + THROW_RECOVERY;
  const definition = PIT_FIGHTERS[fighterId].attacks[actionState.attack as PitAttackKind];
  return definition.startup + definition.active + definition.recovery;
}

function phaseForAction(actionState: PitActionState, fighterId: PitFighterId): PitCombatPhase {
  if (actionState.kind === "throw") {
    if (actionState.frame < THROW_STARTUP) return "startup";
    if (actionState.frame < THROW_STARTUP + THROW_ACTIVE) return "active";
    return "recovery";
  }
  const move = PIT_FIGHTERS[fighterId].attacks[actionState.attack as PitAttackKind];
  if (actionState.frame < move.startup) return "startup";
  if (actionState.frame < move.startup + move.active) return "active";
  return "recovery";
}

function isPressed<T>(current: T | undefined, previous: T | null): boolean {
  return current !== undefined && current !== null && current !== previous;
}

function minFighterX(fighter: PitFighterState): number {
  return PIT_ARENA.leftWall + PIT_FIGHTERS[fighter.definitionId].bodyWidth / 2;
}

function maxFighterX(fighter: PitFighterState): number {
  return PIT_ARENA.rightWall - PIT_FIGHTERS[fighter.definitionId].bodyWidth / 2;
}

function clampFighterX(fighter: PitFighterState, x: number): number {
  return Math.max(minFighterX(fighter), Math.min(maxFighterX(fighter), x));
}

function updateFighter(
  state: PitCombatState,
  fighter: PitFighterState,
  opponent: PitFighterState,
  input: PitInput,
): void {
  const definition = PIT_FIGHTERS[fighter.definitionId];
  const jumpPressed = Boolean(input.jump) && !fighter.inputLatch.jump;
  const throwPressed = Boolean(input.throw) && !fighter.inputLatch.throw;
  const attackPressed = isPressed(input.attack, fighter.inputLatch.attack);

  if (fighter.wakeInvulnerabilityFrames > 0) fighter.wakeInvulnerabilityFrames -= 1;
  if (state.frame - fighter.comboLastHitFrame > PIT_COMBO_RESET_FRAMES && fighter.phase === "idle") {
    fighter.comboHitsReceived = 0;
  }

  if (fighter.phase === "hitstun" || fighter.phase === "blockstun") {
    fighter.stunFrames = Math.max(0, fighter.stunFrames - 1);
    fighter.velocityX *= 0.82;
    if (fighter.stunFrames === 0) {
      fighter.phase = "idle";
      fighter.comboHitsReceived = 0;
    }
  } else if (fighter.phase === "knockdown") {
    fighter.knockdownFrames = Math.max(0, fighter.knockdownFrames - 1);
    fighter.velocityX *= 0.9;
    if (fighter.knockdownFrames === 0) {
      if (state.rules.mode === "training" && fighter.health === 0) {
        Object.assign(
          fighter,
          freshFighter(fighter.slot, fighter.definitionId, 0, latchFromInput(input)),
        );
      } else {
        fighter.phase = "idle";
        fighter.wakeInvulnerabilityFrames = Math.max(fighter.wakeInvulnerabilityFrames, 24);
        fighter.comboHitsReceived = 0;
      }
    }
  } else if (fighter.action) {
    fighter.action.frame += 1;
    if (fighter.action.frame >= actionDuration(fighter.action, fighter.definitionId)) {
      fighter.action = null;
      fighter.phase = "idle";
    } else {
      fighter.phase = phaseForAction(fighter.action, fighter.definitionId);
      // A connected strike may link into a newly pressed attack during its
      // remaining active or recovery frames. Whiffs and throws keep full recovery.
      if (
        (fighter.phase === "active" || fighter.phase === "recovery") &&
        fighter.action.kind === "attack" &&
        fighter.action.connected &&
        attackPressed &&
        input.attack
      ) {
        fighter.action = { kind: "attack", attack: input.attack, frame: 0, connected: false };
        fighter.phase = "startup";
        fighter.velocityX = 0;
        state.events.push({
          type: "attack-start",
          frame: state.frame,
          fighterId: fighter.definitionId,
          attack: input.attack,
        });
      }
    }
  } else {
    fighter.crouching = Boolean(input.down) && fighter.grounded;
    fighter.guard = fighter.grounded
      ? input.guardLow || (fighter.crouching && input.guardHigh)
        ? "low"
        : input.guardHigh
          ? "high"
          : null
      : null;

    const direction = Number(Boolean(input.right)) - Number(Boolean(input.left));
    const speed = fighter.grounded ? definition.walkSpeed : definition.airSpeed;
    fighter.velocityX = direction * (fighter.crouching ? speed * 0.42 : speed);

    if (jumpPressed && fighter.grounded && fighter.guard === null) {
      fighter.grounded = false;
      fighter.crouching = false;
      fighter.velocityY = definition.jumpSpeed;
    }

    if (fighter.guard === null && throwPressed && fighter.grounded) {
      fighter.action = { kind: "throw", attack: null, frame: 0, connected: false };
      fighter.phase = "startup";
      fighter.velocityX = 0;
      state.events.push({ type: "throw-start", frame: state.frame, fighterId: fighter.definitionId });
    } else if (fighter.guard === null && attackPressed && input.attack) {
      fighter.action = { kind: "attack", attack: input.attack, frame: 0, connected: false };
      fighter.phase = "startup";
      fighter.velocityX = 0;
      state.events.push({
        type: "attack-start",
        frame: state.frame,
        fighterId: fighter.definitionId,
        attack: input.attack,
      });
    }
  }

  fighter.inputLatch = {
    jump: Boolean(input.jump),
    attack: input.attack ?? null,
    throw: Boolean(input.throw),
  };

  if (!fighter.grounded) {
    fighter.velocityY = Math.max(-MAX_FALL_SPEED, fighter.velocityY - GRAVITY);
    fighter.y += fighter.velocityY;
    if (fighter.y <= 0) {
      fighter.y = 0;
      fighter.velocityY = 0;
      fighter.grounded = true;
    }
  }
  fighter.x = clampFighterX(fighter, fighter.x + fighter.velocityX);

  if (!fighter.action && fighter.phase === "idle") {
    fighter.facing = fighter.x <= opponent.x ? 1 : -1;
  }
}

function bodyHeight(fighter: PitFighterState): number {
  const definition = PIT_FIGHTERS[fighter.definitionId];
  return fighter.crouching ? definition.crouchHeight : definition.bodyHeight;
}

function boxesOverlap(left: PitBox, right: PitBox): boolean {
  return (
    left.x < right.x + right.width &&
    left.x + left.width > right.x &&
    left.y < right.y + right.height &&
    left.y + left.height > right.y
  );
}

export function getPitFighterBoxes(fighter: PitFighterState): PitFighterBoxes {
  const definition = PIT_FIGHTERS[fighter.definitionId];
  const height = bodyHeight(fighter);
  const pushbox = {
    x: fighter.x - definition.bodyWidth / 2,
    y: fighter.y,
    width: definition.bodyWidth,
    height,
  };
  let hitbox: PitBox | null = null;
  if (fighter.action && fighter.phase === "active") {
    const range = fighter.action.kind === "throw"
      ? THROW_RANGE
      : definition.attacks[fighter.action.attack as PitAttackKind].range;
    const attackHeight = fighter.action.kind === "throw"
      ? 64
      : definition.attacks[fighter.action.attack as PitAttackKind].height;
    hitbox = {
      x: fighter.facing === 1 ? fighter.x + definition.bodyWidth * 0.2 : fighter.x - range - definition.bodyWidth * 0.2,
      y: fighter.action.kind === "attack" && definition.attacks[fighter.action.attack as PitAttackKind].hitLevel === "low"
        ? fighter.y
        : fighter.y + Math.max(12, height - attackHeight - 12),
      width: range,
      height: attackHeight,
    };
  }
  return { pushbox, hurtbox: { ...pushbox }, hitbox };
}

function resolvePushboxes(left: PitFighterState, right: PitFighterState): void {
  const leftBox = getPitFighterBoxes(left).pushbox;
  const rightBox = getPitFighterBoxes(right).pushbox;
  if (!boxesOverlap(leftBox, rightBox)) return;

  const overlap = Math.min(leftBox.x + leftBox.width, rightBox.x + rightBox.width) - Math.max(leftBox.x, rightBox.x);
  const first = left.x <= right.x ? left : right;
  const second = first === left ? right : left;
  let remaining = overlap;

  const firstHalf = Math.min(remaining / 2, first.x - minFighterX(first));
  first.x -= firstHalf;
  remaining -= firstHalf;

  const secondHalf = Math.min(overlap / 2, maxFighterX(second) - second.x);
  second.x += secondHalf;
  remaining -= secondHalf;

  if (remaining > 0) {
    const firstRemainder = Math.min(remaining, first.x - minFighterX(first));
    first.x -= firstRemainder;
    remaining -= firstRemainder;
  }
  if (remaining > 0) {
    second.x += Math.min(remaining, maxFighterX(second) - second.x);
  }

  first.x = clampFighterX(first, first.x);
  second.x = clampFighterX(second, second.x);
}

interface PendingImpact {
  attackerSlot: 0 | 1;
  defenderSlot: 0 | 1;
  kind: PitAttackKind | "throw";
  blocked: boolean;
  damage: number;
  stun: number;
  pushback: number;
  knockdown: boolean;
  launchY: number;
  combo: number;
}

function guardBlocks(guard: PitGuard, hitLevel: PitHitLevel): boolean {
  if (hitLevel === "mid") return guard !== null;
  return guard === hitLevel;
}

function collectImpact(
  state: PitCombatState,
  attacker: PitFighterState,
  defender: PitFighterState,
): PendingImpact | null {
  const actionState = attacker.action;
  if (!actionState || attacker.phase !== "active" || actionState.connected) return null;
  if (defender.wakeInvulnerabilityFrames > 0) return null;
  const hitbox = getPitFighterBoxes(attacker).hitbox;
  if (!hitbox || !boxesOverlap(hitbox, getPitFighterBoxes(defender).hurtbox)) return null;

  if (actionState.kind === "throw") {
    if (!defender.grounded || defender.phase === "knockdown") return null;
    return {
      attackerSlot: attacker.slot,
      defenderSlot: defender.slot,
      kind: "throw",
      blocked: false,
      damage: Math.round(THROW_DAMAGE * PIT_FIGHTERS[attacker.definitionId].power),
      stun: 42,
      pushback: 42,
      knockdown: true,
      launchY: 0,
      combo: 1,
    };
  }

  const move = PIT_FIGHTERS[attacker.definitionId].attacks[actionState.attack as PitAttackKind];
  const blocked = guardBlocks(defender.guard, move.hitLevel) &&
    (defender.phase === "idle" || defender.phase === "blockstun");
  const antiAir = move.antiAir && !defender.grounded;
  const continuesCombo = !blocked &&
    defender.comboHitsReceived > 0 &&
    (defender.phase === "hitstun" || defender.phase === "knockdown");
  const combo = blocked ? 0 : continuesCombo ? defender.comboHitsReceived + 1 : 1;
  const scale = blocked ? 1 : Math.max(0.35, 1 - Math.max(0, combo - 1) * 0.12);
  return {
    attackerSlot: attacker.slot,
    defenderSlot: defender.slot,
    kind: move.kind,
    blocked,
    damage: blocked ? move.chipDamage : Math.max(1, Math.round(move.damage * PIT_FIGHTERS[attacker.definitionId].power * scale)),
    stun: blocked ? move.blockstun : move.hitstun,
    pushback: blocked ? move.pushback * 0.62 : move.pushback,
    knockdown: !blocked && (move.knockdown || antiAir || combo >= PIT_MAX_COMBO_HITS),
    launchY: antiAir ? move.launchY : 0,
    combo,
  };
}

function applyImpact(state: PitCombatState, impact: PendingImpact): void {
  const attacker = state.fighters[impact.attackerSlot];
  const defender = state.fighters[impact.defenderSlot];
  if (attacker.action) attacker.action.connected = true;
  defender.health = Math.max(0, defender.health - impact.damage);
  defender.velocityX = 0;
  defender.x = clampFighterX(defender, defender.x + attacker.facing * impact.pushback);
  if (impact.launchY > 0) {
    defender.grounded = false;
    defender.velocityY = impact.launchY;
  }

  if (impact.blocked) {
    defender.action = null;
    defender.comboHitsReceived = 0;
    defender.comboLastHitFrame = state.frame - PIT_COMBO_RESET_FRAMES - 1;
    defender.phase = "blockstun";
    defender.stunFrames = impact.stun;
    state.events.push({
      type: "block",
      frame: state.frame,
      attackerId: attacker.definitionId,
      defenderId: defender.definitionId,
      attack: impact.kind as PitAttackKind,
      damage: impact.damage,
    });
    return;
  }

  defender.action = null;
  defender.guard = null;
  defender.crouching = false;
  defender.comboHitsReceived = impact.combo;
  defender.comboLastHitFrame = state.frame;
  const trainingKnockout = state.rules.mode === "training" && defender.health === 0;
  if (impact.knockdown || trainingKnockout) {
    defender.phase = "knockdown";
    defender.knockdownFrames = trainingKnockout
      ? Math.max(60, impact.stun)
      : impact.combo >= PIT_MAX_COMBO_HITS ? 60 : impact.stun;
  } else {
    defender.phase = "hitstun";
    defender.stunFrames = impact.stun;
  }
  state.events.push({
    type: "hit",
    frame: state.frame,
    attackerId: attacker.definitionId,
    defenderId: defender.definitionId,
    attack: impact.kind,
    damage: impact.damage,
    combo: impact.combo,
    antiAir: impact.launchY > 0,
  });
  if (impact.combo >= PIT_MAX_COMBO_HITS) {
    defender.wakeInvulnerabilityFrames = Math.max(defender.wakeInvulnerabilityFrames, 60);
    state.events.push({ type: "combo-break", frame: state.frame, fighterId: defender.definitionId });
  }
}

function finishRound(state: PitCombatState, reason: PitRoundResult["reason"], winnerSlot: 0 | 1 | null): void {
  const winner = winnerSlot === null ? null : state.fighters[winnerSlot];
  if (winner) winner.roundsWon += 1;
  const result: PitRoundResult = {
    round: state.round,
    reason,
    winnerId: winner?.definitionId ?? null,
    frame: state.frame,
  };
  state.lastRoundResult = result;
  state.events.push({ type: "round-end", frame: state.frame, result });
  if (winner && winner.roundsWon >= 2) {
    state.phase = "match-over";
    state.matchWinnerId = winner.definitionId;
    state.transitionFramesRemaining = 0;
    state.events.push({ type: "match-end", frame: state.frame, winnerId: winner.definitionId });
  } else {
    state.phase = "round-over";
    state.transitionFramesRemaining = PIT_ROUND_TRANSITION_FRAMES;
  }
}

function evaluateRound(state: PitCombatState): void {
  const [left, right] = state.fighters;
  if (left.health <= 0 && right.health <= 0) {
    finishRound(state, "double-ko", null);
  } else if (left.health <= 0) {
    finishRound(state, "ko", 1);
  } else if (right.health <= 0) {
    finishRound(state, "ko", 0);
  } else if (state.roundFramesRemaining <= 0) {
    const leftRatio = left.health / PIT_FIGHTERS[left.definitionId].maxHealth;
    const rightRatio = right.health / PIT_FIGHTERS[right.definitionId].maxHealth;
    if (leftRatio === rightRatio) finishRound(state, "draw", null);
    else finishRound(state, "timeout", leftRatio > rightRatio ? 0 : 1);
  }
}

function beginNextRound(state: PitCombatState, inputs: readonly [PitInput, PitInput]): void {
  const [left, right] = state.fighters;
  state.round += 1;
  state.phase = "round";
  state.roundFramesRemaining = PIT_ROUND_FRAMES;
  state.transitionFramesRemaining = 0;
  state.fighters = [
    freshFighter(0, left.definitionId, left.roundsWon, latchFromInput(inputs[0] ?? {})),
    freshFighter(1, right.definitionId, right.roundsWon, latchFromInput(inputs[1] ?? {})),
  ];
  state.events.push({ type: "round-start", frame: state.frame, round: state.round });
}

export function stepPitCombat(
  current: PitCombatState,
  inputs: readonly [PitInput, PitInput] = [{}, {}],
): PitCombatState {
  if (current.phase === "match-over") {
    if (current.events.length === 0) return current;
    return cloneState(current);
  }

  const state = cloneState(current);
  state.frame += 1;

  if (state.phase === "round-over") {
    state.transitionFramesRemaining = Math.max(0, state.transitionFramesRemaining - 1);
    if (state.transitionFramesRemaining === 0) beginNextRound(state, inputs);
    return state;
  }

  if (state.rules.mode === "match") {
    state.roundFramesRemaining = Math.max(0, state.roundFramesRemaining - 1);
  }
  const previousLeft = cloneFighter(state.fighters[0]);
  const previousRight = cloneFighter(state.fighters[1]);
  updateFighter(state, state.fighters[0], previousRight, inputs[0] ?? {});
  updateFighter(state, state.fighters[1], previousLeft, inputs[1] ?? {});
  resolvePushboxes(state.fighters[0], state.fighters[1]);

  // Both impacts are gathered before either is applied, so a same-frame trade
  // remains valid even when the first applied impact causes a KO or hitstun.
  const impacts = [
    collectImpact(state, state.fighters[0], state.fighters[1]),
    collectImpact(state, state.fighters[1], state.fighters[0]),
  ].filter((impact): impact is PendingImpact => impact !== null);
  for (const impact of impacts) applyImpact(state, impact);

  if (state.rules.mode === "match") evaluateRound(state);
  return state;
}

export function rematchPitCombat(state: PitCombatState): PitCombatState {
  return createPitCombatState(state.fighters[0].definitionId, state.fighters[1].definitionId, { mode: state.rules.mode });
}

export function serializePitCombat(state: PitCombatState): string {
  return JSON.stringify(state);
}

const PIT_ATTACK_KINDS: readonly PitAttackKind[] = ["light", "medium", "heavy", "technique"];
const PIT_COMBAT_PHASES: readonly PitCombatPhase[] = ["idle", "startup", "active", "recovery", "hitstun", "blockstun", "knockdown"];
const PIT_MATCH_PHASES: readonly PitMatchPhase[] = ["round", "round-over", "match-over"];
const PIT_COMBAT_MODES: readonly PitCombatMode[] = ["match", "training"];
const PIT_RESULT_REASONS: readonly PitRoundResult["reason"][] = ["ko", "double-ko", "timeout", "draw"];

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isIntegerBetween(value: unknown, minimum: number, maximum: number): value is number {
  return Number.isInteger(value) && (value as number) >= minimum && (value as number) <= maximum;
}

function isFiniteBetween(value: unknown, minimum: number, maximum: number): value is number {
  return typeof value === "number" && Number.isFinite(value) && value >= minimum && value <= maximum;
}

function isFighterId(value: unknown): value is PitFighterId {
  return typeof value === "string" && value in PIT_FIGHTERS;
}

function isAttackKind(value: unknown): value is PitAttackKind {
  return typeof value === "string" && PIT_ATTACK_KINDS.includes(value as PitAttackKind);
}

function isRoundResult(value: unknown, stateFrame: number, stateRound: number): value is PitRoundResult {
  if (!isRecord(value)) return false;
  if (!isIntegerBetween(value.round, 1, stateRound)) return false;
  if (!PIT_RESULT_REASONS.includes(value.reason as PitRoundResult["reason"])) return false;
  if (!(value.winnerId === null || isFighterId(value.winnerId))) return false;
  if (!isIntegerBetween(value.frame, 0, stateFrame)) return false;
  const reason = value.reason as PitRoundResult["reason"];
  return reason === "draw" || reason === "double-ko" ? value.winnerId === null : isFighterId(value.winnerId);
}

function isActionState(value: unknown, fighterId: PitFighterId, phase: PitCombatPhase): value is PitActionState {
  if (!isRecord(value) || (value.kind !== "attack" && value.kind !== "throw") || typeof value.connected !== "boolean") return false;
  if (value.kind === "throw" && value.attack !== null) return false;
  if (value.kind === "attack" && !isAttackKind(value.attack)) return false;
  if (!Number.isInteger(value.frame) || (value.frame as number) < 0) return false;
  const action = value as unknown as PitActionState;
  return action.frame < actionDuration(action, fighterId) && phaseForAction(action, fighterId) === phase;
}

function isInputLatch(value: unknown): value is PitInputLatch {
  return isRecord(value) &&
    typeof value.jump === "boolean" &&
    typeof value.throw === "boolean" &&
    (value.attack === null || isAttackKind(value.attack));
}

function isFighterState(value: unknown, slot: 0 | 1, stateFrame: number): value is PitFighterState {
  if (!isRecord(value) || value.slot !== slot || !isFighterId(value.definitionId)) return false;
  const fighterId = value.definitionId;
  const definition = PIT_FIGHTERS[fighterId];
  if (!PIT_COMBAT_PHASES.includes(value.phase as PitCombatPhase)) return false;
  const phase = value.phase as PitCombatPhase;
  const actionValid = value.action === null || isActionState(value.action, fighterId, phase);
  if (!actionValid || ((phase === "startup" || phase === "active" || phase === "recovery") !== (value.action !== null))) return false;
  if (!isFiniteBetween(value.x, minFighterX(value as unknown as PitFighterState), maxFighterX(value as unknown as PitFighterState))) return false;
  if (!isFiniteBetween(value.y, 0, PIT_ARENA.height)) return false;
  if (!isFiniteBetween(value.velocityX, -100, 100) || !isFiniteBetween(value.velocityY, -MAX_FALL_SPEED, 20)) return false;
  if (value.facing !== -1 && value.facing !== 1) return false;
  if (!isIntegerBetween(value.health, 0, definition.maxHealth)) return false;
  if (typeof value.grounded !== "boolean" || typeof value.crouching !== "boolean") return false;
  if (!(value.guard === null || value.guard === "high" || value.guard === "low")) return false;
  if (!isIntegerBetween(value.stunFrames, 0, 120) || !isIntegerBetween(value.knockdownFrames, 0, 120)) return false;
  if (!isIntegerBetween(value.wakeInvulnerabilityFrames, 0, 120)) return false;
  if (!isIntegerBetween(value.comboHitsReceived, 0, PIT_MAX_COMBO_HITS)) return false;
  if (!isIntegerBetween(value.comboLastHitFrame, -PIT_COMBO_RESET_FRAMES, stateFrame)) return false;
  if (!isIntegerBetween(value.roundsWon, 0, 2) || !isInputLatch(value.inputLatch)) return false;
  if ((phase === "hitstun" || phase === "blockstun") && value.stunFrames === 0) return false;
  if (phase === "knockdown" && value.knockdownFrames === 0) return false;
  return !(value.grounded === true && value.y !== 0);
}

function isCombatEvent(value: unknown, stateFrame: number, stateRound: number, fighterIds: readonly PitFighterId[]): value is PitCombatEvent {
  if (!isRecord(value) || !isIntegerBetween(value.frame, 0, stateFrame) || typeof value.type !== "string") return false;
  const knownFighter = (candidate: unknown) => isFighterId(candidate) && fighterIds.includes(candidate);
  if (value.type === "round-start") return isIntegerBetween(value.round, 1, stateRound);
  if (value.type === "attack-start") return knownFighter(value.fighterId) && isAttackKind(value.attack);
  if (value.type === "throw-start" || value.type === "combo-break") return knownFighter(value.fighterId);
  if (value.type === "block") {
    return knownFighter(value.attackerId) && knownFighter(value.defenderId) && value.attackerId !== value.defenderId &&
      isAttackKind(value.attack) && isIntegerBetween(value.damage, 0, 1_000);
  }
  if (value.type === "hit") {
    return knownFighter(value.attackerId) && knownFighter(value.defenderId) && value.attackerId !== value.defenderId &&
      (value.attack === "throw" || isAttackKind(value.attack)) && isIntegerBetween(value.damage, 1, 1_000) &&
      isIntegerBetween(value.combo, 1, PIT_MAX_COMBO_HITS) && typeof value.antiAir === "boolean";
  }
  if (value.type === "round-end") return isRoundResult(value.result, stateFrame, stateRound);
  return value.type === "match-end" && knownFighter(value.winnerId);
}

export function deserializePitCombat(serialized: string): PitCombatState {
  let candidate: unknown;
  try {
    candidate = JSON.parse(serialized);
  } catch {
    throw new Error("Invalid or incompatible THE PIT combat state.");
  }
  if (!isRecord(candidate) ||
    candidate.version !== PIT_STATE_VERSION ||
    candidate.tickRate !== PIT_TICK_RATE ||
    candidate.arenaId !== PIT_ARENA.id ||
    !isRecord(candidate.rules) ||
    !PIT_COMBAT_MODES.includes(candidate.rules.mode as PitCombatMode) ||
    !isIntegerBetween(candidate.frame, 0, Number.MAX_SAFE_INTEGER) ||
    !PIT_MATCH_PHASES.includes(candidate.phase as PitMatchPhase) ||
    !isIntegerBetween(candidate.round, 1, 9_999) ||
    !isIntegerBetween(candidate.roundFramesRemaining, 0, PIT_ROUND_FRAMES) ||
    !isIntegerBetween(candidate.transitionFramesRemaining, 0, PIT_ROUND_TRANSITION_FRAMES) ||
    !Array.isArray(candidate.fighters) || candidate.fighters.length !== 2) {
    throw new Error("Invalid or incompatible THE PIT combat state.");
  }

  const frame = candidate.frame as number;
  const round = candidate.round as number;
  const fighters = candidate.fighters;
  if (!isFighterState(fighters[0], 0, frame) || !isFighterState(fighters[1], 1, frame) || fighters[0].definitionId === fighters[1].definitionId) {
    throw new Error("Invalid or incompatible THE PIT combat state.");
  }
  const fighterIds = [fighters[0].definitionId, fighters[1].definitionId] as const;
  if (!(candidate.lastRoundResult === null || isRoundResult(candidate.lastRoundResult, frame, round)) ||
    !(candidate.matchWinnerId === null || (isFighterId(candidate.matchWinnerId) && fighterIds.includes(candidate.matchWinnerId))) ||
    !Array.isArray(candidate.events) || candidate.events.length > 32 ||
    !candidate.events.every((event) => isCombatEvent(event, frame, round, fighterIds))) {
    throw new Error("Invalid or incompatible THE PIT combat state.");
  }

  const phase = candidate.phase as PitMatchPhase;
  const mode = candidate.rules.mode as PitCombatMode;
  if (mode === "training") {
    if (phase !== "round" || round !== 1 || candidate.roundFramesRemaining !== PIT_ROUND_FRAMES ||
      candidate.transitionFramesRemaining !== 0 || candidate.lastRoundResult !== null || candidate.matchWinnerId !== null ||
      fighters.some((fighter) => fighter.roundsWon !== 0)) {
      throw new Error("Invalid or incompatible THE PIT combat state.");
    }
  } else if ((phase === "round" && (candidate.transitionFramesRemaining !== 0 || candidate.matchWinnerId !== null)) ||
    (phase === "round-over" && (candidate.lastRoundResult === null || candidate.lastRoundResult.round !== round || candidate.matchWinnerId !== null || candidate.transitionFramesRemaining === 0)) ||
    (phase === "match-over" && (candidate.lastRoundResult === null || candidate.lastRoundResult.round !== round || candidate.matchWinnerId === null || candidate.transitionFramesRemaining !== 0))) {
    throw new Error("Invalid or incompatible THE PIT combat state.");
  }
  if (phase === "match-over") {
    const winner = fighters.find((fighter) => fighter.definitionId === candidate.matchWinnerId);
    if (!winner || winner.roundsWon < 2) throw new Error("Invalid or incompatible THE PIT combat state.");
  }

  const restored = cloneState(candidate as unknown as PitCombatState);
  restored.events = (candidate.events as PitCombatEvent[]).map((event) =>
    event.type === "round-end" ? { ...event, result: { ...event.result } } : { ...event },
  );
  return restored;
}
