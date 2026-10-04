import {useEffect,useMemo,useRef,useState} from 'react';
import type {SaveGame} from './types';
import {createHomeworldGamepadState,stepHomeworldGamepad,nextHomeworldDialogChoice} from './systems/homeworldInput';
import {HOMEWORLD_LEVELS_V77,HOMEWORLD_GROUND_V77,HOMEWORLD_CONNECTOR_PADS_V82,HOMEWORLD_DISTRICTS_V77,HOMEWORLD_CONNECTORS_V77,HOMEWORLD_REGIONAL_DOCKS_V77,HOMEWORLD_WORLD_V77,HOMEWORLD_BUILDINGS_V77,HOMEWORLD_CONNECTIONS_V77,type HomeworldLevelV77} from './systems/homeworldWorldV77';
import {HOMEWORLD_URBAN_GROUND_V78} from './systems/homeworldUrbanLayoutV78';
import {HOMEWORLD_URBAN_FACADES_V78,homeworldUrbanFacadePlacementV78} from './systems/homeworldUrbanFacadesV78';
import {homeworldBuildingGroundFrameV76,homeworldBuildingFootprintV64,homeworldBuildingDoorwayV64} from './systems/homeworldGeometryV64';
import {homeworldInteriorForPointV64} from './systems/homeworldInteriorsV64';
import {homeworldAtlasLandmarksV83,homeworldAtlasTargetV83,homeworldAtlasSearchV83,homeworldAtlasFloorLinksV83} from './systems/homeworldAtlasLandmarksV83';
const footprint=(building:typeof HOMEWORLD_BUILDINGS_V77[number])=>{
 const native=homeworldBuildingGroundFrameV76(building);if(native)return native.polygon;
 const b=homeworldBuildingFootprintV64(building);return[{x:b.left,y:b.top},{x:b.right,y:b.top},{x:b.right,y:b.bottom},{x:b.left,y:b.bottom}];
};
/** Read-only multi-floor atlas. Level tabs inspect a floor; they never move the
 * actor, grant an audience, unlock travel, or write discovery/save data. */
export default function HomeworldWorldMapV77({actor,levelId,open,disabled=false,targetId,save,onOpenChange}:{actor:{x:number;y:number};levelId:HomeworldLevelV77;open:boolean;disabled?:boolean;targetId?:string;save?:SaveGame;onOpenChange(open:boolean):void}){
 const [selected,setSelected]=useState(levelId),[inspected,setInspected]=useState<string|null>(null),[query,setQuery]=useState(''),[chosenId,setChosenId]=useState<string|null>(null),ref=useRef<HTMLDivElement>(null);
 const landmarks=useMemo(()=>homeworldAtlasLandmarksV83(save),[save]),requested=homeworldAtlasTargetV83(landmarks,targetId);
 const chosen=homeworldAtlasTargetV83(landmarks,chosenId)??requested,filtered=useMemo(()=>homeworldAtlasSearchV83(landmarks,query),[landmarks,query]);
 const links=chosen?homeworldAtlasFloorLinksV83(levelId,chosen.levelId):null;
 const visibleRegionIds=new Set(landmarks.filter(record=>record.regionId).map(record=>record.regionId));
 const buildings=HOMEWORLD_BUILDINGS_V77.filter(b=>b.levelId===selected),detail=buildings.find(b=>b.id===inspected);
 useEffect(()=>{if(open)ref.current?.focus({preventScroll:true});},[open]);
 useEffect(()=>{if(!open||!requested)return;const frame=requestAnimationFrame(()=>{setChosenId(requested.id);setSelected(requested.levelId);setInspected(requested.buildingId);});return()=>cancelAnimationFrame(frame);},[open,requested?.id,requested?.levelId,requested?.buildingId]);
 useEffect(()=>{if(!open)return;let request=0,state=createHomeworldGamepadState();const frame=()=>{
  if(document.hasFocus()&&ref.current?.contains(document.activeElement)){
   const pad=[...(navigator.getGamepads?.()??[])].find(p=>p?.connected)??null,result=stepHomeworldGamepad(state,pad,'dialog');state=result.state;
   const buttons=[...(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled)')??[])],index=buttons.indexOf(document.activeElement as HTMLElement);
   if(result.actions.cancel){onOpenChange(false);return;}if(result.actions.menuDirection&&buttons.length)buttons[nextHomeworldDialogChoice(index,buttons.length,result.actions.menuDirection)]?.focus();
   if(result.actions.confirm)(buttons.find(b=>b===document.activeElement)??buttons[0])?.click();
  }request=requestAnimationFrame(frame);
 };request=requestAnimationFrame(frame);return()=>cancelAnimationFrame(request);},[open,onOpenChange]);
 return <><button type="button" data-world-atlas-button-v77="true" disabled={disabled} style={{position:'absolute',right:18,top:128,zIndex:7,minHeight:44,padding:'8px 12px',background:'#10171ceb',border:'1px solid #9d8757',borderRadius:5,color:'#e7d39b',font:'11px system-ui'}} onClick={()=>{setSelected(levelId);onOpenChange(true);}}>Atlas de la cité · {levelId}</button>
 {open&&<div data-homeworld-spatial-codex="v77" style={{position:'absolute',inset:0,zIndex:18000,background:'#100e0cEE',padding:20,color:'#e0c79a',boxSizing:'border-box',overflowY:'auto'}}>
  <div ref={ref} role="dialog" aria-modal="true" aria-label="Carte des étages de la cité" tabIndex={-1} onKeyDown={event=>{event.stopPropagation();if(event.key==='Escape')onOpenChange(false);if(event.key==='Tab'){const buttons=[...(ref.current?.querySelectorAll<HTMLElement>('button:not(:disabled),input:not(:disabled)')??[])],i=buttons.indexOf(document.activeElement as HTMLElement);if(buttons.length){event.preventDefault();buttons[(i+(event.shiftKey?-1:1)+buttons.length)%buttons.length]?.focus();}}}}>
   <button type="button" onClick={()=>onOpenChange(false)}>Fermer la carte</button><p>Position réelle : {levelId}. Les onglets consultent la carte ; ils ne changent pas d’étage.</p>{targetId&&<p>Repère demandé : {requested?.label??'Ce repère ne fait pas partie du registre visible de ta partie.'}</p>}
   <label style={{display:'flex',gap:10,alignItems:'center',flexWrap:'wrap'}}>Registre de la cité<input aria-label="Rechercher un lieu, service ou interlocuteur" type="search" value={query} onChange={event=>setQuery(event.target.value)} placeholder="Forge, maître, soins, clans…" style={{minHeight:44,padding:'6px 10px',background:'#201b14',color:'#f1dfb9',border:'1px solid #ad8b55'}}/></label>
   <nav aria-label="Repères de tous les étages" data-homeworld-landmark-register-v83="true" style={{display:'flex',flexWrap:'wrap',gap:6,maxHeight:'18vh',overflowY:'auto',margin:'10px 0'}}>
    {filtered.map(record=><button key={record.id} type="button" aria-pressed={chosen?.id===record.id} data-map-landmark-v83={record.id} style={{minHeight:44}} onClick={()=>{setChosenId(record.id);setSelected(record.levelId);setInspected(record.buildingId);}}>{record.label} · {record.levelId}{record.access==='locked'?' · fermé':record.access==='restricted'?' · activité réservée':''}</button>)}
    {!filtered.length&&<p>Aucun repère visible ne correspond à cette recherche.</p>}
   </nav>
   {chosen&&<section aria-label="Repère choisi" data-map-landmark-detail-v83={chosen.id}>
    <strong>{chosen.label} · {chosen.levelId} · {chosen.district}</strong><p>{chosen.detail} {chosen.reason}</p>
    <p>{chosen.levelId===levelId?'Ce lieu se trouve à ton étage. Rejoins sa porte ou son seuil à pied.':links?.length?`Raccords entre étages : ${links.map(link=>`${link.name} (${link.from} → ${link.to})`).join(' · ')}.`:'Aucun raccord entre ces étages n’est indiqué.'} Les repères bleus indiquent les paliers. Interagis sur place ; cette consultation ne déplace pas le joueur.</p>
   </section>}
   <nav aria-label="Niveaux de la cité" style={{display:'flex',flexWrap:'wrap',gap:8}}>{HOMEWORLD_LEVELS_V77.map(level=><button key={level.id} type="button" style={{minHeight:44}} aria-pressed={selected===level.id} onClick={()=>{setSelected(level.id);setInspected(null);}}>{level.id} · {level.name}</button>)}</nav>
   <svg viewBox={`0 0 ${HOMEWORLD_WORLD_V77.width} ${HOMEWORLD_WORLD_V77.height}`} style={{width:'100%',maxHeight:'46vh'}} role="img" aria-label={'Plan du niveau '+selected}>
    {[...HOMEWORLD_GROUND_V77,...HOMEWORLD_CONNECTOR_PADS_V82,...HOMEWORLD_URBAN_GROUND_V78].filter(g=>g.levelId===selected).map(g=><polygon key={g.id} points={g.polygon.map(p=>`${p.x},${p.y}`).join(' ')} fill="#39362a" stroke="#706146" strokeWidth="5"><title>{g.id}</title></polygon>)}
    {HOMEWORLD_DISTRICTS_V77.filter(d=>d.levelId===selected).map(d=><polygon key={d.id} points={d.polygon.map(p=>`${p.x},${p.y}`).join(' ')} fill="#715d3b55" stroke="#d0b683" strokeWidth="12"><title>{d.name}</title></polygon>)}
    {buildings.map(b=>{const door=homeworldBuildingDoorwayV64(b).threshold,active=b.id===inspected||chosen?.buildingId===b.id||(targetId&&homeworldInteriorForPointV64(targetId)?.buildingId===b.id);return <g key={b.id} data-map-real-building-v81={b.id}>
     <polygon points={footprint(b).map(p=>`${p.x},${p.y}`).join(' ')} fill={active?'#d4aa54':'#796d56'} stroke={active?'#fff2b8':'#cdb990'} strokeWidth={active?20:8}><title>{b.label} · entrée réelle · {b.entranceKind}</title></polygon>
     <circle data-map-real-door-v81={b.id} cx={door.x} cy={door.y} r={active?44:30} fill="#df886a"><title>Porte de {b.label}</title></circle>
    </g>;})}
    {HOMEWORLD_URBAN_FACADES_V78.filter(f=>f.levelId===selected).map(f=><polygon key={f.id} data-map-scenery-facade-v78={f.id} points={homeworldUrbanFacadePlacementV78(f).footprint.map(p=>`${p.x},${p.y}`).join(' ')} fill="#574739" stroke="#b9a385" strokeWidth="8"><title>{`${f.label} · bâtiment fermé, sans service interactif`}</title></polygon>)}
    {HOMEWORLD_CONNECTORS_V77.flatMap(c=>[c.from,c.to].filter(side=>side.levelId===selected).map((side,i)=><circle key={c.id+':'+i} data-map-connector-v77={c.id} cx={side.point.x} cy={side.point.y} r="65" fill="#9fcacd"><title>{`${c.name} · ${c.from.levelId} ↔ ${c.to.levelId}`}</title></circle>))}
    {HOMEWORLD_REGIONAL_DOCKS_V77.filter(dock=>dock.levelId===selected&&visibleRegionIds.has(dock.regionId)).map(dock=><circle key={dock.regionId} cx={dock.point.x} cy={dock.point.y} r="85" fill="#e7a365"><title>{dock.name}</title></circle>)}
    {HOMEWORLD_CONNECTIONS_V77.filter(c=>c.levelId===selected&&visibleRegionIds.has(c.regionId)).map(c=><g key={c.regionId} data-map-geographic-route-v81={c.regionId}>
     <polyline points={c.nodes.map(p=>`${p.x},${p.y}`).join(' ')} fill="none" stroke="#e7a365" strokeWidth="14" strokeDasharray="36 18"/>
     <circle cx={c.threshold.x} cy={c.threshold.y} r="65" fill="#e7a365"><title>{c.regionId} · chemin physique vers la région</title></circle>
    </g>)}
    {chosen&&chosen.levelId===selected&&<g data-map-chosen-landmark-v83={chosen.id}><circle cx={chosen.position.x} cy={chosen.position.y} r="100" fill="none" stroke="#fff0a4" strokeWidth="14"/><circle cx={chosen.position.x} cy={chosen.position.y} r="32" fill="#fff0a4"><title>{chosen.label} · repère physique, sans déplacement</title></circle></g>}
    {selected===levelId&&<circle cx={actor.x} cy={actor.y} r="80" fill="#fff2cf"/>}
   </svg>
   <p style={{fontSize:12}}>Dallage : passages et cours. Bâtiments clairs : lieux visitables, avec leur véritable emprise. Rouge : porte. Brun sombre : façades fermées de décor. Bleu : raccord entre étages. Orange : route régionale. Blanc : ta position.</p>
   <nav aria-label="Lieux visitables de cet étage" style={{display:'flex',flexWrap:'wrap',gap:6}}>{buildings.map(b=><button key={b.id} type="button" aria-pressed={inspected===b.id} onClick={()=>setInspected(b.id)} style={{minHeight:44}}>{b.label}</button>)}</nav>
   {detail&&<p data-map-building-detail-v81={detail.id}>{detail.label} · {detail.entranceKind==='domestic'?'Habitation':'Lieu public'} · porte au niveau {detail.levelId}. Rejoins ce repère à pied : l’atlas ne déplace jamais le joueur.</p>}
   <ul>{HOMEWORLD_CONNECTORS_V77.filter(c=>c.from.levelId===selected||c.to.levelId===selected).map(c=><li key={c.id}>{c.name} : {c.from.levelId} ↔ {c.to.levelId}</li>)}</ul>
  </div></div>}</>;
}
