"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { controlActionShortcut } from "./controlBindingLabels";
import { NURSERY_ART_MANIFEST } from "./nurseryArtManifest";
import { drawFirstShockCourtyardO6, loadNurseryArt, loadNurseryContinuityArtV72, type NurseryArtBank } from "./nurseryRendering";
import { controlKeyCodeFromInput, type ControlBindings } from "./systems/controlBindings";
import { NURSERY_CONTROL_ACTIONS, sampleNurseryControls } from "./systems/nurseryControls";
import { NURSERY_ARENA, type NurseryState } from "./systems/nurseryPrologue";
import { firstShockCourtO6, firstShockOptionsO6, firstShockResumeX, moveFirstShockO6,
  type FirstShockOrderO6, type FirstShockRecordO6 } from "./systems/originFirstShockO6";
import styles from "./OriginFirstShockO6.module.css";

const labels: Record<FirstShockOrderO6, string> = {
  retrieve: "Récupérer l’arme d’exercice",
  "reach-harek": "Rejoindre Harek avec Saar",
  "hear-harek": "Écouter Harek",
  "choose-saar": "Revoir le geste avec Saar",
  "test-brace": "Caler la corde",
  postpone: "Reporter le geste",
  "return-weapon": "Rendre l’arme d’exercice",
};

function guidance(record: FirstShockRecordO6, stage: ReturnType<typeof firstShockCourtO6>["stage"]) {
  switch (stage) {
    case "retrieve": return "Saar t’attend au filet de sécurité. Récupère l’arme tombée près de la corde.";
    case "escort": return "Saar · « Viens. Harek a vu le combat depuis l’autre côté de la cour. »";
    case "choice": return record.assisted
      ? "Harek · « Quand Saar a retenu la bête, la corde a cessé de tirer. J’ai enfin vu où poser le pied. »"
      : "Harek · « Quand la corde s’est détendue, on est restés ensemble. Tu as pu reculer sans lâcher l’appui. »";
    case "drill": return "Saar · « Rejoins le filet. Place-toi sur la marque d’appui, puis cale la corde. »";
    case "return": return record.choice === "listen-harek"
      ? "Harek · « Garde les issues en vue avant de tirer. Je te montrerai d’où je regardais. » Repose l’arme au filet."
      : record.success
        ? "Saar · « Cette fois l’appui a tenu. Relâche la corde et laisse l’arme au filet. »"
        : "Saar gardera la corde pour une autre reprise. Rends-lui l’arme d’exercice.";
    default: return "";
  }
}

interface Props {
  record: FirstShockRecordO6;
  checkpoint: NurseryState;
  bindings: ControlBindings;
  paused: boolean;
  persistenceError: string | null;
  onOrder(order: FirstShockOrderO6, x: number): { retryAt: number | null } | null;
}

export default function OriginFirstShockO6({ record, checkpoint, bindings, paused, persistenceError, onOrder }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [bank, setBank] = useState<NurseryArtBank | null>(null);
  const [artError, setArtError] = useState("");
  const [attempt, setAttempt] = useState(0);
  const [position, setPosition] = useState(() => ({ x: firstShockResumeX(record), facing: 1 as -1 | 1, ticks: 0 }));
  const [feedback, setFeedback] = useState("");
  const { x, facing, ticks } = position;
  const court = firstShockCourtO6(record, x);
  const actions = firstShockOptionsO6(record, x);
  const ready = !paused && bank !== null;
  const shortcut = actions.length === 1 ? actions[0] : null;

  useEffect(() => {
    let live = true;
    Promise.all([loadNurseryArt(NURSERY_ART_MANIFEST), loadNurseryContinuityArtV72()]).then(([nursery, continuity]) => {
      if (live) setBank({ ...nursery, ...continuity });
    }, (error: unknown) => {
      if (live) setArtError(error instanceof Error ? error.message : "L’image de la cour n’a pas pu être chargée.");
    });
    return () => { live = false; };
  }, [attempt]);

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx || !bank) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    drawFirstShockCourtyardO6(ctx, checkpoint, bank, record, { x, facing, ticks }, reduced);
  }, [bank, checkpoint, record, x, facing, ticks]);

  const walk = useCallback((direction: -1 | 1, distance?: number) => {
    if (!ready) return;
    setPosition(previous => {
      const next = moveFirstShockO6(previous.x, direction, distance);
      return next === previous.x ? previous : { x: next, facing: direction, ticks: previous.ticks + 5 };
    });
  }, [ready]);

  const interact = useCallback((order: FirstShockOrderO6) => {
    if (!ready || !firstShockOptionsO6(record, x).includes(order)) return;
    const accepted = onOrder(order, x);
    if (!accepted) return;
    if (accepted.retryAt !== null) {
      const retryX = accepted.retryAt;
      setPosition(previous => ({ ...previous, x: retryX, facing: 1 }));
      setFeedback("L’appui a glissé. Saar a retenu la corde. Reprends depuis le repère du filet.");
    } else setFeedback("");
  }, [record, ready, x, onOrder]);

  useEffect(() => {
    if (!ready) return;
    const keyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey ||
          (event.target instanceof HTMLElement && event.target.closest("input, select, textarea, [contenteditable=true]"))) return;
      const key = controlKeyCodeFromInput(event);
      if (!key) return;
      const sample = sampleNurseryControls(new Set([key]), new Set(), bindings, null);
      if (sample.actions.move) {
        event.preventDefault();
        walk(sample.actions.move);
      } else if (!event.repeat && shortcut && (sample.actions.pickup || sample.actions.confirm) &&
          !(event.target instanceof HTMLElement && event.target.closest("button, a"))) {
        event.preventDefault();
        interact(shortcut);
      }
    };
    window.addEventListener("keydown", keyDown);
    return () => { window.removeEventListener("keydown", keyDown); };
  }, [bindings, interact, ready, shortcut, walk]);

  const confirmPad = useEffectEvent(() => { if (shortcut) interact(shortcut); });
  useEffect(() => {
    if (!ready) return;
    let frame = 0, previousConfirm = true, lastMove = 0;
    function poll(now: number) {
      const pad = navigator.getGamepads?.().find(item => item?.connected) ?? null;
      if (pad) {
        const { actions: input } = sampleNurseryControls(new Set(), new Set(), bindings, pad);
        if (input.move && now - lastMove >= 45) { lastMove = now; walk(input.move, 9); }
        const confirm = input.confirm === true || input.pickup === true;
        if (confirm && !previousConfirm) confirmPad();
        previousConfirm = confirm;
      }
      frame = requestAnimationFrame(poll);
    }
    frame = requestAnimationFrame(poll);
    return () => { cancelAnimationFrame(frame); };
  }, [bindings, ready, walk]);

  return <article className={styles.scene} data-o6-m01 data-stage={court.stage} data-position={x} data-target={court.targetX}>
    <header><h2>Après le premier choc</h2><p>La cour de la nurserie</p></header>
    <canvas tabIndex={0} ref={canvas} width={NURSERY_ARENA.width} height={NURSERY_ARENA.height}
      aria-label="Cour de la nurserie. Utilise les commandes de déplacement pour rejoindre le repère." />
    {artError && <p role="alert">{artError} <button type="button" onClick={() => { setArtError(""); setAttempt(value => value + 1); }}>Recharger la cour</button></p>}
    {!bank && !artError && <p role="status">Chargement de la cour…</p>}
    <div className={styles.orders}>
      <p>{guidance(record, court.stage)}</p>
      {(feedback || court.stage === "drill" && court.missed) && <p role="status">{feedback || "Le dernier appui a glissé. Reprends depuis le filet."}</p>}
      {persistenceError && <p role="alert">{persistenceError}</p>}
      {ready && <span className={styles.direction} aria-live="polite">{actions.length ? "Geste à portée."
        : court.targetX < x ? "Le repère est à gauche." : "Le repère est à droite."}</span>}
      <div className={styles.controls}>
        <button type="button" aria-label="Marcher à gauche" disabled={!ready} onClick={() => walk(-1)}>←</button>
        <button type="button" aria-label="Marcher à droite" disabled={!ready} onClick={() => walk(1)}>→</button>
        {actions.map(action => <button type="button" key={action} disabled={!ready} onClick={() => interact(action)}>{labels[action]}</button>)}
      </div>
      <p className={styles.keys}>Marcher {controlActionShortcut(NURSERY_CONTROL_ACTIONS.left, bindings)} / {controlActionShortcut(NURSERY_CONTROL_ACTIONS.right, bindings)}. Entrée confirme un geste unique à portée.</p>
    </div>
  </article>;
}
