"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { controlActionShortcut } from "./controlBindingLabels";
import { NURSERY_ART_MANIFEST } from "./nurseryArtManifest";
import { drawCohortRaceO6, loadNurseryArt, loadNurseryContinuityArtV72, type NurseryArtBank } from "./nurseryRendering";
import { controlKeyCodeFromInput, type ControlBindings } from "./systems/controlBindings";
import { NURSERY_CONTROL_ACTIONS, sampleNurseryControls } from "./systems/nurseryControls";
import { NURSERY_ARENA, type NurseryState } from "./systems/nurseryPrologue";
import { COHORT_COURSE_O6, COHORT_SIGNAL_WAIT_O6, simulateCohortJumpO6, walkCohortPlatformO6,
  type CohortDirectionO6, type CohortJumpO6 } from "./systems/cohortRaceCourseO6";
import { atCohortHelpO6, atCohortRallyO6, cohortRaceViewO6, mayWaitCohortSignalO6,
  type CohortRaceOrderO6, type CohortRaceRecordO6 } from "./systems/originCohortRaceO6";
import styles from "./OriginFirstShockO6.module.css";

const names = { yena: "Yena", tov: "Tov", harek: "Harek" } as const;

function instructions(record: CohortRaceRecordO6, view: ReturnType<typeof cohortRaceViewO6>) {
  switch (view.stage) {
    case "choice": return !record.opening.success
      ? "Après le dernier appui manqué, Harek reste au rassemblement. Yena a posé une corde de sécurité pour la première manche."
      : record.opening.choice === "listen-harek"
        ? "Harek te montre le poste d’observation dont il t’a parlé au filet. Tov vérifiera l’atterrissage."
        : "Le geste repris avec Saar sert à lire le balancement. Yena prend le premier sac et Tov surveille l’atterrissage.";
    case "start": return record.choice === "lead"
      ? "Yena · « Ouvre le passage. Prends ton élan au repère du premier sac. »"
      : "Harek · « Reste derrière moi. Depuis la marque, observe où le premier sac porte le poids. »";
    case "lower": return "Premier niveau franchi. Rejoins la marque dorée sur le sac bas, puis saute jusqu’au sac haut.";
    case "upper": return view.signalled
      ? names[view.signalPartner] + " montre la main ouverte. Tu peux franchir la dernière portée."
      : "Au repère doré, tiens ton appui et attends que " + names[view.signalPartner] + " libère la corde du dernier sac.";
    case "finish": return view.helpPartner === "yena"
      ? "Yena · « Le nœud a pris du jeu pendant ton passage. Tu m’aides à le stabiliser ? »"
      : "Harek · « Tu as vu où la sangle a bougé. Montre-moi où tu as posé l’appui. »";
    case "rally": return "La manche est perdue. Yena, Tov et Harek t’attendent au rassemblement. Rejoins-les pour reprendre la course.";
    default: return "";
  }
}

type Flight = NonNullable<ReturnType<typeof simulateCohortJumpO6>>;
interface Props {
  checkpoint: NurseryState;
  record: CohortRaceRecordO6;
  bindings: ControlBindings;
  paused: boolean;
  persistenceError: string | null;
  onOrder(order: CohortRaceOrderO6): boolean;
}

export default function OriginCohortRaceO6({ checkpoint, record, bindings, paused, persistenceError, onOrder }: Props) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [bank, setBank] = useState<NurseryArtBank | null>(null);
  const [error, setError] = useState("");
  const [assetAttempt, setAssetAttempt] = useState(0);
  const view = cohortRaceViewO6(record);
  const [pose, setPose] = useState(() => ({ x: view.resumeX, facing: 1 as CohortDirectionO6, ticks: 0 }));
  const [flight, setFlight] = useState<{ order: CohortJumpO6; sim: Flight } | null>(null);
  const [frame, setFrame] = useState<{ x: number; y: number } | null>(null);
  const { x, facing, ticks } = pose;
  const ready = bank !== null && !paused;
  const canWalk = ready && !flight;
  const canJump = view.stage === "start" || view.stage === "lower" || view.stage === "upper";
  const canWait = canWalk && mayWaitCohortSignalO6(record, x);
  const canGather = atCohortRallyO6(x) && (view.stage === "choice" || view.stage === "rally");
  const canHelp = view.stage === "finish" && atCohortHelpO6(x);

  useEffect(() => {
    let live = true;
    Promise.all([loadNurseryArt(NURSERY_ART_MANIFEST), loadNurseryContinuityArtV72()]).then(([core, continuity]) => {
      if (live) setBank({ ...core, ...continuity });
    }, (cause: unknown) => {
      if (live) setError(cause instanceof Error ? cause.message : "Le décor de la cour est indisponible.");
    });
    return () => { live = false; };
  }, [assetAttempt]);

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (!ctx || !bank) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    drawCohortRaceO6(ctx, checkpoint, bank, record, { x: frame?.x ?? x,
      y: frame?.y ?? COHORT_COURSE_O6[view.platform].y, facing: flight?.order.direction ?? facing, ticks,
      air: frame !== null }, reduced);
  }, [bank, checkpoint, facing, flight, frame, record, ticks, view.platform, x]);

  const finishFlight = useEffectEvent((launch: { order: CohortJumpO6; sim: Flight }) => {
    const { sim, order } = launch;
    if (sim.outcome === "same" || onOrder(order)) {
      setPose(previous => ({ ...previous, x: sim.outcome === "fall" ? COHORT_COURSE_O6.start.left + 12 : sim.x,
        facing: order.direction, ticks: previous.ticks + 5 }));
    }
    setFrame(null);
    setFlight(null);
  });

  useEffect(() => {
    if (!flight || !ready) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const stepMs = reduced ? 5 : 16;
    let request = 0, start: number | undefined;
    const update = (now: number) => {
      start ??= now;
      const index = Math.floor((now - start) / stepMs);
      if (index >= flight.sim.frames.length) { finishFlight(flight); return; }
      setFrame(flight.sim.frames[index]);
      request = requestAnimationFrame(update);
    };
    request = requestAnimationFrame(update);
    return () => cancelAnimationFrame(request);
  }, [flight, ready]);

  const confirmSignal = useEffectEvent((elapsed: number) => {
    if (canWait) onOrder({ type: "signal", x, elapsed });
  });
  useEffect(() => {
    if (!canWait) return;
    const started = performance.now();
    let timer = 0;
    function listen() {
      const elapsed = Math.floor(performance.now() - started);
      if (elapsed < COHORT_SIGNAL_WAIT_O6) {
        timer = window.setTimeout(listen, COHORT_SIGNAL_WAIT_O6 - elapsed + 10);
      } else confirmSignal(elapsed);
    }
    timer = window.setTimeout(listen, COHORT_SIGNAL_WAIT_O6 + 20);
    return () => window.clearTimeout(timer);
  }, [canWait, x]);

  const walk = useCallback((direction: CohortDirectionO6) => {
    if (!canWalk) return;
    setPose(previous => {
      const next = walkCohortPlatformO6(view.platform, previous.x, direction);
      return { x: next, facing: direction, ticks: next === previous.x ? previous.ticks : previous.ticks + 5 };
    });
  }, [canWalk, view.platform]);

  const launch = useCallback((direction: CohortDirectionO6 = facing) => {
    if (!canWalk || !canJump) return;
    const order = { type: "jump", x, direction } as const;
    const sim = simulateCohortJumpO6(view.platform, order, view.signalled);
    if (sim) setFlight({ order, sim });
  }, [canJump, canWalk, facing, view.platform, view.signalled, x]);

  useEffect(() => {
    if (!ready) return;
    const keys = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey ||
          (event.target instanceof HTMLElement && event.target.closest("input, select, textarea, [contenteditable=true]"))) return;
      const code = controlKeyCodeFromInput(event);
      if (!code) return;
      const sample = sampleNurseryControls(new Set([code]), new Set(), bindings, null);
      if (sample.actions.move) { event.preventDefault(); walk(sample.actions.move); }
      else if (bindings["hunt.jump"].includes(code) && !event.repeat &&
          !(event.target instanceof HTMLElement && event.target.closest("button, a"))) {
        event.preventDefault(); launch();
      }
    };
    window.addEventListener("keydown", keys);
    return () => { window.removeEventListener("keydown", keys); };
  }, [bindings, launch, ready, walk]);

  const liftPad = useEffectEvent((direction: CohortDirectionO6 | 0) => launch(direction || facing));
  useEffect(() => {
    if (!ready) return;
    let raf = 0, lastStep = 0, held = true;
    const poll = (time: number) => {
      const pad = navigator.getGamepads?.().find(item => item?.connected) ?? null;
      if (pad) {
        const { actions } = sampleNurseryControls(new Set(), new Set(), bindings, pad);
        const direction = actions.move ?? 0;
        if (direction && time - lastStep >= 58) { lastStep = time; walk(direction); }
        const pressed = actions.confirm === true;
        if (pressed && !held) liftPad(direction);
        held = pressed;
      }
      raf = requestAnimationFrame(poll);
    };
    raf = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(raf);
  }, [bindings, ready, walk]);

  return <article className={styles.scene} data-o6-m02 data-stage={view.stage} data-level={view.platform} data-position={x}
    data-signalled={view.signalled ? "true" : "false"} data-flight={flight ? "true" : "false"}>
    <header><h2>La place dans la cohorte</h2><p>La course des sacs suspendus</p></header>
    <canvas tabIndex={0} ref={canvas} width={NURSERY_ARENA.width} height={NURSERY_ARENA.height}
      aria-label="Course en deux niveaux. Rejoins les repères dorés. Le dernier saut demande un signal." />
    {error && <p role="alert">{error} <button type="button" onClick={() => { setError(""); setAssetAttempt(n => n + 1); }}>Recharger la cour</button></p>}
    {!bank && !error && <p role="status">Chargement de la cour…</p>}
    <div className={styles.orders}>
      <p>{instructions(record, view)}</p>
      {record.roundsLost > 0 && <p role="status">Manches perdues · {record.roundsLost}</p>}
      {view.stage === "upper" && <p className={styles.direction} role="status">{view.signalled ? "Signal reçu." :
        canWait ? "Le partenaire vérifie l’atterrissage." : "Attends au repère doré."}</p>}
      {persistenceError && <p role="alert">{persistenceError}</p>}
      <div className={styles.controls}>
        <button type="button" aria-label="Marcher à gauche" disabled={!canWalk} onClick={() => walk(-1)}>←</button>
        <button type="button" aria-label="Marcher à droite" disabled={!canWalk} onClick={() => walk(1)}>→</button>
        {canJump && <button type="button" disabled={!canWalk} onClick={() => launch()}>Sauter</button>}
        {canGather && view.stage === "choice" && <>
          <button type="button" disabled={!canWalk} onClick={() => onOrder({ type: "choose", choice: "lead", x })}>Prendre la tête</button>
          <button type="button" disabled={!canWalk} onClick={() => onOrder({ type: "choose", choice: "observe", x })}>Observer depuis l’arrière</button>
        </>}
        {canGather && view.stage === "rally" && <>
          <button type="button" disabled={!canWalk} onClick={() => onOrder({ type: "retry", x })}>Reprendre avec la cohorte</button>
          <button type="button" disabled={!canWalk} onClick={() => onOrder({ type: "partial", x })}>Conclure après la chute</button>
        </>}
        {canHelp && <button type="button" disabled={!canWalk} onClick={() => onOrder({ type: "help", x })}>
          {view.helpPartner === "yena" ? "Stabiliser le nœud avec Yena" : "Montrer l’appui à Harek"}
        </button>}
      </div>
      <p className={styles.keys}>Marcher {controlActionShortcut(NURSERY_CONTROL_ACTIONS.left, bindings)} / {controlActionShortcut(NURSERY_CONTROL_ACTIONS.right, bindings)}. Sauter {controlActionShortcut("hunt.jump", bindings)}.</p>
    </div>
  </article>;
}
