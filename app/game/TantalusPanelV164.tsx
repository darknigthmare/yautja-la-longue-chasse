'use client';

import {
  chooseTantalusEcho8V167, tantalusViewV167,
  TANTALUS_BEATS_V164, TANTALUS_ECHO8_CHOICES_V164, TANTALUS_YEAR_V164,
} from './systems/tantalusV164';
import type { WarpEpochsStateV165, WarpUpdateV165 } from './systems/warpEpochsV165';
import styles from './TantalusPanelV164.module.css';

export interface TantalusPanelV164Props {
  /** État Warp commun (V165), anciens dossiers `tantalusV164` déjà repris. */
  state: WarpEpochsStateV165;
  /** Applique et écrit une transition ; même chemin que le reste du panneau Warp. */
  onApply: (update: WarpUpdateV165) => boolean;
  /** Un ancien voyage 2204 attend la fin d'un autre voyage pour être repris. */
  pendingLegacy?: boolean;
}

/**
 * Branche 2204 dans le panneau Warp (V167). Le départ et le retour passent par
 * les boutons communs du Warp (choisir la branche, engager le voyage, revenir) :
 * cette section n'a plus de porte propre.
 */
export default function TantalusPanelV164({ state, onApply, pendingLegacy = false }: TantalusPanelV164Props) {
  const view = tantalusViewV167(state);
  const choiceLabel = TANTALUS_ECHO8_CHOICES_V164.find(c => c.id === view.echo8)?.label;
  return (
    <section className={styles.panel} aria-label={`Branche Warp ${TANTALUS_YEAR_V164}`} data-tantalus-v164 data-tantalus-in-branch={String(view.inBranch)}>
      <h3>Branche Warp · Tantalus {TANTALUS_YEAR_V164}</h3>
      <p>Tantalus Reach, {TANTALUS_YEAR_V164}. La station Asphodèle est silencieuse depuis des mois : un conteneur QZ17 s’est ouvert dans son laboratoire, CASSIUS maintient la quarantaine, l’Echo-8 a barricadé les survivants dans les ponts inférieurs.</p>
      <p>Exception écrite dans la bible (20 novembre 2026) : seule époque future du Warp. Départ par « Engager le voyage » une fois la branche 2204 choisie ; mêmes conditions que toute branche.</p>
      {pendingLegacy && <p className={styles.missing} role="alert">Un ancien voyage vers 2204 est en attente : il sera repris après le retour du voyage en cours.</p>}
      {!view.inBranch && view.otherTripBranchId && <p className={styles.missing}>Voyage engagé dans {view.otherTripBranchId} : un seul voyage Warp à la fois.</p>}
      {view.inBranch && (
        <div aria-label="Branche 2204">
          <h4>Asphodèle, {TANTALUS_YEAR_V164}</h4>
          <p className={styles.status} data-tantalus-return="reservee">Retour réservé : la fenêtre reste ouverte même si une condition de départ est perdue.</p>
          {view.echo8 === null ? (
            <div role="group" aria-label="Sort de l’Echo-8">
              <p>L’Echo-8 a combattu en guerrier contre les Xénomorphes. Son sort te revient, une seule fois.</p>
              {TANTALUS_ECHO8_CHOICES_V164.map(c => (
                <button key={c.id} type="button" data-echo8-choice={c.id} onClick={() => onApply(chooseTantalusEcho8V167(state, c.id))}>{c.label}</button>
              ))}
            </div>
          ) : <p data-echo8-recorded={view.echo8}>Sort de l’Echo-8 décidé : {choiceLabel}.</p>}
        </div>
      )}
      {!view.inBranch && view.echo8 && <p data-echo8-recorded={view.echo8}>Branche 2204 : sort de l’Echo-8 conservé ({choiceLabel}).</p>}
      <p>Visites de la branche : {view.visits}</p>
      <h4>Déroulé de la mission (« Le silence d’Asphodèle », proposée)</h4>
      <ul>
        {TANTALUS_BEATS_V164.map(b => (
          <li key={b.id} className={b.status === 'non_implemente' ? styles.todo : undefined} data-beat-status={b.status}>
            {b.label} — {b.status === 'implemente' ? 'jouable' : 'non implémenté'}
          </li>
        ))}
      </ul>
    </section>
  );
}
