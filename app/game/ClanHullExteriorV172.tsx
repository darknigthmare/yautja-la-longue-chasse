"use client";

import { useState } from "react";
import {
  createHullExteriorView, HULL_EXTERIOR_DIRECTIONS, HULL_EXTERIOR_GRID, hullExteriorTile,
  MAX_HULL_EXTERIOR_STEPS, stepHullExterior, type HullExteriorCommand, type HullExteriorSurveyV172,
} from "./systems/clanHullExteriorV172";
import type { ClanHullProjectResponseV171 } from "./systems/clanHullProjectV171";
import styles from "./ClanHullExteriorV172.module.css";

const DIRECTIONS = Object.entries(HULL_EXTERIOR_DIRECTIONS) as [
  keyof typeof HULL_EXTERIOR_DIRECTIONS, typeof HULL_EXTERIOR_DIRECTIONS[keyof typeof HULL_EXTERIOR_DIRECTIONS],
][];
const MARKERS: Record<string, { icon: string; label: string }> = {
  S: { icon: "▣", label: "Sas du hangar" },
  C: { icon: "⊕", label: "Verrou de la passerelle" },
  G: { icon: "▥", label: "Passerelle de service" },
  R: { icon: "◇", label: "Scellé du pont de relève" },
  V: { icon: "◈", label: "Scellé de la passerelle de veille" },
};

export default function ClanHullExteriorV172({ onClose, onReturn }: {
  onClose: () => void;
  onReturn: (survey: HullExteriorSurveyV172) => ClanHullProjectResponseV171;
}) {
  const [run, setRun] = useState(() => ({ view: createHullExteriorView(), route: [] as HullExteriorCommand[] }));
  const [message, setMessage] = useState("");
  const tile = hullExteriorTile(run.view.position);
  const canInspect = stepHullExterior(run.view, "inspect") !== run.view;
  const canReturn = stepHullExterior(run.view, "report") !== run.view;
  const couldRecordGesture = run.route.length < MAX_HULL_EXTERIOR_STEPS - 1;

  const act = (command: HullExteriorCommand) => {
    const next = stepHullExterior(run.view, command);
    if (next === run.view) {
      setMessage("Le passage est fermé. Suis les appuis de la cale.");
      return;
    }
    if (command === "report") {
      const result = onReturn({ route: [...run.route, command] });
      setMessage(result.message);
      return;
    }
    if (!couldRecordGesture) {
      setMessage("Le relevé est plein. Repars du sas pour reprendre la visite.");
      return;
    }
    setRun({ view: next, route: [...run.route, command] });
    setMessage(command === "inspect" && MARKERS[tile]
      ? MARKERS[tile].label + " consigné." : "");
  };

  return <section className={styles.scene} aria-labelledby="hull-exterior-title" data-hull-exterior>
    <header className={styles.header}>
      <div>
        <h4 id="hull-exterior-title">Chantier des Coques Ouvertes</h4>
        <p>Depuis le sas, sécurise la passerelle et contrôle les deux scellés extérieurs.</p>
      </div>
      <button type="button" onClick={onClose}>Replier la visite</button>
    </header>
    <div className={styles.layout}>
      <div>
        <div className={styles.board} tabIndex={0} role="group" aria-label="Cale sèche. Flèches pour se déplacer."
          data-hull-exterior-board data-column={run.view.position.column} data-row={run.view.position.row}
          onKeyDown={event => {
            const direction = DIRECTIONS.find(([, move]) => move.key === event.key);
            if (!direction) return;
            event.preventDefault();
            event.stopPropagation();
            if (!event.repeat) act(direction[0]);
          }}>
          {HULL_EXTERIOR_GRID.flatMap((row, y) => Array.from(row, (character, x) => {
            const here = x === run.view.position.column && y === run.view.position.row;
            const sealed = character === "#" || (character === "G" && !run.view.gantrySecured);
            return <span key={x + "-" + y} className={styles.tile} data-sealed={sealed}
              data-marker={!!MARKERS[character]} data-player={here} title={MARKERS[character]?.label}
              aria-hidden="true">{here ? "▲" : MARKERS[character]?.icon}</span>;
          }))}
        </div>
        <div className={styles.controls} aria-label="Déplacements">
          {DIRECTIONS.map(([id, move]) => <button type="button" key={id} onClick={() => act(id)}>{move.label}</button>)}
        </div>
      </div>
      <div className={styles.evidence}>
        <p>{MARKERS[tile]?.label ?? "Sur la galerie de service"}</p>
        <ul>
          <li>Passerelle · {run.view.gantrySecured ? "Sécurisée" : "Verrouillée"}</li>
          <li>Pont de relève · {run.view.reliefSeen ? "Relevé effectué" : "À inspecter"}</li>
          <li>Passerelle de veille · {run.view.watchSeen ? "Relevé effectué" : "À inspecter"}</li>
        </ul>
        {canInspect && <button type="button" data-hull-exterior-inspect onClick={() => act("inspect")}>
          {tile === "C" ? "Sécuriser la passerelle" : "Relever le scellé"}
        </button>}
        {canReturn && <button type="button" data-hull-exterior-return onClick={() => act("report")}>Déposer le relevé au sas</button>}
        {!couldRecordGesture && <button type="button" onClick={() => {
          setRun({ view: createHullExteriorView(), route: [] }); setMessage("Reprise au sas du hangar.");
        }}>Reprendre depuis le sas</button>}
        <p role="status">{message}</p>
      </div>
    </div>
  </section>;
}
