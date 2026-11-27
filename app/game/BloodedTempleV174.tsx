"use client";

import { useEffect, useState } from "react";
import type { SaveGame } from "./types";
import { BLOODED_ROOMS, inspectBloodedTempleV174, templePassageLaneV174, type TempleActionV174, type TempleCommandV174 } from "./systems/bloodedTempleV174";
import styles from "./BloodedTempleV174.module.css";

type Props = {
  save: SaveGame;
  suspended: boolean;
  onCommand: (command: TempleCommandV174) => { ok: boolean; notice: string };
  onClose: () => void;
};

export default function BloodedTempleV174({ save, suspended, onCommand, onClose }: Props) {
  const { state, view } = inspectBloodedTempleV174(save.bloodedTempleV174, save.createdAt);
  const [feedback, setFeedback] = useState("");
  const [clock, setClock] = useState(() => Date.now());
  const room = BLOODED_ROOMS[view.room];
  const deadline = view.deadline;
  useEffect(() => {
    if (deadline === null) return;
    const timer = window.setInterval(() => setClock(Date.now()), 250);
    return () => window.clearInterval(timer);
  }, [deadline]);
  function act(action: TempleActionV174) {
    if (suspended) return;
    setClock(Date.now());
    setFeedback(onCommand({ action, expectedRevision: state?.events.length ?? 0 }).notice);
  }
  const button = (action: TempleActionV174, label: string, disabled = false) => (
    <button type="button" className="ghost-button" data-blooded-action={typeof action === "string" ? action : "mark-" + action.mark}
      disabled={suspended || disabled} onClick={() => act(action)}>{label}</button>
  );
  const elapsed = deadline !== null && clock >= deadline;
  const canFight = view.column === 3 && view.lane === room.lane && view.enemy > 0;
  const tracing = view.marks.at(-1) ?? [];
  return (
    <section className={styles.temple} aria-labelledby="blooded-temple-title"
      data-blooded-temple-v174={view.stage} data-blooded-room={view.room} data-blooded-column={view.column}
      onKeyDown={(event) => {
        if (view.stage !== "temple" || event.ctrlKey || event.metaKey || event.altKey || suspended) return;
        const action = event.key === "ArrowLeft" ? "left" : event.key === "ArrowRight" ? "right" :
          event.key === "ArrowUp" || event.key === "ArrowDown" ? "lane" : null;
        if (!action) return;
        event.preventDefault();
        if (!event.repeat) act(action);
      }}>
      <header>
        <h3 id="blooded-temple-title">Le rite de la pyramide</h3>
        <button type="button" className="ghost-button" onClick={onClose}>Revenir au dossier</button>
      </header>
      {view.stage === "council" && <>
        <p>Les Anciens portent le masque cérémoniel. Ils attendent le crâne du Quatza-Rij et le témoignage du trio rentré ensemble.</p>
        {button("present", "Présenter le crâne et entendre les Anciens")}
      </>}
      {view.stage === "temple" && <>
        <h4>{room.name}</h4>
        <p>{view.room === 4 ? "La reine captive force la grille. Prépare la console puis déclenche la purge derrière le verrou."
          : view.room === 5 ? "Prends le blessé au mécanisme et atteins le sas avant sa fermeture."
          : view.room === 0 && view.plate ? "La cloison a basculé. Le passage s’ouvre sur l’autre voie." :
            room.objective + ". La voie du mécanisme est marquée au sol."}</p>
        <p className={styles.report}>
          <span>Preuves des chasseurs · {view.proofs.length}/3</span>
          <span>Endurance · {view.vitality}/3</span>
          {deadline !== null && <span>Purge · {Math.max(0, Math.ceil((deadline - clock) / 1000))} s</span>}
        </p>
        <div className={styles.floor} aria-label={"Voie " + (view.lane + 1) + ", position " + (view.column + 1) + " sur 6"}>
          {[0, 1].flatMap(lane => Array.from({ length: 6 }, (_, column) => {
            const player = view.column === column && view.lane === lane;
            const mechanism = column === 2 && lane === room.lane;
            const threat = column === 4 && lane === room.lane && view.enemy > 0;
            const passage = column === 3 && lane === templePassageLaneV174(view);
            return <div aria-hidden="true" key={lane + ":" + column} data-player={player} data-mechanism={mechanism}
              data-exit={column === 5} data-threat={threat} data-passage={passage}>
              {player ? "Trio" : mechanism ? "Levier" : threat ? "Kainde" : passage ? "Passage" : column === 5 ? "Sas" : ""}
            </div>;
          }))}
        </div>
        {(elapsed || !view.vitality) ? <p>{button("retry", elapsed ? "Reprendre à la nef" : "Reformer le trio à l’entrée")}</p> :
          <div className={styles.controls}>
            {button("left", "Reculer", view.column === 0)}
            {button("right", "Avancer", view.column === 5)}
            {button("lane", "Changer de voie", view.column === 3 || view.column === 4)}
            {view.prepared && view.room === 4 && view.deadline === null && view.column === 3
              ? button("interact", "Fermer la grille et lancer la purge")
              : view.room === 0 && view.prepared && !view.plate ? button("interact", "Déplacer la cloison") :
                !view.prepared && button("interact", room.objective)}
            {canFight && "hunter" in room && <>
              {button("guard", "Tenir la garde", view.guarded)}
              {button("strike", room.hunter === "joueur" ? "Frapper dans l’ouverture" : "Donner le signal au " + room.hunter)}
            </>}
            {button("next", view.room === 5 ? "Franchir le sas avec le blessé" : "Franchir le passage", view.column !== 5)}
          </div>}
      </>}
      {view.stage === "mark" && <>
        <h4>Le retour et la marque</h4>
        {view.marks.length === 3 ? button("return-tools", "Rendre les outils aux témoins") : <>
          <p>{view.marks.length === 1 ? "Trace le symbole du clan sur le masque. Relie au moins quatre points voisins."
            : "Reproduis sur le front le tracé du masque, dans le même ordre."}</p>
          <div className={styles.mark} aria-label={view.marks.length === 1 ? "Tracé sur le masque" : "Tracé sur le front"}>
            {Array.from({ length: 9 }, (_, point) => <button type="button" key={point} disabled={suspended || tracing.includes(point)}
              aria-label={"Point " + (point + 1)} aria-pressed={tracing.includes(point)} data-blooded-action={"mark-" + point}
              onClick={() => act({ mark: point })}>{tracing.includes(point) ? tracing.indexOf(point) + 1 : "·"}</button>)}
          </div>
          <div className={styles.controls}>
            {button("clear-mark", "Effacer le tracé en cours", !tracing.length)}
            {button("seal-mark", "Consigner le tracé", tracing.length < 4)}
          </div>
        </>}
      </>}
      {view.stage === "complete" && <p>Le trio est revenu et la marque Blooded est consignée. Les démarches de vaisseau sont ouvertes.</p>}
      {feedback && <p role="status">{feedback}</p>}
    </section>
  );
}
