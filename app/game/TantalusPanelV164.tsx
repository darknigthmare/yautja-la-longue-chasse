'use client';

import { useState } from 'react';
import type { SaveGame } from './types';
import type { ChronicleAccessContext } from './systems/clanChronicle';
import {
  evaluateTantalusGateV164, normalizeTantalusLedgerV164, tantalusGateFromSaveV164, tantalusViewV164,
  TANTALUS_BEATS_V164, TANTALUS_ECHO8_CHOICES_V164, TANTALUS_YEAR_V164,
  type TantalusActionV164, type TantalusResultV164,
} from './systems/tantalusV164';
import styles from './TantalusPanelV164.module.css';

export interface TantalusPanelV164Props {
  save: Pick<SaveGame, 'createdAt' | 'prologue' | 'shipAcquisitionV89' | 'tantalusV164' | 'warpEpochsV165'>;
  shipContext?: ChronicleAccessContext;
  onCommit: (action: TantalusActionV164) => TantalusResultV164;
  /** Ouvert d'emblée (tests, accès direct). */
  initiallyOpen?: boolean;
}

let sequence = 0;
const eventId = (kind: string) => `tantalus:${kind}:${Date.now().toString(36)}-${(sequence++).toString(36)}`;

/** Branche Warp Tantalus 2204, accessible depuis la carte galactique. */
export default function TantalusPanelV164({ save, shipContext, onCommit, initiallyOpen = false }: TantalusPanelV164Props) {
  const [notice, setNotice] = useState<string | null>(null);
  const ledger = normalizeTantalusLedgerV164(save.tantalusV164 ?? null, save.createdAt);
  const unreadable = save.tantalusV164 != null && ledger === null;
  const view = tantalusViewV164(ledger);
  const gate = evaluateTantalusGateV164(tantalusGateFromSaveV164(save, shipContext));
  const act = (action: TantalusActionV164) => setNotice(onCommit(action).message);
  return (
    <details className={styles.panel} open={initiallyOpen} data-tantalus-v164>
      <summary>Branche Warp · Tantalus {TANTALUS_YEAR_V164}</summary>
      <p>Tantalus Reach, {TANTALUS_YEAR_V164}. La station Asphodèle est silencieuse depuis des mois : un conteneur QZ17 s’est ouvert dans son laboratoire, CASSIUS maintient la quarantaine, l’Echo-8 a barricadé les survivants dans les ponts inférieurs.</p>
      {unreadable && <p className={styles.missing} role="alert">Dossier de branche illisible : rien n’est modifié.</p>}
      {!unreadable && !view.activeWarpTripId && (
        <section aria-label="Départ par le Warp">
          <h3>Départ</h3>
          {gate.allowed ? <p>Conditions du Warp réunies.</p> : (
            <>
              <p className={styles.missing}>Départ refusé. Conditions manquantes :</p>
              <ul data-tantalus-missing>{gate.missing.map(m => <li key={m.id}>{m.label}</li>)}</ul>
            </>
          )}
          <button type="button" disabled={!gate.allowed} onClick={() => act({ kind: 'depart', eventId: eventId('depart') })}>Franchir le seuil vers {TANTALUS_YEAR_V164}</button>
        </section>
      )}
      {!unreadable && view.activeWarpTripId && (
        <section aria-label="Branche 2204">
          <h3>Asphodèle, {TANTALUS_YEAR_V164}</h3>
          <p className={styles.status} data-tantalus-return={view.warpReturnReservation}>Retour réservé : la fenêtre reste ouverte même si une condition de départ est perdue.</p>
          {view.echo8 === null ? (
            <div role="group" aria-label="Sort de l’Echo-8">
              <p>L’Echo-8 a combattu en guerrier contre les Xénomorphes. Son sort te revient, une seule fois.</p>
              {TANTALUS_ECHO8_CHOICES_V164.map(c => (
                <button key={c.id} type="button" data-echo8-choice={c.id} onClick={() => act({ kind: 'echo8', eventId: eventId('echo8'), choice: c.id })}>{c.label}</button>
              ))}
            </div>
          ) : <p data-echo8-recorded={view.echo8}>Sort de l’Echo-8 décidé : {TANTALUS_ECHO8_CHOICES_V164.find(c => c.id === view.echo8)?.label}.</p>}
          <button type="button" onClick={() => act({ kind: 'return', eventId: eventId('return') })}>Rentrer par la fenêtre réservée</button>
        </section>
      )}
      {!unreadable && !view.activeWarpTripId && view.echo8 && <p data-echo8-recorded={view.echo8}>Branche 2204 : sort de l’Echo-8 conservé ({TANTALUS_ECHO8_CHOICES_V164.find(c => c.id === view.echo8)?.label}).</p>}
      {notice && <p role="status">{notice}</p>}
      <h3>Déroulé de la mission (« Le silence d’Asphodèle »)</h3>
      <ul>
        {TANTALUS_BEATS_V164.map(b => (
          <li key={b.id} className={b.status === 'non_implemente' ? styles.todo : undefined} data-beat-status={b.status}>
            {b.label} — {b.status === 'implemente' ? 'jouable' : 'non implémenté'}
          </li>
        ))}
      </ul>
    </details>
  );
}
