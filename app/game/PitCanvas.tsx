"use client";

/* eslint-disable @next/next/no-img-element -- local selection illustrations use the delivered WebP directly */

import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { compactControlKeyLabel } from "./controlBindingLabels";
import { getPitFighterKeyArt } from "./pitVisualAssets";
import { loadPitArenaArt, drawPitArenaBackdrop, drawPitArenaForeground, PIT_ARENA_BITMAP_PLANES, type PitArenaArtBank } from "./pitArenaRendering";
import { getPitCombatBitmapArtDefinition, loadPitCombatBitmapArt, getPitCombatBitmapFighterArtStatus, drawPitCombatBitmapFighter, type PitCombatBitmapArtBank } from "./pitCombatBitmapArt";
import {
  PIT_ARENAS,
  PIT_ARENA_IDS,
  PIT_CLOAK_COST,
  PIT_FIGHTERS,
  PIT_MAX_TRAQUE,
  PIT_TICK_RATE,
  createPitCombatState,
  getPitFighterBoxes,
  getPitTechniqueBox,
  rematchPitCombat,
  stepPitCombat,
  PIT_THROW_TECH_WINDOW_FRAMES,
  type PitArenaId,
  type PitAttackKind,
  type PitCombatEvent,
  type PitCombatState,
  type PitFighterId,
  type PitPlayableFighterId,
  type PitInput,
  type PitTechniqueEffectState,
} from "./systems/pitCombat";
import {
  advancePitPresentationCamera,
  applyPitPresentationCamera,
  type PitPresentationCamera,
} from "./systems/pitCamera";
import {
  PIT_ARENA_CATALOGUE,
  PIT_ARENA_CATALOGUE_SUMMARY,
  PIT_ARENA_CATALOGUE_WAVES,
} from "./systems/pitArenaCatalogue";
import {
  PIT_CONTROL_ACTION_IDS,
  matchesControlAction,
  pitInputFromControlCodes,
  type ControlActionId,
  type ControlBindings,
} from "./systems/controlBindings";
import {
  PIT_ARCADE_COSMETICS,
  PIT_ARCADE_ENCOUNTER_COUNT,
  PIT_ARCADE_LADDERS,
  PIT_DESCENT_FLOOR_COUNT,
  PIT_DESCENT_MAX_HEALTH,
  PIT_DESCENT_MODIFIERS,
  PIT_DESCENT_RELICS,
  applyPitArcadeEncounterResult,
  applyPitDescentResolution,
  createPitArcadeRun,
  createPitDescentPlan,
  createPitDescentRun,
  selectPitDescentNode,
  type PitArcadeCosmeticDefinition,
  type PitArcadeRun,
  type PitDescentNode,
  type PitDescentRun,
} from "./systems/pitArcade";
import {
  preparePitDescentCombat,
  stepPitDescentCombat,
  type PitDescentCombatContext,
  type PitDescentCombatPresentation,
} from "./systems/pitDescentCombat";
import {
  PIT_CIRCUIT_FIGHT_COUNT,
  PIT_CIRCUIT_MAX_RESULTS,
  PIT_CLAN_CIRCUITS,
  applyPitCircuitFightResult,
  createPitCircuitRun,
  selectPitCircuitFight,
  type PitCircuitRun,
} from "./systems/pitCircuit";
import {
  isPitFirstEditionFighterId,
  type PitTechniqueDevice,
  type PitTechniqueStatusKind,
} from "./systems/pitFirstEdition";
import {
  createPitReplayReader,
  stepPitReplayCombat,
  createPitReplayRecorder,
  normalizePitReplay,
  serializePitReplay,
  type PitReplay,
  type PitReplayReader,
  type PitReplayRecorder,
} from "./systems/pitReplay";
import {
  PIT_TRAINING_ACTION_LABELS,
  PIT_TRAINING_DUMMY_OPTIONS,
  PIT_TRAINING_PLAYBACK_OPTIONS,
  PIT_TRAINING_SEQUENCE_MAX_TICKS,
  createPitTrainingSequenceReader,
  createPitTrainingSequenceRecorder,
  createPitTrainingSettings,
  getPitTrainingFrameReadout,
  resetPitTrainingPositions,
  resolvePitTrainingDummyInput,
  updatePitTrainingSettings,
  type PitTrainingSequence,
  type PitTrainingSequenceReader,
  type PitTrainingSequenceRecorder,
  type PitTrainingSettingsPatch,
} from "./systems/pitTraining";
import { createPitTrainingClock, pausePitTrainingClock, requestPitTrainingTick, advancePitTrainingClock } from "./systems/pitTrainingClock";
import { PIT_TRAINING_LESSONS, preparePitTrainingLesson, resolvePitTrainingLessonInput, evaluatePitTrainingLesson, type PitTrainingLesson, type PitTrainingLessonId } from "./systems/pitTrainingLessons";
import { PIT_VERSUS_FIGHTER_IDS, isPitExpansionFighterId, isPitVersusFighterId, canPitFighterEnterMode, cyclePitMode, getPitFighterProfile, type PitVersusFighterId } from "./systems/pitRosterExpansion";
import PitExtensionPortrait from "./PitExtensionPortrait";
import styles from "./PitCanvas.module.css";

type PitMode = "cpu" | "local" | "training" | "arcade" | "circuit" | "descent";
type PitTrainingActivity = "idle" | "recording" | "playback";

export interface PitMatchCompleteResult {
  resultId: string;
  mode: Exclude<PitMode, "descent">;
  winnerId: PitFighterId | null;
  leftId: PitPlayableFighterId;
  rightId: PitFighterId;
  arenaId: PitArenaId;
  round: number;
  leftRoundsWon: number;
  rightRoundsWon: number;
  roundsDrawn: number;
  arcadeEncounterIndex?: number;
  arcadeCompleted?: boolean;
  circuitFightIndex?: number;
  circuitCompleted?: boolean;
  cosmeticRewardIds?: readonly string[];
  replay: PitReplay | null;
}

export type PitMatchPersistenceAck =
  | { readonly persisted: true }
  | { readonly persisted: false; readonly message: string };

type PitMatchCompleteHandler = (
  result: PitMatchCompleteResult,
  nextCircuitRun?: PitCircuitRun,
) => Promise<PitMatchPersistenceAck>;

export type PitStoredCircuitRuns = Readonly<
  Partial<Record<PitPlayableFighterId, PitCircuitRun | null>>
>;
export type PitStoredDescentRuns = Readonly<
  Partial<Record<PitPlayableFighterId, PitDescentRun | null>>
>;

export type PitRunTransition =
  | {
      readonly id: string;
      readonly kind: "circuit-persist";
      readonly run: PitCircuitRun;
    }
  | {
      readonly id: string;
      readonly kind: "circuit-replace";
      readonly run: PitCircuitRun;
    }
  | {
      readonly id: string;
      readonly kind: "descent-persist";
      readonly run: PitDescentRun;
    }
  | {
      readonly id: string;
      readonly kind: "descent-replace";
      readonly run: PitDescentRun;
    };

type PitRunTransitionHandler = (
  transition: PitRunTransition,
) => Promise<PitMatchPersistenceAck>;

type PitArcadePersistenceStatus = "idle" | "pending" | "confirmed" | "failed";

interface PitArcadePersistenceState {
  readonly status: PitArcadePersistenceStatus;
  readonly message: string;
}

interface PendingPitArcadeSettlement {
  readonly result: PitMatchCompleteResult;
  readonly nextRun: PitArcadeRun;
}

type PitCircuitPersistenceStatus = "idle" | "pending" | "confirmed" | "failed";

interface PitCircuitPersistenceState {
  readonly status: PitCircuitPersistenceStatus;
  readonly message: string;
}

interface PendingPitCircuitSettlement {
  readonly result: PitMatchCompleteResult;
  readonly nextRun: PitCircuitRun;
}

type PitRunTransitionPersistenceStatus = "idle" | "pending" | "confirmed" | "failed";

interface PitRunTransitionPersistenceState {
  readonly status: PitRunTransitionPersistenceStatus;
  readonly message: string;
}

interface PendingPitRunTransition {
  readonly transition: PitRunTransition;
  readonly onPersisted: () => void;
}

interface PitCanvasProps {
  controlBindings: ControlBindings;
  highContrast: boolean;
  reducedGore: boolean;
  screenShake: boolean;
  unlockedCosmeticIds?: readonly string[];
  savedCircuitRuns?: PitStoredCircuitRuns;
  savedDescentRuns?: PitStoredDescentRuns;
  exitLabel?: string;
  onExit: () => void;
  onMatchComplete?: PitMatchCompleteHandler;
  onRunTransition?: PitRunTransitionHandler;
  lastReplay?: PitReplay | null;
}

interface ImpactFlash {
  frame: number;
  x: number;
  y: number;
  blocked: boolean;
}

interface PitDescentResourceFeedback {
  readonly frame: number;
  readonly durationFrames: number;
  readonly fighterIds: readonly PitFighterId[];
}

const EMPTY_INPUT: PitInput = Object.freeze({});
const PIT_PLAYER_ONE_ACTION_IDS = PIT_CONTROL_ACTION_IDS.filter(
  (actionId) => actionId.startsWith("pit.p1"),
);
const PIT_PLAYER_TWO_ACTION_IDS = PIT_CONTROL_ACTION_IDS.filter(
  (actionId) => actionId.startsWith("pit.p2"),
);
function createPitResultId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `pit-${crypto.randomUUID()}`;
  }
  return `pit-${Date.now().toString(36)}-${performance.now().toString(36).replace(".", "")}`;
}

function createPitDescentSeed(): number {
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    return crypto.getRandomValues(new Uint32Array(1))[0] ?? 0;
  }
  return Date.now() >>> 0;
}

const ACTION_LABELS: Record<PitAttackKind, string> = {
  light: "Lame rapide",
  medium: "Balayage",
  heavy: "Frappe lourde",
  technique: "Technique basse",
};

const TECHNIQUE_DEVICE_COLORS: Record<PitTechniqueDevice, string> = {
  disc: "#d8fff7",
  net: "#8df4cc",
  plasma: "#ff715d",
  shoulder: "#ffae5a",
  whip: "#c9f8e8",
  "bolt-trap": "#d8b06b",
  shockwave: "#ef8a55",
  drone: "#77d9d0",
  "counter-blade": "#e8e0bc",
  spear: "#ebd58f",
  "bow-snare": "#9be09d",
  "code-parry": "#79fff0",
  "warlord-wave": "#df5a42",
  "stone-heart-charge": "#d6a15d",
};

const TECHNIQUE_STATUS_LABELS: Record<PitTechniqueStatusKind, string> = {
  netted: "FILET",
  pinned: "IMMOBILISÉ",
  tracked: "TRAQUÉ",
  staggered: "ÉBRANLÉ",
};

function firstBinding(bindings: ControlBindings, action: ControlActionId): string {
  return compactControlKeyLabel(bindings[action][0] ?? "—");
}

function mergeInputs(primary: PitInput, secondary: PitInput): PitInput {
  return {
    left: primary.left || secondary.left,
    right: primary.right || secondary.right,
    down: primary.down || secondary.down,
    jump: primary.jump || secondary.jump,
    guardHigh: primary.guardHigh || secondary.guardHigh,
    guardLow: primary.guardLow || secondary.guardLow,
    attack: primary.attack ?? secondary.attack,
    throw: primary.throw || secondary.throw,
    resource: primary.resource || secondary.resource,
  };
}

function readGamepad(gamepad: Gamepad | null): PitInput {
  if (!gamepad) return EMPTY_INPUT;
  const axisX = gamepad.axes[0] ?? 0;
  const axisY = gamepad.axes[1] ?? 0;
  const pressed = (index: number) => Boolean(gamepad.buttons[index]?.pressed);
  return {
    left: axisX < -0.32 || pressed(14),
    right: axisX > 0.32 || pressed(15),
    down: axisY > 0.45 || pressed(13),
    jump: pressed(0),
    attack: pressed(2)
      ? "light"
      : pressed(3)
        ? "medium"
        : pressed(1)
          ? "heavy"
          : pressed(5)
            ? "technique"
            : undefined,
    guardHigh: pressed(4),
    guardLow: pressed(6),
    throw: pressed(7),
    resource: pressed(8),
  };
}

function isNeutralInput(input: PitInput): boolean {
  return !input.left && !input.right && !input.down && !input.jump &&
    !input.guardHigh && !input.guardLow && !input.attack && !input.throw && !input.resource;
}

/** Deterministic state-only rival: no random calls and no player-input access. */
function cpuInput(state: PitCombatState): PitInput {
  const cpu = state.fighters[1];
  const opponent = state.fighters[0];
  if (state.phase !== "round") return EMPTY_INPUT;
  if (
    cpu.phase === "hitstun" &&
    cpu.comboHitsReceived >= 2 &&
    !cpu.ruptureUsedThisRound &&
    cpu.traque >= PIT_MAX_TRAQUE
  ) {
    return { resource: true };
  }
  if (state.pendingThrow) {
    // React to a visible capture after five ticks, never to the player's input.
    return state.pendingThrow.attackerSlot === 0 &&
      state.pendingThrow.framesRemaining === 3 &&
      state.pendingThrow.capturedFrame % 3 !== 0 ? { throw: true } : EMPTY_INPUT;
  }
  if (cpu.phase !== "idle") return EMPTY_INPUT;
  const signedDistance = opponent.x - cpu.x;
  const distance = Math.abs(signedDistance);
  const beat = state.frame % 180;

  if (
    cpu.traque >= PIT_CLOAK_COST &&
    cpu.traque < PIT_MAX_TRAQUE &&
    cpu.cloakPhase === "inactive" &&
    cpu.cloakCooldownFrames === 0 &&
    state.frame % 240 === 0
  ) {
    return { resource: true };
  }

  if (distance > 116) {
    return {
      left: signedDistance < 0,
      right: signedDistance > 0,
      jump: distance > 310 && state.frame % 240 === 0,
    };
  }
  if (beat >= 122 && beat < 150) {
    return { guardHigh: beat < 136, guardLow: beat >= 136 };
  }
  if (state.frame % 83 === 0) return { throw: true };
  if (state.frame % 61 === 0) return { attack: "technique" };
  if (state.frame % 43 === 0) return { attack: "heavy" };
  if (state.frame % 29 === 0) return { attack: "medium" };
  if (state.frame % 17 === 0) return { attack: "light" };
  if (distance < 70 && beat < 24) {
    return { left: signedDistance > 0, right: signedDistance < 0 };
  }
  return EMPTY_INPUT;
}

function eventLabel(event: PitCombatEvent): string {
  if (event.type === "round-start") return `MANCHE ${event.round} · COMBAT`;
  if (event.type === "attack-start") {
    return (
      event.attack === "technique"
        ? PIT_FIGHTERS[event.fighterId].attacks.technique.label
        : ACTION_LABELS[event.attack]
    ).toUpperCase();
  }
  if (event.type === "throw-start") return "SAISIE RITUELLE";
  if (event.type === "throw-caught") return "SAISI · PROJECTION POUR DÉCHOPPER";
  if (event.type === "throw-tech") return "DÉCHOPPE RÉUSSIE";
  if (event.type === "hit") return `${event.combo > 1 ? `${event.combo} COUPS · ` : ""}${event.damage} DÉGÂTS`;
  if (event.type === "block") return `GARDE · ${event.damage} DÉGÂTS RÉSIDUELS`;
  if (event.type === "traque-gain") return `TRAQUE +${event.amount}`;
  if (event.type === "rupture") return "RUPTURE DE CHASSE";
  if (event.type === "survival-instinct") return "INSTINCT DE SURVIE";
  if (event.type === "cloak-start") return "CAMOUFLAGE ARMÉ";
  if (event.type === "cloak-end") return event.reason === "expired" ? "CAMOUFLAGE ÉPUISÉ" : "CAMOUFLAGE ROMPU";
  if (event.type === "combo-break") return "RUPTURE DE COMBO";
  if (event.type === "match-end") return "MATCH TERMINÉ";
  return event.result.reason === "timeout" ? "TEMPS ÉCOULÉ" : event.result.reason.toUpperCase();
}

function drawTechniqueEffect(
  context: CanvasRenderingContext2D,
  state: PitCombatState,
  effect: PitTechniqueEffectState,
  groundY: number,
  highContrast: boolean,
  showHitboxes: boolean,
): void {
  const owner = state.fighters[effect.ownerSlot];
  const technique = PIT_FIGHTERS[owner.definitionId].technique;
  const box = getPitTechniqueBox(state, effect);
  const x = box.x;
  const y = groundY - box.y - box.height;
  const centerX = x + box.width / 2;
  const centerY = y + box.height / 2;
  const color = highContrast ? "#ffffff" : TECHNIQUE_DEVICE_COLORS[technique.device];
  const pulse = 0.72 + Math.sin((state.frame + effect.id * 11) * 0.22) * 0.18;

  context.save();
  context.globalAlpha = effect.phase === "arming" ? pulse * 0.55 : effect.phase === "returning" ? 0.72 : 0.94;
  context.strokeStyle = color;
  context.fillStyle = color;
  context.shadowColor = color;
  context.shadowBlur = effect.phase === "active" ? 12 : 5;
  context.lineWidth = 3;
  if (effect.phase === "arming") context.setLineDash([5, 5]);
  if (effect.phase === "returning") context.setLineDash([10, 4]);

  if (technique.device === "net" || technique.device === "bow-snare") {
    context.strokeRect(x, y, box.width, box.height);
    for (let offset = 8; offset < box.width; offset += 10) {
      context.beginPath();
      context.moveTo(x + offset, y);
      context.lineTo(x + Math.max(0, offset - 15), y + box.height);
      context.stroke();
    }
    for (let offset = 8; offset < box.height; offset += 10) {
      context.beginPath();
      context.moveTo(x, y + offset);
      context.lineTo(x + box.width, y + Math.max(0, offset - 8));
      context.stroke();
    }
  } else if (
    technique.device === "disc" ||
    technique.device === "counter-blade" ||
    technique.device === "code-parry"
  ) {
    context.beginPath();
    context.ellipse(centerX, centerY, box.width * 0.48, Math.max(4, box.height * 0.22), 0, 0, Math.PI * 2);
    context.stroke();
    context.beginPath();
    context.moveTo(x, centerY);
    context.lineTo(x + box.width, centerY);
    context.moveTo(centerX, y);
    context.lineTo(centerX, y + box.height);
    context.stroke();
  } else if (technique.device === "plasma" || technique.device === "shoulder") {
    const radius = Math.max(5, Math.min(box.width, box.height) * 0.42);
    const glow = context.createRadialGradient(centerX, centerY, 1, centerX, centerY, radius);
    glow.addColorStop(0, "#ffffff");
    glow.addColorStop(0.35, color);
    glow.addColorStop(1, "rgba(255,80,50,0)");
    context.fillStyle = glow;
    context.beginPath();
    context.arc(centerX, centerY, radius, 0, Math.PI * 2);
    context.fill();
  } else if (
    technique.device === "shockwave" ||
    technique.device === "warlord-wave"
  ) {
    context.beginPath();
    context.ellipse(centerX, y + box.height, box.width * 0.48, Math.max(5, box.height * 0.28), 0, Math.PI, Math.PI * 2);
    context.stroke();
    context.globalAlpha *= 0.55;
    context.beginPath();
    context.ellipse(centerX, y + box.height, box.width * 0.32, Math.max(3, box.height * 0.18), 0, Math.PI, Math.PI * 2);
    context.stroke();
  } else if (technique.device === "drone") {
    context.beginPath();
    context.ellipse(centerX, centerY, box.width * 0.34, box.height * 0.3, 0, 0, Math.PI * 2);
    context.fill();
    context.beginPath();
    context.moveTo(x, centerY);
    context.lineTo(x + box.width, centerY);
    context.moveTo(centerX, y);
    context.lineTo(centerX, y + box.height);
    context.stroke();
  } else if (technique.device === "bolt-trap") {
    context.beginPath();
    context.moveTo(x, y + box.height);
    context.lineTo(centerX, y);
    context.lineTo(x + box.width, y + box.height);
    context.closePath();
    context.stroke();
  } else {
    context.beginPath();
    context.moveTo(x, centerY + technique.height * 0.12);
    context.lineTo(x + box.width, centerY - technique.height * 0.12);
    context.stroke();
    context.beginPath();
    context.moveTo(x + box.width, centerY - technique.height * 0.12);
    context.lineTo(x + box.width - effect.direction * 12, centerY - 8);
    context.lineTo(x + box.width - effect.direction * 12, centerY + 8);
    context.closePath();
    context.fill();
  }

  context.restore();
  if (showHitboxes) {
    context.save();
    context.strokeStyle = "#d888ff";
    context.lineWidth = 2;
    context.strokeRect(x, y, box.width, box.height);
    context.restore();
  }
}

function drawArena(
  canvas: HTMLCanvasElement,
  state: PitCombatState,
  camera: PitPresentationCamera,
  highContrast: boolean,
  reducedGore: boolean,
  showHitboxes: boolean,
  impact: ImpactFlash | null,
  leftCosmeticPalette: PitArcadeCosmeticDefinition["palette"] | null,
  fighterArt: PitCombatBitmapArtBank | null,
  arenaArt: PitArenaArtBank | null,
  reducedMotion: boolean,
): void {
  const context = canvas.getContext("2d");
  if (!context) return;
  const arena = PIT_ARENAS[state.arenaId];
  const { width, height, groundY } = arena;
  context.clearRect(0, 0, width, height);
  context.fillStyle = highContrast ? "#071d22" : arena.palette.sky;
  context.fillRect(0, 0, width, height);
  canvas.dataset.pitCameraMode = camera.mode;
  canvas.dataset.pitCameraZoom = camera.zoom.toFixed(4);
  canvas.dataset.pitCameraTargetZoom = camera.targetZoom.toFixed(4);
  canvas.dataset.pitCameraCenterX = camera.centerX.toFixed(2);
  canvas.dataset.pitCameraCenterY = camera.centerY.toFixed(2);

  const backdropReport = drawPitArenaBackdrop(context, state, camera, arenaArt, { highContrast, reducedMotion });
  canvas.dataset.pitArenaId = state.arenaId;
  canvas.dataset.pitArenaArtStatus = !arenaArt || arenaArt.arenaId !== state.arenaId ? "loading" : arenaArt.unavailable ? "unavailable" : backdropReport.missingPaths.length ? "partial" : "bitmap";
  canvas.dataset.pitArenaMissingAssets = String(backdropReport.missingPaths.length);
  canvas.dataset.pitArenaArtSource = arenaArt?.unavailable ? "unavailable" : arenaArt?.productionKit ? "openai-v33-independent" : "legacy-bitmap";
  canvas.dataset.pitArenaLoadedImages = String(arenaArt?.images.size ?? 0);
  canvas.dataset.pitArenaSubplans = String(arenaArt?.productionKit?.planes.reduce((sum, plane) => sum + plane.assets.length, 0) ?? 0);
  context.save();
  applyPitPresentationCamera(context, width, height, camera);

  for (const effect of state.techniqueEffects) {
    drawTechniqueEffect(context, state, effect, groundY, highContrast, showHitboxes);
  }

  state.fighters.forEach((fighter) => {
    const definition = PIT_FIGHTERS[fighter.definitionId];
    const fighterPalette =
      fighter.slot === 0 && leftCosmeticPalette ? leftCosmeticPalette : definition.palette;
    const boxes = getPitFighterBoxes(fighter);
    const body = boxes.pushbox;
    const screenY = groundY - fighter.y;
    const bodyTop = screenY - body.height;
    const primary = highContrast
      ? fighter.slot === 0 ? "#e6d07a" : "#ff6d65"
      : fighterPalette.primary;
    const accent = highContrast ? "#eafcff" : fighterPalette.accent;
    const lean = fighter.phase === "startup" ? fighter.facing * 6 : fighter.phase === "active" ? fighter.facing * 13 : 0;

    context.save();
    context.fillStyle = "rgba(0,0,0,.45)";
    context.beginPath();
    context.ellipse(fighter.x, groundY + 4, definition.bodyWidth * 0.72, 9, 0, 0, Math.PI * 2);
    context.fill();
    if (fighter.slot === 0 && leftCosmeticPalette) {
      context.strokeStyle = fighterPalette.primary;
      context.lineWidth = 3;
      context.stroke();
    }
    context.restore();

    // These are the delivered, character-specific PNG plates. They remain fixed
    // poses, never promoted to complete animation clips or used as hitboxes.
    const bitmapDrawn = drawPitCombatBitmapFighter(context, fighterArt, fighter, groundY, { highContrast, accent, simulationFrame: state.frame, combat: state });
    if (!bitmapDrawn) {
      context.save();
      context.translate(fighter.x, bodyTop);
      context.scale(fighter.facing, 1);
      if (fighter.cloakPhase !== "inactive") {
        context.globalAlpha = fighter.cloakPhase === "active" ? 0.38 : fighter.cloakPhase === "startup" ? 0.68 : 0.54;
        context.shadowColor = highContrast ? "#ffffff" : "#72d8c2";
        context.shadowBlur = fighter.cloakPhase === "active" ? 13 : 7;
      }

      context.fillStyle = primary;
      context.beginPath();
      context.moveTo(-18 + lean, 30);
      context.lineTo(18 + lean, 30);
      context.lineTo(25, body.height - 31);
      context.lineTo(15, body.height);
      context.lineTo(2, body.height - 38);
      context.lineTo(-12, body.height);
      context.lineTo(-24, body.height - 30);
      context.closePath();
      context.fill();
      context.fillStyle = fighterPalette.secondary;
      context.fillRect(-24 + lean, 39, 48, 23);
      context.fillStyle = accent;
      context.beginPath();
      context.arc(lean, 18, 18, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = "#111816";
      context.fillRect(lean - 14, 14, 28, 8);
      context.strokeStyle = accent;
      context.lineWidth = 5;
      context.beginPath();
      context.moveTo(18 + lean, 49);
      context.lineTo(43 + (fighter.phase === "active" ? 20 : 0), 65);
      context.stroke();
      context.restore();
    } else if (fighter.phase === "startup" || boxes.hitbox) {
      // Until authored attack poses exist, keep the real anticipation/contact
      // readable through a separate cue. This cue cannot deal or extend damage.
      context.save();
      context.strokeStyle = fighter.phase === "startup" ? "#f7ce79" : "#fff2bf";
      context.lineWidth = fighter.phase === "startup" ? 2 : 4;
      context.globalAlpha = fighter.phase === "startup" ? .8 : .9;
      context.beginPath();
      if (boxes.hitbox) {
        const hit = boxes.hitbox;
        const y = groundY - hit.y - hit.height;
        const fromX = fighter.facing === 1 ? hit.x : hit.x + hit.width;
        const toX = fighter.facing === 1 ? hit.x + hit.width : hit.x;
        context.moveTo(fromX, y + hit.height * .7);
        context.quadraticCurveTo(toX, y - 8, toX, y + hit.height * .8);
      } else {
        context.arc(fighter.x + fighter.facing * definition.bodyWidth * .65, bodyTop + 38, 8, 0, Math.PI * 2);
      }
      context.stroke();
      context.restore();
    }

    if (fighter.cloakPhase !== "inactive") {
      context.save();
      context.globalAlpha = fighter.cloakPhase === "active" ? 0.82 : 0.58;
      context.strokeStyle = highContrast ? "#ffffff" : "#72d8c2";
      context.lineWidth = fighter.cloakPhase === "active" ? 2 : 1;
      context.setLineDash([7, 5]);
      context.lineDashOffset = -(state.frame % 12);
      context.strokeRect(
        boxes.hurtbox.x - 3,
        groundY - boxes.hurtbox.y - boxes.hurtbox.height - 3,
        boxes.hurtbox.width + 6,
        boxes.hurtbox.height + 6,
      );
      context.restore();
    }

    if (fighter.techniqueStatus) {
      const statusColor = highContrast
        ? "#ffffff"
        : TECHNIQUE_DEVICE_COLORS[
            PIT_FIGHTERS[fighter.techniqueStatus.sourceFighterId].technique.device
          ];
      context.save();
      context.globalAlpha = 0.82;
      context.strokeStyle = statusColor;
      context.lineWidth = 2;
      context.setLineDash(fighter.techniqueStatus.kind === "tracked" ? [3, 5] : [8, 4]);
      context.lineDashOffset = -(state.frame % 12);
      context.strokeRect(
        boxes.hurtbox.x - 5,
        groundY - boxes.hurtbox.y - boxes.hurtbox.height - 5,
        boxes.hurtbox.width + 10,
        boxes.hurtbox.height + 10,
      );
      if (fighter.techniqueStatus.kind === "netted" || fighter.techniqueStatus.kind === "pinned") {
        context.beginPath();
        context.moveTo(boxes.hurtbox.x, groundY - boxes.hurtbox.y - boxes.hurtbox.height);
        context.lineTo(boxes.hurtbox.x + boxes.hurtbox.width, groundY - boxes.hurtbox.y);
        context.moveTo(boxes.hurtbox.x + boxes.hurtbox.width, groundY - boxes.hurtbox.y - boxes.hurtbox.height);
        context.lineTo(boxes.hurtbox.x, groundY - boxes.hurtbox.y);
        context.stroke();
      }
      context.restore();
    }

    if (showHitboxes) {
      const paintBox = (box: { x: number; y: number; width: number; height: number }, color: string) => {
        context.strokeStyle = color;
        context.lineWidth = 2;
        context.strokeRect(box.x, groundY - box.y - box.height, box.width, box.height);
      };
      paintBox(boxes.hurtbox, "#59f4c7");
      if (boxes.hitbox) paintBox(boxes.hitbox, "#ff4d69");
    }
  });

  if (impact && state.frame - impact.frame < 14) {
    const age = state.frame - impact.frame;
    const radius = 10 + age * 3.2;
    context.strokeStyle = impact.blocked ? "#7cebdd" : reducedGore ? "#e8bd66" : "#bb303b";
    context.globalAlpha = Math.max(0, 1 - age / 14);
    context.lineWidth = 5;
    context.beginPath();
    context.arc(impact.x, impact.y, radius, 0, Math.PI * 2);
    context.stroke();
    context.globalAlpha = 1;
  }
  context.restore();
  const foregroundReport = drawPitArenaForeground(context, state, camera, arenaArt, { highContrast, reducedMotion });
  canvas.dataset.pitArenaPlanes = [...backdropReport.drawnPlanes, ...foregroundReport.drawnPlanes].join(",");
}

function TouchButton({
  label,
  token,
  onChange,
  wide = false,
}: {
  label: string;
  token: string;
  onChange: (token: string, pressed: boolean) => void;
  wide?: boolean;
}) {
  const release = (event: ReactPointerEvent<HTMLButtonElement>) => {
    event.preventDefault();
    onChange(token, false);
  };
  return (
    <button
      type="button"
      className={`${styles.touchButton} ${wide ? styles.touchButtonWide : ""}`}
      onPointerDown={(event) => {
        event.preventDefault();
        event.currentTarget.setPointerCapture(event.pointerId);
        onChange(token, true);
      }}
      onPointerUp={release}
      onPointerCancel={release}
      onLostPointerCapture={() => onChange(token, false)}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") onChange(token, true);
      }}
      onKeyUp={(event) => {
        if (event.key === "Enter" || event.key === " ") onChange(token, false);
      }}
      aria-label={label}
    >
      {label}
    </button>
  );
}

export function FighterCard({
  fighterId,
  side,
  paletteOverride = null,
}: {
  fighterId: PitFighterId;
  side: "GAUCHE" | "DROITE";
  paletteOverride?: PitArcadeCosmeticDefinition["palette"] | null;
}) {
  const fighter = PIT_FIGHTERS[fighterId];
  const profile = getPitFighterProfile(fighterId);
  const palette = paletteOverride ?? fighter.palette;
  const keyArt = getPitFighterKeyArt(fighterId, side === "DROITE" ? "left" : "right");
  const bitmapArt = keyArt ? null : getPitCombatBitmapArtDefinition(fighterId);
  const selectedArt = keyArt ?? (bitmapArt ? { ...bitmapArt, alt: fighter.name + " en pied, illustration détourée existante en pose fixe." } : null);
  const [failedArtSrc, setFailedArtSrc] = useState<string | null>(null);
  const visibleArt = selectedArt && failedArtSrc !== selectedArt.src ? selectedArt : null;
  const facing = visibleArt?.nativeFacing === "neutral" ? "neutral" : side === "DROITE" ? "left" : "right";
  return (
    <article
      className={styles.fighterCard}
      style={{ "--fighter": palette.primary } as React.CSSProperties}
      aria-label={`Profil de ${fighter.name} · côté ${side.toLocaleLowerCase("fr")}`}
      data-fighter-id={fighterId}
      data-fighter-art={isPitExpansionFighterId(fighterId) ? "authored-idle-pose" : visibleArt?.kind ?? "mask-glyph"}
    >
      <span className={styles.sideLabel}>{side}</span>
      <div className={styles.fighterMedia}>
        {isPitExpansionFighterId(fighterId) ? <PitExtensionPortrait key={fighterId + side} fighterId={fighterId} facing={side === "DROITE" ? "left" : "right"}/> : visibleArt ? (
          <img
            key={visibleArt.src}
            className={styles.fighterKeyArt}
            src={visibleArt.src}
            width={visibleArt.width}
            height={visibleArt.height}
            alt={visibleArt.alt}
            data-native-facing={visibleArt.nativeFacing}
            data-facing={facing}
            decoding="async"
            onError={() => setFailedArtSrc(visibleArt.src)}
          />
        ) : (
          <div className={styles.maskGlyph} aria-hidden="true"><i /><i /><i /></div>
        )}
      </div>
      {!visibleArt ? <small className={styles.fighterArtNotice}>{selectedArt ? "Image indisponible" : "Image à produire"}</small> : null}
      <h3>{fighter.name}</h3>
      <p>{fighter.epithet}{paletteOverride ? " · ARMURE DU JUGEMENT" : ""}</p>
      <small className={styles.techniqueName}>TECHNIQUE · {fighter.attacks.technique.label}</small>
      <dl>
        <div><dt>VIE</dt><dd>{fighter.maxHealth}</dd></div>
        <div><dt>PUISSANCE</dt><dd>{Math.round(fighter.power * 100)}</dd></div>
        <div><dt>MOBILITÉ</dt><dd>{Math.round(fighter.walkSpeed * 20)}</dd></div>
      </dl>
      <details key={fighterId} className={styles.fighterProfile}>
        <summary aria-label={`Consulter le profil de ${fighter.name}`}>Profil du chasseur</summary>
        <p className={styles.fighterSource}>{profile.sourceWork}</p>
        <p>{profile.arcadeIntro}</p>
        <p>
          <strong>{fighter.attacks.technique.label}</strong>
          {" · portée "}{fighter.attacks.technique.range}{" · préparation "}
          {fighter.attacks.technique.startup}{" images"}
        </p>
        {visibleArt ? (
          <small>
            {visibleArt.kind === "static-bitmap" ? "Illustration détourée existante · pose fixe provisoire." : "Illustration de sélection."}
            {paletteOverride ? " La palette Armure du Jugement colore le repère au sol ; l’illustration conserve ses couleurs." : ""}
          </small>
        ) : null}
      </details>
    </article>
  );
}

export default function PitCanvas({
  controlBindings,
  highContrast,
  reducedGore,
  screenShake,
  unlockedCosmeticIds = [],
  savedCircuitRuns = {},
  savedDescentRuns = {},
  exitLabel = "Retour au vaisseau",
  onExit,
  onMatchComplete,
  onRunTransition,
  lastReplay = null,
}: PitCanvasProps) {
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setPrefersReducedMotion(media.matches);
    update();
    media.addEventListener("change", update);
    return () => media.removeEventListener("change", update);
  }, []);
  const reducedCameraMotion = prefersReducedMotion || !screenShake;
  const [mode, setMode] = useState<PitMode>("cpu");
  const [leftId, setLeftId] = useState<PitVersusFighterId>("jungle-hunter");
  const [rightId, setRightId] = useState<PitVersusFighterId>("berserker");
  const [arenaId, setArenaId] = useState<PitArenaId>("the-pit");
  const [arcadeRun, setArcadeRun] = useState<PitArcadeRun | null>(null);
  const [circuitRun, setCircuitRun] = useState<PitCircuitRun | null>(null);
  const [descentRun, setDescentRun] = useState<PitDescentRun | null>(null);
  const [descentOptionIndex, setDescentOptionIndex] = useState(0);
  const [descentDraftSeed, setDescentDraftSeed] = useState(0);
  const [activeMatchResultId, setActiveMatchResultId] = useState("");
  const [combat, setCombat] = useState<PitCombatState | null>(null);
  const [fighterArt, setFighterArt] = useState<PitCombatBitmapArtBank | null>(null);
  const [arenaArt, setArenaArt] = useState<PitArenaArtBank | null>(null);
  const renderedArenaId = combat?.arenaId ?? arenaId;
  useEffect(() => {
    const controller = new AbortController();
    void loadPitArenaArt(renderedArenaId, { signal: controller.signal })
      .then((bank) => { if (!controller.signal.aborted) setArenaArt(bank); });
    return () => controller.abort();
  }, [renderedArenaId]);
  const renderedLeftId = combat?.fighters[0].definitionId ?? leftId;
  const renderedRightId = combat?.fighters[1].definitionId ?? rightId;
  useEffect(() => {
    const controller = new AbortController();
    void loadPitCombatBitmapArt([renderedLeftId, renderedRightId], { signal: controller.signal })
      .then((bank) => { if (!controller.signal.aborted) setFighterArt(bank); });
    return () => controller.abort();
  }, [renderedLeftId, renderedRightId]);

  const [announcement, setAnnouncement] = useState("CHOISIS LE RITUEL");
  const [ariaAnnouncement, setAriaAnnouncement] = useState("Choisissez le rituel de combat.");
  const [replayNotice, setReplayNotice] = useState("");
  const [recordedReplay, setRecordedReplay] = useState<PitReplay | null>(null);
  const [playbackReplay, setPlaybackReplay] = useState<PitReplay | null>(null);
  const [replayEnded, setReplayEnded] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [showTrainingTools, setShowTrainingTools] = useState(false);
  const [trainingSettings, setTrainingSettings] = useState(() => createPitTrainingSettings());
  const [trainingSequence, setTrainingSequence] = useState<PitTrainingSequence | null>(null);
  const [trainingActivity, setTrainingActivity] = useState<PitTrainingActivity>("idle");
  const [trainingRecordedTicks, setTrainingRecordedTicks] = useState(0);
  const [trainingNotice, setTrainingNotice] = useState("");
  const [trainingPaused, setTrainingPaused] = useState(false);
  const [trainingLesson, setTrainingLesson] = useState<PitTrainingLesson | null>(null);
  const trainingClockRef = useRef(createPitTrainingClock());
  const trainingLessonRef = useRef<PitTrainingLesson | null>(null);
  const [impact, setImpact] = useState<ImpactFlash | null>(null);
  const [descentCombatPresentation, setDescentCombatPresentation] =
    useState<PitDescentCombatPresentation | null>(null);
  const [descentResourceFeedback, setDescentResourceFeedback] =
    useState<PitDescentResourceFeedback | null>(null);
  const [equippedCosmeticId, setEquippedCosmeticId] = useState<string | null>(null);
  const [arcadePersistence, setArcadePersistence] = useState<PitArcadePersistenceState>({
    status: "idle",
    message: "",
  });
  const [circuitPersistence, setCircuitPersistence] = useState<PitCircuitPersistenceState>({
    status: "idle",
    message: "",
  });
  const [runTransitionPersistence, setRunTransitionPersistence] =
    useState<PitRunTransitionPersistenceState>({
      status: "idle",
      message: "",
    });
  const [touchAvailable] = useState(() =>
    typeof navigator !== "undefined" &&
      (navigator.maxTouchPoints > 0 || window.matchMedia("(any-pointer: coarse)").matches),
  );
  const combatRef = useRef<PitCombatState | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cameraRef = useRef<PitPresentationCamera | null>(null);
  const rootRef = useRef<HTMLElement>(null);
  const resultOverlayRef = useRef<HTMLDivElement>(null);
  const resultPrimaryRef = useRef<HTMLButtonElement>(null);
  const pressedKeysRef = useRef(new Set<string>());
  const touchInputsRef = useRef<[Set<string>, Set<string>]>([new Set(), new Set()]);
  const menuGamepadRef = useRef({ previous: Array.from({ length: 8 }, () => false), ready: false });
  const combatGamepadReadyRef = useRef<[boolean, boolean]>([false, false]);
  const reportedMatchFrameRef = useRef<number | null>(null);
  const matchResultIdRef = useRef("");
  const recorderRef = useRef<PitReplayRecorder | null>(null);
  const replayReaderRef = useRef<PitReplayReader | null>(null);
  const arcadeRunRef = useRef<PitArcadeRun | null>(null);
  const circuitRunRef = useRef<PitCircuitRun | null>(null);
  const descentRunRef = useRef<PitDescentRun | null>(null);
  const descentCombatContextRef = useRef<PitDescentCombatContext | null>(null);
  const trainingSettingsRef = useRef(trainingSettings);
  const trainingActivityRef = useRef<PitTrainingActivity>("idle");
  const trainingRecorderRef = useRef<PitTrainingSequenceRecorder | null>(null);
  const trainingReaderRef = useRef<PitTrainingSequenceReader | null>(null);
  const pendingArcadeSettlementRef = useRef<PendingPitArcadeSettlement | null>(null);
  const arcadePersistenceAttemptRef = useRef(0);
  const pendingCircuitSettlementRef = useRef<PendingPitCircuitSettlement | null>(null);
  const circuitPersistenceAttemptRef = useRef(0);
  const pendingRunTransitionRef = useRef<PendingPitRunTransition | null>(null);
  const runTransitionAttemptRef = useRef(0);
  const normalizedLastReplay = useMemo(
    () => lastReplay ? normalizePitReplay(lastReplay) : null,
    [lastReplay],
  );
  const availableReplay = recordedReplay ?? normalizedLastReplay;
  const downloadAvailableReplay = () => {
    if (!availableReplay) return;
    try {
      const url = URL.createObjectURL(new Blob([serializePitReplay(availableReplay)], { type: "application/json" }));
      const link = document.createElement("a");
      link.href = url;
      link.download = "the-pit-" + availableReplay.fighters.join("-vs-") + ".json";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    } catch {
      setReplayNotice("L’export du replay a échoué. Vous pouvez encore revoir le duel dans cette session.");
    }
  };
  const invalidReplayMessage = lastReplay && !normalizedLastReplay
    ? "Le dernier duel enregistré est illisible ou incompatible."
    : "";
  const activeReplayNotice = replayNotice || invalidReplayMessage;
  const activeAriaAnnouncement = invalidReplayMessage || ariaAnnouncement;
  const runTransitionSelectionLocked =
    runTransitionPersistence.status === "pending" ||
    runTransitionPersistence.status === "failed";
  const selectedArcadeCosmetic = isPitFirstEditionFighterId(leftId) ? PIT_ARCADE_COSMETICS[leftId] : null;
  const selectedCosmeticUnlocked = selectedArcadeCosmetic !== null && unlockedCosmeticIds.includes(selectedArcadeCosmetic.id);
  const equippedArcadeCosmetic =
    selectedArcadeCosmetic && selectedCosmeticUnlocked && equippedCosmeticId === selectedArcadeCosmetic.id
      ? selectedArcadeCosmetic
      : null;
  const gameplayKeyCodes = useMemo(() => {
    const actionIds = mode === "local"
      ? [...PIT_PLAYER_ONE_ACTION_IDS, ...PIT_PLAYER_TWO_ACTION_IDS]
      : PIT_PLAYER_ONE_ACTION_IDS;
    return new Set(actionIds.flatMap((actionId) => controlBindings[actionId]));
  }, [controlBindings, mode]);

  const changeCombat = useCallback((next: PitCombatState | null) => {
    combatRef.current = next;
    setCombat(next);
  }, []);

  const changePitMode = useCallback((nextMode: PitMode) => {
    if (runTransitionSelectionLocked) return;
    if (!canPitFighterEnterMode(leftId, nextMode)) { setReplayNotice("Chronique de ce chasseur non produite : choisissez Duel CPU, Versus local ou Entraînement."); return; }
    setMode(nextMode);
    if (
      nextMode === "descent" &&
      descentRunRef.current?.fighterId !== leftId &&
      !(isPitFirstEditionFighterId(leftId) && savedDescentRuns[leftId])
    ) {
      setDescentDraftSeed(createPitDescentSeed());
    }
  }, [leftId, runTransitionSelectionLocked, savedDescentRuns]);

  const resetLiveInputs = useCallback(() => {
    pressedKeysRef.current.clear();
    combatGamepadReadyRef.current = [false, false];
    touchInputsRef.current.forEach((entries) => entries.clear());
  }, []);

  const focusCombatRoot = useCallback(() => {
    window.requestAnimationFrame(() => rootRef.current?.focus({ preventScroll: true }));
  }, []);

  const changeTrainingActivity = useCallback((next: PitTrainingActivity) => {
    trainingActivityRef.current = next;
    setTrainingActivity(next);
  }, []);

  const applyTrainingSettings = useCallback((patch: PitTrainingSettingsPatch) => {
    setTrainingSettings((current) => {
      const next = updatePitTrainingSettings(current, patch);
      trainingSettingsRef.current = next;
      return next;
    });
  }, []);

  const clearTrainingLesson = useCallback(() => {
    trainingLessonRef.current = null;
    setTrainingLesson(null);
    trainingClockRef.current = createPitTrainingClock();
    setTrainingPaused(false);
  }, []);

  const toggleTrainingPause = useCallback(() => {
    if (combatRef.current?.rules.mode !== "training" || trainingLessonRef.current?.status === "success" ||
      trainingLessonRef.current?.status === "failed") return;
    const paused = !trainingClockRef.current.paused;
    trainingClockRef.current = pausePitTrainingClock(trainingClockRef.current, paused);
    setTrainingPaused(paused);
    setAriaAnnouncement(paused ? "Simulation gelée. Chaque avance consomme un seul tick à 60 Hz." : "Simulation reprise.");
  }, []);

  const advanceTrainingTick = useCallback(() => {
    if (combatRef.current?.rules.mode !== "training") return;
    trainingClockRef.current = requestPitTrainingTick(trainingClockRef.current);
  }, []);

  const clearTrainingActivity = useCallback(() => {
    trainingRecorderRef.current = null;
    trainingReaderRef.current = null;
    changeTrainingActivity("idle");
    clearTrainingLesson();
  }, [changeTrainingActivity, clearTrainingLesson]);

  const finishTrainingRecording = useCallback((automatic = false) => {
    const recorder = trainingRecorderRef.current;
    trainingRecorderRef.current = null;
    changeTrainingActivity("idle");
    focusCombatRoot();
    if (!recorder || recorder.tickCount === 0) {
      setTrainingNotice("Aucune entrée enregistrée.");
      setAriaAnnouncement("Aucune commande du mannequin n’a été enregistrée.");
      return;
    }
    try {
      const sequence = recorder.finish();
      setTrainingSequence(sequence);
      const seconds = (sequence.metadata.durationMs / 1_000).toFixed(1).replace(".0", "");
      setTrainingNotice(`${automatic ? "Limite atteinte · " : ""}${seconds} s · ${sequence.metadata.ticks} images prêtes.`);
      setAriaAnnouncement(`Séquence du mannequin enregistrée pendant ${seconds} secondes.`);
    } catch {
      setTrainingNotice("Séquence invalide. Recommencez l’enregistrement.");
      setAriaAnnouncement("La séquence du mannequin n’a pas pu être conservée.");
    }
  }, [changeTrainingActivity, focusCombatRoot]);

  const startTrainingRecording = useCallback(() => {
    const current = combatRef.current;
    if (!current || current.rules.mode !== "training") return;
    clearTrainingLesson();
    trainingReaderRef.current = null;
    trainingRecorderRef.current = createPitTrainingSequenceRecorder();
    setTrainingRecordedTicks(0);
    changeTrainingActivity("recording");
    setTrainingNotice("Commandes J1 dirigées vers le mannequin · 12 s maximum.");
    setAnnouncement("ENREGISTREMENT MANNEQUIN");
    setAriaAnnouncement("Enregistrement du mannequin commencé. Les commandes du joueur un contrôlent le mannequin.");
    resetLiveInputs();
    changeCombat(resetPitTrainingPositions(current));
    focusCombatRoot();
  }, [changeCombat, changeTrainingActivity, clearTrainingLesson, focusCombatRoot, resetLiveInputs]);

  const startTrainingPlayback = useCallback(() => {
    const current = combatRef.current;
    if (!current || current.rules.mode !== "training" || !trainingSequence) return;
    clearTrainingLesson();
    try {
      trainingRecorderRef.current = null;
      trainingReaderRef.current = createPitTrainingSequenceReader(
        trainingSequence,
        trainingSettingsRef.current.sequencePlayback,
      );
      changeTrainingActivity("playback");
      setTrainingNotice(trainingSettingsRef.current.sequencePlayback === "loop" ? "Lecture du mannequin en boucle." : "Lecture unique du mannequin.");
      setAnnouncement("LECTURE MANNEQUIN");
      setAriaAnnouncement("Lecture de la séquence du mannequin commencée.");
      resetLiveInputs();
      changeCombat(resetPitTrainingPositions(current));
      focusCombatRoot();
    } catch {
      clearTrainingActivity();
      setTrainingNotice("Impossible de lire cette séquence.");
      setAriaAnnouncement("La séquence du mannequin est illisible.");
    }
  }, [changeCombat, changeTrainingActivity, clearTrainingActivity, clearTrainingLesson, focusCombatRoot, resetLiveInputs, trainingSequence]);

  const stopTrainingPlayback = useCallback(() => {
    trainingReaderRef.current = null;
    changeTrainingActivity("idle");
    setTrainingNotice("Lecture arrêtée. Le comportement choisi reprend.");
    setAriaAnnouncement("Lecture du mannequin arrêtée.");
    focusCombatRoot();
  }, [changeTrainingActivity, focusCombatRoot]);

  const resetTraining = useCallback(() => {
    const current = combatRef.current;
    if (!current || current.rules.mode !== "training") return;
    clearTrainingActivity();
    resetLiveInputs();
    setTrainingNotice("Positions, vie et ressources réinitialisées.");
    setAnnouncement("POSITIONS RÉINITIALISÉES");
    setAriaAnnouncement("Positions, vie et ressources réinitialisées.");
    changeCombat(resetPitTrainingPositions(current));
    focusCombatRoot();
  }, [changeCombat, clearTrainingActivity, focusCombatRoot, resetLiveInputs]);

  const startTrainingLesson = useCallback((id: PitTrainingLessonId) => {
    const current = combatRef.current;
    if (!current || current.rules.mode !== "training") return;
    const prepared = preparePitTrainingLesson(current, id);
    clearTrainingActivity();
    resetLiveInputs();
    recorderRef.current = null;
    trainingLessonRef.current = prepared.lesson;
    setTrainingLesson(prepared.lesson);
    setTrainingNotice("");
    setImpact(null);
    setAnnouncement("EXERCICE GUIDÉ");
    setAriaAnnouncement(prepared.lesson.message);
    changeCombat(prepared.state);
    focusCombatRoot();
  }, [changeCombat, clearTrainingActivity, focusCombatRoot, resetLiveInputs]);

  const beginRecording = useCallback((next: PitCombatState) => {
    try {
      recorderRef.current = createPitReplayRecorder({
        fighters: [next.fighters[0].definitionId, next.fighters[1].definitionId],
        rules: next.rules,
        arenaId: next.arenaId,
      });
      setReplayNotice("");
    } catch {
      recorderRef.current = null;
      setReplayNotice("Enregistrement du duel indisponible. Le combat continue.");
      setAriaAnnouncement("Enregistrement du duel indisponible. Le combat continue.");
    }
  }, []);

  const launchLiveMatch = useCallback((
    playerId: PitVersusFighterId,
    opponentId: PitFighterId,
    nextArenaId: PitArenaId,
    nextMode: PitMode,
    descentRunState?: PitDescentRun,
    descentNode?: PitDescentNode,
  ) => {
    let next = createPitCombatState(playerId, opponentId, {
      mode: nextMode === "training" ? "training" : "match",
      arenaId: nextArenaId,
    });
    if (nextMode === "descent") {
      if (!descentRunState || !descentNode) {
        throw new Error("A Descent duel requires its persisted route and node.");
      }
      const prepared = preparePitDescentCombat(next, descentRunState, descentNode);
      next = prepared.state;
      // Descente uses one decisive round so the route health cannot be reset by a normal best-of-three.
      next.fighters[0] = { ...next.fighters[0], roundsWon: 1 };
      next.fighters[1] = { ...next.fighters[1], roundsWon: 1 };
      descentCombatContextRef.current = prepared.context;
      setDescentCombatPresentation(prepared.presentation);
    } else {
      descentCombatContextRef.current = null;
      setDescentCombatPresentation(null);
    }
    setDescentResourceFeedback(null);
    clearTrainingActivity();
    setTrainingNotice("");
    reportedMatchFrameRef.current = null;
    matchResultIdRef.current = createPitResultId();
    setActiveMatchResultId(matchResultIdRef.current);
    replayReaderRef.current = null;
    setPlaybackReplay(null);
    setReplayEnded(false);
    setImpact(null);
    pendingArcadeSettlementRef.current = null;
    arcadePersistenceAttemptRef.current += 1;
    setArcadePersistence({ status: "idle", message: "" });
    pendingCircuitSettlementRef.current = null;
    circuitPersistenceAttemptRef.current += 1;
    setCircuitPersistence({ status: "idle", message: "" });
    pendingRunTransitionRef.current = null;
    runTransitionAttemptRef.current += 1;
    setRunTransitionPersistence({ status: "idle", message: "" });
    setArenaId(nextArenaId);
    cameraRef.current = null;
    resetLiveInputs();
    if (nextMode === "training" || nextMode === "descent") recorderRef.current = null;
    else beginRecording(next);
    const message = nextMode === "training"
      ? "ENTRAÎNEMENT LIBRE"
      : nextMode === "arcade"
        ? "ARCADE · COMBAT"
        : nextMode === "circuit"
          ? "CIRCUIT DU CLAN · COMBAT"
          : nextMode === "descent"
            ? "DESCENTE · MANCHE DÉCISIVE"
            : "MANCHE 1 · COMBAT";
    setAnnouncement(message);
    setAriaAnnouncement(
      nextMode === "training"
        ? "Entraînement libre commencé."
        : nextMode === "arcade"
          ? "Combat du parcours Arcade commencé."
          : nextMode === "circuit"
            ? "Combat du Circuit du clan commencé."
            : nextMode === "descent"
              ? "Combat décisif de la Descente commencé avec la santé conservée."
              : "Manche 1. Combat.",
    );
    changeCombat(next);
  }, [beginRecording, changeCombat, clearTrainingActivity, resetLiveInputs]);

  const submitRunTransition = useCallback((settlement: PendingPitRunTransition) => {
    pendingRunTransitionRef.current = settlement;
    const attempt = runTransitionAttemptRef.current + 1;
    runTransitionAttemptRef.current = attempt;
    setRunTransitionPersistence({
      status: "pending",
      message: "Écriture durable de la route THE PIT en cours…",
    });

    const submit = async () => {
      let acknowledgement: PitMatchPersistenceAck;
      try {
        acknowledgement = onRunTransition
          ? await onRunTransition(settlement.transition)
          : {
              persisted: false,
              message: "La sauvegarde des routes THE PIT n’est pas disponible.",
            };
      } catch {
        acknowledgement = {
          persisted: false,
          message: "L’écriture de la route THE PIT a échoué.",
        };
      }
      if (
        runTransitionAttemptRef.current !== attempt ||
        pendingRunTransitionRef.current?.transition.id !== settlement.transition.id
      ) {
        return;
      }
      if (!acknowledgement.persisted) {
        setRunTransitionPersistence({ status: "failed", message: acknowledgement.message });
        return;
      }
      pendingRunTransitionRef.current = null;
      setRunTransitionPersistence({ status: "confirmed", message: "Route THE PIT enregistrée." });
      settlement.onPersisted();
    };
    void submit();
  }, [onRunTransition]);

  const retryRunTransition = useCallback(() => {
    const settlement = pendingRunTransitionRef.current;
    if (settlement) submitRunTransition(settlement);
  }, [submitRunTransition]);

  const launchCircuitSnapshot = useCallback((
    baseRun: PitCircuitRun,
    mutationKind: "circuit-persist" | "circuit-replace",
  ) => {
    const historyExhausted =
      baseRun.appliedResults.length >= PIT_CIRCUIT_MAX_RESULTS;
    const launchRun = historyExhausted
      ? createPitCircuitRun(baseRun.fighterId)
      : baseRun;
    const launchMutationKind = historyExhausted
      ? "circuit-replace"
      : mutationKind;
    if (historyExhausted) {
      setReplayNotice(
        "Historique du Circuit plein : nouveau Circuit créé, statistiques conservées.",
      );
    }
    const fight = PIT_CLAN_CIRCUITS[launchRun.fighterId].fights[launchRun.fightIndex];
    if (!fight) return;
    const selectedRun = launchRun.selectedFightId
      ? launchRun
      : selectPitCircuitFight(launchRun, fight.id);
    const launch = () => {
      circuitRunRef.current = selectedRun;
      setCircuitRun(selectedRun);
      descentRunRef.current = null;
      setDescentRun(null);
      launchLiveMatch(
        selectedRun.fighterId,
        fight.opponentId,
        fight.arenaId,
        "circuit",
      );
    };
    if (launchRun.selectedFightId) {
      launch();
      return;
    }
    submitRunTransition({
      transition: {
        id: createPitResultId(),
        kind: launchMutationKind,
        run: selectedRun,
      },
      onPersisted: launch,
    });
  }, [launchLiveMatch, submitRunTransition]);

  const resolveDescentNonCombat = useCallback((
    selectedRun: PitDescentRun,
    node: PitDescentNode,
  ) => {
    const transitionId = createPitResultId();
    const application = applyPitDescentResolution(selectedRun, {
      id: transitionId,
      nodeId: node.id,
    });
    submitRunTransition({
      transition: {
        id: transitionId,
        kind: "descent-persist",
        run: application.run,
      },
      onPersisted: () => {
        descentRunRef.current = application.run;
        setDescentRun(application.run);
        setDescentOptionIndex(0);
        setAnnouncement(node.kind === "relic" ? "RELIQUE SCELLÉE" : "SANTÉ RESTAURÉE");
        setAriaAnnouncement(
          node.kind === "relic"
            ? "Relique temporaire de Descente enregistrée."
            : "Récupération de santé de Descente enregistrée.",
        );
      },
    });
  }, [submitRunTransition]);

  const enterPersistedDescentRun = useCallback((run: PitDescentRun) => {
    descentRunRef.current = run;
    setDescentRun(run);
    const plan = createPitDescentPlan(run.fighterId, run.seed);
    const node = run.selectedNodeId
      ? plan.floors[run.completedFloors]?.options.find(
          (candidate) => candidate.id === run.selectedNodeId,
        ) ?? null
      : null;
    if (!node) return;
    if ((node.kind === "fight" || node.kind === "boss") && node.opponentId) {
      launchLiveMatch(run.fighterId, node.opponentId, node.arenaId, "descent", run, node);
      return;
    }
    resolveDescentNonCombat(run, node);
  }, [launchLiveMatch, resolveDescentNonCombat]);

  const chooseDescentBranch = useCallback((
    baseRun: PitDescentRun,
    optionIndex: number,
    mutationKind: "descent-persist" | "descent-replace" = "descent-persist",
  ) => {
    if (baseRun.phase !== "active" || baseRun.selectedNodeId) {
      enterPersistedDescentRun(baseRun);
      return;
    }
    const floor = createPitDescentPlan(baseRun.fighterId, baseRun.seed)
      .floors[baseRun.completedFloors];
    const node = floor?.options[
      Math.max(0, Math.min(optionIndex, (floor?.options.length ?? 1) - 1))
    ];
    if (!node) return;
    const selectedRun = selectPitDescentNode(baseRun, node.id);
    submitRunTransition({
      transition: {
        id: createPitResultId(),
        kind: mutationKind,
        run: selectedRun,
      },
      onPersisted: () => enterPersistedDescentRun(selectedRun),
    });
  }, [enterPersistedDescentRun, submitRunTransition]);

  const startMatch = useCallback(() => {
    if (!canPitFighterEnterMode(leftId, mode)) return;
    if (
      runTransitionPersistence.status === "failed" &&
      (mode === "circuit" || mode === "descent")
    ) {
      retryRunTransition();
      return;
    }
    if (runTransitionPersistence.status === "pending") return;
    if (mode === "arcade") {
      if (!isPitFirstEditionFighterId(leftId)) return;
      const run = createPitArcadeRun(leftId);
      const encounter = PIT_ARCADE_LADDERS[leftId].encounters[0];
      circuitRunRef.current = null;
      setCircuitRun(null);
      descentRunRef.current = null;
      setDescentRun(null);
      arcadeRunRef.current = run;
      setArcadeRun(run);
      launchLiveMatch(leftId, encounter.opponentId, encounter.arenaId, "arcade");
      return;
    }
    if (mode === "circuit") {
      if (!isPitFirstEditionFighterId(leftId)) return;
      const localRun = circuitRunRef.current?.fighterId === leftId
        ? circuitRunRef.current
        : null;
      const storedRun = localRun ?? savedCircuitRuns[leftId] ?? null;
      const historyExhausted =
        storedRun?.phase === "active" &&
        storedRun.appliedResults.length >= PIT_CIRCUIT_MAX_RESULTS;
      const baseRun =
        storedRun?.phase === "active" && !historyExhausted
          ? storedRun
          : createPitCircuitRun(leftId);
      if (historyExhausted) {
        setReplayNotice(
          "Historique du Circuit plein : nouveau Circuit créé, statistiques conservées.",
        );
      }
      arcadeRunRef.current = null;
      setArcadeRun(null);
      launchCircuitSnapshot(
        baseRun,
        storedRun?.phase === "completed" || historyExhausted
          ? "circuit-replace"
          : "circuit-persist",
      );
      return;
    }
    if (mode === "descent") {
      if (!isPitFirstEditionFighterId(leftId)) return;
      const localRun = descentRunRef.current?.fighterId === leftId
        ? descentRunRef.current
        : null;
      const storedRun = localRun ?? savedDescentRuns[leftId] ?? null;
      const freshSeed = storedRun && storedRun.phase !== "active"
        ? createPitDescentSeed()
        : descentDraftSeed;
      if (storedRun && storedRun.phase !== "active") {
        setDescentDraftSeed(freshSeed);
      }
      const baseRun = storedRun?.phase === "active"
        ? storedRun
        : createPitDescentRun(leftId, freshSeed);
      arcadeRunRef.current = null;
      setArcadeRun(null);
      circuitRunRef.current = null;
      setCircuitRun(null);
      chooseDescentBranch(
        baseRun,
        descentOptionIndex,
        storedRun && storedRun.phase !== "active" ? "descent-replace" : "descent-persist",
      );
      return;
    }
    arcadeRunRef.current = null;
    setArcadeRun(null);
    circuitRunRef.current = null;
    setCircuitRun(null);
    descentRunRef.current = null;
    setDescentRun(null);
    launchLiveMatch(leftId, rightId, arenaId, mode);
  }, [
    arenaId,
    chooseDescentBranch,
    descentDraftSeed,
    descentOptionIndex,
    launchCircuitSnapshot,
    launchLiveMatch,
    leftId,
    mode,
    rightId,
    retryRunTransition,
    runTransitionPersistence.status,
    savedCircuitRuns,
    savedDescentRuns,
  ]);

  const chooseDisplayedDescentBranch = useCallback((optionIndex: number) => {
    if (!isPitFirstEditionFighterId(leftId)) return;
    if (runTransitionSelectionLocked) return;
    setDescentOptionIndex(optionIndex);
    const localRun = descentRunRef.current?.fighterId === leftId
      ? descentRunRef.current
      : null;
    const storedRun = localRun ?? savedDescentRuns[leftId] ?? null;
    const baseRun = storedRun?.phase === "active"
      ? storedRun
      : createPitDescentRun(leftId, descentDraftSeed);
    chooseDescentBranch(
      baseRun,
      optionIndex,
      storedRun && storedRun.phase !== "active" ? "descent-replace" : "descent-persist",
    );
  }, [
    chooseDescentBranch,
    descentDraftSeed,
    leftId,
    runTransitionSelectionLocked,
    savedDescentRuns,
  ]);

  const swapSides = useCallback(() => {
    if (!canPitFighterEnterMode(rightId, mode)) setMode("cpu");
    setLeftId(rightId);
    setRightId(leftId);
  }, [leftId, rightId, mode]);

  const returnToSelection = useCallback(() => {
    recorderRef.current = null;
    replayReaderRef.current = null;
    clearTrainingActivity();
    setPlaybackReplay(null);
    setReplayEnded(false);
    pendingArcadeSettlementRef.current = null;
    arcadePersistenceAttemptRef.current += 1;
    setArcadePersistence({ status: "idle", message: "" });
    pendingCircuitSettlementRef.current = null;
    circuitPersistenceAttemptRef.current += 1;
    setCircuitPersistence({ status: "idle", message: "" });
    pendingRunTransitionRef.current = null;
    runTransitionAttemptRef.current += 1;
    setRunTransitionPersistence({ status: "idle", message: "" });
    arcadeRunRef.current = null;
    setArcadeRun(null);
    circuitRunRef.current = null;
    setCircuitRun(null);
    descentRunRef.current = null;
    setDescentRun(null);
    descentCombatContextRef.current = null;
    setDescentCombatPresentation(null);
    setDescentResourceFeedback(null);
    resetLiveInputs();
    setAnnouncement("CHOISIS LE RITUEL");
    setAriaAnnouncement("Retour à la sélection du rituel.");
    changeCombat(null);
  }, [changeCombat, clearTrainingActivity, resetLiveInputs]);

  const submitArcadeSettlement = useCallback((settlement: PendingPitArcadeSettlement) => {
    pendingArcadeSettlementRef.current = settlement;
    const attempt = arcadePersistenceAttemptRef.current + 1;
    arcadePersistenceAttemptRef.current = attempt;
    setArcadePersistence({
      status: "pending",
      message: "Enregistrement du résultat Arcade en cours…",
    });

    const submit = async () => {
      let acknowledgement: PitMatchPersistenceAck;
      try {
        acknowledgement = onMatchComplete
          ? await onMatchComplete(settlement.result)
          : {
              persisted: false,
              message: "La sauvegarde THE PIT n’est pas disponible.",
            };
      } catch {
        acknowledgement = {
          persisted: false,
          message: "L’écriture du résultat THE PIT a échoué.",
        };
      }

      if (
        arcadePersistenceAttemptRef.current !== attempt ||
        pendingArcadeSettlementRef.current?.result.resultId !== settlement.result.resultId
      ) {
        return;
      }
      if (!acknowledgement.persisted) {
        setArcadePersistence({
          status: "failed",
          message: acknowledgement.message,
        });
        return;
      }

      pendingArcadeSettlementRef.current = null;
      arcadeRunRef.current = settlement.nextRun;
      setArcadeRun(settlement.nextRun);
      setArcadePersistence({
        status: "confirmed",
        message: "Résultat Arcade enregistré.",
      });
    };

    void submit();
  }, [onMatchComplete]);

  const retryArcadeSettlement = useCallback(() => {
    const settlement = pendingArcadeSettlementRef.current;
    if (settlement) submitArcadeSettlement(settlement);
  }, [submitArcadeSettlement]);

  const submitCircuitSettlement = useCallback((settlement: PendingPitCircuitSettlement) => {
    pendingCircuitSettlementRef.current = settlement;
    const attempt = circuitPersistenceAttemptRef.current + 1;
    circuitPersistenceAttemptRef.current = attempt;
    setCircuitPersistence({
      status: "pending",
      message: "Enregistrement du résultat du Circuit en cours…",
    });

    const submit = async () => {
      let acknowledgement: PitMatchPersistenceAck;
      try {
        acknowledgement = onMatchComplete
          ? await onMatchComplete(settlement.result, settlement.nextRun)
          : {
              persisted: false,
              message: "La sauvegarde THE PIT n’est pas disponible.",
            };
      } catch {
        acknowledgement = {
          persisted: false,
          message: "L’écriture du résultat THE PIT a échoué.",
        };
      }

      if (
        circuitPersistenceAttemptRef.current !== attempt ||
        pendingCircuitSettlementRef.current?.result.resultId !== settlement.result.resultId
      ) {
        return;
      }
      if (!acknowledgement.persisted) {
        setCircuitPersistence({
          status: "failed",
          message: acknowledgement.message,
        });
        return;
      }

      pendingCircuitSettlementRef.current = null;
      circuitRunRef.current = settlement.nextRun;
      setCircuitRun(settlement.nextRun);
      setCircuitPersistence({
        status: "confirmed",
        message: "Résultat du Circuit enregistré.",
      });
    };

    void submit();
  }, [onMatchComplete]);

  const retryCircuitSettlement = useCallback(() => {
    const settlement = pendingCircuitSettlementRef.current;
    if (settlement) submitCircuitSettlement(settlement);
  }, [submitCircuitSettlement]);

  useEffect(() => () => {
    arcadePersistenceAttemptRef.current += 1;
    pendingArcadeSettlementRef.current = null;
    circuitPersistenceAttemptRef.current += 1;
    pendingCircuitSettlementRef.current = null;
    runTransitionAttemptRef.current += 1;
    pendingRunTransitionRef.current = null;
  }, []);

  const continueArcade = useCallback(() => {
    if (arcadePersistence.status !== "confirmed") return;
    const run = arcadeRunRef.current;
    if (!run || !run.appliedResultIds.includes(matchResultIdRef.current)) return;
    if (run.phase !== "active") {
      returnToSelection();
      return;
    }
    const encounter = PIT_ARCADE_LADDERS[run.fighterId].encounters[run.encounterIndex];
    launchLiveMatch(run.fighterId, encounter.opponentId, encounter.arenaId, "arcade");
  }, [arcadePersistence.status, launchLiveMatch, returnToSelection]);

  const continueCircuit = useCallback(() => {
    if (runTransitionPersistence.status === "failed") {
      retryRunTransition();
      return;
    }
    if (runTransitionPersistence.status === "pending") return;
    if (circuitPersistence.status !== "confirmed") return;
    const run = circuitRunRef.current;
    if (
      !run ||
      !run.appliedResults.some((result) => result.resultId === matchResultIdRef.current)
    ) {
      return;
    }
    if (run.phase !== "active") {
      returnToSelection();
      return;
    }
    launchCircuitSnapshot(run, "circuit-persist");
  }, [
    circuitPersistence.status,
    launchCircuitSnapshot,
    retryRunTransition,
    returnToSelection,
    runTransitionPersistence.status,
  ]);

  const continueDescent = useCallback(() => {
    if (runTransitionPersistence.status !== "confirmed") return;
    const run = descentRunRef.current;
    if (
      !run ||
      !run.appliedResolutionIds.includes(matchResultIdRef.current) ||
      run.phase !== "active"
    ) {
      return;
    }
    recorderRef.current = null;
    replayReaderRef.current = null;
    setPlaybackReplay(null);
    setReplayEnded(false);
    setDescentOptionIndex(0);
    setAnnouncement("CHOISISSEZ LA BRANCHE");
    setAriaAnnouncement(
      "Étage enregistré. Choisissez la prochaine branche de la Descente.",
    );
    descentCombatContextRef.current = null;
    setDescentCombatPresentation(null);
    setDescentResourceFeedback(null);
    changeCombat(null);
  }, [changeCombat, runTransitionPersistence.status]);

  const restartDescent = useCallback(() => {
    const current = descentRunRef.current;
    if (!current || runTransitionPersistence.status === "pending") return;
    const nextSeed = createPitDescentSeed();
    setDescentDraftSeed(nextSeed);
    const freshRun = createPitDescentRun(current.fighterId, nextSeed);
    setDescentOptionIndex(0);
    chooseDescentBranch(freshRun, 0, "descent-replace");
  }, [chooseDescentBranch, runTransitionPersistence.status]);

  const startReplay = useCallback((candidate: PitReplay) => {
    try {
      const replay = normalizePitReplay(candidate);
      if (!replay) throw new Error("invalid replay");
      const reader = createPitReplayReader(replay);
      const next = createPitCombatState(replay.fighters[0], replay.fighters[1], {
        ...replay.rules,
        arenaId: replay.arenaId,
      });
      recorderRef.current = null;
      replayReaderRef.current = reader;
      clearTrainingActivity();
      reportedMatchFrameRef.current = null;
      if (isPitVersusFighterId(replay.fighters[0])) setLeftId(replay.fighters[0]);
      if (isPitVersusFighterId(replay.fighters[1])) setRightId(replay.fighters[1]);
      setArenaId(replay.arenaId);
      arcadeRunRef.current = null;
      setArcadeRun(null);
      circuitRunRef.current = null;
      setCircuitRun(null);
      descentRunRef.current = null;
      setDescentRun(null);
      descentCombatContextRef.current = null;
      setDescentCombatPresentation(null);
      setDescentResourceFeedback(null);
      pendingCircuitSettlementRef.current = null;
      circuitPersistenceAttemptRef.current += 1;
      setCircuitPersistence({ status: "idle", message: "" });
      pendingRunTransitionRef.current = null;
      runTransitionAttemptRef.current += 1;
      setRunTransitionPersistence({ status: "idle", message: "" });
      setPlaybackReplay(replay);
      setReplayEnded(false);
      setReplayNotice("");
      setImpact(null);
      resetLiveInputs();
      setAnnouncement("RELECTURE · COMBAT");
      setAriaAnnouncement("Relecture du dernier duel commencée.");
      changeCombat(next);
    } catch {
      setReplayNotice("Le dernier duel est illisible ou incompatible.");
      setAriaAnnouncement("Impossible de relire le dernier duel.");
    }
  }, [changeCombat, clearTrainingActivity, resetLiveInputs]);

  const startRematch = useCallback(() => {
    const current = combatRef.current;
    if (!current) return;
    const next = rematchPitCombat(current);
    clearTrainingActivity();
    setTrainingNotice("");
    reportedMatchFrameRef.current = null;
    matchResultIdRef.current = createPitResultId();
    setActiveMatchResultId(matchResultIdRef.current);
    replayReaderRef.current = null;
    setPlaybackReplay(null);
    setReplayEnded(false);
    combatGamepadReadyRef.current = [false, false];
    setImpact(null);
    resetLiveInputs();
    beginRecording(next);
    setAnnouncement(next.rules.mode === "training" ? "ENTRAÎNEMENT LIBRE" : "MANCHE 1 · COMBAT");
    setAriaAnnouncement(next.rules.mode === "training" ? "Entraînement libre recommencé." : "Revanche. Manche 1. Combat.");
    changeCombat(next);
  }, [beginRecording, changeCombat, clearTrainingActivity, resetLiveInputs]);

  const setTouchToken = useCallback((slot: 0 | 1, token: string, pressed: boolean) => {
    const entries = touchInputsRef.current[slot];
    if (pressed) entries.add(token);
    else entries.delete(token);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (matchesControlAction("pit.pause", event, controlBindings)) {
        event.preventDefault();
        if (!combatRef.current || combatRef.current.phase === "match-over") onExit();
        else returnToSelection();
        return;
      }
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest("button, input, select, textarea, a[href]")
      ) return;
      if (playbackReplay || !combatRef.current || combatRef.current.phase !== "round") return;
      if (!gameplayKeyCodes.has(event.code)) return;
      event.preventDefault();
      pressedKeysRef.current.add(event.code);
    };
    const onKeyUp = (event: KeyboardEvent) => pressedKeysRef.current.delete(event.code);
    const onBlur = () => pressedKeysRef.current.clear();
    window.addEventListener("keydown", onKeyDown, { passive: false });
    window.addEventListener("keyup", onKeyUp);
    window.addEventListener("blur", onBlur);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("keyup", onKeyUp);
      window.removeEventListener("blur", onBlur);
    };
  }, [controlBindings, gameplayKeyCodes, onExit, playbackReplay, returnToSelection]);

  const viewPhase = combat === null
    ? "selection"
    : combat.phase === "match-over" || replayEnded
      ? "match-over"
      : "combat";


  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (viewPhase !== "match-over") {
        rootRef.current?.focus({ preventScroll: true });
        return;
      }
      if (
        !playbackReplay &&
        (
          (mode === "arcade" &&
            (arcadePersistence.status === "idle" || arcadePersistence.status === "pending")) ||
          (mode === "circuit" &&
            (circuitPersistence.status === "idle" ||
              circuitPersistence.status === "pending" ||
              runTransitionPersistence.status === "pending")) ||
          (mode === "descent" &&
            (runTransitionPersistence.status === "idle" ||
              runTransitionPersistence.status === "pending"))
        )
      ) {
        resultOverlayRef.current?.focus({ preventScroll: true });
        return;
      }
      resultPrimaryRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [arcadePersistence.status, circuitPersistence.status, mode, playbackReplay, runTransitionPersistence.status, viewPhase]);

  useEffect(() => {
    if (viewPhase === "combat") {
      menuGamepadRef.current = { previous: Array.from({ length: 8 }, () => false), ready: false };
      return;
    }
    let requestId = 0;
    const pollMenuGamepad = () => {
      const gamepad = navigator.getGamepads?.().find(Boolean) ?? null;
      const current = gamepad
        ? [
            Boolean(gamepad.buttons[14]?.pressed) || (gamepad.axes[0] ?? 0) < -0.65,
            Boolean(gamepad.buttons[15]?.pressed) || (gamepad.axes[0] ?? 0) > 0.65,
            Boolean(gamepad.buttons[12]?.pressed) || (gamepad.axes[1] ?? 0) < -0.65,
            Boolean(gamepad.buttons[13]?.pressed) || (gamepad.axes[1] ?? 0) > 0.65,
            Boolean(gamepad.buttons[0]?.pressed),
            Boolean(gamepad.buttons[1]?.pressed),
            Boolean(gamepad.buttons[2]?.pressed),
            Boolean(gamepad.buttons[3]?.pressed),
          ]
        : Array.from({ length: 8 }, () => false);
      const state = menuGamepadRef.current;
      if (!gamepad) {
        state.ready = false;
      } else if (!state.ready) {
        state.ready = current.every((pressed) => !pressed);
      } else {
        const previous = state.previous;
        if (viewPhase === "selection") {
          const menuDescentRun =
            descentRunRef.current?.fighterId === leftId
              ? descentRunRef.current
              : (isPitFirstEditionFighterId(leftId) ? savedDescentRuns[leftId] : null) ?? null;
          const canChooseDescentBranch =
            mode === "descent" &&
            menuDescentRun?.phase === "active" &&
            !menuDescentRun.selectedNodeId;
          if (
            !runTransitionSelectionLocked &&
            ((current[0] && !previous[0]) || (current[2] && !previous[2]))
          ) {
            if (canChooseDescentBranch) {
              setDescentOptionIndex((selected) => Math.max(0, selected - 1));
            } else {
              changePitMode(cyclePitMode(mode, -1, leftId));
            }
          }
          if (
            !runTransitionSelectionLocked &&
            ((current[1] && !previous[1]) || (current[3] && !previous[3]))
          ) {
            if (canChooseDescentBranch && menuDescentRun) {
              const optionCount = createPitDescentPlan(
                menuDescentRun.fighterId,
                menuDescentRun.seed,
              ).floors[menuDescentRun.completedFloors]?.options.length ?? 1;
              setDescentOptionIndex((selected) => Math.min(optionCount - 1, selected + 1));
            } else {
              changePitMode(cyclePitMode(mode, 1, leftId));
            }
          }
          if (current[4] && !previous[4]) startMatch();
          if (current[5] && !previous[5]) onExit();
          if (
            !runTransitionSelectionLocked &&
            current[6] &&
            !previous[6]
          ) swapSides();
          if (current[7] && !previous[7] && availableReplay) startReplay(availableReplay);
        } else {
          if (current[4] && !previous[4]) {
            if (playbackReplay && availableReplay) startReplay(availableReplay);
            else if (mode === "arcade" && arcadePersistence.status === "failed") {
              retryArcadeSettlement();
            } else if (mode === "arcade") continueArcade();
            else if (mode === "circuit" && runTransitionPersistence.status === "failed") {
              retryRunTransition();
            } else if (mode === "circuit" && runTransitionPersistence.status === "pending") {
              // The next selected fight stays blocked until its durable acknowledgement.
            } else if (mode === "circuit" && circuitPersistence.status === "failed") {
              retryCircuitSettlement();
            } else if (mode === "circuit") continueCircuit();
            else if (mode === "descent" && runTransitionPersistence.status === "failed") {
              retryRunTransition();
            } else if (mode === "descent" && descentRunRef.current?.phase === "active") {
              continueDescent();
            } else if (mode === "descent") restartDescent();
            else startRematch();
          }
          if (current[5] && !previous[5]) onExit();
          if (current[7] && !previous[7] && availableReplay) startReplay(availableReplay);
        }
      }
      state.previous = current;
      requestId = window.requestAnimationFrame(pollMenuGamepad);
    };
    requestId = window.requestAnimationFrame(pollMenuGamepad);
    return () => window.cancelAnimationFrame(requestId);
  }, [arcadePersistence.status, availableReplay, changePitMode, circuitPersistence.status, continueArcade, continueCircuit, continueDescent, leftId, mode, onExit, playbackReplay, restartDescent, retryArcadeSettlement, retryCircuitSettlement, retryRunTransition, runTransitionPersistence.status, runTransitionSelectionLocked, savedDescentRuns, startMatch, startRematch, startReplay, swapSides, viewPhase]);

  const simulationRunning = combat !== null && combat.phase !== "match-over" &&
    (!playbackReplay || !replayEnded);

  useEffect(() => {
    if (!simulationRunning) return;
    let requestId = 0;
    let previousTime = performance.now();
    let accumulator = 0;
    const fixedStep = 1_000 / PIT_TICK_RATE;

    const animate = (now: number) => {
      const elapsed = Math.min(250, Math.max(0, now - previousTime));
      if (mode === "training" && !playbackReplay) {
        const transport = advancePitTrainingClock(trainingClockRef.current, elapsed);
        trainingClockRef.current = transport.clock;
        accumulator = transport.ticks * fixedStep;
      } else {
        accumulator += elapsed;
      }
      previousTime = now;
      let current = combatRef.current;
      let shouldContinue = true;
      while (current && accumulator + 1e-8 >= fixedStep) {
        let inputs: readonly [PitInput, PitInput];
        if (playbackReplay) {
          const replayTick = replayReaderRef.current?.next();
          if (!replayTick || replayTick.done) {
            setReplayEnded(true);
            setAnnouncement("RELECTURE TERMINÉE");
            setAriaAnnouncement("Relecture du dernier duel terminée.");
            shouldContinue = false;
            break;
          }
          inputs = replayTick.value.inputs;
        } else {
          const gamepads = navigator.getGamepads?.() ?? [];
          const keyboardOne = pitInputFromControlCodes(1, pressedKeysRef.current, controlBindings);
          const touchOne = pitInputFromControlCodes(1, touchInputsRef.current[0], controlBindings);
          const firstPadInput = readGamepad(gamepads[0] ?? null);
          if (!combatGamepadReadyRef.current[0] && isNeutralInput(firstPadInput)) {
            combatGamepadReadyRef.current[0] = true;
          }
          let firstInput = mergeInputs(
            mergeInputs(keyboardOne, touchOne),
            combatGamepadReadyRef.current[0] ? firstPadInput : EMPTY_INPUT,
          );
          let secondInput: PitInput;
          if (mode === "cpu" || mode === "arcade" || mode === "circuit" || mode === "descent") {
            secondInput = cpuInput(current);
          } else if (mode === "training") {
            const activity = trainingActivityRef.current;
            if (trainingLessonRef.current) {
              secondInput = resolvePitTrainingLessonInput(trainingLessonRef.current, current);
            } else if (activity === "recording") {
              secondInput = firstInput;
              firstInput = EMPTY_INPUT;
              const recorder = trainingRecorderRef.current;
              if (recorder) {
                try {
                  recorder.append(secondInput);
                  if (recorder.tickCount % 6 === 0 || recorder.tickCount >= PIT_TRAINING_SEQUENCE_MAX_TICKS) {
                    setTrainingRecordedTicks(recorder.tickCount);
                  }
                  if (recorder.tickCount >= PIT_TRAINING_SEQUENCE_MAX_TICKS) {
                    finishTrainingRecording(true);
                  }
                } catch {
                  trainingRecorderRef.current = null;
                  changeTrainingActivity("idle");
                  setTrainingNotice("Enregistrement interrompu. La session reste jouable.");
                  setAriaAnnouncement("Enregistrement du mannequin interrompu.");
                }
              }
            } else if (activity === "playback") {
              const trainingTick = trainingReaderRef.current?.next();
              if (!trainingTick || trainingTick.done) {
                trainingReaderRef.current = null;
                changeTrainingActivity("idle");
                setTrainingNotice("Lecture terminée. Le comportement choisi reprend.");
                setAriaAnnouncement("Lecture de la séquence du mannequin terminée.");
                secondInput = resolvePitTrainingDummyInput(trainingSettingsRef.current, current);
              } else {
                secondInput = trainingTick.value.input;
              }
            } else {
              secondInput = resolvePitTrainingDummyInput(trainingSettingsRef.current, current);
            }
          } else {
            const keyboardTwo = pitInputFromControlCodes(2, pressedKeysRef.current, controlBindings);
            const touchTwo = pitInputFromControlCodes(2, touchInputsRef.current[1], controlBindings);
            const secondPadInput = readGamepad(gamepads[1] ?? null);
            if (!combatGamepadReadyRef.current[1] && isNeutralInput(secondPadInput)) {
              combatGamepadReadyRef.current[1] = true;
            }
            secondInput = mergeInputs(
              mergeInputs(keyboardTwo, touchTwo),
              combatGamepadReadyRef.current[1] ? secondPadInput : EMPTY_INPUT,
            );
          }
          inputs = [firstInput, secondInput];
          if (recorderRef.current) {
            try {
              // Record the fully merged pair before advancing the visible simulation.
              recorderRef.current.append(inputs);
            } catch {
              recorderRef.current = null;
              setReplayNotice("Enregistrement interrompu. Le combat reste jouable.");
              setAriaAnnouncement("Enregistrement du duel interrompu. Le combat continue.");
            }
          }
        }

        const previousCombat = current;
        if (mode === "descent" && descentCombatContextRef.current) {
          const descentFrame = stepPitDescentCombat(
            current,
            inputs,
            descentCombatContextRef.current,
          );
          current = descentFrame.state;
          descentCombatContextRef.current = descentFrame.context;
          setDescentCombatPresentation(descentFrame.presentation);
          const resourceFighterIds = [
            ...new Set(
              current.events.flatMap((event) =>
                event.type === "traque-gain" ? [event.fighterId] : [],
              ),
            ),
          ];
          if (resourceFighterIds.length > 0) {
            setDescentResourceFeedback({
              frame: current.frame,
              durationFrames: descentFrame.presentation.resourceFeedbackFrames,
              fighterIds: resourceFighterIds,
            });
          }
        } else {
          current = playbackReplay
            ? stepPitReplayCombat(current, inputs, playbackReplay.engineVersion)
            : stepPitCombat(current, inputs);
        }
        if (mode === "training" && trainingLessonRef.current) {
          const nextLesson = evaluatePitTrainingLesson(trainingLessonRef.current, previousCombat, current);
          trainingLessonRef.current = nextLesson;
          setTrainingLesson(nextLesson);
          if (nextLesson.status !== "running") {
            trainingClockRef.current = pausePitTrainingClock(trainingClockRef.current, true);
            setTrainingPaused(true);
            setAriaAnnouncement(nextLesson.message);
            accumulator = fixedStep;
          }
        }
        if (current.events.length > 0) {
          const latest = current.events[current.events.length - 1];
          setAnnouncement(eventLabel(latest));
          const essential = [...current.events].reverse().find((event) =>
            event.type === "round-start" || event.type === "round-end" || event.type === "match-end" ||
            event.type === "throw-caught" || event.type === "throw-tech"
          );
          if (essential) setAriaAnnouncement(eventLabel(essential));
          if (latest.type === "hit" || latest.type === "block") {
            const defender = current.fighters.find((fighter) => fighter.definitionId === latest.defenderId);
            const groundY = PIT_ARENAS[current.arenaId].groundY;
            setImpact(defender
              ? { frame: current.frame, x: defender.x, y: groundY - defender.y - 64, blocked: latest.type === "block" }
              : null);
          }
        }
        accumulator -= fixedStep;
        if (current.phase === "match-over") {
          shouldContinue = false;
          accumulator = 0;
          break;
        }
      }
      if (current && current !== combatRef.current) {
        combatRef.current = current;
        setCombat(current);
      }
      if (shouldContinue) requestId = window.requestAnimationFrame(animate);
    };
    requestId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(requestId);
  }, [changeTrainingActivity, controlBindings, finishTrainingRecording, mode, playbackReplay, replayEnded, simulationRunning]);

  useEffect(() => {
    if (!combat || !canvasRef.current) return;
    const camera = advancePitPresentationCamera(cameraRef.current, combat, { reducedMotion: reducedCameraMotion });
    cameraRef.current = camera;
    drawArena(
      canvasRef.current,
      combat,
      camera,
      highContrast,
      reducedGore,
      combat.rules.mode === "training" && trainingSettings.showHitboxes,
      impact,
      equippedArcadeCosmetic?.palette ?? null,
      fighterArt,
      arenaArt,
      reducedCameraMotion,
    );
  }, [arenaArt, combat, equippedArcadeCosmetic, fighterArt, highContrast, impact, reducedCameraMotion, reducedGore, trainingSettings.showHitboxes]);

  useEffect(() => {
    if (!combat || playbackReplay || combat.phase !== "match-over" ||
      reportedMatchFrameRef.current !== null) return;
    const playerId = combat.fighters[0].definitionId;
    reportedMatchFrameRef.current = combat.frame;
    let replay: PitReplay | null = null;
    if (recorderRef.current) {
      try {
        replay = recorderRef.current.finish();
        setRecordedReplay(replay);
      } catch {
        setReplayNotice("Le duel est terminé, mais son replay n’a pas pu être conservé.");
        setAriaAnnouncement("Duel terminé. Son replay n’a pas pu être conservé.");
      }
    }
    recorderRef.current = null;
    if (!isPitFirstEditionFighterId(playerId)) {
      setReplayNotice("Duel de l’extension terminé. Replay consultable et exportable ; statistiques et chroniques de progression non enregistrées pour ce lot.");
      return;
    }

    if (mode === "descent") {
      const currentRun = descentRunRef.current;
      const currentNode = currentRun?.selectedNodeId
        ? createPitDescentPlan(currentRun.fighterId, currentRun.seed)
            .floors[currentRun.completedFloors]?.options.find(
              (node) => node.id === currentRun.selectedNodeId,
            ) ?? null
        : null;
      if (
        !currentRun ||
        !currentNode ||
        (currentNode.kind !== "fight" && currentNode.kind !== "boss")
      ) {
        setReplayNotice("Descente interrompue : branche de combat indisponible.");
        return;
      }
      const playerWon = combat.matchWinnerId === playerId;
      const fighterMaximum = PIT_FIGHTERS[playerId].maxHealth;
      const remainingHealth = playerWon
        ? Math.max(
            1,
            Math.min(
              currentRun.health,
              Math.round(
                (combat.fighters[0].health / fighterMaximum) * PIT_DESCENT_MAX_HEALTH,
              ),
            ),
          )
        : 0;
      let application: ReturnType<typeof applyPitDescentResolution>;
      try {
        application = applyPitDescentResolution(currentRun, {
          id: matchResultIdRef.current,
          nodeId: currentNode.id,
          victory: playerWon,
          remainingHealth,
          roundsWon: Math.max(0, combat.fighters[0].roundsWon - 1),
          roundsLost: Math.max(0, combat.fighters[1].roundsWon - 1),
          roundsDrawn: Math.max(0, combat.round - 1),
        });
      } catch {
        setReplayNotice("Descente interrompue : résultat de combat incompatible.");
        return;
      }
      submitRunTransition({
        transition: {
          id: matchResultIdRef.current,
          kind: "descent-persist",
          run: application.run,
        },
        onPersisted: () => {
          descentRunRef.current = application.run;
          setDescentRun(application.run);
          setAnnouncement(
            application.run.phase === "completed"
              ? "DESCENTE ACCOMPLIE"
              : application.run.phase === "failed"
                ? "DESCENTE INTERROMPUE"
                : "ÉTAGE SCELLÉ",
          );
          setAriaAnnouncement("Résultat de la Descente enregistré.");
        },
      });
      return;
    }

    let playedArcadeIndex: number | undefined;
    let completedArcade = false;
    let playedCircuitIndex: number | undefined;
    let completedCircuit = false;
    let cosmeticRewardIds: readonly string[] | undefined;
    let nextArcadeRun: PitArcadeRun | null = null;
    let nextCircuitRun: PitCircuitRun | null = null;
    if (mode === "arcade") {
      const currentRun = arcadeRunRef.current;
      if (!currentRun) {
        setReplayNotice("Parcours Arcade interrompu : état de run indisponible.");
        return;
      }
      playedArcadeIndex = currentRun.encounterIndex;
      try {
        const application = applyPitArcadeEncounterResult(currentRun, {
          id: matchResultIdRef.current,
          encounterIndex: currentRun.encounterIndex,
          outcome: combat.matchWinnerId === playerId ? "victory" : "defeat",
        });
        nextArcadeRun = application.run;
        completedArcade = application.run.phase === "completed";
        cosmeticRewardIds = application.run.cosmeticRewardIds;
      } catch {
        setReplayNotice("Parcours Arcade interrompu : résultat incompatible.");
        return;
      }
    } else if (mode === "circuit") {
      const currentRun = circuitRunRef.current;
      const currentFight = currentRun
        ? PIT_CLAN_CIRCUITS[currentRun.fighterId].fights[currentRun.fightIndex]
        : null;
      if (!currentRun || !currentFight || currentRun.selectedFightId !== currentFight.id) {
        setReplayNotice("Circuit du clan interrompu : état de run indisponible.");
        return;
      }
      playedCircuitIndex = currentRun.fightIndex;
      try {
        const application = applyPitCircuitFightResult(currentRun, {
          resultId: matchResultIdRef.current,
          fightId: currentFight.id,
          outcome: combat.matchWinnerId === null
            ? "draw"
            : combat.matchWinnerId === playerId
              ? "victory"
              : "defeat",
        });
        const previouslyUnlocked = new Set(currentRun.unlockedPitCosmeticIds);
        nextCircuitRun = application.run;
        completedCircuit = application.run.phase === "completed";
        cosmeticRewardIds = application.run.unlockedPitCosmeticIds.filter(
          (rewardId) => !previouslyUnlocked.has(rewardId),
        );
      } catch {
        setReplayNotice("Circuit du clan interrompu : résultat incompatible.");
        return;
      }
    }

    const matchResult: PitMatchCompleteResult = {
      resultId: matchResultIdRef.current,
      mode,
      winnerId: combat.matchWinnerId,
      leftId: playerId,
      rightId: combat.fighters[1].definitionId,
      arenaId: combat.arenaId,
      round: combat.round,
      leftRoundsWon: combat.fighters[0].roundsWon,
      rightRoundsWon: combat.fighters[1].roundsWon,
      roundsDrawn: Math.max(
        0,
        combat.round - combat.fighters[0].roundsWon - combat.fighters[1].roundsWon,
      ),
      arcadeEncounterIndex: playedArcadeIndex,
      arcadeCompleted: mode === "arcade" ? completedArcade : undefined,
      circuitFightIndex: playedCircuitIndex,
      circuitCompleted: mode === "circuit" ? completedCircuit : undefined,
      cosmeticRewardIds,
      replay,
    };

    if (nextArcadeRun) {
      submitArcadeSettlement({ result: matchResult, nextRun: nextArcadeRun });
      return;
    }
    if (nextCircuitRun) {
      submitCircuitSettlement({ result: matchResult, nextRun: nextCircuitRun });
      return;
    }
    if (onMatchComplete) {
      void Promise.resolve(onMatchComplete(matchResult)).catch(() => {
        setReplayNotice("Le résultat THE PIT n’a pas pu être enregistré.");
      });
    }
  }, [combat, mode, onMatchComplete, playbackReplay, submitArcadeSettlement, submitCircuitSettlement, submitRunTransition]);

  const shortcuts = useMemo(() => ({
    p1: {
      left: firstBinding(controlBindings, "pit.p1MoveLeft"),
      right: firstBinding(controlBindings, "pit.p1MoveRight"),
      down: firstBinding(controlBindings, "pit.p1MoveDown"),
      jump: firstBinding(controlBindings, "pit.p1Jump"),
      light: firstBinding(controlBindings, "pit.p1AttackLight"),
      medium: firstBinding(controlBindings, "pit.p1AttackMedium"),
      heavy: firstBinding(controlBindings, "pit.p1AttackHeavy"),
      technique: firstBinding(controlBindings, "pit.p1AttackTechnique"),
      guardHigh: firstBinding(controlBindings, "pit.p1GuardHigh"),
      guardLow: firstBinding(controlBindings, "pit.p1GuardLow"),
      throw: firstBinding(controlBindings, "pit.p1Throw"),
      resource: firstBinding(controlBindings, "pit.p1Resource"),
    },
    p2: {
      left: firstBinding(controlBindings, "pit.p2MoveLeft"),
      right: firstBinding(controlBindings, "pit.p2MoveRight"),
      down: firstBinding(controlBindings, "pit.p2MoveDown"),
      jump: firstBinding(controlBindings, "pit.p2Jump"),
      light: firstBinding(controlBindings, "pit.p2AttackLight"),
      medium: firstBinding(controlBindings, "pit.p2AttackMedium"),
      heavy: firstBinding(controlBindings, "pit.p2AttackHeavy"),
      technique: firstBinding(controlBindings, "pit.p2AttackTechnique"),
      guardHigh: firstBinding(controlBindings, "pit.p2GuardHigh"),
      guardLow: firstBinding(controlBindings, "pit.p2GuardLow"),
      throw: firstBinding(controlBindings, "pit.p2Throw"),
      resource: firstBinding(controlBindings, "pit.p2Resource"),
    },
    pause: firstBinding(controlBindings, "pit.pause"),
  }), [controlBindings]);

  if (!combat) {
    const progressionId = isPitFirstEditionFighterId(leftId) ? leftId : null;
    const previewLadder = progressionId ? PIT_ARCADE_LADDERS[progressionId] : null;
    const previewEncounter = previewLadder?.encounters[0];
    const previewCircuit = progressionId ? PIT_CLAN_CIRCUITS[progressionId] : null;
    const previewCircuitFight = previewCircuit?.fights[0];
    const previewDescentRun = progressionId ? (descentRun?.fighterId === progressionId ? descentRun : savedDescentRuns[progressionId] ?? null) : null;
    const previewDescentPlan = progressionId ? createPitDescentPlan(progressionId, previewDescentRun?.seed ?? descentDraftSeed) : null;
    const previewDescentFloorIndex = previewDescentRun?.phase === "active" ? Math.min(previewDescentRun.completedFloors,PIT_DESCENT_FLOOR_COUNT-1) : 0;
    const previewDescentFloor = previewDescentPlan?.floors[previewDescentFloorIndex];
    const previewDescentNode = previewDescentFloor?.options.find(node=>node.id===previewDescentRun?.selectedNodeId) ?? previewDescentFloor?.options[Math.max(0,Math.min(descentOptionIndex,previewDescentFloor.options.length-1))];
    const previewRightId: PitFighterId = mode === "arcade" && previewEncounter ? previewEncounter.opponentId : mode === "circuit" && previewCircuitFight ? previewCircuitFight.opponentId : mode === "descent" && previewDescentNode?.opponentId ? previewDescentNode.opponentId : rightId;
    const previewArenaId = mode === "arcade" && previewEncounter ? previewEncounter.arenaId : mode === "circuit" && previewCircuitFight ? previewCircuitFight.arenaId : mode === "descent" && previewDescentNode ? previewDescentNode.arenaId : arenaId;
    const previewArena = PIT_ARENAS[previewArenaId];
    const descentCompletedFloors = previewDescentRun?.completedFloors ?? 0;
    const descentHealth = previewDescentRun?.health ?? PIT_DESCENT_MAX_HEALTH;

    return (
      <section
        ref={rootRef}
        className={["screen", styles.root, highContrast ? styles.highContrast : ""].join(" ")}
        aria-labelledby="pit-title"
        tabIndex={-1}
        data-screen-focus
      >
        <div className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">
          {activeAriaAnnouncement}
        </div>
        <div className={styles.selectionBackdrop} aria-hidden="true"><span /><span /><span /></div>
        <header className={styles.selectionHeader}>
          <div>
            <span className={styles.eyebrow}>PREMIÈRE ÉDITION ET EXTENSIONS · SIMULATION NON CANONIQUE</span>
            <h2 id="pit-title">THE PIT</h2>
            <p>{PIT_VERSUS_FIGHTER_IDS.length} combattants sélectionnables · {PIT_ARENA_IDS.length} arènes jouables · catalogue de production : 100 stages · aucun gain de campagne</p>
            <a className={styles.animationLabLink} href="/pit-lab" target="_blank" rel="noopener noreferrer">Atelier d’animation · atlas et couverture par action ↗</a>
          </div>
          <button type="button" className={styles.exitButton} onClick={onExit}>{exitLabel}</button>
        </header>

        <div className={styles.versusGrid}>
          <FighterCard fighterId={leftId} side="GAUCHE" paletteOverride={equippedArcadeCosmetic?.palette} />
          <div className={styles.versusMark}>
            <span>{mode === "descent" && previewDescentNode && !previewDescentNode.opponentId ? "→" : "VS"}</span>
            <small>{mode === "descent" ? "MANCHE DÉCISIVE" : "PREMIER À 2"}</small>
          </div>
          {mode === "descent" && previewDescentNode && !previewDescentNode.opponentId ? (
            <article className={styles.descentEventCard}>
              <span className={styles.sideLabel}>BRANCHE</span>
              <strong>
                {previewDescentNode.relicId
                  ? PIT_DESCENT_RELICS[previewDescentNode.relicId].name
                  : "Récupération rituelle"}
              </strong>
              <p>
                {previewDescentNode.relicId
                  ? PIT_DESCENT_RELICS[previewDescentNode.relicId].description
                  : "+" + previewDescentNode.recoveryHealth + " santé de Descente"}
              </p>
              <small>Aucun résultat de combat n’est forgé pour cet étage.</small>
            </article>
          ) : (
            <FighterCard fighterId={previewRightId} side="DROITE" />
          )}
        </div>

        <div className={styles.selectionControls}>
          <label>
            <span>Combattant joueur</span>
            <select
              aria-label="Combattant joueur"
              value={leftId}
              disabled={runTransitionSelectionLocked}
              onChange={(event) => {
                const selected = event.target.value as PitVersusFighterId;
                if (!canPitFighterEnterMode(selected, mode)) setMode("cpu");
                setLeftId(selected);
                if (selected === rightId) {
                  setRightId(PIT_VERSUS_FIGHTER_IDS.find((fighterId) => fighterId !== selected) ?? "berserker");
                }
              }}
            >
              {PIT_VERSUS_FIGHTER_IDS.map((fighterId) => (
                <option key={fighterId} value={fighterId}>{PIT_FIGHTERS[fighterId].name}</option>
              ))}
            </select>
          </label>
          <label>
            <span>
              {mode === "arcade"
                ? "Premier adversaire imposé"
                : mode === "circuit"
                  ? "Adversaire du combat 1"
                  : mode === "descent"
                    ? "Branche de l’étage " + (previewDescentFloorIndex + 1)
                    : "Adversaire"}
            </span>
            {mode === "arcade" || mode === "circuit" ? (
              <output>{PIT_FIGHTERS[previewRightId].name}</output>
            ) : mode === "descent" && previewDescentNode ? (
              <output>
                {previewDescentNode.opponentId
                  ? PIT_FIGHTERS[previewDescentNode.opponentId].name
                  : previewDescentNode.relicId
                    ? PIT_DESCENT_RELICS[previewDescentNode.relicId].name
                    : "Récupération +" + previewDescentNode.recoveryHealth}
              </output>
            ) : (
              <select
                aria-label="Adversaire"
                value={rightId}
                disabled={runTransitionSelectionLocked}
                onChange={(event) => setRightId(event.target.value as PitVersusFighterId)}
              >
                {PIT_VERSUS_FIGHTER_IDS.map((fighterId) => (
                  <option key={fighterId} value={fighterId} disabled={fighterId === leftId}>
                    {PIT_FIGHTERS[fighterId].name}
                  </option>
                ))}
              </select>
            )}
          </label>
          <label>
            <span>
              {mode === "arcade" || mode === "circuit" ? "Arène du combat 1" : mode === "descent" ? "Arène de la branche" : "Arène"}
            </span>
            <select
              aria-label="Arène"
              value={previewArenaId}
              disabled={
                runTransitionSelectionLocked ||
                mode === "arcade" ||
                mode === "circuit" ||
                mode === "descent"
              }
              onChange={(event) => setArenaId(event.target.value as PitArenaId)}
            >
              {PIT_ARENA_IDS.map((candidateArenaId) => (
                <option key={candidateArenaId} value={candidateArenaId}>
                  {PIT_ARENAS[candidateArenaId].name}
                </option>
              ))}
            </select>
          </label>
        </div>

        {selectedArcadeCosmetic && <aside className={styles.cosmeticControl} aria-label="Palette cosmétique THE PIT">
          <div>
            <span className={styles.eyebrow}>ARMURE DU JUGEMENT</span>
            <strong>{selectedArcadeCosmetic.label}</strong>
          </div>
          {selectedCosmeticUnlocked ? (
            <label>
              <input
                type="checkbox"
                checked={equippedArcadeCosmetic !== null}
                onChange={(event) =>
                  setEquippedCosmeticId(event.target.checked ? selectedArcadeCosmetic.id : null)
                }
              />
              <span>Équiper la palette pour cette session PIT</span>
            </label>
          ) : (
            <span>Terminez les 8 combats Arcade avec ce chasseur pour la débloquer.</span>
          )}
        </aside>}

        <article
          className={styles.arenaPreview}
          style={{
            "--arena-sky": previewArena.palette.sky,
            "--arena-ground": previewArena.palette.ground,
            "--arena-accent": previewArena.palette.accent,
          } as React.CSSProperties}
        >
          <div>
            <span className={styles.eyebrow}>ARÈNE SÉLECTIONNÉE</span>
            <strong>{previewArena.name}</strong>
            <p>{previewArena.setting}</p>
          </div>
          <ul aria-label="Plans de décor indépendants">
            {PIT_ARENA_BITMAP_PLANES.map((plane) => (
              <li key={plane}>{plane} · {plane === "P0" ? "Panorama" : plane === "P1" ? "Lointain" : plane === "P2" ? "Architecture" : plane === "P3" ? "Accessoires" : plane === "P4" ? "Sol" : "Avant-plan"}</li>
            ))}
          </ul>
        </article>

        <details className={styles.arenaCatalogue}>
          <summary>
            <span><strong>Répertoire des 100 arènes</strong><small>Contrat récupéré des conversations</small></span>
            <span>{PIT_ARENA_CATALOGUE_SUMMARY.playable} jouables · {PIT_ARENA_CATALOGUE_SUMMARY.concept} en conception</span>
          </summary>
          <p className={styles.catalogueTruth}>{PIT_ARENA_CATALOGUE_SUMMARY.playable} arènes disposent de six plans bitmap ; les {PIT_ARENA_CATALOGUE_SUMMARY.concept} autres restent des fiches de production. Les nouveaux terrains proposent un duel sur un seul secteur. Les changements de secteur, ruptures de décor et accessoires interactifs restent à réaliser ; les dangers sont neutralisés.</p>
          <div className={styles.catalogueWaves}>
            {PIT_ARENA_CATALOGUE_WAVES.map((wave) => <section key={wave.id}>
              <h3>{wave.label}<small>{wave.first}–{wave.last} · {wave.count}</small></h3>
              <ol start={wave.first}>
                {PIT_ARENA_CATALOGUE.filter(({ wave: entryWave }) => entryWave === wave.id).map((entry) => <li key={entry.id}>
                  <span>{entry.name}</span>
                  <em data-status={entry.runtimeStatus}>{entry.runtimeStatus === "playable" ? "Jouable · 6 plans bitmap" : "Conception · cible P0–P5"}</em>
                </li>)}
              </ol>
            </section>)}
          </div>
          <p className={styles.catalogueRights}>Les arènes 51–60 sont des études de composition. Elles exigent des visuels originaux du projet et ne copient aucun asset officiel.</p>
        </details>

        <div className={styles.modeGrid} role="radiogroup" aria-label="Mode de combat">
          {([
            ["cpu", "Duel CPU", "Un chasseur contre un rival déterministe."],
            ["local", "Versus local", "Deux joueurs, deux manettes ou clavier partagé."],
            ["training", "Entraînement", "Gel, avance d’un tick, cinq exercices guidés, mannequin et séquences d’entrées."],
            ["arcade", "Arcade individuel", "Huit rencontres propres au combattant, rival puis Warlord."],
            ["circuit", "Circuit du clan", "Cinq chapitres et douze combats jusqu’au Jugement."],
            ["descent", "Descente", "Huit étages à branches, santé persistante, reliques, soins et boss."],
          ] as const).map(([id, label, description]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={mode === id}
              className={[styles.modeCard, mode === id ? styles.modeCardActive : ""].join(" ")}
              disabled={runTransitionSelectionLocked || !canPitFighterEnterMode(leftId, id)}
              onClick={() => changePitMode(id)}
            >
              <strong>{label}</strong><span>{description}</span>
            </button>
          ))}
        </div>

        {isPitExpansionFighterId(leftId) ? <p role="note" data-pit-extension-progress="unavailable">Extension de duel : Arcade, Circuit et Descente indisponibles — chronique personnelle non produite. Les duels ne modifient pas les statistiques de progression.</p> : null}
        {mode === "arcade" && previewLadder ? (
          <aside className={styles.arcadeBrief} aria-label={"Parcours Arcade de " + PIT_FIGHTERS[leftId].name}>
            <div>
              <span className={styles.eyebrow}>PARCOURS INDIVIDUEL · 8 COMBATS · 2 CONTINUES</span>
              <strong>{PIT_FIGHTERS[leftId].name}</strong>
              <p>{previewLadder.intro}</p>
            </div>
            <ol>
              {previewLadder.encounters.map((encounter) => (
                <li key={encounter.id}>
                  <span>{encounter.index}</span>
                  <div>
                    <strong>{PIT_FIGHTERS[encounter.opponentId].name}</strong>
                    <small>{PIT_ARENAS[encounter.arenaId].name}{encounter.kind === "rival" ? " · RIVAL" : encounter.kind === "boss" ? " · BOSS" : ""}</small>
                  </div>
                </li>
              ))}
            </ol>
          </aside>
        ) : mode === "circuit" && previewCircuit ? (
          <aside className={styles.circuitBrief} aria-label={"Circuit du clan de " + PIT_FIGHTERS[leftId].name}>
            <div className={styles.circuitBriefHeader}>
              <span className={styles.eyebrow}>CHRONIQUE · 5 CHAPITRES · 12 COMBATS</span>
              <strong>{PIT_FIGHTERS[leftId].name}</strong>
              <p>Une chronique reconstituée réunit des chasseurs de différentes époques. Le rival garde le combat 11, puis la reconstitution de Warlord attend au combat 12 devant le Tribunal.</p>
              <p>Ce parcours en duels est distinct de l’histoire prévue pour votre chasseur personnel face aux Bad Blood de Cinder. Les choix de voie et l’enquête ne sont pas encore jouables.</p>
            </div>
            <ol className={styles.circuitChapters}>
              {previewCircuit.chapters.map(({ chapter, fights }) => (
                <li key={chapter.id} className={styles.circuitChapter}>
                  <div>
                    <span>CHAPITRE {chapter.index} · {fights.length} DUEL{fights.length > 1 ? "S" : ""}</span>
                    <strong>{chapter.name}</strong>
                    <p>{chapter.objective}</p>
                  </div>
                  <ol className={styles.circuitFightList}>
                    {fights.map((fight) => (
                      <li key={fight.id}>
                        <span>{fight.index}</span>
                        <div>
                          <strong>{PIT_FIGHTERS[fight.opponentId].name}</strong>
                          <small>
                            {PIT_ARENAS[fight.arenaId].name}
                            {fight.kind === "rival" ? " · RIVAL" : fight.kind === "boss" ? " · WARLORD" : ""}
                          </small>
                        </div>
                      </li>
                    ))}
                  </ol>
                  <small className={styles.circuitReward}>Récompense cosmétique PIT à la fin du chapitre</small>
                </li>
              ))}
            </ol>
          </aside>
        ) : mode === "descent" && previewDescentPlan && previewDescentNode ? (
          <aside
            className={styles.descentBrief}
            aria-label={"Descente de " + PIT_FIGHTERS[leftId].name}
          >
            <header className={styles.descentBriefHeader}>
              <div>
                <span className={styles.eyebrow}>SURVIE · 8 ÉTAGES · ROUTES À BRANCHES</span>
                <strong>{PIT_FIGHTERS[leftId].name}</strong>
                <p>
                  {previewDescentRun?.phase === "completed"
                    ? "Descente accomplie. La Bannière du Survivant est enregistrée."
                    : previewDescentRun?.phase === "failed"
                      ? "Route interrompue. Recommencez explicitement pour générer un nouveau tracé."
                      : previewDescentRun
                        ? "Reprise durable à l’étage " + (descentCompletedFloors + 1) + "."
                        : "Nouvelle route déterministe générée au premier départ."}
                </p>
              </div>
              <div className={styles.descentVitals}>
                <span>SANTÉ DE RUN · {descentHealth}/{PIT_DESCENT_MAX_HEALTH}</span>
                <div
                  className={styles.descentHealthTrack}
                  role="progressbar"
                  aria-label="Santé persistante de la Descente"
                  aria-valuemin={0}
                  aria-valuemax={PIT_DESCENT_MAX_HEALTH}
                  aria-valuenow={descentHealth}
                >
                  <i style={{ width: (descentHealth / PIT_DESCENT_MAX_HEALTH) * 100 + "%" }} />
                </div>
                <small>
                  {previewDescentRun?.recoveriesRemaining ?? 2} récupération(s) disponible(s)
                  · seed {previewDescentPlan.seed}
                </small>
              </div>
            </header>

            <ol className={styles.descentFloors}>
              {previewDescentPlan.floors.map((floor) => {
                const floorResolved = floor.index <= descentCompletedFloors;
                const floorCurrent =
                  (previewDescentRun?.phase ?? "active") === "active" &&
                  floor.index === descentCompletedFloors + 1;
                return (
                  <li
                    key={floor.index}
                    className={[
                      styles.descentFloor,
                      floorResolved ? styles.descentFloorResolved : "",
                      floorCurrent ? styles.descentFloorCurrent : "",
                    ].join(" ")}
                    aria-current={floorCurrent ? "step" : undefined}
                  >
                    <div className={styles.descentFloorHeading}>
                      <span>ÉTAGE {floor.index}</span>
                      <strong>{floor.options[0].label}</strong>
                    </div>
                    <div className={styles.descentBranches}>
                      {floor.options.map((node, optionIndex) => {
                        const selected =
                          floorCurrent &&
                          (previewDescentRun?.selectedNodeId === node.id ||
                            (!previewDescentRun?.selectedNodeId &&
                              optionIndex === Math.min(
                                descentOptionIndex,
                                floor.options.length - 1,
                              )));
                        const nodeTitle = node.opponentId
                          ? PIT_FIGHTERS[node.opponentId].name
                          : node.relicId
                            ? PIT_DESCENT_RELICS[node.relicId].name
                            : "Récupération +" + node.recoveryHealth;
                        return (
                          <button
                            key={node.id}
                            type="button"
                            className={[
                              styles.descentBranch,
                              selected ? styles.descentBranchSelected : "",
                            ].join(" ")}
                            disabled={
                              !floorCurrent ||
                              runTransitionSelectionLocked ||
                              Boolean(
                                previewDescentRun?.selectedNodeId &&
                                  previewDescentRun.selectedNodeId !== node.id,
                              )
                            }
                            aria-pressed={selected}
                            onClick={() => chooseDisplayedDescentBranch(optionIndex)}
                          >
                            <span>
                              {previewDescentRun?.selectedNodeId === node.id
                                ? "REPRENDRE"
                                : node.kind === "boss"
                                ? "BOSS"
                                : node.kind === "fight"
                                  ? "DUEL"
                                  : node.kind === "relic"
                                    ? "RELIQUE"
                                    : "SOIN"}
                            </span>
                            <strong>{nodeTitle}</strong>
                            <small>{PIT_ARENAS[node.arenaId].name}</small>
                            {node.modifierIds.map((modifierId) => (
                              <em key={modifierId}>
                                {PIT_DESCENT_MODIFIERS[modifierId].name}
                              </em>
                            ))}
                          </button>
                        );
                      })}
                    </div>
                  </li>
                );
              })}
            </ol>

            <div className={styles.descentContracts}>
              <article>
                <strong>RELIQUES TEMPORAIRES</strong>
                <p>
                  {previewDescentRun?.temporaryRelicIds.length
                    ? previewDescentRun.temporaryRelicIds
                        .map((relicId) => PIT_DESCENT_RELICS[relicId].name)
                        .join(" · ")
                    : "Aucune relique portée sur cette route."}
                </p>
              </article>
              <article>
                <strong>CONTRAT DE LA BRANCHE</strong>
                <p>
                  {previewDescentNode.modifierIds.length
                    ? previewDescentNode.modifierIds
                        .map(
                          (modifierId) =>
                            PIT_DESCENT_MODIFIERS[modifierId].name +
                            " — " +
                            PIT_DESCENT_MODIFIERS[modifierId].description,
                        )
                        .join(" ")
                    : previewDescentNode.relicId
                      ? PIT_DESCENT_RELICS[previewDescentNode.relicId].description
                      : previewDescentNode.kind === "recovery"
                        ? "Le soin est borné à " + PIT_DESCENT_MAX_HEALTH + " et consomme une récupération."
                        : "Aucun modificateur sur ce duel."}
                </p>
              </article>
            </div>
            <p className={styles.descentHonesty}>
              Santé, soins, embranchements, échec et boss sont actifs. Chaque duel utilise une
              manche décisive pour conserver la santé entre les étages ; son replay est désactivé.
              Les six modificateurs et quatre reliques altèrent réellement le duel : mobilité,
              garde, Traque, poussée, visibilité, feedback, protection et camouflage.
              Récompense finale unique : Bannière du Survivant de la Descente.
            </p>
          </aside>
        ) : (
          <button
            type="button"
            className={styles.swapButton}
            disabled={runTransitionSelectionLocked}
            onClick={swapSides}
          >⇄ Permuter les côtés</button>
        )}

        <div className={styles.selectionActions}>
          <button
            type="button"
            className={styles.startButton}
            onClick={
              (mode === "circuit" || mode === "descent") &&
              runTransitionPersistence.status === "failed"
                ? retryRunTransition
                : startMatch
            }
            disabled={runTransitionPersistence.status === "pending"}
            aria-keyshortcuts="Enter Space"
            data-gamepad-shortcut="A"
          >
            <span>
              {mode === "arcade"
                ? "LANCER LE PARCOURS ARCADE"
                : mode === "circuit"
                  ? runTransitionPersistence.status === "failed"
                    ? "RÉESSAYER L’ENREGISTREMENT"
                    : runTransitionPersistence.status === "pending"
                      ? "ENREGISTREMENT DU COMBAT…"
                      : "LANCER LE CIRCUIT DU CLAN"
                  : mode === "descent"
                    ? runTransitionPersistence.status === "failed"
                      ? "RÉESSAYER L’ENREGISTREMENT"
                      : runTransitionPersistence.status === "pending"
                        ? "ENREGISTREMENT DE LA ROUTE…"
                        : previewDescentRun?.phase === "completed" ||
                            previewDescentRun?.phase === "failed"
                          ? "RECOMMENCER LA DESCENTE"
                          : previewDescentRun?.selectedNodeId
                            ? "REPRENDRE LA BRANCHE"
                            : previewDescentRun
                              ? "ENTRER À L’ÉTAGE " + (descentCompletedFloors + 1)
                              : "COMMENCER LA DESCENTE"
                    : "ENTRER DANS L’ARÈNE"}
            </span>
            <small>Clavier : Entrée · Manette : A · Tactile : toucher</small>
          </button>
          {availableReplay ? (
            <button type="button" className={styles.replayButton} onClick={() => startReplay(availableReplay)}>
              REVOIR LE DERNIER DUEL
            </button>
          ) : null}
        </div>
        {(mode === "circuit" || mode === "descent") &&
        runTransitionPersistence.status !== "idle" ? (
          <p
            className={styles.runPersistenceNotice}
            data-status={runTransitionPersistence.status}
            role={runTransitionPersistence.status === "failed" ? "alert" : "status"}
          >
            {runTransitionPersistence.message}
            {runTransitionPersistence.status === "failed"
              ? " La même transition sera réessayée sans créer de doublon."
              : ""}
          </p>
        ) : null}
        {activeReplayNotice ? <p className={styles.replayNotice}>{activeReplayNotice}</p> : null}
        <p className={styles.selectionFootnote}>
          {Object.values(PIT_FIGHTERS).filter((fighter) => getPitCombatBitmapArtDefinition(fighter.id)).length} combattants illustrés, adversaires compris ; animations OpenAI contrôlées selon le chasseur et l’action. Les séquences encore absentes utilisent un repli signalé.<br />
          Simulation isolée : aucun honneur, trophée de campagne ou progression de chasse n’est attribué.<br />
          Une palette équipée reste active jusqu’au retour au vaisseau.
        </p>
      </section>
    );
  }

  const [left, right] = combat.fighters;
  const leftDefinition = PIT_FIGHTERS[left.definitionId];
  const rightDefinition = PIT_FIGHTERS[right.definitionId];
  const arenaDefinition = PIT_ARENAS[combat.arenaId];
  const seconds = Math.ceil(combat.roundFramesRemaining / PIT_TICK_RATE);
  const recentImpact = impact && combat.frame - impact.frame < 8;
  const shake = !reducedCameraMotion && recentImpact ? (combat.frame % 2 === 0 ? 5 : -5) : 0;
  const descentResourceFeedbackActive = Boolean(
    descentResourceFeedback &&
      combat.frame - descentResourceFeedback.frame <
        descentResourceFeedback.durationFrames,
  );
  const leftDescentResourcePulse =
    descentResourceFeedbackActive &&
    Boolean(descentResourceFeedback?.fighterIds.includes(left.definitionId));
  const rightDescentResourcePulse =
    descentResourceFeedbackActive &&
    Boolean(descentResourceFeedback?.fighterIds.includes(right.definitionId));
  const winner = combat.matchWinnerId ? PIT_FIGHTERS[combat.matchWinnerId] : null;
  const terminal = combat.phase === "match-over" || replayEnded;
  const trainingRules = combat.rules.mode === "training";
  const terminalArcadeRun = mode === "arcade" && !playbackReplay ? arcadeRun : null;
  const arcadePlayerWon = combat.matchWinnerId === left.definitionId;
  const arcadeResolutionReady = arcadePersistence.status === "confirmed" && Boolean(
    terminalArcadeRun?.appliedResultIds.includes(activeMatchResultId),
  );
  const arcadePersistenceFailed = arcadePersistence.status === "failed";
  const arcadeLadder = terminalArcadeRun
    ? PIT_ARCADE_LADDERS[terminalArcadeRun.fighterId]
    : null;
  const terminalCircuitRun = mode === "circuit" && !playbackReplay ? circuitRun : null;
  const circuitAppliedResult = terminalCircuitRun?.appliedResults.find(
    (result) => result.resultId === activeMatchResultId,
  ) ?? null;
  const circuitResolutionReady =
    circuitPersistence.status === "confirmed" && circuitAppliedResult !== null;
  const circuitPersistenceFailed = circuitPersistence.status === "failed";
  const circuitRoutePersistencePending =
    mode === "circuit" && runTransitionPersistence.status === "pending";
  const circuitRoutePersistenceFailed =
    mode === "circuit" && runTransitionPersistence.status === "failed";
  const circuitDefinition = terminalCircuitRun
    ? PIT_CLAN_CIRCUITS[terminalCircuitRun.fighterId]
    : null;
  const circuitRewardedChapter = circuitAppliedResult && circuitDefinition
    ? circuitDefinition.chapters.find(
        ({ fights }) => fights[fights.length - 1]?.id === circuitAppliedResult.fightId,
      )?.chapter ?? null
    : null;
  const terminalDescentRun = mode === "descent" && !playbackReplay ? descentRun : null;
  const descentAppliedResolution = terminalDescentRun?.resolutionHistory.find(
    (resolution) => resolution.id === activeMatchResultId,
  ) ?? null;
  const descentResolutionReady =
    runTransitionPersistence.status === "confirmed" && descentAppliedResolution !== null;
  const descentPersistenceFailed = runTransitionPersistence.status === "failed";
  const descentRoutePlan = terminalDescentRun
    ? createPitDescentPlan(terminalDescentRun.fighterId, terminalDescentRun.seed)
    : null;
  const descentCombatNode = descentRoutePlan && terminalDescentRun
    ? descentRoutePlan.floors
        .flatMap((floor) => floor.options)
        .find(
          (node) =>
            node.id ===
            (descentAppliedResolution?.nodeId ?? terminalDescentRun.selectedNodeId),
        ) ?? null
    : null;
  const frameReadouts = trainingRules && trainingSettings.showFrameData
    ? ([getPitTrainingFrameReadout(combat, 0), getPitTrainingFrameReadout(combat, 1)] as const)
    : null;

  return (
    <section
      ref={rootRef}
      className={`screen ${styles.root} ${styles.matchRoot} ${highContrast ? styles.highContrast : ""}`}
      aria-label="Combat THE PIT"
      tabIndex={-1}
      data-screen-focus
    >
      <div className={styles.srOnly} role="status" aria-live="polite" aria-atomic="true">
        {activeAriaAnnouncement}
      </div>
      <header className={styles.matchHeader} inert={terminal}>
        <button type="button" className={styles.utilityButton} aria-expanded={showHelp} onClick={() => setShowHelp((value) => !value)}>
          {showHelp ? "Masquer les commandes" : "Commandes"}
        </button>
        <span>
          {playbackReplay
            ? "RELECTURE"
            : mode === "cpu"
              ? "DUEL CPU"
              : mode === "local"
                ? "VERSUS LOCAL"
                : mode === "arcade"
                  ? "ARCADE INDIVIDUEL"
                  : mode === "circuit"
                    ? "CIRCUIT DU CLAN"
                    : mode === "descent"
                      ? "DESCENTE · SURVIE"
                      : "ENTRAÎNEMENT"}
          {" · "}{arenaDefinition.name}
          {reducedCameraMotion ? " · CAMÉRA FIXE" : ""}
        </span>
        {trainingRules && !playbackReplay ? (
          <button type="button" className={styles.utilityButton} aria-expanded={showTrainingTools} onClick={() => setShowTrainingTools((value) => !value)}>
            {showTrainingTools ? "Masquer le laboratoire" : "Laboratoire"}
          </button>
        ) : null}
        <button type="button" className={styles.utilityButton} onClick={returnToSelection}>Quitter · {shortcuts.pause}</button>
      </header>

      {activeReplayNotice ? <p className={styles.replayNoticeMatch}>{activeReplayNotice}</p> : null}
      {arenaArt?.arenaId === combat.arenaId && !arenaArt.cancelled && (arenaArt.unavailable || arenaArt.failedPaths.size > 0) ? (
        <p className={styles.replayNoticeMatch} role="status" data-pit-arena-warning="unavailable">
          Décor indisponible ou incomplet : certaines images n’ont pas pu être chargées. Le duel peut continuer ; quittez puis relancez l’arène pour réessayer.
        </p>
      ) : null}
      {mode === "descent" && terminalDescentRun ? (
        <aside className={styles.descentMatchStatus} aria-label="État de la Descente">
          <strong>
            ÉTAGE {Math.min(
              PIT_DESCENT_FLOOR_COUNT,
              terminalDescentRun.completedFloors +
                (terminalDescentRun.selectedNodeId ? 1 : 0),
            )}/{PIT_DESCENT_FLOOR_COUNT}
          </strong>
          <span>SANTÉ DE RUN · {terminalDescentRun.health}/{PIT_DESCENT_MAX_HEALTH}</span>
          <span>
            RELIQUES · {terminalDescentRun.temporaryRelicIds.length
              ? terminalDescentRun.temporaryRelicIds
                  .map((relicId) => PIT_DESCENT_RELICS[relicId].name)
                  .join(" · ")
              : "AUCUNE"}
          </span>
          <span>
            MODIFICATEURS · {descentCombatNode?.modifierIds.length
              ? descentCombatNode.modifierIds
                  .map((modifierId) => PIT_DESCENT_MODIFIERS[modifierId].name)
                  .join(" · ")
              : "AUCUN"}
          </span>
        </aside>
      ) : null}
      <div className={styles.hud} inert={terminal}>
        <div className={styles.fighterHud}>
          <div><strong>{leftDefinition.name}</strong><span>{left.phase.toUpperCase()}</span></div>
          <div className={styles.healthTrack} role="progressbar" aria-label={`Vie de ${leftDefinition.name}`} aria-valuemin={0} aria-valuemax={leftDefinition.maxHealth} aria-valuenow={left.health}><i style={{ width: `${left.health / leftDefinition.maxHealth * 100}%` }} /></div>
          <div className={`${styles.resourceRow} ${leftDescentResourcePulse ? styles.descentResourcePulse : ""}`}>
            <span className={left.traque >= PIT_MAX_TRAQUE ? styles.resourceReady : ""}>TRAQUE</span>
            <div className={styles.resourceTrack} role="progressbar" aria-label={`Traque de ${leftDefinition.name}`} aria-valuemin={0} aria-valuemax={PIT_MAX_TRAQUE} aria-valuenow={left.traque}><i style={{ width: `${left.traque / PIT_MAX_TRAQUE * 100}%` }} /></div>
            <span>{left.traque}</span>
          </div>
          <div className={styles.fighterStatuses} aria-label={`États de ${leftDefinition.name}`}>
            {left.survivalInstinctFrames > 0 ? <span>INSTINCT · {Math.ceil(left.survivalInstinctFrames / PIT_TICK_RATE)} s</span> : null}
            {left.cloakPhase !== "inactive" ? <span>CAMO · {left.cloakPhase.toUpperCase()}</span> : left.cloakCooldownFrames > 0 ? <span>CAMO · {Math.ceil(left.cloakCooldownFrames / PIT_TICK_RATE)} s</span> : null}
            {left.ruptureUsedThisRound ? <span>RUPTURE UTILISÉE</span> : null}
            {left.techniqueStatus ? <span>{TECHNIQUE_STATUS_LABELS[left.techniqueStatus.kind]} · {Math.ceil(left.techniqueStatus.framesRemaining / PIT_TICK_RATE)} s</span> : null}
          </div>
          <div className={styles.roundPips} aria-label={`${left.roundsWon} manche gagnée`}><i className={left.roundsWon >= 1 ? styles.won : ""} /><i className={left.roundsWon >= 2 ? styles.won : ""} /></div>
        </div>
        <div className={styles.timer}><small>{trainingRules ? "SESSION LIBRE" : mode === "descent" ? "MANCHE DÉCISIVE" : `MANCHE ${combat.round}`}</small><strong>{trainingRules ? "∞" : String(seconds).padStart(2, "0")}</strong></div>
        <div className={`${styles.fighterHud} ${styles.fighterHudRight}`}>
          <div><strong>{rightDefinition.name}</strong><span>{right.phase.toUpperCase()}</span></div>
          <div className={styles.healthTrack} role="progressbar" aria-label={`Vie de ${rightDefinition.name}`} aria-valuemin={0} aria-valuemax={rightDefinition.maxHealth} aria-valuenow={right.health}><i style={{ width: `${right.health / rightDefinition.maxHealth * 100}%` }} /></div>
          <div className={`${styles.resourceRow} ${rightDescentResourcePulse ? styles.descentResourcePulse : ""}`}>
            <span className={right.traque >= PIT_MAX_TRAQUE ? styles.resourceReady : ""}>TRAQUE</span>
            <div className={styles.resourceTrack} role="progressbar" aria-label={`Traque de ${rightDefinition.name}`} aria-valuemin={0} aria-valuemax={PIT_MAX_TRAQUE} aria-valuenow={right.traque}><i style={{ width: `${right.traque / PIT_MAX_TRAQUE * 100}%` }} /></div>
            <span>{right.traque}</span>
          </div>
          <div className={styles.fighterStatuses} aria-label={`États de ${rightDefinition.name}`}>
            {right.survivalInstinctFrames > 0 ? <span>INSTINCT · {Math.ceil(right.survivalInstinctFrames / PIT_TICK_RATE)} s</span> : null}
            {right.cloakPhase !== "inactive" ? <span>CAMO · {right.cloakPhase.toUpperCase()}</span> : right.cloakCooldownFrames > 0 ? <span>CAMO · {Math.ceil(right.cloakCooldownFrames / PIT_TICK_RATE)} s</span> : null}
            {right.ruptureUsedThisRound ? <span>RUPTURE UTILISÉE</span> : null}
            {right.techniqueStatus ? <span>{TECHNIQUE_STATUS_LABELS[right.techniqueStatus.kind]} · {Math.ceil(right.techniqueStatus.framesRemaining / PIT_TICK_RATE)} s</span> : null}
          </div>
          <div className={styles.roundPips} aria-label={`${right.roundsWon} manche gagnée`}><i className={right.roundsWon >= 1 ? styles.won : ""} /><i className={right.roundsWon >= 2 ? styles.won : ""} /></div>
        </div>
      </div>

      <div className={styles.bitmapArtStatus} aria-label="État des visuels de combat">
        {[left, right].map((fighter) => {
          const status = getPitCombatBitmapFighterArtStatus(fighterArt, fighter, { simulationFrame: combat.frame, combat });
          return <span key={fighter.slot} data-pit-bitmap-slot={fighter.slot}
            data-pit-bitmap-id={fighter.definitionId} data-pit-bitmap-status={status}>
            {PIT_FIGHTERS[fighter.definitionId].name} · {status === "sprite-sheet-animation" ? "animation dessinée · sprite sheet" : status === "sprite-sheet-hold" ? "pose dessinée tenue · action encore sans animation" : status === "static-bitmap" ? "image du chasseur · pose fixe pour cette action" : status === "loading" ? "chargement de l’image" : "image indisponible · repère de combat"}
          </span>;
        })}
        <small>Animation dessinée lorsqu’un clip validé couvre l’action ; pose fixe pour les gestes restants. Le cercle et l’arc restent des aides de lecture du combat.</small>
        {equippedArcadeCosmetic ? <small>La palette de l’Armure du Jugement colore le repère au sol ; les couleurs des PNG d’origine sont conservées.</small> : null}
      </div>
      <div className={styles.throwTechStatus} data-active={combat.pendingThrow !== null}>
        {playbackReplay?.engineVersion === 4
          ? "RELECTURE V4 · règles historiques, sans fenêtre de déchoppe."
          : combat.pendingThrow
            ? <><strong>SAISIE · {combat.pendingThrow.framesRemaining}/{PIT_THROW_TECH_WINDOW_FRAMES} ticks</strong> {combat.pendingThrow.attackerSlot === 1 ? shortcuts.p1.throw : shortcuts.p2.throw} / RT / PROJ. : nouvel appui pour déchopper.</>
            : <>Déchoppe : Projection après la saisie · {PIT_THROW_TECH_WINDOW_FRAMES} ticks / 133 ms · relâchez puis réappuyez.</>}
      </div>
      <div className={styles.arenaShell} style={{ transform: `translateX(${shake}px)` }}
        data-pit-frame={combat.frame} data-pit-throw-remaining={combat.pendingThrow?.framesRemaining ?? 0}
        data-pit-throw-attacker={combat.pendingThrow?.attackerSlot ?? ""}>
        <canvas ref={canvasRef} className={styles.canvas} width={arenaDefinition.width} height={arenaDefinition.height} aria-hidden="true" />
        {mode === "descent" && descentCombatPresentation?.blackMistLongRange ? (
          <div
            className={styles.descentBlackMist}
            style={{ opacity: descentCombatPresentation.blackMistStrength }}
            aria-hidden="true"
          />
        ) : null}
        <div className={styles.announcement} aria-hidden="true">{announcement}</div>
        {left.comboHitsReceived > 1 ? <div className={`${styles.combo} ${styles.comboLeft}`}>{left.comboHitsReceived}<small>COUPS</small></div> : null}
        {right.comboHitsReceived > 1 ? <div className={`${styles.combo} ${styles.comboRight}`}>{right.comboHitsReceived}<small>COUPS</small></div> : null}
        {frameReadouts ? (
          <aside className={styles.frameDataPanel} aria-label="Données d’images en temps réel" aria-live="off">
            {frameReadouts.map((readout) => {
              const definition = readout.fighterSlot === 0 ? leftDefinition : rightDefinition;
              const phase = readout.phaseTotalFrames
                ? `${readout.phaseLabel} ${readout.phaseFrame}/${readout.phaseTotalFrames}`
                : readout.framesRemaining !== null
                  ? `${readout.phaseLabel} · ${readout.framesRemaining} restantes`
                  : readout.phaseLabel;
              return (
                <article key={readout.fighterSlot}>
                  <strong>{definition.name} · F{readout.globalFrame}</strong>
                  <span>{readout.actionLabel ?? "Aucune action"}{readout.actionTotalFrames ? ` · ${readout.actionFrame}/${readout.actionTotalFrames}` : ""}</span>
                  <span>{phase}{readout.connected ? " · CONTACT" : ""}</span>
                </article>
              );
            })}
          </aside>
        ) : null}
        {combat.phase === "round-over" && !replayEnded ? (
          <div className={styles.resultOverlay} role="status" aria-live="assertive">
            <span>MANCHE {combat.round}</span>
            <h3>{combat.lastRoundResult?.reason === "draw" || combat.lastRoundResult?.reason === "double-ko" ? "Égalité" : `${PIT_FIGHTERS[combat.lastRoundResult?.winnerId ?? leftId].name} gagne`}</h3>
            <p>La prochaine manche commence dans {Math.ceil(combat.transitionFramesRemaining / PIT_TICK_RATE)} s</p>
          </div>
        ) : terminal ? (
          <div
            ref={resultOverlayRef}
            className={styles.resultOverlay}
            role="dialog"
            aria-modal="true"
            tabIndex={-1}
            aria-labelledby="pit-result"
            onKeyDown={(event) => {
              if (event.key !== "Tab") return;
              const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
              if (buttons.length === 0) return;
              const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
              event.preventDefault();
              buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length].focus();
            }}
          >
            <span>
              {playbackReplay
                ? "RELECTURE TERMINÉE"
                : mode === "arcade"
                  ? arcadePersistenceFailed
                    ? "SAUVEGARDE ARCADE REQUISE"
                    : arcadeResolutionReady
                      ? terminalArcadeRun?.phase === "completed"
                        ? "PARCOURS ARCADE ACCOMPLI"
                        : terminalArcadeRun?.phase === "failed"
                          ? "PARCOURS ARCADE INTERROMPU"
                          : "ARCADE · " + (terminalArcadeRun?.victories ?? 0) + "/" + PIT_ARCADE_ENCOUNTER_COUNT
                      : "ENREGISTREMENT DU RÉSULTAT"
                  : mode === "circuit"
                    ? circuitPersistenceFailed
                      ? "SAUVEGARDE CIRCUIT REQUISE"
                      : circuitResolutionReady
                        ? terminalCircuitRun?.phase === "completed"
                          ? "CIRCUIT DU CLAN ACCOMPLI"
                          : "CIRCUIT · " + (terminalCircuitRun?.victories ?? 0) + "/" + PIT_CIRCUIT_FIGHT_COUNT
                        : "ENREGISTREMENT DU RÉSULTAT"
                    : mode === "descent"
                      ? descentPersistenceFailed
                        ? "SAUVEGARDE DESCENTE REQUISE"
                        : descentResolutionReady
                          ? terminalDescentRun?.phase === "completed"
                            ? "DESCENTE ACCOMPLIE"
                            : terminalDescentRun?.phase === "failed"
                              ? "DESCENTE INTERROMPUE"
                              : "DESCENTE · " + (terminalDescentRun?.completedFloors ?? 0) + "/" + PIT_DESCENT_FLOOR_COUNT
                          : "ENREGISTREMENT DU RÉSULTAT"
                      : "MATCH TERMINÉ"}
            </span>
            <h3 id="pit-result">
              {playbackReplay
                ? "Archive restituée"
                : mode === "arcade" && arcadePersistenceFailed
                  ? "Résultat non enregistré"
                  : mode === "arcade" && !arcadeResolutionReady
                    ? "Validation du combat"
                    : mode === "arcade" && terminalArcadeRun?.phase === "completed"
                      ? "Jugement accompli"
                      : mode === "arcade" && terminalArcadeRun?.phase === "failed"
                        ? "La fosse se referme"
                        : mode === "circuit" && circuitPersistenceFailed
                          ? "Résultat non enregistré"
                          : mode === "circuit" && !circuitResolutionReady
                            ? "Validation du combat"
                            : mode === "circuit" && terminalCircuitRun?.phase === "completed"
                              ? "Jugement accompli"
                              : mode === "descent" && descentPersistenceFailed
                                ? "Route non enregistrée"
                                : mode === "descent" && !descentResolutionReady
                                  ? "Validation de l’étage"
                                  : mode === "descent" && terminalDescentRun?.phase === "completed"
                                    ? "Survivant de la Descente"
                                    : mode === "descent" && terminalDescentRun?.phase === "failed"
                                      ? "La route se referme"
                                      : winner
                                        ? winner.name + " l’emporte"
                                        : "Égalité"}
            </h3>
            <p>
              {playbackReplay
                ? "A ou Y pour revoir · B pour revenir au vaisseau."
                : mode === "arcade"
                  ? arcadePersistenceFailed
                    ? arcadePersistence.message + " Réessayez avec le même résultat avant de poursuivre ; aucune progression ni récompense n’est annoncée."
                    : !arcadeResolutionReady
                      ? "Le résultat est en cours d’enregistrement. Le parcours reste bloqué jusqu’à confirmation."
                      : terminalArcadeRun?.phase === "completed"
                        ? (arcadeLadder?.ending ?? "Le parcours est scellé.") + " Palette cosmétique PIT débloquée ; équipez-la pour cette session depuis la sélection."
                        : terminalArcadeRun?.phase === "failed"
                          ? "Les deux continues sont épuisés. Le parcours peut être recommencé depuis la sélection."
                          : arcadePlayerWon
                            ? "Victoire enregistrée. Prochain combat : " + ((terminalArcadeRun?.encounterIndex ?? 0) + 1) + "/" + PIT_ARCADE_ENCOUNTER_COUNT + "."
                            : "Défaite enregistrée. " + (terminalArcadeRun?.continuesRemaining ?? 0) + " continue(s) restante(s) pour ce combat."
                  : mode === "circuit"
                    ? circuitRoutePersistenceFailed
                      ? runTransitionPersistence.message + " Réessayez la même sélection avant de poursuivre ; le combat suivant reste non publié."
                      : circuitRoutePersistencePending
                        ? "La sélection du prochain combat est en cours d’enregistrement. Le Circuit reste bloqué jusqu’à l’accusé durable."
                        : circuitPersistenceFailed
                          ? circuitPersistence.message + " Réessayez avec le même résultat avant de poursuivre ; aucune progression ni récompense n’est annoncée."
                          : !circuitResolutionReady
                            ? "Le résultat est en cours d’enregistrement. Le Circuit reste bloqué jusqu’à confirmation."
                        : terminalCircuitRun?.phase === "completed"
                          ? "Warlord est vaincu au douzième combat. Le Jugement et sa récompense cosmétique PIT sont enregistrés."
                          : circuitAppliedResult?.outcome === "victory"
                            ? "Victoire enregistrée. " +
                              (circuitRewardedChapter
                                ? "Chapitre « " + circuitRewardedChapter.name + " » accompli et récompense cosmétique PIT enregistrée. "
                                : "") +
                              "Prochain combat : " + ((terminalCircuitRun?.fightIndex ?? 0) + 1) + "/" + PIT_CIRCUIT_FIGHT_COUNT + "."
                            : circuitAppliedResult?.outcome === "draw"
                              ? "Égalité enregistrée. Le même combat doit être rejoué."
                              : "Défaite enregistrée. Le même combat doit être rejoué."
                    : mode === "descent"
                      ? descentPersistenceFailed
                        ? runTransitionPersistence.message + " Réessayez la même transition avant de poursuivre ; la progression, la santé et la récompense restent non publiées."
                        : !descentResolutionReady
                          ? "Le résultat est en cours d’enregistrement. La route reste bloquée jusqu’à l’accusé durable."
                          : terminalDescentRun?.phase === "completed"
                            ? "Les huit étages et le boss sont scellés. La Bannière du Survivant, récompense finale unique, est enregistrée."
                            : terminalDescentRun?.phase === "failed"
                              ? "La santé de run est épuisée. Recommencez explicitement pour générer une nouvelle route."
                              : "Étage enregistré avec " + (terminalDescentRun?.health ?? 0) + "/" + PIT_DESCENT_MAX_HEALTH + " santé. Choisissez ensuite la prochaine branche."
                      : "A pour la revanche · Y pour revoir · B pour revenir au vaisseau."}
            </p>
            <div className={styles.overlayActions}>
              {playbackReplay && availableReplay ? (
                <button ref={resultPrimaryRef} type="button" className={styles.startButton} onClick={() => startReplay(availableReplay)}>Revoir</button>
              ) : mode === "arcade" ? (
                <button
                  ref={resultPrimaryRef}
                  type="button"
                  className={styles.startButton}
                  disabled={!arcadePersistenceFailed && !arcadeResolutionReady}
                  onClick={arcadePersistenceFailed ? retryArcadeSettlement : continueArcade}
                >
                  {arcadePersistenceFailed
                    ? "RÉESSAYER L’ENREGISTREMENT"
                    : !arcadeResolutionReady
                      ? "Enregistrement…"
                      : terminalArcadeRun?.phase === "active"
                        ? arcadePlayerWon
                          ? "Combat suivant"
                          : "Utiliser un continue"
                        : "Retour à la sélection"}
                </button>
              ) : mode === "circuit" ? (
                <button
                  ref={resultPrimaryRef}
                  type="button"
                  className={styles.startButton}
                  disabled={
                    circuitRoutePersistencePending ||
                    (!circuitRoutePersistenceFailed &&
                      !circuitPersistenceFailed &&
                      !circuitResolutionReady)
                  }
                  onClick={
                    circuitRoutePersistenceFailed
                      ? retryRunTransition
                      : circuitPersistenceFailed
                        ? retryCircuitSettlement
                        : continueCircuit
                  }
                  aria-keyshortcuts="Enter Space"
                  data-gamepad-shortcut="A"
                >
                  {circuitRoutePersistenceFailed
                    ? "RÉESSAYER LA SÉLECTION"
                    : circuitRoutePersistencePending
                      ? "Sélection en cours…"
                      : circuitPersistenceFailed
                        ? "RÉESSAYER L’ENREGISTREMENT"
                        : !circuitResolutionReady
                          ? "Enregistrement…"
                      : terminalCircuitRun?.phase === "active"
                        ? circuitAppliedResult?.outcome === "victory"
                          ? "Combat suivant"
                          : "Rejouer le combat"
                        : "Retour à la sélection"}
                </button>
              ) : mode === "descent" ? (
                <button
                  ref={resultPrimaryRef}
                  type="button"
                  className={styles.startButton}
                  disabled={!descentPersistenceFailed && !descentResolutionReady}
                  onClick={
                    descentPersistenceFailed
                      ? retryRunTransition
                      : terminalDescentRun?.phase === "active"
                        ? continueDescent
                        : restartDescent
                  }
                  aria-keyshortcuts="Enter Space"
                  data-gamepad-shortcut="A"
                >
                  {descentPersistenceFailed
                    ? "RÉESSAYER L’ENREGISTREMENT"
                    : !descentResolutionReady
                      ? "Enregistrement…"
                      : terminalDescentRun?.phase === "active"
                        ? "Choisir la branche suivante"
                        : "Recommencer la Descente"}
                </button>
              ) : (
                <button ref={resultPrimaryRef} type="button" className={styles.startButton} onClick={startRematch}>Revanche</button>
              )}
              {!playbackReplay && mode !== "arcade" && mode !== "circuit" && mode !== "descent" && availableReplay ? (
                <><button type="button" className={styles.replayButton} onClick={() => startReplay(availableReplay)}>Revoir le duel</button>{availableReplay.fighters.some(isPitExpansionFighterId) ? <button type="button" className={styles.replayButton} onClick={downloadAvailableReplay}>Exporter le replay JSON</button> : null}</>
              ) : null}
              <button type="button" className={styles.exitButton} onClick={onExit}>{exitLabel}</button>
            </div>
          </div>
        ) : null}
      </div>

      {touchAvailable && !playbackReplay ? <div className={styles.touchRows} aria-label="Commandes tactiles" inert={terminal}>
        <div className={styles.touchGroup}>
          <TouchButton label="◀" token={controlBindings["pit.p1MoveLeft"][0] ?? "KeyQ"} onChange={(token, pressed) => setTouchToken(0, token, pressed)} />
          <TouchButton label="▼" token={controlBindings["pit.p1MoveDown"][0] ?? "KeyS"} onChange={(token, pressed) => setTouchToken(0, token, pressed)} />
          <TouchButton label="▶" token={controlBindings["pit.p1MoveRight"][0] ?? "KeyD"} onChange={(token, pressed) => setTouchToken(0, token, pressed)} />
          <TouchButton label="SAUT" token={controlBindings["pit.p1Jump"][0] ?? "Space"} onChange={(token, pressed) => setTouchToken(0, token, pressed)} wide />
        </div>
        <div className={styles.touchGroup}>
          <TouchButton label="R" token={controlBindings["pit.p1AttackLight"][0] ?? "KeyJ"} onChange={(token, pressed) => setTouchToken(0, token, pressed)} />
          <TouchButton label="M" token={controlBindings["pit.p1AttackMedium"][0] ?? "KeyK"} onChange={(token, pressed) => setTouchToken(0, token, pressed)} />
          <TouchButton label="L" token={controlBindings["pit.p1AttackHeavy"][0] ?? "KeyL"} onChange={(token, pressed) => setTouchToken(0, token, pressed)} />
          <TouchButton label="TECH." token={controlBindings["pit.p1AttackTechnique"][0] ?? "KeyU"} onChange={(token, pressed) => setTouchToken(0, token, pressed)} />
          <TouchButton label="GARDE ↑" token={controlBindings["pit.p1GuardHigh"][0] ?? "KeyI"} onChange={(token, pressed) => setTouchToken(0, token, pressed)} wide />
          <TouchButton label="GARDE ↓" token={controlBindings["pit.p1GuardLow"][0] ?? "KeyO"} onChange={(token, pressed) => setTouchToken(0, token, pressed)} wide />
          <TouchButton label="PROJ." token={controlBindings["pit.p1Throw"][0] ?? "KeyP"} onChange={(token, pressed) => setTouchToken(0, token, pressed)} wide />
          <TouchButton label="TRAQUE" token={controlBindings["pit.p1Resource"][0] ?? "KeyH"} onChange={(token, pressed) => setTouchToken(0, token, pressed)} wide />
        </div>
        {mode === "local" ? (
          <div className={`${styles.touchGroup} ${styles.touchGroupPlayerTwo}`}>
            <TouchButton label="J2 ◀" token={controlBindings["pit.p2MoveLeft"][0] ?? "Numpad4"} onChange={(token, pressed) => setTouchToken(1, token, pressed)} />
            <TouchButton label="J2 ▼" token={controlBindings["pit.p2MoveDown"][0] ?? "Numpad2"} onChange={(token, pressed) => setTouchToken(1, token, pressed)} />
            <TouchButton label="J2 ▶" token={controlBindings["pit.p2MoveRight"][0] ?? "Numpad6"} onChange={(token, pressed) => setTouchToken(1, token, pressed)} />
            <TouchButton label="J2 SAUT" token={controlBindings["pit.p2Jump"][0] ?? "Numpad8"} onChange={(token, pressed) => setTouchToken(1, token, pressed)} />
            <TouchButton label="J2 R" token={controlBindings["pit.p2AttackLight"][0] ?? "Numpad1"} onChange={(token, pressed) => setTouchToken(1, token, pressed)} />
            <TouchButton label="J2 M" token={controlBindings["pit.p2AttackMedium"][0] ?? "Numpad3"} onChange={(token, pressed) => setTouchToken(1, token, pressed)} />
            <TouchButton label="J2 L" token={controlBindings["pit.p2AttackHeavy"][0] ?? "Numpad5"} onChange={(token, pressed) => setTouchToken(1, token, pressed)} />
            <TouchButton label="J2 TECH." token={controlBindings["pit.p2AttackTechnique"][0] ?? "Numpad7"} onChange={(token, pressed) => setTouchToken(1, token, pressed)} />
            <TouchButton label="J2 GARDE ↑" token={controlBindings["pit.p2GuardHigh"][0] ?? "Numpad9"} onChange={(token, pressed) => setTouchToken(1, token, pressed)} />
            <TouchButton label="J2 GARDE ↓" token={controlBindings["pit.p2GuardLow"][0] ?? "Numpad0"} onChange={(token, pressed) => setTouchToken(1, token, pressed)} />
            <TouchButton label="J2 PROJ." token={controlBindings["pit.p2Throw"][0] ?? "NumpadEnter"} onChange={(token, pressed) => setTouchToken(1, token, pressed)} />
            <TouchButton label="J2 TRAQUE" token={controlBindings["pit.p2Resource"][0] ?? "NumpadSubtract"} onChange={(token, pressed) => setTouchToken(1, token, pressed)} />
          </div>
        ) : null}
      </div> : null}

        {trainingRules && !playbackReplay && showTrainingTools ? (
          <aside className={styles.trainingTools} aria-label="Laboratoire d’entraînement" inert={terminal}>
            <strong>LABORATOIRE · {trainingPaused ? "SIMULATION GELÉE" : "60 TICKS / SECONDE"}</strong>
            <div className={styles.trainingActions}>
              <button type="button" className={styles.trainingButton} onClick={toggleTrainingPause} aria-pressed={trainingPaused}
                disabled={trainingLesson !== null && trainingLesson.status !== "running"}>
                {trainingPaused ? "Reprendre la simulation" : "Geler la simulation"}
              </button>
              <button type="button" className={styles.trainingButton} onClick={advanceTrainingTick}
                disabled={!trainingPaused || (trainingLesson !== null && trainingLesson.status !== "running")}>
                Avancer d’un tick
              </button>
              <span className={styles.trainingRecording}>F{combat.frame} · boutons accessibles avec Tab puis Entrée / Espace.</span>
            </div>
            <details className={styles.trainingLessons} open={trainingLesson !== null}>
              <summary>Exercices guidés · {PIT_TRAINING_LESSONS.length} disponibles</summary>
              <div className={styles.trainingActions}>
                {PIT_TRAINING_LESSONS.map((lesson) => <button key={lesson.id} type="button" className={styles.trainingButton}
                  onClick={() => startTrainingLesson(lesson.id)}>{lesson.label}</button>)}
              </div>
              <p>Mannequin pédagogique : {trainingLesson ? rightDefinition.name : "Jungle Hunter ou City Hunter, selon votre combattant"}. Déchoppe : nouvel appui sur Projection dans les {PIT_THROW_TECH_WINDOW_FRAMES} ticks après la saisie. Au sol : repos, garde ou contre-saisie. Pas pendant une frappe, sa récupération ou un étourdissement par un coup.</p>
              {trainingLesson ? <div role="status" className={styles.lessonStatus} data-status={trainingLesson.status}>
                <strong>{PIT_TRAINING_LESSONS.find((lesson) => lesson.id === trainingLesson.id)?.objective}</strong>
                <p>{trainingLesson.message}</p>
                <span>{trainingLesson.id === "corner-escape"
                  ? `Contrôle retrouvé : ${trainingLesson.progress}/15 ticks`
                  : `Étapes : ${trainingLesson.progress}/${trainingLesson.target}`} · {Math.floor(trainingLesson.elapsedTicks / PIT_TICK_RATE)} s / 30 s</span>
                <div className={styles.trainingActions}>
                  <button type="button" className={styles.trainingButton} onClick={() => startTrainingLesson(trainingLesson.id)}>Recommencer l’exercice</button>
                  <button type="button" className={styles.trainingButton} onClick={resetTraining}>Retour à l’entraînement libre</button>
                </div>
              </div> : null}
            </details>
            <div className={styles.trainingOptions}>
              <label>
                <span>Comportement</span>
                <select
                  aria-label="Comportement du mannequin"
                  value={trainingSettings.dummyBehavior}
                  disabled={trainingActivity !== "idle" || trainingLesson !== null}
                  onChange={(event) => applyTrainingSettings({ dummyBehavior: event.target.value as typeof trainingSettings.dummyBehavior })}
                >
                  {PIT_TRAINING_DUMMY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
              <label><input type="checkbox" checked={trainingSettings.showHitboxes} onChange={(event) => applyTrainingSettings({ showHitboxes: event.target.checked })} /> Hitboxes</label>
              <label><input type="checkbox" checked={trainingSettings.showFrameData} onChange={(event) => applyTrainingSettings({ showFrameData: event.target.checked })} /> Frame data</label>
              <label>
                <span>Lecture</span>
                <select
                  aria-label="Mode de lecture de la séquence"
                  value={trainingSettings.sequencePlayback}
                  disabled={trainingActivity !== "idle"}
                  onChange={(event) => applyTrainingSettings({ sequencePlayback: event.target.value as typeof trainingSettings.sequencePlayback })}
                >
                  {PIT_TRAINING_PLAYBACK_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </label>
            </div>
            <div className={styles.trainingActions}>
              <button type="button" className={styles.trainingButton} onClick={resetTraining}>{PIT_TRAINING_ACTION_LABELS.resetPositions}</button>
              {trainingActivity === "recording" ? (
                <button type="button" className={styles.trainingButton} onClick={() => finishTrainingRecording()}>{PIT_TRAINING_ACTION_LABELS.stopRecording}</button>
              ) : (
                <button type="button" className={styles.trainingButton} onClick={startTrainingRecording} disabled={trainingActivity === "playback" || trainingLesson !== null}>{PIT_TRAINING_ACTION_LABELS.startRecording}</button>
              )}
              {trainingActivity === "playback" ? (
                <button type="button" className={styles.trainingButton} onClick={stopTrainingPlayback}>{PIT_TRAINING_ACTION_LABELS.stopPlayback}</button>
              ) : (
                <button type="button" className={styles.trainingButton} onClick={startTrainingPlayback} disabled={!trainingSequence || trainingActivity === "recording" || trainingLesson !== null}>{PIT_TRAINING_ACTION_LABELS.playSequence}</button>
              )}
            </div>
            <span className={styles.trainingRecording} role="status">
              {trainingActivity === "recording"
                ? "Enregistrement en cours · 12 secondes maximum."
                : trainingNotice || "Réglez le mannequin, puis mesurez ou enregistrez sa réponse."}
            </span>
            {trainingActivity === "recording" ? (
              <span className={styles.trainingRecording} aria-hidden="true">
                {trainingRecordedTicks}/{PIT_TRAINING_SEQUENCE_MAX_TICKS} images
              </span>
            ) : null}
          </aside>
        ) : null}

      {showHelp ? (
        <aside className={styles.helpPanel} inert={terminal}>
          {playbackReplay ? (
            <div>
              <strong>RELECTURE</strong>
              <span>Les commandes de combat, les manettes et le tactile sont désactivés pendant la restitution.</span>
            </div>
          ) : (
            <>
              <div>
                <strong>JOUEUR 1 · PROFIL THE PIT</strong>
                <span>{shortcuts.p1.left}/{shortcuts.p1.right} marcher · {shortcuts.p1.down} accroupi · {shortcuts.p1.jump} saut · {shortcuts.p1.light} rapide</span>
                <span>{shortcuts.p1.medium} moyen · {shortcuts.p1.heavy} lourd · {shortcuts.p1.technique} technique · {shortcuts.p1.guardHigh}/{shortcuts.p1.guardLow} gardes · {shortcuts.p1.throw} projection / déchoppe · {shortcuts.p1.resource} Traque</span>
              </div>
              {mode === "local" ? (
                <div>
                  <strong>JOUEUR 2 · PROFIL THE PIT</strong>
                  <span>{shortcuts.p2.left}/{shortcuts.p2.right} marcher · {shortcuts.p2.down} accroupi · {shortcuts.p2.jump} saut · {shortcuts.p2.light} rapide</span>
                  <span>{shortcuts.p2.medium} moyen · {shortcuts.p2.heavy} lourd · {shortcuts.p2.technique} technique · {shortcuts.p2.guardHigh}/{shortcuts.p2.guardLow} gardes · {shortcuts.p2.throw} projection / déchoppe · {shortcuts.p2.resource} Traque</span>
                </div>
              ) : null}
            </>
          )}
          <div><strong>MANETTE · RETOUR {shortcuts.pause}</strong><span>Stick/D-pad · A saut · X/Y/B/RB attaques · LB/LT gardes · RT projection / déchoppe · Select Traque</span></div>
        </aside>
      ) : null}


    </section>
  );
}
