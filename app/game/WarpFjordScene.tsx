"use client";

/* eslint-disable @next/next/no-img-element -- original game sprite with transparency */
import { useState, type KeyboardEvent } from "react";
import type { SaveGame } from "./types";
import { WarpWalker } from "./WarpCommonSceneR2";
import {
  W01_FJORD_ART, W01_FJORD_FORK, W01_FJORD_LIMIT, W01_FJORD_ROUTES, warpFjordWithinReach,
  type WarpFjordAction, type WarpFjordPosition, type WarpFjordRecord,
} from "./systems/warpFjordW01";
import styles from "./WarpFjordScene.module.css";

const stops = {
  grotte: { name: "Caverne marine", landmark: "Ancre Warp", at: 0, floor: "17%" },
  quai: { name: "Quais gelés", landmark: "Treuil d’amarrage", at: W01_FJORD_ROUTES.quai.checkpoint, floor: "17%" },
  falaise: { name: "Corniche", landmark: "Poste des guetteurs", at: W01_FJORD_ROUTES.falaise.checkpoint, floor: "36%" },
} as const;
const positionAt = (at: number) => 10 + 80 * at / W01_FJORD_LIMIT + "%";

export default function WarpFjordScene({ record, identity, onAction }: {
  record: WarpFjordRecord | undefined;
  identity: Pick<SaveGame, "appearance" | "loadout">;
  onAction: (action: WarpFjordAction) => void;
}) {
  const [route, setRoute] = useState<WarpFjordPosition>(record?.route ?? "grotte");
  const [at, setAt] = useState(record ? W01_FJORD_ROUTES[record.route].checkpoint : 0);
  const [facing, setFacing] = useState<-1 | 1>(record ? -1 : 1);
  const inCave = route === "grotte";
  const minimum = inCave ? 0 : W01_FJORD_FORK;
  const maximum = inCave ? W01_FJORD_FORK : W01_FJORD_LIMIT;
  const site = stops[route];
  const nearFork = warpFjordWithinReach(at, W01_FJORD_FORK);
  const nearSite = warpFjordWithinReach(at, site.at);

  function move(direction: -1 | 1) {
    setFacing(direction);
    setAt(position => Math.max(minimum, Math.min(maximum, position + direction)));
  }

  function changeRoute(next: WarpFjordPosition) {
    setRoute(next);
    setAt(W01_FJORD_FORK);
    setFacing(next === "grotte" ? -1 : 1);
  }

  function onWalkKey(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    move(event.key === "ArrowLeft" ? -1 : 1);
  }

  return <section className={styles.scene} aria-labelledby="fjord-w01-title" data-warp-fjord
    data-fjord-route={route} data-fjord-position={at} data-fjord-observed={String(!!record)}>
    <h4 id="fjord-w01-title">Le fjord des crânes · Une voile dans la brume</h4>
    <p>{record ? "Rapporte le relevé à l’ancre de la caverne." : "À la sortie de la caverne, rejoins les quais ou monte par la corniche. Repère l’équipage et la piste de son champion."}</p>
    <div className={styles.terrain} style={{ backgroundImage: "url(" + W01_FJORD_ART.shore + ")" }}
      role="group" aria-label={"Sentier · " + site.name} tabIndex={0} onKeyDown={onWalkKey}>
      <div className={styles.track} aria-hidden="true" style={{ left: positionAt(minimum), right: "calc(100% - " + positionAt(maximum) + ")", bottom: site.floor }} />
      <span className={styles.landmark} style={{ left: positionAt(W01_FJORD_FORK), bottom: site.floor }} data-near={nearFork}>
        {inCave ? "Sortie de la caverne" : "Vers la caverne"}
      </span>
      <span className={styles.landmark} style={{ left: positionAt(site.at), bottom: site.floor }} data-near={nearSite}>{site.landmark}</span>
      {route === "quai" && <img className={styles.winch} src={W01_FJORD_ART.winch} alt="" width={1536} height={1024}
        data-warp-fjord-winch style={{ left: positionAt(site.at), bottom: site.floor }} />}
      <WarpWalker identity={identity} position={at} facing={facing} limit={W01_FJORD_LIMIT} floor={site.floor} inset={10} />
    </div>
    <div className={styles.actions} role="group" aria-label="Déplacements et gestes dans le fjord">
      <button type="button" data-fjord-walk="left" disabled={at === minimum} onClick={() => move(-1)}>Marcher à gauche</button>
      <button type="button" data-fjord-walk="right" disabled={at === maximum} onClick={() => move(1)}>Marcher à droite</button>
      {inCave ? <>
        <button type="button" data-fjord-enter="quai" disabled={!nearFork} onClick={() => changeRoute("quai")}>Descendre aux quais</button>
        <button type="button" data-fjord-enter="falaise" disabled={!nearFork} onClick={() => changeRoute("falaise")}>Suivre la corniche</button>
      </> : <button type="button" data-fjord-enter="grotte" disabled={!nearFork} onClick={() => changeRoute("grotte")}>Rejoindre la caverne</button>}
      {!inCave && !record && <button type="button" data-fjord-observe
        disabled={!nearSite} onClick={() => onAction({ kind: "observe", route, at })}>{W01_FJORD_ROUTES[route].action}</button>}
      {inCave && record && <button type="button" data-fjord-report disabled={!nearSite}
        onClick={() => onAction({ kind: "report", route: "grotte", at })}>Franchir la fenêtre avec le relevé</button>}
    </div>
  </section>;
}
