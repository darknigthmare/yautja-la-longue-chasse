"use client";
/* eslint-disable @next/next/no-img-element -- existing source sprites are explicitly marked as review art */
import {useEffect,useRef,useState} from 'react';
import type {ControlBindings,ControlActionId} from './systems/controlBindings';
import {matchingControlActions} from './systems/controlBindings';
import {controlActionShortcut} from './controlBindingLabels';
import {mobilityDefinition} from './systems/mobility/catalogue';
import {COURSE_STEP,COURSE_MAX_TICKS,MOBILITY_YARD,mobilityYardNpcs,parkedAtDepot,type MobilityInput} from './systems/mobility/course';
import {MobilityDriveController,type MobilityWriter} from './systems/mobility/controller';
import type {MobilityLedger} from './systems/mobility/ledger';
import type {GameSfxId} from './sound';
import styles from './MobilityGarage.module.css';
const idle=():MobilityInput=>({throttle:0,steer:0,brake:false,boost:false,interact:false});
interface Props {state:MobilityLedger;bindings:ControlBindings;suspended:boolean;onCommand:MobilityWriter;onSound?:(id:GameSfxId)=>void}
export default function MobilityDrivingYard(props:Props){
 const [controller]=useState(()=>new MobilityDriveController(props.state));
 const [course,setCourse]=useState(controller.predicted),[paused,setPaused]=useState(true),[notice,setNotice]=useState(controller.message),[recovery,setRecovery]=useState(false);
 const latest=useRef(props),pauseRef=useRef(true),held=useRef(new Set<ControlActionId>()),touch=useRef(idle()),canvasRef=useRef<SVGSVGElement|null>(null);
 const model=mobilityDefinition(props.state.active!.modelId)!;
 useEffect(()=>{latest.current=props;},[props]);
 const clear=()=>{held.current.clear();touch.current=idle();};
 const flush=()=>{const ok=controller.flush(latest.current.onCommand);setCourse({...controller.predicted});if(!ok){pauseRef.current=true;setPaused(true);setNotice(controller.message);}return ok;};
 const pause=()=>{pauseRef.current=true;setPaused(true);clear();flush();};
 useEffect(()=>{
  let frame=0,last=0,accumulator=0,lastPaint=0;
  const flushNow=()=>{const ok=controller.flush(latest.current.onCommand);if(!ok){pauseRef.current=true;setPaused(true);setNotice(controller.message);}setCourse({...controller.predicted});return ok;};
  const halt=()=>{pauseRef.current=true;setPaused(true);held.current.clear();touch.current=idle();accumulator=0;flushNow();};
  const key=(event:KeyboardEvent,down:boolean)=>{
   if(event.defaultPrevented || latest.current.suspended)return;
   const target=event.target as HTMLElement|null;
   if(target?.matches('input,textarea,select'))return;
   const actions=matchingControlActions('hunt',event,latest.current.bindings);
   if(actions.includes('hunt.pause')){if(down&&!event.repeat){event.preventDefault();halt();}return;}
   if(actions.some(a=>['hunt.moveUp','hunt.moveDown','hunt.moveLeft','hunt.moveRight','hunt.jump','hunt.aim','hunt.interact'].includes(a))){
    if(down&&pauseRef.current)return;
    event.preventDefault();for(const action of actions)down?held.current.add(action):held.current.delete(action);
   }
  };
  const down=(e:KeyboardEvent)=>key(e,true),up=(e:KeyboardEvent)=>key(e,false);
  const visibility=()=>{if(document.hidden)halt();};
  const unload=(e:BeforeUnloadEvent)=>{halt();if(controller.pending.length){e.preventDefault();e.returnValue='';}};
  const draw=(now:number)=>{
   frame=requestAnimationFrame(draw);
   const elapsed=last?Math.min((now-last)/1000,.1):0;last=now;
   if(latest.current.suspended||document.hidden||!document.hasFocus()){
    if(!pauseRef.current)halt();return;
   }
   if(pauseRef.current||controller.blocked){accumulator=0;return;}
   const current=latest.current.state;
   if(current.ownerCreatedAt!==controller.confirmed.ownerCreatedAt||current.revision>controller.confirmed.revision){halt();setNotice('Registre actualisé ailleurs : relis la sortie sauvegardée avant de reprendre.');controller.blocked=true;return;}
   const pads=navigator.getGamepads?.()??[],pad=Array.from(pads).find(p=>p?.connected&&p.mapping==='standard');
   const input:MobilityInput={
    throttle:touch.current.throttle || (held.current.has('hunt.moveUp')?1:held.current.has('hunt.moveDown')?-1:pad&&pad.axes[1]<-.25?1:pad&&pad.axes[1]>.25?-1:0),
    steer:touch.current.steer || (held.current.has('hunt.moveLeft')?-1:held.current.has('hunt.moveRight')?1:pad&&pad.axes[0]<-.25?-1:pad&&pad.axes[0]>.25?1:0),
    brake:touch.current.brake||held.current.has('hunt.jump')||Boolean(pad?.buttons[0]?.pressed),
    boost:touch.current.boost||held.current.has('hunt.aim')||Boolean(pad?.buttons[7]?.pressed),
    interact:touch.current.interact||held.current.has('hunt.interact')||Boolean(pad?.buttons[2]?.pressed),
   };
   if(pad?.buttons[9]?.pressed){halt();return;}
   accumulator+=elapsed;
   let steps=0;
   while(accumulator>=COURSE_STEP&&steps++<6){
    const before=controller.predicted;
    if(!controller.step(input))break;
    const after=controller.predicted;
    if(after.impacts>before.impacts)latest.current.onSound?.('hit');
    if(after.checkpoint>before.checkpoint||after.cargoDelivered!==before.cargoDelivered)latest.current.onSound?.('objective');
    accumulator-=COURSE_STEP;
    if(controller.pending.length===30&&!flushNow())break;
    if(after.tick>=COURSE_MAX_TICKS){halt();setNotice('Limite de sortie atteinte : remiser ou demander le retour de sécurité.');break;}
   }
   if(now-lastPaint>50){lastPaint=now;setCourse({...controller.predicted});}
  };
  document.addEventListener('keydown',down,true);document.addEventListener('keyup',up);window.addEventListener('blur',halt);
  document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',halt);window.addEventListener('beforeunload',unload);
  frame=requestAnimationFrame(draw);
  return()=>{cancelAnimationFrame(frame);document.removeEventListener('keydown',down,true);document.removeEventListener('keyup',up);window.removeEventListener('blur',halt);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',halt);window.removeEventListener('beforeunload',unload);};
 },[controller]);
 const finish=(type:'return'|'recover')=>{
  pause();if(!flush())return;
  const state=controller.confirmed;if(!state.active)return;
  const result=props.onCommand({type,runId:state.active.id,ownerCreatedAt:state.ownerCreatedAt,expectedRevision:state.revision});
  setNotice(result.message);setRecovery(false);
 };
 const resume=()=>{if(props.suspended||!flush()||controller.predicted.tick>=COURSE_MAX_TICKS)return;clear();pauseRef.current=false;setPaused(false);setNotice('Conduite active · l’usure et la charge sont sauvegardées.');canvasRef.current?.focus();};
 const control=(label:string,field:'throttle'|'steer'|'brake'|'boost'|'interact',value:number|boolean)=>
  <button key={label} type="button" disabled={props.suspended||paused} aria-label={label}
   onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);Object.assign(touch.current,{[field]:value});}}
   onPointerUp={()=>Object.assign(touch.current,{[field]:typeof value==='boolean'?false:0})}
   onPointerCancel={()=>Object.assign(touch.current,{[field]:typeof value==='boolean'?false:0})}
   onLostPointerCapture={()=>Object.assign(touch.current,{[field]:typeof value==='boolean'?false:0})}>{label}</button>;
 const npcs=mobilityYardNpcs(course.npcTicks,course);
 return <section className={styles.yard} data-mobility-yard data-run-id={props.state.active!.id} data-x={course.x.toFixed(4)} data-y={course.y.toFixed(4)} data-heading={course.heading.toFixed(5)} data-speed={course.speed.toFixed(3)} data-tick={course.tick} data-paused={paused} data-checkpoint={course.checkpoint} data-cargo={course.cargoKg}>
  <div className={styles.heading}><div><small>AIRE DES CONVOIS · SORTIE ENREGISTRÉE</small><h3>{model.name}{props.state.active!.loaned?' · prêt de formation':''}</h3></div><strong>{paused?'EN PAUSE':'EN CONDUITE'}</strong></div>
  <div className={styles.metrics}>
   <span>État <b>{course.condition.toFixed(1)} %</b></span><span>Énergie <b>{course.energy.toFixed(1)} %</b></span>
   <span>Chaleur <b>{course.heat.toFixed(0)} %{course.overheated?' · boost coupé':''}</b></span><span>Charge <b>{course.cargoKg} kg</b></span>
   <span>Balises <b>{course.checkpoint}/3</b></span><span>Retour cargo <b>{course.cargoDelivered?'effectué':'à faire'}</b></span>
  </div>
  <svg ref={canvasRef} viewBox="0 0 1000 620" role="img" tabIndex={0} aria-label="Aire de conduite : sas en bas à gauche, trois balises ordonnées, chargement en haut à droite, trafic de deux convoyeurs" className={styles.track}>
   <rect x="0" y="0" width="1000" height="620" rx="18" fill="#171b1d"/>
   <path d="M140 490 H820 V130 H140 Z" fill="none" stroke="#394247" strokeWidth="110"/>
   <path d="M140 490 H820 V130 H140 Z" fill="none" stroke="#76818a" strokeWidth="2" strokeDasharray="10 14"/>
   <rect {...{x:MOBILITY_YARD.mud.x,y:MOBILITY_YARD.mud.y,width:MOBILITY_YARD.mud.w,height:MOBILITY_YARD.mud.h}} fill="#514633" opacity=".85"/><text x="640" y="570" fill="#d2b27b">CENDRES · ADHÉRENCE RÉDUITE</text>
   {MOBILITY_YARD.obstacles.map((o,i)=><rect key={i} x={o.x} y={o.y} width={o.w} height={o.h} rx="12" fill="#29292a" stroke="#a17d42" strokeWidth="4"/>)}
   <text x="395" y="305" fill="#c8b17e">ATELIERS · ACCÈS INTERDIT</text>
   <circle cx="140" cy="490" r="50" fill="#254d45" stroke="#8ed9bd" strokeWidth="3"/><text x="82" y="586" fill="#b3e6cf">SAS DU GARAGE</text>
   {MOBILITY_YARD.checkpoints.map((p,i)=><g key={i}><circle cx={p.x} cy={p.y} r="38" fill="none" stroke={i<course.checkpoint?'#83d1ae':'#dfbd78'} strokeWidth="4"/><text x={p.x-6} y={p.y+7} fill="#fff" fontSize="24">{i+1}</text></g>)}
   {!course.cargoDelivered&&course.cargoKg===0&&<rect x="805" y="112" width="30" height="32" fill="#aa7e44" stroke="#ebc789"/>}
   {npcs.map(n=><g key={n.id} data-mobility-npc={n.state} transform={`translate(${n.x} ${n.y})`}><circle r="34" fill="none" stroke={n.state==='yielding'?'#e9bc73':'#537777'}/><image href={mobilityDefinition(n.modelId)?.previewPath??''} x="-48" y="-36" width="96" height="64"/><text y="-39" textAnchor="middle" fill="#c9dbdb" fontSize="12">{n.state==='yielding'?'CÈDE LE PASSAGE':'CONVOI'}</text></g>)}
   <g transform={`translate(${course.x} ${course.y})`}><ellipse cy="12" rx="37" ry="14" fill="#000" opacity=".5"/>
    {Math.abs(course.speed)>20&&<path d={`M${-Math.cos(course.heading)*35} ${-Math.sin(course.heading)*35} l${-Math.cos(course.heading)*Math.min(55,Math.abs(course.speed)/2)} ${-Math.sin(course.heading)*Math.min(55,Math.abs(course.speed)/2)}`} stroke="#caa66c" strokeWidth="7" opacity=".35"/>}
    <image href={model.previewPath??''} x="-48" y="-36" width="96" height="64"/>
    <path d="M26 0 L42 0 M34 -6 L42 0 L34 6" fill="none" stroke="#b7ecdc" strokeWidth="3" transform={`rotate(${course.heading*180/Math.PI})`}/>
    {course.cargoKg>0&&<rect x="-8" y="18" width="16" height="12" fill="#c19859"/>}
   </g>
  </svg>
  <p className={styles.hint}>Passe les balises dans l’ordre. À la deuxième, freine et charge la caisse ; rapporte-la au sas, à l’arrêt. Les deux convois circulent seulement sur leur voie logistique. Les silhouettes utilisées sont statiques, non des animations finalisées.</p>
  <div className={styles.actions}><button onClick={paused?resume:pause} disabled={props.suspended||controller.blocked}>{paused?'Reprendre la conduite':'Pause et enregistrer'}</button>
   <button onClick={()=>finish('return')} disabled={props.suspended||!parkedAtDepot(course)||controller.blocked}>Remiser au garage</button>
   <button onClick={()=>{pause();setRecovery(true);}} disabled={props.suspended||controller.blocked}>Retour de sécurité</button>
  </div>
  {recovery&&<div role="alert" className={styles.notice}><p>Le clan récupère l’engin sans récompense. L’usure et l’énergie consommée restent enregistrées. Un engin personnel entraîne une dette de 20 à 120 marques ; le prêt de formation est récupéré sans frais.</p><button onClick={()=>finish('recover')} disabled={props.suspended}>Confirmer la récupération</button><button onClick={()=>setRecovery(false)}>Annuler</button></div>}
  {controller.blocked&&<div role="alert" className={styles.notice}><p>La séquence non confirmée est conservée. Aucun achat n’est autorisé pendant ce blocage.</p><button onClick={flush} disabled={props.suspended}>Réessayer la même écriture</button></div>}
  <p role="status" aria-live="polite">{notice}</p>
  <details><summary>Commandes clavier, tactile et manette standard</summary><p>Avancer : {controlActionShortcut('hunt.moveUp',props.bindings)} · Reculer : {controlActionShortcut('hunt.moveDown',props.bindings)} · Direction : {controlActionShortcut('hunt.moveLeft',props.bindings)} / {controlActionShortcut('hunt.moveRight',props.bindings)} · Frein : {controlActionShortcut('hunt.jump',props.bindings)} · Boost : {controlActionShortcut('hunt.aim',props.bindings)} · Charger/décharger : {controlActionShortcut('hunt.interact',props.bindings)}. Manette : stick gauche, A frein, RT boost, X chargement, Start pause. Aucun raccourci sauvegardé n’est remplacé.</p></details>
  <div className={styles.touch} aria-label="Commandes tactiles de conduite">{control('Gauche','steer',-1)}{control('Avancer','throttle',1)}{control('Droite','steer',1)}{control('Reculer','throttle',-1)}{control('Freiner','brake',true)}{control('Boost','boost',true)}{control('Charger / décharger','interact',true)}</div>
 </section>;
}
