"use client";
/**
 * V150 — vie de la maison (BUILD5-08) : invitations, état du seuil, rappels.
 * Affiché sous le panneau de la demeure, seulement pour la résidence active.
 */
import { useState } from "react";
import { houseV149, normalizeResidenceV149, emptyResidenceV149, residenceAccessV149, type ResidenceHouseV149 } from "./systems/residenceV149";
import {
  GUEST_IDS_V150, GUEST_PLACES_V150, emptyResidenceLifeV150, guestResidentV150, isFutureResidenceLifeV150,
  normalizeResidenceLifeV150, remindersV150,
} from "./systems/residenceLifeV150";
import type { HomeworldRegionIdV68 } from "./systems/homeworldRegionsV68";
import styles from "./ResidencePanelV149.module.css";

type LifeAction = { kind: "invite"; guestId: string } | { kind: "inspect" } | { kind: "read"; id: string };

export default function ResidenceLifePanelV150({ house, residence, life, rankId, disabled, regionAllowed, onAction }: {
  house: ResidenceHouseV149;
  residence: unknown;
  life: unknown;
  rankId: string;
  disabled: boolean;
  regionAllowed(regionId: string): boolean;
  onAction(action: LifeAction): { ok: boolean; message: string };
}) {
  const [message, setMessage] = useState("");
  if (isFutureResidenceLifeV150(life)) return null;
  const state = normalizeResidenceV149(residence) ?? emptyResidenceV149();
  if (state.activeResidenceId !== house.id) return null;
  const lifeState = normalizeResidenceLifeV150(life) ?? emptyResidenceLifeV150();
  const context = { rankId, atHouseId: house.id, regionAllowed };
  const access = residenceAccessV149(state, house.id, context);
  const regionId = house.regionId as HomeworldRegionIdV68;
  const pending = lifeState.visits.filter(visit => visit.houseId === house.id);
  const room = lifeState.rooms[house.id];
  const reminders = remindersV150(lifeState, state, context);
  const history = lifeState.history.filter(entry => entry.houseId === house.id).slice(-3);
  const act = (action: LifeAction) => { const result = onAction(action); if (result.message) setMessage(result.message); };

  return (
    <section className={styles.panel} data-residence-life-v150={house.id}>
      <h3>Vie de la maison</h3>
      {room && room.threshold !== "ordered" && <div className={styles.block} data-residence-threshold-mark>
        <p>Une marque attend au seuil.</p>
        <button disabled={disabled} data-residence-inspect onClick={() => act({ kind: "inspect" })}>Lire la marque</button>
      </div>}

      <div className={styles.block}>
        <h4>Invitations</h4>
        <p className={styles.note}>L’invité part de chez lui, suit le chemin du village jusqu’à ta porte, prend une place libre puis repart par le même chemin. Il ne devient pas occupant.
          {access.receive ? " Seuil « recevoir » atteint : deux invités à la fois." : " Une visite à la fois avant le seuil « recevoir »."}</p>
        <div className={styles.choices}>
          {GUEST_IDS_V150.map(id => { const resident = guestResidentV150(regionId, id); if (!resident) return null;
            const waiting = pending.some(visit => visit.guestId === id);
            return <button key={id} disabled={disabled || waiting} data-residence-invite={id} onClick={() => act({ kind: "invite", guestId: id })}>
              {waiting ? `${resident.name} attendu` : `Inviter ${resident.name} (${resident.role})`}</button>; })}
        </div>
        {pending.map(visit => <p key={visit.id} className={styles.note} data-residence-visit={visit.stage}>
          {guestResidentV150(regionId, visit.guestId)?.name} : {visit.stage === "invited" ? "viendra quand tu seras au village" : `en chemin ; place : ${GUEST_PLACES_V150.find(p => p.id === visit.place)?.label ?? "debout au seuil"}`}.</p>)}
        {history.length > 0 && <p className={styles.note}>Dernières visites : {history.map(entry => guestResidentV150(regionId, entry.guestId)?.name ?? entry.guestId).join(", ")}.</p>}
      </div>

      {reminders.length > 0 && <div className={styles.block}>
        <h4>Rappels</h4>
        {reminders.map(reminder => <details key={reminder.id}><summary>{reminder.title}</summary><p>{reminder.text}</p>
          <button disabled={disabled} onClick={() => act({ kind: "read", id: reminder.id })}>Noté</button></details>)}
      </div>}
      {message && <p role="status" className={styles.message}>{message}</p>}
      <p className={styles.note}>{houseV149(house.id)?.plan}</p>
    </section>
  );
}
