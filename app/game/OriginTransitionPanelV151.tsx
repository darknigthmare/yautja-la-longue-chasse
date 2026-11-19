"use client";
/**
 * V151 — transition de voie « Maison » (STORY5-TR-Ox-01), jouée dans la
 * résidence active. Chaque geste et le choix passent par `onAction`, qui
 * n'actualise l'écran qu'après l'écriture confirmée.
 */
import { useState } from "react";
import { emptyResidenceV149, normalizeResidenceV149, type ResidenceHouseV149 } from "./systems/residenceV149";
import { houseTransitionOpenV151, houseTransitionV151, isFutureOriginV151, originOfSaveV151, originV151 } from "./systems/originsV151";
import styles from "./ResidencePanelV149.module.css";

type OriginAction = { kind: "step"; index: number } | { kind: "choose"; choice: 0 | 1 };

export default function OriginTransitionPanelV151({ house, residence, origin, rankId, disabled, regionAllowed, onAction }: {
  house: ResidenceHouseV149; residence: unknown; origin: unknown; rankId: string; disabled: boolean;
  regionAllowed(regionId: string): boolean;
  onAction(action: OriginAction): { ok: boolean; message: string };
}) {
  const [message, setMessage] = useState("");
  if (isFutureOriginV151(origin)) return null;
  const state = originOfSaveV151(origin);
  const residenceState = normalizeResidenceV149(residence) ?? emptyResidenceV149();
  const context = { rankId, atHouseId: house.id, regionAllowed };
  if (!houseTransitionOpenV151(residenceState, context)) return null;
  const transition = houseTransitionV151(state.originId);
  const record = state.transitions[transition.id];
  const act = (action: OriginAction) => { const result = onAction(action); setMessage(result.message); };
  const done = record?.steps ?? 0;

  return (
    <section className={styles.panel} data-origin-transition-v151={transition.id} data-origin-v151={state.originId}>
      <header>
        <h3>{transition.title}</h3>
        <p className={styles.meta}>Voie {state.originId} · {originV151(state.originId)?.title}{state.source === "legacy-default" && " (origine par défaut d’une ancienne partie)"}</p>
      </header>
      <p>{transition.scene}</p>
      {record?.resolved ? <div className={styles.block} data-origin-resolved={record.success ? "success" : "resolved"}>
        <p><b>{transition.options[record.choice!]}</b></p>
        <p>{transition.reactions[record.choice!]}</p>
        <p className={styles.note}>{transition.consequence}</p>
      </div> : <>
        <ol className={styles.slots}>
          {transition.steps.map((step, index) => <li key={step}>
            {index < done ? <s>{step}</s> : <button disabled={disabled} data-origin-step={index} onClick={() => act({ kind: "step", index })}>{step}</button>}
          </li>)}
        </ol>
        {done >= transition.steps.length && <div className={styles.choices}>
          {transition.options.map((option, index) => <button key={option} disabled={disabled} data-origin-choice={index} onClick={() => act({ kind: "choose", choice: index as 0 | 1 })}>{option}</button>)}
        </div>}
        <p className={styles.note}>{transition.choices}</p>
      </>}
      {message && <p role="status" className={styles.message}>{message}</p>}
    </section>
  );
}
