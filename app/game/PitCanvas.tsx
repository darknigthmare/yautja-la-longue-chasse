"use client";

import {
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { compactControlKeyLabel } from "./controlBindingLabels";
import {
  PIT_ARENA,
  PIT_FIGHTERS,
  PIT_TICK_RATE,
  createPitCombatState,
  getPitFighterBoxes,
  rematchPitCombat,
  stepPitCombat,
  type PitAttackKind,
  type PitCombatEvent,
  type PitCombatState,
  type PitFighterId,
  type PitInput,
} from "./systems/pitCombat";
import {
  PIT_CONTROL_ACTION_IDS,
  matchesControlAction,
  pitInputFromControlCodes,
  type ControlActionId,
  type ControlBindings,
} from "./systems/controlBindings";
import {
  createPitReplayReader,
  createPitReplayRecorder,
  normalizePitReplay,
  type PitReplay,
  type PitReplayReader,
  type PitReplayRecorder,
} from "./systems/pitReplay";
import styles from "./PitCanvas.module.css";

type PitMode = "cpu" | "local" | "training";

export interface PitMatchCompleteResult {
  resultId: string;
  mode: PitMode;
  winnerId: PitFighterId | null;
  leftId: PitFighterId;
  rightId: PitFighterId;
  round: number;
  leftRoundsWon: number;
  rightRoundsWon: number;
  roundsDrawn: number;
  replay: PitReplay | null;
}

interface PitCanvasProps {
  controlBindings: ControlBindings;
  highContrast: boolean;
  reducedGore: boolean;
  screenShake: boolean;
  onExit: () => void;
  onMatchComplete?: (result: PitMatchCompleteResult) => void;
  lastReplay?: PitReplay | null;
}

interface ImpactFlash {
  frame: number;
  x: number;
  y: number;
  blocked: boolean;
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

const ACTION_LABELS: Record<PitAttackKind, string> = {
  light: "Lame rapide",
  medium: "Balayage",
  heavy: "Frappe lourde",
  technique: "Technique basse",
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
  };
}

function isNeutralInput(input: PitInput): boolean {
  return !input.left && !input.right && !input.down && !input.jump &&
    !input.guardHigh && !input.guardLow && !input.attack && !input.throw;
}

/** Deterministic state-only rival: no random calls and no player-input access. */
function cpuInput(state: PitCombatState): PitInput {
  const cpu = state.fighters[1];
  const opponent = state.fighters[0];
  if (state.phase !== "round" || cpu.phase !== "idle") return EMPTY_INPUT;
  const signedDistance = opponent.x - cpu.x;
  const distance = Math.abs(signedDistance);
  const beat = state.frame % 180;

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
  if (event.type === "attack-start") return ACTION_LABELS[event.attack].toUpperCase();
  if (event.type === "throw-start") return "SAISIE RITUELLE";
  if (event.type === "hit") return `${event.combo > 1 ? `${event.combo} COUPS · ` : ""}${event.damage} DÉGÂTS`;
  if (event.type === "block") return `GARDE · ${event.damage} DÉGÂTS RÉSIDUELS`;
  if (event.type === "combo-break") return "RUPTURE DE COMBO";
  if (event.type === "match-end") return "MATCH TERMINÉ";
  return event.result.reason === "timeout" ? "TEMPS ÉCOULÉ" : event.result.reason.toUpperCase();
}

function drawArena(
  canvas: HTMLCanvasElement,
  state: PitCombatState,
  highContrast: boolean,
  reducedGore: boolean,
  showHitboxes: boolean,
  impact: ImpactFlash | null,
): void {
  const context = canvas.getContext("2d");
  if (!context) return;
  const { width, height, groundY } = PIT_ARENA;
  context.clearRect(0, 0, width, height);

  const sky = context.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, highContrast ? "#091719" : "#070908");
  sky.addColorStop(0.58, highContrast ? "#15302e" : "#171513");
  sky.addColorStop(1, "#020303");
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);

  // A deterministic basalt circle assembled from original vector forms.
  context.save();
  context.globalAlpha = 0.84;
  for (let i = 0; i < 31; i += 1) {
    const x = 30 + i * 31;
    const ridge = 34 + ((i * 47) % 72);
    context.fillStyle = i % 3 === 0 ? "#19221f" : i % 3 === 1 ? "#101715" : "#24201b";
    context.beginPath();
    context.moveTo(x - 22, groundY);
    context.lineTo(x - 14, groundY - ridge * 0.54);
    context.lineTo(x - 3, groundY - ridge);
    context.lineTo(x + 15, groundY - ridge * 0.66);
    context.lineTo(x + 22, groundY);
    context.closePath();
    context.fill();
  }
  context.restore();

  context.strokeStyle = highContrast ? "rgba(103,255,221,.34)" : "rgba(208,157,76,.22)";
  context.lineWidth = 2;
  for (let ring = 0; ring < 4; ring += 1) {
    context.beginPath();
    context.ellipse(width / 2, groundY + 41, 470 - ring * 64, 75 - ring * 8, 0, Math.PI, Math.PI * 2);
    context.stroke();
  }
  context.fillStyle = "#0b0e0d";
  context.fillRect(0, groundY, width, height - groundY);
  context.strokeStyle = "#6f5735";
  context.lineWidth = 5;
  context.beginPath();
  context.moveTo(0, groundY + 1);
  for (let x = 0; x <= width; x += 24) {
    context.lineTo(x, groundY + ((x * 13) % 7));
  }
  context.stroke();

  for (let i = 0; i < 7; i += 1) {
    const x = 105 + i * 126;
    const flame = 8 + ((state.frame + i * 19) % 14);
    context.fillStyle = "rgba(218,113,44,.18)";
    context.beginPath();
    context.arc(x, groundY + 48, 17 + flame / 3, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "#d17b36";
    context.fillRect(x - 2, groundY + 37 - flame, 4, flame);
  }

  state.fighters.forEach((fighter) => {
    const definition = PIT_FIGHTERS[fighter.definitionId];
    const boxes = getPitFighterBoxes(fighter);
    const body = boxes.pushbox;
    const screenY = groundY - fighter.y;
    const bodyTop = screenY - body.height;
    const primary = highContrast
      ? fighter.slot === 0 ? "#e6d07a" : "#ff6d65"
      : definition.palette.primary;
    const accent = highContrast ? "#eafcff" : definition.palette.accent;
    const lean = fighter.phase === "startup" ? fighter.facing * 6 : fighter.phase === "active" ? fighter.facing * 13 : 0;

    context.save();
    context.translate(fighter.x, bodyTop);
    context.scale(fighter.facing, 1);
    context.fillStyle = "rgba(0,0,0,.45)";
    context.beginPath();
    context.ellipse(0, body.height + fighter.y + 4, definition.bodyWidth * 0.72, 9, 0, 0, Math.PI * 2);
    context.fill();

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
    context.fillStyle = definition.palette.secondary;
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

function FighterCard({ fighterId, side }: { fighterId: PitFighterId; side: "GAUCHE" | "DROITE" }) {
  const fighter = PIT_FIGHTERS[fighterId];
  return (
    <article className={styles.fighterCard} style={{ "--fighter": fighter.palette.primary } as React.CSSProperties}>
      <span className={styles.sideLabel}>{side}</span>
      <div className={styles.maskGlyph} aria-hidden="true"><i /><i /><i /></div>
      <h3>{fighter.name}</h3>
      <p>{fighter.epithet}</p>
      <dl>
        <div><dt>VIE</dt><dd>{fighter.maxHealth}</dd></div>
        <div><dt>PUISSANCE</dt><dd>{Math.round(fighter.power * 100)}</dd></div>
        <div><dt>MOBILITÉ</dt><dd>{Math.round(fighter.walkSpeed * 20)}</dd></div>
      </dl>
    </article>
  );
}

export default function PitCanvas({
  controlBindings,
  highContrast,
  reducedGore,
  screenShake,
  onExit,
  onMatchComplete,
  lastReplay = null,
}: PitCanvasProps) {
  const [mode, setMode] = useState<PitMode>("cpu");
  const [leftId, setLeftId] = useState<PitFighterId>("jungle-hunter");
  const [rightId, setRightId] = useState<PitFighterId>("berserker");
  const [combat, setCombat] = useState<PitCombatState | null>(null);
  const [announcement, setAnnouncement] = useState("CHOISIS LE RITUEL");
  const [ariaAnnouncement, setAriaAnnouncement] = useState("Choisissez le rituel de combat.");
  const [replayNotice, setReplayNotice] = useState("");
  const [recordedReplay, setRecordedReplay] = useState<PitReplay | null>(null);
  const [playbackReplay, setPlaybackReplay] = useState<PitReplay | null>(null);
  const [replayEnded, setReplayEnded] = useState(false);
  const [showHelp, setShowHelp] = useState(true);
  const [showHitboxes, setShowHitboxes] = useState(false);
  const [impact, setImpact] = useState<ImpactFlash | null>(null);
  const [touchAvailable] = useState(() =>
    typeof navigator !== "undefined" &&
      (navigator.maxTouchPoints > 0 || window.matchMedia("(any-pointer: coarse)").matches),
  );
  const combatRef = useRef<PitCombatState | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  const resultPrimaryRef = useRef<HTMLButtonElement>(null);
  const pressedKeysRef = useRef(new Set<string>());
  const touchInputsRef = useRef<[Set<string>, Set<string>]>([new Set(), new Set()]);
  const menuGamepadRef = useRef({ previous: Array.from({ length: 8 }, () => false), ready: false });
  const combatGamepadReadyRef = useRef<[boolean, boolean]>([false, false]);
  const reportedMatchFrameRef = useRef<number | null>(null);
  const matchResultIdRef = useRef("");
  const recorderRef = useRef<PitReplayRecorder | null>(null);
  const replayReaderRef = useRef<PitReplayReader | null>(null);
  const normalizedLastReplay = useMemo(
    () => lastReplay ? normalizePitReplay(lastReplay) : null,
    [lastReplay],
  );
  const availableReplay = recordedReplay ?? normalizedLastReplay;
  const invalidReplayMessage = lastReplay && !normalizedLastReplay
    ? "Le dernier duel enregistré est illisible ou incompatible."
    : "";
  const activeReplayNotice = replayNotice || invalidReplayMessage;
  const activeAriaAnnouncement = invalidReplayMessage || ariaAnnouncement;
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

  const resetLiveInputs = useCallback(() => {
    pressedKeysRef.current.clear();
    combatGamepadReadyRef.current = [false, false];
    touchInputsRef.current.forEach((entries) => entries.clear());
  }, []);

  const beginRecording = useCallback((next: PitCombatState) => {
    try {
      recorderRef.current = createPitReplayRecorder({
        fighters: [next.fighters[0].definitionId, next.fighters[1].definitionId],
        rules: next.rules,
      });
      setReplayNotice("");
    } catch {
      recorderRef.current = null;
      setReplayNotice("Enregistrement du duel indisponible. Le combat continue.");
      setAriaAnnouncement("Enregistrement du duel indisponible. Le combat continue.");
    }
  }, []);

  const startMatch = useCallback(() => {
    const next = createPitCombatState(leftId, rightId, { mode: mode === "training" ? "training" : "match" });
    reportedMatchFrameRef.current = null;
    matchResultIdRef.current = createPitResultId();
    replayReaderRef.current = null;
    setPlaybackReplay(null);
    setReplayEnded(false);
    setImpact(null);
    resetLiveInputs();
    beginRecording(next);
    const message = mode === "training" ? "ENTRAÎNEMENT LIBRE" : "MANCHE 1 · COMBAT";
    setAnnouncement(message);
    setAriaAnnouncement(mode === "training" ? "Entraînement libre commencé." : "Manche 1. Combat.");
    changeCombat(next);
  }, [beginRecording, changeCombat, leftId, mode, resetLiveInputs, rightId]);

  const swapSides = useCallback(() => {
    setLeftId((current) => current === "jungle-hunter" ? "berserker" : "jungle-hunter");
    setRightId((current) => current === "jungle-hunter" ? "berserker" : "jungle-hunter");
  }, []);

  const returnToSelection = useCallback(() => {
    recorderRef.current = null;
    replayReaderRef.current = null;
    setPlaybackReplay(null);
    setReplayEnded(false);
    resetLiveInputs();
    setAnnouncement("CHOISIS LE RITUEL");
    setAriaAnnouncement("Retour à la sélection du rituel.");
    changeCombat(null);
  }, [changeCombat, resetLiveInputs]);

  const startReplay = useCallback((candidate: PitReplay) => {
    try {
      const replay = normalizePitReplay(candidate);
      if (!replay) throw new Error("invalid replay");
      const reader = createPitReplayReader(replay);
      const next = createPitCombatState(replay.fighters[0], replay.fighters[1], replay.rules);
      recorderRef.current = null;
      replayReaderRef.current = reader;
      reportedMatchFrameRef.current = null;
      setLeftId(replay.fighters[0]);
      setRightId(replay.fighters[1]);
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
  }, [changeCombat, resetLiveInputs]);

  const startRematch = useCallback(() => {
    const current = combatRef.current;
    if (!current) return;
    const next = rematchPitCombat(current);
    reportedMatchFrameRef.current = null;
    matchResultIdRef.current = createPitResultId();
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
  }, [beginRecording, changeCombat, resetLiveInputs]);

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
      if (viewPhase === "match-over") resultPrimaryRef.current?.focus({ preventScroll: true });
      else rootRef.current?.focus({ preventScroll: true });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [viewPhase]);

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
          if ((current[0] && !previous[0]) || (current[2] && !previous[2])) {
            setMode((selected) => selected === "cpu" ? "training" : selected === "local" ? "cpu" : "local");
          }
          if ((current[1] && !previous[1]) || (current[3] && !previous[3])) {
            setMode((selected) => selected === "cpu" ? "local" : selected === "local" ? "training" : "cpu");
          }
          if (current[4] && !previous[4]) startMatch();
          if (current[5] && !previous[5]) onExit();
          if (current[6] && !previous[6]) swapSides();
          if (current[7] && !previous[7] && availableReplay) startReplay(availableReplay);
        } else {
          if (current[4] && !previous[4]) {
            if (playbackReplay && availableReplay) startReplay(availableReplay);
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
  }, [availableReplay, onExit, playbackReplay, startMatch, startRematch, startReplay, swapSides, viewPhase]);

  const simulationRunning = combat !== null && combat.phase !== "match-over" &&
    (!playbackReplay || !replayEnded);

  useEffect(() => {
    if (!simulationRunning) return;
    let requestId = 0;
    let previousTime = performance.now();
    let accumulator = 0;
    const fixedStep = 1_000 / PIT_TICK_RATE;

    const animate = (now: number) => {
      accumulator += Math.min(250, Math.max(0, now - previousTime));
      previousTime = now;
      let current = combatRef.current;
      let shouldContinue = true;
      while (current && accumulator >= fixedStep) {
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
          const firstInput = mergeInputs(
            mergeInputs(keyboardOne, touchOne),
            combatGamepadReadyRef.current[0] ? firstPadInput : EMPTY_INPUT,
          );
          let secondInput: PitInput;
          if (mode === "cpu") {
            secondInput = cpuInput(current);
          } else if (mode === "training") {
            secondInput = current.frame % 300 < 150 ? { guardHigh: true } : { guardLow: true };
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

        current = stepPitCombat(current, inputs);
        if (current.events.length > 0) {
          const latest = current.events[current.events.length - 1];
          setAnnouncement(eventLabel(latest));
          const essential = [...current.events].reverse().find((event) =>
            event.type === "round-start" || event.type === "round-end" || event.type === "match-end"
          );
          if (essential) setAriaAnnouncement(eventLabel(essential));
          if (latest.type === "hit" || latest.type === "block") {
            const defender = current.fighters.find((fighter) => fighter.definitionId === latest.defenderId);
            setImpact(defender
              ? { frame: current.frame, x: defender.x, y: PIT_ARENA.groundY - defender.y - 64, blocked: latest.type === "block" }
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
      if (current) {
        combatRef.current = current;
        setCombat(current);
      }
      if (shouldContinue) requestId = window.requestAnimationFrame(animate);
    };
    requestId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(requestId);
  }, [controlBindings, mode, playbackReplay, replayEnded, simulationRunning]);

  useEffect(() => {
    if (!combat || !canvasRef.current) return;
    drawArena(canvasRef.current, combat, highContrast, reducedGore, combat.rules.mode === "training" && showHitboxes, impact);
  }, [combat, highContrast, impact, mode, reducedGore, showHitboxes]);

  useEffect(() => {
    if (!combat || playbackReplay || combat.phase !== "match-over" ||
      reportedMatchFrameRef.current !== null) return;
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
    onMatchComplete?.({
      resultId: matchResultIdRef.current,
      mode,
      winnerId: combat.matchWinnerId,
      leftId: combat.fighters[0].definitionId,
      rightId: combat.fighters[1].definitionId,
      round: combat.round,
      leftRoundsWon: combat.fighters[0].roundsWon,
      rightRoundsWon: combat.fighters[1].roundsWon,
      roundsDrawn: Math.max(
        0,
        combat.round - combat.fighters[0].roundsWon - combat.fighters[1].roundsWon,
      ),
      replay,
    });
  }, [combat, mode, onMatchComplete, playbackReplay]);

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
    },
    pause: firstBinding(controlBindings, "pit.pause"),
  }), [controlBindings]);

  if (!combat) {
    return (
      <section
        ref={rootRef}
        className={`screen ${styles.root} ${highContrast ? styles.highContrast : ""}`}
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
            <span className={styles.eyebrow}>ARCHIVE DE COMBAT · SIMULATION NON CANONIQUE</span>
            <h2 id="pit-title">THE PIT</h2>
            <p>Cercle de basalte · règles fixes · aucun gain de campagne</p>
          </div>
          <button type="button" className={styles.exitButton} onClick={onExit}>Retour au vaisseau</button>
        </header>

        <div className={styles.versusGrid}>
          <FighterCard fighterId={leftId} side="GAUCHE" />
          <div className={styles.versusMark}><span>VS</span><small>PREMIER À 2</small></div>
          <FighterCard fighterId={rightId} side="DROITE" />
        </div>

        <button type="button" className={styles.swapButton} onClick={swapSides}>⇄ Permuter les côtés</button>

        <div className={styles.modeGrid} role="radiogroup" aria-label="Mode de combat">
          {([
            ["cpu", "Duel CPU", "Un chasseur contre un rival déterministe."],
            ["local", "Versus local", "Deux joueurs, deux manettes ou clavier partagé."],
            ["training", "Entraînement", "Adversaire en garde alternée et hitboxes optionnelles."],
          ] as const).map(([id, label, description]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={mode === id}
              className={`${styles.modeCard} ${mode === id ? styles.modeCardActive : ""}`}
              onClick={() => setMode(id)}
            >
              <strong>{label}</strong><span>{description}</span>
            </button>
          ))}
        </div>

        <div className={styles.selectionActions}>
          <button type="button" className={styles.startButton} onClick={startMatch}>ENTRER DANS LE CERCLE</button>
          {availableReplay ? (
            <button type="button" className={styles.replayButton} onClick={() => startReplay(availableReplay)}>
              REVOIR LE DERNIER DUEL
            </button>
          ) : null}
        </div>
        {activeReplayNotice ? <p className={styles.replayNotice}>{activeReplayNotice}</p> : null}
        <p className={styles.selectionFootnote}>
          Simulation isolée : aucun honneur, trophée ou progression n’est attribué.<br />
          Manette : croix directionnelle pour le mode · A démarrer · X permuter · Y dernier duel · B revenir.
        </p>
      </section>
    );
  }

  const [left, right] = combat.fighters;
  const leftDefinition = PIT_FIGHTERS[left.definitionId];
  const rightDefinition = PIT_FIGHTERS[right.definitionId];
  const seconds = Math.ceil(combat.roundFramesRemaining / PIT_TICK_RATE);
  const recentImpact = impact && combat.frame - impact.frame < 8;
  const shake = screenShake && recentImpact ? (combat.frame % 2 === 0 ? 5 : -5) : 0;
  const winner = combat.matchWinnerId ? PIT_FIGHTERS[combat.matchWinnerId] : null;
  const terminal = combat.phase === "match-over" || replayEnded;
  const trainingRules = combat.rules.mode === "training";

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
        <button type="button" className={styles.utilityButton} onClick={() => setShowHelp((value) => !value)}>Commandes</button>
        <span>{playbackReplay ? "RELECTURE" : mode === "cpu" ? "DUEL CPU" : mode === "local" ? "VERSUS LOCAL" : "ENTRAÎNEMENT"}</span>
        <button type="button" className={styles.utilityButton} onClick={returnToSelection}>Quitter · {shortcuts.pause}</button>
      </header>

      {activeReplayNotice ? <p className={styles.replayNoticeMatch}>{activeReplayNotice}</p> : null}
      <div className={styles.hud} inert={terminal}>
        <div className={styles.fighterHud}>
          <div><strong>{leftDefinition.name}</strong><span>{left.phase.toUpperCase()}</span></div>
          <div className={styles.healthTrack} role="progressbar" aria-label={`Vie de ${leftDefinition.name}`} aria-valuemin={0} aria-valuemax={leftDefinition.maxHealth} aria-valuenow={left.health}><i style={{ width: `${left.health / leftDefinition.maxHealth * 100}%` }} /></div>
          <div className={styles.roundPips} aria-label={`${left.roundsWon} manche gagnée`}><i className={left.roundsWon >= 1 ? styles.won : ""} /><i className={left.roundsWon >= 2 ? styles.won : ""} /></div>
        </div>
        <div className={styles.timer}><small>{trainingRules ? "SESSION LIBRE" : `MANCHE ${combat.round}`}</small><strong>{trainingRules ? "∞" : String(seconds).padStart(2, "0")}</strong></div>
        <div className={`${styles.fighterHud} ${styles.fighterHudRight}`}>
          <div><strong>{rightDefinition.name}</strong><span>{right.phase.toUpperCase()}</span></div>
          <div className={styles.healthTrack} role="progressbar" aria-label={`Vie de ${rightDefinition.name}`} aria-valuemin={0} aria-valuemax={rightDefinition.maxHealth} aria-valuenow={right.health}><i style={{ width: `${right.health / rightDefinition.maxHealth * 100}%` }} /></div>
          <div className={styles.roundPips} aria-label={`${right.roundsWon} manche gagnée`}><i className={right.roundsWon >= 1 ? styles.won : ""} /><i className={right.roundsWon >= 2 ? styles.won : ""} /></div>
        </div>
      </div>

      <div className={styles.arenaShell} style={{ transform: `translateX(${shake}px)` }}>
        <canvas ref={canvasRef} className={styles.canvas} width={PIT_ARENA.width} height={PIT_ARENA.height} aria-hidden="true" />
        <div className={styles.announcement} aria-hidden="true">{announcement}</div>
        {left.comboHitsReceived > 1 ? <div className={`${styles.combo} ${styles.comboLeft}`}>{left.comboHitsReceived}<small>COUPS</small></div> : null}
        {right.comboHitsReceived > 1 ? <div className={`${styles.combo} ${styles.comboRight}`}>{right.comboHitsReceived}<small>COUPS</small></div> : null}
        {trainingRules ? (
          <label className={styles.hitboxToggle} inert={terminal}>
            <input type="checkbox" checked={showHitboxes} onChange={(event) => setShowHitboxes(event.target.checked)} />
            Hitboxes
          </label>
        ) : null}
        {combat.phase === "round-over" && !replayEnded ? (
          <div className={styles.resultOverlay} role="status" aria-live="assertive">
            <span>MANCHE {combat.round}</span>
            <h3>{combat.lastRoundResult?.reason === "draw" || combat.lastRoundResult?.reason === "double-ko" ? "Égalité" : `${PIT_FIGHTERS[combat.lastRoundResult?.winnerId ?? leftId].name} gagne`}</h3>
            <p>La prochaine manche commence dans {Math.ceil(combat.transitionFramesRemaining / PIT_TICK_RATE)} s</p>
          </div>
        ) : terminal ? (
          <div
            className={styles.resultOverlay}
            role="dialog"
            aria-modal="true"
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
            <span>{playbackReplay ? "RELECTURE TERMINÉE" : "MATCH TERMINÉ"}</span>
            <h3 id="pit-result">{playbackReplay ? "Archive restituée" : winner ? `${winner.name} l’emporte` : "Égalité"}</h3>
            <p>{playbackReplay ? "A ou Y pour revoir · B pour revenir au vaisseau." : "A pour la revanche · Y pour revoir · B pour revenir au vaisseau."}</p>
            <div className={styles.overlayActions}>
              {playbackReplay && availableReplay ? (
                <button ref={resultPrimaryRef} type="button" className={styles.startButton} onClick={() => startReplay(availableReplay)}>Revoir</button>
              ) : (
                <button ref={resultPrimaryRef} type="button" className={styles.startButton} onClick={startRematch}>Revanche</button>
              )}
              {!playbackReplay && availableReplay ? (
                <button type="button" className={styles.replayButton} onClick={() => startReplay(availableReplay)}>Revoir le duel</button>
              ) : null}
              <button type="button" className={styles.exitButton} onClick={onExit}>Retour au vaisseau</button>
            </div>
          </div>
        ) : null}
      </div>

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
                <span>{shortcuts.p1.medium} moyen · {shortcuts.p1.heavy} lourd · {shortcuts.p1.technique} technique · {shortcuts.p1.guardHigh}/{shortcuts.p1.guardLow} gardes · {shortcuts.p1.throw} projection</span>
              </div>
              {mode === "local" ? (
                <div>
                  <strong>JOUEUR 2 · PROFIL THE PIT</strong>
                  <span>{shortcuts.p2.left}/{shortcuts.p2.right} marcher · {shortcuts.p2.down} accroupi · {shortcuts.p2.jump} saut · {shortcuts.p2.light} rapide</span>
                  <span>{shortcuts.p2.medium} moyen · {shortcuts.p2.heavy} lourd · {shortcuts.p2.technique} technique · {shortcuts.p2.guardHigh}/{shortcuts.p2.guardLow} gardes · {shortcuts.p2.throw} projection</span>
                </div>
              ) : null}
            </>
          )}
          <div><strong>MANETTE · RETOUR {shortcuts.pause}</strong><span>Stick/D-pad · A saut · X/Y/B/RB attaques · LB/LT gardes · RT projection</span></div>
        </aside>
      ) : null}

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
          </div>
        ) : null}
      </div> : null}
    </section>
  );
}
