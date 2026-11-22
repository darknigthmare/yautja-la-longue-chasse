'use client';

import { useId, useMemo, useState, type KeyboardEvent } from 'react';
import styles from './EarthHuntV171.module.css';
import {
  EARTH_CONTRACT_V171,
  EARTH_OKAVANGO_MAP_V171,
  EARTH_OKAVANGO_CAMERA_V171,
  EARTH_OKAVANGO_PORTERS_V171,
  EARTH_OKAVANGO_TERRAIN_V171,
  inspectEarthHuntV171,
  type EarthHuntAccessV171,
  type EarthHuntActionV171,
  type EarthHuntStateV171,
  type EarthHuntViewV171,
} from './systems/earthHuntV171';

type Props = {
  access: EarthHuntAccessV171;
  owner: string;
  state: EarthHuntStateV171 | null;
  onAction: (action: EarthHuntActionV171) => { accepted: boolean; message: string };
  onExit: () => void;
  onOpenSettings?: () => void;
};

const MOVE_KEYS = {
  ArrowUp: 'north',
  ArrowDown: 'south',
  ArrowLeft: 'west',
  ArrowRight: 'east',
} as const;

const moves = [
  { direction: 'north', caption: 'Nord' },
  { direction: 'west', caption: 'Ouest' },
  { direction: 'south', caption: 'Sud' },
  { direction: 'east', caption: 'Est' },
] as const;

const fieldCommands = [
  { kind: 'scan', caption: 'Analyser' },
  { kind: 'listen', caption: 'Écouter la radio' },
  { kind: 'jam', caption: 'Neutraliser le téléphone' },
  { kind: 'strike', caption: 'Frapper à la lame' },
  { kind: 'clean', caption: 'Nettoyer les traces' },
  { kind: 'extract', caption: 'Extraire' },
] as const;

function occupies(point: readonly [number, number], x: number, y: number) {
  return point[0] === x && point[1] === y;
}

function currentObjective(view: EarthHuntViewV171) {
  if (view.traces.length < 3) return 'Analysez les trois traces dans les roseaux au nord-ouest.';
  if (!view.radioHeard) return 'Écoutez la radio au camp puis rejoignez l’île du baobab.';
  if (view.lislePhase < 3) return 'Neutralisez Lisle au corps-à-corps. Les couverts et le camouflage protègent des tirs.';
  if (!view.outcome) return 'Choisissez le sort de Lisle à portée de lame.';
  if (view.outcome === 'hunted' && !view.trophy) return 'Prélevez le trophée de Lisle près de sa dépouille.';
  return 'Nettoyez les traces et rejoignez l’extraction au sud-est.';
}

function Terrain({ view, onMove }: {
  view: EarthHuntViewV171;
  onMove: (event: KeyboardEvent<HTMLDivElement>) => void;
}) {
  return (
    <div className={styles.terrain} aria-label="Carte du delta, déplacement avec les flèches" tabIndex={0} onKeyDown={onMove}>
      <div className={styles.tiles} aria-hidden="true">
        {EARTH_OKAVANGO_MAP_V171.flatMap((row, y) => [...row].map((mark, x) => {
          const terrain = EARTH_OKAVANGO_TERRAIN_V171[mark as keyof typeof EARTH_OKAVANGO_TERRAIN_V171];
          const player = occupies(view.position, x, y);
          const guard = view.guard !== 'defeated' && occupies(view.guardPosition, x, y);
          const boss = occupies(view.lislePosition, x, y) && !view.outcome;
          const kind = mark === '=' && view.flooded ? 'water' : terrain.kind;
          const porter = view.marksVisible && EARTH_OKAVANGO_PORTERS_V171.some(point => occupies(point, x, y));
          const camera = view.marksVisible && !view.cameraDestroyed && occupies(EARTH_OKAVANGO_CAMERA_V171, x, y);
          const trace = view.exposedTrack && occupies(view.guardPosition, x, y);
          const token = player ? 'Vous'
            : boss || guard ? (view.marksVisible ? '▲' : '◆')
            : trace ? '×'
            : camera ? '▣'
            : porter ? '●'
            : mark === 'X' ? '↟'
            : mark === 'r' ? '·'
            : '';
          return (
            <span
              key={y * row.length + x}
              className={styles.tile}
              data-terrain={kind}
              data-player={player || undefined}
              data-cloak={player && view.cloak ? true : undefined}
              data-threat={guard || boss || undefined}
              title={terrain.name}
            >
              {token}
            </span>
          );
        }))}
      </div>
    </div>
  );
}

export default function EarthHuntV171({ access, owner, state, onAction, onExit, onOpenSettings }: Props) {
  const heading = useId();
  const [message, setMessage] = useState('');
  const { status, view } = useMemo(() => inspectEarthHuntV171(state, owner), [state, owner]);
  const command = (action: EarthHuntActionV171) => setMessage(onAction(action).message);
  const moveByKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const direction = MOVE_KEYS[event.key as keyof typeof MOVE_KEYS];
    if (!direction || event.altKey || event.ctrlKey || event.metaKey) return;
    event.preventDefault();
    if (!event.repeat) command({ kind: 'move', direction });
  };
  const currentTile = EARTH_OKAVANGO_MAP_V171[view.position[1]][view.position[0]];
  const currentTerrain = EARTH_OKAVANGO_TERRAIN_V171[currentTile as keyof typeof EARTH_OKAVANGO_TERRAIN_V171];
  const unreadable = status === 'invalid' || status === 'future-version';
  return (
    <section className={styles.scene} aria-labelledby={heading} data-earth-hunt={view.phase}>
      <header className={styles.header}>
        <div>
          <p>Registre terrestre · {EARTH_CONTRACT_V171.site}</p>
          <h1 id={heading}>{EARTH_CONTRACT_V171.title}</h1>
        </div>
        <div className={styles.commands}>
          <button type="button" onClick={onExit}>Retour au vaisseau</button>
          {onOpenSettings && <button type="button" onClick={onOpenSettings}>Réglages</button>}
        </div>
      </header>
      {!access.allowed ? <p role="status">{access.reason}</p> : unreadable ? (
        <p role="alert">Ce relevé terrestre est illisible. La partie en cours est conservée.</p>
      ) : (
        <>
          {view.phase === 'registry' && (
            <div className={styles.panel}>
              <h2>Choisir le dépôt</h2>
              <p>Konrad Lisle dirige un trafic d’ivoire dans le delta. Les porteurs désarmés sont protégés.</p>
              <p>Saar suit l’insertion depuis l’orbite. Le site change à la montée des eaux.</p>
              <div className={styles.commands}>
                <button type="button" onClick={() => command({ kind: 'deploy', site: 'papyrus' })}>
                  Îlot de papyrus · dépôt sûr
                </button>
                <button type="button" onClick={() => command({ kind: 'deploy', site: 'lions' })}>
                  Plaine des lions · dépôt risqué
                </button>
              </div>
            </div>
          )}
          {view.phase === 'field' && (
            <div className={styles.field}>
              <div>
                <Terrain view={view} onMove={moveByKey} />
                <p className={styles.legend}>▲ Armé · ● Porteur · ▣ Caméra · ↟ Extraction</p>
              </div>
              <div className={styles.panel}>
                <h2>{currentTerrain.name}</h2>
                <p>{currentObjective(view)}</p>
                <dl className={styles.stats}>
                  <div><dt>Vitalité</dt><dd>{view.hp} / 5</dd></div>
                  <div><dt>Indices</dt><dd>{view.traces.length} / 3</dd></div>
                  <div><dt>Discrétion</dt><dd>{view.index} / 20</dd></div>
                  {view.guard === 'alert' && <div><dt>Envoi d’image</dt><dd>{view.sendTurns} actions</dd></div>}
                  {view.outcome && <div><dt>Extraction</dt><dd>{view.extractionTurns} actions</dd></div>}
                </dl>
                <div className={styles.commands} role="group" aria-label="Déplacement dans le delta">
                  {moves.map(({ direction, caption }) => (
                    <button key={direction} type="button" onClick={() => command({ kind: 'move', direction })}>
                      {caption}
                    </button>
                  ))}
                </div>
                <div className={styles.commands} role="group" aria-label="Actions de chasse">
                  <button type="button" aria-pressed={view.cloak} onClick={() => command({ kind: 'cloak' })}>
                    Camouflage
                  </button>
                  {fieldCommands.map(({ kind, caption }) => (
                    <button key={kind} type="button" onClick={() => command({ kind })}>{caption}</button>
                  ))}
                  {view.lislePhase === 3 && !view.outcome && (
                    <>
                      <button type="button" onClick={() => command({ kind: 'spare' })}>Épargner Lisle</button>
                      <button type="button" onClick={() => command({ kind: 'finish' })}>Achever Lisle</button>
                    </>
                  )}
                  {view.outcome === 'hunted' && !view.trophy && (
                    <button type="button" onClick={() => command({ kind: 'harvest' })}>Prélever le trophée</button>
                  )}
                </div>
              </div>
            </div>
          )}
          {(view.phase === 'extracted' || view.phase === 'reported') && (
            <div className={styles.panel}>
              <h2>{view.phase === 'reported' ? 'Rapport enregistré' : 'Débrief au vaisseau'}</h2>
              <p>{view.outcome === 'spared' ? 'Lisle a survécu. Il reste témoin.' : 'Crâne de Konrad Lisle rapporté.'}</p>
              <p>Indice de Discrétion du Registre terrestre {view.index} / 20.</p>
              {view.phase === 'extracted' && (
                <button type="button" onClick={() => command({ kind: 'report' })}>Consigner le rapport</button>
              )}
            </div>
          )}
          {view.phase === 'failed' && (
            <div className={styles.panel}>
              <h2>Extraction interrompue</h2>
              <p>{view.afterAction} Indice de Discrétion conservé.</p>
              <button type="button" onClick={() => command({ kind: 'retry' })}>Reprendre depuis le Registre</button>
            </div>
          )}
          <p className={styles.feedback} aria-live="polite">{message}</p>
        </>
      )}
    </section>
  );
}
