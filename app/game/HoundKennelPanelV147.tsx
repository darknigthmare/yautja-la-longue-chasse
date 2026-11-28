"use client";

/* eslint-disable @next/next/no-img-element -- original catalogue sprite bytes, same source as the companion register */

import { useId, useState } from "react";
import {
  HOUND_BOND_MAX_V147, HOUND_KENNEL_LOCATION_V147, HOUND_KENNEL_NAME_V147, HOUNDS_MAX_V147,
  nextBondThresholdV147, houndAptitudeV147, houndOrdersV147, HOUND_APTITUDES_V147,
  type HoundV147, type HuntingHoundsV147,
} from "./systems/huntingHoundsV147";
import {
  BRECHE_HOUND_ID_V147, HOUND_KENNEL_ADOPTION_PRICE_V147, HOUND_NAME_MAX_V147, kennelCandidatesV147,
  type HoundKennelActionV147,
} from "./systems/houndKennelV147";
import styles from "./HoundKennelPanelV147.module.css";

export type { HoundKennelActionV147 } from "./systems/houndKennelV147";

interface Props {
  hounds?: HuntingHoundsV147 | null;
  clanMarks: number;
  brecheAdmitted?: boolean;
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
export default function HoundKennelPanelV147({ hounds, clanMarks, brecheAdmitted = false, disabled = false, onAction }: Props) {
  const titleId = useId(), nameId = useId();
  const candidates = kennelCandidatesV147(hounds, brecheAdmitted);
  const roster = hounds?.hounds ?? [];
  const living = roster.filter(hound => hound.condition !== "dead");
  const fallen = roster.filter(hound => hound.condition === "dead");
  const available = candidates.filter(candidate => candidate.status === "available" &&
    (candidate.id !== BRECHE_HOUND_ID_V147 || brecheAdmitted));
  const [selectedId, setSelectedId] = useState<string | null>(() => available[0]?.id ?? null);
  const [name, setName] = useState("");
  const selected = available.find(candidate => candidate.id === selectedId);
  const full = roster.length >= HOUNDS_MAX_V147;
  const isBreche = selected?.id === BRECHE_HOUND_ID_V147;
  const selectedAptitude = houndAptitudeV147(selected?.id);
  const canAfford = isBreche || clanMarks >= HOUND_KENNEL_ADOPTION_PRICE_V147;
  const activeId = hounds?.activeHoundId ?? null;

  return <section className={styles.kennel} aria-labelledby={titleId} data-hound-kennel-v147={HOUND_KENNEL_LOCATION_V147}>
    <header>
      <p className={styles.eyebrow}>{HOUND_KENNEL_NAME_V147.toUpperCase()} · {HOUND_KENNEL_LOCATION_V147}</p>
      <h3 id={titleId}>Tes chiens de chasse</h3>
    </header>
    <p className={styles.notice}>Un seul chien t’accompagne en chasse. Le lien monte avec les ordres menés à terme.
      Les soins sont gratuits. Le registre garde la trace des chiens tombés.</p>

    {living.length === 0
      ? <p className={styles.empty} data-hound-kennel-empty>Aucun chien ne marche avec toi. Choisis-en un au registre ci-dessous.</p>
      : <ul className={styles.roster}>
        {living.map(hound => {
          const next = nextBondThresholdV147(hound.bond);
          const aptitude = houndAptitudeV147(hound.catalogueId);
          const orders = houndOrdersV147(aptitude).filter(order => order.defined && hound.bond >= order.bond).map(order => order.label).join(", ");
          const chosen = hound.id === activeId;
          const blocked = hound.catalogueId === BRECHE_HOUND_ID_V147 && !brecheAdmitted;
          return <li key={hound.id} data-hound-id={hound.id} data-condition={hound.condition} data-chosen={chosen}>
            <div className={styles.row}><strong>{hound.name}</strong><span>{CONDITION_LABEL[hound.condition]}</span></div>
            {aptitude && <p className={styles.bond}>{HOUND_APTITUDES_V147[aptitude].label}</p>}
            {blocked && <p className={styles.notice}>Brèche attend son habitat sur le vaisseau engagé.</p>}
            <p className={styles.bond}>Lien {hound.bond} / {HOUND_BOND_MAX_V147}{next !== null ? ` · prochain seuil ${next}` : ""} · Ordres : {orders}</p>
            <div className={styles.actions}>
              {hound.condition === "ready" && (chosen
                ? <button type="button" disabled={disabled} data-hound-kennel-action="unchoose"
                    onClick={() => onAction({ type: "choose", houndId: null })}>Laisser au chenil</button>
                : <button type="button" disabled={disabled || blocked} data-hound-kennel-action="choose"
                    onClick={() => onAction({ type: "choose", houndId: hound.id })}>Emmener à la prochaine chasse</button>)}
              {hound.condition === "wounded" &&
                <button type="button" disabled={disabled || blocked} data-hound-kennel-action="heal"
                  onClick={() => onAction({ type: "heal", houndId: hound.id })}>Faire soigner</button>}
              {chosen && !blocked && <span className={styles.chosen}>{hound.condition === "ready"
                ? "T’accompagne à la prochaine chasse" : "Choisi, mais blessé : il reste au chenil"}</span>}
            </div>
          </li>;
        })}
      </ul>}

    {fallen.length > 0 && <details data-hound-kennel-archive>
      <summary>Chiens tombés en chasse ({fallen.length})</summary>
      <ul className={styles.roster}>
        {fallen.map(hound => <li key={hound.id} data-hound-id={hound.id} data-condition={hound.condition}>
          <div className={styles.row}><strong>{hound.name}</strong><span>{CONDITION_LABEL.dead}</span></div>
          {hound.diedAt && hound.diedAt !== new Date(0).toISOString() &&
            <time className={styles.bond} dateTime={hound.diedAt}>
              {new Intl.DateTimeFormat("fr", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(hound.diedAt))}
            </time>}
        </li>)}
      </ul>
    </details>}

    <h4 className={styles.subtitle}>Registre du chenil</h4>
    <p className={styles.notice} data-hound-kennel-balance>Solde {clanMarks} Marques de clan · Adoption {HOUND_KENNEL_ADOPTION_PRICE_V147} Marques</p>
    {available.length === 0
      ? <p className={styles.empty}>Le registre n’a plus de chien à te confier.</p>
      : <div className={styles.recruit}>
        <div className={styles.choices} role="group" aria-label="Chiens du registre">
          {available.map(candidate => <button key={candidate.id} type="button" disabled={disabled}
            aria-pressed={candidate.id === selectedId} data-hound-kennel-candidate={candidate.id}
            onClick={() => { setSelectedId(candidate.id); setName(""); }}>{candidate.name}</button>)}
        </div>
        {selected ? <>
          <figure className={styles.portrait}>
            <img key={selected.id} src={selected.imagePath} alt={selected.description}
              width={selected.width} height={selected.height} decoding="async" />
            <figcaption>{selected.description}</figcaption>
          </figure>
          {selectedAptitude && <p className={styles.notice} data-hound-kennel-aptitude={selectedAptitude}>
            <strong>{HOUND_APTITUDES_V147[selectedAptitude].label}.</strong> {HOUND_APTITUDES_V147[selectedAptitude].description}
            {" "}Au lien 100, {HOUND_APTITUDES_V147[selectedAptitude].signatureLabel.toLocaleLowerCase("fr")} devient disponible.
          </p>}
          <form className={styles.form} onSubmit={event => {
            event.preventDefault();
            if (disabled || full || !canAfford) return;
            if (onAction({ type: "recruit", catalogueId: selected.id, name: name.trim() })) { setSelectedId(null); setName(""); }
          }}>
            {!isBreche && <>
              <label htmlFor={nameId}>Nom du chien (facultatif)</label>
              <input id={nameId} type="text" value={name} maxLength={HOUND_NAME_MAX_V147} disabled={disabled}
                placeholder={selected.name} autoComplete="off" onChange={event => setName(event.target.value)} />
            </>}
            <button type="submit" disabled={disabled || full || !canAfford} data-hound-kennel-action="recruit">
              {isBreche ? "Inscrire Brèche au registre de chasse"
                : `Adopter ${name.trim() || selected.name} · ${HOUND_KENNEL_ADOPTION_PRICE_V147} Marques`}
            </button>
          </form>
        </> : <p className={styles.notice}>Sélectionne un chien pour ouvrir sa fiche.</p>}
        {full && <p role="status">Le chenil ne te confie pas plus de {HOUNDS_MAX_V147} chiens.</p>}
        {!canAfford && <p role="status">Il te manque {HOUND_KENNEL_ADOPTION_PRICE_V147 - clanMarks} Marques de clan.</p>}
      </div>}
  </section>;
}
