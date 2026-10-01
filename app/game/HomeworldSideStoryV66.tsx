"use client";

import { useId, useState } from "react";
import { HOMEWORLD_SIDE_STORY_V66, SIDE_STORY_CLUES_V66, SIDE_STORY_RECORDS_V66, homeworldSideStoryV66Journal,
  type HomeworldSideStoryV66Action, type HomeworldSideStoryV66Progress } from "./systems/homeworldSideStoryV66";
import styles from "./HomeworldSideStoryV66.module.css";
import YautjaTranslationV67 from "./YautjaTranslationV67";

export interface HomeworldSideStoryV66Props {
  progress: HomeworldSideStoryV66Progress;
  pointId: string | null;
  eligible: boolean;
  disabled?: boolean;
  reducedMotion?: boolean;
  /** Caller checks the currently reached point, save owner and durable acknowledgement. No optimistic checkpoint. */
  onAction(action: HomeworldSideStoryV66Action): { ok: boolean; message: string };
}

function Chronology({ disabled, submit }: { disabled: boolean; submit(action: HomeworldSideStoryV66Action): void }) {
  const [order, setOrder] = useState<string[]>(["mark-requested", "claimed-return", "blank-issued"]);
  const move = (index: number, offset: number) => setOrder(current => {
    const next = [...current], target = index + offset;
    if (target < 0 || target >= next.length) return current;
    [next[index], next[target]] = [next[target], next[index]];
    return next;
  });
  return <div data-side-story-puzzle="chronology">
    <p>Classe les relevés du premier au dernier. Les temps appartiennent au registre de cette cité ; ils ne définissent pas un calendrier canonique.</p>
    <ol className={styles.timeline}>{order.map((id, index) => {
      const record = SIDE_STORY_RECORDS_V66.find(value => value.id === id)!;
      return <li key={id} data-side-story-record={id}><div><strong>{record.time} · {record.label}</strong><p>{record.text}</p></div>
        <div className={styles.move}><button type="button" aria-label={`Monter : ${record.label}`} disabled={disabled || index === 0} onClick={() => move(index, -1)}>↑</button>
          <button type="button" aria-label={`Descendre : ${record.label}`} disabled={disabled || index === order.length - 1} onClick={() => move(index, 1)}>↓</button></div>
      </li>;
    })}</ol>
    <button type="button" disabled={disabled} data-side-story-confirm-chronology onClick={() => submit({ kind: "sequence", order })}>Confronter cette chronologie</button>
  </div>;
}

function Correction({ disabled, submit }: { disabled: boolean; submit(action: HomeworldSideStoryV66Action): void }) {
  const [origin, setOrigin] = useState<"training" | "hunt" | null>(null);
  const [status, setStatus] = useState<"unverified" | "earned-trophy" | null>(null);
  return <div data-side-story-puzzle="correction"><p>La gardienne te demande de rectifier deux champs distincts. Les relevés restent consultables ; aucune pièce ne devient un trophée personnel.</p>
    <div role="group" aria-label="Origine de la pièce" className={styles.choices}><strong>Origine</strong>
      <button type="button" disabled={disabled} aria-pressed={origin === "hunt"} onClick={() => setOrigin("hunt")}>Prise de chasse</button>
      <button type="button" disabled={disabled} aria-pressed={origin === "training"} onClick={() => setOrigin("training")}>Moulage d’exercice</button></div>
    <div role="group" aria-label="Statut de la déclaration" className={styles.choices}><strong>Statut</strong>
      <button type="button" disabled={disabled} aria-pressed={status === "unverified"} onClick={() => setStatus("unverified")}>Chasse non authentifiée</button>
      <button type="button" disabled={disabled} aria-pressed={status === "earned-trophy"} onClick={() => setStatus("earned-trophy")}>Trophée reconnu</button></div>
    <button type="button" disabled={disabled || !origin || !status} data-side-story-confirm-correction onClick={() => { if (origin && status) submit({ kind: "correct", origin, status }); }}>Soumettre la déclaration rectifiée</button>
  </div>;
}

export default function HomeworldSideStoryV66({ progress, pointId, eligible, disabled = false, reducedMotion = false, onAction }: HomeworldSideStoryV66Props) {
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string; pointId: string } | null>(null);
  const [notesOpen, setNotesOpen] = useState(false);
  const notesId = useId();
  const journal = homeworldSideStoryV66Journal(progress, eligible);
  if (!pointId || !HOMEWORLD_SIDE_STORY_V66.pointIds.some(id => id === pointId)) return null;
  const here = pointId === journal.pointId;
  const submit = (action: HomeworldSideStoryV66Action) => { if (!disabled && here) setFeedback({ ...onAction(action), pointId }); };
  const action = (label: string, value: HomeworldSideStoryV66Action) => <button type="button" disabled={disabled} onClick={() => submit(value)}>{label}</button>;
  return <section className={styles.story} aria-label="Histoire annexe : La marque empruntée" data-side-story-v66={journal.step} data-side-story-checkpoints={journal.completed}>
    <header><span>HISTOIRE ANNEXE · {journal.completed}/{journal.total}</span><h4>{HOMEWORLD_SIDE_STORY_V66.title}</h4></header>
    <p className={styles.scope}>Récit original de cette cité. Ce dossier est distinct de l’enquête du convoi.</p>
    {journal.step === "complete" ? <><p><YautjaTranslationV67 text={journal.objective} paused={disabled} reducedMotion={reducedMotion} /></p><p>Ta collection, ton rang et le jugement concernant le convoi restent inchangés. Les interlocuteurs conservent cette conclusion lors de tes revisites.</p></>
      : !here ? <p><strong>{journal.label}</strong> · {journal.objective}</p>
        : <div className={styles.scene} key={`${pointId}:${journal.step}`}>
          {journal.step === "invitation" && <><p><YautjaTranslationV67 text="L’instructeur a retenu une déclaration de chasse : un novice présente une pièce gravée, mais refuse d’en montrer le revers. Il te demande d’examiner les faits avant que la cité ne prenne sa crainte du déshonneur pour une preuve." paused={disabled} reducedMotion={reducedMotion} /></p><p>La pièce est déjà confiée à la forge. Tu enquêteras auprès de ses gardiens ; elle ne te sera jamais donnée comme trophée.</p>{action("Accepter d’examiner la déclaration", { kind: "accept" })}</>}
          {journal.step === "inspection" && <><p>La maîtresse pose le moulage sous la lumière de son établi. Inspecte ses trois zones. Aucun indice isolé ne suffit à désigner un responsable.</p><div className={styles.clues}>{SIDE_STORY_CLUES_V66.map(clue => <article key={clue.id} data-side-story-clue={clue.id}><h5>{clue.label.replace("Examiner ", "")}</h5>{progress.clues.includes(clue.id) ? <p>✓ {clue.detail}</p> : action(clue.label, { kind: "inspect", clueId: clue.id })}</article>)}</div></>}
          {journal.step === "archive" && <><p><YautjaTranslationV67 text="La conservatrice retrouve le numéro de lot. Elle peut ouvrir les relevés de retour déclaré, de remise du moulage et de demande de gravure. Une inscription administrative n’est pas un certificat de chasse." paused={disabled} reducedMotion={reducedMotion} /></p>{action("Consulter les trois relevés", { kind: "read-archive" })}</>}
          {journal.step === "chronology" && <Chronology disabled={disabled} submit={submit} />}
          {journal.step === "deduction" && <><p>Le novice situe son retour avant que cette pièce lui soit remise comme matériel d’exercice. La gravure est postérieure au moulage. Quelle conclusion défendrais-tu ?</p><div className={styles.choices}>
            {action("La maîtresse des parures est forcément complice.", { kind: "deduce", conclusion: "artisan-guilty" })}
            {action("Cette pièce n’authentifie pas la chasse déclarée.", { kind: "deduce", conclusion: "unverified-claim" })}
            {action("Le novice doit automatiquement devenir Bad Blood.", { kind: "deduce", conclusion: "automatic-bad-blood" })}
          </div></>}
          {journal.step === "testimony" && <><p><YautjaTranslationV67 text="L’instructeur a demandé une réponse au novice pendant ton enquête. Il en conserve le message : « Je suis revenu sans prise. J’ai présenté la pièce d’exercice parce que je craignais de revenir les mains vides. »" paused={disabled} reducedMotion={reducedMotion} /></p><p>Ce message constitue un aveu limité à cette déclaration ; il ne réécrit pas les autres chasses.</p>{action("Consigner la réponse transmise par l’instructeur", { kind: "listen" })}</>}
          {journal.step === "decision" && <><p>La contradiction et l’aveu sont établis. Tu peux proposer deux suites à cette cité. Le choix est durable ; aucun rang, point d’honneur ou trophée ne sera accordé ni retiré.</p><div className={styles.branches}>
            <article><h5>Rectification encadrée</h5><p>Rejoindre la gardienne des rites, corriger l’origine et le statut de la déclaration, puis confirmer au mentor. Le dossier d’apprentissage garde la correction ; aucun dossier d’examen supplémentaire n’est déposé aux Enforcers.</p>{action("Choisir la rectification encadrée", { kind: "choose", resolution: "supervised-correction" })}</article>
            <article><h5>Examen institutionnel</h5><p>Rejoindre le capitaine avec les relevés et l’aveu, limiter la conclusion aux faits, puis confirmer au mentor. Le dossier d’examen est conservé ; cela ne simule ni condamnation ni poursuite.</p>{action("Choisir l’examen institutionnel", { kind: "choose", resolution: "recorded-review" })}</article>
          </div></>}
          {journal.step === "correction" && <Correction disabled={disabled} submit={submit} />}
          {journal.step === "review" && <><p>Le capitaine reçoit les trois observations, la chronologie et l’aveu. Il te demande la portée exacte du dépôt.</p><div className={styles.choices}>
            {action("Joindre une condamnation déjà rédigée.", { kind: "file", scope: "condemn-novice" })}
            {action("Conserver les faits ; limiter la conclusion à cette déclaration.", { kind: "file", scope: "documented-claim-only" })}
            {action("Retirer l’aveu pour éviter toute question.", { kind: "file", scope: "erase-admission" })}
          </div></>}
          {journal.step === "closure" && <><p>{progress.resolution === "supervised-correction" ? "La gardienne a rectifié la déclaration. L’instructeur attend de confirmer sa réception avant de reprendre le novice en apprentissage." : "Le capitaine a reçu le dossier d’examen. L’instructeur attend de confirmer ce dépôt ; aucune sanction n’est présentée comme déjà prononcée."}</p>{action("Confirmer la suite donnée au dossier", { kind: "close" })}</>}
        </div>}
    {progress.clues.length > 0 && <div className={styles.notes}><button type="button" disabled={disabled} aria-expanded={notesOpen} aria-controls={notesId} onClick={() => setNotesOpen(open => !open)}>Relire les indices conservés · {progress.clues.length}/3</button><div id={notesId} hidden={!notesOpen}><ul>{SIDE_STORY_CLUES_V66.filter(clue => progress.clues.includes(clue.id)).map(clue => <li key={clue.id}>{clue.detail}</li>)}</ul>{progress.archiveRead && <ul>{SIDE_STORY_RECORDS_V66.map(record => <li key={record.id}><strong>{record.time} · {record.label} :</strong> {record.text}</li>)}</ul>}</div></div>}
    {feedback?.pointId === pointId && <p role="status" className={feedback.ok ? styles.feedback : styles.warning}>{feedback.message}</p>}
  </section>;
}
