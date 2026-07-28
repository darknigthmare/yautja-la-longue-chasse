"use client";

/* eslint-disable @next/next/no-img-element */

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import {
  TROPHY_WORKSHOP_ACTIONS,
  TROPHY_WORKSHOP_INPUTS,
  createTrophyWorkshopGame,
  startTrophyWorkshopGame,
  stepTrophyWorkshopGame,
  trophyWorkshopProgress,
  trophyWorkshopReadyRemaining,
  trophyWorkshopResult,
  trophyWorkshopTimingPosition,
  type TrophyWorkshopAction,
  type TrophyWorkshopInput,
  type TrophyWorkshopResult,
  type TrophyWorkshopState,
} from "./systems/trophyWorkshop";

export interface TrophyWorkshopProps {
  action: TrophyWorkshopAction;
  trophyId: string;
  trophyName?: string;
  trophyImageUrl?: string;
  gamepadEnabled?: boolean;
  autoFocus?: boolean;
  onComplete: (result: TrophyWorkshopResult) => void;
  onCancel: () => void;
}

const INPUT_LABELS: Readonly<Record<TrophyWorkshopInput, string>> = {
  left: "Gauche",
  up: "Haut",
  down: "Bas",
  right: "Droite",
  confirm: "Valider",
};

const INPUT_GLYPHS: Readonly<Record<TrophyWorkshopInput, string>> = {
  left: "←",
  up: "↑",
  down: "↓",
  right: "→",
  confirm: "A",
};

const FEEDBACK_LABELS: Readonly<
  Record<TrophyWorkshopState["feedback"], string>
> = {
  ready: "Observe le rythme",
  perfect: "Geste parfait",
  good: "Geste accepté",
  early: "Trop tôt",
  late: "Trop tard",
  wrong: "Mauvais geste",
  missed: "Fenêtre manquée",
};

function keyboardInput(key: string): TrophyWorkshopInput | null {
  switch (key.toLowerCase()) {
    case "arrowleft":
    case "a":
    case "q":
      return "left";
    case "arrowup":
    case "w":
    case "z":
      return "up";
    case "arrowdown":
    case "s":
      return "down";
    case "arrowright":
    case "d":
      return "right";
    case "enter":
    case " ":
    case "e":
      return "confirm";
    default:
      return null;
  }
}

function gamepadInputs(gamepad: Gamepad): Set<TrophyWorkshopInput> {
  const inputs = new Set<TrophyWorkshopInput>();
  if (gamepad.buttons[14]?.pressed || (gamepad.axes[0] ?? 0) < -0.65) {
    inputs.add("left");
  }
  if (gamepad.buttons[12]?.pressed || (gamepad.axes[1] ?? 0) < -0.65) {
    inputs.add("up");
  }
  if (gamepad.buttons[13]?.pressed || (gamepad.axes[1] ?? 0) > 0.65) {
    inputs.add("down");
  }
  if (gamepad.buttons[15]?.pressed || (gamepad.axes[0] ?? 0) > 0.65) {
    inputs.add("right");
  }
  if (gamepad.buttons[0]?.pressed) inputs.add("confirm");
  return inputs;
}

export default function TrophyWorkshop(props: TrophyWorkshopProps) {
  return (
    <TrophyWorkshopSession
      key={`${props.action}:${props.trophyId}`}
      {...props}
    />
  );
}

function TrophyWorkshopSession({
  action,
  trophyId,
  trophyName = "Trophée sans nom",
  trophyImageUrl,
  gamepadEnabled = true,
  autoFocus = true,
  onComplete,
  onCancel,
}: TrophyWorkshopProps) {
  const [game, setGame] = useState(() =>
    createTrophyWorkshopGame(action, trophyId),
  );
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const previousFrameRef = useRef<number | null>(null);
  const previousGamepadInputsRef = useRef(new Set<TrophyWorkshopInput>());
  const completionSentRef = useRef(false);

  const config = TROPHY_WORKSHOP_ACTIONS[action];
  const currentCue = game.sequence[game.cueIndex] ?? null;
  const result = useMemo(() => trophyWorkshopResult(game), [game]);

  const restart = useCallback(() => {
    completionSentRef.current = false;
    previousFrameRef.current = null;
    previousGamepadInputsRef.current.clear();
    setGame(createTrophyWorkshopGame(action, trophyId));
    window.requestAnimationFrame(() => rootRef.current?.focus());
  }, [action, trophyId]);

  const begin = useCallback(() => {
    previousFrameRef.current = null;
    setGame((previous) => startTrophyWorkshopGame(previous));
    window.requestAnimationFrame(() => rootRef.current?.focus());
  }, []);

  const submitInput = useCallback((input: TrophyWorkshopInput) => {
    setGame((previous) => {
      if (previous.phase === "ready") {
        return input === "confirm"
          ? startTrophyWorkshopGame(previous)
          : previous;
      }
      return stepTrophyWorkshopGame(previous, 0, input).state;
    });
  }, []);

  useEffect(() => {
    previouslyFocusedRef.current =
      document.activeElement instanceof HTMLElement
        ? document.activeElement
        : null;

    const backdrop = backdropRef.current;
    const siblings = backdrop?.parentElement
      ? Array.from(backdrop.parentElement.children).filter(
          (node): node is HTMLElement =>
            node instanceof HTMLElement && node !== backdrop,
        )
      : [];
    const previousSiblingState = siblings.map((node) => ({
      node,
      inert: node.hasAttribute("inert"),
      ariaHidden: node.getAttribute("aria-hidden"),
    }));
    for (const sibling of siblings) {
      sibling.setAttribute("inert", "");
      sibling.setAttribute("aria-hidden", "true");
    }

    const frame = window.requestAnimationFrame(() => {
      if (autoFocus) rootRef.current?.focus({ preventScroll: true });
    });
    return () => {
      window.cancelAnimationFrame(frame);
      for (const previous of previousSiblingState) {
        if (!previous.inert) previous.node.removeAttribute("inert");
        if (previous.ariaHidden === null) {
          previous.node.removeAttribute("aria-hidden");
        } else {
          previous.node.setAttribute("aria-hidden", previous.ariaHidden);
        }
      }
      previouslyFocusedRef.current?.focus({ preventScroll: true });
    };
  }, [autoFocus]);

  useEffect(() => {
    if (!result || completionSentRef.current) return;
    completionSentRef.current = true;
    const timeout = window.setTimeout(() => onComplete(result), 520);
    return () => window.clearTimeout(timeout);
  }, [onComplete, result]);

  useEffect(() => {
    let animationFrame = 0;
    const animate = (now: number) => {
      const previousFrame = previousFrameRef.current ?? now;
      previousFrameRef.current = now;
      const deltaSeconds = Math.min(0.1, Math.max(0, (now - previousFrame) / 1000));
      setGame((previous) =>
        stepTrophyWorkshopGame(previous, deltaSeconds).state,
      );

      if (gamepadEnabled && typeof navigator !== "undefined") {
        const gamepad = Array.from(navigator.getGamepads()).find(Boolean);
        if (gamepad) {
          const currentInputs = gamepadInputs(gamepad);
          for (const input of TROPHY_WORKSHOP_INPUTS) {
            if (
              currentInputs.has(input) &&
              !previousGamepadInputsRef.current.has(input)
            ) {
              submitInput(input);
            }
          }
          previousGamepadInputsRef.current = currentInputs;
        }
      }
      animationFrame = window.requestAnimationFrame(animate);
    };
    animationFrame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [gamepadEnabled, submitInput]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === "Tab") {
      const focusable = Array.from(
        rootRef.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      if (focusable.length === 0) {
        event.preventDefault();
        rootRef.current?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (event.shiftKey && (active === first || active === rootRef.current)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (active === last || active === rootRef.current)) {
        event.preventDefault();
        first.focus();
      }
      return;
    }
    if (event.key === "Escape") {
      event.preventDefault();
      onCancel();
      return;
    }
    if (game.status === "failed" && event.key.toLowerCase() === "r") {
      event.preventDefault();
      restart();
      return;
    }
    if (
      event.target instanceof HTMLButtonElement &&
      (event.key === "Enter" || event.key === " ")
    ) {
      return;
    }
    if (game.phase === "ready" && event.key === "Enter") {
      event.preventDefault();
      begin();
      return;
    }
    const input = keyboardInput(event.key);
    if (!input || game.status !== "playing") return;
    event.preventDefault();
    submitInput(input);
  };

  const timingPosition = trophyWorkshopTimingPosition(game);
  const progress = trophyWorkshopProgress(game);
  const maximumMistakes = config.maximumMistakes;
  const readyRemaining = trophyWorkshopReadyRemaining(game);

  return (
    <div
      ref={backdropRef}
      className="trophy-workshop-backdrop"
      style={styles.backdrop}
      role="presentation"
    >
      <div
        ref={rootRef}
        className="trophy-workshop-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="trophy-workshop-title"
        aria-describedby="trophy-workshop-instructions"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        style={styles.panel}
      >
        <header className="trophy-workshop-header" style={styles.header}>
          <div>
            <span style={styles.eyebrow}>ATELIER DU CLAN · {config.label}</span>
            <h2 id="trophy-workshop-title" style={styles.title}>
              {config.title}
            </h2>
            <p style={styles.trophyName}>{trophyName}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            className="trophy-workshop-cancel"
            style={styles.cancelButton}
            aria-label="Quitter l’atelier"
          >
            Fermer · Échap
          </button>
        </header>

        <p id="trophy-workshop-instructions" style={styles.instructions}>
          {config.instruction} Reproduis uniquement la touche affichée :
          flèches ou ZQSD pour les directions, Espace ou E seulement lorsque
          le glyphe A apparaît. Manette : croix directionnelle et A. Les
          commandes tactiles restent disponibles sous la jauge.
        </p>

        {trophyImageUrl && (
          <figure style={styles.trophyPreview} aria-label={trophyName}>
            <img
              src={trophyImageUrl}
              alt=""
              width={256}
              height={256}
              decoding="async"
              style={styles.trophyPreviewImage}
            />
            <figcaption style={styles.trophyPreviewCaption}>
              Prise physique en cours de préparation
            </figcaption>
          </figure>
        )}

        {game.phase === "ready" && (
          <button
            type="button"
            onClick={begin}
            style={styles.retryButton}
            aria-describedby="trophy-workshop-instructions"
          >
            Commencer la séquence · Entrée
          </button>
        )}

        <div style={styles.sequence} aria-label="Séquence de gestes">
          {game.sequence.map((input, index) => (
            <span
              key={`${input}-${index}`}
              aria-label={`${index + 1}. ${INPUT_LABELS[input]}`}
              style={{
                ...styles.sequenceCue,
                ...(index < game.cueIndex ? styles.sequenceCueDone : {}),
                ...(index === game.cueIndex ? styles.sequenceCueActive : {}),
              }}
            >
              {INPUT_GLYPHS[input]}
            </span>
          ))}
        </div>

        <div className="trophy-workshop-work-area" style={styles.workArea}>
          <div style={styles.cuePanel} aria-hidden="true">
            <span style={styles.cueCaption}>GESTE ACTUEL</span>
            <strong style={styles.currentCue}>
              {currentCue ? INPUT_GLYPHS[currentCue] : "◆"}
            </strong>
            <span style={styles.cueName}>
              {currentCue ? INPUT_LABELS[currentCue] : "Rite accompli"}
            </span>
          </div>

          <div style={styles.timingColumn}>
            <div
              role="progressbar"
              aria-label="Fenêtre de synchronisation"
              aria-valuemin={0}
              aria-valuemax={100}
              aria-valuenow={Math.round(timingPosition * 100)}
              style={styles.timingTrack}
            >
              <span style={styles.earlyZone} />
              <span style={styles.successZone} />
              <span style={styles.lateZone} />
              <span
                style={{
                  ...styles.timingCursor,
                  left: `${timingPosition * 100}%`,
                }}
              />
            </div>
            <div className="trophy-workshop-timing-legend" style={styles.timingLegend}>
              <span>Trop tôt</span>
              <strong>FENÊTRE RITUELLE</strong>
              <span>Trop tard</span>
            </div>
            <div style={styles.statusRow} aria-live="polite" aria-atomic="true">
              <strong>
                {game.phase === "ready"
                  ? "Prêt · lance la séquence quand tu as lu les commandes"
                  : game.phase === "countdown"
                  ? `Observe le premier geste · départ dans ${readyRemaining.toFixed(1)} s`
                  : FEEDBACK_LABELS[game.feedback]}
              </strong>
              <span>
                Erreurs {game.mistakes}/{maximumMistakes}
              </span>
              <span>Score {game.score}</span>
            </div>
          </div>
        </div>

        <div
          role="progressbar"
          aria-label="Progression de l’atelier"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          style={styles.progressTrack}
        >
          <span style={{ ...styles.progressFill, width: `${progress * 100}%` }} />
        </div>

        <div
          className="trophy-workshop-touch-controls"
          style={styles.touchControls}
          aria-label="Commandes tactiles"
        >
          {config.allowedInputs.map((input) => (
            <button
              key={input}
              type="button"
              disabled={game.status !== "playing" || game.phase !== "cue"}
              aria-label={`Geste ${INPUT_LABELS[input]}`}
              onPointerDown={(event) => {
                event.preventDefault();
                submitInput(input);
              }}
              onClick={(event) => {
                if (event.detail === 0) submitInput(input);
              }}
              style={styles.inputButton}
            >
              <span aria-hidden="true" style={styles.inputGlyph}>
                {INPUT_GLYPHS[input]}
              </span>
              {INPUT_LABELS[input]}
            </button>
          ))}
        </div>

        {game.status === "failed" && (
          <div style={styles.failurePanel} role="alert">
            <strong>Préparation interrompue.</strong>
            <span>Le trophée n’a pas été modifié.</span>
            <button type="button" onClick={restart} style={styles.retryButton}>
              Recommencer la séquence · R
            </button>
          </div>
        )}

        {result && (
          <div style={styles.successPanel} role="status" aria-live="assertive">
            <strong>Rite réussi · {result.grade.toUpperCase()}</strong>
            <span>
              Précision {Math.round(result.accuracy * 100)} % · score {result.score}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  backdrop: {
    position: "fixed",
    inset: 0,
    zIndex: 100,
    display: "grid",
    placeItems: "center",
    padding: "clamp(12px, 3vw, 36px)",
    background: "rgba(2, 7, 6, 0.88)",
    backdropFilter: "blur(8px)",
  },
  panel: {
    width: "min(860px, 100%)",
    maxHeight: "min(900px, 94dvh)",
    overflowY: "auto",
    overflowX: "hidden",
    border: "1px solid rgba(222, 173, 78, 0.62)",
    borderRadius: 18,
    padding: "clamp(16px, 3vw, 30px)",
    color: "#f3ead4",
    outline: "none",
    background:
      "radial-gradient(circle at 78% 12%, rgba(139, 43, 24, 0.32), transparent 34%), linear-gradient(145deg, #111814, #080d0b 66%, #160d08)",
    boxShadow: "0 28px 90px rgba(0,0,0,.72), inset 0 0 50px rgba(64,130,91,.08)",
    fontFamily: "var(--font-geist-sans), system-ui, sans-serif",
  },
  header: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 18,
  },
  eyebrow: {
    color: "#d5a748",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: "0.18em",
  },
  title: {
    margin: "7px 0 0",
    fontSize: "clamp(24px, 5vw, 40px)",
    lineHeight: 1,
    textTransform: "uppercase",
  },
  trophyName: { margin: "8px 0 0", color: "#91cba2" },
  cancelButton: {
    minHeight: 42,
    border: "1px solid rgba(255,255,255,.18)",
    borderRadius: 9,
    padding: "9px 12px",
    color: "#ddd6c8",
    background: "rgba(255,255,255,.04)",
    cursor: "pointer",
  },
  instructions: {
    margin: "18px 0",
    maxWidth: 720,
    color: "#b9c7bd",
    lineHeight: 1.55,
  },
  trophyPreview: {
    display: "grid",
    gridTemplateColumns: "96px minmax(0, 1fr)",
    alignItems: "center",
    gap: 14,
    margin: "0 0 18px",
    border: "1px solid rgba(91,139,106,.3)",
    borderRadius: 12,
    padding: 10,
    background: "rgba(0,0,0,.2)",
  },
  trophyPreviewImage: {
    width: 96,
    height: 96,
    objectFit: "contain",
    filter: "drop-shadow(0 10px 14px rgba(0,0,0,.55))",
  },
  trophyPreviewCaption: {
    color: "#91cba2",
    fontSize: 12,
    fontWeight: 800,
    letterSpacing: ".08em",
    textTransform: "uppercase",
  },
  sequence: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "center",
    gap: 8,
    margin: "12px 0 20px",
  },
  sequenceCue: {
    display: "grid",
    placeItems: "center",
    width: 42,
    height: 42,
    border: "1px solid #46574d",
    borderRadius: 9,
    color: "#728178",
    background: "#111814",
    fontSize: 21,
    fontWeight: 900,
  },
  sequenceCueDone: {
    borderColor: "#58b37a",
    color: "#9ee4b2",
    background: "rgba(41,114,68,.24)",
  },
  sequenceCueActive: {
    borderColor: "#e3b650",
    color: "#ffe199",
    background: "rgba(174,112,26,.24)",
    boxShadow: "0 0 18px rgba(227,182,80,.28)",
  },
  workArea: {
    display: "grid",
    gridTemplateColumns: "minmax(120px, .38fr) minmax(220px, 1fr)",
    gap: "clamp(14px, 3vw, 28px)",
    alignItems: "center",
    padding: "clamp(14px, 3vw, 24px)",
    border: "1px solid rgba(91,139,106,.3)",
    borderRadius: 14,
    background: "rgba(0,0,0,.23)",
  },
  cuePanel: { display: "grid", justifyItems: "center", gap: 2 },
  cueCaption: { color: "#80958a", fontSize: 10, letterSpacing: ".16em" },
  currentCue: {
    color: "#f0c763",
    fontSize: "clamp(54px, 12vw, 88px)",
    lineHeight: 1,
    textShadow: "0 0 24px rgba(236,184,70,.38)",
  },
  cueName: { color: "#e2dbc9", fontSize: 13, fontWeight: 800 },
  timingColumn: { minWidth: 0 },
  timingTrack: {
    position: "relative",
    height: 48,
    overflow: "hidden",
    border: "1px solid #566459",
    borderRadius: 8,
    background: "#19100d",
  },
  earlyZone: {
    position: "absolute",
    inset: "0 76% 0 0",
    background: "rgba(181,67,42,.38)",
  },
  successZone: {
    position: "absolute",
    inset: "0 18.4% 0 24%",
    background:
      "linear-gradient(90deg, rgba(104,165,76,.28), rgba(189,215,91,.64), rgba(104,165,76,.28))",
  },
  lateZone: {
    position: "absolute",
    inset: "0 0 0 81.6%",
    background: "rgba(181,67,42,.38)",
  },
  timingCursor: {
    position: "absolute",
    top: -3,
    bottom: -3,
    width: 5,
    borderRadius: 3,
    background: "#fff4c5",
    boxShadow: "0 0 12px #fff0a6",
    transform: "translateX(-50%)",
  },
  timingLegend: {
    display: "flex",
    justifyContent: "space-between",
    gap: 8,
    marginTop: 6,
    color: "#8c978f",
    fontSize: 9,
    letterSpacing: ".09em",
  },
  statusRow: {
    display: "flex",
    flexWrap: "wrap",
    justifyContent: "space-between",
    gap: 10,
    marginTop: 18,
    color: "#aebcb3",
    fontSize: 13,
  },
  progressTrack: {
    height: 8,
    overflow: "hidden",
    margin: "18px 0",
    borderRadius: 8,
    background: "#202923",
  },
  progressFill: {
    display: "block",
    height: "100%",
    borderRadius: "inherit",
    background: "linear-gradient(90deg, #397c51, #d8ae4d)",
    transition: "width 180ms ease",
  },
  touchControls: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(104px, 1fr))",
    gap: 9,
  },
  inputButton: {
    minHeight: 68,
    border: "1px solid rgba(180,201,187,.32)",
    borderRadius: 10,
    padding: 8,
    color: "#e9e2d2",
    background: "linear-gradient(#26342c, #111813)",
    cursor: "pointer",
    touchAction: "manipulation",
    userSelect: "none",
  },
  inputGlyph: {
    display: "block",
    marginBottom: 2,
    color: "#f1c45b",
    fontSize: 24,
    fontWeight: 900,
  },
  failurePanel: {
    display: "grid",
    gap: 5,
    marginTop: 16,
    border: "1px solid rgba(201,81,52,.55)",
    borderRadius: 10,
    padding: 14,
    color: "#efb4a6",
    background: "rgba(111,31,20,.22)",
  },
  retryButton: {
    justifySelf: "start",
    marginTop: 8,
    minHeight: 42,
    border: "1px solid #d59e42",
    borderRadius: 8,
    padding: "8px 13px",
    color: "#171006",
    background: "#d9ad50",
    fontWeight: 900,
    cursor: "pointer",
  },
  successPanel: {
    display: "grid",
    gap: 4,
    marginTop: 16,
    border: "1px solid rgba(91,190,117,.66)",
    borderRadius: 10,
    padding: 14,
    color: "#b9efc8",
    background: "rgba(36,104,57,.26)",
  },
};
