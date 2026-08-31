"use client";

import { useEffect, type RefObject } from "react";
import { freshMenuPadState, menuFocusIndex, menuPadStep, type MenuDirection } from "./systems/menuNavigation";

const FOCUSABLE = 'button:not(:disabled),a[href],input:not(:disabled):not([type="hidden"]),select:not(:disabled),textarea:not(:disabled),summary,[tabindex="0"]';

function adjustControl(element: HTMLElement | null, direction: MenuDirection): boolean {
  if (direction !== "left" && direction !== "right") return false;
  const sign = direction === "left" ? -1 : 1;
  if (element instanceof HTMLInputElement && element.type === "range") {
    const minimum = Number(element.min || 0);
    const maximum = Number(element.max || 100);
    const step = element.step === "any" ? (maximum - minimum) / 100 : Number(element.step || 1);
    const value = String(Math.min(maximum, Math.max(minimum, Number(element.value) + sign * step)));
    Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, "value")?.set?.call(element, value);
    element.dispatchEvent(new Event("input", { bubbles: true }));
    element.dispatchEvent(new Event("change", { bubbles: true }));
    return true;
  }
  if (element instanceof HTMLSelectElement) {
    const options = Array.from(element.options).filter(option => !option.disabled);
    const index = options.findIndex(option => option.value === element.value);
    const next = options[Math.min(options.length - 1, Math.max(0, index + sign))];
    if (next) {
      Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, "value")?.set?.call(element, next.value);
      element.dispatchEvent(new Event("change", { bubbles: true }));
    }
    return true;
  }
  return false;
}

/** Active only on menus without their own controller loop. No synthetic gameplay keys. */
export function useMenuGamepad(rootRef: RefObject<HTMLElement | null>, enabled: boolean, contextKey: string, onBack: () => void) {
  useEffect(() => {
    if (!enabled) return;
    let frameId = 0;
    let padIdentity = "";
    let state = freshMenuPadState();
    const tick = (now: number) => {
      frameId = window.requestAnimationFrame(tick);
      if (document.hidden || !document.hasFocus()) { state = freshMenuPadState(); return; }
      let pad: Gamepad | null | undefined;
      try { pad = Array.from(navigator.getGamepads?.() ?? []).find(candidate => candidate?.connected); }
      catch { padIdentity = ""; state = freshMenuPadState(); return; }
      if (!pad) { padIdentity = ""; state = freshMenuPadState(); return; }
      const identity = `${pad.index}:${pad.id}`;
      if (identity !== padIdentity) { padIdentity = identity; state = freshMenuPadState(); }
      const pressed = (index: number) => pad.buttons[index]?.pressed ?? false;
      const x = Number.isFinite(pad.axes[0]) ? pad.axes[0] : 0;
      const y = Number.isFinite(pad.axes[1]) ? pad.axes[1] : 0;
      const direction = pressed(12) ? "up" : pressed(13) ? "down" : pressed(14) ? "left" : pressed(15) ? "right"
        : Math.max(Math.abs(x), Math.abs(y)) < 0.55 ? null
        : Math.abs(x) > Math.abs(y) ? (x < 0 ? "left" : "right") : (y < 0 ? "up" : "down");
      const result = menuPadStep(state, { direction, confirm: pressed(0), back: pressed(1) }, now);
      state = result.state;
      if (!result.direction && !result.confirm && !result.back) return;
      const root = rootRef.current;
      if (!root) return;
      const dialogs = Array.from(root.querySelectorAll<HTMLElement>('[role="dialog"][aria-modal="true"]'))
        .filter(element => !element.closest('[inert]') && element.getClientRects().length > 0);
      const scope = dialogs.at(-1) ?? root;
      const controls = Array.from(scope.querySelectorAll<HTMLElement>(FOCUSABLE))
        .filter(element => !element.closest('[inert],[aria-hidden="true"]') && element.getClientRects().length > 0 && element.getAttribute("aria-disabled") !== "true");
      const active = document.activeElement instanceof HTMLElement ? document.activeElement : null;
      if (result.back) { onBack(); return; }
      if (result.direction && !adjustControl(active && scope.contains(active) ? active : null, result.direction)) {
        const index = menuFocusIndex(controls.map(element => {
          const rect = element.getBoundingClientRect();
          return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
        }), controls.indexOf(active as HTMLElement), result.direction);
        controls[index]?.focus({ preventScroll: true });
        controls[index]?.scrollIntoView({ block: "nearest", inline: "nearest", behavior: "auto" });
      }
      if (result.confirm) {
        const current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
        if (current && controls.includes(current)) current.click();
        else controls[0]?.focus({ preventScroll: true });
      }
    };
    frameId = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frameId);
  }, [enabled, contextKey, onBack, rootRef]);
}
