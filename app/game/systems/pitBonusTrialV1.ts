import {
  createPitCombatState, getPitCombatAttackDefinition, PIT_ARENAS, PIT_FIGHTERS, PIT_TICK_RATE,
  stepPitCombat, type PitCombatState, type PitFighterId, type PitInput,
} from "./pitCombat";

/** An original PIT training simulation, not an attested event in a character's history. */
export const PIT_BONUS_TRIAL_ID_V1 = "riposte-training-v1" as const;
export const PIT_BONUS_TARGET_V1 = 4;
export type PitBonusDifficultyV1 = "standard" | "assisted";
export type PitBonusStageV1 = "signal" | "defend" | "counter" | "reset";
export interface PitBonusTrialV1 {
  readonly id: typeof PIT_BONUS_TRIAL_ID_V1;
  readonly version: 1;
  readonly difficulty: PitBonusDifficultyV1;
  readonly status: "briefing" | "running" | "success" | "failed";
  readonly stage: PitBonusStageV1;
  readonly playerId: PitFighterId;
  readonly dummyId: PitFighterId;
  readonly arenaId: PitCombatState["arenaId"];
  readonly variantId: string | null;
  readonly observedFrame: number;
  readonly elapsedTicks: number;
  readonly stageTicks: number;
  readonly completed: number;
  readonly mistakes: number;
  readonly strikeIssued: boolean;
  readonly message: string;
}

export function pitBonusRulesV1(difficulty: PitBonusDifficultyV1) {
  return difficulty === "assisted"
    ? { limitTicks: 60 * PIT_TICK_RATE, signalTicks: 90, counterTicks: 240, maxMistakes: 5 }
    : { limitTicks: 40 * PIT_TICK_RATE, signalTicks: 60, counterTicks: 150, maxMistakes: 3 };
}

function chooseDummy(playerId: PitFighterId): PitFighterId | null {
  return (["city-hunter", "witch"] as const).find(id => id !== playerId &&
    PIT_FIGHTERS[id].technique.trigger === "contact" && PIT_FIGHTERS[id].attacks.technique.hitLevel === "low") ?? null;
}

export function getPitBonusAvailabilityV1(state: PitCombatState) {
  const reason = state.rules.mode !== "training" ? "L’épreuve se lance depuis Entraînement."
    : state.rules.stageJourney ? "Désactivez le parcours de scène pour préparer cette simulation."
      : state.rules.normalMoves ? "Cette épreuve utilise le kit PIT standard. Désactivez les gestes du classeur dans la sélection avant de la lancer."
        : !chooseDummy(state.fighters[0].definitionId) ? "Aucun partenaire distinct ne possède l’assaut bas requis." : null;
  return { available: reason === null, reason };
}

/** A fresh situation owns health, resources, objects and input latches; no live duel is edited. */
function freshSituation(source: PitCombatState, dummyId: PitFighterId, frame = 0): PitCombatState {
  const player = source.fighters[0];
  const state = createPitCombatState(player.definitionId, dummyId, {
    mode: "training", arenaId: source.arenaId, variants: [player.variantId ?? null, null],
    ...(source.houndVariantId && player.definitionId === "tracker" ? { houndVariantId: source.houndVariantId } : {}),
  });
  const arena = PIT_ARENAS[state.arenaId];
  const middle = (arena.leftWall + arena.rightWall) / 2;
  state.fighters[0].x = middle - 60;
  state.fighters[1].x = middle + 55;
  state.frame = frame;
  // The bonus has no rounds or round-start side effects at sequence boundaries.
  state.events = [];
  return state;
}

export function preparePitBonusTrialV1(source: PitCombatState, difficulty: PitBonusDifficultyV1 = "standard") {
  const availability = getPitBonusAvailabilityV1(source);
  if (!availability.available || (difficulty !== "standard" && difficulty !== "assisted")) {
    throw new Error(availability.reason ?? "Invalid PIT bonus difficulty.");
  }
  const dummyId = chooseDummy(source.fighters[0].definitionId)!;
  const state = freshSituation(source, dummyId);
  const trial: PitBonusTrialV1 = {
    id: PIT_BONUS_TRIAL_ID_V1, version: 1, difficulty, status: "briefing", stage: "signal",
    playerId: state.fighters[0].definitionId, variantId: state.fighters[0].variantId ?? null,
    dummyId, arenaId: state.arenaId, observedFrame: 0, elapsedTicks: 0, stageTicks: 0,
    completed: 0, mistakes: 0, strikeIssued: false,
    message: "Attendez l’assaut bas, bloquez-le, puis relâchez la garde et touchez avec une frappe rapide, moyenne ou lourde.",
  };
  return { state, trial };
}

function ownsState(trial: PitBonusTrialV1, state: PitCombatState) {
  return trial.id === PIT_BONUS_TRIAL_ID_V1 && state.rules.mode === "training" &&
    !state.rules.stageJourney && !state.rules.normalMoves && state.phase === "round" &&
    state.frame === trial.observedFrame && state.arenaId === trial.arenaId &&
    state.fighters[0].definitionId === trial.playerId && state.fighters[1].definitionId === trial.dummyId &&
    (state.fighters[0].variantId ?? null) === trial.variantId;
}

export function beginPitBonusTrialV1(trial: PitBonusTrialV1, state: PitCombatState, assetsReady: boolean): PitBonusTrialV1 {
  if (!assetsReady || trial.status !== "briefing" || trial.elapsedTicks !== 0 || !ownsState(trial, state)) return trial;
  return { ...trial, status: "running", message: "Assaut bas annoncé. Préparez votre garde basse." };
}

/** The partner reads only the previous world and the authored sequence, never player input. */
export function resolvePitBonusDummyInputV1(trial: PitBonusTrialV1, state: PitCombatState): PitInput {
  if (trial.status !== "running" || !ownsState(trial, state) || trial.stage === "counter" || trial.stage === "reset") return {};
  const distance = state.fighters[0].x - state.fighters[1].x;
  if (Math.abs(distance) > 115 && state.fighters[1].phase === "idle") return distance < 0 ? { left: true } : { right: true };
  return trial.stage === "defend" && !trial.strikeIssued ? { attack: "technique" } : {};
}

/** One call is exactly one real engine tick. Reusing an old trial/state pair cannot count a contact twice. */
export function stepPitBonusTrialV1(trial: PitBonusTrialV1, source: PitCombatState, playerInput: PitInput) {
  if (trial.status !== "running" || !ownsState(trial, source)) return { state: source, trial };
  const rules = pitBonusRulesV1(trial.difficulty);
  let state = stepPitCombat(source, [trial.stage === "reset" ? {} : playerInput, resolvePitBonusDummyInputV1(trial, source)]);
  let next: PitBonusTrialV1 = {
    ...trial, observedFrame: state.frame, elapsedTicks: trial.elapsedTicks + 1, stageTicks: trial.stageTicks + 1,
    strikeIssued: trial.strikeIssued || state.events.some(event => event.type === "attack-start" && event.fighterId === trial.dummyId),
  };
  const dummyContact = state.events.find(event => (event.type === "hit" || event.type === "block") &&
    event.attackerId === trial.dummyId && event.defenderId === trial.playerId);
  const playerHit = state.events.find(event => event.type === "hit" &&
    event.attackerId === trial.playerId && event.defenderId === trial.dummyId);
  const failSequence = (message: string) => {
    next = { ...next, mistakes: next.mistakes + 1, stage: "reset", stageTicks: 0, message };
  };
  if (trial.stage === "reset") {
    if (next.stageTicks >= 45) {
      state = freshSituation(state, trial.dummyId, state.frame);
      next = { ...next, stage: "signal", stageTicks: 0, strikeIssued: false,
        message: "Assaut bas annoncé. Préparez votre garde basse." };
    }
  } else if (trial.stage === "counter") {
    if (playerHit?.type === "hit" && (playerHit.attack === "light" || playerHit.attack === "medium" || playerHit.attack === "heavy") &&
      state.fighters[1].health < source.fighters[1].health) {
      next = { ...next, completed: next.completed + 1, stage: "reset", stageTicks: 0,
        message: "Garde puis riposte confirmées. Replacez-vous pour la séquence suivante." };
    } else if (next.stageTicks >= rules.counterTicks) {
      failSequence("Ouverture manquée. Relâchez la garde, approchez et frappez pendant le signal RIPOSTEZ.");
    }
  } else if (playerHit) {
    failSequence("Frappe trop tôt. Bloquez d’abord l’assaut annoncé avant de riposter.");
  } else if (dummyContact?.type === "block" && state.fighters[0].guard === "low" &&
    getPitCombatAttackDefinition(source.fighters[1], dummyContact.attack).hitLevel === "low") {
    next = { ...next, stage: "counter", stageTicks: 0,
      message: "RIPOSTEZ — relâchez la garde, approchez si nécessaire et touchez avec une frappe normale." };
  } else if (dummyContact?.type === "hit") {
    failSequence("Assaut reçu. La prochaine tentative commence après le replacement ; maintenez la garde basse.");
  } else if (trial.stage === "signal" && next.stageTicks >= rules.signalTicks) {
    next = { ...next, stage: "defend", stageTicks: 0, message: "GARDE BASSE — l’assaut arrive." };
  } else if (trial.stage === "defend" && next.stageTicks >= 180) {
    failSequence("Assaut sans blocage. Restez à portée et bloquez le partenaire pour ouvrir la riposte.");
  }
  if (next.completed >= PIT_BONUS_TARGET_V1) {
    next = { ...next, status: "success", message: "Épreuve accomplie : quatre gardes suivies de ripostes réelles." };
  } else if (next.mistakes >= rules.maxMistakes || next.elapsedTicks >= rules.limitTicks) {
    next = { ...next, status: "failed", message: next.mistakes >= rules.maxMistakes
      ? "Limite d’erreurs atteinte. Recommencez ou essayez l’aide de timing."
      : "Temps écoulé. Vous pouvez recommencer sans perdre de progression." };
  }
  return { state, trial: next };
}

export function pitBonusResultV1(trial: PitBonusTrialV1) {
  const remainingTicks = Math.max(0, pitBonusRulesV1(trial.difficulty).limitTicks - trial.elapsedTicks);
  const score = Math.max(0, trial.completed * 1000 - trial.mistakes * 200 + (trial.status === "success" ? Math.floor(remainingTicks / 6) : 0));
  const rank = trial.status !== "success" ? "À reprendre" : trial.difficulty === "assisted" ? "Maîtrise accompagnée"
    : trial.mistakes === 0 && trial.elapsedTicks <= 25 * PIT_TICK_RATE ? "S" : trial.mistakes <= 1 ? "A" : "B";
  return { score, rank, remainingTicks };
}
