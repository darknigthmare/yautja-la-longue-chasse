"use client";
/* eslint-disable @next/next/no-img-element -- local original game bitmaps, no remote art */
import { memo, useCallback, useEffect, useLayoutEffect, useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import HunterRigPreview from "./HunterRigPreview";
import { controlActionShortcut } from "./controlBindingLabels";
import { matchesControlAction } from "./systems/controlBindings";
import type { SaveGame } from "./types";
import { GLASS_DESERT, GLASS_POINTS, glassPlatforms, createGlassDesertExpedition, stepGlassDesert, nearestGlassPoint, glassDesertCompletion, chooseGlassRoute, chooseGlassBeacon, glassSurfaceAt, type GlassCrossingRoute, type GlassBeaconDisposition, type GlassInput, type GlassDesertProof } from "./systems/glassDesert";

import styles from "./GlassDesertExpedition.module.css";

export interface GlassDesertExpeditionProps {
  save: SaveGame;
  suspended?: boolean;
  onComplete(proof: GlassDesertProof): Promise<{persisted:boolean;message?:string}> | {persisted:boolean;message?:string};
  /** Called only on explicit abandonment or after a durable completion acknowledgment. */
  onExit():void;
}
const Scenery=memo(function Scenery({bridge}:{bridge:boolean}){
  return <><div className={styles.backdrop}/>
    {[610,1510,1930,2510].map((x,i)=><img key={x} className={styles.fin} src="/game/assets/v19/biome-decor/desert/cov/cov-obsidian-glass-fin-01-narrow.webp" alt="" draggable={false} style={{left:x,top:590+i%2*65}}/>)}
    {glassPlatforms({safePassageOpened:bridge}).map(p=><div className={styles.platform} data-surface={p.surface} key={p.id} style={{left:p.x,top:p.y,width:p.width,height:p.height}}/>)}
    <img className={styles.cargo} src="/game/assets/v19/biome-decor/desert/cov/cov-buried-cargo-01-narrow.webp" alt="" draggable={false} style={{left:2170,top:706}}/>
    <img className={styles.convoy} src="/game/ship-interior/v22/archive-terminal.webp" alt="" draggable={false} style={{left:2260,top:768}}/>
    <div className={styles.relay} style={{left:1120,top:760}}>RELAIS 02</div>
    <div className={styles.relay} style={{left:3370,top:760}}>NAVETTE · CITÉ</div>
    {GLASS_POINTS.map(p=><div key={p.id} className={styles.point} style={{left:p.x,top:p.y-(p.id==="bridge"?225:155)}}>{p.id==="secret"?"◇":"⌖"}<small>{p.label}</small></div>)}
    <div className={styles.regionTitle} style={{left:95,top:650}}>DÉSERT DE VERRE<small>Roches stables · bassins résonnants · site de transit</small></div>
    <div className={styles.foreground}/>
  </>;
});
export default function GlassDesertExpedition({save,suspended=false,onComplete,onExit}:GlassDesertExpeditionProps){
  const [state,setState]=useState(()=>createGlassDesertExpedition(save.homeworld.expeditions["glass-desert"]));
  const stateRef=useRef(state);
  const [paused,setPaused]=useState(false);
  const [exitConfirm,setExitConfirm]=useState(false);
  const [delivery,setDelivery]=useState<{status:"idle"|"saving"|"failed";message:string}>({status:"idle",message:""});
  const deliveryBusy=useRef(false);
  const mounted=useRef(true);
  useEffect(()=>{mounted.current=true;return()=>{mounted.current=false;};},[]);
  const [viewport,setViewport]=useState({width:960,height:520});
  const viewportRef=useRef<HTMLDivElement>(null);
  const rootRef=useRef<HTMLElement>(null);
  const modalRef=useRef<HTMLDivElement>(null);
  const held=useRef(new Set<string>());
  const touches=useRef(new Set<-1|0|1>());
  const queued=useRef<GlassInput>({});
  const blocked=suspended||paused||exitConfirm||delivery.status!=="idle";
  const blockedRef=useRef(blocked);
  useLayoutEffect(()=>{blockedRef.current=blocked;},[blocked]);
  const bindings=save.settings.controlBindings;
  const clearInputs=useCallback(()=>{held.current.clear();touches.current.clear();queued.current={};},[]);
  const focus=()=>rootRef.current?.focus({preventScroll:true});
  const deliver=useCallback(async()=>{
    if(deliveryBusy.current) return;
    const current=stateRef.current;
    const proof=glassDesertCompletion(current);
    if(!proof||nearestGlassPoint(current)?.id!=="extraction") return;
    deliveryBusy.current=true;clearInputs();
    setDelivery({status:"saving",message:"Enregistrement du rapport avant retour au port…"});
    try{
      const result=await onComplete(proof);
      if(!mounted.current)return;
      if(result.persisted){onExit();return;}
      setDelivery({status:"failed",message:result.message??"Sauvegarde non confirmée. Le rapport reste disponible ici ; réessayez."});
    }catch{if(mounted.current)setDelivery({status:"failed",message:"Écriture interrompue. Aucun succès annoncé ; réessayez sans quitter cette sortie."});}
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
    let previousPad=[false,false,false,false,false];
    let previousMenuDirection=false;
    const tick=(now:number)=>{
      const elapsed=Math.min(100,Math.max(0,now-last));last=now;
      const ownsFocus=!!rootRef.current?.contains(document.activeElement);
      const pad=ownsFocus&&!document.hidden?Array.from(navigator.getGamepads?.()??[]).find(p=>p?.connected):null;
      const buttons=[Boolean(pad?.buttons[0]?.pressed),Boolean(pad?.buttons[2]?.pressed),Boolean(pad?.buttons[3]?.pressed),Boolean(pad?.buttons[1]?.pressed),Boolean(pad?.buttons[9]?.pressed)];
      if(buttons[4]&&!previousPad[4]&&!suspended&&!exitConfirm&&delivery.status==="idle")setPaused(value=>!value);
      const menuButtons=ownsFocus?Array.from(rootRef.current?.querySelectorAll<HTMLButtonElement>("[data-glass-choices] button:not(:disabled), [role=dialog] button:not(:disabled)")??[]):[];
      const menuUp=Boolean(pad?.buttons[12]?.pressed)||(pad?.axes[1]??0)<-.55;
      const menuDown=Boolean(pad?.buttons[13]?.pressed)||(pad?.axes[1]??0)>.55;
      const menuDirection=menuUp||menuDown;
      if(menuButtons.length&&pad&&!suspended){
        const selected=menuButtons.indexOf(document.activeElement as HTMLButtonElement);
        if(menuDirection&&!previousMenuDirection){clearInputs();menuButtons[(selected+(menuDown?1:-1)+menuButtons.length)%menuButtons.length]?.focus();}
        if(buttons[0]&&!previousPad[0]){clearInputs();if(selected>=0)menuButtons[selected]?.click();else menuButtons[0]?.focus();}
        previousMenuDirection=menuDirection;previousPad=buttons;accumulator=0;frame=requestAnimationFrame(tick);return;
      }
      previousMenuDirection=menuDirection;
      if(blockedRef.current||document.hidden){accumulator=0;previousPad=buttons;frame=requestAnimationFrame(tick);return;}
      queued.current.jumpPressed ||= buttons[0]&&!previousPad[0];
      queued.current.scanPressed ||= buttons[1]&&!previousPad[1];
      queued.current.interactPressed ||= buttons[2]&&!previousPad[2];
      queued.current.decoyPressed ||= buttons[3]&&!previousPad[3];
      previousPad=buttons;
      accumulator+=elapsed;
      const before=stateRef.current;
      let current=before;
      while(accumulator+1e-8>=1000/60){
        const left=bindings["hunt.moveLeft"].some(code=>held.current.has(code))||touches.current.has(-1)||Boolean(pad?.buttons[14]?.pressed);
        const right=bindings["hunt.moveRight"].some(code=>held.current.has(code))||touches.current.has(1)||Boolean(pad?.buttons[15]?.pressed);
        const axis=pad?.axes[0]??0;
        const moveX=left===right?(Math.abs(axis)>.2?axis:0):left?-1:1;
        const careful=bindings["hunt.aim"].some(code=>held.current.has(code))||touches.current.has(0)||Boolean(pad?.buttons[6]?.pressed);
        const input={...queued.current,moveX,careful};queued.current={};
        current=stepGlassDesert(current,input);
        stateRef.current=current;
        accumulator-=1000/60;
        if(input.interactPressed&&nearestGlassPoint(current)?.id==="extraction"&&glassDesertCompletion(current)){
          void deliverRef.current();accumulator=0;break;
        }
      }
      if(current!==before)setState(current);
      frame=requestAnimationFrame(tick);
    };
    frame=requestAnimationFrame(tick);
    return()=>cancelAnimationFrame(frame);
    // The current simulation is read from its ref; no render restarts its clock.
  },[bindings,suspended,exitConfirm,delivery.status,clearInputs]);
  const keyDown=(event:KeyboardEvent<HTMLElement>)=>{
    if(event.target instanceof HTMLElement&&event.target.closest("button,input,select"))return;
    if(matchesControlAction("hunt.pause",event.nativeEvent,bindings)){event.preventDefault();event.stopPropagation();if(!event.repeat&&!suspended&&!exitConfirm&&delivery.status==="idle"){clearInputs();setPaused(value=>!value);}return;}
    if(blocked||event.altKey||event.ctrlKey||event.metaKey)return;
    const action=(["hunt.moveLeft","hunt.moveRight","hunt.jump","hunt.scan","hunt.interact","hunt.aim","hunt.useGearOne"] as const).find(id=>matchesControlAction(id,event,bindings));
    if(!action)return;
    event.preventDefault();event.stopPropagation();held.current.add(event.code);
    if(!event.repeat){
      if(action==="hunt.jump")queued.current.jumpPressed=true;
      if(action==="hunt.scan")queued.current.scanPressed=true;
      if(action==="hunt.useGearOne")queued.current.decoyPressed=true;
      if(action==="hunt.interact")queued.current.interactPressed=true;
    }
  };
  const hold=(direction:-1|0|1,event:PointerEvent<HTMLButtonElement>)=>{
    if(blocked)return;event.preventDefault();event.currentTarget.setPointerCapture(event.pointerId);touches.current.add(direction);
  };
  const queue=(input:GlassInput)=>{if(!blocked)queued.current={...queued.current,...input};focus();};
  const scale=Math.min(.95,Math.max(.55,viewport.height/570));
  const cameraX=Math.max(0,Math.min(GLASS_DESERT.width-viewport.width/scale,state.actor.x-viewport.width/scale*.35));
  const cameraY=Math.max(0,Math.min(GLASS_DESERT.height-viewport.height/scale,state.actor.y-viewport.height/scale*.7));
  const point=nearestGlassPoint(state);
  const complete=glassDesertCompletion(state)!==null;
  const actor=state.actor;
  const choose=(kind:"route"|"beacon",value:GlassCrossingRoute|GlassBeaconDisposition)=>{
    if(blockedRef.current)return;clearInputs();
    const next=kind==="route"?chooseGlassRoute(stateRef.current,value as GlassCrossingRoute):chooseGlassBeacon(stateRef.current,value as GlassBeaconDisposition);
    stateRef.current=next;setState(next);
  };
  const surface=glassSurfaceAt(state);
  return <section className={styles.root} ref={rootRef} tabIndex={-1} aria-label="Expédition du Désert de Verre" onKeyDown={keyDown} data-screen-focus data-homeworld-expedition="glass-desert" data-expedition-tick={state.tick} data-actor-x={actor.x} data-actor-y={actor.y} data-grounded={actor.grounded} data-burrower-phase={state.burrower.phase}>
    <header className={styles.header} inert={modalOpen}><div><strong>DÉSERT DE VERRE</strong><span>Deuxième enquête régionale · aucun acte complet annoncé</span></div>
      <button onClick={()=>{clearInputs();setPaused(value=>!value);}} disabled={delivery.status!=="idle"}>{paused?"Reprendre":"Pause"}</button>
      <button onClick={()=>{clearInputs();setExitConfirm(true);}} disabled={delivery.status==="saving"}>Retour sans rapport</button></header>
    <div className={styles.objectives} aria-label="Objectifs de l’expédition">
      {[["Terrain",state.terrainSurveyed],["Traversée",state.crossingResolved],["Journal",state.transportLogRecovered],["Balise",state.diversionCorroborated&&!!state.beaconDisposition],["Passage sûr",state.safePassageOpened]].map(([label,done])=><span key={String(label)} data-done={Boolean(done)}>{done?"✓":"○"} {label}</span>)}
      <span>Vitalité {actor.health}/3 · Leurres {state.decoys}/3 · Secret {state.secretFound?"trouvé":"non trouvé"}</span>
    </div>
    <div className={styles.sensor}><span>{surface==="glass"?"SOL RÉSONNANT":surface?"ROCHE STABLE":"EN SUSPENSION"}</span><label>Vibrations <meter min={0} max={100} value={state.vibration}/>{Math.round(state.vibration)}%</label><span>{state.burrower.phase==="warning"?"APPROCHE · cible annoncée":state.burrower.phase==="breach"?"ÉMERGENCE":state.burrower.phase==="settle"?"Récupération · passage possible":"Le fouisseur écoute"}</span></div>
    <div className={styles.viewport} ref={viewportRef} onPointerDown={focus} aria-label="Terrain jouable">
      <div className={styles.world} style={{width:GLASS_DESERT.width,height:GLASS_DESERT.height,transform:`translate(${-cameraX*scale}px,${-cameraY*scale}px) scale(${scale})`}}>
        <Scenery bridge={state.safePassageOpened}/>
        <div className={styles.beacon} data-disabled={state.beaconDisposition==="disable"} style={{left:2740,top:775}}><i/><small>{state.beaconDisposition==="disable"?"COUPÉ":"RABATTAGE"}</small></div>
        {state.decoy&&<div className={styles.decoy} style={{left:state.decoy.x,top:880}}>◎<small>LEURRE</small></div>}
        {state.burrower.phase!=="listening"&&<div className={styles.ripple} data-phase={state.burrower.phase} style={{left:state.burrower.targetX-90,top:880}}><span>{state.burrower.phase==="warning"?"CIBLE · ÉCARTEZ-VOUS":state.burrower.phase==="breach"?"ÉMERGENCE":"REPLI"}</span></div>}
        {state.burrower.phase==="breach"&&<div className={styles.creatureClip} style={{left:state.burrower.x-120,top:732}}><div className={styles.creature} style={{transform:actor.x<state.burrower.x?"scaleX(-1)":"none"}}/></div>}
        <div className={styles.actor} style={{left:actor.x-60,top:actor.y-171.5625,opacity:actor.invulnerableTicks>0&&state.tick%8<4?.5:1}}>
          <HunterRigPreview appearance={save.appearance} armorId={save.loadout.armorId} weaponIds={save.loadout.weaponIds} gearIds={save.loadout.gearIds} size={120}
            pose={actor.grounded?Math.abs(actor.vx)>0?"run":"idle":actor.vy<0?"jump":"fall"} phase={state.tick/60} facing={actor.facing} speed={Math.abs(actor.vx)/300}/>
        </div>
        {state.scanTicks>0?<div className={styles.scan} style={{left:actor.x-230,top:actor.y-250,width:460,height:310}}/>:null}
      </div>
      {(paused||exitConfirm||delivery.status!=="idle")?<div className={styles.overlay} ref={modalRef} tabIndex={-1} role="dialog" aria-modal="true" aria-label={exitConfirm?"Abandonner la sortie":"Expédition suspendue"}>
        <strong>{delivery.status==="saving"?"Rapport en cours":exitConfirm?"Rentrer sans ce rapport ?":delivery.status==="failed"?"Rapport non sauvegardé":"Expédition en pause"}</strong>
        <p>{delivery.status!=="idle"?delivery.message:exitConfirm?"Les observations non rapportées de cette sortie seront perdues. La progression déjà sauvegardée reste intacte.":"Les pas et le fouisseur sont arrêtés pendant la pause."}</p>
        {delivery.status==="failed"?<><button onClick={()=>void deliver()}>Réessayer la sauvegarde</button><button onClick={()=>{setDelivery({status:"idle",message:""});focus();}}>Revenir au terrain</button></>:null}
        {exitConfirm?<><button onClick={()=>{setExitConfirm(false);focus();}}>Continuer l’expédition</button><button onClick={onExit}>Abandonner et rentrer</button></>:delivery.status==="idle"?<button onClick={()=>{setPaused(false);focus();}}>Reprendre l’expédition</button>:null}
      </div>:null}
    </div>
    <div className={styles.message} role="status">{state.message}</div>
    {point?.id==="relay"&&state.terrainSurveyed&&!state.crossingRoute&&<div className={styles.choices} aria-label="Choix de traversée" data-glass-choices><p>Le choix sera conservé avec le rapport. Aucun bonus d’honneur.</p><button disabled={blocked} onClick={()=>choose("route","stepping-stones")}>Corniches stables · relever le cairn supérieur</button><button disabled={blocked} onClick={()=>choose("route","decoy-corridor")}>Corridor de leurre · détourner une émergence</button></div>}
    {point?.id==="beacon"&&state.diversionCorroborated&&!state.beaconDisposition&&<div className={styles.choices} aria-label="Décision sur la balise" data-glass-choices><p>Choix durable : garder la piste vivante ou arrêter l’attraction locale. Aucun coupable identifié.</p><button disabled={blocked} onClick={()=>choose("beacon","preserve")}>Conserver le canal · les impulsions continuent</button><button disabled={blocked} onClick={()=>choose("beacon","disable")}>Couper la balise · perdre le signal vivant</button></div>}
    <footer className={styles.controls} inert={blocked}>
      <button aria-label="Marcher à gauche" onPointerDown={event=>hold(-1,event)} onPointerUp={()=>touches.current.delete(-1)} onPointerCancel={()=>touches.current.delete(-1)} onLostPointerCapture={()=>touches.current.delete(-1)} onKeyDown={event=>{if(event.key===" "||event.key==="Enter"){event.preventDefault();touches.current.add(-1);}}} onKeyUp={()=>touches.current.delete(-1)} onBlur={()=>touches.current.delete(-1)}>←</button>
      <button aria-label="Marcher à droite" onPointerDown={event=>hold(1,event)} onPointerUp={()=>touches.current.delete(1)} onPointerCancel={()=>touches.current.delete(1)} onLostPointerCapture={()=>touches.current.delete(1)} onKeyDown={event=>{if(event.key===" "||event.key==="Enter"){event.preventDefault();touches.current.add(1);}}} onKeyUp={()=>touches.current.delete(1)} onBlur={()=>touches.current.delete(1)}>→</button>
      <button aria-label="Maintenir les pas mesurés" onPointerDown={event=>hold(0,event)} onPointerUp={()=>touches.current.delete(0)} onPointerCancel={()=>touches.current.delete(0)} onLostPointerCapture={()=>touches.current.delete(0)} onKeyDown={event=>{if(event.key===" "||event.key==="Enter"){event.preventDefault();touches.current.add(0);}}} onKeyUp={()=>touches.current.delete(0)} onBlur={()=>touches.current.delete(0)}>Pas mesurés · {controlActionShortcut("hunt.aim",bindings)}</button>
      <button disabled={!state.decoys||state.decoyCooldown>0} onClick={()=>queue({decoyPressed:true})}>Leurre · {controlActionShortcut("hunt.useGearOne",bindings)}</button>
      <button onClick={()=>queue({jumpPressed:true})}>Saut · {controlActionShortcut("hunt.jump",bindings)}</button>
      <button onClick={()=>queue({scanPressed:true})}>Scanner · {controlActionShortcut("hunt.scan",bindings)}</button>
      <button onClick={()=>queue({interactPressed:true})}>{point?.id==="extraction"&&complete?"Rapporter au port":point?"Interagir : "+point.label:"Interagir"} · {controlActionShortcut("hunt.interact",bindings)}</button>
      <small>Stick : marcher · A saut · X scanner · B leurre · Y interaction · LT pas mesurés · Start pause. Clavier : maintenir {controlActionShortcut("hunt.aim",bindings)} pour les pas mesurés ; course et atterrissage sur le verre amplifient les vibrations.</small>
      <small>Leurres prêtés pour cette sortie, sans prélèvement d’inventaire. Fouisseur original de l’expédition : bitmap réutilisé du jeu, pose d’émergence fixe provisoire, animation finale à produire. Les huit autres régions restent à produire. Rapport {save.homeworld.expeditions["glass-desert"]?"déjà enregistré ; choix conservés":"non enregistré"}.</small>
    </footer>
  </section>;
}
