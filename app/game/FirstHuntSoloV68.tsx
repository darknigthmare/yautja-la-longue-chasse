"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import type { ControlBindings } from "./systems/controlBindings";
import { sampleYouthControls, YOUTH_CONTROL_ACTIONS, type YouthTouchAction } from "./systems/youthControls";
import { controlActionShortcut } from "./controlBindingLabels";
import { loadYouthArt, type YouthArtBank } from "./youthTrainingRendering";
import { YOUTH_ART_MANIFEST } from "./youthArtManifest";
import YautjaTranslationV67 from "./YautjaTranslationV67";
import { drawFirstHuntSoloV68 } from "./firstHuntSoloV68Rendering";
import { normalizeSoloV68State, stepSoloV68, soloV68Objective, type SoloV68State, type SoloV68Receipt } from "./systems/firstHuntSoloV68";
import styles from "./FirstHuntSoloV68.module.css";

export interface FirstHuntSoloV68Props {
  checkpoint: unknown; bindings: ControlBindings; externallyPaused?: boolean; reducedMotion?: boolean; persistenceError?: string | null;
  onCheckpoint(state: SoloV68State): boolean;
  onProgress(receipts: readonly SoloV68Receipt[], state: SoloV68State): Promise<boolean>;
  onExit(): void | Promise<void>; onReturnToCity(): Promise<boolean>; onOpenSettings?(): void;
}
const BUTTONS = [["left", "←"], ["right", "→"], ["jump", "Saut"], ["light", "Toucher"], ["blade", "Suivre / Attendre"], ["interact", "Interagir"]] as const;
/** The owner commits every receipt before simulation resumes. A rejected checkpoint stays mounted. */
export default function FirstHuntSoloV68(props: FirstHuntSoloV68Props) {
  const [initial] = useState(() => normalizeSoloV68State(props.checkpoint));
  const stateRef = useRef(initial), latest = useRef(props), canvasRef = useRef<HTMLCanvasElement>(null), panelRef = useRef<HTMLDivElement>(null);
  const codes = useRef(new Set<string>()), release = useRef(new Set<string>()), touch = useRef(new Set<YouthTouchAction>());
  const pausedRef = useRef(false), mounted = useRef(false), busy = useRef(false);
  const pending = useRef<{ state: SoloV68State; receipts: readonly SoloV68Receipt[] } | null>(null);
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
      if (blocked) { accumulated = 0; stateRef.current = stepSoloV68(stateRef.current!, {}, { assetsReady: !!bank, pageVisible: !document.hidden, paused: true }).state; }
      else {
        accumulated += elapsed; let steps = 0;
        while (accumulated >= 1000 / 60 && steps++ < 6) {
          accumulated -= 1000 / 60; const prior = stateRef.current!.phase;
          const output = stepSoloV68(stateRef.current!, { move: sample.actions.move, jump: sample.actions.jump, interact: sample.actions.interact, attack: sample.actions.light, command: sample.actions.blade }, { assetsReady: true, pageVisible: true, paused: false });
          stateRef.current = output.state; changed ||= output.state.phase !== prior;
          if (output.receipts.length) { pending.current = output; setPendingUi(true); accumulated = 0; clear(); void submit(); break; }
        }
      }
      const current = stateRef.current!;
      // Keep the vertical gameplay scale on portrait screens; show less world horizontally instead of shrinking actors into a letterboxed strip.
      const logicalWidth = Math.max(320, Math.min(960, Math.round(540 * canvas.clientWidth / Math.max(1, canvas.clientHeight))));
      if (canvas.width !== logicalWidth) canvas.width = logicalWidth;
      drawFirstHuntSoloV68(ctx, current, bank, latest.current.reducedMotion === true);
      Object.assign(canvas.dataset, { soloPhase: current.phase, soloTick: String(current.tick), soloX: String(current.player.x), soloY: String(current.player.y), soloVy: String(current.player.vy), soloArmed: String(current.inputArmed), soloHealth: String(current.player.health), soloRoute: String(current.route), soloPreyPhase: current.prey.phase, soloPreyX: String(current.prey.x), soloPreyTimer: String(current.prey.timer), soloTouches: String(current.prey.touches), soloDodges: String(current.prey.dodges), soloStrike: String(current.player.strike), soloCooldown: String(current.player.cooldown), soloFacing: String(current.player.facing), soloAssets: String(!!bank), soloPaused: String(blocked), soloAttempts: String(current.attempts), soloFormation: String(current.formationTicks), soloSaarX: String(current.companions[0].x), soloVekX: String(current.companions[1].x), soloSaarJoined: String(current.companions[0].joined), soloVekJoined: String(current.companions[1].joined), soloInjured: String(current.companions[0].injured), soloMedicine: String(current.medicine), soloScan: String(current.scan) });
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
  const objective = state ? soloV68Objective(state) : null;
  const spoken = state?.phase === "briefing" ? "« Trois partiront. Trois reviendront. Le clan examine celui qui retrouve la piste et ceux qui ne laissent personne derrière. »" : state?.phase === "debrief" ? "« Saar et Vek sont revenus avec toi. Maintenant, le clan reçoit les preuves de ta Piste sans guide. »" : state?.phase === "relay" ? "« Vek tient le premier relais. Saar tient le deuxième. Prends le dernier et donne le signal. »" : state?.phase === "recognition" ? "« Ta Piste sans guide est reçue. Tu peux désormais te présenter à l’initiation avec les autres aspirants. »" : "";
  const modal = !state || !!artError || paused || pendingUi && !!saveError || state?.phase === "complete" && !pendingUi;
  const notice = state?.phase === "encounter" ? state.prey.phase === "telegraph" ? "La tête se baisse : prépare ton saut." : state.prey.phase === "recover" ? "Récupération : approche et place une touche à main nue." : "Observe la charge avant de répondre." : state?.phase === "shelter" ? "Le brouteur se retire vivant. Attends la triade au refuge." : state?.phase === "rescue" ? "Saar attend au refuge. Le medicomp ne compte qu’une fois le soin terminé." : "";
  return <section className={styles.screen} data-solo-v68 data-solo-step={state?.phase ?? "invalid"}>
    <header className={styles.header} inert={modal && !props.externallyPaused ? true : undefined}><strong>CAMPAGNE · LA COHORTE DES ASPIRANTS</strong><div><button type="button" onClick={pause} disabled={!state || pendingUi}>Pause</button><button type="button" onClick={() => setTouchUi(v => !v)} aria-pressed={touchUi}>Tactile</button></div></header>
    <div className={styles.objective}><h1>{objective?.title ?? "Checkpoint non pris en charge"}</h1><p>{objective?.instruction ?? "La partie est conservée. Aucun état neuf ne remplace ce checkpoint."}</p>{state && <div className={styles.measure}><span>Saar : {state.companions[0].injured ? "blessé" : !state.companions[0].joined ? "à rejoindre" : state.companions[0].following ? "suit" : "attend"}</span><span>Vek : {!state.companions[1].joined ? "à rejoindre" : state.companions[1].following ? "suit" : "attend"}</span>{["encounter", "setback", "shelter"].includes(state.phase) && <><span>Souffle {state.player.health} %</span><span>Touches {state.prey.touches}/2</span><span>Esquives {Math.min(2, state.prey.dodges)}/2</span><span>Essai {state.attempts}</span></>}{state.phase === "rescue" && <span>Medicomp transporté</span>}{saving && <span role="status">Enregistrement…</span>}</div>}</div>
    <div className={styles.view} inert={modal && !props.externallyPaused ? true : undefined}><canvas ref={canvasRef} width={960} height={540} tabIndex={0} aria-label="Terrain jouable de la Cohorte des Aspirants. Déplacement, saut, touche à main nue, commandes de suivi et interaction." />{spoken && !modal && <p className={styles.spoken}><YautjaTranslationV67 text={spoken} paused={paused || !!props.externallyPaused || pendingUi} reducedMotion={props.reducedMotion} /></p>}{notice && !modal && <p className={styles.notice} role="status">{notice}</p>}</div>
    {touchUi && <div className={styles.controls} aria-label="Commandes tactiles de la Cohorte des Aspirants">{BUTTONS.map(([action, label]) => <button type="button" key={action} data-solo-action={action} disabled={!!modal || !!props.externallyPaused || pendingUi} onPointerDown={e => setTouch(action, true, e)} onPointerUp={() => setTouch(action, false)} onPointerCancel={() => setTouch(action, false)} onLostPointerCapture={() => setTouch(action, false)} onBlur={() => setTouch(action, false)} onKeyDown={e => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); setTouch(action, true); } }} onKeyUp={e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setTouch(action, false); } }}>{label}</button>)}</div>}
    <p className={styles.keys}>Marcher {controlActionShortcut(YOUTH_CONTROL_ACTIONS.left, props.bindings)} / {controlActionShortcut(YOUTH_CONTROL_ACTIONS.right, props.bindings)} · Saut {controlActionShortcut(YOUTH_CONTROL_ACTIONS.jump, props.bindings)} · Toucher {controlActionShortcut(YOUTH_CONTROL_ACTIONS.light, props.bindings)} · Suivre / Attendre {controlActionShortcut(YOUTH_CONTROL_ACTIONS.blade, props.bindings)} · Interagir {controlActionShortcut(YOUTH_CONTROL_ACTIONS.interact, props.bindings)} · Manette : croix/stick, A, X, Y, LB</p>
    {modal && !props.externallyPaused && <div className={styles.overlay}><div ref={panelRef} className={styles.panel} role="dialog" aria-modal="true" aria-label={state?.phase === "complete" ? "Évaluation terminée" : "Pause et sauvegarde"} onKeyDown={e => {
      if (e.key === "Escape" && paused && !pendingUi) { e.preventDefault(); resume(); }
      if (e.key === "Tab") { const nodes = Array.from(e.currentTarget.querySelectorAll<HTMLButtonElement>("button:not(:disabled)")); if (!nodes.length) return; const first = nodes[0], last = nodes[nodes.length - 1]; if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); } else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
    }}><h2>{state?.phase === "complete" ? "Évaluation conservée" : "La Cohorte des Aspirants"}</h2>
      {!state ? <p>Le checkpoint est invalide ou appartient à une version non prise en charge. Reviens au menu pour consulter les sauvegardes ; il n’a pas été écrasé.</p> : state.phase === "complete" ? <p>La triade est revenue, Saar a reçu les soins et le mentor a conservé le rapport. Le clan te reconnaît comme Young Blood, aspirant à l’initiation. Le Premier Sang, le vaisseau et le plasma caster personnel restent à venir.</p> : <p>Le terrain, les charges et les gestes sont arrêtés. Relâche les commandes avant la reprise.</p>}
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
