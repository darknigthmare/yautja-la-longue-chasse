"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { drawEarthReferenceV147, EARTH_REFERENCE_SOURCE_V147, validEarthLandGeoJsonV147 } from "./earthGeoReferenceV147";
import {
  earthOkavangoCanExtractV171, earthOkavangoMoveV171, earthOkavangoTraceAtV171, earthOkavangoWalkableV171,
  OKAVANGO_SECTORS_V171, OKAVANGO_TRACES_V171, OKAVANGO_ZONES_V171,
  type EarthOkavangoOrderV171, type EarthOkavangoViewV171,
} from "./systems/earthOkavangoV171";
import { homeworldHeroPlate } from "./systems/homeworldCity";
import HomeworldModularHunter from "./HomeworldModularHunter";
import type { SaveGame } from "./types";
import styles from "./EarthOkavangoV171.module.css";

const globeView = { projection: "globe", width: 320, height: 320, longitude: 22.8, latitude: -19.4 } as const;

function EarthGlobe() {
  const canvas = useRef<HTMLCanvasElement>(null);
  const [drawn, setDrawn] = useState<"loading" | "ready" | "unavailable">("loading");
  useEffect(() => {
    const ctl = new AbortController();
    void fetch(EARTH_REFERENCE_SOURCE_V147.url, { signal: ctl.signal }).then(async response => {
      if (!response.ok) throw Error("Géographie indisponible.");
      const geography: unknown = await response.json();
      if (ctl.signal.aborted || !canvas.current) return;
      if (!validEarthLandGeoJsonV147(geography)) throw Error("Géographie illisible.");
      drawEarthReferenceV147(canvas.current, geography, globeView);
      const context = canvas.current.getContext("2d");
      if (!context) throw Error("Globe indisponible.");
      context.beginPath();
      context.arc(globeView.width / 2, globeView.height / 2, 5, 0, Math.PI * 2);
      context.fillStyle = "#fbd481";
      context.strokeStyle = "#232318";
      context.lineWidth = 2;
      context.fill();
      context.stroke();
      setDrawn("ready");
    }).catch(() => { if (!ctl.signal.aborted) setDrawn("unavailable"); });
    return () => ctl.abort();
  }, []);
  return <figure className={styles.globe} data-okavango-globe={drawn}>
    <canvas ref={canvas} width={globeView.width} height={globeView.height} role="img"
      aria-label="Globe terrestre centré sur le delta de l’Okavango au Botswana" />
    <figcaption>Delta de l’Okavango · Botswana{drawn === "unavailable" ? " · globe indisponible" : ""}</figcaption>
  </figure>;
}

const moveLabels = {
  west: "Reculer vers le dépôt", east: "Longer le chenal", north: "Monter sur la piste haute", south: "Revenir sur la berge",
} as const;
const directionKeys = { ArrowLeft: "west", ArrowRight: "east", ArrowUp: "north", ArrowDown: "south" } as const;
const directionNames = Object.keys(moveLabels) as (keyof typeof moveLabels)[];
function coordinate(x: number, lane: number): CSSProperties {
  return { left: `${(x + .5) * 10}%`, top: lane === 0 ? "64%" : "81%" };
}

export default function EarthOkavangoV171({ view, appearance, loadout, blocked, notice, onOrder, onClose, onSettings }: {
  view: EarthOkavangoViewV171; appearance: SaveGame["appearance"]; loadout: SaveGame["loadout"]; blocked: boolean; notice: string;
  onOrder(order: EarthOkavangoOrderV171): boolean; onClose(): void; onSettings(): void;
}) {
  const terrain = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (view.phase === "ground" && !blocked) terrain.current?.focus({ preventScroll: true });
  }, [view.phase, blocked]);
  const plate = homeworldHeroPlate(appearance.presetId);
  const ground = view.phase === "ground";
  const returned = view.phase === "returned";
  const sector = OKAVANGO_SECTORS_V171.find(row => view.x <= row.end);
  const site = view.zone ? OKAVANGO_ZONES_V171[view.zone] : null;
  const trace = earthOkavangoTraceAtV171(view);
  const canScan = !!trace && view.visor === "analyse" && !view.traces.includes(trace.id);
  const canExtract = earthOkavangoCanExtractV171(view);

  const onTerrainKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (blocked || event.repeat || event.target !== event.currentTarget) return;
    const direction = directionKeys[event.key as keyof typeof directionKeys];
    const key = event.key.toLowerCase();
    const order: EarthOkavangoOrderV171 | null = direction ? { kind: "move", direction }
      : key === "r" ? { kind: "analyse" } : (key === "e" || key === "enter")
        ? canScan ? { kind: "scan" } : canExtract ? { kind: "extract" } : null : null;
    if (!order) return;
    event.preventDefault();
    event.stopPropagation();
    onOrder(order);
  };
  return <section className={styles.panel} aria-labelledby="earth-okavango-title"
    data-earth-okavango={view.phase} data-okavango-position={ground ? `${view.x}:${view.lane}` : undefined}
    data-okavango-traces={view.traces.length}>
    <header>
      <div><p className="eyebrow">Sol · Terre</p><h1 id="earth-okavango-title">
        {ground ? "Delta de l’Okavango" : returned ? "Relevé de l’Okavango" : "Registre terrestre"}
      </h1></div>
      <div className={styles.actions}>
        <button type="button" className="ghost-button" onClick={onSettings}>Réglages et sauvegardes</button>
        {!ground && <button type="button" className="ghost-button" disabled={blocked}
          data-okavango-return={returned ? "deck" : "map"} onClick={onClose}>{returned ? "Retrouver le pont" : "Revenir à la carte"}</button>}
      </div>
    </header>
    {!ground && !returned && <div className={styles.registry}>
      <EarthGlobe />
      <div>
        <h2>Repérage · Okavango</h2>
        <p>La réserve terrestre est ouverte. Observe les traces des chenaux avant de désigner une proie.</p>
        <p>Relève trois indices et rejoins ton dépôt pour remonter avec le relevé.</p>
        {Object.entries(OKAVANGO_ZONES_V171).map(([id, zone]) =>
          <button className="alien-button" type="button" key={id} data-okavango-zone={id}
            disabled={blocked || view.zone === id} aria-pressed={view.zone === id}
            onClick={() => onOrder({ kind: "choose-zone", zone: id as keyof typeof OKAVANGO_ZONES_V171 })}>
            {zone.name} · {zone.detail}
          </button>,
        )}
        {site && <button className="alien-button" type="button" data-okavango-insert disabled={blocked}
          onClick={() => onOrder({ kind: "insert" })}>Descendre · {site.name}</button>}
      </div>
    </div>}
    {ground && <>
      <div ref={terrain} className={styles.terrain} onKeyDown={onTerrainKey}
        tabIndex={blocked ? -1 : 0} role="group" aria-label="Terrain du delta, avancer au clavier">
        <div className={styles.sky} aria-hidden="true" />
        <div className={styles.piste} aria-hidden="true" />
        <div className={styles.berge} aria-hidden="true" />
        {OKAVANGO_TRACES_V171.map(row =>
          <span key={row.id} className={styles.marker} style={coordinate(row.x, row.lane)}
            data-read={view.traces.includes(row.id)} aria-hidden="true">{view.traces.includes(row.id) ? "✓" : "◇"}</span>,
        )}
        {site && <span className={styles.extraction} aria-hidden="true" style={coordinate(site.x, site.lane)}>⌂</span>}
        {[4, 5, 6].filter(x => !earthOkavangoWalkableV171(x, 1)).map(x =>
          <i key={x} className={styles.water} aria-hidden="true" style={coordinate(x, 1)} />,
        )}
        {plate.status === "custom-modular-body"
          ? <div className={styles.actor} style={coordinate(view.x, view.lane)}>
            <HomeworldModularHunter className={styles.actorParts} appearance={appearance} morphId={appearance.bodyMorphId}
              dreadStyleId={appearance.dreadStyleId} showArmor armorId={loadout.armorId} hasWristblades={loadout.weaponIds.includes("wristblades")} />
          </div>
          // eslint-disable-next-line @next/next/no-img-element -- Existing native game sprite projected at its ground contact.
          : <img className={styles.actor} src={plate.src} alt="" draggable={false} style={coordinate(view.x, view.lane)} />
        }
      </div>
      <div className={styles.groundInfo}>
        <p><strong>{sector?.name}</strong> · {view.lane === 0 ? "Piste haute" : "Berge basse"}</p>
        <p>Flèches pour marcher, R pour passer en Analyse, E pour examiner ou remonter.</p>
        {trace && <p>{trace.name} · {view.traces.includes(trace.id) ? "consigné" : "à analyser"}</p>}
        {view.traces.length === 3 && <p>Les traces convergent vers l’île du Baobab mort. Reviens au dépôt de {site?.name}.</p>}
      </div>
      <div className={styles.actions}>
        {directionNames.map(direction => <button className="ghost-button" type="button" key={direction}
          data-okavango-move={direction} disabled={blocked || !earthOkavangoMoveV171(view, direction)}
          onClick={() => onOrder({ kind: "move", direction })}>{moveLabels[direction]}</button>)}
        <button className="ghost-button" type="button" data-okavango-analyse aria-pressed={view.visor === "analyse"}
          disabled={blocked} onClick={() => onOrder({ kind: "analyse" })}>Biomask · Analyse</button>
        <button className="alien-button" type="button" data-okavango-scan disabled={blocked || !canScan}
          onClick={() => onOrder({ kind: "scan" })}>Lire la trace</button>
        <button className="alien-button" type="button" data-okavango-extract disabled={blocked || !canExtract}
          onClick={() => onOrder({ kind: "extract" })}>Revenir à bord depuis le dépôt</button>
      </div>
    </>}
    {(ground || returned) && <section className={styles.log} aria-label="Relevé des indices">
      <h2>Indices consignés · {view.traces.length} / 3</h2>
      <ul>{OKAVANGO_TRACES_V171.filter(row => view.traces.includes(row.id)).map(row =>
        <li key={row.id}><strong>{row.name}</strong> · {row.detail}</li>,
      )}</ul>
      {returned && <p>Retour à bord consigné. Secteur probable : île du Baobab mort.</p>}
    </section>}
    {notice && <p role="status">{notice}</p>}
  </section>;
}
