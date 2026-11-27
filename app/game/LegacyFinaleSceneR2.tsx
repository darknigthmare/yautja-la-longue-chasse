"use client";

/* eslint-disable @next/next/no-img-element -- native transparent prologue cutouts */
import { useId, useState, type CSSProperties, type KeyboardEvent } from "react";
import HunterRigPreview from "./HunterRigPreview";
import HomeworldModularHunter from "./HomeworldModularHunter";
import HomeworldNativePropV64 from "./HomeworldNativePropV64";
import { SHIP_LEVEL_ART } from "./shipInteriorKit";
import { SHIP_LEVEL_ART_V22 } from "./shipInteriorV22";
import { HOMEWORLD_PROP_ART_V64 } from "./systems/homeworldArtV64";
import { HUNTER_RIG_CANVAS } from "./hunterRig";
import type { SaveGame } from "./types";
import {
  LEGACY_COHORT_R2, LEGACY_EPILOGUE_POSTS_R2 as anchors, LEGACY_WALK_LIMIT_R2, legacyCohortViewR2,
  legacyEpilogueChoicesR2, legacyEpilogueViewR2, legacyTransmissionWitnessesR2,
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
const personalShipLabels = { depart: "Revenir au sas", welcome: "Accueillir", transmit: "Déposer le dossier aux archives" } as const;
const archiveArt = SHIP_LEVEL_ART_V22.archiveTerminal;
const clanActionLabels = { depart: "Rejoindre ton amarrage", welcome: "Saluer l’équipage consigné", transmit: "Classer le relevé du trajet" } as const;
const haltActionLabels = { depart: "Rejoindre le départ du refuge", welcome: "Saluer l’hôte", transmit: "Relire le relevé avec l’hôte" } as const;
const haltHostAppearance = { skinId: "ochre-mottle", dreadTintId: "obsidian", headStyleId: "reference" } as const;
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
  const ship = site.kind === "ship";
  const clanShip = site.kind === "clan-ship";
  const halt = site.kind === "halt";
  const gestureLabels = halt ? haltActionLabels : clanShip ? clanActionLabels : ship ? personalShipLabels : actionLabels;
  const complete = isCohort ? cohort.complete : epilogue.complete;
  const near = (target: number) => Math.abs(at - target) <= 1;
  const current = LEGACY_COHORT_R2[cohort.heard.length];
  const heard = LEGACY_COHORT_R2.filter(speaker => cohort.heard.includes(speaker.id));
  const availableQuestion = cohort.unknown ? undefined : heard.find(speaker =>
    !cohort.clarified.includes(speaker.id) && near(speaker.x));
  const witnesses = isCohort ? [] : legacyTransmissionWitnessesR2(state, site);
  const transmission = epilogue.choice === "transmit" && witnesses.length > 0;
  const recipient = witnesses.find(speaker => speaker.id === epilogue.offered);
  const canShowCohort = isCohort || witnesses.length > 0;
  const marker = isCohort ? cohortMarks : recipient ? [{ x: recipient.x, label: recipient.label }] :
    epilogue.choice ? [{ x: anchors[epilogue.choice], label: transmission ? "Registre" : "Dernier geste" }] : epilogueMarks;
  const sceneLight = { "--legacy-focus": `${8 + 84 * at / LEGACY_WALK_LIMIT_R2}%`,
    "--legacy-pan": `${28 + 44 * at / LEGACY_WALK_LIMIT_R2}%`,
    ...(ship ? { "--legacy-ship-wall": `url("${SHIP_LEVEL_ART.wallSanctum.src}")` } : {}),
  } as CSSProperties;
  const hostAt = epilogue.choice === "welcome" || epilogue.choice === "transmit" ? anchors[epilogue.choice] : 11;
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
    data-legacy-cohort-arrival={isCohort ? cohort.arrival : undefined}
    data-legacy-recipient={recipient?.id}>
    <header className={styles.header}>
      <div><p>{siteLabel}</p><h2>{isCohort ? "La nouvelle cohorte revient" : "La longue chasse demeure"}</h2></div>
      <button type="button" onClick={onClose}>Revenir au lieu</button>
    </header>
    {isCohort
      ? <p>{cohort.arrival === "waiting" ? "Quatre jeunes attendent devant le seuil." :
        cohort.arrival === "greeted" ? "Emmène la cohorte jusqu’à la place libre près du support." :
          cohort.steady ? "Le support tient. La cohorte peut montrer son récit." :
            "La cohorte a préparé son récit. Le support penche sous la pièce qu’elle a rapportée."}</p>
      : <p>Fin de voie · {endingTitle}</p>}
    {!complete && <p id={directionsId}>Avance avec les flèches sur le trajet, puis utilise les postes à portée.</p>}
    <div className={styles.room} data-site={site.kind} style={sceneLight} role="group" aria-label="Déplacement dans le lieu" aria-describedby={complete ? undefined : directionsId}
      tabIndex={complete ? -1 : 0} onKeyDown={keyboard}>
      <span className={styles.light} aria-hidden="true" />
      {marker.map(item => <span className={styles.mark} key={item.x} style={styleAt(item.x)} data-near={near(item.x)}>{item.label}</span>)}
      {halt && <>
        <span className={styles.roomProp} style={styleAt(6)} aria-hidden="true">
          <HomeworldNativePropV64 id="legacy-halt-table-r2" artId="table" art={HOMEWORLD_PROP_ART_V64.table}
            x={0} y={0} depth={1} heightWorld={47} />
        </span>
        <span className={styles.haltHost} style={styleAt(hostAt)} aria-hidden="true">
          <HomeworldModularHunter morphId="classic" dreadStyleId="classic" appearance={haltHostAppearance}
            style={{ position: "absolute", top: "-4.47rem", left: "-1.6rem", width: "3.2rem", height: "4.8rem" }} />
        </span>
      </>}
      {ship && <img className={styles.personalTerminal} style={styleAt(anchors.transmit)}
        src={archiveArt.src} width={archiveArt.sourceWidth} height={archiveArt.sourceHeight} alt="" aria-hidden="true"
        data-legacy-personal-archive-terminal draggable={false} />}
      {canShowCohort && <span className={styles.roomProp} style={styleAt(22)} aria-hidden="true">
        <HomeworldNativePropV64 id="legacy-cohort-registry-r2" artId="table" art={HOMEWORLD_PROP_ART_V64.table}
          x={0} y={0} depth={1} heightWorld={38} />
      </span>}
      {isCohort && <div className={styles.support} style={styleAt(11)} aria-hidden="true" data-loaded={cohort.loaded}
        data-wall={cohort.wallFoot} data-door={cohort.doorFoot} data-steady={cohort.steady}>
        <span className={styles.load} />
        <span className={styles.board} />
        <span className={styles.feet} />
      </div>}
      {canShowCohort && LEGACY_COHORT_R2.map((p, i) => <img key={p.id} aria-hidden="true" alt="" width={57} height={72}
        className={styles.youth} data-speaker={p.id} data-heard={cohort.heard.includes(p.id)}
        data-speaking={recipient?.id === p.id} style={styleAt(cohortPosition(p.x, i))}
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
      {cohort.path === "stay" && availableQuestion && <button type="button" disabled={disabled}
        data-legacy-action="ask" data-legacy-speaker={availableQuestion.id}
        onClick={() => onCommand({ scene: "cohort", order: { kind: "ask", at, speaker: availableQuestion.id } })}>
        {availableQuestion.label} · {availableQuestion.question}
      </button>}
      {cohort.path === "stay" && !current && !cohort.unknown && control("unknown", "Laisser une ligne pour les inconnues", 22)}
      {cohort.path === "stay" && cohort.unknown && control("close", "Consigner le récit de la cohorte", 22)}
      {cohort.path === "help" && control("close", "Repasse le seuil", 2)}
    </div>}
    {!isCohort && <div className={styles.actions}>
      {!epilogue.belongings && control("belongings", halt ? "Relire le carnet de terrain" : ship ? "Regarder la coque et ses objets" : "Regarder les objets gardés", 6)}
      {epilogue.belongings && !epilogue.relations && control("relations", halt ? "Retrouver l’hôte de la halte" : ship ? "Examiner l’accord du chantier" : "Relire les liens de la voie", 11)}
      {epilogue.relations && !epilogue.choice && legacyEpilogueChoicesR2(state, site).map(choice => <button type="button" key={choice}
        disabled={disabled || !near(16)} data-legacy-action={choice}
        onClick={() => onCommand({ scene: "epilogue", order: { kind: "choose", at, choice } })}>{gestureLabels[choice]}</button>)}
      {transmission && !recipient && !complete && witnesses.map(speaker => <button type="button" key={speaker.id}
        disabled={disabled || !near(anchors.transmit)} data-legacy-action="offer" data-legacy-speaker={speaker.id}
        onClick={() => onCommand({ scene: "epilogue", order: { kind: "offer", at, speaker: speaker.id } })}>
        Reprendre · {speaker.label}
      </button>)}
      {recipient && !complete && <button type="button" disabled={disabled || !near(recipient.x)} data-legacy-action="answer"
        onClick={() => onCommand({ scene: "epilogue", order: { kind: "answer", at, speaker: recipient.id } })}>
        Écouter la réponse · {recipient.label}
      </button>}
      {epilogue.choice && !transmission && !complete && control("act", gestureLabels[epilogue.choice], anchors[epilogue.choice])}
    </div>}
    {!isCohort && epilogue.belongings && <p data-legacy-belongings>
      {halt ? "Carnet de terrain" : clanShip ? "Relevés de la galerie" : ship ? "Objets visibles à bord" : "Objets exposés ici"} · {belongings.length ? belongings.join(", ") : "emplacement libre"}
    </p>}
    {!isCohort && epilogue.relations && <p data-legacy-relations>
      {halt ? "Rencontre consignée" : clanShip ? "Équipage consigné" : ship ? "Accord consigné" :
        witnesses.length ? "Cohorte entendue ici" : "Liens de la voie"} · {
        witnesses.length ? witnesses.map(speaker => speaker.label).join(", ") :
          relations.length ? relations.join(", ") : "aucun lien consigné"}
    </p>}
    {isCohort && heard.length > 0 && <details className={styles.record} data-legacy-cohort-record>
      <summary>Témoignages entendus</summary>
      <ul>{heard.map(speaker => <li key={speaker.id} data-legacy-witness={speaker.id}>
        <strong>{speaker.label}</strong>
        <p>{speaker.line}</p>
        {cohort.clarified.includes(speaker.id) && <p data-legacy-clarification>{speaker.clarification}</p>}
      </li>)}</ul>
      {cohort.unknown && <p data-legacy-unknown>Une ligne est laissée libre pour ce que la cohorte a ignoré.</p>}
    </details>}
    {recipient && <article className={styles.record} data-legacy-transmission aria-label="Témoignage transmis">
      <strong>{recipient.label}</strong>
      <p>{recipient.line}</p>
      {cohort.clarified.includes(recipient.id) && <p>{recipient.clarification}</p>}
      {epilogue.answered && <p data-legacy-answer>{recipient.response}</p>}
    </article>}
    {ship && complete && epilogue.choice === "transmit" && <p data-legacy-personal-archive>
      Le dossier de la remise de la coque est versé aux archives du bord.
    </p>}
    <p role="status" aria-live="polite" className={styles.notice}>{notice || (complete ? "Le compte rendu est enregistré." : " ")}</p>
  </section>;
}
