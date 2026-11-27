"use client";

import { MISSION_BY_ID } from "./data";
import styles from "./HomeworldCity.module.css";
import type { HomeworldAdjutantActionM029, HomeworldAdjutantM029 } from "./systems/homeworldAdjutantM029";

export default function HomeworldAdjutantM029({ station, record, disabled, mayAppoint, onAction }: {
  station: "dock" | "sas" | "leader";
  record: HomeworldAdjutantM029 | null;
  disabled: boolean;
  mayAppoint: boolean;
  onAction: (action: HomeworldAdjutantActionM029) => void;
}) {
  return (
    <section className={styles.notice} aria-label="Service du quai" data-adjutant-m029-station={station}>
      <h4>Service du quai</h4>
      {station === "dock" && !record && <>
        <p>L’officier te confie le dossier du convoi. Un relais attend son support à l’Atelier des convois.</p>
        <button type="button" disabled={disabled} onClick={() => onAction("study")}>Étudier le dossier du convoi</button>
      </>}
      {station === "dock" && record?.phase === "dossier" && <p>Rejoins le support dans l’Atelier des convois.</p>}
      {station === "dock" && record?.phase === "relay" && <p>Le relais est posé. Regagne le sas orbital pour transmettre le signal.</p>}
      {station === "dock" && (record?.phase === "reported" || record?.phase === "deferred") && <p>Le convoi a reçu l’appel. Présente le dossier au Leader dans la salle d’audience.</p>}
      {station === "sas" && record?.phase === "relay" && (
        <button type="button" disabled={disabled} onClick={() => onAction("confirm-signal")}>Relayer le signal au convoi</button>
      )}
      {station === "leader" && (record?.phase === "reported" || record?.phase === "deferred") && <>
        <p>Les douze élèves sont revenus. Le Leader confirme la réception du signal et examine les relevés de deux mondes.</p>
        <ul>{record.witnessedWorlds.map(mission => <li key={mission}>{MISSION_BY_ID[mission].planetName}</li>)}</ul>
        <button type="button" disabled={disabled || !mayAppoint} onClick={() => onAction("accept")}>Accepter la fonction d’Adjutant</button>
        {record.phase === "reported" && <button type="button" disabled={disabled} onClick={() => onAction("defer")}>Différer la nomination</button>}
      </>}
      {record?.phase === "appointed" && <p>La fonction d’Adjutant est inscrite dans la chronique.</p>}
    </section>
  );
}
