"use client";

/* eslint-disable @next/next/no-img-element -- original catalogue sprite bytes, same source as the companion register */

import { useId, useState } from "react";
import {
  HOUND_BOND_MAX_V147, HOUND_KENNEL_LOCATION_V147, HOUND_KENNEL_NAME_V147, HOUNDS_MAX_V147,
  nextBondThresholdV147, unlockedOrdersV147, HOUND_ORDERS_V147,
  type HoundV147, type HuntingHoundsV147,
} from "./systems/huntingHoundsV147";
import { HOUND_NAME_MAX_V147, kennelCandidatesV147 } from "./systems/houndKennelV147";
import styles from "./HoundKennelPanelV147.module.css";

export type HoundKennelActionV147 =
  | { type: "recruit"; catalogueId: string; name: string }
  | { type: "choose"; houndId: string | null }
  | { type: "heal"; houndId: string };

interface Props {
  hounds?: HuntingHoundsV147 | null;
  disabled?: boolean;
  /** Returns true only once the save confirmed the write. */
  onAction(action: HoundKennelActionV147): boolean;
}

const CONDITION_LABEL: Record<HoundV147["condition"], string> = {
  ready: "Prêt à chasser",
  wounded: "Blessé · ne part pas en chasse",
  dead: "Mort · ne revient pas",
};

/** V147: playable Chenil des Pisteurs (recruit, choose for the next hunt, heal). */
export default function HoundKennelPanelV147({ hounds, disabled = false, onAction }: Props) {
  const titleId = useId(), nameId = useId();
  const candidates = kennelCandidatesV147(hounds);
  const roster = hounds?.hounds ?? [];
  const living = roster.filter(hound => hound.condition !== "dead");
  const available = candidates.filter(candidate => candidate.status === "available");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const selected = available.find(candidate => candidate.id === selectedId) ?? available[0] ?? null;
  const full = roster.length >= HOUNDS_MAX_V147;
  const activeId = hounds?.activeHoundId ?? null;

  return <section className={styles.kennel} aria-labelledby={titleId} data-hound-kennel-v147={HOUND_KENNEL_LOCATION_V147}>
    <header>
      <p className={styles.eyebrow}>{HOUND_KENNEL_NAME_V147.toUpperCase()} · {HOUND_KENNEL_LOCATION_V147}</p>
      <h3 id={titleId}>Tes chiens de chasse</h3>
    </header>
    <p className={styles.notice}>Un seul chien t’accompagne en chasse. Le lien monte avec les ordres menés à terme.
      Un chien blessé attend ici ses soins ; un chien mort ne revient pas.</p>

    {living.length === 0
      ? <p className={styles.empty} data-hound-kennel-empty>Aucun chien ne marche avec toi. Choisis-en un au registre ci-dessous.</p>
      : <ul className={styles.roster}>
        {living.map(hound => {
          const next = nextBondThresholdV147(hound.bond);
          const orders = unlockedOrdersV147(hound.bond).map(id => HOUND_ORDERS_V147.find(order => order.id === id)!.label).join(", ");
          const chosen = hound.id === activeId;
          return <li key={hound.id} data-hound-id={hound.id} data-condition={hound.condition} data-chosen={chosen}>
            <div className={styles.row}><strong>{hound.name}</strong><span>{CONDITION_LABEL[hound.condition]}</span></div>
            <p className={styles.bond}>Lien {hound.bond} / {HOUND_BOND_MAX_V147}{next !== null ? ` · prochain seuil ${next}` : ""} · Ordres : {orders}</p>
            <div className={styles.actions}>
              {hound.condition === "ready" && (chosen
                ? <button type="button" disabled={disabled} data-hound-kennel-action="unchoose"
                    onClick={() => onAction({ type: "choose", houndId: null })}>Laisser au chenil</button>
                : <button type="button" disabled={disabled} data-hound-kennel-action="choose"
                    onClick={() => onAction({ type: "choose", houndId: hound.id })}>Emmener à la prochaine chasse</button>)}
              {hound.condition === "wounded" &&
                <button type="button" disabled={disabled} data-hound-kennel-action="heal"
                  onClick={() => onAction({ type: "heal", houndId: hound.id })}>Faire soigner</button>}
              {chosen && <span className={styles.chosen}>{hound.condition === "ready"
                ? "T’accompagne à la prochaine chasse" : "Choisi, mais blessé : il reste au chenil"}</span>}
            </div>
          </li>;
        })}
      </ul>}

    <h4 className={styles.subtitle}>Registre du chenil</h4>
    {available.length === 0 || !selected
      ? <p className={styles.empty}>Le registre n’a plus de chien à te confier.</p>
      : <div className={styles.recruit}>
        <div className={styles.choices} role="group" aria-label="Chiens du registre">
          {available.map(candidate => <button key={candidate.id} type="button" disabled={disabled}
            aria-pressed={candidate.id === selected.id} data-hound-kennel-candidate={candidate.id}
            onClick={() => { setSelectedId(candidate.id); setName(""); }}>{candidate.name}</button>)}
        </div>
        <figure className={styles.portrait}>
          <img key={selected.id} src={selected.imagePath} alt={selected.description}
            width={selected.width} height={selected.height} decoding="async" />
          <figcaption>{selected.description}</figcaption>
        </figure>
        <form className={styles.form} onSubmit={event => {
          event.preventDefault();
          if (onAction({ type: "recruit", catalogueId: selected.id, name })) { setSelectedId(null); setName(""); }
        }}>
          <label htmlFor={nameId}>Nom du chien (facultatif)</label>
          <input id={nameId} type="text" value={name} maxLength={HOUND_NAME_MAX_V147} disabled={disabled}
            placeholder={selected.name} autoComplete="off" onChange={event => setName(event.target.value)} />
          <button type="submit" disabled={disabled || full} data-hound-kennel-action="recruit">Recruter {name.trim() || selected.name}</button>
          {full && <p role="status">Le chenil ne te confie pas plus de {HOUNDS_MAX_V147} chiens.</p>}
        </form>
      </div>}
  </section>;
}
