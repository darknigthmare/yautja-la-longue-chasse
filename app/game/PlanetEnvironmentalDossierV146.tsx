"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { WarPlanetV96 } from "./systems/clanWarPlanetsV96";
import { WAR_BIOME_LABELS_V96 } from "./systems/clanWarPlanetLabelsV102";
import { analyzePlanetEnvironmentV146, PLANET_SEASONS_V146, type PlanetSeasonV146 } from "./systems/clanWarPlanetEnvironmentV146";
import { createPlanetClimateMapV146 } from "./planetClimateMapV146";
import styles from "./PlanetEnvironmentalDossierV146.module.css";

const seasonLabels:Readonly<Record<PlanetSeasonV146,string>>={
  "northern-solstice":"Solstice nord",
  "first-equinox":"Équinoxe 1",
  "southern-solstice":"Solstice sud",
  "second-equinox":"Équinoxe 2",
};
const bands:Readonly<Record<string,string>>={
  equatorial:"Équatorial",subtropical:"Subtropical",temperate:"Tempéré",polar:"Polaire",
};
function downloadBlob(blob:Blob,filename:string) {
  const url=URL.createObjectURL(blob),link=document.createElement("a");
  link.href=url;link.download=filename;document.body.appendChild(link);
  try{link.click();}finally{link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),30000);}
}

/** Opt-in read-only laboratory, not a planetary recipe editor or war-save tool.
 * A point on the coloured map is the exact V124 region index, not a fabricated
 * ecology or a static decorative atlas. */
export default function PlanetEnvironmentalDossierV146({planet}:{planet:WarPlanetV96}) {
  const [expanded,setExpanded]=useState(false);
  const [axialTilt,setAxialTilt]=useState(23.5);
  const [season,setSeason]=useState<PlanetSeasonV146>("first-equinox");
  const [message,setMessage]=useState("");
  const [mapReady,setMapReady]=useState(false);
  const mapRef=useRef<HTMLCanvasElement>(null);
  const report=useMemo(()=>analyzePlanetEnvironmentV146(planet,{
    axialTiltDeg:axialTilt,season,
  }),[planet,axialTilt,season]);

  useEffect(()=>{
    if(!expanded)return;
    let cancelled=false;
    const frame=requestAnimationFrame(()=>{
      if(cancelled)return;
      try{
        const source=createPlanetClimateMapV146(planet,512);
        const canvas=mapRef.current,context=canvas?.getContext("2d");
        if(context){context.clearRect(0,0,512,256);context.drawImage(source,0,0);setMapReady(true);}
      }catch{
        if(!cancelled){setMapReady(false);setMessage("La carte climatique n'a pas pu être dessinée.");}
      }
    });
    return()=>{cancelled=true;cancelAnimationFrame(frame);};
  },[planet,expanded]);

  const exportJson=()=>{
    try{downloadBlob(new Blob([JSON.stringify(report,null,2)+"\n"],{type:"application/json"}),
      planet.id+"-environment-v146.json");
      setMessage("Dossier V146 exporté, sans modifier la planète.");}
    catch{setMessage("Export JSON environnemental indisponible.");}
  };
  const exportMap=()=>{
    const canvas=mapRef.current;
    if(!canvas||!mapReady){setMessage("Planisphère climatique indisponible.");return;}
    canvas.toBlob(blob=>{
      if(!blob){setMessage("Impossible de créer le PNG climatique.");return;}
      try{downloadBlob(blob,planet.id+"-biomes-map-v146.png");
        setMessage("PNG de la carte réelle des biomes exporté.");}
      catch{setMessage("Export PNG indisponible.");}
    },"image/png");
  };

  return <section className={styles.panel} data-testid="planet-environment-v146"
    data-world-code={planet.id} data-map-ready={mapReady}>
    <button type="button" className={styles.open} aria-expanded={expanded}
      data-testid="planet-environment-toggle-v146" onClick={()=>setExpanded(prev=>!prev)}>
      {expanded?"Masquer l'étude":"Étudier les climats, les journées et la physique"}
    </button>
    {!expanded?<p>Climats par région, durée du jour selon la latitude, carte PNG des biomes et cohérence des milieux.</p>:
    <div className={styles.body}>
      <p>Étude théorique de la planète générée : l’inclinaison et la saison servent uniquement à explorer l’ensoleillement. Ni le code du monde, ni les reliefs, les règles de guerre ou les sauvegardes ne sont modifiés.</p>
      <div className={styles.controls}>
        <label>Inclinaison axiale supposée · {axialTilt.toLocaleString("fr-FR")}°
          <input type="range" data-testid="planet-environment-tilt-v146" min="0" max="85" step=".5"
            value={axialTilt} onChange={event=>setAxialTilt(Number(event.target.value))}/>
        </label>
        <label>Saison théorique
          <select value={season} data-testid="planet-environment-season-v146"
            onChange={event=>setSeason(event.target.value as PlanetSeasonV146)}>
            {PLANET_SEASONS_V146.map(s=><option key={s} value={s}>{seasonLabels[s]}</option>)}
          </select>
        </label>
      </div>
      <p data-testid="planet-environment-declination-v146">Déclinaison solaire hypothétique : {report.solarDeclinationDeg.toLocaleString("fr-FR")}°. Milieu global : {report.surfaceKind} ({report.mediumClass}).</p>
      <div className={styles.summary}>
        <article><strong>Rotation</strong><span>{report.dayLengthPlanetaryHours===null?"Inconnue":report.dayLengthPlanetaryHours+" h planétaires"}</span></article>
        <article><strong>Gravité</strong><span>{report.gravityEarthG===null?"Inconnue":report.gravityEarthG.toLocaleString("fr-FR")+" g"}</span></article>
        <article><strong>Vitesse d'évasion inférée</strong><span>{report.physical?.escapeVelocityKmPerSecond===null||!report.physical?"Non calculable":report.physical.escapeVelocityKmPerSecond.toLocaleString("fr-FR")+" km/s"}</span></article>
        <article><strong>Vitesse de rotation équatoriale</strong><span>{report.physical?.equatorialRotationKmPerHour===null||!report.physical?"Non calculable":report.physical.equatorialRotationKmPerHour.toLocaleString("fr-FR")+" km/h"}</span></article>
        <article><strong>Densité moyenne inférée</strong><span>{report.physical?.inferredMeanDensityKgPerM3===null||!report.physical?"Non calculable":report.physical.inferredMeanDensityKgPerM3.toLocaleString("fr-FR")+" kg/m³"}</span></article>
      </div>
      <p>Carte des biomes réellement attribués aux régions. Le milieu extérieur ainsi que les bassins et chenaux intérieurs restent transparents.</p>
      <canvas ref={mapRef} width={512} height={256} role="img"
        aria-label={"Planisphère écologique des régions de "+planet.name}
        data-testid="planet-environment-map-v146" className={styles.map}/>
      <div className={styles.actions}>
        <button type="button" onClick={exportJson} data-testid="planet-environment-export-json-v146">Exporter le dossier JSON</button>
        <button type="button" disabled={!mapReady} onClick={exportMap} data-testid="planet-environment-export-png-v146">Exporter le planisphère PNG</button>
      </div>
      <div className={styles.regions}>
        {report.regions.map(region=><article key={region.regionId} data-testid="planet-environment-region-v146"
          data-region-id={region.regionId} data-daylight-hours={region.daylightPlanetaryHours??""}
          data-latitude-band={region.latitudeBand}>
          <strong>{region.name}</strong>
          <p>{WAR_BIOME_LABELS_V96[region.biome]} · {bands[region.latitudeBand]} · lat. {region.latitude.toLocaleString("fr-FR")}°</p>
          <p>Jour éclairé : {(100*region.daylightFraction).toLocaleString("fr-FR",{maximumFractionDigits:1})} % · {region.daylightPlanetaryHours===null?"Durée planétaire inconnue":region.daylightPlanetaryHours.toLocaleString("fr-FR")+" h planétaires"}.</p>
          <p>{region.climateDescription}</p>
          {region.flags.length>0&&<p className={styles.caution}>Exception de cohérence à documenter : {region.flags.join(", ")}.</p>}
        </article>)}
      </div>
      <p data-testid="planet-environment-warnings-v146">Points de cohérence à examiner : {report.flags.length}. Les alertes identifient des situations à expliquer, pas des erreurs automatiques de scénario.</p>
      <p className={styles.caution}>La gravité et la durée du jour proviennent du générateur descriptif. Les vitesses et la densité sont des inférences mathématiques ; sans masse mesurée, altitude, atmosphère, orbite ni étoile, aucune température ou habitabilité n’est certifiée.</p>
      <p role="status">{message}</p>
    </div>}
  </section>;
}
