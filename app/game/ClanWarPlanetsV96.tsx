"use client";

import { useId, useMemo, useRef, useState } from "react";
import { WAR_PLANETS_V96, type WarPlanetV96 } from "./systems/clanWarPlanetsV96";
import { warAtlasGlobePathV95 } from "./systems/clanWarAtlasV95";
import PlanetMaterialCanvasV101 from "./PlanetMaterialCanvasV101";
import styles from "./ClanWarPlanetsV96.module.css";

export const WAR_PLANET_SELECTION_KEY_V96 = "yautja.clan-war.v96.selected-planet";
export const WAR_SURFACE_LABELS_V96: Record<WarPlanetV96["surface"]["kind"], string> = {
  water: "Océans", acid: "Mers acides", ice: "Glaces", sand: "Déserts",
  lava: "Lave", brine: "Saumures", radioactive: "Radiations", crystal: "Cristaux",
  spores: "Spores", mist: "Brumes",
};
export const WAR_BIOME_LABELS_V96: Record<WarPlanetV96["landBiome"], string> = {
  temperate: "Forêts tempérées", jungle: "Jungles", tundra: "Toundras", snow: "Neiges",
  desert: "Déserts", volcanic: "Terres volcaniques", salt: "Plateaux salins", mountain: "Montagnes",
  ocean: "Archipels", swamp: "Marécages", crystal: "Reliefs cristallins", fungal: "Forêts fongiques", irradiated: "Terres irradiées",
};

function PlanetPortrait({ planet, large = false }: { planet: WarPlanetV96; large?: boolean }) {
  const unique = `planet-portrait-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const [materialReady, setMaterialReady] = useState(false);
  const paths = useMemo(() => {
    const view = { longitude: -25, latitude: 15, radius: 43, centerX: 50, centerY: 50 };
    return planet.landmasses.map(landmass => warAtlasGlobePathV95(landmass.points, view));
  }, [planet]);
  return <svg viewBox="0 0 100 100" aria-hidden="true" className={large ? styles.largePortrait : styles.portrait} data-landmass-count={planet.landmasses.length}>
    <defs>
      <radialGradient id={`${unique}-sea`} cx="30%" cy="28%" r="75%"><stop stopColor={planet.surface.base}/><stop offset="1" stopColor={planet.surface.deep}/></radialGradient>
      <radialGradient id={`${unique}-light`} cx="30%" cy="25%" r="78%"><stop offset=".3" stopColor="#fff" stopOpacity=".14"/><stop offset=".7" stopColor="#000" stopOpacity="0"/><stop offset="1" stopColor="#000" stopOpacity=".75"/></radialGradient>
      <clipPath id={`${unique}-clip`}><circle cx="50" cy="50" r="43"/></clipPath>
    </defs>
    <g opacity={materialReady ? 0 : 1} data-material-fallback="true">
    <circle cx="50" cy="50" r="47" fill={planet.surface.accent} opacity=".08"/>
    <circle cx="50" cy="50" r="43" fill={`url(#${unique}-sea)`}/>
    <g clipPath={`url(#${unique}-clip)`}>
      {Array.from({ length: 8 }, (_, index) => <path key={index} d={`M0 ${index * 14}Q25 ${index * 14 - 10} 50 ${index * 14}T100 ${index * 14}`} fill="none" stroke={planet.surface.detail} strokeWidth=".8" opacity=".3"/>)}
      {paths.map((path, index) => path ? <path key={index} d={path} fill={planet.surface.accent} fillOpacity={.65 + index % 3 * .1} stroke={planet.surface.deep} strokeWidth=".55"/> : null)}
    </g>
    <circle cx="50" cy="50" r="43" fill={`url(#${unique}-light)`} stroke={planet.surface.detail} strokeWidth=".6"/>
    </g>
    <foreignObject x="0" y="0" width="100" height="100" pointerEvents="none" aria-hidden="true">
      <PlanetMaterialCanvasV101 planet={planet} resolution={large ? 256 : 128} onReady={setMaterialReady}/>
    </foreignObject>
  </svg>;
}

interface ClanWarPlanetsV96Props {
  planet: WarPlanetV96;
  turn: number;
  persisted: boolean;
  pending: boolean;
  onSelect: (planetId: string) => void;
}

export default function ClanWarPlanetsV96({ planet, turn, persisted, pending, onSelect }: ClanWarPlanetsV96Props) {
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const [surface, setSurface] = useState("");
  const [worldStyle, setWorldStyle] = useState("");
  const selectionRef = useRef<HTMLSelectElement>(null);
  const unique = `planet-browser-${useId().replace(/[^a-zA-Z0-9_-]/g, "")}`;
  const normalize = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLocaleLowerCase("fr");
  const filtered = WAR_PLANETS_V96.filter(item => (!surface || item.surface.kind === surface) && (!worldStyle || item.style === worldStyle)
    && normalize(`${item.name} ${item.subtitle} ${item.description} ${WAR_BIOME_LABELS_V96[item.landBiome]} ${WAR_SURFACE_LABELS_V96[item.surface.kind]}`).includes(normalize(query)));
  const activeIndex = WAR_PLANETS_V96.findIndex(item => item.id === planet.id);
  const select = (id: string) => { onSelect(id); if (expanded) selectionRef.current?.focus(); setExpanded(false); };

  return <section className={styles.browser} aria-labelledby={`${unique}-title`} data-testid="war-planet-selector-v96" data-active-planet={planet.id} data-landmass-count={planet.landmasses.length}>
    <div className={styles.activeWorld}>
      <PlanetPortrait planet={planet} large/>
      <div className={styles.identity}><p className={styles.eyebrow}>THÉÂTRES PLANÉTAIRES / 30 MONDES</p><h3 id={`${unique}-title`}>{planet.name}</h3><p className={styles.subtitle}>{planet.subtitle}</p><p className={styles.description}>{planet.description}</p>
        <div className={styles.facts}><span><i style={{ background: planet.surface.base }}/>{WAR_SURFACE_LABELS_V96[planet.surface.kind]}</span><span>{WAR_BIOME_LABELS_V96[planet.landBiome]}</span><span>{planet.style === "classic" ? "Monde classique" : "Monde exotique"}</span><span>{planet.landmasses.length} continents</span><span>6 régions administratives · 36 territoires</span><span>{Math.round(planet.landFraction * 100)} % de terres</span></div>
      </div>
      <p className={styles.archive}>Tour <strong>{String(turn).padStart(2, "0")}</strong><span>{pending ? "Enregistrement…" : persisted ? "Archive locale confirmée" : "Front en mémoire"}</span></p>
    </div>
    <div className={styles.navigation}>
      <label htmlFor={`${unique}-selection`}>Planète active<select ref={selectionRef} id={`${unique}-selection`} value={planet.id} disabled={pending} onChange={event => select(event.target.value)}>
        {WAR_PLANETS_V96.map(item => <option key={item.id} value={item.id}>{item.name} · {WAR_BIOME_LABELS_V96[item.landBiome]} · {WAR_SURFACE_LABELS_V96[item.surface.kind]}</option>)}
      </select></label>
      <div className={styles.cycle}><button type="button" disabled={pending} aria-label="Planète précédente" onClick={() => select(WAR_PLANETS_V96[(activeIndex + 29) % 30].id)}>←</button><button type="button" disabled={pending} aria-label="Planète suivante" onClick={() => select(WAR_PLANETS_V96[(activeIndex + 1) % 30].id)}>→</button></div>
      <button type="button" className={styles.browseButton} aria-expanded={expanded} aria-controls={`${unique}-catalogue`} onClick={() => setExpanded(value => !value)}>{expanded ? "Fermer le catalogue" : "Explorer les 30 planètes"}</button>
    </div>
    <div id={`${unique}-catalogue`} hidden={!expanded} className={styles.catalogue}>
      <div className={styles.filters}><label>Rechercher une planète<input type="search" value={query} maxLength={80} onChange={event => setQuery(event.target.value)} placeholder="Jungle, toundra, violet…"/></label><label>Type de monde<select value={worldStyle} onChange={event => setWorldStyle(event.target.value)}><option value="">Tous les mondes</option><option value="classic">Classiques · 16 mondes</option><option value="exotic">Exotiques · 14 mondes</option></select></label><label>Milieu de surface<select value={surface} onChange={event => setSurface(event.target.value)}><option value="">Tous les milieux</option>{Object.entries(WAR_SURFACE_LABELS_V96).map(([id, label]) => <option key={id} value={id}>{label}</option>)}</select></label></div>
      <p className={styles.resultCount} role="status">{filtered.length} planète{filtered.length > 1 ? "s" : ""}</p>
      <div className={styles.cards}>
        {filtered.map(item => <button key={item.id} type="button" className={styles.card} aria-pressed={item.id === planet.id} disabled={pending} onClick={() => select(item.id)} aria-label={`Ouvrir ${item.name}`} data-planet-card={item.id}>
          <PlanetPortrait planet={item}/><span><strong>{item.name}</strong><small>{item.subtitle}</small><em>{WAR_BIOME_LABELS_V96[item.landBiome]} · {WAR_SURFACE_LABELS_V96[item.surface.kind]} · {item.landmasses.length} continents</em></span><span className={styles.cardArrow} aria-hidden="true">{item.id === planet.id ? "●" : <svg width="14" height="14" viewBox="0 0 16 16" fill="none"><path d="M3 13 13 3M4 3h9v9" stroke="currentColor" strokeWidth="1.5"/></svg>}</span>
        </button>)}
      </div>
      {filtered.length === 0 && <p className={styles.empty}>Aucune planète ne correspond à ces filtres.</p>}
    </div>
    <p className={styles.help}>Chaque planète conserve sa partie locale. Les surfaces entre les terres ne sont pas des territoires : empruntez les liaisons affichées pour franchir leurs détroits.</p>
    <p className={styles.provenance}>Théâtres originaux du projet dans l’univers Yautja : géographie et routes propres à ce mode.</p>
  </section>;
}
