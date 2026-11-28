"use client";
/** The Isles V1 · open-world mode (docs/campagne/MODE_THE_ISLES_20261121.md, section 15.2):
 * the view prototype on the test island, the reverse hunt on Verdant, solo against the AI,
 * and Verdant in free hunt (step 4). The free hunt keeps its progress in its own `islesV1`
 * profile; nothing here touches the campaign. */
import {useEffect, useRef, useState} from "react";
import tuningJson from "./data/islesTuningV1.json";
import testMapJson from "./data/islesMapTestV1.json";
import verdantMapJson from "./data/islesMapVerdantV1.json";
import rulesJson from "./data/islesReverseHuntV1.json";
import freeRulesJson from "./data/islesFreeHuntV1.json";
import verdantWorldJson from "./data/islesVerdantWorldV1.json";
import modelsJson from "./data/islesModelsV1.json";
import {screenToWorldMoveV1, stepCameraLeadV1, viewBasisV1, type IslesCameraTuningV1} from "./isles/islesCameraV1";
import {markerV1, parseIslesMapV1, tileCenterV1, type IslesMapSourceV1, type IslesMapV1} from "./isles/islesMapV1";
import {createIslesActorV1, stepIslesActorV1, type IslesActorV1, type IslesCloakTuningV1, type IslesMovementTuningV1} from "./isles/islesMovementV1";
import {createReverseHuntV1, reversePhaseLabelV1, stepReverseHuntV1, type ReverseHuntRulesV1, type ReverseHuntStateV1} from "./isles/islesReverseHuntV1";
import {createFreeHuntV1, freeHuntClockV1, freeHuntReputationV1, stepFreeHuntV1, type FreeHuntRulesV1, type FreeHuntStateV1, type FreeHuntWorldV1} from "./isles/islesFreeHuntV1";
import {islesReputationV1, loadIslesProfileV1, saveIslesProfileV1, type IslesProfileV1, type IslesStorageV1} from "./isles/islesSaveV1";
import {generateIslesWorldV1, type IslesWorldSourceV1} from "./isles/islesWorldGenV1";
import {createIslesSceneV1, type IslesModelSpecV1, type IslesSceneV1, type IslesViewEntityV1} from "./isles/islesSceneV1";
import styles from "./IslesModeV1.module.css";

type PlayKind = "view" | "reverse" | "free";
const movement = tuningJson.movement as IslesMovementTuningV1;
const cloak = tuningJson.cloak as IslesCloakTuningV1;
const cameraTuning = tuningJson.camera as IslesCameraTuningV1;
const rules = rulesJson as unknown as ReverseHuntRulesV1;
const freeRules = freeRulesJson as unknown as FreeHuntRulesV1;
const models = modelsJson.models as Record<string, IslesModelSpecV1>;
const SIM_DT = 1 / 60;

const clock = (seconds: number) => {
  const s = Math.max(0, Math.ceil(seconds));
  return Math.floor(s / 60) + ":" + String(s % 60).padStart(2, "0");
};
const hourText = (hour: number) => String(Math.floor(hour)).padStart(2, "0") + " h " + String(Math.floor((hour % 1) * 60)).padStart(2, "0");
const STATUS_LABELS: Record<string, string> = {active: "debout", downed: "à terre", dead: "mort", trophy: "trophée pris", escaped: "parti"};
const OUTCOME_LABELS: Record<string, string> = {
  fuite: "Les humains ont fui l’île.", tenir: "Les humains ont tenu jusqu’à la fin.", abattu: "Le Yautja a été abattu.",
  autodestruction: "L’autodestruction a emporté des membres de l’équipe.", "autodestruction-parfaite": "Tous les humains sont sortis du rayon.",
  chasse: "Aucun humain n’a quitté l’île.", "chasse-parfaite": "Chasse parfaite : tous les trophées pris.", faute: "Faute grave : un humain rendu a été frappé.",
  duel: "Le dernier humain a gagné le duel et s’enfuit.",
};
const MISSION_STEPS: Record<string, string> = {
  camp: "Rejoindre le camp des braconniers, à l’ouest du fleuve.", traces: "Lire les trois traces du camp (G).", radio: "Écouter la radio du camp sans être vu.",
  chief: "Tuer le chef du camp (à la lame pour l’honneur).", contract: "Fouiller le corps du chef (G).",
};

function storage(): IslesStorageV1 | null {
  try { return typeof window !== "undefined" ? window.localStorage : null; } catch { return null; }
}

interface FreeHudV1 {
  hour: number; day: number; night: boolean; moonless: boolean; alert: number; reputation: number; honor: number; health: number; heat: number; overheated: boolean;
  carried: string[]; trophyProgress: number | null; prompt: string; contracts: {text: string; reward: number; done: boolean; accepted: boolean}[];
  mission: string | null; trial: string | null; log: string[]; dead: boolean; lair: boolean; fragments: number; saved: string;
}

interface HudV1 {
  fps: number;
  actor: Pick<IslesActorV1, "cloaked" | "cloakEnergy" | "climbing" | "swimming" | "wading" | "running" | "y">;
  rotation: number;
  zoom: number;
  thermal: boolean;
  stats: {zones: number; terrainTriangles: number; instances: number; drawCalls: number; modelsReady: number};
  reverse?: {
    remaining: number; phase: string; night: boolean; rain: boolean; health: number; heat: number; overheated: boolean; honor: number;
    jammed: boolean; trophy: number | null; selfDestruct: string; selfDestructTimer: number; duel: string; canTrophy: boolean;
    humans: {id: string; name: string; role: string; status: string; armed: boolean; surrendered: boolean; carrying: string | null; health: number}[];
    pieces: {name: string; found: boolean; carried: boolean}[];
    extraction: string; eta: number; log: string[]; outcome: ReverseHuntStateV1["outcome"]; seed: number;
  };
  free?: FreeHudV1;
}

declare global {
  interface Window { __islesV1?: Record<string, unknown> }
}

const MAP_COLORS: Record<string, [number, number, number]> = {
  water: [36, 84, 112], ford: [86, 126, 108], sand: [210, 190, 132], grass: [104, 146, 70], jungle: [58, 100, 48], mud: [118, 96, 66], road: [134, 124, 110],
  bush: [70, 116, 52], crate: [134, 102, 56], rock: [134, 132, 122], tree: [32, 66, 28], wall: [180, 168, 146], roof: [150, 76, 50], pillar: [164, 158, 146], ruin: [196, 186, 146],
};

/** The island seen from above, for the map key (M). */
function drawIslandMap(canvas: HTMLCanvasElement, map: IslesMapV1, step: number) {
  const size = Math.ceil(map.width / step);
  canvas.width = size; canvas.height = size;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  const image = ctx.createImageData(size, size);
  for (let z = 0; z < size; z++) for (let x = 0; x < size; x++) {
    const i = Math.min(map.depth - 1, z * step) * map.width + Math.min(map.width - 1, x * step);
    const c = MAP_COLORS[map.kinds[i]] ?? [0, 0, 0], o = (z * size + x) * 4;
    image.data[o] = c[0]; image.data[o + 1] = c[1]; image.data[o + 2] = c[2]; image.data[o + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);
}

function IslesPlayV1({kind, seed, onQuit}: {kind: PlayKind; seed: number; onQuit: () => void}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const labelsRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLCanvasElement>(null);
  const [hud, setHud] = useState<HudV1 | null>(null);
  const [failure, setFailure] = useState("");
  const [restart, setRestart] = useState(0);
  const [mapOpen, setMapOpen] = useState(false);
  const [mapMarks, setMapMarks] = useState<{x: number; z: number; label: string; tone: string}[]>([]);

  useEffect(() => {
    const canvas = canvasRef.current, labelLayer = labelsRef.current;
    if (!canvas || !labelLayer) return;
    let world: FreeHuntWorldV1 | null = null;
    if (kind === "free") world = generateIslesWorldV1(verdantWorldJson as unknown as IslesWorldSourceV1, tuningJson.tileMeters);
    const map = world?.map ?? parseIslesMapV1((kind === "reverse" ? verdantMapJson : testMapJson) as unknown as IslesMapSourceV1, tuningJson.tileMeters);
    let scene: IslesSceneV1;
    try { scene = createIslesSceneV1(canvas, map, cameraTuning, {models, streamRadius: 3}); } catch {
      queueMicrotask(() => setFailure("WebGL indisponible : le mode The Isles demande WebGL2."));
      return;
    }
    const spawn = markerV1(map, "spawn" in map.markers ? "spawn" : "yautjaDrop");
    let actor = createIslesActorV1(map, spawn.x, spawn.z, cloak);
    const match = kind === "reverse" ? createReverseHuntV1(map, rules, {movement, cloak}, seed) : null;
    if (match) actor = match.yautja.actor;
    const loaded = kind === "free" ? loadIslesProfileV1(storage()) : null;
    const free: FreeHuntStateV1 | null = world && loaded ? createFreeHuntV1(world, freeRules, {movement, cloak}, loaded.profile, seed) : null;
    if (free) actor = free.player.actor;
    let saveNote = loaded?.warning ?? "";
    let lastSave = performance.now();
    const persist = () => {
      if (!free) return;
      const ok = saveIslesProfileV1(storage(), free.profile);
      saveNote = ok ? "" : "Progression non enregistrée (stockage local indisponible).";
      free.dirty = false; lastSave = performance.now();
    };
    if (world && mapRef.current) drawIslandMap(mapRef.current, map, 2);
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
      if (event.code === "KeyM" && world) setMapOpen(open => !open);
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
      const move = screenToWorldMoveV1(ix / length, iy / length, viewBasisV1(rotation, cameraTuning));
      return {moveX: move.x, moveZ: move.z, run: held("ShiftLeft", "ShiftRight"), jump: once("Space"), cloak: once("KeyC")};
    };

    const simulate = (dt: number, first: boolean) => {
      const input = moveInput();
      if (!first) { input.jump = false; input.cloak = false; }
      if (match) {
        stepReverseHuntV1(match, {...input, strike: first && once("KeyE"), plasma: first && once("KeyF"), trophyHeld: held("KeyT"),
          selfDestruct: first && once("Enter"), acceptDuel: first && once("KeyY")}, map, rules, {movement, cloak}, dt);
        actor = match.yautja.actor;
        if (match.yautja.jammedFor > 0) thermal = false;
      } else if (free && world) {
        stepFreeHuntV1(free, {...input, strike: first && once("KeyE"), plasma: first && once("KeyF"), trophyHeld: held("KeyT"), interact: first && once("KeyG")},
          world, freeRules, {movement, cloak}, dt);
        actor = free.player.actor;
      } else {
        actor = stepIslesActorV1(actor, input, map, movement, cloak, dt).actor;
      }
      seconds += dt;
    };

    // Fixed scenery of the free hunt: the altar on the pyramid and Sœur-de-Pierre.
    const altar = world?.sites.find(site => site.id === "autel");
    const fixed: IslesViewEntityV1[] = altar ? [
      {id: "autel", kind: "decor", model: "autel", x: altar.x, y: 9, z: altar.z - 12 * map.tileMeters, facing: 0},
      {id: "soeur-de-pierre", kind: "yautja", x: markerV1(map, "altarFront").x + 3, y: 0, z: markerV1(map, "altarFront").z - 3, facing: Math.PI, color: "#6f6f80"},
    ] : [];
    const markerPoint = (name: string, index: number) => { const [x, z] = map.markers[name][index]; return tileCenterV1(map, x, z); };

    const entities = (): IslesViewEntityV1[] => {
      const list: IslesViewEntityV1[] = [];
      const hunterDown = (match && match.yautja.health <= 0) || free?.player.dead;
      list.push({id: "me", kind: "yautja", x: actor.x, y: actor.y, z: actor.z, facing: actor.facing, cloaked: actor.cloaked, opacity: hunterDown ? 0.3 : 1});
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
      if (free) {
        list.push(...fixed);
        const near = (p: {x: number; z: number}) => Math.hypot(p.x - actor.x, p.z - actor.z) < 120;
        for (const npc of free.npcs) {
          if (!near(npc)) continue;
          if (npc.role === "helicopter") { list.push({id: npc.id, kind: "beacon", x: npc.x, y: 0, z: npc.z, facing: 0}); continue; }
          if (npc.state === "dead" && npc.trophyTaken && npc.role === "animal") continue;
          const human = freeRules.humans[npc.type], animal = freeRules.animals[npc.type];
          list.push({id: npc.id, kind: npc.role === "human" ? "npc" : "animal", model: human?.model ?? animal?.model, x: npc.x, y: 0, z: npc.z, facing: npc.facing,
            color: npc.unique === "bounty" ? freeRules.bounty.color : npc.unique === "chief" ? freeRules.mission.chief.color : human?.color,
            downed: npc.state === "dead", moving: npc.moving, running: npc.running, scale: npc.scale});
        }
        freeRules.fragments.forEach((fragment, i) => {
          const p = markerPoint("fragments", i);
          if (!free.profile.fragments.includes(fragment.id) && near(p)) list.push({id: "fragment-" + i, kind: "marker", x: p.x, y: 0, z: p.z, facing: 0, color: "#ffb547"});
        });
        const m = free.mission;
        if (m.stage === "traces") m.traces.forEach((done, i) => { if (!done) { const p = markerPoint("traces", i); list.push({id: "trace-" + i, kind: "marker", x: p.x, y: 0, z: p.z, facing: 0, color: "#7fe3ff"}); } });
        if (m.stage === "radio") { const p = markerPoint("radio", 0); list.push({id: "radio", kind: "marker", x: p.x, y: 0, z: p.z, facing: 0, color: "#ff5a3c"}); }
        if (m.stage !== "none") m.carcasses.forEach((done, i) => {
          if (!done) { const p = markerPoint("carcassCircle", i); list.push({id: "carcass-" + i, kind: "animal", model: "sanglier", x: p.x, y: 0, z: p.z, facing: i, downed: true}); }
        });
        if (free.trial) {
          const p = markerPoint("trialRings", Math.min(free.trial.index, map.markers.trialRings.length - 1));
          list.push({id: "ring", kind: "marker", x: p.x, y: 7.2, z: p.z, facing: 0, color: "#7dff8a"});
        } else if (near(markerPoint("site:epreuve", 0))) {
          const p = markerPoint("site:epreuve", 0); list.push({id: "trial-start", kind: "marker", x: p.x, y: 0, z: p.z, facing: 0, color: "#7dff8a"});
        }
        const lair = markerPoint("repaireEntry", 0);
        if (near(lair)) list.push({id: "lair", kind: "marker", x: lair.x, y: 0, z: lair.z, facing: 0, color: "#b48cff"});
        free.drops.forEach((drop, i) => list.push({id: "drop-" + i, kind: "marker", x: drop.x, y: 0, z: drop.z, facing: 0, color: "#ff5a3c"}));
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
      if (free) {
        for (const npc of free.npcs) {
          if (!npc.name || npc.state === "dead") continue;
          const at = scene.project(npc.x, 2.6 * (npc.scale ?? 1), npc.z);
          if (at.visible) wanted.push({id: npc.id, text: npc.name, x: at.x, y: at.y, tone: "human"});
        }
        const sister = fixed.find(item => item.id === "soeur-de-pierre");
        if (sister && Math.hypot(sister.x - actor.x, sister.z - actor.z) < 40) {
          const at = scene.project(sister.x, 2.8, sister.z);
          if (at.visible) wanted.push({id: "soeur", text: "Sœur-de-Pierre", x: at.x, y: at.y, tone: "remote"});
        }
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
      const freeHud: FreeHudV1 | undefined = free ? (() => {
        const c = freeHuntClockV1(free, freeRules), p = free.player, profile = free.profile;
        const missionText = free.mission.stage !== "none" ? MISSION_STEPS[free.mission.stage] : null;
        return {
          hour: c.hour, day: c.day + 1, night: c.night, moonless: c.moonless, alert: free.alert.level, reputation: freeHuntReputationV1(free, freeRules),
          honor: Math.round(profile.honor), health: p.health / freeRules.player.health, heat: p.heat / freeRules.player.plasmaOverheat, overheated: p.overheated,
          carried: free.carried.map(t => t.label), trophyProgress: p.trophy ? p.trophy.progress / freeRules.trophy.seconds : null, prompt: free.prompt,
          contracts: free.contractsToday.map(t => ({text: t.text, reward: t.reward, accepted: profile.contracts.accepted.includes(t.id), done: profile.contracts.done.includes(t.id)})),
          mission: missionText, trial: free.trial ? "Épreuve : anneau " + Math.min(free.trial.index + 1, map.markers.trialRings.length) + "/" + map.markers.trialRings.length +
            (free.trial.index > 0 ? " · " + (free.time - free.trial.start).toFixed(1) + " s" : "") : null,
          log: free.log.slice(-5).map(l => l.text), dead: p.dead, lair: profile.lairs.includes("verdant-chutes"), fragments: profile.fragments.length, saved: saveNote,
        };
      })() : undefined;
      setHud({fps, actor: {cloaked: actor.cloaked, cloakEnergy: actor.cloakEnergy, climbing: actor.climbing, swimming: actor.swimming,
        wading: actor.wading, running: actor.running, y: actor.y}, rotation, zoom, thermal, stats: scene.stats(), reverse, free: freeHud});
      if (free && world) {
        const marks = world.sites.filter(site => site.id !== "chutes").map(site => ({x: site.x, z: site.z, label: site.label, tone: site.id === "repaire" ? "lair" : "site"}));
        marks.push({x: actor.x, z: actor.z, label: "Vous", tone: "player"});
        if (free.alert.level) marks.push({x: free.alert.x, z: free.alert.z, label: "Zone de recherche", tone: "alert"});
        setMapMarks(marks);
      }
      lastHud = now;
    };

    const frame = (now: number) => {
      if (stopped) return;
      const dt = Math.min(0.25, (now - last) / 1000);
      last = now; acc += dt;
      let first = true;
      while (acc >= SIM_DT) { simulate(SIM_DT, first); first = false; acc -= SIM_DT; }
      if (!first) pressed.clear();
      if (free && (free.dirty ? now - lastSave > 2000 : now - lastSave > 15000)) persist();
      lead = stepCameraLeadV1(lead, {x: actor.vx, z: actor.vz}, actor.running, cameraTuning, dt);
      const wantYaw = viewBasisV1(rotation, cameraTuning).yaw;
      let turn = wantYaw - yaw; turn = Math.atan2(Math.sin(turn), Math.cos(turn));
      yaw += turn * Math.min(1, dt * 10);
      zoomShown += (cameraTuning.zoomHalfHeights[zoom] - zoomShown) * Math.min(1, dt * 8);
      const list = entities();
      const night = match?.night ?? (free ? freeHuntClockV1(free, freeRules).night : undefined);
      scene.render({target: {x: actor.x + lead.x, y: Math.max(0, actor.y) * 0.85, z: actor.z + lead.z}, feet: {x: actor.x, y: actor.y, z: actor.z},
        yaw, zoomHalfHeight: zoomShown, entities: list, thermal, night, seconds});
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
        kind, actor: () => actor, match: () => match, free: () => free, world: () => world, stats: () => scene.stats(), rotation: () => rotation,
        cutaway: (enabled: boolean) => scene.setCutaway(enabled), project: (x: number, y: number, z: number) => scene.project(x, y, z),
        place: (x: number, z: number, y = 0) => {
          actor = {...actor, x, y, z, vx: 0, vy: 0, vz: 0};
          if (match) match.yautja.actor = actor;
          if (free) free.player.actor = actor;
        },
        advance: (secondsToRun: number) => { for (let i = 0; i < Math.round(secondsToRun / SIM_DT); i++) simulate(SIM_DT, false); },
        save: () => persist(),
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
      persist();
      scene.dispose();
      delete window.__islesV1;
    };
  }, [kind, seed, restart]);

  const r = hud?.reverse, f = hud?.free;
  const ariaLabel = kind === "reverse" ? "Verdant, vue isométrique de la Chasse inversée" : kind === "free" ? "Verdant en chasse libre, vue isométrique" : "Île de test, vue isométrique";
  return <div className={styles.play} data-isles-play-v1={kind} data-isles-thermal={hud?.thermal ? "on" : "off"}>
    <canvas ref={canvasRef} className={styles.canvas} tabIndex={0} aria-label={ariaLabel} />
    <div ref={labelsRef} className={styles.labels} aria-hidden="true" />
    {r?.rain ? <div className={styles.rain} aria-hidden="true" /> : null}
    {r?.jammed ? <div className={styles.jam} aria-hidden="true" /> : null}
    {failure ? <p role="alert" className={styles.failure}>{failure}</p> : null}
    {!hud && !failure ? <p role="status" className={styles.loading}>{kind === "free" ? "Génération de Verdant…" : "Chargement…"}</p> : null}
    <header className={styles.topbar}>
      <button type="button" className={styles.quit} onClick={onQuit}>Quitter</button>
      {r ? <>
        <span className={styles.chip} data-isles-timer><b>{clock(r.remaining)}</b> {r.phase}</span>
        <span className={styles.chip}>{r.night ? "Nuit" : "Jour"}{r.rain ? " · pluie" : ""}</span>
        <span className={styles.chip}>Honneur <b>{r.honor}</b></span>
      </> : null}
      {f ? <>
        <span className={styles.chip} data-isles-clock>Jour {f.day} · <b>{hourText(f.hour)}</b>{f.night ? (f.moonless ? " · nuit sans lune" : " · nuit") : ""}</span>
        <span className={styles.chip} data-isles-alert={f.alert} aria-label={"Alerte " + f.alert}>Alerte <span className={styles.glyphs}>{[1, 2, 3].map(level => <i key={level} data-on={f.alert >= level} />)}</span></span>
        <span className={styles.chip}>Réputation <b data-isles-reputation>{f.reputation}</b> · honneur {f.honor}</span>
      </> : null}
      {hud ? <span className={styles.chip} data-isles-camera>Vue {["N-E", "S-E", "S-O", "N-O"][hud.rotation]} · {cameraTuning.zoomNames[hud.zoom]}{hud.thermal ? " · thermique" : ""}</span> : null}
    </header>
    {hud ? <aside className={styles.status} aria-label="État du chasseur">
      {r ? <><label>Santé<meter min={0} max={1} value={r.health} /></label>
        <label>Plasma{r.overheated ? " (surchauffe)" : ""}<meter min={0} max={1} value={r.heat} high={0.8} /></label></> : null}
      {f ? <><label>Santé<meter min={0} max={1} value={f.health} low={0.3} /></label>
        <label>Plasma{f.overheated ? " (surchauffe)" : ""}<meter min={0} max={1} value={f.heat} high={0.8} /></label></> : null}
      <label>Camouflage{hud.actor.cloaked ? " actif" : ""}<meter min={0} max={cloak.capacity} value={hud.actor.cloakEnergy} /></label>
      <p className={styles.motion}>{hud.actor.climbing ? "Escalade" : hud.actor.swimming ? "Nage (camouflage impossible)" : hud.actor.wading ? "Dans l’eau" : hud.actor.running ? "Course" : "Marche"} · hauteur {hud.actor.y.toFixed(1)} m</p>
      {f ? <p className={styles.motion} data-isles-carried={f.carried.length}>Trophées portés : {f.carried.length ? f.carried.join(", ") : "aucun"}{f.lair ? "" : " · repaire à découvrir derrière les chutes"}</p> : null}
      {kind !== "reverse" ? <p className={styles.tech} data-isles-stats>{hud.stats.zones} zones chargées · {hud.stats.terrainTriangles} triangles · {hud.stats.instances} objets instanciés · {hud.stats.modelsReady} modèles · {hud.stats.drawCalls} appels · {hud.fps} i/s</p> : null}
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
    {f ? <aside className={styles.team} aria-label="Contrats et objectifs">
      {f.mission ? <><h3>Mission · L’appât</h3><p data-isles-mission>{f.mission}</p></> : null}
      {f.trial ? <><h3>Épreuve</h3><p>{f.trial}</p></> : null}
      <h3>Contrats de l’autel</h3>
      <ul>{f.contracts.map(c => <li key={c.text} data-found={c.done}>{c.done ? "✓ " : c.accepted ? "" : "(à lire) "}{c.text} · {c.reward}</li>)}</ul>
      <p>Fragments de l’autel : {f.fragments}/{freeRules.fragments.length} · <kbd>M</kbd> carte</p>
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
      {f ? <div className={styles.prompts} role="status">
        {f.dead ? <p className={styles.alert}>Le chasseur est tombé. Retour au {f.lair ? "repaire" : "pied de l’autel"}…</p> : null}
        {f.trophyProgress !== null ? <p>Prélèvement du trophée… <meter min={0} max={1} value={f.trophyProgress} /></p> : f.prompt ? <p data-isles-prompt>{f.prompt.startsWith("Maintenir") ? f.prompt : <><kbd>G</kbd> : {f.prompt}</>}</p> : null}
        {f.saved ? <p className={styles.alert}>{f.saved}</p> : null}
        <ul className={styles.log}>{f.log.map((line, i) => <li key={i}>{line}</li>)}</ul>
      </div> : null}
      <p className={styles.keys}><kbd>ZQSD</kbd>/<kbd>WASD</kbd> se déplacer · <kbd>Maj</kbd> courir · <kbd>Espace</kbd> sauter · pousser contre une paroi : grimper · <kbd>C</kbd> camouflage · <kbd>X</kbd> thermique · <kbd>R</kbd> tourner · <kbd>V</kbd>/molette zoom{kind !== "view" ? <> · <kbd>E</kbd> frapper · <kbd>F</kbd> plasma · <kbd>T</kbd> trophée</> : null}{kind === "free" ? <> · <kbd>G</kbd> interagir · <kbd>M</kbd> carte</> : null}</p>
    </footer>
    <div className={styles.mapOverlay} hidden={!mapOpen} role="dialog" aria-label="Carte de Verdant" data-isles-map={mapOpen ? "open" : "closed"}>
      <div className={styles.mapFrame}>
        <canvas ref={mapRef} className={styles.mapCanvas} />
        {mapMarks.map((mark, i) => <span key={i} className={styles.mapMark} data-tone={mark.tone}
          style={{left: (mark.x / (verdantWorldJson.size * tuningJson.tileMeters) * 100) + "%", top: (mark.z / (verdantWorldJson.size * tuningJson.tileMeters) * 100) + "%"}}>{mark.label}</span>)}
      </div>
      <button type="button" onClick={() => setMapOpen(false)}>Fermer la carte <kbd>M</kbd></button>
    </div>
    {r?.outcome ? <div className={styles.outcome} role="dialog" aria-modal="true" aria-labelledby="isles-outcome-title" data-isles-outcome={r.outcome.kind}>
      <h2 id="isles-outcome-title">{r.outcome.winner === "humans" ? "Victoire des humains" : "Victoire du Yautja"}</h2>
      <p>{OUTCOME_LABELS[r.outcome.kind]}</p>
      <p>Honneur {r.outcome.honor} · humains partis {r.outcome.escaped} · en vie {r.outcome.alive} · score humain {r.outcome.humanScore}</p>
      <div><button type="button" onClick={() => setRestart(value => value + 1)}>Rejouer</button><button type="button" onClick={onQuit}>Retour aux Îles</button></div>
    </div> : null}
  </div>;
}

/** Saved progress of the free hunt, shown on the hub. */
function profileSummary(profile: IslesProfileV1): string {
  const level = islesReputationV1(profile, freeRules.reputation);
  return "Réputation " + level + " · honneur " + Math.round(profile.honor) + " · " + profile.trophies.length + " trophée(s) au repaire · " +
    profile.fragments.length + "/" + freeRules.fragments.length + " fragments" + (profile.missions["I-MP-01"] ? " · L’appât réussie" : "");
}

/** Hub of the mode, then the chosen prototype. */
export default function IslesModeV1({onExit}: {onExit: () => void}) {
  const [play, setPlay] = useState<{kind: PlayKind; seed: number} | null>(null);
  const [seed, setSeed] = useState(() => 1 + Math.floor(Math.random() * 99999));
  const [summary, setSummary] = useState("");
  useEffect(() => {
    if (play) return;
    const {profile, warning} = loadIslesProfileV1(storage());
    queueMicrotask(() => setSummary(warning ?? profileSummary(profile)));
  }, [play]);
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
        <h3>Verdant · chasse libre</h3>
        <p>Une île de 2 km : autel, fleuve et chutes, camp des braconniers, fouilles, piste cachée, village. Contrats de l’autel, prime du Prédicateur, Roi-de-Verdant les nuits sans lune, mission « L’appât », épreuve de la canopée, fragments. Rapportez vos trophées au repaire.</p>
        <p className={styles.warning} data-isles-profile>{summary}</p>
        <button type="button" data-isles-start="free" onClick={() => setPlay({kind: "free", seed})}>Partir sur Verdant</button>
      </article>
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
