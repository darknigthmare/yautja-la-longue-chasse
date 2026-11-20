"use client";
/**
 * V149 — panneau de la demeure (BUILD5-07), affiché dans l'intérieur d'une
 * Demeure du village. Il n'écrit rien lui-même : chaque geste passe par
 * `onAction`, qui ne met à jour l'écran qu'après l'écriture confirmée.
 */
import { useState } from "react";
import {
  RESIDENCE_HOUSES_V149, RESIDENCE_SLOTS_V149, RESIDENCE_SLOT_IDS_V149, houseMissionActionsV149,
  houseV149, normalizeResidenceV149, emptyResidenceV149, objectsInHouseV149, packedObjectsV149, residenceAccessV149,
  roomsForHouseV149, isFutureResidenceV149,
  type ResidenceActionV149, type ResidenceHouseV149, type ResidenceProofActionV149,
} from "./systems/residenceV149";
import styles from "./ResidencePanelV149.module.css";

const ACTION_LABELS: Record<ResidenceProofActionV149, string> = {
  survey: "trois relevés du territoire",
  track: "observation de l’animal",
  recover: "coffret relevé pendant l’accalmie",
  ward: "deux balises fixées avant le danger",
  challenge: "défi de l’animal",
  report: "rapport vérifié par le pisteur",
};
const RANK_LABELS: Record<string, string> = { unblooded: "Unblooded", "young-blood": "Young Blood", blooded: "Blooded", elite: "Elite" };

export default function ResidencePanelV149({ house, residence, rankId, disabled, regionAllowed, onAction }: {
  house: ResidenceHouseV149;
  residence: unknown;
  rankId: string;
  disabled: boolean;
  regionAllowed(regionId: string): boolean;
  onAction(action: ResidenceActionV149): { ok: boolean; message: string };
}) {
  const [message, setMessage] = useState("");
  const [room, setRoom] = useState<"P1" | "P2" | "P3">("P1");
  if (isFutureResidenceV149(residence))
    return <section className={styles.panel}><p role="alert">Registre de résidence d’une version plus récente : il est conservé sans modification.</p></section>;
  const state = normalizeResidenceV149(residence) ?? emptyResidenceV149();
  const context = { rankId, atHouseId: house.id, regionAllowed };
  const access = residenceAccessV149(state, house.id, context);
  const mission = state.missions[house.id];
  const required = houseMissionActionsV149(house);
  const transfer = state.transfer;
  const act = (action: ResidenceActionV149) => { const result = onAction(action); setMessage(result.message); };
  const rooms = roomsForHouseV149(house.id);
  const shownRoom = rooms.find(entry => entry.id.endsWith(room));
  const here = objectsInHouseV149(state, house.id);
  const placeable = [...here, ...state.objects.filter(object => object.location.kind === "carried")];
  const packed = packedObjectsV149(state);
  const destinations = state.rights.filter(id => id !== house.id).map(id => houseV149(id)!).filter(Boolean);

  return (
    <section className={styles.panel} data-residence-v149={house.id} data-residence-active={access.active || undefined}>
      <header>
        <h3>{house.title}</h3>
        <p className={styles.meta}>Communauté {house.communityId} · clan {house.clanId} · rang {RANK_LABELS[house.minimumRank]} · {house.plan}</p>
      </header>

      <dl className={styles.gauges}>
        <div><dt>Respect local</dt><dd data-residence-respect>{access.respect}/100</dd></div>
        <div><dt>Habiter</dt><dd>{house.respect.inhabit}</dd></div>
        <div><dt>Aménager</dt><dd>{house.respect.furnish}</dd></div>
        <div><dt>Recevoir</dt><dd>{house.respect.receive}</dd></div>
      </dl>
      <p className={styles.status}>
        {access.active ? "Résidence active." : state.activeResidenceId ? `Résidence active ailleurs : ${houseV149(state.activeResidenceId)?.title}.` : "Aucune résidence active."}
        {access.missing.length > 0 && !access.active && <> Manque : {access.missing.join(" ")}</>}
      </p>

      <div className={styles.block}>
        <h4>Mission de seuil — {house.mission.title}</h4>
        <p>{house.mission.actions}</p>
        <p className={styles.note}>Dans une même sortie de la région (proposé) : {required.map(action => ACTION_LABELS[action]).join(", ")}.
          {mission?.status === "active" && <> Fait dans la sortie en cours : {mission.done.length ? mission.done.map(action => ACTION_LABELS[action]).join(", ") : "rien encore"}.</>}</p>
        {!mission && <button disabled={disabled} data-residence-accept onClick={() => act({ kind: "accept" })}>Accepter la mission</button>}
        {mission?.status === "completed" && mission.choice === null && <div className={styles.choices}>
          <p>{house.witnesses} vérifient le résultat. Quel itinéraire le quartier conserve-t-il ?</p>
          {house.mission.choices.map((choice, index) => <button key={choice} disabled={disabled} data-residence-route={index} onClick={() => act({ kind: "route", choice: index })}>{choice}</button>)}
        </div>}
        {mission?.choice != null && <p className={styles.note}>Itinéraire conservé : {house.mission.choices[mission.choice]}.</p>}
      </div>

      {!state.activeResidenceId && access.right && <button disabled={disabled || !access.inhabit} data-residence-activate onClick={() => act({ kind: "activate" })}>Habiter cette maison</button>}

      {transfer?.stage === "in-transit" && transfer.toHouseId === house.id && <div className={styles.block}>
        <h4>Arrivée de la charge de transfert</h4>
        <p>{packed.length} original(aux) en route depuis {houseV149(transfer.fromHouseId)?.title}.</p>
        <button disabled={disabled || !access.inhabit} data-residence-arrive onClick={() => act({ kind: "arrive" })}>Confirmer l’arrivée au seuil</button>
      </div>}

      {access.active && <>
        <nav className={styles.rooms} aria-label="Pièces">
          {rooms.map(entry => { const id = entry.id.slice(-2) as "P1" | "P2" | "P3";
            return <button key={entry.id} aria-pressed={room === id} onClick={() => setRoom(id)}>{entry.title}</button>; })}
        </nav>
        {shownRoom && <div className={styles.block} data-residence-room={shownRoom.id}>
          <p>{shownRoom.interactions}</p>
          <p className={styles.note}>{shownRoom.equipment} {shownRoom.constraint}</p>
          {room === "P2" && <p className={styles.choices}>Couchage :
            <button disabled={disabled} aria-pressed={state.bed[house.id] === 0} onClick={() => act({ kind: "bed", position: 0 })}>près du mur intérieur</button>
            <button disabled={disabled} aria-pressed={state.bed[house.id] === 1} onClick={() => act({ kind: "bed", position: 1 })}>face à l’ouverture</button></p>}
          <ul className={styles.slots}>
            {RESIDENCE_SLOT_IDS_V149.filter(slot => RESIDENCE_SLOTS_V149[slot].room === room).map(slot => {
              const inSlot = here.filter(object => object.location.kind === "room" && object.location.slotId === slot);
              return <li key={slot} data-residence-slot={slot}>
                <b>{RESIDENCE_SLOTS_V149[slot].label}</b>{RESIDENCE_SLOTS_V149[slot].right === "furnish" && ` (respect ${house.respect.furnish})`} : {inSlot.length ? inSlot.map(object => object.label).join(", ") : "libre"}
                {!transfer && <span className={styles.moves}>{placeable.filter(object => object.location.kind !== "room" || object.location.slotId !== slot).map(object =>
                  <button key={object.id} disabled={disabled} data-residence-place={`${object.id}>${slot}`} onClick={() => act({ kind: "place", objectId: object.id, slotId: slot })}>Poser : {object.label}</button>)}</span>}
              </li>;
            })}
          </ul>
        </div>}

        <div className={styles.block}>
          <h4>Déménagement</h4>
          {!transfer && (destinations.length
            ? destinations.map(target => <button key={target.id} disabled={disabled} data-residence-transfer={target.id} onClick={() => act({ kind: "start-transfer", toHouseId: target.id })}>Préparer le départ vers {target.title}</button>)
            : <p className={styles.note}>Un autre droit de résidence est nécessaire ({RESIDENCE_HOUSES_V149.length} demeures dans le monde natal).</p>)}
          {transfer?.stage === "packing" && <>
            <p>Vers {houseV149(transfer.toHouseId)?.title}. Chaque original emballé quitte sa place et rejoint une seule charge.</p>
            <ul className={styles.slots}>
              {here.map(object => <li key={object.id}>{object.label} <button disabled={disabled} data-residence-pack={object.id} onClick={() => act({ kind: "pack", objectId: object.id })}>Emballer</button></li>)}
              {packed.map(object => <li key={object.id}>{object.label} (emballé) <button disabled={disabled} data-residence-unpack={object.id} onClick={() => act({ kind: "unpack", objectId: object.id })}>Remettre en place</button></li>)}
            </ul>
            <button disabled={disabled} data-residence-depart onClick={() => act({ kind: "depart" })}>Confirmer le dernier départ</button>
            <button disabled={disabled} onClick={() => act({ kind: "cancel-transfer" })}>Annuler</button>
          </>}
          {transfer?.stage === "in-transit" && <p>Charge en route vers {houseV149(transfer.toHouseId)?.title} : confirme l’arrivée à son seuil. Cette maison reste active jusque-là.</p>}
        </div>

      </>}
      {message && <p role="status" className={styles.message}>{message}</p>}
    </section>
  );
}
