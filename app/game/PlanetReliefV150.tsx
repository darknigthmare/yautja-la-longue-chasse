"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { WarPlanetV96 } from "./systems/clanWarPlanetsV96";
import { WAR_BIOME_LABELS_V96 } from "./systems/clanWarPlanetLabelsV102";
import {
  analyzePlanetTerrainSlopesV152, samplePlanetTerrainRoutesV152,
  type PlanetTerrainSlopeV152, type PlanetTerrainRouteDossierV152,
} from "./systems/clanWarPlanetTerrainV152";
import { createPlanetRegionIndexMaskV124 } from "./planetModularExportV124";
import PlanetTraversalLabV154 from "./PlanetTraversalLabV154";
import {
  encodePlanetReliefV150, PLANET_RELIEF_DEFAULT_V150,
  type PlanetReliefRasterV150,
} from "./systems/clanWarPlanetReliefV150";
import styles from "./PlanetReliefV150.module.css";

const sizes=[256,512,1024] as const;
type ReliefSizeV150=typeof sizes[number];

function saveBlob(blob:Blob,filename:string){
  const url=URL.createObjectURL(blob),a=document.createElement("a");
  a.href=url;a.download=filename;document.body.appendChild(a);
  try{a.click();}finally{a.remove();window.setTimeout(()=>URL.revokeObjectURL(url),30000);}
}

export default function PlanetReliefV150({planet}:{planet:WarPlanetV96}){
  const [expanded,setExpanded]=useState(false);
  const [maxElevation,setMaxElevation]=useState<number>(PLANET_RELIEF_DEFAULT_V150.maxElevationMeters);
  const [ruggedness,setRuggedness]=useState<number>(PLANET_RELIEF_DEFAULT_V150.ruggedness);
  const [seedOffset,setSeedOffset]=useState(0);
  const [size,setSize]=useState<ReliefSizeV150>(512);
  const [lastRendered,setLastRendered]=useState("");
  const [raster,setRaster]=useState<PlanetReliefRasterV150|null>(null);
  const [terrain,setTerrain]=useState<PlanetTerrainSlopeV152|null>(null);
  const [regionIndexMask,setRegionIndexMask]=useState<Uint8ClampedArray|null>(null);
  const [routeStudy,setRouteStudy]=useState<PlanetTerrainRouteDossierV152|null>(null);
  const [display,setDisplay]=useState<"relief"|"slope">("relief");
  const [message,setMessage]=useState("");
  const previewRef=useRef<HTMLCanvasElement>(null);
  const slopeRef=useRef<HTMLCanvasElement>(null);
  const details=planet.procedural;
  const radiusKm=details && details.recipe.version===115 && "physical" in details
    ? details.physical.radiusKm:null;
  const currentKey=planet.id+"/"+String(radiusKm)+"/"+maxElevation+"/"+ruggedness+"/"+seedOffset+"/"+size;
  const ready=expanded && lastRendered===currentKey && raster!==null &&
    terrain!==null && routeStudy!==null && regionIndexMask!==null;
  const regionLabels=useMemo(()=>planet.regions.map(region=>region.name),[planet]);
  const biomes=useMemo(()=>planet.regions.map(region=>
    details?.regions.find(item=>item.regionId===region.id)?.biome??planet.landBiome),[planet,details]);

  useEffect(()=>{
    if(!expanded||radiusKm===null)return;
    let cancelled=false;
    const animation=requestAnimationFrame(()=>{
      if(cancelled)return;
      try{
        const regionCanvas=createPlanetRegionIndexMaskV124(planet,size);
        const source=regionCanvas.getContext("2d",{willReadFrequently:true})
          ?.getImageData(0,0,size,size/2).data;
        if(!source)throw new Error("Masque régional de cette planète indisponible.");
        const result=encodePlanetReliefV150(source,size,size/2,radiusKm,biomes,{
          maxElevationMeters:maxElevation,ruggedness,
          seed:(planet.seed^seedOffset)>>>0,
        });
        const slopes=analyzePlanetTerrainSlopesV152(result,source);
        const routes=samplePlanetTerrainRoutesV152(planet,result,slopes);
        const canvas=previewRef.current,ctx=canvas?.getContext("2d");
        const slopeCanvas=slopeRef.current,slopeContext=slopeCanvas?.getContext("2d");
        if(cancelled||!canvas||!ctx||!slopeCanvas||!slopeContext)return;
        canvas.width=size;canvas.height=size/2;
        const image=ctx.createImageData(size,size/2);
        image.data.set(result.preview);ctx.putImageData(image,0,0);
        slopeCanvas.width=size;slopeCanvas.height=size/2;
        const slopePixels=slopeContext.createImageData(size,size/2);
        slopePixels.data.set(slopes.preview);slopeContext.putImageData(slopePixels,0,0);
        setRaster(result);setTerrain(slopes);setRouteStudy(routes);
        setRegionIndexMask(new Uint8ClampedArray(source));
        setLastRendered(currentKey);
      }catch(error){
        if(cancelled)return;
        setRaster(null);setTerrain(null);setRouteStudy(null);
        setRegionIndexMask(null);setLastRendered(currentKey);
        setMessage(error instanceof Error?error.message:"L'altimétrie n'a pas pu être produite.");
      }
    });
    return()=>{cancelled=true;cancelAnimationFrame(animation);};
  },[expanded,planet,biomes,radiusKm,maxElevation,ruggedness,seedOffset,size,currentKey]);

  const downloadRaster=(channel:"height-rg16"|"preview")=>{
    if(!ready||!raster)return;
    try{
      const canvas=document.createElement("canvas");
      canvas.width=raster.width;canvas.height=raster.height;
      const context=canvas.getContext("2d");
      if(!context)throw new Error("Canvas d'altimétrie indisponible.");
      const pixels=context.createImageData(canvas.width,canvas.height);
      pixels.data.set(channel==="height-rg16"?raster.rg16:raster.preview);
      context.putImageData(pixels,0,0);
      canvas.toBlob(blob=>{
        if(!blob){setMessage("Le navigateur a refusé le PNG d'altitude.");return;}
        try{saveBlob(blob,planet.id+"-relief-v150-"+channel+".png");
          setMessage(channel==="height-rg16"?
            "Hauteurs RG16 téléchargées, 0 à "+maxElevation.toLocaleString("fr-FR")+" m.":
            "Aperçu coloré du relief téléchargé.");}
        catch{setMessage("Export du PNG d'altitude impossible.");}
      },"image/png");
    }catch{setMessage("Export de l'altimétrie indisponible.");}
  };
  const downloadSlopes=()=>{
    if(!ready||!terrain)return;
    try{
      const canvas=document.createElement("canvas");
      canvas.width=terrain.width;canvas.height=terrain.height;
      const context=canvas.getContext("2d");
      if(!context)throw new Error("Export des pentes indisponible.");
      const image=context.createImageData(canvas.width,canvas.height);
      image.data.set(terrain.preview);context.putImageData(image,0,0);
      canvas.toBlob(blob=>{
        if(!blob){setMessage("Le navigateur n'a pas pu encoder les pentes.");return;}
        try{
          saveBlob(blob,planet.id+"-pentes-v152-map.png");
          setMessage("Calque des pentes terrestres exporté, milieux non terrestres transparents.");
        }catch{setMessage("Export du PNG de pente indisponible.");}
      },"image/png");
    }catch{setMessage("Export du PNG de pente indisponible.");}
  };
  const downloadRouteStudy=()=>{
    if(!ready||!routeStudy||!terrain)return;
    try{
      const document={
        ...routeStudy,
        maximumGradePercent:terrain.highestGradePercent,
        landPixels:terrain.landPixels,
        classes:terrain.counts.map((count,index)=>({
          key:["flat","rolling","steep","extreme"][index],count,
        })),
        regions:terrain.regions.map((region,i)=>({
          ...region,regionId:planet.regions[i]?.id??null,
          regionName:planet.regions[i]?.name??null,
        })),
        slopeThresholdsPercent:[1,3,8],
      };
      saveBlob(new Blob([JSON.stringify(document,null,2)+"\n"],
        {type:"application/json"}),planet.id+"-route-terrain-v152.json");
      setMessage("Dossier des pentes et des routes exporté sans changer la guerre.");
    }catch{setMessage("Export du dossier de terrain indisponible.");}
  };

  const downloadReport=()=>{
    if(!ready||!raster)return;
    try{
      const meta={
        format:"yautja-planet-relief-study",version:150,worldCode:planet.id,
        source:"Exact dry-land regional mask V124 and canonical biome distribution",
        radiusKm:raster.radiusKm,
        width:raster.width,height:raster.height,
        maximumSelectedElevationMeters:raster.maxElevationMeters,
        ruggedness,seed:(planet.seed^seedOffset)>>>0,
        heightEncoding:{
          red:"8 most significant bits",green:"8 least significant bits",
          blue:0,alpha:"255 only on dry land; zero sea, lakes, rivers",
          decoder:"round(((R * 256 + G) / 65535) * maximumSelectedElevationMeters)",
        },
        landPixels:raster.landPixels,waterPixels:raster.waterPixels,
        highestElevationMeters:raster.highestElevationMeters,
        regions:raster.regions.map(record=>({
          ...record,regionId:planet.regions[record.regionIndex-1]?.id??null,
          regionName:regionLabels[record.regionIndex-1]??null,
        })),
        limitations:[
          "An original procedural altimetry authoring overlay, NOT geological elevations measured from canon.",
          "No tactical collision, mountain traversal, rainfall, tectonic plate, flooding or combat height effects.",
          "No changes to the V102/V103/V115 planet codes, hydrology, territories or saved clan wars.",
          "Spherical ridges use 3D coordinates and longitude periodic distance; relief is bounded, not physically simulated.",
        ],
      };
      saveBlob(new Blob([JSON.stringify(meta,null,2)+"\n"],{type:"application/json"}),
        planet.id+"-relief-v150-metadata.json");
      setMessage("Fiche d'altimétrie exportée sans modifier les données de guerre.");
    }catch{setMessage("Export des métadonnées d'altimétrie indisponible.");}
  };

  return <section className={styles.panel} data-testid="planet-relief-v150"
    data-world-code={planet.id} data-render-status={ready?"ready":radiusKm===null?"unavailable":"loading"}>
    <button type="button" className={styles.toggle} data-testid="planet-relief-toggle-v150"
      aria-expanded={expanded} onClick={()=>setExpanded(value=>!value)}>
      {expanded?"Fermer l'étude du relief":"Étudier les altitudes, côtes et montagnes"}
    </button>
    <p>Cartographie du relief par cellules terrestres : altitude RG16 exportable, plaines et montagnes, côtes et chenaux réellement présents.</p>
    {expanded&&radiusKm===null&&<p>Étude d’altimétrie métrique indisponible : ce monde historique n’a pas de rayon physique V115 enregistré. Aucun relief en mètres n’est inventé.</p>}
    {expanded&&radiusKm!==null&&<div className={styles.content}>
      <p>Simulation graphique de relief, fondée sur les terres réelles de cette planète et son rayon de {radiusKm.toLocaleString("fr-FR")} km. Les continents, bassins, régions, routes et coûts de guerre restent inchangés.</p>
      <div className={styles.controls}>
        <label>Altitude plafond · {maxElevation.toLocaleString("fr-FR")} m
          <input data-testid="planet-relief-max-v150" type="range" min="500" max="20000" step="500"
            value={maxElevation} onChange={event=>setMaxElevation(Number(event.target.value))}/>
        </label>
        <label>Relief escarpé · {Math.round(ruggedness*100)} %
          <input data-testid="planet-relief-ruggedness-v150" type="range"
            min="0" max="1" step=".05" value={ruggedness}
            onChange={event=>setRuggedness(Number(event.target.value))}/>
        </label>
        <label>Résolution de la carte
          <select data-testid="planet-relief-resolution-v150" value={size}
            onChange={event=>setSize(Number(event.target.value) as ReliefSizeV150)}>
            {sizes.map(item=><option value={item} key={item}>{item} × {item/2}</option>)}
          </select>
        </label>
        <button type="button" data-testid="planet-relief-random-v150"
          onClick={()=>setSeedOffset(value=>(value+1)>>>0)}>Réorganiser les crêtes</button>
        <label>Carte visible
          <select data-testid="planet-terrain-display-v152" value={display}
            onChange={event=>setDisplay(event.target.value as "relief"|"slope")}>
            <option value="relief">Altitudes colorées</option>
            <option value="slope">Pentes et passages</option>
          </select>
        </label>
      </div>
      <p>Carte d’altitude graphique : mers, lacs et cours intérieurs sont transparents. La texture RG16 contient les hauteurs sur deux canaux de huit bits pour éviter la faible précision d’un simple gris.</p>
      <canvas ref={previewRef} className={styles.map} width={size} height={size/2}
        style={{display:display==="relief"?"block":"none"}}
        data-testid="planet-relief-map-v150" role="img"
        aria-label={"Altitudes des terres de "+planet.name}/>
      <canvas ref={slopeRef} className={styles.map} width={size} height={size/2}
        style={{display:display==="slope"?"block":"none"}}
        data-testid="planet-terrain-slope-map-v152" role="img"
        aria-label={"Pentes des terres de "+planet.name}/>
      {ready&&raster&&<p data-testid="planet-relief-stats-v150">
        {raster.landPixels.toLocaleString("fr-FR")} pixels terrestres,
        {" "}{raster.waterPixels.toLocaleString("fr-FR")} pixels de milieux non terrestres.
        Altitude maximale issue du calcul : {raster.highestElevationMeters.toLocaleString("fr-FR")} m.
      </p>}
      {ready&&terrain&&routeStudy&&<div className={styles.terrainInfo}
        data-testid="planet-terrain-summary-v152">
        <strong>Étude des pentes à l’échelle du globe, non des chemins métriques</strong>
        <p>{terrain.steepAndExtremePercent.toLocaleString("fr-FR")} % des terres sont dans les deux classes de pentes les plus fortes.
          Pente maximale estimée : {terrain.highestGradePercent.toLocaleString("fr-FR")} %.
          {routeStudy.routes.length} liaisons stratégiques analysées, dont {routeStudy.classCounts["medium-crossing"]} traversées de milieux existantes.</p>
        <p>Classes à cette résolution : plaine (moins de 1 %), ondulé (1 à 3 %),
          pente marquée (3 à 8 %) et fort relief (8 % ou plus). Ces seuils ne bloquent aucune unité.</p>
      </div>}
      <div className={styles.actions}>
        <button type="button" disabled={!ready} data-testid="planet-relief-png-rg16-v150"
          onClick={()=>downloadRaster("height-rg16")}>Exporter les altitudes RG16 (PNG)</button>
        <button type="button" disabled={!ready} data-testid="planet-relief-png-preview-v150"
          onClick={()=>downloadRaster("preview")}>Exporter la carte colorée</button>
        <button type="button" disabled={!ready} data-testid="planet-relief-json-v150"
          onClick={downloadReport}>Exporter la fiche JSON</button>
        <button type="button" disabled={!ready} data-testid="planet-terrain-png-v152"
          onClick={downloadSlopes}>Exporter les pentes PNG</button>
        <button type="button" disabled={!ready} data-testid="planet-terrain-json-v152"
          onClick={downloadRouteStudy}>Exporter l’étude des routes JSON</button>
      </div>
      {ready&&raster&&<div className={styles.regions}>
        {raster.regions.map((r,i)=><article key={r.regionIndex}
          data-testid="planet-relief-region-v150" data-region-index={r.regionIndex}>
          <strong>{regionLabels[i]}</strong>
          <p>{WAR_BIOME_LABELS_V96[r.biome]} · {r.landPixels.toLocaleString("fr-FR")} pixels de terre</p>
          <p>Altitude moyenne estimée : {r.averageElevationMeters.toLocaleString("fr-FR")} m ; plus haut point du raster : {r.maximumElevationMeters.toLocaleString("fr-FR")} m.</p>
        </article>)}
      </div>}
      {ready&&routeStudy&&<div className={styles.routeGrid} data-testid="planet-terrain-routes-v152">
        {routeStudy.routes.slice(0,8).map(route=><article key={route.fromId+"-"+route.toId}>
          <strong>{route.fromId} → {route.toId}</strong>
          <p>{route.kind==="crossing"?"Traversée de milieu balisée":"Liaison terrestre"} · {route.lengthKm.toLocaleString("fr-FR")} km</p>
          <p>Pente max. {route.maximumGradePercent.toLocaleString("fr-FR")} % ·
            {route.nonLandSamples} échantillon(s) non terrestres · catégorie {route.class}.</p>
        </article>)}
      </div>}
      {ready&&raster&&terrain&&regionIndexMask&&
        <PlanetTraversalLabV154 key={currentKey} planet={planet}
          raster={raster} slope={terrain} regionMask={regionIndexMask}/>}
      <p className={styles.note}>Les pentes représentent une moyenne à la résolution du planisphère, et non la pente d’une route locale ou une topographie canonique. Les traversées, collisions, véhicules et missions restent inchangés.</p>
      <p role="status">{message}</p>
    </div>}
  </section>;
}
