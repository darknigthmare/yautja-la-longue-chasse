"use client";

import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react';
import type { SaveGame } from './types';
import type { HomeworldVec2 } from './systems/homeworldCity';
import { createHomeworldGamepadState, nextHomeworldDialogChoice, stepHomeworldGamepad } from './systems/homeworldInput';
import { homeworldWayfindingDestinationsV75, homeworldWayfindingGuidanceV75, homeworldWayfindingMetresV75,
  homeworldWayfindingPlanV75, homeworldWayfindingRecommendedV75, homeworldWayfindingSearchV75,
  type HomeworldWayfindingCategoryV75, type HomeworldWayfindingPlanV75 } from './systems/homeworldWayfindingV75';
import styles from './HomeworldWayfindingV75.module.css';

export interface HomeworldWayfindingV75Props {
  save: SaveGame; actor: HomeworldVec2; interiorId: string | null; open: boolean;
  disabled?: boolean; suspended?: boolean; showToggle?: boolean; interactionShortcut?: string;
  targetRequest?: { id: string; nonce: number } | null;
  onOpenChange(open: boolean): void;
}
const categories: readonly [HomeworldWayfindingCategoryV75 | 'all', string][] = [
  ['all', 'Tous'], ['services', 'Services'], ['people', 'Interlocuteurs'], ['evidence', 'Dossier'],
  ['buildings', 'Bâtiments'], ['regions', 'Sorties'], ['transport', 'Quais'],
];

/** Read-only finder and held walking guidance. The host owns modal pause/input
 * clearing/focus restoration; this component never moves an actor or saves. */
export default function HomeworldWayfindingV75({ save, actor, interiorId, open, disabled = false, suspended = false,
  showToggle = false, interactionShortcut = 'E / A', targetRequest, onOpenChange }: HomeworldWayfindingV75Props) {
  const destinations = useMemo(() => homeworldWayfindingDestinationsV75(save), [save]);
  const recommended = useMemo(() => homeworldWayfindingRecommendedV75(save), [save]);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<HomeworldWayfindingCategoryV75 | 'all'>('all');
  const [selectedId, setSelectedId] = useState(recommended);
  const [plan, setPlan] = useState<HomeworldWayfindingPlanV75 | null>(null);
  const [navigationActor, setNavigationActor] = useState(actor);
  const [notice, setNotice] = useState('');
  const modalRef = useRef<HTMLDivElement>(null), searchRef = useRef<HTMLInputElement>(null);
  const live = useRef({ actor, save, interiorId, onOpenChange });
  useLayoutEffect(() => { live.current = { actor, save, interiorId, onOpenChange }; }, [actor, save, interiorId, onOpenChange]);
  const processedRequest = useRef<number | null>(null);
  const plannedSpace = useRef(interiorId);
  const planningRevision = useRef(0);
  const filtered = useMemo(() => homeworldWayfindingSearchV75(destinations, query, category), [destinations, query, category]);
  // A category/search must not leave an unrelated old destination actionable.
  // With no results, no detail or follow button is shown.
  const selected = filtered.find(d => d.id === selectedId) ?? filtered[0];
  // Permission is derived in this render: a changed/hidden destination must
  // disappear immediately, without waiting for the scheduled cleanup below.
  const target = plan && destinations.find(d => d.id === plan.destinationId && d.canGuide);
  const guidance = useMemo(() => plan && homeworldWayfindingGuidanceV75(plan, navigationActor, interiorId), [plan, navigationActor, interiorId]);

  const prepare = useCallback((id: string) => {
    const current = live.current;
    const next = homeworldWayfindingPlanV75(current.save, current.actor, current.interiorId, id);
    planningRevision.current++;
    plannedSpace.current = current.interiorId; setPlan(next); setNavigationActor(current.actor);
    setNotice(next.status === 'reachable' ? 'Itinéraire à pied préparé. Aucun déplacement automatique.' : next.reason);
    return next;
  }, []);

  useEffect(() => {
    if (open) searchRef.current?.focus({ preventScroll: true });
  }, [open]);
  useEffect(() => {
    // The host can clear a request on a physical regional return, then start a
    // fresh nonce sequence. Do not confuse that new advice with an old nonce.
    if (!targetRequest) { processedRequest.current = null; return; }
    if (processedRequest.current === targetRequest.nonce || disabled || suspended) return;
    const frame = window.requestAnimationFrame(() => {
      processedRequest.current = targetRequest.nonce;
      const current = live.current;
      const allowed = homeworldWayfindingDestinationsV75(current.save).find(d => d.id === targetRequest.id);
      if (!allowed) { planningRevision.current++; setNotice('Ce conseil ne correspond pas à un repère accessible de ta partie.'); setPlan(null); return; }
      // A newly requested landmark must be visible even after an older query or
      // category. This only changes the finder, never a destination permission.
      setCategory('all'); setQuery(''); setSelectedId(allowed.id); prepare(allowed.id);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [targetRequest, disabled, suspended, prepare]);
  useEffect(() => {
    if (!plan) return;
    const currentTarget = destinations.find(d => d.id === plan.destinationId);
    if (currentTarget?.canGuide && plannedSpace.current === interiorId) return;
    const revision = planningRevision.current;
    const frame = window.requestAnimationFrame(() => {
      // An explicit newer selection takes precedence over an old transition.
      if (planningRevision.current !== revision) return;
      if (!currentTarget?.canGuide) { planningRevision.current++; setPlan(null); setNotice('Le repère a changé de disponibilité. Consulte les conditions de ta partie.'); return; }
      prepare(plan.destinationId);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [interiorId, destinations, plan, prepare]);
  useEffect(() => {
    if (!plan || open || suspended) return;
    // Only read the actual actor. Expensive A*/BFS never runs on this UI poll.
    const frame = window.requestAnimationFrame(() => setNavigationActor(live.current.actor));
    const timer = window.setInterval(() => setNavigationActor(live.current.actor), 350);
    return () => { window.cancelAnimationFrame(frame); window.clearInterval(timer); };
  }, [plan, open, suspended]);
  useEffect(() => {
    if (!open || suspended) return;
    let padState = createHomeworldGamepadState();
    const timer = window.setInterval(() => {
      const active = !document.hidden && document.hasFocus() && !!modalRef.current?.contains(document.activeElement);
      const pad = active ? [...(navigator.getGamepads?.() ?? [])].find(p => p?.connected) ?? null : null;
      const input = stepHomeworldGamepad(padState, pad, active ? 'dialog' : 'inactive'); padState = input.state;
      if (!active) return;
      if (input.actions.cancel || input.actions.pause) { live.current.onOpenChange(false); return; }
      const options = [...(modalRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled)') ?? [])];
      if (input.actions.menuDirection && options.length) options[nextHomeworldDialogChoice(options.indexOf(document.activeElement as HTMLElement), options.length, input.actions.menuDirection)]?.focus();
      if (input.actions.confirm) options.find(option => option === document.activeElement)?.click();
    }, 50);
    return () => window.clearInterval(timer);
  }, [open, suspended]);

  const keys = (event: KeyboardEvent<HTMLDivElement>) => {
    event.stopPropagation();
    if (event.code === 'Escape') { event.preventDefault(); onOpenChange(false); return; }
    if (event.key !== 'Tab') return;
    const options = [...(modalRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled),select:not(:disabled),[tabindex="0"]') ?? [])];
    const first = options[0], last = options.at(-1);
    if (event.shiftKey && (document.activeElement === first || document.activeElement === modalRef.current)) { event.preventDefault(); last?.focus(); }
    else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
  };
  const choose = (id: string) => { setSelectedId(id); setNotice(''); };
  const prepareSelected = () => { if (selected) { const next = prepare(selected.id); if (next.status === 'reachable') onOpenChange(false); } };

  return <div className={styles.root} data-homeworld-wayfinding-v75="true">
    {showToggle && <button className={styles.toggle} type="button" disabled={disabled} aria-haspopup="dialog" aria-expanded={open} onClick={() => onOpenChange(true)}>Repères · services et sorties</button>}
    {!open && target && guidance && <section className={styles.guide} aria-label="Repère à suivre à pied" data-homeworld-wayfinding-guide={guidance.state} data-wayfinding-target={target.id} data-wayfinding-paused={suspended}>
      <div><small>{suspended ? 'Repère suspendu' : target.detail}</small><strong>{target.label}</strong></div>
      <p><b>{guidance.direction}</b>{guidance.state !== 'off-route' && <span> · {homeworldWayfindingMetresV75(guidance.remaining)} m à pied</span>}</p>
      <p className={styles.guideInstruction}>{guidance.instruction} {guidance.state === 'arrived' && <kbd>{interactionShortcut}</kbd>}</p>
      {guidance.state === 'arrived' && <p className={styles.compactInstruction}><kbd>{interactionShortcut}</kbd> {interiorId && interiorId !== target.buildingId ? 'Sortir au seuil' : !interiorId && target.buildingId ? 'Entrer par la porte' : target.category === 'regions' ? 'Demander le passage' : 'Interagir sur place'}</p>}
      {target.access === 'restricted' && <small>Lieu visitable · activité réservée</small>}
      <div className={styles.guideActions}><button type="button" disabled={suspended || disabled} onClick={() => prepare(target.id)}>Recalculer</button>
        <button type="button" disabled={suspended || disabled} onClick={() => onOpenChange(true)}>Changer</button>
        <button type="button" aria-label="Effacer le repère" disabled={suspended || disabled} onClick={() => { setPlan(null); setNotice('Repère effacé.'); }}>×</button></div>
    </section>}
    {!open && notice && !target && <p className={styles.notice} role="status">{notice}</p>}
    {open && <div className={styles.scrim} onPointerDown={event => event.stopPropagation()}>
      <div ref={modalRef} className={styles.dialog} role="dialog" aria-modal="true" aria-labelledby="homeworld-wayfinding-title-v75" tabIndex={-1} onKeyDown={keys} onKeyUp={event => event.stopPropagation()}>
        <header><div><small>REGISTRE DU CLAN · MARCHE DANS LA CITÉ</small><h2 id="homeworld-wayfinding-title-v75">Repères pratiques</h2></div>
          <button type="button" onClick={() => onOpenChange(false)}>Fermer · Échap</button></header>
        <p className={styles.intro}>Trouve une porte, un interlocuteur ou une sortie. Le guide respecte les murs et le mobilier ; il ne téléporte pas et ne déverrouille aucune activité.</p>
        <div className={styles.searchRow}><label>Rechercher<input ref={searchRef} type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="Maître, soins, mémoire, quartier…" /></label>
          <button type="button" onClick={() => { setCategory('all'); setQuery(''); choose(recommended); }}>Objectif actuel</button></div>
        <div className={styles.categories} role="group" aria-label="Type de repère">{categories.map(([id, label]) => <button key={id} type="button" aria-pressed={category === id} onClick={() => setCategory(id)}>{label}</button>)}</div>
        <div className={styles.body}>
          <nav className={styles.list} aria-label="Destinations physiques"><p>{filtered.length} repère(s) visibles</p>
            {filtered.map(destination => <button key={destination.id} type="button" data-wayfinding-destination={destination.id} aria-pressed={selected?.id === destination.id} onClick={() => choose(destination.id)}>
              <strong>{destination.label}</strong><span>{destination.district} · {destination.detail}</span>
              <small data-wayfinding-access={destination.access}>{destination.access === 'locked' ? 'Départ fermé' : destination.access === 'restricted' ? 'Lieu ouvert · activité réservée' : 'Ouvert'}</small>
            </button>)}
            {!filtered.length && <p>Aucun résultat dans les repères actuellement visibles. Essaie le nom d’un service ou d’un quartier.</p>}</nav>
          {selected && <section className={styles.detail} aria-label="Destination choisie" data-wayfinding-detail={selected.id}>
            <small>{selected.district}</small><h3>{selected.label}</h3><p>{selected.detail}</p>
            <p className={styles.access} data-wayfinding-selected-access={selected.access}>{selected.reason}</p>
            <p>{selected.buildingId ? 'Le chemin mène à la vraie porte, puis au poste intérieur si nécessaire. Change de pièce uniquement avec Interagir sur place.' : selected.category === 'regions' ? 'Le repère s’arrête au seuil physique de la cité. Le territoire suivant se parcourt dans son espace ; une consultation ne vaut pas autorisation.' : 'Le poste se trouve dans la rue. Il faut l’approcher et interagir pour consulter son service.'}</p>
            <button className={styles.primary} type="button" disabled={disabled || suspended || !selected.canGuide} onClick={prepareSelected}>Suivre à pied ce repère</button>
            {notice && <p role="status" data-wayfinding-plan-status={plan?.status}>{notice}</p>}
            {plan?.destinationId === selected.id && plan.status === 'reachable' && <p>{homeworldWayfindingMetresV75(plan.distance)} m de marche calculée · {plan.stages.length} étape(s) physique(s).</p>}
            <p className={styles.lore}>Plan et institutions : adaptation originale de ce jeu. Une destination sensible reste masquée tant que son autorisation manque. L’Atlas conserve le plan des quartiers et le codex détaillé.</p>
          </section>}
        </div>
        <footer>Flèches/stick pour marcher · {interactionShortcut} pour interagir sur place · Échap/B pour fermer. Un repère ne remplace jamais une preuve ou une sauvegarde.</footer>
      </div>
    </div>}
  </div>;
}
