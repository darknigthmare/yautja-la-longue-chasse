"use client";

import type { CSSProperties } from "react";
import HomeworldNativePropV64 from "./HomeworldNativePropV64";
import { HOMEWORLD_YOUTH_PLATE_V69 } from "./systems/homeworldAccessV69";
import { HOMEWORLD_OUTSKIRTS_ART_V71, HOMEWORLD_OUTSKIRTS_GROUND_V71 } from "./systems/homeworldOutskirtsArtV71";
import { HOMEWORLD_PROP_ART_V64 } from "./systems/homeworldArtV64";
import { HOMEWORLD_REGIONS_V68, REGION_FAUNA_ART_V68 } from "./systems/homeworldRegionsV68";
import {
  LOOP_M014_BARRIER, LOOP_M014_LAST, LOOP_M014_RESOURCE, LOOP_M014_TOOLS, REGIONAL_LOOP_M014,
  type HomeworldRegionalLoopM014, type RegionalLoopCommandM014, type RegionalLoopRouteM014,
} from "./systems/homeworldRegionalLoopM014";
import styles from "./HomeworldRegionalLoopM014.module.css";

type Props = {
  loop: HomeworldRegionalLoopM014;
  suspended: boolean;
  notice: string;
  onCommand: (command: RegionalLoopCommandM014) => void;
  onCity: () => void;
  onSettings: () => void;
};
const loopRoutes: [RegionalLoopRouteM014, string][] = [["high", "Route haute"], ["sheltered", "Route abritée"]];
const steps = [0, 1, 2, 3, 4, 5, 6, 7];
const positionPercent = (step: number) => 8 + 11 * step;
const pathOffset = (route: RegionalLoopRouteM014 | null, step: number) =>
  0.5 * (route === "high" ? [0, -12, -23, -41, -56, -58, -62, -64][step] : [0, 2, 11, 19, 27, 21, 15, 8][step]);

export default function HomeworldRegionalLoopM014({ loop, suspended, notice, onCommand, onCity, onSettings }: Props) {
  const passage = loop.passage;
  const region = REGIONAL_LOOP_M014[loop.reports.length];
  const lane = region && passage?.route ? region[passage.route] : null;
  const crossing = passage?.position === LOOP_M014_BARRIER && !passage.gateOpen;
  const canMoveLeft = !!passage?.route && passage.position > 0;
  const canMoveRight = !!passage?.route && passage.position < LOOP_M014_LAST && !crossing && passage.observation !== "alert";
  const observing = passage?.position === LOOP_M014_LAST && passage.observation === "none";
  const fauna = region ? REGION_FAUNA_ART_V68[region.id === "city-border" ? "ash-marches" : region.id] : undefined;
  const background = region?.id === "city-border" ? HOMEWORLD_OUTSKIRTS_GROUND_V71.src : region ? HOMEWORLD_REGIONS_V68[region.id].panorama : "";
  const send = (command: RegionalLoopCommandM014) => { if (!suspended) onCommand(command); };
  const move = (direction: -1 | 1) => send({ type: "walk", direction });
  const canLeave = !passage || passage.position === 0;
  const heading = region ? region.name : "Les trois relevés sont inscrits";

  return <main className={styles.page} data-regional-loop-m014={loop.phase}
    data-screen-focus tabIndex={0} aria-label="Circuit des régions proches"
    onKeyDown={event => {
      if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
      event.preventDefault();
      event.stopPropagation();
      if (event.repeat) return;
      if (event.key === "ArrowLeft" && canMoveLeft) move(-1);
      if (event.key === "ArrowRight" && canMoveRight) move(1);
    }}>
    <header className={styles.header}>
      <div><h1>Boucle des régions proches</h1><p>{heading}</p></div>
      <button type="button" className={styles.button} disabled={suspended} onClick={onSettings}>Réglages</button>
    </header>
    {region && passage && <>
      <div aria-hidden="true" className={styles.landscape} data-region-m014={region.id} style={{ backgroundImage: "url(" + background + ")" }}>
        {region.id === "city-border" && <div className={styles.foreground}>
          <HomeworldNativePropV64 id="m014-muret" artId="retaining" art={HOMEWORLD_OUTSKIRTS_ART_V71.retaining} x={42} y={22} depth={2} heightWorld={48} />
        </div>}
        <div className={styles.halt} aria-hidden="true">
          <HomeworldNativePropV64 id="m014-balise" artId="beacon" art={HOMEWORLD_PROP_ART_V64.beacon} x={18} y={2} depth={1} heightWorld={42} />
        </div>
        {steps.map(step => <span key={step} className={step <= passage.position ? styles.stepReached : styles.step}
          style={{ left: positionPercent(step) + "%", marginTop: pathOffset(passage.route, step) }} />)}
        <span className={styles.hunter} style={{ left: positionPercent(passage.position) + "%", marginTop: pathOffset(passage.route, passage.position),
          backgroundImage: "url(" + HOMEWORLD_YOUTH_PLATE_V69.src + ")" }} />
        {fauna && passage.route && passage.position >= 5 && passage.observation !== "alert" && <span className={styles.prey}
          style={{ "--prey-art": "url(" + fauna.src + ")", "--prey-frame": passage.observation === "observed" ? "0%" : passage.still ? "33.333%" : "100%" } as CSSProperties} />}
      </div>
      <div className={styles.status}>
        <strong>{passage.position === 0 ? region.halt : passage.position === LOOP_M014_LAST ? "Poste d’observation" : lane?.barrier && passage.position === LOOP_M014_BARRIER ? lane.barrier : "Sentier"}</strong>
        <span data-regional-position-m014={passage.position}>{passage.route ? "Repère " + (passage.position + 1) + " / " + (LOOP_M014_LAST + 1) : "Deux passages partent de la halte."}</span>
      </div>
      <div className={styles.actions}>
        {!passage.route && loopRoutes.map(([route, label]) => <button key={route} type="button" disabled={suspended}
          className={styles.button} data-regional-action-m014={"choose-" + route} onClick={() => send({ type: "choose", route })}>{label}</button>)}
        {passage.route && <>
          <button type="button" className={styles.button} disabled={suspended || !canMoveLeft} data-regional-action-m014="back"
            onClick={() => move(-1)}>Reculer</button>
          <button type="button" className={styles.button} disabled={suspended || !canMoveRight} data-regional-action-m014="forward"
            onClick={() => move(1)}>Avancer</button>
        </>}
        {crossing && Object.entries(LOOP_M014_TOOLS).map(([tool, label]) => <button key={tool} type="button" className={styles.button}
          disabled={suspended} data-regional-action-m014={tool} onClick={() => send({ type: "tool", tool: tool as keyof typeof LOOP_M014_TOOLS })}>{label}</button>)}
        {lane && passage.position === LOOP_M014_RESOURCE && !passage.sample && passage.observation !== "alert" &&
          <button type="button" className={styles.button} data-regional-action-m014="sample" disabled={suspended}
            onClick={() => send({ type: "sample" })}>Consigner le relevé</button>}
        {observing && lane && <>
          <button type="button" className={styles.button} disabled={suspended || passage.still >= lane.quiet}
            data-regional-action-m014="wait" onClick={() => send({ type: "wait" })}>Rester immobile</button>
          <button type="button" className={styles.button} disabled={suspended} data-regional-action-m014="observe"
            onClick={() => send({ type: "observe" })}>Observer la proie</button>
        </>}
        {passage.route && passage.position === 0 && (passage.observation === "observed"
          ? <button type="button" className={styles.button} disabled={suspended} data-regional-action-m014="report"
              onClick={() => send({ type: "report" })}>Remettre le rapport</button>
          : <button type="button" className={styles.button} disabled={suspended} data-regional-action-m014="retry"
              onClick={() => send({ type: "retry" })}>Reprendre depuis la halte</button>)}
      </div>
      {lane && <p className={styles.hint}>{passage.observation === "alert" ? "Reste sur le sentier et reprends depuis la halte."
        : passage.observation === "observed" ? "Retourne à la halte avec ton rapport."
        : observing ? "Laisse la proie reprendre ses mouvements. Immobilité " + passage.still + " / " + lane.quiet + "."
        : crossing ? LOOP_M014_TOOLS[lane.tool] + " permet de franchir le passage."
        : passage.position === LOOP_M014_RESOURCE ? lane.resource : "Le poste d’observation se situe au bout du passage."}</p>}
    </>}
    <p className={styles.notice} aria-live="polite">{notice}</p>
    {loop.reports.length > 0 && <ol aria-label="Rapports du circuit" className={styles.reports}>
      {loop.reports.map((report, index) => <li key={REGIONAL_LOOP_M014[index].id}>
        {REGIONAL_LOOP_M014[index].name} · {loopRoutes.find(([route]) => route === report.route)?.[1]}
        {report.sample && " · " + REGIONAL_LOOP_M014[index][report.route].resource}
      </li>)}
    </ol>}
    <footer className={styles.footer}>
      <span>{loop.phase === "return-to-instructor" ? "Rends la bourse au Maître des terrasses." : "Bourse d’outils confiée"}</span>
      <button type="button" className={styles.button} disabled={suspended || !canLeave} data-regional-action-m014="city"
        onClick={onCity}>Retour à la cité</button>
    </footer>
  </main>;
}
