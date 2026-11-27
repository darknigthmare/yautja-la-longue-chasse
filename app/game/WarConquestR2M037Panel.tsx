"use client";

import { useMemo, useState } from "react";
import type { SaveGame } from "./types";
import { CanyonPatrolViewR2M037 } from "./ClanWarCanyonM037";
import styles from "./ClanWarCanyonM037.module.css";
import { canyonDecisionM037, canyonReportM037 } from "./systems/clanWarM037";
import { warGarrisonV85, warSuppliedV85, warTerritoryForSimulationV96 } from "./systems/clanWarV85";
import {
  CONQUEST_ORIGIN_R2_M037, CONQUEST_PASS_R2_M037, advanceConquestR2M037, conquestAccessR2M037,
  conquestReceiptR2M037, conquestViewR2M037,
  type ConquestActionR2M037, type ConquestCommandR2M037, type ConquestViewR2M037,
} from "./systems/warConquestR2M037";
import { conquestFrontR2M037 } from "./systems/warConquestFrontR2M037";

const instructions: Partial<Record<ConquestViewR2M037["phase"], readonly [ConquestActionR2M037, string]>> = {
  brief: ["reserve-guard", "Affecter la garde P07 au passage"],
  guard: ["resolve-cession", "Résoudre la cession et l’installation de la garde"],
  held: ["plan-convoy", "Tracer le convoi P11 avec une caisse de matériel"],
  convoy: ["reserve-convoy", "Réserver la liaison du convoi"],
  reserved: ["deliver-convoy", "Résoudre la livraison du convoi"],
  delivered: ["enter", "Descendre dans le Canyon des Deux Balises"],
  report: ["debrief", "Remettre le rapport au poste de commandement"],
};

export default function WarConquestR2M037Panel({ save, disabled, onCommand }: {
  save: SaveGame;
  disabled: boolean;
  onCommand: (command: ConquestCommandR2M037) => { ok: boolean; message: string };
}) {
  const [message, setMessage] = useState("");
  const access = conquestAccessR2M037(save);
  const view = useMemo(() => conquestViewR2M037(save), [save]);
  const front = useMemo(() => conquestFrontR2M037(view), [view]);
  const { phase } = view;
  if (!front.ok) return <p role="alert">{front.message}</p>;
  const { simulation } = front;
  const patrol = "patrol" in front ? front.patrol : null;
  const origin = warTerritoryForSimulationV96(simulation, CONQUEST_ORIGIN_R2_M037);
  const pass = warTerritoryForSimulationV96(simulation, CONQUEST_PASS_R2_M037);
  const controlled = simulation.territories[CONQUEST_PASS_R2_M037].controller === "CON-F01";
  const supplied = warSuppliedV85(simulation).has(CONQUEST_PASS_R2_M037);
  const guards = warGarrisonV85(simulation, CONQUEST_PASS_R2_M037);
  const convoy = simulation.convoyRouteV105;
  const report = canyonReportM037(simulation);
  const next = instructions[phase];
  const choice = patrol && canyonDecisionM037(patrol);
  const active = access.ok && !disabled;
  const send = (action: ConquestActionR2M037) => {
    const command = { action, expectedRevision: save.warConquestR2M037?.revision ?? 0 };
    const proposed = advanceConquestR2M037(save, command);
    if (!proposed.ok) { setMessage(proposed.message); return; }
    const nextView = conquestViewR2M037({ ...save, warConquestR2M037: proposed.state });
    const result = conquestFrontR2M037(nextView);
    if (!result.ok) { setMessage(result.message); return; }
    const written = onCommand(command);
    setMessage(written.ok ? "" : written.message);
  };

  return <section className={styles.patrol} aria-labelledby="war-campaign-m037-title" data-testid="war-campaign-m037" data-phase={phase}>
    <h3 id="war-campaign-m037-title">La carte a des chemins</h3>
    {!access.ok && <p role="status">{access.message}</p>}
    {(access.ok || save.warConquestR2M037) && <>
      <div className={styles.campaignLink} role="group" aria-label="Liaison de Korthas">
        <div><strong>{origin?.name}</strong><span>Dépôt de départ · CON-T02</span></div>
        <span className={styles.linkArrow} aria-hidden="true">→</span>
        <div data-held={controlled}><strong>{pass?.name}</strong><span>{controlled ? "Tenu par l’Expédition des Haltes" : "Assemblée des Passes"}</span></div>
      </div>
      <p>Tour {simulation.turn} · {guards.length} garde(s) apte(s) sur le passage · {supplied ? "Liaison de ravitaillement ouverte" : "Ravitaillement à établir"}</p>
      {convoy && <p>Convoi {convoy.combatantIds.join(", ")} · {convoy.completedOrderIds.length
        ? "Matériel livré" : convoy.pendingOrderId ? "Étape réservée" : "Trajet tracé"}</p>}
      {phase === "brief" && <p>Prends en charge la cession puis le ravitaillement du passage. Vérifie la corniche et le fond avant de remettre le rapport.</p>}
      {next && <button type="button" disabled={!active} data-conquest-action={next[0]} onClick={() => send(next[0])}>{next[1]}</button>}
      {phase === "field" && patrol && <>
        <CanyonPatrolViewR2M037 patrol={patrol} active={active} onWalk={direction => send(direction === -1 ? "left" : "right")}
          onChangeLevel={() => send("level")} onCheckSign={() => send("sign")}/>
        {patrol.checked.length === 2 && <p>Regagne le poste ouest pour consolider ou le débouché est pour pousser.</p>}
        <div className={styles.actions}>
          {choice && <button type="button" disabled={!active} data-conquest-action="exit-canyon" onClick={() => send("exit-canyon")}>
            {choice === "consolider" ? "Retour au poste ouest · consolider" : "Retour au commandement par l’est · pousser"}
          </button>}
          <button type="button" disabled={!active} onClick={() => send("withdraw")}>Regagner le poste et reprendre le relevé</button>
        </div>
      </>}
      {report && <p data-testid="war-campaign-m037-report">{report.text}</p>}
      {phase === "complete" && conquestReceiptR2M037(save) && <p role="status">Rapport du canyon enregistré dans la campagne.</p>}
    </>}
    {message && <p role="status">{message}</p>}
  </section>;
}
