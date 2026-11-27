"use client";
/**
 * V158 — mission de voie qui met en jeu l'objet central de la transition
 * « Trophée » (-02), et registre de cet original (propriétaire, emplacement
 * unique, provenance). Chaque geste et le choix passent par `onAction`, qui
 * n'actualise l'écran qu'après l'écriture confirmée.
 */
import { useState } from "react";
import { isFutureOriginV151, originOfSaveV151 } from "./systems/originsV151";
import {
  emptyPathObjectsV158, isFuturePathObjectsV158, normalizePathObjectsV158, pathMissionClosedV158, pathMissionForOriginV158,
  pathOriginalForOriginV158, type PathMissionActionV158, type PathPlaceContextV158,
} from "./systems/pathObjectsV158";
import styles from "./ResidencePanelV149.module.css";

export default function PathMissionPanelV158({ origin, objects, place, rankId, disabled, onAction }: {
  origin: unknown; objects: unknown; rankId: string; disabled: boolean;
  /** Where the panel is shown: the trophy workshop, or a region run checkpoint. */
  place: Omit<PathPlaceContextV158, "originId" | "rankId">;
  onAction(action: PathMissionActionV158): { ok: boolean; message: string };
}) {
  const [message, setMessage] = useState("");
  if (isFutureOriginV151(origin)) return null;
  if (isFuturePathObjectsV158(objects)) return <section className={styles.panel}><p role="alert">Registre des objets de voie d’une version plus récente : il est conservé sans modification.</p></section>;
  const originState = originOfSaveV151(origin);
  const mission = pathMissionForOriginV158(originState.originId);
  const definition = pathOriginalForOriginV158(originState.originId);
  if (!mission || !definition) return null;
  const state = normalizePathObjectsV158(objects) ?? emptyPathObjectsV158();
  const context: PathPlaceContextV158 = { ...place, originId: originState.originId, rankId };
  const closed = pathMissionClosedV158(mission, context);
  const record = state.missions[mission.id];
  const original = state.originals[definition.id];
  const atRegion = !place.atWorkshop;
  // In a region the panel appears only where its mission is really played (or already started there).
  if (atRegion && (mission.place.kind !== "region" || (closed && !original && !(record && record.steps > 0)))) return null;
  if (atRegion && original) return null;
  const act = (action: PathMissionActionV158) => { const result = onAction(action); setMessage(result.message); };
  const done = record?.steps ?? 0;

  return (
    <section className={styles.panel} data-path-mission-v158={mission.id} data-path-mission-state={original ? "resolved" : closed ? "closed" : done ? "started" : "ready"}>
      <header>
        <h3>{mission.title}</h3>
        <p className={styles.meta}>Mission de voie {mission.id} · provenance de « {definition.label} » · lecture du jeu (proposé) : {mission.place.kind === "workshop" ? "à l’atelier de trophées" : mission.place.label}</p>
      </header>
      <p>{mission.scene}</p>
      {original ? <div className={styles.block} data-path-original={definition.id} data-path-original-location={original.location.kind}>
        <p><b>{mission.options[original.choice]}</b></p>
        <p>{mission.reactions[original.choice]}</p>
        <p className={styles.note}>Registre : {definition.label} · propriétaire : {original.owner} · emplacement : {original.location.kind === "hunter" ? "sous ta garde" : original.location.holder} · provenance : {mission.id}.</p>
      </div> : closed ? <p className={styles.note} data-path-mission-closed>{closed}</p> : <>
        <ol className={styles.slots}>
          {mission.steps.map((step, index) => <li key={step}>
            {index < done ? <s>{step}</s> : <button disabled={disabled} data-path-step={index} onClick={() => act({ kind: "step", missionId: mission.id, index })}>{step}</button>}
          </li>)}
        </ol>
        {done >= mission.steps.length && <div className={styles.choices}>
          {mission.options.map((option, index) => <button key={option} disabled={disabled} data-path-choice={index}
            onClick={() => act({ kind: "choose", missionId: mission.id, choice: index as 0 | 1 })}>{option}</button>)}
        </div>}
        <p className={styles.note}>{mission.choices}</p>
      </>}
      {message && <p role="status" className={styles.message}>{message}</p>}
    </section>
  );
}
