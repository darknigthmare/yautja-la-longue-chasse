"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent } from "react";
import { drawEarthReferenceV147, EARTH_REFERENCE_SOURCE_V147, validEarthLandGeoJsonV147 } from "./earthGeoReferenceV147";
import {
  earthOkavangoCanExtractV171, earthOkavangoMoveV171, earthOkavangoTraceAtV171, earthOkavangoTraceLocationsV171,
  earthOkavangoWalkableV171, earthOkavangoWaterV171, OKAVANGO_ORBIT_SITES_V171, OKAVANGO_SECTORS_V171, OKAVANGO_ZONES_V171,
  type EarthOkavangoOrderV171, type EarthOkavangoViewV171, type EarthOrbitManeuverV171, type EarthOrbitViewV171,
} from "./systems/earthOkavangoV171";
import {
  LION_SURVEY_DEPOSIT_V174, LION_SURVEY_MARKERS_V174, LION_SURVEY_WIDTH_V174, LION_SURVEY_WINDOWS_V174,
  lionSurveyCanExtractV174, lionSurveyCanObserveV174, lionSurveyFloodedV174, lionSurveyMarkerV174,
  lionSurveyMoveV174, type LionSurveyOrderV174, type LionSurveyViewV174,
} from "./systems/earthLionSurveyV174";
import { homeworldHeroPlate } from "./systems/homeworldCity";
import HomeworldModularHunter from "./HomeworldModularHunter";
import { shipTopAssetPath } from "./shipCatalogue";
import { SHIP_ACQUISITION_BINDING_V89 } from "./systems/shipAcquisitionV89";
import { resolveShipFlightKeyboardV87 } from "./systems/shipFlightV87";
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
const waterNotices = {
  low: "Eau basse · le gué est ouvert.",
  rising: "L’eau monte · termine la traversée ou monte sur la levée.",
  high: "Gué submergé · la levée reste praticable entre les deux rives.",
} as const;
function coordinate(x: number, lane: number, width = 10): CSSProperties {
  return { left: `${(x + .5) * 100 / width}%`, top: lane === 0 ? "64%" : "81%" };
}

function EarthHunter({ point, appearance, loadout }: {
  point: CSSProperties; appearance: SaveGame["appearance"]; loadout: SaveGame["loadout"];
}) {
  const plate = homeworldHeroPlate(appearance.presetId);
  if (plate.status === "custom-modular-body") return <div className={styles.actor} style={point}>
    <HomeworldModularHunter className={styles.actorParts} appearance={appearance} morphId={appearance.bodyMorphId}
      dreadStyleId={appearance.dreadStyleId} showArmor armorId={loadout.armorId} hasWristblades={loadout.weaponIds.includes("wristblades")} />
  </div>;
  // eslint-disable-next-line @next/next/no-img-element -- Existing native game sprite projected at its ground contact.
  return <img className={styles.actor} src={plate.src} alt="" draggable={false} style={point} />;
}

function EarthOrbitPanel({ orbit, blocked, onOrder }: {
  orbit: EarthOrbitViewV171; blocked: boolean; onOrder(order: EarthOkavangoOrderV171): boolean;
}) {
  const consoleRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!blocked) consoleRef.current?.focus({ preventScroll: true });
  }, [blocked, orbit.stage]);
  const { flight, stage, scannedZone } = orbit;
  const pilot = (action: EarthOrbitManeuverV171) => onOrder({ kind: "pilot-orbit", action });
  const onPilotKey = (event: KeyboardEvent<HTMLDivElement>) => {
    const action = resolveShipFlightKeyboardV87(flight.phase, {
      key: event.key, open: true, paused: blocked, checkpointValid: true,
      documentFocused: document.hasFocus(), documentVisible: !document.hidden,
      consoleFocused: document.activeElement === event.currentTarget, targetIsConsole: event.target === event.currentTarget,
      repeat: event.repeat, modified: event.altKey || event.ctrlKey || event.metaKey || event.shiftKey,
      defaultPrevented: event.defaultPrevented,
    });
    if (!action || (action.type !== "lateral" && action.type !== "align" && action.type !== "speed" &&
        action.type !== "advance" && action.type !== "retreat")) return;
    event.preventDefault();
    event.stopPropagation();
    pilot(action);
  };
  const windowReached = flight.phase === "locks";
  return <section className={styles.orbit} data-okavango-orbit={stage} data-okavango-flight={flight.phase}
    data-okavango-orbit-distance={flight.distance} data-okavango-orbit-lateral={flight.lateral}
    data-okavango-orbit-speed={flight.speed} data-okavango-orbit-setbacks={flight.setbacks} aria-label="Survol de Sol">
    <EarthGlobe />
    <div>
      <h2>{stage === "return" ? "Approche de la balise de retour" : "Fenêtre d’observation de l’Okavango"}</h2>
      <div ref={consoleRef} className={styles.orbitConsole} tabIndex={blocked ? -1 : 0} onKeyDown={onPilotKey}
        role="group" aria-label="Poste de pilotage du survol">
        <div className={styles.orbitBeacon} aria-hidden="true" />
        {/* eslint-disable-next-line @next/next/no-img-element -- Original overhead ship asset, as used in the stellar map. */}
        <img className={styles.orbitShip} src={shipTopAssetPath(SHIP_ACQUISITION_BINDING_V89.shipId)}
          alt="" draggable={false} style={{ left: `${50 + flight.lateral * 6}%`, top: `${41 + flight.distance * .38}%` }} />
        <p className={styles.orbitMeters}>Écart <strong>{flight.lateral}</strong> · Distance <strong>{flight.distance}</strong> · Vitesse <strong>{flight.speed}</strong></p>
      </div>
      {flight.phase === "alignment" && <p>Flèches gauche et droite pour superposer les balises, Entrée pour maintenir l’alignement.</p>}
      {flight.phase === "approach" && <p>Flèches haut et bas pour ajuster la vitesse, Entrée pour avancer et R pour reprendre au point sûr. Termine au cran 1.</p>}
      {!!flight.setbacks && <p data-okavango-orbit-recovery role="status">Fermeture trop rapide. Reculs au point sûr consignés · {flight.setbacks}.</p>}
      <div className={styles.actions}>
        {flight.phase === "alignment" && <>
          <button type="button" className="ghost-button" disabled={blocked || flight.lateral <= -6}
            onClick={() => pilot({ type: "lateral", direction: -1 })}>Balise à gauche</button>
          <button type="button" className="ghost-button" disabled={blocked || flight.lateral >= 6}
            onClick={() => pilot({ type: "lateral", direction: 1 })}>Balise à droite</button>
          <button type="button" className="alien-button" disabled={blocked || flight.lateral !== 0}
            onClick={() => pilot({ type: "align" })}>Maintenir l’alignement</button>
        </>}
        {flight.phase === "approach" && <>
          <button type="button" className="ghost-button" disabled={blocked || flight.speed === 0}
            onClick={() => pilot({ type: "speed", direction: -1 })}>Freiner</button>
          <button type="button" className="ghost-button" disabled={blocked || flight.speed === 3}
            onClick={() => pilot({ type: "speed", direction: 1 })}>Accélérer</button>
          <button type="button" className="ghost-button" disabled={blocked || flight.speed === 0}
            onClick={() => pilot({ type: "advance" })}>Avancer vers la balise</button>
          <button type="button" className="ghost-button" disabled={blocked}
            onClick={() => pilot({ type: "retreat" })}>Reprendre au point sûr</button>
        </>}
        {stage === "outbound" && windowReached && Object.entries(OKAVANGO_ZONES_V171).map(([id, zone]) =>
          <button type="button" key={id} className="alien-button" disabled={blocked} data-okavango-orbit-scan={id}
            onClick={() => onOrder({ kind: "scan-orbit", zone: id as keyof typeof OKAVANGO_ZONES_V171 })}>
            Observer · {zone.name}
          </button>,
        )}
        {stage === "observed" && <button type="button" className="alien-button" data-okavango-orbit-return disabled={blocked}
          onClick={() => onOrder({ kind: "return-orbit" })}>Engager la manœuvre de retour</button>}
        {stage === "return" && windowReached && <button type="button" className="alien-button" data-okavango-orbit-finish
          disabled={blocked} onClick={() => onOrder({ kind: "finish-orbit" })}>Clore le survol au point de retour</button>}
      </div>
      {scannedZone && <p data-okavango-orbit-observed={scannedZone}>{OKAVANGO_ORBIT_SITES_V171[scannedZone]}</p>}
    </div>
  </section>;
}

function LionSurveyPanel({ survey, appearance, loadout, blocked, onOrder }: {
  survey: LionSurveyViewV174; appearance: SaveGame["appearance"]; loadout: SaveGame["loadout"]; blocked: boolean;
  onOrder(order: LionSurveyOrderV174): boolean;
}) {
  const terrain = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (survey.stage === "survey" && !blocked) terrain.current?.focus({ preventScroll: true });
  }, [survey.stage, blocked]);

  const flooded = lionSurveyFloodedV174(survey);
  const surveyPoint = (x: number, lane: number) => coordinate(x, lane, LION_SURVEY_WIDTH_V174);
  const marker = lionSurveyMarkerV174(survey);
  const canScan = lionSurveyCanObserveV174(survey);
  const canExtract = lionSurveyCanExtractV174(survey);
  const onTerrainKey = (event: KeyboardEvent<HTMLDivElement>) => {
    if (blocked || event.repeat || event.target !== event.currentTarget) return;
    const direction = directionKeys[event.key as keyof typeof directionKeys];
    const key = event.key.toLowerCase();
    const order: LionSurveyOrderV174 | null = direction ? { kind: "lion-move", direction }
      : key === "r" ? { kind: "lion-analyse" } : (key === "e" || key === "enter")
        ? canScan ? { kind: "lion-observe" } : canExtract ? { kind: "lion-extract" } : null : null;
    if (!order) return;
    event.preventDefault();
    event.stopPropagation();
    onOrder(order);
  };

  return <section className={styles.lionSurvey} data-lion-survey={survey.stage} data-lion-window={survey.window ?? undefined}
    data-lion-position={survey.stage === "survey" ? `${survey.x}:${survey.lane}` : undefined}
    data-lion-readings={survey.readings.length}>
    {survey.stage === "planning" && <section className={styles.registry} aria-label="Fenêtre de reconnaissance">
      <EarthGlobe />
      <div>
        <h2>Choisir la fenêtre de descente</h2>
        <p>Repère les empreintes et la troupe depuis le couvert de la plaine, puis reviens au dépôt.</p>
        {(Object.keys(LION_SURVEY_WINDOWS_V174) as (keyof typeof LION_SURVEY_WINDOWS_V174)[]).map(window => {
          const timing = LION_SURVEY_WINDOWS_V174[window];
          return <button className="ghost-button" type="button" key={window} data-lion-choose={window}
            disabled={blocked} aria-pressed={survey.window === window}
            onClick={() => onOrder({ kind: "lion-window", window })}>{timing.label} · {timing.detail}</button>;
        })}
        <button className="alien-button" type="button" data-lion-land disabled={blocked || !survey.window}
          onClick={() => onOrder({ kind: "lion-land" })}>Descendre au dépôt de la plaine</button>
      </div>
    </section>}
    {survey.stage === "survey" && <>
      <div ref={terrain} className={styles.terrain} onKeyDown={onTerrainKey} data-lion-terrain
        data-lion-flooded={flooded} data-lion-night={survey.window === "night"}
        tabIndex={blocked ? -1 : 0} role="group" aria-label="Plaine des lions, avancer au clavier">
        <div className={styles.sky} aria-hidden="true" />
        <div className={styles.piste} aria-hidden="true" />
        <div className={styles.berge} aria-hidden="true" />
        {[2, 3, 4].map(x => <i key={x} className={styles.water} style={surveyPoint(x, 1)}
          data-passable={!flooded} aria-hidden="true" />)}
        <span className={styles.extraction} aria-hidden="true" style={surveyPoint(LION_SURVEY_DEPOSIT_V174.x, LION_SURVEY_DEPOSIT_V174.lane)}>⌂</span>
        {LION_SURVEY_MARKERS_V174.map(reading => <span key={reading.id} className={styles.marker}
          style={surveyPoint(reading.x, reading.lane)} data-read={survey.readings.includes(reading.id)} aria-hidden="true">
          {survey.readings.includes(reading.id) ? "✓" : "◇"}
        </span>)}
        <EarthHunter point={surveyPoint(survey.x, survey.lane)} appearance={appearance} loadout={loadout} />
      </div>
      <div className={styles.groundInfo}>
        <p><strong>{survey.x >= 5 ? "Lisière de la troupe" : "Talus de la plaine"}</strong> · {survey.lane === 0 ? "Levée" : "Contrebas"}</p>
        <p className={styles.waterNotice} role="status">
          {flooded ? "Bras d’eau submergé · contourne-le par la levée." : "Bras d’eau praticable · la crue gagne le contrebas."}
        </p>
        <p>Flèches pour marcher, R pour passer en Analyse, E pour observer ou remonter.</p>
        {marker && <p>{marker.name} · {survey.readings.includes(marker.id) ? "consigné" : "à observer"}</p>}
        {survey.readings.length === LION_SURVEY_MARKERS_V174.length && <p>Reviens à la balise du dépôt pour transmettre le relevé.</p>}
      </div>
      <div className={styles.actions}>
        {directionNames.map(direction => <button className="ghost-button" type="button" key={direction}
          data-lion-move={direction} disabled={blocked || !lionSurveyMoveV174(survey, direction)}
          onClick={() => onOrder({ kind: "lion-move", direction })}>
          {direction === "east" ? "Longer la lisière" : direction === "south" ? "Rejoindre le contrebas"
            : direction === "north" ? "Monter sur la levée" : moveLabels.west}
        </button>)}
        <button className="ghost-button" type="button" data-lion-analyse aria-pressed={survey.visor === "analyse"}
          disabled={blocked} onClick={() => onOrder({ kind: "lion-analyse" })}>Biomask · Analyse</button>
        <button className="alien-button" type="button" data-lion-observe disabled={blocked || !canScan}
          onClick={() => onOrder({ kind: "lion-observe" })}>Consigner l’observation</button>
        <button className="alien-button" type="button" data-lion-extract disabled={blocked || !canExtract}
          onClick={() => onOrder({ kind: "lion-extract" })}>Revenir à bord depuis le dépôt</button>
      </div>
    </>}
    {survey.stage !== "planning" && <section className={styles.log} aria-label="Relevé de la plaine">
      <h2>Observations de la plaine · {survey.readings.length} / {LION_SURVEY_MARKERS_V174.length}</h2>
      <ul>{LION_SURVEY_MARKERS_V174.filter(reading => survey.readings.includes(reading.id)).map(reading =>
        <li key={reading.id} data-lion-reading={reading.id}><strong>{reading.name}</strong> · {reading.detail}</li>,
      )}</ul>
      {survey.stage === "complete" && <p data-lion-receipt>Reconnaissance de la Plaine des lions consignée. La coque est revenue au pont.</p>}
    </section>}
  </section>;
}

export default function EarthOkavangoV171({ view, appearance, loadout, blocked, notice, onOrder, onClose, onSettings }: {
  view: EarthOkavangoViewV171; appearance: SaveGame["appearance"]; loadout: SaveGame["loadout"]; blocked: boolean; notice: string;
  onOrder(order: EarthOkavangoOrderV171): boolean; onClose(): void; onSettings(): void;
}) {
  const terrain = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (view.phase === "ground" && !view.lionSurvey && !blocked) terrain.current?.focus({ preventScroll: true });
  }, [view.phase, view.lionSurvey, blocked]);
  const ground = view.phase === "ground" && !view.lionSurvey;
  const walking = view.phase === "ground";
  const returned = view.phase === "returned";
  const sector = OKAVANGO_SECTORS_V171.find(row => view.x <= row.end);
  const site = view.zone ? OKAVANGO_ZONES_V171[view.zone] : null;
  const water = earthOkavangoWaterV171(view);
  const flooded = !earthOkavangoWalkableV171(view.x, view.lane, water);
  const traceLocations = earthOkavangoTraceLocationsV171(view);
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
    data-okavango-traces={view.traces.length} data-okavango-water={ground ? water : undefined}>
    <header>
      <div><p className="eyebrow">Sol · Terre</p><h1 id="earth-okavango-title">
        {view.lionSurvey ? "Plaine des lions" : ground ? "Delta de l’Okavango" : returned ? "Relevé de l’Okavango" : view.orbit ? "Survol de Sol" : "Registre terrestre"}
      </h1></div>
      <div className={styles.actions}>
        <button type="button" className="ghost-button" onClick={onSettings}>Réglages et sauvegardes</button>
        {!walking && <button type="button" className="ghost-button" disabled={blocked}
          data-okavango-return={returned ? "deck" : "map"} onClick={onClose}>
          {returned ? "Retrouver le pont" : view.lionSurvey ? "Suspendre la reconnaissance" : view.orbit ? "Suspendre le survol" : "Revenir à la carte"}
        </button>}
      </div>
    </header>
    {view.lionSurvey && <LionSurveyPanel survey={view.lionSurvey} appearance={appearance} loadout={loadout}
      blocked={blocked} onOrder={onOrder} />}
    {view.orbit && !returned && !view.lionSurvey && <EarthOrbitPanel orbit={view.orbit} blocked={blocked} onOrder={onOrder} />}
    {!ground && !returned && !view.orbit && <div className={styles.registry}>
      <EarthGlobe />
      <div>
        <h2>Repérage · Okavango</h2>
        <p>La réserve terrestre est ouverte. Observe les traces des chenaux avant de désigner une proie.</p>
        <p>Relève trois indices et rejoins ton dépôt pour remonter avec le relevé.</p>
        {water !== "historical" && <p>La montée des eaux modifie le gué pendant la marche. Repère la levée pour garder un retour.</p>}
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
      <div ref={terrain} className={styles.terrain} onKeyDown={onTerrainKey} data-water={water}
        tabIndex={blocked ? -1 : 0} role="group" aria-label="Terrain du delta, avancer au clavier">
        <div className={styles.sky} aria-hidden="true" />
        <div className={styles.piste} aria-hidden="true" />
        <div className={styles.berge} aria-hidden="true" />
        {traceLocations.filter(row => earthOkavangoWalkableV171(row.x, row.lane, water)).map(row =>
          <span key={row.id} className={styles.marker} style={coordinate(row.x, row.lane)} data-okavango-marker={row.name}
            data-read={view.traces.includes(row.id)} aria-hidden="true">{view.traces.includes(row.id) ? "✓" : "◇"}</span>,
        )}
        {site && <span className={styles.extraction} aria-hidden="true" style={coordinate(site.x, site.lane)}>⌂</span>}
        {[4, 5, 6].map(x =>
          <i key={x} className={styles.water} aria-hidden="true" style={coordinate(x, 1)}
            data-okavango-channel={x} data-passable={earthOkavangoWalkableV171(x, 1, water)} />,
        )}
        <EarthHunter point={coordinate(view.x, view.lane)} appearance={appearance} loadout={loadout} />
      </div>
      <div className={styles.groundInfo}>
        <p><strong>{sector?.name}</strong> · {view.lane === 0 ? water === "historical" ? "Piste haute" : "Levée" : "Berge basse"}</p>
        {water !== "historical" && <p className={styles.waterNotice} data-okavango-water-notice role="status">
          {flooded ? "L’eau a atteint cette berge. Monte sur la levée à ta hauteur." : waterNotices[water]}
        </p>}
        {water === "high" && !view.traces.includes("tyres") && <p>La trace basse est recouverte. Cherche les ornières sur la levée.</p>}
        <p>Flèches pour marcher, R pour passer en Analyse, E pour examiner ou remonter.</p>
        {trace && <p>{trace.name} · {view.traces.includes(trace.id) ? "consigné" : "à analyser"}</p>}
        {view.traces.length === 3 && <p>Les traces convergent vers l’île du Baobab mort. Reviens au dépôt de {site?.name}.</p>}
      </div>
      <div className={styles.actions}>
        {directionNames.map(direction => <button className="ghost-button" type="button" key={direction}
          data-okavango-move={direction} disabled={blocked || !earthOkavangoMoveV171(view, direction)}
          onClick={() => onOrder({ kind: "move", direction })}>{direction === "north" && water !== "historical" ? "Monter sur la levée" : moveLabels[direction]}</button>)}
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
      <ul>{traceLocations.filter(row => view.traces.includes(row.id)).map(row =>
        <li key={row.id} data-okavango-read={row.id}><strong>{row.name}</strong> · {row.detail}</li>,
      )}</ul>
      {returned && <p>Retour à bord consigné. Secteur probable : île du Baobab mort.</p>}
      {returned && !view.orbit && <button type="button" className="alien-button" data-okavango-orbit-start
        disabled={blocked} onClick={() => onOrder({ kind: "begin-orbit" })}>Préparer un survol orbital</button>}
      {returned && view.orbit?.stage === "complete" && !view.lionSurvey &&
        <button type="button" className="alien-button" data-lion-prepare disabled={blocked}
          onClick={() => onOrder({ kind: "lion-prepare" })}>Préparer la reconnaissance · Plaine des lions</button>}
      {returned && view.orbit?.scannedZone && <p data-okavango-orbit-complete={view.orbit.scannedZone}>
        Survol consigné · {OKAVANGO_ZONES_V171[view.orbit.scannedZone].name}. {OKAVANGO_ORBIT_SITES_V171[view.orbit.scannedZone]}
      </p>}
    </section>}
    {notice && <p role="status">{notice}</p>}
  </section>;
}
