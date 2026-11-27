"use client";

import { useId, useState, type KeyboardEvent } from "react";
import {
  WARP_COMMON_LIMIT_R2, WARP_COMMON_PARTS_R2, WARP_OBSERVATORY_R2, warpReturnDialR2, warpTestDialR2,
  type WarpBenchChoiceR2, type WarpCommonChoiceR2, type WarpCommonCommandR2, type WarpCommonViewR2,
  type WarpInstallChoiceR2,
} from "./systems/warpCommonRouteR2";
import styles from "./WarpCommonSceneR2.module.css";

const rooms = {
  observatory: { title: "M030 · Observatoire des Seuils", image: "/game/warp-universe/20261109/200_module_salle_avatar_fond.png" },
  workshops: { title: "M031 · Chantiers du retour", image: "/game/warp-universe/20261109/199_module_baie_warp_fond.png" },
  bay: { title: "M032 · Baie de montage", image: "/game/p0-sprites-20261113/warp/warp-199-empty-bay.png" },
} as const;
const bayPosts = [
  { title: "Supports", position: 3 },
  { title: "Commandes", position: 8 },
  { title: "Test du retour", position: 13 },
] as const;
const withinReach = (x: number, target: number) => Math.abs(x - target) <= 1;
const styleAt = (position: number) => ({ left: 6 + 88 * position / WARP_COMMON_LIMIT_R2 + "%" });

function TuningControls({ label, dialReference, disabled, onCheck }: {
  label: string;
  dialReference: number;
  disabled: boolean;
  onCheck: (dial: number) => void;
}) {
  const [dial, setDial] = useState(0);
  return <div className={styles.tuning}>
    <p>Repère indiqué par l’instrument <strong>{dialReference}</strong></p>
    <label>Réglage <select value={dial} disabled={disabled} data-warp-common-dial
      onChange={event => setDial(Number(event.currentTarget.value))}>
      {[0, 1, 2, 3, 4].map(value => <option key={value} value={value}>{value}</option>)}
    </select></label>
    <button type="button" disabled={disabled} onClick={() => onCheck(dial)} data-warp-common-check>{label}</button>
  </div>;
}

function WorkshopPanel({ at, disabled, view, onCommand }: {
  at: number;
  disabled: boolean;
  view: WarpCommonViewR2;
  onCommand: (command: WarpCommonCommandR2) => void;
}) {
  const [method, setMethod] = useState<WarpBenchChoiceR2>("reparer");
  const nearby = WARP_COMMON_PARTS_R2.find(part => withinReach(at, part.position));
  const part = nearby ? view.parts[nearby.id] : undefined;
  return <>
    <ul className={styles.checklist}>{WARP_COMMON_PARTS_R2.map(item => <li key={item.id}>
      {item.title} · {view.parts[item.id]?.method ? "testée" : view.parts[item.id] ? "examinée" : "à examiner"}
    </li>)}</ul>
    {nearby && !part && <button type="button" disabled={disabled} data-warp-common-action="inspect"
      onClick={() => onCommand({ kind: "inspect", part: nearby.id, at })}>Examiner · {nearby.title}</button>}
    {nearby && part && !part.method && <div className={styles.actions}>
      <label>Pièce <select value={method} disabled={disabled} onChange={event => setMethod(event.currentTarget.value as WarpBenchChoiceR2)}
        data-warp-common-method>
        <option value="reparer">Réparer l’original</option>
        <option value="variante">Tester une variante</option>
      </select></label>
      <TuningControls key={nearby.id + ":" + method} label="Tester à l’établi" disabled={disabled}
        dialReference={warpTestDialR2(nearby.id, method, view.survey!)}
        onCheck={dial => onCommand({ kind: "bench", part: nearby.id, choice: method, dial, at })} />
    </div>}
    {withinReach(at, 16) && <button type="button" disabled={disabled || !WARP_COMMON_PARTS_R2.every(item => view.parts[item.id]?.method)}
      data-warp-common-action="haul" onClick={() => onCommand({ kind: "haul", at })}>Pousser le chariot jusqu’à la baie</button>}
  </>;
}

function InstallationPanel({ at, disabled, view, onCommand }: {
  at: number;
  disabled: boolean;
  view: WarpCommonViewR2;
  onCommand: (command: WarpCommonCommandR2) => void;
}) {
  const [method, setMethod] = useState<WarpInstallChoiceR2>("marge");
  return <>
    <ul className={styles.checklist}>
      <li>Supports · {view.aligned ? "alignés" : "à aligner"}</li>
      <li>Commandes · {view.connected ? "reliées" : "à relier"}</li>
    </ul>
    {withinReach(at, 3) && !view.aligned && <button type="button" disabled={disabled}
      data-warp-common-action="align" onClick={() => onCommand({ kind: "align", at })}>Aligner les supports</button>}
    {withinReach(at, 8) && view.aligned && !view.connected && <button type="button" disabled={disabled}
      data-warp-common-action="connect" onClick={() => onCommand({ kind: "connect", at })}>Relier les commandes</button>}
    {withinReach(at, 13) && view.connected && <div className={styles.actions}>
      <label>Fenêtre du test <select value={method} disabled={disabled}
        onChange={event => setMethod(event.currentTarget.value as WarpInstallChoiceR2)} data-warp-common-profile>
        <option value="marge">Marge de stabilité</option>
        <option value="fenetre-courte">Fenêtre courte</option>
      </select></label>
      <TuningControls key={method} label="Lancer le retour à vide" disabled={disabled}
        dialReference={warpReturnDialR2(method, view.survey!)}
        onCheck={dial => onCommand({ kind: "dry-return", at, choice: method, dial })} />
    </div>}
  </>;
}

export default function WarpCommonSceneR2({ view, disabled, onCommand }: {
  view: WarpCommonViewR2;
  disabled: boolean;
  onCommand: (command: WarpCommonCommandR2) => void;
}) {
  const description = useId();
  const [at, setAt] = useState(view.x);
  if (view.section === "ready") return <p className={styles.clear} data-warp-common-ready>Retour à vide confirmé. Le module est installé.</p>;
  const room = rooms[view.section];
  const marker = WARP_OBSERVATORY_R2[view.read];
  const posts = view.section === "observatory" ? WARP_OBSERVATORY_R2 : view.section === "workshops"
    ? [...WARP_COMMON_PARTS_R2, { title: "Chariot", position: 16 }] : bayPosts;
  const move = (distance: number) => {
    if (!disabled) setAt(position => Math.max(0, Math.min(WARP_COMMON_LIMIT_R2, position + distance)));
  };
  function onWalkKey(event: KeyboardEvent<HTMLElement>) {
    if (event.target !== event.currentTarget || disabled || event.altKey || event.ctrlKey || event.metaKey) return;
    if (event.key !== "ArrowLeft" && event.key !== "ArrowRight") return;
    event.preventDefault();
    move(event.key === "ArrowLeft" ? -1 : 1);
  }
  const surveyChoices: ReadonlyArray<[WarpCommonChoiceR2, string]> = [
    ["stabilite", "Stabilité d’abord"], ["energie", "Énergie d’abord"],
  ];
  return <section className={styles.scene} data-warp-common-scene={view.section} data-warp-common-position={at}>
    <h4>{room.title}</h4>
    <p id={description}>Marche devant les postes pour les utiliser. Flèches gauche et droite sur la passerelle.</p>
    <div className={styles.walkway} style={{ backgroundImage: "url(" + room.image + ")" }} tabIndex={0}
      role="group" aria-label="Passerelle du Warp" aria-describedby={description} onKeyDown={onWalkKey}>
      {posts.map(post => <span key={post.title} className={styles.post} style={styleAt(post.position)}
        data-near={withinReach(at, post.position)}>{post.title}</span>)}
      <span className={styles.actor} aria-hidden="true" style={styleAt(at)} />
    </div>
    <div className={styles.actions}>
      <button type="button" disabled={disabled || at === 0} data-warp-common-walk="left" onClick={() => move(-1)}>Marcher à gauche</button>
      <button type="button" disabled={disabled || at === WARP_COMMON_LIMIT_R2} data-warp-common-walk="right" onClick={() => move(1)}>Marcher à droite</button>
    </div>
    {view.section === "observatory" && <>
      {marker
        ? <button type="button" disabled={disabled || !withinReach(at, marker.position)} data-warp-common-action="read"
          onClick={() => onCommand({ kind: "read", at })}>Relever · {marker.title}</button>
        : <div className={styles.actions}>{surveyChoices.map(([choice, label]) => <button type="button" key={choice}
          disabled={disabled || !withinReach(at, 13)} data-warp-common-action={choice}
          onClick={() => onCommand({ kind: "survey", at, choice })}>{label}</button>)}</div>}
      <ol className={styles.checklist}>{WARP_OBSERVATORY_R2.slice(0, view.read).map(observation =>
        <li key={observation.id}>{observation.reading}</li>)}</ol>
    </>}
    {view.section === "workshops" && <WorkshopPanel at={at} view={view} disabled={disabled} onCommand={onCommand} />}
    {view.section === "bay" && <InstallationPanel at={at} view={view} disabled={disabled} onCommand={onCommand} />}
  </section>;
}
