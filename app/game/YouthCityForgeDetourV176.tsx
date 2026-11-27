"use client";

import type { KeyboardEvent } from "react";
import {
  YOUTH_CITY_DELIVERY_END_V176, type YouthCityDeliveryStepV176,
} from "./systems/youthCityErrandV172";
import styles from "./YouthCityForgeDetourV176.module.css";

const columns = Array.from({ length: YOUTH_CITY_DELIVERY_END_V176 + 1 }, (_, index) => index);
const controls = [
  { id: "west", label: "Reculer" }, { id: "side", label: "Changer de voie" }, { id: "east", label: "Avancer" },
] as const;

export default function YouthCityForgeDetourV176({ position, disabled, onStep }: {
  position: { x: number; lane: "main" | "side" };
  disabled: boolean;
  onStep(step: YouthCityDeliveryStepV176): void;
}) {
  const complete = position.x === YOUTH_CITY_DELIVERY_END_V176 && position.lane === "main";
  const key = (event: KeyboardEvent<HTMLDivElement>) => {
    if (disabled || complete || event.repeat || event.target !== event.currentTarget) return;
    const command = event.key === "ArrowRight" ? "east" : event.key === "ArrowLeft" ? "west"
      : event.key === "ArrowUp" || event.key === "ArrowDown" ? "side" : null;
    if (!command) return;
    event.preventDefault();
    event.stopPropagation();
    onStep(command);
  };
  return <section className={styles.panel} aria-label="Passage de livraison" data-youth-city-delivery
    data-youth-city-delivery-position={position.x} data-youth-city-delivery-lane={position.lane}>
    <h4>Le passage de la forge</h4>
    <p>{complete ? "Tu as atteint le comptoir avec la pièce. Remets-la à la maîtresse des parures."
      : "Le chariot occupe la voie principale. Le couloir latéral rejoint le passage de l’autre côté."}</p>
    <div className={styles.plan} role="group" aria-label="Terrain du passage de livraison"
      tabIndex={complete ? undefined : 0} onKeyDown={key}>
      {(["side", "main"] as const).flatMap((lane, row) => columns.map(x => {
        const isCart = lane === "main" && (x === 3 || x === 4);
        const isLink = x === 2 || x === 5;
        const isClosed = lane === "side" && (x < 2 || x > 5);
        return <span key={lane + x} data-cart={isCart} data-link={isLink} data-closed={isClosed}
          data-at={position.x === x && position.lane === lane} style={{ gridColumn: x + 1, gridRow: row + 1 }} aria-hidden="true">
          {isCart ? "▰" : isLink ? "◈" : x === YOUTH_CITY_DELIVERY_END_V176 && lane === "main" ? "◇" : ""}
        </span>;
      }))}
    </div>
    <p>Position {position.x + 1} sur {YOUTH_CITY_DELIVERY_END_V176 + 1} · {position.lane === "main" ? "voie principale" : "couloir latéral"}</p>
    {!complete && <div className={styles.controls}>
      {controls.map(({ id, label }) => <button type="button" key={id} disabled={disabled} data-youth-city-step={id}
        onClick={() => onStep(id)}>{label}</button>)}
    </div>}
  </section>;
}
