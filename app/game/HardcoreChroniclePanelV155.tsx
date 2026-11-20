"use client";
import { useState } from "react";
import type { BiomaskId, SaveGame, WeaponId } from "./types";
import { MISSION_BY_ID } from "./data";
import { V6_MASK_VISUAL_BY_ID } from "./v6Visuals";
import { HARDCORE_SOURCE_V155, normalizeHardcoreV155 } from "./systems/hardcoreV155";
import { heritageMaskLabelV152, heritageWeaponLabelV152, normalizeHeritageV152 } from "./systems/heritageV152";

export interface HardcoreCloseChoiceV155 { weaponId: WeaponId | null; maskId: BiomaskId | null }
const RANK_LABELS: Record<string, string> = { "young-blood": "Young Blood", blooded: "Blooded", elite: "Elite", elder: "Elder" };
const date = (value: string) => new Date(value).toLocaleString("fr-FR", { dateStyle: "short", timeStyle: "short" });

/**
 * V155 · Écran d'une chronique Hardcore après la mort. Remplace toute la session : rien d'autre ne
 * s'y joue. Mort constatée → clôture confirmée en deux temps (legs choisi puis confirmation).
 * Chronique close → lecture seule (légende et legs), aucune donnée effacée.
 */
export default function HardcoreChroniclePanelV155({ save, busy, onClose, onMainMenu }: {
  save: SaveGame; busy: boolean;
  onClose(choice: HardcoreCloseChoiceV155): { ok: boolean; message: string };
  onMainMenu(): void;
}) {
  const state = save.hardcoreV155 ? normalizeHardcoreV155(save.hardcoreV155, save.createdAt) : null;
  const heritage = save.heritageV152 ? normalizeHeritageV152(save.heritageV152, save.createdAt) : null;
  const testament = heritage?.testament ?? null;
  const death = state?.death ?? null;
  const mission = death ? MISSION_BY_ID[death.missionId] : null;
  const wornMask = save.appearance.biomaskId && Object.hasOwn(V6_MASK_VISUAL_BY_ID, save.appearance.biomaskId) ? save.appearance.biomaskId : null;
  const [weaponId, setWeaponId] = useState<WeaponId | "">("");
  const [maskId, setMaskId] = useState<BiomaskId | "">("");
  const [confirming, setConfirming] = useState(false), [message, setMessage] = useState("");
  const closed = !!death?.closedAt;
  const needsChoice = !testament;
  const ready = !needsChoice || (!!weaponId && (!!wornMask || !!maskId));
  return <section className="screen panel-screen" role="alertdialog" aria-modal="true" aria-labelledby="hardcore-v155-title" data-hardcore-chronicle={closed ? "closed" : "death-pending"}>
    <div className="screen-safe">
      <p className="eyebrow">Hardcore · mort définitive</p>
      <h1 id="hardcore-v155-title">{closed ? "Chronique close" : "Le chasseur est tombé"}</h1>
      <p><strong>{save.profile.hunterName || "Chasseur sans nom"}</strong>{mission ? ` · mort pendant la chasse « ${mission.targetName} » (${mission.planetName})` : ""}{death ? ` · ${date(death.diedAt)}` : ""}.</p>
      <dl>
        <dt>Légende</dt><dd>{RANK_LABELS[save.profile.rankId] ?? save.profile.rankId} · {save.profile.honor} d’honneur · {save.trophies.length} trophée(s) · {save.statistics.missionsCompleted} chasse(s) réussie(s)</dd>
        {testament && <><dt>Legs scellé</dt><dd data-hardcore-testament={testament.trigger}>{heritageMaskLabelV152(testament.maskId)} au mausolée · {heritageWeaponLabelV152(testament.weaponId)} aux Archives des Lignées</dd></>}
      </dl>
      {closed ? <>
        <p>Cette chronique est en lecture seule. Ses sauvegardes sont conservées. Une nouvelle partie créée dans un emplacement libre peut recevoir ce legs une seule fois (« Descendant de … »).</p>
      </> : <>
        <p>La mort est inscrite. Clore la chronique la rend définitivement lisible seulement ; aucune donnée n’est effacée.</p>
        {needsChoice ? <>
          {wornMask ? <p>Masque déposé au mausolée : <strong>{heritageMaskLabelV152(wornMask)}</strong> (masque porté).</p> : <>
            <label htmlFor="hardcore-v155-mask">Masque déposé au mausolée (aucun masque porté)</label>{" "}
            <select id="hardcore-v155-mask" value={maskId} disabled={busy} onChange={(event: { target: { value: string } }) => { setMaskId(event.target.value as BiomaskId | ""); setConfirming(false); }}>
              <option value="">Choisir un masque</option>
              {(Object.keys(V6_MASK_VISUAL_BY_ID) as BiomaskId[]).map(id => <option key={id} value={id}>{heritageMaskLabelV152(id)}</option>)}
            </select>
          </>}
          <p><label htmlFor="hardcore-v155-weapon">Arme léguée (proposé : choisie à la clôture)</label>{" "}
          <select id="hardcore-v155-weapon" value={weaponId} disabled={busy} onChange={(event: { target: { value: string } }) => { setWeaponId(event.target.value as WeaponId | ""); setConfirming(false); }}>
            <option value="">Choisir une arme possédée</option>
            {save.inventory.unlockedWeaponIds.map(id => <option key={id} value={id}>{heritageWeaponLabelV152(id)}</option>)}
          </select></p>
        </> : <p>Le legs déjà scellé reste le seul legs de ce chasseur.</p>}
        <div className="modal-actions">
          {!confirming
            ? <button type="button" className="alien-button" data-hardcore-prepare disabled={busy || !ready} onClick={() => setConfirming(true)}>Préparer la clôture…</button>
            : <><button type="button" className="alien-button" data-hardcore-close disabled={busy || !ready} onClick={() => {
                const result = onClose({ weaponId: weaponId || null, maskId: wornMask ?? (maskId || null) });
                setMessage(result.message); if (result.ok) setConfirming(false);
              }}>Confirmer · clore définitivement la chronique</button>
              <button type="button" className="ghost-button" onClick={() => setConfirming(false)}>Annuler</button></>}
        </div>
      </>}
      <div className="modal-actions"><button type="button" className="ghost-button" data-hardcore-menu disabled={busy} onClick={onMainMenu}>Revenir au menu principal</button></div>
      <p role="status" aria-live="polite">{message}</p>
      <details><summary>Source</summary><ul><li>{HARDCORE_SOURCE_V155.rule}</li><li>{HARDCORE_SOURCE_V155.heritage}</li></ul>
        <p>Proposé : écran de clôture, arme choisie à la clôture, sauvegardes antérieures conservées mais non chargeables. Non implémenté : mort pendant un rite (« idem » dans la bible), réduction d’honneur proposée pour le Hardcore.</p></details>
    </div>
  </section>;
}
