"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore, type RefObject } from "react";
import { createTrophyWorkshopGame, startTrophyWorkshopGame, stepTrophyWorkshopGame, trophyWorkshopResult,
  TROPHY_WORKSHOP_INPUTS, type TrophyWorkshopAction, type TrophyWorkshopInput, type TrophyWorkshopResult } from "./systems/trophyWorkshop";
import { pageActivitySnapshotV94, serverPageActivityV94, subscribePageActivityV94 } from "./systems/pageActivityV94";

const BLOCKED = '[inert],[hidden],[aria-hidden="true"],[aria-disabled="true"]';
const COMPLETION_DELAY_MS = 520;

/** Native pad state is scoped to this workshop, never shared with ship input. */
export function createWorkshopPadV94() {
  let identity = "", armed = false, previous = new Set<string>();
  const reset = () => { identity = ""; armed = false; previous.clear(); };
  return {
    reset,
    sample(pad: Gamepad | null | undefined): { input: TrophyWorkshopInput | null; back: boolean } {
      const idle = { input: null, back: false };
      if (!pad || !pad.connected) { reset(); return idle; }
      const nextIdentity = `${pad.index}:${pad.id}`;
      if (nextIdentity !== identity) { reset(); identity = nextIdentity; }
      const x = Number.isFinite(pad.axes[0]) ? pad.axes[0] : 0;
      const y = Number.isFinite(pad.axes[1]) ? pad.axes[1] : 0;
      const pressed = (index: number) => pad.buttons[index]?.pressed === true;
      const current = new Set<string>();
      if (pressed(14) || x < -0.65) current.add("left");
      if (pressed(12) || y < -0.65) current.add("up");
      if (pressed(13) || y > 0.65) current.add("down");
      if (pressed(15) || x > 0.65) current.add("right");
      if (pressed(0)) current.add("confirm");
      if (pressed(1)) current.add("back");
      if (!armed) { armed = current.size === 0; previous = current; return idle; }
      const back = current.has("back") && !previous.has("back");
      const input = back ? null : TROPHY_WORKSHOP_INPUTS.find(value => current.has(value) && !previous.has(value)) ?? null;
      previous = current;
      return { input, back };
    },
  };
}

interface WorkshopRuntimeOptionsV94 {
  action: TrophyWorkshopAction;
  trophyId: string;
  rootRef: RefObject<HTMLDivElement | null>;
  gamepadEnabled: boolean;
  suspended: boolean;
  onComplete(result: TrophyWorkshopResult): void;
  onCancel(): void;
}

/** Owns one local attempt. It never writes a save or awards a trophy itself. */
export function useTrophyWorkshopRuntimeV94({ action, trophyId, rootRef, gamepadEnabled, suspended, onComplete, onCancel }: WorkshopRuntimeOptionsV94) {
  const [game, setGame] = useState(() => createTrophyWorkshopGame(action, trophyId));
  const pageActive = useSyncExternalStore(subscribePageActivityV94, pageActivitySnapshotV94, serverPageActivityV94);
  const paused = suspended || !pageActive;
  const result = useMemo(() => trophyWorkshopResult(game), [game]);
  const callbacks = useRef({ onComplete, onCancel });
  const resultRef = useRef<TrophyWorkshopResult | null>(null);
  const gameRef = useRef(game);
  const remaining = useRef(COMPLETION_DELAY_MS), delivered = useRef(false), cancelled = useRef(false);
  const previousFrame = useRef<number | null>(null), focusFrame = useRef(0);
  const padState = useRef(createWorkshopPadV94());
  useEffect(() => { callbacks.current = { onComplete, onCancel }; }, [onComplete, onCancel]);
  useEffect(() => { gameRef.current = game; }, [game]);
  useEffect(() => { resultRef.current = result; remaining.current = COMPLETION_DELAY_MS; }, [result]);

  const canAct = useCallback(() => !cancelled.current && !suspended && pageActivitySnapshotV94() &&
    !!rootRef.current && !rootRef.current.closest(BLOCKED), [rootRef, suspended]);
  const focus = useCallback(() => {
    window.cancelAnimationFrame(focusFrame.current);
    focusFrame.current = window.requestAnimationFrame(() => { if (canAct()) rootRef.current?.focus({ preventScroll: true }); });
  }, [canAct, rootRef]);
  useEffect(() => () => window.cancelAnimationFrame(focusFrame.current), []);

  const restart = useCallback(() => {
    if (!canAct() || delivered.current) return;
    resultRef.current = null; remaining.current = COMPLETION_DELAY_MS;
    previousFrame.current = null; padState.current.reset();
    setGame(createTrophyWorkshopGame(action, trophyId));
    focus();
  }, [action, trophyId, canAct, focus]);
  const begin = useCallback(() => {
    if (!canAct()) return;
    previousFrame.current = null;
    setGame(previous => startTrophyWorkshopGame(previous));
    focus();
  }, [canAct, focus]);
  const submitInput = useCallback((input: TrophyWorkshopInput) => {
    if (!canAct()) return;
    setGame(previous => previous.phase === "ready"
      ? input === "confirm" ? startTrophyWorkshopGame(previous) : previous
      : stepTrophyWorkshopGame(previous, 0, input).state);
  }, [canAct]);
  const cancel = useCallback(() => {
    if (cancelled.current) return;
    // Invalidate immediately, even if the parent delays unmounting the dialog.
    cancelled.current = true; resultRef.current = null; padState.current.reset();
    window.cancelAnimationFrame(focusFrame.current);
    callbacks.current.onCancel();
  }, []);

  useEffect(() => {
    previousFrame.current = null;
    padState.current.reset();
    if (paused) return;
    let frame = 0, alive = true;
    const tick = (now: number) => {
      if (!alive) return;
      frame = window.requestAnimationFrame(tick);
      if (!canAct()) { previousFrame.current = null; padState.current.reset(); return; }
      const elapsed = previousFrame.current === null ? 0 : Math.min(100, Math.max(0, now - previousFrame.current));
      previousFrame.current = now;
      let pad: Gamepad | null | undefined;
      if (gamepadEnabled) {
        try { pad = Array.from(navigator.getGamepads?.() ?? []).find(candidate => candidate?.connected); }
        catch { /* A denied API cannot disable keyboard/touch or the clock. */ }
      }
      const command = padState.current.sample(pad);
      if (command.back) { cancel(); return; }
      // Delivery is timed in active frames, not by an effect keyed to a changing
      // parent callback. Background time cannot consume the success display.
      const completed = resultRef.current;
      if (completed) {
        remaining.current = Math.max(0, remaining.current - elapsed);
        if (remaining.current === 0 && !delivered.current) {
          delivered.current = true;
          callbacks.current.onComplete(completed);
        }
      } else {
        setGame(previous => stepTrophyWorkshopGame(previous, elapsed / 1000).state);
      }
      if (command.input) {
        // A new A press can restart a failed attempt, but must be released again
        // before starting it. No command held in the ship starts this workshop.
        if (command.input === "confirm" && gameRef.current.status === "failed") { restart(); return; }
        submitInput(command.input);
      }
    };
    frame = window.requestAnimationFrame(tick);
    const release = () => { previousFrame.current = null; padState.current.reset(); };
    window.addEventListener("blur", release);
    document.addEventListener("visibilitychange", release);
    return () => {
      alive = false; window.cancelAnimationFrame(frame); release();
      window.removeEventListener("blur", release);
      document.removeEventListener("visibilitychange", release);
    };
  }, [action, trophyId, paused, gamepadEnabled, canAct, cancel, restart, submitInput]);

  return { game, result, paused, begin, restart, submitInput, cancel, canAct };
}
