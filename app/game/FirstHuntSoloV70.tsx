"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import type { ControlBindings } from "./systems/controlBindings";
import { sampleYouthControls, YOUTH_CONTROL_ACTIONS, type YouthTouchAction } from "./systems/youthControls";
import { controlActionShortcut } from "./controlBindingLabels";
import { type YouthArtBank } from "./youthTrainingRendering";
import { GameAudio } from "./sound";
import YautjaTranslationV67 from "./YautjaTranslationV67";
import { drawFirstHuntSoloV70, loadTempleArtV70 } from "./firstHuntSoloV70Rendering";
import { normalizeSoloV70State, stepSoloV70, soloV70NeedsImmediateCheckpoint, soloV70Objective, SOLO_V70_ROOMS, type SoloV70State, type SoloV70Receipt } from "./systems/firstHuntSoloV70";
import styles from "./FirstHuntSoloV70.module.css";

export interface FirstHuntSoloV70Props {
  checkpoint: unknown; bindings: ControlBindings; externallyPaused?: boolean; reducedMotion?: boolean; persistenceError?: string | null;
  soundEnabled?: boolean; masterVolume?: number; effectsVolume?: number;
  onCheckpoint(state: SoloV70State): boolean;
  onProgress(receipts: readonly SoloV70Receipt[], state: SoloV70State): Promise<boolean>;
  onExit(): void | Promise<void>; onReturnToCity(): Promise<boolean>; onOpenSettings?(): void;
}
const BUTTONS = [["left", "←"], ["right", "→"], ["jump", "Saut"], ["blade", "Lame / Signal"], ["interact", "Interagir"]] as const;
/** The owner commits every receipt before simulation resumes. A rejected checkpoint stays mounted. */
export default function FirstHuntSoloV70(props: FirstHuntSoloV70Props) {
  const [initial] = useState(() => normalizeSoloV70State(props.checkpoint));
  const stateRef = useRef(initial), latest = useRef(props), canvasRef = useRef<HTMLCanvasElement>(null), panelRef = useRef<HTMLDivElement>(null);
  const codes = useRef(new Set<string>()), release = useRef(new Set<string>()), touch = useRef(new Set<YouthTouchAction>());
  const pausedRef = useRef(false), mounted = useRef(false), busy = useRef(false);
  const audioRef = useRef<GameAudio | null>(null);
  const pending = useRef<{ state: SoloV70State; receipts: readonly SoloV70Receipt[] } | null>(null);
  const [state, setState] = useState(initial), [bank, setBank] = useState<YouthArtBank | null>(null);
  const [artError, setArtError] = useState(""), [saveError, setSaveError] = useState(""), [loadAttempt, setLoadAttempt] = useState(0);
  const [paused, setPaused] = useState(false), [pendingUi, setPendingUi] = useState(false), [saving, setSaving] = useState(false), [touchUi, setTouchUi] = useState(false);
  useEffect(() => { latest.current = props; }, [props]);
  const clear = useCallback(() => { for (const code of codes.current) release.current.add(code); codes.current.clear(); touch.current.clear(); }, []);
  const checkpoint = useCallback(() => {
    if (pending.current || !stateRef.current) return false;
    try { if (latest.current.onCheckpoint(stateRef.current)) { setSaveError(""); return true; } } catch { /* Retain the current physical state for retry. */ }
    clear(); pausedRef.current = true; setPaused(true); setSaveError("Sauvegarde refusée. Cette scène reste ouverte ; réessaie sans perdre tes actions."); return false;
  }, [clear]);
  const pause = useCallback(() => { clear(); pausedRef.current = true; setPaused(true); if (!pending.current) checkpoint(); }, [clear, checkpoint]);
  const resume = useCallback(() => {
    if (pending.current || latest.current.externallyPaused || !checkpoint()) return;
    clear(); pausedRef.current = false; setPaused(false); requestAnimationFrame(() => canvasRef.current?.focus());
  }, [clear, checkpoint]);
  const submit = useCallback(async () => {
    const item = pending.current; if (!item || busy.current) return;
    busy.current = true; setSaving(true); setSaveError("");
    try {
      if (!await latest.current.onProgress(item.receipts, item.state)) { if (mounted.current) setSaveError("Étape non enregistrée. Le résultat reste ici : réessaie l’écriture."); return; }
      if (pending.current === item) pending.current = null;
      if (mounted.current) {
        setPendingUi(false); clear();
        if (!pausedRef.current && !latest.current.externallyPaused) {
          audioRef.current?.setMuted(latest.current.soundEnabled === false);
          if (item.state.phase === "complete") audioRef.current?.victory(); else audioRef.current?.objective();
          canvasRef.current?.focus();
        }
      }
    } catch { if (mounted.current) setSaveError("Écriture interrompue. Le résultat attend toujours sa confirmation."); }
    finally { busy.current = false; if (mounted.current) setSaving(false); }
  }, [clear]);
  useEffect(() => {
    mounted.current = true; const audio = new GameAudio(); audioRef.current = audio;
    const overflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    const id = requestAnimationFrame(() => { setTouchUi(window.matchMedia("(pointer: coarse)").matches); canvasRef.current?.focus(); });
    return () => { mounted.current = false; document.body.style.overflow = overflow; cancelAnimationFrame(id); audio.dispose(); audioRef.current = null; };
  }, []);
  useEffect(() => { audioRef.current?.setMix({ master: props.masterVolume ?? 1, effects: props.effectsVolume ?? 1, music: 0, muted: props.soundEnabled === false || !!props.externallyPaused || paused || pendingUi || !!artError || !bank }); }, [props.masterVolume, props.effectsVolume, props.soundEnabled, props.externallyPaused, paused, pendingUi, artError, bank]);
  useEffect(() => {
    let active = true;
    loadTempleArtV70().then(result => { if (active) { setBank(result); setArtError(""); } }).catch(error => { if (active) { setBank(null); setArtError(error instanceof Error ? error.message : "Images indisponibles."); } });
    return () => { active = false; };
  }, [loadAttempt]);
  useEffect(() => {
    if (props.externallyPaused || paused || pendingUi || artError) clear();
    if ((paused || pendingUi || artError || state?.phase === "complete") && !props.externallyPaused) panelRef.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
  }, [props.externallyPaused, paused, pendingUi, saveError, artError, state?.phase, clear]);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (latest.current.externallyPaused || (e.target instanceof HTMLElement && e.target.closest("button,input,select,textarea"))) return;
      if (latest.current.bindings[YOUTH_CONTROL_ACTIONS.pause].includes(e.code)) { e.preventDefault(); if (!e.repeat) { if (pausedRef.current) resume(); else pause(); } return; }
      if (Object.values(YOUTH_CONTROL_ACTIONS).some(action => latest.current.bindings[action].includes(e.code))) { e.preventDefault(); if (!release.current.has(e.code)) { codes.current.add(e.code); void audioRef.current?.unlock(); } }
    };
    const up = (e: KeyboardEvent) => { codes.current.delete(e.code); release.current.delete(e.code); };
    const blur = () => pause(), hidden = () => { if (document.hidden) pause(); };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", blur); window.addEventListener("pagehide", blur); document.addEventListener("visibilitychange", hidden);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", blur); window.removeEventListener("pagehide", blur); document.removeEventListener("visibilitychange", hidden); };
  }, [pause, resume]);
  useEffect(() => {
    const canvas = canvasRef.current, ctx = canvas?.getContext("2d"); if (!canvas || !ctx || !stateRef.current) return;
    let raf = 0, previous = 0, accumulated = 0, lastUi = 0, lastSaveTick = stateRef.current.tick, padPause = false, hadPad = false, padActive = false;
    const loop = (time: number) => {
      let pad: Gamepad | null = null; try { pad = Array.from(navigator.getGamepads?.() ?? []).find(p => p?.connected && p.mapping === "standard") ?? null; } catch { /* Keyboard/touch remain usable. */ }
      if (hadPad && !pad) pause(); hadPad = !!pad;
      const sample = sampleYouthControls(codes.current, touch.current, latest.current.bindings, pad);
      if (pad && !sample.neutral && !padActive) void audioRef.current?.unlock(); padActive = !!pad && !sample.neutral;
      if (sample.pause && !padPause) { if (pausedRef.current) resume(); else pause(); } padPause = sample.pause;
      const blocked = pausedRef.current || latest.current.externallyPaused === true || !!pending.current || busy.current || release.current.size > 0 || document.hidden || !bank;
      audioRef.current?.setMuted(blocked || latest.current.soundEnabled === false);
      const elapsed = previous ? Math.min(100, Math.max(0, time - previous)) : 0; previous = time;
      let changed = false;
      if (blocked) { accumulated = 0; stateRef.current = stepSoloV70(stateRef.current!, {}, { assetsReady: !!bank, pageVisible: !document.hidden, paused: true }).state; }
      else {
        accumulated += elapsed; let steps = 0;
        while (accumulated >= 1000 / 60 && steps++ < 6) {
          accumulated -= 1000 / 60; const prior = stateRef.current!;
          const output = stepSoloV70(stateRef.current!, { move: sample.actions.move, jump: sample.actions.jump, interact: sample.actions.interact, command: sample.actions.blade }, { assetsReady: true, pageVisible: true, paused: false });
          stateRef.current = output.state; changed ||= output.state.phase !== prior.phase;
          // Existing sounds follow physical simulation events; a receipt's
          // objective/victory cue belongs to its durable confirmation above.
          const next = output.state, audio = audioRef.current;
          if (prior.player.vy === 0 && next.player.vy < -10) audio?.jump();
          if (next.attackTimer === 18 && prior.attackTimer !== 18) audio?.slash();
          if (next.health < prior.health) audio?.hit();
          if (next.signs > prior.signs) audio?.scan();
          if (next.room !== prior.room || next.companionMode !== prior.companionMode || prior.liftTicks === 0 && next.liftTicks > 0 || next.valveTimer > prior.valveTimer) audio?.ui();
          if (next.drone.mode === "telegraph" && prior.drone.mode !== "telegraph") audio?.enemyAlert();
          if (next.failedAt !== null && prior.failedAt === null) audio?.defeat();
          if (output.receipts.length) { pending.current = output; audio?.setMuted(true); setPendingUi(true); accumulated = 0; clear(); void submit(); break; }
          if (soloV70NeedsImmediateCheckpoint(prior, output.state)) {
            lastSaveTick = output.state.tick;
            if (!checkpoint()) { accumulated = 0; break; }
          }
        }
      }
      const current = stateRef.current!;
      // Keep the vertical gameplay scale on portrait screens; show less world horizontally instead of shrinking actors into a letterboxed strip.
      const logicalWidth = Math.max(320, Math.min(960, Math.round(540 * canvas.clientWidth / Math.max(1, canvas.clientHeight))));
      if (canvas.width !== logicalWidth) canvas.width = logicalWidth;
      drawFirstHuntSoloV70(ctx, current, bank, latest.current.reducedMotion === true);
      Object.assign(canvas.dataset, { soloPhase: current.phase, soloRoom: String(current.room), soloTick: String(current.tick), soloAssets: String(!!bank), soloPaused: String(blocked), soloState: JSON.stringify(current) });
      if (!blocked && !pending.current && (changed || current.tick - lastSaveTick >= 120)) { lastSaveTick = current.tick; checkpoint(); }
      if (changed || time - lastUi > 90) { lastUi = time; setState(current); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf);
  }, [bank, checkpoint, clear, pause, resume, submit]);
  const setTouch = (action: YouthTouchAction, on: boolean, event?: PointerEvent<HTMLButtonElement>) => {
    if (on) { if (pausedRef.current || pending.current || props.externallyPaused) return; if (event) { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); } touch.current.add(action); void audioRef.current?.unlock(); }
    else touch.current.delete(action);
  };
  const leave = async (city: boolean) => {
    clear(); if (!checkpoint() || busy.current) return; busy.current = true; setSaving(true);
    try { if (city) { if (!await latest.current.onReturnToCity()) setSaveError("Le retour attend une sauvegarde valide."); } else await latest.current.onExit(); }
    catch { setSaveError("Le départ a échoué. La scène reste disponible."); }
    finally { busy.current = false; if (mounted.current) setSaving(false); }
  };
  const objective = state ? soloV70Objective(state) : null;
  const spoken = state?.phase === "briefing" ? "Saar et Vek entrent avec toi. Les outils ouvrent la route ; seules des chasses réelles et le retour des trois achèveront le rite." : state?.phase === "debrief" ? "Le drone de la vanne est tombé. Les profondeurs sont fermées, elles ne sont pas purgées. Nomme précisément ce qui reste." : state?.phase === "recognition" ? "Le clan reçoit votre ouverture. La reine et chaque chasse individuelle restent devant vous. Votre rang demeure Young Blood." : "";
  const modal = !state || !!artError || paused || pendingUi && !!saveError || state?.phase === "complete" && !pendingUi;
  const notice = state?.failedAt !== null && state?.failedAt !== undefined ? "La triade attend au point sûr. Relâche puis presse Interaction pour réessayer sans perdre les preuves." : state?.phase === "drone" && state.drone.mode === "telegraph" ? "CHARGE ANNONCÉE — saute ou écarte-toi avant de frapper pendant le retrait." : state?.phase === "quarantine" && state.valveTimer ? `VANNE OUVERTE · ${(state.valveTimer / 60).toFixed(1)} s pour atteindre la seconde.` : "";
  return <section className={styles.screen} data-solo-v70 data-solo-step={state?.phase ?? "invalid"}>
    <header className={styles.header} inert={modal && !props.externallyPaused ? true : undefined}><strong>CAMPAGNE · TEMPLE DES TROIS OMBRES · ACTE I</strong><div><button type="button" onClick={pause} disabled={!state || pendingUi}>Pause</button><button type="button" onClick={() => setTouchUi(v => !v)} aria-pressed={touchUi}>Tactile</button></div></header>
    <div className={styles.objective}><h1>{objective?.title ?? "Checkpoint non pris en charge"}</h1><p>{objective?.instruction ?? "La partie est conservée. Aucun état neuf ne remplace ce checkpoint."}</p>{state && <div className={styles.measure}><span>{SOLO_V70_ROOMS[state.room].name}</span><span>{SOLO_V70_ROOMS[state.room].level} · Configuration {state.configuration}</span><span>Secteurs {state.visited.filter(Boolean).length}/9</span><span>Vitalité {state.health}/6</span>{saving && <span role="status">Enregistrement…</span>}</div>}</div>
    <div className={styles.view} inert={modal && !props.externallyPaused ? true : undefined}><canvas ref={canvasRef} width={960} height={540} tabIndex={0} aria-label="Terrain jouable du Temple des Trois Ombres. Déplacement, saut, plaques de triade, mécanismes, portes et combat physique." />{spoken && !modal && <p className={styles.spoken}><YautjaTranslationV67 text={spoken} paused={paused || !!props.externallyPaused || pendingUi} reducedMotion={props.reducedMotion} /></p>}{notice && !modal && <p className={styles.notice} role="status">{notice}</p>}</div>
    {touchUi && <div className={styles.controls} aria-label="Commandes tactiles du Temple des Trois Ombres">{BUTTONS.map(([action, label]) => <button type="button" key={action} data-solo-action={action} disabled={!!modal || !!props.externallyPaused || pendingUi} onPointerDown={e => setTouch(action, true, e)} onPointerUp={() => setTouch(action, false)} onPointerCancel={() => setTouch(action, false)} onLostPointerCapture={() => setTouch(action, false)} onBlur={() => setTouch(action, false)} onKeyDown={e => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); setTouch(action, true); } }} onKeyUp={e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setTouch(action, false); } }}>{label}</button>)}</div>}
    <p className={styles.keys}>Marcher {controlActionShortcut(YOUTH_CONTROL_ACTIONS.left, props.bindings)} / {controlActionShortcut(YOUTH_CONTROL_ACTIONS.right, props.bindings)} · Saut {controlActionShortcut(YOUTH_CONTROL_ACTIONS.jump, props.bindings)} · Lame / Signal {controlActionShortcut(YOUTH_CONTROL_ACTIONS.blade, props.bindings)} · Interagir {controlActionShortcut(YOUTH_CONTROL_ACTIONS.interact, props.bindings)} · Manette : croix/stick, A, Y, LB</p>
    {modal && !props.externallyPaused && <div className={styles.overlay}><div ref={panelRef} className={styles.panel} role="dialog" aria-modal="true" aria-label={state?.phase === "complete" ? "Évaluation terminée" : "Pause et sauvegarde"} onKeyDown={e => {
      if (e.key === "Escape" && paused && !pendingUi) { e.preventDefault(); resume(); }
      if (e.key === "Tab") { const nodes = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")); if (!nodes.length) return; const first = nodes[0], last = nodes[nodes.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
    }}><h2>{state?.phase === "complete" ? "Évaluation conservée" : "Le Temple des Trois Ombres · Acte I"}</h2>
      {!state ? <p>Le checkpoint est invalide ou appartient à une version non prise en charge. Reviens au menu pour consulter les sauvegardes ; il n’a pas été écrasé.</p> : state.phase === "complete" ? <p>Le vétéran reçoit les neuf secteurs et les trois configurations, le drone neutralisé et la vanne locale isolée. Tu restes Young Blood : les profondeurs, la reine, les chasses individuelles de la triade et le rite Blooded restent à accomplir.</p> : <p>Les mécanismes, les compagnons et le combat sont arrêtés. Relâche les commandes avant la reprise.</p>}
      {(saveError || props.persistenceError) && <p className={styles.error} role="alert">{saveError || props.persistenceError}</p>}{artError && <p className={styles.error} role="alert">{artError}</p>}
      <nav>{!state ? <button type="button" onClick={() => void props.onExit()}>Retour au menu</button> : <>
        {artError && <button type="button" onClick={() => { setArtError(""); setLoadAttempt(a => a + 1); }}>Recharger les images</button>}
        {pendingUi ? <button type="button" disabled={saving} onClick={() => void submit()}>Réessayer l’enregistrement</button> : state.phase === "complete" ? <button type="button" disabled={saving} data-solo-return onClick={() => void leave(true)}>Revenir dans la cité</button> : <button type="button" disabled={!!artError || saving} onClick={resume}>Reprendre</button>}
        {!pendingUi && <button type="button" disabled={saving} onClick={() => void leave(false)}>Sauvegarder et quitter</button>}
        {props.onOpenSettings && !pendingUi && <button type="button" onClick={() => { if (checkpoint()) props.onOpenSettings?.(); }}>Réglages</button>}
      </>}</nav>
    </div></div>}
  </section>;
}
