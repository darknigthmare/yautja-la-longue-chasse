"use client";
/**
 * V157 — transition de voie « Trophée » (STORY5-TR-Ox-02), jouée à l'atelier
 * de trophées (mur des trophées). Le trophée posé au banc est choisi parmi
 * les prises réellement possédées ; chaque geste et le choix passent par
 * `onAction`, qui n'actualise l'écran qu'après l'écriture confirmée.
 */
import { useState } from "react";
import type { TrophyRecord } from "./types";
import type { TrophyUsageV147 } from "./systems/trophyUsagesV147";
import OriginTrophyBenchO6 from "./OriginTrophyBenchO6";
import { isFutureOriginV151, originOfSaveV151, originV151 } from "./systems/originsV151";
import { trophyTransitionOpenV157, trophyTransitionRecordV157, trophyTransitionV157 } from "./systems/originTrophyV157";
import styles from "./ResidencePanelV149.module.css";

export type OriginTrophyActionV157 =
  | { kind: "step"; trophyId: string; index: number }
  | { kind: "choose"; trophyId: string; choice: 0 | 1 };

export default function OriginTrophyTransitionPanelV157({ origin, trophies, atWorkshop, disabled, onAction, heldOriginalIds = [] }: {
  origin: unknown; atWorkshop: boolean; disabled: boolean;
  /** V158: voie originals really under the hunter's custody. */
  heldOriginalIds?: readonly string[];
  /** The player's own trophies (SaveGame.trophies), with a display label. */
  trophies: readonly { id: string; label: string; record?: TrophyRecord; usage?: TrophyUsageV147 | null }[];
  onAction(action: OriginTrophyActionV157): { ok: boolean; message: string };
}) {
  const [message, setMessage] = useState("");
  const [picked, setPicked] = useState<string | null>(null);
  if (isFutureOriginV151(origin)) return null;
  const state = originOfSaveV151(origin);
  const transition = trophyTransitionV157(state.originId);
  const holdsOriginal = !!transition.originalId && heldOriginalIds.includes(transition.originalId);
  const ownedIds = trophies.map(trophy => trophy.id);
  const record = trophyTransitionRecordV157(state, ownedIds);
  const open = trophyTransitionOpenV157({ atWorkshop, ownedTrophyIds: ownedIds });
  if (!atWorkshop) return null;
  const header = <header>
    <h3>{transition.title}</h3>
    <p className={styles.meta}>Voie {state.originId} · {originV151(state.originId)?.title}{state.source === "legacy-default" && " (origine par défaut d’une ancienne partie)"}</p>
  </header>;
  if (!open && !(state.originId === "O6" && record?.resolved)) return (
    <section className={styles.panel} data-origin-trophy-v157={transition.id} data-origin-v151={state.originId} data-origin-trophy-locked="no-trophy">
      {header}
      <p className={styles.note}>Cette scène demande un trophée réellement en ta possession.</p>
    </section>
  );
  const bound = record?.trophyId && ownedIds.includes(record.trophyId) ? record.trophyId : null;
  const trophyId = bound ?? (picked && ownedIds.includes(picked) ? picked : ownedIds[0]);
  const act = (action: OriginTrophyActionV157) => { const result = onAction(action); setMessage(result.message); };
  const done = record?.steps ?? 0;
  const bench = state.originId === "O6" && trophies.find(trophy =>
    trophy.id === (record?.resolved ? record.trophyId : trophyId));

  return (
    <section className={styles.panel} data-origin-trophy-v157={transition.id} data-origin-v151={state.originId}>
      {header}
      <p>{state.originId === "O6" ? "Oriente la prise sur son support et relève les détails que son registre conserve." : transition.scene}</p>
      {bench && bench.record && <OriginTrophyBenchO6 trophy={bench.record} usage={bench.usage} gestures={done} choice={record?.choice} />}
      {state.originId === "O6" && record?.resolved && !bench &&
        <p className={styles.note}>La pièce de ce cartel a quitté la réserve.</p>}
      {holdsOriginal ? <p className={styles.note} data-origin-trophy-original={transition.originalId}>Original sous ta garde : {transition.object.name}. Son propriétaire et son emplacement restent inchangés par l’exposition.</p>
        : !transition.object.inGame && <p className={styles.note} data-origin-trophy-absent>{transition.object.absence}</p>}
      {record?.resolved ? <div className={styles.block} data-origin-resolved={record.success ? "success" : "resolved"}>
        <p><b>{transition.options[record.choice!]}</b></p>
        <p>{transition.reactions[record.choice!]}</p>
        <p className={styles.note}>{state.originId === "O6" ? "La pièce conserve sa provenance et son emplacement." : transition.consequence}</p>
      </div> : <>
        <label>
          Trophée posé au banc{" "}
          <select value={trophyId} disabled={disabled || !!bound} data-origin-trophy-pick
            onChange={(event: { target: { value: string } }) => setPicked(event.target.value)}>
            {trophies.map(trophy => <option key={trophy.id} value={trophy.id}>{trophy.label}</option>)}
          </select>
        </label>
        <ol className={styles.slots}>
          {transition.steps.map((step, index) => <li key={step}>
            {index < done ? <s>{step}</s> : <button disabled={disabled} data-origin-step={index} onClick={() => act({ kind: "step", trophyId, index })}>{step}</button>}
          </li>)}
        </ol>
        {done >= transition.steps.length && <div className={styles.choices}>
          {transition.options.map((option, index) => <button key={option} disabled={disabled} data-origin-choice={index}
            onClick={() => act({ kind: "choose", trophyId, choice: index as 0 | 1 })}>{option}</button>)}
        </div>}
        {state.originId !== "O6" && <p className={styles.note}>{transition.choices}</p>}
      </>}
      {message && <p role="status" className={styles.message}>{message}</p>}
    </section>
  );
}
