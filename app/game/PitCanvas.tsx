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
import type { ControlBindings } from "./systems/controlBindings";
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
}

interface PitCanvasProps {
  controlBindings: ControlBindings;
  highContrast: boolean;
  reducedGore: boolean;
  screenShake: boolean;
  onExit: () => void;
  onMatchComplete?: (result: PitMatchCompleteResult) => void;
}

interface ImpactFlash {
  frame: number;
  x: number;
  y: number;
  blocked: boolean;
}

const EMPTY_INPUT: PitInput = Object.freeze({});
const PLAYER_TWO_KEYS = {
  left: "Numpad4",
  right: "Numpad6",
  down: "Numpad2",
  jump: "Numpad0",
  light: "Numpad1",
  medium: "Numpad3",
  heavy: "Numpad5",
  technique: "NumpadDecimal",
  guardHigh: "Numpad7",
  guardLow: "Numpad8",
  throw: "Numpad9",
} as const;

type PitExtraAction = "medium" | "heavy" | "technique" | "guardHigh" | "guardLow" | "throw";
type PitExtraKeys = Readonly<Record<PitExtraAction, string>>;

const PLAYER_ONE_KEY_CANDIDATES: Readonly<Record<PitExtraAction, readonly string[]>> = {
  medium: ["KeyK", "KeyN", "BracketLeft"],
  heavy: ["KeyL", "KeyB", "BracketRight"],
  technique: ["KeyU", "KeyG", "Semicolon"],
  guardHigh: ["KeyI", "KeyT", "Comma"],
  guardLow: ["KeyO", "KeyY", "Period"],
  throw: ["KeyP", "KeyF", "Slash"],
};

const PLAYER_ONE_KEY_FALLBACKS = [
  "KeyA", "KeyW", "KeyX", "KeyR", "KeyC", "KeyV", "KeyH", "KeyM", "KeyE", "KeyJ",
  "Digit5", "Digit6", "Digit7", "Digit8", "Digit9", "Digit0",
  "BracketLeft", "BracketRight", "Semicolon", "Comma", "Period", "Slash",
] as const;

const PLAYER_TWO_CODE_SET = new Set<string>(Object.values(PLAYER_TWO_KEYS));

function createPitResultId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `pit-${crypto.randomUUID()}`;
  }
  return `pit-${Date.now().toString(36)}-${performance.now().toString(36).replace(".", "")}`;
}

function resolvePitExtraKeys(bindings: ControlBindings): PitExtraKeys {
  const occupied = new Set<string>(PLAYER_TWO_CODE_SET);
  for (const [action, codes] of Object.entries(bindings)) {
    if (action.startsWith("hunt.")) codes.forEach((code) => occupied.add(code));
  }
  const resolved = {} as Record<PitExtraAction, string>;
  for (const action of Object.keys(PLAYER_ONE_KEY_CANDIDATES) as PitExtraAction[]) {
    const key = PLAYER_ONE_KEY_CANDIDATES[action].find((candidate) => !occupied.has(candidate));
    const fallback = PLAYER_ONE_KEY_FALLBACKS.find((candidate) => !occupied.has(candidate));
    resolved[action] = key ?? fallback ?? `PitTouch${action}`;
    occupied.add(resolved[action]);
  }
  return resolved;
}

const ACTION_LABELS: Record<PitAttackKind, string> = {
  light: "Lame rapide",
  medium: "Balayage",
  heavy: "Frappe lourde",
  technique: "Technique basse",
};

function hasAnyCode(
  codes: Set<string>,
  bindings: readonly string[],
  blockedCodes?: ReadonlySet<string>,
): boolean {
  return bindings.some((code) => !blockedCodes?.has(code) && codes.has(code));
}

function firstBinding(bindings: ControlBindings, action: keyof ControlBindings): string {
  return compactControlKeyLabel(bindings[action][0] ?? "—");
}

function inputFromKeyboard(
  codes: Set<string>,
  bindings: ControlBindings,
  slot: 0 | 1,
  extraKeys: PitExtraKeys,
  blockedCodes?: ReadonlySet<string>,
): PitInput {
  if (slot === 1) {
    return {
      left: codes.has(PLAYER_TWO_KEYS.left),
      right: codes.has(PLAYER_TWO_KEYS.right),
      down: codes.has(PLAYER_TWO_KEYS.down),
      jump: codes.has(PLAYER_TWO_KEYS.jump),
      guardHigh: codes.has(PLAYER_TWO_KEYS.guardHigh),
      guardLow: codes.has(PLAYER_TWO_KEYS.guardLow),
      attack: codes.has(PLAYER_TWO_KEYS.light)
        ? "light"
        : codes.has(PLAYER_TWO_KEYS.medium)
          ? "medium"
          : codes.has(PLAYER_TWO_KEYS.heavy)
            ? "heavy"
            : codes.has(PLAYER_TWO_KEYS.technique)
              ? "technique"
              : undefined,
      throw: codes.has(PLAYER_TWO_KEYS.throw),
    };
  }
  return {
    left: hasAnyCode(codes, bindings["hunt.moveLeft"], blockedCodes),
    right: hasAnyCode(codes, bindings["hunt.moveRight"], blockedCodes),
    down: hasAnyCode(codes, bindings["hunt.moveDown"], blockedCodes),
    jump: hasAnyCode(codes, bindings["hunt.jump"], blockedCodes),
    guardHigh: codes.has(extraKeys.guardHigh),
    guardLow: codes.has(extraKeys.guardLow),
    attack: hasAnyCode(codes, bindings["hunt.melee"], blockedCodes)
      ? "light"
      : codes.has(extraKeys.medium)
        ? "medium"
        : codes.has(extraKeys.heavy)
          ? "heavy"
          : codes.has(extraKeys.technique)
            ? "technique"
            : undefined,
    throw: codes.has(extraKeys.throw),
  };
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
}: PitCanvasProps) {
  const [mode, setMode] = useState<PitMode>("cpu");
  const [leftId, setLeftId] = useState<PitFighterId>("jungle-hunter");
  const [rightId, setRightId] = useState<PitFighterId>("berserker");
  const [combat, setCombat] = useState<PitCombatState | null>(null);
  const [announcement, setAnnouncement] = useState("CHOISIS LE RITUEL");
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
  const menuGamepadRef = useRef({ previous: Array.from({ length: 7 }, () => false), ready: false });
  const combatGamepadReadyRef = useRef<[boolean, boolean]>([false, false]);
  const reportedMatchFrameRef = useRef<number | null>(null);
  const matchResultIdRef = useRef("");
  const extraKeys = useMemo(() => resolvePitExtraKeys(controlBindings), [controlBindings]);
  const gameplayKeyCodes = useMemo(() => new Set<string>([
    ...controlBindings["hunt.moveLeft"],
    ...controlBindings["hunt.moveRight"],
    ...controlBindings["hunt.moveDown"],
    ...controlBindings["hunt.jump"],
    ...controlBindings["hunt.melee"],
    ...Object.values(extraKeys),
    ...(mode === "local" ? Object.values(PLAYER_TWO_KEYS) : []),
  ]), [controlBindings, extraKeys, mode]);

  const changeCombat = useCallback((next: PitCombatState | null) => {
    combatRef.current = next;
    setCombat(next);
  }, []);

  const startMatch = useCallback(() => {
    const next = createPitCombatState(leftId, rightId, { mode: mode === "training" ? "training" : "match" });
    reportedMatchFrameRef.current = null;
    matchResultIdRef.current = createPitResultId();
    setImpact(null);
    pressedKeysRef.current.clear();
    combatGamepadReadyRef.current = [false, false];
    touchInputsRef.current.forEach((entries) => entries.clear());
    setAnnouncement(mode === "training" ? "ENTRAÎNEMENT LIBRE" : "MANCHE 1 · COMBAT");
    changeCombat(next);
  }, [changeCombat, leftId, mode, rightId]);

  const swapSides = useCallback(() => {
    setLeftId((current) => current === "jungle-hunter" ? "berserker" : "jungle-hunter");
    setRightId((current) => current === "jungle-hunter" ? "berserker" : "jungle-hunter");
  }, []);

  const startRematch = useCallback(() => {
    const current = combatRef.current;
    if (!current) return;
    reportedMatchFrameRef.current = null;
    matchResultIdRef.current = createPitResultId();
    combatGamepadReadyRef.current = [false, false];
    setImpact(null);
    changeCombat(rematchPitCombat(current));
  }, [changeCombat]);

  const setTouchToken = useCallback((slot: 0 | 1, token: string, pressed: boolean) => {
    const entries = touchInputsRef.current[slot];
    if (pressed) entries.add(token);
    else entries.delete(token);
  }, []);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.code === "Escape") {
        event.preventDefault();
        if (!combatRef.current || combatRef.current.phase === "match-over") onExit();
        else changeCombat(null);
        return;
      }
      const target = event.target;
      if (
        target instanceof HTMLElement &&
        target.closest("button, input, select, textarea, a[href]")
      ) return;
      if (!combatRef.current || combatRef.current.phase !== "round") return;
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
  }, [changeCombat, gameplayKeyCodes, onExit]);

  const viewPhase = combat === null
    ? "selection"
    : combat.phase === "match-over"
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
      menuGamepadRef.current = { previous: Array.from({ length: 7 }, () => false), ready: false };
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
          ]
        : Array.from({ length: 7 }, () => false);
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
        } else {
          if (current[4] && !previous[4]) startRematch();
          if (current[5] && !previous[5]) onExit();
        }
      }
      state.previous = current;
      requestId = window.requestAnimationFrame(pollMenuGamepad);
    };
    requestId = window.requestAnimationFrame(pollMenuGamepad);
    return () => window.cancelAnimationFrame(requestId);
  }, [onExit, startMatch, startRematch, swapSides, viewPhase]);

  const simulationRunning = combat !== null && combat.phase !== "match-over";

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
      while (current && accumulator >= fixedStep) {
        const gamepads = navigator.getGamepads?.() ?? [];
        const keyboardOne = inputFromKeyboard(
          pressedKeysRef.current,
          controlBindings,
          0,
          extraKeys,
          mode === "local" ? PLAYER_TWO_CODE_SET : undefined,
        );
        const touchOne = inputFromKeyboard(touchInputsRef.current[0], controlBindings, 0, extraKeys);
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
          const keyboardTwo = inputFromKeyboard(pressedKeysRef.current, controlBindings, 1, extraKeys);
          const touchTwo = inputFromKeyboard(touchInputsRef.current[1], controlBindings, 1, extraKeys);
          const secondPadInput = readGamepad(gamepads[1] ?? null);
          if (!combatGamepadReadyRef.current[1] && isNeutralInput(secondPadInput)) {
            combatGamepadReadyRef.current[1] = true;
          }
          secondInput = mergeInputs(
            mergeInputs(keyboardTwo, touchTwo),
            combatGamepadReadyRef.current[1] ? secondPadInput : EMPTY_INPUT,
          );
        }
        current = stepPitCombat(current, [firstInput, secondInput]);
        if (current.events.length > 0) {
          const latest = current.events[current.events.length - 1];
          setAnnouncement(eventLabel(latest));
          if (latest.type === "hit" || latest.type === "block") {
            const defender = current.fighters.find((fighter) => fighter.definitionId === latest.defenderId);
            setImpact(defender
              ? { frame: current.frame, x: defender.x, y: PIT_ARENA.groundY - defender.y - 64, blocked: latest.type === "block" }
              : null);
          }
        }
        accumulator -= fixedStep;
      }
      if (current) {
        combatRef.current = current;
        setCombat(current);
      }
      requestId = window.requestAnimationFrame(animate);
    };
    requestId = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(requestId);
  }, [controlBindings, extraKeys, mode, simulationRunning]);

  useEffect(() => {
    if (!combat || !canvasRef.current) return;
    drawArena(canvasRef.current, combat, highContrast, reducedGore, mode === "training" && showHitboxes, impact);
  }, [combat, highContrast, impact, mode, reducedGore, showHitboxes]);

  useEffect(() => {
    if (!combat || combat.phase !== "match-over" || reportedMatchFrameRef.current !== null) return;
    reportedMatchFrameRef.current = combat.frame;
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
    });
  }, [combat, mode, onMatchComplete]);

  const shortcuts = useMemo(() => ({
    left: firstBinding(controlBindings, "hunt.moveLeft"),
    right: firstBinding(controlBindings, "hunt.moveRight"),
    down: firstBinding(controlBindings, "hunt.moveDown"),
    jump: firstBinding(controlBindings, "hunt.jump"),
    light: firstBinding(controlBindings, "hunt.melee"),
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

        <button type="button" className={styles.startButton} onClick={startMatch}>ENTRER DANS LE CERCLE</button>
        <p className={styles.selectionFootnote}>
          Simulation isolée : aucun honneur, trophée ou progression n’est attribué.<br />
          Manette : croix directionnelle pour le mode · A démarrer · X permuter · B revenir.
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

  return (
    <section
      ref={rootRef}
      className={`screen ${styles.root} ${styles.matchRoot} ${highContrast ? styles.highContrast : ""}`}
      aria-label="Combat THE PIT"
      tabIndex={-1}
      data-screen-focus
    >
      <header className={styles.matchHeader} inert={combat.phase === "match-over"}>
        <button type="button" className={styles.utilityButton} onClick={() => setShowHelp((value) => !value)}>Commandes</button>
        <span>{mode === "cpu" ? "DUEL CPU" : mode === "local" ? "VERSUS LOCAL" : "ENTRAÎNEMENT"}</span>
        <button type="button" className={styles.utilityButton} onClick={() => changeCombat(null)}>Quitter · Échap</button>
      </header>

      <div className={styles.hud} inert={combat.phase === "match-over"}>
        <div className={styles.fighterHud}>
          <div><strong>{leftDefinition.name}</strong><span>{left.phase.toUpperCase()}</span></div>
          <div className={styles.healthTrack} role="progressbar" aria-label={`Vie de ${leftDefinition.name}`} aria-valuemin={0} aria-valuemax={leftDefinition.maxHealth} aria-valuenow={left.health}><i style={{ width: `${left.health / leftDefinition.maxHealth * 100}%` }} /></div>
          <div className={styles.roundPips} aria-label={`${left.roundsWon} manche gagnée`}><i className={left.roundsWon >= 1 ? styles.won : ""} /><i className={left.roundsWon >= 2 ? styles.won : ""} /></div>
        </div>
        <div className={styles.timer}><small>{mode === "training" ? "SESSION LIBRE" : `MANCHE ${combat.round}`}</small><strong>{mode === "training" ? "∞" : String(seconds).padStart(2, "0")}</strong></div>
        <div className={`${styles.fighterHud} ${styles.fighterHudRight}`}>
          <div><strong>{rightDefinition.name}</strong><span>{right.phase.toUpperCase()}</span></div>
          <div className={styles.healthTrack} role="progressbar" aria-label={`Vie de ${rightDefinition.name}`} aria-valuemin={0} aria-valuemax={rightDefinition.maxHealth} aria-valuenow={right.health}><i style={{ width: `${right.health / rightDefinition.maxHealth * 100}%` }} /></div>
          <div className={styles.roundPips} aria-label={`${right.roundsWon} manche gagnée`}><i className={right.roundsWon >= 1 ? styles.won : ""} /><i className={right.roundsWon >= 2 ? styles.won : ""} /></div>
        </div>
      </div>

      <div className={styles.arenaShell} style={{ transform: `translateX(${shake}px)` }}>
        <canvas ref={canvasRef} className={styles.canvas} width={PIT_ARENA.width} height={PIT_ARENA.height} aria-hidden="true" />
        <div className={styles.announcement} role="status" aria-live="polite">{announcement}</div>
        {left.comboHitsReceived > 1 ? <div className={`${styles.combo} ${styles.comboLeft}`}>{left.comboHitsReceived}<small>COUPS</small></div> : null}
        {right.comboHitsReceived > 1 ? <div className={`${styles.combo} ${styles.comboRight}`}>{right.comboHitsReceived}<small>COUPS</small></div> : null}
        {mode === "training" ? (
          <label className={styles.hitboxToggle} inert={combat.phase === "match-over"}>
            <input type="checkbox" checked={showHitboxes} onChange={(event) => setShowHitboxes(event.target.checked)} />
            Hitboxes
          </label>
        ) : null}
        {combat.phase === "round-over" ? (
          <div className={styles.resultOverlay} role="status" aria-live="assertive">
            <span>MANCHE {combat.round}</span>
            <h3>{combat.lastRoundResult?.reason === "draw" || combat.lastRoundResult?.reason === "double-ko" ? "Égalité" : `${PIT_FIGHTERS[combat.lastRoundResult?.winnerId ?? leftId].name} gagne`}</h3>
            <p>La prochaine manche commence dans {Math.ceil(combat.transitionFramesRemaining / PIT_TICK_RATE)} s</p>
          </div>
        ) : combat.phase === "match-over" ? (
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
            <span>MATCH TERMINÉ</span>
            <h3 id="pit-result">{winner ? `${winner.name} l’emporte` : "Égalité"}</h3>
            <p>Manette : A pour la revanche · B pour revenir au vaisseau.</p>
            <div className={styles.overlayActions}>
              <button ref={resultPrimaryRef} type="button" className={styles.startButton} onClick={startRematch}>Revanche</button>
              <button type="button" className={styles.exitButton} onClick={onExit}>Retour au vaisseau</button>
            </div>
          </div>
        ) : null}
      </div>

      {showHelp ? (
        <aside className={styles.helpPanel} inert={combat.phase === "match-over"}>
          <div>
            <strong>JOUEUR 1 · COMMANDES DE CHASSE</strong>
            <span>{shortcuts.left}/{shortcuts.right} marcher · {shortcuts.down} accroupi · {shortcuts.jump} saut · {shortcuts.light} rapide</span>
            <span>{compactControlKeyLabel(extraKeys.medium)} moyen · {compactControlKeyLabel(extraKeys.heavy)} lourd · {compactControlKeyLabel(extraKeys.technique)} bas · {compactControlKeyLabel(extraKeys.guardHigh)}/{compactControlKeyLabel(extraKeys.guardLow)} gardes haute/basse · {compactControlKeyLabel(extraKeys.throw)} projection</span>
          </div>
          {mode === "local" ? <div><strong>JOUEUR 2 · PAVÉ NUMÉRIQUE</strong><span>4/6 marcher · 2 accroupi · 0 saut · 1/3/5/. attaques · 7/8 gardes · 9 projection</span></div> : null}
          <div><strong>MANETTE</strong><span>Stick/D-pad · A saut · X/Y/B/RB attaques · LB/LT gardes · RT projection</span></div>
        </aside>
      ) : null}

      {touchAvailable ? <div className={styles.touchRows} aria-label="Commandes tactiles" inert={combat.phase === "match-over"}>
        <div className={styles.touchGroup}>
          <TouchButton label="◀" token={controlBindings["hunt.moveLeft"][0] ?? "KeyQ"} onChange={(token, pressed) => setTouchToken(0, token, pressed)} />
          <TouchButton label="▼" token={controlBindings["hunt.moveDown"][0] ?? "KeyS"} onChange={(token, pressed) => setTouchToken(0, token, pressed)} />
          <TouchButton label="▶" token={controlBindings["hunt.moveRight"][0] ?? "KeyD"} onChange={(token, pressed) => setTouchToken(0, token, pressed)} />
          <TouchButton label="SAUT" token={controlBindings["hunt.jump"][0] ?? "Space"} onChange={(token, pressed) => setTouchToken(0, token, pressed)} wide />
        </div>
        <div className={styles.touchGroup}>
          <TouchButton label="R" token={controlBindings["hunt.melee"][0] ?? "KeyJ"} onChange={(token, pressed) => setTouchToken(0, token, pressed)} />
          <TouchButton label="M" token={extraKeys.medium} onChange={(token, pressed) => setTouchToken(0, token, pressed)} />
          <TouchButton label="L" token={extraKeys.heavy} onChange={(token, pressed) => setTouchToken(0, token, pressed)} />
          <TouchButton label="BAS" token={extraKeys.technique} onChange={(token, pressed) => setTouchToken(0, token, pressed)} />
          <TouchButton label="GARDE ↑" token={extraKeys.guardHigh} onChange={(token, pressed) => setTouchToken(0, token, pressed)} wide />
          <TouchButton label="GARDE ↓" token={extraKeys.guardLow} onChange={(token, pressed) => setTouchToken(0, token, pressed)} wide />
          <TouchButton label="PROJ." token={extraKeys.throw} onChange={(token, pressed) => setTouchToken(0, token, pressed)} wide />
        </div>
        {mode === "local" ? (
          <div className={`${styles.touchGroup} ${styles.touchGroupPlayerTwo}`}>
            {Object.entries(PLAYER_TWO_KEYS).map(([label, token]) => (
              <TouchButton key={label} label={`J2 ${label}`} token={token} onChange={(entry, pressed) => setTouchToken(1, entry, pressed)} />
            ))}
          </div>
        ) : null}
      </div> : null}
    </section>
  );
}
