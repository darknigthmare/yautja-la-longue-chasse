"use client";

import type { KeyboardEvent } from "react";
import {
  CHILDHOOD_DRILLS_V175, CHILDHOOD_TRAIL_SIGNS_V175,
  childhoodLengthV175, childhoodOptionsV175, childhoodRingPositionV175, childhoodSpringOpenV175,
  childhoodTrackSignV175, nextCohortGestureV175, type ChildhoodCommandV175, type ChildhoodViewV175,
} from "./systems/homeworldChildhoodV175";
import styles from "./HomeworldChildhoodV175.module.css";

function interactionLabel(view: ChildhoodViewV175) {
  if (view.trial === "ring") return "Attraper l’anneau";
  if (view.trial === "beam") return "Recentrer les appuis";
  if (view.trial === "spring") return "Frapper la cible";
  if (view.trial === "track") {
    if (view.track?.phase === "perched") return "Descendre par le chemin bas";
    return childhoodTrackSignV175(view) ? "Examiner l’indice" : "Monter au perchoir";
  }
  if (view.trial === "handoff") {
    if (!view.demonstrated) return "Montrer l’appui à Saar";
    if (!view.stowed) return "Ranger l’outil dans le coffre";
    return "Franchir le râtelier avec Saar";
  }
  return "Interagir";
}

const labels = {
  ring: CHILDHOOD_DRILLS_V175.ring.title,
  beam: CHILDHOOD_DRILLS_V175.beam.title,
  spring: CHILDHOOD_DRILLS_V175.spring.title,
  track: "Entrer dans la réserve d’exercice",
  west: "Reculer",
  east: "Avancer",
  observe: "Observer un battement",
  use: "Interagir",
  "track-sign": "Suivre l’indice récent",
  "track-decoy": "Suivre l’autre trace",
  "show-map": "Rapporter la carte",
  "show-passage": "Indiquer le dernier passage",
  handoff: "Rejoindre Saar pour la passation",
  "cohort-gesture": "Observer le geste du camarade",
  "first-mask": "Commencer par le masque",
  "first-blades": "Commencer par les lames",
  "reset-current": "Reprendre au dernier repère",
} satisfies Record<ChildhoodCommandV175, string>;

const cohortIllustrations = ["youngling-player-right.png", "youngling-rival-left.png", "youngling-player-left.png"];

function TrainingSpace({ view }: { view: ChildhoodViewV175 }) {
  const length = childhoodLengthV175(view);
  if (!length) return null;
  const ring = childhoodRingPositionV175(view.beat);
  const springOpen = childhoodSpringOpenV175(view.beat);
  const returnPath = view.track?.phase === "returning";
  return <div className={styles.space} data-trial={view.trial} data-lower={returnPath}
    style={{ gridTemplateColumns: "repeat(" + length + ", minmax(0, 1fr))" }} aria-hidden="true">
    <span className={styles.floor} style={{ gridColumn: "1 / " + (length + 1) }} />
    {view.trial === "ring" && <span className={styles.ring} style={{ gridColumn: ring + 1 }} />}
    {view.trial === "beam" && <span className={styles.beam} data-drift={view.drift} style={{ gridColumn: "3 / 8" }} />}
    {view.trial === "spring" && <>
      <span className={styles.line} style={{ gridColumn: 6 }} />
      <span className={styles.spring} data-open={springOpen} style={{ gridColumn: 7 }} />
    </>}
    {view.trial === "track" && <>
      <span className={styles.path} style={{ gridColumn: "1 / 12" }} />
      {CHILDHOOD_TRAIL_SIGNS_V175.map((sign, index) =>
        <span key={sign.name} className={styles.sign} data-confirmed={(view.track?.signs ?? 0) > index} style={{ gridColumn: sign.x + 1 }} />)}
      <span className={styles.perch} style={{ gridColumn: 10 }} />
      <span className={styles.boundary} style={{ gridColumn: 11 }} />
      {view.track?.phase === "perched" && <span className={styles.prey} style={{ gridColumn: 11 }} />}
    </>}
    {view.trial === "handoff" && <>
      {!view.passed && cohortIllustrations.map((file, index) => (
        <span key={file} className={styles.cohortMember} style={{ gridColumn: index + 3 }}
          data-cohort-performing={view.cohortPresentations === index + 1}
          data-gesture={view.finished[index]}>
          {/* eslint-disable-next-line @next/next/no-img-element -- Static game sprite with fixed dimensions. */}
          <img src={"/game/prologue/v47/" + file} width={38} height={52} alt="" />
        </span>
      ))}
      <span className={styles.demonstration} data-ready={view.demonstrated} style={{ gridColumn: 3 }} />
      <span className={styles.chest} data-ready={view.stowed} style={{ gridColumn: 5 }} />
      <span className={styles.gate} data-ready={view.stowed} style={{ gridColumn: 8 }} />
    </>}
    <span className={styles.actor} style={{ gridColumn: view.position + 1 }} data-perched={view.track?.phase === "perched"} />
  </div>;
}

export default function HomeworldChildhoodV175({ view, message, paused, mayEnter, trainingStarted, onAction, onEnter }: {
  view: ChildhoodViewV175; message: string; paused: boolean; mayEnter: boolean; trainingStarted: boolean;
  onAction(action: ChildhoodCommandV175): void; onEnter(): void;
}) {
  const options = childhoodOptionsV175(view).filter(action =>
    !trainingStarted || (action !== "first-mask" && action !== "first-blades"));
  const sign = childhoodTrackSignV175(view);
  const comparing = view.track?.comparing;
  const performer = nextCohortGestureV175(view);
  const title = view.trial === "handoff" ? "La passation"
    : view.trial === "track" ? "La piste avant la prise" : "L’épreuve des trois gestes";
  const key = (event: KeyboardEvent<HTMLDivElement>) => {
    if (paused || event.repeat || event.target !== event.currentTarget) return;
    const command = event.key === "ArrowLeft" ? "west" : event.key === "ArrowRight" ? "east"
      : event.key === " " ? "use" : event.key.toLowerCase() === "r" ? "observe" : null;
    if (!command) return;
    event.preventDefault();
    event.stopPropagation();
    if (options.includes(command)) onAction(command);
  };
  return <section className={styles.panel} data-homeworld-childhood-v175={view.trial ?? "yard"}
    data-childhood-position={view.position} data-childhood-drills={view.finished.length}
    data-childhood-track-phase={view.track?.phase} data-childhood-passed={view.passed}
    data-childhood-first-workshop={view.firstWorkshop ?? undefined} aria-label={title}>
    <h4>{title}</h4>
    {view.companion && <p><strong>{view.companion}</strong> · {view.trial === "ring" || view.trial === "beam" || view.trial === "spring"
      ? CHILDHOOD_DRILLS_V175[view.trial].title : ""}</p>}
    {!view.trial && !view.report && <p>{view.finished.length}/3 gestes consignés.</p>}
    <div role="group" aria-label="Terrain d’exercice" tabIndex={view.trial && !view.passed ? 0 : undefined} onKeyDown={key}>
      <TrainingSpace view={view} />
    </div>
    {view.trial === "ring" && <p>Anneau · dalle {childhoodRingPositionV175(view.beat)}. Ta position · dalle {view.position}.</p>}
    {view.trial === "spring" && <p>Cible {childhoodSpringOpenV175(view.beat) ? "ouverte" : "fermée"} · ligne de frappe à la dalle 5.</p>}
    {view.trial === "track" && <p>Indices confirmés · {view.track?.signs}/3. {view.track?.phase === "returning" && "Retour par le chemin bas."}</p>}
    {view.report && <p data-childhood-report={view.report}>{view.report === "map" ? "Carte remise." : "Dernier passage indiqué."}</p>}
    {view.trial === "handoff" && <p data-childhood-cohort={view.cohortPresentations}>
      Gestes des camarades consignés · {view.cohortPresentations}/3
    </p>}
    {view.firstWorkshop && <p>Premier atelier · {view.firstWorkshop === "mask" ? "Le masque et ses lectures" : "La distance des lames"}</p>}
    <p role="status">{message || view.message}</p>
    <div className={styles.controls}>
      {options.map(action => {
        const choiceLabel = action === "track-sign" ? sign?.actual : action === "track-decoy" ? sign?.decoy
          : action === "cohort-gesture" && performer ? "Observer " + performer.name + " · " + CHILDHOOD_DRILLS_V175[performer.drill].title
          : undefined;
        return <button type="button" key={action} data-childhood-action={action} disabled={paused}
          onClick={() => onAction(action)}>{choiceLabel ?? (action === "use" ? interactionLabel(view) : labels[action])}</button>;
      })}
      {view.passed && mayEnter && (view.firstWorkshop || trainingStarted) && <button type="button" data-childhood-enter-dojo disabled={paused}
        onClick={onEnter}>Rejoindre le dojo des Unblooded</button>}
    </div>
    {comparing && <p><small>Choisis le signe le plus récent dans la direction du perchoir.</small></p>}
  </section>;
}
