"use client";

import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { warSuppliedV85, type WarOrderKindV85, type WarSimulationV85 } from "./systems/clanWarV85";
import { WAR_FACTIONS_V85, WAR_TERRITORIES_V85, warTerritoryV85, type WarFactionIdV85 } from "./systems/clanWarV85Data";
import {
  WAR_ATLAS_FACTIONS_V95, WAR_ATLAS_REGIONS_V95, WAR_ATLAS_TERRITORIES_V95,
  projectWarAtlasGlobeV95, projectWarAtlasMapV95, warAtlasFactionMetricsV95,
  warAtlasGlobePathV95, warAtlasIntelV95, warAtlasMapPathV95, warAtlasRegionMetricsV95,
  type WarAtlasPointV95,
} from "./systems/clanWarAtlasV95";
import styles from "./ClanWarAtlasV95.module.css";

interface ClanWarAtlasV95Props {
  simulation: WarSimulationV85;
  selectedTerritoryId: string;
  targetTerritoryId: string;
  onSelectTerritory: (id: string) => void;
  onSelectTarget: (id: string) => void;
}

const PLAYER: WarFactionIdV85 = "CON-F01";
const factionGlyph: Record<WarFactionIdV85, string> = { "CON-F01": "●", "CON-F02": "▲", "CON-F03": "◆" };
const orderNames: Record<WarOrderKindV85, string> = { move: "Déplacement", attack: "Assaut", recon: "Reconnaissance", cession: "Cession", transit: "Transit", logistics: "Ravitaillement", heal: "Soins" };
const shortId = (id: string) => id.replace("CON-", "");
const wrapLongitude = (value: number) => ((value + 540) % 360) - 180;

function FactionSymbol({ faction }: { faction: WarFactionIdV85 }) {
  return <span className={styles.factionSymbol} style={{ color: WAR_ATLAS_FACTIONS_V95[faction].color }} aria-hidden="true">{factionGlyph[faction]}</span>;
}

/** A presentation of the existing Korthas exercise. Geography never creates game links or bonuses. */
export default function ClanWarAtlasV95({ simulation, selectedTerritoryId, targetTerritoryId, onSelectTerritory, onSelectTarget }: ClanWarAtlasV95Props) {
  const unique = `war-atlas-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const initial = WAR_ATLAS_TERRITORIES_V95.find(item => item.id === selectedTerritoryId) ?? WAR_ATLAS_TERRITORIES_V95[0];
  const [projection, setProjection] = useState<"globe" | "map">("globe");
  const [longitude, setLongitude] = useState(initial.longitude);
  const [latitude, setLatitude] = useState(initial.latitude);
  const [zoom, setZoom] = useState(1);
  const [selectionMode, setSelectionMode] = useState<"origin" | "target">("origin");
  const [showRoutes, setShowRoutes] = useState(false);
  const [showNames, setShowNames] = useState(false);
  const [regionFilter, setRegionFilter] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const source = warTerritoryV85(selectedTerritoryId) ?? WAR_TERRITORIES_V85[0];
  const target = warTerritoryV85(targetTerritoryId);
  const inspected = selectionMode === "target" && target ? target : source;
  const inspectedState = simulation.territories[inspected.id];
  const intel = warAtlasIntelV95(simulation, inspected.id);
  const supplied = useMemo(() => warSuppliedV85(simulation), [simulation]);
  const factionMetrics = warAtlasFactionMetricsV95(simulation);
  const regionMetrics = warAtlasRegionMetricsV95(simulation);
  const playerOrders = simulation.orders.filter(order => order.factionId === PLAYER);
  const filteredTerritories = WAR_ATLAS_TERRITORIES_V95.filter(item => !regionFilter || item.regionId === regionFilter);
  const view = { longitude, latitude, radius: 244 * zoom, centerX: 480, centerY: 306 };
  const selectedGeo = WAR_ATLAS_TERRITORIES_V95.find(item => item.id === inspected.id);
  const hovered = warTerritoryV85(hoveredId ?? "");
  const projected = (point: WarAtlasPointV95) => projection === "globe"
    ? projectWarAtlasGlobeV95(point[0], point[1], view)
    : { ...projectWarAtlasMapV95(point[0], point[1], 960, 480), visible: true, depth: 1 };
  const territoryPath = (points: WarAtlasPointV95[]) => projection === "globe"
    ? warAtlasGlobePathV95(points, view) : warAtlasMapPathV95(points, 960, 480);
  const centerOn = (id: string) => {
    const geography = WAR_ATLAS_TERRITORIES_V95.find(item => item.id === id);
    if (geography) { setLongitude(geography.longitude); setLatitude(geography.latitude); }
  };
  const choose = (id: string) => {
    const definition = warTerritoryV85(id);
    if (!definition) return;
    if (selectionMode === "target") {
      if (!source.neighbors.includes(id)) {
        setAnnouncement(`${definition.name} n’est pas une destination voisine de ${source.name}. Choisissez une route voisine.`);
        return;
      }
      onSelectTarget(id);
      setAnnouncement(`Cible : ${definition.name}. Le choix est reporté dans la préparation de l’ordre.`);
    } else {
      onSelectTerritory(id);
      setAnnouncement(`${definition.name} sélectionné. ${simulation.territories[id].controller === PLAYER ? "Point de départ disponible." : "Territoire à inspecter ; le départ d’un ordre exige un territoire des Haltes."}`);
    }
  };
  const activate = (event: KeyboardEvent<SVGGElement>, id: string) => {
    if (event.key === "Enter" || event.key === " ") { event.preventDefault(); choose(id); }
  };
  const graticules = useMemo(() => {
    const lines: WarAtlasPointV95[][] = [];
    for (let meridian = -180; meridian < 180; meridian += 30) {
      lines.push(Array.from({ length: 61 }, (_, index) => [meridian, -90 + index * 3] as const));
    }
    for (let parallel = -60; parallel <= 60; parallel += 30) {
      lines.push(Array.from({ length: 121 }, (_, index) => [-180 + index * 3, parallel] as const));
    }
    return lines;
  }, []);
  const linePath = (points: WarAtlasPointV95[]) => {
    let drawing = false;
    return points.map(point => {
      const position = projected(point);
      if (!position.visible) { drawing = false; return ""; }
      const prefix = drawing ? "L" : "M";
      drawing = true;
      return `${prefix}${position.x.toFixed(2)},${position.y.toFixed(2)}`;
    }).join(" ");
  };
  const connectionPath = (fromId: string, toId: string) => {
    const from = WAR_ATLAS_TERRITORIES_V95.find(item => item.id === fromId);
    const to = WAR_ATLAS_TERRITORIES_V95.find(item => item.id === toId);
    if (!from || !to) return "";
    const delta = wrapLongitude(to.longitude - from.longitude);
    // Routes follow the declared graph; interpolating only draws their visible trajectory.
    const points = Array.from({ length: 25 }, (_, index) => {
      const t = index / 24;
      return [wrapLongitude(from.longitude + delta * t), from.latitude + (to.latitude - from.latitude) * t] as const;
    });
    if (projection === "map" && Math.abs(from.longitude - to.longitude) > 180) return "";
    return linePath(points);
  };
  const connections = WAR_TERRITORIES_V85.flatMap(item => item.neighbors.filter(id => item.id < id).map(id => ({ fromId: item.id, targetId: id })));
  const statusLabel = (id: string) => id === source.id ? "Départ / sélection" : id === targetTerritoryId ? "Cible" : source.neighbors.includes(id) ? "Voisin accessible" : "";

  return <section className={styles.atlas} aria-labelledby={`${unique}-heading`} data-testid="clan-war-atlas-v95">
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>THÉÂTRE PLANÉTAIRE / EXERCICE AUTONOME</p><h4 id={`${unique}-heading`}>Korthas<span>Atlas des territoires</span></h4></div>
      <div className={styles.turn}><span className={styles.signal} aria-hidden="true"/>Tour <strong>{String(simulation.turn).padStart(2, "0")}</strong><small>36 territoires · 6 régions</small></div>
    </header>

    <div className={styles.legend} aria-label="Contrôle des factions sur toute la planète">
      {factionMetrics.map(faction => <div key={faction.id} className={styles.factionCard} style={{ borderTopColor: faction.color }}>
        <div><FactionSymbol faction={faction.id}/><strong>{faction.shortName}</strong><span>{faction.territoryCount}<small>/36</small></span></div>
        <div className={styles.shareTrack} aria-hidden="true"><span style={{ width: `${faction.share * 100}%`, background: faction.color }}/></div>
        <p>{Math.round(faction.share * 100)} % des territoires<span>{faction.regionCount} région{faction.regionCount > 1 ? "s" : ""} entière{faction.regionCount > 1 ? "s" : ""}</span></p>
      </div>)}
    </div>

    <div className={styles.toolbar}>
      <div className={styles.segmented} aria-label="Projection de l’atlas">
        <button type="button" aria-pressed={projection === "globe"} onClick={() => setProjection("globe")}>◎ Globe</button>
        <button type="button" aria-pressed={projection === "map"} onClick={() => setProjection("map")}>▱ Planisphère</button>
      </div>
      <label className={styles.continentControl}>Région / continent<select value={regionFilter} onChange={event => {
        setRegionFilter(event.target.value);
        const region = WAR_ATLAS_REGIONS_V95.find(item => item.id === event.target.value);
        if (region) { setLongitude(region.longitude); setLatitude(region.latitude); }
      }}><option value="">Toute la planète</option>{WAR_ATLAS_REGIONS_V95.map(region => <option key={region.id} value={region.id}>{region.name}</option>)}</select></label>
    </div>

    <div className={styles.workspace}>
      <div className={styles.cartography}>
        <div className={styles.selectionBar}>
          <div className={styles.segmented} aria-label="Choisir le rôle du territoire sélectionné">
            <button type="button" aria-pressed={selectionMode === "origin"} onClick={() => setSelectionMode("origin")}>1 · Départ / inspection</button>
            <button type="button" aria-pressed={selectionMode === "target"} onClick={() => setSelectionMode("target")}>2 · Cible voisine</button>
          </div>
          <button type="button" className={styles.centerButton} onClick={() => centerOn(inspected.id)}>Centrer la sélection</button>
        </div>
        <div className={styles.viewport} data-projection={projection}>
          <svg className={styles.world} viewBox="0 0 960 620" role="group" aria-labelledby={`${unique}-map-title ${unique}-map-description`}>
            <title id={`${unique}-map-title`}>{`Korthas, ${projection === "globe" ? "globe interactif" : "carte des 36 territoires"}`}</title>
            <desc id={`${unique}-map-description`}>Chaque zone porte la couleur et le symbole de sa faction. Entrée ou Espace sélectionne une zone. Les boutons sous la carte et la liste des territoires donnent accès à la face cachée du globe.</desc>
            <defs>
              <radialGradient id={`${unique}-ocean`} cx="35%" cy="30%"><stop offset="0" stopColor="#173f49"/><stop offset=".65" stopColor="#0b252d"/><stop offset="1" stopColor="#040f18"/></radialGradient>
              <radialGradient id={`${unique}-shade`} cx="32%" cy="26%" r="78%"><stop offset=".45" stopColor="#020b13" stopOpacity="0"/><stop offset=".85" stopColor="#020b13" stopOpacity=".12"/><stop offset="1" stopColor="#020b13" stopOpacity=".7"/></radialGradient>
              <radialGradient id={`${unique}-halo`}><stop offset=".83" stopColor="#458a97" stopOpacity="0"/><stop offset=".91" stopColor="#458a97" stopOpacity=".17"/><stop offset="1" stopColor="#458a97" stopOpacity="0"/></radialGradient>
              <pattern id={`${unique}-CON-F01`} width="11" height="11" patternUnits="userSpaceOnUse"><path d="M-3 3L3-3M0 11L11 0M8 14L14 8" stroke="#fff" strokeOpacity=".15" strokeWidth="1"/></pattern>
              <pattern id={`${unique}-CON-F02`} width="11" height="11" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.2" fill="#fff" fillOpacity=".27"/></pattern>
              <pattern id={`${unique}-CON-F03`} width="11" height="11" patternUnits="userSpaceOnUse"><path d="M3 0V6M0 3H6" stroke="#fff" strokeOpacity=".22" strokeWidth="1"/></pattern>
              <marker id={`${unique}-arrow`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0L6 3L0 6Z" fill="#ffe6a6"/></marker>
            </defs>
            <g aria-hidden="true" className={styles.stars}>{Array.from({ length: 36 }, (_, index) => <circle key={index} cx={(index * 149 + 43) % 945} cy={(index * 83 + 37) % 600} r={index % 4 === 0 ? 1.5 : .8} opacity={index % 3 === 0 ? .55 : .24}/>)}</g>
            <g aria-hidden="true" className={styles.chartLabels}><text x="26" y="34">KORTHAS / SURFACE</text><text x="26" y="55">{projection === "globe" ? `LON ${Math.round(longitude)}° · LAT ${Math.round(latitude)}°` : "PROJECTION PLANÉTAIRE"}</text><text x="934" y="34" textAnchor="end">CON / 36 SECTEURS</text></g>
            {projection === "globe" ? <g aria-hidden="true"><ellipse cx="480" cy="306" rx={view.radius + 84} ry={view.radius * .33} transform="rotate(-23 480 306)" fill="none" stroke="#60878b" strokeOpacity=".18" strokeDasharray="3 10"/><circle cx="480" cy="306" r={view.radius + 29} fill={`url(#${unique}-halo)`}/><circle cx="480" cy="306" r={view.radius} fill={`url(#${unique}-ocean)`} stroke="#76b5bc" strokeWidth="1.5" strokeOpacity=".5"/></g> : <rect x="0" y="70" width="960" height="480" fill={`url(#${unique}-ocean)`} stroke="#28414b" aria-hidden="true"/>}
            <g transform={projection === "map" ? "translate(0 70)" : undefined}>
              <g aria-hidden="true" className={styles.graticule}>{graticules.map((points, index) => <path key={index} d={linePath(points)}/>)}</g>
              {WAR_ATLAS_TERRITORIES_V95.map(geography => {
                const d = territoryPath(geography.points);
                if (!d) return null;
                const definition = warTerritoryV85(geography.id)!;
                const faction = simulation.territories[geography.id].controller;
                const position = projected([geography.longitude, geography.latitude]);
                const isSource = geography.id === source.id;
                const isTarget = geography.id === targetTerritoryId;
                const isNeighbor = source.neighbors.includes(geography.id);
                const dimmed = Boolean(regionFilter && geography.regionId !== regionFilter);
                const accessible = isNeighbor;
                return <g key={geography.id} className={styles.territory} role="button" tabIndex={0}
                  aria-label={`${shortId(geography.id)} · ${definition.name} · ${WAR_FACTIONS_V85[faction]}${statusLabel(geography.id) ? ` · ${statusLabel(geography.id)}` : ""}`}
                  aria-pressed={selectionMode === "origin" ? isSource : isTarget}
                  aria-disabled={selectionMode === "target" && !accessible ? true : undefined}
                  data-source={isSource} data-target={isTarget} data-neighbor={isNeighbor} data-dimmed={dimmed}
                  onClick={() => choose(geography.id)} onKeyDown={event => activate(event, geography.id)}
                  onMouseEnter={() => setHoveredId(geography.id)} onMouseLeave={() => setHoveredId(null)}
                  onFocus={() => setHoveredId(geography.id)} onBlur={() => setHoveredId(null)}>
                  <title>{`${definition.name} · ${WAR_FACTIONS_V85[faction]}`}</title>
                  <path className={styles.land} d={d} fill={WAR_ATLAS_FACTIONS_V95[faction].color}/>
                  <path d={d} fill={`url(#${unique}-${faction})`} className={styles.landPattern} aria-hidden="true"/>
                  {position.visible && position.depth > .12 && <g className={styles.zoneLabel} aria-hidden="true"><text x={position.x} y={position.y - 4} textAnchor="middle">{factionGlyph[faction]} {shortId(geography.id)}</text>{showNames && <text className={styles.zoneName} x={position.x} y={position.y + 11} textAnchor="middle">{definition.name.length > 23 ? `${definition.name.slice(0, 21)}…` : definition.name}</text>}{(isSource || isTarget) && <text x={position.x} y={position.y + (showNames ? 26 : 12)} textAnchor="middle" className={styles.selectionLabel}>{isSource ? "DÉPART" : "CIBLE"}</text>}</g>}
                </g>;
              })}
              {showRoutes && <g className={styles.routes} aria-hidden="true">{connections.map(route => <path key={`${route.fromId}-${route.targetId}`} d={connectionPath(route.fromId, route.targetId)} data-active={route.fromId === source.id || route.targetId === source.id}/>)}</g>}
              <g className={styles.orderRoutes} aria-hidden="true">{playerOrders.filter(order => order.fromId !== order.targetId).map(order => <path key={order.id} d={connectionPath(order.fromId, order.targetId)} markerEnd={`url(#${unique}-arrow)`}/>)}</g>
              <g className={styles.regionNames} aria-hidden="true">{WAR_ATLAS_REGIONS_V95.map(region => {
                const northernCoast = Math.max(...WAR_ATLAS_TERRITORIES_V95.filter(item => item.regionId === region.id).flatMap(item => item.points.map(point => point[1])));
                const position = projected([region.longitude, Math.min(87, northernCoast + 4)]);
                return position.visible && position.depth > .12 && <text key={region.id} x={position.x} y={position.y - 4} textAnchor="middle" data-dimmed={Boolean(regionFilter && region.id !== regionFilter)}>{region.name.toLocaleUpperCase("fr")}</text>;
              })}</g>
            </g>
            {projection === "globe" && <circle cx="480" cy="306" r={view.radius} fill={`url(#${unique}-shade)`} pointerEvents="none" aria-hidden="true"/>}
            <g className={styles.chartLabels} aria-hidden="true"><text x="26" y="592">{hovered ? `${shortId(hovered.id)} / ${hovered.name.toLocaleUpperCase("fr")}` : "SÉLECTIONNEZ UN TERRITOIRE"}</text><text x="934" y="592" textAnchor="end">{projection === "globe" ? "HÉMISPHÈRE VISIBLE" : "ENSEMBLE DU THÉÂTRE"}</text></g>
          </svg>
        </div>
        <div className={styles.mapControls}>
          {projection === "globe" && <><div className={styles.rotationButtons} aria-label="Rotation de la planète"><button type="button" aria-label="Tourner vers l’ouest" onClick={() => setLongitude(value => wrapLongitude(value - 30))}>←</button><button type="button" aria-label="Incliner vers le nord" onClick={() => setLatitude(value => Math.min(65, value + 15))}>↑</button><button type="button" aria-label="Incliner vers le sud" onClick={() => setLatitude(value => Math.max(-65, value - 15))}>↓</button><button type="button" aria-label="Tourner vers l’est" onClick={() => setLongitude(value => wrapLongitude(value + 30))}>→</button></div><label className={styles.rotationSlider}>Rotation<input aria-label="Longitude du globe" type="range" min="-180" max="180" value={longitude} onChange={event => setLongitude(Number(event.target.value))}/></label><label className={styles.zoomControl}>Zoom<select aria-label="Zoom du globe" value={zoom} onChange={event => setZoom(Number(event.target.value))}><option value="1">100 %</option><option value="1.1">110 %</option><option value="1.2">120 %</option></select></label></>}
          <label className={styles.toggle}><input type="checkbox" checked={showRoutes} onChange={event => setShowRoutes(event.target.checked)}/>Routes</label>
          <label className={styles.toggle}><input type="checkbox" checked={showNames} onChange={event => setShowNames(event.target.checked)}/>Noms</label>
        </div>
        <p className={styles.mapNote}>Les couleurs, motifs et symboles indiquent le contrôle. Traits pointillés ambre : ordres réservés. Les connexions suivent les routes du théâtre.</p>
      </div>

      <aside className={styles.intelPanel} aria-label="Renseignement territorial">
        <p className={styles.eyebrow}>TERRITOIRE {shortId(inspected.id)}<span>{selectionMode === "target" ? "CIBLE" : "SÉLECTION"}</span></p>
        <h5>{inspected.name}</h5>
        <p className={styles.regionCaption}>{WAR_ATLAS_REGIONS_V95.find(region => region.territoryIds.includes(inspected.id))?.name}</p>
        <div className={styles.controller}><FactionSymbol faction={inspectedState.controller}/><span>{WAR_FACTIONS_V85[inspectedState.controller]}<small>Contrôle territorial</small></span></div>
        <dl className={styles.intelFacts}>
          <div><dt>Ravitaillement</dt><dd>{inspectedState.controller === PLAYER ? supplied.has(inspected.id) ? "Relié au réseau" : "Isolé du réseau" : "Liaison non observée"}</dd></div>
          <div><dt>{intel.kind === "own" ? "Personnes présentes" : "Reconnaissance"}</dt><dd>{intel.label}</dd></div>
          {intel.kind === "observed" && <div><dt>Date du relevé</dt><dd>Tour {intel.turn} · {intel.stale ? "ancien, à renouveler" : "estimation"}</dd></div>}
          {inspectedState.controller === PLAYER && <><div><dt>Installation</dt><dd>{inspectedState.installationIntact ? "Opérationnelle" : "Endommagée"}</dd></div><div><dt>Stocks locaux</dt><dd>S {simulation.stocks[inspected.id].s} · M {simulation.stocks[inspected.id].m} · I {simulation.stocks[inspected.id].i}</dd></div></>}
          <div><dt>Routes voisines</dt><dd>{inspected.neighbors.length}</dd></div>
        </dl>
        <div className={styles.routeSelection}><div><span>01 / DÉPART</span><strong>{shortId(source.id)} · {source.name}</strong></div><span className={styles.routeArrow} aria-hidden="true">↓</span><div><span>02 / CIBLE</span><strong>{target ? `${shortId(target.id)} · ${target.name}` : "À choisir"}</strong></div></div>
        <button type="button" className={styles.targetAction} onClick={() => {
          setSelectionMode(selectionMode === "origin" ? "target" : "origin");
          setAnnouncement(selectionMode === "origin" ? `Choisissez une cible parmi les voisins de ${source.name}.` : "Choisissez un territoire à inspecter ou un nouveau départ.");
        }}>{selectionMode === "origin" ? "Choisir une cible sur la carte →" : "← Revenir au départ / inspection"}</button>
        {selectionMode === "target" && <p className={styles.hint}>Seuls le départ et ses voisins sont sélectionnables comme cible. Les soins utilisent le territoire de départ.</p>}
        <details className={styles.terrain}><summary>Terrain et sites</summary><p>{inspected.terrain}</p><p>{inspected.sites}</p></details>
        <p className={styles.hint}>Les ordres se préparent dans le panneau stratégique ci-dessous. Les effectifs adverses restent inconnus sans reconnaissance.</p>
        {projection === "globe" && selectedGeo && !projectWarAtlasGlobeV95(selectedGeo.longitude, selectedGeo.latitude, view).visible && <button type="button" className={styles.hiddenSelection} onClick={() => centerOn(inspected.id)}>La sélection est sur l’autre face · la montrer</button>}
      </aside>
    </div>

    <div className={styles.regionStrip} aria-label="Contrôle des six régions">{regionMetrics.map(region => <button type="button" key={region.id} aria-pressed={regionFilter === region.id} onClick={() => {
      const geography = WAR_ATLAS_REGIONS_V95.find(item => item.id === region.id)!;
      setRegionFilter(regionFilter === region.id ? "" : region.id); setLongitude(geography.longitude); setLatitude(geography.latitude);
    }}><span>{region.name}</span><strong>{region.playerCount}<small>/{region.territoryCount} Haltes</small></strong><span className={styles.regionTrack} aria-hidden="true">{factionMetrics.map(faction => <i key={faction.id} style={{ width: `${region.factions[faction.id] / region.territoryCount * 100}%`, background: faction.color }}/>)}</span></button>)}</div>

    <details className={styles.territoryDirectory}><summary>Liste des territoires · {filteredTerritories.length} zones{regionFilter ? " dans cette région" : " sur les deux hémisphères"}</summary><div className={styles.directoryGrid}>{filteredTerritories.map(geography => {
      const definition = warTerritoryV85(geography.id)!;
      const faction = simulation.territories[geography.id].controller;
      return <button type="button" key={geography.id} aria-pressed={selectionMode === "origin" ? geography.id === source.id : geography.id === targetTerritoryId} onClick={() => { choose(geography.id); centerOn(geography.id); }}><FactionSymbol faction={faction}/><span><small>{shortId(geography.id)} · {WAR_ATLAS_FACTIONS_V95[faction].shortName}</small>{definition.name}</span>{statusLabel(geography.id) && <em>{statusLabel(geography.id)}</em>}</button>;
    })}</div></details>

    {playerOrders.length > 0 && <div className={styles.pendingOrders}><p className={styles.eyebrow}>TRAJECTOIRES RÉSERVÉES / {playerOrders.length}</p><ul>{playerOrders.map(order => <li key={order.id}><span aria-hidden="true">↗</span><strong>{orderNames[order.kind]}</strong><span>{shortId(order.fromId)} → {shortId(order.targetId)}</span><button type="button" onClick={() => { centerOn(order.targetId); setAnnouncement(`${orderNames[order.kind]} : ${warTerritoryV85(order.fromId)?.name} vers ${warTerritoryV85(order.targetId)?.name}.`); }}>Localiser<span className={styles.srOnly}> l’ordre {order.id}</span></button></li>)}</ul></div>}
    <p className={styles.announcement} role="status" aria-live="polite">{announcement || (selectionMode === "origin" ? "Sélectionnez un territoire pour l’inspecter et préparer votre départ." : `Sélectionnez une cible voisine de ${source.name}.`)}</p>
    <p className={styles.provenance}>Géographie schématique du théâtre de Korthas · régions, territoires, contrôle et routes de l’exercice. Aucun bonus de continent supplémentaire.</p>
  </section>;
}
