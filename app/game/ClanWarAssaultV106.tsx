"use client";

import { useRef, useState } from 'react';
import type { WarSimulationV85 } from './systems/clanWarV85';
import type { WarOrderDraftV98 } from './systems/clanWarCommandV98';
import { prepareWarAssaultV106, warAssaultPlanIssueV106, warAssaultViewV106, type WarAssaultPlanV106 } from './systems/clanWarAssaultV106';
import styles from './ClanWarAssaultV106.module.css';

const stock = (value: { s: number; m: number; i: number }) => `S${value.s} · M${value.m} · I${value.i}`;
const short = (id: string) => id.replace('CON-', '');

/** Public knowledge is the same in the live summary and the frozen review. */
export default function ClanWarAssaultV106({ simulation, draft, disabled, onReserve, onRecon }: {
  simulation: WarSimulationV85; draft: WarOrderDraftV98; disabled: boolean;
  onReserve: (plan: WarAssaultPlanV106) => boolean;
  onRecon: () => void;
}) {
  const root = useRef<HTMLElement>(null);
  const [plan, setPlan] = useState<WarAssaultPlanV106 | null>(null);
  const current = warAssaultViewV106(simulation, draft);
  const issue = plan ? warAssaultPlanIssueV106(simulation, draft, plan) : null;
  const view = plan?.view ?? current;
  const returnFocus = () => root.current?.focus({ preventScroll: true });
  return <section ref={root} tabIndex={-1} className={styles.assault} aria-label="Préparer un assaut" data-testid="war-assault-v106" data-prepared={!!plan} data-stale={!!issue}>
    <header><p>ÉTUDE DU FRONT</p><h5>{short(view.fromId)} → {short(view.targetId)}</h5><span>Tour {view.turn}</span></header>
    <p><strong>{view.people.length} personne{view.people.length > 1 ? 's' : ''} affectée{view.people.length > 1 ? 's' : ''}</strong>{view.people.length > 0 && ` · ${view.people.map(actor => actor.id).join(', ')}`}</p>
    <p>Réservation au départ : {stock(view.cost)}.{view.after && ` Encore disponible après cette réservation : ${stock(view.after)}.`}</p>
    <div className={styles.intel} data-known={view.intel.kind}>
      <strong>{view.intel.label}</strong>
      {view.assumptions ? <>
        <p>Scénario établi d’après le rapport du tour {view.assumptions.observedTurn}. {view.assumptions.stale ? 'Ce renseignement est ancien : une nouvelle reconnaissance est recommandée.' : 'Même récent, ce rapport décrit la date d’observation.'}</p>
        {view.losses && <p data-testid="war-assault-losses-v106">Si {view.assumptions.lower}–{view.assumptions.upper} adversaires sont encore présents : <strong>{view.losses.lower}–{view.losses.upper} personne{view.losses.upper > 1 ? 's' : ''} indisponible{view.losses.upper > 1 ? 's' : ''}</strong> parmi votre détachement dans le modèle d’assaut isolé. {view.losses.wins === view.losses.cases ? 'Les cas étudiés permettent de tenir le terrain.' : view.losses.wins === 0 ? 'Les cas étudiés conduisent au repli.' : 'Les cas étudiés permettent une victoire ou un repli.'}</p>}
      </> : <p>Aucun effectif adverse n’est connu. Le calcul ne remplace pas une reconnaissance.</p>}
      <p className={styles.warning}>La force actuelle peut avoir changé : jusqu’à {view.currentLossExposure.upper} de vos personnes peuvent devenir indisponibles. Les mouvements adverses, rencontres sur route et autres ordres du tour ne sont pas prédits.</p>
    </div>
    <dl>
      <div><dt>Liaison du départ</dt><dd>{view.suppliedOrigin ? 'Ouverte à cet instant' : 'Absente : occupation impossible sans liaison'}</dd></div>
      <div><dt>Garde si toute la colonne part</dt><dd>{view.guardsRemainingIfAllDepart.length ? view.guardsRemainingIfAllDepart.join(', ') : 'Aucune garde restante au départ'}</dd></div>
    </dl>
    <p>Une victoire ne paie aucun revenu immédiat. L’occupation exige encore accès, survivant en garde et contrôle réel à la résolution.</p>
    {plan ? <div className={styles.review} aria-live="polite">
      <strong>Aperçu figé · tour {plan.view.turn}</strong>
      <p>{issue ?? 'Détachement, départ, cible et réservations identiques. Confirmez pour sceller l’ordre ; cela n’avance pas le tour.'}</p>
      <div className={styles.actions}>
        <button type="button" disabled={disabled || !!issue} onClick={() => { returnFocus(); if (onReserve(plan)) setPlan(null); }}>Confirmer l’assaut</button>
        {issue && <button type="button" disabled={disabled || !!current.issue} onClick={() => { returnFocus(); setPlan(prepareWarAssaultV106(simulation, draft)); }}>Actualiser l’aperçu</button>}
        <button type="button" onClick={() => { returnFocus(); setPlan(null); }}>Annuler la préparation</button>
      </div>
    </div> : <div className={styles.actions}>
      <button type="button" data-war-reserve-order-v100 disabled={disabled || !!current.issue} onClick={() => { returnFocus(); setPlan(prepareWarAssaultV106(simulation, draft)); }}>Étudier l’assaut</button>
      <button type="button" disabled={disabled} onClick={onRecon}>Préparer une reconnaissance</button>
    </div>}
    <small>Les scénarios décrivent le modèle actuel de l’exercice libre, pas une probabilité de victoire ni un résultat déjà acquis. Un aperçu annulé ne réserve ni stock ni personne.</small>
  </section>;
}
