'use client';

import { useId, useMemo, useRef, useState } from 'react';
import {
  clanShipRelayDiagnosticMatches, readClanShipRelayDiagnostic,
  type ClanShipMaintenanceCampaign,
} from './systems/clanShipMaintenanceDiagnostics';
import {
  CLAN_SHIP_SPACE_CREW_EFFECTS,
  CLAN_SHIP_SPACE_MAX_ENERGY,
  CLAN_SHIP_SPACE_MAX_TURNS,
  CLAN_SHIP_SPACE_ORDERS,
  CLAN_SHIP_SPACE_SCENARIOS,
  clanShipSpaceEnemyIntent,
  clanShipSpaceOrderAvailability,
  clanShipSpaceReports,
  previewClanShipSpaceOrder,
  type ClanShipSpaceCommand,
  type ClanShipSpaceEncounter as Encounter,
  type ClanShipSpaceOrder,
  type ClanShipSpaceOrderPreview,
} from './systems/clanShipSpaceEncounter';
import styles from './ClanShipSpaceEncounter.module.css';

export interface ClanShipSpaceEncounterProps {
  encounter: Encounter;
  onCommand: (command: ClanShipSpaceCommand) => boolean;
  suspended?: boolean;
  onClose?: () => void;
  campaign?: ClanShipMaintenanceCampaign;
}

const STATUS_LABELS = { active: 'Liaison tactique', victory: 'Opération réussie', defeat: 'Opération interrompue', withdrawn: 'Contact rompu' } as const;
const RANGE_LABELS = ['Contact distant', 'Couverture tactique', 'Formation rapprochée'] as const;

function forecastLabel(encounter: Encounter, preview: ClanShipSpaceOrderPreview): string {
  if (preview.outcome === 'victory') return 'Objectif sécurisé ; l’opération se termine sans nouvelle attaque.';
  if (preview.outcome === 'withdrawn') return 'Repli volontaire ; aucun résultat de victoire.';
  if (preview.outcome === 'defeat') return 'Cet ordre termine l’opération en échec : la formation, l’objectif ou le temps disponible sera épuisé.';
  const effects = [
    preview.hostileDriveLoss > 0 ? `Propulsion −${preview.hostileDriveLoss}` : '',
    preview.hostileIntegrityLoss > 0 ? `contact −${preview.hostileIntegrityLoss}` : '',
    preview.formationLoss > 0 ? `formation −${preview.formationLoss}` : '',
    preview.assetLoss > 0 ? `${encounter.kind === 'escort' ? 'transport' : 'capsule'} −${preview.assetLoss}` : '',
    preview.formationLoss === 0 && preview.assetLoss === 0 ? 'aucune perte prévue' : '',
    preview.objectiveGain > 0 ? encounter.kind === 'escort' ? '+1 segment protégé' : 'capsule récupérée' : '',
  ].filter(Boolean);
  return effects.join(' · ');
}

function Gauge({ label, value, max = 100, tone = 'clan' }: { label: string; value: number; max?: number; tone?: 'clan' | 'hostile' | 'asset' }) {
  return <div className={styles.gauge} data-space-gauge={label}>
    <div><span>{label}</span><strong>{value}<small> / {max}</small></strong></div>
    <div className={styles.gaugeTrack} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={max} aria-valuenow={value}>
      <span className={styles[tone]} style={{ width: `${value / max * 100}%` }} />
    </div>
  </div>;
}

function TacticalProjection({ encounter }: { encounter: Encounter }) {
  const id = useId().replace(/:/g, '');
  const targetX = 535 - encounter.range * 64;
  const extracted = encounter.kind !== 'interception' && encounter.status === 'victory';
  const assetX = extracted ? 582 : 135 + encounter.objectiveProgress * 79;
  const assetY = extracted ? 245 : 270;
  const contactNeutral = encounter.hostileDrive === 0 || encounter.hostileIntegrity === 0;
  const scenario = CLAN_SHIP_SPACE_SCENARIOS[encounter.kind];
  return <div className={styles.projection} data-clan-space-projection={encounter.kind}>
    <div className={styles.projectionTop}><span>Projection du conseil</span><span>Secteur {encounter.kind === 'escort' ? '07' : encounter.kind === 'recovery' ? '12' : '04'}</span></div>
    <svg viewBox="0 0 680 350" role="img" aria-labelledby={`${id}-title ${id}-description`}>
      <title id={`${id}-title`}>{`Situation tactique : ${scenario.title}`}</title>
      <desc id={`${id}-description`}>{RANGE_LABELS[encounter.range]}. Analyse {encounter.scanLevel} sur 2. Propulsion du contact {encounter.hostileDrive} sur 100. {encounter.kind !== 'interception' ? `${scenario.assetLabel} : ${encounter.assetIntegrity} sur 100.` : ''}</desc>
      <defs>
        <radialGradient id={`${id}-light`}><stop stopColor="#427e72" stopOpacity=".28" /><stop offset="1" stopColor="#0b151d" stopOpacity="0" /></radialGradient>
        <linearGradient id={`${id}-route`}><stop stopColor="#d2b781" stopOpacity=".2" /><stop offset="1" stopColor="#efd59d" stopOpacity=".8" /></linearGradient>
      </defs>
      <rect width="680" height="350" fill={`url(#${id}-light)`} />
      <g className={styles.gridLines}>
        {[70, 140, 210, 280, 350, 420, 490, 560, 630].map(x => <path key={x} d={`M${x} 30V320`} />)}
        {[70, 140, 210, 280].map(y => <path key={y} d={`M35 ${y}H645`} />)}
        <circle cx="288" cy="165" r="66" /><circle cx="288" cy="165" r="126" /><circle cx="288" cy="165" r="183" />
      </g>
      <g className={styles.bearingMarks}><path d="M288 22V40M288 291V309M145 165H162M414 165H432" /><text x="288" y="19">N</text><text x="445" y="170">090</text><text x="288" y="329">180</text></g>
      <path className={styles.clanRoute} d={`M198 165Q285 139 ${targetX} 110`} strokeDasharray={encounter.scanLevel > 0 ? '8 7' : '2 9'} />
      {encounter.kind !== 'interception' && <>
        <path d="M106 270C240 286 431 286 582 245" className={styles.assetRoute} stroke={`url(#${id}-route)`} />
        {[0, 1, 2].map(index => <circle key={index} cx={213 + index * 79} cy="278" r="5" className={index < encounter.objectiveProgress ? styles.segmentComplete : styles.segmentPending} />)}
        <g className={styles.extractionZone}><path d="M562 225H602V265H562Z" /><path d="M574 245H590M582 237V253" /><text x="582" y="290">EXTRACTION</text></g>
      </>}
      <g className={styles.clanContact} transform="translate(198 165)">
        <circle r="37" /><path d="M0 -25L25 19L0 9L-25 19Z" /><path d="M0 -10V7" />
        <text x="0" y="58">FORMATION DU CLAN</text>
      </g>
      <g className={contactNeutral ? styles.disabledContact : styles.hostileContact} transform={`translate(${targetX} 110)`} data-space-contact-range={encounter.range}>
        <path d="M-28 -25H-17M-28 -25V-14M28 -25H17M28 -25V-14M-28 25H-17M-28 25V14M28 25H17M28 25V14" />
        <path d="M0 -16L21 0L0 16L-21 0Z" /><path d="M-7 -4L7 4M-7 4L7 -4" />
        <text x="0" y="47">{contactNeutral ? 'NEUTRALISÉ' : encounter.scanLevel > 0 ? 'ASSAILLANT' : 'SIGNATURE INCONNUE'}</text>
      </g>
      {encounter.kind !== 'interception' && <g className={styles.assetContact} transform={`translate(${assetX} ${assetY})`} data-space-asset-extracted={extracted ? 'true' : 'false'}>
        <path d="M-14 -11L14 -11L21 0L14 11L-14 11L-21 0Z" /><path d="M-7 -5H7V5H-7Z" />
        <text x="0" y="34">{encounter.kind === 'escort' ? 'TRANSPORT' : encounter.objectiveProgress > 0 ? 'CAPSULE RÉCUPÉRÉE' : 'CAPSULE'}</text>
      </g>}
      <g className={styles.coordinateLabels}><text x="36" y="25">C / 04.71</text><text x="620" y="325">H / 27.09</text></g>
    </svg>
    <div className={styles.projectionBottom}><span>{RANGE_LABELS[encounter.range]}</span><span>{encounter.scanLevel === 0 ? 'Analyse requise' : encounter.scanLevel === 1 ? 'Signature identifiée' : 'Solution d’abordage connue'}</span></div>
  </div>;
}

/** Controlled view only: the owning campaign confirms every accepted turn. */
export default function ClanShipSpaceEncounter({ encounter, onCommand, suspended = false, onClose, campaign }: ClanShipSpaceEncounterProps) {
  const headingId = useId();
  const [failedCommand, setFailedCommand] = useState(false);
  const issuedSnapshot = useRef<Encounter | null>(null);
  const scenario = CLAN_SHIP_SPACE_SCENARIOS[encounter.kind];
  const intent = clanShipSpaceEnemyIntent(encounter);
  const reports = clanShipSpaceReports(encounter);
  const lastReport = reports.at(-1);
  const active = encounter.status === 'active';
  const relay = useMemo(() => campaign ? readClanShipRelayDiagnostic(campaign) : null, [campaign]);
  const currentRelay = clanShipRelayDiagnosticMatches(relay, encounter) ? relay : null;
  const issue = (order: ClanShipSpaceOrder) => {
    if (suspended || !active || issuedSnapshot.current === encounter) return;
    const accepted = onCommand({ type: order, expectedTurn: encounter.turn });
    setFailedCommand(!accepted);
    if (accepted) issuedSnapshot.current = encounter;
  };
  return <section className={styles.encounter} aria-labelledby={headingId}
    data-clan-space={encounter.kind} data-clan-space-status={encounter.status} data-clan-space-turn={encounter.turn}
    data-clan-space-suspended={suspended ? 'true' : 'false'}>
    <header className={styles.header}>
      <div><span className={styles.eyebrow}>Opérations du Clan Ship / Espace</span><h3 id={headingId}>{scenario.title}</h3></div>
      <div className={styles.headerEnd}><span className={styles.status} data-outcome={encounter.status}>{STATUS_LABELS[encounter.status]}</span>
        {onClose && <button type="button" className={styles.back} onClick={onClose} disabled={suspended} data-clan-space-close>Retour à la table</button>}
      </div>
    </header>
    <p className={styles.briefing}>{scenario.briefing}</p>
    <div className={styles.layout}>
      <div className={styles.situation}>
        <TacticalProjection encounter={encounter} />
        <div className={styles.gauges}>
          <Gauge label="Formation" value={encounter.formationIntegrity} />
          <Gauge label="Énergie" value={encounter.energy} max={CLAN_SHIP_SPACE_MAX_ENERGY} />
          {encounter.kind !== 'interception' && <Gauge label={scenario.assetLabel} value={encounter.assetIntegrity} tone="asset" />}
        </div>
        <div className={styles.contactReadings}>
          <span>Contact <strong>{encounter.hostileIntegrity}/100</strong></span>
          <span>Propulsion <strong>{encounter.hostileDrive}/100</strong></span>
          <span>Analyse <strong>{encounter.scanLevel}/2</strong></span>
        </div>
      </div>
      <aside className={styles.mission} aria-label="Objectif et réaction adverse">
        <div className={styles.turn}><span>{active ? 'Tour suivant' : 'Dernier tour'}</span><strong>{active ? encounter.turn + 1 : encounter.turn}<small> / {CLAN_SHIP_SPACE_MAX_TURNS}</small></strong></div>
        <h4>Mandat de la formation</h4><p>{scenario.objective}</p>
        {encounter.kind === 'escort' && <div className={styles.objectiveSteps} aria-label={`${encounter.objectiveProgress} segments de route protégés sur 3`}>
          {[1, 2, 3].map(step => <span key={step} data-complete={step <= encounter.objectiveProgress}>{step <= encounter.objectiveProgress ? '✓' : step}<small>Segment {step}</small></span>)}
        </div>}
        {encounter.kind === 'recovery' && <div className={styles.recoveryStatus}>{encounter.objectiveProgress === 3 ? 'Capsule extraite' : encounter.objectiveProgress === 2 ? 'Capsule récupérée · extraction attendue' : 'Équipe de récupération en attente'}</div>}
        {active && <div className={styles.intent} data-clan-space-intent={intent.id}><span className={styles.eyebrow}>Réaction prévue</span><strong>{intent.label}</strong><p>{intent.detail}</p></div>}
        <p className={styles.timing}>Un ordre fait avancer un tour. Consulte sa prévision avant de l’envoyer. La situation reste figée entre deux ordres et reprend au dernier tour sauvegardé.</p>
      </aside>
    </div>
    <div className={styles.liveReport} aria-live="polite" aria-atomic="true" data-clan-space-report>
      <span className={styles.reportMarker} aria-hidden="true" />
      <p>{failedCommand ? 'Ordre non confirmé. La table conserve le dernier état confirmé ; vérifie la sauvegarde puis réessaie.' : suspended ? 'Liaison suspendue. Les ordres reprendront après fermeture de la pause.' : lastReport?.message ?? 'La formation attend ton premier ordre. Analyse le contact pour préparer l’opération.'}</p>
    </div>
    {currentRelay && <details className={styles.relayDiagnostic} open data-clan-relay-diagnostic
      data-relay-source-turn={currentRelay.sourceTurn} data-relay-completed-revision={currentRelay.completedIncidentRevision}>
      <summary>Relais R-2 · diagnostic rapproché <span>Deux ordres comparés</span></summary>
      <p>Le circuit témoin {currentRelay.referenceBranch} et la branche réparée {currentRelay.repairedBranch} concordent.
        Choisis un premier ordre ; la seconde action reste à confirmer au tour suivant.</p>
      {currentRelay.forecasts.length ? <div className={styles.relayForecasts}>
        {currentRelay.forecasts.map(forecast => <article key={forecast.first} data-relay-forecast={forecast.first}>
          <strong>{forecast.labels.join(' → ')}</strong>
          <span>{forecast.outcome === 'victory' ? 'Objectif sécurisé' : `${forecast.turns} ordres · contact ${forecast.hostileIntegrity}/100 · propulsion ${forecast.hostileDrive}/100`}</span>
          <span>Formation {forecast.formation}/100 · énergie {forecast.energy}/{CLAN_SHIP_SPACE_MAX_ENERGY}</span>
          <button type="button" disabled={suspended} data-clan-relay-order={forecast.first} onClick={() => issue(forecast.first)}>
            Donner l’ordre : {forecast.labels[0]}
          </button>
        </article>)}
      </div> : <p>Aucune suite de deux ordres sans interruption de l’opération n’est disponible. Consulte les ordres individuels et le repli.</p>}
    </details>}
    {active ? <fieldset className={styles.commands} disabled={suspended}>
      <legend>Ordres tactiques</legend>
      {CLAN_SHIP_SPACE_ORDERS.map(order => {
        const availability = clanShipSpaceOrderAvailability(encounter, order);
        const preview = availability.available ? previewClanShipSpaceOrder(encounter, order) : null;
        const energyChange = preview?.energyChange ?? (order === 'brace' || order === 'recharge'
          ? Math.min(CLAN_SHIP_SPACE_MAX_ENERGY - encounter.energy, order === 'brace' ? 2 : 4) : -availability.cost);
        const detailId = `${headingId}-${order}-detail`;
        const energyId = `${headingId}-${order}-energy`;
        const forecastId = `${headingId}-${order}-forecast`;
        return <button type="button" key={order} onClick={() => issue(order)} disabled={suspended || !availability.available}
          className={`${styles.command} ${order === 'withdraw' ? styles.withdraw : ''}`}
          data-clan-space-order={order} data-clan-space-available={availability.available ? 'true' : 'false'}
          aria-label={availability.label} aria-describedby={`${detailId} ${energyId}${preview ? ` ${forecastId}` : ''}`}>
          <span className={styles.commandHeading}><strong>{availability.label}</strong><small id={energyId} aria-label={`${energyChange < 0 ? 'Coût' : 'Gain'} : ${Math.abs(energyChange)} énergie`}>{energyChange < 0 ? `−${-energyChange}` : energyChange > 0 ? `+${energyChange}` : '0'} É</small></span>
          <span className={styles.commandDetail} id={detailId}>{availability.message ?? availability.detail}</span>
          {preview && <span className={styles.commandForecast} id={forecastId} data-clan-space-forecast={order} data-outcome={preview.outcome}>
            <span>Prévision</span> {forecastLabel(encounter, preview)}
          </span>}
        </button>;
      })}
    </fieldset> : <div className={styles.outcome} data-outcome={encounter.status}>
      <span className={styles.eyebrow}>Rapport de liaison</span><h4>{STATUS_LABELS[encounter.status]}</h4>
      <p>{encounter.status === 'victory' ? 'La formation a rempli son mandat. Le conseil peut poursuivre le dossier de cette opération.'
        : encounter.status === 'withdrawn' ? 'Le groupe est revenu après ton ordre de repli. Le contrat peut être retenté depuis la table.'
          : 'L’objectif n’a pas pu être sécurisé dans la fenêtre d’opération. Le contrat reste à réussir ; prépare une nouvelle tentative depuis la table.'}</p>
    </div>}
    {encounter.crewRoles.length > 0 && <details className={styles.crew}><summary>Équipage de l’opération <span>{encounter.crewRoles.length} postes actifs</span></summary>
      <ul>{encounter.crewRoles.map(role => <li key={role} data-clan-space-crew={role}><strong>{CLAN_SHIP_SPACE_CREW_EFFECTS[role].label}</strong><span>{CLAN_SHIP_SPACE_CREW_EFFECTS[role].effect}</span></li>)}</ul>
    </details>}
    {reports.length > 1 && <details className={styles.journal}><summary>Dernières transmissions</summary><ol>{reports.map(report => <li key={report.turn}><span>Tour {report.turn}</span><p>{report.message}</p></li>)}</ol></details>}
    <p className={styles.provenance}>Opération originale du jeu. Les valeurs tactiques représentent l’équilibre de cette mission, sans attribuer de caractéristiques officielles au vaisseau d’AVP.</p>
  </section>;
}
