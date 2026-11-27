import {
  createPitCombatState, getPitCombatFighterDefinition, PIT_ARENAS, PIT_TICK_RATE, stepPitCombat,
  type PitCombatState, type PitFighterId, type PitInput,
} from "./pitCombat";
import { pitHasShoulderPlasma } from "./pitEquipmentV57";
import type { PitBonusDifficultyV1 } from "./pitBonusTrialV1";

/** An original timing exercise. It does not add a weapon or a canonical event to a fighter. */
export const PIT_PRECISION_TRIAL_ID_V1 = "precision-training-v1" as const;
export const PIT_PRECISION_TARGET_V1 = 4;
export const PIT_PRECISION_MIN_DISTANCE_V1 = 180;
export const PIT_PRECISION_FIGHTERS_V1 = ["jungle-hunter", "scar"] as const;
const DISTANCES = [230, 300, 260, 330] as const;

export interface PitPrecisionTrialV1 {
  readonly id: typeof PIT_PRECISION_TRIAL_ID_V1;
  readonly version: 1;
  readonly difficulty: PitBonusDifficultyV1;
  readonly status: "briefing" | "running" | "success" | "failed";
  readonly stage: "signal" | "aim" | "flight" | "reset";
  readonly playerId: PitFighterId;
  readonly dummyId: PitFighterId;
  readonly arenaId: PitCombatState["arenaId"];
  readonly variantId: string | null;
  readonly techniqueId: string;
  readonly observedFrame: number;
  readonly elapsedTicks: number;
  readonly stageTicks: number;
  readonly completed: number;
  readonly mistakes: number;
  readonly shotMinEffectId: number | null;
  readonly projectileSeen: boolean;
  readonly shotDistance: number | null;
  readonly message: string;
}

export function pitPrecisionRulesV1(difficulty: PitBonusDifficultyV1) {
  return difficulty === "assisted"
    ? { limitTicks: 75 * PIT_TICK_RATE, signalTicks: 90, aimTicks: 180, flightTicks: 120, maxMistakes: 5 }
    : { limitTicks: 45 * PIT_TICK_RATE, signalTicks: 60, aimTicks: 90, flightTicks: 90, maxMistakes: 3 };
}

export function getPitPrecisionAvailabilityV1(state: PitCombatState) {
  const player = state.fighters[0], technique = getPitCombatFighterDefinition(player).technique;
  const reason = state.rules.mode !== "training" ? "L’épreuve de précision se lance depuis Entraînement."
    : state.rules.stageJourney ? "Désactivez le parcours de scène pour préparer cette simulation."
      : state.rules.normalMoves ? "Cette épreuve utilise le kit PIT standard : désactivez les gestes du classeur dans la sélection."
        : !pitHasShoulderPlasma(player.definitionId, player.variantId) ? "Duel final 1987 : canon et harnais retirés, tir de plasma indisponible."
          : !PIT_PRECISION_FIGHTERS_V1.some(id => id === player.definitionId) ? "Cette épreuve est disponible avec les kits de tir de Jungle Hunter et Scar. Aucun projectile n’est ajouté aux autres combattants."
            : technique.device !== "plasma" || technique.motion !== "linear" || technique.contactEffect !== "strike" ||
              technique.speed <= 0 || technique.damageScale <= 0 ? "Le kit actif ne possède pas le tir de plasma requis." : null;
  return { available: reason === null, reason };
}

function freshSituation(source: PitCombatState, completed: number, frame = 0): PitCombatState {
  const player = source.fighters[0];
  const state = createPitCombatState(player.definitionId, "berserker", {
    mode: "training", arenaId: source.arenaId, variants: [player.variantId ?? null, null],
  });
  const arena = PIT_ARENAS[state.arenaId], middle = (arena.leftWall + arena.rightWall) / 2;
  const distance = Math.min(DISTANCES[completed % DISTANCES.length], arena.rightWall - arena.leftWall - 160);
  const direction = completed % 2 === 0 ? 1 : -1;
  state.fighters[0].x = middle - direction * distance / 2;
  state.fighters[1].x = middle + direction * distance / 2;
  state.fighters[0].facing = direction;
  state.fighters[1].facing = direction === 1 ? -1 : 1;
  state.frame = frame;
  state.events = [];
  return state;
}

export function preparePitPrecisionTrialV1(source: PitCombatState, difficulty: PitBonusDifficultyV1 = "standard") {
  const availability = getPitPrecisionAvailabilityV1(source);
  if (!availability.available || (difficulty !== "standard" && difficulty !== "assisted")) {
    throw new Error(availability.reason ?? "Invalid PIT precision difficulty.");
  }
  const state = freshSituation(source, 0);
  const trial: PitPrecisionTrialV1 = {
    id: PIT_PRECISION_TRIAL_ID_V1, version: 1, difficulty, status: "briefing", stage: "signal",
    playerId: state.fighters[0].definitionId, variantId: state.fighters[0].variantId ?? null,
    dummyId: "berserker", arenaId: state.arenaId,
    techniqueId: getPitCombatFighterDefinition(state.fighters[0]).technique.id,
    observedFrame: 0, elapsedTicks: 0, stageTicks: 0, completed: 0, mistakes: 0,
    shotMinEffectId: null, projectileSeen: false, shotDistance: null,
    message: "Attendez TIREZ, puis lancez un seul plasma à distance. Son impact réel valide la cible ; le corps à corps ne compte pas.",
  };
  return { state, trial };
}

function ownsState(trial: PitPrecisionTrialV1, state: PitCombatState) {
  return trial.id === PIT_PRECISION_TRIAL_ID_V1 && state.rules.mode === "training" &&
    !state.rules.stageJourney && !state.rules.normalMoves && state.phase === "round" &&
    state.frame === trial.observedFrame && state.arenaId === trial.arenaId &&
    state.fighters[0].definitionId === trial.playerId && state.fighters[1].definitionId === trial.dummyId &&
    (state.fighters[0].variantId ?? null) === trial.variantId &&
    getPitCombatFighterDefinition(state.fighters[0]).technique.id === trial.techniqueId &&
    getPitPrecisionAvailabilityV1(state).available;
}

export function beginPitPrecisionTrialV1(trial: PitPrecisionTrialV1, state: PitCombatState, assetsReady: boolean): PitPrecisionTrialV1 {
  if (!assetsReady || trial.status !== "briefing" || trial.elapsedTicks !== 0 || !ownsState(trial, state)) return trial;
  return { ...trial, status: "running", message: "Cible annoncée. Attendez le signal TIREZ avant de lancer le plasma." };
}

/** Objective progress follows actual projectile creation and impact, never input alone. */
export function stepPitPrecisionTrialV1(trial: PitPrecisionTrialV1, source: PitCombatState, playerInput: PitInput) {
  if (trial.status !== "running" || !ownsState(trial, source)) return { state: source, trial };
  const rules = pitPrecisionRulesV1(trial.difficulty);
  let state = stepPitCombat(source, [trial.stage === "reset" ? {} : playerInput,
    trial.stage === "signal" ? { guardHigh: true } : {}]);
  const projectilePresent = [...source.techniqueEffects, ...state.techniqueEffects].some(effect =>
    trial.shotMinEffectId !== null && effect.id >= trial.shotMinEffectId && effect.ownerSlot === 0 &&
    effect.techniqueId === trial.techniqueId);
  let next: PitPrecisionTrialV1 = {
    ...trial, observedFrame: state.frame, elapsedTicks: trial.elapsedTicks + 1, stageTicks: trial.stageTicks + 1,
    projectileSeen: trial.projectileSeen || projectilePresent,
  };
  const attack = state.events.find(event => event.type === "attack-start" && event.fighterId === trial.playerId);
  const throwStarted = state.events.some(event => event.type === "throw-start" && event.fighterId === trial.playerId);
  const hit = state.events.find(event => event.type === "hit" && event.attackerId === trial.playerId &&
    event.defenderId === trial.dummyId);
  const failSequence = (message: string) => {
    next = { ...next, mistakes: next.mistakes + 1, stage: "reset", stageTicks: 0, message };
  };
  if (trial.stage === "reset") {
    if (next.stageTicks >= 45) {
      state = freshSituation(state, next.completed, state.frame);
      next = { ...next, stage: "signal", stageTicks: 0, shotMinEffectId: null, projectileSeen: false, shotDistance: null,
        message: "Nouvelle ligne de tir. Vérifiez votre orientation et attendez TIREZ." };
    }
  } else if (trial.stage === "signal") {
    if (attack || throwStarted || hit) failSequence("Action trop tôt. Attendez TIREZ : le signal d’annonce ne donne pas encore l’ouverture.");
    else if (next.stageTicks >= rules.signalTicks) {
      next = { ...next, stage: "aim", stageTicks: 0, message: "TIREZ — un seul plasma. Restez à distance et laissez le projectile atteindre la cible." };
    }
  } else if (trial.stage === "aim") {
    if (attack?.type === "attack-start" && attack.attack === "technique") {
      const distance = Math.abs(source.fighters[0].x - source.fighters[1].x);
      if (distance < PIT_PRECISION_MIN_DISTANCE_V1) failSequence("Trop près de la cible. Le tir doit partir à distance ; revenez à votre ligne de départ.");
      else next = { ...next, stage: "flight", stageTicks: 0, shotMinEffectId: source.nextTechniqueEffectId,
        shotDistance: distance, projectileSeen: false,
        message: "PROJECTILE EN VOL — attendez son impact. Un second tir annule cette tentative." };
    } else if (attack || throwStarted || hit) failSequence("Utilisez le tir de plasma : les frappes et projections ne valident pas une cible de précision.");
    else if (next.stageTicks >= rules.aimTicks) failSequence("Fenêtre de tir manquée. Attendez la prochaine ouverture pour lancer le plasma.");
  } else if (trial.stage === "flight") {
    if (attack || throwStarted) failSequence("Un seul tir par ouverture. Laissez le projectile en cours atteindre sa cible.");
    else if (hit?.type === "hit" && hit.attack === "technique" && hit.damage > 0 && next.projectileSeen &&
      trial.shotDistance !== null && trial.shotDistance >= PIT_PRECISION_MIN_DISTANCE_V1 &&
      state.fighters[1].health < source.fighters[1].health) {
      next = { ...next, completed: next.completed + 1, stage: "reset", stageTicks: 0,
        message: "Impact à distance confirmé. La prochaine séquence change la ligne de tir." };
    } else if (next.stageTicks >= rules.flightTicks ||
      (trial.projectileSeen && !state.techniqueEffects.some(effect => effect.ownerSlot === 0 &&
        effect.techniqueId === trial.techniqueId && effect.id >= (trial.shotMinEffectId ?? Infinity)))) {
      failSequence("Tir manqué. Vérifiez votre orientation et votre hauteur avant la prochaine ouverture.");
    }
  }
  if (next.completed >= PIT_PRECISION_TARGET_V1) {
    next = { ...next, status: "success", message: "Épreuve accomplie : quatre cibles touchées par des projectiles réels à distance." };
  } else if (next.mistakes >= rules.maxMistakes || next.elapsedTicks >= rules.limitTicks) {
    next = { ...next, status: "failed", message: next.mistakes >= rules.maxMistakes
      ? "Limite d’erreurs atteinte. Recommencez ou élargissez les fenêtres avec le timing accompagné."
      : "Temps écoulé. Recommencez sans perdre de progression." };
  }
  return { state, trial: next };
}

export function pitPrecisionResultV1(trial: PitPrecisionTrialV1) {
  const remainingTicks = Math.max(0, pitPrecisionRulesV1(trial.difficulty).limitTicks - trial.elapsedTicks);
  const score = Math.max(0, trial.completed * 1000 - trial.mistakes * 200 +
    (trial.status === "success" ? Math.floor(remainingTicks / 6) : 0));
  const rank = trial.status !== "success" ? "À reprendre" : trial.difficulty === "assisted" ? "Maîtrise accompagnée"
    : trial.mistakes === 0 && trial.elapsedTicks <= 25 * PIT_TICK_RATE ? "S" : trial.mistakes <= 1 ? "A" : "B";
  return { score, rank, remainingTicks };
}
