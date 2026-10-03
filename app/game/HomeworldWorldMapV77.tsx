import {useEffect,useRef,useState} from 'react';
import {createHomeworldGamepadState,stepHomeworldGamepad,nextHomeworldDialogChoice} from './systems/homeworldInput';
import {HOMEWORLD_LEVELS_V77,HOMEWORLD_GROUND_V77,HOMEWORLD_DISTRICTS_V77,HOMEWORLD_CONNECTORS_V77,HOMEWORLD_REGIONAL_DOCKS_V77,HOMEWORLD_WORLD_V77,type HomeworldLevelV77} from './systems/homeworldWorldV77';
import {HOMEWORLD_URBAN_GROUND_V78} from './systems/homeworldUrbanLayoutV78';
import {HOMEWORLD_URBAN_FACADES_V78,homeworldUrbanFacadePlacementV78} from './systems/homeworldUrbanFacadesV78';
/** Read-only multi-floor atlas. Level tabs inspect a floor; they never move the
 * actor, grant an audience, unlock travel, or write discovery/save data. */
export default function HomeworldWorldMapV77({actor,levelId,open,disabled=false,targetId,onOpenChange}:{actor:{x:number;y:number};levelId:HomeworldLevelV77;open:boolean;disabled?:boolean;targetId?:string;onOpenChange(open:boolean):void}){
 const [selected,setSelected]=useState(levelId),ref=useRef<HTMLDivElement>(null);
 useEffect(()=>{if(open)ref.current?.focus({preventScroll:true});},[open]);
 useEffect(()=>{if(!open)return;let request=0,state=createHomeworldGamepadState();const frame=()=>{
  if(document.hasFocus()&&ref.current?.contains(document.activeElement)){
   const pad=[...(navigator.getGamepads?.()??[])].find(p=>p?.connected)??null,result=stepHomeworldGamepad(state,pad,'dialog');state=result.state;
   const buttons=[...(ref.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')??[])],index=buttons.indexOf(document.activeElement as HTMLButtonElement);
   if(result.actions.cancel){onOpenChange(false);return;}if(result.actions.menuDirection&&buttons.length)buttons[nextHomeworldDialogChoice(index,buttons.length,result.actions.menuDirection)]?.focus();
   if(result.actions.confirm)(buttons.find(b=>b===document.activeElement)??buttons[0])?.click();
  }request=requestAnimationFrame(frame);
 };request=requestAnimationFrame(frame);return()=>cancelAnimationFrame(request);},[open,onOpenChange]);
 return <><button type="button" data-world-atlas-button-v77="true" disabled={disabled} style={{position:'absolute',right:18,top:128,zIndex:7,minHeight:44,padding:'8px 12px',background:'#10171ceb',border:'1px solid #9d8757',borderRadius:5,color:'#e7d39b',font:'11px system-ui'}} onClick={()=>{setSelected(levelId);onOpenChange(true);}}>Atlas de la cité · {levelId}</button>
 {open&&<div data-homeworld-spatial-codex="v77" style={{position:'absolute',inset:0,zIndex:18000,background:'#100e0cEE',padding:20,color:'#e0c79a',boxSizing:'border-box',overflowY:'auto'}}>
  <div ref={ref} role="dialog" aria-modal="true" aria-label="Carte des étages de la cité" tabIndex={-1} onKeyDown={event=>{event.stopPropagation();if(event.key==='Escape')onOpenChange(false);if(event.key==='Tab'){const buttons=[...(ref.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)')??[])],i=buttons.indexOf(document.activeElement as HTMLButtonElement);if(buttons.length){event.preventDefault();buttons[(i+(event.shiftKey?-1:1)+buttons.length)%buttons.length]?.focus();}}}}>
   <button type="button" onClick={()=>onOpenChange(false)}>Fermer la carte</button><p>Position réelle : {levelId}. Les onglets consultent la carte ; ils ne changent pas d’étage.</p>{targetId&&<p>Repère demandé : {targetId}. Consulte le quartier et ses raccords physiques dans cet atlas.</p>}
   <nav aria-label="Niveaux de la cité" style={{display:'flex',flexWrap:'wrap',gap:8}}>{HOMEWORLD_LEVELS_V77.map(level=><button key={level.id} type="button" style={{minHeight:44}} aria-pressed={selected===level.id} onClick={()=>setSelected(level.id)}>{level.id} · {level.name}</button>)}</nav>
   <svg viewBox={`0 0 ${HOMEWORLD_WORLD_V77.width} ${HOMEWORLD_WORLD_V77.height}`} style={{width:'100%',maxHeight:'46vh'}} role="img" aria-label={'Plan du niveau '+selected}>
    {[...HOMEWORLD_GROUND_V77,...HOMEWORLD_URBAN_GROUND_V78].filter(g=>g.levelId===selected).map(g=><polygon key={g.id} points={g.polygon.map(p=>`${p.x},${p.y}`).join(' ')} fill="#39362a" stroke="#706146" strokeWidth="5"><title>{g.id}</title></polygon>)}
    {HOMEWORLD_DISTRICTS_V77.filter(d=>d.levelId===selected).map(d=><polygon key={d.id} points={d.polygon.map(p=>`${p.x},${p.y}`).join(' ')} fill="#715d3b" stroke="#d0b683" strokeWidth="35"><title>{d.name}</title></polygon>)}
    {HOMEWORLD_URBAN_FACADES_V78.filter(f=>f.levelId===selected).map(f=><polygon key={f.id} data-map-scenery-facade-v78={f.id} points={homeworldUrbanFacadePlacementV78(f).footprint.map(p=>`${p.x},${p.y}`).join(' ')} fill="#574739" stroke="#b9a385" strokeWidth="8"><title>{`${f.label} · bâtiment fermé, sans service interactif`}</title></polygon>)}
    {HOMEWORLD_CONNECTORS_V77.flatMap(c=>[c.from,c.to].filter(side=>side.levelId===selected).map((side,i)=><circle key={c.id+':'+i} data-map-connector-v77={c.id} cx={side.point.x} cy={side.point.y} r="65" fill="#9fcacd"><title>{`${c.name} · ${c.from.levelId} ↔ ${c.to.levelId}`}</title></circle>))}
    {HOMEWORLD_REGIONAL_DOCKS_V77.filter(dock=>dock.levelId===selected).map(dock=><circle key={dock.regionId} cx={dock.point.x} cy={dock.point.y} r="85" fill="#e7a365"><title>{dock.name}</title></circle>)}
    {selected===levelId&&<circle cx={actor.x} cy={actor.y} r="80" fill="#fff2cf"/>}
   </svg>
   <p style={{fontSize:12}}>Dallage : passages et cours. Brun clair : façades fermées de décor. Bleu : raccord entre étages. Orange : route régionale. Blanc : ta position sur cet étage.</p>
   <ul>{HOMEWORLD_CONNECTORS_V77.filter(c=>c.from.levelId===selected||c.to.levelId===selected).map(c=><li key={c.id}>{c.name} : {c.from.levelId} ↔ {c.to.levelId}</li>)}</ul>
  </div></div>}</>;
}
