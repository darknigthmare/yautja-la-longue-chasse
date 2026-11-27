"use client";
/** The Isles V1 · open-world mode prototype (docs/campagne/MODE_THE_ISLES_20261121.md, section 15.2):
 * test island view and the reverse hunt on Verdant, solo against the AI.
 * All state belongs to this mode's current run. */
import {useEffect, useRef, useState} from "react";
import tuningJson from "./data/islesTuningV1.json";
import testMapJson from "./data/islesMapTestV1.json";
import verdantMapJson from "./data/islesMapVerdantV1.json";
import rulesJson from "./data/islesReverseHuntV1.json";
import {screenToWorldMoveV1, stepCameraLeadV1, viewBasisV1, type IslesCameraTuningV1} from "./isles/islesCameraV1";
import {markerV1, parseIslesMapV1, type IslesMapSourceV1} from "./isles/islesMapV1";
import {createIslesActorV1, stepIslesActorV1, type IslesActorV1, type IslesCloakTuningV1, type IslesMovementTuningV1} from "./isles/islesMovementV1";
import {createReverseHuntV1, reversePhaseLabelV1, stepReverseHuntV1, type ReverseHuntRulesV1, type ReverseHuntStateV1} from "./isles/islesReverseHuntV1";
import {createIslesSceneV1, type IslesSceneV1, type IslesViewEntityV1} from "./isles/islesSceneV1";
import styles from "./IslesModeV1.module.css";

type PlayKind = "view" | "reverse";
const movement = tuningJson.movement as IslesMovementTuningV1;
const cloak = tuningJson.cloak as IslesCloakTuningV1;
const cameraTuning = tuningJson.camera as IslesCameraTuningV1;
const rules = rulesJson as unknown as ReverseHuntRulesV1;
const SIM_DT = 1 / 60;

const clock = (seconds: number) => {
  const s = Math.max(0, Math.ceil(seconds));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
};
const STATUS_LABELS: Record<string, string> = {active: "debout", downed: "à terre", dead: "mort", trophy: "trophée pris", escaped: "parti"};
const OUTCOME_LABELS: Record<string, string> = {
  fuite: "Les humains ont fui l’île.", tenir: "Les humains ont tenu jusqu’à la fin.", abattu: "Le Yautja a été abattu.",
  autodestruction: "L’autodestruction a emporté une partie de l’équipe.", "autodestruction-parfaite": "Tous les humains sont sortis du rayon.",
  chasse: "Aucun humain n’a quitté l’île.", "chasse-parfaite": "Chasse parfaite : tous les trophées pris.", faute: "Faute grave : un humain rendu a été frappé.",
  duel: "Le dernier humain a gagné le duel et s’enfuit.",
};

interface HudV1 {
  fps: number;
  actor: Pick<IslesActorV1, "cloaked" | "cloakEnergy" | "climbing" | "swimming" | "wading" | "running" | "y">;
  rotation: number;
  zoom: number;
  thermal: boolean;
  stats: {zones: number; terrainTriangles: number; instances: number; drawCalls: number};
  reverse?: {
    remaining: number; phase: string; night: boolean; rain: boolean; health: number; heat: number; overheated: boolean; honor: number;
    jammed: boolean; trophy: number | null; selfDestruct: string; selfDestructTimer: number; duel: string; canTrophy: boolean;
    humans: {id: string; name: string; role: string; status: string; armed: boolean; surrendered: boolean; carrying: string | null; health: number}[];
    pieces: {name: string; found: boolean; carried: boolean}[];
    extraction: string; eta: number; log: string[]; outcome: ReverseHuntStateV1["outcome"]; seed: number;
  };
}

declare global {
  interface Window { __islesV1?: Record<string, unknown> }
}

function IslesPlayV1({kind, seed, onQuit}: {kind: PlayKind; seed: number; onQuit: () => void}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const [hud, setHud] = useState<HudV1 | null>(null);
  const [failure, setFailure] = useState("");
  const [restart, setRestart] = useState(0);

  useEffect(() => {
    const canvas = canvasRef.current, labelLayer = labelsRef.current;
    if (!canvas || !labelLayer) return;
    const map = parseIslesMapV1((kind === "reverse" ? verdantMapJson : testMapJson) as unknown as IslesMapSourceV1, tuningJson.tileMeters);
    let scene: IslesSceneV1;
    try { scene = createIslesSceneV1(canvas, map, cameraTuning); } catch {
      queueMicrotask(() => setFailure("WebGL indisponible : le mode The Isles demande WebGL2."));
      return;
    }
    const spawn = markerV1(map, "spawn" in map.markers ? "spawn" : "yautjaDrop");
    let actor = createIslesActorV1(map, spawn.x, spawn.z, cloak);
    const match = kind === "reverse" ? createReverseHuntV1(map, rules, {movement, cloak}, seed) : null;
    if (match) actor = match.yautja.actor;
    const keys = new Set<string>(), pressed = new Set<string>();
    let rotation = 0, zoom = cameraTuning.defaultZoom, yaw = viewBasisV1(0, cameraTuning).yaw, zoomShown = cameraTuning.zoomHalfHeights[zoom];
    let lead = {x: 0, z: 0}, thermal = false, frames = 0, fps = 0, fpsAt = performance.now(), lastHud = 0;
    let acc = 0, last = performance.now(), raf = 0, stopped = false, seconds = 0;

    const down = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.closest?.("input,textarea,button")) return;
      if (["Space", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) event.preventDefault();
      if (!keys.has(event.code)) pressed.add(event.code);
      keys.add(event.code);
      if (event.code === "KeyR") rotation = (rotation + (event.shiftKey ? 3 : 1)) % 4;
      if (event.code === "KeyV") zoom = (zoom + 1) % cameraTuning.zoomHalfHeights.length;
      if (event.code === "KeyX" && !(match && match.yautja.jammedFor > 0)) thermal = !thermal;
    };
    const up = (event: KeyboardEvent) => keys.delete(event.code);
    const wheel = (event: WheelEvent) => {
      event.preventDefault();
      zoom = Math.min(cameraTuning.zoomHalfHeights.length - 1, Math.max(0, zoom + (event.deltaY > 0 ? 1 : -1)));
    };
    const blur = () => { keys.clear(); pressed.clear(); };
    window.addEventListener("keydown", down);
    window.addEventListener("keyup", up);
    window.addEventListener("blur", blur);
    canvas.addEventListener("wheel", wheel, {passive: false});
    const resize = () => scene.resize(canvas.clientWidth, canvas.clientHeight, window.devicePixelRatio || 1);
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);
    resize();
    canvas.focus({preventScroll: true});

    const held = (...codes: string[]) => codes.some(code => keys.has(code));
    const once = (code: string) => pressed.has(code);
    const moveInput = () => {
      const ix = (held("KeyD", "ArrowRight") ? 1 : 0) - (held("KeyA", "ArrowLeft") ? 1 : 0);
      const iy = (held("KeyW", "ArrowUp") ? 1 : 0) - (held("KeyS", "ArrowDown") ? 1 : 0);
      const length = Math.hypot(ix, iy) || 1;
      const world = screenToWorldMoveV1(ix / length, iy / length, viewBasisV1(rotation, cameraTuning));
      return {moveX: world.x, moveZ: world.z, run: held("ShiftLeft", "ShiftRight"), jump: once("Space"), cloak: once("KeyC")};
    };

    const simulate = (dt: number, first: boolean) => {
      const input = moveInput();
      if (!first) { input.jump = false; input.cloak = false; }
      if (match) {
        stepReverseHuntV1(match, {...input, strike: first && once("KeyE"), plasma: first && once("KeyF"), trophyHeld: held("KeyT"),
          selfDestruct: first && once("Enter"), acceptDuel: first && once("KeyY")}, map, rules, {movement, cloak}, dt);
        actor = match.yautja.actor;
        if (match.yautja.jammedFor > 0) thermal = false;
      } else {
        actor = stepIslesActorV1(actor, input, map, movement, cloak, dt).actor;
      }
      seconds += dt;
    };

    const entities = (): IslesViewEntityV1[] => {
      const list: IslesViewEntityV1[] = [];
      const hunterDown = match && match.yautja.health <= 0;
      list.push({id: "me", kind: "yautja", x: actor.x, y: actor.y, z: actor.z, facing: actor.facing, cloaked: actor.cloaked, opacity: hunterDown ? 0.6 : 1});
      if (match) {
        for (const h of match.humans) {
          if (h.status === "escaped" || h.status === "trophy") continue;
          list.push({id: h.id, kind: "human", x: h.x, y: 0, z: h.z, facing: h.facing, color: rules.roles[h.role].color,
            downed: h.status === "downed" || h.status === "dead", surrendered: !h.armed});
        }
        for (const p of match.pieces) if (!p.carrier && (p.found || thermal)) list.push({id: "piece-" + p.id, kind: "piece", x: p.x, y: 0, z: p.z, facing: 0});
        const ext = match.extraction;
        if (ext.phase === "landed") list.push({id: "plane", kind: "plane", x: ext.x, y: -0.4, z: ext.z, facing: Math.PI / 2});
        if (ext.phase === "calling" || ext.phase === "inbound") list.push({id: "beacon", kind: "beacon", x: match.mast.x, y: 0, z: match.mast.z, facing: 0});
        for (const beast of match.wildlife) if (beast.health > 0) list.push({id: beast.id, kind: "prey", x: beast.x, y: 0, z: beast.z, facing: beast.facing, color: "#c9a23a"});
      }
      return list;
    };

    const labels = () => {
      const wanted: {id: string; text: string; x: number; y: number; tone: string}[] = [];
      if (match) for (const h of match.humans) {
        if (h.status === "escaped" || h.status === "trophy" || h.status === "dead") continue;
        const at = scene.project(h.x, 2.3, h.z);
        if (at.visible) wanted.push({id: h.id, text: h.name + " · " + rules.roles[h.role].name + (h.armed ? "" : " · rendu") + (h.status === "downed" ? " · à terre" : ""),
          x: at.x, y: at.y, tone: h.armed ? "human" : "surrendered"});
      }
      while (labelLayer.children.length < wanted.length) labelLayer.appendChild(document.createElement("span"));
      [...labelLayer.children].forEach((node, i) => {
        const span = node as HTMLSpanElement, label = wanted[i];
        if (!label) { span.hidden = true; return; }
        span.hidden = false; span.textContent = label.text; span.dataset.tone = label.tone;
        span.style.transform = `translate(${label.x.toFixed(1)}px, ${label.y.toFixed(1)}px) translate(-50%, -100%)`;
      });
    };

    const publish = (now: number) => {
      const reverse = match ? (() => {
        const a = match.yautja.actor;
        return {
          remaining: rules.durationSeconds - match.time, phase: reversePhaseLabelV1(match, rules), night: match.night, rain: match.rain,
          health: match.yautja.health / rules.yautja.health, heat: match.yautja.heat / rules.yautja.plasmaOverheat, overheated: match.yautja.overheated,
          honor: match.yautja.honor, jammed: match.yautja.jammedFor > 0,
          trophy: match.yautja.trophy ? match.yautja.trophy.progress / match.yautja.trophy.needed : null,
          selfDestruct: match.yautja.selfDestruct.phase, selfDestructTimer: match.yautja.selfDestruct.timer, duel: match.yautja.duel.phase,
          canTrophy: match.humans.some(h => h.status === "downed" && Math.hypot(h.x - a.x, h.z - a.z) < rules.trophy.range),
          humans: match.humans.map(h => ({id: h.id, name: h.name, role: rules.roles[h.role].name, status: h.status, armed: h.armed,
            surrendered: h.disarmedFor > 0, carrying: h.carrying ? match.pieces.find(p => p.id === h.carrying)!.name : null, health: h.health})),
          pieces: match.pieces.map(p => ({name: p.name, found: p.found, carried: Boolean(p.carrier)})),
          extraction: match.extraction.phase, eta: match.extraction.eta, log: match.log.slice(-5).map(l => clock(l.at) + " · " + l.text),
          outcome: match.outcome, seed: match.seed,
        };
      })() : undefined;
      setHud({fps, actor: {cloaked: actor.cloaked, cloakEnergy: actor.cloakEnergy, climbing: actor.climbing, swimming: actor.swimming,
        wading: actor.wading, running: actor.running, y: actor.y}, rotation, zoom, thermal, stats: scene.stats(), reverse});
      lastHud = now;
    };

    const frame = (now: number) => {
      if (stopped) return;
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now; acc += dt;
      let first = true;
      while (acc >= SIM_DT) { simulate(SIM_DT, first); first = false; acc -= SIM_DT; }
      if (!first) pressed.clear();
      lead = stepCameraLeadV1(lead, {x: actor.vx, z: actor.vz}, actor.running, cameraTuning, dt);
      const wantYaw = viewBasisV1(rotation, cameraTuning).yaw;
      let turn = wantYaw - yaw; turn = Math.atan2(Math.sin(turn), Math.cos(turn));
      yaw += turn * Math.min(1, dt * 10);
      zoomShown += (cameraTuning.zoomHalfHeights[zoom] - zoomShown) * Math.min(1, dt * 8);
      const list = entities();
      scene.render({target: {x: actor.x + lead.x, y: Math.max(0, actor.y) * 0.85, z: actor.z + lead.z}, feet: {x: actor.x, y: actor.y, z: actor.z},
        yaw, zoomHalfHeight: zoomShown, entities: list, thermal, night: match?.night, seconds});
      labels();
      frames++;
      if (now - fpsAt >= 1000) { fps = Math.round(frames * 1000 / (now - fpsAt)); frames = 0; fpsAt = now; }
      if (now - lastHud > 100) publish(now);
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);

    if (process.env.NEXT_PUBLIC_ISLES_V1_QA === "1" && navigator.webdriver) {
      // Browser QA hooks (scripts/qa-isles-browser-v1.mjs); absent for players.
      window.__islesV1 = {
        kind, actor: () => actor, match: () => match, stats: () => scene.stats(), rotation: () => rotation,
        cutaway: (enabled: boolean) => scene.setCutaway(enabled), project: (x: number, y: number, z: number) => scene.project(x, y, z),
        place: (x: number, z: number, y = 0) => { actor = {...actor, x, y, z, vx: 0, vy: 0, vz: 0}; if (match) match.yautja.actor = actor; },
        advance: (secondsToRun: number) => { for (let i = 0; i < Math.round(secondsToRun / SIM_DT); i++) simulate(SIM_DT, false); },
      };
    }
    return () => {
      stopped = true;
      cancelAnimationFrame(raf);
      observer.disconnect();
      window.removeEventListener("keydown", down);
      window.removeEventListener("keyup", up);
      window.removeEventListener("blur", blur);
      canvas.removeEventListener("wheel", wheel);
      scene.dispose();
      delete window.__islesV1;
    };
  }, [kind, seed, restart]);

  const r = hud?.reverse;
  return <div className={styles.play} data-isles-play-v1={kind} data-isles-thermal={hud?.thermal ? "on" : "off"}>
    <canvas ref={canvasRef} className={styles.canvas} tabIndex={0} aria-label={kind === "reverse" ? "Verdant, vue isométrique de la Chasse inversée" : "Île de test, vue isométrique"} />
    <div ref={labelsRef} className={styles.labels} aria-hidden="true" />
    {r?.rain ? <div className={styles.rain} aria-hidden="true" /> : null}
    {r?.jammed ? <div className={styles.jam} aria-hidden="true" /> : null}
    {failure ? <p role="alert" className={styles.failure}>{failure}</p> : null}
    <header className={styles.topbar}>
      <button type="button" className={styles.quit} onClick={onQuit}>Quitter</button>
      {r ? <>
        <span className={styles.chip} data-isles-timer><b>{clock(r.remaining)}</b> {r.phase}</span>
        <span className={styles.chip}>{r.night ? "Nuit" : "Jour"}{r.rain ? " · pluie" : ""}</span>
        <span className={styles.chip}>Honneur <b>{r.honor}</b></span>
      </> : null}
      {hud ? <span className={styles.chip} data-isles-camera>Vue {["N-E", "S-E", "S-O", "N-O"][hud.rotation]} · {cameraTuning.zoomNames[hud.zoom]}{hud.thermal ? " · thermique" : ""}</span> : null}
    </header>
    {hud ? <aside className={styles.status} aria-label="État du chasseur">
      {r ? <><label>Santé<meter min={0} max={1} value={r.health} /></label>
        <label>Plasma{r.overheated ? " (surchauffe)" : ""}<meter min={0} max={1} value={r.heat} high={0.8} /></label></> : null}
      <label>Camouflage{hud.actor.cloaked ? " actif" : ""}<meter min={0} max={cloak.capacity} value={hud.actor.cloakEnergy} /></label>
      <p className={styles.motion}>{hud.actor.climbing ? "Escalade" : hud.actor.swimming ? "Nage (camouflage impossible)" : hud.actor.wading ? "Dans l’eau" : hud.actor.running ? "Course" : "Marche"} · hauteur {hud.actor.y.toFixed(1)} m</p>
      {kind === "view" ? <p className={styles.tech} data-isles-stats>{hud.stats.zones} zones de 32 × 32 · {hud.stats.terrainTriangles} triangles · {hud.stats.instances} objets instanciés · {hud.stats.drawCalls} appels · {hud.fps} i/s</p> : null}
    </aside> : null}
    {r ? <aside className={styles.team} aria-label="Équipe humaine">
      <h3>Équipe ({r.humans.filter(h => h.status === "active" || h.status === "downed").length} en vie)</h3>
      <ul>{r.humans.map(h => <li key={h.id} data-status={h.status}>
        <b>{h.name}</b> {h.role} · {STATUS_LABELS[h.status]}{h.surrendered ? " · rendu" : ""}{h.carrying ? " · porte " + h.carrying : ""}
      </li>)}</ul>
      <h3>Sortie</h3>
      <ul>{r.pieces.map(p => <li key={p.name} data-found={p.found}>{p.name} : {p.carried ? "portée" : p.found ? "au sol" : "introuvable"}</li>)}</ul>
      <p>{r.extraction === "none" ? "Extraction pas appelée" : r.extraction === "calling" ? "Appel radio en cours" : r.extraction === "inbound" ? "Hydravion dans " + clock(r.eta) : r.extraction === "landed" ? "Hydravion posé sur le fleuve" : "Hydravion reparti"}</p>
    </aside> : null}
    <footer className={styles.footer}>
      {r ? <div className={styles.prompts} role="status">
        {r.trophy !== null ? <p>Prélèvement du trophée… <meter min={0} max={1} value={r.trophy} /></p> : r.canTrophy ? <p>Maintenir <kbd>T</kbd> : prendre le trophée</p> : null}
        {r.selfDestruct === "offered" ? <p className={styles.alert}><kbd>Entrée</kbd> : déclencher l’autodestruction</p> : null}
        {r.selfDestruct === "counting" ? <p className={styles.alert}>Autodestruction dans {Math.ceil(r.selfDestructTimer)} s</p> : null}
        {r.duel === "offered" ? <p className={styles.alert}><kbd>Y</kbd> : accepter le duel (masque et armes à distance retirés)</p> : null}
        {r.jammed ? <p className={styles.alert}>Biomask brouillé</p> : null}
        <ul className={styles.log}>{r.log.map((line, i) => <li key={i}>{line}</li>)}</ul>
      </div> : null}
      <p className={styles.keys}><kbd>ZQSD</kbd>/<kbd>WASD</kbd> se déplacer · <kbd>Maj</kbd> courir · <kbd>Espace</kbd> sauter · pousser contre une paroi : grimper · <kbd>C</kbd> camouflage · <kbd>X</kbd> thermique · <kbd>R</kbd> tourner · <kbd>V</kbd>/molette zoom{kind !== "view" ? <> · <kbd>E</kbd> frapper</> : null}{kind === "reverse" ? <> · <kbd>F</kbd> plasma · <kbd>T</kbd> trophée</> : null}</p>
    </footer>
    {r?.outcome ? <div className={styles.outcome} role="dialog" aria-modal="true" aria-labelledby="isles-outcome-title" data-isles-outcome={r.outcome.kind}>
      <h2 id="isles-outcome-title">{r.outcome.winner === "humans" ? "Victoire des humains" : "Victoire du Yautja"}</h2>
      <p>{OUTCOME_LABELS[r.outcome.kind]}</p>
      <p>Honneur {r.outcome.honor} · humains partis {r.outcome.escaped} · en vie {r.outcome.alive} · score humain {r.outcome.humanScore}</p>
      <div><button type="button" onClick={() => setRestart(value => value + 1)}>Rejouer</button><button type="button" onClick={onQuit}>Retour aux Îles</button></div>
    </div> : null}
  </div>;
}

/** Hub of the mode, then the chosen prototype. */
export default function IslesModeV1({onExit}: {onExit: () => void}) {
  const [play, setPlay] = useState<{kind: PlayKind; seed: number} | null>(null);
  const [seed, setSeed] = useState(() => 1 + Math.floor(Math.random() * 99999));
  if (play) return <IslesPlayV1 {...play} onQuit={() => { setPlay(null); setSeed(1 + Math.floor(Math.random() * 99999)); }} />;
  return <section className={styles.hub} aria-labelledby="isles-title" data-isles-hub-v1="true">
    <header>
      <p className={styles.eyebrow}>Mode de jeu · prototype</p>
      <h2 id="isles-title">The Isles</h2>
      <p>Un archipel du présent, en vue isométrique. Ce mode n’a aucun effet sur la campagne.</p>
      <button type="button" className={styles.back} onClick={onExit}>Retour au menu</button>
    </header>
    <div className={styles.cards}>
      <article>
        <h3>Prototype de vue</h3>
        <p>Île de test : course, saut, escalade des falaises, arbres et murs, nage, camouflage. Caméra isométrique à 35°, 4 rotations, 3 zooms, anticipation à la course et découpe du décor devant le chasseur.</p>
        <button type="button" data-isles-start="view" onClick={() => setPlay({kind: "view", seed})}>Explorer l’île de test</button>
      </article>
      <article>
        <h3>Chasse inversée · Verdant</h3>
        <p>Vous êtes le Yautja. Cinq humains pilotés par l’IA cherchent la radio, la batterie et les fusées, appellent l’hydravion et tentent de fuir en 15 minutes. Code d’honneur appliqué.</p>
        <label>Graine de la partie <input type="number" min={1} max={99999} value={seed} onChange={event => setSeed(Math.max(1, Math.min(99999, Number(event.target.value) || 1)))} /></label>
        <button type="button" data-isles-start="reverse" onClick={() => setPlay({kind: "reverse", seed})}>Lancer la chasse</button>
      </article>
    </div>
  </section>;
}
