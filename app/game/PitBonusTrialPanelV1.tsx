"use client";

import type { RefObject } from "react";
import { PIT_FIGHTERS, PIT_TICK_RATE } from "./systems/pitCombat";
import { PIT_BONUS_TARGET_V1, pitBonusResultV1, pitBonusRulesV1, type PitBonusDifficultyV1, type PitBonusTrialV1 } from "./systems/pitBonusTrialV1";
import type { PitBonusRecordsReadV1 } from "./systems/pitBonusRecordsV1";
import styles from "./PitBonusTrialPanelV1.module.css";

interface Props {
  readonly trial: PitBonusTrialV1;
  readonly panelRef: RefObject<HTMLDivElement | null>;
  readonly controls: string;
  readonly assetsReady: boolean;
  readonly records: PitBonusRecordsReadV1;
  readonly recordNotice: string;
  readonly recordSaved: boolean;
  readonly inactive: boolean;
  readonly onBegin: () => void;
  readonly onPrepare: (difficulty: PitBonusDifficultyV1) => void;
  readonly onAbandon: () => void;
  readonly onSave: () => void;
  readonly onRetryAssets: () => void;
}

export default function PitBonusTrialPanelV1({ trial, panelRef, controls, assetsReady, records,
  recordNotice, recordSaved, inactive, onBegin, onPrepare, onAbandon, onSave, onRetryAssets }: Props) {
  const rules = pitBonusRulesV1(trial.difficulty), result = pitBonusResultV1(trial);
  const running = trial.status === "running", briefing = trial.status === "briefing";
  const best = records.records?.best[trial.difficulty];
  const signal = trial.stage === "signal" ? "ASSAUT BAS ANNONCÉ" : trial.stage === "defend" ? "GARDE BASSE"
    : trial.stage === "counter" ? "RIPOSTEZ" : "REPLACEMENT";
  return <div ref={panelRef} tabIndex={-1} className={styles.panel} role="region" aria-label="Épreuve bonus de riposte"
    data-pit-bonus={trial.status} data-bonus-stage={trial.stage} data-bonus-ticks={trial.elapsedTicks}
    data-bonus-completed={trial.completed} data-bonus-errors={trial.mistakes} data-bonus-difficulty={trial.difficulty}
    inert={inactive}>
    <div className={styles.heading}>
      <div><span className={styles.eyebrow}>ÉPREUVE BONUS · SIMULATION PIT</span><h2>Épreuve de riposte</h2></div>
      <strong className={styles.time} aria-label={`${Math.ceil(result.remainingTicks / PIT_TICK_RATE)} secondes restantes`}>
        {Math.ceil(result.remainingTicks / PIT_TICK_RATE)}<small> S</small>
      </strong>
    </div>
    {!running && <p>Préparation facultative avant un rival. Création originale de THE PIT, avec les gestes du kit standard et les visuels déjà disponibles. Le partenaire simulé est {PIT_FIGHTERS[trial.dummyId].name}.</p>}
    {briefing ? <>
      <p className={styles.objective}><strong>Réussir {PIT_BONUS_TARGET_V1} gardes suivies d’une riposte.</strong> Attendez l’assaut bas annoncé, bloquez, puis relâchez la garde, approchez et touchez avec une frappe normale. Une technique ou une projection ne valide pas la riposte.</p>
      <p>{controls}</p>
      <div className={styles.choices} role="group" aria-label="Niveau d’aide de l’épreuve">
        <button type="button" aria-pressed={trial.difficulty === "standard"} onClick={() => onPrepare("standard")}>Standard · 40 s · 3 erreurs</button>
        <button type="button" aria-pressed={trial.difficulty === "assisted"} onClick={() => onPrepare("assisted")}>Timing accompagné · 60 s · 5 erreurs</button>
      </div>
      <p>Vie, ressources et objets remis à leur état initial entre les séquences. Trois erreurs (cinq avec l’aide) ou la fin du chrono arrêtent la tentative. Le chrono attend votre départ.</p>
      <p role="status">{assetsReady ? "Visuels chargés. Prêt à commencer." : "Visuels requis en attente : l’épreuve et le chronomètre restent arrêtés."}</p>
      {!assetsReady && <button type="button" onClick={onRetryAssets}>Réessayer les visuels</button>}
    </> : <>
      <p className={styles.signal} role="status" aria-live="polite" aria-atomic="true">{running ? signal : trial.status === "success" ? "ÉPREUVE ACCOMPLIE" : "ÉPREUVE À REPRENDRE"}</p>
      <div className={styles.metrics}><span>Ripostes <strong>{trial.completed}/{PIT_BONUS_TARGET_V1}</strong></span><span>Erreurs <strong>{trial.mistakes}/{rules.maxMistakes}</strong></span><span>Score <strong>{result.score}</strong></span></div>
      <p className={styles.message}>{trial.message}</p>
      {!running && <p><strong>Rang : {result.rank}</strong> · {(trial.elapsedTicks / PIT_TICK_RATE).toFixed(2)} s de simulation. Score : 1 000 par séquence, −200 par erreur, puis bonus de temps en cas de réussite.</p>}
    </>}
    {!running && <>
      <p className={styles.record}>{best ? `Record ${trial.difficulty === "assisted" ? "accompagné" : "standard"} : ${best.score} · kit ${PIT_FIGHTERS[best.playerId].name} · ${(best.elapsedTicks / PIT_TICK_RATE).toFixed(2)} s.` : records.message}</p>
      <p className={styles.note}>Le résultat reste propre à cette épreuve. Aucun résultat de duel, honneur, distinction ou changement de chapitre. La tentative ne reprend pas après fermeture. Ce record est conservé uniquement dans ce navigateur et n’est pas inclus dans l’export de campagne.</p>
    </>}
    <div className={styles.actions}>
      {briefing ? <button type="button" data-bonus-begin disabled={!assetsReady} onClick={onBegin}>Commencer l’épreuve</button>
        : <button type="button" data-bonus-restart onClick={() => onPrepare(trial.difficulty)}>Recommencer</button>}
      <button type="button" data-bonus-abandon onClick={onAbandon}>{running ? "Abandonner l’épreuve" : "Retour à l’entraînement libre"}</button>
      {trial.status === "success" && <button type="button" data-bonus-save disabled={!records.records || recordSaved} onClick={onSave}>{recordSaved ? "Record conservé" : "Conserver ce record local"}</button>}
    </div>
    {!running && <p className={styles.note}>Clavier : Tab puis Entrée/Espace. Manette : croix haut/bas et A ; B revient à l’entraînement libre. Start ouvre la pause.</p>}
    {recordNotice && <p className={styles.record} role="status">{recordNotice}</p>}
  </div>;
}
