"use client";
/** V174 · Launch intro before the main menu: studio card, author card, title screen.
 * Any key, click, touch or gamepad button skips a card; on the title screen it opens
 * the menu once released, so the same press never activates a menu entry. */
import { useCallback, useEffect, useRef, useState } from "react";
import {
  advanceStudioIntroV174, initialStudioIntroV174, STUDIO_INTRO_TEXT_V174, type StudioIntroStateV174,
} from "./systems/studioIntroV174";
import styles from "./StudioIntroV174.module.css";

const ignoredKeys = new Set(["Shift", "Control", "Alt", "Meta", "CapsLock", "Tab"]);

export default function StudioIntroV174({ onDone }: { onDone: () => void }) {
  const [state, setState] = useState<StudioIntroStateV174>(initialStudioIntroV174);
  const root = useRef<HTMLElement>(null);
  const finishing = useRef(false);
  const press = useCallback(() => setState(current => advanceStudioIntroV174(current, { type: "press" })), []);

  useEffect(() => { root.current?.focus(); }, []);

  useEffect(() => {
    if (state.phase === "done") return;
    let frame = 0, last = performance.now(), padHeld = false;
    const loop = (now: number) => {
      const seconds = Math.min(0.25, (now - last) / 1000);
      last = now;
      setState(current => advanceStudioIntroV174(current, { type: "tick", seconds }));
      const pads = typeof navigator !== "undefined" && navigator.getGamepads ? navigator.getGamepads() : [];
      const held = [...pads].some(pad => pad?.buttons.some(button => button.pressed));
      if (held && !padHeld) press();
      if (!held && padHeld && finishing.current) onDone();
      padHeld = held;
      frame = requestAnimationFrame(loop);
    };
    frame = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(frame);
  }, [state.phase, press, onDone]);

  useEffect(() => {
    if (state.phase !== "done") return;
    finishing.current = true;
    const release = () => onDone();
    window.addEventListener("keyup", release, { once: true });
    window.addEventListener("pointerup", release, { once: true });
    // A press already released (or a synthetic one) still opens the menu.
    const fallback = window.setTimeout(release, 400);
    return () => {
      window.removeEventListener("keyup", release);
      window.removeEventListener("pointerup", release);
      window.clearTimeout(fallback);
    };
  }, [state.phase, onDone]);

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (ignoredKeys.has(event.key) || event.repeat) return;
    event.preventDefault();
    event.stopPropagation();
    press();
  };

  const text = STUDIO_INTRO_TEXT_V174;
  return <section ref={root} tabIndex={-1} className={styles.intro} data-studio-intro-v174={state.phase}
    aria-label="Introduction du jeu" onKeyDown={onKeyDown} onPointerDown={event => { event.preventDefault(); press(); }}>
    {state.phase === "studio" ? <p key="studio" className={styles.card} aria-live="polite">{text.studio}</p> : null}
    {state.phase === "author" ? <p key="author" className={`${styles.card} ${styles.author}`} aria-live="polite">{text.author}</p> : null}
    {state.phase === "title" || state.phase === "done" ? <div key="title" className={styles.title}>
      <h1 className={styles.name}>{text.title}<span>{text.subtitle}</span></h1>
      <p className={styles.credit}>{text.studio} · {text.author}</p>
      <p className={styles.prompt} aria-live="polite">— {text.prompt} —</p>
    </div> : null}
    <p className={styles.skip}>{state.phase === "title" || state.phase === "done" ? "" : "Une touche pour passer"}</p>
  </section>;
}
