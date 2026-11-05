"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { SaveGame } from "./types";
import { shipForId, shipProfileAssetPath, type ShipId } from "./shipCatalogue";
import type { ClanShipDockingState, ClanShipDockingAction, ClanShipRoomId } from "./systems/clanShipDocking";
import { CLAN_SHIP_INTERIOR_ROOM_ORDER, CLAN_SHIP_INTERIOR_ROOMS } from "./systems/clanShipInterior";
import { useMenuGamepad } from "./useMenuGamepad";
import ClanShipInterior from "./ClanShipInterior";
import ClanShipOperationsPanel from "./ClanShipOperationsPanel";
import { CLAN_SHIP_ONBOARDING_STEPS, clanShipContract, createClanShipOperations, getClanShipActiveStep, inspectClanShipOperations, type ClanShipNpcId, type ClanShipOperationsAction } from "./systems/clanShipOperations";
import { clanShipIncidentTarget, createClanShipIncidents, getClanShipIncidentStep, inspectClanShipIncidents, type ClanShipIncidentAction, type ClanShipIncidentPhysicalContext } from "./systems/clanShipIncidents";
import styles from "./ClanShipHub.module.css";

export type ClanShipService = "armory" | "trophies" | "medbay" | "training" | "codex" | "clan-war";

export interface ClanShipHubProps {
  state: ClanShipDockingState;
  save: SaveGame;
  selectedShipId: ShipId;
  suspended: boolean;
  temporarySession?: boolean;
  onAction: (action: ClanShipDockingAction) => boolean;
  onOperations?: (action: ClanShipOperationsAction) => boolean;
  onIncident?: (action: ClanShipIncidentAction, physical?: ClanShipIncidentPhysicalContext) => boolean;
  onService: (service: ClanShipService) => void;
  onExit: () => void;
  onOpenSettings: () => void;
}

type Room = { id: ClanShipRoomId; name: string; detail: string; action: string; service?: ClanShipService; number: string };
const ROOM_DETAILS: Readonly<Record<ClanShipRoomId, Omit<Room, "id" | "number">>> = {
  hangar: { name: "Hangar", detail: "Ton vaisseau personnel reste amarré ici. Rejoins son pont avant de reprendre le vol.", action: "Rejoindre mon vaisseau" },
  armurerie: { name: "Armurerie", detail: "Prépare ton équipement et consulte les armes disponibles pour ta prochaine chasse.", action: "Ouvrir l’armurerie", service: "armory" },
  entrainement: { name: "Entraînement", detail: "Rejoins l’espace d’entraînement pour préparer tes prochains combats.", action: "Commencer l’entraînement", service: "training" },
  conseil: { name: "Conseil du clan", detail: "La table holo rassemble les contrats, les engagements spatiaux, l’équipage et la guerre des clans.", action: "Ouvrir la table holo du clan", service: "clan-war" },
  archives: { name: "Archives", detail: "Consulte le codex et les connaissances réunies au fil de tes chasses.", action: "Ouvrir le codex", service: "codex" },
  trophees: { name: "Salle des trophées", detail: "Retrouve les trophées et les traces de tes chasses.", action: "Voir mes trophées", service: "trophies" },
  soins: { name: "Baie médicale", detail: "Consulte ton état et les soins disponibles avant de repartir.", action: "Accéder aux soins", service: "medbay" },
};
const ROOMS: readonly Room[] = CLAN_SHIP_INTERIOR_ROOM_ORDER.map((id, index) => ({
  ...ROOM_DETAILS[id], id, number: String(index + 1).padStart(2, "0"),
}));
const STATUS = {
  "free-flight": { label: "En vol libre", title: "Rejoins le vaisseau du clan", detail: "Approche le vaisseau-mère AVP pour rejoindre son hangar et accéder aux salles du clan.", action: "Approcher le Clan Ship", type: "approach" },
  approach: { label: "En approche", title: "Le hangar est à portée", detail: "Ton vaisseau personnel est en approche du Clan Ship. Confirme l’amarrage pour établir la liaison.", action: "Amarrer le vaisseau", type: "dock" },
  docked: { label: "Vaisseau amarré", title: "La liaison est établie", detail: "Ton vaisseau personnel est amarré au vaisseau-mère. Entre dans le Clan Ship ou reprends le vol.", action: "Entrer dans le Clan Ship", type: "board" },
  aboard: { label: "À bord du Clan Ship", title: "Bienvenue à bord", detail: "Parcours les salles du vaisseau-mère pour accéder aux installations du clan.", action: "Rejoindre mon vaisseau", type: "return-to-personal" },
} as const;
const STEPS = ["Approche", "Amarrage", "À bord"];

export default function ClanShipHub({ state, save, selectedShipId, suspended, temporarySession = false, onAction, onOperations, onIncident, onService, onExit, onOpenSettings }: ClanShipHubProps) {
  const rootRef = useRef<HTMLElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const [failure, setFailure] = useState<{ signature: string; message: string } | null>(null);
  const [targetRoomId, setTargetRoomId] = useState<ClanShipRoomId | null>(null);
  const [operationsOpen, setOperationsOpen] = useState(false);
  const [incidentPanelOpen, setIncidentPanelOpen] = useState(false);
  const [crewFocus, setCrewFocus] = useState<ClanShipNpcId | null>(null);
  const operationsInspection = inspectClanShipOperations(save.clanShipOperations, save.createdAt);
  const operations = operationsInspection.state ?? (operationsInspection.status === 'absent' ? createClanShipOperations(save.createdAt) : null);
  const operationStep = operations ? CLAN_SHIP_ONBOARDING_STEPS[operations.onboardingStep] ?? getClanShipActiveStep(operations) : null;
  const activeContract = operations?.activeContract ? clanShipContract(operations.activeContract.contractId) : null;
  const incidentInspection = inspectClanShipIncidents(save.clanShipIncidents, save.createdAt);
  const incidents = incidentInspection.state ?? (incidentInspection.status === 'absent' ? createClanShipIncidents(save.createdAt) : null);
  const incidentStep = incidents ? getClanShipIncidentStep(incidents) : null;
  const incidentTarget = incidentStep ? clanShipIncidentTarget(incidentStep.targetId) : null;
  const signature = `${state.ownerCreatedAt}:${state.status}:${state.roomId}:${state.personalShipId}`;
  const error = failure?.signature === signature ? failure.message : "";
  const aboard = state.status === "aboard";
  const status = STATUS[state.status];
  const personalId = state.status === "free-flight" ? selectedShipId : state.personalShipId;
  const personal = shipForId(personalId);
  const room = ROOMS.find((entry) => entry.id === state.roomId) ?? ROOMS[0];
  const activeStep = state.status === "free-flight" ? -1 : state.status === "approach" ? 0 : state.status === "docked" ? 1 : 2;

  const act = useCallback((action: ClanShipDockingAction) => {
    if (suspended) return false;
    if (action.type === "move-room" && action.roomId === state.roomId) return true;
    const accepted = onAction(action);
    setFailure(accepted ? null : { signature, message: "La manœuvre n’a pas pu être enregistrée. Réessaie." });
    return accepted;
  }, [onAction, signature, state.roomId, suspended]);

  const goBack = useCallback(() => {
    if (suspended || incidentPanelOpen) return;
    if (state.status === "aboard") {
      // A destination is a walking route. Only the interaction at the berth
      // can transfer the hunter back to the personal ship.
      setTargetRoomId("hangar");
    }
    else if (state.status === "approach") act({ type: "cancel-approach" });
    else onExit();
  }, [act, incidentPanelOpen, onExit, state.status, suspended]);

  useMenuGamepad(rootRef, !suspended && !aboard, `clan-ship-${state.status}`, goBack);

  useEffect(() => {
    if (suspended || aboard) return;
    const frame = requestAnimationFrame(() => primaryRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [state.status, suspended, aboard]);

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (suspended || aboard || event.repeat || event.defaultPrevented || event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    goBack();
  };

  const enterRoomService = useCallback(() => {
    if (suspended) return;
    if (state.roomId === 'conseil' && onOperations && operations) { setCrewFocus(null); setOperationsOpen(true); return; }
    if (room.service) onService(room.service);
  }, [onService, onOperations, operations, room.service, state.roomId, suspended]);
  const openOperations = useCallback((npcId?: ClanShipNpcId) => {
    if (!suspended && !incidentPanelOpen && onOperations && operations) { setCrewFocus(npcId ?? null); setOperationsOpen(true); }
  }, [incidentPanelOpen, onOperations, operations, suspended]);
  const closeOperations = useCallback(() => setOperationsOpen(false), []);
  useEffect(() => {
    if (suspended || operationsOpen || incidentPanelOpen || !aboard) return;
    const frame = requestAnimationFrame(() => rootRef.current?.querySelector<HTMLElement>('[data-interior-world]')?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [aboard, incidentPanelOpen, operationsOpen, suspended]);
  const changeInteriorRoom = useCallback((roomId: ClanShipRoomId) => act({ type: "move-room", roomId }), [act]);
  const returnToPersonal = useCallback(() => { act({ type: "return-to-personal" }); }, [act]);
  const clearTarget = useCallback(() => setTargetRoomId(null), []);
  const targetName = ROOMS.find((entry) => entry.id === targetRoomId)?.name;

  return (
    <section ref={rootRef} className={`${styles.hub} ${aboard ? styles.hubAboard : ""}`} aria-label="Clan Ship — vaisseau-mère AVP" aria-hidden={suspended || undefined} data-clan-ship-status={state.status} data-clan-ship-room={state.roomId} data-clan-ship-target={targetRoomId ?? undefined} onKeyDown={onKeyDown}>
      <header className={styles.header} inert={operationsOpen || incidentPanelOpen || suspended}>
        <div className={styles.identity}>
          <span className={styles.eyebrow}>CLAN SHIP · VAISSEAU DU CLAN</span>
          <h1>{aboard ? room.name : "Vaisseau-mère AVP"}</h1>
          <p>{save.profile.hunterName} <span aria-hidden="true">/</span> {aboard ? `${personal.name} · amarré au hangar` : status.label}</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.quietButton} disabled={suspended} onClick={() => { if (!suspended) onOpenSettings(); }} aria-label="Ouvrir les paramètres">Paramètres</button>
          <button type="button" className={styles.quietButton} disabled={suspended} onClick={goBack}>{aboard ? "Rejoindre le hangar" : "Retour au vaisseau personnel"}</button>
        </div>
      </header>

      <div className={aboard ? styles.aboardBody : styles.body} inert={operationsOpen || suspended}>
        {!aboard && <div className={styles.overview}>
          <div className={styles.shipScene}>
            <div className={styles.sceneHeading}><span className={styles.eyebrow}>DESTINATION</span><span className={styles.statusBadge}>{status.label}</span></div>
            {/* Existing catalogue art keeps the clan ship distinct from the personal hull. */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className={styles.mothership} src={shipProfileAssetPath("avp-predator-mothership")} alt="Silhouette du grand vaisseau-mère AVP du clan" draggable={false} />
            <div className={styles.shipCaption}><strong>Vaisseau-mère AVP</strong><span>Vaisseau du clan</span></div>
            <div className={styles.personalShip}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={shipProfileAssetPath(personalId)} alt={`Ton vaisseau personnel : ${personal.name}`} draggable={false} />
              <div><span className={styles.eyebrow}>TON VAISSEAU PERSONNEL</span><strong>{personal.name}</strong><span>{state.status === "docked" || aboard ? "Amarré au Clan Ship" : state.status === "approach" ? "En approche du hangar" : "Prêt pour l’approche"}</span></div>
            </div>
          </div>
          <ol className={styles.steps} aria-label="Étapes de la liaison au Clan Ship">
            {STEPS.map((step, index) => <li key={step} className={index <= activeStep ? styles.stepActive : ""} aria-current={index === activeStep ? "step" : undefined}><span>{String(index + 1).padStart(2, "0")}</span>{step}</li>)}
          </ol>
        </div>}

        {aboard ? (
          <div className={styles.interior}>
            <div className={styles.routeHeading} inert={incidentPanelOpen}><span className={styles.eyebrow}>Salles du Clan Ship</span><p>{targetName ? `Itinéraire vers ${targetName}` : "Choisis une salle pour t’y rendre à pied."}</p>{targetRoomId && <button type="button" disabled={suspended} onClick={clearTarget}>Arrêter le guidage</button>}</div>
            <nav className={styles.roomNavigation} aria-label="Salles du Clan Ship" inert={incidentPanelOpen}>
              {ROOMS.map((entry) => <button key={entry.id} type="button" className={`${styles.roomButton} ${room.id === entry.id ? styles.roomSelected : ""} ${targetRoomId === entry.id ? styles.roomTarget : ""}`} disabled={suspended} aria-pressed={room.id === entry.id} aria-label={`${entry.name} · itinéraire à pied`} data-clan-ship-room-target={entry.id} onClick={() => setTargetRoomId(entry.id)}><span className={styles.roomNumber}>{entry.number}</span><span>{entry.name}</span><span className={styles.roomMarker} aria-hidden="true">{targetRoomId === entry.id ? "↗" : room.id === entry.id ? "●" : ""}</span></button>)}
            </nav>
            {onIncident && incidents?.activeIncident && incidentStep && incidentTarget ? <div className={styles.operationObjective} data-clan-incident-objective inert={incidentPanelOpen}>
              <div><span className={styles.eyebrow}>INTERVENTION À BORD</span><strong>{incidentStep.label}</strong>
                <p>{CLAN_SHIP_INTERIOR_ROOMS[incidentTarget.roomId].label} · {incidentStep.description}</p>
              </div>
              <button type="button" disabled={suspended || incidentPanelOpen} data-clan-incident-next-route={incidentTarget.roomId}
                onClick={() => setTargetRoomId(incidentTarget.roomId)}>Rejoindre l’intervention</button>
            </div> : onOperations && operations && <div className={styles.operationObjective} data-clan-operation-objective inert={incidentPanelOpen}>
              <div><span className={styles.eyebrow}>{operations.mandateAccepted ? 'OPÉRATIONS DU CLAN' : 'ACCUEIL DU BORD'}</span>
                <strong>{operationStep?.label ?? activeContract?.name ?? (operations.mandateAccepted ? 'Choisir un dossier à la table du conseil' : 'Recevoir le mandat du conseil')}</strong>
                <p>{operationStep ? CLAN_SHIP_INTERIOR_ROOMS[operationStep.roomId].label : activeContract?.kind === 'field' ? 'Retour au hangar, puis désamarrage avant la chasse.' : `${operations.recruitedNpcIds.length} membres affectés · ${operations.completedContracts.length} dossiers accomplis`}</p>
              </div>
              <button type="button" disabled={suspended} onClick={() => setTargetRoomId(operationStep?.roomId ?? (activeContract?.kind === 'field' ? 'hangar' : 'conseil'))}>
                Rejoindre le prochain poste
              </button>
            </div>}
            <ClanShipInterior
              roomId={state.roomId}
              save={save}
              personalShipId={personalId}
              suspended={suspended || operationsOpen}
              onRoomChange={changeInteriorRoom}
              onService={enterRoomService}
              onOperations={onOperations && operations ? openOperations : undefined}
              onIncident={onIncident && incidents ? onIncident : undefined}
              onIncidentPanelOpenChange={setIncidentPanelOpen}
              onReturnToPersonal={returnToPersonal}
              onOpenSettings={onOpenSettings}
              targetRoomId={targetRoomId}
              onNavigateTarget={setTargetRoomId}
              onTargetReached={clearTarget}
              onTargetCancelled={clearTarget}
            />
          </div>
        ) : (
          <section className={styles.dockingPanel} aria-labelledby="clan-ship-docking-title">
            <span className={styles.eyebrow}>LIAISON AU CLAN SHIP</span><h2 id="clan-ship-docking-title">{status.title}</h2><p>{status.detail}</p>
            <div className={styles.destinationNote}><span>Après l’entrée</span><strong>Sept salles à explorer</strong><p>Hangar, conseil du clan, armurerie, trophées, baie médicale, archives et entraînement.</p></div>
            <button ref={primaryRef} type="button" className={styles.primaryButton} disabled={suspended} data-clan-ship-action={status.type} onClick={() => act({ type: status.type })}>{status.action}<span aria-hidden="true">→</span></button>
            {state.status === "approach" && <button type="button" className={styles.secondaryButton} disabled={suspended} data-clan-ship-action="cancel-approach" onClick={() => act({ type: "cancel-approach" })}>Annuler l’approche</button>}
            {state.status === "docked" && <button type="button" className={styles.secondaryButton} disabled={suspended} data-clan-ship-action="undock" onClick={() => act({ type: "undock" })}>Désamarrer</button>}
          </section>
        )}
      </div>
      <footer className={styles.footer} inert={operationsOpen || incidentPanelOpen || suspended}><p role="status" aria-live="polite">{error || (aboard ? `${room.detail} ${temporarySession ? 'Ta salle est conservée pendant cet essai.' : 'Ta salle est sauvegardée à chaque passage.'}` : status.label)}</p>{!aboard && <span>Tab · Naviguer <b>↵</b> Valider <b>Échap</b> Retour</span>}</footer>
      {aboard && operationsOpen && operations && onOperations && <ClanShipOperationsPanel
        state={operations} save={save} roomId={state.roomId} suspended={suspended} crewFocus={crewFocus} temporarySession={temporarySession}
        onAction={onOperations} onIncident={onIncident} incidents={incidents} onClose={closeOperations}
        onNavigate={roomId => { setOperationsOpen(false); setTargetRoomId(roomId); }}
        onClanWar={() => { if (!suspended && state.roomId === 'conseil') { setOperationsOpen(false); onService('clan-war'); } }}
      />}
    </section>
  );
}
