"use client";

import { useId, useMemo, useState, type KeyboardEvent } from "react";
import { warSuppliedV85, type WarOrderKindV85, type WarSimulationV85 } from "./systems/clanWarV85";
import { WAR_FACTIONS_V85, type WarFactionIdV85 } from "./systems/clanWarV85Data";
import { warPlanetV96, type WarPlanetV96 } from "./systems/clanWarPlanetsV96";
import {
  WAR_ATLAS_FACTIONS_V95,
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
const biomeNames: Record<string, string> = {
  temperate: "Forêts et prairies", jungle: "Jungle dense", tundra: "Toundra et lichens", snow: "Terres enneigées",
  desert: "Désert rocheux", volcanic: "Terres volcaniques", salt: "Plateaux salins", mountain: "Massifs montagneux",
  ocean: "Îles et côtes rocheuses", swamp: "Marais et mangroves", crystal: "Crêtes cristallines", fungal: "Forêts fongiques", irradiated: "Roches irradiées",
};

function FactionSymbol({ faction }: { faction: WarFactionIdV85 }) {
  return <span className={styles.factionSymbol} style={{ color: WAR_ATLAS_FACTIONS_V95[faction].color }} aria-hidden="true">{factionGlyph[faction]}</span>;
}

/** Small deterministic SVG tiles keep every surface detailed without image
 * downloads, animation or random differences between server and client. */
function PlanetSurfaceDefinitions({ planet, unique }: { planet: WarPlanetV96; unique: string }) {
  const { kind, base, deep, accent, detail } = planet.surface;
  const grain = Array.from({ length: 58 }, (_, index) => {
    const hash = Math.abs(Math.sin((index + 1) * 127.1 + planet.seed * .013) * 43758.5453);
    return { x: hash % 192, y: (hash * 17.27) % 192, r: .4 + (hash % 17) / 15 };
  });
  return <>
    <radialGradient id={`${unique}-ocean`} cx="35%" cy="30%"><stop offset="0" stopColor={base}/><stop offset=".65" stopColor={deep}/><stop offset="1" stopColor={deep}/></radialGradient>
    <radialGradient id={`${unique}-halo`}><stop offset=".83" stopColor={accent} stopOpacity="0"/><stop offset=".91" stopColor={accent} stopOpacity=".22"/><stop offset="1" stopColor={accent} stopOpacity="0"/></radialGradient>
    <radialGradient id={`${unique}-pool`}><stop offset="0" stopColor={accent} stopOpacity=".52"/><stop offset=".48" stopColor={base} stopOpacity=".15"/><stop offset="1" stopColor={deep} stopOpacity="0"/></radialGradient>
    <pattern id={`${unique}-surface`} width="192" height="192" patternUnits="userSpaceOnUse" patternTransform={`rotate(${planet.seed % 37 - 18})`}>
      {kind === "water" && <>
        {[10, 48, 86, 124, 162].map((y, index) => <g key={y} transform={`translate(${index % 2 ? -26 : 0} ${y})`}><path d="M-20 0Q4-13 28 0T76 0T124 0T172 0T220 0" fill="none" stroke={accent} strokeOpacity=".35" strokeWidth="1.2"/><path d="M-20 6Q4-7 28 6T76 6T124 6T172 6T220 6" fill="none" stroke={detail} strokeOpacity=".15" strokeWidth="3"/></g>)}
        <path d="M102 80q12-20 27-11t11 26q-16 14-31 1Z" fill="none" stroke={accent} strokeOpacity=".25" strokeWidth="4"/>
      </>}
      {kind === "acid" && <>
        <path d="M-10 4C54 50 18 65 70 99S99 174 202 189M97-10C118 49 166 41 151 89S119 163 183 202" fill="none" stroke={accent} strokeWidth="7" strokeOpacity=".25"/>
        {[[27, 33, 15], [79, 74, 24], [151, 38, 12], [43, 151, 28], [146, 144, 20]].map(([x, y, r]) => <g key={x}><circle cx={x} cy={y} r={r} fill={`url(#${unique}-pool)`}/><circle cx={x} cy={y} r={r} fill="none" stroke={detail} strokeOpacity=".55" strokeWidth="1.5"/><path d={`M${x - r * .6} ${y - r * .5}q${r * .4} ${-r * .4} ${r * .8} 0`} fill="none" stroke={accent} strokeOpacity=".65"/></g>)}
      </>}
      {kind === "ice" && <>
        <path d="M-4 25L48 39 76-6M48 39L55 91 18 133-4 128M55 91L113 76 140 20 196 42M113 76L137 138 101 195M137 138L195 116M18 133L70 160 85 195" fill="none" stroke={deep} strokeOpacity=".9" strokeWidth="8"/>
        <path d="M-4 23L48 37 76-8M48 37L55 89 18 131-4 126M55 89L113 74 140 18 196 40M113 74L137 136 101 193M137 136L195 114M18 131L70 158 85 193" fill="none" stroke={detail} strokeOpacity=".75" strokeWidth="2"/>
        <path d="M60 43L103 72 57 85ZM119 81L133 127 182 111ZM23 136L62 160 39 182Z" fill={accent} fillOpacity=".16"/>
      </>}
      {kind === "sand" && <>
        {[0, 32, 64, 96, 128, 160, 192].map((y, index) => <g key={y} transform={`translate(${index % 2 ? -18 : 0} ${y})`}><path d="M-32 18C12-26 57 41 105 5S170-9 224 8L224 24C166 6 150 15 108 18S20-10-32 29Z" fill={deep} fillOpacity=".4"/><path d="M-32 18C12-26 57 41 105 5S170-9 224 8" fill="none" stroke={accent} strokeOpacity=".55" strokeWidth="1.5"/></g>)}
      </>}
      {kind === "lava" && <>
        <path d="M0 42L36 17 69 34 88 75 135 85 158 136 192 151M88 75L41 117 52 166 30 192M135 85L178 43 192 50" fill="none" stroke={deep} strokeWidth="28" strokeLinejoin="round"/>
        <path d="M0 42L36 17 69 34 88 75 135 85 158 136 192 151M88 75L41 117 52 166 30 192M135 85L178 43 192 50" fill="none" stroke={accent} strokeOpacity=".7" strokeWidth="7" strokeLinejoin="round"/>
        <path d="M0 42L36 17 69 34 88 75 135 85 158 136 192 151M88 75L41 117 52 166" fill="none" stroke={detail} strokeOpacity=".9" strokeWidth="1.4"/>
        <path d="M112 16L134 29 125 52 101 39ZM12 136L27 145 17 163 3 156Z" fill={deep}/>
      </>}
      {kind === "brine" && <>
        <path d="M-13 41L38 10 90 25 138-3 201 27 178 78 202 123 143 157 96 189 37 161-7 185 19 124Z" fill="none" stroke={detail} strokeOpacity=".5" strokeWidth="3"/>
        <path d="M12 47L43 31 91 47 139 19 176 36 155 77 177 117 135 135 91 165 42 140 17 152 42 120Z" fill="none" stroke={accent} strokeOpacity=".4" strokeWidth="9"/>
        <path d="M36 60L54 55 94 67 137 48 149 57 132 83 151 109 125 113 84 141 58 121 66 104Z" fill="none" stroke={detail} strokeOpacity=".45"/>
      </>}
      {kind === "radioactive" && <>
        {[[43, 46, 35], [137, 141, 52], [173, 24, 21]].map(([x, y, r]) => <g key={x}><circle cx={x} cy={y} r={r} fill={`url(#${unique}-pool)`}/><circle cx={x} cy={y} r={r * .65} fill="none" stroke={accent} strokeWidth="2" strokeOpacity=".5" strokeDasharray="4 6"/><circle cx={x} cy={y} r={r * .3} fill={detail} fillOpacity=".3"/></g>)}
        <path d="M-10 116Q22 75 65 94T124 67T202 81M3 174Q44 134 87 170T202 162" fill="none" stroke={accent} strokeWidth="3" strokeOpacity=".65"/>
      </>}
      {kind === "crystal" && <>
        {[[34, 39, 26], [119, 108, 40], [173, 29, 23], [22, 158, 20], [174, 173, 32]].map(([x, y, r]) => <g key={x}><path d={`M${x} ${y-r}L${x+r*.7} ${y-r*.3}L${x+r*.5} ${y+r*.65}L${x-r*.3} ${y+r}L${x-r*.7} ${y}Z`} fill={accent} fillOpacity=".19" stroke={detail} strokeOpacity=".7"/><path d={`M${x} ${y-r}L${x} ${y}L${x+r*.5} ${y+r*.65}M${x} ${y}L${x-r*.7} ${y}M${x} ${y}L${x+r*.7} ${y-r*.3}`} fill="none" stroke={detail} strokeOpacity=".4"/></g>)}
      </>}
      {kind === "spores" && <>
        <path d="M-5 71C38 21 64 98 107 72S150 98 197 40M24 196C76 139 51 120 100 111S144 136 196 107" fill="none" stroke={accent} strokeWidth="3" strokeOpacity=".45"/>
        {[[31, 60, 16], [95, 77, 25], [156, 55, 19], [53, 148, 23], [145, 154, 29]].map(([x, y, r]) => <g key={x}><ellipse cx={x} cy={y} rx={r} ry={r * .7} fill={accent} fillOpacity=".3" stroke={detail} strokeOpacity=".5"/><ellipse cx={x} cy={y} rx={r * .62} ry={r * .38} fill={deep} fillOpacity=".7"/><circle cx={x} cy={y} r="3" fill={detail} fillOpacity=".75"/></g>)}
      </>}
      {kind === "mist" && <>
        {[20, 86, 152].map(y => <g key={y} transform={`translate(0 ${y})`}><path d="M-24 0C15-49 60 54 108 8S165-29 217-3" fill="none" stroke={accent} strokeOpacity=".22" strokeWidth="28"/><path d="M-24 1C15-48 60 55 108 9S165-28 217-2" fill="none" stroke={detail} strokeOpacity=".24" strokeWidth="3"/><path d="M-24 17C15-32 60 71 108 25S165-12 217 14" fill="none" stroke={accent} strokeOpacity=".2" strokeWidth="8"/></g>)}
      </>}
      <g fill={detail} opacity={kind === "sand" || kind === "spores" ? ".35" : ".19"}>{grain.map((point, index) => <circle key={index} cx={point.x} cy={point.y} r={point.r}/>)}</g>
    </pattern>
    <pattern id={`${unique}-relief`} width="60" height="56" patternUnits="userSpaceOnUse" data-testid="war-planet-land-texture" data-land-biome={planet.landBiome}>
      {planet.landBiome === "temperate" && <g fill="#102a24" fillOpacity=".36" stroke="#eff9db" strokeOpacity=".2" strokeWidth=".7"><path d="M7 6L1 20H5L0 28H17L12 20H16ZM38 26L31 39H35L30 48H47L42 39H46Z"/><path d="M21 10q-5-9-10-1q-8 1-4 8q5 6 11 2q9 1 7-6Z"/><path d="M25 35l3-5 3 5m16-20 3-5 3 5" fill="none"/></g>}
      {planet.landBiome === "jungle" && <g fill="#0b3027" fillOpacity=".45" stroke="#d2efb2" strokeOpacity=".25" strokeWidth=".8"><path d="M5 6q5-10 12-2q11-5 14 6q8 6 0 14q-3 7-13 3q-11 6-17-4q-8-6 4-17ZM33 33q5-10 12-4q10-4 13 5q7 6 0 13q-4 8-13 4q-12 4-17-5q-6-8 5-13Z"/><path d="M15 7v15m-6-8 6 4 8-6m19 22v14m-6-8 6 3 8-4" fill="none"/></g>}
      {planet.landBiome === "swamp" && <g fill="none" stroke="#123c32" strokeOpacity=".5" strokeWidth="1.3"><path d="M6 23V10m0 9-5-5m5 2 5-9m24 20V8m0 9-6-5m6 9 7-9M21 52V34m0 9-5-6m5 10 6-8M50 51V34m0 10 5-7m-5 4-5-7"/><path d="M1 28q10-5 21 0m7 5q14-7 28-1M0 55q9-4 15 0m18-1q10-5 25 0" stroke="#e8f5d6" strokeOpacity=".4"/></g>}
      {planet.landBiome === "tundra" && <g fill="none" stroke="#203f35" strokeOpacity=".5" strokeWidth="1"><path d="M7 15l-4-6m4 6v-9m0 9 4-6M39 32l-5-5m5 5v-9m0 9 5-5M19 49l-4-6m4 6v-8m0 8 5-4"/><path d="M15 22q7-5 12 0t8 0M45 8q6-4 12 0M1 38q7-4 13 0" stroke="#e4e5b9" strokeOpacity=".6" strokeWidth="2.3"/></g>}
      {planet.landBiome === "snow" && <g fill="none" stroke="#f8ffff" strokeOpacity=".58" strokeWidth="2"><path d="M-4 17L12 8 27 20 43 7 63 19M-4 44L14 31 29 45 43 31 64 44"/><path d="M6 23L12 12 21 21M37 49L43 36 54 47" stroke="#26474a" strokeOpacity=".45" strokeWidth="1"/><path d="M22 29h10m-5-5v10" strokeWidth=".7"/></g>}
      {planet.landBiome === "desert" && <g fill="none"><path d="M-5 9Q9-5 24 9T65 9M-5 31Q9 17 24 31T65 31M-5 53Q9 39 24 53T65 53" stroke="#58442a" strokeOpacity=".43" strokeWidth="3"/><path d="M-5 7Q9-7 24 7T65 7M-5 29Q9 15 24 29T65 29M-5 51Q9 37 24 51T65 51" stroke="#fff1be" strokeOpacity=".45" strokeWidth="1"/></g>}
      {planet.landBiome === "volcanic" && <g fill="none" stroke="#252126" strokeOpacity=".5"><path d="M-2 15L14 5 31 17 25 33 42 45 60 36M31 17L49 8 62 15M25 33L9 45 2 58" strokeWidth="4"/><path d="M-2 15L14 5 31 17 25 33 42 45 60 36M25 33L9 45 2 58" stroke="#ffdfad" strokeOpacity=".4" strokeWidth=".8"/></g>}
      {planet.landBiome === "salt" && <g fill="none" stroke="#f9f6e1" strokeOpacity=".55" strokeWidth="1.2"><path d="M-3 9L12 3 29 14 22 32 3 29ZM29 14L46 3 63 14 56 31 38 34 22 32M3 29L8 48 26 57 38 34M38 34L51 49 63 47"/><path d="M12 14l4-3 5 5-4 6-6-2Z" fill="#fff9e3" fillOpacity=".25"/></g>}
      {(planet.landBiome === "mountain" || planet.landBiome === "ocean") && <g fill="none" stroke="#183435" strokeOpacity=".44" strokeWidth="1.6"><path d="M0 25L12 6 25 25M19 44L34 18 51 44M43 16L51 3 61 16"/><path d="M7 15L12 7 17 15 12 12ZM28 29L34 19 40 29 34 26Z" fill="#f5f3dd" fillOpacity=".4" stroke="none"/>{planet.landBiome === "ocean" && <path d="M-4 51Q6 46 16 51T36 51T56 51" stroke="#eff7db" strokeOpacity=".4"/>}</g>}
      {planet.landBiome === "crystal" && <g fill="#413553" fillOpacity=".3" stroke="#faedff" strokeOpacity=".5" strokeWidth=".8"><path d="M5 27L10 5 19 12 22 30 12 36ZM34 49L39 24 49 30 54 50 44 55Z"/><path d="M10 5L12 36m-2-20 9-4M39 24L44 55m-3-17 8-8" fill="none"/></g>}
      {planet.landBiome === "fungal" && <g fill="#273740" fillOpacity=".4" stroke="#f1e5eb" strokeOpacity=".4" strokeWidth="1"><path d="M3 19Q13-2 23 19Q13 25 3 19ZM30 43Q43 17 56 43Q44 51 30 43Z"/><path d="M13 23v11m30 13v9" strokeWidth="2.5"/><path d="M8 16h3m6 1h2m17 22h3m9 1h3"/></g>}
      {planet.landBiome === "irradiated" && <g fill="none" stroke="#173e37" strokeOpacity=".5"><path d="M2 21L11 10 23 17 18 29 7 31ZM36 44L44 31 58 38 54 52 41 55Z" strokeWidth="1.5"/><circle cx="39" cy="10" r="5" stroke="#f6ffd8" strokeWidth="2" strokeOpacity=".5"/><circle cx="14" cy="46" r="3" fill="#f6ffd8" fillOpacity=".4"/></g>}
    </pattern>
  </>;
}

/** Geography, names and routes follow the active planet; only faction control colors are shared. */
export default function ClanWarAtlasV95({ simulation, selectedTerritoryId, targetTerritoryId, onSelectTerritory, onSelectTarget }: ClanWarAtlasV95Props) {
  const unique = `war-atlas-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const planet = warPlanetV96(simulation.planetId) ?? warPlanetV96()!;
  const regions = planet.regions;
  const territories = planet.territories;
  const landmasses = planet.landmasses;
  const definitions = planet.definitions;
  const territory = (id: string) => definitions.find(item => item.id === id);
  const initial = territories.find(item => item.id === selectedTerritoryId) ?? territories[0];
  const [projection, setProjection] = useState<"globe" | "map">("globe");
  const [longitude, setLongitude] = useState(initial.longitude);
  const [latitude, setLatitude] = useState(initial.latitude);
  const [zoom, setZoom] = useState(1);
  const [selectionMode, setSelectionMode] = useState<"origin" | "target">("origin");
  const [showRoutes, setShowRoutes] = useState(true);
  const [showNames, setShowNames] = useState(false);
  const [regionFilter, setRegionFilter] = useState("");
  const [announcement, setAnnouncement] = useState("");
  const [hoveredId, setHoveredId] = useState<string | null>(null);
  const source = territory(selectedTerritoryId) ?? definitions[0];
  const target = territory(targetTerritoryId);
  const inspected = selectionMode === "target" && target ? target : source;
  const inspectedState = simulation.territories[inspected.id];
  const intel = warAtlasIntelV95(simulation, inspected.id);
  const supplied = useMemo(() => warSuppliedV85(simulation), [simulation]);
  const factionMetrics = warAtlasFactionMetricsV95(simulation, regions);
  const regionMetrics = warAtlasRegionMetricsV95(simulation, regions);
  const playerOrders = simulation.orders.filter(order => order.factionId === PLAYER);
  const filteredTerritories = territories.filter(item => !regionFilter || item.regionId === regionFilter);
  const view = { longitude, latitude, radius: 244 * zoom, centerX: 480, centerY: 306 };
  const selectedGeo = territories.find(item => item.id === inspected.id);
  const hovered = territory(hoveredId ?? "");
  const projected = (point: WarAtlasPointV95) => projection === "globe"
    ? projectWarAtlasGlobeV95(point[0], point[1], view)
    : { ...projectWarAtlasMapV95(point[0], point[1], 960, 480), visible: true, depth: 1 };
  const territoryPath = (points: WarAtlasPointV95[]) => projection === "globe"
    ? warAtlasGlobePathV95(points, view) : warAtlasMapPathV95(points, 960, 480);
  const centerOn = (id: string) => {
    const geography = territories.find(item => item.id === id);
    if (geography) { setLongitude(geography.longitude); setLatitude(geography.latitude); }
  };
  const choose = (id: string) => {
    const definition = territory(id);
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
    let previousX: number | null = null;
    return points.map(point => {
      const position = projected(point);
      if (!position.visible) { drawing = false; return ""; }
      // A short route across the date line continues at both map edges rather
      // than crossing every other continent in the flat projection.
      if (projection === "map" && previousX !== null && Math.abs(position.x - previousX) > 480) drawing = false;
      const prefix = drawing ? "L" : "M";
      drawing = true;
      previousX = position.x;
      return `${prefix}${position.x.toFixed(2)},${position.y.toFixed(2)}`;
    }).join(" ");
  };
  const connectionPath = (fromId: string, toId: string) => {
    const from = territories.find(item => item.id === fromId);
    const to = territories.find(item => item.id === toId);
    if (!from || !to) return "";
    const delta = wrapLongitude(to.longitude - from.longitude);
    // Routes follow the declared graph; interpolating only draws their visible trajectory.
    const points = Array.from({ length: 25 }, (_, index) => {
      const t = index / 24;
      return [wrapLongitude(from.longitude + delta * t), from.latitude + (to.latitude - from.latitude) * t] as const;
    });
    return linePath(points);
  };
  // The active departure and reserved orders provide the useful routes without
  // covering a dense planet in every faction's overlapping lines.
  const connections = source.neighbors.map(id => ({ fromId: source.id, targetId: id }));
  const statusLabel = (id: string) => id === source.id ? "Départ / sélection" : id === targetTerritoryId ? "Cible" : source.neighbors.includes(id) ? "Voisin accessible" : "";

  return <section className={styles.atlas} aria-labelledby={`${unique}-heading`} data-testid="clan-war-atlas-v95" data-planet-id={planet.id} data-planet-style={planet.style} data-surface-kind={planet.surface.kind} data-landmass-count={landmasses.length}>
    <header className={styles.header}>
      <div><p className={styles.eyebrow}>THÉÂTRE PLANÉTAIRE / {planet.subtitle}</p><h4 id={`${unique}-heading`}>{planet.name}<span>Atlas des territoires</span></h4></div>
      <div className={styles.turn}><span className={styles.signal} aria-hidden="true"/>Tour <strong>{String(simulation.turn).padStart(2, "0")}</strong><small>{territories.length} territoires · {regions.length} régions</small><small>{landmasses.length} continents</small></div>
    </header>
    <div className={styles.surfaceBrief}>
      <span className={styles.surfaceSwatch} style={{ background: `linear-gradient(135deg, ${planet.surface.base}, ${planet.surface.deep})`, borderColor: planet.surface.accent }} aria-hidden="true"/>
      <p><strong>{planet.surface.name}<span className={styles.biomeTag}>{biomeNames[planet.landBiome]}</span></strong><span>Surface non jouable · {planet.description}</span></p>
    </div>

    <div className={styles.legend} aria-label="Contrôle des factions sur toute la planète">
      {factionMetrics.map(faction => <div key={faction.id} className={styles.factionCard} style={{ borderTopColor: faction.color }}>
        <div><FactionSymbol faction={faction.id}/><strong>{faction.shortName}</strong><span>{faction.territoryCount}<small>/{territories.length}</small></span></div>
        <div className={styles.shareTrack} aria-hidden="true"><span style={{ width: `${faction.share * 100}%`, background: faction.color }}/></div>
        <p>{Math.round(faction.share * 100)} % des territoires<span>{faction.regionCount} région{faction.regionCount > 1 ? "s" : ""} entière{faction.regionCount > 1 ? "s" : ""}</span></p>
      </div>)}
    </div>

    <div className={styles.toolbar}>
      <div className={styles.segmented} aria-label="Projection de l’atlas">
        <button type="button" aria-pressed={projection === "globe"} onClick={() => setProjection("globe")}>◎ Globe</button>
        <button type="button" aria-pressed={projection === "map"} onClick={() => setProjection("map")}>▱ Planisphère</button>
      </div>
      <label className={styles.continentControl}>Région<select value={regionFilter} onChange={event => {
        setRegionFilter(event.target.value);
        const region = regions.find(item => item.id === event.target.value);
        if (region) { setLongitude(region.longitude); setLatitude(region.latitude); }
      }}><option value="">Toute la planète</option>{regions.map(region => <option key={region.id} value={region.id}>{region.name}</option>)}</select></label>
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
            <title id={`${unique}-map-title`}>{`${planet.name}, ${projection === "globe" ? "globe interactif" : `carte des ${territories.length} territoires`}`}</title>
            <desc id={`${unique}-map-description`}>{`Chaque zone porte la couleur et le symbole de sa faction. ${planet.surface.name} : surface non jouable entre les territoires. Les routes relient les voisins accessibles, y compris à travers les détroits. Entrée ou Espace sélectionne une zone. Les boutons sous la carte et la liste des territoires donnent accès à la face cachée du globe.`}</desc>
            <defs>
              <PlanetSurfaceDefinitions planet={planet} unique={unique}/>
              <radialGradient id={`${unique}-shade`} cx="32%" cy="26%" r="78%"><stop offset=".45" stopColor="#020b13" stopOpacity="0"/><stop offset=".85" stopColor="#020b13" stopOpacity=".12"/><stop offset="1" stopColor="#020b13" stopOpacity=".7"/></radialGradient>
              <clipPath id={`${unique}-surface-clip`}>{projection === "globe" ? <circle cx="480" cy="306" r={view.radius}/> : <rect x="0" y="70" width="960" height="480"/>}</clipPath>
              <pattern id={`${unique}-CON-F01`} width="11" height="11" patternUnits="userSpaceOnUse"><path d="M-3 3L3-3M0 11L11 0M8 14L14 8" stroke="#fff" strokeOpacity=".15" strokeWidth="1"/></pattern>
              <pattern id={`${unique}-CON-F02`} width="11" height="11" patternUnits="userSpaceOnUse"><circle cx="3" cy="3" r="1.2" fill="#fff" fillOpacity=".27"/></pattern>
              <pattern id={`${unique}-CON-F03`} width="11" height="11" patternUnits="userSpaceOnUse"><path d="M3 0V6M0 3H6" stroke="#fff" strokeOpacity=".22" strokeWidth="1"/></pattern>
              <marker id={`${unique}-arrow`} markerWidth="8" markerHeight="8" refX="6" refY="3" orient="auto"><path d="M0 0L6 3L0 6Z" fill="#ffe6a6"/></marker>
            </defs>
            <g aria-hidden="true" className={styles.stars}>{Array.from({ length: 36 }, (_, index) => <circle key={index} cx={(index * 149 + 43) % 945} cy={(index * 83 + 37) % 600} r={index % 4 === 0 ? 1.5 : .8} opacity={index % 3 === 0 ? .55 : .24}/>)}</g>
            <g aria-hidden="true" className={styles.chartLabels}><text x="26" y="34">{planet.name.toLocaleUpperCase("fr")} / SURFACE</text><text x="26" y="55">{projection === "globe" ? `LON ${Math.round(longitude)}° · LAT ${Math.round(latitude)}°` : "PROJECTION PLANÉTAIRE"}</text><text x="934" y="34" textAnchor="end">CON / {territories.length} SECTEURS</text></g>
            {projection === "globe" ? <g aria-hidden="true"><ellipse cx="480" cy="306" rx={view.radius + 84} ry={view.radius * .33} transform="rotate(-23 480 306)" fill="none" stroke={planet.surface.accent} strokeOpacity=".2" strokeDasharray="3 10"/><circle cx="480" cy="306" r={view.radius + 29} fill={`url(#${unique}-halo)`}/><circle cx="480" cy="306" r={view.radius} fill={`url(#${unique}-ocean)`} stroke={planet.surface.accent} strokeWidth="1.5" strokeOpacity=".6"/></g> : <rect x="0" y="70" width="960" height="480" fill={`url(#${unique}-ocean)`} stroke={planet.surface.accent} strokeOpacity=".5" aria-hidden="true"/>}
            <g className={styles.surfaceTexture} clipPath={`url(#${unique}-surface-clip)`} aria-hidden="true" data-testid="war-planet-surface-texture" data-surface-kind={planet.surface.kind}>
              <rect x="0" y="0" width="960" height="620" fill={`url(#${unique}-surface)`}/>
            </g>
            <g transform={projection === "map" ? "translate(0 70)" : undefined}>
              <g aria-hidden="true" className={styles.graticule}>{graticules.map((points, index) => <path key={index} d={linePath(points)}/>)}</g>
              {territories.map(geography => {
                const d = territoryPath(geography.points);
                if (!d) return null;
                const definition = territory(geography.id)!;
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
                  data-territory-id={geography.id} data-landmass-id={geography.landmassId} data-source={isSource} data-target={isTarget} data-neighbor={isNeighbor} data-dimmed={dimmed}
                  onClick={() => choose(geography.id)} onKeyDown={event => activate(event, geography.id)}
                  onMouseEnter={() => setHoveredId(geography.id)} onMouseLeave={() => setHoveredId(null)}
                  onFocus={() => setHoveredId(geography.id)} onBlur={() => setHoveredId(null)}>
                  <title>{`${definition.name} · ${WAR_FACTIONS_V85[faction]}`}</title>
                  <path className={styles.land} d={d} fill={WAR_ATLAS_FACTIONS_V95[faction].color}/>
                  <path d={d} fill={`url(#${unique}-relief)`} className={styles.landPattern} aria-hidden="true"/>
                  <path d={d} fill={`url(#${unique}-${faction})`} className={styles.landPattern} aria-hidden="true"/>
                  {position.visible && position.depth > .12 && <g className={styles.zoneLabel} aria-hidden="true"><text x={position.x} y={position.y - 4} textAnchor="middle">{factionGlyph[faction]} {shortId(geography.id)}</text>{showNames && <text className={styles.zoneName} x={position.x} y={position.y + 11} textAnchor="middle">{definition.name.length > 23 ? `${definition.name.slice(0, 21)}…` : definition.name}</text>}{(isSource || isTarget) && <text x={position.x} y={position.y + (showNames ? 26 : 12)} textAnchor="middle" className={styles.selectionLabel}>{isSource ? "DÉPART" : "CIBLE"}</text>}</g>}
                </g>;
              })}
              <g className={styles.coastlines} aria-hidden="true" pointerEvents="none" data-testid="war-planet-coastlines">
                {landmasses.map(landmass => <path key={landmass.id} d={territoryPath(landmass.points)} data-landmass-id={landmass.id} data-dimmed={Boolean(regionFilter && !landmass.territoryIds.some(id => filteredTerritories.some(item => item.id === id)))}/>)}
              </g>
              {showRoutes && <g className={styles.routes} aria-hidden="true" data-testid="war-planet-neighbor-routes">{connections.map(route => <path key={`${route.fromId}-${route.targetId}`} d={connectionPath(route.fromId, route.targetId)} data-from={route.fromId} data-target={route.targetId} data-active={route.fromId === source.id || route.targetId === source.id}/>)}</g>}
              <g className={styles.orderRoutes} aria-hidden="true">{playerOrders.filter(order => order.fromId !== order.targetId).map(order => <path key={order.id} d={connectionPath(order.fromId, order.targetId)} markerEnd={`url(#${unique}-arrow)`}/>)}</g>
              <g className={styles.regionNames} aria-hidden="true">{regions.map(region => {
                const northernCoast = Math.max(...territories.filter(item => item.regionId === region.id).flatMap(item => item.points.map(point => point[1])));
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
        <p className={styles.mapNote}>Les couleurs, motifs et symboles indiquent le contrôle. Routes claires : voisins du départ, détroits franchissables inclus. Pointillés ambre : ordres réservés. Le fond texturé est non jouable.</p>
      </div>

      <aside className={styles.intelPanel} aria-label="Renseignement territorial">
        <p className={styles.eyebrow}>TERRITOIRE {shortId(inspected.id)}<span>{selectionMode === "target" ? "CIBLE" : "SÉLECTION"}</span></p>
        <h5>{inspected.name}</h5>
        <p className={styles.regionCaption}>{regions.find(region => region.territoryIds.includes(inspected.id))?.name}</p>
        <div className={styles.controller}><FactionSymbol faction={inspectedState.controller}/><span>{WAR_FACTIONS_V85[inspectedState.controller]}<small>Contrôle territorial</small></span></div>
        <dl className={styles.intelFacts}>
          <div><dt>Ravitaillement</dt><dd>{inspectedState.controller === PLAYER ? supplied.has(inspected.id) ? "Relié au réseau" : "Isolé du réseau" : "Liaison non observée"}</dd></div>
          <div><dt>{intel.kind === "own" ? "Personnes présentes" : "Reconnaissance"}</dt><dd>{intel.label}</dd></div>
          {intel.kind === "observed" && <div><dt>Date du relevé</dt><dd>Tour {intel.turn} · {intel.stale ? "ancien, à renouveler" : "estimation"}</dd></div>}
          {inspectedState.controller === PLAYER && <><div><dt>Installation</dt><dd>{inspectedState.installationIntact ? "Opérationnelle" : "Endommagée"}</dd></div><div><dt>Stocks locaux</dt><dd>S {simulation.stocks[inspected.id].s} · M {simulation.stocks[inspected.id].m} · I {simulation.stocks[inspected.id].i}</dd></div></>}
          <div><dt>Routes voisines</dt><dd>{inspected.neighbors.length}</dd></div>
        </dl>
        <div className={styles.routeSelection}><div><span>01 / DÉPART</span><strong>{shortId(source.id)} · {source.name}</strong></div><span className={styles.routeArrow} aria-hidden="true">↓</span><div><span>02 / CIBLE</span><strong>{target ? `${shortId(target.id)} · ${target.name}` : "À choisir"}</strong></div></div>
        <details className={styles.neighborDirectory}><summary>{source.neighbors.length} destinations accessibles du départ</summary><div>{source.neighbors.map(id => <button key={id} type="button" onClick={() => { setSelectionMode("target"); onSelectTarget(id); centerOn(id); setAnnouncement(`Cible : ${territory(id)?.name}. Destination voisine de ${source.name}.`); }} aria-pressed={targetTerritoryId === id}>{shortId(id)} · {territory(id)?.name}</button>)}</div></details>
        <button type="button" className={styles.targetAction} onClick={() => {
          setSelectionMode(selectionMode === "origin" ? "target" : "origin");
          setAnnouncement(selectionMode === "origin" ? `Choisissez une cible parmi les voisins de ${source.name}.` : "Choisissez un territoire à inspecter ou un nouveau départ.");
        }}>{selectionMode === "origin" ? "Choisir une cible sur la carte →" : "← Revenir au départ / inspection"}</button>
        {selectionMode === "target" && <p className={styles.hint}>Seuls les voisins du départ sont sélectionnables comme cible. Les soins utilisent le territoire de départ.</p>}
        <details className={styles.terrain}><summary>Terrain et sites</summary><p>{inspected.terrain}</p><p>{inspected.sites}</p></details>
        <p className={styles.hint}>Les ordres se préparent dans le panneau stratégique ci-dessous. Les effectifs adverses restent inconnus sans reconnaissance.</p>
        {projection === "globe" && selectedGeo && !projectWarAtlasGlobeV95(selectedGeo.longitude, selectedGeo.latitude, view).visible && <button type="button" className={styles.hiddenSelection} onClick={() => centerOn(inspected.id)}>La sélection est sur l’autre face · la montrer</button>}
      </aside>
    </div>

    <div className={styles.regionStrip} aria-label={`Contrôle des ${regions.length} régions`}>{regionMetrics.map(region => <button type="button" key={region.id} aria-pressed={regionFilter === region.id} onClick={() => {
      const geography = regions.find(item => item.id === region.id)!;
      setRegionFilter(regionFilter === region.id ? "" : region.id); setLongitude(geography.longitude); setLatitude(geography.latitude);
    }}><span>{region.name}</span><strong>{region.playerCount}<small>/{region.territoryCount} Haltes</small></strong><span className={styles.regionTrack} aria-hidden="true">{factionMetrics.map(faction => <i key={faction.id} style={{ width: `${region.factions[faction.id] / region.territoryCount * 100}%`, background: faction.color }}/>)}</span></button>)}</div>

    <details className={styles.territoryDirectory}><summary>Liste des territoires · {filteredTerritories.length} zones{regionFilter ? " dans cette région" : " sur les deux hémisphères"}</summary><div className={styles.directoryGrid}>{filteredTerritories.map(geography => {
      const definition = territory(geography.id)!;
      const faction = simulation.territories[geography.id].controller;
      return <button type="button" key={geography.id} aria-pressed={selectionMode === "origin" ? geography.id === source.id : geography.id === targetTerritoryId} onClick={() => { choose(geography.id); centerOn(geography.id); }}><FactionSymbol faction={faction}/><span><small>{shortId(geography.id)} · {WAR_ATLAS_FACTIONS_V95[faction].shortName}</small>{definition.name}</span>{statusLabel(geography.id) && <em>{statusLabel(geography.id)}</em>}</button>;
    })}</div></details>

    {playerOrders.length > 0 && <div className={styles.pendingOrders}><p className={styles.eyebrow}>TRAJECTOIRES RÉSERVÉES / {playerOrders.length}</p><ul>{playerOrders.map(order => <li key={order.id}><span aria-hidden="true">↗</span><strong>{orderNames[order.kind]}</strong><span>{shortId(order.fromId)} → {shortId(order.targetId)}</span><button type="button" onClick={() => { centerOn(order.targetId); setAnnouncement(`${orderNames[order.kind]} : ${territory(order.fromId)?.name} vers ${territory(order.targetId)?.name}.`); }}>Localiser<span className={styles.srOnly}> l’ordre {order.id}</span></button></li>)}</ul></div>}
    <p className={styles.announcement} role="status" aria-live="polite">{announcement || (selectionMode === "origin" ? "Sélectionnez un territoire pour l’inspecter et préparer votre départ." : `Sélectionnez une cible voisine de ${source.name}.`)}</p>
    <p className={styles.provenance}>{planet.name} · {landmasses.length} continents · {regions.length} régions administratives · {Math.round(planet.landFraction * 100)} % de terres cartographiées. Les liaisons indiquées permettent de franchir les détroits ; les surfaces entre les territoires sont non jouables.</p>
  </section>;
}
