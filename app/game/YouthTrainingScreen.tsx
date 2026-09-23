"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent as ReactPointerEvent } from "react";
import { YOUTH_ART_MANIFEST } from "./youthArtManifest";
import { drawYouthScene, drawYouthDemonstration, getYouthDemonstration, loadYouthArt, youthActorPose, type YouthArtBank } from "./youthTrainingRendering";
import { controlActionShortcut } from "./controlBindingLabels";
import { GameAudio } from "./sound";
import type { ControlBindings } from "./systems/controlBindings";
import { sampleYouthControls, YOUTH_CONTROL_ACTIONS, type YouthTouchAction } from "./systems/youthControls";
import { createYouthTraining, normalizeYouthTraining, stepYouthTraining, getYouthObjective, YOUTH_DESERT_CLUES, YOUTH_DESERT_SCAN_TICKS, type YouthState, type YouthReceipt } from "./systems/youthTraining";
import styles from "./YouthTrainingScreen.module.css";

export interface YouthTrainingScreenProps {
  checkpoint?: unknown; bindings: ControlBindings; reducedMotion?: boolean; soundEnabled?: boolean;
  masterVolume?: number; effectsVolume?: number; persistenceError?: string | null; externallyPaused?: boolean;
  onCheckpoint(state: YouthState): boolean;
  onProgress(receipts: readonly YouthReceipt[], state: YouthState): Promise<boolean>;
  onExit(): void | Promise<void>;
  onOpenSettings?(): void;
  onReturnToCity?(): Promise<boolean>;
}
const TOUCH_ACTIONS = [["left", "←", "Se déplacer à gauche"], ["right", "→", "Se déplacer à droite"],
  ["jump", "Saut", "Sauter"], ["light", "Poing", "Frapper"], ["blade", "Lame", "Utiliser la lame gagnée"],
  ["dodge", "Esquive", "Esquiver"], ["throw", "Projection", "Projeter la cible proche"], ["interact", "Interagir", "Interagir avec le poste proche"]] as const;
const ACTIVE = (phase: YouthState["phase"]) => phase.startsWith("dojo-") || phase === "camp-run" || phase === "camp-duel" || (phase.startsWith("desert-") && phase !== "desert-complete");

/** Playable training owns neither rank awards nor inventory writes: every earned milestone is persisted by the campaign. */
export default function YouthTrainingScreen(props: YouthTrainingScreenProps) {
  const demoCanvasRef = useRef<HTMLCanvasElement>(null), demoTickRef = useRef(0), demoPlayingRef = useRef(false), demoPhaseRef = useRef<string>("");
  const [showDemo, setShowDemo] = useState(false);
  const [initial] = useState(() => normalizeYouthTraining(props.checkpoint) ?? createYouthTraining());
  const stateRef = useRef(initial), latestRef = useRef(props), canvasRef = useRef<HTMLCanvasElement>(null), panelRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<GameAudio | null>(null), codesRef = useRef(new Set<string>()), releaseCodesRef = useRef(new Set<string>());
  const touchRef = useRef(new Set<YouthTouchAction>()), armedRef = useRef(false), pausedRef = useRef(false), mountedRef = useRef(true);
  const pendingRef = useRef<{ receipts: readonly YouthReceipt[]; state: YouthState } | null>(null), busyRef = useRef(false);
  const choiceRef = useRef<"ochre" | "ash" | "rust" | undefined>(undefined);
  const [state, setState] = useState(initial), [bank, setBank] = useState<YouthArtBank | null>(null), [artError, setArtError] = useState("");
  const [loadAttempt, setLoadAttempt] = useState(0), [paused, setPaused] = useState(false), [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(""), [showTouch, setShowTouch] = useState(false), [reducedByOs, setReducedByOs] = useState(false);
  const [releaseRequired, setReleaseRequired] = useState(false), [pending, setPending] = useState(false);
  const effectivePaused = paused || props.externallyPaused === true, reducedMotion = props.reducedMotion === true || reducedByOs;
  const objective = getYouthObjective(state);
  const lessonAction = state.phase === "dojo-jump" || state.phase === "camp-run" || state.phase === "desert-crossing" ? "jump" : state.phase === "dojo-dodge" ? "dodge" : state.phase === "dojo-strike" || state.phase === "camp-duel" ? "light" : state.phase === "dojo-throw" ? "throw" : ["blade-award", "armory", "barracks", "desert-briefing", "desert-tracks", "desert-report", "desert-return"].includes(state.phase) ? "interact" : null;
  const lessonLabel = lessonAction ? TOUCH_ACTIONS.find(([id]) => id === lessonAction)?.[1] : null;
  useEffect(() => { latestRef.current = props; }, [props]);
  useEffect(() => { const overflow = document.body.style.overflow; document.body.style.overflow = "hidden"; return () => { document.body.style.overflow = overflow; }; }, []);
  useEffect(() => { if (reducedMotion) { demoPlayingRef.current = false; demoTickRef.current = 0; } }, [reducedMotion]);
  const clearInput = useCallback(() => { for (const code of codesRef.current) releaseCodesRef.current.add(code); codesRef.current.clear(); touchRef.current.clear(); armedRef.current = false; choiceRef.current = undefined; }, []);
  const checkpoint = useCallback(() => {
    if (pendingRef.current) return false;
    try { if (latestRef.current.onCheckpoint(stateRef.current)) { setSaveError(""); return true; } } catch { /* The scene remains mounted until its checkpoint is durable. */ }
    pausedRef.current = true; setPaused(true); setSaveError("La sauvegarde a échoué. Votre formation reste ouverte ; réessayez sans recommencer."); return false;
  }, []);
  const pause = useCallback(() => { clearInput(); pausedRef.current = true; setPaused(true); if (!pendingRef.current) checkpoint(); }, [clearInput, checkpoint]);
  const resume = useCallback(() => {
    if (latestRef.current.externallyPaused || pendingRef.current || !checkpoint()) return;
    clearInput(); pausedRef.current = false; setPaused(false);
    requestAnimationFrame(() => { if (mountedRef.current && !pausedRef.current && !latestRef.current.externallyPaused) canvasRef.current?.focus(); });
  }, [clearInput, checkpoint]);
  const submitProgress = useCallback(async () => {
    const item = pendingRef.current; if (!item || busyRef.current) return;
    busyRef.current = true; setSaving(true); setSaveError("");
    try {
      const ok = await latestRef.current.onProgress(item.receipts, item.state);
      if (!ok) { if (mountedRef.current) setSaveError("Cette étape n’a pas pu être enregistrée. Réessayez : son résultat reste conservé."); return; }
      if (pendingRef.current === item) pendingRef.current = null;
      if (mountedRef.current) { setPending(false); clearInput(); if (!pausedRef.current && !latestRef.current.externallyPaused) canvasRef.current?.focus(); }
    } catch { if (mountedRef.current) setSaveError("Cette étape n’a pas pu être enregistrée. Son résultat reste conservé."); }
    finally { busyRef.current = false; if (mountedRef.current) setSaving(false); }
  }, [clearInput]);
  const exit = async () => { clearInput(); if (checkpoint()) await latestRef.current.onExit(); };
  const returnToCity = async () => {
    clearInput(); if (!checkpoint() || !latestRef.current.onReturnToCity) return;
    busyRef.current = true; setSaving(true);
    try { if (!await latestRef.current.onReturnToCity()) setSaveError("Le retour à la cité attend une sauvegarde valide."); }
    catch { setSaveError("Le retour à la cité a échoué. Réessayez sans quitter cette scène."); }
    finally { busyRef.current = false; if (mountedRef.current) setSaving(false); }
  };
  useEffect(() => {
    mountedRef.current = true; const audio = new GameAudio(); audioRef.current = audio;
    const media = window.matchMedia("(prefers-reduced-motion: reduce)"); const update = () => setReducedByOs(media.matches);
    const frame = requestAnimationFrame(() => { update(); setShowTouch(window.matchMedia("(pointer: coarse)").matches); setShowDemo(window.matchMedia("(min-width: 651px)").matches); if (!pausedRef.current && !latestRef.current.externallyPaused) canvasRef.current?.focus(); });
    media.addEventListener("change", update);
    return () => { mountedRef.current = false; cancelAnimationFrame(frame); media.removeEventListener("change", update); audio.dispose(); audioRef.current = null; };
  }, []);
  useEffect(() => { audioRef.current?.setMix({ master: props.masterVolume ?? 1, effects: props.effectsVolume ?? 1, music: 0, muted: props.soundEnabled === false || effectivePaused }); }, [props.masterVolume, props.effectsVolume, props.soundEnabled, effectivePaused]);
  useEffect(() => {
    let active = true;
    loadYouthArt(YOUTH_ART_MANIFEST).then(result => { if (active) { setBank(result); setArtError(""); requestAnimationFrame(() => { if (mountedRef.current && !pausedRef.current && !latestRef.current.externallyPaused) canvasRef.current?.focus(); }); } })
      .catch(error => { if (active) { setBank(null); setArtError(error instanceof Error ? error.message : "Les images de la formation sont indisponibles."); } });
    return () => { active = false; };
  }, [loadAttempt]);
  useEffect(() => { if (effectivePaused) { clearInput(); if (!props.externallyPaused) panelRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus(); } }, [effectivePaused, props.externallyPaused, clearInput]);
  useEffect(() => { if (!props.externallyPaused) return; const frame = requestAnimationFrame(() => { clearInput(); if (!pendingRef.current) checkpoint(); }); return () => cancelAnimationFrame(frame); }, [props.externallyPaused, clearInput, checkpoint]);
  useEffect(() => {
    const down = (event: KeyboardEvent) => {
      if (event.repeat || event.ctrlKey || event.metaKey || event.altKey || event.target !== canvasRef.current) return;
      if (event.code === "Escape" || latestRef.current.bindings[YOUTH_CONTROL_ACTIONS.pause].includes(event.code)) { event.preventDefault(); pause(); return; }
      if (["Tab", "ShiftLeft", "ShiftRight", "ControlLeft", "ControlRight", "AltLeft", "AltRight", "MetaLeft", "MetaRight"].includes(event.code)) return;
      event.preventDefault(); codesRef.current.add(event.code); void audioRef.current?.unlock();
    };
    const up = (event: KeyboardEvent) => { codesRef.current.delete(event.code); releaseCodesRef.current.delete(event.code); };
    const blur = () => pause(); const visibility = () => { if (document.hidden) pause(); };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", blur); window.addEventListener("pagehide", blur); document.addEventListener("visibilitychange", visibility);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", blur); window.removeEventListener("pagehide", blur); document.removeEventListener("visibilitychange", visibility); };
  }, [pause]);
  useEffect(() => {
    const canvas = canvasRef.current, ctx = canvas?.getContext("2d"); if (!canvas || !ctx) return;
    let frameId = 0, previous = 0, accumulated = 0, lastUi = 0, lastCheckpointTick = stateRef.current.tick, hadPad = false, previousPadPause = false, previousPadChoice = 0, previousPadActive = false;
    const render = (timestamp: number) => {
      let pad: Gamepad | null = null; try { pad = Array.from(navigator.getGamepads?.() ?? []).find(item => item?.connected && item.mapping === "standard") ?? null; } catch { /* Keyboard and touch remain usable. */ }
      if (hadPad && !pad) pause(); hadPad = Boolean(pad);
      const sample = sampleYouthControls(codesRef.current, touchRef.current, latestRef.current.bindings, pad);
      if (pad && !sample.neutral && !previousPadActive) void audioRef.current?.unlock(); previousPadActive = Boolean(pad) && !sample.neutral;
      if (sample.pause && !previousPadPause) { if (pausedRef.current) resume(); else pause(); } previousPadPause = sample.pause;
      const blocked = pausedRef.current || latestRef.current.externallyPaused === true || pendingRef.current !== null || busyRef.current;
      if (blocked) armedRef.current = false; else if (sample.neutral && releaseCodesRef.current.size === 0) armedRef.current = true;
      if (stateRef.current.phase === "armory" && sample.choiceStep !== 0 && sample.choiceStep !== previousPadChoice && !blocked && armedRef.current) {
        const colors = ["ochre", "ash", "rust"] as const; const current = colors.indexOf(stateRef.current.cosmetic ?? "ochre"); choiceRef.current = colors[(current + sample.choiceStep + colors.length) % colors.length];
      }
      previousPadChoice = sample.choiceStep;
      const elapsed = previous ? Math.min(100, Math.max(0, timestamp - previous)) : 0; previous = timestamp;
      const pausedNow = blocked || !armedRef.current || bank === null || document.hidden;
      let phaseChanged = false;
      if (pausedNow) { accumulated = 0; stateRef.current = stepYouthTraining(stateRef.current, {}, { assetsReady: bank !== null, pageVisible: !document.hidden, paused: true }).state; }
      else {
        accumulated += elapsed; let steps = 0;
        while (accumulated >= 1000 / 60 && steps < 6) {
          accumulated -= 1000 / 60; steps++;
          const prior = stateRef.current.phase;
          const result = stepYouthTraining(stateRef.current, { ...sample.actions, choice: choiceRef.current }, { assetsReady: true, pageVisible: true, paused: false });
          if (result.state.cosmetic === choiceRef.current) choiceRef.current = undefined; stateRef.current = result.state; phaseChanged ||= prior !== result.state.phase;
          for (const event of result.events) { if (event.type === "hit") audioRef.current?.hit(); if (event.type === "milestone") audioRef.current?.weaponSwitch(); }
          if (result.receipts.length) { pendingRef.current = { receipts: result.receipts, state: result.state }; setPending(true); clearInput(); accumulated = 0; void submitProgress(); break; }
        }
      }
      drawYouthScene(ctx, stateRef.current, bank, reducedMotion);
      if (demoPhaseRef.current !== stateRef.current.phase) { demoPhaseRef.current = stateRef.current.phase; demoTickRef.current = 0; demoPlayingRef.current = !reducedMotion; }
      if (demoPlayingRef.current && !pausedNow) { demoTickRef.current += elapsed * 60 / 1000; if (getYouthDemonstration(stateRef.current.phase, demoTickRef.current).done) demoPlayingRef.current = false; }
      const demoCtx = demoCanvasRef.current?.getContext("2d"); if (demoCtx) drawYouthDemonstration(demoCtx, stateRef.current.phase, bank, demoTickRef.current, reducedMotion && !demoPlayingRef.current);
      canvas.dataset.youthPhase = stateRef.current.phase; canvas.dataset.youthTick = String(stateRef.current.tick); canvas.dataset.youthPaused = String(pausedNow);
      canvas.dataset.youthPositions = `${stateRef.current.player.x.toFixed(2)},${stateRef.current.rival.x.toFixed(2)}`;
      canvas.dataset.youthY = String(stateRef.current.player.y); canvas.dataset.youthPose = youthActorPose(stateRef.current); canvas.dataset.youthAssets = String(bank !== null);
      canvas.dataset.youthRivalPose = stateRef.current.rival.action; canvas.dataset.youthRivalActionTick = String(stateRef.current.rival.actionTick);
      canvas.dataset.youthCounter = String(getYouthObjective(stateRef.current).counter); canvas.dataset.youthTarget = String(getYouthObjective(stateRef.current).targetX ?? "");
      canvas.dataset.youthFacing = String(stateRef.current.player.facing); canvas.dataset.youthVy = String(stateRef.current.player.vy); canvas.dataset.youthArmed = String(stateRef.current.inputArmed);
      canvas.dataset.youthClues = String(stateRef.current.desert?.clues ?? 0);
      canvas.dataset.youthScan = String(stateRef.current.desert?.scanTicks ?? 0);
      canvas.dataset.youthComposure = `${stateRef.current.player.composure},${stateRef.current.rival.composure}`;
      if (!pendingRef.current && !busyRef.current && !pausedNow && (phaseChanged || stateRef.current.tick - lastCheckpointTick >= 120)) { lastCheckpointTick = stateRef.current.tick; checkpoint(); }
      if (phaseChanged || timestamp - lastUi >= 80) { lastUi = timestamp; setState(stateRef.current); setReleaseRequired(!blocked && (!armedRef.current || !stateRef.current.inputArmed)); }
      frameId = requestAnimationFrame(render);
    };
    frameId = requestAnimationFrame(render); return () => cancelAnimationFrame(frameId);
  }, [bank, checkpoint, clearInput, pause, reducedMotion, resume, submitProgress]);
  const setTouch = (action: YouthTouchAction, down: boolean, event?: ReactPointerEvent<HTMLButtonElement>) => {
    if (down) { if (effectivePaused || pendingRef.current) return; if (event) { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); } touchRef.current.add(action); void audioRef.current?.unlock(); }
    else touchRef.current.delete(action);
  };
  const pulse = (action: YouthTouchAction) => { if (effectivePaused || pendingRef.current) return; touchRef.current.add(action); void audioRef.current?.unlock(); setTimeout(() => touchRef.current.delete(action), 100); };
  const touchButton = (action: YouthTouchAction, label: string, title: string) => <button type="button" key={action} aria-label={title} data-youth-action={action} disabled={action === "blade" && state.milestones["youth-first-blade"] === undefined}
    onPointerDown={event => setTouch(action, true, event)} onPointerUp={event => setTouch(action, false, event)} onPointerCancel={() => setTouch(action, false)} onLostPointerCapture={() => setTouch(action, false)}
    onKeyDown={event => { if ((event.key === "Enter" || event.key === " ") && !event.repeat) { event.preventDefault(); setTouch(action, true); } }}
    onKeyUp={event => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); setTouch(action, false); } }} onBlur={() => setTouch(action, false)}>{label}</button>;
  const choose = (choice: "ochre" | "ash" | "rust") => { choiceRef.current = choice; canvasRef.current?.focus(); };
  return <section className={styles.screen} data-youth-immersive data-youth-training data-youth-step={state.phase} data-reduced-motion={reducedMotion}>
    <header className={styles.toolbar}><span>Jeunesse · {state.phase.startsWith("desert-") ? "Sortie accompagnée" : "Formation Unblooded"}</span><div><button type="button" aria-label="Pause et commandes" onClick={pause}>Pause</button><button type="button" aria-label="Commandes tactiles" aria-pressed={showTouch} onClick={() => setShowTouch(value => !value)}>Tactile</button></div></header>
    <div className={styles.objective} data-youth-hud><h1>{objective.title}</h1><p>{objective.instruction}</p>{state.phase !== "rest" && state.phase !== "morning" && <p className={styles.shortcut}>Déplacement : {controlActionShortcut(YOUTH_CONTROL_ACTIONS.left, props.bindings)} / {controlActionShortcut(YOUTH_CONTROL_ACTIONS.right, props.bindings)}{lessonAction && <> · {lessonLabel} : {controlActionShortcut(YOUTH_CONTROL_ACTIONS[lessonAction], props.bindings)}</>}</p>}<div className={styles.measures}>{state.phase === "dojo-dodge" && state.rival.action === "jab" && state.rival.actionTick < 32 && <span role="status">{state.rival.actionTick < 12 ? "Le maître prépare son coup…" : "Esquivez maintenant !"}</span>}{objective.required > 1 && <span>Progression : {objective.counter} / {objective.required}</span>}{objective.timerTicks !== null && <span role="timer">Temps : {(objective.timerTicks / 60).toFixed(1)} s</span>}</div>
      {(state.phase === "camp-duel" || state.phase === "camp-defeat") && <div className={styles.duelMeters} aria-label="Équilibre du duel non létal">
        {([["vous", state.player.composure], ["maître", state.rival.composure]] as const).map(([name, value]) => <div className={styles.duelMeter} key={name}>
          <div><span>Équilibre — {name}</span><span>{value} / 100</span></div>
          <div role="meter" aria-label={`Équilibre — ${name}`} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value} aria-valuetext={`${value} sur 100, duel non létal`}><span style={{ width: `${value}%` }} /></div>
        </div>)}
      </div>}
      {state.phase.startsWith("dojo-") && <div className={styles.demonstration} data-youth-demonstration>
        {showDemo && <canvas ref={demoCanvasRef} width={220} height={128} role="img" aria-label="Démonstration visuelle du maître. Reproduisez le geste dans le terrain de formation." />}
        <div><button type="button" data-youth-control aria-expanded={showDemo} onClick={() => setShowDemo(value => !value)}>{showDemo ? "Masquer la démonstration" : "Voir la démonstration"}</button>
        {showDemo && <button type="button" data-youth-control disabled={!bank || effectivePaused} onClick={() => { demoTickRef.current = 0; demoPlayingRef.current = true; canvasRef.current?.focus(); }}>Revoir le geste du maître</button>}</div>
      </div>}
    </div>
    <div className={styles.stage}><canvas ref={canvasRef} data-youth-stage width={960} height={540} tabIndex={0} aria-label="Formation jouable de l’Unblooded. Déplacement, saut, esquive, frappe et projection. Pause pour les commandes."
      onPointerDown={() => canvasRef.current?.focus()} onBlur={event => { const target = event.relatedTarget; if (bank !== null && ACTIVE(stateRef.current.phase) && !pausedRef.current && !latestRef.current.externallyPaused && !(target instanceof HTMLElement && (target.hasAttribute("data-youth-action") || target.hasAttribute("data-youth-control")))) pause(); }} />
      {!bank && <div className={styles.overlay} role="status"><p>{artError ? "La formation attend ses images." : "Chargement du dojo…"}</p>{artError && <><p className={styles.error}>{artError}</p><button type="button" data-youth-control onClick={() => { setArtError(""); setLoadAttempt(value => value + 1); }}>Réessayer le chargement</button><button type="button" onClick={() => void exit()}>Retour au menu</button></>}</div>}
      {state.phase === "desert-tracks" && <aside className={styles.fieldNotes} aria-label="Carnet de terrain" data-youth-field-notes>
        <strong>Observation : {state.desert?.clues ?? 0} / 3</strong>
        <progress max={YOUTH_DESERT_SCAN_TICKS} value={state.desert?.scanTicks ?? 0} aria-label="Examen de l’indice proche" />
        {(state.desert?.clues ?? 0) > 0 && <p>{YOUTH_DESERT_CLUES[(state.desert?.clues ?? 1) - 1].reading}</p>}
      </aside>}
      {state.phase === "rest" && <div className={styles.rest} role="status"><p>Le camp s’apaise. La nuit passe.</p></div>}
      {paused && !props.externallyPaused && <div className={styles.backdrop}><div ref={panelRef} className={styles.pause} role="dialog" aria-modal="true" aria-label="Formation en pause" onKeyDown={event => {
        if (event.key === "Escape") { event.preventDefault(); resume(); }
        if (event.key !== "Tab") return;
        const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLElement>("button:not(:disabled),input:not(:disabled),[tabindex='0']")); const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); } else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}><h2>Formation en pause</h2><p><strong>{objective.title}</strong><br />{objective.instruction}</p><p>Le parcours, le chronomètre et le combat sont arrêtés. Relâchez les commandes avant de reprendre.</p>
        <div className={styles.commandList}>{TOUCH_ACTIONS.map(([action, label]) => <p key={action}><kbd>{controlActionShortcut(YOUTH_CONTROL_ACTIONS[action], props.bindings)}</kbd><span>{label}</span></p>)}</div>
        <p>Manette : stick/croix · A saut · X poing · Y lame · B esquive · RB projection · LB interaction · Menu pause.</p>
        {props.onOpenSettings && <button type="button" onClick={() => { clearInput(); if (checkpoint()) latestRef.current.onOpenSettings?.(); }}>Réglages et sauvegardes</button>}
        {pending && <button type="button" disabled={saving} onClick={() => void submitProgress()}>Réessayer l’enregistrement</button>}
        <button type="button" disabled={pending || saving} onClick={resume}>Reprendre la formation</button><button type="button" disabled={pending || saving} onClick={() => void exit()}>Enregistrer et revenir au menu</button>
      </div></div>}
    </div>
    <p className={styles.srOnly} aria-live="polite">{objective.title}. {objective.instruction}{state.phase === "desert-tracks" && (state.desert?.clues ?? 0) > 0 ? ` ${YOUTH_DESERT_CLUES[(state.desert?.clues ?? 1) - 1].reading}` : ""}</p>
    {releaseRequired && <p className={styles.notice} role="status">Relâchez les commandes pour reprendre la formation.</p>}
    {(saveError || props.persistenceError || pending) && <div className={styles.saveError} role={saveError || props.persistenceError ? "alert" : "status"}><p>{props.persistenceError || saveError || "Enregistrement de l’étape gagnée…"}</p>{pending && !saving && !paused && <button type="button" onClick={() => void submitProgress()}>Réessayer l’enregistrement</button>}</div>}
    {state.phase === "armory" && !effectivePaused && !pending && <div className={styles.choices}><p>Choisissez la teinte de votre lien, puis rejoignez le poste pour recevoir le biomask. Il sera conservé pour la sortie ; les exercices restent sans masque. Manette : croix haut/bas pour choisir.</p>{(["ochre", "ash", "rust"] as const).map((choice, index) => <button type="button" key={choice} data-youth-choice={choice} aria-pressed={state.cosmetic === choice} onClick={() => choose(choice)}>{["Ocre", "Cendre", "Rouille"][index]}</button>)}</div>}
    {state.phase === "camp-defeat" && !effectivePaused && !pending && <div className={styles.choices}><p>Entraînement non létal. Les exercices déjà réussis restent acquis.</p><button type="button" onClick={() => pulse("retry")}>Réessayer le combat du camp</button></div>}
    {state.phase === "morning" && !pending && <div className={styles.choices}><p>La formation et le repos sont enregistrés. Le maître prépare une reconnaissance accompagnée du désert ; vous ne possédez pas encore de vaisseau.</p><button type="button" data-youth-departure disabled={saving || effectivePaused} onClick={() => { pulse("confirm"); canvasRef.current?.focus(); }}>Partir vers le désert avec le maître</button><button type="button" disabled={saving || !props.onReturnToCity} onClick={() => void returnToCity()}>Revenir dans la cité au matin</button></div>}
    {state.phase === "desert-complete" && !pending && <div className={styles.choices}><p>Le maître a reçu les trois observations et vous êtes revenu au camp. Cette sortie ne valide aucune chasse autonome. La petite cage du PIT de jeunesse reste à venir.</p><button type="button" disabled={saving || !props.onReturnToCity} onClick={() => void returnToCity()}>Revenir dans la cité après la sortie</button></div>}
    {showTouch && !effectivePaused && !pending && state.phase !== "morning" && state.phase !== "desert-complete" && state.phase !== "rest" && <div className={styles.touch} aria-label="Commandes tactiles de la formation">{TOUCH_ACTIONS.map(([action, label, title]) => touchButton(action, label, title))}</div>}
  </section>;
}
