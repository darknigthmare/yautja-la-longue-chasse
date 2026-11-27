"use client";

/* eslint-disable @next/next/no-img-element -- native transparent prologue cutouts */
import { useId, useState, type KeyboardEvent } from "react";
import HunterRigPreview from "./HunterRigPreview";
import HomeworldModularHunter from "./HomeworldModularHunter";
import HomeworldNativePropV64 from "./HomeworldNativePropV64";
import { HOMEWORLD_PROP_ART_V64 } from "./systems/homeworldArtV64";
import { HUNTER_RIG_CANVAS } from "./hunterRig";
import type { SaveGame } from "./types";
import {
  LEGACY_COHORT_R2, LEGACY_WALK_LIMIT_R2, legacyCohortViewR2, legacyEpilogueChoicesR2, legacyEpilogueViewR2,
  type LegacyCommandR2, type LegacyFinaleR2, type LegacySceneR2, type LegacySiteR2,
} from "./systems/legacyFinaleR2";
import styles from "./LegacyFinaleR2.module.css";

type Identity = Pick<SaveGame, "appearance" | "loadout">;
type Props = {
  scene: LegacySceneR2;
  site: LegacySiteR2;
  siteLabel: string;
  identity: Identity;
  state: LegacyFinaleR2 | null | undefined;
  endingTitle: string;
  belongings: readonly string[];
  relations: readonly string[];
  disabled?: boolean;
  notice: string;
  onCommand: (order: LegacyCommandR2) => void;
  onClose: () => void;
};

const cohortMarks = [{ x: 2, label: "Seuil" }, { x: 11, label: "Support" }, { x: 22, label: "Registre" }];
const epilogueMarks = [
  { x: 2, label: "Seuil" }, { x: 6, label: "Objets" }, { x: 11, label: "Liens" }, { x: 16, label: "Dernier geste" },
];
const actionLabels = { depart: "Préparer le départ", welcome: "Accueillir ceux qui viennent", transmit: "Transmettre le relevé" } as const;
const clanActionLabels = { depart: "Rejoindre ton amarrage", welcome: "Saluer l’équipage consigné", transmit: "Classer le relevé du trajet" } as const;
const haltActionLabels = { depart: "Rejoindre le départ du refuge", welcome: "Saluer l’hôte", transmit: "Relire le relevé avec l’hôte" } as const;
const haltHostAppearance = { skinId: "ochre-mottle", dreadTintId: "obsidian", headStyleId: "reference" } as const;
const anchors = { depart: 2, welcome: 14, transmit: 21 } as const;
const styleAt = (at: number) => ({ left: 8 + 84 * at / LEGACY_WALK_LIMIT_R2 + "%" });
const youthSources = [
  "youngling-player-right.png", "youngling-rival-right.png", "youngling-player-left.png", "youngling-rival-left.png",
].map(name => "/game/prologue/v47/" + name);

export default function LegacyFinaleSceneR2({ scene, site, siteLabel, identity, state, endingTitle,
  belongings, relations, disabled = false, notice, onCommand, onClose }: Props) {
  const cohort = legacyCohortViewR2(state);
  const epilogue = legacyEpilogueViewR2(state, site);
  const [at, setAt] = useState(scene === "cohort" ? cohort.at : epilogue.at);
  const [facing, setFacing] = useState<-1 | 1>(1);
  const directionsId = useId();
  const isCohort = scene === "cohort";
  const clanShip = site.kind === "clan-ship";
  const halt = site.kind === "halt";
  const gestureLabels = halt ? haltActionLabels : clanShip ? clanActionLabels : actionLabels;
  const complete = isCohort ? cohort.complete : epilogue.complete;
  const near = (target: number) => Math.abs(at - target) <= 1;
  const current = LEGACY_COHORT_R2[cohort.heard.length];
  const canShowCohort = isCohort || (site.kind === "residence" && state?.cohort?.site.id === site.id &&
    cohort.complete && cohort.path === "stay");
  const marker = isCohort ? cohortMarks : epilogue.choice
    ? [{ x: anchors[epilogue.choice], label: "Dernier geste" }] : epilogueMarks;
  const cohortPosition = (x: number, index: number) => {
    if (!isCohort || cohort.arrival === "inside") return x;
    const advance = cohort.arrival === "greeted" ? Math.max(0, Math.min(at, 8) - 3) : 0;
    return index * 1.5 + advance;
  };
  const movement = (direction: number) => {
    if (disabled || complete) return;
    setFacing(direction < 0 ? -1 : 1);
    setAt(value => Math.max(0, Math.min(LEGACY_WALK_LIMIT_R2, value + direction)));
  };
  function keyboard(event: KeyboardEvent<HTMLDivElement>) {
    if (event.target !== event.currentTarget || event.altKey || event.ctrlKey || event.metaKey ||
        (event.key !== "ArrowLeft" && event.key !== "ArrowRight")) return;
    event.preventDefault();
    movement(event.key === "ArrowLeft" ? -1 : 1);
  }
  const command = (action: LegacyCommandR2["order"]["kind"]) => {
    switch (action) {
      case "greet": case "lead": case "unload": case "wall-foot": case "door-foot": case "test": case "unknown": case "close":
        onCommand({ scene: "cohort", order: { kind: action, at } });
        break;
      case "belongings": case "relations": case "act":
        onCommand({ scene: "epilogue", order: { kind: action, at } });
        break;
    }
  };
  const control = (id: Parameters<typeof command>[0], label: string, target: number) =>
    <button type="button" disabled={disabled || !near(target)} data-legacy-action={id} onClick={() => command(id)}>{label}</button>;
  const size = 71;
  const footY = HUNTER_RIG_CANVAS.groundY / HUNTER_RIG_CANVAS.width * size;

  return <section className={styles.scene} data-legacy-finale={scene} data-legacy-at={at} data-legacy-complete={complete} data-legacy-site={site.kind}
    data-legacy-cohort-arrival={isCohort ? cohort.arrival : undefined}>
    <header className={styles.header}>
      <div><p>{siteLabel}</p><h2>{isCohort ? "La nouvelle cohorte revient" : "La longue chasse demeure"}</h2></div>
      <button type="button" onClick={onClose}>Revenir au lieu</button>
    </header>
    {isCohort
      ? <p>{cohort.arrival === "waiting" ? "Quatre jeunes attendent devant le seuil." :
        cohort.arrival === "greeted" ? "Emmène la cohorte jusqu’à la place libre près du support." :
          "La cohorte a préparé son récit. Le support penche sous la pièce qu’elle a rapportée."}</p>
      : <p>Fin de voie · {endingTitle}</p>}
    {!complete && <p id={directionsId}>Avance avec les flèches sur le trajet, puis utilise les postes à portée.</p>}
    <div className={styles.room} data-site={site.kind} role="group" aria-label="Déplacement dans le lieu" aria-describedby={complete ? undefined : directionsId}
      tabIndex={complete ? -1 : 0} onKeyDown={keyboard}>
      <span className={styles.light} aria-hidden="true" />
      {marker.map(item => <span className={styles.mark} key={item.x} style={styleAt(item.x)} data-near={near(item.x)}>{item.label}</span>)}
      {halt && <>
        <span className={styles.haltTable} style={styleAt(6)} aria-hidden="true">
          <HomeworldNativePropV64 id="legacy-halt-table-r2" artId="table" art={HOMEWORLD_PROP_ART_V64.table}
            x={0} y={0} depth={1} heightWorld={47} />
        </span>
        <span className={styles.haltHost} style={styleAt(11)} aria-hidden="true">
          <HomeworldModularHunter morphId="classic" dreadStyleId="classic" appearance={haltHostAppearance}
            style={{ position: "absolute", top: "-4.47rem", left: "-1.6rem", width: "3.2rem", height: "4.8rem" }} />
        </span>
      </>}
      {isCohort && <div className={styles.support} style={styleAt(11)} aria-hidden="true" data-loaded={cohort.loaded}
        data-wall={cohort.wallFoot} data-door={cohort.doorFoot} data-steady={cohort.steady}>
        <span className={styles.load} />
        <span className={styles.board} />
        <span className={styles.feet} />
      </div>}
      {canShowCohort && LEGACY_COHORT_R2.map((p, i) => <img key={p.id} aria-hidden="true" alt="" width={57} height={72}
        className={styles.youth} data-speaker={p.id} data-heard={cohort.heard.includes(p.id)} style={styleAt(cohortPosition(p.x, i))}
        src={youthSources[i]} draggable={false} />)}
      <div className={styles.actor} aria-hidden="true" style={styleAt(at)}>
        <HunterRigPreview appearance={identity.appearance} size={size} armorId={identity.loadout.armorId}
          gearIds={identity.loadout.gearIds} weaponIds={identity.loadout.weaponIds} facing={facing}
          style={{ position: "absolute", top: -footY, left: -size / 2 }} />
      </div>
    </div>
    {!complete && <div className={styles.actions}>
      <button type="button" disabled={disabled || at === 0} data-legacy-move="left" onClick={() => movement(-1)}>Marcher à gauche</button>
      <button type="button" disabled={disabled || at === LEGACY_WALK_LIMIT_R2} data-legacy-move="right" onClick={() => movement(1)}>Marcher à droite</button>
    </div>}
    {isCohort && !complete && <div className={styles.actions}>
      {cohort.arrival === "waiting" && control("greet", "Recevoir la cohorte au seuil", 2)}
      {cohort.arrival === "greeted" && control("lead", "Montrer la place près du support", 8)}
      {cohort.arrival === "inside" && !cohort.steady && <>
        {cohort.loaded ? control("unload", "Retirer la charge", 11) : <>
          {!cohort.wallFoot && control("wall-foot", "Régler le pied du mur", 9)}
          {!cohort.doorFoot && control("door-foot", "Régler le pied de la porte", 13)}
          {cohort.failedAt !== Number(cohort.wallFoot) + Number(cohort.doorFoot) && control("test", "Essayer sous charge", 11)}
        </>}
      </>}
      {cohort.steady && !cohort.path && <>
        <button type="button" disabled={disabled || !near(15)} data-legacy-action="stay"
          onClick={() => onCommand({ scene: "cohort", order: { kind: "approach", at, choice: "stay" } })}>Accueillir le récit</button>
        <button type="button" disabled={disabled || !near(15)} data-legacy-action="help"
          onClick={() => onCommand({ scene: "cohort", order: { kind: "approach", at, choice: "help" } })}>Aider à installer puis repartir</button>
      </>}
      {cohort.path === "stay" && current && <button type="button" disabled={disabled || !near(current.x)} data-legacy-action="listen"
        onClick={() => onCommand({ scene: "cohort", order: { kind: "listen", at, speaker: current.id } })}>Écouter · {current.label}</button>}
      {cohort.path === "stay" && !current && !cohort.unknown && control("unknown", "Laisser une ligne pour les inconnues", 22)}
      {cohort.path === "stay" && cohort.unknown && control("close", "Consigner le récit de la cohorte", 22)}
      {cohort.path === "help" && control("close", "Repasse le seuil", 2)}
    </div>}
    {!isCohort && <div className={styles.actions}>
      {!epilogue.belongings && control("belongings", halt ? "Relire le carnet de terrain" : "Regarder les objets gardés", 6)}
      {epilogue.belongings && !epilogue.relations && control("relations", halt ? "Retrouver l’hôte de la halte" : "Relire les liens de la voie", 11)}
      {epilogue.relations && !epilogue.choice && legacyEpilogueChoicesR2(state, site).map(choice => <button type="button" key={choice}
        disabled={disabled || !near(16)} data-legacy-action={choice}
        onClick={() => onCommand({ scene: "epilogue", order: { kind: "choose", at, choice } })}>{gestureLabels[choice]}</button>)}
      {epilogue.choice && !complete && control("act", gestureLabels[epilogue.choice], anchors[epilogue.choice])}
    </div>}
    {!isCohort && epilogue.belongings && <p data-legacy-belongings>
      {halt ? "Carnet de terrain" : clanShip ? "Relevés de la galerie" : "Objets exposés ici"} · {belongings.length ? belongings.join(", ") : "emplacement libre"}
    </p>}
    {!isCohort && epilogue.relations && <p data-legacy-relations>
      {halt ? "Rencontre consignée" : clanShip ? "Équipage consigné" : "Liens consignés"} · {relations.length ? relations.join(", ") : "aucun au registre de ce lieu"}
    </p>}
    <p role="status" aria-live="polite" className={styles.notice}>{notice || (complete ? "Le compte rendu est enregistré." : " ")}</p>
  </section>;
}
