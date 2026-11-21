"use client";

import { useEffect, useState } from "react";
import {
  canMoveInPassage, initialElderPassageJudgment, PASSAGE_ANCHORS, PASSAGE_START,
  PASSAGE_TRACES, PASSAGE_WITNESS, passageTile, samePassagePoint, simulateElderPassage,
  type ElderPassageJudgmentV168, type PassageCommand, type PassageOperation, type PassagePoint,
  type PassageResponse, type PassageTrial,
} from "./systems/elderPassageJudgmentV168";
import styles from "./ElderPassageJudgment.module.css";

type Preview = ReturnType<typeof simulateElderPassage> & { index: number; command: PassageCommand };
const arrow: Record<string, PassagePoint> = {
  ArrowLeft: { column: -1, row: 0 }, ArrowRight: { column: 1, row: 0 },
  ArrowUp: { column: 0, row: -1 }, ArrowDown: { column: 0, row: 1 },
};
const labels: Record<string, string> = { ArrowLeft: "Ouest", ArrowRight: "Est", ArrowUp: "Nord", ArrowDown: "Sud" };
const tiles: Record<string, string> = { wall: "Roche", path: "Appui", narrows: "Goulet", gap: "Vide", bridge: "Passerelle" };

export default function ElderPassageJudgment({
  owner, saved, onCommand, onClose,
}: {
  owner: string;
  saved: ElderPassageJudgmentV168 | null | undefined;
  onCommand: (command: PassageCommand) => PassageResponse;
  onClose: () => void;
}) {
  const state = saved ?? initialElderPassageJudgment(owner);
  const [position, setPosition] = useState(PASSAGE_START);
  const [message, setMessage] = useState("");
  const [delay, setDelay] = useState(0);
  const [preview, setPreview] = useState<Preview | null>(null);
  const trace = samePassagePoint(position, PASSAGE_TRACES.west) ? "west" :
    samePassagePoint(position, PASSAGE_TRACES.east) ? "east" : null;
  const anchor = samePassagePoint(position, PASSAGE_ANCHORS.west) ? "west" :
    samePassagePoint(position, PASSAGE_ANCHORS.east) ? "east" : null;

  useEffect(() => {
    if (!preview) return;
    const timer = window.setTimeout(() => {
      if (document.hidden) {
        setPreview({ ...preview });
      } else if (preview.index + 1 < preview.frames.length) {
        setPreview({ ...preview, index: preview.index + 1 });
      } else {
        setPreview(null);
        setMessage(onCommand(preview.command).message);
      }
    }, 205);
    return () => window.clearTimeout(timer);
  }, [onCommand, preview]);

  const move = (step: PassagePoint) => {
    if (preview) return;
    const destination = { column: position.column + step.column, row: position.row + step.row };
    if (canMoveInPassage(destination, state.anchors)) {
      setPosition(destination);
      setMessage("");
    } else {
      setMessage("Ce côté du passage est impraticable.");
    }
  };
  const command = (operation: PassageOperation): PassageCommand => ({ expectedRevision: state.revision, position, operation });
  const commit = (operation: PassageOperation) => setMessage(onCommand(command(operation)).message);
  const replay = (trial: PassageTrial, operation: PassageOperation) => {
    setMessage("");
    setPreview({ ...simulateElderPassage(trial, state.anchors), index: 0, command: command(operation) });
  };
  const frame = preview?.frames[preview.index];
  const tested = state.trial && simulateElderPassage(state.trial, state.anchors).passed;

  return <section className={styles.scene} aria-labelledby="elder-pass-heading" data-elder-passage-v168>
    <header className={styles.header}>
      <h3 id="elder-pass-heading">Le passage disputé</h3>
      <button type="button" onClick={onClose}>Retour aux épreuves</button>
    </header>
    <p>Deux chasseurs veulent franchir le même goulet. Relève leurs traces à l’ouest et à l’est, puis montre au témoin un arrangement praticable.</p>
    <p>Le passage est visible depuis le promontoire au sud. Les ancrages de la passerelle se trouvent au nord de chaque accès.</p>
    <div className={styles.board} role="group" tabIndex={0} data-passage-board
      aria-label="Plan du passage. Flèches pour se déplacer."
      onKeyDown={event => {
        if (event.target !== event.currentTarget || !Object.hasOwn(arrow, event.key)) return;
        event.preventDefault();
        event.stopPropagation();
        move(arrow[event.key]);
      }}>
      {Array.from({ length: 45 }, (_, index) => {
        const cell = { column: index % 9, row: Math.floor(index / 9) };
        const tile = passageTile(cell.column, cell.row, state.anchors);
        const isPlayer = samePassagePoint(cell, position);
        const marker = samePassagePoint(cell, PASSAGE_WITNESS) ? "T" :
          samePassagePoint(cell, PASSAGE_TRACES.west) || samePassagePoint(cell, PASSAGE_TRACES.east) ? "·" : "";
        const west = frame?.west && samePassagePoint(cell, frame.west);
        const east = frame?.east && samePassagePoint(cell, frame.east);
        return <div key={index} className={styles.tile} data-terrain={tile} data-player={isPlayer ? "true" : undefined}
          data-west={west ? "true" : undefined} data-east={east ? "true" : undefined}
          data-blocked={frame?.blocked && (west || east) ? "true" : undefined} aria-hidden="true">
          {isPlayer ? "●" : west && east ? "×" : west ? "O" : east ? "E" : marker}
        </div>;
      })}
    </div>
    <p data-passage-position>Case {position.column + 1}, ligne {position.row + 1} · {tiles[passageTile(position.column, position.row, state.anchors)]}</p>
    <div className={styles.controls} aria-label="Déplacement">
      {Object.entries(arrow).map(([id, step]) => <button key={id} type="button" onClick={() => move(step)} disabled={!!preview}>{labels[id]}</button>)}
    </div>
    <p>Traces relevées · {Number(Boolean(state.traces & 1)) + Number(Boolean(state.traces & 2))}/2</p>

    {state.resolved ? <p className={styles.result} role="status" data-passage-resolved>Jugement observé · {state.trial?.method === "bridge" ? "Second chemin" : "Horaires séparés"}</p> :
      <div className={styles.controls} aria-label="Actions du dossier">
        {trace && <button type="button" disabled={!!preview || Boolean(state.traces & (trace === "west" ? 1 : 2))} onClick={() => commit({ type: "read-trace", side: trace })}>
          Relever la trace {trace === "west" ? "ouest" : "est"}
        </button>}
        {state.traces === 3 && !state.replayed && <button type="button" disabled={!!preview} onClick={() => replay({ method: "schedule", delay: 0 }, { type: "replay" })}>
          Rejouer le trajet contesté
        </button>}
        {state.replayed && <>
          <label>Départ du chasseur est
            <select value={delay} disabled={!!preview} onChange={event => setDelay(Number(event.target.value))}>
              {Array.from({ length: 9 }, (_, value) => <option key={value} value={value}>{value === 0 ? "Même départ" : `+${value} temps de marche`}</option>)}
            </select>
          </label>
          <button type="button" disabled={!!preview} onClick={() => {
            const trial = { method: "schedule", delay } as const;
            replay(trial, { type: "test", trial });
          }}>Essayer les horaires</button>
          {anchor && <button type="button" disabled={!!preview || Boolean(state.anchors & (anchor === "west" ? 1 : 2))}
            onClick={() => commit({ type: "anchor", side: anchor })}>Poser l’ancrage {anchor === "west" ? "ouest" : "est"}</button>}
          <button type="button" disabled={!!preview || state.anchors !== 3} onClick={() => {
            const trial = { method: "bridge" } as const;
            replay(trial, { type: "test", trial });
          }}>Essayer le second trajet</button>
          <button type="button" disabled={!!preview || !tested || !samePassagePoint(position, PASSAGE_WITNESS)}
            onClick={() => commit({ type: "settle" })}>Présenter l’arrangement au témoin</button>
        </>}
      </div>}
    <p role="status" aria-live="polite" data-passage-status>{message || (preview ? "Relecture des déplacements…" : "")}</p>
  </section>;
}
