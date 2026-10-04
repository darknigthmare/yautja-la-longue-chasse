'use client';
import { lazy, Suspense, useCallback, useEffect, useRef, useState } from 'react';
import type { SaveGame } from './types';
import type { PitMatchCompleteResult, PitMatchPersistenceAck, PitRunTransition } from './PitCanvas';
import { applyPitResult, createPitSave, loadPitSave, pitSaveStorageKey, persistPitCircuitRun, persistPitDescentRun, replacePitCircuitRun, replacePitDescentRun, writePitSave, type PitSaveV5 } from './systems/pitSave';
import type { PitCircuitRun } from './systems/pitCircuit';
import { normalizePitReplay, type PitReplay } from './systems/pitReplay';
import { createGameReserveV66, canAdvanceGameReserveV66, normalizeGameReserveV66, type GameReserveV66State } from './systems/gameReserveV66';
import { MAIN_MENU_BONUS_OWNER_V81, MAIN_MENU_MODE_LABELS_V81, mainMenuBonusStorageV81, type MainMenuBonusStorageV81, type MainMenuGameModeV81 } from './systems/mainMenuModesV81';
import { useMenuGamepad } from './useMenuGamepad';
import { GAME_CONTENT_VERSION } from './buildInfo';
import { GameAudio } from './sound';
import styles from './MainMenuBonusModesV81.module.css';

const Pit = lazy(() => import('./PitExperienceV79'));
const Narrative = lazy(() => import('./PitNarrativeTrials'));
const Reserve = lazy(() => import('./GameReserveV66'));
const PIT_KEY = pitSaveStorageKey(MAIN_MENU_BONUS_OWNER_V81);
const RESERVE_KEY = 'reserve';
type ReserveDocument = { version: 1; state: GameReserveV66State };
const UNAVAILABLE_STORAGE = { getItem(): null { throw new Error('Stockage local indisponible.'); }, setItem(): void { throw new Error('Stockage local indisponible.'); } };

/** Confirmed spoiler access is a separate, local free-play profile. It never
 * mounts GameSession, imports an archive, or grants the story an adult arsenal. */
export default function MainMenuBonusModesV81({ mode, settings, onExit }: {
  mode: MainMenuGameModeV81; settings: SaveGame['settings']; onExit: () => void;
}) {
  const [view, setView] = useState<'briefing' | 'playing' | 'narrative'>('briefing');
  const [pit, setPit] = useState<PitSaveV5>(() => createPitSave(MAIN_MENU_BONUS_OWNER_V81));
  const [reserve, setReserve] = useState<GameReserveV66State | null>(null);
  const [lastReplay, setLastReplay] = useState<PitReplay | null>(null);
  const [loaded, setLoaded] = useState(false), [message, setMessage] = useState('');
  const [chronicleStorage, setChronicleStorage] = useState<Pick<MainMenuBonusStorageV81, 'getItem' | 'setItem'>>(UNAVAILABLE_STORAGE);
  const [reserveProtected, setReserveProtected] = useState(false), [replaceReserve, setReplaceReserve] = useState(false);
  const storage = useRef<MainMenuBonusStorageV81 | null>(null), alive = useRef(true);
  const audio = useRef<GameAudio | null>(null);
  const reserveRef = useRef<GameReserveV66State | null>(null), reserveRaw = useRef<string | null>(null);
  const root = useRef<HTMLElement>(null);
  useMenuGamepad(root, view === 'briefing', `bonus:${mode}:${loaded}:${replaceReserve}`, () => replaceReserve ? setReplaceReserve(false) : onExit());
  useEffect(() => {
    if (view !== 'briefing' || !loaded) return;
    const task = requestAnimationFrame(() => {
      const scope = replaceReserve ? root.current?.querySelector('[data-bonus-reserve-replace]') : root.current;
      scope?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus();
    });
    return () => cancelAnimationFrame(task);
  }, [view, loaded, replaceReserve]);
  useEffect(() => {
    const engine = new GameAudio(); audio.current = engine;
    return () => { engine.dispose(); audio.current = null; };
  }, []);
  useEffect(() => {
    audio.current?.setMix({ master: settings.masterVolume, music: settings.musicVolume, effects: settings.effectsVolume, muted: settings.masterVolume === 0 });
  }, [settings.masterVolume, settings.musicVolume, settings.effectsVolume]);
  useEffect(() => {
    const context = view === 'briefing' ? 'menu' : mode === 'the-pit' ? 'combat' : 'exploration';
    const apply = () => { void audio.current?.setMusicContext(document.hidden ? null : context, { fadeSeconds: .5 }); };
    apply(); document.addEventListener('visibilitychange', apply);
    return () => document.removeEventListener('visibilitychange', apply);
  }, [mode, view]);
  useEffect(() => {
    alive.current = true;
    const task = window.setTimeout(() => {
      try {
        storage.current = mainMenuBonusStorageV81(window.localStorage);
        setChronicleStorage(storage.current);
        if (mode === 'the-pit') {
          const result = loadPitSave({ storage: storage.current, key: PIT_KEY, expectedOwnerSaveCreatedAt: MAIN_MENU_BONUS_OWNER_V81 });
          if (result.save) setPit(result.save);
          if (result.failure) setMessage('Le profil libre The Pit est protégé ou indisponible. Les duels restent jouables ; aucune archive de campagne ne sera utilisée.');
        } else {
          const raw = storage.current.getItem(RESERVE_KEY); reserveRaw.current = raw;
          if (raw !== null) {
            if (raw.length > 200_000) throw new Error('Le profil libre dépasse la taille prise en charge. Il reste conservé.');
            const document: ReserveDocument = JSON.parse(raw);
            const state = document.version === 1 ? normalizeGameReserveV66(document.state) : null;
            if (!state) throw new Error('Expédition libre incompatible : son fichier est conservé sans remplacement.');
            reserveRef.current = state; setReserve(state);
          }
        }
      } catch (error) {
        if (mode === 'game-reserve') setReserveProtected(true);
        setMessage(error instanceof Error ? error.message : 'Stockage du profil libre indisponible. Aucune campagne modifiée.');
      }
      setLoaded(true);
    }, 0);
    return () => { alive.current = false; window.clearTimeout(task); };
  }, [mode]);
  const commitPit = useCallback((mutate: (current: PitSaveV5, now: string) => PitSaveV5): PitMatchPersistenceAck => {
    if (!alive.current || !storage.current) return { persisted: false, message: 'Profil libre fermé ou stockage indisponible.' };
    const options = { storage: storage.current, key: PIT_KEY, expectedOwnerSaveCreatedAt: MAIN_MENU_BONUS_OWNER_V81 };
    try {
      const current = loadPitSave(options);
      if (current.failure) return { persisted: false, message: 'Profil libre The Pit protégé. Aucun résultat ni campagne remplacé.' };
      const next = mutate(current.save ?? createPitSave(MAIN_MENU_BONUS_OWNER_V81), new Date().toISOString());
      if (current.save && JSON.stringify(next) === JSON.stringify(current.save)) { setPit(current.save); return { persisted: true }; }
      const written = writePitSave(next, options);
      if (!written.persisted || !written.save) return { persisted: false, message: 'Écriture du profil libre non confirmée. Réessayez ; la campagne reste inchangée.' };
      setPit(written.save); return { persisted: true };
    } catch { return { persisted: false, message: 'Résultat du profil libre refusé. Aucun gain de campagne accordé.' }; }
  }, []);
  const recordMatch = useCallback(async (result: PitMatchCompleteResult, nextRun?: PitCircuitRun) => {
    const replay = result.replay ? normalizePitReplay(result.replay) : null;
    if (alive.current && replay) setLastReplay(replay);
    return commitPit((current, now) => {
    const application = applyPitResult(current, { id: result.resultId, mode: result.mode,
      outcome: result.winnerId === null ? 'draw' : result.winnerId === result.leftId ? 'victory' : 'defeat',
      fighterId: result.leftId, arenaId: result.arenaId, roundsWon: result.leftRoundsWon, roundsLost: result.rightRoundsWon,
      roundsDrawn: result.roundsDrawn, arcadeEncounterIndex: result.arcadeEncounterIndex, arcadeCompleted: result.arcadeCompleted,
      circuitFightIndex: result.circuitFightIndex, circuitCompleted: result.circuitCompleted, cosmeticRewardIds: result.cosmeticRewardIds, completedAt: now });
    return nextRun ? persistPitCircuitRun(application.save, nextRun, now).save : application.save;
    });
  }, [commitPit]);
  const recordTransition = useCallback(async (transition: PitRunTransition) => commitPit((current, now) => (
    transition.kind === 'circuit-persist' ? persistPitCircuitRun(current, transition.run, now)
      : transition.kind === 'circuit-replace' ? replacePitCircuitRun(current, transition.run, now)
        : transition.kind === 'descent-persist' ? persistPitDescentRun(current, transition.run, now)
          : replacePitDescentRun(current, transition.run, now)
  ).save), [commitPit]);
  const commitReserve = useCallback((state: GameReserveV66State): boolean => {
    if (!alive.current || !storage.current || reserveProtected) return false;
    if (reserveRef.current && !canAdvanceGameReserveV66(reserveRef.current, state)) return false;
    try {
      if (storage.current.getItem(RESERVE_KEY) !== reserveRaw.current) throw new Error('Le profil libre a changé dans une autre fenêtre. Reviens au menu et rouvre la réserve.');
      const normalized = normalizeGameReserveV66(state);
      if (!normalized) return false;
      const raw = JSON.stringify({ version: 1, state: normalized });
      storage.current.setItem(RESERVE_KEY, raw);
      if (storage.current.getItem(RESERVE_KEY) !== raw) throw new Error('Écriture non confirmée.');
      reserveRaw.current = raw; reserveRef.current = normalized; setReserve(normalized); setMessage(''); return true;
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Expédition libre non sauvegardée.'); return false; }
  }, [reserveProtected]);
  const launchReserve = (fresh: boolean) => {
    if (reserveProtected || !loaded) return;
    if (!fresh && reserveRef.current) { setView('playing'); return; }
    const previous = reserveRef.current;
    const random = new Uint32Array(1); crypto.getRandomValues(random);
    const state = createGameReserveV66(random[0]); reserveRef.current = null;
    if (commitReserve(state)) { setReplaceReserve(false); setView('playing'); }
    else reserveRef.current = previous;
  };
  if (view === 'narrative') return <Suspense fallback={<p role="status">Ouverture des chroniques…</p>}><Narrative controlBindings={settings.controlBindings} highContrast={settings.highContrastVision} reducedGore={settings.reducedGore} screenShake={settings.screenShake} onExit={() => setView('playing')} /></Suspense>;
  if (view === 'playing') return <section data-main-menu-bonus-mode={mode} data-bonus-campaign-independent="true" data-game-content-version={GAME_CONTENT_VERSION}>
    <Suspense fallback={<p role="status">Préparation du mode libre…</p>}>
      {mode === 'the-pit' ? <Pit ownerSaveCreatedAt={MAIN_MENU_BONUS_OWNER_V81} chronicleStorage={chronicleStorage}
        controlBindings={settings.controlBindings} highContrast={settings.highContrastVision} reducedGore={settings.reducedGore} screenShake={settings.screenShake}
        unlockedCosmeticIds={pit.unlockedCosmeticIds} savedCircuitRuns={pit.circuitRuns} savedDescentRuns={pit.descentRuns}
        lastReplay={lastReplay}
        onMatchComplete={recordMatch} onRunTransition={recordTransition} onOpenNarrativeTrials={() => setView('narrative')}
        onExit={onExit} exitLabel="Retour au menu principal" />
        : reserve ? <Reserve checkpoint={reserve} bindings={settings.controlBindings} onCheckpoint={commitReserve} persistenceError={message || null} onExit={() => setView('briefing')} /> : null}
    </Suspense>
  </section>;
  return <main ref={root} className={styles.root} data-main-menu-bonus-entry={mode} data-bonus-campaign-independent="true" data-game-content-version={GAME_CONTENT_VERSION} onKeyDown={event => {
    if (event.key === 'Escape') { event.preventDefault(); if (replaceReserve) setReplaceReserve(false); else onExit(); }
  }}>
    <section className={styles.panel}><p className={styles.eyebrow}>ACCÈS LIBRE · HORS CAMPAGNE</p><h1>{MAIN_MENU_MODE_LABELS_V81[mode]}</h1>
      <p>Votre histoire reste à son checkpoint actuel. Cet accès ne débloque ni rang, ni rite, ni arme, ni vaisseau dans la campagne.</p>
      <p>Les routes et chroniques de cet accès libre ont leur propre profil local sur cet appareil, séparé des cinq parties. Elles ne sont pas synchronisées avec le compte.</p>
      {mode === 'game-reserve' && <p>Vharuun : trois secteurs reliés, huit combattants humains adultes armés et deux appareils qu’ils peuvent réparer pour s’évader. Cette réserve est une création du jeu.</p>}
      {message && <p role="alert">{message}</p>}
      <div className={styles.actions}>
        <button type="button" disabled={!loaded || (mode === 'game-reserve' && reserveProtected)} data-bonus-start onClick={() => mode === 'the-pit' ? setView('playing') : launchReserve(false)}>{mode === 'the-pit' ? 'Entrer dans The Pit' : reserve ? reserve.status === 'active' ? 'Reprendre l’expédition libre' : 'Voir le bilan de l’expédition libre' : 'Commencer l’expédition libre'}</button>
        {mode === 'game-reserve' && reserve && !replaceReserve && <button type="button" disabled={reserveProtected} onClick={() => setReplaceReserve(true)}>Nouvelle expédition libre…</button>}
        <button type="button" onClick={onExit}>Retour au menu principal</button>
      </div>
      {replaceReserve && <div className={styles.confirmation} role="group" aria-label="Remplacement de l’expédition libre" data-bonus-reserve-replace><p>Remplacer uniquement l’expédition de ce profil libre ? Toutes les campagnes restent intactes.</p><button type="button" onClick={() => setReplaceReserve(false)}>Conserver l’expédition</button><button type="button" onClick={() => launchReserve(true)}>Confirmer la nouvelle expédition libre</button></div>}
    </section>
  </main>;
}
