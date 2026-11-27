"use client";

import styles from "./HomeworldPackTrialM029.module.css";
import {
  homeworldPackActionsM029,
  PACK_FARTHEST_M029,
  PACK_SHELTERS_M029,
  PACK_SIZE_M029,
  type HomeworldPackActionM029,
  type homeworldPackViewM029,
} from "./systems/homeworldPackTrialM029";

type TrialProps = {
  view: ReturnType<typeof homeworldPackViewM029>;
  locked: string | null;
  paused: boolean;
  onAction: (action: HomeworldPackActionM029) => void;
};
const moveLabels = {
  east: "Marcher vers la crête",
  west: "Marcher vers le point de départ",
  regroup: "Rassembler les élèves",
  shelter: "Donner le signal d’abri",
  turn: "Engager le retour du pack",
  count: "Compter les élèves revenus",
} as const;
const laneStyle = (position: number) => ({ left: ((position + 0.5) / (PACK_FARTHEST_M029 + 1)) * 100 + "%" });

export default function HomeworldPackTrialM029({ view, locked, paused, onAction }: TrialProps) {
  const actions = view ? homeworldPackActionsM029(view) : [];
  return (
    <section className={styles.trial} aria-label="Sortie avec les élèves" data-homeworld-pack-m029={view?.phase ?? "waiting"}>
      <h4>Sortie avec les élèves</h4>
      {locked && <p>{locked}</p>}
      {!view && (
        <>
          {!locked && <p>Mène les douze élèves jusqu’à la crête. Regroupe-les aux abris, puis ramène-les au poste.</p>}
          <button type="button" disabled={paused || !!locked} data-homeworld-pack-action-m029="start" onClick={() => onAction("start")}>
            Rassembler le pack au départ
          </button>
        </>
      )}
      {view && (
        <>
          <div className={styles.lane} aria-label={"Carte du parcours, position " + view.player}>
            <i className={styles.shelter} style={laneStyle(PACK_SHELTERS_M029.outward)} aria-label="Abri de l’aller" />
            <i className={styles.shelter} style={laneStyle(PACK_SHELTERS_M029.returning)} aria-label="Abri du retour" />
            <span className={styles.leader} style={laneStyle(view.player)} data-homeworld-pack-lead-m029={view.player} title="Guide">G</span>
            {view.pupils.map((position, index) => (
              <span className={styles.pupil} key={index} data-homeworld-pack-pupil-m029={position}
                aria-label={"Élève " + (index + 1) + ", position " + position}
                style={{ ...laneStyle(position), top: 29 + index * 9 }}>
                {index + 1}
              </span>
            ))}
          </div>
          <div className={styles.labels}><span>Point de départ</span><span>Crête</span></div>
          <p role="status">
            {view.phase === "returned" ? "Les douze élèves sont rentrés. Le maître conserve le relevé de la sortie." :
              view.pupils.filter(position => position === view.player).length + " / " + PACK_SIZE_M029 + " élèves à ta position"}
          </p>
          {view.phase !== "returned" && (
            <div className={styles.actions}>
              {Object.entries(moveLabels).map(([action, label]) => {
                const command = action as keyof typeof moveLabels;
                return (
                  <button key={command} type="button" data-homeworld-pack-action-m029={command}
                    disabled={paused || !!locked || !actions.includes(command)} onClick={() => onAction(command)}>
                    {label}
                  </button>
                );
              })}
              <button type="button" disabled={paused || !!locked} onClick={() => onAction("restart")}>Recommencer depuis le poste</button>
            </div>
          )}
        </>
      )}
    </section>
  );
}
