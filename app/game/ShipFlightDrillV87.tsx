"use client";

/* eslint-disable @next/next/no-img-element -- reuse the ship's existing bitmap */
import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import { shipTopAssetPath, type ShipId } from './shipCatalogue';
import { createShipFlightV87, normalizeShipFlightV87, resolveShipFlightKeyboardV87, SHIP_FLIGHT_KEYBOARD_HELP_V87, SHIP_FLIGHT_SOURCE_V87, stepShipFlightV87,
  type ShipFlightActionV87, type ShipFlightResultV87, type ShipFlightRouteV87, type ShipFlightStateV87 } from './systems/shipFlightV87';
import styles from './ShipFlightDrillV87.module.css';

export interface ShipFlightControlledV87 {
  state: ShipFlightStateV87; route: ShipFlightRouteV87;
  /** The owning controller rechecks focus, owner, resource reservation and
   * physical post; only a successful durable write may return a new state. */
  onAction: (action: ShipFlightActionV87) => ShipFlightResultV87;
}
interface Props {
  ownerSaveCreatedAt: string; shipId: ShipId; suspended?: boolean;
  onActiveChange?: (active: boolean) => void; controlled?: ShipFlightControlledV87;
}
const practiceRoute: ShipFlightRouteV87 = { originId: 'Quai-école', relayId: 'Balise du couloir-école', destinationId: 'Quai d’exercice' };
const phaseNames = { alignment: 'Alignement latéral', approach: 'Vitesse de fermeture', locks: 'Deux attaches et bague', berthed: 'Destination arrimée',
  'return-route': 'Route de retour continue', 'return-alignment': 'Alignement du retour', 'return-approach': 'Approche du quai d’origine', 'return-locks': 'Verrouillage au retour', returned: 'Retour arrimé' };
const sourceId = { alignment: 'FLIGHT5-01', approach: 'FLIGHT5-02', locks: 'FLIGHT5-03', berthed: 'FLIGHT5-03', 'return-route': 'FLIGHT5-11',
  'return-alignment': 'FLIGHT5-01', 'return-approach': 'FLIGHT5-02', 'return-locks': 'FLIGHT5-03', returned: 'FLIGHT5-03' };

/** Real input-driven movement and clamps, in a clearly separate practice
 * chamber. Static hull artwork is translated, never declared an animation
 * sheet or a canon-certified model. No localStorage or campaign write here. */
export default function ShipFlightDrillV87({ ownerSaveCreatedAt, shipId, suspended = false, onActiveChange, controlled }: Props) {
  const [expanded, setExpanded] = useState(false);
  const [practice, setPractice] = useState(() => createShipFlightV87(ownerSaveCreatedAt, 'free-flight-v87-1'));
  const [message, setMessage] = useState('Superposez les deux balises du couloir puis maintenez l’alignement.');
  const runCounter = useRef(1), root = useRef<HTMLElement>(null);
  const candidate = controlled?.state ?? practice, route = controlled?.route ?? practiceRoute;
  const valid = normalizeShipFlightV87(candidate, ownerSaveCreatedAt);
  // A refused controlled record stays untouched. The harmless practice state
  // only supplies display values to the inert error view, never a replacement.
  const current = valid ?? practice;
  const keyboardHelpId = `ship-flight-help-${ownerSaveCreatedAt}-${current.operationId}`.replace(/[^a-zA-Z0-9_-]/g, '-');
  const paused = suspended || !valid;
  useEffect(() => { onActiveChange?.(expanded); return () => onActiveChange?.(false); }, [expanded, onActiveChange]);
  const act = (action: ShipFlightActionV87) => {
    if (paused || !document.hasFocus() || document.hidden || !root.current?.contains(document.activeElement)) return;
    const result = controlled ? controlled.onAction(action) : stepShipFlightV87(practice, action, route);
    if (result.accepted && result.changed && !controlled) setPractice(result.state);
    setMessage(result.message);
  };
  const pilotKeyboard = (event: KeyboardEvent<HTMLDivElement>) => {
    const input = { key: event.key, open: expanded, paused,
      checkpointValid: Boolean(valid), documentFocused: document.hasFocus(), documentVisible: !document.hidden,
      consoleFocused: document.activeElement === event.currentTarget, targetIsConsole: event.target === event.currentTarget,
      repeat: event.repeat, modified: event.altKey || event.ctrlKey || event.metaKey || event.shiftKey, defaultPrevented: event.defaultPrevented };
    const action = resolveShipFlightKeyboardV87(current.phase, input);
    if (!action) {
      // An owned repeated arrow must neither add another cran nor scroll the
      // page. Repeats outside this exact console still keep native behavior.
      if (event.repeat && resolveShipFlightKeyboardV87(current.phase, { ...input, repeat: false })) { event.preventDefault(); event.stopPropagation(); }
      return;
    }
    event.preventDefault(); event.stopPropagation(); act(action);
  };
  const alignPhase = current.phase === 'alignment' || current.phase === 'return-alignment';
  const approachPhase = current.phase === 'approach' || current.phase === 'return-approach';
  const lockPhase = current.phase === 'locks' || current.phase === 'return-locks';
  const target = current.phase.startsWith('return-') || current.phase === 'returned' ? route.originId : route.destinationId;
  const x = 125 + current.lateral * 15, y = 195 - (100 - current.distance) * 1.03;
  const sourceRow = SHIP_FLIGHT_SOURCE_V87.sheets[0].rows.find(row => row.cells[0].value === sourceId[current.phase]);
  const sourceGesture = String(sourceRow?.cells.find(cell => cell.address.startsWith('D'))?.value ?? '');
  return <details className={styles.drill} onToggle={event => setExpanded(event.currentTarget.open)} onKeyDown={event => event.stopPropagation()}>
    <summary>{controlled ? 'Poste de manœuvre du trajet réservé' : 'Manœuvres spatiales · exercice V5 jouable'}</summary>
    <section ref={root} aria-label="Poste de manœuvre spatiale">
      {!controlled && <p className={styles.notice}>Exercice libre en mémoire. Les deux quais et la balise sont un dispositif d’école : aucun voyage de campagne, acquisition, carburant, équipage ou récompense. Quitter ce panneau ne valide aucun rite.</p>}
      {!valid && <p role="alert">Ce checkpoint ne correspond pas à cette partie, ou son format n’est pas pris en charge. Il n’est pas remplacé.</p>}
      <h4>{phaseNames[current.phase]} · {sourceId[current.phase]}</h4>
      <p>{sourceGesture}</p>
      <p id={keyboardHelpId} className={styles.keyboardHelp}>Cliquez sur le poste ou rejoignez-le avec Tab pour piloter au clavier. {SHIP_FLIGHT_KEYBOARD_HELP_V87[current.phase]} Hors du poste, les boutons et listes gardent leurs commandes habituelles.</p>
      <div className={styles.console} role="group" tabIndex={paused ? -1 : 0} aria-disabled={paused} aria-describedby={keyboardHelpId}
        onKeyDown={pilotKeyboard} onPointerDown={event => { if (!paused) event.currentTarget.focus({ preventScroll: true }); }}
        aria-label={`Console de manœuvre vers ${target}. Décalage ${current.lateral}, distance ${current.distance}, vitesse ${current.speed}. Attaches ${current.locks.filter(Boolean).length} sur 2. Bague ${current.ring} sur 2.`}>
        <div className={styles.quay}><span>{target}</span><i data-lit={current.locks[0]} /><i data-lit={current.locks[1]} /></div>
        <div className={styles.corridor} /><div className={styles.targetBeacon} /><div className={styles.hullBeacon} style={{ left: `${x / 3}%`, top: `${y}px` }} />
        <img className={styles.hull} src={shipTopAssetPath(shipId)} alt="Coque utilisée comme repère d’exercice" draggable={false} style={{ left: `${x / 3}%`, top: `${y + 10}px` }} />
        <div className={styles.telemetry}><span>ÉCART {current.lateral}</span><span>DISTANCE {current.distance}</span><span>VITESSE {current.speed}</span><span>BAGUE {current.ring}/2</span></div>
      </div>
      <div className={styles.controls}>
        {alignPhase && <><button type="button" disabled={paused} onClick={() => act({ type: 'lateral', direction: -1 })}>Décaler à gauche</button><button type="button" disabled={paused} onClick={() => act({ type: 'lateral', direction: 1 })}>Décaler à droite</button><button type="button" disabled={paused} onClick={() => act({ type: 'align' })}>Maintenir l’alignement</button></>}
        {approachPhase && <><button type="button" disabled={paused} onClick={() => act({ type: 'speed', direction: -1 })}>Freiner d’un cran</button><button type="button" disabled={paused} onClick={() => act({ type: 'speed', direction: 1 })}>Propulsion d’un cran</button><button type="button" disabled={paused} onClick={() => act({ type: 'advance' })}>Avancer dans le couloir</button><button type="button" disabled={paused} onClick={() => act({ type: 'retreat' })}>Reculer au point sûr</button></>}
        {lockPhase && <><button type="button" disabled={paused} aria-pressed={current.locks[0]} onClick={() => act({ type: 'lock', index: 0 })}>Attache gauche</button><button type="button" disabled={paused} aria-pressed={current.locks[1]} onClick={() => act({ type: 'lock', index: 1 })}>Attache droite</button><button type="button" disabled={paused} onClick={() => act({ type: 'ring', direction: 1 })}>Tourner la bague d’un cran</button><button type="button" disabled={paused} onClick={() => act({ type: 'ring', direction: -1 })}>Desserrer la bague d’un cran</button><button type="button" disabled={paused} onClick={() => act({ type: 'berth' })}>Confirmer l’arrimage</button></>}
        {current.phase === 'berthed' && <button type="button" disabled={paused} onClick={() => act({ type: 'return-route' })}>{controlled ? 'Préparer la route de retour' : 'Jouer le retour de l’exercice'}</button>}
      </div>
      {current.phase === 'return-route' && <fieldset className={styles.route} disabled={paused}><legend>Du site actuel au relais, puis au quai d’origine</legend>
        {current.route.map((node, slot) => <label key={slot}>Plaque {slot + 1}<select disabled={paused} value={node} onChange={event => act({ type: 'route', slot: slot as 0 | 1 | 2, node: event.currentTarget.value })}><option value="">Liaison manquante</option>{Object.values(route).map(value => <option key={value} value={value}>{value}</option>)}</select></label>)}
        <button type="button" disabled={paused} onClick={() => act({ type: 'confirm-route' })}>Confirmer la route continue</button></fieldset>}
      <p role="status" className={styles.status}>{suspended ? 'Commandes suspendues. La manœuvre et son dernier point restent conservés ; reprenez les commandes pour continuer.' : message}</p>
      <p>{current.sourceReceipts.length}/7 gestes source enregistrés dans {controlled ? 'ce trajet' : 'cet exercice'} · {current.setbacks} recul(s) après fermeture trop rapide.</p>
      {current.phase === 'returned' && <p>{controlled ? 'Arrimage terminé. Le contrôleur doit encore consigner les dispositions réellement observées de chaque voyageur et objet.' : 'Aller et retour joués. Aucun rapport de mission, soin, recrutement ou nouveau bien n’est créé.'}</p>}
      {!controlled && <button type="button" disabled={paused} onClick={() => { if (paused) return; runCounter.current++; setPractice(createShipFlightV87(ownerSaveCreatedAt, `free-flight-v87-${runCounter.current}`)); setMessage('Nouvel exercice séparé : alignez les balises.'); }}>Recommencer un exercice séparé</button>}
      <small>Source V6 : V5 Manœuvres spatiales!A6:L8 et A16:L16. Crans et confirmation simples prévus par K6:K8 ; distances et seuils adaptés au jeu, sans chiffres canoniques inventés. Pas de clip de voix disponible.</small>
    </section>
  </details>;
}
