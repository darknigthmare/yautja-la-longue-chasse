import { useState } from "react";
import type { SaveGame } from "./types";
import {
  canWalkMastery, initialEliteMastery, MASTERY_DISCIPLINES, MASTERY_LABELS,
  MASTERY_LEDGE, MASTERY_MAP, MASTERY_START, MASTERY_STATIONS, masteryActionAt, sameMasteryPoint,
  type MasteryCommand, type MasteryDiscipline, type MasteryPoint, type MasteryResponse,
} from "./systems/eliteMasteryV170";
import styles from "./EliteMastery.module.css";

const directions = [
  { key: "ArrowUp", name: "Nord", symbol: "↑", column: 0, row: -1 },
  { key: "ArrowLeft", name: "Ouest", symbol: "←", column: -1, row: 0 },
  { key: "ArrowDown", name: "Sud", symbol: "↓", column: 0, row: 1 },
  { key: "ArrowRight", name: "Est", symbol: "→", column: 1, row: 0 },
] as const;

export default function EliteMastery({ save, onCommand, onClose }: {
  save: SaveGame;
  onCommand: (command: MasteryCommand) => MasteryResponse;
  onClose: () => void;
}) {
  const state = save.eliteMasteryV170 ?? initialEliteMastery(save.createdAt);
  const [position, setPosition] = useState(() => state.stages.mobility === 1 ? MASTERY_LEDGE : MASTERY_START);
  const [message, setMessage] = useState("");
  const [primary, setPrimary] = useState<MasteryDiscipline | "">("");
  const [secondary, setSecondary] = useState<MasteryDiscipline | "">("");
  const station = masteryActionAt(state, position);
  const mentor = sameMasteryPoint(position, MASTERY_START);
  const completed = MASTERY_DISCIPLINES.filter(discipline => state.stages[discipline] === 2);
  const move = (direction: MasteryPoint) => {
    const destination = { column: position.column + direction.column, row: position.row + direction.row };
    if (canWalkMastery(destination)) {
      setPosition(destination);
      setMessage("");
    } else {
      setMessage("Ce passage est fermé.");
    }
  };
  const submit = (operation: MasteryCommand["operation"]) => {
    const result = onCommand({ expectedRevision: state.revision, position, operation });
    setMessage(result.message);
    if (result.ok && result.destination) setPosition(result.destination);
  };

  return <section className={styles.scene} aria-labelledby="mastery-heading" data-elite-mastery-v170>
    <header className={styles.header}>
      <h3 id="mastery-heading">Le terrain de maîtrise</h3>
      <button type="button" onClick={onClose}>Fermer le terrain</button>
    </header>
    <div className={styles.layout}>
      <div>
        <div className={styles.board} role="group" tabIndex={0} data-mastery-board
          aria-label="Plan du terrain. Flèches pour te déplacer."
          onKeyDown={event => {
            const direction = directions.find(item => item.key === event.key);
            if (direction) {
              event.preventDefault();
              event.stopPropagation();
              move(direction);
            }
          }}>
          {MASTERY_MAP.flatMap((row, y) => [...row].map((tile, column) => {
            const point = { column, row: y };
            const here = sameMasteryPoint(point, position);
            const place = MASTERY_STATIONS.find(item => sameMasteryPoint(item.point, point));
            const terrain = tile === "#" ? "wall" : place?.discipline ?? "path";
            return <span aria-hidden="true" key={y * row.length + column} className={styles.tile}
              data-terrain={terrain} data-player={here || undefined} title={place?.mark}>
              {here ? <span className={styles.player}>◆</span> :
                sameMasteryPoint(point, MASTERY_START) ? "Mentor" : place?.mark}
            </span>;
          }))}
        </div>
        <div className={styles.movement} role="group" aria-label="Déplacement sur le terrain">
          {directions.map(direction => <button key={direction.key} type="button"
            aria-label={direction.name} onClick={() => move(direction)}>{direction.symbol}</button>)}
        </div>
      </div>
      <div className={styles.details}>
        <p data-mastery-position>Case {position.column + 1}, ligne {position.row + 1}{mentor ? " · Mentor" : ""}</p>
        <ul className={styles.disciplines} aria-label="Disciplines démontrées">
          {MASTERY_DISCIPLINES.map(discipline => <li key={discipline}>
            <span>{MASTERY_LABELS[discipline]}</span>
            <span>{state.stages[discipline] === 2 ? "Démontrée" : state.stages[discipline] === 1 ? "En cours" : "À essayer"}</span>
          </li>)}
        </ul>
        {station && <button type="button" onClick={() => submit({ type: "station", station: station.id })}>{station.label}</button>}
        <p className={styles.status} role="status" aria-live="polite">{message}</p>
      </div>
    </div>
    {state.profile ? <p className={styles.result} data-mastery-recorded>
      <strong>Profil de maîtrise</strong> · {MASTERY_LABELS[state.profile.primary]}
      {state.profile.secondary ? " et " + MASTERY_LABELS[state.profile.secondary] : " · Spécialité"}
    </p> : mentor && completed.length > 0 ? <fieldset className={styles.choice}>
      <legend>Présenter la démonstration au mentor</legend>
      <div>
        <label htmlFor="mastery-primary">Discipline principale</label>
        <select id="mastery-primary" value={primary} onChange={event => {
          const value = event.target.value as MasteryDiscipline | "";
          setPrimary(value);
          if (value === secondary) setSecondary("");
        }}>
          <option value="">Choisir une discipline</option>
          {completed.map(discipline => <option key={discipline} value={discipline}>{MASTERY_LABELS[discipline]}</option>)}
        </select>
      </div>
      {completed.length > 1 && <div>
        <label htmlFor="mastery-secondary">Discipline associée</label>
        <select id="mastery-secondary" value={secondary} onChange={event => setSecondary(event.target.value as MasteryDiscipline | "")}>
          <option value="">Garder cette spécialité</option>
          {completed.filter(discipline => discipline !== primary).map(discipline =>
            <option key={discipline} value={discipline}>{MASTERY_LABELS[discipline]}</option>)}
        </select>
      </div>}
      <button type="button" disabled={!primary} onClick={() => {
        if (primary) submit({ type: "profile", profile: { primary, secondary: secondary || null } });
      }}>Consigner le profil</button>
    </fieldset> : <p>Après une démonstration, retourne auprès du mentor pour consigner ta spécialité ou une combinaison.</p>}
  </section>;
}
