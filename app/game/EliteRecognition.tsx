"use client";

import { useMemo, useState } from "react";
import {
  canEnterEliteRecognition, canWalkEliteRecognition, ELITE_RECOGNITION_GROUND as GROUND,
  ELITE_RECOGNITION_POSTS as POSTS, ELITE_RECOGNITION_PROOFS as PROOFS, eliteRecognitionEvidence,
  inspectEliteRecognition, sameEliteRecognitionPoint, type EliteRecognitionCommand,
  type EliteRecognitionPoint, type EliteRecognitionResponse, type EliteRecognitionSave,
} from "./systems/eliteRecognitionV174";
import { MASTERY_LABELS } from "./systems/eliteMasteryV170";
import styles from "./EliteRecognition.module.css";

const DIRECTIONS = [
  { name: "Nord", key: "ArrowUp", step: { column: 0, row: -1 } },
  { name: "Ouest", key: "ArrowLeft", step: { column: -1, row: 0 } },
  { name: "Sud", key: "ArrowDown", step: { column: 0, row: 1 } },
  { name: "Est", key: "ArrowRight", step: { column: 1, row: 0 } },
] as const;
const LABELS = { crown: "Crête du Berceau", hunt: "Prises du Quatza-Rij", mastery: "Profil de maîtrise" };
const ICONS: Record<string, { icon: string; label: string }> = {
  c: { icon: "♢", label: LABELS.crown }, h: { icon: "◇", label: LABELS.hunt },
  m: { icon: "≈", label: LABELS.mastery }, p: { icon: "◆", label: "Témoin de la cohorte" },
  r: { icon: "◆", label: "Témoin de l’assemblée" }, g: { icon: "◉", label: "Socle de reconnaissance" },
};

export default function EliteRecognition({ save, onCommand, onClose }: {
  save: EliteRecognitionSave;
  onCommand: (command: EliteRecognitionCommand) => EliteRecognitionResponse;
  onClose: () => void;
}) {
  const state = inspectEliteRecognition(save.eliteRecognitionV174, save.createdAt).state;
  const evidence = useMemo(() => eliteRecognitionEvidence(save), [save]);
  const [position, setPosition] = useState<EliteRecognitionPoint>(POSTS.entry);
  const [message, setMessage] = useState("");
  const ready = useMemo(() => canEnterEliteRecognition(save), [save]);
  const at = (point: EliteRecognitionPoint) => sameEliteRecognitionPoint(position, point);
  const move = (step: EliteRecognitionPoint) => {
    const next = { column: position.column + step.column, row: position.row + step.row };
    if (canWalkEliteRecognition(next)) { setPosition(next); setMessage(""); }
  };
  const submit = (operation: EliteRecognitionCommand["operation"]) =>
    setMessage(onCommand({ expectedRevision: state?.revision ?? 0, position, operation }).message);
  const station = PROOFS.find(proof => at(POSTS[proof]));
  const witness = state?.audience ? at(POSTS[state.audience]) : false;
  const completed = state?.proofs.length === PROOFS.length;

  return <section className={styles.scene} aria-labelledby="elite-recognition-heading" data-elite-recognition-v174={state?.prepared ? "prepared" : "review"}>
    <header className={styles.header}>
      <h3 id="elite-recognition-heading">Le retour devant les témoins</h3>
      <button type="button" onClick={onClose}>Fermer la salle</button>
    </header>
    {state?.prepared ? <p data-elite-recognition-receipt>Le retour préparatoire a été consigné devant {state.audience === "public" ? "la cohorte" : "l’assemblée restreinte"}. Les rites du clan restent à vérifier.</p> :
      <div className={styles.layout}>
        <div>
          <div tabIndex={0} role="group" aria-label="Plan de la salle. Flèches pour marcher."
            data-elite-recognition-board data-column={position.column} data-row={position.row}
            className={styles.board} onKeyDown={event => {
              const direction = DIRECTIONS.find(item => item.key === event.key);
              if (direction) { event.preventDefault(); event.stopPropagation(); move(direction.step); }
            }}>
            {GROUND.flatMap((row, y) => [...row].map((cell, x) => {
              const isHunter = at({ column: x, row: y });
              const stationIcon = ICONS[cell];
              return <span key={y + "-" + x} className={styles.tile} data-wall={cell === "#"} data-hunter={isHunter}
                title={stationIcon?.label} aria-hidden="true">{isHunter ? "▲" : stationIcon?.icon ?? ""}</span>;
            }))}
          </div>
          <div className={styles.controls} aria-label="Déplacements">
            {DIRECTIONS.map(item => <button type="button" key={item.key} onClick={() => move(item.step)}>{item.name}</button>)}
          </div>
        </div>
        <div className={styles.evidence}>
          <dl>
            {PROOFS.map(proof => <div key={proof}>
              <dt>{LABELS[proof]}</dt>
              <dd>{state?.proofs.includes(proof) ? "Présentée" : evidence[proof] ? "Reçue au registre" : "En attente"}</dd>
            </div>)}
          </dl>
          {evidence.disciplines.length > 0 && <p>{evidence.disciplines.map(id => MASTERY_LABELS[id]).join(" · ")}</p>}
          {!ready && <p>Il faut la crête, le retour solitaire, deux disciplines et 5 000 points d’honneur pour poursuivre.</p>}
          {ready && !state?.audience && at(POSTS.entry) && <div className={styles.controls}>
            <button type="button" data-elite-audience="public" onClick={() => submit({ type: "audience", audience: "public" })}>Retour public</button>
            <button type="button" data-elite-audience="restricted" onClick={() => submit({ type: "audience", audience: "restricted" })}>Retour restreint</button>
          </div>}
          {ready && state?.audience && station && !state.proofs.includes(station) && <button type="button" data-elite-present={station}
            onClick={() => submit({ type: "present", proof: station })}>Présenter · {LABELS[station]}</button>}
          {ready && witness && completed && !state?.witnessed && <button type="button" data-elite-witness
            onClick={() => submit({ type: "hear" })}>Écouter le témoin</button>}
          {ready && state?.witnessed && at(POSTS.mark) && <button type="button" data-elite-mark
            onClick={() => submit({ type: "mark" })}>Orienter le socle de reconnaissance</button>}
          <p role="status">{message || (!state?.audience ? "Choisis ton accueil au seuil." : !completed ? "Rejoins les trois postes qui portent tes preuves." :
            !state.witnessed ? state.audience === "public" ? "Rejoins le témoin de la cohorte à l’ouest." : "Rejoins le témoin de l’assemblée à l’est." :
              "Rejoins le socle central.")}</p>
        </div>
      </div>}
  </section>;
}
