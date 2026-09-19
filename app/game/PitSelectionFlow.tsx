"use client";
/* eslint-disable @next/next/no-img-element -- existing local bitmap portraits and stage panoramas */
import { forwardRef, useCallback, useEffect, useImperativeHandle, useReducer, useRef, useState, type ReactNode } from "react";
import { PIT_ARENAS, PIT_ARENA_IDS, PIT_FIGHTERS, type PitArenaId, type PitFighterId } from "./systems/pitCombat";
import { PIT_VERSUS_FIGHTER_IDS, canPitFighterEnterMode, isPitExpansionFighterId, type PitVersusFighterId } from "./systems/pitRosterExpansion";
import { createPitSelectionState, movePitSelectionIndex, reducePitSelection } from "./systems/pitSelectionFlow";
import { getPitFighterKeyArt } from "./pitVisualAssets";
import { getPitCombatBitmapArtDefinition } from "./pitCombatBitmapArt";
import { PIT_ARENA_ART_DEFINITIONS } from "./pitArenaRendering";
import { resolvePitArenaProductionKit } from "./pitArenaProduction";
import PitExtensionPortrait from "./PitExtensionPortrait";
import PitStagePreview, { type PitStagePreviewStatus } from "./PitStagePreview";
import styles from "./PitSelectionFlow.module.css";

export type PitSelectionCommand = "left" | "right" | "up" | "down" | "confirm" | "back";
export interface PitSelectionFlowHandle { command: (command: PitSelectionCommand) => void; focus: () => void; reset: () => void; reviewOpponent: () => void }
interface Props {
  playerId: PitVersusFighterId; opponentId: PitFighterId; arenaId: PitArenaId;
  mode: "cpu" | "local" | "training" | "arcade" | "circuit" | "descent";
  locked: boolean; imposed: boolean; eventOnly: boolean;
  playerPreview: ReactNode; opponentPreview: ReactNode;
  onPlayerChange: (id: PitVersusFighterId) => void; onOpponentChange: (id: PitVersusFighterId) => void;
  onArenaChange: (id: PitArenaId) => void; onLaunch: () => void; onExit: () => void;
  onImposedNavigate?: (direction: -1 | 1) => void;
  launchLabel: string; launchDisabled: boolean; reducedMotion: boolean; highContrast: boolean;
}

const stageThumbnail = (id: PitArenaId) => resolvePitArenaProductionKit(id)?.planes.find(plane => plane.id === "P0")?.assets[0]?.frames[0]?.path ?? PIT_ARENA_ART_DEFINITIONS[id]?.backdrop;

function RosterPortrait({ id }: { id: PitVersusFighterId }) {
  const art = getPitFighterKeyArt(id) ?? getPitCombatBitmapArtDefinition(id);
  const [failed, setFailed] = useState(false);
  return <span className={styles.iconArt} aria-hidden="true">{isPitExpansionFighterId(id)
    ? <PitExtensionPortrait fighterId={id} facing="right" />
    : art && !failed ? <img src={art.src} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
      : <span>{PIT_FIGHTERS[id].name.slice(0, 2)}</span>}</span>;
}

const PitSelectionFlow = forwardRef<PitSelectionFlowHandle, Props>(function PitSelectionFlow(props, ref) {
  const { playerId, opponentId, arenaId, imposed, eventOnly, locked, mode } = props;
  const [state, dispatch] = useReducer(reducePitSelection, undefined, createPitSelectionState);
  const [preview, setPreview] = useState<{ id: PitArenaId; status: PitStagePreviewStatus } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null), gridRef = useRef<HTMLDivElement>(null), confirmRef = useRef<HTMLButtonElement>(null);
  const stagePageSize = 24;
  const stagePage = Math.floor(Math.max(0, PIT_ARENA_IDS.indexOf(arenaId)) / stagePageSize);
  const stagePageCount = Math.ceil(PIT_ARENA_IDS.length / stagePageSize);
  const stageChoices = PIT_ARENA_IDS.slice(stagePage * stagePageSize, (stagePage + 1) * stagePageSize);
  const stageReady = preview?.id === arenaId && preview.status === "ready";
  const onPreviewStatus = useCallback((id: PitArenaId, status: PitStagePreviewStatus) => setPreview({ id, status }), []);
  const focus = useCallback(() => {
    const selected = gridRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]:not(:disabled)');
    (selected ?? confirmRef.current)?.focus({ preventScroll: true });
  }, []);
  useEffect(() => { const frame = requestAnimationFrame(() => { if (state.step === "stage") rootRef.current?.scrollIntoView({ block: "start" }); focus(); }); return () => cancelAnimationFrame(frame); }, [state.step, state.slot, focus]);
  const pick = (id: PitVersusFighterId) => {
    if (locked || (state.slot === "opponent" && (imposed || id === playerId)) || (state.slot === "player" && !canPitFighterEnterMode(id, mode))) return;
    if (state.slot === "player") props.onPlayerChange(id); else props.onOpponentChange(id);
    dispatch({ type: "pick", slot: state.slot });
  };
  const confirm = () => {
    if (props.launchDisabled) return;
    if (state.step === "stage") { if (stageReady) props.onLaunch(); return; }
    if (locked) return;
    dispatch({ type: "confirm", player: playerId, opponent: opponentId, eventOnly });
  };
  const back = () => {
    if (locked) return;
    if (state.step === "fighters" && state.slot === "player") props.onExit();
    else dispatch({ type: "back" });
  };
  const command = (input: PitSelectionCommand) => {
    if (input === "back") return back();
    if (input === "confirm") return confirm();
    if (locked) return;
    if (state.step === "fighters" && state.slot === "opponent" && imposed) return;
    if (state.step === "stage" && imposed) {
      if (props.onImposedNavigate) {
        props.onImposedNavigate(input === "left" || input === "up" ? -1 : 1);
        dispatch({ type: "edit", slot: "opponent" });
      }
      return;
    }
    const buttons = Array.from(gridRef.current?.querySelectorAll<HTMLButtonElement>('[role="option"]') ?? []);
    const columns = gridRef.current ? Math.max(1, getComputedStyle(gridRef.current).gridTemplateColumns.split(" ").length) : 1;
    if (state.step === "stage") {
      const next = movePitSelectionIndex(PIT_ARENA_IDS.indexOf(arenaId), input, columns, PIT_ARENA_IDS.map(() => true));
      const id = PIT_ARENA_IDS[next];
      if (id) {
        props.onArenaChange(id);
        requestAnimationFrame(() => gridRef.current?.querySelector<HTMLButtonElement>(`[data-choice-id="${id}"]`)?.focus());
      }
      return;
    }
    const selected = state.slot === "player" ? playerId : opponentId;
    const index = buttons.findIndex(button => button.dataset.choiceId === selected);
    const next = movePitSelectionIndex(index, input, columns, buttons.map(button => !button.disabled));
    const target = buttons[next]; if (!target) return;
    pick(target.dataset.choiceId as PitVersusFighterId);
    target.focus();
  };
  useImperativeHandle(ref, () => ({ command, focus, reset: () => dispatch({ type: "edit", slot: "player" }), reviewOpponent: () => dispatch({ type: "edit", slot: "opponent" }) }));
  const rosterSelected = state.slot === "player" ? playerId : opponentId;
  return <div ref={rootRef} className={styles.flow} data-pit-selection-step={state.step} data-pit-selection-slot={state.slot}
    onKeyDown={event => {
      if (event.defaultPrevented || event.repeat) return;
      const target = event.target as HTMLElement;
      if (!target.closest('[role="option"]')) return;
      const direction = ({ ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" } as const)[event.key as "ArrowLeft"];
      if (direction) { event.preventDefault(); command(direction); }
      else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); confirm(); }
    }}>
    <ol className={styles.steps} aria-label="Étapes de sélection"><li aria-current={state.step === "fighters" ? "step" : undefined}>01 · Combattants</li><li aria-current={state.step === "stage" ? "step" : undefined}>02 · Stage</li><li>03 · Combat</li></ol>
    {state.step === "fighters" ? <>
      <div className={styles.duelProfiles}>
        <div data-selection-side="player" data-confirmed={state.confirmedPlayer === playerId}><button type="button" className={styles.slotButton} disabled={locked} onClick={() => dispatch({ type: "edit", slot: "player" })}>J1 · {state.confirmedPlayer === playerId ? "CONFIRMÉ" : "À CONFIRMER"}</button>{props.playerPreview}</div>
        <span className={styles.versus}>VS</span>
        <div data-selection-side="opponent" data-confirmed={state.confirmedOpponent === opponentId}><button type="button" className={styles.slotButton} disabled={locked || state.confirmedPlayer !== playerId} onClick={() => dispatch({ type: "edit", slot: "opponent" })}>{mode === "local" ? "J2" : "RIVAL"} · {imposed ? "PARCOURS" : "À CONFIRMER"}</button>{props.opponentPreview}</div>
      </div>
      <div className={styles.rosterHeading}><h3>{state.slot === "player" ? "Choisis ton combattant" : imposed ? "Confirme la rencontre du parcours" : "Choisis l’adversaire"}</h3><span>{state.slot === "player" ? "J1" : mode === "local" ? "J2" : "RIVAL"}</span></div>
      {state.slot === "opponent" && imposed ? <p className={styles.imposed} role="status">{eventOnly ? "Cette branche est un événement sans combat." : `${PIT_FIGHTERS[opponentId].name} est imposé par ce parcours.`} Le choix du stage respecte la progression sauvegardée.</p> : <div ref={gridRef} className={styles.roster} role="listbox" aria-label={state.slot === "player" ? "Combattant joueur" : "Adversaire"}>
        {PIT_VERSUS_FIGHTER_IDS.map(id => {
          const unavailable = locked || (state.slot === "opponent" ? id === playerId : !canPitFighterEnterMode(id, mode));
          return <button type="button" role="option" key={id} data-choice-id={id} aria-label={PIT_FIGHTERS[id].name} aria-selected={rosterSelected === id} disabled={unavailable} tabIndex={rosterSelected === id ? 0 : -1} onClick={() => pick(id)} onFocus={() => { if (rosterSelected !== id) pick(id); }}><RosterPortrait id={id} /><strong>{PIT_FIGHTERS[id].name}</strong>{state.slot === "opponent" && id === playerId ? <small>Déjà choisi par J1</small> : null}</button>;
        })}
      </div>}
    </> : <>
      <div className={styles.stageHeading}><div><span>STAGE SELECT</span><h3>{PIT_ARENAS[arenaId].name}</h3><p>{PIT_FIGHTERS[playerId].name} {eventOnly ? "· branche de parcours" : `VS ${PIT_FIGHTERS[opponentId].name}`}</p></div><span>{imposed ? "IMPOSÉ PAR LE PARCOURS" : `${PIT_ARENA_IDS.length} STAGES JOUABLES`}</span></div>
      <PitStagePreview arenaId={arenaId} reducedMotion={props.reducedMotion} highContrast={props.highContrast} onStatus={onPreviewStatus} />
      <p className={styles.stageDescription}>{PIT_ARENAS[arenaId].setting} · Aperçu des plans réels P0–P5{props.reducedMotion ? " · mouvement réduit" : " · parallaxe active"}.</p>
      <div ref={gridRef} className={styles.stages} role="listbox" aria-label="Arènes disponibles" data-pit-stage-total={PIT_ARENA_IDS.length} data-pit-stage-page={stagePage + 1}>
        {stageChoices.map(id => <button key={id} type="button" role="option" data-choice-id={id} aria-label={PIT_ARENAS[id].name} aria-selected={arenaId === id} disabled={locked || (imposed && id !== arenaId)} tabIndex={arenaId === id ? 0 : -1} onClick={() => props.onArenaChange(id)} onFocus={() => { if (!imposed && id !== arenaId) props.onArenaChange(id); }}><span>{stageThumbnail(id) ? <img src={stageThumbnail(id)} alt="" loading="lazy" decoding="async" /> : null}</span><strong>{PIT_ARENAS[id].name}</strong></button>)}
      </div>
      {stagePageCount > 1 && <nav className={styles.stagePages} aria-label="Pages des arènes">
        <button type="button" data-pit-stage-page-prev disabled={locked || imposed || stagePage === 0} onClick={() => props.onArenaChange(PIT_ARENA_IDS[(stagePage - 1) * stagePageSize])}>Page précédente</button>
        <span>Page {stagePage + 1} / {stagePageCount} · {PIT_ARENA_IDS.length} stages</span>
        <button type="button" data-pit-stage-page-next disabled={locked || imposed || stagePage === stagePageCount - 1} onClick={() => props.onArenaChange(PIT_ARENA_IDS[(stagePage + 1) * stagePageSize])}>Page suivante</button>
      </nav>}
    </>}
    <div className={styles.actions}><button type="button" onClick={back} disabled={locked}>{state.step === "stage" ? "Retour aux combattants" : state.slot === "opponent" ? "Retour au joueur 1" : "Retour au vaisseau"} · B</button><button ref={confirmRef} type="button" className={styles.confirm} data-pit-selection-confirm aria-keyshortcuts="Enter Space" data-gamepad-shortcut="A" onClick={confirm} disabled={(locked && state.step !== "stage") || props.launchDisabled || (state.step === "stage" && !stageReady)}>{state.step === "stage" ? stageReady ? props.launchLabel : "CHARGEMENT DU STAGE…" : state.slot === "player" ? "CONFIRMER JOUEUR 1" : imposed ? "CONFIRMER LA RENCONTRE" : "CONFIRMER L’ADVERSAIRE"} · A</button></div>
    <p className={styles.instructions} role="status">{state.step === "fighters" ? `${state.slot === "player" ? "Joueur 1" : "Adversaire"} : ${PIT_FIGHTERS[rosterSelected].name}.` : `Stage : ${PIT_ARENAS[arenaId].name}.`} Flèches / croix directionnelle : choisir · Entrée / A : confirmer · Échap / B : retour. LB / RB : changer de mode. Au tactile, touche une icône puis confirme.</p>
  </div>;
});
export default PitSelectionFlow;
