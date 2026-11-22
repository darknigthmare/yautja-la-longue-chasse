import {
  COORDINATION_OFFICER_M028, COORDINATION_WORKSHOP_M028, homeworldCoordinationTeamsM028,
  type HomeworldCoordinationActionM028, type HomeworldCoordinationM028 as Trial,
} from "./systems/homeworldCoordinationM028";
import styles from "./HomeworldCity.module.css";

const tasks = {
  briefed: "Ouvre le passage depuis la console de coordination.",
  jammed: "Rejoins l’allée de maintenance de l’Atelier des convois pour dégager le verrou.",
  delayed: "Reprends la coordination au Contrôle d’amarrage.",
  surveyed: "Retourne au Contrôle d’amarrage et indique à l’équipe quel verrou libérer.",
  cleared: "Retourne au Contrôle d’amarrage et envoie le signal de récupération.",
  recovering: "Donne l’ordre de retour aux deux équipes.",
  returned: "Les deux équipes ont regagné le quai avec la caisse.",
} as const;

export function HomeworldCoordinationJournalM028({ trial, disabled, onGuide }: {
  trial: Trial;
  disabled: boolean;
  onGuide: (landmarkId: string) => void;
}) {
  const landmark = trial.phase === "jammed"
    ? "building:" + COORDINATION_WORKSHOP_M028.roomId
    : "point:" + COORDINATION_OFFICER_M028.pointId;
  return (
    <section className={styles.help} aria-label="Suivi de l’essai de coordination" data-homeworld-coordination-journal-m028={trial.phase}>
      <strong>L’essai de coordination</strong> · {tasks[trial.phase]}
      {trial.phase !== "returned" && (
        <button type="button" disabled={disabled} className="ghost-button small" onClick={() => onGuide(landmark)}>Indiquer le chemin</button>
      )}
    </section>
  );
}

export default function HomeworldCoordinationM028({ trial, disabled, onAction }: {
  trial?: Trial;
  disabled: boolean;
  onAction: (action: HomeworldCoordinationActionM028) => void;
}) {
  const location = trial && homeworldCoordinationTeamsM028(trial);
  return (
    <section className={styles.notice} aria-label="Console de coordination" data-homeworld-coordination-m028={trial?.phase ?? "offer"}>
      <h4>L’essai de coordination</h4>
      {!trial ? <>
        <p>Deux équipes doivent rapporter une caisse d’exercice. L’une tient le passage, l’autre attend le signal avant de prendre la charge.</p>
        <button type="button" disabled={disabled} onClick={() => onAction({ kind: "begin", role: "field" })}>Prendre le terrain</button>
        <button type="button" disabled={disabled} onClick={() => onAction({ kind: "begin", role: "delegate" })}>Confier le terrain à l’équipe</button>
      </> : <>
        <dl>
          <dt>Équipe du passage</dt><dd>{location?.[0]}</dd>
          <dt>Équipe de récupération</dt><dd>{location?.[1]}</dd>
        </dl>
        <p>{tasks[trial.phase]}</p>
        {trial.delays > 0 && <p>Retards consignés · {trial.delays}</p>}
        {trial.phase === "briefed" && <button type="button" disabled={disabled} onClick={() => onAction({ kind: "dispatch" })}>Ouvrir le passage</button>}
        {trial.phase === "surveyed" && <button type="button" disabled={disabled} onClick={() => onAction({ kind: "order-clear" })}>Ordonner de libérer le verrou repéré</button>}
        {(trial.phase === "jammed" || trial.phase === "surveyed" || trial.phase === "cleared") &&
          <button type="button" disabled={disabled} onClick={() => onAction({ kind: "signal" })}>Envoyer le signal</button>}
        {trial.phase === "delayed" && <button type="button" disabled={disabled} onClick={() => onAction({ kind: "retry" })}>Reprendre depuis le passage</button>}
        {trial.phase === "recovering" && <button type="button" disabled={disabled} onClick={() => onAction({ kind: "recall" })}>Ordonner le retour des équipes</button>}
      </>}
    </section>
  );
}
