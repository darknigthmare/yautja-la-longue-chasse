"use client";

import { useId } from "react";
import {
  HOUND_BOND_MAX_V147, HOUND_KENNEL_LOCATION_V147, HOUND_KENNEL_NAME_V147, HOUND_ORDERS_V147,
  HOUND_SESSION_GAIN_CAP_V147, isOrderUnlockedV147, nextBondThresholdV147,
  type HoundV147, type HuntingHoundsV147,
} from "./systems/huntingHoundsV147";
import styles from "./HuntingHoundsPanelV147.module.css";

interface Props {
  hounds?: HuntingHoundsV147 | null;
  /** Only provided when the player stands at the Chenil des Pisteurs (CITY-28). */
  onHealAtKennel?: (houndId: string) => void;
}

const CONDITION_LABEL: Record<HoundV147["condition"], string> = {
  ready: "Prêt à chasser",
  wounded: `Blessé · soins au ${HOUND_KENNEL_NAME_V147}`,
  dead: "Mort · ne revient pas",
};

/** V147: bond, orders and condition of recruited hounds. Never recruits by itself. */
export default function HuntingHoundsPanelV147({ hounds, onHealAtKennel }: Props) {
  const titleId = useId();
  const roster = hounds?.hounds ?? [];
  return <section className={styles.hounds} aria-labelledby={titleId} data-hunting-hounds="v147">
    <header>
      <p className={styles.eyebrow}>CHIENS DE CHASSE · ORDRES ET LIEN</p>
      <h3 id={titleId}>Le lien et les quatre ordres</h3>
    </header>
    <p className={styles.notice}>Le lien va de 0 à {HOUND_BOND_MAX_V147} et monte d’au plus {HOUND_SESSION_GAIN_CAP_V147} par chasse.
      Un chien blessé ne part pas en chasse avant d’être soigné au {HOUND_KENNEL_NAME_V147} ({HOUND_KENNEL_LOCATION_V147}).
      Un chien mort ne revient pas. Une mise à mort faite par le chien compte comme la vôtre pour le code d’honneur.</p>
    {roster.length === 0
      ? <p className={styles.empty}>Aucun chien recruté. La mission de recrutement n’est pas encore produite.</p>
      : <ul className={styles.list}>
        {roster.map(hound => {
          const next = nextBondThresholdV147(hound.bond);
          return <li key={hound.id} className={styles.hound} data-hound-id={hound.id} data-condition={hound.condition}>
            <div className={styles.row}>
              <strong>{hound.name}</strong>
              <span>{CONDITION_LABEL[hound.condition]}</span>
            </div>
            <div className={styles.bond}>
              <progress max={HOUND_BOND_MAX_V147} value={hound.bond} aria-label={`Lien de ${hound.name}`} />
              <span>Lien {hound.bond} / {HOUND_BOND_MAX_V147}{next !== null ? ` · prochain seuil ${next}` : ""}</span>
            </div>
            <ul className={styles.orders}>
              {HOUND_ORDERS_V147.map(order => {
                const unlocked = isOrderUnlockedV147(order.id, hound.bond);
                return <li key={order.id} data-order={order.id} data-locked={!unlocked}>
                  <span>{order.label}</span>
                  <small>{!order.defined ? `Verrouillé · à définir (lien ${order.bond})`
                    : unlocked ? order.effect : `Verrouillé · lien ${order.bond}`}</small>
                </li>;
              })}
            </ul>
            {hound.condition === "wounded" && onHealAtKennel &&
              <button type="button" className={styles.heal} onClick={() => onHealAtKennel(hound.id)}>
                Faire soigner au {HOUND_KENNEL_NAME_V147}</button>}
          </li>;
        })}
      </ul>}
  </section>;
}
