"use client";

import {useEffect,useRef,useState} from 'react';
import HomeworldWorldSceneV77 from '../game/HomeworldWorldSceneV77';
import {HOMEWORLD_ECOTONES_V90,type HomeworldEcotoneV90} from '../game/systems/homeworldEcotonesV90';
import {HOMEWORLD_CONNECTIONS_V77,HOMEWORLD_REGIONAL_DOCKS_V77,HOMEWORLD_LEVELS_V77,HOMEWORLD_WORLD_V77,
 homeworldCameraWorldV77,homeworldLevelV77,homeworldWalkableV77,projectHomeworldWorldV77,type HomeworldLevelV77} from '../game/systems/homeworldWorldV77';
import {HOMEWORLD_GEOMETRY_V64} from '../game/systems/homeworldGeometryV64';
import styles from './visual-qa.module.css';

export interface VisualQaFixtureV90 {
 readonly id:string;readonly label:string;readonly patch:HomeworldEcotoneV90;
 readonly anchor:{x:number;y:number};readonly arrival:{x:number;y:number};readonly levelId:HomeworldLevelV77;
}
/** Coordinates come from admitted current V90 records, not fabricated travel. */
export const VISUAL_QA_FIXTURES_V90:readonly VisualQaFixtureV90[]=HOMEWORLD_ECOTONES_V90.map(patch=>({
 id:patch.id,label:patch.regionId?(HOMEWORLD_CONNECTIONS_V77.find(g=>g.regionId===patch.regionId)?.name??
  HOMEWORLD_REGIONAL_DOCKS_V77.find(d=>d.regionId===patch.regionId)?.name??patch.regionId):`Plateau · ${patch.id.split(':').at(-1)}`,
 patch,anchor:{x:patch.x,y:patch.y},arrival:{...patch.arrival},levelId:patch.levelId,
}));

type ActorPointV90='arrival'|'anchor';
type CameraModeV90='follow'|'panorama'|'detail';
const magnification:Readonly<Record<CameraModeV90,number>>={follow:1,panorama:.45,detail:1.25};

/** Same projection and camera function as the Hub. The panorama changes only
 * the observing viewport; no ground, collider, actor or permission is created. */
export function visualQaSceneViewV90(fixture:VisualQaFixtureV90,actorPoint:ActorPointV90,levelId:HomeworldLevelV77,
 viewport:{width:number;height:number},mode:CameraModeV90,pan:{x:number;y:number}){
 const actor=actorPoint==='arrival'?fixture.arrival:fixture.anchor,factor=magnification[mode];
 const native=homeworldCameraWorldV77(actor,levelId,{width:viewport.width/factor,height:viewport.height/factor});
 return{actor,projectedActor:projectHomeworldWorldV77(actor,levelId),camera:{...native,x:native.x+pan.x,y:native.y+pan.y,zoom:native.zoom*factor},
  supportedByExistingModel:homeworldWalkableV77(levelId,actor)};
}

export default function VisualQaV90(){
 const [fixtureId,setFixtureId]=useState(VISUAL_QA_FIXTURES_V90[0].id),[actorPoint,setActorPoint]=useState<ActorPointV90>('arrival');
 const [levelOverride,setLevelOverride]=useState<HomeworldLevelV77|null>(null),[cameraMode,setCameraMode]=useState<CameraModeV90>('follow');
 const [pan,setPan]=useState({x:0,y:0}),[seconds,setSeconds]=useState(0),[showMarker,setShowMarker]=useState(false);
 const [viewport,setViewport]=useState({width:1280,height:720});
 const viewportRef=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const host=viewportRef.current;if(!host)return;
  const observer=new ResizeObserver(entries=>{const rect=entries[0]?.contentRect;if(!rect)return;
   const width=Math.max(1,Math.round(rect.width)),height=Math.max(1,Math.round(rect.height));
   setViewport(previous=>previous.width===width&&previous.height===height?previous:{width,height});
  });observer.observe(host);return()=>observer.disconnect();
 },[]);
 const fixture=VISUAL_QA_FIXTURES_V90.find(item=>item.id===fixtureId)??VISUAL_QA_FIXTURES_V90[0],levelId=levelOverride??fixture.levelId;
 const {actor,projectedActor,camera,supportedByExistingModel}=visualQaSceneViewV90(fixture,actorPoint,levelId,viewport,cameraMode,pan);
 const selectFixture=(id:string)=>{if(!VISUAL_QA_FIXTURES_V90.some(item=>item.id===id))return;setFixtureId(id);setActorPoint('arrival');setLevelOverride(null);setPan({x:0,y:0});};
 return <main className={styles.root} data-local-visual-qa-v90="synthetic-readonly">
  <header className={styles.banner}><strong>QA visuelle synthétique · aucune sauvegarde/campagne</strong>
   <p>Vraie scène HomeworldWorldSceneV77 et sprites natifs. Ce cadrage ne prouve ni parcours, ni accès régional, ni intérieur, ni progression.</p></header>
  <section className={styles.controls} aria-label="Contrôles locaux de composition">
   <label>Ancre V90<select value={fixtureId} onChange={event=>selectFixture(event.target.value)} data-visual-qa-fixture>
    <optgroup label="Sept entrées régionales admises">{VISUAL_QA_FIXTURES_V90.filter(item=>item.patch.regionId).map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</optgroup>
    <optgroup label="Quatre écotones de plateau">{VISUAL_QA_FIXTURES_V90.filter(item=>!item.patch.regionId).map(item=><option key={item.id} value={item.id}>{item.label}</option>)}</optgroup>
   </select></label>
   <label>Position modèle<select value={actorPoint} onChange={event=>{if(event.target.value==='arrival'||event.target.value==='anchor')setActorPoint(event.target.value);}} data-visual-qa-actor>
    <option value="arrival">Arrivée existante</option><option value="anchor">Seuil / ancre existante</option></select></label>
   <label>Étage observé<select value={levelOverride??'anchor'} onChange={event=>{const value=event.target.value;if(value==='anchor')setLevelOverride(null);
    else if(HOMEWORLD_LEVELS_V77.some(item=>item.id===value))setLevelOverride(value as HomeworldLevelV77);}} data-visual-qa-level>
    <option value="anchor">Ancre réelle · {fixture.levelId}</option>{HOMEWORLD_LEVELS_V77.map(item=><option key={item.id} value={item.id}>{item.id} · {item.name}</option>)}</select></label>
   <label>Caméra<select value={cameraMode} onChange={event=>{const value=event.target.value;if(value==='follow'||value==='panorama'||value==='detail')setCameraMode(value);}} data-visual-qa-camera>
    <option value="follow">Cadrage natif du Hub</option><option value="panorama">Panorama · ×0,45</option><option value="detail">Détail · ×1,25</option></select></label>
   <label>Instant des routines · {seconds} s<input type="range" min="0" max="180" step="1" value={seconds} onChange={event=>setSeconds(Number(event.target.value))}/></label>
   <label className={styles.checkbox}><input type="checkbox" checked={showMarker} onChange={event=>setShowMarker(event.target.checked)}/>Repère synthétique de position</label>
   <div className={styles.pan} aria-label="Déplacer seulement la caméra">
    <button type="button" onClick={()=>setPan(previous=>({...previous,x:previous.x-240}))}>←</button>
    <button type="button" onClick={()=>setPan(previous=>({...previous,y:previous.y-160}))}>↑</button>
    <button type="button" onClick={()=>setPan({x:0,y:0})}>Recentrer</button>
    <button type="button" onClick={()=>setPan(previous=>({...previous,y:previous.y+160}))}>↓</button>
    <button type="button" onClick={()=>setPan(previous=>({...previous,x:previous.x+240}))}>→</button>
   </div>
  </section>
  <p className={styles.record} data-visual-qa-anchor={fixture.patch.anchorElementId} data-visual-qa-supported={supportedByExistingModel}>
   {fixture.patch.anchorElementId} · modèle ({actor.x}, {actor.y}) · étage {levelId} · élévation {homeworldLevelV77(levelId).elevation} · caméra ({Math.round(camera.x)}, {Math.round(camera.y)})
   <br/>{supportedByExistingModel?'Le modèle existant admet cette position ; cela ne constitue pas un test de traversabilité.':'Position non admise sur cet étage : comparaison visuelle uniquement, sans déplacement de personnage.'}
  </p>
  <div ref={viewportRef} className={styles.viewport} data-visual-qa-viewport data-visual-qa-renderer="HomeworldWorldSceneV77" data-visual-qa-level-id={levelId}>
   <div className={styles.world} style={{width:HOMEWORLD_WORLD_V77.width,height:HOMEWORLD_WORLD_V77.height*HOMEWORLD_GEOMETRY_V64.depthScale,
    transform:`translate(${-camera.x*camera.zoom}px,${-camera.y*camera.zoom}px) scale(${camera.zoom})`}}>
    <HomeworldWorldSceneV77 actor={actor} levelId={levelId} camera={camera} seconds={seconds} activeDoorId={null} activePointId={null}
     youthWelcome={false} skiffActive={false} reducedMotion={true} transit={null} liftStateV83={null}/>
    {showMarker&&<span className={styles.marker} style={{left:projectedActor.x,top:projectedActor.y}}>Position modèle · QA</span>}
   </div>
  </div>
  <p className={styles.note}>{fixture.patch.note} Matériau : {fixture.patch.materialId}. Variations originales du plateau volcanique ; aucune carte canonique 1:1 affirmée. Les trois candidats refusés ne sont pas réintroduits.</p>
 </main>;
}
