"use client";

import { useMemo, useState } from "react";
import type { WarPlanetV96 } from "./systems/clanWarPlanetsV96";
import type { PlanetReliefRasterV150 } from "./systems/clanWarPlanetReliefV150";
import type { PlanetTerrainSlopeV152 } from "./systems/clanWarPlanetTerrainV152";
import { warUnitV85 } from "./systems/clanWarV85Data";
import { analyzePlanetTraverseSectionV155 } from "./systems/clanWarPlanetTraverseSectionV155";
import {
  PLANET_MOBILITY_PROFILES_V154, buildPlanetTraversalGridV154,
  isTraversalCellPassableV154,
  planPlanetTraversalV154, createPlanetTraversalSessionV154,
  commitPlanetTraversalPlanV154, advancePlanetTraversalV154,
  type PlanetTraversalGridV154, type PlanetMobilityUnitIdV154,
  type PlanetTraversalSessionV154,
} from "./systems/clanWarPlanetTraverseV154";
import styles from "./PlanetTraversalLabV154.module.css";

function exportTraversalV154(value:unknown,name:string) {
  const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)+"\n"],{type:"application/json"}));
  const link=document.createElement("a");
  link.href=url;link.download=name;document.body.appendChild(link);
  try{link.click();}finally{link.remove();window.setTimeout(()=>URL.revokeObjectURL(url),30000);}
}

/** A genuine interactive movement simulation on existing V150 source pixels,
 * isolated from the actual war order and mission autosave systems. */
function WalkOnPlanetV154({grid,territoryName}:{
  grid:PlanetTraversalGridV154;territoryName:string;
}) {
  const [unitId,setUnitId]=useState<PlanetMobilityUnitIdV154>("RTS-U02");
  const [session,setSession]=useState<PlanetTraversalSessionV154>(
    ()=>createPlanetTraversalSessionV154(grid,"RTS-U02"));
  const [status,setStatus]=useState("Choisissez une case terrestre à atteindre.");
  const sourceUnit=warUnitV85(unitId);
  const currentProfile=PLANET_MOBILITY_PROFILES_V154.find(profile=>profile.unitTypeId===unitId)!;
  const crossSection=analyzePlanetTraverseSectionV155(grid,session);
  const svgWidth=640,svgHeight=154,svgPadding=24;
  const altitudeRange=Math.max(1,crossSection.maxElevationMeters-crossSection.minElevationMeters);
  const chartCoords=crossSection.nodes.map((node,index)=>({
    x:crossSection.totalDistanceKm>0?
      svgPadding+(node.distanceFromStartKm/crossSection.totalDistanceKm)*(svgWidth-2*svgPadding):
      svgWidth/2,
    y:svgHeight-svgPadding-
      ((node.elevationMeters-crossSection.minElevationMeters)/altitudeRange)*(svgHeight-2*svgPadding),
    index,
  }));
  const line=chartCoords.map(p=>p.x+","+p.y).join(" ");
  const area=chartCoords.length?
    `M ${chartCoords[0].x} ${svgHeight-svgPadding} L ${chartCoords.map(p=>p.x+" "+p.y).join(" L ")} L ${chartCoords.at(-1)!.x} ${svgHeight-svgPadding} Z`:"";
  const marker=chartCoords[crossSection.currentNodeIndex]??null;
  const queued=new Set(session.queued.map(p=>p.x+","+p.y));
  const visited=new Set(session.walked.map(p=>p.x+","+p.y));
  const blocked=grid.cells.filter(cell=>!isTraversalCellPassableV154(cell,unitId)).length;
  const selectProfile=(next:PlanetMobilityUnitIdV154)=>{
    setUnitId(next);setSession(createPlanetTraversalSessionV154(grid,next));
    setStatus("Unité sélectionnée : carte et position de départ recalculées.");
  };
  const plan=(x:number,y:number)=>{
    if(!session.position){setStatus("Aucune zone terrestre praticable pour cette unité dans le secteur.");return;}
    const result=planPlanetTraversalV154(grid,session.position,{x,y},unitId);
    if(result.status==="reachable"){
      setSession(commitPlanetTraversalPlanV154(session,grid,result));
      setStatus("Chemin préparé : "+(result.path.length-1)+" case(s), "+
        result.distanceKm.toLocaleString("fr-FR")+" km cartographiques estimés. Confirmez les pas.");
    } else if(result.status==="already-there"){
      setStatus("Cette case est déjà occupée.");
    } else if(result.status==="blocked"){
      setStatus("Destination interdite : milieu non terrestre ou pente trop forte pour cette unité.");
    } else {
      setStatus("Aucune traversée terrestre continue : aucun pont ou raccourci n’est créé.");
    }
  };
  const advance=()=>setSession(current=>advancePlanetTraversalV154(current,grid));
  const finish=()=>{
    let current=session,steps=0;
    while(current.queued.length&&steps++<=grid.width*grid.height){
      const next=advancePlanetTraversalV154(current,grid);
      if(next===current)break;
      current=next;
    }
    setSession(current);
    setStatus(current.queued.length?"Le passage est interrompu.":"Détachement arrivé à la case cible.");
  };
  const reset=()=>{
    setSession(createPlanetTraversalSessionV154(grid,unitId));
    setStatus("Exercice réinitialisé, sans modification du front.");
  };
  const save=()=>{
    try{
      exportTraversalV154({
        ...session,
        format:"yautja-planet-traversal-session",
        sectorTerritory:territoryName,
        grid:{width:grid.width,height:grid.height,samplePixels:grid.samplePixels,
          radiusKm:grid.radiusKm,center:grid.center},
        unitName:sourceUnit?.name??unitId,maximumAllowedGradePercent:currentProfile.maxGradePercent,
        blockedCells:blocked,
        terrainElevationProfileV155:crossSection,
        limitations:[...grid.limitations,
          "Local path and travelled cells are an editor exercise, never a campaign/war transaction."],
      },grid.worldCode+"-traversal-v154.json");
      setStatus("Exercice exporté en JSON ; aucun combattant de la partie n’a été déplacé.");
    }catch{setStatus("Export de l’exercice indisponible.");}
  };
  return <div className={styles.play} data-testid="planet-traversal-play-v154"
    data-world-code={grid.worldCode} data-unit-id={unitId} data-steps={session.steps}
    data-position={session.position?session.position.x+","+session.position.y:"none"}>
    <div className={styles.toolbar}>
      <label>Unité réelle du roster des clans
        <select data-testid="planet-traversal-unit-v154" value={unitId}
          onChange={event=>selectProfile(event.target.value as PlanetMobilityUnitIdV154)}>
          {PLANET_MOBILITY_PROFILES_V154.map(profile=><option key={profile.unitTypeId} value={profile.unitTypeId}>
            {profile.unitTypeId} · {warUnitV85(profile.unitTypeId)?.name??profile.unitTypeId}
          </option>)}
        </select>
      </label>
      <div className={styles.unitInfo} data-testid="planet-traversal-profile-v154">
        <strong>{sourceUnit?.name??unitId}</strong>
        <p>Limite de pente provisoire : {currentProfile.maxGradePercent} %.
          {sourceUnit?.terrain?" "+sourceUnit.terrain:""} Les obstacles d’eau ou de milieu restent infranchissables sans passage préalablement prévu.</p>
      </div>
    </div>
    <p>Départ : {territoryName}. Chaque case provient du raster géographique V150 de cette planète ; à cette résolution globale, elle peut représenter plusieurs kilomètres. Ce n’est pas encore une collision locale à l’échelle d’un personnage.</p>
    <div className={styles.gridScroll}>
      <div className={styles.board} role="group" aria-label="Carte interactive des passages et pentes"
        data-testid="planet-traversal-map-v154"
        style={{gridTemplateColumns:`repeat(${grid.width},minmax(22px,1fr))`}}>
        {grid.cells.map(cell=>{
          const position=session.position?.x===cell.x&&session.position.y===cell.y;
          const key=cell.x+","+cell.y;
          const passable=isTraversalCellPassableV154(cell,unitId);
          const planned=queued.has(key),wasHere=visited.has(key);
          return <button key={key} type="button" className={styles.tile}
            data-testid="planet-traversal-tile-v154" data-x={cell.x} data-y={cell.y}
            data-land={cell.land} data-passable={passable} data-region={cell.regionIndex}
            data-planned={planned} data-current={position}
            data-visited={wasHere} data-outside={cell.outside}
            aria-label={`Case ${cell.x}, ${cell.y} · ${cell.outside?"hors de la planète":!cell.land?"milieu non terrestre":cell.gradePercent.toFixed(2)+" pour cent de pente"}`}
            aria-current={position?"location":undefined}
            onClick={()=>plan(cell.x,cell.y)} title={`Altitude ${cell.elevationMeters} m · pente ${cell.gradePercent.toFixed(2)} %`}>
            {position?"◆":planned?"●":wasHere?"·":cell.outside?"":!cell.land?"≈":passable?"·":"▲"}
          </button>;
        })}
      </div>
    </div>
    <div className={styles.elevationSection} data-testid="planet-traversal-section-v155"
      data-points={crossSection.nodes.length} data-current-index={crossSection.currentNodeIndex}
      data-distance-km={crossSection.totalDistanceKm}>
      <strong>Profil d’altitude de l’itinéraire en cours</strong>
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} role="img"
        aria-label="Coupe du relief réel V150 sous le parcours choisi">
        <line x1={svgPadding} x2={svgWidth-svgPadding} y1={svgHeight-svgPadding}
          y2={svgHeight-svgPadding} stroke="#6d9884" strokeWidth="1"/>
        {area&&<path d={area} fill="#376451" fillOpacity=".6"/>}
        {line&&<polyline points={line} stroke="#d8d39d" fill="none"
          strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"/>}
        {marker&&<circle cx={marker.x} cy={marker.y} r={7}
          fill="#f6d793" stroke="#132923" strokeWidth="3"/>}
      </svg>
      <div className={styles.sectionFacts}>
        <span>{crossSection.nodes.length} point(s) du trajet</span>
        <span>Montée : {crossSection.ascentMeters.toLocaleString("fr-FR")} m</span>
        <span>Descente : {crossSection.descentMeters.toLocaleString("fr-FR")} m</span>
        <span>Altitude min./max. : {crossSection.minElevationMeters.toLocaleString("fr-FR")} / {crossSection.maxElevationMeters.toLocaleString("fr-FR")} m</span>
      </div>
      <p>Coupe verticale volontairement amplifiée pour être lisible. L’altitude provient du même raster V150 que les cases, sans relief fictif ajouté.</p>
    </div>
    <div className={styles.stats} data-testid="planet-traversal-stats-v154">
      <span>{grid.cells.length-blocked} case(s) praticables</span>
      <span>{blocked} obstacle(s) selon le profil</span>
      <span>{session.queued.length} étape(s) prévues</span>
      <span>{session.steps} pas accomplis</span>
      <span>{session.totalDistanceKm.toLocaleString("fr-FR")} km parcourus sur la carte</span>
    </div>
    <div className={styles.actions}>
      <button type="button" data-testid="planet-traversal-step-v154"
        disabled={!session.queued.length} onClick={advance}>Avancer d’une case</button>
      <button type="button" data-testid="planet-traversal-finish-v154"
        disabled={!session.queued.length} onClick={finish}>Parcourir l’itinéraire</button>
      <button type="button" data-testid="planet-traversal-reset-v154"
        onClick={reset}>Réinitialiser</button>
      <button type="button" data-testid="planet-traversal-json-v154"
        onClick={save}>Exporter l’exercice JSON</button>
    </div>
    <p className={styles.feedback} role="status" data-testid="planet-traversal-status-v154">{status}</p>
    <p>Code couleur : ◆ position du détachement, ● itinéraire préparé, ▲ pente infranchissable, ≈ milieu non terrestre. Les classes de mobilité sont des propositions originales à équilibrer par unité, et ne remplacent ni les transporteurs ni les liaisons militaires.</p>
  </div>;
}

export default function PlanetTraversalLabV154({planet,raster,slope,regionMask}:{
  planet:WarPlanetV96;raster:PlanetReliefRasterV150;
  slope:PlanetTerrainSlopeV152;regionMask:Uint8ClampedArray;
}) {
  const [territoryId,setTerritoryId]=useState(planet.territories[0]?.id??"");
  const territory=planet.territories.find(t=>t.id===territoryId)??planet.territories[0];
  const grid=useMemo(()=>territory?buildPlanetTraversalGridV154(raster,slope,regionMask,{
    worldCode:planet.id,longitude:territory.longitude,latitude:territory.latitude,
    width:19,height:13,samplePixels:1,
  }):null,[planet.id,territory,raster,slope,regionMask]);
  return <section className={styles.root} data-testid="planet-traversal-v154" data-world-code={planet.id}>
    <h5>Exercice interactif de franchissement des territoires</h5>
    <p>Prototype jouable isolé : choisir une unité Yautja existante, cliquer une destination et franchir les cases autorisées sans traverser artificiellement les mers, parois ou pentes impossibles.</p>
    {territory&&<label>Terrain territorial de départ
      <select data-testid="planet-traversal-territory-v154" value={territoryId}
        onChange={event=>setTerritoryId(event.target.value)}>
        {planet.territories.map(t=><option key={t.id} value={t.id}>
          {t.id} · {planet.definitions.find(item=>item.id===t.id)?.name??t.regionId}
        </option>)}
      </select>
    </label>}
    {grid?<WalkOnPlanetV154 key={planet.id+"-"+territoryId+"-"+raster.width}
      grid={grid} territoryName={territory?.id??""}/>:<p>Aucun territoire accessible pour cet exercice.</p>}
  </section>;
}
