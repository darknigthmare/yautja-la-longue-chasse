"use client";

/* eslint-disable @next/next/no-img-element -- original game sprite with transparency */
import { useState, type KeyboardEvent } from "react";
import type { SaveGame } from "./types";
import { WarpWalker } from "./WarpCommonSceneR2";
import { W01_FJORD_ART, type WarpFjordRoute } from "./systems/warpFjordW01";
import {
  W01_FORTRESS_APPROACH, W01_FORTRESS_HALL_ART, W01_FORTRESS_HALL_START, W01_FORTRESS_LIMIT,
  W01_FORTRESS_TABLE, W01_FORTRESS_TIDE_POST, warpFortressInReach, warpFortressNextStage,
  type WarpFortressAction, type WarpFortressRecord,
} from "./systems/warpFortressW01";
import styles from "./WarpFjordScene.module.css";

const percent = (at: number) => 10 + 80 * at / W01_FORTRESS_LIMIT + "%";

export default function WarpFortressScene({ record, route, identity, onAction }: {
  record: WarpFortressRecord | undefined;
  route: WarpFjordRoute;
  identity: Pick<SaveGame, "appearance" | "loadout">;
  onAction: (action: WarpFortressAction) => void;
}) {
  const approach = W01_FORTRESS_APPROACH[route];
  const stage = record?.stage;
  const [at, setAt] = useState(() => stage === "copied" ? W01_FORTRESS_TABLE :
    stage === "entered" ? approach.gate : stage === "sounded" ? W01_FORTRESS_TIDE_POST : 0);
  const [facing, setFacing] = useState<-1 | 1>(stage === "copied" ? -1 : 1);
  const nextStage = warpFortressNextStage(stage);
  const limit = stage === "entered" || stage === "copied" ? W01_FORTRESS_LIMIT : approach.gate;
  const hall = at >= W01_FORTRESS_HALL_START;
  const floor = hall ? "23%" : route === "quai" ? "17%" : "32%";
  const targets = {
    sounded: { at: W01_FORTRESS_TIDE_POST, label: "Lire les marques de marée" },
    entered: { at: approach.gate, label: approach.open },
    copied: { at: W01_FORTRESS_TABLE, label: "Relever les marques de relève" },
    returned: { at: 0, label: "Franchir la fenêtre avec le relevé" },
  };
  const instructions = {
    sounded: "Rejoins les marques d’eau et lis-les avant d’approcher de l’accès.",
    entered: route === "quai" ? "La marée descend. Le seuil de bois et son treuil sont dégagés." :
      "La marée descend. La gorge libère l’accès à la poterne.",
    copied: "L’accès est ouvert. Rejoins la table du guet dans la halle.",
    returned: "L’empreinte relie les relèves à la tour. Retourne à l’ancre.",
  };
  const landmark = nextStage ? targets[nextStage] : null;
  const inReach = !!landmark && warpFortressInReach(at, landmark.at);

  function move(direction: -1 | 1) {
    if (direction < 0 ? at <= 0 : at >= limit) return;
    setFacing(direction);
    setAt(position => Math.max(0, Math.min(limit, position + direction)));
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
      event.preventDefault();
      move(event.key === "ArrowLeft" ? -1 : 1);
    }
  }

  return <section className={styles.scene} aria-labelledby="warp-fortress-w01-title" data-warp-fortress
    data-fortress-position={at} data-fortress-stage={stage ?? "arrival"} data-fortress-approach={route}
    data-fortress-place={hall ? "hall" : "outside"}>
    <h4 id="warp-fortress-w01-title">La forteresse des marées</h4>
    {nextStage && <p>{instructions[nextStage]}</p>}
    <div className={styles.terrain} style={{ backgroundImage: "url(" + (hall ? W01_FORTRESS_HALL_ART : W01_FJORD_ART.shore) + ")" }}
      role="group" aria-label={"Sentier · " + (hall ? "Halle du guet" : approach.name)} tabIndex={0} onKeyDown={onKeyDown}>
      <div className={styles.track} aria-hidden="true" style={{ left: percent(0), right: "calc(100% - " + percent(limit) + ")", bottom: floor }} />
      <span className={styles.landmark} data-near={landmark?.at === 0 && inReach} style={{ left: percent(0), bottom: floor }}>Ancre Warp</span>
      {!hall && <>
        <span className={styles.landmark} data-near={landmark?.at === W01_FORTRESS_TIDE_POST && inReach}
          style={{ left: percent(W01_FORTRESS_TIDE_POST), bottom: floor }}>Marques d’eau</span>
        <span className={styles.landmark} data-near={landmark?.at === approach.gate && inReach}
          style={{ left: percent(approach.gate), bottom: floor }}>{approach.landmark}</span>
        {route === "quai" && <img className={styles.winch} src={W01_FJORD_ART.winch} alt="" width={1536} height={1024}
          style={{ left: percent(approach.gate), bottom: floor }} />}
      </>}
      {hall && <span className={styles.landmark} data-near={landmark?.at === W01_FORTRESS_TABLE && inReach}
        style={{ left: percent(W01_FORTRESS_TABLE), bottom: floor }}>Table du guet</span>}
      <WarpWalker identity={identity} position={at} facing={facing} limit={W01_FORTRESS_LIMIT} floor={floor} inset={10} />
    </div>
    <div className={styles.actions} role="group" aria-label="Déplacements et gestes dans la forteresse">
      <button type="button" data-fortress-walk="left" disabled={at <= 0} onClick={() => move(-1)}>Marcher à gauche</button>
      <button type="button" data-fortress-walk="right" disabled={at >= limit} onClick={() => move(1)}>Marcher à droite</button>
      {nextStage && landmark && <button type="button" data-fortress-act={nextStage}
        disabled={!inReach} onClick={() => onAction({ kind: nextStage, at })}>{landmark.label}</button>}
    </div>
  </section>;
}
