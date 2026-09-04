import {
  PIT_DESCENT_MODIFIER_IDS,
  PIT_DESCENT_RELIC_IDS,
  createPitDescentPlan,
  normalizePitDescentRun,
  type PitDescentModifierId,
  type PitDescentNode,
  type PitDescentRelicId,
  type PitDescentRun,
} from "./pitArcade";
import {
  PIT_ARENAS,
  PIT_CLOAK_COOLDOWN_FRAMES,
  PIT_FIGHTERS,
  PIT_MAX_TRAQUE,
  deserializePitCombat,
  serializePitCombat,
  stepPitCombat,
  type PitCombatEvent,
  type PitCombatState,
  type PitFighterId,
  type PitInput,
} from "./pitCombat";

export const PIT_DESCENT_COMBAT_CONTEXT_VERSION = 1 as const;
export const PIT_DESCENT_THIN_AIR_JUMP_SCALE = 0.76;
export const PIT_DESCENT_SHATTERED_GUARD_BONUS_FRAMES = 8;
export const PIT_DESCENT_PREDATOR_TEMPO_BONUS_SCALE = 0.5;
export const PIT_DESCENT_UNSTABLE_FLOOR_PUSH_SCALE = 1.35;
export const PIT_DESCENT_ELDER_KNOT_TRAQUE = 200;
export const PIT_DESCENT_TEMPERED_MESH_DAMAGE_REDUCTION = 0.25;
export const PIT_DESCENT_HUNTER_RHYTHM_FRAMES = 36;
export const PIT_DESCENT_HUNTER_RHYTHM_MOVE_SCALE = 1.35;
export const PIT_DESCENT_RESOURCE_FEEDBACK_FRAMES = 72;
export const PIT_DESCENT_SILENT_CROWD_FEEDBACK_FRAMES = 24;
export const PIT_DESCENT_BLACK_MIST_START_DISTANCE = 280;
export const PIT_DESCENT_BLACK_MIST_FULL_DISTANCE = 560;
export const PIT_DESCENT_BLACK_MIST_MAX_STRENGTH = 0.68;

export interface PitDescentCombatContext {
  readonly version: typeof PIT_DESCENT_COMBAT_CONTEXT_VERSION;
  readonly run: PitDescentRun;
  readonly nodeId: string;
  readonly playerSlot: 0 | 1;
  readonly combatFrame: number;
  readonly temperedMeshAvailable: boolean;
  readonly hunterRhythmFramesRemaining: number;
  readonly sealedCapacitorSpent: boolean;
}

export interface PitDescentCombatPresentation {
  readonly blackMistLongRange: boolean;
  readonly blackMistStrength: number;
  readonly resourceFeedbackFrames: number;
  readonly hunterRhythmActive: boolean;
}

export interface PitDescentCombatFrame {
  readonly state: PitCombatState;
  readonly context: PitDescentCombatContext;
  readonly presentation: PitDescentCombatPresentation;
}

interface ResolvedContext {
  readonly context: PitDescentCombatContext;
  readonly node: PitDescentNode;
  readonly modifiers: ReadonlySet<PitDescentModifierId>;
  readonly relics: ReadonlySet<PitDescentRelicId>;
}

interface TemperedStep {
  readonly state: PitCombatState;
  readonly consumed: boolean;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== "object" || Array.isArray(value)) return false;
  try {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
  } catch {
    return false;
  }
}

function integerBetween(value: unknown, minimum: number, maximum: number): value is number {
  return (
    typeof value === "number" &&
    Number.isSafeInteger(value) &&
    value >= minimum &&
    value <= maximum
  );
}

function cloneCombatState(state: PitCombatState): PitCombatState {
  return deserializePitCombat(serializePitCombat(state));
}

function sameIdentifiers(
  left: readonly string[],
  right: readonly string[],
): boolean {
  return (
    left.length === right.length &&
    left.every((identifier, index) => identifier === right[index])
  );
}

function sameNode(left: PitDescentNode, right: PitDescentNode): boolean {
  return (
    left.id === right.id &&
    left.floor === right.floor &&
    left.label === right.label &&
    left.kind === right.kind &&
    left.arenaId === right.arenaId &&
    left.opponentId === right.opponentId &&
    sameIdentifiers(left.modifierIds, right.modifierIds) &&
    left.relicId === right.relicId &&
    left.recoveryHealth === right.recoveryHealth
  );
}

function canonicalNode(run: PitDescentRun, nodeId: string): PitDescentNode | null {
  const floor = createPitDescentPlan(run.fighterId, run.seed).floors[run.completedFloors];
  return floor?.options.find((candidate) => candidate.id === nodeId) ?? null;
}

function cloneRun(run: PitDescentRun): PitDescentRun {
  const normalized = normalizePitDescentRun(run);
  if (!normalized) throw new Error("Invalid THE PIT Descent combat run.");
  return normalized;
}

function resolveContext(
  value: unknown,
  state: PitCombatState,
): ResolvedContext {
  if (
    !isRecord(value) ||
    value.version !== PIT_DESCENT_COMBAT_CONTEXT_VERSION ||
    typeof value.nodeId !== "string" ||
    (value.playerSlot !== 0 && value.playerSlot !== 1) ||
    !integerBetween(value.combatFrame, 0, Number.MAX_SAFE_INTEGER) ||
    typeof value.temperedMeshAvailable !== "boolean" ||
    !integerBetween(
      value.hunterRhythmFramesRemaining,
      0,
      PIT_DESCENT_HUNTER_RHYTHM_FRAMES,
    ) ||
    typeof value.sealedCapacitorSpent !== "boolean"
  ) {
    throw new Error("Invalid THE PIT Descent combat context.");
  }

  const run = normalizePitDescentRun(value.run);
  if (
    !run ||
    run.phase !== "active" ||
    run.selectedNodeId !== value.nodeId ||
    state.frame !== value.combatFrame
  ) {
    throw new Error("Invalid THE PIT Descent combat context.");
  }
  const node = canonicalNode(run, value.nodeId);
  if (
    !node ||
    (node.kind !== "fight" && node.kind !== "boss") ||
    node.opponentId === null ||
    state.arenaId !== node.arenaId ||
    state.rules.mode !== "match"
  ) {
    throw new Error("Invalid THE PIT Descent combat context.");
  }

  const playerSlot = value.playerSlot;
  const opponentSlot = playerSlot === 0 ? 1 : 0;
  if (
    state.fighters[playerSlot].definitionId !== run.fighterId ||
    state.fighters[opponentSlot].definitionId !== node.opponentId
  ) {
    throw new Error("Invalid THE PIT Descent combat context.");
  }

  const relics = new Set(run.temporaryRelicIds);
  if (
    (!relics.has("tempered-mesh") && value.temperedMeshAvailable) ||
    (!relics.has("hunter-rhythm") && value.hunterRhythmFramesRemaining !== 0) ||
    (!relics.has("sealed-capacitor") && !value.sealedCapacitorSpent)
  ) {
    throw new Error("Invalid THE PIT Descent combat context.");
  }

  return {
    context: {
      version: PIT_DESCENT_COMBAT_CONTEXT_VERSION,
      run,
      nodeId: node.id,
      playerSlot,
      combatFrame: value.combatFrame,
      temperedMeshAvailable: value.temperedMeshAvailable,
      hunterRhythmFramesRemaining: value.hunterRhythmFramesRemaining,
      sealedCapacitorSpent: value.sealedCapacitorSpent,
    },
    node,
    modifiers: new Set(node.modifierIds),
    relics,
  };
}

function presentationFor(
  state: PitCombatState,
  resolved: ResolvedContext,
): PitDescentCombatPresentation {
  const distance = Math.abs(state.fighters[1].x - state.fighters[0].x);
  const mistRatio = Math.max(
    0,
    Math.min(
      1,
      (distance - PIT_DESCENT_BLACK_MIST_START_DISTANCE) /
        (PIT_DESCENT_BLACK_MIST_FULL_DISTANCE -
          PIT_DESCENT_BLACK_MIST_START_DISTANCE),
    ),
  );
  const blackMistStrength = resolved.modifiers.has("black-mist")
    ? Math.round(mistRatio * PIT_DESCENT_BLACK_MIST_MAX_STRENGTH * 1_000) / 1_000
    : 0;
  return {
    blackMistLongRange: blackMistStrength > 0,
    blackMistStrength,
    resourceFeedbackFrames: resolved.modifiers.has("silent-crowd")
      ? PIT_DESCENT_SILENT_CROWD_FEEDBACK_FRAMES
      : PIT_DESCENT_RESOURCE_FEEDBACK_FRAMES,
    hunterRhythmActive: resolved.context.hunterRhythmFramesRemaining > 0,
  };
}

export function getPitDescentCombatPresentation(
  stateValue: PitCombatState,
  contextValue: PitDescentCombatContext,
): PitDescentCombatPresentation {
  const state = cloneCombatState(stateValue);
  return presentationFor(state, resolveContext(contextValue, state));
}

export function preparePitDescentCombat(
  stateValue: PitCombatState,
  runValue: PitDescentRun,
  nodeValue: PitDescentNode,
): PitDescentCombatFrame {
  const state = cloneCombatState(stateValue);
  const run = normalizePitDescentRun(runValue);
  if (
    !run ||
    run.phase !== "active" ||
    run.selectedNodeId !== nodeValue.id ||
    state.frame !== 0 ||
    state.phase !== "round" ||
    state.round !== 1 ||
    state.transitionFramesRemaining !== 0 ||
    state.lastRoundResult !== null ||
    state.matchWinnerId !== null ||
    state.rules.mode !== "match" ||
    state.techniqueEffects.length !== 0 ||
    state.fighters.some(
      (fighter) => fighter.roundsWon !== 0 || fighter.action !== null,
    )
  ) {
    throw new Error("THE PIT Descent combat requires a fresh selected duel.");
  }

  const node = canonicalNode(run, nodeValue.id);
  if (
    !node ||
    !sameNode(node, nodeValue) ||
    (node.kind !== "fight" && node.kind !== "boss") ||
    node.opponentId === null ||
    state.arenaId !== node.arenaId
  ) {
    throw new Error("THE PIT Descent combat requires its canonical combat node.");
  }

  const playerIndex = state.fighters.findIndex(
    (fighter) => fighter.definitionId === run.fighterId,
  );
  if (playerIndex !== 0 && playerIndex !== 1) {
    throw new Error("THE PIT Descent combat requires the run fighter.");
  }
  const playerSlot = playerIndex as 0 | 1;
  const opponentSlot = playerSlot === 0 ? 1 : 0;
  if (state.fighters[opponentSlot].definitionId !== node.opponentId) {
    throw new Error("THE PIT Descent combat requires the selected opponent.");
  }

  const player = state.fighters[playerSlot];
  const maximumHealth = PIT_FIGHTERS[player.definitionId].maxHealth;
  player.health = Math.min(
    maximumHealth,
    Math.max(
      1,
      Math.round((run.health / 1_000) * maximumHealth),
    ),
  );
  const relics = new Set(run.temporaryRelicIds);
  if (relics.has("elder-knot")) {
    player.traque = Math.min(
      PIT_MAX_TRAQUE,
      Math.max(player.traque, PIT_DESCENT_ELDER_KNOT_TRAQUE),
    );
  }

  const preparedState = cloneCombatState(state);
  const context: PitDescentCombatContext = {
    version: PIT_DESCENT_COMBAT_CONTEXT_VERSION,
    run: cloneRun(run),
    nodeId: node.id,
    playerSlot,
    combatFrame: preparedState.frame,
    temperedMeshAvailable: relics.has("tempered-mesh"),
    hunterRhythmFramesRemaining: 0,
    sealedCapacitorSpent: !relics.has("sealed-capacitor"),
  };
  const resolved = resolveContext(context, preparedState);
  return {
    state: preparedState,
    context: resolved.context,
    presentation: presentationFor(preparedState, resolved),
  };
}

function firstDamageEventIndex(
  state: PitCombatState,
  defenderId: PitFighterId,
): number {
  return state.events.findIndex(
    (event) =>
      (event.type === "hit" || event.type === "block") &&
      event.defenderId === defenderId &&
      event.damage > 0,
  );
}

function reduceDamageTraque(
  state: PitCombatState,
  impactIndex: number,
  impact: Extract<PitCombatEvent, { type: "hit" | "block" }>,
): void {
  const limits = new Map<PitFighterId, number>([
    [impact.attackerId, impact.damage],
    [impact.defenderId, Math.ceil(impact.damage / 2)],
  ]);
  const adjusted = new Set<PitFighterId>();
  for (let index = impactIndex + 1; index < state.events.length; index += 1) {
    const event = state.events[index];
    if (event.type === "hit" || event.type === "block") break;
    if (
      event.type !== "traque-gain" ||
      event.source !== "damage" ||
      adjusted.has(event.fighterId)
    ) {
      continue;
    }
    const limit = limits.get(event.fighterId);
    if (limit === undefined) continue;
    const nextAmount = Math.min(event.amount, limit);
    const removed = event.amount - nextAmount;
    if (removed > 0) {
      const fighter = state.fighters.find(
        (candidate) => candidate.definitionId === event.fighterId,
      );
      if (fighter) fighter.traque = Math.max(0, fighter.traque - removed);
      event.amount = nextAmount;
    }
    adjusted.add(event.fighterId);
  }
}

function stepWithTemperedMesh(
  state: PitCombatState,
  inputs: readonly [PitInput, PitInput],
  playerSlot: 0 | 1,
  enabled: boolean,
): TemperedStep {
  if (!enabled || state.phase === "match-over") {
    return { state: stepPitCombat(state, inputs), consumed: false };
  }

  const playerId = state.fighters[playerSlot].definitionId;
  const probeState = cloneCombatState(state);
  probeState.fighters[playerSlot].health =
    PIT_FIGHTERS[playerId].maxHealth;
  const probe = stepPitCombat(probeState, inputs);
  const probeImpactIndex = firstDamageEventIndex(probe, playerId);
  if (probeImpactIndex < 0) {
    return { state: stepPitCombat(state, inputs), consumed: false };
  }
  const probeImpact = probe.events[probeImpactIndex];
  if (probeImpact.type !== "hit" && probeImpact.type !== "block") {
    return { state: stepPitCombat(state, inputs), consumed: false };
  }

  const reduction = Math.min(
    probeImpact.damage - 1,
    Math.ceil(
      probeImpact.damage * PIT_DESCENT_TEMPERED_MESH_DAMAGE_REDUCTION,
    ),
  );
  if (reduction <= 0) {
    return { state: stepPitCombat(state, inputs), consumed: true };
  }

  const boosted = cloneCombatState(state);
  const player = boosted.fighters[playerSlot];
  const maxHealth = PIT_FIGHTERS[player.definitionId].maxHealth;
  const bufferedHealth = Math.min(maxHealth, player.health + reduction);
  const bufferedReduction = bufferedHealth - player.health;
  player.health = bufferedHealth;

  const next = stepPitCombat(boosted, inputs);
  const impactIndex = firstDamageEventIndex(next, playerId);
  if (impactIndex < 0) {
    throw new Error("THE PIT Descent tempered mesh lost its deterministic impact.");
  }
  const impact = next.events[impactIndex];
  if (impact.type !== "hit" && impact.type !== "block") {
    throw new Error("THE PIT Descent tempered mesh lost its deterministic impact.");
  }

  const remainingReduction = reduction - bufferedReduction;
  const nextPlayer = next.fighters[playerSlot];
  if (remainingReduction > 0 && nextPlayer.health > 0) {
    nextPlayer.health = Math.min(maxHealth, nextPlayer.health + remainingReduction);
  }
  impact.damage = Math.max(1, impact.damage - reduction);
  reduceDamageTraque(next, impactIndex, impact);
  return { state: next, consumed: true };
}

function applyThinAir(
  previous: PitCombatState,
  next: PitCombatState,
): void {
  for (const slot of [0, 1] as const) {
    const before = previous.fighters[slot];
    const after = next.fighters[slot];
    if (before.grounded && !after.grounded && after.velocityY > 0) {
      after.velocityY =
        Math.round(after.velocityY * PIT_DESCENT_THIN_AIR_JUMP_SCALE * 1_000_000) /
        1_000_000;
    }
  }
}

function applyShatteredGuard(state: PitCombatState): void {
  const extended = new Set<PitFighterId>();
  for (const event of state.events) {
    if (event.type !== "block" || extended.has(event.defenderId)) continue;
    const fighter = state.fighters.find(
      (candidate) => candidate.definitionId === event.defenderId,
    );
    if (fighter?.phase === "blockstun") {
      fighter.stunFrames = Math.min(
        120,
        fighter.stunFrames + PIT_DESCENT_SHATTERED_GUARD_BONUS_FRAMES,
      );
      extended.add(event.defenderId);
    }
  }
}

function applyPredatorTempo(state: PitCombatState): void {
  for (const event of state.events) {
    if (event.type !== "traque-gain") continue;
    const fighter = state.fighters.find(
      (candidate) => candidate.definitionId === event.fighterId,
    );
    if (!fighter) continue;
    const requestedBonus = Math.ceil(
      event.amount * PIT_DESCENT_PREDATOR_TEMPO_BONUS_SCALE,
    );
    const bonus = Math.min(requestedBonus, PIT_MAX_TRAQUE - fighter.traque);
    if (bonus <= 0) continue;
    fighter.traque += bonus;
    event.amount += bonus;
  }
}

function impactPushback(
  event: Extract<PitCombatEvent, { type: "hit" | "block" }>,
): number {
  if (event.attack === "throw") return 42;
  const attacker = PIT_FIGHTERS[event.attackerId];
  const move = attacker.attacks[event.attack];
  const guardScale = event.type === "block" ? 0.62 : 1;
  const techniqueScale =
    event.attack === "technique"
      ? Math.abs(attacker.technique.pushbackScale)
      : 1;
  return Math.abs(move.pushback * guardScale * techniqueScale);
}

function applyUnstableFloor(state: PitCombatState): void {
  const arena = PIT_ARENAS[state.arenaId];
  for (const event of state.events) {
    if (event.type !== "hit" && event.type !== "block") continue;
    const attacker = state.fighters.find(
      (fighter) => fighter.definitionId === event.attackerId,
    );
    const defender = state.fighters.find(
      (fighter) => fighter.definitionId === event.defenderId,
    );
    if (!attacker || !defender) continue;
    const direction =
      defender.x === attacker.x
        ? attacker.facing
        : defender.x > attacker.x
          ? 1
          : -1;
    const extraPush =
      impactPushback(event) *
      (PIT_DESCENT_UNSTABLE_FLOOR_PUSH_SCALE - 1);
    const definition = PIT_FIGHTERS[defender.definitionId];
    const minimum = arena.leftWall + definition.bodyWidth / 2;
    const maximum = arena.rightWall - definition.bodyWidth / 2;
    defender.x = Math.max(
      minimum,
      Math.min(maximum, defender.x + direction * extraPush),
    );
  }
}

function applyHunterRhythmMovement(
  previous: PitCombatState,
  next: PitCombatState,
  inputs: readonly [PitInput, PitInput],
  playerSlot: 0 | 1,
  active: boolean,
): void {
  if (!active) return;
  const before = previous.fighters[playerSlot];
  const player = next.fighters[playerSlot];
  const input = inputs[playerSlot] ?? {};
  const direction = Number(Boolean(input.right)) - Number(Boolean(input.left));
  if (
    direction === 0 ||
    before.phase !== "idle" ||
    before.action !== null ||
    player.phase !== "idle" ||
    player.action !== null ||
    !player.grounded
  ) {
    return;
  }

  const arena = PIT_ARENAS[next.arenaId];
  const definition = PIT_FIGHTERS[player.definitionId];
  const opponentSlot = playerSlot === 0 ? 1 : 0;
  const opponent = next.fighters[opponentSlot];
  const opponentDefinition = PIT_FIGHTERS[opponent.definitionId];
  const extra =
    definition.walkSpeed *
    (PIT_DESCENT_HUNTER_RHYTHM_MOVE_SCALE - 1) *
    direction;
  const minimum = arena.leftWall + definition.bodyWidth / 2;
  const maximum = arena.rightWall - definition.bodyWidth / 2;
  let candidate = Math.max(minimum, Math.min(maximum, player.x + extra));
  const separation = (definition.bodyWidth + opponentDefinition.bodyWidth) / 2;
  if (player.x < opponent.x) {
    candidate = Math.min(candidate, opponent.x - separation);
  } else if (player.x > opponent.x) {
    candidate = Math.max(candidate, opponent.x + separation);
  }
  player.x = Math.max(minimum, Math.min(maximum, candidate));
}

function applySealedCapacitor(
  state: PitCombatState,
  playerSlot: 0 | 1,
  enabled: boolean,
): boolean {
  if (!enabled) return false;
  const player = state.fighters[playerSlot];
  if (player.cloakCooldownFrames <= 0) return false;
  player.cloakCooldownFrames = Math.max(0, player.cloakCooldownFrames - 1);
  return player.cloakCooldownFrames === 0;
}

function playerBlocked(
  state: PitCombatState,
  playerId: PitFighterId,
): boolean {
  return state.events.some(
    (event) => event.type === "block" && event.defenderId === playerId,
  );
}

export function stepPitDescentCombat(
  stateValue: PitCombatState,
  inputs: readonly [PitInput, PitInput] = [{}, {}],
  contextValue: PitDescentCombatContext,
): PitDescentCombatFrame {
  const previous = cloneCombatState(stateValue);
  const resolved = resolveContext(contextValue, previous);
  const playerSlot = resolved.context.playerSlot;
  const tempered = stepWithTemperedMesh(
    previous,
    inputs,
    playerSlot,
    resolved.context.temperedMeshAvailable,
  );
  const next = cloneCombatState(tempered.state);

  if (resolved.modifiers.has("thin-air")) applyThinAir(previous, next);
  if (resolved.modifiers.has("shattered-guard")) applyShatteredGuard(next);
  if (resolved.modifiers.has("predator-tempo")) applyPredatorTempo(next);
  if (resolved.modifiers.has("unstable-floor")) applyUnstableFloor(next);

  applyHunterRhythmMovement(
    previous,
    next,
    inputs,
    playerSlot,
    resolved.relics.has("hunter-rhythm") &&
      resolved.context.hunterRhythmFramesRemaining > 0,
  );

  const capacitorFinished = applySealedCapacitor(
    next,
    playerSlot,
    resolved.relics.has("sealed-capacitor") &&
      !resolved.context.sealedCapacitorSpent,
  );
  const playerId = next.fighters[playerSlot].definitionId;
  const rhythmTriggered =
    resolved.relics.has("hunter-rhythm") && playerBlocked(next, playerId);
  const hunterRhythmFramesRemaining = rhythmTriggered
    ? PIT_DESCENT_HUNTER_RHYTHM_FRAMES
    : Math.max(0, resolved.context.hunterRhythmFramesRemaining - 1);

  const finalState = cloneCombatState(next);
  const context: PitDescentCombatContext = {
    ...resolved.context,
    combatFrame: finalState.frame,
    temperedMeshAvailable:
      resolved.context.temperedMeshAvailable && !tempered.consumed,
    hunterRhythmFramesRemaining,
    sealedCapacitorSpent:
      resolved.context.sealedCapacitorSpent || capacitorFinished,
  };
  const finalResolved = resolveContext(context, finalState);
  return {
    state: finalState,
    context: finalResolved.context,
    presentation: presentationFor(finalState, finalResolved),
  };
}

export function isPitDescentCombatModifierId(
  value: unknown,
): value is PitDescentModifierId {
  return (
    typeof value === "string" &&
    PIT_DESCENT_MODIFIER_IDS.includes(value as PitDescentModifierId)
  );
}

export function isPitDescentCombatRelicId(
  value: unknown,
): value is PitDescentRelicId {
  return (
    typeof value === "string" &&
    PIT_DESCENT_RELIC_IDS.includes(value as PitDescentRelicId)
  );
}

export function getPitDescentCooldownRecoveryFrames(
  context: PitDescentCombatContext,
): number {
  return context.sealedCapacitorSpent
    ? PIT_CLOAK_COOLDOWN_FRAMES
    : Math.ceil(PIT_CLOAK_COOLDOWN_FRAMES / 2);
}
