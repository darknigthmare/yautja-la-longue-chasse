"use client";

import { useCallback, useEffect, useRef, useState, type PointerEvent } from "react";
import type { ControlActionId, ControlBindings } from "./systems/controlBindings";
import { controlActionShortcut } from "./controlBindingLabels";
import { gameReserveV66People, gameReserveV66Ships, gameReserveV66Sector, gameReserveV66Sectors, gameReserveV66World, gameReserveV66Summary, gameReserveV66Name, gameReserveV109Objectives, normalizeGameReserveV66, stepGameReserveV66, type GameReserveV66Input, type GameReserveV66State } from "./systems/gameReserveV66";
import {gameReserveV109Definition} from './systems/gameReserveExpeditionV109';
import { drawGameReserveV66, loadGameReserveV66Art, type GameReserveV66Art } from "./gameReserveV66Rendering";
import { gameReserveTacticalV98 } from "./systems/gameReserveTacticalV98";
import GameReserveTacticalV98 from "./GameReserveTacticalV98";
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
  const [notebookShown, setNotebookShown] = useState(false);
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
    loadGameReserveV66Art(initial).then(result => { if (active) { setBank(result); setArtError(""); } }).catch(error => { if (active) { setBank(null); setArtError(error instanceof Error ? error.message : "Images indisponibles"); } });
    return () => { active = false; };
  }, [retry, initial]);
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
    if (paused || state?.status !== "active" || artError) {
      const summary = panel.current?.querySelector<HTMLElement>("[data-reserve-notebook-summary]");
      // Closing the native disclosure must keep its keyboard focus, so Space can reopen it.
      if (!notebookShown && document.activeElement === summary) return;
      panel.current?.querySelector<HTMLElement>(notebookShown ? "[data-reserve-notebook-summary]" : "button:not(:disabled)")?.focus();
    }
  }, [paused, state?.status, artError, notebookShown]);
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (latest.current.externallyPaused || e.target instanceof HTMLElement && e.target.closest("input,textarea,select,[contenteditable=true]")) return;
      if (latest.current.bindings[ACTIONS.pause].includes(e.code)) { e.preventDefault(); if (!e.repeat) { if (pausedRef.current) resume(); else pause(); } return; }
      if (e.target instanceof HTMLElement && e.target.closest("button,summary,a,[role=button]")) return;
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
      const objectives = gameReserveV109Objectives(current);
      Object.assign(element.dataset, { reserveStatus: current.status, reserveTick: String(current.tick), reserveX: String(Math.round(current.player.x)), reserveY: String(Math.round(current.player.y)), reserveVy: String(current.player.vy), reserveSector: gameReserveV66Sector(current.player.x, current).id,
        reserveId: current.reserveId, reserveBiome: gameReserveV109Definition(current)?.biome ?? 'jungle',
        reserveObjectiveCaches: objectives ? String(objectives.cachesCompleted) : 'unavailable', reserveObjectiveMechanics: objectives ? String(objectives.mechanics) : 'unavailable', reserveObjectiveInterceptions: objectives ? String(objectives.interceptions) : 'unavailable', reserveObjectivesComplete: objectives ? String(objectives.completed) : 'unavailable',
        reserveVersion: String(current.version), reserveWorldWidth: String(gameReserveV66World(current).width), reserveSurvey: current.version === 2 ? String(current.lookout.recordedAt ?? "pending") : "unavailable",
        reserveHumanCount: String(current.humans.length), reserveDownCount: String(current.humans.filter(human => human.status === "down").length), reserveRouteRecorded: current.version === 3 || current.version === 4 || current.version === 5 ? String((current.version === 5 ? current.routeV109 : current.version === 4 ? current.routeV108 : current.routeV107).siteRecords.filter(site => site.recordedAt !== null).length) : "unavailable",
        reserveRouteTimes: current.version === 3 || current.version === 4 ? (current.version === 4 ? current.routeV108 : current.routeV107).siteRecords.map(site => site.recordedAt ?? "pending").join(",") : "unavailable",
        reserveHealth: String(current.player.hp), reservePaused: String(!!blocked), reserveAssets: String(!!bank), reserveSecured: String(gameReserveV66Summary(current).secured), reserveEscaped: String(gameReserveV66Summary(current).escaped), reserveShipParts: current.ships.map(s => s.parts).join(","),
        reserveShipLaunches: current.ships.map(s => s.launch ?? "none").join(","), reserveInterceptions: String(current.ships.filter(s => s.interception).length), reserveChannel: current.channel.kind, reserveChannelTicks: String(current.channel.ticks), reserveAboard: String(gameReserveV66Summary(current).aboard) });
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
  const result = state && gameReserveV66Summary(state), terminal = !!state && state.status !== "active", tactical = state && gameReserveTacticalV98(state);
  const sectors = state ? gameReserveV66Sectors(state).length : 3, extended = state?.version === 2, transect = state?.version === 3 || state?.version === 4 || state?.version === 5, kesh = state?.version === 4;
  const biome = gameReserveV109Definition(state ?? undefined), reserveName = gameReserveV66Name(state ?? undefined);
  const people = gameReserveV66People(state ?? undefined), ships = gameReserveV66Ships(state ?? undefined);
  const modal = paused || !state || terminal || !!artError;
  const shortcut = (a: keyof typeof ACTIONS) => controlActionShortcut(ACTIONS[a], props.bindings);
  return <section className={styles.screen} data-game-reserve-v66 data-reserve-state={state?.status ?? "unsupported"}>
    <header className={styles.header}><div><p>LA LONGUE CHASSE · GAME RESERVE</p><strong>{reserveName} — {transect ? "traversée des huit secteurs" : extended ? "expédition des Balises" : "première expédition"}</strong></div><div><button type="button" onClick={pause} disabled={!state || terminal}>Pause</button><button type="button" onClick={() => { setNotebookShown(true); pause(); }} disabled={!state || terminal} aria-label="Ouvrir le carnet de traque et suspendre la chasse">Carnet</button><button type="button" onClick={() => setTouchShown(v => !v)} aria-pressed={touchShown}>Tactile</button></div></header>
    <div className={styles.viewport}><canvas ref={canvas} width={960} height={540} tabIndex={0} aria-label={`Réserve ${reserveName} jouable. ${transect ? "Huit secteurs reliés, seize humains armés, quatre évasions physiques" : `${extended ? "Quatre" : "Trois"} secteurs reliés, huit humains armés, deux évasions physiques`}.`} />
      {state && <div className={styles.hud} aria-label="État du chasseur"><div><span>Vitalité {Math.ceil(state.player.hp)}</span><meter min={0} max={100} value={state.player.hp} aria-label="Vitalité" /></div><div><span>Énergie {Math.floor(state.player.energy)} · {state.player.cloak ? "Camouflé" : "Visible"}</span><meter min={0} max={100} value={state.player.energy} aria-label="Énergie" /></div><span>{result!.secured} prises · {result!.escaped} évadés · {minute(result!.seconds)}</span></div>}
      {!modal && state && <p className={styles.notice} role="status">{state.log.at(-1)?.message}</p>}
      {!modal && tactical && <div className={styles.fieldStatus} aria-label="Repères de traque" data-reserve-field-status>
        <span>{tactical.sectors.find(sector => sector.current)?.name} · {state!.visited.length}/{sectors} secteurs</span>
        {extended && state?.version === 2 && <span data-reserve-survey-field>Balises : {state.lookout.recordedAt === null ? "poste haut à relever" : "relevé consigné · retour à l’ouest"}</span>}
        {(state?.version === 3 || state?.version === 4 || state?.version === 5) && <span data-reserve-route-field>{(state.version === 5 ? state.routeV109 : state.version === 4 ? state.routeV108 : state.routeV107).siteRecords.filter(site => site.recordedAt !== null).length}/4 relevés · retour à l’ouest</span>}
        {tactical.objectives?.cacheGoal ? <span>Dépôts neutralisés : {tactical.objectives.cachesCompleted}/{tactical.objectives.cacheGoal}</span> : null}
        {tactical.objectives?.mechanicGoal ? <span>Mécaniciens : {Math.min(tactical.objectives.mechanics,tactical.objectives.mechanicGoal)}/{tactical.objectives.mechanicGoal} · départs interrompus : {Math.min(tactical.objectives.interceptions,tactical.objectives.interceptionGoal)}/{tactical.objectives.interceptionGoal}</span> : null}
        {tactical.ships.filter(ship => ship.phase === "boarding").map(ship => <strong key={ship.id} className={styles.launchAlert} data-reserve-launch-alert>{ship.name} · départ {ship.countdown} s</strong>)}
        {tactical.action.kind !== "none" && <div data-reserve-interaction={tactical.action.kind}><strong>{tactical.action.title}</strong><span>Maintenir {shortcut("interact")} · {tactical.action.remaining.toFixed(1)} s</span><progress max={1} value={tactical.action.progress} aria-label={tactical.action.title} /></div>}
      </div>}
    </div>
    {!modal && <p className={styles.hint}>{transect ? "Traverser huit secteurs · consigner quatre relevés · rapporter les notes à l’extraction de départ" : extended ? "Rejoindre la Crête des Balises · relever le poste haut · revenir à gauche pour terminer" : "Suivre les traces · observer les rôles · intercepter les pièces · revenir à gauche pour terminer"}</p>}
    {touchShown && <div className={styles.touch} aria-label="Commandes tactiles de la réserve">{TOUCH.map(([a, label, short]) => <button type="button" key={a} aria-label={label} data-reserve-action={a} disabled={modal || !!props.externallyPaused} onPointerDown={e => setTouch(a, true, e)} onPointerUp={() => setTouch(a, false)} onPointerCancel={() => setTouch(a, false)} onLostPointerCapture={() => setTouch(a, false)} onBlur={() => setTouch(a, false)} onKeyDown={e => { if ((e.key === " " || e.key === "Enter") && !e.repeat) { e.preventDefault(); setTouch(a, true); } }} onKeyUp={e => { if (e.key === " " || e.key === "Enter") { e.preventDefault(); setTouch(a, false); } }}><span className={styles.longLabel}>{label}</span><span className={styles.shortLabel}>{short}</span></button>)}</div>}
    {modal && <div className={styles.overlay}><div className={styles.panel} ref={panel} role="dialog" aria-modal="true" aria-labelledby="reserve-title">
      <p className={styles.eyebrow}>RÉSERVE ORIGINALE · SOLO</p><h1 id="reserve-title">{!state ? "Checkpoint non pris en charge" : terminal ? state.status === "returned" ? "Retour d’expédition" : "Chasseur hors combat" : state.tick === 0 ? "La proie prépare sa fuite" : "Chasse suspendue"}</h1>
      {!state ? <p>Cette sauvegarde ne peut pas être interprétée par cette version. Elle est conservée ; aucune expédition neuve ne la remplace.</p> : <>
        {!terminal && <p>{transect ? "Seize combattants adultes armés et quatre groupes parcourent les huit secteurs de la réserve. Ils récupèrent des composants, réparent quatre appareils puis embarquent réellement." : "Huit combattants adultes armés traversent la Jungle des Parachutes, la lisière de la Foreuse et le Camp des Trophées. Ils récupèrent des composants, réparent deux appareils puis embarquent réellement."} Neutralise les lots aux dépôts pour ralentir leur fuite ; les survivants peuvent récupérer les pièces d’un porteur abattu à proximité. Observe leurs rôles ; une prise exige trois secondes d’exposition. Les moteurs annoncent le départ quinze secondes avant le décollage : rejoins la rampe et sabote le circuit pour interrompre le départ.</p>}
        {!terminal && extended && <p>Cette sortie poursuit le terrain jusqu’à la Crête des Balises, quatrième secteur original. Les branches forment une route haute sous couvert ; rejoins la plateforme du poste, maintiens Interagir deux secondes sans bouger ni subir de blessure, puis rapporte le relevé au point d’extraction. Les huit combattants poursuivent leur évasion pendant ton déplacement.</p>}
        {!terminal && kesh && <p>Avar’Kesh est une seconde réserve originale : grève, canopée, écluses, fonderie, ravin, antennes, voûte des racines et débarcadère. Les escortes accompagnent les porteurs proches ; les gardes tiennent les rampes et les observateurs se postent au bord des couverts. Consigne quatre relevés, intercepte un départ si tu le peux, puis rapporte le bilan à l’extraction occidentale. Les trois atlas humains existants sont partagés ; aucun portrait H001–H100 n’est ajouté.</p>}
        {!terminal && biome && <><p>{biome.introduction} Chaque relevé demande deux secondes immobiles à son poste, sans blessure. Le retour reste possible même si les objectifs secondaires ne sont pas tous accomplis.</p><p>Les corniches et terrasses forment la route haute du chasseur ; les équipes humaines travaillent dans le passage bas continu. Les parois arrêtent les vues et les projectiles.</p></>}
        {!terminal && transect && !kesh && !biome && <p>Après les Balises, rejoins le Bassin des Racines, les Serres Renversées, la Carrière des Échos et le Quai des Brumes. Les racines, étais et pontons constituent des routes physiques différentes. Consigne quatre relevés à leurs postes, en restant immobile deux secondes sans blessure, puis retourne à l’extraction de départ. Les huit nouveaux adultes ont des vitesses, observations, délais de tir et capacités de réparation propres.</p>}
        {result && <div className={styles.results}><span><b>{result.secured}</b> prises sécurisées</span><span><b>{result.abandoned}</b> prises laissées</span><span><b>{result.escaped}</b> évadés</span><span><b>{result.remaining + result.aboard}</b> encore dans la réserve</span></div>}
        <details open={notebookShown} onToggle={event => setNotebookShown(event.currentTarget.open)}><summary data-reserve-notebook-summary>Carnet de traque · secteurs, contacts et évasions</summary><GameReserveTacticalV98 state={state} /></details>
        <p className={styles.scope}>{transect ? `${reserveName} : huit secteurs originaux reliés, seize adultes combattants armés et quatre appareils. Les relevés restent dans le bilan de cette sortie.` : extended ? "Expédition des Balises : 4 secteurs sur les 80 proposés, avec les huit combattants existants. Cette extension originale réutilise les décors natifs ; elle ne crée pas de nouveaux atlas." : "Première sortie jouable : 3 secteurs sur les 80 proposés."}{!transect && <> Personnages originaux d’essai ; les 100 fiches H001–H100 et leurs 200 images ne sont pas intégrées ici.</>} Aucun rang, honneur, équipement ou trophée de campagne n’est accordé par ce mode.</p>
        {!terminal && <details><summary>Commandes et règles</summary><ul><li>Déplacement {shortcut("left")} / {shortcut("right")} · Saut {shortcut("jump")}.</li><li>Lames {shortcut("melee")} · Plasma {shortcut("attack")} : le tir consomme de l’énergie et révèle les témoins proches.</li><li>Camouflage {shortcut("cloak")} · Maintenir Observer {shortcut("scan")} pour identifier les rôles visibles.</li><li>Maintenir Interagir {shortcut("interact")} près d’un corps, d’un dépôt, d’un circuit en réparation ou du point d’extraction à gauche.</li><li>Dépôt : reste au sol 2 s, sans bouger ni subir de blessure, pour neutraliser un lot. Les pièces déjà emportées restent sur leur porteur, même abattu ; un allié qui le découvre à proximité peut récupérer son lot après 1,5 s sans menace ni blessure.</li><li>Sabotage : reste au sol à la rampe 1,5 s, sans bouger ni subir de blessure. Pendant l’embarquement, il coupe les moteurs ; les passagers ressortent à leur position et défendent l’appareil. Après le départ, ils ne peuvent plus être rattrapés.</li><li>{biome ? 'Les parois de roche ou de glace bloquent les vues et les projectiles. Les corniches permettent un autre itinéraire.' : 'Les fougères bloquent les vues et les projectiles. Les branches permettent un autre itinéraire.'} Un témoin transmet sa dernière observation aux alliés proches seulement.</li><li>Manette standard : stick/croix, A saut, X lames, RT plasma, B camouflage, LT observation, LB interaction, Start pause.</li><li>Le joueur utilise un dessin natif original tenu. Les humains utilisent six dessins natifs existants par archétype ; aucune nouvelle animation complète du chasseur n’est annoncée.</li></ul></details>}
        <details><summary>Renseignements observés ({result!.observed}/{state.humans.length})</summary><ul>{state.humans.filter(h => h.identified).map(h => <li key={h.id}><strong>{people.find(p => p.id === h.id)!.name}</strong> — {people.find(p => p.id === h.id)!.description}</li>)}{!result!.observed && <li>Aucun rôle identifié. Maintiens Observer face à un combattant visible.</li>}</ul></details>
        <details><summary>Journal de l’expédition</summary><ol>{state.log.map((entry, n) => <li key={n}>{minute(Math.floor(entry.tick / 60))} — {entry.message}</li>)}</ol><ul>{state.ships.map((s, n) => <li key={n}>{ships[n].name} : {s.departedAt !== null ? "parti" : s.launch !== null ? "embarquement en cours" : "préparation"}.</li>)}</ul></details>
      </>}
      {(saveError || props.persistenceError) && <p className={styles.error} role="alert">{saveError || props.persistenceError}</p>}
      {artError && <p className={styles.error} role="alert">{artError} La simulation attend les images. <button type="button" onClick={() => setRetry(n => n + 1)}>Réessayer le chargement</button></p>}
      {!bank && !artError && state && <p role="status">Chargement des décors et sprites natifs…</p>}
      <div className={styles.actions}>{state && !terminal && <button type="button" onClick={resume} disabled={!bank || !!artError || leaving}>{saveError ? "Réessayer la sauvegarde et reprendre" : state.tick === 0 ? "Commencer l’expédition" : "Reprendre la chasse"}</button>}{props.onOpenSettings && <button type="button" onClick={props.onOpenSettings} disabled={leaving}>Réglages</button>}<button type="button" onClick={() => void leave()} disabled={leaving}>{leaving ? "Enregistrement…" : terminal ? "Retour au dossier" : "Sauvegarder et revenir au dossier"}</button></div>
    </div></div>}
  </section>;
}
