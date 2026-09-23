"use client";
/* eslint-disable @next/next/no-img-element -- existing local bitmap portraits and stage panoramas */
import { forwardRef, memo, useCallback, useEffect, useImperativeHandle, useMemo, useReducer, useRef, useState, type ReactNode } from "react";
import { PIT_ARENAS, PIT_ARENA_IDS, PIT_FIGHTERS, type PitArenaId, type PitFighterId } from "./systems/pitCombat";
import { getPitFighterVariants, getPitUserVariant } from "./systems/pitUserRoster";
import { PIT_VERSUS_FIGHTER_IDS, canPitFighterEnterMode, isPitExpansionFighterId, type PitVersusFighterId } from "./systems/pitRosterExpansion";
import { createPitSelectionState, movePitSelectionIndex, reducePitSelection } from "./systems/pitSelectionFlow";
import { getPitFighterKeyArt } from "./pitVisualAssets";
import { getPitRosterIcon } from "./pitRosterIcons";
import { getPitCombatBitmapArtDefinition } from "./pitCombatBitmapArt";
import { PIT_ARENA_ART_DEFINITIONS } from "./pitArenaRendering";
import { resolvePitArenaProductionKit } from "./pitArenaProduction";
import { getPitScreenArenaMetadata, PIT_SCREEN_ARENA_WORKS } from "./systems/pitScreenArenas";
import PitExtensionPortrait from "./PitExtensionPortrait";
import PitStagePreview, { type PitStagePreviewStatus } from "./PitStagePreview";
import styles from "./PitSelectionFlow.module.css";

export type PitSelectionCommand = "left" | "right" | "up" | "down" | "confirm" | "back" | "variant-prev" | "variant-next";
export interface PitSelectionFlowHandle { command: (command: PitSelectionCommand) => void; focus: () => void; reset: (playerOverride?: PitVersusFighterId) => void; reviewOpponent: () => void }
interface Props {
  playerId: PitVersusFighterId; opponentId: PitFighterId; arenaId: PitArenaId;
  playerVariantId: string | null; opponentVariantId: string | null;
  onPlayerVariantChange: (id: string | null) => void; onOpponentVariantChange: (id: string | null) => void;
  mode: "cpu" | "local" | "training" | "arcade" | "circuit" | "descent";
  locked: boolean; imposed: boolean; eventOnly: boolean;
  playerPreview: ReactNode; opponentPreview: ReactNode;
  onPlayerChange: (id: PitVersusFighterId) => void; onOpponentChange: (id: PitVersusFighterId) => void;
  onArenaChange: (id: PitArenaId) => void; onLaunch: () => void; onExit: () => void;
  onImposedNavigate?: (direction: -1 | 1) => void;
  launchLabel: string; launchDisabled: boolean; reducedMotion: boolean; highContrast: boolean;
}

const ROSTER_PAGE_SIZE = 24;
const searchText = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

const stageThumbnail = (id: PitArenaId) => resolvePitArenaProductionKit(id)?.planes.find(plane => plane.id === "P0")?.assets[0]?.frames[0]?.path ?? PIT_ARENA_ART_DEFINITIONS[id]?.backdrop;

const ROSTER_SEARCH = new Map(PIT_VERSUS_FIGHTER_IDS.map(id => [id, searchText(`${PIT_FIGHTERS[id].name} ${id} ${getPitFighterVariants(id).map(variant => variant.label).join(" ")}`)]));

const RosterPortrait = memo(function RosterPortrait({ id }: { id: PitVersusFighterId }) {
  const icon = getPitRosterIcon(id);
  // Grid thumbnails never trigger multi-megabyte supplied-source downloads.
  const art = id.startsWith("user-") ? icon : getPitFighterKeyArt(id) ?? getPitCombatBitmapArtDefinition(id) ?? getPitFighterVariants(id)[0];
  const [failed, setFailed] = useState(false);
  return <span className={styles.iconArt} aria-hidden="true">{isPitExpansionFighterId(id)
    ? <PitExtensionPortrait fighterId={id} facing="right" />
    : art && !failed ? <img src={art.src} alt="" width={art.width} height={art.height} data-pit-roster-icon={icon ? id : undefined} loading="lazy" decoding="async" onError={() => setFailed(true)} />
      : <span>{PIT_FIGHTERS[id].name.slice(0, 2)}</span>}</span>;
});

const PitSelectionFlow = forwardRef<PitSelectionFlowHandle, Props>(function PitSelectionFlow(props, ref) {
  const { playerId, opponentId, arenaId, imposed, eventOnly, locked, mode } = props;
  const [state, dispatch] = useReducer(reducePitSelection, undefined, createPitSelectionState);
  const [preview, setPreview] = useState<{ id: PitArenaId; status: PitStagePreviewStatus } | null>(null);
  const rootRef = useRef<HTMLDivElement>(null), gridRef = useRef<HTMLDivElement>(null), confirmRef = useRef<HTMLButtonElement>(null);
  const [rosterQuery, setRosterQuery] = useState("");
  const [requestedRosterPage, setRequestedRosterPage] = useState(() => Math.floor(Math.max(0, PIT_VERSUS_FIGHTER_IDS.indexOf(playerId)) / ROSTER_PAGE_SIZE));
  const rosterSelected = state.slot === "player" ? playerId : opponentId;
  const suppliedVariants = getPitFighterVariants(rosterSelected);
  const userIdentity = rosterSelected.startsWith("user-");
  const selectedVariantId = state.slot === "player" ? props.playerVariantId : props.opponentVariantId;
  const selectedVariant = getPitUserVariant(rosterSelected, selectedVariantId ?? (userIdentity ? suppliedVariants[0]?.id ?? null : null));
  const variantChoices: readonly { id: string | null; label: string }[] = userIdentity
    ? suppliedVariants
    : [{ id: null, label: "Présentation actuelle" }, ...suppliedVariants];
  const variantValue = userIdentity ? (selectedVariant?.id ?? suppliedVariants[0]?.id ?? "") : (selectedVariantId ?? "");
  const query = searchText(rosterQuery.trim());
  const matchingFighterIds = useMemo(() => PIT_VERSUS_FIGHTER_IDS.filter(id => !query || ROSTER_SEARCH.get(id)?.includes(query)), [query]);
  const rosterPageCount = Math.max(1, Math.ceil(matchingFighterIds.length / ROSTER_PAGE_SIZE));
  const rosterPage = Math.min(requestedRosterPage, rosterPageCount - 1);
  const rosterChoices = matchingFighterIds.slice(rosterPage * ROSTER_PAGE_SIZE, (rosterPage + 1) * ROSTER_PAGE_SIZE);
  const isFighterUnavailable = (id: PitVersusFighterId) => locked || (state.slot === "opponent" ? id === playerId : !canPitFighterEnterMode(id, mode));
  const rosterTabStop = rosterChoices.includes(rosterSelected as PitVersusFighterId) && !isFighterUnavailable(rosterSelected as PitVersusFighterId)
    ? rosterSelected : rosterChoices.find(id => !isFighterUnavailable(id));
  const [stageFamily, setStageFamily] = useState<"all" | "original" | "film" | "game">("all");
  const [stageWork, setStageWork] = useState("all");
  const matchingStageIds = PIT_ARENA_IDS.filter(id => {
    const metadata = getPitScreenArenaMetadata(id);
    return (stageFamily === "all" || (stageFamily === "original" ? !metadata : metadata?.kind === stageFamily))
      && (stageWork === "all" || metadata?.workId === stageWork);
  });
  // An imposed campaign venue stays visible even after leaving a filtered free duel.
  const stageIds = imposed ? [arenaId] : matchingStageIds.includes(arenaId) ? matchingStageIds : PIT_ARENA_IDS;
  const screenMetadata = getPitScreenArenaMetadata(arenaId);
  const availableWorks = PIT_SCREEN_ARENA_WORKS.filter(work => (stageFamily === "all" || work.kind === stageFamily)
    && PIT_ARENA_IDS.some(id => getPitScreenArenaMetadata(id)?.workId === work.id));
  const changeStageFilter = (family: typeof stageFamily, workId: string) => {
    if (locked || imposed) return;
    const ids = PIT_ARENA_IDS.filter(id => {
      const metadata = getPitScreenArenaMetadata(id);
      return (family === "all" || (family === "original" ? !metadata : metadata?.kind === family))
        && (workId === "all" || metadata?.workId === workId);
    });
    if (!ids.length) return;
    setStageFamily(family); setStageWork(workId);
    if (!ids.includes(arenaId)) props.onArenaChange(ids[0]);
  };
  const stagePageSize = 24;
  const stagePage = Math.floor(Math.max(0, stageIds.indexOf(arenaId)) / stagePageSize);
  const stagePageCount = Math.ceil(stageIds.length / stagePageSize);
  const stageChoices = stageIds.slice(stagePage * stagePageSize, (stagePage + 1) * stagePageSize);
  const stageReady = preview?.id === arenaId && preview.status === "ready";
  const onPreviewStatus = useCallback((id: PitArenaId, status: PitStagePreviewStatus) => setPreview({ id, status }), []);
  const focus = useCallback(() => {
    const selected = gridRef.current?.querySelector<HTMLButtonElement>('[aria-selected="true"]:not(:disabled)');
    (selected ?? confirmRef.current)?.focus({ preventScroll: true });
  }, []);
  useEffect(() => { const frame = requestAnimationFrame(focus); return () => cancelAnimationFrame(frame); }, [state.step, state.slot, focus]);
  const pick = (id: PitVersusFighterId) => {
    if (locked || (state.slot === "opponent" && (imposed || id === playerId)) || (state.slot === "player" && !canPitFighterEnterMode(id, mode))) return;
    if (id === rosterSelected) return;
    if (state.slot === "player") props.onPlayerChange(id); else props.onOpponentChange(id);
    dispatch({ type: "pick", slot: state.slot });
  };
  const editSlot = (slot: "player" | "opponent", selectedOverride?: PitVersusFighterId) => {
    setRosterQuery("");
    const selected = selectedOverride ?? (slot === "player" ? playerId : opponentId);
    setRequestedRosterPage(Math.floor(Math.max(0, PIT_VERSUS_FIGHTER_IDS.indexOf(selected as PitVersusFighterId)) / ROSTER_PAGE_SIZE));
    dispatch({ type: "edit", slot });
  };
  const changeVariant = (id: string | null) => {
    if (locked || state.step !== "fighters" || (state.slot === "opponent" && imposed)) return;
    if ((id ?? "") === variantValue) return;
    if (state.slot === "player") props.onPlayerVariantChange(id); else props.onOpponentVariantChange(id);
    dispatch({ type: "pick", slot: state.slot });
  };
  const cycleVariant = (direction: -1 | 1) => {
    if (variantChoices.length < 2) return;
    const current = variantChoices.findIndex(variant => (variant.id ?? "") === variantValue);
    const next = variantChoices[(Math.max(0, current) + direction + variantChoices.length) % variantChoices.length];
    changeVariant(next.id);
  };
  const changeRosterQuery = (value: string) => { setRosterQuery(value); setRequestedRosterPage(0); };
  const changeRosterPage = (page: number) => {
    if (locked) return;
    setRequestedRosterPage(page);
    const first = matchingFighterIds.slice(page * ROSTER_PAGE_SIZE, (page + 1) * ROSTER_PAGE_SIZE).find(id => !isFighterUnavailable(id));
    if (first) pick(first);
  };
  const confirm = () => {
    if (props.launchDisabled) return;
    if (state.step === "stage") { if (stageReady) props.onLaunch(); return; }
    if (locked) return;
    if (state.slot === "player") {
      setRosterQuery("");
      setRequestedRosterPage(Math.floor(Math.max(0, PIT_VERSUS_FIGHTER_IDS.indexOf(opponentId as PitVersusFighterId)) / ROSTER_PAGE_SIZE));
    }
    dispatch({ type: "confirm", player: playerId, opponent: opponentId, eventOnly });
  };
  const back = () => {
    if (locked) return;
    if (state.step === "fighters" && state.slot === "player") props.onExit();
    else {
      const selected = state.step === "stage" ? opponentId : playerId;
      setRosterQuery("");
      setRequestedRosterPage(Math.floor(Math.max(0, PIT_VERSUS_FIGHTER_IDS.indexOf(selected as PitVersusFighterId)) / ROSTER_PAGE_SIZE));
      dispatch({ type: "back" });
    }
  };
  const command = (input: PitSelectionCommand) => {
    if (input === "back") return back();
    if (input === "confirm") return confirm();
    if (input === "variant-prev" || input === "variant-next") return cycleVariant(input === "variant-prev" ? -1 : 1);
    if (locked) return;
    if (state.step === "fighters" && state.slot === "opponent" && imposed) return;
    if (state.step === "stage" && imposed) {
      if (props.onImposedNavigate) {
        props.onImposedNavigate(input === "left" || input === "up" ? -1 : 1);
        dispatch({ type: "edit", slot: "opponent" });
      }
      return;
    }
    const columns = gridRef.current ? Math.max(1, getComputedStyle(gridRef.current).gridTemplateColumns.split(" ").length) : 1;
    if (state.step === "stage") {
      const next = movePitSelectionIndex(stageIds.indexOf(arenaId), input, columns, stageIds.map(() => true));
      const id = stageIds[next];
      if (id) {
        props.onArenaChange(id);
        requestAnimationFrame(() => gridRef.current?.querySelector<HTMLButtonElement>(`[data-choice-id="${id}"]`)?.focus());
      }
      return;
    }
    // Navigate the complete filtered roster, including fighters on unmounted pages.
    const index = matchingFighterIds.indexOf(rosterSelected as PitVersusFighterId);
    const availability = matchingFighterIds.map(id => !isFighterUnavailable(id));
    const next = index < 0 ? availability.findIndex(Boolean) : movePitSelectionIndex(index, input, columns, availability);
    const id = matchingFighterIds[next]; if (!id) return;
    setRequestedRosterPage(Math.floor(next / ROSTER_PAGE_SIZE));
    pick(id);
    requestAnimationFrame(() => gridRef.current?.querySelector<HTMLButtonElement>(`[data-choice-id="${id}"]`)?.focus());
  };
  useImperativeHandle(ref, () => ({ command, focus, reset: (playerOverride) => editSlot("player", playerOverride), reviewOpponent: () => editSlot("opponent") }));
  return <div ref={rootRef} className={styles.flow} data-pit-selection-immersive="true" data-high-contrast={props.highContrast} data-reduced-motion={props.reducedMotion} data-pit-selection-step={state.step} data-pit-selection-slot={state.slot}
    onKeyDown={event => {
      if (event.defaultPrevented || event.repeat) return;
      const target = event.target as HTMLElement;
      const openDetails = target.closest<HTMLDetailsElement>("details[open]");
      if (event.key === "Escape" && openDetails) {
        event.preventDefault(); event.stopPropagation(); openDetails.open = false;
        openDetails.querySelector<HTMLElement>("summary")?.focus(); return;
      }
      if (target.closest('input, select, textarea, [contenteditable="true"]')) return;
      if (state.step === "fighters" && (event.key.toLowerCase() === "q" || event.key.toLowerCase() === "e")) {
        event.preventDefault(); cycleVariant(event.key.toLowerCase() === "q" ? -1 : 1); return;
      }
      if (!target.closest('[role="option"]')) return;
      const direction = ({ ArrowLeft: "left", ArrowRight: "right", ArrowUp: "up", ArrowDown: "down" } as const)[event.key as "ArrowLeft"];
      if (direction) { event.preventDefault(); command(direction); }
      else if (event.key === "Enter" || event.key === " ") { event.preventDefault(); confirm(); }
    }}>
    <ol className={styles.steps} aria-label="Étapes de sélection"><li aria-current={state.step === "fighters" ? "step" : undefined}>01 · Combattants</li><li aria-current={state.step === "stage" ? "step" : undefined}>02 · Stage</li><li>03 · Combat</li></ol>
    {state.step === "fighters" ? <>
      <div className={styles.fighterLayout}>
        <aside className={styles.contender} data-selection-side="player" data-active={state.slot === "player"} data-confirmed={state.confirmedPlayer === playerId} aria-label="Combattant joueur 1">
          <button type="button" className={styles.slotButton} disabled={locked} onClick={() => editSlot("player")}><span>J1</span><strong>{state.confirmedPlayer === playerId ? "PRÊT" : "SÉLECTION"}</strong></button>
          {props.playerPreview}
        </aside>
        <section className={styles.rosterConsole} aria-labelledby="pit-roster-heading">
      <div className={styles.rosterHeading}><div><span className={styles.consoleEyebrow}>REGISTRE DES CHASSEURS</span><h3 id="pit-roster-heading">{state.slot === "player" ? "Choisis ton combattant" : imposed ? "Confirme la rencontre du parcours" : "Choisis l’adversaire"}</h3></div><span className={styles.versus}>VS</span><span>{state.slot === "player" ? "J1" : mode === "local" ? "J2" : "RIVAL"}</span></div>
      {state.slot === "opponent" && imposed ? <p className={styles.imposed} role="status">{eventOnly ? "Cette branche est un événement sans combat." : `${PIT_FIGHTERS[opponentId].name} est imposé par ce parcours.`} Le choix du stage respecte la progression sauvegardée.</p> : <>
        <div className={styles.rosterTools}>
          <label>Rechercher un chasseur<input type="search" data-pit-roster-search aria-label="Rechercher un chasseur" autoComplete="off" spellCheck={false} placeholder="Nom, masque, variante…" value={rosterQuery} disabled={locked} onChange={event => changeRosterQuery(event.target.value)} /></label>
          <span role="status">{matchingFighterIds.length} / {PIT_VERSUS_FIGHTER_IDS.length}</span>
          {rosterQuery && <button type="button" disabled={locked} onClick={() => changeRosterQuery("")}>Effacer</button>}
        </div>
        {mode === "arcade" || mode === "circuit" || mode === "descent" ? <p className={styles.referenceNote}>Les chasseurs supplémentaires sont disponibles en duel, versus local et entraînement. Leur parcours individuel n’est pas encore écrit.</p> : null}
        <div ref={gridRef} className={styles.roster} role="listbox" aria-label={state.slot === "player" ? "Combattant joueur" : "Adversaire"} data-pit-roster-total={PIT_VERSUS_FIGHTER_IDS.length} data-pit-roster-filtered={matchingFighterIds.length} data-pit-roster-page={rosterPage + 1}>
          {rosterChoices.map(id => {
            const variants = getPitFighterVariants(id);
            return <button type="button" role="option" key={id} data-choice-id={id} aria-label={PIT_FIGHTERS[id].name} aria-selected={rosterSelected === id} disabled={isFighterUnavailable(id)} tabIndex={rosterTabStop === id ? 0 : -1} onClick={() => pick(id)} onFocus={() => { if (rosterSelected !== id) pick(id); }}><RosterPortrait id={id} /><strong>{PIT_FIGHTERS[id].name}</strong>{state.slot === "opponent" && id === playerId ? <small className={styles.rosterBadge}>J1</small> : (id === "kok-warlord" || id === "stone-heart") ? <small className={styles.rosterBadge}>BOSS</small> : !canPitFighterEnterMode(id, mode) ? <small className={styles.rosterBadge}>DUEL</small> : variants.length > 0 ? <small className={styles.rosterBadge} aria-label={`${variants.length} présentations fournies`}>{variants.length}</small> : null}</button>;
          })}
        </div>
        {!matchingFighterIds.length && <p className={styles.emptyRoster} role="status">Aucun chasseur trouvé. La sélection actuelle est conservée.</p>}
        {rosterPageCount > 1 && <nav className={styles.stagePages} aria-label="Pages des chasseurs">
          <button type="button" data-pit-roster-page-prev disabled={locked || rosterPage === 0} onClick={() => changeRosterPage(rosterPage - 1)} aria-label="Page précédente">‹ <span>Précédente</span></button>
          <span>Page {rosterPage + 1} / {rosterPageCount}</span>
          <button type="button" data-pit-roster-page-next disabled={locked || rosterPage === rosterPageCount - 1} onClick={() => changeRosterPage(rosterPage + 1)} aria-label="Page suivante"><span>Suivante</span> ›</button>
        </nav>}
        <section className={styles.variants} aria-label="Présentation du chasseur sélectionné" data-pit-variant-fighter={rosterSelected}>
          <div className={styles.variantHeading}><strong>APPARENCE</strong><span>{variantChoices.length} choix · même combattant</span></div>
          <div className={styles.variantControls}>
            <button type="button" data-pit-variant-prev aria-label="Présentation précédente" aria-keyshortcuts="Q" disabled={locked || variantChoices.length < 2} onClick={() => cycleVariant(-1)}>‹</button>
            <label>Présentation<select data-pit-variant-select aria-label="Présentation du chasseur" disabled={locked || variantChoices.length < 2} value={variantValue} onChange={event => changeVariant(event.target.value || null)}>
              {variantChoices.map(variant => <option key={variant.id ?? "current"} value={variant.id ?? ""}>{variant.label}</option>)}
            </select></label>
            <button type="button" data-pit-variant-next aria-label="Présentation suivante" aria-keyshortcuts="E" disabled={locked || variantChoices.length < 2} onClick={() => cycleVariant(1)}>›</button>
          </div>
          <p className={styles.variantNote}>Masque et tenue changent l’apparence, pas les règles du combattant.</p>
        </section>
      </>}
        </section>
        <aside className={styles.contender} data-selection-side="opponent" data-active={state.slot === "opponent"} data-confirmed={state.confirmedOpponent === opponentId} aria-label={mode === "local" ? "Combattant joueur 2" : "Adversaire"}>
          <button type="button" className={styles.slotButton} disabled={locked || state.confirmedPlayer !== playerId} onClick={() => editSlot("opponent")}><span>{mode === "local" ? "J2" : "RIVAL"}</span><strong>{imposed ? "PARCOURS" : state.confirmedOpponent === opponentId ? "PRÊT" : "SÉLECTION"}</strong></button>
          {props.opponentPreview}
        </aside>
      </div>
    </> : <div className={styles.stageLayout}>
      <section className={styles.stageShowcase} aria-label="Arène sélectionnée">
      <div className={styles.stageHeading}><div><span>STAGE SELECT</span><h3>{PIT_ARENAS[arenaId].name}</h3><p>{PIT_FIGHTERS[playerId].name} {eventOnly ? "· branche de parcours" : `VS ${PIT_FIGHTERS[opponentId].name}`}</p></div><span>{imposed ? "IMPOSÉ PAR LE PARCOURS" : `${PIT_ARENA_IDS.length} STAGES JOUABLES`}</span></div>
      <PitStagePreview arenaId={arenaId} reducedMotion={props.reducedMotion} highContrast={props.highContrast} onStatus={onPreviewStatus} />
      <p className={styles.stageDescription}>{PIT_ARENAS[arenaId].setting} · Aperçu des plans réels P0–P5{props.reducedMotion ? " · mouvement réduit" : " · parallaxe active"}.</p>
      {screenMetadata && <p className={styles.referenceNote} data-pit-screen-reference>{screenMetadata.workTitle} · Décor adapté à la vue latérale 2D ; disposition de combat recomposée. La fidélité exacte à chaque plan du film ou du jeu n’est pas certifiée.</p>}
      </section>
      <section className={styles.stageBrowser} aria-label="Catalogue des arènes">
      <div className={styles.stageFilters} aria-label="Filtres des stages">
        <label>Collection<select aria-label="Collection de stages" disabled={locked || imposed} value={stageFamily} onChange={event => changeStageFilter(event.target.value as typeof stageFamily, "all")}>
          <option value="all">Tous les stages</option><option value="original">Collection historique</option>
          {(["film", "game"] as const).filter(kind => PIT_ARENA_IDS.some(id => getPitScreenArenaMetadata(id)?.kind === kind)).map(kind => <option key={kind} value={kind}>{kind === "film" ? "Films Predator / AVP" : "Jeux Predator / AVP"}</option>)}
        </select></label>
        <label>Œuvre<select aria-label="Œuvre du stage" disabled={locked || imposed || !availableWorks.length} value={stageWork} onChange={event => changeStageFilter(stageFamily, event.target.value)}>
          <option value="all">Toutes les œuvres</option>{availableWorks.map(work => <option key={work.id} value={work.id}>{work.title}</option>)}
        </select></label><span role="status">{stageIds.length} stage{stageIds.length > 1 ? "s" : ""}</span>
      </div>
      <div ref={gridRef} className={styles.stages} role="listbox" aria-label="Arènes disponibles" data-pit-stage-total={PIT_ARENA_IDS.length} data-pit-stage-filtered={stageIds.length} data-pit-stage-page={stagePage + 1}>
        {stageChoices.map(id => <button key={id} type="button" role="option" data-choice-id={id} aria-label={PIT_ARENAS[id].name} aria-selected={arenaId === id} disabled={locked || (imposed && id !== arenaId)} tabIndex={arenaId === id ? 0 : -1} onClick={() => props.onArenaChange(id)} onFocus={() => { if (!imposed && id !== arenaId) props.onArenaChange(id); }}><span>{stageThumbnail(id) ? <img src={stageThumbnail(id)} alt="" loading="lazy" decoding="async" /> : null}</span><strong>{PIT_ARENAS[id].name}</strong></button>)}
      </div>
      {stagePageCount > 1 && <nav className={styles.stagePages} aria-label="Pages des arènes">
        <button type="button" data-pit-stage-page-prev disabled={locked || imposed || stagePage === 0} onClick={() => props.onArenaChange(stageIds[(stagePage - 1) * stagePageSize])} aria-label="Page précédente">‹ <span>Précédente</span></button>
        <span>Page {stagePage + 1} / {stagePageCount} · {stageIds.length} stages</span>
        <button type="button" data-pit-stage-page-next disabled={locked || imposed || stagePage === stagePageCount - 1} onClick={() => props.onArenaChange(stageIds[(stagePage + 1) * stagePageSize])} aria-label="Page suivante"><span>Suivante</span> ›</button>
      </nav>}
      </section>
    </div>}
    <div className={styles.actions}><button type="button" onClick={back} disabled={locked}>{state.step === "stage" ? "Retour aux combattants" : state.slot === "opponent" ? "Retour au joueur 1" : "Retour au vaisseau"} · B</button><div className={styles.selectionCue} aria-hidden="true"><span>{state.step === "stage" ? "TERRAIN DU DUEL" : state.slot === "player" ? "JOUEUR 1" : "ADVERSAIRE"}</span><strong>{state.step === "stage" ? PIT_ARENAS[arenaId].name : PIT_FIGHTERS[rosterSelected].name}</strong></div><button ref={confirmRef} type="button" className={styles.confirm} data-pit-selection-confirm aria-keyshortcuts="Enter Space" data-gamepad-shortcut="A" onClick={confirm} disabled={(locked && state.step !== "stage") || props.launchDisabled || (state.step === "stage" && !stageReady)}>{state.step === "stage" ? stageReady ? props.launchLabel : "CHARGEMENT DU STAGE…" : state.slot === "player" ? "CONFIRMER JOUEUR 1" : imposed ? "CONFIRMER LA RENCONTRE" : "CONFIRMER L’ADVERSAIRE"} · A</button></div>
    <details className={styles.commandHelp}><summary>COMMANDES <span>Flèches · choisir / Entrée · confirmer / Échap · retour</span></summary><p className={styles.instructions} role="status">{state.step === "fighters" ? `${state.slot === "player" ? "Joueur 1" : "Adversaire"} : ${PIT_FIGHTERS[rosterSelected].name}.` : `Stage : ${PIT_ARENAS[arenaId].name}.`} Flèches / croix directionnelle : choisir · Entrée / A : confirmer · Échap / B : retour. Q / E ou LT / RT : présentation précédente / suivante · LB / RB : changer de mode. Au tactile, touche une icône puis confirme.</p><p className={styles.instructions}>Les portraits illustrent la sélection. Les variantes partagent les règles de leur combattant ; elles ne garantissent pas un jeu d’animations complet. La couverture produite est consultable dans l’atelier d’animation.</p></details>
  </div>;
});
export default PitSelectionFlow;
