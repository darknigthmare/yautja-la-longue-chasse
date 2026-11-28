"use client";

import { useMemo, useState } from "react";
import TrainingDrill from "./TrainingDrill";
import { YautjaTermV67 } from "./YautjaTranslationV67";
import HomeworldNpcSpriteV84 from "./HomeworldNpcSpriteV84";
import {
  canEnterEliteClanRites, canWalkEliteClanRites, completedEliteClanRites, ELITE_CLAN_RITES_GROUND, ELITE_CLAN_RITES_POSTS,
  ELITE_CLAN_TRIALS, type EliteClanRitePoint, type EliteClanTrialId,
} from "./systems/eliteClanRitesV175";
import {
  canEnterEliteRecognition, inspectEliteRecognition, sameEliteRecognitionPoint, type EliteRecognitionCommand,
  type EliteRecognitionResponse, type EliteRecognitionSave,
} from "./systems/eliteRecognitionV174";
import type { TrainingDrillTrace } from "./systems/trainingDrill";
import styles from "./EliteRecognition.module.css";
import arena from "./EliteClanRites.module.css";

const Criteria: Record<EliteClanTrialId, string> = {
  blades: "Réussis huit gestes sur dix. Montre une frappe et une parade.",
  plasma: "Réussis huit gestes sur dix. Tire sur une cible et retiens le tir devant une silhouette protégée.",
  hunt: "Réussis trois gestes par phase. Montre les lames, le tir et sa retenue.",
};

const DIRECTIONS = [
  { key: "ArrowLeft", label: "Marcher à gauche", glyph: "←", column: -1, row: 0 },
  { key: "ArrowUp", label: "Avancer", glyph: "↑", column: 0, row: -1 },
  { key: "ArrowDown", label: "Reculer", glyph: "↓", column: 0, row: 1 },
  { key: "ArrowRight", label: "Marcher à droite", glyph: "→", column: 1, row: 0 },
] as const;

const LANDMARKS: Record<string, string> = {
  c: "Chef du clan", v: "Vétéran", l: "Lames", p: "Plasma", h: "Cercle holographique", e: "Vestibule",
};

function ArenaActor({ tile }: { tile: "c" | "v" }) {
  const chief = tile === "c";
  return <span className={arena.actor} aria-hidden="true" data-elite-clan-actor={chief ? "chief" : "veteran"}>
    <HomeworldNpcSpriteV84 npcId={chief ? "elite-chief-l06" : "elite-veteran-l06"}
      role={chief ? "chief" : "instructor"} height={44}>
      <span className={arena.actorFallback}>{chief ? "C" : "V"}</span>
    </HomeworldNpcSpriteV84>
  </span>;
}

export default function EliteClanRites({ save, suspended, onCommand, onClose, onOpenRecognition, onOpenQueenMission }: {
  save: EliteRecognitionSave;
  suspended: boolean;
  onCommand: (command: EliteRecognitionCommand) => EliteRecognitionResponse;
  onClose: () => void;
  onOpenRecognition: () => void;
  onOpenQueenMission?: () => void;
}) {
  const state = useMemo(() => inspectEliteRecognition(save.eliteRecognitionV174, save.createdAt).state,
    [save.eliteRecognitionV174, save.createdAt]);
  const [position, setPosition] = useState<EliteClanRitePoint>(ELITE_CLAN_RITES_POSTS.entry);
  const [active, setActive] = useState<EliteClanTrialId | null>(null);
  const [pending, setPending] = useState<TrainingDrillTrace | null>(null);
  const [message, setMessage] = useState("");
  const receipts = state?.trials ?? [];
  const next = ELITE_CLAN_TRIALS[receipts.length];
  const trial = ELITE_CLAN_TRIALS.find(item => item.id === active);
  const eligible = canEnterEliteClanRites(save);
  const isAt = (post: EliteClanRitePoint) => sameEliteRecognitionPoint(position, post);
  const ready = next && isAt(ELITE_CLAN_RITES_POSTS[next.id]);
  const atChief = isAt(ELITE_CLAN_RITES_POSTS.hunt);
  const currentTile = ELITE_CLAN_RITES_GROUND[position.row][position.column];

  function move(direction: EliteClanRitePoint) {
    if (suspended || active) return;
    setPosition(current => {
      const target = { column: current.column + direction.column, row: current.row + direction.row };
      return canWalkEliteClanRites(target) ? target : current;
    });
  }

  function receiveMandate() {
    if (suspended || !atChief || !eligible || next || state?.queenMandate) return;
    const result = onCommand({ expectedRevision: state?.revision ?? 0, position, operation: { type: "queen-mandate" } });
    setMessage(result.message);
  }
  const recordTrial = (trace: TrainingDrillTrace) => {
    if (!trial) return;
    const result = onCommand({ expectedRevision: state?.revision ?? 0, position,
      operation: { type: "trial", id: trial.id, trace } });
    setMessage(result.message);
    if (result.retryable) {
      setPending(trace);
      return;
    }
    setPending(null);
    setActive(null);
  };

  return <section className={styles.scene} aria-labelledby="elite-clan-rites-heading"
    data-elite-clan-rites={completedEliteClanRites(receipts) ? "complete" : "training"}>
    <header className={styles.header}>
      <div><h3 id="elite-clan-rites-heading">Les rites du clan</h3><YautjaTermV67 term="kehrite" /></div>
      <button type="button" onClick={onClose}>Fermer les épreuves</button>
    </header>
    <div className={arena.layout}>
      <div>
        <div className={arena.board} tabIndex={0} role="group" aria-label="Arène des rites du clan"
          aria-describedby="elite-arena-position" data-elite-clan-arena data-column={position.column} data-row={position.row}
          onKeyDown={event => {
            if (event.ctrlKey || event.altKey || event.metaKey) return;
            const direction = DIRECTIONS.find(item => item.key === event.key);
            if (!direction) return;
            event.preventDefault();
            move(direction);
          }}>
          {ELITE_CLAN_RITES_GROUND.flatMap((row, y) => Array.from(row, (tile, x) => {
            const hunter = position.column === x && position.row === y;
            const activePost = next ? ELITE_CLAN_RITES_POSTS[next.id] : ELITE_CLAN_RITES_POSTS.hunt;
            return <div key={y + ":" + x} className={arena.tile} aria-hidden="true" data-tile={tile}
              data-current={hunter} data-next={activePost.column === x && activePost.row === y} title={LANDMARKS[tile]}>
              {tile === "c" || tile === "v" ? <ArenaActor tile={tile} /> : hunter ? "◆" :
                tile === "l" || tile === "p" || tile === "h" ? "◇" : undefined}
            </div>;
          }))}
        </div>
        <p id="elite-arena-position" aria-live="polite" className={arena.position}>
          {LANDMARKS[currentTile] ?? "Arène"} · colonne {position.column + 1}, rangée {position.row + 1}
        </p>
        <div className={styles.controls} role="group" aria-label="Déplacement dans l’arène">
          {DIRECTIONS.map(direction => <button type="button" key={direction.key} aria-label={direction.label}
            disabled={suspended || active !== null} onClick={() => move(direction)}>{direction.glyph}</button>)}
        </div>
      </div>
      <div>
        <ol>
          {ELITE_CLAN_TRIALS.map(item => <li key={item.id}>
            {item.label} · {receipts.some(receipt => receipt.id === item.id) ? "Consigné" : next?.id === item.id ? "À jouer" : "Épreuve suivante"}
          </li>)}
        </ol>
        {!eligible && next && <p>Le vétéran attend la reconnaissance Blooded, les huit retours de chasse et une carrière sans gel.</p>}
        {eligible && next && <>
          <p><strong>{next.id === "hunt" ? "Chef du clan" : "Vétéran"}</strong> · {Criteria[next.id]}</p>
          {!ready && <p>Avance jusqu’au poste marqué dans l’arène.</p>}
          <button type="button" data-elite-clan-trial={next.id} disabled={suspended || !ready}
            onClick={() => { setMessage(""); setActive(next.id); }}>Commencer l’épreuve</button>
        </>}
        {!next && <>
          <p data-elite-clan-rites-receipt>Les trois épreuves sont consignées.</p>
          {state?.queenMandate ? <p data-elite-queen-mandate-recorded>Le mandat du Berceau figure au registre du clan.</p> :
            <button type="button" data-elite-queen-mandate disabled={suspended || !eligible || !atChief}
              onClick={receiveMandate}>Recevoir le mandat du chef</button>}
          {state?.queenMandate && onOpenQueenMission && <button type="button" data-elite-open-queen-mission
            disabled={suspended} onClick={onOpenQueenMission}>Consulter le dossier du Berceau</button>}
          {canEnterEliteRecognition(save) &&
            <button type="button" onClick={onOpenRecognition}>Rejoindre les témoins</button>}
        </>}
      </div>
    </div>
    {!trial && message && <p role="status">{message}</p>}
    {trial && <TrainingDrill disciplineId={trial.disciplineId} seed={trial.seed} clanPlasma={trial.clanPlasma}
      controlBindings={save.settings.controlBindings} suspended={suspended || !eligible} onTrace={recordTrial}
      saveIssue={pending ? message : null} onRetrySave={pending ? () => recordTrial(pending) : undefined}
      onCancel={() => { setPending(null); setActive(null); setMessage(""); }} />}
  </section>;
}
