import { PIT_EXPANSION_FIGHTERS, type PitExpansionFighterId } from "./pitRosterExpansion";
import { PIT_EXTENSION_ARENAS, PIT_EXTENSION_ARENA_IDS, type PitRuntimeArenaId } from "./pitArenaExtensions";
import {
  PIT_CHRONICLE_BOSSES,
  PIT_FIRST_EDITION_ARENAS,
  PIT_FIRST_EDITION_ARENA_IDS,
  PIT_FIRST_EDITION_FIGHTERS,
  PIT_FIRST_EDITION_FIGHTER_IDS,
  type PitFirstEditionCombatantId,
  type PitFirstEditionFighterId,
  type PitEditionTechniqueDefinition,
  type PitTechniqueStatusKind,
} from "./pitFirstEdition";

export const PIT_TICK_RATE = 60;
export const PIT_ROUND_SECONDS = 99;
export const PIT_ROUND_FRAMES = PIT_TICK_RATE * PIT_ROUND_SECONDS;
export const PIT_ROUND_TRANSITION_FRAMES = PIT_TICK_RATE * 2;
export const PIT_COMBO_RESET_FRAMES = 45;
export const PIT_MAX_COMBO_HITS = 6;
export const PIT_MAX_TECHNIQUE_EFFECTS = 8;
export const PIT_STATE_VERSION = 5;
/** Eight 60Hz reaction ticks after a grounded neutral/guard capture. */
export const PIT_THROW_TECH_WINDOW_FRAMES = 8;
export const PIT_THROW_TECH_RECOVERY_FRAMES = 12;
export const PIT_MAX_TRAQUE = 1_000;
export const PIT_ROUND_TRAQUE_CARRY_CAP = 500;
export const PIT_CLOAK_COST = 350;
export const PIT_RUPTURE_COST = PIT_MAX_TRAQUE;
export const PIT_INSTINCT_TRAQUE_BONUS = 200;
export const PIT_INSTINCT_FRAMES = 360;
export const PIT_CLOAK_STARTUP_FRAMES = 8;
export const PIT_CLOAK_ACTIVE_FRAMES = 180;
export const PIT_CLOAK_RECOVERY_FRAMES = 10;
export const PIT_CLOAK_COOLDOWN_FRAMES = 240;
export const PIT_RUPTURE_INVULNERABILITY_FRAMES = 20;
export const PIT_RUPTURE_BLOCKSTUN_FRAMES = 18;
export const PIT_RUPTURE_PUSHBACK = 96;
export const PIT_PRESSURE_GAIN_INTERVAL = 12;
export const PIT_PRESSURE_MIN_DISTANCE = 140;
export const PIT_PRESSURE_MAX_DISTANCE = 360;

export type PitFighterId = PitFirstEditionCombatantId | PitExpansionFighterId;
export type PitPlayableFighterId = PitFirstEditionFighterId;
export type PitArenaId = PitRuntimeArenaId;
export const PIT_PLAYABLE_FIGHTER_IDS = PIT_FIRST_EDITION_FIGHTER_IDS;
export const PIT_ARENA_IDS = [...PIT_FIRST_EDITION_ARENA_IDS, ...PIT_EXTENSION_ARENA_IDS] as const;
export type PitAttackKind = "light" | "medium" | "heavy" | "technique";
export type PitHitLevel = "high" | "mid" | "low";
export type PitGuard = "high" | "low" | null;
export type PitCloakPhase = "inactive" | "startup" | "active" | "recovery";
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
  arenaId?: PitArenaId;
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
  technique: PitEditionTechniqueDefinition;
}

export interface PitArenaDefinition {
  id: PitArenaId;
  name: string;
  setting: string;
  width: number;
  height: number;
  groundY: number;
  leftWall: number;
  rightWall: number;
  spawnX: readonly [number, number];
  competitiveHazards: false;
  palette: {
    sky: string;
    ground: string;
    accent: string;
  };
  layers: readonly {
    id: string;
    depth: "far" | "mid" | "near" | "foreground";
    parallax: number;
  }[];
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
  resource?: boolean;
}

interface PitInputLatch {
  jump: boolean;
  attack: PitAttackKind | null;
  throw: boolean;
  resource: boolean;
}

export interface PitActionState {
  kind: "attack" | "throw";
  attack: PitAttackKind | null;
  frame: number;
  connected: boolean;
}

export interface PitTechniqueStatusState {
  kind: PitTechniqueStatusKind;
  sourceFighterId: PitFighterId;
  framesRemaining: number;
}

export type PitTechniqueEffectPhase = "arming" | "active" | "returning";

export interface PitTechniqueEffectState {
  id: number;
  ownerSlot: 0 | 1;
  techniqueId: string;
  x: number;
  y: number;
  direction: -1 | 1;
  age: number;
  phase: PitTechniqueEffectPhase;
  hitCount: number;
  rehitFrames: number;
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
  traque: number;
  pressureFrames: number;
  ruptureUsedThisRound: boolean;
  survivalTriggeredThisRound: boolean;
  survivalInstinctFrames: number;
  cloakPhase: PitCloakPhase;
  cloakFramesRemaining: number;
  cloakCooldownFrames: number;
  techniqueStatus: PitTechniqueStatusState | null;
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
  | { type: "throw-caught"; frame: number; attackerId: PitFighterId; defenderId: PitFighterId }
  | { type: "throw-tech"; frame: number; attackerId: PitFighterId; defenderId: PitFighterId }
  | { type: "hit"; frame: number; attackerId: PitFighterId; defenderId: PitFighterId; attack: PitAttackKind | "throw"; damage: number; combo: number; antiAir: boolean }
  | { type: "block"; frame: number; attackerId: PitFighterId; defenderId: PitFighterId; attack: PitAttackKind; damage: number }
  | { type: "traque-gain"; frame: number; fighterId: PitFighterId; amount: number; source: "damage" | "guard" | "pressure" | "instinct" }
  | { type: "rupture"; frame: number; fighterId: PitFighterId; attackerId: PitFighterId }
  | { type: "survival-instinct"; frame: number; fighterId: PitFighterId }
  | { type: "cloak-start"; frame: number; fighterId: PitFighterId }
  | { type: "cloak-end"; frame: number; fighterId: PitFighterId; reason: "expired" | "action" | "hit" | "rupture" | "tracked" }
  | { type: "combo-break"; frame: number; fighterId: PitFighterId }
  | { type: "round-end"; frame: number; result: PitRoundResult }
  | { type: "match-end"; frame: number; winnerId: PitFighterId };

export interface PitPendingThrow {
  attackerSlot: 0 | 1;
  capturedFrame: number;
  framesRemaining: number;
}

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
  techniqueEffects: PitTechniqueEffectState[];
  pendingThrow: PitPendingThrow | null;
  nextTechniqueEffectId: number;
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

const CONTENT_FIGHTERS = {
  ...PIT_FIRST_EDITION_FIGHTERS,
  ...PIT_CHRONICLE_BOSSES,
  ...PIT_EXPANSION_FIGHTERS,
};

export const PIT_FIGHTERS: Record<PitFighterId, PitFighterDefinition> =
  Object.fromEntries(
    Object.entries(CONTENT_FIGHTERS).map(([id, definition]) => [
      id,
      {
        id: definition.id,
        name: definition.name,
        epithet: definition.epithet,
        maxHealth: definition.maxHealth,
        walkSpeed: definition.walkSpeed,
        airSpeed: definition.airSpeed,
        jumpSpeed: definition.jumpSpeed,
        power: definition.power,
        bodyWidth: definition.bodyWidth,
        bodyHeight: definition.bodyHeight,
        crouchHeight: definition.crouchHeight,
        palette: { ...definition.palette },
        attacks: {
          light: { ...definition.attacks.light },
          medium: { ...definition.attacks.medium },
          heavy: { ...definition.attacks.heavy },
          technique: { ...definition.attacks.technique },
        },
        technique: { ...definition.technique },
      },
    ]),
  ) as Record<PitFighterId, PitFighterDefinition>;

export const PIT_ARENAS: Record<PitArenaId, PitArenaDefinition> =
  Object.fromEntries(
    Object.entries({ ...PIT_FIRST_EDITION_ARENAS, ...PIT_EXTENSION_ARENAS }).map(([id, arena]) => [
      id,
      {
        ...arena,
        id: arena.id,
        palette: { ...arena.palette },
        layers: arena.layers.map((layer) => ({ ...layer })),
      },
    ]),
  ) as unknown as Record<PitArenaId, PitArenaDefinition>;

/** Backward-compatible alias for the original vertical-slice arena. */
export const PIT_ARENA = PIT_ARENAS["the-pit"];

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
    resource: Boolean(input.resource),
  };
}

function freshFighter(
  slot: 0 | 1,
  id: PitFighterId,
  roundsWon = 0,
  inputLatch: PitInputLatch = latchFromInput(),
  traque = 0,
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
    traque: Math.max(0, Math.min(PIT_MAX_TRAQUE, Math.round(traque))),
    pressureFrames: 0,
    ruptureUsedThisRound: false,
    survivalTriggeredThisRound: false,
    survivalInstinctFrames: 0,
    cloakPhase: "inactive",
    cloakFramesRemaining: 0,
    cloakCooldownFrames: 0,
    techniqueStatus: null,
    inputLatch: { ...inputLatch },
  };
}

export function createPitCombatState(
  leftId: PitFighterId = "jungle-hunter",
  rightId: PitFighterId = "berserker",
  options: PitCombatOptions = {},
): PitCombatState {
  if (
    leftId === rightId ||
    !Object.hasOwn(PIT_FIGHTERS, leftId) ||
    !Object.hasOwn(PIT_FIGHTERS, rightId)
  ) {
    throw new Error("THE PIT requires two distinct registered combatants.");
  }
  if (options.mode !== undefined && options.mode !== "match" && options.mode !== "training") {
    throw new Error("THE PIT requires a valid combat mode.");
  }
  const arenaId = options.arenaId ?? PIT_ARENA.id;
  if (!Object.hasOwn(PIT_ARENAS, arenaId)) {
    throw new Error("THE PIT requires a registered arena.");
  }
  return {
    version: PIT_STATE_VERSION,
    tickRate: PIT_TICK_RATE,
    frame: 0,
    phase: "round",
    round: 1,
    roundFramesRemaining: PIT_ROUND_FRAMES,
    transitionFramesRemaining: 0,
    arenaId,
    rules: { mode: options.mode ?? "match" },
    fighters: [freshFighter(0, leftId), freshFighter(1, rightId)],
    techniqueEffects: [],
    pendingThrow: null,
    nextTechniqueEffectId: 1,
    lastRoundResult: null,
    matchWinnerId: null,
    events: [{ type: "round-start", frame: 0, round: 1 }],
  };
}

function cloneFighter(fighter: PitFighterState): PitFighterState {
  return {
    ...fighter,
    action: fighter.action ? { ...fighter.action } : null,
    techniqueStatus: fighter.techniqueStatus ? { ...fighter.techniqueStatus } : null,
    inputLatch: { ...fighter.inputLatch },
  };
}

function cloneState(state: PitCombatState): PitCombatState {
  return {
    ...state,
    rules: { ...state.rules },
    fighters: [cloneFighter(state.fighters[0]), cloneFighter(state.fighters[1])],
    techniqueEffects: state.techniqueEffects.map((effect) => ({ ...effect })),
    pendingThrow: state.pendingThrow ? { ...state.pendingThrow } : null,
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

function addTraque(
  state: PitCombatState,
  fighter: PitFighterState,
  requestedAmount: number,
  source: "damage" | "guard" | "pressure" | "instinct",
): number {
  const amount = Math.max(0, Math.min(Math.round(requestedAmount), PIT_MAX_TRAQUE - fighter.traque));
  if (amount === 0) return 0;
  fighter.traque += amount;
  state.events.push({
    type: "traque-gain",
    frame: state.frame,
    fighterId: fighter.definitionId,
    amount,
    source,
  });
  return amount;
}

function startCloak(state: PitCombatState, fighter: PitFighterState): void {
  fighter.traque -= PIT_CLOAK_COST;
  fighter.cloakPhase = "startup";
  fighter.cloakFramesRemaining = PIT_CLOAK_STARTUP_FRAMES;
  fighter.guard = null;
  fighter.crouching = false;
  state.events.push({ type: "cloak-start", frame: state.frame, fighterId: fighter.definitionId });
}

function endCloak(
  state: PitCombatState,
  fighter: PitFighterState,
  reason: "expired" | "action" | "hit" | "rupture" | "tracked",
  useRecovery: boolean,
): void {
  if (fighter.cloakPhase === "inactive") return;
  if (fighter.cloakPhase === "recovery") {
    if (!useRecovery) {
      fighter.cloakPhase = "inactive";
      fighter.cloakFramesRemaining = 0;
      fighter.cloakCooldownFrames = PIT_CLOAK_COOLDOWN_FRAMES;
    }
    return;
  }
  fighter.cloakPhase = useRecovery ? "recovery" : "inactive";
  fighter.cloakFramesRemaining = useRecovery ? PIT_CLOAK_RECOVERY_FRAMES : 0;
  if (!useRecovery) fighter.cloakCooldownFrames = PIT_CLOAK_COOLDOWN_FRAMES;
  state.events.push({ type: "cloak-end", frame: state.frame, fighterId: fighter.definitionId, reason });
}

function advanceCloakTimer(state: PitCombatState, fighter: PitFighterState): void {
  if (fighter.cloakPhase === "inactive") {
    fighter.cloakCooldownFrames = Math.max(0, fighter.cloakCooldownFrames - 1);
    return;
  }
  fighter.cloakFramesRemaining = Math.max(0, fighter.cloakFramesRemaining - 1);
  if (fighter.cloakFramesRemaining > 0) return;
  if (fighter.cloakPhase === "startup") {
    fighter.cloakPhase = "active";
    fighter.cloakFramesRemaining = PIT_CLOAK_ACTIVE_FRAMES;
  } else if (fighter.cloakPhase === "active") {
    endCloak(state, fighter, "expired", true);
  } else {
    fighter.cloakPhase = "inactive";
    fighter.cloakFramesRemaining = 0;
    fighter.cloakCooldownFrames = PIT_CLOAK_COOLDOWN_FRAMES;
  }
}

function techniqueStatusDefinition(
  fighter: PitFighterState,
): PitEditionTechniqueDefinition | null {
  if (!fighter.techniqueStatus) return null;
  const source = PIT_FIGHTERS[fighter.techniqueStatus.sourceFighterId];
  return source.technique.status === fighter.techniqueStatus.kind ? source.technique : null;
}

function advanceTechniqueStatuses(state: PitCombatState): void {
  for (const fighter of state.fighters) {
    if (!fighter.techniqueStatus) continue;
    fighter.techniqueStatus.framesRemaining = Math.max(
      0,
      fighter.techniqueStatus.framesRemaining - 1,
    );
    if (fighter.techniqueStatus.framesRemaining === 0) fighter.techniqueStatus = null;
  }
}

function updateFighter(
  state: PitCombatState,
  fighter: PitFighterState,
  opponent: PitFighterState,
  input: PitInput,
): void {
  const definition = PIT_FIGHTERS[fighter.definitionId];
  const statusDefinition = techniqueStatusDefinition(fighter);
  const jumpPressed = Boolean(input.jump) && !fighter.inputLatch.jump;
  const throwPressed = Boolean(input.throw) && !fighter.inputLatch.throw;
  const attackPressed = isPressed(input.attack, fighter.inputLatch.attack);
  const resourcePressed = Boolean(input.resource) && !fighter.inputLatch.resource;

  advanceCloakTimer(state, fighter);
  if (
    fighter.cloakPhase === "active" &&
    (attackPressed || throwPressed || Boolean(input.guardHigh) || Boolean(input.guardLow))
  ) {
    endCloak(state, fighter, "action", true);
  }

  const requestsAnotherAction =
    attackPressed ||
    throwPressed ||
    Boolean(input.guardHigh) ||
    Boolean(input.guardLow) ||
    jumpPressed ||
    Boolean(input.down);
  if (
    resourcePressed &&
    !requestsAnotherAction &&
    fighter.health > 0 &&
    fighter.phase === "idle" &&
    fighter.action === null &&
    fighter.grounded &&
    fighter.guard === null &&
    fighter.cloakPhase === "inactive" &&
    fighter.cloakCooldownFrames === 0 &&
    fighter.traque >= PIT_CLOAK_COST &&
    statusDefinition?.cloakLocked !== true
  ) {
    startCloak(state, fighter);
  }

  if (fighter.wakeInvulnerabilityFrames > 0) fighter.wakeInvulnerabilityFrames -= 1;
  if (state.frame - fighter.comboLastHitFrame > PIT_COMBO_RESET_FRAMES && fighter.phase === "idle") {
    fighter.comboHitsReceived = 0;
  }

  if (fighter.cloakPhase === "startup" && fighter.phase === "idle" && fighter.action === null) {
    const direction = Number(Boolean(input.right)) - Number(Boolean(input.left));
    const speedMultiplier = fighter.survivalInstinctFrames > 0 ? 1.08 : 1;
    fighter.velocityX = direction * definition.walkSpeed * 0.5 * speedMultiplier;
    fighter.guard = null;
    fighter.crouching = false;
  } else if (fighter.phase === "hitstun" || fighter.phase === "blockstun") {
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
    const instinctSpeed = fighter.survivalInstinctFrames > 0 ? 1.08 : 1;
    const cloakSpeed = fighter.cloakPhase === "active" ? 1.12 : 1;
    const statusSpeed = statusDefinition?.movementScale ?? 1;
    const speed =
      (fighter.grounded ? definition.walkSpeed : definition.airSpeed) *
      instinctSpeed *
      cloakSpeed *
      statusSpeed;
    fighter.velocityX = direction * (fighter.crouching ? speed * 0.42 : speed);

    if (
      jumpPressed &&
      fighter.grounded &&
      fighter.guard === null &&
      statusDefinition?.jumpLocked !== true
    ) {
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
    resource: Boolean(input.resource),
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

function getPitFighterBoxesInternal(
  fighter: PitFighterState,
  worldTechniqueHasHitbox: boolean,
): PitFighterBoxes {
  const definition = PIT_FIGHTERS[fighter.definitionId];
  const height = bodyHeight(fighter);
  const pushbox = {
    x: fighter.x - definition.bodyWidth / 2,
    y: fighter.y,
    width: definition.bodyWidth,
    height,
  };
  let hitbox: PitBox | null = null;
  const worldTechnique =
    fighter.action?.kind === "attack" && fighter.action.attack === "technique";
  if (
    fighter.action &&
    fighter.phase === "active" &&
    (!worldTechnique || worldTechniqueHasHitbox)
  ) {
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

export function getPitFighterBoxes(fighter: PitFighterState): PitFighterBoxes {
  return getPitFighterBoxesInternal(fighter, false);
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

function techniqueDefinitionForEffect(
  state: PitCombatState,
  effect: PitTechniqueEffectState,
): PitEditionTechniqueDefinition {
  return PIT_FIGHTERS[state.fighters[effect.ownerSlot].definitionId].technique;
}

function techniqueEffectX(
  fighter: PitFighterState,
  technique: PitEditionTechniqueDefinition,
): number {
  const bodyOffset = PIT_FIGHTERS[fighter.definitionId].bodyWidth * 0.2;
  return fighter.facing === 1
    ? fighter.x + bodyOffset
    : fighter.x - technique.width - bodyOffset;
}

export function getPitTechniqueBox(
  state: PitCombatState,
  effect: PitTechniqueEffectState,
): PitBox {
  const technique = techniqueDefinitionForEffect(state, effect);
  return {
    x: effect.x,
    y: effect.y,
    width: technique.width,
    height: technique.height,
  };
}

function spawnTechniqueEffects(state: PitCombatState): void {
  for (const fighter of state.fighters) {
    const action = fighter.action;
    const move = PIT_FIGHTERS[fighter.definitionId].attacks.technique;
    if (
      action?.kind !== "attack" ||
      action.attack !== "technique" ||
      fighter.phase !== "active" ||
      action.frame !== move.startup
    ) {
      continue;
    }
    const technique = PIT_FIGHTERS[fighter.definitionId].technique;
    const effect: PitTechniqueEffectState = {
      id: state.nextTechniqueEffectId,
      ownerSlot: fighter.slot,
      techniqueId: technique.id,
      x: techniqueEffectX(fighter, technique),
      y: fighter.y + technique.verticalOffset,
      direction: fighter.facing,
      age: 0,
      phase: technique.armFrames > 0 ? "arming" : "active",
      hitCount: 0,
      rehitFrames: 0,
    };
    state.nextTechniqueEffectId += 1;
    if (state.techniqueEffects.length >= PIT_MAX_TECHNIQUE_EFFECTS) {
      state.techniqueEffects.shift();
    }
    state.techniqueEffects.push(effect);
  }
}

function advanceTechniqueEffects(state: PitCombatState): void {
  const retained: PitTechniqueEffectState[] = [];
  for (const effect of state.techniqueEffects) {
    const owner = state.fighters[effect.ownerSlot];
    const opponent = state.fighters[effect.ownerSlot === 0 ? 1 : 0];
    const technique = techniqueDefinitionForEffect(state, effect);
    effect.age += 1;
    effect.rehitFrames = Math.max(0, effect.rehitFrames - 1);

    if (effect.phase === "arming" && effect.age >= technique.armFrames) {
      effect.phase = "active";
    }
    if (
      technique.motion === "returning" &&
      technique.returnFrame !== null &&
      effect.age >= technique.returnFrame
    ) {
      effect.phase = "returning";
    }

    if (technique.motion === "attached") {
      if (technique.ownerDashSpeed !== 0 && owner.health > 0) {
        owner.x = clampFighterX(
          owner,
          owner.x + effect.direction * technique.ownerDashSpeed,
        );
      }
      effect.x = techniqueEffectX(owner, technique);
      effect.y = owner.y + technique.verticalOffset;
    } else if (effect.phase !== "arming") {
      if (technique.motion === "homing") {
        const targetCenter = opponent.x;
        const effectCenter = effect.x + technique.width / 2;
        effect.direction = targetCenter >= effectCenter ? 1 : -1;
      } else if (effect.phase === "returning") {
        const effectCenter = effect.x + technique.width / 2;
        effect.direction = owner.x >= effectCenter ? 1 : -1;
      }
      if (technique.motion !== "stationary") {
        effect.x += effect.direction * technique.speed;
      }
    }

    const returnedToOwner =
      effect.phase === "returning" &&
      technique.returnFrame !== null &&
      effect.age > technique.returnFrame &&
      Math.abs(effect.x + technique.width / 2 - owner.x) <= technique.speed;
    const outsideArena =
      effect.x + technique.width < PIT_ARENA.leftWall ||
      effect.x > PIT_ARENA.rightWall;
    if (
      effect.age > technique.lifetimeFrames ||
      returnedToOwner ||
      outsideArena ||
      owner.health <= 0
    ) {
      // Expiration is state-only; hit/block events already expose combat feedback.
    } else {
      retained.push(effect);
    }
  }
  state.techniqueEffects = retained;
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
  effectId?: number;
  technique?: PitEditionTechniqueDefinition;
  impactDirection?: -1 | 1;
  /** Damage before combo and survival-instinct scaling. */
  comboDamageBase?: number;
}

function guardBlocks(guard: PitGuard, hitLevel: PitHitLevel): boolean {
  if (hitLevel === "mid") return guard !== null;
  return guard === hitLevel;
}

function damageAfterInstinct(defender: PitFighterState, damage: number): number {
  if (damage === 0 || defender.survivalInstinctFrames === 0) return damage;
  return Math.max(1, Math.ceil(damage * 0.9));
}

function collectImpact(
  state: PitCombatState,
  attacker: PitFighterState,
  defender: PitFighterState,
  legacyV2TechniqueHitbox = false,
): PendingImpact | null {
  const actionState = attacker.action;
  if (!actionState || attacker.phase !== "active" || actionState.connected) return null;
  if (defender.health <= 0 || defender.wakeInvulnerabilityFrames > 0) return null;
  const hitbox = getPitFighterBoxesInternal(
    attacker,
    legacyV2TechniqueHitbox,
  ).hitbox;
  if (!hitbox || !boxesOverlap(hitbox, getPitFighterBoxes(defender).hurtbox)) return null;

  if (actionState.kind === "throw") {
    if (!defender.grounded || defender.phase === "knockdown") return null;
    return {
      attackerSlot: attacker.slot,
      defenderSlot: defender.slot,
      kind: "throw",
      blocked: false,
      damage: damageAfterInstinct(
        defender,
        Math.round(THROW_DAMAGE * PIT_FIGHTERS[attacker.definitionId].power),
      ),
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
  const comboDamageBase = move.damage * PIT_FIGHTERS[attacker.definitionId].power;
  return {
    attackerSlot: attacker.slot,
    defenderSlot: defender.slot,
    kind: move.kind,
    blocked,
    damage: damageAfterInstinct(
      defender,
      blocked
        ? move.chipDamage
        : Math.max(1, Math.round(comboDamageBase * scale)),
    ),
    stun: blocked ? move.blockstun : move.hitstun,
    pushback: blocked ? move.pushback * 0.62 : move.pushback,
    knockdown: !blocked && (move.knockdown || antiAir),
    launchY: antiAir ? move.launchY : 0,
    combo,
    comboDamageBase: blocked ? undefined : comboDamageBase,
  };
}

/** A capture is short shared hitstop: actors, statuses and projectiles wait, but
 * the match clock and input edges continue. No damage or resource is awarded
 * before its deadline. Attack recovery/hitstun and airborne targets cannot tech. */
function canTechThrow(fighter: PitFighterState): boolean {
  return fighter.grounded && fighter.health > 0 &&
    (fighter.phase === "idle" || fighter.phase === "blockstun" ||
      (fighter.action?.kind === "throw" &&
        (fighter.phase === "startup" || fighter.phase === "active")));
}

function finishThrowTech(state: PitCombatState, attackerSlot: 0 | 1): void {
  const attacker = state.fighters[attackerSlot];
  const defender = state.fighters[attackerSlot === 0 ? 1 : 0];
  const direction = attacker.x <= defender.x ? 1 : -1;
  state.pendingThrow = null;
  for (const fighter of state.fighters) {
    fighter.action = null;
    fighter.phase = "blockstun";
    fighter.stunFrames = PIT_THROW_TECH_RECOVERY_FRAMES;
    fighter.knockdownFrames = 0;
    fighter.velocityX = 0;
    fighter.velocityY = 0;
    fighter.guard = null;
    fighter.crouching = false;
    fighter.comboHitsReceived = 0;
    fighter.pressureFrames = 0;
  }
  attacker.x = clampFighterX(attacker, attacker.x - direction * 28);
  defender.x = clampFighterX(defender, defender.x + direction * 28);
  resolvePushboxes(state.fighters[0], state.fighters[1]);
  state.events.push({ type: "throw-tech", frame: state.frame,
    attackerId: attacker.definitionId, defenderId: defender.definitionId });
}

function beginThrowCapture(state: PitCombatState, impact: PendingImpact): void {
  state.pendingThrow = { attackerSlot: impact.attackerSlot,
    capturedFrame: state.frame, framesRemaining: PIT_THROW_TECH_WINDOW_FRAMES };
  for (const fighter of state.fighters) {
    fighter.action = null;
    fighter.phase = "blockstun";
    fighter.stunFrames = 1;
    fighter.knockdownFrames = 0;
    fighter.guard = null;
    fighter.crouching = false;
    fighter.velocityX = 0;
    fighter.velocityY = 0;
    endCloak(state, fighter, "action", false);
  }
  state.events.push({ type: "throw-caught", frame: state.frame,
    attackerId: state.fighters[impact.attackerSlot].definitionId,
    defenderId: state.fighters[impact.defenderSlot].definitionId });
}

function advancePendingThrow(state: PitCombatState, inputs: readonly [PitInput, PitInput]): void {
  const pending = state.pendingThrow!;
  const defenderSlot = pending.attackerSlot === 0 ? 1 : 0;
  const defender = state.fighters[defenderSlot];
  const pressed = Boolean(inputs[defenderSlot]?.throw) && !defender.inputLatch.throw;
  // All edges are consumed while captured; holding a button never auto-retries.
  state.fighters[0].inputLatch = latchFromInput(inputs[0] ?? {});
  state.fighters[1].inputLatch = latchFromInput(inputs[1] ?? {});
  if (pressed) {
    finishThrowTech(state, pending.attackerSlot);
    return;
  }
  pending.framesRemaining -= 1;
  if (pending.framesRemaining > 0) return;
  state.pendingThrow = null;
  const attacker = state.fighters[pending.attackerSlot];
  attacker.phase = "blockstun";
  attacker.stunFrames = THROW_RECOVERY;
  applyImpact(state, {
    attackerSlot: pending.attackerSlot, defenderSlot, kind: "throw",
    blocked: false, damage: damageAfterInstinct(defender,
      Math.round(THROW_DAMAGE * PIT_FIGHTERS[attacker.definitionId].power)),
    stun: 42, pushback: 42, knockdown: true, launchY: 0, combo: 1,
  });
}

interface CollectedTechniqueImpacts {
  impacts: PendingImpact[];
  counteredSlots: Set<0 | 1>;
}

function collectTechniqueImpacts(state: PitCombatState): CollectedTechniqueImpacts {
  const impacts: PendingImpact[] = [];
  const counteredSlots = new Set<0 | 1>();
  for (const effect of state.techniqueEffects) {
    const technique = techniqueDefinitionForEffect(state, effect);
    if (
      effect.phase === "arming" ||
      effect.rehitFrames > 0 ||
      effect.hitCount >= technique.maxHits ||
      (effect.hitCount > 0 && technique.motion === "returning" && effect.phase !== "returning")
    ) {
      continue;
    }
    const attacker = state.fighters[effect.ownerSlot];
    const defenderSlot = (effect.ownerSlot === 0 ? 1 : 0) as 0 | 1;
    const defender = state.fighters[defenderSlot];
    if (defender.health <= 0 || defender.wakeInvulnerabilityFrames > 0) continue;
    if (
      technique.trigger === "counter" &&
      !(defender.action && defender.phase === "active")
    ) {
      continue;
    }
    if (technique.trigger === "counter") {
      const incomingHitbox = getPitFighterBoxes(defender).hitbox;
      if (
        !incomingHitbox ||
        !boxesOverlap(incomingHitbox, getPitFighterBoxes(attacker).hurtbox)
      ) {
        continue;
      }
    }
    if (!boxesOverlap(getPitTechniqueBox(state, effect), getPitFighterBoxes(defender).hurtbox)) {
      continue;
    }

    const move = PIT_FIGHTERS[attacker.definitionId].attacks.technique;
    const marksOnly = technique.contactEffect === "mark";
    const blocked =
      !marksOnly &&
      !technique.guardBreak &&
      guardBlocks(defender.guard, move.hitLevel) &&
      (defender.phase === "idle" || defender.phase === "blockstun");
    const antiAir = move.antiAir && !defender.grounded;
    const continuesCombo =
      !blocked &&
      defender.comboHitsReceived > 0 &&
      (defender.phase === "hitstun" || defender.phase === "knockdown");
    const combo = marksOnly
      ? 0
      : blocked
        ? 0
        : Math.min(
          PIT_MAX_COMBO_HITS,
          continuesCombo ? defender.comboHitsReceived + 1 : 1,
        );
    const comboScale = blocked || marksOnly
      ? 1
      : Math.max(0.35, 1 - Math.max(0, combo - 1) * 0.12);
    const comboDamageBase =
      move.damage *
      PIT_FIGHTERS[attacker.definitionId].power *
      technique.damageScale;
    const rawDamage = marksOnly
      ? 0
      : blocked
        ? Math.round(move.chipDamage * technique.chipScale)
        : Math.max(1, Math.round(comboDamageBase * comboScale));
    impacts.push({
      attackerSlot: effect.ownerSlot,
      defenderSlot,
      kind: "technique",
      blocked,
      damage: damageAfterInstinct(defender, rawDamage),
      stun: marksOnly
        ? 0
        : (blocked ? move.blockstun + technique.blockstunBonus : move.hitstun + technique.hitstunBonus),
      pushback: marksOnly
        ? 0
        : (blocked ? move.pushback * 0.62 : move.pushback) * technique.pushbackScale,
      knockdown: !marksOnly && !blocked && (technique.knockdown || antiAir),
      launchY: !marksOnly && antiAir ? move.launchY : 0,
      combo,
      effectId: effect.id,
      technique,
      impactDirection: effect.direction,
      comboDamageBase: blocked || marksOnly ? undefined : comboDamageBase,
    });
    if (technique.trigger === "counter") counteredSlots.add(defenderSlot);
  }
  return { impacts, counteredSlots };
}

function sequenceImpact(
  state: PitCombatState,
  impact: PendingImpact,
): PendingImpact | null {
  const defender = state.fighters[impact.defenderSlot];
  if (defender.health <= 0) return null;
  if (impact.blocked || impact.comboDamageBase === undefined) return impact;

  const continuesCombo =
    defender.comboHitsReceived > 0 &&
    (defender.phase === "hitstun" || defender.phase === "knockdown");
  const combo = Math.min(
    PIT_MAX_COMBO_HITS,
    continuesCombo ? defender.comboHitsReceived + 1 : 1,
  );
  const comboScale = Math.max(0.35, 1 - Math.max(0, combo - 1) * 0.12);
  return {
    ...impact,
    combo,
    damage: damageAfterInstinct(
      defender,
      Math.max(1, Math.round(impact.comboDamageBase * comboScale)),
    ),
    knockdown: impact.knockdown || combo >= PIT_MAX_COMBO_HITS,
  };
}

function applyImpact(state: PitCombatState, impact: PendingImpact): void {
  const attacker = state.fighters[impact.attackerSlot];
  const defender = state.fighters[impact.defenderSlot];
  if (
    attacker.action &&
    (impact.effectId === undefined ||
      (attacker.action.kind === "attack" && attacker.action.attack === "technique"))
  ) {
    attacker.action.connected = true;
  }
  if (impact.effectId !== undefined && impact.technique) {
    const effect = state.techniqueEffects.find((candidate) => candidate.id === impact.effectId);
    if (effect) {
      effect.hitCount += 1;
      effect.rehitFrames = impact.technique.rehitFrames;
      if (effect.hitCount >= impact.technique.maxHits) {
        state.techniqueEffects = state.techniqueEffects.filter(
          (candidate) => candidate.id !== effect.id,
        );
      }
    }
  }
  if (impact.technique?.contactEffect === "mark") {
    if (
      impact.technique.status &&
      impact.technique.statusFrames > 0 &&
      defender.health > 0
    ) {
      defender.techniqueStatus = {
        kind: impact.technique.status,
        sourceFighterId: attacker.definitionId,
        framesRemaining: impact.technique.statusFrames,
      };
      endCloak(state, defender, "tracked", false);
    }
    return;
  }
  const healthBefore = defender.health;
  defender.health = Math.max(0, defender.health - impact.damage);
  const actualDamage = healthBefore - defender.health;
  defender.velocityX = 0;
  defender.x = clampFighterX(
    defender,
    defender.x + (impact.impactDirection ?? attacker.facing) * impact.pushback,
  );
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
      damage: actualDamage,
    });
    addTraque(state, attacker, actualDamage, "damage");
    addTraque(state, defender, Math.ceil(actualDamage / 2), "damage");
    const guardGain = impact.kind === "heavy" || impact.kind === "technique" ? 12 : 6;
    addTraque(state, defender, guardGain, "guard");
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
    damage: actualDamage,
    combo: impact.combo,
    antiAir: impact.launchY > 0,
  });
  endCloak(state, defender, "hit", false);
  if (
    impact.technique?.status &&
    impact.technique.statusFrames > 0 &&
    defender.health > 0
  ) {
    defender.techniqueStatus = {
      kind: impact.technique.status,
      sourceFighterId: attacker.definitionId,
      framesRemaining: impact.technique.statusFrames,
    };
  }
  addTraque(state, attacker, actualDamage, "damage");
  addTraque(state, defender, Math.ceil(actualDamage / 2), "damage");

  const maxHealth = PIT_FIGHTERS[defender.definitionId].maxHealth;
  if (
    defender.health > 0 &&
    defender.health <= maxHealth * 0.25 &&
    !defender.survivalTriggeredThisRound
  ) {
    defender.survivalTriggeredThisRound = true;
    defender.survivalInstinctFrames = PIT_INSTINCT_FRAMES;
    state.events.push({
      type: "survival-instinct",
      frame: state.frame,
      fighterId: defender.definitionId,
    });
    addTraque(state, defender, PIT_INSTINCT_TRAQUE_BONUS, "instinct");
  }

  if (impact.combo >= PIT_MAX_COMBO_HITS) {
    defender.wakeInvulnerabilityFrames = Math.max(defender.wakeInvulnerabilityFrames, 60);
    state.events.push({ type: "combo-break", frame: state.frame, fighterId: defender.definitionId });
  }
}

function finishRound(state: PitCombatState, reason: PitRoundResult["reason"], winnerSlot: 0 | 1 | null): void {
  state.techniqueEffects = [];
  state.nextTechniqueEffectId = 1;
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

interface PendingRupture {
  fighterSlot: 0 | 1;
  attackerSlot: 0 | 1;
  pushDirection: -1 | 1;
}

function collectRuptures(
  fighters: readonly [PitFighterState, PitFighterState],
  inputs: readonly [PitInput, PitInput],
): PendingRupture[] {
  const ruptures: PendingRupture[] = [];
  for (const slot of [0, 1] as const) {
    const fighter = fighters[slot];
    const input = inputs[slot] ?? {};
    const resourcePressed = Boolean(input.resource) && !fighter.inputLatch.resource;
    if (
      !resourcePressed ||
      fighter.health <= 0 ||
      fighter.phase !== "hitstun" ||
      fighter.comboHitsReceived < 2 ||
      fighter.traque < PIT_RUPTURE_COST ||
      fighter.ruptureUsedThisRound
    ) {
      continue;
    }
    const attackerSlot = (slot === 0 ? 1 : 0) as 0 | 1;
    ruptures.push({
      fighterSlot: slot,
      attackerSlot,
      pushDirection: fighters[attackerSlot].x >= fighter.x ? 1 : -1,
    });
  }
  return ruptures;
}

function applyRuptures(state: PitCombatState, ruptures: readonly PendingRupture[]): void {
  if (ruptures.length === 0) return;

  // Clear every eligible defender from the same pre-update snapshot first.
  // This prevents slot order from deciding the result when both fighters break.
  for (const rupture of ruptures) {
    const fighter = state.fighters[rupture.fighterSlot];
    fighter.traque = Math.max(0, fighter.traque - PIT_RUPTURE_COST);
    fighter.ruptureUsedThisRound = true;
    fighter.action = null;
    fighter.guard = null;
    fighter.crouching = false;
    fighter.phase = "idle";
    fighter.stunFrames = 0;
    fighter.knockdownFrames = 0;
    fighter.comboHitsReceived = 0;
    fighter.comboLastHitFrame = state.frame - PIT_COMBO_RESET_FRAMES - 1;
    fighter.velocityX = 0;
    fighter.wakeInvulnerabilityFrames = Math.max(
      fighter.wakeInvulnerabilityFrames,
      PIT_RUPTURE_INVULNERABILITY_FRAMES,
    );
    fighter.techniqueStatus = null;
    endCloak(state, fighter, "rupture", false);
  }

  for (const rupture of ruptures) {
    const fighter = state.fighters[rupture.fighterSlot];
    const attacker = state.fighters[rupture.attackerSlot];
    attacker.x = clampFighterX(attacker, attacker.x + rupture.pushDirection * PIT_RUPTURE_PUSHBACK);
    attacker.velocityX = 0;
    attacker.action = null;
    attacker.guard = null;
    attacker.crouching = false;
    if (
      attacker.phase === "knockdown" &&
      attacker.knockdownFrames >= PIT_RUPTURE_BLOCKSTUN_FRAMES
    ) {
      attacker.stunFrames = 0;
    } else {
      attacker.phase = "blockstun";
      attacker.stunFrames = Math.max(attacker.stunFrames, PIT_RUPTURE_BLOCKSTUN_FRAMES);
      attacker.knockdownFrames = 0;
    }
    attacker.comboHitsReceived = 0;
    attacker.comboLastHitFrame = state.frame - PIT_COMBO_RESET_FRAMES - 1;
    endCloak(state, attacker, "rupture", false);
    state.events.push({
      type: "rupture",
      frame: state.frame,
      fighterId: fighter.definitionId,
      attackerId: attacker.definitionId,
    });
  }

  resolvePushboxes(state.fighters[0], state.fighters[1]);
}

function updatePressureTraque(state: PitCombatState): void {
  const [left, right] = state.fighters;
  const distance = Math.abs(right.x - left.x);
  const pressureActive =
    left.health > 0 &&
    right.health > 0 &&
    distance >= PIT_PRESSURE_MIN_DISTANCE &&
    distance <= PIT_PRESSURE_MAX_DISTANCE;
  for (const fighter of state.fighters) {
    if (!pressureActive) {
      fighter.pressureFrames = 0;
      continue;
    }
    fighter.pressureFrames += 1;
    if (fighter.pressureFrames >= PIT_PRESSURE_GAIN_INTERVAL) {
      fighter.pressureFrames = 0;
      addTraque(state, fighter, 1, "pressure");
    }
  }
}

function beginNextRound(state: PitCombatState, inputs: readonly [PitInput, PitInput]): void {
  const [left, right] = state.fighters;
  state.round += 1;
  state.pendingThrow = null;
  state.phase = "round";
  state.roundFramesRemaining = PIT_ROUND_FRAMES;
  state.transitionFramesRemaining = 0;
  state.fighters = [
    freshFighter(
      0,
      left.definitionId,
      left.roundsWon,
      latchFromInput(inputs[0] ?? {}),
      Math.min(left.traque, PIT_ROUND_TRAQUE_CARRY_CAP),
    ),
    freshFighter(
      1,
      right.definitionId,
      right.roundsWon,
      latchFromInput(inputs[1] ?? {}),
      Math.min(right.traque, PIT_ROUND_TRAQUE_CARRY_CAP),
    ),
  ];
  state.events.push({ type: "round-start", frame: state.frame, round: state.round });
}

function stepPitCombatInternal(
  current: PitCombatState,
  inputs: readonly [PitInput, PitInput],
  legacyV2Techniques: boolean,
  throwTechEnabled: boolean,
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
  if (throwTechEnabled && state.pendingThrow) {
    advancePendingThrow(state, inputs);
    if (state.rules.mode === "match") evaluateRound(state);
    if (state.phase !== "round") state.pendingThrow = null;
    return state;
  }
  const previousLeft = cloneFighter(state.fighters[0]);
  const previousRight = cloneFighter(state.fighters[1]);
  const instinctActiveAtFrameStart = [
    previousLeft.survivalInstinctFrames > 0,
    previousRight.survivalInstinctFrames > 0,
  ] as const;
  const ruptures = collectRuptures(
    [previousLeft, previousRight],
    [inputs[0] ?? {}, inputs[1] ?? {}],
  );

  updateFighter(state, state.fighters[0], previousRight, inputs[0] ?? {});
  updateFighter(state, state.fighters[1], previousLeft, inputs[1] ?? {});
  resolvePushboxes(state.fighters[0], state.fighters[1]);
  applyRuptures(state, ruptures);
  if (!legacyV2Techniques) {
    advanceTechniqueStatuses(state);
    spawnTechniqueEffects(state);
    advanceTechniqueEffects(state);
    resolvePushboxes(state.fighters[0], state.fighters[1]);
  }

  // Every world-effect impact is gathered from one snapshot. A counter may
  // suppress the direct strike it intercepted; all other same-frame trades
  // remain valid before hitstun or KO changes either fighter.
  const techniqueImpacts: CollectedTechniqueImpacts = legacyV2Techniques
    ? { impacts: [], counteredSlots: new Set<0 | 1>() }
    : collectTechniqueImpacts(state);
  const directImpacts = [
    collectImpact(
      state,
      state.fighters[0],
      state.fighters[1],
      legacyV2Techniques,
    ),
    collectImpact(
      state,
      state.fighters[1],
      state.fighters[0],
      legacyV2Techniques,
    ),
  ].filter(
    (impact): impact is PendingImpact =>
      impact !== null && !techniqueImpacts.counteredSlots.has(impact.attackerSlot),
  );
  const allImpacts = [...techniqueImpacts.impacts, ...directImpacts];
  const throws = directImpacts.filter((impact) => impact.kind === "throw");
  const strikes = allImpacts.filter((impact) => impact.kind !== "throw");
  if (throwTechEnabled && throws.length > 0 && strikes.length === 0) {
    if (throws.length === 2) {
      // Simultaneous active throws break symmetrically; neither array slot wins.
      finishThrowTech(state, throws[0].attackerSlot);
    } else {
      const impact = throws[0];
      if (canTechThrow(state.fighters[impact.defenderSlot])) {
        const previous = impact.defenderSlot === 0 ? previousLeft : previousRight;
        const pressed = Boolean(inputs[impact.defenderSlot]?.throw) && !previous.inputLatch.throw;
        if (pressed) finishThrowTech(state, impact.attackerSlot);
        else beginThrowCapture(state, impact);
      } else {
        applyImpact(state, impact);
      }
    }
  } else {
    // An active strike wins over a capture; legacy V4 keeps its original trades.
    for (const pendingImpact of throwTechEnabled ? strikes : allImpacts) {
      const impact = sequenceImpact(state, pendingImpact);
      if (impact) applyImpact(state, impact);
    }
  }

  updatePressureTraque(state);
  for (const slot of [0, 1] as const) {
    if (instinctActiveAtFrameStart[slot]) {
      state.fighters[slot].survivalInstinctFrames = Math.max(
        0,
        state.fighters[slot].survivalInstinctFrames - 1,
      );
    }
  }

  if (state.rules.mode === "match") evaluateRound(state);
  if (state.phase !== "round") state.pendingThrow = null;
  return state;
}

export function stepPitCombat(
  current: PitCombatState,
  inputs: readonly [PitInput, PitInput] = [{}, {}],
): PitCombatState {
  return stepPitCombatInternal(current, inputs, false, true);
}

/** Published V29 replay rules: immediate throws, no capture window or tech. */
export function stepPitCombatV4Compatibility(
  current: PitCombatState,
  inputs: readonly [PitInput, PitInput] = [{}, {}],
): PitCombatState {
  return stepPitCombatInternal(current, inputs, false, false);
}

/** Verifies checksums from the published V2 replay engine before migration. */
export function stepPitCombatV2Compatibility(
  current: PitCombatState,
  inputs: readonly [PitInput, PitInput] = [{}, {}],
): PitCombatState {
  return stepPitCombatInternal(current, inputs, true, false);
}

export function rematchPitCombat(state: PitCombatState): PitCombatState {
  return createPitCombatState(
    state.fighters[0].definitionId,
    state.fighters[1].definitionId,
    { mode: state.rules.mode, arenaId: state.arenaId },
  );
}

export function serializePitCombat(state: PitCombatState): string {
  return JSON.stringify(state);
}

const PIT_ATTACK_KINDS: readonly PitAttackKind[] = ["light", "medium", "heavy", "technique"];
const PIT_COMBAT_PHASES: readonly PitCombatPhase[] = ["idle", "startup", "active", "recovery", "hitstun", "blockstun", "knockdown"];
const PIT_CLOAK_PHASES: readonly PitCloakPhase[] = ["inactive", "startup", "active", "recovery"];
const PIT_TECHNIQUE_EFFECT_PHASES: readonly PitTechniqueEffectPhase[] = ["arming", "active", "returning"];
const PIT_TECHNIQUE_STATUS_KINDS: readonly PitTechniqueStatusKind[] = ["netted", "pinned", "tracked", "staggered"];
const PIT_TRAQUE_SOURCES: readonly Extract<PitCombatEvent, { type: "traque-gain" }>["source"][] = ["damage", "guard", "pressure", "instinct"];
const PIT_CLOAK_END_REASONS: readonly Extract<PitCombatEvent, { type: "cloak-end" }>["reason"][] = ["expired", "action", "hit", "rupture", "tracked"];
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
  return typeof value === "string" && Object.hasOwn(PIT_FIGHTERS, value);
}

function isArenaId(value: unknown): value is PitArenaId {
  return typeof value === "string" && Object.hasOwn(PIT_ARENAS, value);
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
    typeof value.resource === "boolean" &&
    (value.attack === null || isAttackKind(value.attack));
}

function isTechniqueStatusState(value: unknown): value is PitTechniqueStatusState {
  if (!isRecord(value) || !PIT_TECHNIQUE_STATUS_KINDS.includes(value.kind as PitTechniqueStatusKind)) {
    return false;
  }
  if (!isFighterId(value.sourceFighterId)) return false;
  const sourceTechnique = PIT_FIGHTERS[value.sourceFighterId].technique;
  return sourceTechnique.status === value.kind &&
    isIntegerBetween(value.framesRemaining, 1, sourceTechnique.statusFrames);
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
  if (!isIntegerBetween(value.traque, 0, PIT_MAX_TRAQUE)) return false;
  if (!isIntegerBetween(value.pressureFrames, 0, PIT_PRESSURE_GAIN_INTERVAL - 1)) return false;
  if (typeof value.ruptureUsedThisRound !== "boolean" || typeof value.survivalTriggeredThisRound !== "boolean") return false;
  if (!isIntegerBetween(value.survivalInstinctFrames, 0, PIT_INSTINCT_FRAMES)) return false;
  if (!value.survivalTriggeredThisRound && value.survivalInstinctFrames !== 0) return false;
  if (!PIT_CLOAK_PHASES.includes(value.cloakPhase as PitCloakPhase)) return false;
  const cloakPhase = value.cloakPhase as PitCloakPhase;
  const cloakFrameMaximum = cloakPhase === "startup"
    ? PIT_CLOAK_STARTUP_FRAMES
    : cloakPhase === "active"
      ? PIT_CLOAK_ACTIVE_FRAMES
      : cloakPhase === "recovery"
        ? PIT_CLOAK_RECOVERY_FRAMES
        : 0;
  if (!isIntegerBetween(value.cloakFramesRemaining, cloakPhase === "inactive" ? 0 : 1, cloakFrameMaximum)) return false;
  if (!isIntegerBetween(value.cloakCooldownFrames, 0, PIT_CLOAK_COOLDOWN_FRAMES)) return false;
  if (!(value.techniqueStatus === null || isTechniqueStatusState(value.techniqueStatus))) return false;
  if (cloakPhase !== "inactive" && value.cloakCooldownFrames !== 0) return false;
  if (
    (cloakPhase === "startup" || cloakPhase === "active") &&
    (phase !== "idle" || value.action !== null || value.guard !== null)
  ) {
    return false;
  }
  if (cloakPhase === "startup" && (!value.grounded || value.crouching)) return false;
  if ((phase === "hitstun" || phase === "blockstun") && value.stunFrames === 0) return false;
  if (phase === "knockdown" && value.knockdownFrames === 0) return false;
  return !(value.grounded === true && value.y !== 0);
}

function isTechniqueEffectState(
  value: unknown,
  fighters: readonly [PitFighterState, PitFighterState],
): value is PitTechniqueEffectState {
  if (!isRecord(value) || !isIntegerBetween(value.id, 1, Number.MAX_SAFE_INTEGER)) return false;
  if (value.ownerSlot !== 0 && value.ownerSlot !== 1) return false;
  const owner = fighters[value.ownerSlot];
  const technique = PIT_FIGHTERS[owner.definitionId].technique;
  if (value.techniqueId !== technique.id) return false;
  if (!isFiniteBetween(value.x, PIT_ARENA.leftWall - technique.width, PIT_ARENA.rightWall)) return false;
  if (!isFiniteBetween(value.y, 0, PIT_ARENA.height)) return false;
  if (value.direction !== -1 && value.direction !== 1) return false;
  if (!isIntegerBetween(value.age, 0, technique.lifetimeFrames)) return false;
  if (!PIT_TECHNIQUE_EFFECT_PHASES.includes(value.phase as PitTechniqueEffectPhase)) return false;
  if (!isIntegerBetween(value.hitCount, 0, technique.maxHits - 1)) return false;
  if (!isIntegerBetween(value.rehitFrames, 0, technique.rehitFrames)) return false;
  const phase = value.phase as PitTechniqueEffectPhase;
  if (phase === "arming" && (technique.armFrames === 0 || value.age >= technique.armFrames)) return false;
  if (phase === "returning" && (
    technique.motion !== "returning" ||
    technique.returnFrame === null ||
    value.age < technique.returnFrame
  )) {
    return false;
  }
  if (
    phase === "active" &&
    technique.motion === "returning" &&
    technique.returnFrame !== null &&
    value.age >= technique.returnFrame
  ) {
    return false;
  }
  return true;
}

function isCombatEvent(value: unknown, stateFrame: number, stateRound: number, fighterIds: readonly PitFighterId[]): value is PitCombatEvent {
  if (!isRecord(value) || !isIntegerBetween(value.frame, 0, stateFrame) || typeof value.type !== "string") return false;
  const knownFighter = (candidate: unknown) => isFighterId(candidate) && fighterIds.includes(candidate);
  if (value.type === "round-start") return isIntegerBetween(value.round, 1, stateRound);
  if (value.type === "attack-start") return knownFighter(value.fighterId) && isAttackKind(value.attack);
  if (
    value.type === "throw-start" ||
    value.type === "combo-break" ||
    value.type === "survival-instinct" ||
    value.type === "cloak-start"
  ) {
    return knownFighter(value.fighterId);
  }
  if (value.type === "traque-gain") {
    return knownFighter(value.fighterId) &&
      isIntegerBetween(value.amount, 1, PIT_MAX_TRAQUE) &&
      PIT_TRAQUE_SOURCES.includes(value.source as Extract<PitCombatEvent, { type: "traque-gain" }>["source"]);
  }
  if (value.type === "rupture") {
    return knownFighter(value.fighterId) &&
      knownFighter(value.attackerId) &&
      value.fighterId !== value.attackerId;
  }
  if (value.type === "cloak-end") {
    return knownFighter(value.fighterId) &&
      PIT_CLOAK_END_REASONS.includes(value.reason as Extract<PitCombatEvent, { type: "cloak-end" }>["reason"]);
  }
  if (value.type === "throw-caught" || value.type === "throw-tech") {
    return knownFighter(value.attackerId) && knownFighter(value.defenderId) && value.attackerId !== value.defenderId;
  }
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

function migratePitCombatState(candidate: unknown): unknown {
  if (!isRecord(candidate) ||
    ![1, 2, 4, PIT_STATE_VERSION].includes(candidate.version as number) ||
    !Array.isArray(candidate.fighters)) {
    return candidate;
  }
  const legacyV1 = candidate.version === 1;
  return {
    ...candidate,
    version: PIT_STATE_VERSION,
    ...(candidate.version !== PIT_STATE_VERSION ? { pendingThrow: null } : {}),
    techniqueEffects: candidate.techniqueEffects ?? [],
    nextTechniqueEffectId: candidate.nextTechniqueEffectId ?? 1,
    fighters: candidate.fighters.map((fighter) => {
      if (!isRecord(fighter)) return fighter;
      const inputLatch = legacyV1 && isRecord(fighter.inputLatch)
        ? { ...fighter.inputLatch, resource: false }
        : fighter.inputLatch;
      return {
        ...fighter,
        ...(legacyV1 ? {
          traque: 0,
          pressureFrames: 0,
          ruptureUsedThisRound: false,
          survivalTriggeredThisRound: false,
          survivalInstinctFrames: 0,
          cloakPhase: "inactive",
          cloakFramesRemaining: 0,
          cloakCooldownFrames: 0,
        } : {}),
        techniqueStatus: fighter.techniqueStatus ?? null,
        inputLatch,
      };
    }),
  };
}

export function deserializePitCombat(serialized: string): PitCombatState {
  let candidate: unknown;
  try {
    candidate = migratePitCombatState(JSON.parse(serialized));
  } catch {
    throw new Error("Invalid or incompatible THE PIT combat state.");
  }
  if (!isRecord(candidate) ||
    !(candidate.pendingThrow === null || (
      isRecord(candidate.pendingThrow) &&
      Object.keys(candidate.pendingThrow).length === 3 &&
      (candidate.pendingThrow.attackerSlot === 0 || candidate.pendingThrow.attackerSlot === 1) &&
      isIntegerBetween(candidate.pendingThrow.capturedFrame, 1, candidate.frame as number) &&
      isIntegerBetween(candidate.pendingThrow.framesRemaining, 1, PIT_THROW_TECH_WINDOW_FRAMES) &&
      (candidate.frame as number) - (candidate.pendingThrow.capturedFrame as number) ===
        PIT_THROW_TECH_WINDOW_FRAMES - (candidate.pendingThrow.framesRemaining as number) &&
      candidate.phase === "round" &&
      Array.isArray(candidate.fighters) &&
      candidate.fighters.every((fighter) => isRecord(fighter) && fighter.grounded === true &&
        fighter.health as number > 0 && fighter.phase === "blockstun" && fighter.action === null &&
        fighter.stunFrames === 1 && fighter.velocityX === 0 && fighter.velocityY === 0)
    )) ||
    candidate.version !== PIT_STATE_VERSION ||
    candidate.tickRate !== PIT_TICK_RATE ||
    !isArenaId(candidate.arenaId) ||
    !isRecord(candidate.rules) ||
    !PIT_COMBAT_MODES.includes(candidate.rules.mode as PitCombatMode) ||
    !isIntegerBetween(candidate.frame, 0, Number.MAX_SAFE_INTEGER) ||
    !PIT_MATCH_PHASES.includes(candidate.phase as PitMatchPhase) ||
    !isIntegerBetween(candidate.round, 1, 9_999) ||
    !isIntegerBetween(candidate.roundFramesRemaining, 0, PIT_ROUND_FRAMES) ||
    !isIntegerBetween(candidate.transitionFramesRemaining, 0, PIT_ROUND_TRANSITION_FRAMES) ||
    !Array.isArray(candidate.fighters) || candidate.fighters.length !== 2 ||
    !Array.isArray(candidate.techniqueEffects) ||
    candidate.techniqueEffects.length > PIT_MAX_TECHNIQUE_EFFECTS ||
    !isIntegerBetween(candidate.nextTechniqueEffectId, 1, Number.MAX_SAFE_INTEGER)) {
    throw new Error("Invalid or incompatible THE PIT combat state.");
  }

  const frame = candidate.frame as number;
  const round = candidate.round as number;
  const fighters = candidate.fighters;
  if (!isFighterState(fighters[0], 0, frame) || !isFighterState(fighters[1], 1, frame) || fighters[0].definitionId === fighters[1].definitionId) {
    throw new Error("Invalid or incompatible THE PIT combat state.");
  }
  const fighterIds = [fighters[0].definitionId, fighters[1].definitionId] as const;
  if (fighters.some((fighter) =>
    fighter.techniqueStatus !== null &&
    (!fighterIds.includes(fighter.techniqueStatus.sourceFighterId) ||
      fighter.techniqueStatus.sourceFighterId === fighter.definitionId)
  )) {
    throw new Error("Invalid or incompatible THE PIT combat state.");
  }
  const techniqueEffects = candidate.techniqueEffects;
  const typedFighters = fighters as unknown as [PitFighterState, PitFighterState];
  const effectIds = new Set<number>();
  if (!techniqueEffects.every((effect) => {
    if (!isTechniqueEffectState(effect, typedFighters)) return false;
    if (effectIds.has(effect.id) || effect.id >= (candidate.nextTechniqueEffectId as number)) {
      return false;
    }
    effectIds.add(effect.id);
    return true;
  })) {
    throw new Error("Invalid or incompatible THE PIT combat state.");
  }
  if (!(candidate.lastRoundResult === null || isRoundResult(candidate.lastRoundResult, frame, round)) ||
    !(candidate.matchWinnerId === null || (isFighterId(candidate.matchWinnerId) && fighterIds.includes(candidate.matchWinnerId))) ||
    !Array.isArray(candidate.events) || candidate.events.length > 32 ||
    !candidate.events.every((event) => isCombatEvent(event, frame, round, fighterIds))) {
    throw new Error("Invalid or incompatible THE PIT combat state.");
  }

  const phase = candidate.phase as PitMatchPhase;
  const mode = candidate.rules.mode as PitCombatMode;
  if (phase !== "round" && techniqueEffects.length > 0) {
    throw new Error("Invalid or incompatible THE PIT combat state.");
  }
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
