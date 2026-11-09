"use client";

import { useEffect, useRef, useState, type KeyboardEvent } from 'react';
import type { SaveGame } from './types';
import type { ClanShipRoomId } from './systems/clanShipDocking';
import { CLAN_SHIP_INTERIOR_ROOMS } from './systems/clanShipInterior';
import {
  CLAN_SHIP_CONTRACTS, CLAN_SHIP_ONBOARDING_STEPS, CLAN_SHIP_RECRUITS,
  clanShipContract, evaluateClanShipContract, evaluateClanShipOperationsPhase,
  evaluateClanShipRecruit, getClanShipActiveStep,
  type ClanShipNpcId, type ClanShipOperationsAction, type ClanShipOperationsState,
} from './systems/clanShipOperations';
import ClanShipSpaceEncounter from './ClanShipSpaceEncounter';
import HomeworldNpcSpriteV84 from './HomeworldNpcSpriteV84';
import { CLAN_SHIP_CREW_ART_ROLES, clanShipCrewArtIdentity } from './clanShipCrew';
import { availableClanResidenceCrew, companionHostLabel } from './systems/companionResidence';
import { selectClanShipCrewDialogue, type ClanShipCrewDialogueContext } from './systems/clanShipCrewDialogue';
import { useMenuGamepad } from './useMenuGamepad';
import styles from './ClanShipOperationsPanel.module.css';

interface Props {
  state: ClanShipOperationsState;
  save: SaveGame;
  roomId: ClanShipRoomId;
  suspended: boolean;
  temporarySession?: boolean;
  crewFocus?: ClanShipNpcId | null;
  onAction: (action: ClanShipOperationsAction) => boolean;
  onClose: () => void;
  onNavigate: (roomId: ClanShipRoomId) => void;
  onClanWar: () => void;
}
type Tab = 'post' | 'contracts' | 'crew' | 'journal';
const TABS: { id: Tab; label: string }[] = [
  { id: 'post', label: 'Poste & mandat' }, { id: 'contracts', label: 'Opérations' },
  { id: 'crew', label: 'Équipage' }, { id: 'journal', label: 'Chronique' },
];
const KINDS = { onboarding: 'Accueil du clan', interior: 'Mission à bord', field: 'Chasse de clan', space: 'Opération spatiale' };
const PHASES = {
  'blooded-required': 'Rite Blooded attendu', welcome: 'Reconnaissance du bord', mandate: 'Audience du conseil',
  operations: 'Mandat d’opération', 'circle-confirmed': 'Cercle confirmé',
};
const CREW_DIALOGUE_CONTEXTS: Record<ClanShipCrewDialogueContext, string> = {
  'missing-proof': 'Le dossier attendu', 'recent-proof': 'La preuve rapportée',
  agreement: 'L’accord du cercle', 'operation-return': 'Le retour d’opération',
  'circle-confirmed': 'Le cercle confirmé',
};

/** Controlled campaign terminal. Only the parent can acknowledge a durable
 * command; closing, tabbing or looking at a card never grants progression. */
export default function ClanShipOperationsPanel({ state, save, roomId, suspended, crewFocus, temporarySession = false, onAction, onClose, onNavigate, onClanWar }: Props) {
  const rootRef = useRef<HTMLElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [tab, setTab] = useState<Tab>(crewFocus ? 'crew' : roomId === 'conseil' && state.mandateAccepted ? 'contracts' : 'post');
  const [selectedId, setSelectedId] = useState(state.activeContract?.contractId ?? 'space-screening');
  const [feedback, setFeedback] = useState('');
  const [heardDialogue, setHeardDialogue] = useState<string | null>(null);
  const phase = evaluateClanShipOperationsPhase(save, state);
  const currentOnboarding = CLAN_SHIP_ONBOARDING_STEPS[state.onboardingStep];
  const activeContract = state.activeContract ? clanShipContract(state.activeContract.contractId) : null;
  const activeStep = getClanShipActiveStep(state);
  const selection = clanShipContract(selectedId);
  const selectionAccess = selection ? evaluateClanShipContract(state, selection.id, save) : null;
  const atCouncil = roomId === 'conseil';
  const completed = new Set(state.completedContracts.map(receipt => receipt.contractId));
  const availableCrew = availableClanResidenceCrew(save);
  useMenuGamepad(rootRef, !suspended, 'clan-ship-operations', onClose);
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      const crew = crewFocus ? rootRef.current?.querySelector<HTMLElement>(`[data-clan-recruit="${crewFocus}"]`) : null;
      if (crew) { crew.scrollIntoView({ block: 'center' }); crew.focus({ preventScroll: true }); }
      else closeRef.current?.focus({ preventScroll: true });
    });
    return () => cancelAnimationFrame(frame);
  }, [crewFocus]);

  const act = (action: ClanShipOperationsAction) => {
    if (suspended) return false;
    const accepted = onAction(action);
    setFeedback(accepted ? temporarySession ? 'Ordre appliqué dans cet essai temporaire.' : 'Ordre confirmé dans le dossier du clan.'
      : 'L’ordre n’a pas été confirmé. Consulte le message puis réessaie depuis l’état actualisé.');
    return accepted;
  };
  const route = (target: ClanShipRoomId) => { if (!suspended) onNavigate(target); };
  const routeButton = (target: ClanShipRoomId, label?: string) => <button type="button" disabled={suspended}
    data-clan-operation-route={target} className={styles.secondary} onClick={() => route(target)}>
    {label ?? `Rejoindre : ${CLAN_SHIP_INTERIOR_ROOMS[target].label}`}
  </button>;
  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (event.defaultPrevented || suspended) return;
    if (event.key === 'Escape' && !event.repeat) { event.preventDefault(); event.stopPropagation(); onClose(); return; }
    if (event.key !== 'Tab') return;
    const buttons = Array.from(rootRef.current?.querySelectorAll<HTMLElement>('button:not(:disabled),a[href],[tabindex="0"]') ?? [])
      .filter(element => !element.closest('[hidden],[inert]') && element.getClientRects().length > 0);
    const first = buttons[0], last = buttons.at(-1);
    if (event.shiftKey && document.activeElement === first && last) { event.preventDefault(); last.focus(); }
    else if (!event.shiftKey && document.activeElement === last && first) { event.preventDefault(); first.focus(); }
  };
  const activeSection = activeContract && <article className={styles.activeContract} data-clan-active-contract={activeContract.id}>
    <span className={styles.eyebrow}>ORDRE EN COURS · {KINDS[activeContract.kind]}</span>
    <h3>{activeContract.name}</h3><p>{activeContract.briefing}</p>
    {activeStep && <div className={styles.step}>
      <strong>{activeStep.label}</strong><p>{activeStep.description}</p>
      <span>{CLAN_SHIP_INTERIOR_ROOMS[activeStep.roomId].label} · étape {(state.activeContract?.stepIndex ?? 0) + 1} / {activeContract.steps.length}</span>
      {roomId === activeStep.roomId ? <button type="button" className={styles.primary} disabled={suspended}
        data-clan-interior-step={activeStep.id}
        onClick={() => act({ type: 'interior-step', stepId: activeStep.id, expectedRevision: state.revision })}>{activeStep.label}</button>
        : routeButton(activeStep.roomId)}
    </div>}
    {activeContract.kind === 'field' && <div className={styles.step}>
      <strong>Départ depuis ton vaisseau personnel</strong>
      <p>Rejoins le hangar, embarque sur ton vaisseau puis désamarre. Le bouton « Contrat du clan » du pont ouvre le briefing de la chasse. Le rapport sera reconnu après une réussite répondant aux objectifs.</p>
      {routeButton('hangar', 'Rejoindre le hangar pour préparer le départ')}
    </div>}
    {state.spaceEncounter && (atCouncil ? <ClanShipSpaceEncounter encounter={state.spaceEncounter} suspended={suspended} campaign={save}
      onCommand={command => act({ type: 'space-command', command, expectedRevision: state.revision })} />
      : <div className={styles.step}><p>L’engagement reste à son dernier ordre enregistré. Reprends son commandement à la table du conseil.</p>{routeButton('conseil')}</div>)}
    {atCouncil && <button type="button" className={styles.quiet} disabled={suspended}
      data-clan-cancel-contract onClick={() => act({ type: 'cancel-contract', expectedRevision: state.revision })}>
      Clore ce départ sans récompense
    </button>}
  </article>;
  const spaceReport = !activeContract && state.spaceEncounter && atCouncil && <article className={styles.activeContract} data-clan-space-report>
    <span className={styles.eyebrow}>DERNIER RAPPORT TACTIQUE</span>
    <ClanShipSpaceEncounter encounter={state.spaceEncounter} suspended={suspended} campaign={save}
      onCommand={command => act({ type: 'space-command', command, expectedRevision: state.revision })} />
  </article>;

  return <div className={styles.backdrop}>
    <section ref={rootRef} role="dialog" aria-modal="true" aria-labelledby="clan-operations-title"
      className={styles.terminal} onKeyDown={onKeyDown} inert={suspended} data-clan-operations
      data-clan-operations-room={roomId} data-clan-operations-phase={phase} data-clan-operations-revision={state.revision}>
      <header className={styles.header}>
        <div><span className={styles.eyebrow}>CLAN SHIP · {atCouncil ? 'TABLE HOLOGRAPHIQUE DE GUERRE' : CLAN_SHIP_INTERIOR_ROOMS[roomId].label}</span>
          <h2 id="clan-operations-title">{atCouncil ? 'Le cercle de commandement' : 'Dossier du poste'}</h2>
          <p>{PHASES[phase]} <span aria-hidden="true"> / </span> {state.recruitedNpcIds.length} membres affectés <span aria-hidden="true"> / </span> {completed.size} dossiers accomplis</p>
        </div>
        <button ref={closeRef} type="button" className={styles.close} disabled={suspended} data-clan-operations-close onClick={onClose}>Retour au pont <span aria-hidden="true">×</span></button>
      </header>
      <nav className={styles.tabs} aria-label="Dossiers du Clan Ship">
        {TABS.map(entry => <button key={entry.id} type="button" aria-pressed={tab === entry.id} disabled={suspended}
          data-clan-operations-tab={entry.id} onClick={() => { setTab(entry.id); setFeedback(''); }}>{entry.label}</button>)}
      </nav>
      <div className={styles.content}>
        {tab === 'post' && <div className={styles.postLayout}>
          <section className={styles.introduction}>
            <span className={styles.eyebrow}>DU RITE AU MANDAT</span><h3>Une place dans le clan se gagne.</h3>
            <p>Le rite Blooded ouvre l’accès au vaisseau pour la campagne initiatique. Le conseil te confie ensuite des opérations ; le vaisseau-mère demeure le bien collectif du clan.</p>
            <ol className={styles.onboarding}>
              {CLAN_SHIP_ONBOARDING_STEPS.map((step, index) => <li key={step.id} data-done={index < state.onboardingStep} aria-current={index === state.onboardingStep ? 'step' : undefined}>
                <span>{index < state.onboardingStep ? '✓' : String(index + 1).padStart(2, '0')}</span>
                <div><strong>{step.label}</strong><small>{CLAN_SHIP_INTERIOR_ROOMS[step.roomId].label}</small></div>
              </li>)}
              <li data-done={state.mandateAccepted}><span>{state.mandateAccepted ? '✓' : '04'}</span><div><strong>Recevoir le mandat du conseil</strong><small>Salle du conseil</small></div></li>
            </ol>
            {phase === 'blooded-required' ? <p className={styles.notice}>Achève le rite Blooded de ta chronique avant d’accepter les opérations du clan.</p>
              : currentOnboarding ? <div className={styles.step}><h4>{currentOnboarding.label}</h4><p>{currentOnboarding.description}</p>
                {roomId === currentOnboarding.roomId ? <button type="button" disabled={suspended} className={styles.primary}
                  data-clan-onboard-step={currentOnboarding.id} onClick={() => act({ type: 'onboard-step', stepId: currentOnboarding.id, expectedRevision: state.revision })}>
                  {currentOnboarding.label}
                </button> : routeButton(currentOnboarding.roomId)}
              </div> : !state.mandateAccepted ? <div className={styles.step}><p>Les trois postes ont enregistré ton arrivée. Présente-toi au conseil pour recevoir ton mandat.</p>
                {atCouncil ? <button type="button" className={styles.primary} disabled={suspended} data-clan-accept-mandate
                  onClick={() => act({ type: 'accept-mandate', expectedRevision: state.revision })}>Accepter le mandat d’opération</button> : routeButton('conseil')}
              </div> : <div className={styles.step}><p>Le mandat ouvre les dossiers du clan. Les interventions se réalisent au poste concerné ; les chasses partent depuis ton vaisseau.</p>
                <button type="button" className={styles.primary} disabled={suspended} onClick={() => setTab('contracts')}>Consulter les opérations</button>
              </div>}
          </section>
          <section className={styles.postAside}>{activeSection || spaceReport || <div className={styles.empty}><span aria-hidden="true">◈</span><h3>Le bord est à l’écoute</h3><p>Les contrats acceptés, leur prochaine étape et les membres attendus apparaissent ici. Tu peux préparer ton équipement et visiter les salles entre deux opérations.</p></div>}
            {atCouncil && <div className={styles.generalWar}><h3>Guerre des clans</h3><p>Le conseil conserve l’accès aux campagnes stratégiques générales du clan.</p>
              <button type="button" className={styles.secondary} disabled={suspended} data-clan-general-war onClick={onClanWar}>Ouvrir la guerre des clans</button>
            </div>}
          </section>
        </div>}

        {tab === 'contracts' && <>
          {activeSection}
          {spaceReport}
          <div className={styles.operationLayout}>
            <section className={styles.catalogue} aria-label="Contrats du clan">
              {CLAN_SHIP_CONTRACTS.filter(contract => contract.kind !== 'onboarding').map(contract => {
                const access = evaluateClanShipContract(state, contract.id, save);
                return <button key={contract.id} type="button" className={styles.contractCard} disabled={suspended}
                  aria-pressed={selectedId === contract.id} data-clan-contract-card={contract.id} onClick={() => setSelectedId(contract.id)}>
                  <span>{KINDS[contract.kind]}</span><strong>{contract.name}</strong><small>{contract.summary}</small>
                  <em>{completed.has(contract.id) ? 'Accompli' : activeContract?.id === contract.id ? 'En cours' : access.allowed ? 'Disponible' : 'Condition à remplir'}</em>
                </button>;
              })}
            </section>
            {selection && <article className={styles.briefing} data-clan-contract-detail={selection.id}>
              <span className={styles.eyebrow}>{KINDS[selection.kind]}</span><h3>{selection.name}</h3><p>{selection.briefing}</p>
              <dl><div><dt>Récompense unique</dt><dd>{selection.clanMarksReward} marques de clan</dd></div>
                <div><dt>Attribution</dt><dd>{selection.kind === 'field' ? 'Après une chasse réussie et reconnue' : selection.kind === 'space' ? 'Après l’objectif tactique accompli' : 'Après la dernière intervention enregistrée'}</dd></div>
              </dl>
              {selection.steps.length > 0 && <ol className={styles.missionSteps}>{selection.steps.map(step => <li key={step.id}><strong>{step.label}</strong><span>{CLAN_SHIP_INTERIOR_ROOMS[step.roomId].label}</span></li>)}</ol>}
              {selection.kind === 'field' && <p className={styles.notice}>Objectif : {selection.minimumScans} analyse(s) au cours de la chasse, score d’au moins {selection.minimumScore}. Un ancien record ne valide pas ce contrat.</p>}
              <p className={styles.availability}>{selectionAccess?.reason}</p>
              {atCouncil ? <button type="button" className={styles.primary} disabled={suspended || !selectionAccess?.allowed}
                data-clan-accept-contract={selection.id} onClick={() => act({ type: 'accept-contract', contractId: selection.id, expectedRevision: state.revision })}>
                {completed.has(selection.id) ? 'Dossier accompli' : activeContract?.id === selection.id ? 'Ordre en cours' : 'Accepter cette opération'}
              </button> : routeButton('conseil', 'Rejoindre la table du conseil pour accepter')}
            </article>}
          </div>
        </>}

        {tab === 'crew' && <section aria-label="Équipage du Clan Ship">
          <div className={styles.sectionLead}><h3>Les accords du cercle</h3><p>Accomplis leur dossier, puis rencontre-les pour proposer un recrutement. Un nouvel accord ouvre la réserve ; choisis ensuite l’affectation dans le registre des compagnons, au quai. Seuls les membres disponibles au Clan Ship contribuent au départ des opérations spatiales.</p></div>
          <div className={styles.crewGrid}>{CLAN_SHIP_RECRUITS.map(npc => {
            const joined = state.recruitedNpcIds.includes(npc.id);
            const access = evaluateClanShipRecruit(state, npc.id);
            const residence = save.companionResidence?.members.find(member => member.id === npc.id);
            const posting = availableCrew.includes(npc.id) ? 'Disponible au Clan Ship' : residence?.relation === 'suspended' ? 'Affectation suspendue'
              : residence?.assignment ? `Affecté : ${companionHostLabel(residence.assignment)}` : 'Recruté · réserve du réseau';
            const dialogue = selectClanShipCrewDialogue({ ...save, clanShipOperations: state }, npc.id, {
              roomId, focusedNpcId: suspended ? null : crewFocus ?? null,
            });
            const dialogueKey = `${npc.id}:${dialogue.context}:${dialogue.line}:${dialogue.facts.join('|')}`;
            return <article key={npc.id} tabIndex={-1} className={styles.crewCard} data-clan-recruit={npc.id} data-clan-recruit-status={joined ? 'recruited' : access.allowed ? 'available' : 'locked'}>
              <div className={styles.portrait} aria-hidden="true"><div><HomeworldNpcSpriteV84 npcId={clanShipCrewArtIdentity(npc.id)} role={CLAN_SHIP_CREW_ART_ROLES[npc.id]} height={150} /></div></div>
              <div><span className={styles.eyebrow}>{npc.role}</span><h4>{npc.name}</h4><p>{npc.summary}</p>
                {crewFocus === npc.id && dialogue.status !== 'spoken' && <p className={styles.availability}
                  data-clan-crew-dialogue-unavailable={npc.id}>{dialogue.reason}</p>}
                <p className={styles.crewEffect}>Compétence lorsqu’il est affecté et disponible au clan : {npc.effect}</p>
                <small>{dialogue.targetRoomId ? 'Poste de rencontre' : 'Poste habituel'} : {CLAN_SHIP_INTERIOR_ROOMS[dialogue.targetRoomId ?? npc.roomId].label}</small>
                {joined ? <p className={styles.joined}><strong>{posting}</strong><br />Accord de recrutement enregistré.</p> : <><p className={styles.availability}>{access.reason}</p>
                  {access.allowed && roomId === npc.roomId && <button type="button" className={styles.primary} disabled={suspended}
                    data-clan-recruit-action={npc.id} onClick={() => act({ type: 'recruit', npcId: npc.id, expectedRevision: state.revision })}>Proposer un accord de recrutement</button>
                  }</>}
                {dialogue.status === 'route' && dialogue.targetRoomId && roomId !== dialogue.targetRoomId &&
                  routeButton(dialogue.targetRoomId, joined ? `Rejoindre le poste de ${npc.name}` : `Rencontrer ${npc.name}`)}
              </div>
              {dialogue.status === 'spoken' && dialogue.context && dialogue.line && <section className={styles.crewDialogue}
                aria-label={`Échange avec ${npc.name}`} data-clan-crew-dialogue={npc.id}
                data-clan-crew-dialogue-context={dialogue.context}>
                <span className={styles.eyebrow}>{CREW_DIALOGUE_CONTEXTS[dialogue.context]}</span>
                <blockquote id={`clan-crew-dialogue-${npc.id}`}>{dialogue.line}</blockquote>
                {dialogue.facts.length > 0 && <ul className={styles.dialogueFacts} aria-label="Repères du dossier">
                  {dialogue.facts.map(fact => <li key={fact}>{fact}</li>)}
                </ul>}
                <button type="button" className={styles.secondary} disabled={suspended}
                  aria-describedby={`clan-crew-dialogue-${npc.id}`} data-clan-crew-dialogue-ack={npc.id} onClick={() => {
                    if (suspended) return;
                    setHeardDialogue(dialogueKey);
                    setFeedback('Tu prends acte de cet échange.');
                  }}>J’ai entendu</button>
                {heardDialogue === dialogueKey && <small className={styles.dialogueHeard}>Paroles entendues.</small>}
              </section>}
            </article>;
          })}</div>
          {!state.circleConfirmed && state.recruitedNpcIds.length === CLAN_SHIP_RECRUITS.length && <div className={styles.step}>
            <p>Les six membres ont conclu leur accord de recrutement. Présente le cercle au conseil après avoir accompli au moins une chasse de clan et une opération spatiale.</p>
            {atCouncil ? <button type="button" disabled={suspended} className={styles.primary} data-clan-confirm-circle
              onClick={() => act({ type: 'confirm-circle', expectedRevision: state.revision })}>Confirmer le cercle du clan</button> : routeButton('conseil')}
          </div>}
        </section>}

        {tab === 'journal' && <div className={styles.postLayout}>
          <section><span className={styles.eyebrow}>CHRONIQUE DE SERVICE</span><h3>Les preuves du clan</h3>
            {state.completedContracts.length ? <ol className={styles.receipts}>{state.completedContracts.map(receipt => <li key={receipt.contractId}>
              <span aria-hidden="true">✓</span><div><strong>{clanShipContract(receipt.contractId)?.name}</strong><p>{KINDS[receipt.proof.kind]} · récompense déjà attribuée</p></div>
            </li>)}</ol> : <p>Aucun dossier achevé. L’accueil du bord ouvre le premier chapitre.</p>}
          </section>
          <section className={styles.lore}><span className={styles.eyebrow}>REPÈRES DE LORE</span><h3>La doctrine de ce clan</h3>
            <p>Le rite initiatique, le rôle d’un Ancien et les projections à bord s’appuient sur <cite>Alien vs. Predator</cite>. Les affrontements entre vaisseaux apparaissent aussi dans <cite>The Predator</cite>.</p>
            <p>Cette table, le mandat, les contrats et les six membres d’équipage sont des adaptations originales du projet. Les jauges tactiques servent le jeu ; elles ne décrivent pas les performances canoniques du vaisseau AVP.</p>
            <p>Le conseil t’accorde des responsabilités. Le Clan Ship reste collectif, ton vaisseau reste personnel et le château orbital de Wolf conserve son propre parcours.</p>
            {state.circleConfirmed && <div className={styles.notice}><strong>Cercle confirmé</strong><p>Le conseil reconnaît les opérations accomplies et l’équipage rassemblé.</p></div>}
          </section>
        </div>}
      </div>
      <footer className={styles.footer}><p role="status" aria-live="polite">{feedback || (temporarySession
        ? 'Essai temporaire : les ordres restent en mémoire jusqu’au prochain reset ou changement de destination. Échap : retour au pont.'
        : 'Chaque ordre confirmé est conservé avec ta campagne. Échap : retour au pont.')}</p><span>CLAN SHIP / CONSEIL</span></footer>
    </section>
  </div>;
}
