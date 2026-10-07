"use client";

import { useState } from "react";
import { ARMOR_BY_ID, GEAR_BY_ID, WEAPON_BY_ID } from "./data";
import { shipForId, type ShipId } from "./shipCatalogue";
import type { SaveGame } from "./types";
import {
  SHIP_SPATIAL_STOPS_V85,
  commitShipDepartureV85,
  evaluateShipDepartureV85,
  shipReturnRoomsV85,
  type ShipCommittedDepartureV85,
  type ShipDepartureContextV85,
  type ShipManifestV85,
  type ShipReturnReceiptV85,
} from "./systems/shipOperationsV85";
import styles from "./ShipOperationsPanelV85.module.css";
import ShipManifestExerciseV85 from "./ShipManifestExerciseV85";

export interface ShipOperationPresentationV85 {
  manifest: ShipManifestV85;
  context: ShipDepartureContextV85;
  /** The mission/contract controller consumes the reservation after this callback. */
  onPrepared?: (departure: ShipCommittedDepartureV85) => void;
  returned?: { departure: ShipCommittedDepartureV85; receipt: ShipReturnReceiptV85 };
}
interface ShipOperationsPanelPropsV85 {
  save: SaveGame;
  shipId: ShipId;
  operation?: ShipOperationPresentationV85;
  exerciseSourceUrl?: string;
  suspended?: boolean;
  onOpenMap: () => void;
  onOpenArmory: () => void;
  onOpenArchives: () => void;
  onRoomChange: (room: "medbay" | "training" | "trophy-hall") => void;
}

/** The real equipped kit and received trophies remain the preparation baseline.
 * New spatial contracts provide their own capacities, people and return receipts.
 */
export default function ShipOperationsPanelV85({ save, shipId, operation, exerciseSourceUrl, suspended = false,
  onOpenMap, onOpenArmory, onOpenArchives, onRoomChange }: ShipOperationsPanelPropsV85) {
  const [prospectiveStopId, setProspectiveStopId] = useState<string>(SHIP_SPATIAL_STOPS_V85[0].id);
  const ship = shipForId(shipId);
  const stop = SHIP_SPATIAL_STOPS_V85.find(entry => entry.id === prospectiveStopId)!;
  const ownOperation = operation?.manifest.ownerSaveCreatedAt === save.createdAt && operation.context.ownerSaveCreatedAt === save.createdAt &&
    operation.manifest.shipId === shipId ? operation : undefined;
  const evaluation = ownOperation ? evaluateShipDepartureV85(ownOperation.manifest, ownOperation.context) : null;
  const returned = ownOperation?.returned && ownOperation.returned.receipt.ownerSaveCreatedAt === save.createdAt ? ownOperation.returned : undefined;
  const returnRooms = returned ? shipReturnRoomsV85(returned.departure, returned.receipt) : null;
  const recentTrophies = [...save.trophies].sort((a, b) => b.claimedAt.localeCompare(a.claimedAt)).slice(0, 5);
  const prepared = () => {
    if (!ownOperation?.onPrepared || suspended) return;
    const departure = commitShipDepartureV85(ownOperation.manifest, ownOperation.context);
    if (departure) ownOperation.onPrepared(departure);
  };

  return <section className={styles.panel} aria-labelledby="ship-manifest-title" inert={suspended} data-ship-operations="v85">
    <header><p className="eyebrow">PRÉPARATION ET RETOUR</p><h3 id="ship-manifest-title">Manifeste du {ship.shortName}</h3></header>
    <div className={styles.columns}>
      <article><h4>Voyageur et kit actuel</h4><p><strong>{save.profile.hunterName}</strong> · chasseur</p>
        <ul><li>{ARMOR_BY_ID[save.loadout.armorId].name}</li>
          {save.loadout.weaponIds.map(id => <li key={id}>{WEAPON_BY_ID[id].name}</li>)}
          {save.loadout.gearIds.map(id => <li key={id}>{GEAR_BY_ID[id].name}</li>)}</ul>
        <div className={styles.actions}><button type="button" onClick={onOpenArmory}>Préparer l’armurerie</button><button type="button" onClick={onOpenMap}>Choisir la prochaine chasse</button></div>
      </article>
      <article><h4>Escales des nouvelles opérations</h4><label htmlFor="ship-prospective-stop">Consulter une escale</label>
        <select id="ship-prospective-stop" value={prospectiveStopId} onChange={event => setProspectiveStopId(event.target.value)}>
          {SHIP_SPATIAL_STOPS_V85.map(entry => <option key={entry.id} value={entry.id}>{entry.name}</option>)}
        </select><p>{stop.role}.</p><p className={styles.note}>Un départ vers ces escales demande un contrat, une route confirmée et une capacité établie au chantier. Le catalogue de coques ne constitue pas une flotte possédée.</p>
      </article>
    </div>
    {ownOperation && evaluation && <article className={styles.manifest}>
      <h4>{ownOperation.manifest.kind === "warp" ? "Expédition Warp · branche historique du projet" : "Transport spatial"}</h4>
      <p>{ownOperation.manifest.originId} → {ownOperation.manifest.destinationId}</p>
      <dl className={styles.capacity}><div><dt>Voyageurs</dt><dd>{evaluation.people} / {ownOperation.context.capacity.persons ?? "à établir"}</dd></div>
        <div><dt>Places de soins</dt><dd>{evaluation.wounded} / {ownOperation.context.capacity.medicalPlaces ?? "à établir"}</dd></div>
        <div><dt>Chargement</dt><dd>{evaluation.cargoUnits} / {ownOperation.context.capacity.cargoUnits ?? "à établir"}</dd></div>
        <div><dt>Réserve de retour</dt><dd>{ownOperation.manifest.returnFuelReserve}</dd></div></dl>
      <ul>{ownOperation.manifest.travellers.map(person => <li key={person.id}>{person.name} · {person.condition === "wounded" ? "blessé" : "apte"}</li>)}
        {ownOperation.manifest.cargo.map(item => <li key={item.id}>{item.name} · {item.units} unité(s) · {item.purpose === "loan" || item.purpose === "return" ? "à restituer" : item.purpose === "delivery" ? "à livrer" : "kit personnel"}</li>)}</ul>
      {evaluation.missing.length > 0 && <div><strong>Avant ce départ</strong><ul>{evaluation.missing.map(reason => <li key={reason}>{reason}</li>)}</ul></div>}
      {ownOperation.onPrepared && <button type="button" disabled={suspended || !evaluation.allowed} onClick={prepared}>Confirmer ce manifeste</button>}
    </article>}
    <article><h4>Le retour se poursuit dans le vaisseau</h4>
      <div className={styles.actions}><button type="button" onClick={() => onRoomChange("medbay")}>Infirmerie</button><button type="button" onClick={() => onRoomChange("training")}>Transmission et entraînement</button><button type="button" onClick={onOpenArchives}>Témoignages et archives</button><button type="button" onClick={() => onRoomChange("trophy-hall")}>Galerie des prises</button></div>
      {returnRooms && returned && <div className={styles.return}><p>Témoignage : {returned.receipt.witness}</p>{returnRooms.map(room => <p key={room.stationId}><strong>{room.label}</strong> : {room.personIds.length} personne(s), {room.cargoIds.length} objet(s).</p>)}</div>}
      {recentTrophies.length > 0 && <ul>{recentTrophies.map(trophy => <li key={trophy.id}>{trophy.targetName} · prise rapportée le {new Date(trophy.claimedAt).toLocaleDateString("fr-FR", { timeZone: "UTC" })}</li>)}</ul>}
    </article>
    <ShipManifestExerciseV85 shipId={shipId} hunterName={save.profile.hunterName} sourceUrl={exerciseSourceUrl} />
  </section>;
}
