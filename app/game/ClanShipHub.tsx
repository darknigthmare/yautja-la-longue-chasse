"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { KeyboardEvent } from "react";
import type { SaveGame } from "./types";
import { shipForId, shipProfileAssetPath, type ShipId } from "./shipCatalogue";
import type { ClanShipDockingState, ClanShipDockingAction, ClanShipRoomId } from "./systems/clanShipDocking";
import { useMenuGamepad } from "./useMenuGamepad";
import styles from "./ClanShipHub.module.css";

export type ClanShipService = "armory" | "trophies" | "medbay" | "training" | "codex" | "clan-war";

export interface ClanShipHubProps {
  state: ClanShipDockingState;
  save: SaveGame;
  selectedShipId: ShipId;
  suspended: boolean;
  onAction: (action: ClanShipDockingAction) => boolean;
  onService: (service: ClanShipService) => void;
  onExit: () => void;
  onOpenSettings: () => void;
}

type Room = { id: ClanShipRoomId; name: string; detail: string; action: string; service?: ClanShipService; number: string };
const ROOMS: readonly Room[] = [
  { id: "hangar", name: "Hangar", detail: "Ton vaisseau personnel reste amarré ici. Rejoins son pont avant de reprendre le vol.", action: "Rejoindre mon vaisseau", number: "01" },
  { id: "conseil", name: "Conseil du clan", detail: "Consulte la guerre des clans et les opérations de ton clan.", action: "Accéder à la guerre des clans", service: "clan-war", number: "02" },
  { id: "armurerie", name: "Armurerie", detail: "Prépare ton équipement et consulte les armes disponibles pour ta prochaine chasse.", action: "Ouvrir l’armurerie", service: "armory", number: "03" },
  { id: "trophees", name: "Salle des trophées", detail: "Retrouve les trophées et les traces de tes chasses.", action: "Voir mes trophées", service: "trophies", number: "04" },
  { id: "soins", name: "Baie médicale", detail: "Consulte ton état et les soins disponibles avant de repartir.", action: "Accéder aux soins", service: "medbay", number: "05" },
  { id: "archives", name: "Archives", detail: "Consulte le codex et les connaissances réunies au fil de tes chasses.", action: "Ouvrir le codex", service: "codex", number: "06" },
  { id: "entrainement", name: "Entraînement", detail: "Rejoins l’espace d’entraînement pour préparer tes prochains combats.", action: "Commencer l’entraînement", service: "training", number: "07" },
];
const STATUS = {
  "free-flight": { label: "En vol libre", title: "Rejoins le vaisseau du clan", detail: "Approche le vaisseau-mère AVP pour rejoindre son hangar et accéder aux salles du clan.", action: "Approcher le Clan Ship", type: "approach" },
  approach: { label: "En approche", title: "Le hangar est à portée", detail: "Ton vaisseau personnel est en approche du Clan Ship. Confirme l’amarrage pour établir la liaison.", action: "Amarrer le vaisseau", type: "dock" },
  docked: { label: "Vaisseau amarré", title: "La liaison est établie", detail: "Ton vaisseau personnel est amarré au vaisseau-mère. Entre dans le Clan Ship ou reprends le vol.", action: "Entrer dans le Clan Ship", type: "board" },
  aboard: { label: "À bord du Clan Ship", title: "Bienvenue à bord", detail: "Choisis une salle du vaisseau-mère pour accéder à ses services.", action: "Rejoindre mon vaisseau", type: "return-to-personal" },
} as const;
const STEPS = ["Approche", "Amarrage", "À bord"];

export default function ClanShipHub({ state, save, selectedShipId, suspended, onAction, onService, onExit, onOpenSettings }: ClanShipHubProps) {
  const rootRef = useRef<HTMLElement>(null);
  const primaryRef = useRef<HTMLButtonElement>(null);
  const [failure, setFailure] = useState<{ signature: string; message: string } | null>(null);
  const signature = `${state.ownerCreatedAt}:${state.status}:${state.roomId}:${state.personalShipId}`;
  const error = failure?.signature === signature ? failure.message : "";
  const aboard = state.status === "aboard";
  const status = STATUS[state.status];
  const personalId = state.status === "free-flight" ? selectedShipId : state.personalShipId;
  const personal = shipForId(personalId);
  const room = ROOMS.find((entry) => entry.id === state.roomId) ?? ROOMS[0];
  const activeStep = state.status === "free-flight" ? -1 : state.status === "approach" ? 0 : state.status === "docked" ? 1 : 2;

  const act = useCallback((action: ClanShipDockingAction) => {
    if (suspended) return;
    if (action.type === "move-room" && action.roomId === state.roomId) return;
    const accepted = onAction(action);
    setFailure(accepted ? null : { signature, message: "La manœuvre n’a pas pu être enregistrée. Réessaie." });
  }, [onAction, signature, state.roomId, suspended]);

  const goBack = useCallback(() => {
    if (suspended) return;
    if (state.status === "aboard") {
      if (state.roomId === "hangar") act({ type: "return-to-personal" });
      else act({ type: "move-room", roomId: "hangar" });
    }
    else if (state.status === "approach") act({ type: "cancel-approach" });
    else onExit();
  }, [act, onExit, state.roomId, state.status, suspended]);

  useMenuGamepad(rootRef, !suspended, `clan-ship-${state.status}`, goBack);

  useEffect(() => {
    if (suspended) return;
    const frame = requestAnimationFrame(() => primaryRef.current?.focus({ preventScroll: true }));
    return () => cancelAnimationFrame(frame);
  }, [state.status, suspended]);

  const onKeyDown = (event: KeyboardEvent<HTMLElement>) => {
    if (suspended || event.repeat || event.defaultPrevented || event.key !== "Escape") return;
    event.preventDefault();
    event.stopPropagation();
    goBack();
  };

  const enterRoomService = () => {
    if (suspended) return;
    if (room.service) onService(room.service);
    else act({ type: "return-to-personal" });
  };

  return (
    <section ref={rootRef} className={styles.hub} aria-label="Clan Ship — vaisseau-mère AVP" aria-hidden={suspended || undefined} data-clan-ship-status={state.status} data-clan-ship-room={state.roomId} onKeyDown={onKeyDown}>
      <header className={styles.header}>
        <div className={styles.identity}>
          <span className={styles.eyebrow}>CLAN SHIP · VAISSEAU DU CLAN</span>
          <h1>Vaisseau-mère AVP</h1>
          <p>{save.profile.hunterName} <span aria-hidden="true">/</span> {status.label}</p>
        </div>
        <div className={styles.headerActions}>
          <button type="button" className={styles.quietButton} disabled={suspended} onClick={() => { if (!suspended) onOpenSettings(); }} aria-label="Ouvrir les paramètres">Paramètres</button>
          <button type="button" className={styles.quietButton} disabled={suspended} onClick={goBack}>{aboard && state.roomId !== "hangar" ? "Rejoindre le hangar" : "Retour au vaisseau personnel"}</button>
        </div>
      </header>

      <div className={styles.body}>
        <div className={styles.overview}>
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
        </div>

        {aboard ? (
          <div className={styles.interior}>
            <div className={styles.sectionHeading}><span className={styles.eyebrow}>À BORD DU VAISSEAU-MÈRE</span><h2>Plan de navigation</h2><p>Sélectionne une salle pour rejoindre ses services.</p></div>
            <nav className={styles.roomGrid} aria-label="Salles du Clan Ship">
              {ROOMS.map((entry) => <button key={entry.id} type="button" className={`${styles.roomButton} ${room.id === entry.id ? styles.roomSelected : ""}`} disabled={suspended} aria-pressed={room.id === entry.id} data-clan-ship-room-target={entry.id} onClick={() => act({ type: "move-room", roomId: entry.id })}><span className={styles.roomNumber}>{entry.number}</span><span>{entry.name}</span><span className={styles.roomMarker} aria-hidden="true">{room.id === entry.id ? "●" : "↗"}</span></button>)}
            </nav>
            <section className={styles.roomDetail} aria-labelledby="clan-ship-room-title">
              <span className={styles.eyebrow}>SALLE {room.number}</span><h3 id="clan-ship-room-title">{room.name}</h3><p>{room.detail}</p>
              <button ref={primaryRef} type="button" className={styles.primaryButton} disabled={suspended} data-clan-ship-action={room.service ? undefined : "return-to-personal"} data-clan-ship-service={room.service} onClick={enterRoomService}>{room.action}<span aria-hidden="true">↗</span></button>
            </section>
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
      <footer className={styles.footer}><p role="status" aria-live="polite">{error || (aboard ? `${room.name} · Ton vaisseau personnel reste au hangar.` : status.label)}</p><span>Tab · Naviguer <b>↵</b> Valider <b>Échap</b> Retour</span></footer>
    </section>
  );
}
