"use client";
/**
 * V170 — fin de voie (Ox-M29), à l'atelier de trophées avec les autres
 * panneaux de voie. Confirmation en deux temps : « Examiner » présente la fin
 * complète et enregistre la visite ; « Confirmer définitivement » écrit la fin
 * une fois. Chaque action passe par `onAction`, qui n'actualise l'écran
 * qu'après l'écriture confirmée.
 */
import { useState } from "react";
import { isFutureOriginV151, originOfSaveV151, originV151 } from "./systems/originsV151";
import {
  endingRealizationV170, endingSelectionRefusalV170, endingSelectionV170, originEndingIdV170, originEndingV170,
  originEndingsV170, transmissionStatusV170, type OriginDepartureStatusV170,
} from "./systems/originEndingsV170";
import styles from "./ResidencePanelV149.module.css";

export type OriginEndingActionV170 =
  | { kind: "examine"; endingId: string }
  | { kind: "confirm"; endingId: string; confirmation: string };

export default function OriginEndingPanelV170({ origin, rankId, departure, atWorkshop, disabled, onAction }: {
  origin: unknown; rankId: string; atWorkshop: boolean; disabled: boolean;
  departure?: OriginDepartureStatusV170 | null;
  onAction(action: OriginEndingActionV170): { ok: boolean; message: string };
}) {
  const [message, setMessage] = useState("");
  const [examined, setExamined] = useState<string | null>(null);
  if (isFutureOriginV151(origin) || !atWorkshop) return null;
  const state = originOfSaveV151(origin);
  const selection = endingSelectionV170(state.originId);
  const chosenId = originEndingIdV170(state);
  const refusal = endingSelectionRefusalV170(state, { rankId, atWorkshop });
  const header = <header>
    <h3>Fin de voie · {selection.title}</h3>
    <p className={styles.meta}>Voie {state.originId} · {originV151(state.originId)?.title}{state.source === "legacy-default" && " (origine par défaut d’une ancienne partie)"}</p>
  </header>;

  if (chosenId) {
    const ending = originEndingV170(chosenId)!;
    const realization = endingRealizationV170(state.originId);
    const transmission = transmissionStatusV170(state, rankId, departure);
    return (
      <section className={styles.panel} data-origin-ending-v170={chosenId} data-origin-v151={state.originId}>
        {header}
        <div className={styles.block} data-origin-ending-confirmed>
          <p><b>{ending.title}</b></p>
          <p>{ending.meaning}</p>
          <p>{ending.consequences}</p>
          <p className={styles.note}>Choix définitif ; il ne change aucun rang.</p>
        </div>
        <p className={styles.note} data-origin-ending-realized={state.ending?.endingRealized ? "true" : "false"}>
          {realization.id} · {realization.title} · {state.ending?.endingRealized ? "Clôture consignée" :
            chosenId === "O6-E1" ? "Rejoins la cour de ta demeure aménagée après la reconnaissance d’Elite. Le novice peut y choisir son outil et tenter son premier exercice." :
              "Clôture indisponible"}
        </p>
        <p className={styles.note} data-origin-transmission={transmission.transmission.id} data-origin-transmission-unlocked={transmission.unlocked ? "true" : "false"}
          data-origin-transmission-playable={transmission.scenePlayable}>
          {transmission.transmission.title} : {transmission.note}
        </p>
        {message && <p role="status" className={styles.message}>{message}</p>}
      </section>
    );
  }

  const endings = originEndingsV170(state.originId);
  if (refusal) return (
    <section className={styles.panel} data-origin-ending-v170="locked" data-origin-v151={state.originId}>
      {header}
      <p className={styles.note} data-origin-ending-locked>{refusal}</p>
      <ul>{endings.map(ending => <li key={ending.id}>{ending.title}</li>)}</ul>
    </section>
  );

  const act = (action: OriginEndingActionV170) => {
    const result = onAction(action);
    setMessage(result.message);
    if (action.kind === "examine" && result.ok) setExamined(action.endingId);
  };
  const pending = examined ? originEndingV170(examined) : null;
  return (
    <section className={styles.panel} data-origin-ending-v170="open" data-origin-v151={state.originId}>
      {header}
      <p>{selection.scene}</p>
      {pending ? <div className={styles.block} data-origin-ending-examined={pending.id}>
        <p><b>{pending.title}</b></p>
        <p>{pending.condition}</p>
        <p>{pending.meaning}</p>
        <p>{pending.finalSequence}</p>
        <p>{pending.consequences}</p>
        <p className={styles.note}>Ce choix est exclusif et définitif ; aucune mission ultérieure ne le remplace. Il ne change aucun rang.</p>
        <div className={styles.choices}>
          <button disabled={disabled} data-origin-ending-confirm={pending.id}
            onClick={() => act({ kind: "confirm", endingId: pending.id, confirmation: pending.id })}>Confirmer définitivement « {pending.title} »</button>
          <button disabled={disabled} data-origin-ending-back onClick={() => { setExamined(null); setMessage(selection.failure); }}>Revenir sans choisir</button>
        </div>
      </div> : <div className={styles.choices}>
        {endings.map(ending => <button key={ending.id} disabled={disabled} data-origin-ending-examine={ending.id}
          onClick={() => act({ kind: "examine", endingId: ending.id })}>Examiner « {ending.title} »</button>)}
      </div>}
      <p className={styles.note}>{selection.choices}</p>
      {message && <p role="status" className={styles.message}>{message}</p>}
    </section>
  );
}
