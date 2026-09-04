"use client";

import { useMemo, useState, type KeyboardEvent } from "react";
import {
  CONTROL_CONTEXTS,
  DEFAULT_CONTROL_BINDINGS,
  controlBindingsForContext,
  controlKeyCodeFromInput,
  rebindControlAction,
  type ControlActionId,
  type ControlBindings,
  type ControlContextId,
} from "./systems/controlBindings";

const CONTEXT_LABELS: Readonly<Record<ControlContextId, string>> = {
  hunt: "Chasse",
  pit: "THE PIT",
  galaxy: "Galaxie",
  shipHub: "Vaisseau",
  training: "Entraînement",
  workshop: "Atelier",
};

const SPECIAL_KEY_LABELS: Readonly<Record<string, string>> = {
  ArrowLeft: "Flèche gauche",
  ArrowRight: "Flèche droite",
  ArrowUp: "Flèche haut",
  ArrowDown: "Flèche bas",
  Space: "Espace",
  Enter: "Entrée",
  Escape: "Échap",
  Backspace: "Retour arrière",
  PageUp: "Page précédente",
  PageDown: "Page suivante",
  ShiftLeft: "Maj gauche",
  ShiftRight: "Maj droite",
  ControlLeft: "Ctrl gauche",
  ControlRight: "Ctrl droite",
  AltLeft: "Alt gauche",
  AltRight: "Alt droite",
};

function keyLabel(code: string): string {
  if (SPECIAL_KEY_LABELS[code]) return SPECIAL_KEY_LABELS[code];
  if (code.startsWith("Key")) return code.slice(3);
  if (code.startsWith("Digit")) return code.slice(5);
  if (code.startsWith("Numpad")) return `Pavé ${code.slice(6)}`;
  return code;
}

interface ControlBindingsPanelProps {
  bindings: ControlBindings;
  onChange(bindings: ControlBindings): void;
}

export default function ControlBindingsPanel({
  bindings,
  onChange,
}: ControlBindingsPanelProps) {
  const [context, setContext] = useState<ControlContextId>("hunt");
  const [listeningActionId, setListeningActionId] =
    useState<ControlActionId | null>(null);
  const [feedback, setFeedback] = useState(
    "Choisis une action, puis appuie sur sa nouvelle touche.",
  );
  const entries = useMemo(
    () => controlBindingsForContext(context, bindings),
    [bindings, context],
  );

  const selectContext = (nextContext: ControlContextId) => {
    setContext(nextContext);
    setListeningActionId(null);
  };

  const moveContextTab = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    const currentIndex = CONTROL_CONTEXTS.indexOf(context);
    const direction = event.key === "ArrowRight" ? 1 : -1;
    const nextContext = CONTROL_CONTEXTS[
      (currentIndex + direction + CONTROL_CONTEXTS.length) %
        CONTROL_CONTEXTS.length
    ];
    selectContext(nextContext);
    event.currentTarget
      .querySelector<HTMLButtonElement>(
        `[data-control-context="${nextContext}"]`,
      )
      ?.focus();
  };

  const captureBinding = (event: KeyboardEvent<HTMLDivElement>) => {
    if (!listeningActionId) return;
    event.preventDefault();
    event.stopPropagation();
    const code = controlKeyCodeFromInput(event.nativeEvent);
    if (!code) {
      setFeedback("Cette touche n’est pas prise en charge.");
      return;
    }
    const result = rebindControlAction(
      bindings,
      listeningActionId,
      [code],
      { conflictPolicy: "replace" },
    );
    if (!result.accepted) {
      setFeedback(
        result.issues[0]?.message ??
          "Cette touche est déjà indispensable à une autre action.",
      );
      return;
    }
    const entry = entries.find(
      (candidate) => candidate.actionId === listeningActionId,
    );
    onChange(result.bindings);
    setListeningActionId(null);
    setFeedback(`${entry?.label ?? "Commande"} : ${keyLabel(code)}.`);
  };

  return (
    <div className="control-bindings-panel" onKeyDownCapture={captureBinding}>
      <div
        className="control-context-tabs"
        role="tablist"
        aria-label="Contextes de commandes"
        onKeyDown={moveContextTab}
      >
        {CONTROL_CONTEXTS.map((contextId) => (
          <button
            key={contextId}
            type="button"
            role="tab"
            id={`control-context-tab-${contextId}`}
            aria-controls={`control-context-panel-${contextId}`}
            aria-selected={context === contextId}
            tabIndex={context === contextId ? 0 : -1}
            data-control-context={contextId}
            className={context === contextId ? "active" : undefined}
            onClick={() => selectContext(contextId)}
          >
            {CONTEXT_LABELS[contextId]}
          </button>
        ))}
      </div>

      <p className="control-binding-feedback" role="status" aria-live="polite">
        {feedback}
      </p>

      <div
        className="control-binding-list"
        role="tabpanel"
        id={`control-context-panel-${context}`}
        aria-labelledby={`control-context-tab-${context}`}
      >
        {entries.map((entry) => {
          const listening = listeningActionId === entry.actionId;
          return (
            <div className="control-binding-row" key={entry.actionId}>
              <span>
                <strong>{entry.label}</strong>
                <small>{entry.behavior === "hold" ? "Maintenir" : "Appuyer"}</small>
              </span>
              <button
                type="button"
                className={listening ? "listening" : undefined}
                aria-label={`Modifier : ${entry.label}`}
                aria-pressed={listening}
                onClick={() => {
                  setListeningActionId(listening ? null : entry.actionId);
                  setFeedback(
                    listening
                      ? "Modification annulée."
                      : `Nouvelle touche pour « ${entry.label} »…`,
                  );
                }}
              >
                {listening
                  ? "Appuie sur une touche…"
                  : entry.keyCodes.map(keyLabel).join(" · ")}
              </button>
            </div>
          );
        })}
      </div>

      <button
        type="button"
        className="ghost-button small"
        onClick={() => {
          onChange(DEFAULT_CONTROL_BINDINGS);
          setListeningActionId(null);
          setFeedback("Profil AZERTY restauré.");
        }}
      >
        Restaurer les commandes AZERTY
      </button>
    </div>
  );
}
