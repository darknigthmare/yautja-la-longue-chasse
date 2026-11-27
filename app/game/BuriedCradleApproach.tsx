"use client";

import { useState } from 'react';
import Image from 'next/image';
import HunterRigPreview from './HunterRigPreview';
import type { HunterAppearance, Loadout } from './types';
import {
  advanceCradleApproach, buildCradleApproachReceipt, createCradleApproachRun, currentCradleApproachSite,
  CRADLE_APPROACH_SITES, CRADLE_APPROACH_TRACK, nearCradleApproachSite, type CradleApproachReceipt,
} from './systems/buriedCradleApproach';
import art from './data/buriedCradleArt.json';
import styles from './BuriedCradleApproach.module.css';

export default function BuriedCradleApproach({ appearance, loadout, disabled, onComplete }: {
  appearance: HunterAppearance;
  loadout: Loadout;
  disabled: boolean;
  onComplete: (receipt: CradleApproachReceipt) => boolean;
}) {
  const [run, setRun] = useState(createCradleApproachRun);
  const site = currentCradleApproachSite(run);
  const canObserve = Boolean(site && nearCradleApproachSite(run.x, site));
  const departure = buildCradleApproachReceipt(run);
  const lastObservation = CRADLE_APPROACH_SITES.find(item => item.id === run.observations.at(-1)?.id);
  const visibleSites = run.scouting ? CRADLE_APPROACH_SITES : CRADLE_APPROACH_SITES.slice(0, 3);
  const move = (direction: 'left' | 'right') => setRun(current => advanceCradleApproach(current, direction));
  const observe = () => setRun(current => advanceCradleApproach(current, 'observe'));
  const complete = () => { if (!disabled && departure) onComplete(departure); };
  const left = (x: number) => `${100 * x / CRADLE_APPROACH_TRACK.length}%`;

  return <section aria-label="Base d’approche de Xeno Prime" className={styles.approach} data-cradle-approach>
    <h4>Base d’approche</h4>
    <p id="cradle-approach-controls">Déplace-toi jusqu’aux postes. Utilise les flèches et Espace sur la carte ou les boutons en dessous.</p>
    <div className={styles.track} tabIndex={disabled ? -1 : 0} role="group" aria-label="Carte de la base d’approche"
      aria-describedby="cradle-approach-controls cradle-approach-status" data-cradle-approach-x={run.x}
      onKeyDown={event => {
        if (disabled || event.altKey || event.ctrlKey || event.metaKey || event.nativeEvent.isComposing) return;
        if (event.key === 'ArrowLeft' || event.key === 'ArrowRight') {
          event.preventDefault();
          move(event.key === 'ArrowLeft' ? 'left' : 'right');
        } else if (event.key === ' ') {
          event.preventDefault();
          if (!event.repeat) observe();
        }
      }}>
      <Image src={art.assets.BG02.src} alt="" fill unoptimized sizes="580px" className={styles.background} />
      <div className={styles.ground} aria-hidden="true" />
      {visibleSites.map(point => <div key={point.id} className={styles.station}
        data-cradle-approach-point={point.id} data-done={run.observations.some(entry => entry.id === point.id)}
        style={{ left: left(point.x) }} aria-hidden="true">
        <Image src={art.assets[point.art].src} alt="" width={74} height={74} unoptimized />
      </div>)}
      <div style={{ left: left(run.x) }} className={styles.hunter}>
        <HunterRigPreview appearance={appearance} armorId={loadout.armorId} weaponIds={loadout.weaponIds} gearIds={loadout.gearIds}
          size={54} facing={run.facing} pose="idle" label="Ton chasseur" />
      </div>
    </div>
    <p id="cradle-approach-status" role="status">
      {site ? canObserve ? `${site.label} à portée.` : `Rejoins le poste « ${site.label} ».` :
        run.scouting ? departure ? 'Reconnaissance terminée. Confirme le retour de ton relevé à la balise.' : 'Retourne à la balise avec le relevé.' :
          'Les trois préparatifs sont confirmés. Choisis la suite à la balise.'}
    </p>
    {lastObservation && <p>{lastObservation.detail}</p>}
    <div className={styles.actions}>
      <button type="button" className="ghost-button" disabled={disabled} data-cradle-approach-move="left" onClick={() => move('left')}>À gauche</button>
      <button type="button" className="ghost-button" disabled={disabled} data-cradle-approach-move="right" onClick={() => move('right')}>À droite</button>
      {site && <button type="button" className="ghost-button" disabled={disabled || !canObserve}
        data-cradle-approach-station={site.id} onClick={observe}>{site.label}</button>}
      {!site && !run.scouting && <>
        <button type="button" className="alien-button" data-cradle-approach-choice="direct"
          disabled={disabled || !departure} onClick={complete}>Confirmer l’itinéraire et l’extraction</button>
        <button type="button" className="ghost-button" data-cradle-approach-choice="recon"
          disabled={disabled || !departure} onClick={() => setRun(current => advanceCradleApproach(current, 'scout'))}>Faire une reconnaissance</button>
      </>}
      {!site && run.scouting && <button type="button" className="alien-button" data-cradle-approach-choice="return"
        disabled={disabled || !departure} onClick={complete}>Confirmer le relevé à la balise</button>}
    </div>
  </section>;
}
