"use client";

import { useEffect, useRef, useState } from "react";
import {
  drawEarthReferenceV147, earthReferenceStatsV147, validEarthLandGeoJsonV147,
  EARTH_REFERENCE_SOURCE_V147, type EarthLandGeoJsonV147,
  type EarthReferenceViewV147,
} from "./earthGeoReferenceV147";
import {
  PLANET_CANON_STORY_SETTINGS_V148, earthCanonFilmPinsV148, earthFilmMarkerPositionV148,
} from "./systems/planetLoreSettingsV148";
import styles from "./PlanetEarthReferenceV147.module.css";

const earthViews = {
  europe: { label:"Europe (Paris)", longitude:2.35, latitude:48.85 },
  america: { label:"Amérique (Los Angeles)", longitude:-118.24, latitude:34.05 },
  asia: { label:"Asie (Tokyo)", longitude:139.69, latitude:35.68 },
  oceania: { label:"Océanie (Sydney)", longitude:151.21, latitude:-33.87 },
  pacific: { label:"Pacifique central", longitude:-150, latitude:0 },
} as const;
type CameraId = keyof typeof earthViews;

function downloadEarthBlobV147(blob:Blob,filename:string) {
  const url=URL.createObjectURL(blob),link=document.createElement("a");
  link.download=filename;link.href=url;document.body.appendChild(link);
  try{link.click();}finally{link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),30000);}
}

/** Real Earth land reference (Natural Earth, public domain), deliberately kept
 * separate from V102/V103/V115 alien worlds and their military geographies. */
export default function PlanetEarthReferenceV147() {
  const [expanded,setExpanded]=useState(false);
  const [collection,setCollection]=useState<EarthLandGeoJsonV147|null>(null);
  const [status,setStatus]=useState<"idle"|"loaded"|"error">("idle");
  const [projection,setProjection]=useState<EarthReferenceViewV147["projection"]>("map");
  const [cameraId,setCameraId]=useState<CameraId>("europe");
  const [lastDraw,setLastDraw]=useState("");
  const [notice,setNotice]=useState("");
  const canvasRef=useRef<HTMLCanvasElement>(null);
  const camera=earthViews[cameraId];
  const view:EarthReferenceViewV147={
    projection,width:projection==="map"?768:512,height:projection==="map"?384:512,
    longitude:camera.longitude,latitude:camera.latitude,
  };
  const filmPins=earthCanonFilmPinsV148("earth")
    .map(entry=>({entry,point:earthFilmMarkerPositionV148(entry,view)}))
    .filter(item=>item.point!==null);
  const renderKey=projection+"/"+cameraId+"/"+(collection?"loaded":"empty");
  const ready=expanded && status==="loaded" && lastDraw===renderKey;

  useEffect(()=>{
    if(!expanded||collection||status==="error")return;
    let live=true;
    const controller=new AbortController();
    void fetch(EARTH_REFERENCE_SOURCE_V147.url,{signal:controller.signal})
      .then(response=>{if(!response.ok)throw new Error("Source Terre indisponible");
        return response.json() as Promise<unknown>;})
      .then(data=>{
        if(!live)return;
        if(!validEarthLandGeoJsonV147(data))throw new Error("Géographie Terre non valide");
        setCollection(data);setStatus("loaded");
      })
      .catch(error=>{
        if(!live||controller.signal.aborted)return;
        setStatus("error");setNotice(error instanceof Error?error.message:"Atlas Terre inaccessible.");
      });
    return()=>{live=false;controller.abort();};
  },[expanded,collection,status]);

  useEffect(()=>{
    if(!expanded||!collection)return;
    let cancelled=false;
    const frame=requestAnimationFrame(()=>{
      if(cancelled||!canvasRef.current)return;
      try{
        drawEarthReferenceV147(canvasRef.current,collection,{
          projection,
          width:projection==="map"?768:512,
          height:projection==="map"?384:512,
          longitude:camera.longitude,latitude:camera.latitude,
        });
        if(!cancelled)setLastDraw(renderKey);
      }catch(error){
        if(!cancelled){setStatus("error");
          setNotice(error instanceof Error?error.message:"Échec de l'affichage Terre.");}
      }
    });
    return()=>{cancelled=true;cancelAnimationFrame(frame);};
  },[expanded,collection,projection,camera.longitude,camera.latitude,renderKey]);

  const downloadPng=()=>{
    if(!ready||!canvasRef.current)return;
    const snapshot=document.createElement("canvas");
    snapshot.width=view.width;snapshot.height=view.height;
    const context=snapshot.getContext("2d");
    if(!context){setNotice("PNG indisponible.");return;}
    context.drawImage(canvasRef.current,0,0);
    // The exported current view contains the same official city-level pins
    // as the visible overlay, not extra invented settlements.
    for(const {point} of filmPins){
      if(!point)continue;
      context.beginPath();context.arc(point.x,point.y,5,0,Math.PI*2);
      context.fillStyle="#f3dc86";context.fill();
      context.strokeStyle="#21383d";context.lineWidth=2;context.stroke();
    }
    snapshot.toBlob(blob=>{
      if(!blob){setNotice("PNG indisponible.");return;}
      try{downloadEarthBlobV147(blob,"earth-natural-earth-110m-"+projection+"-v148.png");
        setNotice("Image terrestre et repères urbains vérifiés exportés.");}
      catch{setNotice("Export de la carte Terre refusé.");}
    },"image/png");
  };
  const downloadGeoJson=()=>{
    if(!collection)return;
    try{
      downloadEarthBlobV147(new Blob([JSON.stringify(collection)+"\n"],{type:"application/geo+json"}),
        "earth-natural-earth-110m-reference-v147.geojson");
      setNotice("Géographie terrestre publique exportée : étude séparée des planètes procédurales.");
    }catch{setNotice("Export du GeoJSON indisponible.");}
  };
  const stats=collection?earthReferenceStatsV147(collection):null;

  return <section className={styles.reference} data-testid="planet-earth-reference-v147"
    data-render-status={ready?"ready":status==="error"?"error":"loading"}
    data-projection={projection} data-source-scale="110m">
    <button className={styles.toggle} type="button" data-testid="planet-earth-toggle-v147"
      aria-expanded={expanded} onClick={()=>setExpanded(value=>!value)}>
      {expanded?"Fermer la référence Terre":"Comparer avec la véritable géographie terrestre"}
    </button>
    <p>Référence externe Natural Earth : continents réels, mers réelles et coordonnées terrestres, distincts des planètes extraterrestres du générateur.</p>
    {expanded&&<div className={styles.contents}>
      <p><strong>Précision cartographique : 1:110 millions.</strong> Les côtes sont généralisées ; ce n’est ni une carte de villes et routes 1:1, ni un théâtre de guerre jouable. Les lieux des films devront être géoréférencés séparément à partir de sources vérifiées.</p>
      <div className={styles.controls}>
        <label>Projection
          <select value={projection} data-testid="planet-earth-projection-v147"
            onChange={event=>setProjection(event.target.value as EarthReferenceViewV147["projection"])}>
            <option value="map">Planisphère</option>
            <option value="globe">Globe 3D</option>
          </select>
        </label>
        <label>Centre du globe
          <select value={cameraId} data-testid="planet-earth-camera-v147"
            onChange={event=>setCameraId(event.target.value as CameraId)}>
            {Object.entries(earthViews).map(([id,view])=>
              <option key={id} value={id}>{view.label}</option>)}
          </select>
        </label>
      </div>
      <div className={styles.canvasWrap}>
        <div className={styles.canvasLayer}>
          <canvas ref={canvasRef} width={view.width}
            height={view.height} className={styles.canvas} role="img"
            aria-label={"Référence géographique réelle de la Terre en "+projection}
            data-testid="planet-earth-canvas-v147"/>
          <svg className={styles.pinOverlay} viewBox={`0 0 ${view.width} ${view.height}`}
            role="img" aria-label="Repères terrestres attestés à la précision de leur source">
            {filmPins.map(({entry,point})=>point&&<g key={entry.id}
              data-testid="planet-earth-film-pin-v148" data-film={entry.id}>
              <circle cx={point.x} cy={point.y} r="5" fill="#f3dc86" stroke="#21383d" strokeWidth="2"/>
              <title>{entry.film+" · "+entry.setting+" · centre urbain approximatif, pas une scène exacte"}</title>
            </g>)}
          </svg>
        </div>
      </div>
      <div className={styles.lore} data-testid="planet-earth-lore-v148">
        <h5>Cadres cinématographiques vérifiés · Terre ou planète extraterrestre</h5>
        <p>Les lieux de l'histoire ne sont pas des lieux de tournage. Un film mentionnant seulement une jungle, une région ou une planète alien ne reçoit aucune épingle terrestre inventée.</p>
        <ul>{PLANET_CANON_STORY_SETTINGS_V148.map(entry=><li key={entry.id}
          data-testid="planet-film-setting-v148" data-film={entry.id}
          data-world={entry.world} data-precision={entry.precision}>
          <strong>{entry.film} ({entry.releaseYear})</strong>
          <span>{entry.world==="earth"?"Terre":"Planète extraterrestre"} · {entry.setting}</span>
          {entry.earthAnchor&&<small>Épingle : centre-ville approximatif, jamais les coordonnées précises d'une scène</small>}
          <a href={entry.sourceUrl} target="_blank" rel="noopener noreferrer">Source officielle du cadre</a>
        </li>)}</ul>
      </div>
      {stats&&<p data-testid="planet-earth-source-stats-v147">{stats.featureCount} polygones, {stats.ringCount} anneaux et {stats.vertexCount.toLocaleString("fr-FR")} sommets issus de Natural Earth. Référence originale de géographie terrestre, sans villes ni peuplements extraterrestres attribués.</p>}
      <div className={styles.actions}>
        <button type="button" disabled={!ready} data-testid="planet-earth-png-v147"
          onClick={downloadPng}>Exporter la vue PNG</button>
        <button type="button" disabled={!collection} data-testid="planet-earth-geojson-v147"
          onClick={downloadGeoJson}>Exporter les terres GeoJSON</button>
      </div>
      <p>Source : Natural Earth / NACIS, domaine public. Les territoires jouables du générateur restent sur leur planète d’origine, sans import automatique des lieux terrestres.</p>
      <p role="status">{status==="error"?notice||"Atlas Terre indisponible.":
        ready?notice||"Référence Terre chargée : atlas géographique indépendant.":
        "Chargement du modèle terrestre…"}</p>
    </div>}
  </section>;
}
