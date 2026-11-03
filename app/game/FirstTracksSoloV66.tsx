"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import type { ControlBindings } from "./systems/controlBindings";
import { sampleYouthControls, YOUTH_CONTROL_ACTIONS, type YouthTouchAction } from "./systems/youthControls";
import { controlActionShortcut } from "./controlBindingLabels";
import { loadYouthArt, type YouthArtBank } from "./youthTrainingRendering";
import { YOUTH_ART_MANIFEST } from "./youthArtManifest";
import { drawFirstTracksSoloV66 } from "./firstTracksSoloV66Rendering";
import { normalizeSoloV66State, stepSoloV66, soloV66Objective, soloV66Grazer, SOLO_V66_CLUES, SOLO_V66_FALSE_TRAIL, SOLO_V66_OBSERVE_TICKS, type SoloV66State, type SoloV66Receipt } from "./systems/firstTracksSoloV66";
import styles from "./FirstTracksSoloV66.module.css";

export interface FirstTracksSoloV66Props {
  checkpoint: unknown; bindings: ControlBindings; externallyPaused?: boolean; reducedMotion?: boolean; persistenceError?: string | null;
  onCheckpoint(state: SoloV66State): boolean;
  onProgress(receipts: readonly SoloV66Receipt[], state: SoloV66State): Promise<boolean>;
  onExit(): void | Promise<void>; onReturnToCity(): Promise<boolean>; onOpenSettings?(): void;
}
const BUTTONS = [["left", "←"], ["right", "→"], ["jump", "Saut"], ["dodge", "Pas feutré"], ["interact", "Interagir"]] as const;
/** The owner commits every receipt before simulation resumes. A rejected checkpoint stays mounted. */
export default function FirstTracksSoloV66(props: FirstTracksSoloV66Props) {
  const [initial] = useState(() => normalizeSoloV66State(props.checkpoint));
  const stateRef = useRef(initial), latest = useRef(props), canvasRef = useRef<HTMLCanvasElement>(null), panelRef = useRef<HTMLDivElement>(null);
  const codes = useRef(new Set<string>()), release = useRef(new Set<string>()), touch = useRef(new Set<YouthTouchAction>());
  const pausedRef = useRef(false), mounted = useRef(false), busy = useRef(false);
  const pending = useRef<{ state: SoloV66State; receipts: readonly SoloV66Receipt[] } | null>(null);
  const [state, setState] = useState(initial), [bank, setBank] = useState<YouthArtBank | null>(null);
  const [artError, setArtError] = useState(""), [saveError, setSaveError] = useState(""), [loadAttempt, setLoadAttempt] = useState(0);
  const [paused, setPaused] = useState(false), [pendingUi, setPendingUi] = useState(false), [saving, setSaving] = useState(false), [touchUi, setTouchUi] = useState(false);
  useEffect(() => { latest.current = props; }, [props]);
  const clear = useCallback(() => { for (const code of codes.current) release.current.add(code); codes.current.clear(); touch.current.clear(); }, []);
  const checkpoint = useCallback(() => {
    if (pending.current || !stateRef.current) return false;
    try { if (latest.current.onCheckpoint(stateRef.current)) { setSaveError(""); return true; } } catch { /* Retain the current physical state for retry. */ }
    pausedRef.current = true; setPaused(true); setSaveError("Sauvegarde refusée. Cette scène reste ouverte ; réessaie sans perdre tes actions."); return false;
  }, []);
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
      if (mounted.current) { setPendingUi(false); clear(); if (!pausedRef.current && !latest.current.externallyPaused) canvasRef.current?.focus(); }
    } catch { if (mounted.current) setSaveError("Écriture interrompue. Le résultat attend toujours sa confirmation."); }
    finally { busy.current = false; if (mounted.current) setSaving(false); }
  }, [clear]);
  useEffect(() => {
    mounted.current = true; const overflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    const id = requestAnimationFrame(() => { setTouchUi(window.matchMedia("(pointer: coarse)").matches); canvasRef.current?.focus(); });
    return () => { mounted.current = false; document.body.style.overflow = overflow; cancelAnimationFrame(id); };
  }, []);
  useEffect(() => {
    let active = true;
    loadYouthArt(YOUTH_ART_MANIFEST).then(result => { if (active) { setBank(result); setArtError(""); } }).catch(error => { if (active) { setBank(null); setArtError(error instanceof Error ? error.message : "Images indisponibles."); } });
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
      if (Object.values(YOUTH_CONTROL_ACTIONS).some(action => latest.current.bindings[action].includes(e.code))) { e.preventDefault(); if (!release.current.has(e.code)) codes.current.add(e.code); }
    };
    const up = (e: KeyboardEvent) => { codes.current.delete(e.code); release.current.delete(e.code); };
    const blur = () => pause(), hidden = () => { if (document.hidden) pause(); };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", blur); window.addEventListener("pagehide", blur); document.addEventListener("visibilitychange", hidden);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", blur); window.removeEventListener("pagehide", blur); document.removeEventListener("visibilitychange", hidden); };
  }, [pause, resume]);
  useEffect(() => {
    const canvas = canvasRef.current, ctx = canvas?.getContext("2d"); if (!canvas || !ctx || !stateRef.current) return;
    let raf = 0, previous = 0, accumulated = 0, lastUi = 0, lastSaveTick = stateRef.current.tick, padPause = false, hadPad = false;
    const loop = (time: number) => {
      let pad: Gamepad | null = null; try { pad = Array.from(navigator.getGamepads?.() ?? []).find(p => p?.connected && p.mapping === "standard") ?? null; } catch { /* Keyboard/touch remain usable. */ }
      if (hadPad && !pad) pause(); hadPad = !!pad;
      const sample = sampleYouthControls(codes.current, touch.current, latest.current.bindings, pad);
      if (sample.pause && !padPause) { if (pausedRef.current) resume(); else pause(); } padPause = sample.pause;
      const blocked = pausedRef.current || latest.current.externallyPaused === true || !!pending.current || busy.current || release.current.size > 0 || document.hidden || !bank;
      const elapsed = previous ? Math.min(100, Math.max(0, time - previous)) : 0; previous = time;
      let changed = false;
      if (blocked) { accumulated = 0; stateRef.current = stepSoloV66(stateRef.current!, {}, { assetsReady: !!bank, pageVisible: !document.hidden, paused: true }).state; }
      else {
        accumulated += elapsed; let steps = 0;
        while (accumulated >= 1000 / 60 && steps++ < 6) {
          accumulated -= 1000 / 60; const prior = stateRef.current!.phase;
          const output = stepSoloV66(stateRef.current!, { move: sample.actions.move, jump: sample.actions.jump, quiet: sample.actions.dodge, interact: sample.actions.interact, attack: sample.actions.light || sample.actions.blade || sample.actions.throw }, { assetsReady: true, pageVisible: true, paused: false });
          stateRef.current = output.state; changed ||= output.state.phase !== prior;
          if (output.receipts.length) { pending.current = output; setPendingUi(true); accumulated = 0; clear(); void submit(); break; }
        }
      }
      const current = stateRef.current!;
      // Keep the vertical gameplay scale on portrait screens; show less world horizontally instead of shrinking actors into a letterboxed strip.
      const logicalWidth = Math.max(320, Math.min(960, Math.round(540 * canvas.clientWidth / Math.max(1, canvas.clientHeight))));
      if (canvas.width !== logicalWidth) canvas.width = logicalWidth;
      drawFirstTracksSoloV66(ctx, current, bank, latest.current.reducedMotion === true);
      Object.assign(canvas.dataset, { soloPhase: current.phase, soloTick: String(current.tick), soloX: String(current.player.x), soloY: String(current.player.y), soloVy: String(current.player.vy), soloArmed: String(current.inputArmed), soloClues: String(current.clues), soloAlert: String(current.alert), soloObservation: String(current.observationTicks), soloGrazerFacing: String(soloV66Grazer(current).facing), soloAssets: String(!!bank), soloPaused: String(blocked), soloAttempts: String(current.attempts) });
      if (!blocked && !pending.current && (changed || current.tick - lastSaveTick >= 120)) { lastSaveTick = current.tick; checkpoint(); }
      if (changed || time - lastUi > 90) { lastUi = time; setState(current); }
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop); return () => cancelAnimationFrame(raf);
  }, [bank, checkpoint, clear, pause, resume, submit]);
  const setTouch = (action: YouthTouchAction, on: boolean, event?: PointerEvent<HTMLButtonElement>) => {
    if (on) { if (pausedRef.current || pending.current || props.externallyPaused) return; if (event) { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); } touch.current.add(action); }
    else touch.current.delete(action);
  };
  const leave = async (city: boolean) => {
    clear(); if (!checkpoint() || busy.current) return; busy.current = true; setSaving(true);
    try { if (city) { if (!await latest.current.onReturnToCity()) setSaveError("Le retour attend une sauvegarde valide."); } else await latest.current.onExit(); }
    catch { setSaveError("Le départ a échoué. La scène reste disponible."); }
    finally { busy.current = false; if (mounted.current) setSaving(false); }
  };
  const objective = state ? soloV66Objective(state) : null;
  const modal = !state || !!artError || paused || pendingUi && !!saveError || state?.phase === "complete" && !pendingUi;
  const notice = state?.notice === "old-trail" ? SOLO_V66_FALSE_TRAIL.reading : state?.notice === "no-attack" ? "C’est une évaluation d’observation. Ne blesse pas cette proie ; aucune arme ne valide l’épreuve." : state && state.clues > 0 && state.phase === "trail" ? SOLO_V66_CLUES[state.clues - 1].reading : "";
  return <section className={styles.screen} data-solo-v66 data-solo-step={state?.phase ?? "invalid"}>
    <header className={styles.header}><strong>JEUNESSE · LES PREMIÈRES PISTES</strong><div><button type="button" onClick={pause} disabled={!state || pendingUi}>Pause</button><button type="button" onClick={() => setTouchUi(v => !v)} aria-pressed={touchUi}>Tactile</button></div></header>
    <div className={styles.objective}><h1>{objective?.title ?? "Checkpoint non pris en charge"}</h1><p>{objective?.instruction ?? "La partie est conservée. Aucun état neuf ne remplace ce checkpoint."}</p>{state && <div className={styles.measure}><span>Indices {state.clues}/3</span>{["stalk", "setback"].includes(state.phase) && <><span>Vigilance {Math.round(state.alert)} %</span><span>Observation {Math.round(state.observationTicks * 100 / SOLO_V66_OBSERVE_TICKS)} %</span><span>Essai {state.attempts}</span></>}{saving && <span role="status">Enregistrement…</span>}</div>}</div>
    <div className={styles.view}><canvas ref={canvasRef} width={960} height={540} tabIndex={0} aria-label="Terrain jouable des Premières Pistes. Déplacement, saut, pas feutré et interaction." />{notice && !modal && <p className={styles.notice} role="status">{notice}</p>}</div>
    {touchUi && <div className={styles.controls} aria-label="Commandes tactiles des Premières Pistes">{BUTTONS.map(([action, label]) => <button type="button" key={action} data-solo-action={action} disabled={!!modal || !!props.externallyPaused || pendingUi} onPointerDown={e => setTouch(action, true, e)} onPointerUp={() => setTouch(action, false)} onPointerCancel={() => setTouch(action, false)} onLostPointerCapture={() => setTouch(action, false)} onBlur={() => setTouch(action, false)} onKeyDown={e => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); setTouch(action, true); } }} onKeyUp={e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setTouch(action, false); } }}>{label}</button>)}</div>}
    <p className={styles.keys}>Marcher {controlActionShortcut(YOUTH_CONTROL_ACTIONS.left, props.bindings)} / {controlActionShortcut(YOUTH_CONTROL_ACTIONS.right, props.bindings)} · Saut {controlActionShortcut(YOUTH_CONTROL_ACTIONS.jump, props.bindings)} · Pas feutré {controlActionShortcut(YOUTH_CONTROL_ACTIONS.dodge, props.bindings)} · Interagir {controlActionShortcut(YOUTH_CONTROL_ACTIONS.interact, props.bindings)} · Manette : croix/stick, A, B, LB</p>
    {modal && !props.externallyPaused && <div className={styles.overlay}><div ref={panelRef} className={styles.panel} role="dialog" aria-modal="true" aria-label={state?.phase === "complete" ? "Évaluation terminée" : "Pause et sauvegarde"} onKeyDown={e => {
      if (e.key === "Escape" && paused && !pendingUi) { e.preventDefault(); resume(); }
      if (e.key === "Tab") { const nodes = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")); if (!nodes.length) return; const first = nodes[0], last = nodes[nodes.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
    }}><h2>{state?.phase === "complete" ? "Évaluation conservée" : "Les Premières Pistes"}</h2>
      {!state ? <p>Le checkpoint est invalide ou appartient à une version non prise en charge. Reviens au menu pour consulter les sauvegardes ; il n’a pas été écrasé.</p> : state.phase === "complete" ? <p>Trois indices, une observation et le retour ont été joués. Le mentor a enregistré la preuve. Aucun rang, trophée de chasse, équipement adulte ou vaisseau n’est accordé.</p> : <p>Le terrain, la vigilance et les gestes sont arrêtés. Relâche les commandes avant la reprise.</p>}
      {(saveError || props.persistenceError) && <p className={styles.error} role="alert">{saveError || props.persistenceError}</p>}{artError && <p className={styles.error} role="alert">{artError}</p>}
      <nav>{!state ? <button type="button" onClick={() => void props.onExit()}>Retour au menu</button> : <>
        {artError && <button type="button" onClick={() => { setArtError(""); setLoadAttempt(a => a + 1); }}>Recharger les images</button>}
        {pendingUi ? <button type="button" disabled={saving} onClick={() => void submit()}>Réessayer l’enregistrement</button> : state.phase === "complete" ? <button type="button" disabled={saving} data-solo-return onClick={() => void leave(true)}>Revenir dans la cité</button> : <button type="button" disabled={!!artError || saving} onClick={resume}>Reprendre</button>}
        {!pendingUi && <button type="button" disabled={saving} onClick={() => void leave(false)}>Sauvegarder et quitter</button>}
        {props.onOpenSettings && !pendingUi && <button type="button" onClick={() => { if (checkpoint()) props.onOpenSettings?.(); }}>Réglages</button>}
      </>}</nav><p className={styles.caption}>Épisode original du clan. Décors et poses natifs V48/V49/V52 réutilisés ; cette évaluation n’est pas un rite canonique.</p>
    </div></div>}
  </section>;
}
