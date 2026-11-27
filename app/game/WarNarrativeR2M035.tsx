"use client";

import { useState } from "react";
import type { SaveGame } from "./types";
import { fieldKeyboardAction, fieldKeyboardTargetBlocked } from "./systems/clanWarFieldControls";
import { warTerritoryV85 } from "./systems/clanWarV85Data";
import {
  WAR_NARRATIVE_SITE_R2_M035, WAR_NARRATIVE_WIDTH_R2_M035, canStartWarNarrativeR2M035,
  inspectWarNarrativeR2M035, warNarrativeThreatR2M035, type WarNarrativeActionR2M035,
  type WarNarrativeCommandR2M035,
} from "./systems/warNarrativeR2M035";
import styles from "./WarNarrativeR2M035.module.css";

export default function WarNarrativeR2M035({ save, disabled, onCommand }: {
  save: SaveGame;
  disabled: boolean;
  onCommand: (command: WarNarrativeCommandR2M035) => { ok: boolean; message: string };
}) {
  const [feedback, setFeedback] = useState("");
  const { state, view } = inspectWarNarrativeR2M035(save.warNarrativeR2M035, save.createdAt);
  const open = canStartWarNarrativeR2M035(save);
  const { player, scout } = view;
  const act = (action: WarNarrativeActionR2M035) => {
    if (!disabled && open) setFeedback(onCommand({ action, expectedRevision: state?.orders.length ?? 0 }).message);
  };
  const control = (action: WarNarrativeActionR2M035, label: string) => (
    <button type="button" disabled={disabled || !open} onClick={() => act(action)} data-m035-action={action}>{label}</button>
  );
  const onField = view.phase === "field" || view.phase === "return";
  const returning = view.phase === "return" || view.phase === "complete";
  return <section className={styles.panel} data-m035-stage={view.phase} data-m035-x={player.x} data-m035-scout={scout.x}
    aria-labelledby="war-narrative-m035-title" tabIndex={onField ? 0 : undefined} onKeyDown={event => {
      if (disabled || !onField || fieldKeyboardTargetBlocked(event.target) || event.repeat) return;
      const routeAction = fieldKeyboardAction({
        key: event.key, repeat: event.repeat, ctrlKey: event.ctrlKey, metaKey: event.metaKey,
        altKey: event.altKey, isComposing: event.nativeEvent.isComposing, mode: "stealth",
      });
      if (routeAction === "left" || routeAction === "right" || routeAction === "wait" ||
          routeAction === "up" || routeAction === "down") {
        event.preventDefault();
        act(routeAction === "up" || routeAction === "down" ? "lane" : routeAction);
      }
    }}>
    <header>
      <h3 id="war-narrative-m035-title">Un conflit de clan à hauteur de chasseur</h3>
      <p>Korthas · {warTerritoryV85(WAR_NARRATIVE_SITE_R2_M035)?.name ?? "CON-T09"}</p>
    </header>
    {!open && <p>Termine les huit chasses, présente l’engagement de la Veille Partagée au conseil et clos l’opération du clan en cours.</p>}
    {view.phase === "diplomacy" && open && <>
      <p>Les Gardes du Temple ont demandé un cessez-le-feu à la Coalition des Forges. La liaison de Korthas répond encore.</p>
      {control("diplomacy", "Écouter la réponse des Gardes du Temple")}
    </>}
    {view.phase === "briefing" && open && <>
      <p>La Coalition a rejeté le cessez-le-feu. La rampe de l’est est sous pression. Relève la première balise et accompagne l’éclaireur des Passes jusqu’au sas.</p>
      <div className={styles.controls}>
        {control("faction", "Rejoindre l’Expédition des Haltes")}{control("rescue", "Prendre la mission de secours")}
      </div>
    </>}
    {(onField || view.phase === "complete") && <>
      <div className={styles.route} role="img"
        aria-label={"Chasseur au repère " + (player.x + 1) + " sur " + (player.lane ? "la corniche" : "le fond") +
          (returning ? ", retour au passage" : ", éclaireur au repère " + (scout.x + 1))}>
        {[1, 0].flatMap(lane => Array.from({ length: WAR_NARRATIVE_WIDTH_R2_M035 }, (_, x) => {
          const actor = player.x === x && player.lane === lane;
          const guide = !returning && scout.x === x && scout.lane === lane;
          const trace = returning && x === 6 && lane === 0;
          return <span aria-hidden="true" key={lane + "-" + x} data-player={actor} data-scout={guide} data-trace={trace}
            data-threat={warNarrativeThreatR2M035(x, view)} data-ramp={[2, 4, 8, 10, 12].includes(x)}>
            {actor && guide ? "◉◆" : actor ? "◉" : guide ? "◆" : trace ? "!" : x === 12 ? "◫" : x === 2 && !view.passageRead ? "△" : ""}
          </span>;
        }))}
      </div>
      {returning ? <p>{view.decision === "protect"
        ? "Des étais consolident désormais la balise déplacée. Le sas est ouvert aux survivants."
        : "La poursuite a laissé un sas condamné. Des débris marquent le nouveau passage."}</p>
        : <p>{view.duty === "rescue" ? "Secours des Passes" : "Expédition des Haltes"} ·
          Éclaireur {view.scoutHealth}/2 · couverture {view.cover} déplacement{view.cover === 1 ? "" : "s"}</p>}
    </>}
    {onField && <div className={styles.controls}>
      {(view.phase === "field" || view.returnStarted) && <>
        {control("left", "Reculer")}{control("right", "Avancer")}{control("lane", "Changer de voie")}
      </>}
      {view.phase === "field" ? <>
        {!view.passageRead && control("inspect", "Relever la balise")}
        {view.passageRead && view.duty === "rescue" && !view.following && view.scoutHealth === 1 &&
          control("stabilize", "Stabiliser l’éclaireur")}
        {view.passageRead && !view.following && control("signal", "Donner le signal à l’éclaireur")}
        {view.following && <>{control("cover", "Couvrir l’éclaireur")}{control("wait", "Attendre l’éclaireur")}</>}
        {!view.decision && player.x === 8 && scout.x === 8 && <>
          {control("protect", "Protéger le sas")}{control("pursue", "Poursuivre sur la corniche")}
        </>}
        {view.decision === "pursue" && !view.trailRead && control("track", "Vérifier la piste adverse")}
        {view.decision && player.x === 12 && control("extract", "Emmener l’éclaireur au sas")}
      </> : <>
        {!view.returnStarted && control("return", "Repartir de l’entrée du passage")}
        {view.returnStarted && player.x === 6 && player.lane === 0 && control("record", "Relever le passage transformé")}
      </>}
    </div>}
    {view.phase === "withdrawn" && <>
      <p>L’éclaireur s’est replié après avoir traversé la zone de feu sans couverture.</p>
      {control("retry", "Reprendre à l’entrée du canyon")}
    </>}
    {view.phase === "complete" && <p data-m035-receipt>Retour consigné · {view.decision === "protect" ? "Sas protégé" : "Piste adverse reconnue"}</p>}
    {feedback && <p role="status">{feedback}</p>}
  </section>;
}
