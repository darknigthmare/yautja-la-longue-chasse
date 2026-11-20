"use client";
/**
 * V154 — scènes de résidence S1–S3 jouables, dans l'intérieur de la
 * résidence active. Les gestes et la décision passent par `onAction`, qui
 * n'actualise l'écran qu'après l'écriture confirmée. L'aperçu d'une option
 * est gratuit et n'écrit rien (« Les aperçus de placement sont gratuits »).
 */
import { useEffect, useState } from "react";
import { emptyResidenceV149, normalizeResidenceV149, scenesForHouseV149, type ResidenceHouseV149 } from "./systems/residenceV149";
import { emptyResidenceLifeV150, guestResidentV150, normalizeResidenceLifeV150 } from "./systems/residenceLifeV150";
import {
  MATERIALS_IN_GAME_V154, emptyResidenceScenesV154, guestsAtHouseV154, isFutureResidenceScenesV154, normalizeResidenceScenesV154,
  sceneConsumptionV154, sceneGesturesV154, sceneOptionsV154, sceneTriggerV154, type SceneActionV154, type SceneContextV154,
} from "./systems/residenceScenesV154";
import { loadHouseDialogueV154, type HouseDialogueV154 } from "./systems/houseDialogueV154";
import { sceneMaterialNeedsV158 } from "./systems/pathObjectsV158";
import HouseSceneConversationV154 from "./HouseSceneConversationV154";
import type { HomeworldRegionIdV68 } from "./systems/homeworldRegionsV68";
import styles from "./ResidencePanelV149.module.css";

export default function HouseScenesPanelV154({ house, residence, life, scenes, region, rankId, disabled, regionAllowed, onAction, loadDialogue = loadHouseDialogueV154, dialogues, stock }: {
  house: ResidenceHouseV149;
  residence: unknown;
  life: unknown;
  scenes: unknown;
  /** Region run and tick of the last checkpoint (guests present are read at that tick). */
  region: { runId: string; tick: number } | null;
  rankId: string;
  disabled: boolean;
  regionAllowed(regionId: string): boolean;
  onAction(action: SceneActionV154): { ok: boolean; message: string };
  loadDialogue?(sceneId: string): Promise<HouseDialogueV154 | null>;
  /** Already loaded dialogues (tests, or a parent cache). */
  dialogues?: Record<string, HouseDialogueV154 | null>;
  /** V158: real material reserve and the scenes whose materials were taken (`<sceneId>:materials`). */
  stock?: { materials: Readonly<Record<string, number>>; receipts: readonly string[] };
}) {
  const [message, setMessage] = useState("");
  const [openId, setOpenId] = useState<string | null>(null);
  const [preview, setPreview] = useState<0 | 1 | null>(null);
  const [loaded, setLoaded] = useState<Record<string, HouseDialogueV154 | null>>({});
  const residenceState = normalizeResidenceV149(residence) ?? emptyResidenceV149();
  const lifeState = normalizeResidenceLifeV150(life) ?? emptyResidenceLifeV150();
  const guests = guestsAtHouseV154(lifeState, house.id, region);
  const needsDialogue = openId !== null && guests.present.length > 0 && !(openId in loaded) && !(dialogues && openId in dialogues);
  useEffect(() => {
    if (!needsDialogue || !openId) return;
    let alive = true;
    loadDialogue(openId).then(result => { if (alive) setLoaded(previous => ({ ...previous, [openId]: result })); },
      () => { if (alive) setLoaded(previous => ({ ...previous, [openId]: null })); });
    return () => { alive = false; };
  }, [needsDialogue, openId, loadDialogue]);

  if (isFutureResidenceScenesV154(scenes)) return <section className={styles.panel}><p role="alert">Registre des scènes d’une version plus récente : il est conservé sans modification.</p></section>;
  if (residenceState.activeResidenceId !== house.id) return null;
  const state = normalizeResidenceScenesV154(scenes) ?? emptyResidenceScenesV154();
  const context: SceneContextV154 = { rankId, atHouseId: house.id, regionAllowed, runId: region?.runId ?? null, guestsPresent: guests.present, invitationPending: guests.pending };
  const act = (action: SceneActionV154) => { const result = onAction(action); setMessage(result.message); if (result.ok && action.kind === "choose") setPreview(null); };
  const guestNames = guests.present.map(id => guestResidentV150(house.regionId as HomeworldRegionIdV68, id)?.name ?? id);

  return (
    <section className={styles.panel} data-house-scenes-v154={house.id}>
      <h3>Scènes de la maison</h3>
      {scenesForHouseV149(house.id).map(scene => {
        const record = state.scenes[scene.id];
        const gestures = sceneGesturesV154(scene);
        const options = sceneOptionsV154(scene);
        const trigger = sceneTriggerV154(scene, residenceState, context);
        const done = record?.gestures ?? 0;
        const resolved = record?.choice != null;
        const canPlay = done > 0 || trigger.reached;
        const open = openId === scene.id;
        const dialogue = dialogues?.[scene.id] ?? loaded[scene.id] ?? null;
        const moment = resolved ? { kind: "response" as const, choice: record!.choice! }
          : preview !== null && done >= gestures.length ? { kind: "preview" as const, choice: preview }
          : done >= gestures.length ? { kind: "success" as const } : done > 0 ? { kind: "resume" as const } : { kind: "opening" as const };
        return <div key={scene.id} className={styles.block} data-house-scene={scene.id}
          data-house-scene-state={resolved ? "resolved" : done > 0 ? "started" : trigger.reached ? "ready" : "waiting"}>
          <h4>{scene.title}</h4>
          <p className={styles.note}>Déclencheur : {scene.trigger}.{" "}
            {trigger.proposed ? "Lecture du jeu (proposé) : " : "Lecture : "}{trigger.readings.join(" ou ")}.{" "}
            {!resolved && done === 0 && (trigger.reached ? "Atteint." : `Manque : ${trigger.missing.join(", ")}.`)}</p>
          {resolved ? <div data-house-scene-result={record!.choice}>
            <button disabled={disabled || guests.present.length === 0} data-house-scene-review={scene.id}
              onClick={() => { setOpenId(scene.id); setPreview(null); setMessage(""); }}>Revoir la conversation</button>
            <p><b>{options[record!.choice!]}</b></p>
            {guests.present.length === 0 && <p className={styles.note}>Les invités doivent être présents pour revoir la conversation.</p>}
            <p>{scene.consequence}</p>
            {record!.consumed.length > 0 && (stock ? <p className={styles.note} data-house-scene-consumed={stock.receipts.includes(`${scene.id}:materials`) ? "taken" : "inscribed"}>
              {stock.receipts.includes(`${scene.id}:materials`)
                ? `Prélevé de la réserve : ${sceneMaterialNeedsV158(scene.id, record!.choice!).map(c => `${c.quantity} × ${c.item}`).join(", ")}.`
                : `Consommation inscrite avant la réserve de matériaux : ${record!.consumed.map(c => `${c.quantity ?? "quantité non indiquée"} × ${c.item}`).join(", ")} ; rien n’a été prélevé.`}</p>
              : <p className={styles.note} data-house-scene-consumed>Consommation inscrite : {record!.consumed.map(c => `${c.quantity ?? "quantité non indiquée"} × ${c.item}`).join(", ")} (matériau absent du jeu : rien n’est prélevé, proposé).</p>)}
          </div> : !open ? <button disabled={disabled || !canPlay} data-house-scene-open={scene.id} onClick={() => { setOpenId(scene.id); setPreview(null); setMessage(""); }}>
            {done > 0 ? `Reprendre (${done}/${gestures.length} gestes)` : "Jouer la scène"}</button> : null}
          {open && !resolved && <>
            <ol className={styles.slots}>
              {gestures.map((gesture, index) => <li key={index}>
                {index < done ? <s>{gesture}</s> : <button disabled={disabled || index !== done} data-house-scene-gesture={index} onClick={() => act({ kind: "gesture", sceneId: scene.id, index })}>{gesture}</button>}
              </li>)}
            </ol>
            {done >= gestures.length && <div className={styles.choices}>
              {options.map((option, index) => <button key={index} disabled={disabled} aria-pressed={preview === index} data-house-scene-preview={index} onClick={() => setPreview(index as 0 | 1)}>{option}</button>)}
            </div>}
            {preview !== null && done >= gestures.length && <div className={styles.block} data-house-scene-preview-of={preview}>
              <p>{scene.consequence}</p>
              {sceneConsumptionV154(scene.id, preview).map(c => stock ? <p key={c.item} className={styles.note} data-house-scene-cost data-house-scene-stock={stock.materials[c.item] ?? 0}>
                Consomme : {c.quantity ?? 1} × {c.item} (« {c.source} »){c.quantity === null && " ; quantité non indiquée, une unité (proposé)"}. Réserve : {stock.materials[c.item] ?? 0}.{(stock.materials[c.item] ?? 0) < (c.quantity ?? 1) && " Réserve insuffisante : la confirmation sera refusée."}</p>
                : <p key={c.item} className={styles.note} data-house-scene-cost>
                Consomme : {c.quantity ?? "quantité non indiquée"} × {c.item} (« {c.source} »).{!MATERIALS_IN_GAME_V154.includes(c.item) && " Ce matériau n’existe pas dans le jeu : la consommation est inscrite au registre, rien n’est prélevé (proposé)."}</p>)}
              <p className={styles.note}>Aperçu gratuit ; la décision ne s’écrit qu’à la confirmation, une seule fois.</p>
              <button disabled={disabled} data-house-scene-confirm={preview} onClick={() => act({ kind: "choose", sceneId: scene.id, choice: preview })}>Confirmer ce choix</button>
            </div>}
            <button disabled={disabled} data-house-scene-leave onClick={() => { setOpenId(null); setPreview(null); }}>Quitter la scène</button>
            <p className={styles.note}>Quitter conserve les gestes faits ; la décision reste ouverte.</p>
          </>}
          {(open || resolved) && guests.present.length > 0 &&
            <HouseSceneConversationV154 guests={guestNames} dialogue={dialogue} moment={moment} />}
        </div>;
      })}
      {message && <p role="status" className={styles.message}>{message}</p>}
    </section>
  );
}
