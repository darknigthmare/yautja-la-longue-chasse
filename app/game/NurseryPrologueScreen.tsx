"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { NURSERY_ART_MANIFEST } from "./nurseryArtManifest";
import { drawNurseryScene, loadNurseryArt, type NurseryArtBank } from "./nurseryRendering";
import { controlActionShortcut } from "./controlBindingLabels";
import { GameAudio } from "./sound";
import { NurseryCrowdAudio } from "./nurseryAudio";
import type { ControlBindings } from "./systems/controlBindings";
import { NURSERY_CONTROL_ACTIONS, sampleNurseryControls, type NurseryTouchAction } from "./systems/nurseryControls";
import { advanceNurseryFrame, createNurseryFrameAdapter, createNurseryPrologue, getNurseryPresentation,
  normalizeNurseryCheckpoint, type NurseryCompletionReceipt, type NurseryState } from "./systems/nurseryPrologue";
import styles from "./NurseryPrologueScreen.module.css";

export interface NurseryPrologueScreenProps {
  checkpoint?: unknown;
  readyMode?: "hold" | "press";
  bindings: ControlBindings;
  nextChapterReady: boolean;
  reducedMotion?: boolean;
  soundEnabled?: boolean;
  masterVolume?: number;
  effectsVolume?: number;
  persistenceError?: string | null;
  externallyPaused?: boolean;
  onCheckpoint(state: NurseryState): boolean;
  onComplete(receipt: NurseryCompletionReceipt, state: NurseryState): Promise<boolean>;
  onExit(): void | Promise<void>;
}
const PHASE_LABELS: Record<NurseryState["phase"], string> = {
  loading: "Chargement de la nurserie.", prompt: "Le prologue commence dans la nurserie.", arrival: "La foule tribale acclame les jeunes combattants.",
  ready: "Levez le bras lorsque vous êtes prêt.", duel: "Duel d’entraînement non létal. Vous êtes le Youngling à gauche au départ.",
  defeat: "Vous êtes à terre. Le duel est terminé. Vous pouvez réessayer.", ko: "Votre adversaire est à terre. Le duel est terminé.",
  "village-reveal": "Le village est construit dans le squelette ancien, sec et évidé d’un scolopendre.",
  "moon-title": "La caméra découvre la lune rouge. Yautja: The Long Hunt.", complete: "La nurserie est terminée. Enregistrement en cours.",
};
const TOUCH_ACTIONS = [
  ["left", "←", "Se déplacer à gauche"], ["right", "→", "Se déplacer à droite"],
  ["light", "Poing", "Donner un coup de poing"], ["blade", "Lame", "Attaquer avec la lame ramassée"],
  ["dodge", "Esquive", "Esquiver"], ["throw", "Projection", "Projeter l’adversaire proche"], ["pickup", "Ramasser", "Ramasser la lame au sol"],
] as const;

/** The scene owns presentation/input only. Campaign proof and storage belong to the parent. */
export default function NurseryPrologueScreen(props: NurseryPrologueScreenProps) {
  const [initial] = useState(() => normalizeNurseryCheckpoint(props.checkpoint) ?? createNurseryPrologue({ readyMode: props.readyMode }));
  const adapterRef = useRef(createNurseryFrameAdapter(initial));
  const latestRef = useRef(props);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const rootRef = useRef<HTMLElement>(null);
  const audioRef = useRef<GameAudio | null>(null);
  const crowdRef = useRef<NurseryCrowdAudio | null>(null);
  const codesRef = useRef(new Set<string>());
  const releaseCodesRef = useRef(new Set<string>());
  const touchRef = useRef(new Set<NurseryTouchAction>());
  const armedRef = useRef(false);
  const pausedRef = useRef(false);
  const mountedRef = useRef(true);
  const completionRef = useRef<{ receipt: NurseryCompletionReceipt; state: NurseryState } | null>(null);
  const completionBusyRef = useRef(false);
  const [bank, setBank] = useState<NurseryArtBank | null>(null);
  const [artError, setArtError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0);
  const [phase, setPhase] = useState(initial.phase);
  const [readyProgress, setReadyProgress] = useState(0);
  const [paused, setPaused] = useState(false);
  const [pressReady, setPressReady] = useState(initial.readyMode === "press");
  const [showTouch, setShowTouch] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [saving, setSaving] = useState(false);
  const [reducedByOs, setReducedByOs] = useState(false);
  const [awaitingChapter, setAwaitingChapter] = useState(false);
  const [releaseRequired, setReleaseRequired] = useState(false);
  const effectivePaused = paused || props.externallyPaused === true;
  const reducedMotion = props.reducedMotion === true || reducedByOs;

  useEffect(() => { latestRef.current = props; }, [props]);
  const clearInput = useCallback(() => { for (const code of codesRef.current) releaseCodesRef.current.add(code); codesRef.current.clear(); touchRef.current.clear(); armedRef.current = false; }, []);
  const checkpoint = useCallback(() => {
    const state = adapterRef.current.state;
    if (state.phase === "complete") return false;
    try {
      const saved = latestRef.current.onCheckpoint(state);
      if (!saved) { pausedRef.current = true; setPaused(true); setSaveError("Le point de reprise n’a pas pu être enregistré. La scène reste ouverte."); }
      else setSaveError("");
      return saved;
    } catch { pausedRef.current = true; setPaused(true); setSaveError("L’enregistrement du prologue a échoué. La scène reste ouverte."); return false; }
  }, []);
  const pause = useCallback(() => {
    clearInput();
    // A terminal receipt may still need storage retry; never hide that button behind an unresumable pause.
    if (adapterRef.current.state.phase === "complete") return;
    pausedRef.current = true; setPaused(true); checkpoint();
  }, [checkpoint, clearInput]);
  const resume = useCallback(() => {
    if (latestRef.current.externallyPaused || !checkpoint()) return;
    clearInput(); pausedRef.current = false; setPaused(false);
    requestAnimationFrame(() => { if (mountedRef.current && !pausedRef.current && !latestRef.current.externallyPaused) canvasRef.current?.focus(); });
  }, [checkpoint, clearInput]);
  const submitCompletion = useCallback(async () => {
    if (!completionRef.current || completionBusyRef.current) return;
    completionBusyRef.current = true; setSaving(true); setSaveError("");
    const { receipt, state } = completionRef.current;
    try {
      const ok = await latestRef.current.onComplete(receipt, state);
      if (!ok && mountedRef.current) setSaveError("La fin du prologue n’a pas pu être enregistrée. Réessayez sans rejouer le duel.");
    } catch { if (mountedRef.current) setSaveError("La fin du prologue n’a pas pu être enregistrée. Réessayez sans rejouer le duel."); }
    finally { completionBusyRef.current = false; if (mountedRef.current) setSaving(false); }
  }, []);
  const exit = async () => { clearInput(); if (checkpoint()) await latestRef.current.onExit(); };

  useEffect(() => {
    mountedRef.current = true;
    const audio = new GameAudio(); audioRef.current = audio;
    const crowd = new NurseryCrowdAudio(); crowdRef.current = crowd;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)");
    const updateMotion = () => setReducedByOs(media.matches);
    const initialFrame = requestAnimationFrame(() => { updateMotion(); setShowTouch(window.matchMedia("(pointer: coarse)").matches); });
    media.addEventListener("change", updateMotion);
    canvasRef.current?.focus();
    return () => { mountedRef.current = false; cancelAnimationFrame(initialFrame); media.removeEventListener("change", updateMotion); audio.dispose(); audioRef.current = null; crowd.dispose(); crowdRef.current = null; };
  }, []);
  useEffect(() => {
    const muted = props.soundEnabled === false || effectivePaused;
    audioRef.current?.setMix({ master: props.masterVolume ?? 1, effects: props.effectsVolume ?? 1, music: 0, muted });
    crowdRef.current?.setVolume((props.masterVolume ?? 1) * (props.effectsVolume ?? 1));
    crowdRef.current?.setEnabled(!muted);
  }, [props.soundEnabled, props.masterVolume, props.effectsVolume, effectivePaused]);
  useEffect(() => {
    let active = true;
    loadNurseryArt(NURSERY_ART_MANIFEST).then(result => {
      if (active) { setBank(result); setArtError(""); }
    }).catch(error => { if (active) { setBank(null); setArtError(error instanceof Error ? error.message : "Les images de la nurserie n’ont pas pu être chargées."); } });
    return () => { active = false; };
  }, [loadAttempt]);
  useEffect(() => {
    if (effectivePaused) {
      clearInput();
      if (!props.externallyPaused) panelRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
    }
  }, [effectivePaused, props.externallyPaused, clearInput]);

  useEffect(() => {
    if (!props.externallyPaused) return;
    const frame = requestAnimationFrame(() => checkpoint());
    return () => cancelAnimationFrame(frame);
  }, [props.externallyPaused, checkpoint]);

  useEffect(() => {
    const keyDown = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey) return;
      if (event.target !== canvasRef.current) return;
      if (event.code === "Escape" || latestRef.current.bindings[NURSERY_CONTROL_ACTIONS.pause].includes(event.code)) {
        event.preventDefault(); pause(); return;
      }
      if (["Tab", "ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight", "AltLeft", "AltRight", "MetaLeft", "MetaRight"].includes(event.code)) return;
      event.preventDefault(); codesRef.current.add(event.code); void audioRef.current?.unlock(); void crowdRef.current?.unlock();
    };
    const keyUp = (event: KeyboardEvent) => { codesRef.current.delete(event.code); releaseCodesRef.current.delete(event.code); };
    const blurred = () => pause();
    const visibility = () => { if (document.hidden) pause(); };
    window.addEventListener("keydown", keyDown); window.addEventListener("keyup", keyUp);
    window.addEventListener("blur", blurred); window.addEventListener("pagehide", blurred);
    document.addEventListener("visibilitychange", visibility);
    return () => {
      window.removeEventListener("keydown", keyDown); window.removeEventListener("keyup", keyUp);
      window.removeEventListener("blur", blurred); window.removeEventListener("pagehide", blurred);
      document.removeEventListener("visibilitychange", visibility);
    };
  }, [pause]);

  useEffect(() => {
    const canvas = canvasRef.current; const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;
    let frameId = 0, lastUi = 0, lastCheckpointTick = adapterRef.current.state.tick, previousPadPause = false, hadPad = false, padWasActive = false;
    const render = (timestamp: number) => {
      let pad: Gamepad | null = null;
      try { pad = Array.from(navigator.getGamepads?.() ?? []).find(candidate => candidate?.connected && candidate.mapping === "standard") ?? null; } catch { /* Keyboard and touch remain available. */ }
      if (hadPad && !pad) pause();
      hadPad = Boolean(pad);
      const sample = sampleNurseryControls(codesRef.current, touchRef.current, latestRef.current.bindings, pad,
        adapterRef.current.state.phase === "prompt" && codesRef.current.size > 0);
      if (pad && !sample.neutral && !padWasActive) { void audioRef.current?.unlock(); void crowdRef.current?.unlock(); }
      padWasActive = Boolean(pad) && !sample.neutral;
      if (sample.pause && !previousPadPause) { if (pausedRef.current) resume(); else pause(); }
      previousPadPause = sample.pause;
      const blocked = pausedRef.current || latestRef.current.externallyPaused === true;
      if (blocked) armedRef.current = false;
      else if (sample.neutral && releaseCodesRef.current.size === 0) armedRef.current = true;
      const result = advanceNurseryFrame(adapterRef.current, armedRef.current ? sample.actions : {}, {
        assetsReady: bank !== null, pageVisible: !document.hidden, paused: blocked || !armedRef.current,
        nextChapterReady: latestRef.current.nextChapterReady,
      }, timestamp);
      adapterRef.current = result.adapter;
      const presentation = getNurseryPresentation(result.state);
      drawNurseryScene(ctx, presentation, bank, reducedMotion);
      canvas.dataset.nurseryPhase = result.state.phase;
      canvas.dataset.nurseryTick = String(result.state.tick);
      canvas.dataset.nurseryPaused = String(blocked || !armedRef.current);
      canvas.dataset.nurseryAssets = String(bank !== null);
      canvas.dataset.nurseryPositions = `${result.state.player.x.toFixed(2)},${result.state.rival.x.toFixed(2)}`;
      canvas.dataset.nurseryPoses = `${presentation.actors[0].pose},${presentation.actors[1].pose}`;
      canvas.dataset.nurseryBlade = result.state.blade.holder ?? "ground";
      canvas.dataset.nurseryReadyTicks = String(result.state.readyTicks);
      canvas.dataset.nurseryShot = presentation.camera.shot;
      for (const event of result.events) {
        if (event.type === "phase" && event.phase === "arrival") crowdRef.current?.arrival();
        if (event.type === "hit") audioRef.current?.hit();
        if (event.type === "pickup") audioRef.current?.weaponSwitch();
      }
      const phaseChanged = result.events.some(event => event.type === "phase");
      if (phaseChanged && ["prompt", "arrival", "duel"].includes(result.state.phase)) { touchRef.current.clear(); canvas.focus(); }
      if (result.completion && !completionRef.current) {
        completionRef.current = { receipt: result.completion, state: result.state };
        void submitCompletion();
      } else if (result.state.phase !== "complete" && (phaseChanged || result.state.tick - lastCheckpointTick >= 120)) {
        lastCheckpointTick = result.state.tick; checkpoint();
      }
      if (phaseChanged || timestamp - lastUi >= 80) {
        lastUi = timestamp; setPhase(result.state.phase); setReadyProgress(presentation.readyGestureProgress);
        setAwaitingChapter(presentation.awaitingNextChapter && !latestRef.current.nextChapterReady);
        setReleaseRequired(!blocked && result.state.phase === "duel" && (!armedRef.current || !result.state.inputArmed));
      }
      frameId = requestAnimationFrame(render);
    };
    frameId = requestAnimationFrame(render);
    return () => cancelAnimationFrame(frameId);
  }, [bank, checkpoint, pause, reducedMotion, resume, submitCompletion]);

  const setTouch = (action: NurseryTouchAction, down: boolean, event?: ReactPointerEvent<HTMLButtonElement>) => {
    if (down) {
      if (effectivePaused) return;
      if (event) { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); }
      touchRef.current.add(action); void audioRef.current?.unlock(); void crowdRef.current?.unlock();
    } else touchRef.current.delete(action);
  };
  const pulseTouch = (action: NurseryTouchAction) => {
    if (effectivePaused) return;
    void audioRef.current?.unlock(); void crowdRef.current?.unlock(); touchRef.current.add(action);
    window.setTimeout(() => touchRef.current.delete(action), 80);
  };
  const touchButton = (action: NurseryTouchAction, label: string, title: string) => <button type="button" key={action} aria-label={title}
    data-nursery-action={action} onPointerDown={event => setTouch(action, true, event)} onPointerUp={event => setTouch(action, false, event)}
    onPointerCancel={() => setTouch(action, false)} onLostPointerCapture={() => setTouch(action, false)}
    onKeyDown={event => { if ((event.key === "Enter" || event.key === " ") && !event.repeat) { event.preventDefault(); setTouch(action, true); } }}
    onKeyUp={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setTouch(action, false); } }}
    onBlur={() => setTouch(action, false)}>{label}</button>;
  const changeReadyMode = () => {
    const value = !pressReady; setPressReady(value); clearInput();
    const reset = normalizeNurseryCheckpoint({ ...adapterRef.current.state, readyMode: value ? "press" : "hold" });
    if (reset) adapterRef.current = createNurseryFrameAdapter(reset);
    checkpoint();
  };
  const promptPhase = phase === "prompt" || phase === "ready" || phase === "defeat";

  return <section ref={rootRef} className={styles.screen} data-nursery-prologue data-nursery-hud="false" data-reduced-motion={reducedMotion}>
    <header className={styles.toolbar}><span>Prologue · La nurserie</span><div>
      <button type="button" onClick={pause} disabled={phase === "complete"}>Pause et commandes</button>
      <button type="button" aria-pressed={showTouch} onClick={() => setShowTouch(value => !value)}>Commandes tactiles</button>
    </div></header>
    <div className={styles.stage}>
      <canvas ref={canvasRef} width={960} height={540} tabIndex={0} aria-label="Duel d’enfance de la nurserie, sans barre de vie. Commandes disponibles dans Pause et commandes."
        onPointerDown={() => canvasRef.current?.focus()}
        onBlur={event => {
          const target = event.relatedTarget;
          const gameControl = target instanceof HTMLElement && target.hasAttribute("data-nursery-action");
          if (adapterRef.current.state.phase === "duel" && !pausedRef.current && !latestRef.current.externallyPaused && !gameControl) pause();
        }} />
      {phase === "loading" && <div className={styles.prompt} role="status"><p>{artError ? "Le prologue attend ses images." : "Chargement de la nurserie…"}</p>{artError && <><p className={styles.error}>{artError}</p><button type="button" onClick={() => setLoadAttempt(value => value + 1)}>Réessayer le chargement</button><button type="button" onClick={() => void exit()}>Retour au menu</button></>}</div>}
      {!effectivePaused && promptPhase && <div className={styles.prompt}>
        {phase === "prompt" && <><p className={styles.start}>La longue chasse commence ici.</p><p>Appuyez sur une touche · Manette A</p><button type="button" data-nursery-confirm onClick={() => pulseTouch("confirm")}>Entrer dans la nurserie</button></>}
        {phase === "ready" && <><p>Levez le bras pour entrer dans le duel.</p><p>{pressReady ? "Appuyez sur Entrée / A." : "Maintenez Entrée / A pendant 2 secondes."}</p>
          <div className={styles.readyMeter} aria-hidden="true"><span style={{ width: `${Math.round(readyProgress * 100)}%` }} /></div>
          {pressReady ? <button type="button" onClick={() => pulseTouch("ready")}>Je suis prêt</button> : touchButton("ready", "Maintenir : je suis prêt", "Maintenir pendant deux secondes pour lever le bras")}
          <label className={styles.option}><input type="checkbox" checked={pressReady} onChange={changeReadyMode} />Valider Prêt par une simple pression</label></>}
        {phase === "defeat" && <><p>Vous êtes à terre. Le duel est terminé.</p><p>Ce combat d’entraînement n’est pas létal.</p><button type="button" data-nursery-retry onClick={() => pulseTouch("retry")}>Réessayer le duel</button></>}
      </div>}
      {(phase === "moon-title" || phase === "complete") && <div className={styles.title}><h1>Yautja: The Long Hunt</h1>{awaitingChapter && <p>Le chapitre suivant se prépare. Votre point de reprise est conservé.</p>}{phase === "complete" && <p role="status">{saving ? "Enregistrement de la fin du prologue…" : saveError ? "L’enregistrement reste à confirmer." : "La nurserie est terminée."}</p>}</div>}
      {paused && !props.externallyPaused && <div className={styles.backdrop}><div ref={panelRef} className={styles.pause} role="dialog" aria-modal="true" aria-label="Prologue en pause"
        onKeyDown={event => {
          if (event.key === "Escape") { event.preventDefault(); resume(); }
          if (event.key !== "Tab") return;
          const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),[tabindex="0"]'));
          const first = buttons[0], last = buttons[buttons.length - 1];
          if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
          else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
        }}>
        <h2>Prologue en pause</h2><p>Le duel et la caméra sont arrêtés. Relâchez vos commandes avant de reprendre.</p>
        <div className={styles.commandList}>
          <p><kbd>{controlActionShortcut(NURSERY_CONTROL_ACTIONS.left, props.bindings)} / {controlActionShortcut(NURSERY_CONTROL_ACTIONS.right, props.bindings)}</kbd><span>Déplacement · stick ou croix</span></p>
          <p><kbd>{controlActionShortcut(NURSERY_CONTROL_ACTIONS.light, props.bindings)}</kbd><span>Poing · X</span></p>
          <p><kbd>{controlActionShortcut(NURSERY_CONTROL_ACTIONS.blade, props.bindings)}</kbd><span>Lame ramassée · Y</span></p>
          <p><kbd>{controlActionShortcut(NURSERY_CONTROL_ACTIONS.dodge, props.bindings)}</kbd><span>Esquive · B</span></p>
          <p><kbd>{controlActionShortcut(NURSERY_CONTROL_ACTIONS.throw, props.bindings)}</kbd><span>Projection au contact · RB</span></p>
          <p><kbd>{controlActionShortcut(NURSERY_CONTROL_ACTIONS.pickup, props.bindings)}</kbd><span>Ramasser la lame proche · LB</span></p>
        </div>
        <label className={styles.option}><input type="checkbox" checked={pressReady} onChange={changeReadyMode} />Prêt par une pression, sans maintien</label>
        <button type="button" onClick={resume} disabled={props.externallyPaused}>Reprendre le prologue</button>
        <button type="button" onClick={() => void exit()}>Enregistrer et revenir au menu</button>
      </div></div>}
    </div>
    <p className={styles.srOnly} aria-live="polite">{PHASE_LABELS[phase]}</p>
    {releaseRequired && <p className={styles.release} role="status">Relâchez les commandes pour commencer ou reprendre le duel.</p>}
    {(saveError || props.persistenceError) && <div role="alert" className={styles.saveError}><p>{props.persistenceError || saveError}</p>{phase === "complete" && <button type="button" disabled={saving} onClick={() => void submitCompletion()}>Réessayer l’enregistrement</button>}</div>}
    {showTouch && phase === "duel" && !effectivePaused && <div className={styles.touch} aria-label="Commandes tactiles du duel">{TOUCH_ACTIONS.map(([action, label, title]) => touchButton(action, label, title))}</div>}
  </section>;
}
