"use client";

import { useId, useState, type KeyboardEvent } from "react";
import { CANYON_GEOMETRY_V85 } from "./systems/clanWarCanyonV85";
import {
  archiveCanyonPatrolM037, canyonDecisionM037, canyonIssueM037, canyonReportM037,
  changeCanyonLevelM037, checkCanyonSignM037, nearCanyonSignM037, startCanyonPatrolM037,
  walkCanyonM037, type CanyonPatrolM037,
} from "./systems/clanWarM037";
import type { WarSimulationV85, WarUpdateV85 } from "./systems/clanWarV85";
import styles from "./ClanWarCanyonM037.module.css";

const terrain = CANYON_GEOMETRY_V85;

export default function ClanWarCanyonM037({ simulation, disabled, onUpdate }: {
  simulation: WarSimulationV85;
  disabled: boolean;
  onUpdate: (operation: (current: WarSimulationV85) => WarUpdateV85) => boolean;
}) {
  const [patrol, setPatrol] = useState<CanyonPatrolM037 | null>(null);
  const title = useId();
  const report = canyonReportM037(simulation);
  const issue = canyonIssueM037(simulation);
  const active = Boolean(patrol && !issue && !disabled && !report);
  const choice = patrol ? canyonDecisionM037(patrol) : null;

  function walk(direction: -1 | 1) {
    setPatrol(current => current ? walkCanyonM037(current, direction) : null);
  }

  function changeLevel() {
    setPatrol(current => current ? changeCanyonLevelM037(current) : null);
  }

  function checkSign() {
    setPatrol(current => current ? checkCanyonSignM037(current) : null);
  }

  function onKeyDown(event: KeyboardEvent<SVGSVGElement>) {
    if (!active) return;
    switch (event.key) {
      case "ArrowLeft": walk(-1); break;
      case "ArrowRight": walk(1); break;
      case "ArrowUp":
      case "ArrowDown": changeLevel(); break;
      case "Enter":
      case " ": checkSign(); break;
      default: return;
    }
    event.preventDefault();
  }

  return <section className={styles.patrol} aria-labelledby={title} data-testid="war-canyon-m037">
    <h5 id={title}>Canyon des Deux Balises</h5>
    {report ? <p role="status">Tour {report.turn} · {report.text}</p> : <>
      <p>Passage des Lames Plates. Envoyez un porteur à la corniche nord et au fond du canyon pendant que la garnison tient le poste.</p>
      {issue && <p role="status">{issue}</p>}
      {!patrol && <button type="button" disabled={disabled || !!issue}
        onClick={() => setPatrol(startCanyonPatrolM037(simulation))}>Entrer dans le passage</button>}
      {patrol && <>
        <svg className={styles.terrain} viewBox="0 0 100 37" role="img" tabIndex={active ? 0 : -1}
          aria-label="Canyon. Flèches gauche et droite pour marcher, haut et bas à un accès pour changer de niveau, Entrée pour vérifier une balise."
          onKeyDown={onKeyDown}>
          <title>Corniche nord et fond du Canyon des Deux Balises</title>
          <path className={styles.rock} d="M0 8 11 5 20 9 31 4 43 8 52 6 67 9 78 4 88 8 100 5V37H0Z"/>
          <path className={styles.floor} d={`M0 15H${terrain.bridgeWest} M${terrain.bridgeEast} 15H100 M0 30H100`}/>
          <path className={styles.crossing} d={`M${terrain.start} 30 ${terrain.westRamp} 15 M${terrain.eastStair} 15 ${terrain.finish} 30`}/>
          <path className={styles.bridge} d={`M${terrain.bridgeWest} 15 Q52 22 ${terrain.bridgeEast} 15`}/>
          <g className={styles.landmark}>
            <text x="2" y="12">Corniche nord</text>
            <text x="2" y="35">Fond du canyon</text>
            <text x="43" y="25">Pont fermé</text>
            <text x="78" y="35">Débouché est</text>
          </g>
          <g className={styles.markers}>
            <path data-checked={patrol.checked.includes(34)} d="M34 15v-5l1.5 1-1.5 1"/>
            <path data-checked={patrol.checked.includes(72)} d="M72 30v-5l1.5 1-1.5 1"/>
            <circle cx={patrol.x} cy={patrol.level ? 13.5 : 28.5} r="1.35"/>
          </g>
        </svg>
        <p role="status">{patrol.inspectorId} · {patrol.level ? "Corniche nord" : "Fond du canyon"} · {patrol.checked.length} / 2 balises vérifiées</p>
        <div className={styles.actions}>
          <button type="button" disabled={!active} onClick={() => walk(-1)}>Marcher à gauche</button>
          <button type="button" disabled={!active} onClick={() => walk(1)}>Marcher à droite</button>
          <button type="button" disabled={!active || patrol.x > terrain.westRamp && patrol.x < terrain.eastStair}
            onClick={changeLevel}>{patrol.level ? "Descendre au fond" : "Monter à la corniche"}</button>
          <button type="button" disabled={!active || nearCanyonSignM037(patrol) === undefined} onClick={checkSign}>Vérifier la balise</button>
        </div>
        {patrol.checked.length === 2 && <p>Allez au poste ouest pour consolider, ou au débouché est pour préparer la progression.</p>}
        <div className={styles.actions}>
          {choice && <button type="button" disabled={!active}
            onClick={() => { if (onUpdate(current => archiveCanyonPatrolM037(current, patrol))) setPatrol(null); }}>
            {choice === "consolider" ? "Consigner et consolider" : "Consigner et préparer la progression"}
          </button>}
          <button type="button" onClick={() => setPatrol(null)}>Quitter l’inspection</button>
        </div>
      </>}
    </>}
  </section>;
}
