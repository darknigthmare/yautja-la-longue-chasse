import { useState } from "react";
import type { SaveGame } from "./types";
import {
  canConfirmElderRelief, elderAssemblyProofs, ELDER_RELIEF_YEARS, ELDER_RESPONSIBILITY_LABELS,
  type AssemblyCommand, type AssemblyResponse,
} from "./systems/elderAssemblyV168";
import styles from "./ElderAssembly.module.css";

export default function ElderAssembly({ save, onCommand, onClose }: {
  save: SaveGame;
  onCommand: (command: AssemblyCommand) => AssemblyResponse;
  onClose: () => void;
}) {
  const [message, setMessage] = useState("");
  const assembly = save.elderAssemblyV168;
  const proofs = elderAssemblyProofs(save);
  const reviewed = assembly?.mentoringReviewed === true && assembly.judgmentReviewed === true;
  const complete = assembly?.responsibility ?? null;
  const submit = (operation: AssemblyCommand["operation"]) => {
    setMessage(onCommand({ expectedRevision: assembly?.revision ?? 0, operation }).message);
  };

  const passageSummary = proofs.passageMethod === "bridge"
    ? "Les deux chasseurs sont passés en empruntant des chemins séparés."
    : "Les deux chasseurs sont passés à des horaires séparés.";

  return <section className={styles.assembly} aria-labelledby="elder-assembly-heading" data-elder-assembly-v168>
    <header className={styles.header}>
      <h3 id="elder-assembly-heading">L’assemblée des aînés</h3>
      <button type="button" onClick={onClose}>Fermer l’assemblée</button>
    </header>
    <div className={styles.council}>
      <article className={styles.seat}>
        <h4>Mentor du novice</h4>
        {assembly?.mentoringReviewed
          ? <p>Le novice a choisi son itinéraire et a mené sa chasse d’exercice à la sortie.</p>
          : <button type="button" disabled={!proofs.mentoring}
              onClick={() => submit({ type: "hear", act: "mentoring" })}>Écouter la déposition du mentor</button>}
      </article>
      <article className={styles.seat}>
        <h4>Témoin du passage</h4>
        {assembly?.judgmentReviewed
          ? <p>{passageSummary}</p>
          : <button type="button" disabled={!proofs.judgment}
              onClick={() => submit({ type: "hear", act: "judgment" })}>Écouter la déposition du témoin</button>}
      </article>
    </div>
    {complete ? <div className={styles.recognition} data-elder-assembly-complete>
      <p><strong>{save.prologue && !assembly?.generationHandover ? "Engagement consigné" : "Elder reconnu"}</strong> · {ELDER_RESPONSIBILITY_LABELS[complete]}.</p>
      {canConfirmElderRelief(save) && <>
        <p>Après {ELDER_RELIEF_YEARS} ans d’engagement, le novice devenu chasseur te rejoint pour prendre la relève.</p>
        <button type="button" data-elder-confirm-relief onClick={() => submit({ type: "confirm-relief" })}>
          Revenir au conseil et remettre le registre à la relève
        </button>
      </>}
    </div> : <fieldset className={styles.choice} disabled={!reviewed}>
      <legend>Engagement auprès du clan</legend>
      <button type="button" onClick={() => submit({ type: "accept", responsibility: "council" })}>
        {ELDER_RESPONSIBILITY_LABELS.council}
      </button>
      <button type="button" onClick={() => submit({ type: "accept", responsibility: "travel" })}>
        {ELDER_RESPONSIBILITY_LABELS.travel}
      </button>
    </fieldset>}
    <p className={styles.notice} role="status" aria-live="polite">{message}</p>
  </section>;
}
