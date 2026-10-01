"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import type { ControlActionId, ControlBindings } from "./systems/controlBindings";
import { controlActionShortcut } from "./controlBindingLabels";
import { GAME_RESERVE_V66_PEOPLE, GAME_RESERVE_V66_SHIPS, gameReserveV66Sector, gameReserveV66Summary, normalizeGameReserveV66, stepGameReserveV66, type GameReserveV66Input, type GameReserveV66State } from "./systems/gameReserveV66";
import { drawGameReserveV66, loadGameReserveV66Art, type GameReserveV66Art } from "./gameReserveV66Rendering";
import styles from "./GameReserveV66.module.css";

export interface GameReserveV66Props {
  checkpoint: unknown; bindings: ControlBindings; externallyPaused?: boolean; reducedMotion?: boolean; persistenceError?: string | null;
  onCheckpoint(state: GameReserveV66State): boolean; onExit(): void | Promise<void>; onOpenSettings?(): void;
}
const ACTIONS = { left: "hunt.moveLeft", right: "hunt.moveRight", jump: "hunt.jump", attack: "hunt.weaponPrimary", melee: "hunt.melee", cloak: "hunt.toggleCloak", scan: "hunt.scan", interact: "hunt.interact", pause: "hunt.pause" } as const satisfies Record<string, ControlActionId>;
type TouchAction = Exclude<keyof typeof ACTIONS, "pause">;
const TOUCH = [["left", "←", "←"], ["right", "→", "→"], ["jump", "Saut", "Saut"], ["melee", "Lames", "Lames"], ["attack", "Plasma", "Plasma"], ["cloak", "Camouflage", "Camouf."], ["scan", "Observer", "Obs."], ["interact", "Interagir", "Action"]] as const;
const minute = (seconds: number) => Math.floor(seconds / 60) + ":" + String(seconds % 60).padStart(2, "0");

/** The simulation stops on asset/persistence failure. A rejected write remains visible and retryable. */
export default function GameReserveV66(props: GameReserveV66Props) {
  const [initial] = useState(() => normalizeGameReserveV66(props.checkpoint));
  const stateRef = useRef(initial), latest = useRef(props), canvas = useRef<HTMLCanvasElement>(null), panel = useRef<HTMLDivElement>(null);
  const keys = useRef(new Set<string>()), touch = useRef(new Set<TouchAction>()), blockedKeys = useRef(new Set<string>());
  const pausedRef = useRef(true), mounted = useRef(false), busy = useRef(false);
  const [state, setState] = useState(initial), [paused, setPaused] = useState(true), [bank, setBank] = useState<GameReserveV66Art | null>(null);
  const [artError, setArtError] = useState(""), [saveError, setSaveError] = useState(""), [retry, setRetry] = useState(0), [touchShown, setTouchShown] = useState(false), [leaving, setLeaving] = useState(false);
  useEffect(() => { latest.current = props; }, [props]);
  const clear = useCallback(() => { for (const k of keys.current) blockedKeys.current.add(k); keys.current.clear(); touch.current.clear(); }, []);
  const checkpoint = useCallback(() => {
    if (!stateRef.current) return false;
    try { if (latest.current.onCheckpoint(stateRef.current)) { setSaveError(""); return true; } } catch { /* Keep the unsaved physical state mounted. */ }
    pausedRef.current = true; setPaused(true); setSaveError("L’écriture de la sauvegarde a échoué. La scène est conservée ici ; réessaie avant de quitter."); return false;
  }, []);
  const pause = useCallback(() => { clear(); pausedRef.current = true; setPaused(true); checkpoint(); }, [checkpoint, clear]);
  const resume = useCallback(() => {
    if (!bank || latest.current.externallyPaused || !stateRef.current || stateRef.current.status !== "active" || !checkpoint()) return;
    clear(); blockedKeys.current.clear(); stateRef.current = { ...stateRef.current, inputArmed: false, previous: { jump: false, attack: false, melee: false, cloak: false } };
    pausedRef.current = false; setPaused(false); requestAnimationFrame(() => canvas.current?.focus());
  }, [bank, checkpoint, clear]);
  useEffect(() => {
    mounted.current = true; const overflow = document.body.style.overflow; document.body.style.overflow = "hidden";
    const id = requestAnimationFrame(() => { setTouchShown(window.matchMedia("(pointer: coarse)").matches); panel.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus(); });
    return () => { mounted.current = false; cancelAnimationFrame(id); document.body.style.overflow = overflow; };
  }, []);
  useEffect(() => {
    let active = true;
    loadGameReserveV66Art().then(result => { if (active) { setBank(result); setArtError(""); } }).catch(error => { if (active) { setBank(null); setArtError(error instanceof Error ? error.message : "Images indisponibles"); } });
    return () => { active = false; };
  }, [retry]);
  useEffect(() => {
    const element = canvas.current; if (!element) return;
    const resize = () => {
      const bounds = element.getBoundingClientRect();
      if (bounds.width <= 0 || bounds.height <= 0) return;
      const width = Math.max(160, Math.round(bounds.width / bounds.height * 540));
      if (element.width !== width) element.width = width;
    };
    const observer = new ResizeObserver(resize); observer.observe(element); resize();
    return () => observer.disconnect();
  }, []);
  useEffect(() => { if (props.externallyPaused) {
    clear(); blockedKeys.current.clear();
    if (stateRef.current?.status === "active") stateRef.current = { ...stateRef.current, inputArmed: false, previous: { jump: false, attack: false, melee: false, cloak: false } };
  } }, [props.externallyPaused, clear]);
  useEffect(() => {
    if (paused || state?.status !== "active" || artError) panel.current?.querySelector<HTMLButtonElement>("button:not(:disabled)")?.focus();
  }, [paused, state?.status, artError]);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (latest.current.externallyPaused || e.target instanceof HTMLElement && e.target.closest("input,textarea,select,[contenteditable=true]")) return;
      if (latest.current.bindings[ACTIONS.pause].includes(e.code)) { e.preventDefault(); if (!e.repeat) { if (pausedRef.current) resume(); else pause(); } return; }
      if (e.target instanceof HTMLElement && e.target.closest("button")) return;
      if (Object.values(ACTIONS).some(a => latest.current.bindings[a].includes(e.code))) { e.preventDefault();
        // A key released in another tab may not dispatch keyup here. Never let its OS autorepeat re-arm input.
        if (!blockedKeys.current.has(e.code) && (!e.repeat || keys.current.has(e.code))) keys.current.add(e.code);
      }
    };
    const up = (e: KeyboardEvent) => { keys.current.delete(e.code); blockedKeys.current.delete(e.code); };
    const blur = () => pause(), hidden = () => { if (document.hidden) pause(); };
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", blur); window.addEventListener("pagehide", blur); document.addEventListener("visibilitychange", hidden);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", blur); window.removeEventListener("pagehide", blur); document.removeEventListener("visibilitychange", hidden); };
  }, [pause, resume]);
  useEffect(() => {
    const element = canvas.current, ctx = element?.getContext("2d"); if (!ctx || !element || !stateRef.current) return;
    let raf = 0, previous = 0, accumulator = 0, lastUi = 0, lastSave = stateRef.current.tick, padPause = false, hadPad = false;
    const frame = (time: number) => {
      let pad: Gamepad | null = null;
      try { pad = Array.from(navigator.getGamepads?.() ?? []).find(p => p?.connected && p.mapping === "standard") ?? null; } catch { /* Input is still available through keyboard/touch. */ }
      if (hadPad && !pad) pause(); hadPad = !!pad;
      const button = (n: number) => pad?.buttons[n]?.pressed === true;
      const pressingPause = button(9); if (pressingPause && !padPause) { if (pausedRef.current) resume(); else pause(); } padPause = pressingPause;
      const has = (a: TouchAction) => touch.current.has(a) || latest.current.bindings[ACTIONS[a]].some(k => keys.current.has(k));
      const left = has("left") || button(14) || (pad?.axes[0] ?? 0) < -.35, right = has("right") || button(15) || (pad?.axes[0] ?? 0) > .35;
      const input: GameReserveV66Input = { move: left === right ? 0 : left ? -1 : 1, jump: has("jump") || button(0), melee: has("melee") || button(2),
        attack: has("attack") || button(7), cloak: has("cloak") || button(1), scan: has("scan") || button(6), interact: has("interact") || button(4) };
      const blocked = pausedRef.current || latest.current.externallyPaused || document.hidden || !bank || blockedKeys.current.size > 0 || busy.current;
      const elapsed = previous ? Math.min(100, Math.max(0, time - previous)) : 0; previous = time;
      let terminal = false;
      if (blocked) accumulator = 0;
      else {
        accumulator += elapsed; let steps = 0;
        while (accumulator >= 1000 / 60 && steps++ < 6) {
          accumulator -= 1000 / 60; const before = stateRef.current!.status;
          stateRef.current = stepGameReserveV66(stateRef.current!, input);
          if (before === "active" && stateRef.current.status !== "active") { terminal = true; clear(); accumulator = 0; break; }
        }
      }
      const current = stateRef.current!;
      drawGameReserveV66(ctx, current, bank, latest.current.reducedMotion);
      Object.assign(element.dataset, { reserveStatus: current.status, reserveTick: String(current.tick), reserveX: String(Math.round(current.player.x)), reserveY: String(Math.round(current.player.y)), reserveSector: gameReserveV66Sector(current.player.x).id,
        reserveHealth: String(current.player.hp), reservePaused: String(!!blocked), reserveAssets: String(!!bank), reserveSecured: String(gameReserveV66Summary(current).secured), reserveEscaped: String(gameReserveV66Summary(current).escaped), reserveShipParts: current.ships.map(s => s.parts).join(",") });
      if (!blocked && (terminal || current.tick - lastSave >= 120)) { lastSave = current.tick; checkpoint(); }
      if (terminal || time - lastUi > 100) { lastUi = time; setState(current); }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame); return () => cancelAnimationFrame(raf);
  }, [bank, checkpoint, clear, pause, resume]);
  const setTouch = (a: TouchAction, on: boolean, e?: PointerEvent<HTMLButtonElement>) => {
    if (on) { if (pausedRef.current || props.externallyPaused || stateRef.current?.status !== "active") return; if (e) { e.preventDefault(); e.currentTarget.setPointerCapture(e.pointerId); } touch.current.add(a); }
    else touch.current.delete(a);
  };
  const leave = async () => {
    clear(); pausedRef.current = true; setPaused(true); if (busy.current || stateRef.current && !checkpoint()) return;
    busy.current = true; setLeaving(true);
    try { await latest.current.onExit(); } catch { setSaveError("Le retour au dossier a échoué. La réserve reste ouverte."); }
    finally { busy.current = false; if (mounted.current) setLeaving(false); }
  };
  const result = state && gameReserveV66Summary(state), terminal = !!state && state.status !== "active";
  const modal = paused || !state || terminal || !!artError;
  const shortcut = (a: keyof typeof ACTIONS) => controlActionShortcut(ACTIONS[a], props.bindings);
  return <section className={styles.screen} data-game-reserve-v66 data-reserve-state={state?.status ?? "unsupported"}>
    <header className={styles.header}><div><p>LA LONGUE CHASSE · GAME RESERVE</p><strong>Vharuun — première expédition</strong></div><div><button type="button" onClick={pause} disabled={!state || terminal}>Pause</button><button type="button" onClick={() => setTouchShown(v => !v)} aria-pressed={touchShown}>Tactile</button></div></header>
    <div className={styles.viewport}><canvas ref={canvas} width={960} height={540} tabIndex={0} aria-label="Réserve Vharuun jouable. Trois secteurs reliés, huit humains armés, deux évasions physiques." />
      {state && <div className={styles.hud} aria-label="État du chasseur"><div><span>Vitalité {Math.ceil(state.player.hp)}</span><meter min={0} max={100} value={state.player.hp} aria-label="Vitalité" /></div><div><span>Énergie {Math.floor(state.player.energy)} · {state.player.cloak ? "Camouflé" : "Visible"}</span><meter min={0} max={100} value={state.player.energy} aria-label="Énergie" /></div><span>{result!.secured} prises · {result!.escaped} évadés · {minute(result!.seconds)}</span></div>}
      {!modal && state && <p className={styles.notice} role="status">{state.log.at(-1)?.message}</p>}
    </div>
    {!modal && <p className={styles.hint}>Suivre les traces · observer les rôles · intercepter les pièces · revenir à gauche pour terminer</p>}
    {touchShown && <div className={styles.touch} aria-label="Commandes tactiles de la réserve">{TOUCH.map(([a, label, short]) => <button type="button" key={a} aria-label={label} data-reserve-action={a} disabled={modal || !!props.externallyPaused} onPointerDown={e => setTouch(a, true, e)} onPointerUp={() => setTouch(a, false)} onPointerCancel={() => setTouch(a, false)} onLostPointerCapture={() => setTouch(a, false)} onBlur={() => setTouch(a, false)} onKeyDown={e => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); setTouch(a, true); } }} onKeyUp={e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setTouch(a, false); } }}><span className={styles.longLabel}>{label}</span><span className={styles.shortLabel}>{short}</span></button>)}</div>}
    {modal && <div className={styles.overlay}><div className={styles.panel} ref={panel} role="dialog" aria-modal="true" aria-labelledby="reserve-title">
      <p className={styles.eyebrow}>RÉSERVE ORIGINALE · SOLO</p><h1 id="reserve-title">{!state ? "Checkpoint non pris en charge" : terminal ? state.status === "returned" ? "Retour d’expédition" : "Chasseur hors combat" : state.tick === 0 ? "La proie prépare sa fuite" : "Chasse suspendue"}</h1>
      {!state ? <p>Cette sauvegarde ne peut pas être interprétée par cette version. Elle est conservée ; aucune expédition neuve ne la remplace.</p> : <>
        {!terminal && <p>Huit combattants adultes armés traversent la Jungle des Parachutes, la lisière de la Foreuse et le Camp des Trophées. Ils récupèrent des composants, réparent deux appareils puis embarquent réellement. Observe leurs rôles ; une prise exige trois secondes d’exposition. Les moteurs annoncent le départ quinze secondes avant le décollage.</p>}
        {result && <div className={styles.results}><span><b>{result.secured}</b> prises sécurisées</span><span><b>{result.abandoned}</b> prises laissées</span><span><b>{result.escaped}</b> évadés</span><span><b>{result.remaining + result.aboard}</b> encore dans la réserve</span></div>}
        <p className={styles.scope}>Première sortie jouable : 3 secteurs sur les 80 proposés. Personnages originaux d’essai ; les 100 fiches H001–H100 et leurs 200 images ne sont pas intégrées ici. Aucun rang, honneur, équipement ou trophée de campagne n’est accordé par ce mode.</p>
        {!terminal && <details><summary>Commandes et règles</summary><ul><li>Déplacement {shortcut("left")} / {shortcut("right")} · Saut {shortcut("jump")}.</li><li>Lames {shortcut("melee")} · Plasma {shortcut("attack")} : le tir consomme de l’énergie et révèle les témoins proches.</li><li>Camouflage {shortcut("cloak")} · Maintenir Observer {shortcut("scan")} pour identifier les rôles visibles.</li><li>Maintenir Interagir {shortcut("interact")} près d’un corps, d’un circuit en réparation ou du point d’extraction à gauche.</li><li>Les fougères bloquent les vues et les projectiles. Les branches permettent un autre itinéraire. Un témoin transmet sa dernière observation aux alliés proches seulement.</li><li>Manette standard : stick/croix, A saut, X lames, RT plasma, B camouflage, LT observation, LB interaction, Start pause.</li><li>Le joueur utilise un dessin natif original tenu. Les humains utilisent six dessins natifs existants par archétype ; aucune nouvelle animation complète du chasseur n’est annoncée.</li></ul></details>}
        <details><summary>Renseignements observés ({result!.observed}/8)</summary><ul>{state.humans.filter(h => h.identified).map(h => <li key={h.id}><strong>{GAME_RESERVE_V66_PEOPLE.find(p => p.id === h.id)!.name}</strong> — {GAME_RESERVE_V66_PEOPLE.find(p => p.id === h.id)!.description}</li>)}{!result!.observed && <li>Aucun rôle identifié. Maintiens Observer face à un combattant visible.</li>}</ul></details>
        <details><summary>Journal de l’expédition</summary><ol>{state.log.map((entry, n) => <li key={n}>{minute(Math.floor(entry.tick / 60))} — {entry.message}</li>)}</ol><ul>{state.ships.map((s, n) => <li key={n}>{GAME_RESERVE_V66_SHIPS[n].name} : {s.departedAt !== null ? "parti" : s.launch !== null ? "embarquement en cours" : "préparation"}.</li>)}</ul></details>
      </>}
      {(saveError || props.persistenceError) && <p className={styles.error} role="alert">{saveError || props.persistenceError}</p>}
      {artError && <p className={styles.error} role="alert">{artError} La simulation attend les images. <button type="button" onClick={() => setRetry(n => n + 1)}>Réessayer le chargement</button></p>}
      {!bank && !artError && state && <p role="status">Chargement des décors et sprites natifs…</p>}
      <div className={styles.actions}>{state && !terminal && <button type="button" onClick={resume} disabled={!bank || !!artError || leaving}>{saveError ? "Réessayer la sauvegarde et reprendre" : state.tick === 0 ? "Commencer l’expédition" : "Reprendre la chasse"}</button>}{props.onOpenSettings && <button type="button" onClick={props.onOpenSettings} disabled={leaving}>Réglages</button>}<button type="button" onClick={() => void leave()} disabled={leaving}>{leaving ? "Enregistrement…" : terminal ? "Retour au dossier" : "Sauvegarder et revenir au dossier"}</button></div>
    </div></div>}
  </section>;
}
