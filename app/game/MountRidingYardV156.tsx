"use client";
import {useEffect,useRef,useState} from 'react';
import type {ControlBindings,ControlActionId} from './systems/controlBindings';
import {matchingControlActions} from './systems/controlBindings';
import {MobilityHeldControls,MobilityPadGate,type MobilityControl} from './systems/mobility/controls';
import {controlActionShortcut} from './controlBindingLabels';
import {COURSE_STEP,COURSE_MAX_TICKS,MOBILITY_YARD,mobilityYardNpcs,type MobilityInput} from './systems/mobility/course';
import {mobilityDefinition} from './systems/mobility/catalogue';
import {
 MountRideControllerV156,MOUNT_RIDE_YARD_V156,mountRideAtDepotV156,mountRideHaltedV156,mountRidePassedV156,
 type MountRidesV156,type MountRideWriterV156,
} from './systems/mobility/mountRidingV156';
import {MOUNT_FATIGUE_REFUSAL_V153} from './systems/mobility/mountsV153';
import {mountExpeditionV153} from './systems/mobility/mountExpeditionsV153';
import type {GameSfxId} from './sound';
import type {SceneAudioPort} from './systems/sceneAudio';
import {createMobilityAudio} from './systems/mobility/audio';
import styles from './MobilityGarage.module.css';
const actionControls:Partial<Record<ControlActionId,MobilityControl>>={
 'hunt.moveUp':'forward','hunt.moveDown':'reverse','hunt.moveLeft':'left','hunt.moveRight':'right',
 'hunt.jump':'brake','hunt.aim':'boost',
};
interface Props {state:MountRidesV156;bindings:ControlBindings;suspended:boolean;onCommand:MountRideWriterV156;onSound?:(id:GameSfxId)=>void;createSceneAudio?:()=>SceneAudioPort|null}
/**
 * V156 : sortie montée sur l'aire des convois. Même géométrie, mêmes balises,
 * même trafic et mêmes commandes que l'aire des machines (constantes de
 * course.ts) ; composant séparé pour ne pas toucher à la conduite des engins.
 * Le Kha’Rha historique conserve son repère. Les nouvelles montures affichent leur portrait de référence.
 */
export default function MountRidingYardV156(props:Props){
 const [controller]=useState(()=>new MountRideControllerV156(props.state));
 const [course,setCourse]=useState(controller.predicted),[paused,setPaused]=useState(true),[notice,setNotice]=useState(controller.message),[dismount,setDismount]=useState(false),[padNeutral,setPadNeutral]=useState(false);
 const latest=useRef(props),pauseRef=useRef(true),held=useRef(new MobilityHeldControls()),padGate=useRef(new MobilityPadGate()),neutralRef=useRef(false),canvasRef=useRef<SVGSVGElement|null>(null);
 const active=props.state.active!;
 const model=mobilityDefinition(active.mountId)!;
 const portrait=mountExpeditionV153(active.mountId)?.portrait;
 const sceneAudio=useRef<ReturnType<typeof createMobilityAudio>|null>(null);
 useEffect(()=>{latest.current=props;},[props]);
 const clear=()=>{held.current.clear();padGate.current.reset();neutralRef.current=false;setPadNeutral(false);};
 const flush=()=>{const ok=controller.flush(latest.current.onCommand);setCourse({...controller.predicted});setNotice(controller.message);if(!ok){pauseRef.current=true;setPaused(true);}return ok;};
 const pause=()=>{pauseRef.current=true;setPaused(true);sceneAudio.current?.stop();clear();if(flush())setNotice('Chevauchée en pause · dernières foulées enregistrées.');};
 useEffect(()=>{
  let frame=0,last=0,accumulator=0,lastPaint=0;
  const flushNow=()=>{const ok=controller.flush(latest.current.onCommand);if(!ok){pauseRef.current=true;setPaused(true);sceneAudio.current?.stop();setNotice(controller.message);}setCourse({...controller.predicted});return ok;};
  const halt=()=>{pauseRef.current=true;setPaused(true);sceneAudio.current?.stop();held.current.clear();padGate.current.reset();neutralRef.current=false;setPadNeutral(false);accumulator=0;if(flushNow())setNotice('Chevauchée en pause · dernières foulées enregistrées.');};
  const key=(event:KeyboardEvent,down:boolean)=>{
   const source=`key:${event.code || event.key}`;
   if(!down){held.current.release(source);return;}
   if(event.defaultPrevented || latest.current.suspended)return;
   const target=event.target as HTMLElement|null;
   if(target?.closest('input,textarea,select,[contenteditable="true"]'))return;
   const actions=matchingControlActions('hunt',event,latest.current.bindings);
   if(actions.includes('hunt.pause')){if(!event.repeat){event.preventDefault();halt();}return;}
   const controls=actions.map(a=>actionControls[a]).filter((c):c is MobilityControl=>Boolean(c));
   if(controls.length&&!pauseRef.current){event.preventDefault();held.current.press(source,controls);}
  };
  const down=(e:KeyboardEvent)=>key(e,true),up=(e:KeyboardEvent)=>key(e,false);
  const visibility=()=>{if(document.hidden)halt();};
  const unload=(e:BeforeUnloadEvent)=>{halt();if(controller.pending.length){e.preventDefault();e.returnValue='';}};
  const draw=(now:number)=>{
   frame=requestAnimationFrame(draw);
   const elapsed=last?Math.min((now-last)/1000,.1):0;last=now;
   if(latest.current.suspended||document.hidden||!document.hasFocus()){if(!pauseRef.current)halt();return;}
   if(pauseRef.current||controller.blocked){accumulator=0;return;}
   const current=latest.current.state;
   if(current.ownerCreatedAt!==controller.confirmed.ownerCreatedAt||current.revision>controller.confirmed.revision){halt();setNotice('Registre actualisé ailleurs : relis la chevauchée sauvegardée avant de reprendre.');controller.blocked=true;return;}
   let pads:(Gamepad|null)[]=[];try{pads=Array.from(navigator.getGamepads?.()??[]);}catch{/* Entrée indisponible : aucune commande maintenue. */}
   const sample=padGate.current.sample(pads);
   if(neutralRef.current!==sample.waitingForNeutral){neutralRef.current=sample.waitingForNeutral;setPadNeutral(neutralRef.current);}
   if(sample.pauseRequested){halt();setNotice('Manette interrompue ou pause demandée : chevauchée enregistrée.');return;}
   const input:MobilityInput={...held.current.resolve(sample.input),interact:false};
   accumulator+=elapsed;
   let steps=0;
   while(accumulator>=COURSE_STEP&&steps++<6){
    const before=controller.predicted;
    if(!controller.step(input))break;
    const after=controller.predicted;
    if (sceneAudio.current) sceneAudio.current.ride(before,after);
    else {
     if(after.impacts>before.impacts||after.panicked!==before.panicked)latest.current.onSound?.('hit');
     if(after.checkpoint>before.checkpoint)latest.current.onSound?.('objective');
    }
    accumulator-=COURSE_STEP;
    if(controller.pending.length===30&&!flushNow())break;
    if(after.tick>=COURSE_MAX_TICKS){halt();setNotice('Limite de sortie atteinte : revenir au sas ou mettre pied à terre.');break;}
   }
   if(now-lastPaint>50){lastPaint=now;setCourse({...controller.predicted});}
  };
  document.addEventListener('keydown',down,true);document.addEventListener('keyup',up);window.addEventListener('blur',halt);
  document.addEventListener('visibilitychange',visibility);window.addEventListener('pagehide',halt);window.addEventListener('beforeunload',unload);
  frame=requestAnimationFrame(draw);
  return()=>{cancelAnimationFrame(frame);sceneAudio.current?.dispose();sceneAudio.current=null;document.removeEventListener('keydown',down,true);document.removeEventListener('keyup',up);window.removeEventListener('blur',halt);document.removeEventListener('visibilitychange',visibility);window.removeEventListener('pagehide',halt);window.removeEventListener('beforeunload',unload);};
 },[controller]);
 const finish=(type:'return'|'dismount')=>{
  pause();if(!flush())return;
  const state=controller.confirmed;if(!state.active)return;
  const result=props.onCommand({type,rideId:state.active.id,ownerCreatedAt:state.ownerCreatedAt,expectedRevision:state.revision});
  setNotice(result.message);setDismount(false);
 };
 const resume=()=>{
  if(props.suspended||!flush()||controller.predicted.tick>=COURSE_MAX_TICKS)return;
  if(!sceneAudio.current){
   const port=props.createSceneAudio?.();
   if(port)sceneAudio.current=createMobilityAudio(port,model.id);
  }
  sceneAudio.current?.unlock();
  clear();pauseRef.current=false;setPaused(false);setNotice('Chevauchée active · fatigue et blessures sont sauvegardées.');canvasRef.current?.focus();};
 const control=(label:string,c:MobilityControl)=>
  <button key={label} type="button" disabled={props.suspended||paused||controller.blocked} aria-label={label}
   onPointerDown={e=>{if(paused||pauseRef.current||props.suspended||controller.blocked)return;e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);held.current.press(`pointer:${e.pointerId}`,[c]);}}
   onPointerUp={e=>held.current.release(`pointer:${e.pointerId}`)}
   onPointerCancel={e=>held.current.release(`pointer:${e.pointerId}`)}
   onLostPointerCapture={e=>held.current.release(`pointer:${e.pointerId}`)}>{label}</button>;
 const npcs=mobilityYardNpcs(course.npcTicks,course);
 const halted=mountRideHaltedV156(course),exhausted=course.fatigue>=MOUNT_FATIGUE_REFUSAL_V153,passed=mountRidePassedV156(course);
 return <section className={styles.yard} data-mount-ride-yard data-ride-id={active.id} data-x={course.x.toFixed(4)} data-y={course.y.toFixed(4)} data-heading={course.heading.toFixed(5)} data-speed={course.speed.toFixed(3)} data-tick={course.tick} data-paused={paused} data-checkpoint={course.checkpoint} data-fatigue={course.fatigue.toFixed(3)} data-injury={course.injury.toFixed(3)} data-passed={passed}>
  <div className={styles.heading}><div><small>AIRE DES CONVOIS · SORTIE MONTÉE ENREGISTRÉE</small><h3>{model.name} · BOND {active.bond}</h3></div><strong>{paused?'EN PAUSE':halted?'ARRÊTÉ':'EN SELLE'}</strong></div>
  <div className={styles.metrics}>
   <span>Fatigue <b data-ride-fatigue>{course.fatigue.toFixed(1)} / 100{exhausted?' · au pas seulement':''}</b></span><span>Blessures <b data-ride-injury>{course.injury.toFixed(1)} / 100</b></span>
   <span>Balises <b>{course.checkpoint}/3</b></span><span>Chocs <b>{course.impacts}</b></span>
  </div>
  <svg ref={canvasRef} viewBox="0 0 1000 620" role="img" tabIndex={0} aria-label="Aire des convois en sortie montée : sas en bas à gauche, trois balises ordonnées, trafic de deux convoyeurs ; aucun feu sur cette aire" className={styles.track}>
   <rect x="0" y="0" width="1000" height="620" rx="18" fill="#171b1d"/>
   <path d="M140 490 H820 V130 H140 Z" fill="none" stroke="#394247" strokeWidth="110"/>
   <path d="M140 490 H820 V130 H140 Z" fill="none" stroke="#76818a" strokeWidth="2" strokeDasharray="10 14"/>
   <rect {...{x:MOBILITY_YARD.mud.x,y:MOBILITY_YARD.mud.y,width:MOBILITY_YARD.mud.w,height:MOBILITY_YARD.mud.h}} fill="#514633" opacity=".85"/><text x="640" y="570" fill="#d2b27b">CENDRES · ADHÉRENCE RÉDUITE</text>
   {MOBILITY_YARD.obstacles.map((o,i)=><rect key={i} x={o.x} y={o.y} width={o.w} height={o.h} rx="12" fill="#29292a" stroke="#a17d42" strokeWidth="4"/>)}
   <text x="395" y="305" fill="#c8b17e">ATELIERS · ACCÈS INTERDIT</text>
   <circle cx={MOBILITY_YARD.depot.x} cy={MOBILITY_YARD.depot.y} r={MOBILITY_YARD.depot.radius} fill="#254d45" stroke="#8ed9bd" strokeWidth="3"/><text x="82" y="586" fill="#b3e6cf">SAS DU GARAGE</text>
   {MOBILITY_YARD.checkpoints.map((p,i)=><g key={i}><circle cx={p.x} cy={p.y} r="38" fill="none" stroke={i<course.checkpoint?'#83d1ae':'#dfbd78'} strokeWidth="4"/><text x={p.x-6} y={p.y+7} fill="#fff" fontSize="24">{i+1}</text></g>)}
   {MOUNT_RIDE_YARD_V156.hazards.map(h=><rect key={h.id} data-ride-hazard={h.condition} x={h.x} y={h.y} width={h.w} height={h.h} fill="#7a2c18" opacity=".6"/>)}
   {npcs.map(n=><g key={n.id} data-mobility-npc={n.state} transform={`translate(${n.x} ${n.y})`}><circle r="34" fill="none" stroke={n.state==='yielding'?'#e9bc73':'#537777'}/><image href={mobilityDefinition(n.modelId)?.previewPath??''} x="-48" y="-36" width="96" height="64"/><text y="-39" textAnchor="middle" fill="#c9dbdb" fontSize="12">{n.state==='yielding'?'CÈDE LE PASSAGE':'CONVOI'}</text></g>)}
   <g transform={`translate(${course.x} ${course.y})`} data-mount-silhouette={portrait?'portrait':'provisoire'} data-mount-model={active.mountId}><ellipse cy="12" rx="37" ry="14" fill="#000" opacity=".5"/>
    {Math.abs(course.speed)>20&&<path d={`M${-Math.cos(course.heading)*35} ${-Math.sin(course.heading)*35} l${-Math.cos(course.heading)*Math.min(55,Math.abs(course.speed)/2)} ${-Math.sin(course.heading)*Math.min(55,Math.abs(course.speed)/2)}`} stroke="#caa66c" strokeWidth="7" opacity=".35"/>}
    {portrait&&<image data-mount-portrait href={portrait} x="-43" y="-34" width="86" height="68" />}
    <g transform={`rotate(${course.heading*180/Math.PI})`}>
     {!portrait&&<>
     <ellipse rx="30" ry="12" fill="#5d4a3a" stroke="#c7a978" strokeWidth="2"/>
     <ellipse cx="32" rx="11" ry="8" fill="#6e5643" stroke="#c7a978" strokeWidth="2"/>
     <path d="M-22 -4 L-12 -9 L-2 -4 L8 -9 L18 -4" fill="none" stroke="#d8c08f" strokeWidth="2"/>
     <path d="M-20 -12 L-24 -20 M-20 12 L-24 20 M18 -12 L22 -20 M18 12 L22 20" stroke="#5d4a3a" strokeWidth="5" strokeLinecap="round"/>
     <circle cx="-2" r="5" fill="#9c8a6a" stroke="#2a2420"/>
     </>}
     <path d="M44 0 L52 0 M46 -5 L52 0 L46 5" fill="none" stroke="#b7ecdc" strokeWidth="3"/>
    </g>
   </g>
  </svg>
  <p className={styles.hint}>Passe les trois balises dans l’ordre puis reviens au sas et arrête l’animal. Pas de caisse pour une monture (proposé). Cette aire ne comporte aucun feu, aucune zone toxique et aucune explosion : la peur du feu ne s’y déclenche pas. {portrait?'Le repère de la monture reprend son portrait de référence.':'Le repère du Kha’Rha est une silhouette provisoire.'}</p>
  <p className={styles.hint}>Proposé : fatigue {`+0,5`} par seconde d’effort, triplée au sprint ; dès 80 l’animal ne va plus qu’au pas. Les chocs blessent (même formule que les chocs d’engins). À 50 de blessure ou en panique, il s’arrête : mets pied à terre. Le BOND ne réduit jamais la fatigue.</p>
  <div className={styles.actions}><button onClick={paused?resume:pause} disabled={props.suspended||controller.blocked}>{paused?'Reprendre la chevauchée':'Pause et enregistrer'}</button>
   <button onClick={()=>finish('return')} disabled={props.suspended||!mountRideAtDepotV156(course)||controller.blocked}>Mettre pied à terre au sas</button>
   <button onClick={()=>{pause();setDismount(true);}} disabled={props.suspended||controller.blocked}>Descendre et ramener en main</button>
  </div>
  {dismount&&<div role="alert" className={styles.notice}><p>Tu descends et ramènes l’animal en main au sas. Aucun BOND pour cette sortie ; fatigue et blessures sont conservées. Aucun frais (proposé).</p><button onClick={()=>finish('dismount')} disabled={props.suspended}>Confirmer</button><button onClick={()=>setDismount(false)}>Annuler</button></div>}
  {controller.blocked&&<div role="alert" className={styles.notice}><p>La séquence non confirmée est conservée.</p><button onClick={flush} disabled={props.suspended}>Réessayer la même écriture</button></div>}
  {padNeutral&&<p role="status" className={styles.notice}>Relâche le stick et les boutons de la manette avant de reprendre son contrôle.</p>}
  <p role="status" aria-live="polite">{notice}</p>
  <details><summary>Commandes clavier, tactile et manette standard</summary><p>Avancer : {controlActionShortcut('hunt.moveUp',props.bindings)} · Reculer : {controlActionShortcut('hunt.moveDown',props.bindings)} · Direction : {controlActionShortcut('hunt.moveLeft',props.bindings)} / {controlActionShortcut('hunt.moveRight',props.bindings)} · Arrêt : {controlActionShortcut('hunt.jump',props.bindings)} · Sprint : {controlActionShortcut('hunt.aim',props.bindings)}. Manette : stick gauche, A arrêt, RT sprint, Start pause.</p></details>
  <div className={styles.touch} aria-label="Commandes tactiles de chevauchée">{control('Gauche','left')}{control('Avancer','forward')}{control('Droite','right')}{control('Reculer','reverse')}{control('Arrêt','brake')}{control('Sprint','boost')}</div>
 </section>;
}
