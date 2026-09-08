"use client";
/* eslint-disable @next/next/no-img-element -- local original game bitmaps, no remote art */
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import HunterRigPreview from "./HunterRigPreview";
import { controlActionShortcut } from "./controlBindingLabels";
import { matchesControlAction } from "./systems/controlBindings";
import type { SaveGame } from "./types";
import { ASH_MARCHES, ASH_POINTS, ashPlatforms, createAshExpedition, stepAshExpedition, nearestAshPoint, ashMarchesCompletion, type AshInput, type HomeworldExpeditionProof } from "./systems/homeworldExpedition";
import { ashGrazerVisual } from "./systems/homeworldExpeditionVisuals";
import styles from "./HomeworldExpedition.module.css";

export interface HomeworldExpeditionProps {
  save: SaveGame;
  suspended?: boolean;
  onComplete(proof: HomeworldExpeditionProof): Promise<{persisted:boolean;message?:string}> | {persisted:boolean;message?:string};
  /** Called only on explicit abandonment or after a durable completion acknowledgment. */
  onExit():void;
}
const Scenery=memo(function Scenery({shortcut}:{shortcut:boolean}){
  return <>
    <div className={styles.backdrop}/>
    {ashPlatforms({shortcutOpened:shortcut}).map(platform=><div className={styles.platform} key={platform.id} style={{left:platform.x,top:platform.y,width:platform.width,height:platform.height}}/>)}
    <div className={styles.ashTrail} style={{left:320,top:900,width:210}}/>
    <div className={styles.falseTrail} style={{left:960,top:860,width:220}}/>
    <img className={styles.convoy} src="/game/ship-interior/v22/archive-terminal.webp" alt="" style={{left:2685,top:790}} draggable={false}/>
    <div className={styles.convoyCargo} style={{left:2820,top:850}}>SCELLÉ<br/>PORT 17</div>
    {ASH_POINTS.map(point=><div key={point.id} className={styles.point} style={{left:point.x,top:point.y-135}}>{point.id==="relic"?"◇":point.id==="rest"?"✚":"⌖"}<small>{point.label}</small></div>)}
    <div className={styles.regionTitle} style={{left:95,top:685}}>MARCHES DE CENDRE<small>Pistes basses · corniches · relais · territoire du brouteur</small></div>
  </>;
});
export default function HomeworldExpedition({save,suspended=false,onComplete,onExit}:HomeworldExpeditionProps){
  const [state,setState]=useState(createAshExpedition);
  const stateRef=useRef(state);
  const [paused,setPaused]=useState(false);
  const [exitConfirm,setExitConfirm]=useState(false);
  const [delivery,setDelivery]=useState<{status:"idle"|"saving"|"failed";message:string}>({status:"idle",message:""});
  const deliveryBusy=useRef(false);
  const [viewport,setViewport]=useState({width:960,height:520});
  const viewportRef=useRef<HTMLDivElement>(null);
  const rootRef=useRef<HTMLElement>(null);
  const modalRef=useRef<HTMLDivElement>(null);
  const held=useRef(new Set<string>());
  const touches=useRef(new Set<-1|1>());
  const queued=useRef<AshInput>({});
  const blocked=suspended||paused||exitConfirm||delivery.status!=="idle";
  const blockedRef=useRef(blocked);
  useLayoutEffect(()=>{blockedRef.current=blocked;},[blocked]);
  const bindings=save.settings.controlBindings;
  const clearInputs=useCallback(()=>{held.current.clear();touches.current.clear();queued.current={};},[]);
  const focus=()=>rootRef.current?.focus({preventScroll:true});
  const deliver=useCallback(async()=>{
    if(deliveryBusy.current) return;
    const current=stateRef.current;
    const proof=ashMarchesCompletion(current);
    if(!proof||nearestAshPoint(current)?.id!=="extraction") return;
    deliveryBusy.current=true;clearInputs();
    setDelivery({status:"saving",message:"Enregistrement du rapport avant retour au port…"});
    try{
      const result=await onComplete(proof);
      if(result.persisted){onExit();return;}
      setDelivery({status:"failed",message:result.message??"Sauvegarde non confirmée. Le rapport reste disponible ici ; réessayez."});
    }catch{setDelivery({status:"failed",message:"Écriture interrompue. Aucun succès annoncé ; réessayez sans quitter cette sortie."});}
    finally{deliveryBusy.current=false;}
  },[clearInputs,onComplete,onExit]);
  const deliverRef=useRef(deliver);
  useLayoutEffect(()=>{deliverRef.current=deliver;},[deliver]);
  const modalOpen=paused||exitConfirm||delivery.status!=="idle";
  useEffect(()=>{
    if(!modalOpen){rootRef.current?.focus({preventScroll:true});return;}
    const modal=modalRef.current;if(!modal)return;
    const candidates=()=>Array.from(modal.querySelectorAll<HTMLButtonElement>("button:not(:disabled)"));
    (candidates()[0]??modal).focus({preventScroll:true});
    const trap=(event:globalThis.KeyboardEvent)=>{
      if(event.key!=="Tab")return;
      const buttons=candidates();
      if(!buttons.length){event.preventDefault();modal.focus();return;}
      const first=buttons[0],last=buttons[buttons.length-1];
      if(!modal.contains(document.activeElement)||(event.shiftKey&&document.activeElement===first)||(!event.shiftKey&&document.activeElement===last)){
        event.preventDefault();(event.shiftKey?last:first).focus();
      }
    };
    document.addEventListener("keydown",trap);
    return()=>document.removeEventListener("keydown",trap);
  },[modalOpen,delivery.status]);
  useEffect(()=>{
    const view=viewportRef.current;if(!view)return;
    const observer=new ResizeObserver(entries=>{const box=entries[0]?.contentRect;if(box)setViewport({width:box.width,height:box.height});});
    observer.observe(view);return()=>observer.disconnect();
  },[]);
  useEffect(()=>{
    const blur=()=>{clearInputs();setPaused(true);};
    const visibility=()=>{if(document.hidden)blur();};
    const up=(event:globalThis.KeyboardEvent)=>held.current.delete(event.code);
    window.addEventListener("blur",blur);window.addEventListener("keyup",up);document.addEventListener("visibilitychange",visibility);
    return()=>{window.removeEventListener("blur",blur);window.removeEventListener("keyup",up);document.removeEventListener("visibilitychange",visibility);};
  },[clearInputs]);
  useEffect(()=>{if(blocked)clearInputs();},[blocked,clearInputs]);
  useEffect(()=>{
    let frame=0,last=performance.now(),accumulator=0;
    let previousPad=[false,false,false,false];
    const tick=(now:number)=>{
      const elapsed=Math.min(100,Math.max(0,now-last));last=now;
      const pad=navigator.getGamepads?.()[0];
      const buttons=[Boolean(pad?.buttons[0]?.pressed),Boolean(pad?.buttons[2]?.pressed),Boolean(pad?.buttons[3]?.pressed),Boolean(pad?.buttons[9]?.pressed)];
      if(buttons[3]&&!previousPad[3]&&!suspended)setPaused(value=>!value);
      if(blockedRef.current){accumulator=0;previousPad=buttons;frame=requestAnimationFrame(tick);return;}
      queued.current.jumpPressed ||= buttons[0]&&!previousPad[0];
      queued.current.scanPressed ||= buttons[1]&&!previousPad[1];
      queued.current.interactPressed ||= buttons[2]&&!previousPad[2];
      previousPad=buttons;
      accumulator+=elapsed;
      const before=stateRef.current;
      let current=before;
      while(accumulator+1e-8>=1000/60){
        const left=bindings["hunt.moveLeft"].some(code=>held.current.has(code))||touches.current.has(-1)||Boolean(pad?.buttons[14]?.pressed);
        const right=bindings["hunt.moveRight"].some(code=>held.current.has(code))||touches.current.has(1)||Boolean(pad?.buttons[15]?.pressed);
        const axis=pad?.axes[0]??0;
        const moveX=left===right?(Math.abs(axis)>.2?axis:0):left?-1:1;
        const input={...queued.current,moveX};queued.current={};
        current=stepAshExpedition(current,input);
        stateRef.current=current;
        accumulator-=1000/60;
        if(input.interactPressed&&nearestAshPoint(current)?.id==="extraction"&&ashMarchesCompletion(current)){
          void deliverRef.current();accumulator=0;break;
        }
      }
      if(current!==before)setState(current);
      frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(frame);
    // The current simulation is read from its ref; no render restarts its clock.
  },[bindings,suspended]);
  const keyDown=(event:KeyboardEvent<HTMLElement>)=>{
    if(event.target instanceof HTMLElement&&event.target.closest("button,input,select"))return;
    if(event.code==="Escape"){event.preventDefault();event.stopPropagation();clearInputs();setPaused(value=>!value);return;}
    if(blocked)return;
    const action=(["hunt.moveLeft","hunt.moveRight","hunt.jump","hunt.scan","hunt.interact"] as const).find(id=>matchesControlAction(id,event,bindings));
    if(!action)return;
    event.preventDefault();event.stopPropagation();held.current.add(event.code);
    if(!event.repeat){
      if(action==="hunt.jump")queued.current.jumpPressed=true;
      if(action==="hunt.scan")queued.current.scanPressed=true;
      if(action==="hunt.interact")queued.current.interactPressed=true;
    }
  };
  const hold=(direction:-1|1,event:PointerEvent<HTMLButtonElement>)=>{
    if(blocked)return;event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);touches.current.add(direction);
  };
  const queue=(input:AshInput)=>{if(!blocked)queued.current={...queued.current,...input};focus();};
  const scale=Math.min(1,viewport.width/900);
  const cameraX=Math.max(0,Math.min(ASH_MARCHES.width-viewport.width/scale,state.actor.x-viewport.width/scale*.35));
  const cameraY=Math.max(0,Math.min(ASH_MARCHES.height-viewport.height/scale,state.actor.y-viewport.height/scale*.7));
  const point=nearestAshPoint(state);
  const complete=ashMarchesCompletion(state)!==null;
  const actor=state.actor;
  const grazerVisual=ashGrazerVisual(state.grazer,state.tick);
  return <section className={styles.root} ref={rootRef} tabIndex={-1} aria-label="Expédition des Marches de Cendre" onKeyDown={keyDown} data-screen-focus data-homeworld-expedition="ash-marches" data-expedition-tick={state.tick} data-actor-x={actor.x} data-actor-y={actor.y} data-grounded={actor.grounded}>
    <header className={styles.header} inert={modalOpen}><div><strong>MARCHES DE CENDRE</strong><span>Première expédition · La Couronne de Cendres</span></div>
      <button onClick={()=>{clearInputs();setPaused(value=>!value);}} disabled={delivery.status!=="idle"}>{paused?"Reprendre":"Pause"}</button>
      <button onClick={()=>{clearInputs();setExitConfirm(true);}} disabled={delivery.status==="saving"}>Retour sans rapport</button></header>
    <div className={styles.objectives} aria-label="Objectifs de l’expédition">
      {[["Piste réelle",state.trueTrailInspected],["Fausse piste",state.falseTrailRejected],["Bloc déplacé",state.obstacleMoved],["Convoi",state.convoyRecovered],["Passerelles",state.shortcutOpened]].map(([label,done])=><span key={String(label)} data-done={Boolean(done)}>{done?"✓":"○"} {label}</span>)}
      <span>Vitalité {actor.health}/3 · Secret {state.secretFound?"trouvé":"non trouvé"}</span>
    </div>
    <div className={styles.viewport} ref={viewportRef} onPointerDown={focus} aria-label="Terrain jouable">
      <div className={styles.world} style={{width:ASH_MARCHES.width,height:ASH_MARCHES.height,transform:`translate(${-cameraX*scale}px,${-cameraY*scale}px) scale(${scale})`}}>
        <Scenery shortcut={state.shortcutOpened}/>
        {!state.obstacleMoved?<img className={styles.obstacle} src="/game/assets/v19/biome-decor/volcano/cov/cov-obsidian-pylon-02-broad.webp" style={{left:2218,top:660}} alt="" draggable={false}/>:<div className={styles.rubble} style={{left:2310,top:936}}>◇ ◆ ◇</div>}
        <div className={styles.grazer} data-grazer-frame={grazerVisual.frame} style={grazerVisual.style}/>
        {state.grazer.phase==="telegraph"?<div className={styles.warning} style={{left:state.grazer.x-100,top:685}}>CHARGE {state.grazer.direction===1?"→":"←"}<small>{Math.ceil((75-state.grazer.ticks)/60)} s · quitter la ligne</small></div>:null}
        <div className={styles.actor} style={{left:actor.x-60,top:actor.y-171.5625,opacity:actor.invulnerableTicks>0&&state.tick%8<4?.5:1}}>
          <HunterRigPreview appearance={save.appearance} armorId={save.loadout.armorId} weaponIds={save.loadout.weaponIds} gearIds={save.loadout.gearIds} size={120}
            pose={actor.grounded?Math.abs(actor.vx)>0?"run":"idle":actor.vy<0?"jump":"fall"} phase={state.tick/60} facing={actor.facing} speed={Math.abs(actor.vx)/300}/>
        </div>
        {state.scanTicks>0?<div className={styles.scan} style={{left:actor.x-230,top:actor.y-250,width:460,height:310}}/>:null}
      </div>
      {(paused||exitConfirm||delivery.status!=="idle")?<div className={styles.overlay} ref={modalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={exitConfirm?"Abandonner la sortie":"Expédition suspendue"}>
        <strong>{delivery.status==="saving"?"Rapport en cours":exitConfirm?"Rentrer sans ce rapport ?":delivery.status==="failed"?"Rapport non sauvegardé":"Expédition en pause"}</strong>
        <p>{delivery.status!=="idle"?delivery.message:exitConfirm?"Les observations non rapportées de cette sortie seront perdues. La progression déjà sauvegardée reste intacte.":"Aucun déplacement ni charge ne progresse pendant la pause."}</p>
        {delivery.status==="failed"?<><button onClick={()=>void deliver()}>Réessayer la sauvegarde</button><button onClick={()=>{setDelivery({status:"idle",message:""});focus();}}>Revenir au terrain</button></>:null}
        {exitConfirm?<><button onClick={()=>{setExitConfirm(false);focus();}}>Continuer l’expédition</button><button onClick={onExit}>Abandonner et rentrer</button></>:delivery.status==="idle"?<button onClick={()=>{setPaused(false);focus();}}>Reprendre l’expédition</button>:null}
      </div>:null}
    </div>
    <div className={styles.message} role="status">{state.message}</div>
    <footer className={styles.controls} inert={blocked}>
      <button aria-label="Marcher à gauche" onPointerDown={event=>hold(-1,event)} onPointerUp={()=>touches.current.delete(-1)} onPointerCancel={()=>touches.current.delete(-1)} onLostPointerCapture={()=>touches.current.delete(-1)}>←</button>
      <button aria-label="Marcher à droite" onPointerDown={event=>hold(1,event)} onPointerUp={()=>touches.current.delete(1)} onPointerCancel={()=>touches.current.delete(1)} onLostPointerCapture={()=>touches.current.delete(1)}>→</button>
      <button onClick={()=>queue({jumpPressed:true})}>Saut · {controlActionShortcut("hunt.jump",bindings)}</button>
      <button onClick={()=>queue({scanPressed:true})}>Scanner · {controlActionShortcut("hunt.scan",bindings)}</button>
      <button onClick={()=>queue({interactPressed:true})}>{point?.id==="extraction"&&complete?"Rapporter au port":point?"Interagir : "+point.label:"Interagir"} · {controlActionShortcut("hunt.interact",bindings)}</button>
      <small>Stick : marcher · A : saut · X : scanner · Y : interaction. Créature territoriale à contourner ; visuels existants réutilisés.</small>
    </footer>
  </section>;
}
