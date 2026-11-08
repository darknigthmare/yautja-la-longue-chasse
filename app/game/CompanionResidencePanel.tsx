'use client';

/* eslint-disable @next/next/no-img-element -- native quarter assets preserve their original ratio */
import { memo, useId, useMemo, useState } from 'react';
import type { SaveGame } from './types';
import { shipForId, type ShipId } from './shipCatalogue';
import { COMPANION_QUARTER_ART } from './companionQuarterArt';
import { SHIP_INTERIOR_25D_ROOMS, type ShipInterior25dRoomId } from './systems/shipInterior25d';
import { CLAN_SHIP_INTERIOR_ROOMS } from './systems/clanShipInterior';
import type { ClanShipRoomId } from './systems/clanShipDocking';
import { evaluateClanShipAccess } from './systems/clanShipOperations';
import {
  COMPANION_RESIDENCE_DEFINITIONS, actCompanionResidence,
  companionBerthCapacity, companionHasRecruitment, companionHostLabel,
  companionRecruitmentDefinition, companionResidenceAvailability, companionResidenceDefinition,
  companionResidencePresence, createCompanionResidence, inspectCompanionResidence,
  type CompanionContact, type CompanionHost, type CompanionResident,
  type CompanionResidenceAction, type CompanionResidenceCommand, type CompanionResidenceContext,
  type CompanionResidenceDefinition, type CompanionResidenceObservation, type CompanionResidenceState,
} from './systems/companionResidence';
import styles from './CompanionResidencePanel.module.css';

/** Controlled by the normal campaign writer. The scene supplies live world
 * coordinates, never a menu-selected room pretending to be an inspection. */
export interface CompanionResidenceControlled {
  save: SaveGame;
  selectedShipId: ShipId;
  ownedShipIds: readonly ShipId[];
  onAction: (action: CompanionResidenceAction, observation: CompanionResidenceObservation) => boolean;
}
export interface CompanionResidencePanelProps {
  controlled: CompanionResidenceControlled;
  site: 'personal' | 'clan';
  suspended: boolean;
  stationId: string | null;
  observe: () => CompanionResidenceObservation | null;
  onNavigate: (roomId: ShipInterior25dRoomId | ClanShipRoomId) => void;
}
const roomLabel = (site: 'personal' | 'clan', room: string): string => site === 'personal'
  ? SHIP_INTERIOR_25D_ROOMS[room as ShipInterior25dRoomId]?.label ?? room
  : CLAN_SHIP_INTERIOR_ROOMS[room as ClanShipRoomId]?.label ?? room;
const availabilityLabel = { ready: 'Disponible', recovering: 'En soins', missing: 'Porté disparu', suspended: 'Accord suspendu', dead: 'Décédé' };

export default memo(function CompanionResidencePanel({ controlled, site, suspended, stationId, observe, onNavigate }: CompanionResidencePanelProps) {
  const { save, selectedShipId, ownedShipIds } = controlled;
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState('');
  const headingId = useId();
  const inspection = useMemo(() => inspectCompanionResidence(save.companionResidence, save.createdAt), [save.companionResidence, save.createdAt]);
  const state = inspection.state ?? createCompanionResidence(save.createdAt);
  const access = evaluateClanShipAccess(save);
  const available = !suspended && access.allowed && !['future-version', 'invalid-save'].includes(inspection.status);
  const target: CompanionHost = site === 'personal' ? { kind: 'personal', shipId: selectedShipId } : { kind: 'clan', shipId: 'avp-predator-mothership' };
  const known = COMPANION_RESIDENCE_DEFINITIONS.filter(definition => companionHasRecruitment(save, definition.id));
  const present = companionResidencePresence(save, target);
  const archiveRoom = site === 'personal' ? 'clan-archives' : 'archives';
  const refitRoom = site === 'personal' ? 'launch-airlock' : 'hangar';
  const context = (): CompanionResidenceContext => ({ save, selectedShipId, ownedShipIds, active: available, site, observation: observe() });
  const docking = save.clanShipDocking;
  const atDock = site === 'clan' ? stationId === 'hangar' && docking?.status === 'aboard' && docking.ownerCreatedAt === save.createdAt
    : stationId === 'launch-airlock' && docking?.ownerCreatedAt === save.createdAt && ['docked', 'aboard'].includes(docking.status) && docking.personalShipId === selectedShipId;
  const act = (command: CompanionResidenceCommand) => {
    if (!available) return;
    const observation = observe();
    const action: CompanionResidenceAction = { ...command, ownerCreatedAt: save.createdAt, expectedRevision: state.revision };
    const preview = actCompanionResidence(action, { ...context(), observation });
    if (!preview.accepted || !observation) { setStatus(preview.message); return; }
    if (!preview.changed) { setStatus(preview.message); return; }
    const persisted = controlled.onAction(action, observation);
    setStatus(persisted ? preview.message : 'La campagne n’a pas confirmé cette modification. Consulte l’état de sauvegarde puis rouvre le dossier avant de réessayer.');
  };
  const navigate = (room: ShipInterior25dRoomId | ClanShipRoomId) => { if (available) onNavigate(room); };
  const stationReady = available && stationId !== null;
  return <details className={styles.panel} data-companion-residence-panel data-companion-site={site}
    onToggle={event => setOpen(event.currentTarget.open)}>
    <summary><span>Compagnons <small>Accords et quartiers</small></span>
      <span className={styles.summaryCount}>{known.length} recruté{known.length > 1 ? 's' : ''} · {present.filter(member => member.quarterVisible).length} quartier{present.filter(member => member.quarterVisible).length > 1 ? 's' : ''} ici</span>
    </summary>
    {open && <div className={styles.content} aria-labelledby={headingId}>
      <header className={styles.heading}>
        <div><span className={styles.eyebrow}>RÉSEAU DU CHASSEUR</span><h3 id={headingId}>{companionHostLabel(target)}</h3>
          <p>Un accord ouvre la réserve. Les quartiers et l’arrivée à bord sont confirmés au quai, pour une seule coque à la fois.</p></div>
        <div className={styles.balance}><strong>{save.profile.clanMarks}</strong><span>marques disponibles</span></div>
      </header>
      {!available && <p className={styles.notice}>{suspended ? 'La scène est suspendue pendant cette consultation.' : !access.allowed ? access.reason : 'Ce registre nécessite une récupération avant toute modification.'}</p>}
      <div className={styles.routeBar}>
        <p>{stationId ? `Poste à portée : ${roomLabel(site, stationId)}.` : 'Approche un poste de bord pour confirmer une décision.'}
          {atDock ? ' Le quai permet de réserver et terminer les travaux.' : ' Au sas personnel, le vaisseau doit être amarré au Clan Ship.'}</p>
        <button type="button" disabled={!available} onClick={() => navigate(archiveRoom)}>Rejoindre les archives</button>
        <button type="button" disabled={!available} onClick={() => navigate(refitRoom)}>Rejoindre le quai</button>
      </div>
      <section className={styles.section} aria-label="Appels et recrutements">
        <div className={styles.sectionTitle}><h4>Appels du réseau</h4>
          <button type="button" data-companion-action="discover" disabled={!stationReady || stationId !== archiveRoom} onClick={() => act({ type: 'discover' })}>Consulter les appels</button></div>
        <p className={styles.hint}>Les routes déjà reconnues peuvent révéler un appel. Accepte la reconnaissance avant de repartir : un ancien rapport n’établit pas ce nouvel accord.</p>
        {state.contacts.filter(contact => contact.stage !== 'recruited').length === 0 && <p className={styles.empty}>Aucun appel en cours. Les archives restent le point de contact du réseau.</p>}
        <div className={styles.grid}>{state.contacts.filter(contact => contact.stage !== 'recruited').map(contact => <ContactCard key={contact.id}
          contact={contact} site={site} stationId={stationId} ready={stationReady} canNavigate={available} act={act} navigate={navigate} />)}</div>
      </section>
      <section className={styles.section} aria-label="Alliés recrutés">
        <div className={styles.sectionTitle}><h4>Accords de recrutement</h4><span>{known.length} accord{known.length > 1 ? 's' : ''}</span></div>
        {known.length === 0 && <p className={styles.empty}>Aucun allié recruté. Le rang et la découverte d’un dossier ne font apparaître personne à bord.</p>}
        <div className={styles.grid}>{known.map(definition => <ResidentCard key={`${definition.id}:${selectedShipId}:${site}`}
          definition={definition} member={state.members.find(member => member.id === definition.id)} state={state}
          controlled={controlled} site={site} ready={stationReady} atDock={atDock} act={act} navigate={navigate} />)}</div>
      </section>
      {site === 'clan' && <section className={styles.capacity} aria-label="Capacité des quartiers du clan">
        <div><h4>Ponts du clan · {state.clanCapacity} personnes</h4><p>Joueur compris : {state.clanCapacity - 1} emplacements pour les alliés. Les capacités 7 / 13 / 19 n’attribuent aucun occupant.</p></div>
        {state.clanCapacity < 19 && <button type="button" disabled={!available || !atDock || !save.clanShipOperations?.mandateAccepted || state.clanCapacity === 13 && !save.clanShipOperations.circleConfirmed}
          data-companion-action="expand-clan-quarters" onClick={() => act({ type: 'expand-clan-quarters' })}>
          Aménager le palier {state.clanCapacity === 7 ? 13 : 19} · {state.clanCapacity === 7 ? 120 : 240} marques</button>}
      </section>}
      <p role="status" aria-live="polite" className={styles.status}>{status || 'Les décisions sont confirmées uniquement après l’enregistrement de la campagne.'}</p>
    </div>}
  </details>;
});

function ContactCard({ contact, site, stationId, ready, canNavigate, act, navigate }: {
  contact: CompanionContact; site: 'personal' | 'clan'; stationId: string | null; ready: boolean; canNavigate: boolean;
  act: (action: CompanionResidenceCommand) => void; navigate: (room: ShipInterior25dRoomId | ClanShipRoomId) => void;
}) {
  const definition = companionRecruitmentDefinition(contact.id)!;
  const ally = companionResidenceDefinition(contact.id)!;
  const step = definition.steps[contact.step];
  const archive = site === 'personal' ? 'clan-archives' : 'archives';
  const stepRoom = step ? site === 'personal' ? step.personalRoom : step.clanRoom : archive;
  return <article className={styles.card} data-companion-contact={contact.id} data-contact-stage={contact.stage}>
    <span className={styles.eyebrow}>{definition.world} · {contact.stage === 'discovered' ? 'APPEL DÉCOUVERT' : contact.stage === 'accepted' ? 'RECONNAISSANCE ACCEPTÉE' : 'RAPPORT REÇU'}</span>
    <h5>{contact.stage === 'discovered' ? definition.rumour : ally.name}</h5><p>{definition.briefing}</p>
    {contact.stage === 'discovered' && <button type="button" disabled={!ready || stationId !== archive} data-companion-action={`accept-contact:${contact.id}`}
      onClick={() => act({ type: 'accept-contact', id: contact.id })}>Accepter la reconnaissance</button>}
    {contact.stage === 'accepted' && <><p className={styles.requirement}>{contact.encounterRun !== null ? 'Reconnaissance liée à la chasse en cours. Reprends-la depuis le suivi de campagne.' : `Nouvelle extraction réussie · ${definition.minimumScans} scan(s) · score ${definition.minimumScore} minimum.`}</p>
      <button type="button" disabled={!ready || stationId !== archive || contact.encounterRun !== null} onClick={() => act({ type: 'cancel-contact', id: contact.id })}>Retirer cet appel</button></>}
    {contact.stage === 'proven' && <>
      <p className={styles.receipt}>Rapport du {contact.proof?.completedAt.slice(0, 10)} · {contact.proof?.scans} scans · score {contact.proof?.score}</p>
      {step ? <div className={styles.preparation}><strong>{contact.step + 1} / {definition.steps.length} · {step.title}</strong><p>{step.description}</p>
        <button type="button" disabled={!canNavigate} onClick={() => navigate(stepRoom)}>Rejoindre {roomLabel(site, stepRoom)}</button>
        {step.choices.map(choice => <button type="button" key={choice.id} disabled={!ready || stationId !== stepRoom}
          data-companion-choice={`${contact.id}:${step.id}:${choice.id}`} onClick={() => act({ type: 'prepare-contact', id: contact.id, stepId: step.id, choiceId: choice.id })}>{choice.label}</button>)}
      </div> : <><p className={styles.requirement}>Préparatifs acceptés. Confirme l’alliance aux archives ; l’allié restera en réserve.</p>
        <button type="button" disabled={!ready || stationId !== archive} data-companion-action={`recruit:${contact.id}`} onClick={() => act({ type: 'recruit', id: contact.id })}>Proposer l’accord à {ally.name}</button></>}
    </>}
  </article>;
}

function ResidentCard({ definition, member, state, controlled, site, ready, atDock, act, navigate }: {
  definition: CompanionResidenceDefinition; member?: CompanionResident; state: CompanionResidenceState;
  controlled: CompanionResidenceControlled; site: 'personal' | 'clan'; ready: boolean; atDock: boolean;
  act: (action: CompanionResidenceCommand) => void; navigate: (room: ShipInterior25dRoomId | ClanShipRoomId) => void;
}) {
  const [destination, setDestination] = useState(site === 'clan' ? 'clan' : `personal:${controlled.selectedShipId}`);
  const selectId = useId();
  const { save, ownedShipIds } = controlled;
  const availability = member ? companionResidenceAvailability(save, member) : definition.source === 'triad'
    ? save.expeditionRoster?.members.find(entry => entry.id === definition.id)?.availability ?? 'missing' : 'ready';
  const oldTriad = definition.source === 'triad' ? save.expeditionRoster?.members.find(entry => entry.id === definition.id) : null;
  const historicClan = definition.source === 'clan' && (!member || member.legacyClanPost);
  const assignment = member?.assignment ? companionHostLabel(member.assignment) : historicClan ? 'Poste historique du Clan Ship' : oldTriad?.assignedShipId ? `${shipForId(oldTriad.assignedShipId).name} · affectation antérieure` : 'Réserve du réseau';
  const refit = member?.refit;
  const artKey = member?.installation?.module;
  const art = artKey && artKey in COMPANION_QUARTER_ART ? COMPANION_QUARTER_ART[artKey as keyof typeof COMPANION_QUARTER_ART] : null;
  const deployment = member?.deployment;
  const ships = [...new Set(ownedShipIds)].filter(shipId => companionBerthCapacity({ kind: 'personal', shipId }, state) > 0);
  const target: CompanionHost = destination === 'clan' ? { kind: 'clan', shipId: 'avp-predator-mothership' } : { kind: 'personal', shipId: destination.slice(9) as ShipId };
  return <article className={styles.card} data-companion-member={definition.id} data-companion-availability={availability}>
    <header className={styles.cardHeading}><div><span className={styles.eyebrow}>{definition.role}</span><h5>{definition.name}</h5></div><span className={styles.badge}>{deployment ? 'En mission' : availabilityLabel[availability]}</span></header>
    <dl className={styles.facts}><div><dt>Affectation</dt><dd>{assignment}</dd></div><div><dt>Quartier</dt><dd>{member?.installation ? definition.moduleLabel : 'Aucune installation personnelle'}</dd></div></dl>
    {art && member?.relation === 'active' && <figure className={styles.preview}><img src={art.src} alt={definition.moduleLabel} loading="lazy" decoding="async" width={art.sourceWidth} height={art.sourceHeight} /><figcaption>{definition.moduleLabel} · installation confirmée</figcaption></figure>}
    <p className={styles.hint}>{definition.fieldReady ? 'La triade utilise ses partenaires réellement disponibles et affectés à la coque de départ.' : 'Accueil à bord et présence au réseau. Ce compagnon ne peut pas être ajouté à une équipe de chasse.'}</p>
    {availability === 'recovering' && <button type="button" onClick={() => navigate(site === 'personal' ? 'medical-bay' : 'soins')}>Rejoindre les soins</button>}
    {refit ? <div className={styles.refit}>
      <strong>{refit.stage === 'funded' ? 'Fournitures réservées' : 'Réaménagement programmé'}</strong><p>{companionHostLabel(refit.host)} · {refit.stage === 'funded' ? refit.reservedMarks : definition.installationCost} marques{refit.stage === 'funded' ? ' en réserve' : ' à réserver'}</p>
      <p>L’affectation précédente reste active jusqu’à la confirmation des travaux.</p>
      <div className={styles.actions}><button type="button" disabled={!ready || !atDock || !!deployment || availability === 'missing' || availability === 'suspended'}
        data-companion-action={`${refit.stage === 'funded' ? 'complete-refit' : 'fund-refit'}:${definition.id}`}
        onClick={() => act({ type: refit.stage === 'funded' ? 'complete-refit' : 'fund-refit', id: definition.id })}>{refit.stage === 'funded' ? 'Confirmer les travaux' : 'Réserver les fournitures'}</button>
        <button type="button" disabled={!ready} data-companion-action={`cancel-refit:${definition.id}`} onClick={() => act({ type: 'cancel-refit', id: definition.id })}>Annuler{refit.reservedMarks ? ' et rembourser' : ''}</button></div>
    </div> : <>
      <label className={styles.destination} htmlFor={selectId}>Préparer une affectation<select id={selectId} value={destination} disabled={!ready || !!deployment || availability === 'suspended' || availability === 'missing'} onChange={event => setDestination(event.target.value)}>
        {ships.map(shipId => <option key={shipId} value={`personal:${shipId}`}>{shipForId(shipId).name} · personnel</option>)}
        <option value="clan" disabled={!save.clanShipOperations?.mandateAccepted}>Clan Ship · vaisseau du clan</option>
      </select></label>
      <button type="button" disabled={!ready || !!deployment || availability === 'suspended' || availability === 'missing'} data-companion-action={`plan-refit:${definition.id}`}
        onClick={() => act({ type: 'plan-refit', id: definition.id, host: target })}>Programmer le quartier · {definition.installationCost} marques</button>
      <div className={styles.actions}>
        {(member?.assignment || historicClan || oldTriad?.assignedShipId) && <button type="button" disabled={!ready || !atDock || !!deployment} onClick={() => act({ type: 'reserve', id: definition.id })}>Placer en réserve</button>}
        {(member?.assignment || historicClan || member?.relation === 'suspended') && <button type="button" disabled={!ready || !atDock || !!deployment}
          onClick={() => act({ type: member?.relation === 'suspended' ? 'resume' : 'suspend', id: definition.id })}>{member?.relation === 'suspended' ? 'Reprendre l’accord' : 'Suspendre l’affectation'}</button>}
      </div>
    </>}
  </article>;
}
