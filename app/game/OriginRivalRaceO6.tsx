"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { controlActionShortcut } from "./controlBindingLabels";
import HomeworldCivilianV72 from "./HomeworldCivilianV72";
import HomeworldYouthMotionV72 from "./HomeworldYouthMotionV72";
import { controlKeyCodeFromInput, type ControlBindings } from "./systems/controlBindings";
import { NURSERY_CONTROL_ACTIONS, sampleNurseryControls } from "./systems/nurseryControls";
import { rivalRaceViewO6, type RivalRaceOrderO6, type RivalRaceRecordO6 } from "./systems/originRivalRaceO6";
import { RIVAL_FLAG_O6, RIVAL_HAREK_POST_O6, RIVAL_LADDER_O6, RIVAL_ROOF_O6, RIVAL_SUPPORTS_O6, rivalBeamShiftO6,
  rivalNearO6, rivalPoseO6, rivalWalkO6, simulateRivalJumpO6, type RivalDirectionO6,
  type RivalFrameO6, type RivalPlatformO6 } from "./systems/rivalRaceCourseO6";
import styles from "./OriginRivalRaceO6.module.css";

interface Props {
  record: RivalRaceRecordO6;
  bindings: ControlBindings;
  paused: boolean;
  onOrder(order: RivalRaceOrderO6): boolean;
}
type Flight = { order: RivalRaceOrderO6 | null; frames: RivalFrameO6[]; landing: number; beat: number };
const pctX = (x: number) => (x / RIVAL_ROOF_O6.width * 100) + "%";
const pctY = (y: number) => (y / RIVAL_ROOF_O6.height * 100) + "%";
const supports = Object.keys(RIVAL_SUPPORTS_O6) as RivalPlatformO6[];

function getCue(view: ReturnType<typeof rivalRaceViewO6>, prior: RivalRaceRecordO6["town"]["outcome"]) {
  switch (view.stage) {
    case "observe": return prior === "postpone"
      ? "Harek a attendu près de l’atelier pendant que les détours étaient reportés. Rejoins-le au repère doré."
      : "Après la livraison, Harek a planté un fanion au-dessus de l’atelier. Rejoins-le au repère doré.";
    case "choice": return "Harek avance un pied puis hésite. Tu peux profiter de son retard ou l’avertir avant son saut.";
    case "cross":
      if (view.platform === "start" && view.choice === "warn") return "Harek a reculé au signal. Prends les deux passerelles stables pour atteindre le fanion.";
      if (view.platform === "start") return "La poutre va et vient. Lance-toi quand elle peut recevoir ton appui, puis saute vers le toit du fanion.";
      if (view.platform === "beam") return "Tu es sur la poutre. Approche du bord droit et attends qu’elle porte vers le toit du fanion.";
      return "Garde le bord droit de la passerelle devant toi. Le dernier appui mène au fanion.";
    case "lower": return "La chute a coûté l’avance. Suis le palier inférieur jusqu’à l’échelle, puis rejoins le fanion.";
    case "flag": return "Rejoins le fanion. Harek y attend ton compte rendu.";
    default: return "";
  }
}

export default function OriginRivalRaceO6({ record, bindings, paused, onOrder }: Props) {
  const focus = useRef<HTMLElement>(null);
  const [facing, setFacing] = useState<RivalDirectionO6>(1);
  const [clock, setClock] = useState(0);
  const [draft, setDraft] = useState({ entry: -1, x: 0, movedAt: -10 });
  const [flight, setFlight] = useState<Flight | null>(null);
  const [air, setAir] = useState<RivalFrameO6 | null>(null);
  const [error, setError] = useState(false);
  const view = rivalRaceViewO6(record);
  const entry = record.journal.length;
  const x = draft.entry === entry ? draft.x : view.x;
  const beat = (view.beat + clock) % RIVAL_ROOF_O6.cycle;
  const position = air ?? rivalPoseO6(view.platform, x, beat);
  const ready = !paused && !flight;
  const atHarek = (view.stage === "observe" || view.stage === "choice") && rivalNearO6(x, RIVAL_HAREK_POST_O6);
  const atLadder = view.stage === "lower" && rivalNearO6(x, RIVAL_LADDER_O6, 20);
  const atFlag = view.stage === "flag" && rivalNearO6(x, RIVAL_FLAG_O6, 24);

  useEffect(() => { focus.current?.focus(); }, []);
  useEffect(() => {
    if (paused || flight) return;
    const timer = window.setInterval(() => setClock(state => state + 1), 42);
    return () => window.clearInterval(timer);
  }, [flight, paused]);

  const play = useCallback((order: RivalRaceOrderO6) => {
    const saved = onOrder(order);
    setError(!saved);
    if (saved) setClock(0);
    return saved;
  }, [onOrder]);

  const walk = useCallback((direction: RivalDirectionO6) => {
    if (!ready) return;
    setFacing(direction);
    setDraft(previous => ({ entry, x: rivalWalkO6(view.platform, previous.entry === entry ? previous.x : view.x, direction), movedAt: clock }));
  }, [clock, entry, ready, view.platform, view.x]);

  const jump = useCallback((direction: RivalDirectionO6 = facing) => {
    if (!ready || view.stage !== "cross" || !view.choice || view.platform === "lower" || view.platform === "flag") return;
    const order = { type: "jump", x, direction, beat } as const;
    const sim = simulateRivalJumpO6(view.platform, view.choice, order);
    if (!sim) return;
    setFacing(direction);
    setFlight({ order: sim.outcome === "same" ? null : order, frames: sim.frames, landing: sim.x, beat: sim.beat });
  }, [beat, facing, ready, view.choice, view.platform, view.stage, x]);

  const climb = useCallback(() => {
    if (!ready || !atLadder) return;
    const count = 24;
    const frames = Array.from({ length: count }, (_, i) => {
      const fraction = (i + 1) / count;
      const y = RIVAL_SUPPORTS_O6.lower.y + fraction * (RIVAL_SUPPORTS_O6.flag.y - RIVAL_SUPPORTS_O6.lower.y);
      return { x: RIVAL_LADDER_O6, y, beat: (beat + i) % RIVAL_ROOF_O6.cycle };
    });
    setFlight({ order: { type: "climb", x }, frames, landing: RIVAL_LADDER_O6, beat });
  }, [atLadder, beat, ready, x]);

  const land = useEffectEvent((motion: Flight) => {
    if (motion.order) play(motion.order);
    else {
      setDraft({ entry, x: motion.landing, movedAt: -10 });
      setClock((motion.beat - view.beat + RIVAL_ROOF_O6.cycle) % RIVAL_ROOF_O6.cycle);
    }
    setFlight(null);
    setAir(null);
  });
  useEffect(() => {
    if (paused || !flight) return;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const frameTime = reduced ? 5 : 16;
    let request = 0, started: number | undefined;
    function animate(now: number) {
      started ??= now;
      const index = Math.floor((now - started) / frameTime);
      const frame = flight!.frames[index];
      if (!frame) { land(flight!); return; }
      setAir(frame);
      request = requestAnimationFrame(animate);
    }
    request = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(request);
  }, [flight, paused]);

  const interact = useCallback(() => {
    if (!ready) return;
    if (atHarek && view.stage === "observe") play({ type: "observe", x });
    else if (atLadder) climb();
    else if (atFlag) play({ type: "finish", x });
  }, [atFlag, atHarek, atLadder, climb, play, ready, view.stage, x]);

  const padActions = useEffectEvent((move: RivalDirectionO6 | 0, confirm: boolean, warn: boolean) => {
    if (move) walk(move);
    if (view.stage === "choice" && atHarek && (confirm || warn)) play({ type: "choose", x, choice: warn ? "warn" : "race" });
    else if (confirm && view.stage === "cross") jump(move || facing);
    else if (confirm) interact();
  });
  useEffect(() => {
    if (!ready) return;
    let request = 0, lastStep = 0, pressed = true, warning = true;
    function poll(now: number) {
      const pad = navigator.getGamepads?.().find(item => item?.connected) ?? null;
      if (pad) {
        const { actions } = sampleNurseryControls(new Set(), new Set(), bindings, pad);
        const move = actions.move && now - lastStep >= 55 ? actions.move : 0;
        if (move) lastStep = now;
        const confirm = actions.confirm === true, warn = pad.buttons[1]?.pressed === true;
        if (move || (confirm && !pressed) || (warn && !warning)) padActions(move, confirm && !pressed, warn && !warning);
        pressed = confirm;
        warning = warn;
      } else { pressed = true; warning = true; }
      request = requestAnimationFrame(poll);
    }
    request = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(request);
  }, [bindings, ready]);

  const harekX = view.stage === "flag" ? RIVAL_FLAG_O6 + 27 : RIVAL_HAREK_POST_O6 + 31;
  const harekY = view.stage === "flag" ? RIVAL_SUPPORTS_O6.flag.y : RIVAL_SUPPORTS_O6.start.y;
  return <article ref={focus} tabIndex={0} className={styles.scene} aria-label="Le pari du rival" data-o6-m04
    data-stage={view.stage} data-position={x} data-facing={facing} data-platform={view.platform} data-beat={beat} data-flight={!!flight}
    onKeyDown={event => {
      if (!ready || event.altKey || event.ctrlKey || event.metaKey) return;
      const code = controlKeyCodeFromInput(event.nativeEvent);
      if (!code) return;
      const { actions } = sampleNurseryControls(new Set([code]), new Set(), bindings, null);
      if (actions.move) { event.preventDefault(); walk(actions.move); }
      else if (!event.repeat && !(event.target instanceof HTMLElement && event.target.closest("button"))) {
        if (bindings["hunt.jump"].includes(code)) { event.preventDefault(); jump(); }
        else if (bindings["hunt.interact"].includes(code)) { event.preventDefault(); interact(); }
      }
    }}>
    <header><h2>Le pari du rival</h2><p>Toits des Forges Profondes</p></header>
    <div className={styles.roof} aria-hidden="true">
      <div className={styles.factory} />
      <div className={styles.arch} style={{ left: pctX(270) }} />
      <div className={styles.arch} style={{ left: pctX(625) }} />
      <div className={styles.ladder} style={{ left: pctX(RIVAL_LADDER_O6), top: pctY(RIVAL_SUPPORTS_O6.flag.y),
        height: pctY(RIVAL_SUPPORTS_O6.lower.y - RIVAL_SUPPORTS_O6.flag.y) }} />
      {supports.map(support => {
        const surface = RIVAL_SUPPORTS_O6[support];
        const unused = (support === "beam" && view.choice === "warn") ||
          ((support === "bridgeA" || support === "bridgeB") && view.choice === "race");
        return <span key={support} className={styles.support} data-support={support} data-inactive={unused}
          style={{ left: pctX(surface.left + (support === "beam" ? rivalBeamShiftO6(position.beat) : 0)),
            top: pctY(surface.y), width: pctX(surface.right - surface.left) }} />;
      })}
      <span className={styles.post} style={{ left: pctX(RIVAL_HAREK_POST_O6), top: pctY(RIVAL_SUPPORTS_O6.start.y) }} />
      <span className={styles.flag} style={{ left: pctX(RIVAL_FLAG_O6), top: pctY(RIVAL_SUPPORTS_O6.flag.y) }} />
      <div className={styles.character} data-o6-harek-pose={view.stage === "choice" ? "hesitates" : view.choice === "warn" ? "warned" : "ready"}
        style={{ left: pctX(harekX), top: pctY(harekY) }}>
        <HomeworldCivilianV72 npcId="harek" role="apprentice" height={62} facing={view.stage === "flag" ? -1 : 1} />
        <span>Harek</span>
      </div>
      <div className={styles.character} style={{ left: pctX(position.x), top: pctY(position.y) }}>
        <HomeworldYouthMotionV72 seconds={clock * .042} moving={ready && draft.entry === entry && clock - draft.movedAt < 5} facing={facing} height={63} />
      </div>
    </div>
    <div className={styles.instructions}>
      <p role="status">{getCue(view, record.town.outcome)}</p>
      {error && <p role="alert">Le geste n’a pas été sauvegardé. Réessaie au même repère.</p>}
      <div className={styles.buttons}>
        <button type="button" disabled={!ready} aria-label="Marcher à gauche" onClick={() => walk(-1)}>←</button>
        <button type="button" disabled={!ready} aria-label="Marcher à droite" onClick={() => walk(1)}>→</button>
        {view.stage === "cross" && <button type="button" disabled={!ready} onClick={() => jump()}>Sauter</button>}
        {atHarek && view.stage === "observe" && <button type="button" disabled={!ready} onClick={interact}>Observer Harek</button>}
        {atHarek && view.stage === "choice" && <>
          <button type="button" disabled={!ready} onClick={() => play({ type: "choose", x, choice: "race" })}>Prendre la poutre</button>
          <button type="button" disabled={!ready} onClick={() => play({ type: "choose", x, choice: "warn" })}>Avertir Harek</button>
        </>}
        {atLadder && <button type="button" disabled={!ready} onClick={interact}>Remonter à l’échelle</button>}
        {atFlag && <button type="button" disabled={!ready} onClick={interact}>Retrouver Harek au fanion</button>}
      </div>
      <p className={styles.controls}>Marcher {controlActionShortcut(NURSERY_CONTROL_ACTIONS.left, bindings)} / {controlActionShortcut(NURSERY_CONTROL_ACTIONS.right, bindings)} ·
        Sauter {controlActionShortcut("hunt.jump", bindings)} · Agir {controlActionShortcut("hunt.interact", bindings)}</p>
    </div>
  </article>;
}
