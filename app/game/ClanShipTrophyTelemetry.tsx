'use client';

import { useEffect, useId, useState } from 'react';
import { CLAN_SHIP_TROPHY_TELEMETRY, type ClanShipTrophySampleId } from './systems/clanShipTrophyHearing';
import styles from './ClanShipTrophyTelemetry.module.css';

/** A replay of the three recorded observations. Playback only changes the
 * displayed sample; evidence is acquired through the campaign transaction. */
export default function ClanShipTrophyTelemetry({ recordedSampleIds, disabled, onRecord }: {
  recordedSampleIds: readonly ClanShipTrophySampleId[];
  disabled: boolean;
  onRecord: (sampleId: ClanShipTrophySampleId) => void;
}) {
  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const descriptionId = useId();
  const sample = CLAN_SHIP_TROPHY_TELEMETRY[index];
  const recorded = recordedSampleIds.includes(sample.id);
  const running = playing && !disabled && !reducedMotion;
  const canRecord = !disabled && !recorded && index === recordedSampleIds.length;

  useEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    const motionChanged = () => { setReducedMotion(media.matches); if (media.matches) setPlaying(false); };
    const pause = () => setPlaying(false);
    const visibilityChanged = () => { if (document.hidden) pause(); };
    motionChanged();
    media.addEventListener('change', motionChanged);
    window.addEventListener('blur', pause);
    document.addEventListener('visibilitychange', visibilityChanged);
    return () => {
      media.removeEventListener('change', motionChanged);
      window.removeEventListener('blur', pause);
      document.removeEventListener('visibilitychange', visibilityChanged);
    };
  }, []);

  useEffect(() => {
    if (!running || document.hidden || !document.hasFocus()) return;
    const timer = window.setTimeout(() => {
      if (document.hidden || !document.hasFocus()) { setPlaying(false); return; }
      if (index >= CLAN_SHIP_TROPHY_TELEMETRY.length - 1) setPlaying(false);
      else setIndex(index + 1);
    }, 2000);
    return () => window.clearTimeout(timer);
  }, [running, index]);

  const select = (next: number) => { setPlaying(false); setIndex(next); };
  return <section className={styles.telemetry} data-clan-trophy-telemetry data-telemetry-sample={sample.id}
    data-telemetry-playing={running} aria-label="Relecture des enregistrements C-37">
    <header><span>ARCHIVE C-37</span><strong>Une prise. Deux traces.</strong><p>Reconstitue l’ordre du prélèvement et du retour.</p></header>
    <div className={styles.steps} aria-label="Passages enregistrés">
      {CLAN_SHIP_TROPHY_TELEMETRY.map((entry, i) => <button type="button" key={entry.id} disabled={disabled}
        aria-pressed={index === i} data-telemetry-select={entry.id} onClick={() => select(i)}>
        <span>{String(i + 1).padStart(2, '0')}</span><strong>{entry.title}</strong>
        <small>{recordedSampleIds.includes(entry.id) ? 'Consigné' : 'À comparer'}</small>
      </button>)}
    </div>
    <div className={styles.replay} data-replay-stage={sample.id}>
      <svg viewBox="0 0 340 140" role="img" aria-describedby={descriptionId} aria-label={index === 0
        ? 'Le relevé de chasse montre la strie B-17 sans ligature.'
        : 'La strie B-17 reste sous la ligature de transport T-04 sur le même objet C-37.'}>
        <path className={styles.scanline} d="M12 100H328M12 120H328M40 15V124M300 15V124" />
        <rect x="62" y="36" width="216" height="68" rx="8" fill="#203b39" stroke="#b9c19b" strokeWidth="2" />
        <path d="M94 48V88M108 48L94 67M108 70L94 88" stroke="#eed29c" strokeWidth="4" fill="none" />
        <text x="122" y="75" fill="#f4e3b7" fontSize="20">B-17</text>
        {index > 0 && <><path d="M224 36V104M234 36V104" stroke="#d99459" strokeWidth="5" />
          <text x="247" y="78" fill="#f3c49a" fontSize="12">T-04</text></>}
        <text x="170" y="22" textAnchor="middle" fill="#b8cfc1" fontSize="12">{index === 0 ? 'AVANT LE TRANSPORT' : index === 1 ? 'MISE EN COFFRE' : 'RETOUR DU MÊME OBJET'}</text>
        <text x="170" y="131" textAnchor="middle" fill="#e4ead3" fontSize="12">C-37 · {index === 0 ? 'strie seule' : 'strie conservée sous la ligature'}</text>
      </svg>
      <p id={descriptionId}>{sample.description}</p>
      <small>{sample.source}</small>
    </div>
    <div className={styles.transport}>
      <button type="button" disabled={disabled || index === 0} aria-label="Passage précédent" onClick={() => select(index - 1)}>Précédent</button>
      <button type="button" disabled={disabled || reducedMotion} aria-pressed={running} data-telemetry-play
        onClick={() => { if (!running && index === CLAN_SHIP_TROPHY_TELEMETRY.length - 1) setIndex(0); setPlaying(!running); }}>
        {running ? 'Pause' : index === CLAN_SHIP_TROPHY_TELEMETRY.length - 1 ? 'Rejouer' : 'Lire'}
      </button>
      <button type="button" disabled={disabled || index === CLAN_SHIP_TROPHY_TELEMETRY.length - 1} aria-label="Passage suivant" onClick={() => select(index + 1)}>Suivant</button>
    </div>
    {reducedMotion && <p className={styles.help}>Lecture par étapes : choisis Précédent ou Suivant.</p>}
    <button type="button" className={styles.record} disabled={!canRecord} data-telemetry-record={sample.id} data-trophy-hearing-action={`record-sample:${sample.id}`}
      onClick={() => { setPlaying(false); onRecord(sample.id); }}>
      {recorded ? 'Passage consigné' : 'Consigner cette observation'}
    </button>
    <p className={styles.help} aria-live="polite">{recordedSampleIds.length} / 3 observations consignées.
      {disabled ? ' Approche du support C-37 pour comparer les relevés.' : !recorded && !canRecord ? ' Consigne d’abord le passage précédent.' : ' La lecture seule ne confirme aucune observation.'}</p>
  </section>;
}
