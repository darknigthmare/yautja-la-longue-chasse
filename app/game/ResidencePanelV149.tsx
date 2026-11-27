"use client";
/**
 * V149 — panneau de la demeure (BUILD5-07), affiché dans l'intérieur d'une
 * Demeure du village. Il n'écrit rien lui-même : chaque geste passe par
 * `onAction`, qui ne met à jour l'écran qu'après l'écriture confirmée.
 */
import { useState } from "react";
import type { TrophyRecord } from "./types";
import { trophyIntroductionMission } from "./systems/trophyIntroductionR2M038";
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

export default function ResidencePanelV149({ house, residence, rankId, disabled, regionAllowed, onAction, threshold = false, displayedTrophies = [] }: {
  house: ResidenceHouseV149;
  residence: unknown;
  rankId: string;
  disabled: boolean;
  threshold?: boolean;
  displayedTrophies?: readonly TrophyRecord[];
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
  const unmounted = state.objects.filter(object => object.location.kind === "unmounted" && object.location.returnTo.houseId === house.id);
  const displayed = here.some(object => object.location.kind === "room" && object.location.slotId === "display");
  const destinations = state.rights.filter(id => id !== house.id).map(id => {
    const target = houseV149(id)!;
    return { target, rights: residenceAccessV149(state, target.id, context) };
  });

  if (threshold) {
    const packingHere = transfer?.stage === "packing" && transfer.fromHouseId === house.id;
    const arrivingHere = transfer?.stage === "in-transit" && transfer.toHouseId === house.id;
    return <section className={styles.panel} data-residence-threshold-panel={house.id}>
      <h3>{house.title}</h3>
      {packingHere && <>
        <p>{packed.length} pièce(s) dans le contenant. {unmounted.length || displayed ? "Range l’exposé décroché à l’intérieur." : "Le contenant peut partir."}</p>
        <button type="button" disabled={disabled || displayed || unmounted.length > 0} data-residence-depart
          onClick={() => act({ kind: "depart" })}>Confirmer le départ au seuil</button>
      </>}
      {arrivingHere && <>
        <p>{packed.length} pièce(s) sont arrivées dans le contenant de {houseV149(transfer.fromHouseId)?.title}.</p>
        <button type="button" disabled={disabled || !access.inhabit} data-residence-arrive
          onClick={() => act({ kind: "arrive" })}>Confirmer l’arrivée au seuil</button>
      </>}
      {access.active && transfer?.stage !== "in-transit" && <button type="button" disabled={disabled || !access.inhabit}
        data-residence-stay onClick={() => act({ kind: "stay" })}>Rester dans cette résidence</button>}
      {access.active && transfer?.stage === "in-transit" && <p>Le contenant est en route vers {houseV149(transfer.toHouseId)?.title}.</p>}
      {state.lastChoice?.houseId === house.id && <p data-residence-choice={state.lastChoice.kind}>
        {state.lastChoice.kind === "stay" ? "Résidence actuelle confirmée." : "Emménagement confirmé à ce seuil."}
      </p>}
      {message && <p role="status" className={styles.message}>{message}</p>}
    </section>;
  }

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

      {transfer?.stage === "in-transit" && transfer.toHouseId === house.id && <p className={styles.note}>
        Le contenant attend au seuil. Rejoins la porte pour confirmer son arrivée.
      </p>}

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
                {slot === "display" && displayedTrophies.length > 0 && <ul data-residence-trophy-shelf aria-label="Étagère des prises">
                  {displayedTrophies.map(trophy => <li key={trophy.id}>
                    {trophy.targetName} · {trophyIntroductionMission(trophy.missionId)?.planetName}
                  </li>)}
                </ul>}
                {!transfer && <span className={styles.moves}>{placeable.filter(object => object.location.kind !== "room" || object.location.slotId !== slot).map(object =>
                  <button key={object.id} disabled={disabled} data-residence-place={`${object.id}>${slot}`} onClick={() => act({ kind: "place", objectId: object.id, slotId: slot })}>Poser : {object.label}</button>)}</span>}
              </li>;
            })}
          </ul>
        </div>}

        <div className={styles.block}>
          <h4>Déménagement</h4>
          {!transfer && (destinations.length ? <table className={styles.residenceComparison} data-residence-rights>
            <caption>Comparer les droits de résidence</caption>
            <thead><tr><th scope="col">Demeure</th><th scope="col">Rang minimal</th><th scope="col">Respect pour habiter</th><th scope="col">Choix</th></tr></thead>
            <tbody>
              <tr><th scope="row">{house.title}</th><td>{RANK_LABELS[house.minimumRank]}</td>
                <td>{access.respect}/{house.respect.inhabit}</td><td>Résidence active</td></tr>
              {destinations.map(({ target, rights }) => <tr key={target.id}><th scope="row">{target.title}</th><td>{RANK_LABELS[target.minimumRank]}</td>
                <td>{rights.respect}/{target.respect.inhabit}</td><td>{rights.inhabit
                  ? <button type="button" disabled={disabled} data-residence-transfer={target.id}
                      onClick={() => act({ kind: "start-transfer", toHouseId: target.id })}>Préparer le départ</button>
                  : rights.missing.join(" ")}</td></tr>)}
            </tbody>
          </table> : <p className={styles.note}>Un autre droit de résidence est nécessaire ({RESIDENCE_HOUSES_V149.length} demeures dans le monde natal).</p>)}
          {transfer?.stage === "packing" && <>
            <p>Contenant pour {houseV149(transfer.toHouseId)?.title} · {packed.length} pièce(s).</p>
            <ul className={styles.slots}>
              {here.map(object => <li key={object.id}>{object.label} {object.location.kind === "room" && object.location.slotId === "display"
                ? <button type="button" disabled={disabled} data-residence-unmount={object.id}
                    onClick={() => act({ kind: "unmount", objectId: object.id })}>Décrocher</button>
                : <button type="button" disabled={disabled} data-residence-pack={object.id}
                    onClick={() => act({ kind: "pack", objectId: object.id })}>Mettre dans le contenant</button>}</li>)}
              {unmounted.map(object => <li key={object.id} data-residence-unmounted={object.id}>{object.label} (décroché)
                <button type="button" disabled={disabled} data-residence-pack={object.id}
                  onClick={() => act({ kind: "pack", objectId: object.id })}>Mettre dans le contenant</button>
                <button type="button" disabled={disabled} data-residence-unpack={object.id}
                  onClick={() => act({ kind: "unpack", objectId: object.id })}>Raccrocher</button>
              </li>)}
              {packed.map(object => <li key={object.id} data-residence-packed={object.id}>{object.label} (dans le contenant)
                <button type="button" disabled={disabled} data-residence-unpack={object.id}
                  onClick={() => act({ kind: "unpack", objectId: object.id })}>Remettre en place</button></li>)}
            </ul>
            <p>Confirme le départ ou le choix de rester en revenant à la porte.</p>
            <button type="button" disabled={disabled} onClick={() => act({ kind: "cancel-transfer" })}>Annuler la préparation</button>
          </>}
          {transfer?.stage === "in-transit" && <p>Charge en route vers {houseV149(transfer.toHouseId)?.title} : confirme l’arrivée à son seuil. Cette maison reste active jusque-là.</p>}
        </div>

      </>}
      {message && <p role="status" className={styles.message}>{message}</p>}
    </section>
  );
}
