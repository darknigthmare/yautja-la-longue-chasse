"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { controlActionShortcut } from "./controlBindingLabels";
import {
  DEFAULT_CONTROL_BINDINGS,
  matchingControlActions,
  type ControlBindings,
} from "./systems/controlBindings";
import {
  TRAINING_DRILL_ACTIONS,
  TRAINING_DRILL_CONFIGS,
  createTrainingDrill,
  startTrainingDrill,
  stepTrainingDrill,
  submitTrainingDrillAction,
  trainingDrillAccuracy,
  trainingDrillCueRemaining,
  trainingDrillProgress,
  trainingDrillScore,
  type TrainingDrillAction,
  type TrainingDrillFeedback,
} from "./systems/trainingDrill";
import {
  TRAINING_LABELS,
  type TrainingDisciplineId,
} from "./systems/progression";

export interface TrainingDrillProps {
  disciplineId: TrainingDisciplineId;
  controlBindings?: ControlBindings;
  seed?: number;
  autoFocus?: boolean;
  onComplete: (score: number) => void;
  onCancel: () => void;
}

const ACTION_GLYPHS: Readonly<
  Record<TrainingDrillAction, string>
> = {
  left: "←",
  right: "→",
  primary: "A",
  secondary: "B",
};

const FEEDBACK_LABELS: Readonly<
  Record<TrainingDrillFeedback, string>
> = {
  ready: "Prêt pour l’épreuve",
  perfect: "Réponse parfaite",
  correct: "Réponse correcte",
  wrong: "Mauvaise réponse",
  missed: "Fenêtre manquée",
  complete: "Épreuve terminée",
};

export default function TrainingDrill(props: TrainingDrillProps) {
  return (
    <TrainingDrillSession
      key={`${props.disciplineId}:${props.seed ?? 0}`}
      {...props}
    />
  );
}

function TrainingDrillSession({
  disciplineId,
  controlBindings = DEFAULT_CONTROL_BINDINGS,
  seed = 0,
  autoFocus = true,
  onComplete,
  onCancel,
}: TrainingDrillProps) {
  const [game, setGame] = useState(() =>
    createTrainingDrill(disciplineId, seed),
  );
  const backdropRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const previouslyFocusedRef = useRef<HTMLElement | null>(null);
  const previousFrameRef = useRef<number | null>(null);
  const config = TRAINING_DRILL_CONFIGS[disciplineId];
  const actionShortcuts: Readonly<Record<TrainingDrillAction, string>> = {
    left: controlActionShortcut("training.left", controlBindings),
    right: controlActionShortcut("training.right", controlBindings),
    primary: controlActionShortcut("training.primary", controlBindings),
    secondary: controlActionShortcut("training.secondary", controlBindings),
  };

  const begin = useCallback(() => {
    previousFrameRef.current = null;
    setGame((previous) => startTrainingDrill(previous));
    window.requestAnimationFrame(() =>
      panelRef.current?.focus({ preventScroll: true }),
    );
  }, []);

  const submitAction = useCallback((action: TrainingDrillAction) => {
    setGame((previous) =>
      submitTrainingDrillAction(previous, action).state,
    );
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

    const focusFrame = window.requestAnimationFrame(() => {
      if (autoFocus) panelRef.current?.focus({ preventScroll: true });
    });
    return () => {
      window.cancelAnimationFrame(focusFrame);
      for (const previous of previousSiblingState) {
        if (!previous.inert) previous.node.removeAttribute("inert");
        if (previous.ariaHidden === null) {
          previous.node.removeAttribute("aria-hidden");
        } else {
          previous.node.setAttribute(
            "aria-hidden",
            previous.ariaHidden,
          );
        }
      }
      previouslyFocusedRef.current?.focus({ preventScroll: true });
    };
  }, [autoFocus]);

  useEffect(() => {
    if (game.status !== "playing") {
      previousFrameRef.current = null;
      return;
    }

    let animationFrame = 0;
    const animate = (now: number) => {
      const previousFrame = previousFrameRef.current ?? now;
      previousFrameRef.current = now;
      const deltaSeconds = Math.min(
        0.1,
        Math.max(0, (now - previousFrame) / 1_000),
      );
      setGame((previous) =>
        stepTrainingDrill(previous, deltaSeconds),
      );
      animationFrame = window.requestAnimationFrame(animate);
    };
    animationFrame = window.requestAnimationFrame(animate);
    return () => window.cancelAnimationFrame(animationFrame);
  }, [game.status]);

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (event.repeat) return;
    if (event.key === "Tab") {
      const focusable = Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'button:not(:disabled), [href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      );
      if (focusable.length === 0) {
        event.preventDefault();
        panelRef.current?.focus();
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      const active = document.activeElement;
      if (
        event.shiftKey &&
        (active === first || active === panelRef.current)
      ) {
        event.preventDefault();
        last.focus();
      } else if (
        !event.shiftKey &&
        (active === last || active === panelRef.current)
      ) {
        event.preventDefault();
        first.focus();
      }
      return;
    }
    if (
      event.target instanceof HTMLButtonElement &&
      (event.key === "Enter" || event.key === " ")
    ) {
      return;
    }
    const actions = matchingControlActions(
      "training",
      event.nativeEvent,
      controlBindings,
    );
    if (actions.includes("training.cancel")) {
      event.preventDefault();
      onCancel();
      return;
    }
    if (game.status === "ready" && actions.includes("training.primary")) {
      event.preventDefault();
      begin();
      return;
    }
    const action: TrainingDrillAction | null = actions.includes("training.left")
      ? "left"
      : actions.includes("training.right")
        ? "right"
        : actions.includes("training.primary")
          ? "primary"
          : actions.includes("training.secondary")
            ? "secondary"
            : null;
    if (!action || game.status !== "playing") return;
    event.preventDefault();
    submitAction(action);
  };

  const currentAction = game.sequence[game.cueIndex] ?? null;
  const progress = trainingDrillProgress(game);
  const cueRemaining = trainingDrillCueRemaining(game);
  const accuracy = trainingDrillAccuracy(game);
  const score = trainingDrillScore(game);
  const averageReaction =
    game.hits > 0 ? game.totalReactionSeconds / game.hits : 0;

  return (
    <div
      ref={backdropRef}
      className="modal-backdrop training-drill-backdrop"
      role="presentation"
      style={styles.backdrop}
    >
      <div
        ref={panelRef}
        className="modal-panel training-drill-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="training-drill-title"
        aria-describedby="training-drill-instructions"
        tabIndex={-1}
        onKeyDown={handleKeyDown}
        style={styles.panel}
      >
        <header style={styles.header}>
          <div>
            <p className="eyebrow">
              SALLE D’ENTRAÎNEMENT · {TRAINING_LABELS[disciplineId]}
            </p>
            <h2 id="training-drill-title">{config.title}</h2>
          </div>
          <button
            type="button"
            className="ghost-button danger"
            onClick={onCancel}
            aria-label="Abandonner l’épreuve sans enregistrer de score"
          >
            Abandonner · {controlActionShortcut("training.cancel", controlBindings)}
          </button>
        </header>

        <p id="training-drill-instructions" style={styles.instructions}>
          {config.instruction} Clavier : {actionShortcuts.left}, {actionShortcuts.right}, {actionShortcuts.primary} et {actionShortcuts.secondary}.
          Les quatre commandes tactiles restent disponibles pendant toute
          l’épreuve.
        </p>

        {game.status === "ready" ? (
          <button
            type="button"
            className="alien-button"
            onClick={begin}
            aria-describedby="training-drill-instructions"
          >
            Commencer l’épreuve · {actionShortcuts.primary}
          </button>
        ) : null}

        <div style={styles.sequence} aria-label="Séquence d’entraînement">
          {game.sequence.map((action, index) => (
            <span
              key={`${action}-${index}`}
              aria-label={`${index + 1}. ${config.actionLabels[action]}`}
              style={{
                ...styles.sequenceCue,
                ...(index < game.cueIndex
                  ? styles.sequenceCueDone
                  : {}),
                ...(index === game.cueIndex && game.status === "playing"
                  ? styles.sequenceCueActive
                  : {}),
              }}
            >
              {ACTION_GLYPHS[action]}
            </span>
          ))}
        </div>

        <section style={styles.workArea} aria-label="Commande actuelle">
          <span className="eyebrow">SIGNAL ACTUEL</span>
          <strong style={styles.currentGlyph} aria-hidden="true">
            {currentAction ? ACTION_GLYPHS[currentAction] : "◆"}
          </strong>
          <strong style={styles.currentLabel}>
            {currentAction
              ? config.actionLabels[currentAction]
              : game.status === "complete"
                ? "Séquence terminée"
                : "Lance l’épreuve"}
          </strong>
        </section>

        <div
          role="progressbar"
          aria-label="Temps restant pour répondre"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(cueRemaining * 100)}
          style={styles.timerTrack}
        >
          <span
            aria-hidden="true"
            style={{
              ...styles.timerFill,
              width: `${cueRemaining * 100}%`,
            }}
          />
        </div>

        <div
          role="status"
          aria-live="polite"
          aria-atomic="true"
          style={styles.feedback}
        >
          <strong>{FEEDBACK_LABELS[game.feedback]}</strong>
          <span>
            Précision {Math.round(accuracy * 100)} % · score provisoire {score}
          </span>
        </div>

        <div
          role="progressbar"
          aria-label="Progression de l’épreuve"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(progress * 100)}
          style={styles.progressTrack}
        >
          <span
            aria-hidden="true"
            style={{
              ...styles.progressFill,
              width: `${progress * 100}%`,
            }}
          />
        </div>

        <div
          role="group"
          aria-label="Commandes tactiles"
          style={styles.actionGrid}
        >
          {TRAINING_DRILL_ACTIONS.map((action) => (
            <button
              key={action}
              type="button"
              className="hub-action"
              disabled={game.status !== "playing"}
              aria-label={`${config.actionLabels[action]}. ${actionShortcuts[action]}`}
              onPointerDown={(event) => {
                event.preventDefault();
                submitAction(action);
              }}
              onClick={(event) => {
                if (event.detail === 0) submitAction(action);
              }}
              style={styles.actionButton}
            >
              <span style={styles.actionGlyph} aria-hidden="true">
                {ACTION_GLYPHS[action]}
              </span>
              <span>
                <strong>{config.actionLabels[action]}</strong>
                <small>{actionShortcuts[action]}</small>
              </span>
            </button>
          ))}
        </div>

        {game.status === "complete" ? (
          <section
            role="status"
            aria-live="assertive"
            style={styles.resultPanel}
          >
            <h3>Résultat : {score}/100</h3>
            <p>
              {game.hits}/{game.sequence.length} réponses correctes ·{" "}
              {game.missedCues} fenêtre(s) manquée(s) · {game.wrongInputs}{" "}
              erreur(s).
            </p>
            <p>
              Temps de réaction moyen :{" "}
              {game.hits > 0
                ? `${averageReaction.toFixed(2)} s`
                : "aucune réponse correcte"}
              .
            </p>
            <div className="modal-actions">
              <button
                type="button"
                className="alien-button"
                onClick={() => onComplete(score)}
              >
                Consigner le résultat
              </button>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

const styles: Record<string, CSSProperties> = {
  backdrop: {
    zIndex: 100,
  },
  panel: {
    width: "min(720px, 100%)",
    padding: "clamp(16px, 3vw, 28px)",
    borderColor: "rgba(214, 166, 91, 0.5)",
    color: "var(--bone, #e9dfc8)",
    background:
      "radial-gradient(circle at 82% 10%, rgba(80, 153, 126, 0.18), transparent 35%), linear-gradient(145deg, #101713, #080d0b 70%, #150d08)",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: 16,
    flexWrap: "wrap",
  },
  instructions: {
    maxWidth: "64ch",
    margin: "16px 0",
    color: "var(--bone-dim, #b9b8ad)",
    lineHeight: 1.6,
  },
  sequence: {
    display: "flex",
    flexWrap: "wrap",
    gap: 7,
    margin: "18px 0",
  },
  sequenceCue: {
    display: "grid",
    width: 34,
    height: 34,
    placeItems: "center",
    border: "1px solid rgba(214, 166, 91, 0.22)",
    color: "#736f63",
    background: "rgba(0, 0, 0, 0.28)",
    fontWeight: 900,
  },
  sequenceCueDone: {
    borderColor: "rgba(97, 242, 210, 0.34)",
    color: "#61f2d2",
  },
  sequenceCueActive: {
    borderColor: "#d6a65b",
    color: "#ffe2a9",
    background: "rgba(214, 166, 91, 0.18)",
    boxShadow: "0 0 20px rgba(214, 166, 91, 0.2)",
  },
  workArea: {
    display: "grid",
    minHeight: 154,
    placeItems: "center",
    alignContent: "center",
    gap: 5,
    border: "1px solid rgba(97, 242, 210, 0.2)",
    background: "rgba(1, 8, 7, 0.58)",
  },
  currentGlyph: {
    color: "#61f2d2",
    fontSize: "clamp(3rem, 12vw, 5rem)",
    lineHeight: 1,
    textShadow: "0 0 22px rgba(97, 242, 210, 0.32)",
  },
  currentLabel: {
    color: "#e9dfc8",
    fontSize: "clamp(1rem, 4vw, 1.35rem)",
  },
  timerTrack: {
    height: 9,
    marginTop: 10,
    overflow: "hidden",
    background: "rgba(255, 255, 255, 0.08)",
  },
  timerFill: {
    display: "block",
    height: "100%",
    background: "linear-gradient(90deg, #d34b2f, #d6a65b, #61f2d2)",
    transition: "width 80ms linear",
  },
  feedback: {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    margin: "10px 0",
    color: "var(--bone-dim, #b9b8ad)",
    fontSize: ".78rem",
  },
  progressTrack: {
    height: 5,
    marginBottom: 16,
    overflow: "hidden",
    background: "rgba(255, 255, 255, 0.08)",
  },
  progressFill: {
    display: "block",
    height: "100%",
    background: "#d6a65b",
    transition: "width 120ms ease-out",
  },
  actionGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
    gap: 9,
  },
  actionButton: {
    display: "flex",
    minWidth: 0,
    minHeight: 64,
    alignItems: "center",
    gap: 12,
    padding: "10px 12px",
    touchAction: "manipulation",
    textAlign: "left",
  },
  actionGlyph: {
    display: "grid",
    width: 36,
    height: 36,
    flex: "0 0 auto",
    placeItems: "center",
    border: "1px solid rgba(97, 242, 210, 0.25)",
    color: "#61f2d2",
    fontWeight: 900,
  },
  resultPanel: {
    marginTop: 18,
    padding: 16,
    border: "1px solid rgba(214, 166, 91, 0.34)",
    background: "rgba(214, 166, 91, 0.08)",
  },
};
