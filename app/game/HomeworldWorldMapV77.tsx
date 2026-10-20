import {useCallback,useEffect,useLayoutEffect,useMemo,useRef,useState} from 'react';
import type {SaveGame} from './types';
import {createHomeworldGamepadState,stepHomeworldGamepad,nextHomeworldDialogChoice} from './systems/homeworldInput';
import {HOMEWORLD_LEVELS_V77,HOMEWORLD_GROUND_V77,HOMEWORLD_CONNECTOR_PADS_V82,HOMEWORLD_DISTRICTS_V77,HOMEWORLD_CONNECTORS_V77,HOMEWORLD_REGIONAL_DOCKS_V77,HOMEWORLD_WORLD_V77,HOMEWORLD_BUILDINGS_V77,HOMEWORLD_CONNECTIONS_V77,type HomeworldLevelV77} from './systems/homeworldWorldV77';
import {HOMEWORLD_URBAN_GROUND_V78} from './systems/homeworldUrbanLayoutV78';
import {HOMEWORLD_URBAN_FACADES_V78,homeworldUrbanFacadePlacementV78} from './systems/homeworldUrbanFacadesV78';
import {homeworldBuildingGroundFrameV76,homeworldBuildingFootprintV64,homeworldBuildingDoorwayV64} from './systems/homeworldGeometryV64';
import {homeworldInteriorForPointV64} from './systems/homeworldInteriorsV64';
import {homeworldAtlasLandmarksV83,homeworldAtlasTargetV83,homeworldAtlasSearchV83,homeworldAtlasFloorLinksV83} from './systems/homeworldAtlasLandmarksV83';
import {homeworldRouteGuidanceV98,type HomeworldRoutePlanV98} from './systems/homeworldWayfindingV98';
import {homeworldWayfindingMetresV75,homeworldWayfindingRecommendedV75} from './systems/homeworldWayfindingV75';
import HomeworldRouteGuideV98 from './HomeworldRouteGuideV98';
import routeStyles from './HomeworldRouteGuideV98.module.css';
const footprint=(building:typeof HOMEWORLD_BUILDINGS_V77[number])=>{
 const native=homeworldBuildingGroundFrameV76(building);if(native)return native.polygon;
 const b=homeworldBuildingFootprintV64(building);return[{x:b.left,y:b.top},{x:b.right,y:b.top},{x:b.right,y:b.bottom},{x:b.left,y:b.bottom}];
};
/** Read-only multi-floor atlas. Level tabs inspect a floor; they never move the
 * actor, grant an audience, unlock travel, or write discovery/save data. */
export default function HomeworldWorldMapV77({actor,levelId,interiorId=null,open,disabled=false,routeSuspended=false,interactionShortcut='E / A',targetId,targetNonce,save,onOpenChange}:{actor:{x:number;y:number};levelId:HomeworldLevelV77;interiorId?:string|null;open:boolean;disabled?:boolean;routeSuspended?:boolean;interactionShortcut?:string;targetId?:string;targetNonce?:number;save?:SaveGame;onOpenChange(open:boolean):void}){
 const [selected,setSelected]=useState(levelId),[inspected,setInspected]=useState<string|null>(null),[query,setQuery]=useState(''),[chosenId,setChosenId]=useState<string|null>(null),ref=useRef<HTMLDivElement>(null);
 const [plan,setPlan]=useState<HomeworldRoutePlanV98|null>(null),[routeNotice,setRouteNotice]=useState('');
 const [planning,setPlanning]=useState(false),workerRef=useRef<Worker|null>(null),workerBusy=useRef(false),planningRevision=useRef(0);
 const workerOwner=useRef<string|null>(null),pendingTarget=useRef<string|null>(null);
 const [routeOrigin,setRouteOrigin]=useState({actor,levelId,interiorId});
 const live=useRef({actor,levelId,interiorId,save,onOpenChange,open});
 useLayoutEffect(()=>{live.current={actor,levelId,interiorId,save,onOpenChange,open};},[actor,levelId,interiorId,save,onOpenChange,open]);
 const landmarks=useMemo(()=>homeworldAtlasLandmarksV83(save),[save]),requested=homeworldAtlasTargetV83(landmarks,targetId);
 const requestedId=requested?.id,requestedLevel=requested?.levelId,requestedBuilding=requested?.buildingId;
 const filtered=useMemo(()=>homeworldAtlasSearchV83(landmarks,query),[landmarks,query]);
 const preferred=homeworldAtlasTargetV83(landmarks,chosenId)??requested;
 const chosen=filtered.find(record=>record.id===preferred?.id)??(query.trim()?filtered[0]:preferred);
 const links=chosen?homeworldAtlasFloorLinksV83(levelId,chosen.levelId):null;
 const visibleRegionIds=new Set(landmarks.filter(record=>record.regionId).map(record=>record.regionId));
 const buildings=HOMEWORLD_BUILDINGS_V77.filter(b=>b.levelId===selected),detail=buildings.find(b=>b.id===inspected);
 const activeTarget=plan?.ownerCreatedAt===save?.createdAt?homeworldAtlasTargetV83(landmarks,plan?.destinationId):null;
 const activePlan=activeTarget&&activeTarget.access!=='locked'&&plan?.status==='reachable'?plan:null;
 const guidance=useMemo(()=>activePlan?homeworldRouteGuidanceV98(activePlan,routeOrigin):null,[activePlan,routeOrigin]);
 const actualBuilding=interiorId?HOMEWORLD_BUILDINGS_V77.find(building=>building.id===interiorId):null;
 const mapActor=actualBuilding?homeworldBuildingDoorwayV64(actualBuilding).approach:actor;
 const cancelPlanning=useCallback(()=>{planningRevision.current++;workerRef.current?.terminate();workerRef.current=null;workerBusy.current=false;pendingTarget.current=null;setPlanning(false);},[]);
 useEffect(()=>()=>{planningRevision.current++;workerRef.current?.terminate();},[]);
 const prepare=useCallback((id:string,close:boolean)=>{
  const current=live.current;if(!current.save)return;
  const revision=++planningRevision.current;if(workerBusy.current){workerRef.current?.terminate();workerRef.current=null;}workerBusy.current=true;setPlanning(true);setRouteNotice('Calcul des passages sûrs en cours…');
  const origin={actor:current.actor,levelId:current.levelId,interiorId:current.interiorId},owner=current.save.createdAt;
  workerOwner.current=owner;pendingTarget.current=id;
  const failed=()=>{if(revision!==planningRevision.current)return;workerRef.current?.terminate();workerRef.current=null;workerBusy.current=false;setPlanning(false);setRouteNotice('Calcul indisponible. Réessaie depuis une rue ou un palier.');};
  try{
   const worker=workerRef.current??new Worker(new URL('./homeworldRouteWorkerV98.ts',import.meta.url),{type:'module'});workerRef.current=worker;
   worker.addEventListener('error',failed,{once:true});
   worker.addEventListener('message',(event:MessageEvent<{plan?:HomeworldRoutePlanV98;error?:string}>)=>{
    if(revision!==planningRevision.current)return;
    worker.removeEventListener('error',failed);
    workerBusy.current=false;pendingTarget.current=null;setPlanning(false);
    const next=event.data.plan,latest=live.current;
    if(!next||event.data.error){setRouteNotice(event.data.error??'Calcul du passage indisponible.');return;}
    if(latest.save?.createdAt!==owner||next.ownerCreatedAt!==owner||latest.levelId!==origin.levelId||latest.interiorId!==origin.interiorId){setRouteNotice('Ton lieu a changé pendant le calcul. Recalcule depuis ta position actuelle.');return;}
    const stillAllowed=homeworldAtlasTargetV83(homeworldAtlasLandmarksV83(latest.save),next.destinationId);
    if(!stillAllowed||stillAllowed.access==='locked'){setRouteNotice('Ce repère a changé de disponibilité. Consulte les conditions de ta partie.');return;}
    setPlan(next);setRouteOrigin({actor:latest.actor,levelId:latest.levelId,interiorId:latest.interiorId});
    setRouteNotice(next.status==='reachable'?'Itinéraire prêt. Suis le repère à pied et interagis aux portes et aux paliers.':next.reason);
    if(next.status==='reachable'&&close&&latest.open)latest.onOpenChange(false);
   },{once:true});
   worker.postMessage({save:current.save,origin,destinationId:id});
  }catch{failed();}
 },[]);
 useEffect(()=>{
  const pending=pendingTarget.current?homeworldAtlasTargetV83(landmarks,pendingTarget.current):null;
  const ownerChanged=!!workerOwner.current&&workerOwner.current!==save?.createdAt;
  if(!workerRef.current||!ownerChanged&&!routeSuspended&&(!workerBusy.current||pending&&pending.access!=='locked'))return;
  const frame=requestAnimationFrame(()=>{cancelPlanning();if(ownerChanged){setPlan(null);setRouteNotice('');}else setRouteNotice('Calcul suspendu. Recalcule lorsque tu reprends la marche.');});
  return()=>cancelAnimationFrame(frame);
 },[save?.createdAt,landmarks,routeSuspended,cancelPlanning]);
 const previousOpen=useRef(open);
 useEffect(()=>{
  const closed=previousOpen.current&&!open;previousOpen.current=open;
  if(!closed||!workerBusy.current)return;
  const frame=requestAnimationFrame(()=>{cancelPlanning();setRouteNotice('Calcul annulé.');});return()=>cancelAnimationFrame(frame);
 },[open,cancelPlanning]);
 const originSpace=levelId+':'+(interiorId??'street'),plannedSpace=useRef(originSpace);
 useEffect(()=>{
  if(!plan)return;
  const ownerChanged=plan.ownerCreatedAt!==save?.createdAt;
  if(ownerChanged||!activeTarget||activeTarget.access==='locked'){
   const frame=requestAnimationFrame(()=>{setPlan(null);setRouteNotice(ownerChanged?'':'Ce repère a changé de disponibilité. Consulte les conditions de ta partie.');});
   return()=>cancelAnimationFrame(frame);
  }
  if(plannedSpace.current===originSpace||routeSuspended)return;
  const frame=requestAnimationFrame(()=>{plannedSpace.current=originSpace;prepare(plan.destinationId,false);});
  return()=>cancelAnimationFrame(frame);
 },[plan,save?.createdAt,activeTarget,originSpace,routeSuspended,prepare]);
 useEffect(()=>{
  if(!activePlan||open||routeSuspended)return;
  const update=()=>{const current=live.current;setRouteOrigin({actor:current.actor,levelId:current.levelId,interiorId:current.interiorId});};
  const frame=requestAnimationFrame(update),timer=window.setInterval(update,350);
  return()=>{cancelAnimationFrame(frame);window.clearInterval(timer);};
 },[activePlan,open,routeSuspended]);
 useEffect(()=>{if(open)ref.current?.focus({preventScroll:true});},[open]);
 const processedRequest=useRef<string|number|undefined>(undefined),requestKey=targetNonce??targetId;
 useEffect(()=>{if(!open||!requestedId||!requestedLevel||processedRequest.current===requestKey)return;const frame=requestAnimationFrame(()=>{processedRequest.current=requestKey;cancelPlanning();setQuery('');setChosenId(requestedId);setSelected(requestedLevel);setInspected(requestedBuilding??null);});return()=>cancelAnimationFrame(frame);},[open,requestedId,requestedLevel,requestedBuilding,requestKey,cancelPlanning]);
 useEffect(()=>{if(!open)return;let request=0,state=createHomeworldGamepadState();const frame=()=>{
  if(document.hasFocus()&&ref.current?.contains(document.activeElement)){
   let pad:Gamepad|null=null;
   try{pad=[...(navigator.getGamepads?.()??[])].find(p=>p?.connected)??null;}catch{/* The atlas still accepts keyboard/pointer controls. */}
   const result=stepHomeworldGamepad(state,pad,'dialog');state=result.state;
   const buttons=[...(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled)')??[])],index=buttons.indexOf(document.activeElement as HTMLElement);
   if(result.actions.cancel){onOpenChange(false);return;}if(result.actions.menuDirection&&buttons.length)buttons[nextHomeworldDialogChoice(index,buttons.length,result.actions.menuDirection)]?.focus();
   if(result.actions.confirm)(buttons.find(b=>b===document.activeElement)??buttons[0])?.click();
  }request=requestAnimationFrame(frame);
 };request=requestAnimationFrame(frame);return()=>cancelAnimationFrame(request);},[open,onOpenChange]);
 return <><button type="button" data-world-atlas-button-v77="true" disabled={disabled} style={{position:'absolute',right:18,top:128,zIndex:7,minHeight:44,padding:'8px 12px',background:'#10171ceb',border:'1px solid #9d8757',borderRadius:5,color:'#e7d39b',font:'11px system-ui'}} onClick={()=>{setSelected(levelId);onOpenChange(true);}}>Atlas de la cité · {levelId}</button>
 {!open&&activeTarget&&guidance&&<HomeworldRouteGuideV98 label={activeTarget.label} targetId={activeTarget.id} guidance={guidance} interactionShortcut={interactionShortcut} suspended={routeSuspended} calculating={planning} onRecalculate={()=>prepare(activeTarget.id,false)} onChange={()=>{setChosenId(activeTarget.id);setSelected(levelId);onOpenChange(true);}} onClear={()=>{cancelPlanning();setPlan(null);setRouteNotice('');}}/>}
 {open&&<div data-homeworld-spatial-codex="v77" style={{position:'absolute',inset:0,zIndex:18000,background:'#100e0cEE',padding:20,color:'#e0c79a',boxSizing:'border-box',overflowY:'auto'}}>
  <div ref={ref} role="dialog" aria-modal="true" aria-label="Carte des étages de la cité" tabIndex={-1} onKeyDown={event=>{event.stopPropagation();if(event.key==='Escape')onOpenChange(false);if(event.key==='Tab'){const buttons=[...(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled)')??[])],i=buttons.indexOf(document.activeElement as HTMLElement);if(buttons.length){event.preventDefault();buttons[(i+(event.shiftKey?-1:1)+buttons.length)%buttons.length]?.focus();}}}}>
   <button type="button" onClick={()=>onOpenChange(false)}>Fermer la carte</button><p>Position réelle : {levelId}. Les onglets consultent la carte ; ils ne changent pas d’étage.</p>{targetId&&<p>Repère demandé : {requested?.label??'Ce repère ne fait pas partie du registre visible de ta partie.'}</p>}
   <label style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>Registre de la cité<input aria-label="Rechercher un lieu, service ou interlocuteur" type="search" value={query} onChange={event=>{cancelPlanning();setQuery(event.target.value);}} placeholder="Forge, maître, soins, clans…" style={{minHeight:44,padding:'6px 10px',background:'#201b14',color:'#f1dfb9',border:'1px solid #ad8b55',fontSize:16,maxWidth:'100%'}}/>{save&&<button type="button" style={{minHeight:44}} onClick={()=>{const objective=homeworldAtlasTargetV83(landmarks,homeworldWayfindingRecommendedV75(save));if(objective){cancelPlanning();setQuery('');setChosenId(objective.id);setSelected(objective.levelId);setInspected(objective.buildingId);}}}>Objectif actuel</button>}</label>
   <nav aria-label="Repères de tous les étages" data-homeworld-landmark-register-v83="true" style={{display:'flex',flexWrap:'wrap',gap:6,maxHeight:'18vh',overflowY:'auto',margin:'10px 0'}}>
    {filtered.map(record=><button key={record.id} type="button" aria-pressed={chosen?.id===record.id} data-map-landmark-v83={record.id} style={{minHeight:44}} onClick={()=>{cancelPlanning();setRouteNotice('');setChosenId(record.id);setSelected(record.levelId);setInspected(record.buildingId);}}>{record.label} · {record.levelId}{record.access==='locked'?' · fermé':record.access==='restricted'?' · activité réservée':''}</button>)}
    {!filtered.length&&<p>Aucun repère visible ne correspond à cette recherche.</p>}
   </nav>
   {chosen&&<section aria-label="Repère choisi" data-map-landmark-detail-v83={chosen.id}>
    <strong>{chosen.label} · {chosen.levelId} · {chosen.district}</strong><p>{chosen.detail} {chosen.reason}</p>
    <p>{chosen.levelId===levelId?'Ce lieu se trouve à ton étage. Rejoins sa porte ou son seuil à pied.':links?.length?`Raccords entre étages : ${links.map(link=>`${link.name} (${link.from} → ${link.to})`).join(' · ')}.`:'Aucun raccord entre ces étages n’est indiqué.'} Les repères bleus indiquent les paliers. Interagis sur place ; cette consultation ne déplace pas le joueur.</p>
    {save&&<div className={routeStyles.plan} data-homeworld-route-planner-v98={chosen.id} aria-busy={planning}><button type="button" disabled={disabled||planning||chosen.access==='locked'} onClick={()=>{plannedSpace.current=originSpace;prepare(chosen.id,true);}}>Suivre ce repère à pied</button>{planning&&<button type="button" onClick={()=>{cancelPlanning();setRouteNotice('Calcul annulé.');}}>Annuler le calcul</button>}
     <p>{chosen.access==='locked'?chosen.reason:'Le trajet respecte les obstacles, les vraies portes et les raccords entre étages. Il reste affiché après fermeture de la carte.'}</p>
     {activePlan?.destinationId===chosen.id&&<p>{homeworldWayfindingMetresV75(activePlan.distance)} m de marche calculée · {activePlan.stages.filter(stage=>stage.kind==='connector').length} raccord(s) entre étages.</p>}
    </div>}
   </section>}
   {routeNotice&&<p role="status" data-homeworld-route-notice-v98={plan?.status}>{routeNotice}</p>}
   <nav aria-label="Niveaux de la cité" style={{display:'flex',flexWrap:'wrap',gap:8}}>{HOMEWORLD_LEVELS_V77.map(level=><button key={level.id} type="button" style={{minHeight:44}} aria-pressed={selected===level.id} onClick={()=>{setSelected(level.id);setInspected(null);}}>{level.id} · {level.name}</button>)}</nav>
   <svg viewBox={`0 0 ${HOMEWORLD_WORLD_V77.width} ${HOMEWORLD_WORLD_V77.height}`} style={{width:'100%',maxHeight:'46vh'}} role="img" aria-label={'Plan du niveau '+selected}>
    {[...HOMEWORLD_GROUND_V77,...HOMEWORLD_CONNECTOR_PADS_V82,...HOMEWORLD_URBAN_GROUND_V78].filter(g=>g.levelId===selected).map(g=><polygon key={g.id} points={g.polygon.map(p=>`${p.x},${p.y}`).join(' ')} fill="#39362a" stroke="#706146" strokeWidth="5"><title>{g.id}</title></polygon>)}
    {HOMEWORLD_DISTRICTS_V77.filter(d=>d.levelId===selected).map(d=><polygon key={d.id} points={d.polygon.map(p=>`${p.x},${p.y}`).join(' ')} fill="#715d3b55" stroke="#d0b683" strokeWidth="12"><title>{d.name}</title></polygon>)}
    {buildings.map(b=>{const door=homeworldBuildingDoorwayV64(b).threshold,active=b.id===inspected||chosen?.buildingId===b.id||(targetId&&homeworldInteriorForPointV64(targetId)?.buildingId===b.id);return <g key={b.id} data-map-real-building-v81={b.id}>
     <polygon points={footprint(b).map(p=>`${p.x},${p.y}`).join(' ')} fill={active?'#d4aa54':'#796d56'} stroke={active?'#fff2b8':'#cdb990'} strokeWidth={active?20:8}><title>{`${b.label} · entrée réelle · ${b.entranceKind}`}</title></polygon>
     <circle data-map-real-door-v81={b.id} cx={door.x} cy={door.y} r={active?44:30} fill="#df886a"><title>{`Porte de ${b.label}`}</title></circle>
    </g>;})}
    {HOMEWORLD_URBAN_FACADES_V78.filter(f=>f.levelId===selected).map(f=><polygon key={f.id} data-map-scenery-facade-v78={f.id} points={homeworldUrbanFacadePlacementV78(f).footprint.map(p=>`${p.x},${p.y}`).join(' ')} fill="#574739" stroke="#b9a385" strokeWidth="8"><title>{`${f.label} · bâtiment fermé, sans service interactif`}</title></polygon>)}
    {HOMEWORLD_CONNECTORS_V77.flatMap(c=>[c.from,c.to].filter(side=>side.levelId===selected).map((side,i)=><circle key={c.id+':'+i} data-map-connector-v77={c.id} cx={side.point.x} cy={side.point.y} r="65" fill="#9fcacd"><title>{`${c.name} · ${c.from.levelId} ↔ ${c.to.levelId}`}</title></circle>))}
    {HOMEWORLD_REGIONAL_DOCKS_V77.filter(dock=>dock.levelId===selected&&visibleRegionIds.has(dock.regionId)).map(dock=><circle key={dock.regionId} cx={dock.point.x} cy={dock.point.y} r="85" fill="#e7a365"><title>{dock.name}</title></circle>)}
    {HOMEWORLD_CONNECTIONS_V77.filter(c=>c.levelId===selected&&visibleRegionIds.has(c.regionId)).map(c=><g key={c.regionId} data-map-geographic-route-v81={c.regionId}>
     <polyline points={c.nodes.map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke="#e7a365" strokeWidth="14" strokeDasharray="36 18"/>
     <circle cx={c.threshold.x} cy={c.threshold.y} r="65" fill="#e7a365"><title>{`${c.regionId} · chemin physique vers la région`}</title></circle>
    </g>)}
    {chosen&&chosen.levelId===selected&&<g data-map-chosen-landmark-v83={chosen.id}><circle cx={chosen.position.x} cy={chosen.position.y} r="100" fill="none" stroke="#fff0a4" strokeWidth="14"/><circle cx={chosen.position.x} cy={chosen.position.y} r="32" fill="#fff0a4"><title>{`${chosen.label} · repère physique, sans déplacement`}</title></circle></g>}
    {activePlan&&<g data-homeworld-route-map-v98="true" pointerEvents="none">{activePlan.stages.filter(stage=>stage.levelId===selected&&!stage.interiorId).map((stage,index)=><polyline key={index} points={stage.points.map(point=>`${point.x},${point.y}`).join(' ')} fill="none" stroke="#9cfff0" strokeWidth="24" strokeLinecap="round" strokeLinejoin="round"><title>Itinéraire à pied : {stage.instruction}</title></polyline>)}</g>}
    {selected===levelId&&<circle cx={mapActor.x} cy={mapActor.y} r="80" fill="#fff2cf"><title>{interiorId?'Ta position : dans le bâtiment':'Ta position réelle'}</title></circle>}
   </svg>
   <p style={{fontSize:12}}>Dallage : passages et cours. Bâtiments clairs : lieux visitables, avec leur véritable emprise. Rouge : porte. Brun sombre : façades fermées de décor. Bleu : raccord entre étages. Orange : route régionale. Turquoise : itinéraire suivi. Blanc : ta position.</p>
   <nav aria-label="Lieux visitables de cet étage" style={{display:'flex',flexWrap:'wrap',gap:6}}>{buildings.map(b=><button key={b.id} type="button" aria-pressed={inspected===b.id} onClick={()=>setInspected(b.id)} style={{minHeight:44}}>{b.label}</button>)}</nav>
   {detail&&<p data-map-building-detail-v81={detail.id}>{detail.label} · {detail.entranceKind==='domestic'?'Habitation':'Lieu public'} · porte au niveau {detail.levelId}. Rejoins ce repère à pied : l’atlas ne déplace jamais le joueur.</p>}
   <ul>{HOMEWORLD_CONNECTORS_V77.filter(c=>c.from.levelId===selected||c.to.levelId===selected).map(c=><li key={c.id}>{c.name} : {c.from.levelId} ↔ {c.to.levelId}</li>)}</ul>
  </div></div>}</>;
}
