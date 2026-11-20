"use client";
/* eslint-disable @next/next/no-img-element -- unchanged public game bitmaps */
import { useState } from "react";
import type { SaveGame, WeaponId } from "./types";
import {
  HERITAGE_BONUS_HONOR_V152, HERITAGE_SOURCE_V152, HERITAGE_TRIGGERS_V152, heritageMaskLabelV152, heritageMaskSrcV152,
  heritageSealEligibilityV152, heritageWeaponLabelV152, heritageWeaponRankAllowedV152, isFutureHeritageV152, normalizeHeritageV152,
  type HeritageWeaponLocationV152,
} from "./systems/heritageV152";
import styles from "./HeritagePanelV152.module.css";

export type HeritageActionV152 = { kind: "seal"; weaponId: WeaponId } | { kind: "move-weapon"; to: HeritageWeaponLocationV152 };
const RANK_LABELS: Record<string, string> = { "young-blood": "Young Blood", blooded: "Blooded", elite: "Elite", elder: "Elder" };

/** Mausolée des Chasseurs (CITY-23) : niche de l'ancêtre, dépôt des Archives des Lignées (CITY-13) et scellement du legs. */
export default function HeritagePanelV152({ save, disabled, onAction }: {
  save: SaveGame; disabled: boolean; onAction(action: HeritageActionV152): { ok: boolean; message: string };
}) {
  const future = isFutureHeritageV152(save.heritageV152);
  const state = save.heritageV152 ? normalizeHeritageV152(save.heritageV152, save.createdAt) : null;
  const inheritance = state?.inheritance ?? null, testament = state?.testament ?? null;
  const owned = save.inventory.unlockedWeaponIds;
  const [weaponId, setWeaponId] = useState<WeaponId | "">("");
  const [confirming, setConfirming] = useState(false), [message, setMessage] = useState("");
  const eligibility = heritageSealEligibilityV152(save);
  const retirement = HERITAGE_TRIGGERS_V152.find(t => t.id === "elder-retirement")!;
  const run = (action: HeritageActionV152) => { const result = onAction(action); setMessage(result.message); if (result.ok) setConfirming(false); };
  return <section className={styles.panel} aria-labelledby="heritage-v152-title" data-heritage-v152>
    <p className={styles.eyebrow}>Héritage · lignée du chasseur</p>
    <h2 id="heritage-v152-title">Niche des lignées et legs</h2>
    {future && <p role="alert">Registre d’héritage d’une version plus récente : affichage et modifications désactivés.</p>}
    {!future && <div className={styles.grid}>
      <article className={styles.niche} data-heritage-inheritance={inheritance ? inheritance.testament.id : "none"}>
        <h3>Masque de l’ancêtre</h3>
        {inheritance ? <>
          <div className={styles.mask}>{heritageMaskSrcV152(inheritance.testament.maskId)
            ? <img src={heritageMaskSrcV152(inheritance.testament.maskId)!} alt={`${heritageMaskLabelV152(inheritance.testament.maskId)} · masque de ${inheritance.testament.legend.hunterName}`} draggable={false} data-heritage-mask={inheritance.testament.maskId ?? "none"} />
            : <p data-heritage-mask={inheritance.testament.maskId ?? "none"}>{heritageMaskLabelV152(inheritance.testament.maskId)} · représentation à produire</p>}</div>
          <p>Descendant de <strong>{inheritance.testament.legend.hunterName || "Chasseur sans nom"}</strong>.</p>
          <dl>
            <dt>Légende</dt><dd>{RANK_LABELS[inheritance.testament.legend.rankId]} · {inheritance.testament.legend.honor} d’honneur · {inheritance.testament.legend.trophyCount} trophée(s) · {inheritance.testament.legend.missionsCompleted} chasse(s) réussie(s)</dd>
            <dt>Bonus reçu</dt><dd>+{inheritance.bonusHonorApplied} d’honneur à la création, une seule fois ; aucun rang donné</dd>
          </dl>
          <h3>Archives des Lignées</h3>
          {inheritance.weapon ? <>
            <p data-heritage-weapon-location={inheritance.weapon.locationId}>{heritageWeaponLabelV152(inheritance.weapon.weaponId)} léguée · {inheritance.weapon.locationId === "archives-des-lignees" ? "dans sa niche des Archives" : "portée par toi ; sa niche est vide"}</p>
            <div className={styles.actions}>
              {inheritance.weapon.locationId === "archives-des-lignees"
                ? <button type="button" data-heritage-take disabled={disabled || !heritageWeaponRankAllowedV152(save)} onClick={() => run({ kind: "move-weapon", to: "porte-par-heritier" })}>Prendre l’arme léguée</button>
                : <button type="button" data-heritage-return disabled={disabled} onClick={() => run({ kind: "move-weapon", to: "archives-des-lignees" })}>Reposer l’arme aux Archives</button>}
            </div>
            {inheritance.weapon.locationId === "archives-des-lignees" && !heritageWeaponRankAllowedV152(save) && <p className={styles.proposed}>Rang Blooded requis pour la porter (proposé).</p>}
          </> : <p>Aucune arme léguée : ce legs ne transmet que la légende.</p>}
        </> : <p>Aucun ancêtre : cette partie n’a reçu aucun legs à sa création.</p>}
      </article>
      <article className={styles.niche} data-heritage-testament={testament ? "sealed" : "open"}>
        <h3>Ton legs</h3>
        {testament ? <>
          <p data-heritage-sealed>Legs scellé le {new Date(testament.sealedAt).toLocaleDateString("fr-FR")} : {heritageMaskLabelV152(testament.maskId)} au mausolée, {heritageWeaponLabelV152(testament.weaponId)} aux Archives des Lignées.</p>
          <p>Une nouvelle partie créée dans un autre emplacement peut le recevoir une seule fois. Il ne peut être ni refait ni dupliqué.</p>
        </> : <>
          <p>Masque déposé : <strong>{heritageMaskLabelV152(save.appearance.biomaskId)}</strong> (ton biomask actuel).</p>
          <label htmlFor="heritage-v152-weapon">Arme léguée</label>{" "}
          <select id="heritage-v152-weapon" value={weaponId} disabled={disabled || !eligibility.allowed} onChange={(event: { target: { value: string } }) => { setWeaponId(event.target.value as WeaponId | ""); setConfirming(false); }}>
            <option value="">Choisir une arme possédée</option>
            {owned.map(id => <option key={id} value={id}>{heritageWeaponLabelV152(id)}</option>)}
          </select>
          <div className={styles.actions}>
            {!confirming
              ? <button type="button" data-heritage-prepare disabled={disabled || !eligibility.allowed || !weaponId} onClick={() => setConfirming(true)}>Préparer le legs…</button>
              : <><button type="button" data-heritage-seal disabled={disabled || !weaponId} onClick={() => { if (weaponId) run({ kind: "seal", weaponId }); }}>Confirmer · sceller définitivement</button><button type="button" onClick={() => setConfirming(false)}>Annuler</button></>}
          </div>
          {!eligibility.allowed && <p className={styles.proposed}>{eligibility.reason}</p>}
          <p className={styles.proposed}>Déclencheur proposé : {retirement.label}. Les déclencheurs de la bible (sacrifice, mort en Hardcore, fin BB-E2) n’existent pas encore dans le jeu.</p>
        </>}
      </article>
    </div>}
    <p role="status" aria-live="polite">{message}</p>
    <details><summary>Source</summary><ul>
      <li>{HERITAGE_SOURCE_V152.decision}</li><li>{HERITAGE_SOURCE_V152.mask}</li><li>{HERITAGE_SOURCE_V152.weapon}</li>
      <li>{HERITAGE_SOURCE_V152.legend}</li><li>{HERITAGE_SOURCE_V152.bonus}</li>
    </ul><p className={styles.note}>Bonus appliqué : +{HERITAGE_BONUS_HONOR_V152} d’honneur. Quête de lignée, répliques des PNJ et dialogues « descendant de » : non implémentés. Les Archives des Lignées (CITY-13) n’ont pas encore de lieu construit ; leur dépôt est affiché ici.</p></details>
  </section>;
}
