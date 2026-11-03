"use client";

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { createTrainingDrill, startTrainingDrill, stepTrainingDrill, submitTrainingDrillAction,
  trainingDrillScore, TRAINING_DRILL_ACTIONS, type TrainingDrillAction, type TrainingDrillState } from "./systems/trainingDrill";
import type { TrainingDisciplineId } from "./systems/progression";
import { pageActivitySnapshotV94, serverPageActivityV94, subscribePageActivityV94 } from "./systems/pageActivityV94";

const BLOCKED = '[inert],[hidden],[aria-hidden="true"],[aria-disabled="true"]';

/** B is a drill gesture. View/Back (8), not B, abandons the exercise. */
export function createTrainingPadV94() {
  let identity = "", armed = false, previous = new Set<string>();
  const reset = () => { identity = ""; armed = false; previous.clear(); };
  return {
    reset,
    sample(pad: Gamepad | null | undefined): { action: TrainingDrillAction | null; cancel: boolean } {
      const idle = { action: null, cancel: false };
      if (!pad?.connected) { reset(); return idle; }
      const nextIdentity = `${pad.index}:${pad.id}`;
      if (nextIdentity !== identity) { reset(); identity = nextIdentity; }
      const x = Number.isFinite(pad.axes[0]) ? pad.axes[0] : 0;
      const pressed = (index: number) => pad.buttons[index]?.pressed === true;
      const current = new Set<string>();
      if (pressed(14) || x < -0.65) current.add("left");
      if (pressed(15) || x > 0.65) current.add("right");
      if (pressed(0)) current.add("primary");
      if (pressed(1)) current.add("secondary");
      if (pressed(8)) current.add("cancel");
      if (!armed) { armed = current.size === 0; previous = current; return idle; }
      const cancel = current.has("cancel") && !previous.has("cancel");
      const edges = TRAINING_DRILL_ACTIONS.filter(action => current.has(action) && !previous.has(action));
      previous = current;
      // Ambiguous chords must not consume several cues or invent a preferred answer.
      return { action: !cancel && edges.length === 1 ? edges[0] : null, cancel };
    },
  };
}

interface TrainingRuntimeOptionsV94 {
  disciplineId: TrainingDisciplineId;
  seed: number;
  rootRef: RefObject<HTMLDivElement | null>;
  suspended: boolean;
  gamepadEnabled: boolean;
  onComplete(score: number): void;
  onCancel(): void;
}

/** Owns one exercise, not its campaign persistence. Recording is an explicit action. */
export function useTrainingDrillRuntimeV94({ disciplineId, seed, rootRef, suspended, gamepadEnabled, onComplete, onCancel }: TrainingRuntimeOptionsV94) {
  const [game, setGame] = useState(() => createTrainingDrill(disciplineId, seed));
  const [resultSent, setResultSent] = useState(false);
  const [deliveryError, setDeliveryError] = useState<string | null>(null);
  const pageActive = useSyncExternalStore(subscribePageActivityV94, pageActivitySnapshotV94, serverPageActivityV94);
  const paused = suspended || !pageActive;
  const gameRef = useRef(game);
  const callbacks = useRef({ onComplete, onCancel, suspended });
  const alive = useRef(false), cancelled = useRef(false), delivered = useRef(false);
  const previousFrame = useRef<number | null>(null), focusFrame = useRef(0);
  const padState = useRef(createTrainingPadV94());
  useEffect(() => { callbacks.current = { onComplete, onCancel, suspended }; }, [onComplete, onCancel, suspended]);
  useEffect(() => {
    alive.current = true;
    return () => { alive.current = false; window.cancelAnimationFrame(focusFrame.current); };
  }, []);

  const canAct = useCallback(() => alive.current && !cancelled.current &&
    !callbacks.current.suspended && pageActivitySnapshotV94() && !!rootRef.current &&
    !rootRef.current.closest(BLOCKED), [rootRef]);
  const replaceGame = useCallback((next: TrainingDrillState) => {
    if (next === gameRef.current) return;
    if (next.status !== gameRef.current.status) { previousFrame.current = null; padState.current.reset(); }
    gameRef.current = next;
    setGame(next);
  }, []);
  const begin = useCallback(() => {
    if (!canAct() || delivered.current || gameRef.current.status !== "ready") return;
    replaceGame(startTrainingDrill(gameRef.current));
    window.cancelAnimationFrame(focusFrame.current);
    focusFrame.current = window.requestAnimationFrame(() => { if (canAct()) rootRef.current?.focus({ preventScroll: true }); });
  }, [canAct, replaceGame, rootRef]);
  const submitAction = useCallback((action: TrainingDrillAction) => {
    if (!canAct() || delivered.current || !TRAINING_DRILL_ACTIONS.includes(action)) return;
    replaceGame(submitTrainingDrillAction(gameRef.current, action).state);
  }, [canAct, replaceGame]);
  const cancel = useCallback(() => {
    if (!canAct()) return;
    cancelled.current = true; previousFrame.current = null; padState.current.reset();
    window.cancelAnimationFrame(focusFrame.current);
    callbacks.current.onCancel();
  }, [canAct]);
  const recordResult = useCallback(() => {
    if (!canAct() || delivered.current || gameRef.current.status !== "complete") return;
    // Claim before entering user code: double clicks/reentrant callbacks cannot
    // add a second attempt. An exception is not a confirmed persistent write.
    delivered.current = true; setResultSent(true); padState.current.reset();
    try { callbacks.current.onComplete(trainingDrillScore(gameRef.current)); }
    catch { setDeliveryError("Transmission du score non confirmée. Le résultat reste affiché ; aucune seconde transmission automatique."); }
  }, [canAct]);

  useEffect(() => {
    previousFrame.current = null; padState.current.reset();
    if (paused) return;
    let frame = 0, active = true;
    const release = () => { previousFrame.current = null; padState.current.reset(); };
    const tick = (now: number) => {
      if (!active) return;
      frame = window.requestAnimationFrame(tick);
      if (!canAct()) { release(); return; }
      const delta = previousFrame.current === null ? 0 : Math.min(0.1, Math.max(0, (now - previousFrame.current) / 1000));
      previousFrame.current = now;
      let pad: Gamepad | null | undefined;
      if (gamepadEnabled) {
        try { pad = Array.from(navigator.getGamepads?.() ?? []).find(candidate => candidate?.connected); }
        catch { /* Keyboard/touch and the active clock remain independent. */ }
      }
      const command = padState.current.sample(pad);
      if (command.cancel) { cancel(); return; }
      const previousStatus = gameRef.current.status;
      replaceGame(stepTrainingDrill(gameRef.current, delta));
      // An expired final cue cannot consume A as a result confirmation this frame.
      if (previousStatus !== gameRef.current.status) return;
      if (!command.action) return;
      if (previousStatus === "ready") { if (command.action === "primary") begin(); }
      else if (previousStatus === "complete") { if (command.action === "primary") recordResult(); }
      else submitAction(command.action);
    };
    frame = window.requestAnimationFrame(tick);
    window.addEventListener("blur", release);
    window.addEventListener("gamepaddisconnected", release);
    document.addEventListener("visibilitychange", release);
    return () => {
      active = false; window.cancelAnimationFrame(frame); release();
      window.removeEventListener("blur", release);
      window.removeEventListener("gamepaddisconnected", release);
      document.removeEventListener("visibilitychange", release);
    };
  }, [paused, gamepadEnabled, canAct, replaceGame, begin, submitAction, cancel, recordResult]);

  return { game, paused, resultSent, deliveryError, canAct, begin, submitAction, cancel, recordResult };
}
