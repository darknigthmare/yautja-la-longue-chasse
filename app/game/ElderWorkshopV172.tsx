"use client";

import { useState } from "react";
import type { SaveGame } from "./types";
import {
  allowedElderWorkshopActionsV172, inspectElderWorkshopV172,
  type ElderWorkshopActionV172, type ElderWorkshopCommandV172, type ElderWorkshopResponseV172,
} from "./systems/elderWorkshopV172";
import styles from "./ElderWorkshopV172.module.css";

const LABELS: Record<ElderWorkshopActionV172, string> = {
  observe: "Observer Griffe de Fer à l’établi",
  inspect: "Inspecter la bague fendue",
  repair: "Réparer avec le guide de serrage",
  support: "Essayer le montage à froid de Griffe de Fer",
  align: "Avancer le guide d’un cran",
  fit: "Fixer la bague sur son support",
  handover: "Rendre la conduite de l’atelier",
};

export default function ElderWorkshopV172({ save, disabled, onCommand }: {
  save: SaveGame;
  disabled: boolean;
  onCommand: (command: ElderWorkshopCommandV172) => Pick<ElderWorkshopResponseV172, "ok" | "message">;
}) {
  const [feedback, setFeedback] = useState("");
  const { state, view } = inspectElderWorkshopV172(save.elderWorkshopV172, save.createdAt);
  return (
    <section className={styles.workshop} aria-labelledby="elder-workshop-title" data-elder-workshop-phase={view.phase}>
      <h3 id="elder-workshop-title">L’atelier qui fonctionne sans moi</h3>
      <p>Griffe de Fer tient cet atelier. Il attend une aide ponctuelle sur le montage d’une bague de protection.</p>
      {view.phase === "decide" && <p>La fissure coupe le bord du logement. Tu peux redresser cette bague ou essayer le montage à froid que Griffe de Fer prépare.</p>}
      {view.method && (
        <div className={styles.workbench}>
          <p>{view.method === "repair" ? "Guide de serrage" : "Montage à froid"}</p>
          <meter min={0} max={view.target} value={view.alignment} aria-label="Alignement de la bague" />
          <span>{view.alignment}/{view.target} crans alignés</span>
        </div>
      )}
      {view.phase === "complete" ? <p>Intervention consignée. Griffe de Fer a repris son poste.</p> : (
        <div className={styles.actions}>
          {allowedElderWorkshopActionsV172(view).map(action => (
            <button key={action} type="button" className="ghost-button" disabled={disabled}
              data-elder-workshop-action={action} onClick={() =>
                setFeedback(onCommand({ action, expectedRevision: state?.history.length ?? 0 }).message)}>
              {LABELS[action]}
            </button>
          ))}
        </div>
      )}
      <p role="status" aria-live="polite">{feedback}</p>
    </section>
  );
}
