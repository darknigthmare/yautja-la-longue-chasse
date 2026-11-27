'use client';
/* eslint-disable @next/next/no-img-element -- native historical candidate art loaded exactly. */
import { useCallback, useMemo, useState, type ComponentProps } from "react";
import PitCanvas from "./PitCanvas";
import {
  advancePitMasksBrokenProgress, parsePitMasksBrokenProgress, persistPitMasksBrokenProgress,
  pitMasksBrokenKey, type PitMasksBrokenStep,
} from "./systems/pitMasksBrokenPrologue";
import illustrations from "../../content/the-pit/les-masques-brises/art-index.v1.json";
import styles from "./PitMasksBrokenPrologue.module.css";

const cour = illustrations.images.find(entry => entry.id === "lmb-stage-01")!;
const groups = [
  ["stages", "Lieux"],
  ["fighters", "Chasseurs"],
  ["enemies", "Faune"],
  ["bosses", "Adversaires"],
] as const;

type Props = {
  owner: string;
  pit: ComponentProps<typeof PitCanvas>;
  onClose: () => void;
};

export default function PitMasksBrokenPrologue({ owner, pit, onClose }: Props) {
  const [step, setStep] = useState<PitMasksBrokenStep>(() => {
    try { return parsePitMasksBrokenProgress(window.localStorage.getItem(pitMasksBrokenKey(owner)), owner); }
    catch { return "arrival"; }
  });
  const [practice, setPractice] = useState(false);
  const [notice, setNotice] = useState("");
  const [group, setGroup] = useState<(typeof groups)[number][0]>("stages");
  const [observed, setObserved] = useState<string | null>(null);
  const record = useCallback((event: "inspect-rack" | "complete-riposte") => {
    const next = advancePitMasksBrokenProgress(step, event);
    if (next === step) return;
    try {
      setStep(persistPitMasksBrokenProgress(window.localStorage, owner, next));
      setNotice("");
    } catch {
      setNotice("Le geste est joué. La sauvegarde locale n’est pas disponible.");
      setStep(next);
    }
  }, [owner, step]);
  const onRiposteComplete = useCallback(() => record("complete-riposte"), [record]);
  const masksBrokenPractice = useMemo(() => ({ onRiposteComplete }), [onRiposteComplete]);

  if (practice) return <PitCanvas
    {...pit} initialLeftId="jungle-hunter" masksBrokenPractice={masksBrokenPractice}
    onExit={() => setPractice(false)} exitLabel="Revenir à la Cour des masques"
    onMatchComplete={undefined} onRunTransition={undefined}
    onOpenNarrativeTrials={undefined} onOpenCharacterChronicle={undefined}
  />;

  return <section className={styles.root} data-pit-masks-prologue={step} aria-labelledby="pit-masks-heading">
    <header className={styles.header}>
      <div><p>Les Masques Brisés</p><h2 id="pit-masks-heading">Cour des masques</h2></div>
      <button type="button" onClick={onClose}>Revenir au Pit</button>
    </header>
    <div className={styles.arrival}>
      <img src={cour.publicPath} alt="Cour de basalte, colonnes de bronze et râteliers sous un ciel rouge" />
      <article className={styles.rack}>
        <h3>Le dépôt pillé</h3>
        <p>Le convoi a laissé trois attaches au râtelier. Silex te demande de relever leurs marques avant de suivre les pistes.</p>
        <button type="button" data-pit-masks-observe="dust"
          onClick={() => setObserved("La poussière a été balayée près du seuil. Elle ne montre aucune direction.")}>Examiner les dalles</button>
        <button type="button" data-pit-masks-observe="rack" onClick={() => {
          setObserved("Trois crochets vides portent la même marque de transfert. Il faut montrer le relevé à la garde.");
          record("inspect-rack");
        }}>Examiner le râtelier</button>
        {observed && <p role="status">{observed}</p>}
        {step !== "arrival" && <p data-pit-masks-rack-evidence>Marque de transfert relevée au râtelier.</p>}
        {step === "guard-practised" && <p data-pit-masks-training-evidence>La garde a vu les quatre ripostes. Le relevé peut rejoindre les preuves du dépôt.</p>}
        <button type="button" disabled={step === "arrival"} data-pit-masks-start-practice
          onClick={() => setPractice(true)}>Travailler la riposte à la Fosse</button>
        {notice && <p role="status">{notice}</p>}
      </article>
    </div>
    <details className={styles.dossier}>
      <summary>Illustrations de repérage</summary>
      <div className={styles.controls} aria-label="Catégorie d’illustrations">
        {groups.map(([id, label]) => <button key={id} type="button" aria-pressed={group === id} onClick={() => setGroup(id)}>{label}</button>)}
      </div>
      <div className={styles.gallery}>
        {illustrations.images.filter(entry => entry.kind === group).map(entry =>
          <figure key={entry.id}>
            <img loading="lazy" src={entry.publicPath} alt={entry.name} />
            <figcaption>{entry.name}</figcaption>
          </figure>)}
      </div>
    </details>
  </section>;
}
