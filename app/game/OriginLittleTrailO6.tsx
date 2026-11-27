"use client";

import { useCallback, useEffect, useEffectEvent, useRef, useState } from "react";
import { controlActionShortcut } from "./controlBindingLabels";
import HomeworldCivilianV72 from "./HomeworldCivilianV72";
import HomeworldYouthMotionV72 from "./HomeworldYouthMotionV72";
import { drawLittleTrailO6, loadLittleTrailArtO6, type LittleTrailImagesO6, type LittleTrailPreyMotionO6 } from "./littleTrailArtO6";
import { controlKeyCodeFromInput, type ControlBindings } from "./systems/controlBindings";
import { LITTLE_TRAIL_O6 as route, littleTrailAnchorO6, littleTrailCloseO6, littleTrailOrdersAtO6, littleTrailThreatO6,
  walkLittleTrailO6, type LittleTrailCueO6, type LittleTrailOrderO6, type LittleTrailViewO6 } from "./systems/littleTrailRouteO6";
import { NURSERY_CONTROL_ACTIONS, sampleNurseryControls } from "./systems/nurseryControls";
import { littleTrailViewO6, type LittleTrailRecordO6 } from "./systems/originLittleTrailO6";
import styles from "./OriginLittleTrailO6.module.css";

interface Props {
  record: LittleTrailRecordO6;
  bindings: ControlBindings;
  paused: boolean;
  onOrder(order: LittleTrailOrderO6): boolean;
  onCue(cue: LittleTrailCueO6): void;
}
const px = (x: number) => (x / route.width * 100) + "%";
const py = (y: number) => (y / route.height * 100) + "%";

function instruction(view: LittleTrailViewO6, rival: LittleTrailRecordO6["rival"]) {
  switch (view.stage) {
    case "first": return rival.success
      ? "Saar · « Cette fois le fanion attendra. Laisse le brouteur s’arrêter et observe-le à distance. »"
      : "Saar · « Tu as retrouvé le fanion depuis le palier. Ici, ralentis dès les premières traces et laisse passer le brouteur. »";
    case "listen":
      if (!view.heard.length) return "Le brouteur s’est arrêté puis a changé d’appui. Écoute près du gravillon et près de l’écorce.";
      if (view.heard.length === 1) return "Un repère est relevé. Va écouter l’autre pour distinguer le choc sec du frottement.";
      return "Deux chocs secs contre la pierre. Un frottement prolongé sur l’écorce. Quel son révèle le passage du brouteur ?";
    case "far": return "Le frottement vient du tronc. Observe son second arrêt avant de rejoindre le passage de retour.";
    case "search-anchor": return view.lastConfirmed
      ? "La proie s’est éloignée. Reviens au dernier arrêt confirmé pour repartir de son empreinte."
      : "La proie s’est éloignée avant ton premier relevé. Reviens aux traces dans le talus.";
    case "search-old": return "Les bords de cette empreinte sont nets. Retrouve les traces effacées près de la branche pour orienter ton retour.";
    case "rise": return "Rejoins les racines à droite. Elles donnent accès au sentier en surplomb.";
    case "return": return "Reviens par le sentier haut jusqu’à Saar et à la cohorte.";
    case "report": return rival.success
      ? rival.memory === "warning" ? "Harek a entendu le choc sec. Yena a relevé la pause au tronc. Saar te demande de partager ce que tu as retenu."
        : "Harek a repéré le chemin haut. Yena a regardé où le brouteur ralentit. Saar attend ton relevé."
      : "Tov a retrouvé les empreintes qui perdaient leur contour. Yena a repéré le sentier haut. Saar attend ton relevé.";
    default: return "";
  }
}

function label(order: LittleTrailOrderO6) {
  switch (order.type) {
    case "observe": return "Observer l’arrêt";
    case "sample": return order.cue === "pebble" ? "Écouter près de la pierre" : "Écouter près de l’écorce";
    case "identify": return order.cue === "rub" ? "Suivre le frottement" : "Suivre le choc sec";
    case "scan-anchor": return "Relire l’empreinte";
    case "scan-old": return "Lire les traces anciennes";
    case "ascend": return "Grimper par les racines";
    case "compare": return "Comparer devant Saar";
    case "report": return order.choice === "map" ? "Rapporter la carte de trajet" : "Expliquer le comportement";
    default: return "";
  }
}

function mark(view: LittleTrailViewO6) {
  switch (view.stage) {
    case "first": return route.first - 80;
    case "far": return route.far - 80;
    case "listen": return !view.heard.includes("pebble") ? route.pebble : route.rub;
    case "search-anchor": return littleTrailAnchorO6(view);
    case "search-old": return route.old;
    case "rise": return route.climb;
    case "return":
    case "report": return route.gather;
    default: return null;
  }
}

export default function OriginLittleTrailO6({ record, bindings, paused, onOrder, onCue }: Props) {
  const root = useRef<HTMLElement>(null), canvas = useRef<HTMLCanvasElement>(null);
  const [art, setArt] = useState<LittleTrailImagesO6 | null>(null);
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [assetError, setAssetError] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [facing, setFacing] = useState<-1 | 1>(1);
  const [draft, setDraft] = useState({ entry: -1, x: 0, steps: 0 });
  const [prey, setPrey] = useState<LittleTrailPreyMotionO6 | null>(null);
  const [travel, setTravel] = useState<LittleTrailOrderO6 | null>(null);
  const [climbFrame, setClimbFrame] = useState(0);

  const entry = record.journal.length, view = littleTrailViewO6(record);
  const x = draft.entry === entry ? draft.x : view.x;
  const available = !paused && art !== null && !travel;
  const groundY = view.plane === "trail" ? route.bottom : route.overlook;
  const poseY = travel ? route.bottom - Math.min(1, climbFrame / 18) * (route.bottom - route.overlook) : groundY;
  const orders = littleTrailOrdersAtO6(view, x).filter(order => order.type !== "lose");
  const cue = view.stage === "listen" && !orders.some(order => order.type === "sample")
    ? view.heard.find(sound => littleTrailCloseO6(x, route[sound])) : undefined;
  const target = mark(view);
  const group = view.stage === "return" || view.stage === "report";
  const partner = record.rival.success ? "harek" : "tov";

  useEffect(() => { root.current?.focus(); }, []);
  useEffect(() => {
    let active = true;
    loadLittleTrailArtO6().then(value => { if (active) setArt(value); }, () => { if (active) setAssetError(true); });
    return () => { active = false; };
  }, [loadAttempt]);

  useEffect(() => {
    const ctx = canvas.current?.getContext("2d");
    if (ctx && art) drawLittleTrailO6(ctx, art, view, prey);
  }, [art, view, prey]);

  const play = useCallback((order: LittleTrailOrderO6) => {
    const saved = onOrder(order);
    setSaveError(!saved);
    if (saved) {
      if (order.type === "sample") onCue(order.cue);
      if (order.type === "observe" && view.stage === "first") setPrey({ x: route.first, step: 0, flee: false });
      if (order.type === "lose" || (order.type === "identify" && order.cue === "pebble")) {
        setPrey({ x: view.stage === "first" ? route.first : route.far, step: 0, flee: true });
      }
    }
    return saved;
  }, [onCue, onOrder, view.stage]);

  useEffect(() => {
    if (!prey || paused) return;
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 7 : 29;
    const timer = window.setTimeout(() => setPrey(current => {
      if (!current) return null;
      const stop = current.flee ? route.width + 60 : route.far;
      const x = Math.min(stop, current.x + (current.flee ? 33 : 18));
      return x === stop ? null : { ...current, x, step: current.step + 1 };
    }), duration);
    return () => window.clearTimeout(timer);
  }, [paused, prey]);

  const completeClimb = useEffectEvent((event: LittleTrailOrderO6) => {
    play(event);
    setTravel(null);
    setClimbFrame(0);
  });
  useEffect(() => {
    if (!travel || paused) return;
    const duration = window.matchMedia("(prefers-reduced-motion: reduce)").matches ? 8 : 22;
    let frame = 0, start: number | undefined;
    function climb(now: number) {
      start ??= now;
      const index = Math.floor((now - start) / duration);
      if (index >= 18) { completeClimb(travel!); return; }
      setClimbFrame(index);
      frame = requestAnimationFrame(climb);
    }
    frame = requestAnimationFrame(climb);
    return () => cancelAnimationFrame(frame);
  }, [paused, travel]);

  const walk = useCallback((direction: -1 | 1) => {
    if (!available) return;
    const next = walkLittleTrailO6(view.plane, x, direction);
    setFacing(direction);
    if (littleTrailThreatO6(view, next)) play({ type: "lose", x: next, plane: view.plane });
    else setDraft({ entry, x: next, steps: draft.steps + Number(next !== x) });
  }, [available, draft.steps, entry, play, view, x]);

  const act = useCallback((order: LittleTrailOrderO6) => {
    if (!available) return;
    if (order.type === "ascend") setTravel(order);
    else play(order);
  }, [available, play]);

  const interact = useEffectEvent((move: -1 | 1 | 0, primary: boolean, secondary: boolean) => {
    if (move) walk(move);
    const order = secondary ? orders[1] : primary ? orders[0] : undefined;
    if (order) act(order);
  });
  useEffect(() => {
    if (!available) return;
    let frame = 0, at = 0, pressed = true, opposed = true;
    function poll(now: number) {
      const pad = navigator.getGamepads?.().find(item => item?.connected) ?? null;
      if (pad) {
        const { actions } = sampleNurseryControls(new Set(), new Set(), bindings, pad);
        const move = actions.move && now - at >= 55 ? actions.move : 0;
        const confirm = actions.confirm === true, second = pad.buttons[1]?.pressed === true;
        if (move) at = now;
        if (move || (confirm && !pressed) || (second && !opposed)) interact(move, confirm && !pressed, second && !opposed);
        pressed = confirm;
        opposed = second;
      } else { pressed = true; opposed = true; }
      frame = requestAnimationFrame(poll);
    }
    frame = requestAnimationFrame(poll);
    return () => cancelAnimationFrame(frame);
  }, [available, bindings]);

  return <article ref={root} tabIndex={0} className={styles.scene} data-o6-m05 data-stage={view.stage}
    data-plane={view.plane} data-position={x} data-last-confirmed={record.lastConfirmed?.x} data-art-ready={art !== null}
    aria-label="La petite piste" onKeyDown={event => {
      if (!available || event.altKey || event.ctrlKey || event.metaKey) return;
      const code = controlKeyCodeFromInput(event.nativeEvent);
      if (!code) return;
      const { actions } = sampleNurseryControls(new Set([code]), new Set(), bindings, null);
      if (actions.move) { event.preventDefault(); walk(actions.move); }
      else if (!event.repeat && bindings["hunt.interact"].includes(code) &&
        !(event.target instanceof HTMLElement && event.target.closest("button"))) {
        event.preventDefault();
        if (orders.length === 1) act(orders[0]);
        else if (orders.length === 0 && cue) onCue(cue);
      }
    }}>
    <header><h2>La petite piste</h2><p>Lisière des Forges Profondes</p></header>
    <div className={styles.world} aria-hidden="true">
      <canvas ref={canvas} width={route.width} height={route.height} />
      {target !== null && <span className={styles.mark} style={{ left: px(target), top: py(groundY) }} />}
      {view.stage === "first" && <div className={styles.actor} style={{ left: px(route.start - 33), top: py(route.bottom) }}>
        <HomeworldCivilianV72 npcId="saar" role="instructor" height={79} />
        <span className={styles.name}>Saar</span>
      </div>}
      {group && <>
        <div className={styles.actor} style={{ left: px(route.gather - 27), top: py(route.overlook) }}>
          <HomeworldCivilianV72 npcId="saar" role="instructor" height={79} />
          <span className={styles.name}>Saar</span>
        </div>
        <div className={styles.actor} style={{ left: px(route.gather - 63), top: py(route.overlook) }}>
          <HomeworldCivilianV72 npcId="yena" role="apprentice" height={61} />
          <span className={styles.name}>Yena</span>
        </div>
        <div className={styles.actor} style={{ left: px(route.gather + 47), top: py(route.overlook) }}>
          <HomeworldCivilianV72 npcId={partner} role="apprentice" height={62} facing={-1} />
          <span className={styles.name}>{partner === "harek" ? "Harek" : "Tov"}</span>
        </div>
      </>}
      <div className={styles.actor} style={{ left: px(travel ? route.climb : x), top: py(poseY) }}>
        <HomeworldYouthMotionV72 seconds={draft.steps * .12} moving={draft.entry === entry || travel !== null} facing={facing} height={65} />
      </div>
    </div>
    <div className={styles.instructions}>
      {assetError && <p role="alert">Le décor de la lisière n’a pas chargé. <button type="button" onClick={() => { setAssetError(false); setLoadAttempt(attempt => attempt + 1); }}>Recharger le décor</button></p>}
      {!art && !assetError && <p role="status">Chargement de la lisière…</p>}
      <p role="status">{instruction(view, record.rival)}</p>
      {view.stage === "listen" && view.heard.length > 0 &&
        <p className={styles.note}>{view.heard.map(sound => sound === "pebble" ? "Pierre · deux chocs secs" : "Écorce · frottement prolongé").join("  /  ")}</p>}
      {saveError && <p role="alert">Le geste n’a pas été sauvegardé. Réessaie depuis le même repère.</p>}
      <div className={styles.buttons}>
        <button type="button" disabled={!available} aria-label="Marcher à gauche" onClick={() => walk(-1)}>←</button>
        <button type="button" disabled={!available} aria-label="Marcher à droite" onClick={() => walk(1)}>→</button>
        {orders.map(order => <button type="button" key={label(order)} disabled={!available} onClick={() => act(order)}>{label(order)}</button>)}
        {cue && <button type="button" disabled={!available} onClick={() => onCue(cue)}>Réécouter ce bruit</button>}
      </div>
      <p className={styles.keys}>Marcher {controlActionShortcut(NURSERY_CONTROL_ACTIONS.left, bindings)} / {controlActionShortcut(NURSERY_CONTROL_ACTIONS.right, bindings)} · Agir {controlActionShortcut("hunt.interact", bindings)}</p>
    </div>
  </article>;
}
