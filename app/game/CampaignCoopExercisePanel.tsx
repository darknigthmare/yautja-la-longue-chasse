"use client";

import {
  CAMPAIGN_COOP_PASSAGES, campaignCoopExerciseActive, campaignCoopExerciseComplete, campaignCoopExerciseView,
  type CampaignCoopExerciseCommand,
} from "./systems/campaignCoopExercise";
import { exerciseRosterAvailable, type CampaignCoopLobby } from "./systems/campaignCoopLobby";
import styles from "./CampaignCoopLobby.module.css";

interface Player {
  proof: string;
  name: string;
}

interface Props {
  room: CampaignCoopLobby;
  players: readonly Player[];
  proof: string | null;
  disabled: boolean;
  run: (command: CampaignCoopExerciseCommand) => void;
}

export default function CampaignCoopExercisePanel({ room, players, proof, disabled, run }: Props) {
  const exercise = room.exercise;
  const host = proof === room.host.proof;
  const rosterAvailable = exercise && exerciseRosterAvailable(exercise, players);
  const running = exercise && campaignCoopExerciseActive(exercise) && rosterAvailable;
  const complete = exercise && campaignCoopExerciseComplete(exercise);
  const participating = exercise && proof !== null && exercise.roster.includes(proof);
  const view = exercise ? campaignCoopExerciseView(exercise) : null;
  const title = (id: string) => players.find(player => player.proof === id)?.name ?? "Chronique partie";
  const start = () => run({ type: "exercise-start", roomId: room.id });
  const play = (move: Extract<CampaignCoopExerciseCommand, { type: "exercise-move" }>["move"]) => {
    if (exercise && view) run({ type: "exercise-move", roomId: room.id, exerciseId: exercise.id, passage: view.passage, move });
  };

  return <section className={styles.exercise} data-campaign-coop-exercise aria-labelledby="coop-exercise-title">
    <h3 id="coop-exercise-title">Relève de balise</h3>
    <p>Le pisteur lit la voie, le soutien prépare la prise et l’hôte décide du franchissement.</p>
    {host && !running && <button type="button" disabled={disabled || players.length < 2} onClick={start}>
      {exercise ? "Relancer l’exercice" : "Lancer l’exercice"}
    </button>}
    {!exercise && <p>{players.length < 2 ? "Il faut au moins deux chroniques admises." : "En attente du départ donné par l’hôte."}</p>}
    {exercise && complete && participating && <p role="status">Relève terminée. Les trois passages sont franchis. Les chroniques gardent leur progression de campagne.</p>}
    {exercise && !complete && !running && <p role="status">Relève interrompue. L’hôte peut reprendre un exercice avec les chroniques présentes.</p>}
    {exercise && running && !participating && <p role="status">Un exercice est en cours avec les postes du départ.</p>}
    {exercise && view && running && participating && <>
      <ol className={styles.passages} aria-label="Passages de la relève">
        {CAMPAIGN_COOP_PASSAGES.map((passage, index) =>
          <li key={passage.name} aria-current={view.passage === index ? "step" : undefined}>
            {passage.name}{view.passage > index ? " · franchi" : ""}
          </li>)}
      </ol>
      <dl className={styles.assignments}>
        <div><dt>Pisteur</dt><dd>{title(view.track)}</dd></div>
        <div><dt>Soutien</dt><dd>{title(view.support)}</dd></div>
        <div><dt>Chef du trio</dt><dd>{title(view.lead)}</dd></div>
      </dl>
      <p aria-live="polite" data-coop-exercise-step={view.step}>{
        view.step === "track" ? "Le pisteur lit les appuis." :
        view.step === "support" ? "La voie est signalée. Le soutien prépare la prise." :
        "La voie et la prise sont confirmées. Le trio attend l’ordre de l’hôte."
      }</p>
      <div className={styles.actions}>
        {view.step === "track" && proof === view.track && <>
          <p className={styles.cue}>Les traces fraîches se poursuivent par {view.trackLeft ? view.station.left : view.station.right}.</p>
          <button type="button" data-coop-choice="trace-left" disabled={disabled}
            onClick={() => play("trace-left")}>
            Signaler {view.station.left}
          </button>
          <button type="button" data-coop-choice="trace-right" disabled={disabled}
            onClick={() => play("trace-right")}>
            Signaler {view.station.right}
          </button>
        </>}
        {view.step === "support" && proof === view.support && <>
          <p className={styles.cue}>La charge tient sur {view.anchored ? view.station.anchor : view.station.brace}.</p>
          <button type="button" data-coop-choice="take-anchor" disabled={disabled}
            onClick={() => play("take-anchor")}>
            Assurer {view.station.anchor}
          </button>
          <button type="button" data-coop-choice="take-brace" disabled={disabled}
            onClick={() => play("take-brace")}>
            Assurer {view.station.brace}
          </button>
        </>}
        {view.step === "lead" && proof === view.lead &&
          <button type="button" disabled={disabled} onClick={() => play("advance")}>Faire franchir le trio</button>}
        {host && <button type="button" disabled={disabled}
          onClick={() => run({ type: "exercise-abandon", roomId: room.id, exerciseId: exercise.id })}>Interrompre l’exercice</button>}
      </div>
    </>}
  </section>;
}
