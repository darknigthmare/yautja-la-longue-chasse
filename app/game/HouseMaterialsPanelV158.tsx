"use client";
/**
 * V158 — réserve de matériaux de maison et atelier du quartier qui les
 * produit. L'achat passe par `onBuy`, qui n'actualise l'écran qu'après
 * l'écriture confirmée (marques et réserve dans la même écriture).
 */
import { useState } from "react";
import type { ResidenceHouseV149 } from "./systems/residenceV149";
import {
  MATERIAL_IDS_V158, MATERIAL_PRICE_V158, MATERIAL_SOURCES_V158, emptyPathObjectsV158, isFuturePathObjectsV158,
  materialsSoldAtV158, normalizePathObjectsV158,
} from "./systems/pathObjectsV158";
import styles from "./ResidencePanelV149.module.css";

export default function HouseMaterialsPanelV158({ house, objects, clanMarks, disabled, onBuy }: {
  house: ResidenceHouseV149; objects: unknown; clanMarks: number; disabled: boolean;
  onBuy(item: string): { ok: boolean; message: string };
}) {
  const [message, setMessage] = useState("");
  if (isFuturePathObjectsV158(objects)) return null;
  const state = normalizePathObjectsV158(objects) ?? emptyPathObjectsV158();
  const sold = materialsSoldAtV158(house.id);
  const stock = MATERIAL_IDS_V158.filter(item => (state.materials[item] ?? 0) > 0);
  if (!sold.length && !stock.length) return null;
  return (
    <section className={styles.panel} data-house-materials-v158={house.id}>
      <h3>Matériaux de maison</h3>
      <p className={styles.note} data-material-stock>Réserve : {stock.length ? stock.map(item => `${state.materials[item]} × ${item}`).join(", ") : "vide"}.</p>
      {sold.map(item => <div key={item} className={styles.block} data-material-sold={item}>
        <p>{MATERIAL_SOURCES_V158[item].quote ? `« ${MATERIAL_SOURCES_V158[item].quote} »` : "Aucune source de provenance dans le classeur : atelier du quartier retenu par le jeu (proposé)."}</p>
        <button disabled={disabled || clanMarks < MATERIAL_PRICE_V158} data-material-buy={item}
          onClick={() => setMessage(onBuy(item).message)}>Acheter 1 × {item} ({MATERIAL_PRICE_V158} marques, prix proposé)</button>
      </div>)}
      {message && <p role="status" className={styles.message}>{message}</p>}
    </section>
  );
}
