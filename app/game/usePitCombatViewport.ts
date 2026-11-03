"use client";

import { useCallback, useEffect, useRef, useState, type RefObject } from "react";

/** Presentation pause is outside the deterministic combat/replay state. */
export function usePitCombatViewport(
  rootRef: RefObject<HTMLElement | null>,
  active: boolean,
  resetInputs: () => void,
  focusCombat: () => void,
  readGamepad: () => Gamepad | null,
) {
  const [pauseReason, setPauseReason] = useState<string | null>(null);
  const [nativeFullscreen, setNativeFullscreen] = useState(false);
  const [fullscreenNotice, setFullscreenNotice] = useState("");
  const menuRef = useRef<HTMLDivElement>(null);
  const pausedRef = useRef(false);
  const menuOpen = active && pauseReason !== null;
  const openMenu = useCallback((reason = "Combat en pause.") => {
    if (!active) return;
    pausedRef.current = true;
    resetInputs();
    setPauseReason(reason);
  }, [active, resetInputs]);
  const resume = useCallback(() => {
    if (document.hidden) return;
    resetInputs();
    pausedRef.current = false;
    setPauseReason(null);
    focusCombat();
  }, [focusCombat, resetInputs]);

  // This overlay owns the viewport; returning to the roster or the campaign
  // restores the exact previous scroll styles, rather than a guessed default.
  useEffect(() => {
    const html = document.documentElement, body = document.body;
    const previous = [html.style.overflow, body.style.overflow, body.style.overscrollBehavior];
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    body.style.overscrollBehavior = "none";
    const host = rootRef.current;
    return () => {
      html.style.overflow = previous[0];
      body.style.overflow = previous[1];
      body.style.overscrollBehavior = previous[2];
      if (document.fullscreenElement === host) void document.exitFullscreen().catch(() => {});
    };
  }, [rootRef]);

  useEffect(() => {
    if (!active) { pausedRef.current = false; return; }
    // Every match begins with neutral controls, even after an aborted pause menu.
    pausedRef.current = false;
    const blur = () => openMenu("Fenêtre quittée — reprenez quand vous êtes prêt.");
    const visibility = () => { if (document.hidden) openMenu("Onglet masqué — combat suspendu."); };
    const disconnect = () => openMenu("Manette déconnectée — reconnectez-la ou utilisez le clavier.");
    window.addEventListener("blur", blur);
    document.addEventListener("visibilitychange", visibility);
    window.addEventListener("gamepaddisconnected", disconnect);
    return () => {
      window.removeEventListener("blur", blur);
      document.removeEventListener("visibilitychange", visibility);
      window.removeEventListener("gamepaddisconnected", disconnect);
    };
  }, [active, openMenu]);

  useEffect(() => {
    if (!menuOpen) return;
    const frame = requestAnimationFrame(() => menuRef.current?.querySelector<HTMLButtonElement>("[data-pit-resume]")?.focus());
    return () => cancelAnimationFrame(frame);
  }, [menuOpen]);

  useEffect(() => {
    const changed = () => {
      setNativeFullscreen(document.fullscreenElement === rootRef.current);
      if (!document.fullscreenElement && active) openMenu("Plein écran fermé — combat en pause.");
    };
    document.addEventListener("fullscreenchange", changed);
    return () => document.removeEventListener("fullscreenchange", changed);
  }, [active, openMenu, rootRef]);

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement === rootRef.current) await document.exitFullscreen();
      else if (rootRef.current?.requestFullscreen) await rootRef.current.requestFullscreen();
      else setFullscreenNotice("Le navigateur ne propose pas le plein écran natif. Le jeu occupe déjà toute la fenêtre.");
    } catch {
      setFullscreenNotice("Plein écran natif refusé par le navigateur. Le jeu reste adapté à toute la fenêtre.");
    }
  }, [rootRef]);

  // Start opens pause; directional navigation and A/B operate its real DOM
  // controls. Edges are rearmed only after a neutral controller sample.
  useEffect(() => {
    if (!active) return;
    let request = 0, ready = false;
    let previous = [false, false, false, false, false];
    const poll = () => {
      const pad = readGamepad();
      const current = pad ? [Boolean(pad.buttons[9]?.pressed), Boolean(pad.buttons[12]?.pressed) || (pad.axes[1] ?? 0) < -.65,
        Boolean(pad.buttons[13]?.pressed) || (pad.axes[1] ?? 0) > .65, Boolean(pad.buttons[0]?.pressed), Boolean(pad.buttons[1]?.pressed)] : [false, false, false, false, false];
      if (!pad || document.hidden) ready = false;
      else if (!ready) ready = current.every(value => !value);
      else {
        if (current[0] && !previous[0]) { if (pausedRef.current) resume(); else openMenu(); }
        else if (pausedRef.current) {
          const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>("button:not(:disabled), select, input, a[href], summary") ?? []).filter(item => item.getClientRects().length > 0);
          const index = items.indexOf(document.activeElement as HTMLElement);
          if ((current[1] && !previous[1]) || (current[2] && !previous[2])) items[(index + (current[1] ? -1 : 1) + items.length) % items.length]?.focus();
          if (current[3] && !previous[3]) (document.activeElement as HTMLElement)?.click();
          if (current[4] && !previous[4]) resume();
        }
      }
      previous = current;
      request = requestAnimationFrame(poll);
    };
    request = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(request);
  }, [active, openMenu, readGamepad, resume]);

  return { menuOpen, pauseReason, pausedRef, menuRef, openMenu, resume, nativeFullscreen, fullscreenNotice, toggleFullscreen };
}
