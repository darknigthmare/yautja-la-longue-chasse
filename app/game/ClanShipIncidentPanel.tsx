"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { CLAN_SHIP_INTERIOR_ROOMS } from './systems/clanShipInterior';
import { CLAN_SHIP_RECRUITS } from './systems/clanShipOperations';
import {
  clanShipIncident, clanShipIncidentTarget, getClanShipIncidentStep,
  type ClanShipIncidentAction, type ClanShipIncidentsState, type ClanShipIncidentTarget,
} from './systems/clanShipIncidents';
import { useMenuGamepad } from './useMenuGamepad';
import styles from './ClanShipIncidentPanel.module.css';

interface Props {
  target: ClanShipIncidentTarget;
  state: ClanShipIncidentsState;
  suspended: boolean;
  escortReady: boolean;
  onAction: (action: ClanShipIncidentAction) => boolean;
  onClose: () => void;
  onNavigate: (target: ClanShipIncidentTarget) => void;
}

/** The object panel owns no progression. Its buttons submit the currently
 * observed revision; the interior supplies fresh physical feet positions. */
export default function ClanShipIncidentPanel({ target, state, suspended, escortReady, onAction, onClose, onNavigate }: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [feedback, setFeedback] = useState('');
  const definition = clanShipIncident(target.incidentId)!;
  const active = state.activeIncident?.incidentId === definition.id ? state.activeIncident : null;
  const receipt = state.completedIncidents.find(entry => entry.incidentId === definition.id);
  const step = active ? getClanShipIncidentStep(state) : null;
  const nextTarget = step ? clanShipIncidentTarget(step.targetId) : null;
  const here = step?.targetId === target.id;
  const evidence = definition.steps.slice(0, receipt ? definition.steps.length : active?.stepIndex ?? 0);
  const rejection = active?.lastRejectedChoice && active.lastRejectedChoice.stepId === step?.id ? step.rejection : null;
  const speaker = CLAN_SHIP_RECRUITS.find(npc => npc.id === (target.id === 'provenance-veteran' ? 'ash-scar' : definition.sourceNpcId));

  useMenuGamepad(rootRef, !suspended, `clan-ship-incident-${target.id}`, onClose);
  useEffect(() => {
    const frame = requestAnimationFrame(() => closeRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [target.id]);

  const act = (action: ClanShipIncidentAction) => {
    if (suspended) return;
    const accepted = onAction(action);
    setFeedback(accepted ? '' : 'L’étape n’a pas été enregistrée. Tes indices restent disponibles ; ferme ce panneau pour reprendre l’approche ou réessaie après le message de sauvegarde.');
  };
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.defaultPrevented || suspended) return;
    if (event.key === 'Escape' && !event.repeat) { event.preventDefault(); event.stopPropagation(); onClose(); return; }
    if (event.key !== 'Tab') return;
    const controls = Array.from(rootRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],[tabindex="0"]') ?? [])
      .filter(element => !element.closest('[inert],[hidden]') && element.getClientRects().length > 0);
    const first = controls[0], last = controls.at(-1);
    if (event.shiftKey && document.activeElement === first && last) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last && first) { event.preventDefault(); first.focus(); }
  };

  return <div className={styles.backdrop}>
    <section ref={rootRef} className={styles.panel} role="dialog" aria-modal="true"
      aria-labelledby="clan-incident-title" onKeyDown={onKeyDown} inert={suspended}
      data-clan-incident-panel data-clan-incident-panel-target={target.id} data-clan-incident-revision={state.revision}
      data-clan-incident-step={step?.id ?? ''} data-clan-incident-completed={!!receipt}>
      <header className={styles.header}>
        <div><span className={styles.eyebrow}>INTERVENTION DU BORD · {CLAN_SHIP_INTERIOR_ROOMS[target.roomId].label}</span>
          <h2 id="clan-incident-title">{target.label}</h2><p>{definition.name}</p></div>
        <button ref={closeRef} type="button" className={styles.close} data-clan-incident-close disabled={suspended} onClick={onClose}>Retour au pont <span aria-hidden="true">×</span></button>
      </header>
      <div className={styles.content}>
        <section className={styles.workbench}>
          <span className={styles.eyebrow}>{speaker?.name ?? 'Relevé du bord'}</span>
          <p className={styles.objectDescription}>{target.description}</p>
          {definition.id === 'relay-flicker' && target.id === 'relay-console' && evidence.length > 0 && <div className={styles.relayReadout} aria-label="Relevé écrit des cycles du relais">
            <div><strong>A</strong><span aria-hidden="true">▰ ▰ ─</span><p>Deux impulsions, pause · repère stable</p></div>
            <div data-relay-restored={!!receipt}><strong>B</strong><span aria-hidden="true">{receipt ? '▰ ▰ ─' : '▰ ─ ─'}</span><p>{receipt ? 'Deux impulsions, pause · test stable' : active && active.stepIndex >= 3 ? 'Branche isolée · contrôle final attendu' : 'Une impulsion, pause · coupure signalée'}</p></div>
          </div>}

          {receipt ? <article className={styles.resolved} data-clan-incident-resolution>
            <span className={styles.eyebrow}>INTERVENTION CONSIGNÉE</span><h3>Le dossier est résolu.</h3>
            <p>{definition.completion}</p><strong>{definition.clanMarksReward} marques de clan attribuées à cette résolution.</strong>
          </article> : here && step ? <article className={styles.action}>
            <span className={styles.progress}>ÉTAPE {(active?.stepIndex ?? 0) + 1} / {definition.steps.length}</span>
            <h3>{step.label}</h3><p>{step.description}</p>
            {rejection && <p className={styles.rejection} role="status" data-clan-incident-rejection>{rejection}</p>}
            {step.kind === 'choice' ? <div className={styles.choices} aria-label={step.label}>
              {step.choices?.map(choice => <button key={choice.id} type="button" disabled={suspended}
                data-clan-incident-choice={choice.id} data-clan-incident-choice-step={step.id}
                data-previous-choice={active?.lastRejectedChoice?.choiceId === choice.id || undefined}
                onClick={() => act({ type: 'choose', targetId: target.id, choiceId: choice.id, expectedRevision: state.revision })}>
                <strong>{choice.label}</strong><span>{choice.description}</span>
              </button>)}
            </div> : <>
              {step.kind === 'escort-checkpoint' && !escortReady && <p className={styles.notice}>Le membre accompagné doit aussi atteindre ce point. Reprends la marche, puis attends son arrivée avant de confirmer.</p>}
              <button type="button" className={styles.primary} disabled={suspended || (step.kind === 'escort-checkpoint' && !escortReady)}
                data-clan-incident-interact={step.id} onClick={() => act(step.kind === 'escort-checkpoint'
                  ? { type: 'escort-checkpoint', checkpointId: step.id, expectedRevision: state.revision }
                  : { type: 'interact', targetId: target.id, expectedRevision: state.revision })}>{step.label}</button>
              {step.kind === 'escort-checkpoint' && !escortReady && <button type="button" className={styles.secondary} disabled={suspended} onClick={onClose}>Reprendre l’accompagnement</button>}
            </>}
          </article> : nextTarget && step ? <article className={styles.action}>
            <span className={styles.progress}>PROCHAIN RELEVÉ · ÉTAPE {(active?.stepIndex ?? 0) + 1} / {definition.steps.length}</span>
            <h3>{step.label}</h3><p>{step.description}</p>
            <p className={styles.location}>{CLAN_SHIP_INTERIOR_ROOMS[nextTarget.roomId].label} · {nextTarget.label}</p>
            <button type="button" className={styles.primary} disabled={suspended} data-clan-incident-next-target={nextTarget.id}
              onClick={() => onNavigate(nextTarget)}>Rejoindre le prochain point</button>
          </article> : <p className={styles.notice}>Ce dossier n’est plus actif. Les opérations disponibles restent à la table du conseil.</p>}
        </section>
        <aside className={styles.evidence} aria-labelledby="clan-incident-evidence-title">
          <span className={styles.eyebrow}>RELEVÉS CONSERVÉS</span><h3 id="clan-incident-evidence-title">Les indices du dossier</h3>
          {evidence.length ? <ol>{evidence.map((entry, index) => <li key={entry.id} data-clan-incident-evidence={entry.id}>
            <span>{String(index + 1).padStart(2, '0')}</span><div><strong>{entry.label}</strong><p>{entry.evidence}</p></div>
          </li>)}</ol> : <p>Approche l’objet et effectue le premier relevé. Les indices apparaîtront ici au fur et à mesure.</p>}
        </aside>
      </div>
      <footer className={styles.footer}><p role="status" aria-live="polite">{feedback || (definition.id === 'return-transfer'
        ? 'Le groupe reprend au dernier point sûr enregistré. Fermer le panneau permet au membre accompagné de marcher.'
        : 'Les relevés acquis restent disponibles après fermeture ou reprise du dossier.')}</p><span>Échap · Retour</span></footer>
    </section>
  </div>;
}
